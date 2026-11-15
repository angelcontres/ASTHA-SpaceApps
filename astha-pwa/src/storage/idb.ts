// IndexedDB de sobres cifrados (ADR-006, RNF-SEC-01). localStorage está prohibido para datos clínicos.
// Mapeo físico de docs/Modelo-datos-y-APIs/01-Diagrama-Entidad-Relacion.md §2 (ASTHA_EDGE_DB v1):
//   key_vault          → claves envueltas por PIN, identidad del dispositivo y K_hab de dispositivo (CryptoKey no extraíble)
//   envelopes_gset     → sobres EncryptedEnvelope {id, hlc, autor, keyRef, iv, ct, sha256, firma} (G-Set: solo se añaden)
//   envelopes_replica  → copia redundante de cada sobre, escrita en la misma transacción; fuente de recuperación
//                        local ante un SEU (RNF-SEC-03) sin depender del Sync Hub
//   quarantine         → sobres que fallaron la verificación SHA-256, conservados para análisis forense
//   audit_chain        → bitácora encadenada por dispositivo (solo `add`, RNF-SEC-04)
// Las preferencias LWW y los contadores PN (stores lww_preferences / pn_counters del ER) no se guardan en claro:
// son operaciones CRDT cifradas dentro de envelopes_gset y el estado se deriva al leer (ADR-009).

/** Sobre criptográfico: contrato `EncryptedEnvelope` de docs/Modelo-datos-y-APIs/openapi.yaml. */
export interface Envelope {
  /** UUID v4: identidad en el G-Set. */
  id: string;
  /** HLC `ms:cnt:node` (ver crdt.ts). */
  hlc: string;
  /** nodeId del dispositivo firmante. */
  autor: string;
  /** Clave usada: 'C001'…'C004' (K_t, ADR-012) o 'hab' (K_hab, ADR-014). No es secreto. */
  keyRef: string;
  /** IV AES-GCM de 96 bits (b64). */
  iv: string;
  /** Texto cifrado AES-GCM-256 (b64). */
  ct: string;
  /** SHA-256 (hex) de la forma canónica de {id, hlc, autor, keyRef, iv, ct}: detecta cualquier bit-flip en ellos. */
  sha256: string;
  /** Firma Ed25519 (o ECDSA P-256 de respaldo) del dispositivo autor sobre `sha256` (b64). */
  firma: string;
}

export interface QuarantineRecord { id: string; envelope: Envelope; reason: string; at: number }

export interface LedgerRecord {
  /** `${node}:${seq con ceros}` */
  key: string;
  node: string;
  seq: number;
  hlc: string;
  type: string;
  crewId: string | null;
  keyRef: string;
  iv: string;
  ct: string;
  prevHash: string;
  hash: string;
  sig: string;
}

export const DB_NAME = 'ASTHA_EDGE_DB';
const DB_VERSION = 1;

export const STORES = {
  vault: 'key_vault',
  envelopes: 'envelopes_gset',
  replica: 'envelopes_replica',
  quarantine: 'quarantine',
  ledger: 'audit_chain',
} as const;

const S = STORES;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('error de IndexedDB'));
    tx.onabort = () => reject(tx.error ?? new Error('transacción abortada'));
  });
}

export class AsthaDb {
  private constructor(private readonly db: IDBDatabase) {}

  static open(name = DB_NAME, factory: IDBFactory = globalThis.indexedDB): Promise<AsthaDb> {
    return new Promise((resolve, reject) => {
      const r = factory.open(name, DB_VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore(S.vault);
        const env = db.createObjectStore(S.envelopes, { keyPath: 'id' });
        env.createIndex('by_hlc', 'hlc');
        env.createIndex('by_crew', 'keyRef');
        env.createIndex('by_autor', 'autor');
        db.createObjectStore(S.replica, { keyPath: 'id' });
        db.createObjectStore(S.quarantine, { keyPath: 'id' });
        db.createObjectStore(S.ledger, { keyPath: 'key' }).createIndex('by_node', 'node');
      };
      r.onsuccess = () => resolve(new AsthaDb(r.result));
      r.onerror = () => reject(r.error);
    });
  }

  close(): void { this.db.close(); }

  /** Nombres de los object stores creados (para auditoría y pruebas). */
  storeNames(): string[] { return [...this.db.objectStoreNames]; }

  // ---------- key_vault ----------
  async getVault<T>(key: string): Promise<T | undefined> {
    return req(this.db.transaction(S.vault).objectStore(S.vault).get(key)) as Promise<T | undefined>;
  }
  async putVault(key: string, value: unknown): Promise<void> {
    const tx = this.db.transaction(S.vault, 'readwrite');
    tx.objectStore(S.vault).put(value, key);
    return done(tx);
  }

