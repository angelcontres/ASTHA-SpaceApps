// Orquestador determinista del Clinical Engine (C4 §3.1). Objetivo: < 50 ms (RNF-PER-01), medido con performance.now().
// ZONA PURA: sin DOM, fetch, WebSocket ni storage (RF-EVA-07).
import { classify, bandText, INDICATORS, nominalRange } from './classifier';
import { evaluateCorrelations, CORRELATION_RULES } from './correlation';
import { resolveProtocol } from './countermeasures';
import { baselineFor, combinedPattern, DRIFT, modifiedZ, trendFor, type Trend } from './drift';
import { scoreGamification } from './gamification';
import { aggregateRegions, mapIndicator, regionOfSystem } from './organMapper';
import { applySustained } from './sustained';
import { validateValue } from './validator';
import {
  CREW_INDICATORS, HABITAT_INDICATORS, REGION_IDS, SEVERITY,
  type Alert, type Assessment, type CrewIndicator, type EvaluationInput, type HabitatIndicator,
  type IndicatorId, type IndicatorState, type RegionId, type RegionState, type Status,
} from './types';

const HABITAT_SET = new Set<string>(HABITAT_INDICATORS);
const STATUS_ES: Record<Status, string> = { nominal: 'Nominal', caution: 'Precaución', critical: 'Crítico' };

function fmt(v: number, decimals: number): string {
  return v.toFixed(decimals).replace('.', ',');
}

function emptyRegions(): Record<RegionId, RegionState> {
  return Object.fromEntries(REGION_IDS.map((r) => [r, { status: 'none', alertCount: 0, dubious: false }])) as Record<
    RegionId,
    RegionState
  >;
}

