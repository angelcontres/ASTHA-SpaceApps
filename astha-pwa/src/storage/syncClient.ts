// Sync Hub client (RNF-NET-01..03, ADR-007, ADR-008, ADR-009).
// Contract: docs/Modelo-datos-y-APIs/03-Contratos-API-OpenAPI-y-Eventos.md §2 and openapi.yaml.
//  - Native WebSocket to wss://astha.local:8443/ws/sync (spacecraft LAN only; zero WAN traffic).
//  - HANDSHAKE: deviceId + VersionVector (HLC strings) + timestampUtc, signed with the device Ed25519 key.
//  - The hub answers with its own HANDSHAKE; the client then sends every envelope the hub lacks (DELTA_PUSH,
//    ascending HLC) and only afterwards releases live pushes.
//  - Offline buffer: envelopes created while disconnected or mid-handshake wait in an outbox. Sending them
//    before the backlog could make a peer's VersionVector jump past events it never received, so the outbox
//    is flushed strictly after the delta exchange.
//  - Passive, event-driven reconnection (online, visibilitychange, user action) plus ONE exponential-backoff
//    retry (capped at 5 min) that pauses while the tab is hidden. No polling.
//  - Without a hub the node stays autonomous and silent: no error ever propagates.
import { canonicalJson, utf8 } from './crypto';
import { vvFromWire, vvToWire, type VersionVector, type WireVersionVector } from './crdt';
import type { Envelope, LedgerRecord } from './idb';

/**
 * - `online` only once the hub has accepted the signed handshake (not merely when the socket opens).
 * - `unauthorized`: the hub refused this device (close code 4401: not enrolled or invalid signature).
 */
export type SyncStatus = 'disabled' | 'offline' | 'connecting' | 'online' | 'unauthorized';

/** WebSocket close code used by the hub to reject a handshake (mirrors HTTP 401). */
export const CLOSE_UNAUTHORIZED = 4401;

export const DEFAULT_SYNC_URL = 'wss://astha.local:8443/ws/sync';

export interface HandshakeMessage {
  type: 'HANDSHAKE';
  deviceId: string;
  versionVector: WireVersionVector;
  timestampUtc: string;
  ed25519Signature: string;
  /** Public key, used only by hubs running in auto-enroll mode (extension; not covered by the signature). */
  publicJwk?: JsonWebKey;
}
export interface DeltaPushMessage { type: 'DELTA_PUSH'; envelopes: Envelope[]; ledger?: LedgerRecord[] }
export interface ReplicaRequestMessage { type: 'REPLICA_REQUEST'; ids: string[] }
/**
 * Public cabin snapshot for `GET /habitat/status` (openapi.yaml CabinGlobalStatus, ADR-014). Extension of the
 * contract: the zero-knowledge hub cannot derive it from encrypted envelopes, so an authenticated device
 * publishes it. Habitat values and per-crew traffic lights only; the hub rejects any other field.
 */
export interface CabinGlobalStatus {
  updatedAtHlc: string;
  habitat: { missionDay: number; ppCo2Mmhg: number; cabinPressureKpa: number; o2Percent: number; radiationUSvH: number };
  crewTrafficLights: { crewId: string; globalStatus: 'NOMINAL' | 'CAUTION' | 'CRITICAL'; hasUnacknowledgedCritical5Min: boolean }[];
}
export interface CabinStatusMessage { type: 'CABIN_STATUS'; status: CabinGlobalStatus }
/** ADR-013 escalation relayed by the hub (2 min → CMO console, 5 min → cabin displays). */
export interface AlarmEscalationMessage { type: 'ALARM_ESCALATION'; alertId: string; crewId: string; level: 1 | 2 }

export type SyncMessage = HandshakeMessage | DeltaPushMessage | ReplicaRequestMessage | AlarmEscalationMessage | CabinStatusMessage;

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
  /** By default only enabled when the app is served from the hub itself (*.local). */
  enabled?: boolean;
  /** VersionVector of the envelopes stored on this device (including ones it cannot decrypt). */
  getVersionVector: () => VersionVector;
  /** Envelopes a peer with the given VV is missing. */
  getDelta?: (remote: VersionVector) => Envelope[];
  /** Signs the handshake bytes with the device key (base64). Unsigned handshakes are sent if omitted. */
  signHandshake?: (bytes: Uint8Array<ArrayBuffer>) => Promise<string>;
  /** Device public key sent with the handshake so an auto-enroll hub can register this device. */
  publicJwk?: JsonWebKey;
  onEnvelopes: (envs: Envelope[], ledger: LedgerRecord[]) => void | Promise<void>;
  onAlarmEscalation?: (msg: AlarmEscalationMessage) => void;
  onStatus?: (s: SyncStatus) => void;
  WebSocketImpl?: WebSocketCtor;
  timers?: SyncTimers;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Outbox cap: beyond it the oldest entries are dropped (they still travel in the next delta). */
  maxOutbox?: number;
  now?: () => Date;
}

