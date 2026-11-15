// Issue #4 [Engine-04] — DoD: 100 % de coincidencia con los rangos (AC-CLIN-01, SRS §6.1), 0 falsos negativos
// críticos, latencia < 50 ms (RNF-PER-01) y contrato postMessage con serialización < 1 ms.
import { describe, expect, it } from 'vitest';
import { classify, INDICATORS } from '../src/engine/classifier';
import { compactInput } from '../src/engine/inputWindow';
import { evaluate } from '../src/engine/pipeline';
import { validateValue } from '../src/engine/validator';
import type { DailyMeasurement, EvaluationInput, IndicatorId, Status } from '../src/engine/types';
import { generateDataset, SYNTHETIC } from '../src/storage/telemetrySources';

// Tabla de verdad escrita a mano desde SRS §6.1, sin leer thresholds.json. Regla del hueco: un valor entre dos
// bandas va a la más grave. Por encima/debajo de las bandas que el SRS no define se mantiene la banda extrema.
const C: Status = 'critical';
const W: Status = 'caution';
const N: Status = 'nominal';
const SRS: Partial<Record<IndicatorId, (v: number) => Status>> = {
  hr: (v) => (v < 45 ? C : v < 55 ? W : v <= 85 ? N : v <= 105 ? W : C),
  hrv: (v) => (v < 20 ? C : v < 35 ? W : N),
  sbp: (v) => (v <= 125 ? N : v <= 139 ? W : C),
  dbp: (v) => (v <= 84 ? N : v <= 89 ? W : C),
  spo2: (v) => (v < 93 ? C : v < 96 ? W : N),
  glucose: (v) => (v < 65 ? C : v < 75 ? W : v <= 105 ? N : v <= 125 ? W : C),
  temp: (v) => (v <= 37.3 ? N : v <= 37.9 ? W : C),
  sleep: (v) => (v < 5.5 ? C : v < 7 ? W : N),
  mood: (v) => (v < 4 ? C : v < 7 ? W : N),
  urineCa: (v) => (v < 250 ? N : v <= 300 ? W : C),
  ppco2: (v) => (v < 2 ? N : v <= 3 ? W : C),
  radiation: (v) => (v <= 35 ? N : v <= 100 ? W : C),
};

// Rangos plausibles del Diccionario de Datos §2 (RF-ING-05), también escritos a mano.
const PLAUSIBLE: Partial<Record<IndicatorId, [number, number]>> = {
  hr: [25, 220], hrv: [5, 200], sbp: [60, 260], dbp: [35, 160], spo2: [65, 100],
  glucose: [30, 400], temp: [34, 42], sleep: [0, 24], mood: [1, 10], urineCa: [0, 1000],
};

describe('AC-CLIN-01 · clasificación tri-estado frente a SRS §6.1', () => {
  it('coincide al 100 % en un barrido de centésimas por todo el rango y 0 falsos negativos críticos', () => {
    let points = 0;
    let criticals = 0;
    const misses: string[] = [];
    for (const [id, truth] of Object.entries(SRS) as [IndicatorId, (v: number) => Status][]) {
      const [lo, hi] = INDICATORS[id].plausible;
      for (let i = Math.round(lo * 100); i <= Math.round(hi * 100); i++) {
        const v = i / 100;
        const want = truth(v);
        const got = classify(id, v).status;
        points++;
        if (want === C) criticals++;
        if (got !== want && misses.length < 10) misses.push(`${id}=${v}: ${got} ≠ ${want}`);
      }
    }
    expect(misses).toEqual([]);
    expect(points).toBeGreaterThan(10_000);
    expect(criticals).toBeGreaterThan(1_000);
  });

  it('valores frontera exactos de AC-CLIN-01', () => {
    const cases: [IndicatorId, number, Status][] = [
      ['hr', 85, N], ['hr', 86, W], ['hr', 105, W], ['hr', 106, C], ['hr', 110, C], ['hr', 111, C], ['hr', 44.9, C],
      ['sbp', 125, N], ['sbp', 126, W], ['sbp', 139, W], ['sbp', 140, C],
      ['dbp', 84, N], ['dbp', 85, W], ['dbp', 89, W], ['dbp', 90, C],
      ['radiation', 35, N], ['radiation', 80, W], ['radiation', 81, W], ['radiation', 100, W], ['radiation', 100.1, C],
      ['ppco2', 1.99, N], ['ppco2', 2, W], ['ppco2', 3, W], ['ppco2', 3.01, C],
    ];
    for (const [id, v, want] of cases) expect(classify(id, v).status, `${id}=${v}`).toBe(want);
  });

  it('O₂ y presión de cabina usan el nominal del Diccionario de Datos §3', () => {
    for (const v of [19.5, 21, 23.5]) expect(classify('o2', v).status).toBe(N);
    for (const v of [97.9, 101.3, 102.7]) expect(classify('pressure', v).status).toBe(N);
    expect(classify('o2', 19.4).status).not.toBe(N);
    expect(classify('pressure', 97.8).status).not.toBe(N);
  });
});

