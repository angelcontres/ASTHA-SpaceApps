// Issue #5 [Engine-05] — DoD: error de D-01/D-02 < 0,01 % frente a valores de referencia (AC-CLIN-02),
// correlación exacta de ppCO₂ y SPE en < 50 ms (AC-CLIN-04, RNF-PER-01), 10 reglas del SRS §6.2,
// D-01 en O(1), D-02 con guarda MAD > 0, D-03 y almacenamiento Float32Array (< 1 MB).
import { describe, expect, it } from 'vitest';
import { evaluateCorrelations } from '../src/engine/correlation';
import { baselineFor, combinedPattern, modifiedZ, RollingRegression, trendFor } from '../src/engine/drift';
import { evaluate } from '../src/engine/pipeline';
import { SeriesMatrix } from '../src/engine/series';
import type { DailyMeasurement, HabitatRecord, SymptomType } from '../src/engine/types';
import { buildView, generateDataset, scenarioOps, SYNTHETIC, type ScenarioId } from '../src/storage/telemetrySources';
import type { Op } from '../src/storage/crdt';

const nominal = (day: number, o: Partial<DailyMeasurement> = {}): DailyMeasurement => ({
  crewId: 'C001', day, hr: 65, hrv: 50, sbp: 115, dbp: 72, spo2: 98, glucose: 90, temp: 36.7, sleep: 7.5, mood: 8,
  urineCa: 200, ...o,
});
const series = (n: number, f?: (d: number) => Partial<DailyMeasurement>) => Array.from({ length: n }, (_, i) => nominal(i + 1, f?.(i + 1)));
const habSeries = (n: number): HabitatRecord[] =>
  Array.from({ length: n }, (_, i) => ({ day: i + 1, ppco2: 1.5, pressure: 101.3, o2: 20.9, radiation: 25 }));
const relErr = (got: number, want: number) => Math.abs(got - want) / Math.max(Math.abs(want), 1e-12);
const MAX_ERR = 1e-4; // 0,01 %

