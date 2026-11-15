// Fuentes de telemetría (C4 §3.3 Telemetry Sources):
//  - Dataset sintético determinista de 180 días × 4 tripulantes (RF-ING-03, ADR-016).
//  - Entrada manual de 9 variables + 5 síntomas (RF-ING-01, RF-ING-04), validada sin descartar (RF-ING-05).
//  - Escenarios del simulador, reset en 1 toque y avance de tiempo (RF-SIM-01..05).
//  - Reloj simulado con UN único setTimeout cancelable; nunca setInterval ni polling (RNF-POW-01).
// Todo cambio se emite como operación del G-Set: nada se sobrescribe.
import cfg from '../data/synthetic_180d.json';
import { validateValue } from '../engine/validator';
import {
  MANUAL_FIELDS, SYMPTOMS,
  type CrewIndicator, type DailyMeasurement, type HabitatRecord, type Role, type SymptomType,
} from '../engine/types';
import { compareHlc, type Op, type OpBody } from './crdt';

// ---------------- configuración ----------------

export interface CrewConfig {
  id: string;
  name: string;
  role: Role;
  pin: string;
  baseline: Record<string, number>;
  drift: { indicator: string; fromDay: number; perDay: number }[];
}

export interface ScenarioDef {
  label: string;
  req: string;
  measurement?: Record<string, number>;
  habitat?: Record<string, number>;
  symptoms?: SymptomType[];
  allCrew?: boolean;
  sustainedDays?: number;
}

export interface SyntheticConfig {
  seed: number;
  days: number;
  startDay: number;
  crew: CrewConfig[];
  noise: Record<string, number>;
  boneLossPerDay: Record<string, number>;
  habitat: { baseline: Record<string, number>; noise: Record<string, number> };
  scenarios: Record<string, ScenarioDef | string>;
}

export const SYNTHETIC = cfg as unknown as SyntheticConfig;
export type ScenarioId = 'A' | 'B' | 'C' | 'D' | 'E';
export const SCENARIO_IDS: ScenarioId[] = ['A', 'B', 'C', 'D', 'E'];

export function scenario(id: ScenarioId, c: SyntheticConfig = SYNTHETIC): ScenarioDef {
  return c.scenarios[id] as ScenarioDef;
}

// ---------------- generador determinista ----------------

/** PRNG mulberry32: misma semilla → mismo dataset en todos los dispositivos. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const DECIMALS: Record<string, number> = {
  hr: 0, hrv: 0, sbp: 0, dbp: 0, spo2: 0, glucose: 0, temp: 1, sleep: 1, mood: 0, urineCa: 0,
  exerciseMin: 0, waterL: 1, ppco2: 2, pressure: 1, o2: 1, radiation: 1,
};

export interface Dataset {
  crew: CrewConfig[];
  measurements: Record<string, DailyMeasurement[]>;
  habitat: HabitatRecord[];
}

export function generateDataset(c: SyntheticConfig = SYNTHETIC): Dataset {
  const rnd = mulberry32(c.seed);
  const measurements: Record<string, DailyMeasurement[]> = {};
  for (const crew of c.crew) {
    const rows: DailyMeasurement[] = [];
    for (let day = 1; day <= c.days; day++) {
      const row: Record<string, number | string> = { crewId: crew.id, day };
      for (const [k, base] of Object.entries(crew.baseline)) {
        let v = base + gaussian(rnd) * (c.noise[k] ?? 0);
        v += (c.boneLossPerDay[k] ?? 0) * day;
        for (const d of crew.drift) if (d.indicator === k && day > d.fromDay) v += d.perDay * (day - d.fromDay);
        if (k === 'spo2') v = Math.min(100, v);
        if (k === 'mood') v = Math.max(1, Math.min(10, v));
        row[k] = round(v, DECIMALS[k] ?? 1);
      }
      rows.push(row as unknown as DailyMeasurement);
    }
    measurements[crew.id] = rows;
  }
  const habitat: HabitatRecord[] = [];
  for (let day = 1; day <= c.days; day++) {
    const h: Record<string, number> = { day };
    for (const [k, base] of Object.entries(c.habitat.baseline)) {
      h[k] = round(base + gaussian(rnd) * (c.habitat.noise[k] ?? 0), DECIMALS[k] ?? 1);
    }
    habitat.push(h as unknown as HabitatRecord);
  }
  return { crew: c.crew, measurements, habitat };
}

// ---------------- entrada manual ----------------

export interface ManualEntryResult {
  body: OpBody;
  /** Campos marcados como dudosos (RF-ING-05). Se guardan igualmente. */
  dubious: string[];
  rejected: string[];
}

/** RF-ING-01: valida las 9 variables. Tipos inválidos se rechazan; valores imposibles se marcan, no se descartan. */
export function manualEntry(crewId: string, day: number, fields: Partial<Record<CrewIndicator, unknown>>): ManualEntryResult {
  const clean: Record<string, number> = {};
  const dubious: string[] = [];
  const rejected: string[] = [];
  for (const [k, raw] of Object.entries(fields)) {
    if (!(MANUAL_FIELDS as readonly string[]).includes(k) && k !== 'urineCa') { rejected.push(k); continue; }
    const v = validateValue(k as CrewIndicator, raw);
    if (v.value === null) { rejected.push(k); continue; }
    clean[k] = v.value;
    if (v.dubious) dubious.push(k);
  }
  return { body: { t: 'measurement', crewId, day, fields: clean, source: 'manual' }, dubious, rejected };
}

