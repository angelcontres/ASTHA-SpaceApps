// Contrato de mensajes entre la UI, el Data/Sync Worker y el Clinical Worker (ADR-005, C4 §3.1-§3.3).
//
//   UI ──UiToData──▶ dataSync.worker ──DataToClinical (MessageChannel)──▶ clinical.worker
//   UI ◀──DataToUi── dataSync.worker ◀──ClinicalToData (MessageChannel)── clinical.worker
//   UI ◀────────────────────── ClinicalToUi ───────────────────────────── clinical.worker
//
// Los datos pesados (historias de 180 días) solo viajan por el MessageChannel entre workers.
import type { Alert, Assessment, DailyMeasurement, EvaluationInput, HabitatRecord, Role, SymptomType } from '../engine/types';
import type { ChainCheck, DecryptedEntry } from '../storage/ledger';
import type { SyncStatus } from '../storage/syncClient';
import type { ScenarioId } from '../storage/telemetrySources';

/** Identificador opcional de una acción de la UI para medir el ciclo completo (RNF-PER-01). */
export interface Req { reqId?: number }

export type PrefKey = 'redMode' | 'highContrast' | 'largeText' | 'survival' | 'zen';
export type Prefs = Record<PrefKey, boolean>;
export const DEFAULT_PREFS: Prefs = { redMode: false, highContrast: false, largeText: false, survival: false, zen: false };

// ---------------- UI → Data ----------------

export type UiToData = Req &
  (
    | { type: 'connect' } // acompaña al MessagePort hacia el Clinical Worker
    | { type: 'unlock'; personId: string; pin: string }
    | { type: 'unlockBadge'; personId: string }
    | { type: 'lock' }
    | { type: 'selectCrew'; crewId: string }
    | { type: 'setDay'; day: number }
    | { type: 'advance'; days: number }
    | { type: 'play'; msPerDay?: number }
    | { type: 'pause' }
    | { type: 'scenario'; id: ScenarioId; crewId?: string }
    | { type: 'reset' }
    | { type: 'manualEntry'; crewId: string; fields: Partial<Record<string, number>> }
    | { type: 'symptom'; crewId: string; symptom: SymptomType; active: boolean }
    | { type: 'check'; alertId: string; crewId: string; protocolId: string; stepId: string; checked: boolean }
    | { type: 'ack'; alertId: string; crewId: string }
    | { type: 'override'; alertId: string; crewId: string; reason: string }
    | { type: 'setPref'; key: PrefKey; value: boolean }
    | { type: 'export'; kind: 'history' | 'summary'; anonymize?: boolean }
    | { type: 'import'; text: string }
    /** Bundled 90-day reference telemetry, loaded offline as an alternative source (issue #7). */
    | { type: 'loadReference' }
    /** `POST /ingest/telemetry` body from a future sensor adapter (openapi.yaml, SRS §5.2). */
    | { type: 'ingest'; body: unknown }
    | { type: 'injectBitFlip'; both?: boolean }
    | { type: 'verifyLedger' }
    | { type: 'visibility'; visible: boolean }
    | { type: 'online' }
  );

// ---------------- Data → UI ----------------

export interface CrewSummary { id: string; name: string; role: Role }

export interface SessionInfo { personId: string; role: Role; allowedCrew: string[] }

export interface DataState {
  ready: boolean;
  provisioning: boolean;
  session: SessionInfo | null;
  crew: CrewSummary[];
  selectedCrew: string;
  day: number;
  maxDay: number;
  playing: boolean;
  activeScenarios: string[];
  /** Síntomas activos hoy, solo de tripulantes accesibles. */
  symptoms: Record<string, SymptomType[]>;
  /** Alertas reconocidas hoy. */
  acks: string[];
  /** Pasos marcados hoy por alerta (último evento por paso). */
  checks: Record<string, string[]>;
  overrides: string[];
  prefs: Prefs;
  /** PN-Counter de XP por tripulante. */
  xp: Record<string, number>;
  syncStatus: SyncStatus;
  quarantinedCount: number;
  lockedCount: number;
  /** Sobres dañados restaurados desde la réplica local en esta sesión (RNF-SEC-03). */
  recoveredCount: number;
  nodeId: string;
}

export type DataToUi =
  | { type: 'state'; state: DataState }
  | { type: 'series'; crewId: string; measurements: DailyMeasurement[]; habitat: HabitatRecord[] }
  | { type: 'ledger'; entries: DecryptedEntry[]; chain: ChainCheck | null }
  /** gz: gzip-compressed package for the DTN router (null where CompressionStream is unavailable). */
  | { type: 'exported'; fileName: string; text: string; gz: Uint8Array | null }
  | { type: 'notice'; level: 'info' | 'error'; code: string; message: string; reqId?: number };

// ---------------- Data ⇄ Clinical (MessageChannel) ----------------

export interface DataToClinical { type: 'evaluate'; reqId: number; inputs: EvaluationInput[] }

export interface ClinicalResult { type: 'assessments'; reqId: number; items: Assessment[]; engineMs: number }

export type ClinicalToData = ClinicalResult;
export type ClinicalToUi = ClinicalResult | { type: 'ready' };

/** UI → Clinical: el puerto del canal o una evaluación directa tipada. */
export type UiToClinical = { type: 'connect' } | DataToClinical;

/** Resumen mínimo de alerta para la bitácora. */
export type AlertDigest = Pick<Alert, 'id' | 'crewId' | 'ruleId' | 'status' | 'urgency' | 'day'>;
