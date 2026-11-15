// Issue #7 [Data-03] — DoD AC-TECH-04: deterministic convergence after a simulated network partition, with no
// data loss, in < 3 s. Two real Data nodes (IndexedDB + AES-GCM envelopes + Ed25519 signatures + CRDT state)
// talk to an in-memory reference hub that follows the contract in 03-Contratos-API-OpenAPI-y-Eventos.md §2:
// signed HANDSHAKE with a VersionVector of HLC strings, DELTA_PUSH both ways, ordered relay.
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  CrdtState, decodeHlc, deltaFor, HybridClock, vvFromWire, vvOf, vvToWire, type OpBody,
} from '../src/storage/crdt';
import { generateDataKey, generateDeviceIdentity, sign, verify, type DeviceIdentity } from '../src/storage/crypto';
import { AsthaDb, type Envelope } from '../src/storage/idb';
import { IntegrityGuard, sealEnvelope } from '../src/storage/integrity';
import { handshakeBytes, SyncClient, type SyncMessage, type WebSocketLike } from '../src/storage/syncClient';

// ------------------------------------------------------------------ reference hub (test double)
class MemoryHub {
  readonly log = new Map<string, Envelope>();
  readonly sockets = new Set<HubSocket>();
  readonly rejectedHandshakes: string[] = [];
  up = true;

  constructor(private readonly enrolled: Map<string, DeviceIdentity>) {}

  attach(ws: HubSocket): void {
    if (!this.up) return ws.serverClose();
    this.sockets.add(ws);
    ws.deliverOpen();
  }

  /** Network partition: every socket drops and new connections fail until heal(). */
  partition(): void {
    this.up = false;
    for (const ws of [...this.sockets]) ws.serverClose();
    this.sockets.clear();
  }
  heal(): void { this.up = true; }

  async receive(from: HubSocket, raw: string): Promise<void> {
    const msg = JSON.parse(raw) as SyncMessage;
    if (msg.type === 'HANDSHAKE') {
      const dev = this.enrolled.get(msg.deviceId);
      const ok = !!dev && (await verify(dev.alg, dev.publicJwk, handshakeBytes(msg), msg.ed25519Signature));
      if (!ok) { this.rejectedHandshakes.push(msg.deviceId); return from.serverClose(); }
      from.deviceId = msg.deviceId;
      const missing = deltaFor(this.log.values(), vvFromWire(msg.versionVector));
      if (missing.length) from.deliver({ type: 'DELTA_PUSH', envelopes: missing });
      from.deliver({
        type: 'HANDSHAKE', deviceId: 'hub', versionVector: vvToWire(vvOf(this.log.values())),
        timestampUtc: new Date().toISOString(), ed25519Signature: '',
      });
    } else if (msg.type === 'DELTA_PUSH') {
      const fresh = msg.envelopes.filter((e) => !this.log.has(e.id));
      for (const e of fresh) this.log.set(e.id, e);
      if (!fresh.length) return;
      for (const ws of this.sockets) if (ws !== from && ws.deviceId) ws.deliver({ type: 'DELTA_PUSH', envelopes: fresh });
    }
  }
}

class HubSocket implements WebSocketLike {
  static hub: MemoryHub;
  readyState = 0;
  deviceId: string | null = null;
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  private chain: Promise<void> = Promise.resolve();
  private readonly hub = HubSocket.hub;

  constructor(readonly url: string) { queueMicrotask(() => this.hub.attach(this)); }

  /** Ordered, asynchronous delivery in both directions (like a real TCP-backed WebSocket). */
  private enqueue(fn: () => void | Promise<void>): void {
    this.chain = this.chain.then(() => new Promise<void>((r) => setTimeout(r, 0))).then(fn).catch(() => undefined);
  }
  send(data: string): void {
    if (this.readyState !== 1) return;
    this.enqueue(() => (this.readyState === 1 ? this.hub.receive(this, data) : undefined));
  }
  deliver(msg: SyncMessage): void {
    const data = JSON.stringify(msg);
    this.enqueue(() => { if (this.readyState === 1) this.onmessage?.({ data }); });
  }
  deliverOpen(): void { this.readyState = 1; this.onopen?.({}); }
  serverClose(): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.hub.sockets.delete(this);
    this.onclose?.({});
  }
  close(): void { this.serverClose(); }
}