describe('RangeValidator · RF-ING-05', () => {
  it('marca isSuspect fuera del rango plausible del Diccionario de Datos sin descartar el valor', () => {
    for (const [id, [lo, hi]] of Object.entries(PLAUSIBLE) as [IndicatorId, [number, number]][]) {
      expect(validateValue(id, lo).isSuspect, `${id}=${lo}`).toBe(false);
      expect(validateValue(id, hi).isSuspect, `${id}=${hi}`).toBe(false);
      const below = validateValue(id, lo - 1);
      expect(below.isSuspect, `${id}=${lo - 1}`).toBe(true);
      expect(below.value).toBe(lo - 1); // se conserva
      expect(validateValue(id, hi + 1).isSuspect, `${id}=${hi + 1}`).toBe(true);
    }
  });

  it('un valor sospechoso se sigue clasificando y la alerta lo indica', () => {
    const ds = generateDataset(SYNTHETIC);
    const ms = ds.measurements.C001.slice(0, 20).map((m) => ({ ...m }));
    ms[19] = { ...ms[19], hr: 230 }; // artefacto de sensor: fuera de 25–220
    const a = evaluate({ crewId: 'C001', day: 20, measurements: ms, habitat: ds.habitat, symptoms: [], statusOnly: false });
    const hr = a.indicators.find((i) => i.id === 'hr')!;
    expect(hr).toMatchObject({ value: 230, isSuspect: true, status: C });
    expect(a.alerts.find((x) => x.ruleId === 'TH-hr')).toMatchObject({ isSuspect: true, status: C });
    expect(a.regions.chest.isSuspect).toBe(true);
  });
});

// ------------------------------------------------------------------ contrato y ventana de entrada
const ds = generateDataset(SYNTHETIC);
const fullInput = (crewId: string, day: number, measurements = ds.measurements[crewId]): EvaluationInput => ({
  crewId, day, measurements, habitat: ds.habitat, symptoms: [], statusOnly: false, bonusXp: 40,
});
const stripLatency = <T extends { latencyMs: number }>(a: T) => ({ ...a, latencyMs: 0 });

describe('Contrato postMessage Data Worker → Clinical Engine', () => {
  it('la ventana de entrada produce exactamente el mismo Assessment que el historial completo (180 días × 4)', () => {
    for (const c of SYNTHETIC.crew) {
      for (let day = 1; day <= 180; day++) {
        const full = fullInput(c.id, day);
        expect(stripLatency(evaluate(compactInput(full))), `${c.id} día ${day}`).toEqual(stripLatency(evaluate(full)));
      }
    }
  });

  it('el arrastre conserva XP, racha y días sostenidos que empiezan antes de la ventana', () => {
    // 120 días seguidos con ejercicio, agua y sueño < 5,5 h: las rachas cruzan el corte de la ventana.
    const ms: DailyMeasurement[] = ds.measurements.C003.slice(0, 120).map((m) => ({ ...m, exerciseMin: 160, waterL: 3, sleep: 5 }));
    const full = fullInput('C003', 120, ms);
    const compact = compactInput(full);
    expect(compact.measurements.length).toBeLessThan(ms.length);
    expect(compact.carry?.gamification.streak).toBeGreaterThan(0);
    expect(compact.carry?.sustained.sleep?.days).toBeGreaterThan(0);
    const a = evaluate(full);
    const b = evaluate(compact);
    expect(b.gamification).toEqual(a.gamification);
    expect(a.gamification?.streak).toBe(120);
    expect(b.alerts.find((x) => x.ruleId === 'SUS-sleep')?.explanation).toContain('Sustained 120 day(s)');
    expect(stripLatency(b)).toEqual(stripLatency(a));
  });

  it('serialización del contrato < 1 ms (structuredClone, 4 tripulantes, día 180)', () => {
    const req = { type: 'evaluate', reqId: 1, inputs: SYNTHETIC.crew.map((c) => compactInput(fullInput(c.id, 180))) };
    const res = { type: 'assessments', reqId: 1, items: req.inputs.map(evaluate), engineMs: 0 };
    const median = (f: () => void) => {
      for (let i = 0; i < 10; i++) f();
      const xs: number[] = [];
      for (let i = 0; i < 31; i++) { const t = performance.now(); f(); xs.push(performance.now() - t); }
      return xs.sort((a, b) => a - b)[15];
    };
    expect(median(() => structuredClone(req))).toBeLessThan(1);
    expect(median(() => structuredClone(res))).toBeLessThan(1);
    // Determinista: la ventana reduce la petición a menos de un tercio del historial completo.
    const fullReq = { ...req, inputs: SYNTHETIC.crew.map((c) => fullInput(c.id, 180)) };
    expect(JSON.stringify(req).length).toBeLessThan(JSON.stringify(fullReq).length / 3);
  });
});

describe('RNF-PER-01 · latencia del pipeline', () => {
  it('cada tripulante se evalúa en < 50 ms medidos con performance.now() a lo largo de toda la misión', () => {
    let worst = 0;
    for (const c of SYNTHETIC.crew) {
      for (let day = 1; day <= 180; day += 7) worst = Math.max(worst, evaluate(compactInput(fullInput(c.id, day))).latencyMs);
    }
    expect(worst).toBeLessThan(50);
  });

  it('estado global = peor estado por órgano y región (RF-EVA-02)', () => {
    const a = evaluate(fullInput('C001', 180));
    const sev = { none: -1, nominal: 0, caution: 1, critical: 2 } as const;
    const worstRegion = Object.values(a.regions).reduce((m, r) => (sev[r.status] > sev[m] ? r.status : m), 'none' as keyof typeof sev);
    expect(a.global).toBe(worstRegion);
  });
});
