// Worker Bridge (C4 §3.2): única entrada de datos a la UI.
// Instancia los dos Dedicated Workers, les entrega los extremos de un MessageChannel y convierte sus mensajes
// en estado reactivo con runes. Los mensajes se agrupan en UN requestAnimationFrame solo cuando hay alguno
// pendiente (RNF-POW-01): en reposo no hay ningún frame, temporizador ni bucle.
import { HABITAT_INDICATORS, type Alert, type Assessment, type DailyMeasurement, type HabitatRecord, type IndicatorState, type Role, type SymptomType } from '../../engine/types';
import type { ChainCheck, DecryptedEntry } from '../../storage/ledger';
import type { ScenarioId } from '../../storage/telemetrySources';
import {
  DEFAULT_PREFS,
  type ClinicalToUi, type DataState, type DataToUi, type PrefKey, type UiToClinical, type UiToData,
} from '../../workers/protocol';

type Incoming = { from: 'clinical'; msg: ClinicalToUi } | { from: 'data'; msg: DataToUi };

export interface Notice { id: number; level: 'info' | 'error'; code: string; message: string }

export interface ActiveAlert extends Alert {
  acknowledged: boolean;
  overridden: boolean;
  /** Pasos de la contramedida ya marcados hoy. */
  completedSteps: string[];
}

export interface HabitatTelemetry {
  day: number | null;
  record: HabitatRecord | null;
  indicators: IndicatorState[];
}

const EMPTY_STATE: DataState = {
  ready: false, provisioning: false, session: null, crew: [], selectedCrew: '', day: 0, maxDay: 180, playing: false,
  activeScenarios: [], symptoms: {}, acks: [], checks: {}, overrides: [], prefs: { ...DEFAULT_PREFS }, xp: {},
  syncStatus: 'disabled', quarantinedCount: 0, lockedCount: 0, recoveredCount: 0, nodeId: '',
};

const HABITAT_SET = new Set<string>(HABITAT_INDICATORS);
const SEV = { none: -1, nominal: 0, caution: 1, critical: 2 } as const;
const URG = { routine: 0, high: 1, emergency: 2 } as const;

export class WorkerBridge {
  // ---------------- estado crudo (inmutable por mensaje: $state.raw evita proxies profundos) ----------------
  data = $state.raw<DataState>(EMPTY_STATE);
  assessments = $state.raw<Assessment[]>([]);
  series = $state.raw<{ crewId: string; measurements: DailyMeasurement[]; habitat: HabitatRecord[] }>({
    crewId: '', measurements: [], habitat: [],
  });
  ledgerEntries = $state.raw<DecryptedEntry[]>([]);
  ledgerChain = $state.raw<ChainCheck | null>(null);
  notices = $state.raw<Notice[]>([]);
  lastExport = $state.raw<{ fileName: string; text: string } | null>(null);
  /** Motor (worker) y ciclo completo acción → Assessment en la UI (RNF-PER-01). */
  engineMs = $state<number | null>(null);
  cycleMs = $state<number | null>(null);
  clinicalReady = $state(false);

  // ---------------- derivados pedidos por el contrato de la UI ----------------
  unlockedCrewId = $derived(this.data.session?.personId ?? null);
  activeRole = $derived<Role | null>(this.data.session?.role ?? null);
  syncStatus = $derived(this.data.syncStatus);
  quarantinedCount = $derived(this.data.quarantinedCount);

  currentAssessment = $derived<Assessment | null>(
    this.assessments.find((a) => a.crewId === this.data.selectedCrew && !a.statusOnly) ?? null,
  );

  /** Semáforo global por tripulante (pantalla de bloqueo y resumen de tripulación, ADR-014). */
  crewStatus = $derived(Object.fromEntries(this.assessments.map((a) => [a.crewId, a.global])));

  habitatTelemetry = $derived<HabitatTelemetry>({
    day: this.series.habitat.at(-1)?.day ?? null,
    record: this.series.habitat.at(-1) ?? null,
    indicators: (this.assessments[0]?.indicators ?? []).filter((i) => HABITAT_SET.has(i.id)),
  });

