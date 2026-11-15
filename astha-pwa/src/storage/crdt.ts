// CRDT propios sin dependencias (RNF-NET-02, ADR-009).
//  - HLC {wallMs, counter, nodeId}: orden total determinista (desempate por nodeId).
//  - VersionVector Record<nodeId, counter>: counter = HLC empaquetado (wallMs·1000 + counter) más alto visto de ese nodo.
//  - G-Set (todo lo clínico), LWW-Map (preferencias) y PN-Counter (XP).
// Todos los merge son conmutativos, asociativos e idempotentes.

// ---------------- HLC ----------------

export interface Hlc { wallMs: number; counter: number; nodeId: string }

const COUNTER_MAX = 999; // cabe en el empaquetado wallMs·1000 + counter (< 2^53)

export function compareHlc(a: Hlc, b: Hlc): number {
  return a.wallMs - b.wallMs || a.counter - b.counter || (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0);
}

/** Codificación ordenable lexicográficamente: "000001731686400000:007:nodeId". */
export function encodeHlc(h: Hlc): string {
  return `${String(h.wallMs).padStart(15, '0')}:${String(h.counter).padStart(3, '0')}:${h.nodeId}`;
}

export function decodeHlc(s: string): Hlc {
  const [w, c, ...rest] = s.split(':');
  return { wallMs: Number(w), counter: Number(c), nodeId: rest.join(':') };
}

export function packHlc(h: Hlc): number {
  return h.wallMs * 1000 + h.counter;
}

export class HybridClock {
  private last: Hlc;

  constructor(readonly nodeId: string, private readonly now: () => number = () => Date.now()) {
    this.last = { wallMs: 0, counter: 0, nodeId };
  }

  /** Evento local o envío. */
  tick(): Hlc {
    const pt = this.now();
    if (pt > this.last.wallMs) this.last = { wallMs: pt, counter: 0, nodeId: this.nodeId };
    else this.last = this.bump(this.last.wallMs, this.last.counter + 1);
    return { ...this.last };
  }

  /** Recepción de un HLC remoto: tolera relojes desfasados (nunca retrocede). */
  receive(remote: Hlc): Hlc {
    const pt = this.now();
    const wall = Math.max(pt, this.last.wallMs, remote.wallMs);
    let counter: number;
    if (wall === this.last.wallMs && wall === remote.wallMs) counter = Math.max(this.last.counter, remote.counter) + 1;
    else if (wall === this.last.wallMs) counter = this.last.counter + 1;
    else if (wall === remote.wallMs) counter = remote.counter + 1;
    else counter = 0;
    this.last = this.bump(wall, counter);
    return { ...this.last };
  }

  peek(): Hlc { return { ...this.last }; }

  private bump(wallMs: number, counter: number): Hlc {
    // Desbordamiento del contador: se avanza el reloj lógico 1 ms (sigue siendo monótono).
    return counter > COUNTER_MAX
      ? { wallMs: wallMs + 1, counter: 0, nodeId: this.nodeId }
      : { wallMs, counter, nodeId: this.nodeId };
  }
}

// ---------------- Version Vector ----------------

export type VersionVector = Record<string, number>;

export function vvObserve(vv: VersionVector, h: Hlc): VersionVector {
  const p = packHlc(h);
  if ((vv[h.nodeId] ?? -1) < p) vv[h.nodeId] = p;
  return vv;
}

export function vvMerge(a: VersionVector, b: VersionVector): VersionVector {
  const out: VersionVector = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? -1, v);
  return out;
}

/** VersionVector of a set of stored items (envelopes), whether or not this device can decrypt them. */
export function vvOf(items: Iterable<{ hlc: string }>): VersionVector {
  const vv: VersionVector = {};
  for (const it of items) vvObserve(vv, decodeHlc(it.hlc));
  return vv;
}

/** Wire format of `VersionVector` in openapi.yaml: node → HLC string "ms:cnt:node" (ADR-009). */
export type WireVersionVector = Record<string, string>;

const WIRE_HLC = /^\d+:\d+:[a-zA-Z0-9-]+$/;

/** Internal packed VV → contract VV (one HLC string per device). */
export function vvToWire(vv: VersionVector): WireVersionVector {
  const out: WireVersionVector = {};
  for (const [nodeId, packed] of Object.entries(vv)) {
    if (!Number.isFinite(packed) || packed < 0) continue;
    out[nodeId] = encodeHlc({ wallMs: Math.floor(packed / 1000), counter: packed % 1000, nodeId });
  }
  return out;
}

/** Contract VV → internal packed VV. Malformed or mismatched entries are ignored (never trusted). */
export function vvFromWire(wire: unknown): VersionVector {
  const out: VersionVector = {};
  if (!wire || typeof wire !== 'object') return out;
  for (const [nodeId, value] of Object.entries(wire as Record<string, unknown>)) {
    if (typeof value !== 'string' || !WIRE_HLC.test(value)) continue;
    const h = decodeHlc(value);
    if (h.nodeId !== nodeId || h.counter > COUNTER_MAX) continue;
    out[nodeId] = packHlc(h);
  }
  return out;
}

/** ¿El remoto (con su VV) ya tiene este evento? */
export function vvHas(vv: VersionVector, h: Hlc): boolean {
  return (vv[h.nodeId] ?? -1) >= packHlc(h);
}

