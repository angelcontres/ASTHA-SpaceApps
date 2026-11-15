// Sellado y verificación de sobres (RNF-SEC-01, RNF-SEC-03, AC-TECH-06).
// sha256 = SHA-256 de la forma canónica de {id, hlc, autor, keyRef, iv, ct}: un bit invertido en cualquiera de esos
// campos (o en el propio sha256) cambia el resumen, así que la detección es determinista, no probabilística.
// firma = Ed25519 del dispositivo sobre sha256 (autenticidad). Además el AAD de AES-GCM liga ct a hlc|autor|keyRef.
// Al escribir: se relee el sobre recién guardado y se verifica (write-verify).
// Al leer: SHA-256 → firma → descifrado. Si falla, se intenta la réplica local (envelopes_replica); si es válida se
// restaura y la copia dañada queda en cuarentena. Si no hay copia válida, se aísla y se pide réplica al Hub.
// Nunca lanza.
import { decodeHlc, encodeHlc, type Hlc, type Op, type OpBody } from './crdt';
import {
  canonicalJson, decryptJson, encryptJson, fromB64, sha256, sign, toB64, utf8, verify,
  type DeviceIdentity, type SignAlg,
} from './crypto';
import type { AsthaDb, Envelope } from './idb';

function aad(hlc: string, autor: string, keyRef: string): string {
  return `${hlc}|${autor}|${keyRef}`;
}

/** Resumen anti-SEU de todo el contenido del sobre salvo la firma. */
export function envelopeDigest(e: Pick<Envelope, 'id' | 'hlc' | 'autor' | 'keyRef' | 'iv' | 'ct'>): Promise<string> {
  return sha256(canonicalJson({ id: e.id, hlc: e.hlc, autor: e.autor, keyRef: e.keyRef, iv: e.iv, ct: e.ct }));
}

/** Cifra con AES-GCM-256 y firma una operación. */
export async function sealEnvelope(
  body: OpBody,
  hlc: Hlc,
  keyRef: string,
  key: CryptoKey,
  device: DeviceIdentity,
): Promise<{ envelope: Envelope; op: Op }> {
  const h = encodeHlc(hlc);
  const id = crypto.randomUUID();
  const { iv, ct } = await encryptJson(key, body, aad(h, device.nodeId, keyRef));
  const partial = { id, hlc: h, autor: device.nodeId, keyRef, iv: toB64(iv), ct: toB64(ct) };
  const digest = await envelopeDigest(partial);
  const envelope: Envelope = { ...partial, sha256: digest, firma: await sign(device, utf8(digest)) };
  return { envelope, op: { id, hlc, author: device.nodeId, keyRef, body } };
}

export type CheckResult = { ok: true } | { ok: false; reason: string };

export interface AuthorKey { alg: SignAlg; publicJwk: JsonWebKey }

const HEX64 = /^[0-9a-f]{64}$/;