// ------------------------------------------------------------------ Data node (worker logic, minus the UI)
class Node {
  readonly crdt = new CrdtState();
  readonly envs = new Map<string, Envelope>();
  client!: SyncClient;
  private db!: AsthaDb;
  private guard!: IntegrityGuard;
  private clock!: HybridClock;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(readonly device: DeviceIdentity, private readonly key: CryptoKey, private readonly enrolled: Map<string, DeviceIdentity>) {}

  async init(skewMs = 0): Promise<this> {
    this.db = await AsthaDb.open(`sync-${this.device.nodeId}-${Math.random()}`, new IDBFactory());
    const authorKeys = (autor: string) => {
      const d = this.enrolled.get(autor);
      return d ? { alg: d.alg, publicJwk: d.publicJwk } : null;
    };
    this.guard = new IntegrityGuard(this.db, authorKeys);
    this.clock = new HybridClock(this.device.nodeId, () => Date.now() + skewMs);
    this.client = new SyncClient({
      nodeId: this.device.nodeId, enabled: true, WebSocketImpl: HubSocket,
      baseDelayMs: 50, maxDelayMs: 200,
      getVersionVector: () => vvOf(this.envs.values()),
      getDelta: (remote) => deltaFor(this.envs.values(), remote),
      signHandshake: (bytes) => sign(this.device, bytes),
      onEnvelopes: (envs) => this.serial(() => this.applyRemote(envs)),
    });
    return this;
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn);
    this.tail = run.catch(() => undefined);
    return run;
  }

  write(body: OpBody): Promise<void> {
    return this.serial(async () => {
      const { envelope, op } = await sealEnvelope(body, this.clock.tick(), 'hab', this.key, this.device);
      await this.guard.store(envelope);
      this.envs.set(envelope.id, envelope);
      this.crdt.apply(op);
      this.client.push([envelope]);
    });
  }

  private async applyRemote(envs: Envelope[]): Promise<void> {
    for (const e of envs) {
      if (!(await this.db.addEnvelope(e))) continue;
      const r = await this.guard.open(e, new Map([['hab', this.key]]));
      if (r.status === 'ok') { this.crdt.apply(r.op); this.clock.receive(r.op.hlc); }
      this.envs.set(e.id, e); // counted as received only once fully applied
    }
  }

  /** Deterministic fingerprint of the replicated state. */
  snapshot() {
    return {
      ids: [...this.envs.keys()].sort(),
      redMode: this.crdt.lww.get('pref.redMode'),
      xp: this.crdt.counter('xp:C001'),
      measurements: this.crdt.sorted().filter((o) => o.body.t === 'measurement').map((o) => o.id),
      vv: this.crdt.vv,
    };
  }
}

async function until(cond: () => boolean, deadlineMs: number): Promise<number> {
  const t0 = performance.now();
  while (!cond()) {
    if (performance.now() - t0 > deadlineMs) throw new Error(`no convergence within ${deadlineMs} ms`);
    await new Promise((r) => setTimeout(r, 1));
  }
  return performance.now() - t0;
}

async function setup() {
  const [devA, devB] = await Promise.all([generateDeviceIdentity(), generateDeviceIdentity()]);
  const enrolled = new Map([devA, devB].map((d) => [d.nodeId, d]));
  const hub = new MemoryHub(enrolled);
  HubSocket.hub = hub;
  const key = await generateDataKey(false);
  // Node B's wall clock runs one hour behind: HLC must still order events deterministically.
  const a = await new Node(devA, key, enrolled).init();
  const b = await new Node(devB, key, enrolled).init(-3_600_000);
  return { hub, a, b, key, enrolled };
}

const meas = (day: number, sbp: number): OpBody => ({ t: 'measurement', crewId: 'C001', day, fields: { sbp }, source: 'manual' });

