// Ventana de entrada del contrato postMessage Data Worker → Clinical Engine (ADR-005, objetivo de serialización
// < 1 ms del issue #4). El motor solo necesita:
//   · la línea base de los días 1..baselineDays (D-02),
//   · los últimos días para tendencia (D-01/D-03), condiciones sostenidas (RF-EVA-05) y racha,
//   · el registro de hábitat del día evaluado (umbrales y correlaciones).
// Lo demás se resume en `carry` (XP y rachas que terminan en el último día recortado), de modo que
// evaluate(compactInput(x)) produce exactamente lo mismo que evaluate(x). Función pura.
import { dayXp, GAM } from './gamification';
import { DRIFT } from './drift';
import { SUSTAINED, type SustainedRule } from './sustained';
import type { CrewIndicator, DailyMeasurement, EvaluationInput, InputCarry } from './types';

/** Días recientes que se envían (≥ ventana de tendencia de 7 días). */
export const INPUT_WINDOW_DAYS = 30;

function hits(m: DailyMeasurement, r: SustainedRule): boolean {
  const v = m[r.indicator];
  return typeof v === 'number' && (r.op === '<' ? v < r.value : v > r.value);
}

/** Racha de días consecutivos que cumplen `pred`, terminando exactamente en `endDay`. */
function runEndingAt(history: DailyMeasurement[], endDay: number, pred: (m: DailyMeasurement) => boolean): number {
  let i = history.findIndex((m) => m.day === endDay);
  if (i < 0) return 0;
  let n = 0;
  let expected = endDay;
  for (; i >= 0; i--) {
    const m = history[i];
    if (m.day !== expected || !pred(m)) break;
    n++;
    expected--;
  }
  return n;
}

export function compactInput(input: EvaluationInput, windowDays = INPUT_WINDOW_DAYS): EvaluationInput {
  const habitat = input.habitat.filter((h) => h.day === input.day);
  const history = input.measurements.filter((m) => m.day <= input.day);
  const from = input.day - windowDays; // se envían los días > from
  const keep = (m: DailyMeasurement) => m.day <= DRIFT.baselineDays || m.day > from;
  const dropped = history.filter((m) => !keep(m));
  if (!dropped.length) return { ...input, measurements: history, habitat };

  const lastDropped = dropped.at(-1)!.day;
  const carry: InputCarry = {
    gamification: {
      xp: dropped.reduce((s, m) => s + dayXp(m), 0),
      streak: runEndingAt(history, lastDropped, (m) => (m.exerciseMin ?? 0) >= GAM.exerciseMin),
      streakEndDay: lastDropped,
    },
    sustained: {},
  };
  for (const r of SUSTAINED) {
    const days = runEndingAt(history, lastDropped, (m) => hits(m, r));
    if (days) carry.sustained[r.indicator as CrewIndicator] = { days, endDay: lastDropped };
  }
  return { ...input, measurements: history.filter(keep), habitat, carry };
}