/** Verifica forma, SHA-256 y firma ANTES de descifrar. */
export async function checkEnvelope(env: Envelope, authorKey: AuthorKey | null): Promise<CheckResult> {
  try {
    if (!HEX64.test(env.sha256)) return { ok: false, reason: 'campo sha256 dañado (posible SEU)' };
    if (fromB64(env.iv).length !== 12) return { ok: false, reason: 'IV dañado (no son 96 bits)' };
    if ((await envelopeDigest(env)) !== env.sha256) return { ok: false, reason: 'SHA-256 del sobre no coincide (posible SEU)' };
    if (authorKey && !(await verify(authorKey.alg, authorKey.publicJwk, utf8(env.sha256), env.firma))) {
      return { ok: false, reason: 'firma del dispositivo inválida' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `sobre ilegible: ${(e as Error).message}` };
  }
}

export interface ReadReport {
  ops: Op[];
  /** Sobres válidos que esta sesión no puede descifrar (otra K_t: RBAC). */
  locked: number;
  /** Sobres dañados que se restauraron desde la réplica local. */
  recovered: { id: string; reason: string }[];
  /** Sobres sin ninguna copia válida: aislados y pedidos al Hub. */
  quarantined: { id: string; reason: string }[];
}

export type OpenResult =
  | { status: 'ok'; op: Op; recovered?: string }
  | { status: 'locked'; recovered?: string }
  | { status: 'quarantined'; reason: string };

export interface IntegrityEvents {
  /** Solicitud de réplica por id al Sync Hub (si hay conexión). */
  onReplicaRequest?: (id: string) => void;
  onQuarantine?: (id: string, reason: string) => void;
  onRecovered?: (id: string, reason: string) => void;
}

export class WriteVerifyError extends Error {
  constructor(readonly id: string, reason: string) { super(`verificación tras escritura fallida (${id}): ${reason}`); }
}

export class IntegrityGuard {
  constructor(
    private readonly db: AsthaDb,
    private readonly authorKeys: (autor: string) => AuthorKey | null,
    private readonly events: IntegrityEvents = {},
  ) {}

  /**
   * Guarda el sobre (G-Set + réplica) y lo relee para verificarlo (write-verify, RNF-SEC-03).
   * Devuelve false si ya existía. Lanza WriteVerifyError si lo releído no supera la verificación.
   */
  async store(env: Envelope): Promise<boolean> {
    const added = await this.db.addEnvelope(env);
    if (!added) return false;
    const back = await this.db.getEnvelope(env.id);
    const check = back ? await checkEnvelope(back, this.authorKeys(back.autor)) : { ok: false as const, reason: 'no se pudo releer' };
    if (!check.ok || back!.sha256 !== env.sha256) {
      throw new WriteVerifyError(env.id, check.ok ? 'contenido releído distinto' : check.reason);
    }
    return true;
  }

  /** Verifica y descifra un sobre, recuperándolo desde la réplica si hace falta. Nunca lanza. */
  async open(env: Envelope, keys: Map<string, CryptoKey>): Promise<OpenResult> {
    const check = await this.verifyAndDecrypt(env, keys);
    if (check.status !== 'bad') return check;

    // Recuperación local desde la copia redundante.
    let replica: Envelope | undefined;
    try { replica = await this.db.getReplica(env.id); } catch { replica = undefined; }
    if (replica) {
      const r = await this.verifyAndDecrypt(replica, keys);
      if (r.status !== 'bad') {
        try { await this.db.restoreFromReplica(env, replica, check.reason); } catch { /* el estado derivado usa la copia buena igualmente */ }
        this.events.onRecovered?.(env.id, check.reason);
        return { ...r, recovered: check.reason };
      }
    }
    await this.isolate(env, check.reason);
    return { status: 'quarantined', reason: check.reason };
  }

  /** Lee todos los sobres; los corruptos se recuperan o se aíslan sin interrumpir la lectura del resto. */
  async readAll(keys: Map<string, CryptoKey>): Promise<ReadReport> {
    const report: ReadReport = { ops: [], locked: 0, recovered: [], quarantined: [] };
    let envelopes: Envelope[];
    let replicas: Map<string, Envelope>;
    try {
      envelopes = await this.db.allEnvelopes();
      replicas = new Map((await this.db.allReplicas()).map((e) => [e.id, e]));
    } catch {
      return report; // almacén ilegible: la app sigue con el dataset base
    }
    for (const env of envelopes) {
      const r = await this.open(env, keys);
      if (r.status === 'quarantined') { report.quarantined.push({ id: env.id, reason: r.reason }); continue; }
      if (r.recovered) report.recovered.push({ id: env.id, reason: r.recovered });
      else await this.scrubReplica(env, replicas.get(env.id));
      if (r.status === 'ok') report.ops.push(r.op);
      else report.locked++;
    }
    return report;
  }

  /** Repara la réplica si falta o difiere de un primario ya verificado. */
  private async scrubReplica(primary: Envelope, replica: Envelope | undefined): Promise<void> {
    if (replica && replica.sha256 === primary.sha256 && replica.ct === primary.ct && replica.iv === primary.iv
      && replica.firma === primary.firma && replica.hlc === primary.hlc && replica.autor === primary.autor
      && replica.keyRef === primary.keyRef) return;
    try { await this.db.putReplica(primary); } catch { /* se reintentará en la próxima lectura */ }
  }

  private async verifyAndDecrypt(env: Envelope, keys: Map<string, CryptoKey>): Promise<
    { status: 'ok'; op: Op } | { status: 'locked' } | { status: 'bad'; reason: string }
  > {
    const check = await checkEnvelope(env, this.authorKeys(env.autor));
    if (!check.ok) return { status: 'bad', reason: check.reason };
    const key = keys.get(env.keyRef);
    if (!key) return { status: 'locked' };
    try {
      const body = await decryptJson<OpBody>(key, fromB64(env.iv), fromB64(env.ct), aad(env.hlc, env.autor, env.keyRef));
      return { status: 'ok', op: { id: env.id, hlc: decodeHlc(env.hlc), author: env.autor, keyRef: env.keyRef, body } };
    } catch {
      return { status: 'bad', reason: 'etiqueta AES-GCM inválida' };
    }
  }

  private async isolate(env: Envelope, reason: string): Promise<void> {
    try {
      await this.db.quarantine(env, reason);
    } catch {
      /* si ni siquiera se puede mover, se excluye igualmente del estado derivado */
    }
    this.events.onQuarantine?.(env.id, reason);
    this.events.onReplicaRequest?.(env.id);
  }
}
