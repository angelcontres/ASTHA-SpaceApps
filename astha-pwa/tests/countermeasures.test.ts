// Issue #6 [Engine-06] — DoD: todos los protocolos con ≤ 4 pasos y sin jerga (AC-CLIN-06); la inyección del escenario
// SPE dispara alerta y checklist de refugio en < 50 ms (AC-CLIN-05). Además: CounterResolver (RF-GUI-01..05,
// ADR-017, CU-07 FA-01), GamificationScorer (RF-GAM-01..03, PN-Counter) y CrisisSimulator (RF-SIM-01..05).
import { describe, expect, it } from 'vitest';
import rules from '../src/data/rules.json';
import {
  CATALOG, CountermeasureError, priorityOf, resolveForAlert, resolveProtocol, termsIn, UNAVAILABLE_PREFIX,
  unavailableFrom, validateCatalog, validateProtocol,
} from '../src/engine/countermeasures';
import { INDICATORS } from '../src/engine/classifier';
import { completedProtocols, GAM, scoreGamification, type CheckEvent } from '../src/engine/gamification';
import { compactInput } from '../src/engine/inputWindow';
import { evaluate } from '../src/engine/pipeline';
import type { Alert, Assessment, IndicatorId } from '../src/engine/types';
import type { Op } from '../src/storage/crdt';
import {
  buildView, generateDataset, resetOp, scenarioOps, SCENARIO_IDS, SYNTHETIC, type ScenarioId,
} from '../src/storage/telemetrySources';

const protocols = validateCatalog();
type Raw = Parameters<typeof validateProtocol>[1];
const raw = (o: Partial<Raw> = {}): Raw => ({
  title: 'Prueba', what: 'Explicación breve.', severity: 'Crítica', timeToImpact: 'minutos',
  steps: [{ id: 's1', text: 'Haz algo sencillo.', resource: null }], ...o,
});

describe('CounterResolver · catálogo (ADR-017, AC-CLIN-06, RF-GUI-01..04)', () => {
  it('todos los protocolos tienen 1 a 4 pasos y los 3 bloques completos', () => {
    expect(protocols.size).toBeGreaterThan(25);
    for (const p of protocols.values()) {
      expect(p.steps.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.steps.length, p.id).toBeLessThanOrEqual(4);
      expect(p.what.trim(), `${p.id} bloque 1`).not.toBe('');
      expect(`${p.severity}${p.timeToImpact}`.trim(), `${p.id} bloque 2`).not.toBe('');
      for (const s of p.steps) expect(s.text.trim(), `${p.id}/${s.id}`).not.toBe('');
    }
  });

  it('sin jerga: toda sigla de los bloques que lee la tripulación está definida en el glosario', () => {
    for (const p of protocols.values()) {
      for (const text of [p.title, p.what, p.severity, p.timeToImpact, ...p.steps.map((s) => s.text)]) {
        for (const t of termsIn(text)) expect(CATALOG.glossary[t], `${p.id}: "${t}"`).toBeTruthy();
      }
    }
  });

  it('solo recursos de a bordo: inventario declarado y ninguno inexistente en una nave', () => {
    for (const p of protocols.values()) {
      for (const r of p.resources) expect(CATALOG.inventory[r], `${p.id}: ${r}`).toBeTruthy();
      const text = [p.title, p.what, ...p.steps.map((s) => s.text)].join(' ').toLowerCase();
      for (const w of CATALOG.forbidden) expect(text.includes(w), `${p.id}: ${w}`).toBe(false);
    }
  });

  it('rechaza protocolos inválidos', () => {
    const steps5 = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, text: 'Paso.', resource: null }));
    expect(() => validateProtocol('X', raw({ steps: steps5 }))).toThrow(CountermeasureError);
    expect(() => validateProtocol('X', raw({ steps: [{ id: 's1', text: 'Usa el escáner.', resource: 'mri' }] }))).toThrow(/no está a bordo/);
    expect(() => validateProtocol('X', raw({ steps: [{ id: 's1', text: 'Traslada al hospital.', resource: null }] }))).toThrow(/inexistente/);
    expect(() => validateProtocol('X', raw({ what: 'Revisa el ECMO.' }))).toThrow(/glosario/);
    expect(() => validateProtocol('X', raw({ what: 'x'.repeat(301) }))).toThrow(/bloque 1/);
  });

  it('valida cadenas (destino existente, sin ciclos) y alternativas', () => {
    const cat = (p: Record<string, Raw>) => ({ ...CATALOG, protocols: p });
    expect(() => validateCatalog(cat({ A: raw({ next: 'Z' }) }))).toThrow(/no existe/);
    expect(() => validateCatalog(cat({ A: raw({ next: 'B' }), B: raw({ next: 'A' }) }))).toThrow(/ciclo/);
    const usesLbnp = raw({ steps: [{ id: 's1', text: 'Usa el LBNP.', resource: 'lbnp' }], alternatives: { lbnp: 'B' } });
    expect(() => validateCatalog(cat({ A: usesLbnp, B: usesLbnp }))).toThrow(/también usa/);
    expect(validateCatalog(cat({ A: raw({ next: 'B' }), B: raw() })).size).toBe(2);
  });

  it('toda regla, indicador y detector de deriva tiene protocolo resoluble (ninguna alerta queda sin guía)', () => {
    const ids = [
      ...rules.correlation.map((r) => r.countermeasureId),
      ...Object.values(rules.drift.countermeasures),
      ...(Object.keys(INDICATORS) as IndicatorId[]).map((id) => `CM-IND-${id}`),
    ];
    for (const id of ids) expect(resolveProtocol(id), id).not.toBeNull();
  });

  it('RF-GUI-05: todo protocolo alcanzable por una alerta roja indica qué enviar al Flight Surgeon', () => {
    const critical = [
      ...rules.correlation.filter((r) => r.status === 'critical').map((r) => r.countermeasureId),
      ...(Object.keys(INDICATORS) as IndicatorId[])
        .filter((id) => INDICATORS[id].bands.some((b) => b.status === 'critical'))
        .map((id) => `CM-IND-${id}`),
    ];
    for (const id of critical) expect(resolveProtocol(id)?.fsMessage, id).toBeTruthy();
  });
});