const OPEN = 1;

/**
 * The hub serves the PWA itself (ADR-007), so the relay always lives on the page's own origin:
 * https://astha.local:8443 → wss://astha.local:8443/ws/sync; http://localhost:8443 → ws://localhost:8443/ws/sync.
 */
export function hubUrlFor(loc: { protocol: string; host: string } | undefined): string {
  if (!loc?.host) return DEFAULT_SYNC_URL;
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws/sync`;
}

export function hubEnabledByDefault(): boolean {
  const host = (globalThis as { location?: { hostname?: string } }).location?.hostname ?? '';
  return host.endsWith('.local');
}

/** Bytes covered by the handshake signature (everything except the signature itself). */
export function handshakeBytes(m: Omit<HandshakeMessage, 'ed25519Signature' | 'type'>): Uint8Array<ArrayBuffer> {
  return utf8(canonicalJson({ deviceId: m.deviceId, versionVector: m.versionVector, timestampUtc: m.timestampUtc }));
}

export class SyncClient {
  private ws: WebSocketLike | null = null;
  private retry: unknown = null;
  private attempt = 0;
  private visible = true;
  private stopped = true;
  /** true once the delta backlog has been sent on the current connection. */
  private synced = false;
  private readonly outbox = new Map<string, Envelope>();
  private outboxLedger: LedgerRecord[] = [];
  private readonly pendingReplicas = new Set<string>();
  private cabinStatus: CabinGlobalStatus | null = null;
  private _status: SyncStatus;
  private readonly o: Required<Omit<SyncClientOptions, 'getDelta' | 'onStatus' | 'WebSocketImpl' | 'signHandshake' | 'onAlarmEscalation' | 'publicJwk'>> &
    Pick<SyncClientOptions, 'getDelta' | 'onStatus' | 'WebSocketImpl' | 'signHandshake' | 'onAlarmEscalation' | 'publicJwk'>;

  constructor(opts: SyncClientOptions) {
    this.o = {
      url: DEFAULT_SYNC_URL,
      enabled: hubEnabledByDefault(),
      timers: {
        set: (fn, ms) => setTimeout(fn, ms),
        clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      },
      baseDelayMs: 2_000,
      maxDelayMs: 5 * 60_000,
      maxOutbox: 5_000,
      now: () => new Date(),
      WebSocketImpl: (globalThis as { WebSocket?: WebSocketCtor }).WebSocket,
      ...opts,
    };
    this._status = this.o.enabled ? 'offline' : 'disabled';
  }

  get status(): SyncStatus { return this._status; }
  /** Envelopes waiting for the next delta exchange (offline buffer). */
  get outboxSize(): number { return this.outbox.size; }

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
    this.synced = false;
    try { ws?.close(); } catch { /* silent */ }
    this.setStatus(this.o.enabled ? 'offline' : 'disabled');
  }

  /** `online` event forwarded by the UI: reconnect immediately. */
  notifyOnline(): void {
    if (this.stopped || this.ws) return;
    this.attempt = 0;
    this.clearRetry();
    this.connect();
  }

  /** `visibilitychange`: no retries are scheduled while the tab is hidden. */
  setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) return this.clearRetry();
    if (!this.stopped && !this.ws) { this.clearRetry(); this.connect(); }
  }

  /** Event-driven push of new envelopes. Buffered until the delta exchange has completed. */
  push(envelopes: Envelope[], ledger: LedgerRecord[] = []): void {
    if (this.synced && this.ws?.readyState === OPEN) {
      this.send({ type: 'DELTA_PUSH', envelopes, ledger });
      return;
    }
    for (const e of envelopes) this.outbox.set(e.id, e);
    this.outboxLedger.push(...ledger);
    while (this.outbox.size > this.o.maxOutbox) this.outbox.delete(this.outbox.keys().next().value!);
    if (this.outboxLedger.length > this.o.maxOutbox) this.outboxLedger = this.outboxLedger.slice(-this.o.maxOutbox);
  }

  /** Publishes the public cabin snapshot; re-sent automatically after every reconnection. */
  publishCabinStatus(status: CabinGlobalStatus): void {
    this.cabinStatus = status;
    if (this.synced) this.send({ type: 'CABIN_STATUS', status });
  }

  /** Requests from the hub a replica of envelopes quarantined after an SEU (RNF-SEC-03). */
  requestReplica(id: string): void {
    this.pendingReplicas.add(id);
    this.flushReplicas();
  }

  // ---------------- internals ----------------

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
    this.synced = false;
    // The socket being open proves nothing: status turns `online` only when the hub answers the handshake, and
    // the retry backoff is reset only then, so a refused device backs off instead of reconnecting every 2 s.
    ws.onopen = () => void this.sendHandshake(ws);
    ws.onmessage = (ev) => void this.handle(ev.data);
    ws.onerror = () => { /* the following close event schedules the retry */ };
    ws.onclose = (ev) => {
      if (this.ws === ws) { this.ws = null; this.synced = false; }
      const refused = (ev as { code?: number } | undefined)?.code === CLOSE_UNAUTHORIZED;
      if (!this.stopped) this.scheduleRetry(refused ? 'unauthorized' : 'offline');
    };
  }

  private async sendHandshake(ws: WebSocketLike): Promise<void> {
    const base = { deviceId: this.o.nodeId, versionVector: vvToWire(this.o.getVersionVector()), timestampUtc: this.o.now().toISOString() };
    let ed25519Signature = '';
    try { ed25519Signature = (await this.o.signHandshake?.(handshakeBytes(base))) ?? ''; } catch { /* unsigned */ }
    if (this.ws !== ws) return; // the connection changed while signing
    this.send({ type: 'HANDSHAKE', ...base, ed25519Signature, ...(this.o.publicJwk ? { publicJwk: this.o.publicJwk } : {}) });
    this.flushReplicas();
  }

  private async handle(data: unknown): Promise<void> {
    let msg: SyncMessage;
    try {
      msg = JSON.parse(String(data)) as SyncMessage;
    } catch {
      return; // unreadable message: ignored
    }
    try {
      if (msg.type === 'DELTA_PUSH') {
        for (const e of msg.envelopes ?? []) this.pendingReplicas.delete(e.id);
        await this.o.onEnvelopes(msg.envelopes ?? [], msg.ledger ?? []);
      } else if (msg.type === 'HANDSHAKE') {
        this.afterHandshake(vvFromWire(msg.versionVector));
      } else if (msg.type === 'ALARM_ESCALATION') {
        this.o.onAlarmEscalation?.(msg);
      }
    } catch {
      /* an invalid remote envelope never blocks the node; integrity checks quarantine it */
    }
  }

  /** Sends the backlog the hub lacks, then releases the outbox (in that order). */
  private afterHandshake(hubVV: VersionVector): void {
    const delta = this.o.getDelta?.(hubVV) ?? [];
    const sent = new Set(delta.map((e) => e.id));
    if (delta.length) this.send({ type: 'DELTA_PUSH', envelopes: delta });
    const rest = [...this.outbox.values()].filter((e) => !sent.has(e.id));
    if (rest.length || this.outboxLedger.length) this.send({ type: 'DELTA_PUSH', envelopes: rest, ledger: this.outboxLedger });
    this.outbox.clear();
    this.outboxLedger = [];
    this.synced = true;
    this.attempt = 0;
    this.setStatus('online');
    if (this.cabinStatus) this.send({ type: 'CABIN_STATUS', status: this.cabinStatus });
  }

  private send(msg: SyncMessage): void {
    if (this.ws?.readyState !== OPEN) return;
    try { this.ws.send(JSON.stringify(msg)); } catch { /* silent */ }
  }

  private flushReplicas(): void {
    if (this.pendingReplicas.size) this.send({ type: 'REPLICA_REQUEST', ids: [...this.pendingReplicas] });
  }

  private scheduleRetry(status: 'offline' | 'unauthorized' = 'offline'): void {
    this.setStatus(status);
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

  /** Test-only: delay of the next retry. */
  nextDelayMs(): number {
    return Math.min(this.o.maxDelayMs, this.o.baseDelayMs * 2 ** this.attempt);
  }
}