  /** Alertas de los tripulantes accesibles, sin duplicar las de hábitat, ordenadas por gravedad y urgencia. */
  activeAlerts = $derived.by<ActiveAlert[]>(() => {
    const seen = new Map<string, Alert>();
    for (const a of this.assessments) if (!a.statusOnly) for (const al of a.alerts) if (!seen.has(al.id)) seen.set(al.id, al);
    const acks = new Set(this.data.acks);
    const overrides = new Set(this.data.overrides);
    return [...seen.values()]
      .map((al) => ({
        ...al,
        acknowledged: acks.has(al.id),
        overridden: overrides.has(al.id),
        completedSteps: this.data.checks[al.id] ?? [],
      }))
      .sort((x, y) => SEV[y.status] - SEV[x.status] || URG[y.urgency] - URG[x.urgency]);
  });

  xpCounter = $derived<number>(
    this.currentAssessment?.gamification?.xp ?? this.data.xp[this.data.selectedCrew] ?? 0,
  );

  // ---------------- interno ----------------
  private dataWorker: Worker | null = null;
  private clinicalWorker: Worker | null = null;
  private queue: Incoming[] = [];
  private frame: number | null = null;
  private microtask = false;
  private seq = 0;
  private sentAt = new Map<number, number>();
  private noticeSeq = 0;
  private detach: (() => void) | null = null;

  /** Arranca los workers y el canal directo entre ellos. Idempotente. */
  start(): void {
    if (this.dataWorker) return;
    const data = new Worker(new URL('../../workers/dataSync.worker.ts', import.meta.url), { type: 'module', name: 'astha-data' });
    const clinical = new Worker(new URL('../../workers/clinical.worker.ts', import.meta.url), { type: 'module', name: 'astha-clinical' });
    const channel = new MessageChannel();
    clinical.postMessage({ type: 'connect' } satisfies UiToClinical, [channel.port2]);
    data.postMessage({ type: 'connect' } satisfies UiToData, [channel.port1]);

    clinical.onmessage = (e: MessageEvent<ClinicalToUi>) => this.enqueue({ from: 'clinical', msg: e.data });
    data.onmessage = (e: MessageEvent<DataToUi>) => this.enqueue({ from: 'data', msg: e.data });
    const onError = (e: ErrorEvent) => this.pushNotice('error', 'worker', `Error en un worker: ${e.message}`);
    clinical.onerror = onError;
    data.onerror = onError;
    this.dataWorker = data;
    this.clinicalWorker = clinical;

    // Eventos del navegador reenviados al Sync Client (reconexión por eventos, nunca polling).
    const onVisibility = () => this.send({ type: 'visibility', visible: document.visibilityState === 'visible' });
    const onOnline = () => this.send({ type: 'online' });
    document.addEventListener('visibilitychange', onVisibility);
    globalThis.addEventListener('online', onOnline);
    this.detach = () => {
      document.removeEventListener('visibilitychange', onVisibility);
      globalThis.removeEventListener('online', onOnline);
    };
  }

  stop(): void {
    this.detach?.();
    this.dataWorker?.terminate();
    this.clinicalWorker?.terminate();
    this.dataWorker = this.clinicalWorker = null;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.queue = [];
  }

  // ---------------- agrupación por frame ----------------