// Referencias independientes, en Float64 y por el método de dos pasadas (sin sumas móviles).
function refRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}
function refMedian(v: number[]) {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('D-01 · regresión de 7 días en O(1) (RF-DER-01/02)', () => {
  it('valor de referencia calculado a mano: pendiente 19/14 e intercepto 828/7', () => {
    const r = new RollingRegression(7);
    [120, 121, 123, 122, 125, 127, 128].forEach((y, i) => r.push(i + 1, y));
    const f = r.fit()!;
    expect(relErr(f.slope, 19 / 14)).toBeLessThan(MAX_ERR);
    expect(relErr(f.intercept, 828 / 7)).toBeLessThan(MAX_ERR);
  });

  it('con días de misión grandes (174..180) el resultado no pierde precisión', () => {
    const r = new RollingRegression(7);
    [120, 121, 123, 122, 125, 127, 128].forEach((y, i) => r.push(174 + i, y));
    const f = r.fit()!;
    expect(relErr(f.slope, 19 / 14)).toBeLessThan(1e-9);
    expect(relErr(f.intercept, 828 / 7 - (173 * 19) / 14)).toBeLessThan(1e-9);
  });

  it('ventana deslizante sobre 180 días: error < 0,01 % frente a la referencia de dos pasadas en cada paso', () => {
    const rnd = mulberry32(5);
    const ys = Array.from({ length: 180 }, (_, d) => 118 + 0.08 * d + (rnd() - 0.5) * 6);
    const r = new RollingRegression(7);
    for (let d = 1; d <= 180; d++) {
      r.push(d, ys[d - 1]);
      if (d < 7) continue;
      const xs = Array.from({ length: 7 }, (_, i) => d - 6 + i);
      const want = refRegression(xs, ys.slice(d - 7, d));
      const got = r.fit()!;
      expect(relErr(got.slope, want.slope), `día ${d}`).toBeLessThan(MAX_ERR);
      expect(relErr(got.intercept, want.intercept), `día ${d}`).toBeLessThan(MAX_ERR);
    }
    expect(r.count).toBe(7);
  });

  it('push en O(1): buffer circular de tamaño fijo, sin crecer ni desplazar arrays', () => {
    const r = new RollingRegression(7);
    for (let d = 1; d <= 10_000; d++) r.push(d, d % 13);
    expect(r.count).toBe(7);
    const fields = r as unknown as { xs: Float64Array; ys: Float64Array };
    expect(fields.xs).toBeInstanceOf(Float64Array);
    expect(fields.xs.length).toBe(7);
    expect(fields.ys.length).toBe(7);
  });

  it('emite el aviso antes de cruzar el umbral y calcula los días hasta precaución', () => {
    const h = series(30, (d) => ({ sbp: d <= 20 ? 115 : 115 + (d - 20) }));
    const t = trendFor('sbp', h)!;
    expect(t.slope).toBeCloseTo(1, 6);
    expect(t.daysToCaution).toBe(1); // 125 hoy (día 30) → sale de 105–125 mañana
    const a = evaluate({ crewId: 'C001', day: 30, measurements: h, habitat: habSeries(30), symptoms: [], statusOnly: false });
    expect(a.alerts.some((x) => x.ruleId === 'D-01')).toBe(true);
  });
});

describe('D-02 · Z-score modificado con MAD (ADR-011, RF-DER-03)', () => {
  // Línea base calculada a mano: mediana 71,5 y MAD 1,5.
  const base = [70, 72, 71, 73, 69, 75, 70, 71, 72, 74, 70, 71, 73, 72];
  const hist = (today: number) => series(15, (d) => ({ hr: d <= 14 ? base[d - 1] : today }));

  it('mediana, MAD y M coinciden con la referencia (error < 0,01 %) y el umbral |M| ≥ 2,5 es exacto', () => {
    const b = baselineFor('hr', hist(78))!;
    expect(b.median).toBe(71.5);
    expect(b.mad).toBe(1.5);
    expect(relErr(modifiedZ(78, b)!, (0.6745 * 6.5) / 1.5)).toBeLessThan(MAX_ERR); // 2,9228 → alerta
    expect(modifiedZ(77, b)!).toBeCloseTo((0.6745 * 5.5) / 1.5, 9); // 2,4732 → sin alerta
    const day = (v: number) => evaluate({ crewId: 'C001', day: 15, measurements: hist(v), habitat: habSeries(15), symptoms: [], statusOnly: false });
    expect(day(78).alerts.some((a) => a.ruleId === 'D-02' && 'hr' in a.values)).toBe(true);
    expect(day(77).alerts.some((a) => a.ruleId === 'D-02' && 'hr' in a.values)).toBe(false);
  });

  it('valores decimales guardados en Float32: error < 0,01 % frente a la referencia Float64', () => {
    const rnd = mulberry32(11);
    for (let trial = 0; trial < 200; trial++) {
      const xs = Array.from({ length: 14 }, () => 36.2 + rnd() * 1.1);
      const h = series(14, (d) => ({ temp: Math.round(xs[d - 1] * 100) / 100 }));
      const vals = h.map((m) => m.temp);
      const med = refMedian(vals);
      const mad = refMedian(vals.map((v) => Math.abs(v - med)));
      const b = baselineFor('temp', h)!;
      expect(relErr(b.median, med)).toBeLessThan(MAX_ERR);
      if (mad > 0) {
        expect(relErr(b.mad, mad)).toBeLessThan(MAX_ERR);
        expect(relErr(modifiedZ(37.8, b)!, (0.6745 * (37.8 - med)) / mad)).toBeLessThan(MAX_ERR);
      }
    }
  });

  it('guarda MAD > 0: una línea base constante no produce Z ni alerta D-02', () => {
    const h = series(15, (d) => ({ hr: d <= 14 ? 65 : 84 }));
    const b = baselineFor('hr', h)!;
    expect(b.mad).toBe(0);
    expect(modifiedZ(84, b)).toBeNull();
    const a = evaluate({ crewId: 'C001', day: 15, measurements: h, habitat: habSeries(15), symptoms: [], statusOnly: false });
    expect(a.alerts.some((x) => x.ruleId === 'D-02' && 'hr' in x.values)).toBe(false);
  });

  it('AC-CLIN-02.3: un artefacto aislado de 160 bpm no distorsiona la mediana ni genera deriva falsa', () => {
    const clean = baselineFor('hr', hist(72))!;
    const withArtifact = series(15, (d) => ({ hr: d === 6 ? 160 : d <= 14 ? base[d - 1] : 72 }));
    const b = baselineFor('hr', withArtifact)!;
    expect(Math.abs(b.median - clean.median)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(b.mad - clean.mad)).toBeLessThanOrEqual(0.5);
    const a = evaluate({ crewId: 'C001', day: 15, measurements: withArtifact, habitat: habSeries(15), symptoms: [], statusOnly: false });
    expect(a.alerts.filter((x) => x.kind === 'drift' && 'hr' in x.values)).toEqual([]);

    // Artefacto dentro de la ventana de 7 días: al día siguiente, con valor normal, no hay deriva de FC.
    const recent = series(30, (d) => ({ hr: d === 28 ? 160 : 65 + (d % 3) }));
    const r = evaluate({ crewId: 'C001', day: 30, measurements: recent, habitat: habSeries(30), symptoms: [], statusOnly: false });
    expect(r.alerts.filter((x) => x.kind === 'drift' && 'hr' in x.values)).toEqual([]);
  });
});

describe('D-03 · patrón combinado sueño ↓ y PAD ↑ (RF-DER-04)', () => {
  it('se activa solo con ambas pendientes en la misma ventana', () => {
    const both = series(30, (d) => (d > 23 ? { sleep: 8.4 - (d - 23) * 0.2, dbp: 70 + (d - 23) * 1.5 } : {}));
    const sleepOnly = series(30, (d) => (d > 23 ? { sleep: 8.4 - (d - 23) * 0.2 } : {}));
    expect(combinedPattern(trendFor('sleep', both), trendFor('dbp', both))).toBe(true);
    expect(combinedPattern(trendFor('sleep', sleepOnly), trendFor('dbp', sleepOnly))).toBe(false);
  });
});

describe('CorrEngine · 10 reglas del SRS §6.2 en sus fronteras', () => {
  const ids = (v: Record<string, number>, s: SymptomType[] = []) => evaluateCorrelations(v, s).map((h) => h.rule.id);
  it.each([
    ['R-ENV-01', { ppco2: 3.01, spo2: 93.9 }, [], { ppco2: 3.0, spo2: 93.9 }],
    ['R-ENV-02', { ppco2: 3.01 }, ['headache'], { ppco2: 3.0 }],
    ['R-SANS-01', { sbp: 136 }, ['blurred_vision'], { sbp: 135 }],
    ['R-SANS-02', { sbp: 136, sleep: 5.9 }, [], { sbp: 136, sleep: 6 }],
    ['R-RAD-01', { radiation: 100.1 }, [], { radiation: 100 }],
    ['R-RAD-02', { radiation: 100.1 }, ['nausea'], { radiation: 100 }],
    ['R-COG-01', { sleep: 5.4, hrv: 24.9 }, [], { sleep: 5.5, hrv: 24.9 }],
    ['R-REN-01', { urineCa: 300.1 }, ['back_pain'], { urineCa: 300 }],
    ['R-REN-02', { urineCa: 250 }, [], { urineCa: 249.9 }],
    ['R-CARD-01', { hr: 101 }, ['orthostatic_dizziness'], { hr: 100 }],
  ] as [string, Record<string, number>, SymptomType[], Record<string, number>][])(
    '%s se dispara justo por encima del umbral y no en el umbral',
    (rule, hit, symptoms, miss) => {
      expect(ids(hit, symptoms)).toContain(rule);
      expect(ids(miss, symptoms)).not.toContain(rule);
    },
  );

  it('ppCO₂ entre 2,0 y 3,0 con cefalea no dispara correlación: el SRS no define el preventivo de 2,5', () => {
    expect(ids({ ppco2: 2.6 }, ['headache'])).toEqual([]);
    expect(ids({ ppco2: 2.6, spo2: 93 })).toEqual([]);
  });
});

describe('AC-CLIN-04 / RNF-PER-01 · escenarios de CO₂ y SPE en < 50 ms', () => {
  const ds = generateDataset(SYNTHETIC);
  const DAY = 120;
  const run = (id: ScenarioId) => {
    let t = 1;
    const ops: Op[] = scenarioOps(id, 'C001', DAY).map((body) => ({ id: `s${t}`, hlc: { wallMs: t++, counter: 0, nodeId: 'n' }, author: 'n', keyRef: 'hab', body }));
    const v = buildView(ds, ops, DAY);
    return SYNTHETIC.crew.map((c) => evaluate({
      crewId: c.id, day: DAY, measurements: v.measurements[c.id], habitat: v.habitat, symptoms: v.symptoms[c.id] ?? [], statusOnly: false,
    }));
  };

  it('B (microfuga de CO₂): R-ENV-01 exacto en toda la tripulación', () => {
    for (const a of run('B')) {
      expect(a.alerts.map((x) => x.ruleId)).toContain('R-ENV-01');
      expect(a.latencyMs).toBeLessThan(50);
    }
  });

  it('C (tormenta solar): R-RAD-02 con náuseas en el afectado, R-RAD-01 en el resto', () => {
    const [c001, ...rest] = run('C');
    expect(c001.alerts.map((x) => x.ruleId)).toContain('R-RAD-02');
    expect(c001.alerts.find((x) => x.ruleId === 'R-RAD-02')?.urgency).toBe('emergency');
    for (const a of rest) expect(a.alerts.map((x) => x.ruleId)).toContain('R-RAD-01');
    for (const a of [c001, ...rest]) expect(a.latencyMs).toBeLessThan(50);
  });
});

describe('Almacenamiento Float32Array (issue #5)', () => {
  it('las 720 mediciones de 180 días caben en < 1 MB y las columnas son vistas sin copia', () => {
    const ds = generateDataset(SYNTHETIC);
    const matrices = SYNTHETIC.crew.map((c) => SeriesMatrix.from(ds.measurements[c.id]));
    expect(matrices.reduce((n, m) => n + m.length, 0)).toBe(720);
    const bytes = matrices.reduce((n, m) => n + m.byteLength, 0);
    expect(bytes).toBeLessThan(1024 * 1024);
    expect(bytes).toBeLessThan(40 * 1024); // ≈ 29 KB
    const m = matrices[0];
    expect(m.column('sbp')).toBeInstanceOf(Float32Array);
    expect(m.column('sbp').buffer).toBe(m.data.buffer);
    expect(m.column('sbp')[0]).toBeCloseTo(ds.measurements.C001[0].sbp, 4);
  });

  it('un hueco o un valor no numérico se guarda como NaN y se ignora en la deriva', () => {
    const h = series(10).map((m, i) => (i === 3 ? ({ ...m, hr: undefined } as unknown as DailyMeasurement) : m));
    const m = SeriesMatrix.from(h);
    expect(Number.isNaN(m.column('hr')[3])).toBe(true);
    expect(trendFor('hr', m)).not.toBeNull();
  });
});
