// RF-EVA-05: condiciones sostenidas ≥ 2 días (HRV < 20 ms, sueño < 5,5 h).
// Un solo día bajo el umbral se degrada a Precaución; 2 días consecutivos o más confirman Crítico.
import rules from '../data/rules.json';
import type { CrewIndicator, DailyMeasurement, Status } from './types';

export interface SustainedRule { indicator: CrewIndicator; op: '<' | '>'; value: number; days: number }
export const SUSTAINED = rules.sustained as SustainedRule[];

/** Días consecutivos (terminando en el último registro) que cumplen la condición. */
export function consecutiveDays(history: DailyMeasurement[], rule: SustainedRule): number {
  let n = 0;
  let expectedDay = history.at(-1)?.day ?? 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.day !== expectedDay) break; // hueco de días: se corta la racha
    const v = m[rule.indicator];
    if (typeof v !== 'number') break;
    const hit = rule.op === '<' ? v < rule.value : v > rule.value;
    if (!hit) break;
    n++;
    expectedDay--;
  }
  return n;
}

export interface SustainedResult { status: Status; days: number; confirmed: boolean }

export function applySustained(
  indicator: CrewIndicator,
  candidate: Status,
  history: DailyMeasurement[],
  table: SustainedRule[] = SUSTAINED,
): SustainedResult | null {
  const rule = table.find((r) => r.indicator === indicator);
  if (!rule) return null;
  const days = consecutiveDays(history, rule);
  if (days === 0) return null;
  const confirmed = days >= rule.days;
  // El crítico solo se confirma si se sostiene; si no, queda en precaución.
  const status: Status = candidate === 'critical' && !confirmed ? 'caution' : candidate;
  return { status, days, confirmed };
}
