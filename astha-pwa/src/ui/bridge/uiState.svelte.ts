// UI Navigation State (presentation only; clinical data comes exclusively from Worker Bridge).
import organs from '../../data/organs.json';
import { CATALOG, resolveProtocol } from '../../engine/countermeasures';
import { mapIndicator } from '../../engine/organMapper';
import type { IndicatorId, IndicatorState, RegionId, StatusOrNone, SymptomType } from '../../engine/types';

export type Tab = 'bio' | 'env' | 'triage' | 'sim';

class UiState {
  tab = $state<Tab>('bio');
  /** Alert whose countermeasure protocol is currently open (emergency, banner, region). */
  openAlertId = $state<string | null>(null);
  selectedRegion = $state<RegionId | null>(null);
  bioIndicator = $state<IndicatorId>('sbp');
  envIndicator = $state<IndicatorId>('ppco2');
  view = $state<'front' | 'back'>('front');
  settingsOpen = $state(false);
  devicesOpen = $state(false);
  emergencyOpen = $state(false);
  bioPassportOpen = $state(false);
  /** Reactive escalation stage per alert ID (1: 0-8s local, 2: 2 min CMO, 3: 5 min cabin). */
  alertStage = $state<Record<string, 1 | 2 | 3>>({});
  /** Local 630 nm night-mode toggle on the Lock Screen before authentication (ADR-014 read-only CRDT). */
  lockRedMode = $state(false);
  /** View B (full-screen Code Red) currently open for this alert ID. */
  codeRedId = $state<string | null>(null);
  /** View B manually dismissed by user: does not auto-reopen for the same alert ID. */
  codeRedDismissed = $state<string[]>([]);

  /** Opens an alert's countermeasure protocol in 1 tap (RNF-USA-02). */
  openProtocol(alertId: string, region?: RegionId) {
    this.openAlertId = alertId;
    if (region) this.selectedRegion = region;
    this.emergencyOpen = false;
    this.tab = 'triage';
  }
}

export const ui = new UiState();

export const STATUS_LABEL: Record<StatusOrNone, string> = {
  nominal: 'Nominal',
  caution: 'Caution',
  critical: 'Critical',
  none: 'No data',
};

export const ROLE_LABEL: Record<string, string> = {
  commander: 'Commander',
  cmo: 'CMO · Flight Surgeon',
  engineer: 'Flight Engineer',
  specialist: 'Mission Specialist',
};

export const INDICATOR_DISPLAY: Partial<Record<IndicatorId, { short: string; label: string }>> = {
  hr: { short: 'HR', label: 'Heart Rate' },
  hrv: { short: 'HRV', label: 'Heart Rate Variability (rMSSD)' },
  sbp: { short: 'SBP', label: 'Systolic Blood Pressure' },
  dbp: { short: 'DBP', label: 'Diastolic Blood Pressure' },
  spo2: { short: 'SpO₂', label: 'Oxygen Saturation' },
  glucose: { short: 'Gluc', label: 'Blood Glucose' },
  temp: { short: 'Temp', label: 'Body Temperature' },
  sleep: { short: 'Sleep', label: 'Sleep Duration' },
  mood: { short: 'Mood', label: 'Subjective Mood' },
  urineCa: { short: 'UCa', label: 'Urinary Calcium' },
  o2: { short: 'pO₂', label: 'Cabin Oxygen' },
  ppco2: { short: 'ppCO₂', label: 'Cabin ppCO₂' },
  pressure: { short: 'Press', label: 'Cabin Pressure' },
  cabinTemp: { short: 'Temp', label: 'Cabin Temperature' },
  humidity: { short: 'RH', label: 'Relative Humidity' },
  radiation: { short: 'Rad', label: 'Dose Rate (CANS)' },
};

export const SCENARIO_LABEL: Record<string, string> = {
  A: 'SANS Syndrome',
  B: 'CO₂ Microleak',
  C: 'Solar Storm (SPE)',
  D: 'Sleep + Low HRV',
  E: 'Hypercalciuria / Renal',
};

export const indShort = (i: Pick<IndicatorState, 'id' | 'short'>): string =>
  INDICATOR_DISPLAY[i.id]?.short ?? i.short;

export const indLabel = (i: Pick<IndicatorState, 'id' | 'label'>): string =>
  INDICATOR_DISPLAY[i.id]?.label ?? i.label;

export const scenarioLabel = (id: string, fallback: string): string =>
  SCENARIO_LABEL[id] ?? fallback;

export const REGION_LABEL: Record<RegionId, string> = {
  head: 'Eyes & Head (SANS)',
  chest: 'Thorax & Heart (HR)',
  lumbar: 'Kidney & Lumbar (Ca)',
  legs: 'Femur & Legs (ARED)',
  general: 'Systemic & Blood',
};

export const REGION_HOTSPOT_SHORT: Record<RegionId, string> = {
  head: 'Eyes/SANS',
  chest: 'Thorax/HR',
  lumbar: 'Kidney/Ca',
  legs: 'Femur/ARED',
  general: 'Systemic',
};

const SYSTEM_DISPLAY: Record<string, string> = {
  neuro_ocular: 'Neuro-ocular',
  cardiovascular: 'Cardiovascular',
  musculoskeletal: 'Musculoskeletal',
  renal: 'Renal',
  cognitive: 'Cognitive',
  radiation: 'Radiation',
  respiratory_env: 'Respiratory / Environment',
};

const SYMPTOM_DISPLAY: Record<string, string> = {
  blurred_vision: 'Blurred Vision',
  headache: 'Headache',
  nausea: 'Nausea',
  back_pain: 'Lumbar Back Pain',
  orthostatic_dizziness: 'Orthostatic Dizziness',
};

export const SYSTEM_LABEL = Object.fromEntries(
  Object.entries(organs.systems).map(([k, v]) => [k, SYSTEM_DISPLAY[k] ?? v.label]),
) as Record<string, string>;

export const SYMPTOM_LABEL = Object.fromEntries(
  Object.entries(organs.symptoms).map(([k, v]) => [k, SYMPTOM_DISPLAY[k] ?? v.label]),
) as Record<SymptomType, string>;

export const regionOfIndicator = (id: IndicatorId): RegionId => mapIndicator(id).region;

export { CATALOG, resolveProtocol };

/** Formats numeric telemetry using standard period decimals (`tabular-nums`). */
export function fmt(v: number | null | undefined, decimals = 0): string {
  return v == null || Number.isNaN(v) ? '—' : v.toFixed(decimals);
}

/** Formats flight day badge matching wireframe convention (`FD-120`). */
export const fd = (day: number) => `FD-${String(Math.max(1, Math.round(day))).padStart(3, '0')}`;

/** Mission phase description across pre-flight (`L-44..L-15`), orbital flight (`FD-001..FD-180`), and recovery (`R+1`). */
export function missionPhase(day: number): string {
  if (day <= 14) return 'Baseline Window (FD-001–014)';
  if (day < 180) return 'Deep-Space Transit';
  return 'End-of-Mission / R+1 Ready';
}
