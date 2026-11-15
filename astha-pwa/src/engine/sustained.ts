// RF-EVA-05: condiciones sostenidas ≥ 2 días (HRV < 20 ms, sueño < 5,5 h).
// Un solo día bajo el umbral se degrada a Precaución; 2 días consecutivos o más confirman Crítico.
import rules from '../data/rules.json';
import type { CrewIndicator, DailyMeasurement, Status } from './types';

export interface SustainedRule { indicator: CrewIndicator; op: '<' | '>'; value: number; days: number }
export const SUSTAINED = rules.sustained as SustainedRule[];

/** Racha que termina en el último día recortado por la ventana de entrada (ver inputWindow.ts). */
export interface RunCarry { days: number; endDay: number }

/**
 * Días consecutivos (terminando en el último registro) que cumplen la condición. Si la racha llega al hueco que
 * dejó la ventana de entrada, continúa con la racha arrastrada (`carry`), así el resultado es idéntico al del
 * historial completo.
 */
export function consecutiveDays(history: DailyMeasurement[], rule: SustainedRule, carry?: RunCarry): number {
  let n = 0;
  let expectedDay = history.at(-1)?.day ?? 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.day !== expectedDay) break; // hueco de días: se corta la racha (o continúa con el arrastre)
    const v = m[rule.indicator];
    if (typeof v !== 'number') break;
    const hit = rule.op === '<' ? v < rule.value : v > rule.value;
    if (!hit) break;
    n++;
    expectedDay--;
  }
  if (carry && carry.days > 0 && n > 0 && expectedDay === carry.endDay) n += carry.days;
  return n;
}

export interface SustainedResult { status: Status; days: number; confirmed: boolean }

export function applySustained(
  indicator: CrewIndicator,
  candidate: Status,
  history: DailyMeasurement[],
  table: SustainedRule[] = SUSTAINED,
  carry?: RunCarry,
): SustainedResult | null {
  const rule = table.find((r) => r.indicator === indicator);
  if (!rule) return null;
  const days = consecutiveDays(history, rule, carry);
  if (days === 0) return null;
  const confirmed = days >= rule.days;
  // El crítico solo se confirma si se sostiene; si no, queda en precaución.
  const status: Status = candidate === 'critical' && !confirmed ? 'caution' : candidate;
  return { status, days, confirmed };
}