/** Ejecuta el triage completo de un tripulante para un día. */
export function evaluate(input: EvaluationInput): Assessment {
  const t0 = performance.now();
  const { crewId, day } = input;
  const history = input.measurements.filter((m) => m.day <= day);
  const today = history.at(-1)?.day === day ? history.at(-1)! : null;
  const hab = input.habitat.find((h) => h.day === day) ?? null;

  const indicators: IndicatorState[] = [];
  const alerts: Alert[] = [];
  const latest: Record<string, number | null> = {};
  const trends: Partial<Record<CrewIndicator, Trend | null>> = {};

  const pushIndicator = (id: IndicatorId, raw: unknown, trend: Trend | null, z: number | null) => {
    const def = INDICATORS[id];
    const v = validateValue(id, raw);
    latest[id] = v.value;
    let status: IndicatorState['status'] = 'none';
    let band = null;
    let sustainedDays = 0;
    let sustainedConfirmed = false;
    if (v.value !== null) {
      const c = classify(id, v.value);
      status = c.status;
      band = c.band;
      if (!HABITAT_SET.has(id)) {
        const s = applySustained(id as CrewIndicator, c.status, history);
        if (s) { status = s.status; sustainedDays = s.days; sustainedConfirmed = s.confirmed; }
      }
    }
    indicators.push({
      id, label: def.label, short: def.short, value: v.value, unit: def.unit, decimals: def.decimals,
      status, nominalRange: nominalRange(id), slope: trend?.slope ?? null,
      daysToCaution: trend?.daysToCaution ?? null, z, dubious: v.dubious,
    });

    // Alerta por umbral (RF-EVA-01) o sostenida (RF-EVA-05), con explicación (RF-EVA-06).
    if (v.value !== null && status !== 'none' && status !== 'nominal') {
      const { system, region } = mapIndicator(id);
      const habitatLevel = HABITAT_SET.has(id);
      const ruleId = sustainedConfirmed ? `SUS-${id}` : `TH-${id}`;
      const valueTxt = `${fmt(v.value, def.decimals)} ${def.unit}`;
      let explanation = `${def.label}: ${valueTxt}, en ${STATUS_ES[status]} (umbral ${bandText(band, def.unit)}).`;
      if (sustainedDays > 0) explanation += ` Sostenido ${sustainedDays} día(s).`;
      if (v.dubious) explanation += ' Dato dudoso: fuera del rango fisiológico posible.';
      alerts.push({
        id: habitatLevel ? `HAB:${ruleId}` : `${crewId}:${ruleId}`,
        crewId: habitatLevel ? 'HAB' : crewId,
        ruleId, organ: system, region, status,
        urgency: status === 'critical' ? 'high' : 'routine',
        kind: sustainedConfirmed ? 'sustained' : 'threshold',
        values: { [id]: v.value }, threshold: bandText(band, def.unit),
        explanation, countermeasureId: `CM-IND-${id}`, dubious: v.dubious, day,
      });
    }
  };

  for (const id of CREW_INDICATORS) {
    const trend = DRIFT.indicators.includes(id) && today ? trendFor(id, history) : null;
    trends[id] = trend;
    let z: number | null = null;
    const base = DRIFT.indicators.includes(id) ? baselineFor(id, history) : null;
    const raw = today?.[id];
    if (base && typeof raw === 'number') z = modifiedZ(raw, base);
    pushIndicator(id, raw, trend, z);
  }
  for (const id of HABITAT_INDICATORS) pushIndicator(id, hab?.[id as HabitatIndicator], null, null);

  // Correlaciones (RF-EVA-04, SRS §6.2).
  for (const hit of evaluateCorrelations(latest, input.symptoms)) {
    const r = hit.rule;
    const habitatOnly = r.all.every((c) => 'var' in c && HABITAT_SET.has(c.var));
    // La regla de correlación sustituye a las alertas de umbral del mismo sistema que explica.
    for (const c of r.all) {
      if (!('var' in c)) continue;
      const i = alerts.findIndex(
        (a) => (a.kind === 'threshold' || a.kind === 'sustained') && c.var in a.values && a.organ === r.organ &&
          SEVERITY[a.status] <= SEVERITY[r.status],
      );
      if (i >= 0) alerts.splice(i, 1);
    }
    const valuesTxt = Object.entries(hit.values)
      .map(([k, v]) => (typeof v === 'number' ? `${INDICATORS[k as IndicatorId]?.short ?? k} ${fmt(v, INDICATORS[k as IndicatorId]?.decimals ?? 1)}` : k.replace('_', ' ')))
      .join(', ');
    alerts.push({
      id: habitatOnly ? `HAB:${r.id}` : `${crewId}:${r.id}`,
      crewId: habitatOnly ? 'HAB' : crewId,
      ruleId: r.id, organ: r.organ, region: regionOfSystem(r.organ), status: r.status, urgency: r.urgency,
      kind: 'correlation', values: hit.values, threshold: hit.threshold,
      explanation: `${r.summary}. Valores: ${valuesTxt}. Condición: ${hit.threshold}.`,
      countermeasureId: r.countermeasureId, dubious: false, day,
    });
  }

  // Deriva (RF-DER-01..04): solo como aviso precoz cuando el valor actual sigue nominal.
  for (const ind of indicators) {
    if (ind.status !== 'nominal' || !DRIFT.indicators.includes(ind.id as CrewIndicator)) continue;
    const { system, region } = mapIndicator(ind.id);
    if (ind.daysToCaution !== null) {
      alerts.push({
        id: `${crewId}:D-01:${ind.id}`, crewId, ruleId: 'D-01', organ: system, region, status: 'caution',
        urgency: 'routine', kind: 'drift',
        values: { [ind.id]: ind.value!, pendiente: Number((ind.slope ?? 0).toFixed(3)) },
        threshold: `sale de ${ind.nominalRange}`,
        explanation: `${ind.label}: tendencia de 7 días ${(ind.slope ?? 0) > 0 ? 'ascendente' : 'descendente'}; llegará a precaución en ${ind.daysToCaution} día(s).`,
        countermeasureId: DRIFT.countermeasures['D-01'], dubious: ind.dubious, day,
      });
    } else if (ind.z !== null && Math.abs(ind.z) >= DRIFT.zThreshold) {
      alerts.push({
        id: `${crewId}:D-02:${ind.id}`, crewId, ruleId: 'D-02', organ: system, region, status: 'caution',
        urgency: 'routine', kind: 'drift',
        values: { [ind.id]: ind.value!, zMod: Number(ind.z.toFixed(2)) },
        threshold: `|M| ≥ ${String(DRIFT.zThreshold).replace('.', ',')}`,
        explanation: `${ind.label}: ${fmt(ind.value!, ind.decimals)} ${ind.unit} se aleja de tu línea base de los días 1-14 (Z modificado ${fmt(ind.z, 1)}).`,
        countermeasureId: DRIFT.countermeasures['D-02'], dubious: ind.dubious, day,
      });
    }
  }
  if (today && combinedPattern(trends.sleep ?? null, trends.dbp ?? null)) {
    alerts.push({
      id: `${crewId}:D-03`, crewId, ruleId: 'D-03', organ: 'cardiovascular', region: regionOfSystem('cardiovascular'),
      status: 'caution', urgency: 'routine', kind: 'drift',
      values: { sueño: Number(trends.sleep!.slope.toFixed(3)), pad: Number(trends.dbp!.slope.toFixed(3)) },
      threshold: 'pendiente sueño < 0 y PAD > 0 (7 días)',
      explanation: `Patrón combinado: el sueño baja ${fmt(Math.abs(trends.sleep!.slope * 7), 1)} h/semana y la diastólica sube ${fmt(trends.dbp!.slope * 7, 1)} mmHg/semana.`,
      countermeasureId: DRIFT.countermeasures['D-03'], dubious: false, day,
    });
  }

  // Solo se emiten alertas cuya contramedida existe y es válida (RF-GUI-03, ADR-017).
  const resolved = alerts.filter((a) => resolveProtocol(a.countermeasureId) !== null);
  resolved.sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status] || urgencyRank(b) - urgencyRank(a));

  const { regions, global } = aggregateRegions(indicators, resolved);
  const latencyMs = performance.now() - t0;

  if (input.statusOnly) {
    // ADR-014/015: semáforo global sin valores clínicos, reglas ni sistemas. El hábitat (ECLSS/CANS) no es clínico.
    const habitatOnly = indicators.filter((i) => HABITAT_SET.has(i.id));
    return { crewId, day, global, statusOnly: true, regions: emptyRegions(), indicators: habitatOnly, alerts: [], gamification: null, latencyMs };
  }
  // Gamificación después del triage: no cuenta en la latencia ni modifica alertas (RF-GAM-03).
  const gamification = scoreGamification(history, input.bonusXp ?? 0);
  return { crewId, day, global, statusOnly: false, regions, indicators, alerts: resolved, gamification, latencyMs };
}

function urgencyRank(a: Alert): number {
  return a.urgency === 'emergency' ? 2 : a.urgency === 'high' ? 1 : 0;
}

export { CORRELATION_RULES };
