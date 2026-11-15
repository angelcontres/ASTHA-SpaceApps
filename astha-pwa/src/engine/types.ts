// Modelos del SRS §5.1 y contrato Assessment del C4 (03-componentes §3.1).
// ZONA PURA: este archivo y todo engine/** no usan DOM, fetch, WebSocket ni storage.

export type Status = 'nominal' | 'caution' | 'critical';
export type StatusOrNone = Status | 'none';
export type Urgency = 'routine' | 'high' | 'emergency';
export type Role = 'commander' | 'cmo' | 'engineer' | 'specialist';

export type OrganSystem =
  | 'neuro_ocular'
  | 'cardiovascular'
  | 'musculoskeletal'
  | 'renal'
  | 'cognitive'
  | 'radiation'
  | 'respiratory_env';

export type RegionId = 'head' | 'chest' | 'lumbar' | 'legs' | 'general';
export const REGION_IDS: readonly RegionId[] = ['head', 'chest', 'lumbar', 'legs', 'general'];

export type CrewIndicator =
  | 'hr' | 'hrv' | 'sbp' | 'dbp' | 'spo2' | 'glucose' | 'temp' | 'sleep' | 'mood' | 'urineCa';
export type HabitatIndicator = 'ppco2' | 'pressure' | 'o2' | 'radiation' | 'cabinTemp' | 'humidity';
export type IndicatorId = CrewIndicator | HabitatIndicator;

/** Las 9 variables de RF-ING-01 (entrada manual). */
export const MANUAL_FIELDS: readonly CrewIndicator[] = [
  'hr', 'hrv', 'sbp', 'dbp', 'spo2', 'glucose', 'temp', 'sleep', 'mood',
];
export const CREW_INDICATORS: readonly CrewIndicator[] = [...MANUAL_FIELDS, 'urineCa'];
/** 6 parámetros ECLSS/CANS (docs/Diseno-UI-UX). cabinTemp y humidity son supuestos del WIREFRAME §6.2. */
export const HABITAT_INDICATORS: readonly HabitatIndicator[] = ['o2', 'ppco2', 'pressure', 'cabinTemp', 'humidity', 'radiation'];

export type SymptomType =
  | 'blurred_vision' | 'headache' | 'nausea' | 'back_pain' | 'orthostatic_dizziness';
export const SYMPTOMS: readonly SymptomType[] = [
  'blurred_vision', 'headache', 'nausea', 'back_pain', 'orthostatic_dizziness',
];

/** Tripulante (SRS §5.1). */
export interface CrewMember {
  id: string;
  name: string;
  role: Role;
  level: number;
  xp: number;
  streak: number;
}

/** Medición diaria (SRS §5.1, ADR-016). */
export interface DailyMeasurement {
  crewId: string;
  day: number;
  hr: number; hrv: number; sbp: number; dbp: number; spo2: number;
  glucose: number; temp: number; sleep: number; mood: number;
  urineCa?: number;
  exerciseMin?: number;
  waterL?: number;
  /** true si el registro lo introdujo el tripulante (informe matutino, RF-GAM-01). */
  manual?: boolean;
}

/** Telemetría de hábitat (SRS §5.1), compartida por la tripulación. */
export interface HabitatRecord {
  day: number;
  ppco2: number; pressure: number; o2: number; radiation: number;
  cabinTemp?: number; humidity?: number;
}

export interface Symptom { crewId: string; day: number; type: SymptomType }

/** Alerta (SRS §5.1 + explicabilidad RF-EVA-06). */
export interface Alert {
  /** Episodio activo: `${crewId}:${ruleId}`. */
  id: string;
  crewId: string;
  ruleId: string;
  organ: OrganSystem;
  region: RegionId;
  status: Status;
  urgency: Urgency;
  kind: 'threshold' | 'sustained' | 'correlation' | 'drift';
  values: Record<string, number | string>;
  threshold: string;
  explanation: string;
  countermeasureId: string;
  isSuspect: boolean;
  day: number;
}

export interface LedgerEntry {
  seq: number;
  hlc: string;
  type: string;
  crewId: string | null;
  detail: string;
  prev: string;
  hash: string;
}

export interface CountermeasureStep { id: string; text: string; resource: string | null }

export interface Protocol {
  id: string;
  title: string;
  what: string;
  severity: string;
  timeToImpact: string;
  steps: CountermeasureStep[];
  resources: string[];
  fsMessage?: string;
  /** Protocolo que sigue a este cuando el procedimiento necesita más de 4 pasos (ADR-017). */
  next?: string;
  /** Recurso → protocolo alternativo si ese recurso no está operativo (CU-07 FA-01). */
  alternatives?: Record<string, string>;
}

/** Contramedida (SRS §5.1): alerta, pasos y pasos completados. */
export interface Countermeasure { alertId: string; protocol: Protocol; completed: string[] }

export interface IndicatorState {
  id: IndicatorId;
  label: string;
  short: string;
  value: number | null;
  unit: string;
  decimals: number;
  status: StatusOrNone;
  nominalRange: string;
  slope: number | null;
  daysToCaution: number | null;
  z: number | null;
  isSuspect: boolean;
}

export interface RegionState { status: StatusOrNone; alertCount: number; isSuspect: boolean }

export interface Gamification {
  xp: number;
  level: number;
  streak: number;
  medals: { id: string; label: string; earnedToday: boolean }[];
}

/** Contrato de salida del Clinical Engine (C4 §3.1). */
export interface Assessment {
  crewId: string;
  day: number;
  global: StatusOrNone;
  statusOnly: boolean;
  regions: Record<RegionId, RegionState>;
  indicators: IndicatorState[];
  alerts: Alert[];
  gamification: Gamification | null;
  latencyMs: number;
}

/** Entrada del pipeline: historia hasta `day` del tripulante y del hábitat. */
export interface EvaluationInput {
  crewId: string;
  day: number;
  measurements: DailyMeasurement[];
  habitat: HabitatRecord[];
  symptoms: SymptomType[];
  /** Solo semáforo global, sin valores (pantalla de bloqueo, ADR-014/015). */
  statusOnly: boolean;
  /** XP adicional del PN-Counter (informes manuales, RF-GAM-01). */
  bonusXp?: number;
  /** Resumen exacto de los días que la ventana de entrada no envía (inputWindow.ts). */
  carry?: InputCarry;
  /** Contramedidas completadas por este tripulante, derivadas del G-Set (RF-GAM-01). */
  protocolsCompleted?: ProtocolCompletion[];
}

export interface ProtocolCompletion { alertId: string; protocolId: string; day: number }

export interface GamificationCarry {
  /** XP de los días recortados. */
  xp: number;
  /** Racha de ejercicio que termina en `streakEndDay` (último día recortado). */
  streak: number;
  streakEndDay: number;
}

export interface InputCarry {
  gamification: GamificationCarry;
  /** Rachas de condiciones sostenidas (RF-EVA-05) que terminan en el último día recortado. */
  sustained: Partial<Record<CrewIndicator, { days: number; endDay: number }>>;
}

export const SEVERITY: Record<StatusOrNone, number> = { none: -1, nominal: 0, caution: 1, critical: 2 };

export function worst(a: StatusOrNone, b: StatusOrNone): StatusOrNone {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}