  private enqueue(item: Incoming): void {
    this.queue.push(item);
    if (this.frame !== null || this.microtask) return;
    // Con la pestaña oculta rAF no se dispara: se aplica en microtarea para no retrasar una alarma crítica.
    if (typeof requestAnimationFrame === 'function' && document.visibilityState === 'visible') {
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        this.flush();
      });
    } else {
      this.microtask = true;
      queueMicrotask(() => {
        this.microtask = false;
        this.flush();
      });
    }
  }

  private flush(): void {
    const batch = this.queue;
    this.queue = [];
    for (const item of batch) {
      if (item.from === 'clinical') this.applyClinical(item.msg);
      else this.applyData(item.msg);
    }
  }

  private applyClinical(msg: ClinicalToUi): void {
    if (msg.type === 'ready') { this.clinicalReady = true; return; }
    this.assessments = msg.items;
    this.engineMs = msg.engineMs;
    const t0 = this.sentAt.get(msg.reqId);
    if (t0 !== undefined) {
      this.cycleMs = performance.now() - t0;
      this.sentAt.delete(msg.reqId);
    }
  }

  private applyData(msg: DataToUi): void {
    switch (msg.type) {
      case 'state': this.data = msg.state; break;
      case 'series': this.series = { crewId: msg.crewId, measurements: msg.measurements, habitat: msg.habitat }; break;
      case 'ledger':
        this.ledgerEntries = msg.entries;
        if (msg.chain) this.ledgerChain = msg.chain;
        break;
      case 'exported': this.lastExport = { fileName: msg.fileName, text: msg.text }; break;
      case 'notice':
        if (msg.reqId !== undefined) this.sentAt.delete(msg.reqId);
        this.pushNotice(msg.level, msg.code, msg.message);
        break;
    }
  }

  private pushNotice(level: Notice['level'], code: string, message: string): void {
    this.notices = [...this.notices.slice(-4), { id: ++this.noticeSeq, level, code, message }];
  }

  dismissNotice(id: number): void {
    this.notices = this.notices.filter((n) => n.id !== id);
  }

  // ---------------- acciones (UI → Data Worker) ----------------

  /** Envía una acción con reqId para medir el ciclo completo hasta el nuevo Assessment. */
  private send(msg: UiToData, measure = false): void {
    if (!this.dataWorker) return;
    if (measure) {
      const reqId = ++this.seq;
      this.sentAt.set(reqId, performance.now());
      if (this.sentAt.size > 32) this.sentAt.delete(this.sentAt.keys().next().value!);
      msg = { ...msg, reqId };
    }
    this.dataWorker.postMessage(msg);
  }

  unlock(personId: string, pin: string) { this.send({ type: 'unlock', personId, pin }, true); }
  lock() { this.send({ type: 'lock' }, true); }
  selectCrew(crewId: string) { this.send({ type: 'selectCrew', crewId }, true); }
  setDay(day: number) { this.send({ type: 'setDay', day }, true); }
  advance(days = 1) { this.send({ type: 'advance', days }, true); }
  play(msPerDay?: number) { this.send({ type: 'play', msPerDay }); }
  pause() { this.send({ type: 'pause' }); }
  injectScenario(id: ScenarioId, crewId?: string) { this.send({ type: 'scenario', id, crewId }, true); }
  reset() { this.send({ type: 'reset' }, true); }
  manualEntry(crewId: string, fields: Partial<Record<string, number>>) { this.send({ type: 'manualEntry', crewId, fields }, true); }
  toggleSymptom(crewId: string, symptom: SymptomType, active: boolean) {
    this.send({ type: 'symptom', crewId, symptom, active }, true);
  }
  checkStep(alert: Pick<Alert, 'id' | 'crewId' | 'countermeasureId'>, stepId: string, checked: boolean) {
    this.send({ type: 'check', alertId: alert.id, crewId: alert.crewId, protocolId: alert.countermeasureId, stepId, checked });
  }
  acknowledge(alert: Pick<Alert, 'id' | 'crewId'>) { this.send({ type: 'ack', alertId: alert.id, crewId: alert.crewId }); }
  override(alert: Pick<Alert, 'id' | 'crewId'>, reason: string) { this.send({ type: 'override', alertId: alert.id, crewId: alert.crewId, reason }); }
  setPref(key: PrefKey, value: boolean) { this.send({ type: 'setPref', key, value }); }
  exportData(kind: 'history' | 'summary', anonymize = false) { this.send({ type: 'export', kind, anonymize }); }
  importData(text: string) { this.send({ type: 'import', text }, true); }
  injectBitFlip(both = false) { this.send({ type: 'injectBitFlip', both }, true); }
  verifyLedger() { this.send({ type: 'verifyLedger' }); }

  /** Descarga local del último paquete exportado (Blob, sin red). */
  downloadExport(): void {
    const exp = this.lastExport;
    if (!exp) return;
    const url = URL.createObjectURL(new Blob([exp.text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = exp.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** Instancia única de la aplicación. */
export const bridge = new WorkerBridge();
