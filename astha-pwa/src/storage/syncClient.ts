// Cliente de sincronización opcional con el Sync Hub (RNF-NET-01..03, ADR-007, ADR-008).
//  - WebSocket nativo a wss://astha.local (LAN de la nave; cero tráfico WAN).
//  - Al conectar envía su VersionVector y recibe solo lo que le falta; después, push por evento.
//  - Reconexión por eventos (online, visibilitychange, acción del usuario) más UN reintento con backoff
//    exponencial (tope 5 min) que se suspende con la pestaña oculta. Sin polling.
//  - Si no hay Hub, el nodo sigue autónomo y en silencio: ningún error se propaga.
import type { VersionVector } from './crdt';
import type { Envelope, LedgerRecord } from './idb';

export type SyncStatus = 'disabled' | 'offline' | 'connecting' | 'online';

export type SyncMessage =
  | { type: 'hello'; node: string; vv: VersionVector }
  | { type: 'ops'; envelopes: Envelope[]; ledger?: LedgerRecord[] }
  | { type: 'replica-request'; ids: string[] };

export interface WebSocketLike {
  readyState: number;
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}
export type WebSocketCtor = new (url: string) => WebSocketLike;

export interface SyncTimers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (h: unknown) => void;
}

export interface SyncClientOptions {
  nodeId: string;
  url?: string;
  /** Por defecto solo se activa si la app se sirve desde el propio Hub (*.local). */
  enabled?: boolean;
  getVersionVector: () => VersionVector;
  /** Sobres que le faltan a un par con el VV dado. */
  getDelta?: (remote: VersionVector) => Envelope[];
  onEnvelopes: (envs: Envelope[], ledger: LedgerRecord[]) => void | Promise<void>;
  onStatus?: (s: SyncStatus) => void;
  WebSocketImpl?: WebSocketCtor;
  timers?: SyncTimers;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const OPEN = 1;

export function hubEnabledByDefault(): boolean {
  const host = (globalThis as { location?: { hostname?: string } }).location?.hostname ?? '';
  return host.endsWith('.local');
}

export class SyncClient {
  private ws: WebSocketLike | null = null;
  private retry: unknown = null;
  private attempt = 0;
  private visible = true;
  private stopped = true;
  private pendingReplicas = new Set<string>();
  private _status: SyncStatus;
  private readonly o: Required<Omit<SyncClientOptions, 'getDelta' | 'onStatus' | 'WebSocketImpl'>> &
    Pick<SyncClientOptions, 'getDelta' | 'onStatus' | 'WebSocketImpl'>;

  constructor(opts: SyncClientOptions) {
    this.o = {
      url: 'wss://astha.local/sync',
      enabled: hubEnabledByDefault(),
      timers: {
        set: (fn, ms) => setTimeout(fn, ms),
        clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      },
      baseDelayMs: 2_000,
      maxDelayMs: 5 * 60_000,
      WebSocketImpl: (globalThis as { WebSocket?: WebSocketCtor }).WebSocket,
      ...opts,
    };
    this._status = this.o.enabled ? 'offline' : 'disabled';
  }

  get status(): SyncStatus { return this._status; }

  start(): void {
    if (!this.o.enabled || !this.o.WebSocketImpl) return this.setStatus('disabled');
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearRetry();
    const ws = this.ws;
    this.ws = null;
    try { ws?.close(); } catch { /* silencio */ }
    this.setStatus(this.o.enabled ? 'offline' : 'disabled');
  }

  /** Evento `online` reenviado por la UI: reconecta de inmediato. */
  notifyOnline(): void {
    if (this.stopped || this.ws) return;
    this.attempt = 0;
    this.clearRetry();
    this.connect();
  }

  /** `visibilitychange`: con la pestaña oculta no se programan reintentos. */
  setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) return this.clearRetry();
    if (!this.stopped && !this.ws) { this.clearRetry(); this.connect(); }
  }

  /** Push por evento de sobres nuevos. Sin conexión no hace nada: se enviarán por delta al reconectar. */
  push(envelopes: Envelope[], ledger: LedgerRecord[] = []): void {
    this.send({ type: 'ops', envelopes, ledger });
  }

  /** Pide al Hub la réplica de sobres aislados por SEU (RNF-SEC-03). */
  requestReplica(id: string): void {
    this.pendingReplicas.add(id);
    this.flushReplicas();
  }

  // ---------------- interno ----------------

  private connect(): void {
    if (this.stopped || this.ws || !this.o.WebSocketImpl) return;
    this.setStatus('connecting');
    let ws: WebSocketLike;
    try {
      ws = new this.o.WebSocketImpl(this.o.url);
    } catch {
      return this.scheduleRetry();
    }
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      this.setStatus('online');
      this.send({ type: 'hello', node: this.o.nodeId, vv: this.o.getVersionVector() });
      this.flushReplicas();
    };
    ws.onmessage = (ev) => void this.handle(ev.data);
    ws.onerror = () => { /* el cierre posterior gestiona el reintento */ };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      if (!this.stopped) this.scheduleRetry();
    };
  }

  private async handle(data: unknown): Promise<void> {
    let msg: SyncMessage;
    try {
      msg = JSON.parse(String(data)) as SyncMessage;
    } catch {
      return; // mensaje ilegible: se ignora
    }
    try {
      if (msg.type === 'ops') {
        for (const e of msg.envelopes) this.pendingReplicas.delete(e.id);
        await this.o.onEnvelopes(msg.envelopes ?? [], msg.ledger ?? []);
      } else if (msg.type === 'hello' && this.o.getDelta) {
        this.send({ type: 'ops', envelopes: this.o.getDelta(msg.vv) });
      }
    } catch {
      /* un sobre remoto inválido nunca bloquea el nodo; la verificación lo aísla */
    }
  }

  private send(msg: SyncMessage): void {
    if (this.ws?.readyState !== OPEN) return;
    try { this.ws.send(JSON.stringify(msg)); } catch { /* silencio */ }
  }

  private flushReplicas(): void {
    if (this.pendingReplicas.size) this.send({ type: 'replica-request', ids: [...this.pendingReplicas] });
  }

  private scheduleRetry(): void {
    this.setStatus('offline');
    if (this.stopped || !this.visible || this.retry !== null) return;
    const delay = Math.min(this.o.maxDelayMs, this.o.baseDelayMs * 2 ** this.attempt);
    this.attempt++;
    this.retry = this.o.timers.set(() => {
      this.retry = null;
      this.connect();
    }, delay);
  }

  private clearRetry(): void {
    if (this.retry !== null) this.o.timers.clear(this.retry);
    this.retry = null;
  }

  private setStatus(s: SyncStatus): void {
    if (s === this._status) return;
    this._status = s;
    this.o.onStatus?.(s);
  }

  /** Solo para pruebas: retardo del próximo reintento. */
  nextDelayMs(): number {
    return Math.min(this.o.maxDelayMs, this.o.baseDelayMs * 2 ** this.attempt);
  }
}