/** Elementos que le faltan a quien envió `remote` (intercambio de deltas). */
export function deltaFor<T extends { hlc: string }>(items: Iterable<T>, remote: VersionVector): T[] {
  const out: T[] = [];
  for (const it of items) if (!vvHas(remote, decodeHlc(it.hlc))) out.push(it);
  // Ascending HLC: a peer that stops mid-stream only ever has a prefix of each author's events, so its VV
  // (max HLC seen per author) never claims events it is missing.
  return out.sort((a, b) => compareHlc(decodeHlc(a.hlc), decodeHlc(b.hlc)));
}

// ---------------- G-Set ----------------

export class GSet<T> {
  private readonly items = new Map<string, T>();

  constructor(private readonly keyOf: (x: T) => string) {}

  /** Devuelve true si el elemento era nuevo. */
  add(x: T): boolean {
    const k = this.keyOf(x);
    if (this.items.has(k)) return false;
    this.items.set(k, x);
    return true;
  }
  has(k: string): boolean { return this.items.has(k); }
  get(k: string): T | undefined { return this.items.get(k); }
  get size(): number { return this.items.size; }
  values(): IterableIterator<T> { return this.items.values(); }
  keys(): string[] { return [...this.items.keys()].sort(); }

  merge(other: GSet<T>): this {
    for (const x of other.values()) this.add(x);
    return this;
  }
}

// ---------------- LWW-Map ----------------

export interface LwwEntry<V> { value: V; hlc: Hlc }

export class LwwMap<V> {
  private readonly entries = new Map<string, LwwEntry<V>>();

  set(key: string, value: V, hlc: Hlc): boolean {
    const cur = this.entries.get(key);
    if (cur && compareHlc(cur.hlc, hlc) >= 0) return false;
    this.entries.set(key, { value, hlc });
    return true;
  }
  get(key: string): V | undefined { return this.entries.get(key)?.value; }
  entry(key: string): LwwEntry<V> | undefined { return this.entries.get(key); }
  keys(): string[] { return [...this.entries.keys()].sort(); }

  merge(other: LwwMap<V>): this {
    for (const k of other.keys()) {
      const e = other.entry(k)!;
      this.set(k, e.value, e.hlc);
    }
    return this;
  }

  toJSON(): Record<string, V> {
    return Object.fromEntries(this.keys().map((k) => [k, this.get(k)!]));
  }
}

// ---------------- PN-Counter ----------------

export class PNCounter {
  readonly p: Record<string, number> = {};
  readonly n: Record<string, number> = {};

  increment(nodeId: string, by = 1): void {
    if (by < 0) return this.decrement(nodeId, -by);
    this.p[nodeId] = (this.p[nodeId] ?? 0) + by;
  }
  decrement(nodeId: string, by = 1): void {
    this.n[nodeId] = (this.n[nodeId] ?? 0) + by;
  }
  get value(): number {
    const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
    return sum(this.p) - sum(this.n);
  }
  merge(other: PNCounter): this {
    for (const [k, v] of Object.entries(other.p)) this.p[k] = Math.max(this.p[k] ?? 0, v);
    for (const [k, v] of Object.entries(other.n)) this.n[k] = Math.max(this.n[k] ?? 0, v);
    return this;
  }
}

// ---------------- Operaciones del almacén ----------------

/** Cuerpo descifrado de un sobre. Todo lo clínico es inmutable (G-Set). */
export type OpBody =
  | { t: 'measurement'; crewId: string; day: number; fields: Record<string, number>; source: 'manual' | 'sim' | 'import' }
  | { t: 'symptom'; crewId: string; day: number; symptom: string; active: boolean; source: 'manual' | 'sim' | 'import' }
  | { t: 'habitat'; day: number; fields: Record<string, number>; source: 'sim' | 'import' }
  | { t: 'alert'; alertId: string; crewId: string; ruleId: string; status: string; day: number }
  | { t: 'ack'; alertId: string; crewId: string; day: number; by: string }
  | { t: 'check'; alertId: string; crewId: string; protocolId: string; stepId: string; checked: boolean; day: number; by: string }
  | { t: 'override'; alertId: string; crewId: string; day: number; by: string; reason: string }
  | { t: 'sim'; action: 'scenario' | 'reset' | 'day'; scenario?: string; day: number }
  | { t: 'lww'; key: string; value: unknown }
  | { t: 'pn'; key: string; delta: number };

export interface Op { id: string; hlc: Hlc; author: string; keyRef: string; body: OpBody }

/**
 * Estado derivado de un conjunto de operaciones. Como las operaciones forman un G-Set (id = SHA-256 del sobre),
 * reconstruir desde cualquier orden o con duplicados da el mismo resultado.
 */
export class CrdtState {
  readonly ops = new GSet<Op>((o) => o.id);
  readonly lww = new LwwMap<unknown>();
  readonly counters = new Map<string, PNCounter>();
  vv: VersionVector = {};

  apply(op: Op): boolean {
    if (!this.ops.add(op)) return false;
    vvObserve(this.vv, op.hlc);
    const b = op.body;
    if (b.t === 'lww') this.lww.set(b.key, b.value, op.hlc);
    if (b.t === 'pn') {
      let c = this.counters.get(b.key);
      if (!c) this.counters.set(b.key, (c = new PNCounter()));
      // Cada op pn es única en el G-Set: el contador por nodo suma sus deltas sin doble conteo.
      c.increment(op.author, b.delta);
    }
    return true;
  }

  merge(other: CrdtState): this {
    for (const op of other.ops.values()) this.apply(op);
    return this;
  }

  counter(key: string): number { return this.counters.get(key)?.value ?? 0; }

  /** Operaciones ordenadas por HLC (orden total determinista). */
  sorted(): Op[] {
    return [...this.ops.values()].sort((a, b) => compareHlc(a.hlc, b.hlc));
  }
}