describe('CounterResolver · resolución por alerta', () => {
  const alert = (o: Partial<Alert>): Pick<Alert, 'countermeasureId' | 'status' | 'urgency'> => ({
    countermeasureId: 'CM-SANS-01', status: 'critical', urgency: 'high', ...o,
  });

  it('insignia de prioridad Alta / Media / Baja (AC-CLIN-06 bloque 2)', () => {
    expect(priorityOf('critical', 'high')).toBe('high');
    expect(priorityOf('caution', 'emergency')).toBe('high');
    expect(priorityOf('caution', 'high')).toBe('medium');
    expect(priorityOf('caution', 'routine')).toBe('low');
    expect(resolveForAlert(alert({}))!.priority).toBe('high');
  });

  it('CU-07 FA-01: con el LBNP no operativo devuelve la alternativa (torso a 30° y compresión venosa)', () => {
    const normal = resolveForAlert(alert({}))!;
    expect(normal.protocol.id).toBe('CM-SANS-01');
    expect(normal.substitutedFor).toBeNull();

    const marks = [`${UNAVAILABLE_PREFIX}lbnp`, 's2'];
    expect([...unavailableFrom(marks)]).toEqual(['lbnp']);
    const alt = resolveForAlert(alert({}), unavailableFrom(marks))!;
    expect(alt.protocol.id).toBe('CM-SANS-01-ALT');
    expect(alt.original?.id).toBe('CM-SANS-01');
    expect(alt.substitutedFor).toBe('lbnp');
    expect(alt.protocol.resources).not.toContain('lbnp');
    expect(alt.protocol.steps.length).toBeLessThanOrEqual(4);
    expect(alt.protocol.steps.map((s) => s.text).join(' ')).toMatch(/30°.*venous compression/s);

    // Un recurso no operativo que el protocolo no usa no cambia nada.
    expect(resolveForAlert(alert({ countermeasureId: 'CM-RAD-01' }), new Set(['lbnp']))!.protocol.id).toBe('CM-RAD-01');
  });

  it('una alerta sin protocolo en el catálogo no se resuelve', () => {
    expect(resolveForAlert(alert({ countermeasureId: 'CM-NOPE' }))).toBeNull();
  });
});

