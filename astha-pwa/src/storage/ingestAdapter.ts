// Telemetry ingestion adapters (SRS §5.2, RF-ING-01/02/05, issue #7).
//  - `adaptIngest`: the `POST /ingest/telemetry` contract of openapi.yaml (DailyMeasurement + HabitatTelemetry +
//    SubjectiveSymptomType). It lets a future sensor bridge (Astroskin, ECLSS bus) feed the clinical core without
//    touching it. Values outside the plausible range are kept and flagged isSuspect (RF-ING-05).
//  - `adaptReferenceDataset`: the bundled 90-day reference telemetry (src/data/reference_telemetry_90d.json),
//    loaded offline as an alternative source on top of the 180-day synthetic mission.
// Both produce CRDT operations that the Data Worker encrypts, signs and stores like any other record.
import { validateValue } from '../engine/validator';
import type { CrewIndicator, HabitatIndicator, SymptomType } from '../engine/types';
import type { OpBody } from './crdt';

type MeasurementOp = Extract<OpBody, { t: 'measurement' }>;
type HabitatOp = Extract<OpBody, { t: 'habitat' }>;
type SymptomOp = Extract<OpBody, { t: 'symptom' }>;

/** openapi.yaml DailyMeasurement → internal indicator. */
export const MEASUREMENT_FIELDS: Record<string, CrewIndicator> = {
  hr: 'hr', hrvRmssd: 'hrv', pas: 'sbp', pad: 'dbp', spo2: 'spo2', glucose: 'glucose',
  tempC: 'temp', sleepHours: 'sleep', mood: 'mood', urinaryCalciumMgDay: 'urineCa',
};
const REQUIRED_MEASUREMENT = ['hr', 'hrvRmssd', 'pas', 'pad', 'spo2', 'glucose', 'tempC', 'sleepHours', 'mood'];

/** openapi.yaml HabitatTelemetry → internal indicator. */
export const HABITAT_FIELDS: Record<string, HabitatIndicator> = {
  ppCo2Mmhg: 'ppco2', cabinPressureKpa: 'pressure', o2Percent: 'o2', radiationUSvH: 'radiation',
};

/** openapi.yaml SubjectiveSymptomType → internal symptom. `extremeFatigue` has no internal rule yet. */
export const SYMPTOM_MAP: Record<string, SymptomType | null> = {
  blurredVision: 'blurred_vision', headache: 'headache', nausea: 'nausea', lumbarPain: 'back_pain',
  orthostaticDizziness: 'orthostatic_dizziness', extremeFatigue: null,
};

