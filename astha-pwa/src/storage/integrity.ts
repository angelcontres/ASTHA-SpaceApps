// Sellado y verificación de sobres (RNF-SEC-01, RNF-SEC-03).
// Al leer: SHA-256 del texto cifrado → id del sobre → firma → descifrado AES-GCM.
// Cualquier fallo aísla el sobre en `quarantine`, pide réplica por id y lo excluye del estado. Nunca lanza.
import { decodeHlc, encodeHlc, type Hlc, type Op, type OpBody } from './crdt';
import {
  canonicalJson, decryptJson, encryptJson, fromB64, sha256, sign, toB64, utf8, verify,
  type DeviceIdentity, type SignAlg,
} from './crypto';
import type { AsthaDb, Envelope } from './idb';

function aad(hlc: string, author: string, keyRef: string): string {
  return `${hlc}|${author}|${keyRef}`;
}

async function envelopeId(e: Pick<Envelope, 'hlc' | 'author' | 'keyRef' | 'iv' | 'ct'>): Promise<string> {
  return sha256(canonicalJson({ hlc: e.hlc, author: e.author, keyRef: e.keyRef, iv: e.iv, ct: e.ct }));
}

/** Cifra y firma una operación. El id resultante es el SHA-256 del sobre (identidad del G-Set). */
export async function sealEnvelope(
  body: OpBody,
  hlc: Hlc,
  keyRef: string,
  key: CryptoKey,
  device: DeviceIdentity,
): Promise<{ envelope: Envelope; op: Op }> {
  const h = encodeHlc(hlc);
  const { iv, ct } = await encryptJson(key, body, aad(h, device.nodeId, keyRef));
  const partial = { hlc: h, author: device.nodeId, keyRef, iv: toB64(iv), ct: toB64(ct) };
  const id = await envelopeId(partial);
  const envelope: Envelope = {
    id, ...partial,
    sha256: await sha256(ct),
    sig: await sign(device, utf8(id)),
  };
  return { envelope, op: { id, hlc, author: device.nodeId, keyRef, body } };
}

export type CheckResult = { ok: true } | { ok: false; reason: string };

export interface AuthorKey { alg: SignAlg; publicJwk: JsonWebKey }

/** Verifica hash del texto cifrado, id y firma ANTES de descifrar. */
export async function checkEnvelope(env: Envelope, authorKey: AuthorKey | null): Promise<CheckResult> {
  try {
    if ((await sha256(fromB64(env.ct))) !== env.sha256) return { ok: false, reason: 'SHA-256 del texto cifrado no coincide (posible SEU)' };
    if ((await envelopeId(env)) !== env.id) return { ok: false, reason: 'id del sobre no coincide con su contenido' };
    if (authorKey && !(await verify(authorKey.alg, authorKey.publicJwk, utf8(env.id), env.sig))) {
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
  quarantined: { id: string; reason: string }[];
}

export type OpenResult =
  | { status: 'ok'; op: Op }
  | { status: 'locked' }
  | { status: 'quarantined'; reason: string };

export interface IntegrityEvents {
  /** Solicitud de réplica por id al Sync Hub (si hay conexión). */
  onReplicaRequest?: (id: string) => void;
  onQuarantine?: (id: string, reason: string) => void;
}

export class IntegrityGuard {
  constructor(
    private readonly db: AsthaDb,
    private readonly authorKeys: (author: string) => AuthorKey | null,
    private readonly events: IntegrityEvents = {},
  ) {}

  /** Verifica y descifra un sobre. Nunca lanza. */
  async open(env: Envelope, keys: Map<string, CryptoKey>): Promise<OpenResult> {
    const check = await checkEnvelope(env, this.authorKeys(env.author));
    if (!check.ok) {
      await this.isolate(env, check.reason);
      return { status: 'quarantined', reason: check.reason };
    }
    const key = keys.get(env.keyRef);
    if (!key) return { status: 'locked' };
    try {
      const body = await decryptJson<OpBody>(key, fromB64(env.iv), fromB64(env.ct), aad(env.hlc, env.author, env.keyRef));
      return { status: 'ok', op: { id: env.id, hlc: decodeHlc(env.hlc), author: env.author, keyRef: env.keyRef, body } };
    } catch {
      const reason = 'etiqueta AES-GCM inválida';
      await this.isolate(env, reason);
      return { status: 'quarantined', reason };
    }
  }

  /** Lee todos los sobres; los corruptos se aíslan sin interrumpir la lectura del resto. */
  async readAll(keys: Map<string, CryptoKey>): Promise<ReadReport> {
    const report: ReadReport = { ops: [], locked: 0, quarantined: [] };
    let envelopes: Envelope[] = [];
    try {
      envelopes = await this.db.allEnvelopes();
    } catch {
      return report; // almacén ilegible: la app sigue con el dataset base
    }
    for (const env of envelopes) {
      const r = await this.open(env, keys);
      if (r.status === 'ok') report.ops.push(r.op);
      else if (r.status === 'locked') report.locked++;
      else report.quarantined.push({ id: env.id, reason: r.reason });
    }
    return report;
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