describe('GamificationScorer · RF-GAM-01..03 compatible con PN-Counter', () => {
  const stepsOf = (id: string) => resolveProtocol(id)?.steps.map((s) => s.id) ?? null;
  const checks = (alertId: string, protocolId: string, day: number, stepIds: string[], checked = true): CheckEvent[] =>
    stepIds.map((stepId) => ({ alertId, protocolId, stepId, checked, day }));
  const sans = ['s1', 's2', 's3'];

  it('una contramedida cuenta cuando todos sus pasos quedan marcados según el último evento', () => {
    expect(completedProtocols(checks('C001:R-SANS-01', 'CM-SANS-01', 120, sans), stepsOf)).toHaveLength(1);
    expect(completedProtocols(checks('C001:R-SANS-01', 'CM-SANS-01', 120, ['s1', 's2']), stepsOf)).toHaveLength(0);
    const undone = [...checks('C001:R-SANS-01', 'CM-SANS-01', 120, sans), ...checks('C001:R-SANS-01', 'CM-SANS-01', 120, ['s3'], false)];
    expect(completedProtocols(undone, stepsOf)).toHaveLength(0);
  });

  it('sin doble conteo: eventos repetidos de dos nodos o protocolo + alternativa cuentan una vez', () => {
    const a = checks('C001:R-SANS-01', 'CM-SANS-01', 120, sans);
    const dup = [...a, ...a];
    const withAlt = [...a, ...checks('C001:R-SANS-01', 'CM-SANS-01-ALT', 120, ['a1', 'a2', 'a3', 'a4'])];
    expect(completedProtocols(dup, stepsOf)).toHaveLength(1);
    expect(completedProtocols(withAlt, stepsOf)).toHaveLength(1);
  });

  it('el mismo conjunto de eventos da el mismo resultado en cualquier orden entre alertas (convergencia)', () => {
    const x = checks('C001:R-SANS-01', 'CM-SANS-01', 120, sans);
    const y = checks('C001:R-RAD-01', 'CM-RAD-01', 121, ['s1', 's2', 's3', 's4']);
    expect(completedProtocols([...x, ...y], stepsOf)).toEqual(completedProtocols([...y, ...x], stepsOf));
  });

  it('XP por ejercicio, hidratación, informe (PN-Counter) y contramedida completada; racha y nivel', () => {
    const ds = generateDataset(SYNTHETIC);
    const hist = ds.measurements.C001.slice(0, 10).map((m) => ({ ...m, exerciseMin: 160, waterL: 3 }));
    const done = [{ alertId: 'C001:R-SANS-01', protocolId: 'CM-SANS-01', day: 10 }];
    const g = scoreGamification(hist, 40, undefined, done);
    expect(g.xp).toBe(40 + 10 * (GAM.xp.exercise + GAM.xp.hydration) + GAM.xp.protocol);
    expect(g.streak).toBe(10);
    expect(g.level).toBe(Math.floor(g.xp / GAM.xpPerLevel) + 1);
    expect(g.medals.find((m) => m.id === 'protocol')?.earnedToday).toBe(true);
  });

  it('RF-GAM-03: la gamificación nunca cambia ni retrasa las alertas', () => {
    const ds = generateDataset(SYNTHETIC);
    const base = { crewId: 'C003', day: 150, measurements: ds.measurements.C003, habitat: ds.habitat, symptoms: [], statusOnly: false };
    const a = evaluate(base);
    const b = evaluate({ ...base, bonusXp: 9999, protocolsCompleted: [{ alertId: 'x', protocolId: 'CM-SANS-01', day: 150 }] });
    expect(b.alerts).toEqual(a.alerts);
    expect(b.global).toBe(a.global);
    expect(b.gamification!.xp).toBeGreaterThan(a.gamification!.xp);
  });
});

