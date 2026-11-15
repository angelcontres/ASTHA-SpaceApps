// Plan de pruebas SRS §8: (1) fronteras de cada umbral, (2) reglas de correlación, (3) deriva, + pureza del engine.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classify } from '../src/engine/classifier';
import { evaluateCorrelations } from '../src/engine/correlation';
import { validateCatalog } from '../src/engine/countermeasures';
import { baselineFor, modifiedZ, RollingRegression } from '../src/engine/drift';
import { evaluate } from '../src/engine/pipeline';
import { accumulatedDose, CAREER_LIMIT_MSV, integrateMsv, SPE_EVENT_LIMIT_MSV } from '../src/engine/dose';
import { applySustained } from '../src/engine/sustained';
import { validateValue } from '../src/engine/validator';
import type { DailyMeasurement, HabitatRecord } from '../src/engine/types';

const nominal = (crewId: string, day: number, o: Partial<DailyMeasurement> = {}): DailyMeasurement => ({
  crewId, day, hr: 65, hrv: 50, sbp: 115, dbp: 72, spo2: 98, glucose: 90, temp: 36.7, sleep: 7.5, mood: 8, urineCa: 200,
  exerciseMin: 160, waterL: 2.7, ...o,
});
const hab = (day: number, o: Partial<HabitatRecord> = {}): HabitatRecord => ({
  day, ppco2: 1.5, pressure: 101.3, o2: 20.9, radiation: 25, ...o,
});
const series = (n: number, f?: (d: number) => Partial<DailyMeasurement>) =>
  Array.from({ length: n }, (_, i) => nominal('C001', i + 1, f?.(i + 1)));
const habSeries = (n: number, f?: (d: number) => Partial<HabitatRecord>) =>
  Array.from({ length: n }, (_, i) => hab(i + 1, f?.(i + 1)));

describe('Threshold Classifier (RF-EVA-01) — valor exacto, uno por debajo y uno por encima', () => {
  const cases: [Parameters<typeof classify>[0], number, string][] = [
    ['hr', 44, 'critical'], ['hr', 45, 'caution'], ['hr', 54, 'caution'], ['hr', 55, 'nominal'], ['hr', 85, 'nominal'],
    ['hr', 86, 'caution'], ['hr', 105, 'caution'], ['hr', 106, 'critical'], ['hr', 111, 'critical'],
    ['hrv', 19, 'critical'], ['hrv', 20, 'caution'], ['hrv', 34, 'caution'], ['hrv', 35, 'nominal'], ['hrv', 70, 'nominal'],
    ['sbp', 125, 'nominal'], ['sbp', 126, 'caution'], ['sbp', 139, 'caution'], ['sbp', 140, 'critical'],
    ['dbp', 84, 'nominal'], ['dbp', 85, 'caution'], ['dbp', 89, 'caution'], ['dbp', 90, 'critical'],
    ['spo2', 92, 'critical'], ['spo2', 93, 'caution'], ['spo2', 95, 'caution'], ['spo2', 96, 'nominal'],
    ['ppco2', 1.99, 'nominal'], ['ppco2', 2.0, 'caution'], ['ppco2', 3.0, 'caution'], ['ppco2', 3.01, 'critical'],
    ['radiation', 35, 'nominal'], ['radiation', 36, 'caution'], ['radiation', 90, 'caution'], ['radiation', 100, 'caution'], ['radiation', 101, 'critical'],
    ['sleep', 5.4, 'critical'], ['sleep', 5.5, 'caution'], ['sleep', 6.9, 'caution'], ['sleep', 6.95, 'caution'], ['sleep', 7.0, 'nominal'],
    ['glucose', 64, 'critical'], ['glucose', 65, 'caution'], ['glucose', 75, 'nominal'], ['glucose', 125, 'caution'], ['glucose', 130, 'critical'], ['glucose', 141, 'critical'],
    ['temp', 37.3, 'nominal'], ['temp', 37.4, 'caution'], ['temp', 38.0, 'critical'],
    ['mood', 3, 'critical'], ['mood', 4, 'caution'], ['mood', 7, 'nominal'],
    ['urineCa', 249, 'nominal'], ['urineCa', 250, 'caution'], ['urineCa', 300, 'caution'], ['urineCa', 301, 'critical'],
  ];
  it.each(cases)('%s = %d → %s', (id, v, expected) => expect(classify(id, v).status).toBe(expected));
});

