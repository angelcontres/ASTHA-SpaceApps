// IndexedDB de sobres cifrados (ADR-006, RNF-SEC-01). localStorage está prohibido para datos clínicos.
// Stores:
//   meta        → claves envueltas, identidad del dispositivo, K_hab de dispositivo (CryptoKey no extraíble)
//   envelopes   → sobres {id, hlc, author, keyRef, iv, ct, sha256, sig} (G-Set: solo se añaden)
//   quarantine  → sobres que fallaron la verificación SHA-256 (RNF-SEC-03)
//   ledger      → bitácora encadenada por dispositivo (solo `add`, RNF-SEC-04)

export interface Envelope {
  /** SHA-256 del sobre (cabecera + texto cifrado): identidad en el G-Set. */
  id: string;
  /** HLC codificado (ver crdt.ts). */
  hlc: string;
  /** nodeId del dispositivo autor. */
  author: string;
  /** Clave usada: 'C001'…'C004' o 'hab'. */
  keyRef: string;
  /** IV de 96 bits (b64). */
  iv: string;
  /** Texto cifrado AES-GCM (b64). */
  ct: string;
  /** SHA-256 del texto cifrado (hex). */
  sha256: string;
  /** Firma del dispositivo autor sobre `id` (b64). */
  sig: string;
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

const DB_VERSION = 1;

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

  static open(name = 'astha', factory: IDBFactory = globalThis.indexedDB): Promise<AsthaDb> {
    return new Promise((resolve, reject) => {
      const r = factory.open(name, DB_VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore('meta');
        db.createObjectStore('envelopes', { keyPath: 'id' }).createIndex('author', 'author');
        db.createObjectStore('quarantine', { keyPath: 'id' });
        db.createObjectStore('ledger', { keyPath: 'key' }).createIndex('node', 'node');
      };
      r.onsuccess = () => resolve(new AsthaDb(r.result));
      r.onerror = () => reject(r.error);
    });
  }

  close(): void { this.db.close(); }

  // ---------- meta ----------
  async getMeta<T>(key: string): Promise<T | undefined> {
    return req(this.db.transaction('meta').objectStore('meta').get(key)) as Promise<T | undefined>;
  }
  async putMeta(key: string, value: unknown): Promise<void> {
    const tx = this.db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put(value, key);
    return done(tx);
  }

  // ---------- envelopes (G-Set) ----------
  /** Añade si no existe. Devuelve false si ya estaba (merge idempotente). */
  async addEnvelope(env: Envelope): Promise<boolean> {
    const tx = this.db.transaction('envelopes', 'readwrite');
    const store = tx.objectStore('envelopes');
    let added = false;
    // Callbacks (no await) para que la transacción siga activa entre las dos peticiones.
    store.getKey(env.id).onsuccess = (e) => {
      if ((e.target as IDBRequest).result === undefined) { store.add(env); added = true; }
    };
    await done(tx);
    return added;
  }
  getEnvelope(id: string): Promise<Envelope | undefined> {
    return req(this.db.transaction('envelopes').objectStore('envelopes').get(id));
  }
  allEnvelopes(): Promise<Envelope[]> {
    return req(this.db.transaction('envelopes').objectStore('envelopes').getAll());
  }

  /** Mueve un sobre corrupto a cuarentena en una sola transacción (RNF-SEC-03). */
  async quarantine(env: Envelope, reason: string): Promise<void> {
    const tx = this.db.transaction(['envelopes', 'quarantine'], 'readwrite');
    tx.objectStore('envelopes').delete(env.id);
    tx.objectStore('quarantine').put({ id: env.id, envelope: env, reason, at: Date.now() } satisfies QuarantineRecord);
    return done(tx);
  }
  allQuarantine(): Promise<QuarantineRecord[]> {
    return req(this.db.transaction('quarantine').objectStore('quarantine').getAll());
  }

  // ---------- ledger (solo add) ----------
  /** `add` falla si la clave ya existe: no hay forma de sobrescribir una entrada. */
  async appendLedger(rec: LedgerRecord): Promise<void> {
    const tx = this.db.transaction('ledger', 'readwrite');
    tx.objectStore('ledger').add(rec);
    return done(tx);
  }
  allLedger(): Promise<LedgerRecord[]> {
    return req(this.db.transaction('ledger').objectStore('ledger').getAll());
  }
  async ledgerByNode(node: string): Promise<LedgerRecord[]> {
    const all = await req(this.db.transaction('ledger').objectStore('ledger').index('node').getAll(node));
    return all.sort((a, b) => a.seq - b.seq);
  }

  // ---------- inyección de fallos (demostración AC-05 y pruebas) ----------
  /**
   * Simula un Single Event Upset: invierte un bit del registro guardado sin pasar por la API normal.
   * Solo para el simulador y las pruebas de RNF-SEC-03.
   */
  async injectBitFlip(store: 'envelopes' | 'ledger', key: string, field = 'ct', bit = 0): Promise<void> {
    const tx = this.db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    s.get(key).onsuccess = (e) => {
      const rec = (e.target as IDBRequest).result as Record<string, string> | undefined;
      if (!rec) return;
      const bytes = Uint8Array.from(atob(rec[field]), (c) => c.charCodeAt(0));
      const i = Math.floor(bit / 8) % bytes.length;
      bytes[i] ^= 1 << bit % 8;
      rec[field] = btoa(String.fromCharCode(...bytes));
      s.put(rec);
    };
    return done(tx);
  }
}
