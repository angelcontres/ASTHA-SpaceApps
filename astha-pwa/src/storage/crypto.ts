// Web Crypto nativo (ADR-006, ADR-012). Cero librerías externas.
//  - PBKDF2-SHA-256: PIN → KEK (AES-KW 256).
//  - K_t por tripulante y K_hab de hábitat: AES-GCM 256, envueltas con AES-KW.
//  - AES-GCM 256 con IV aleatorio de 96 bits por registro.
//  - SHA-256 y firma Ed25519 del dispositivo.
// Funciona igual en un Web Worker y en Node (globalThis.crypto).

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

/** Iteraciones PBKDF2 en producción. Las pruebas pasan un valor bajo. */
export const PBKDF2_ITERATIONS = 310_000;
export const IV_BYTES = 12; // 96 bits

// ---------- utilidades ----------

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

export function toHex(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const x of b) s += x.toString(16).padStart(2, '0');
  return s;
}

export function toB64(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

export function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function utf8(s: string): Uint8Array<ArrayBuffer> {
  return enc.encode(s);
}

/** JSON canónico (claves ordenadas) para hashes y firmas deterministas. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
    .join(',')}}`;
}

// ---------- SHA-256 ----------

export async function sha256(data: Uint8Array<ArrayBuffer> | string): Promise<string> {
  const bytes = typeof data === 'string' ? utf8(data) : data;
  return toHex(await subtle.digest('SHA-256', bytes));
}

// ---------- PBKDF2 → KEK ----------

export async function deriveKek(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const base = await subtle.importKey('raw', utf8(pin), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

// ---------- claves de datos (K_t, K_hab) ----------

/** Genera una clave AES-GCM 256. Extraíble solo para poder envolverla en el aprovisionamiento. */
export function generateDataKey(extractable = true): Promise<CryptoKey> {
  return subtle.generateKey({ name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt']);
}

export async function wrapDataKey(key: CryptoKey, kek: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await subtle.wrapKey('raw', key, kek, 'AES-KW'));
}

/** Desenvuelve como NO extraíble: la clave solo vive en memoria del worker (ADR-012). Lanza si el PIN es incorrecto. */
export function unwrapDataKey(wrapped: Uint8Array<ArrayBuffer>, kek: CryptoKey): Promise<CryptoKey> {
  return subtle.unwrapKey('raw', wrapped, kek, 'AES-KW', { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

// ---------- AES-GCM ----------

export interface Sealed { iv: Uint8Array<ArrayBuffer>; ct: Uint8Array<ArrayBuffer> }

export async function encryptBytes(
  key: CryptoKey,
  plain: Uint8Array<ArrayBuffer>,
  aad?: Uint8Array<ArrayBuffer>,
): Promise<Sealed> {
  const iv = randomBytes(IV_BYTES);
  const ct = new Uint8Array(
    await subtle.encrypt({ name: 'AES-GCM', iv, ...(aad ? { additionalData: aad } : {}) }, key, plain),
  );
  return { iv, ct };
}

export async function decryptBytes(
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
  ct: Uint8Array<ArrayBuffer>,
  aad?: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(
    await subtle.decrypt({ name: 'AES-GCM', iv, ...(aad ? { additionalData: aad } : {}) }, key, ct),
  );
}

export async function encryptJson(key: CryptoKey, value: unknown, aad?: string): Promise<Sealed> {
  return encryptBytes(key, utf8(JSON.stringify(value)), aad ? utf8(aad) : undefined);
}

export async function decryptJson<T>(key: CryptoKey, iv: Uint8Array<ArrayBuffer>, ct: Uint8Array<ArrayBuffer>, aad?: string): Promise<T> {
  return JSON.parse(dec.decode(await decryptBytes(key, iv, ct, aad ? utf8(aad) : undefined))) as T;
}

// ---------- firma del dispositivo (Ed25519) ----------

export type SignAlg = 'Ed25519' | 'ECDSA-P256';

export interface DeviceIdentity {
  nodeId: string;
  alg: SignAlg;
  keys: CryptoKeyPair;
  publicJwk: JsonWebKey;
}

function algParams(alg: SignAlg): EcKeyImportParams | Algorithm {
  return alg === 'Ed25519' ? { name: 'Ed25519' } : { name: 'ECDSA', namedCurve: 'P-256' };
}
function signParams(alg: SignAlg): Algorithm | EcdsaParams {
  return alg === 'Ed25519' ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' };
}

/** Clave de firma del dispositivo. Privada no extraíble. Si el navegador no soporta Ed25519, ECDSA P-256. */
export async function generateDeviceIdentity(): Promise<DeviceIdentity> {
  let alg: SignAlg = 'Ed25519';
  let keys: CryptoKeyPair;
  try {
    keys = (await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])) as CryptoKeyPair;
  } catch {
    alg = 'ECDSA-P256';
    keys = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  }
  const publicJwk = await subtle.exportKey('jwk', keys.publicKey);
  const nodeId = (await sha256(canonicalJson(publicJwk))).slice(0, 12);
  return { nodeId, alg, keys, publicJwk };
}

export async function sign(id: DeviceIdentity, data: Uint8Array<ArrayBuffer>): Promise<string> {
  return toB64(await subtle.sign(signParams(id.alg), id.keys.privateKey, data));
}

export async function verify(
  alg: SignAlg,
  publicJwk: JsonWebKey,
  data: Uint8Array<ArrayBuffer>,
  sigB64: string,
): Promise<boolean> {
  try {
    const pub = await subtle.importKey('jwk', publicJwk, algParams(alg), true, ['verify']);
    return await subtle.verify(signParams(alg), pub, fromB64(sigB64), data);
  } catch {
    return false;
  }
}

// ---------- RBAC criptográfico (RNF-SEC-02, ADR-012) ----------

export interface PersonCredential { personId: string; pin: string }

/** Material persistible del aprovisionamiento (ADR-020): sales por persona y claves envueltas. */
export interface Keyring {
  iterations: number;
  salts: Record<string, string>; // personId → sal (b64)
  /** wrapped[crewId][personId] = K_t envuelta con la KEK de personId (b64). */
  wrapped: Record<string, Record<string, string>>;
  /** K_hab envuelta con la KEK de cada persona (b64). */
  habWrapped: Record<string, string>;
  /**
   * Copia no extraíble de K_hab ligada al dispositivo (CryptoKey en IndexedDB). Permite mostrar hábitat y
   * semáforo global en la pantalla de bloqueo antes del PIN (ADR-014, ADR-015). Nunca descifra datos clínicos.
   */
  habDeviceKey: CryptoKey;
  /**
   * Origin of the data keys. 'mission-seed-v1': derived from the shared mission secret, identical on every
   * device of the crew (stand-in for ADR-020 ground provisioning), so envelopes synced through the hub are
   * readable on the other devices. Absent/'random': legacy per-device random keys.
   */
  provisioning?: 'mission-seed-v1' | 'random';
}

/** Current provisioning scheme of `provisionKeyring` when a mission secret is supplied. */
export const MISSION_PROVISIONING = 'mission-seed-v1' as const;

/**
 * Deterministic AES-GCM-256 data key: HKDF-SHA-256(missionSecret, salt="astha-ground-provisioning-v1",
 * info=label). Every device holding the same mission secret derives the same K_t / K_hab, while each device
 * still wraps them under its own PIN-derived KEKs (ADR-012). Extractable only so it can be wrapped.
 */
export async function deriveMissionKey(missionSecret: string, label: string): Promise<CryptoKey> {
  const base = await subtle.importKey('raw', utf8(missionSecret), 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: utf8('astha-ground-provisioning-v1'), info: utf8(label) },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Aprovisiona las claves: una K_t por tripulante envuelta con el PIN del dueño y con el del CMO,
 * y una K_hab compartida envuelta con todos los PIN.
 */
export async function provisionKeyring(
  crew: PersonCredential[],
  cmoId: string,
  iterations = PBKDF2_ITERATIONS,
  /** Shared mission secret (ADR-020 stand-in). Without it, keys are random and device-local. */
  missionSecret?: string,
): Promise<Keyring> {
  const dataKey = (label: string) => (missionSecret ? deriveMissionKey(missionSecret, label) : generateDataKey(true));
  const keks = new Map<string, CryptoKey>();
  const salts: Record<string, string> = {};
  for (const p of crew) {
    const salt = randomBytes(16);
    salts[p.personId] = toB64(salt);
    keks.set(p.personId, await deriveKek(p.pin, salt, iterations));
  }
  const cmoKek = keks.get(cmoId);
  if (!cmoKek) throw new Error(`CMO ${cmoId} no está en la tripulación`);

  const wrapped: Keyring['wrapped'] = {};
  for (const p of crew) {
    const kt = await dataKey(`K_t:${p.personId}`);
    wrapped[p.personId] = {
      [p.personId]: toB64(await wrapDataKey(kt, keks.get(p.personId)!)),
      [cmoId]: toB64(await wrapDataKey(kt, cmoKek)),
    };
  }
  const khab = await dataKey('K_hab');
  const habWrapped: Record<string, string> = {};
  for (const p of crew) habWrapped[p.personId] = toB64(await wrapDataKey(khab, keks.get(p.personId)!));
  const raw = await subtle.exportKey('raw', khab);
  const habDeviceKey = await subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  new Uint8Array(raw).fill(0);
  return { iterations, salts, wrapped, habWrapped, habDeviceKey, provisioning: missionSecret ? MISSION_PROVISIONING : 'random' };
}

export interface UnlockedSession {
  personId: string;
  /** keyRef ('C001'… o 'hab') → clave no extraíble. */
  keys: Map<string, CryptoKey>;
}

export class WrongPinError extends Error {
  constructor() { super('PIN incorrecto'); }
}

/** Desbloquea con el PIN: solo se obtienen las K_t que esa persona puede desenvolver. */
export async function unlockKeyring(ring: Keyring, personId: string, pin: string): Promise<UnlockedSession> {
  const salt = ring.salts[personId];
  if (!salt) throw new WrongPinError();
  const kek = await deriveKek(pin, fromB64(salt), ring.iterations);
  const keys = new Map<string, CryptoKey>();
  try {
    keys.set('hab', await unwrapDataKey(fromB64(ring.habWrapped[personId]), kek));
  } catch {
    throw new WrongPinError(); // AES-KW verifica integridad: un PIN erróneo no desenvuelve
  }
  for (const [crewId, byPerson] of Object.entries(ring.wrapped)) {
    const w = byPerson[personId];
    if (w) keys.set(crewId, await unwrapDataKey(fromB64(w), kek));
  }
  return { personId, keys };
}