  // ---------- envelopes_gset + envelopes_replica ----------
  /**
   * Añade el sobre y su réplica en una sola transacción si no existe. Devuelve false si ya estaba
   * (merge idempotente del G-Set).
   */
  async addEnvelope(env: Envelope): Promise<boolean> {
    const tx = this.db.transaction([S.envelopes, S.replica], 'readwrite');
    const store = tx.objectStore(S.envelopes);
    let added = false;
    // Callbacks (no await) para que la transacción siga activa entre las peticiones.
    store.getKey(env.id).onsuccess = (e) => {
      if ((e.target as IDBRequest).result === undefined) {
        store.add(env);
        tx.objectStore(S.replica).put(env);
        added = true;
      }
    };
    await done(tx);
    return added;
  }
  getEnvelope(id: string): Promise<Envelope | undefined> {
    return req(this.db.transaction(S.envelopes).objectStore(S.envelopes).get(id));
  }
  allEnvelopes(): Promise<Envelope[]> {
    return req(this.db.transaction(S.envelopes).objectStore(S.envelopes).getAll());
  }
  getReplica(id: string): Promise<Envelope | undefined> {
    return req(this.db.transaction(S.replica).objectStore(S.replica).get(id));
  }
  allReplicas(): Promise<Envelope[]> {
    return req(this.db.transaction(S.replica).objectStore(S.replica).getAll());
  }
  /** Reescribe la réplica (reparación cuando la copia redundante es la dañada). */
  async putReplica(env: Envelope): Promise<void> {
    const tx = this.db.transaction(S.replica, 'readwrite');
    tx.objectStore(S.replica).put(env);
    return done(tx);
  }

  /**
   * Recuperación desde réplica (RNF-SEC-03): guarda la copia corrupta en cuarentena para análisis forense y
   * restaura la versión verificada en el G-Set, todo en una transacción. No es una edición clínica: el sobre
   * restaurado es byte a byte el original firmado.
   */
  async restoreFromReplica(corrupt: Envelope, good: Envelope, reason: string): Promise<void> {
    const tx = this.db.transaction([S.envelopes, S.replica, S.quarantine], 'readwrite');
    tx.objectStore(S.quarantine).put({ id: corrupt.id, envelope: corrupt, reason: `recuperado: ${reason}`, at: Date.now() } satisfies QuarantineRecord);
    tx.objectStore(S.envelopes).put(good);
    tx.objectStore(S.replica).put(good);
    return done(tx);
  }

  /** Sin copia válida: aísla el sobre (y su réplica) en una sola transacción. */
  async quarantine(env: Envelope, reason: string): Promise<void> {
    const tx = this.db.transaction([S.envelopes, S.replica, S.quarantine], 'readwrite');
    tx.objectStore(S.envelopes).delete(env.id);
    tx.objectStore(S.replica).delete(env.id);
    tx.objectStore(S.quarantine).put({ id: env.id, envelope: env, reason, at: Date.now() } satisfies QuarantineRecord);
    return done(tx);
  }
  allQuarantine(): Promise<QuarantineRecord[]> {
    return req(this.db.transaction(S.quarantine).objectStore(S.quarantine).getAll());
  }

  // ---------- audit_chain (solo add) ----------
  /** `add` falla si la clave ya existe: no hay forma de sobrescribir una entrada. */
  async appendLedger(rec: LedgerRecord): Promise<void> {
    const tx = this.db.transaction(S.ledger, 'readwrite');
    tx.objectStore(S.ledger).add(rec);
    return done(tx);
  }
  allLedger(): Promise<LedgerRecord[]> {
    return req(this.db.transaction(S.ledger).objectStore(S.ledger).getAll());
  }
  async ledgerByNode(node: string): Promise<LedgerRecord[]> {
    const all = await req(this.db.transaction(S.ledger).objectStore(S.ledger).index('by_node').getAll(node));
    return all.sort((a, b) => a.seq - b.seq);
  }

  // ---------- auditoría RNF-SEC-01 ----------
  /** Volcado bruto de todos los stores tal como están en disco (pruebas de "nada en claro"). */
  async dump(): Promise<Record<string, unknown[]>> {
    const out: Record<string, unknown[]> = {};
    for (const name of this.storeNames()) out[name] = await req(this.db.transaction(name).objectStore(name).getAll());
    return out;
  }

  // ---------- inyección de fallos (demostración AC-TECH-06 y pruebas) ----------
  /**
   * Simula un Single Event Upset: invierte un bit del registro guardado sin pasar por la API normal.
   * Solo para el simulador y las pruebas de RNF-SEC-03.
   */
  async injectBitFlip(store: 'envelopes' | 'replica' | 'ledger', key: string, field = 'ct', bit = 0): Promise<void> {
    const name = S[store];
    const tx = this.db.transaction(name, 'readwrite');
    const s = tx.objectStore(name);
    s.get(key).onsuccess = (e) => {
      const rec = (e.target as IDBRequest).result as Record<string, string> | undefined;
      if (!rec) return;
      rec[field] = flipBit(rec[field], field, bit);
      s.put(rec);
    };
    return done(tx);
  }
}

/** Invierte un bit de un campo: bytes reales en campos b64, el carácter en campos texto/hex. */
export function flipBit(value: string, field: string, bit: number): string {
  if (field === 'iv' || field === 'ct' || field === 'firma' || field === 'sig') {
    const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    const i = Math.floor(bit / 8) % bytes.length;
    bytes[i] ^= 1 << bit % 8;
    return btoa(String.fromCharCode(...bytes));
  }
  const i = Math.floor(bit / 8) % value.length;
  return value.slice(0, i) + String.fromCharCode(value.charCodeAt(i) ^ (1 << bit % 8)) + value.slice(i + 1);
}