export interface IngestResult {
  ok: boolean;
  /** Contract violations that prevent ingestion (missing/invalid required fields, unknown crew). */
  errors: string[];
  /** Internal indicators flagged isSuspect (outside the plausible range, kept). */
  suspect: string[];
  /** Symptoms accepted by the contract that the clinical engine does not model yet. */
  unsupportedSymptoms: string[];
  ops: OpBody[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isDay = (v: unknown, maxDay: number): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= maxDay;

/** Validates and maps one `POST /ingest/telemetry` body. Never throws. */
export function adaptIngest(body: unknown, crewIds: readonly string[], maxDay = 180): IngestResult {
  const r: IngestResult = { ok: false, errors: [], suspect: [], unsupportedSymptoms: [], ops: [] };
  if (!isObj(body)) { r.errors.push('body must be a JSON object'); return r; }
  const { crewId, measurement, habitat, symptoms } = body;
  if (typeof crewId !== 'string' || !crewIds.includes(crewId)) r.errors.push(`crewId must be one of ${crewIds.join(', ')}`);
  if (!isObj(measurement)) r.errors.push('measurement is required');
  if (!isObj(habitat)) r.errors.push('habitat is required');
  if (r.errors.length) return r;
  const m = measurement as Record<string, unknown>;
  const h = habitat as Record<string, unknown>;

  if (!isDay(m.missionDay, maxDay)) r.errors.push(`measurement.missionDay must be an integer 1..${maxDay}`);
  if (!isDay(h.missionDay, maxDay)) r.errors.push(`habitat.missionDay must be an integer 1..${maxDay}`);
  for (const k of REQUIRED_MEASUREMENT) if (typeof m[k] !== 'number' || !Number.isFinite(m[k])) r.errors.push(`measurement.${k} must be a number`);
  for (const k of Object.keys(HABITAT_FIELDS)) if (typeof h[k] !== 'number' || !Number.isFinite(h[k])) r.errors.push(`habitat.${k} must be a number`);
  if (symptoms !== undefined && !Array.isArray(symptoms)) r.errors.push('symptoms must be an array');
  if (r.errors.length) return r;

  const fields: Record<string, number> = {};
  for (const [src, id] of Object.entries(MEASUREMENT_FIELDS)) {
    if (typeof m[src] !== 'number') continue;
    const v = validateValue(id, m[src]);
    if (v.value === null) continue;
    fields[id] = v.value;
    if (v.isSuspect || m.isSuspect === true) r.suspect.push(id);
  }
  const habitatFields: Record<string, number> = {};
  for (const [src, id] of Object.entries(HABITAT_FIELDS)) {
    const v = validateValue(id, h[src]);
    if (v.value === null) continue;
    habitatFields[id] = v.value;
    if (v.isSuspect) r.suspect.push(id);
  }
  const day = m.missionDay as number;
  r.ops.push({ t: 'measurement', crewId: crewId as string, day, fields, source: 'import' } satisfies MeasurementOp);
  r.ops.push({ t: 'habitat', day: h.missionDay as number, fields: habitatFields, source: 'import' } satisfies HabitatOp);
  for (const s of (symptoms as unknown[] | undefined) ?? []) {
    const mapped = typeof s === 'string' ? SYMPTOM_MAP[s] : undefined;
    if (mapped === undefined) { r.errors.push(`unknown symptom: ${String(s)}`); continue; }
    if (mapped === null) { r.unsupportedSymptoms.push(s as string); continue; }
    r.ops.push({ t: 'symptom', crewId: crewId as string, day, symptom: mapped, active: true, source: 'import' } satisfies SymptomOp);
  }
  r.suspect = [...new Set(r.suspect)];
  r.ok = r.errors.length === 0;
  if (!r.ok) r.ops = [];
  return r;
}

// ------------------------------------------------------------------ bundled 90-day reference dataset

export interface ReferenceRecord {
  subject: string; day: number;
  hr: number; hrv: number; sbp: number; dbp: number; spo2: number; glucose: number; temp: number; sleep: number;
  mood: number; radiation: number;
}
export interface ReferenceDataset { subjects: string[]; records: ReferenceRecord[] }

export interface ReferenceImport {
  measurements: MeasurementOp[];
  habitat: HabitatOp[];
  suspect: number;
  /** subject → crew id. */
  mapping: Record<string, string>;
}

/**
 * Maps the reference subjects (ASTRO-01..04) onto the crew (C001..C004) in order. Mood is a 1-10 integer in the
 * clinical model, so the reference's decimal cognitive score is rounded. Habitat radiation is the daily mean
 * of the subjects' dose rate (the reference has no other ECLSS channels).
 */
export function adaptReferenceDataset(ds: ReferenceDataset, crewIds: readonly string[]): ReferenceImport {
  const mapping = Object.fromEntries(ds.subjects.slice(0, crewIds.length).map((s, i) => [s, crewIds[i]]));
  const out: ReferenceImport = { measurements: [], habitat: [], suspect: 0, mapping };
  const radiationByDay = new Map<number, number[]>();
  for (const rec of ds.records) {
    const crewId = mapping[rec.subject];
    if (!crewId) continue;
    const fields: Record<string, number> = {};
    for (const id of ['hr', 'hrv', 'sbp', 'dbp', 'spo2', 'glucose', 'temp', 'sleep', 'mood'] as const) {
      const raw = id === 'mood' ? Math.min(10, Math.max(1, Math.round(rec.mood))) : rec[id];
      const v = validateValue(id, raw);
      if (v.value === null) continue;
      fields[id] = v.value;
      if (v.isSuspect) out.suspect++;
    }
    out.measurements.push({ t: 'measurement', crewId, day: rec.day, fields, source: 'import' });
    (radiationByDay.get(rec.day) ?? radiationByDay.set(rec.day, []).get(rec.day)!).push(rec.radiation);
  }
  for (const [day, xs] of [...radiationByDay].sort((a, b) => a[0] - b[0])) {
    const mean = Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
    out.habitat.push({ t: 'habitat', day, fields: { radiation: mean }, source: 'import' });
  }
  return out;
}