describe('Validator (RF-ING-05)', () => {
  it('marca dudoso sin descartar', () => {
    const r = validateValue('hr', 400);
    expect(r.value).toBe(400);
    expect(r.dubious).toBe(true);
  });
  it('rechaza tipos inválidos', () => expect(validateValue('hr', 'x').value).toBeNull());
});

describe('Sustained Tracker (RF-EVA-05)', () => {
  it('HRV < 20 un solo día es precaución; dos días, crítico', () => {
    const one = series(10, (d) => (d === 10 ? { hrv: 18 } : {}));
    expect(applySustained('hrv', 'critical', one)?.status).toBe('caution');
    const two = series(10, (d) => (d >= 9 ? { hrv: 18 } : {}));
    expect(applySustained('hrv', 'critical', two)?.status).toBe('critical');
  });
});

describe('Correlation Rules (SRS §6.2)', () => {
  const base = { ppco2: 1.5, spo2: 98, sbp: 115, sleep: 7.5, radiation: 25, hrv: 50, urineCa: 200, hr: 65 };
  const ids = (v: Partial<typeof base>, s: Parameters<typeof evaluateCorrelations>[1] = []) =>
    evaluateCorrelations({ ...base, ...v }, s).map((h) => h.rule.id);
  it('R-ENV-01', () => expect(ids({ ppco2: 3.2, spo2: 93 })).toContain('R-ENV-01'));
  it('R-ENV-02', () => expect(ids({ ppco2: 3.2 }, ['headache'])).toContain('R-ENV-02'));
  it('R-SANS-01', () => expect(ids({ sbp: 136 }, ['blurred_vision'])).toContain('R-SANS-01'));
  it('R-SANS-02', () => expect(ids({ sbp: 136, sleep: 5.9 })).toContain('R-SANS-02'));
  it('R-RAD-01', () => expect(ids({ radiation: 101 })).toEqual(['R-RAD-01']));
  it('R-RAD-02 sustituye a R-RAD-01', () => expect(ids({ radiation: 101 }, ['nausea'])).toEqual(['R-RAD-02']));
  it('R-COG-01', () => expect(ids({ sleep: 5.4, hrv: 24 })).toContain('R-COG-01'));
  it('R-REN-01 sustituye a R-REN-02', () => expect(ids({ urineCa: 301 }, ['back_pain'])).toEqual(['R-REN-01']));
  it('R-REN-02', () => expect(ids({ urineCa: 260 })).toEqual(['R-REN-02']));
  it('R-CARD-01', () => expect(ids({ hr: 101 }, ['orthostatic_dizziness'])).toContain('R-CARD-01'));
  it('sin condiciones no dispara nada', () => expect(ids({})).toEqual([]));
});

describe('Drift Detector (SRS §6.3)', () => {
  it('regresión O(1) por sumas móviles', () => {
    const r = new RollingRegression(7);
    for (let d = 1; d <= 20; d++) r.push(d, 2 * d + 1);
    const f = r.fit()!;
    expect(f.slope).toBeCloseTo(2);
    expect(f.intercept).toBeCloseTo(1);
    expect(r.count).toBe(7);
  });
  it('Z modificado con mediana y MAD', () => {
    const h = series(14, (d) => ({ sbp: 110 + (d % 5) }));
    const b = baselineFor('sbp', h)!;
    expect(b.median).toBe(112);
    expect(modifiedZ(130, b)!).toBeGreaterThan(2.5);
  });
  it('D-01 emite aviso antes de cruzar el umbral', () => {
    const h = series(30, (d) => ({ sbp: d <= 20 ? 115 : 115 + (d - 20) * 1.0 }));
    const a = evaluate({ crewId: 'C001', day: 30, measurements: h, habitat: habSeries(30), symptoms: [], statusOnly: false });
    const sbp = a.indicators.find((i) => i.id === 'sbp')!;
    expect(sbp.status).toBe('nominal');
    expect(a.alerts.some((x) => x.ruleId === 'D-01')).toBe(true);
  });
  it('D-03 sueño ↓ y PAD ↑', () => {
    const h = series(30, (d) => (d > 23 ? { sleep: 8.4 - (d - 23) * 0.2, dbp: 70 + (d - 23) * 1.5 } : {}));
    const a = evaluate({ crewId: 'C001', day: 30, measurements: h, habitat: habSeries(30), symptoms: [], statusOnly: false });
    expect(a.alerts.some((x) => x.ruleId === 'D-03')).toBe(true);
  });
});