describe('AC-TECH-04 · convergence after a network partition', () => {
  it('two partitioned nodes converge deterministically with no data loss in < 3 s', async () => {
    const { hub, a, b, key, enrolled } = await setup();
    a.client.start();
    b.client.start();
    await a.write(meas(100, 118));
    await until(() => b.envs.size === 1, 3000);

    hub.partition();
    // Concurrent offline edits: G-Set records, the same LWW key with different values, and PN increments.
    for (let i = 0; i < 5; i++) await a.write(meas(101 + i, 120 + i));
    await a.write({ t: 'lww', key: 'pref.redMode', value: true });
    await a.write({ t: 'pn', key: 'xp:C001', delta: 20 });
    for (let i = 0; i < 4; i++) await b.write(meas(110 + i, 130 + i));
    await b.write({ t: 'lww', key: 'pref.redMode', value: false });
    await b.write({ t: 'pn', key: 'xp:C001', delta: 50 });
    await b.write({ t: 'pn', key: 'xp:C001', delta: -10 });
    expect(a.client.outboxSize).toBe(7); // offline buffer
    expect(b.client.outboxSize).toBe(7);

    hub.heal();
    a.client.notifyOnline();
    // A live write during A's handshake: it must wait behind the backlog (no VersionVector jump on peers).
    await a.write(meas(106, 126));
    b.client.notifyOnline();

    const total = 1 + 7 + 7 + 1;
    const ms = await until(() => a.envs.size === total && b.envs.size === total && hub.log.size === total, 3000);
    expect(ms).toBeLessThan(3000);

    const sa = a.snapshot();
    const sb = b.snapshot();
    expect(sa).toEqual(sb); // identical replicated state
    expect(sa.ids).toHaveLength(total); // no data loss
    expect(sa.xp).toBe(20 + 50 - 10); // PN-Counter adds every node's deltas exactly once
    expect(typeof sa.redMode).toBe('boolean'); // one LWW winner, the same on both nodes
    expect(a.client.outboxSize).toBe(0);
    expect(b.client.outboxSize).toBe(0);

    // A third node joining later receives the full history through the hub's delta.
    const devC = await generateDeviceIdentity();
    enrolled.set(devC.nodeId, devC); // pre-enrolled on Earth (ADR-020)
    const c = await new Node(devC, key, enrolled).init(120_000);
    c.client.start();
    await until(() => c.envs.size === total, 3000);
    expect(c.snapshot().ids).toEqual(sa.ids);
    expect(c.snapshot().xp).toBe(sa.xp);
    expect(c.snapshot().redMode).toBe(sa.redMode);
  });

  it('the hub rejects an unsigned or forged handshake (device not enrolled with a valid Ed25519 key)', async () => {
    const { hub, key, enrolled } = await setup();
    const rogue = await generateDeviceIdentity(); // not enrolled
    const n = await new Node(rogue, key, enrolled).init();
    n.client.start();
    await until(() => hub.rejectedHandshakes.length > 0, 3000);
    expect(hub.rejectedHandshakes).toContain(rogue.nodeId);
    n.client.stop();
  });

  it('deltas travel in ascending HLC, so a peer interrupted mid-stream never over-claims its VersionVector', () => {
    const items = [5, 1, 4, 2, 3].map((w) => ({ hlc: `${String(w).padStart(15, '0')}:000:n1` }));
    const sent = deltaFor(items, {});
    expect(sent.map((x) => decodeHlc(x.hlc).wallMs)).toEqual([1, 2, 3, 4, 5]);
    const prefix = sent.slice(0, 2); // connection dropped after two messages
    expect(deltaFor(items, vvOf(prefix)).map((x) => decodeHlc(x.hlc).wallMs)).toEqual([3, 4, 5]);
  });

  it('VersionVector wire format matches openapi.yaml (HLC strings) and ignores malformed entries', () => {
    const vv = { 'tablet-c001': 1_794_800_000_000 * 1000 + 4 };
    const wire = vvToWire(vv);
    expect(wire['tablet-c001']).toMatch(/^\d+:\d+:[a-zA-Z0-9-]+$/);
    expect(vvFromWire(wire)).toEqual(vv);
    expect(vvFromWire({ x: 'nope', y: 42, 'tablet-c002': '1:2:other-node' })).toEqual({});
  });
});
