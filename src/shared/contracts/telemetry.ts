/**
 * ASTHA Domain & Telemetry Contracts
 * Aligned with docs/Modelo-datos-y-APIs/02-Diccionario-de-Datos.md and openapi.yaml (v3.0.0)
 */

export type CrewId = 'C001' | 'C002' | 'C003' | 'C004';
export type UserRole = 'ASTRONAUT' | 'CMO' | 'COMMANDER' | 'DISPLAY';
export type IndicatorStatus = 'NOMINAL' | 'CAUTION' | 'CRITICAL';

export type OrganSystem =
  | 'neuro-ocular'
  | 'cardiovascular'
  | 'musculoskeletal'
  | 'renal'
  | 'cognitive'
  | 'radiation'
  | 'respiratory/environmental';

export type SubjectiveSymptomType =
  | 'HEADACHE'
  | 'BLURRED_VISION'
  | 'NAUSEA'
  | 'FLANK_LUMBAR_PAIN'
  | 'STANDING_DIZZINESS';

export type CrisisScenarioId = 'NOMINAL' | 'SPE_STORM' | 'CO2_SPIKE' | 'SANS_CRISIS' | 'MULTI_FAULT';

export interface DailyMeasurement {
  recordId: string;
  crewId: CrewId;
  missionDay: number;
  recordedAtUtc: string;
  heartRateBpm: number;
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
  spo2Pct: number;
  hrvRmssdMs: number;
  sleepHours: number;
  urinaryCalciumMgDay: number;
  isSuspect: boolean;
}

export interface HabitatTelemetry {
  moduleId: string;
  recordedAtUtc: string;
  ppCo2MmHg: number;
  cabinPressureKpa: number;
  o2ConcentrationPct: number;
  temperatureC: number;
  relativeHumidityPct: number;
  radiationRateUSvH: number;
}

/**
 * Public Cabin Global Status (ADR-014):
 * Strictly excludes individual biomedical readings, organs, or clinical diagnoses.
 */
export interface CabinGlobalStatus {
  updatedAtUtc: string;
  habitatStatus: IndicatorStatus;
  habitat: HabitatTelemetry;
  crewTrafficLight: Record<CrewId, IndicatorStatus>;
}

/** Encrypted Envelope stored in IndexedDB & Sync Hub Op-Log (ADR-006 / ADR-009) */
export interface EncryptedEnvelope {
  id: string;
  hlc: string;
  autor: string;
  iv: string;
  ct: string;
  sha256: string;
  firma: string;
}

export type VersionVector = Record<string, string>;