describe('Pipeline (RF-EVA-02, RNF-PER-01)', () => {
  it('estado global = el peor y latencia < 50 ms', () => {
    const h = series(180);
    const habs = habSeries(180, (d) => (d === 180 ? { radiation: 150 } : {}));
    const a = evaluate({ crewId: 'C001', day: 180, measurements: h, habitat: habs, symptoms: ['nausea'], statusOnly: false });
    expect(a.global).toBe('critical');
    expect(a.alerts[0].ruleId).toBe('R-RAD-02');
    expect(a.alerts[0].urgency).toBe('emergency');
    expect(a.regions.general.status).toBe('critical');
    expect(a.latencyMs).toBeLessThan(50);
  });
  it('statusOnly no expone valores clínicos ni reglas, solo hábitat (ADR-014)', () => {
    const a = evaluate({ crewId: 'C001', day: 30, measurements: series(30), habitat: habSeries(30), symptoms: [], statusOnly: true });
    expect(a.indicators.map((i) => i.id)).toEqual(['o2', 'ppco2', 'pressure', 'cabinTemp', 'humidity', 'radiation']);
    expect(a.alerts).toEqual([]);
    expect(a.global).toBe('nominal');
  });
});

describe('Countermeasure Resolver (ADR-017, RF-GUI-03)', () => {
  it('todo el catálogo tiene ≤ 4 pasos y recursos de a bordo', () => expect(validateCatalog().size).toBeGreaterThan(20));
});

describe('Pureza del engine (RF-EVA-07)', () => {
  const dir = join(__dirname, '../src/engine');
  for (const f of readdirSync(dir)) {
    it(`${f} no usa red, DOM ni storage`, () => {
      const src = readFileSync(join(dir, f), 'utf8').replace(/\/\/.*$/gm, '');
      expect(src).not.toMatch(/\b(fetch|WebSocket|XMLHttpRequest|document|window|localStorage|indexedDB|navigator)\b/);
    });
  }
});

describe('Dosis acumulada (AC-CLIN-05, CU-08)', () => {
  it('integra µSv/h × 24 h por registro diario en mSv', () => {
    expect(integrateMsv(25)).toBeCloseTo(0.6, 10);
    const d = accumulatedDose([{ day: 1, radiation: 25 }, { day: 2, radiation: 25 }, { day: 3, radiation: null }]);
    expect(d.missionMsv).toBeCloseTo(1.2, 10);
    expect(d.lastDayMsv).toBeCloseTo(0.6, 10);
    expect(d.speDays).toBe(0);
  });

  it('aísla el evento SPE en curso (días consecutivos finales > 100 µSv/h) frente al límite de 250 mSv', () => {
    const d = accumulatedDose([{ day: 3, radiation: 184.2 }, { day: 1, radiation: 30 }, { day: 2, radiation: 150 }]);
    expect(d.speDays).toBe(2);
    expect(d.speEventMsv).toBeCloseTo(((150 + 184.2) * 24) / 1000, 10);
    expect(d.speFraction).toBeCloseTo(d.speEventMsv / SPE_EVENT_LIMIT_MSV, 10);
    expect(accumulatedDose([{ day: 1, radiation: 150 }, { day: 3, radiation: 150 }]).speDays).toBe(1); // hueco: otro evento
    expect(accumulatedDose([{ day: 1, radiation: 100 }]).speDays).toBe(0); // 100 exacto no es crítico (SRS §6.1)
  });

  it('ignora valores no numéricos o negativos y compara con el límite de carrera de 600 mSv', () => {
    const d = accumulatedDose([{ day: 1, radiation: -5 }, { day: 2, radiation: Number.NaN }, { day: 3, radiation: 1000 }]);
    expect(d.missionMsv).toBeCloseTo(24, 10);
    expect(d.careerFraction).toBeCloseTo(24 / CAREER_LIMIT_MSV, 10);
  });
});