describe('CrisisSimulator · RF-SIM-01..05 (letras del SRS §3.8)', () => {
  const ds = generateDataset(SYNTHETIC);
  const DAY = 120;
  let seq = 1;
  const asOps = (bodies: ReturnType<typeof scenarioOps>): Op[] =>
    bodies.map((body) => ({ id: `o${seq}`, hlc: { wallMs: seq++, counter: 0, nodeId: 'n' }, author: 'n', keyRef: 'hab', body }));
  const assess = (ops: Op[]): Assessment[] => {
    const v = buildView(ds, ops, DAY);
    return SYNTHETIC.crew.map((c) => evaluate(compactInput({
      crewId: c.id, day: DAY, measurements: v.measurements[c.id], habitat: v.habitat, symptoms: v.symptoms[c.id] ?? [], statusOnly: false,
    })));
  };
  const rulesOf = (a: Assessment) => a.alerts.map((x) => x.ruleId);
  const inject = (id: ScenarioId) => assess(asOps(scenarioOps(id, 'C001', DAY)));

  it('A tormenta solar · B SANS · C CO₂ · D hipercalciuria (SRS) y extras E sueño/HRV · F compuesto', () => {
    expect(SCENARIO_IDS).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(rulesOf(inject('A')[0])).toContain('R-RAD-02');
    expect(rulesOf(inject('B')[0])).toContain('R-SANS-01');
    expect(inject('C').every((a) => rulesOf(a).includes('R-ENV-01'))).toBe(true);
    expect(rulesOf(inject('D')[0])).toContain('R-REN-01');
    expect(rulesOf(inject('E')[0])).toEqual(expect.arrayContaining(['R-COG-01']));
    const f = inject('F');
    expect(rulesOf(f[0])).toEqual(expect.arrayContaining(['R-RAD-02', 'R-ENV-01']));
    expect(f.slice(1).every((a) => rulesOf(a).includes('R-RAD-01') && rulesOf(a).includes('R-ENV-01'))).toBe(true);
  });

  it('cada escenario lleva a su protocolo: refugio, LBNP/Amsler, depurador de CO₂ y riñón', () => {
    const first = (id: ScenarioId, rule: string) => {
      const al = inject(id)[0].alerts.find((x) => x.ruleId === rule)!;
      return resolveForAlert(al)!.protocol;
    };
    expect(first('A', 'R-RAD-02').resources).toContain('shelter');
    expect(first('B', 'R-SANS-01').resources).toEqual(expect.arrayContaining(['lbnp', 'kit_alpha']));
    expect(first('C', 'R-ENV-01').resources).toEqual(expect.arrayContaining(['fans', 'lioh']));
    expect(first('D', 'R-REN-01').id).toBe('CM-REN-01');
  });

  it('determinista: misma inyección → mismas operaciones; reset en 1 toque vuelve a nominal', () => {
    for (const id of SCENARIO_IDS) expect(scenarioOps(id, 'C001', DAY)).toEqual(scenarioOps(id, 'C001', DAY));
    const ops = asOps(scenarioOps('F', 'C001', DAY));
    const after = assess([...ops, ...asOps([resetOp(DAY)])]);
    for (const a of after) expect(a.alerts.filter((x) => x.kind === 'correlation')).toEqual([]);
  });

  it('DoD AC-CLIN-05: inyectar SPE → alerta y checklist de refugio en < 50 ms (inyección → vista → triage → protocolo)', () => {
    const t0 = performance.now();
    const ops = asOps(scenarioOps('A', 'C001', DAY));
    const v = buildView(ds, ops, DAY);
    const a = evaluate(compactInput({
      crewId: 'C001', day: DAY, measurements: v.measurements.C001, habitat: v.habitat, symptoms: v.symptoms.C001 ?? [], statusOnly: false,
    }));
    const spe = a.alerts.find((x) => x.ruleId === 'R-RAD-02')!;
    const r = resolveForAlert(spe)!;
    const elapsed = performance.now() - t0;

    expect(spe).toMatchObject({ status: 'critical', urgency: 'emergency' });
    expect(r.priority).toBe('high');
    expect(r.protocol.steps[0]).toMatchObject({ resource: 'shelter' });
    expect(r.protocol.steps[0].text).toMatch(/shelter/i);
    expect(elapsed).toBeLessThan(50);
  });
});
