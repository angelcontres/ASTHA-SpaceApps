// Bitácora append-only encadenada por SHA-256 (RNF-SEC-04, RF-REG-01).
// Cada dispositivo mantiene su propia cadena (prevHash = hash de su entrada anterior), porque con escrituras
// concurrentes desde varios dispositivos no puede haber una sola cadena lineal. La vista global ordena por HLC.
// Esta clase NO expone ninguna operación de edición ni de borrado.
import { encodeHlc, type HybridClock } from './crdt';
import {
  canonicalJson, decryptJson, encryptJson, fromB64, sha256, sign, toB64, utf8, verify,
  type DeviceIdentity, type SignAlg,
} from './crypto';
import type { AsthaDb, LedgerRecord } from './idb';

export type LedgerType =
  | 'alert_raised' | 'alert_resolved' | 'ack' | 'check' | 'uncheck' | 'override'
  | 'measurement' | 'symptom' | 'scenario' | 'reset' | 'day' | 'export' | 'import'
  | 'quarantine' | 'unlock' | 'lock' | 'sync';

export const GENESIS = '0'.repeat(64);

function hashInput(r: Omit<LedgerRecord, 'hash' | 'sig' | 'key'>): string {
  return canonicalJson({
    node: r.node, seq: r.seq, hlc: r.hlc, type: r.type, crewId: r.crewId,
    keyRef: r.keyRef, iv: r.iv, ct: r.ct, prevHash: r.prevHash,
  });
}

export function ledgerKey(node: string, seq: number): string {
  return `${node}:${String(seq).padStart(10, '0')}`;
}

export interface ChainCheck { ok: boolean; checked: number; brokenAt?: string; reason?: string }

export interface DecryptedEntry {
  key: string; node: string; seq: number; hlc: string; type: string; crewId: string | null; detail: string | null;
}

export class Ledger {
  private tail: Promise<unknown> = Promise.resolve();
  private head: { seq: number; hash: string } | null = null;

  constructor(
    private readonly db: AsthaDb,
    private readonly device: DeviceIdentity,
    private readonly clock: HybridClock,
  ) {}

  /** Añade una entrada. Las llamadas se serializan para que seq y prevHash sean consistentes. */
  append(type: LedgerType, crewId: string | null, detail: string, keyRef: string, key: CryptoKey): Promise<Readonly<LedgerRecord>> {
    const run = this.tail.then(async () => {
      if (!this.head) {
        const mine = await this.db.ledgerByNode(this.device.nodeId);
        const last = mine.at(-1);
        this.head = last ? { seq: last.seq, hash: last.hash } : { seq: 0, hash: GENESIS };
      }
      const hlc = encodeHlc(this.clock.tick());
      const seq = this.head.seq + 1;
      const { iv, ct } = await encryptJson(key, { detail }, `${this.device.nodeId}|${seq}|${type}`);
      const base = {
        node: this.device.nodeId, seq, hlc, type, crewId, keyRef,
        iv: toB64(iv), ct: toB64(ct), prevHash: this.head.hash,
      };
      const hash = await sha256(hashInput(base));
      const rec: LedgerRecord = { key: ledgerKey(base.node, seq), ...base, hash, sig: await sign(this.device, utf8(hash)) };
      await this.db.appendLedger(rec); // `add`: falla si la clave existe
      this.head = { seq, hash };
      return Object.freeze(rec);
    });
    this.tail = run.catch(() => undefined);
    return run;
  }

  /**
   * Fusiona entradas de otros dispositivos (G-Set por clave). Una clave ya presente con distinto hash
   * se rechaza: nunca se reemplaza una entrada existente.
   */
  async mergeRemote(records: LedgerRecord[]): Promise<{ added: number; rejected: number }> {
    const existing = new Map((await this.db.allLedger()).map((r) => [r.key, r.hash]));
    let added = 0;
    let rejected = 0;
    for (const r of records) {
      const have = existing.get(r.key);
      if (have === r.hash) continue;
      if (have !== undefined || r.hash !== (await sha256(hashInput(r)))) { rejected++; continue; }
      try { await this.db.appendLedger(r); added++; existing.set(r.key, r.hash); } catch { rejected++; }
    }
    return { added, rejected };
  }

  /** Verifica la cadena de un nodo (o de todos): hash de cada entrada, enlace prevHash, seq contiguo y firma. */
  async verifyChain(signers?: (node: string) => { alg: SignAlg; publicJwk: JsonWebKey } | null): Promise<ChainCheck> {
    const all = await this.db.allLedger();
    const byNode = new Map<string, LedgerRecord[]>();
    for (const r of all) (byNode.get(r.node) ?? byNode.set(r.node, []).get(r.node)!).push(r);
    let checked = 0;
    for (const [node, list] of byNode) {
      list.sort((a, b) => a.seq - b.seq);
      let prev = GENESIS;
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        checked++;
        if (r.seq !== i + 1) return { ok: false, checked, brokenAt: r.key, reason: `hueco en la secuencia de ${node}` };
        if (r.prevHash !== prev) return { ok: false, checked, brokenAt: r.key, reason: 'prevHash no enlaza con la entrada anterior' };
        if ((await sha256(hashInput(r))) !== r.hash) return { ok: false, checked, brokenAt: r.key, reason: 'hash no coincide: entrada alterada' };
        const s = signers?.(node);
        if (s && !(await verify(s.alg, s.publicJwk, utf8(r.hash), r.sig))) {
          return { ok: false, checked, brokenAt: r.key, reason: 'firma inválida' };
        }
        prev = r.hash;
      }
    }
    return { ok: true, checked };
  }

  /** Vista global ordenada por HLC; solo se descifra lo que la sesión puede leer. */
  async entries(keys: Map<string, CryptoKey>): Promise<DecryptedEntry[]> {
    const all = (await this.db.allLedger()).sort((a, b) => (a.hlc < b.hlc ? -1 : a.hlc > b.hlc ? 1 : 0));
    const out: DecryptedEntry[] = [];
    for (const r of all) {
      let detail: string | null = null;
      const k = keys.get(r.keyRef);
      if (k) {
        try {
          detail = (await decryptJson<{ detail: string }>(k, fromB64(r.iv), fromB64(r.ct), `${r.node}|${r.seq}|${r.type}`)).detail;
        } catch {
          detail = null;
        }
      }
      out.push({ key: r.key, node: r.node, seq: r.seq, hlc: r.hlc, type: r.type, crewId: r.crewId, detail });
    }
    return out;
  }
}