/** RF-ING-04: un toque por síntoma. Activar y desactivar son eventos distintos (append-only). */
export function symptomToggle(crewId: string, day: number, symptom: SymptomType, active: boolean): OpBody {
  if (!SYMPTOMS.includes(symptom)) throw new Error(`síntoma desconocido: ${symptom}`);
  return { t: 'symptom', crewId, day, symptom, active, source: 'manual' };
}

// ---------------- escenarios ----------------

/** Operaciones que inyecta un escenario sobre el día actual. */
export function scenarioOps(id: ScenarioId, targetCrew: string, day: number, c: SyntheticConfig = SYNTHETIC): OpBody[] {
  const s = scenario(id, c);
  if (!s) throw new Error(`escenario desconocido: ${id}`);
  const ops: OpBody[] = [{ t: 'sim', action: 'scenario', scenario: id, day }];
  const crews = s.allCrew ? c.crew.map((x) => x.id) : [targetCrew];
  const days = Array.from({ length: s.sustainedDays ?? 1 }, (_, i) => day - i).filter((d) => d >= 1).reverse();
  for (const d of days) {
    if (s.habitat) ops.push({ t: 'habitat', day: d, fields: { ...s.habitat }, source: 'sim' });
    for (const crewId of crews) {
      if (s.measurement) ops.push({ t: 'measurement', crewId, day: d, fields: { ...s.measurement }, source: 'sim' });
    }
  }
  for (const sym of s.symptoms ?? []) {
    ops.push({ t: 'symptom', crewId: targetCrew, day, symptom: sym, active: true, source: 'sim' });
  }
  return ops;
}

export function resetOp(day: number): OpBody {
  return { t: 'sim', action: 'reset', day };
}

// ---------------- vista derivada ----------------

export interface TelemetryView {
  day: number;
  measurements: Record<string, DailyMeasurement[]>;
  habitat: HabitatRecord[];
  symptoms: Record<string, SymptomType[]>;
  activeScenarios: string[];
}

/**
 * Dataset base + operaciones del G-Set (ordenadas por HLC). Las inyecciones del simulador anteriores al último
 * reset se ignoran en la vista, pero siguen en el G-Set y en la bitácora.
 */
export function buildView(ds: Dataset, ops: Op[], day: number): TelemetryView {
  const sorted = [...ops].sort((a, b) => compareHlc(a.hlc, b.hlc));
  let lastReset: Op | null = null;
  for (const op of sorted) if (op.body.t === 'sim' && op.body.action === 'reset') lastReset = op;
  const live = (op: Op) => !lastReset || compareHlc(op.hlc, lastReset.hlc) > 0;

  const measurements: Record<string, DailyMeasurement[]> = {};
  for (const [crewId, rows] of Object.entries(ds.measurements)) {
    measurements[crewId] = rows.filter((r) => r.day <= day).map((r) => ({ ...r }));
  }
  const habitat = ds.habitat.filter((h) => h.day <= day).map((h) => ({ ...h }));
  const symptomState: Record<string, Map<SymptomType, boolean>> = {};
  const activeScenarios: string[] = [];

  for (const op of sorted) {
    const b = op.body;
    if (b.t === 'measurement' && b.day <= day && (b.source !== 'sim' || live(op))) {
      const rows = (measurements[b.crewId] ??= []);
      let row = rows.find((r) => r.day === b.day);
      if (!row) {
        row = { crewId: b.crewId, day: b.day } as DailyMeasurement;
        rows.push(row);
        rows.sort((x, y) => x.day - y.day);
      }
      Object.assign(row, b.fields);
      if (b.source === 'manual') row.manual = true;
    } else if (b.t === 'habitat' && b.day <= day && live(op)) {
      const h = habitat.find((x) => x.day === b.day);
      if (h) Object.assign(h, b.fields);
    } else if (b.t === 'symptom' && b.day === day && (b.source !== 'sim' || live(op))) {
      (symptomState[b.crewId] ??= new Map()).set(b.symptom as SymptomType, b.active);
    } else if (b.t === 'sim' && b.action === 'scenario' && b.day === day && live(op) && b.scenario) {
      if (!activeScenarios.includes(b.scenario)) activeScenarios.push(b.scenario);
    }
  }
  const symptoms: Record<string, SymptomType[]> = {};
  for (const [crewId, m] of Object.entries(symptomState)) {
    symptoms[crewId] = [...m].filter(([, on]) => on).map(([s]) => s);
  }
  return { day, measurements, habitat, symptoms, activeScenarios };
}

// ---------------- reloj simulado ----------------

export interface Timers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (h: unknown) => void;
}
const defaultTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/**
 * Reloj del simulador. En reproducción programa UN setTimeout hasta el siguiente día; al pausar lo cancela.
 * En reposo no hay ningún temporizador vivo.
 */
export class SimClock {
  private handle: unknown = null;

  constructor(
    public day: number,
    private readonly maxDay: number,
    private readonly onDay: (day: number) => void,
    private readonly timers: Timers = defaultTimers,
  ) {}

  get playing(): boolean { return this.handle !== null; }

  setDay(day: number): void {
    const d = Math.max(1, Math.min(this.maxDay, Math.round(day)));
    if (d === this.day) return;
    this.day = d;
    this.onDay(d);
  }

  advance(days = 1): void {
    this.setDay(this.day + days);
    if (this.day >= this.maxDay) this.pause();
  }

  play(msPerDay = 3000): void {
    this.pause();
    if (this.day >= this.maxDay) return;
    const step = () => {
      this.handle = null;
      this.advance(1);
      if (this.day < this.maxDay) this.handle = this.timers.set(step, msPerDay);
    };
    this.handle = this.timers.set(step, msPerDay);
  }

  pause(): void {
    if (this.handle !== null) this.timers.clear(this.handle);
    this.handle = null;
  }
}
