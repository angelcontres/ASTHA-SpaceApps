// GamificationScorer (SDD-04, issue #6) · RF-GAM-01..03: XP, rachas y medallas. Se ejecuta DESPUÉS de emitir el
// triage y nunca afecta a las alertas. Compatible con el PN-Counter (ADR-009): el XP del informe matutino llega por
// el contador (bonusXp) y el resto se DERIVA de datos replicados (mediciones y checks del G-Set), así que todos los
// nodos calculan el mismo total sin contar dos veces.
import type { DailyMeasurement, Gamification, GamificationCarry, ProtocolCompletion } from './types';

export const GAM = {
  exerciseMin: 150,
  waterL: 2.5,
  xp: { exercise: 50, report: 20, hydration: 20, protocol: 30 },
  xpPerLevel: 500,
};

export function dayXp(m: DailyMeasurement): number {
  let xp = 0;
  if ((m.exerciseMin ?? 0) >= GAM.exerciseMin) xp += GAM.xp.exercise;
  if ((m.waterL ?? 0) >= GAM.waterL) xp += GAM.xp.hydration;
  // El XP del informe matutino llega por el PN-Counter (bonusXp) para que se sincronice sin doble conteo.
  return xp;
}

/** Evento de checklist tal como queda en el G-Set (orden HLC). */
export interface CheckEvent { alertId: string; protocolId: string; stepId: string; checked: boolean; day: number }

/**
 * Ejecuciones de protocolo completas (PROTOCOL_EXECUTION, RF-GAM-01): todos los pasos del protocolo marcados según
 * el último evento por paso. Una alerta cuenta una vez por día aunque se completen el protocolo y su alternativa.
 * Determinista sobre el G-Set → converge en todos los nodos.
 */
export function completedProtocols(
  events: readonly CheckEvent[],
  stepsOf: (protocolId: string) => readonly string[] | null,
): ProtocolCompletion[] {
  const state = new Map<string, { alertId: string; protocolId: string; day: number; steps: Map<string, boolean> }>();
  for (const e of events) {
    const k = `${e.alertId}|${e.day}|${e.protocolId}`;
    let s = state.get(k);
    if (!s) state.set(k, (s = { alertId: e.alertId, protocolId: e.protocolId, day: e.day, steps: new Map() }));
    s.steps.set(e.stepId, e.checked);
  }
  const done = new Map<string, ProtocolCompletion>();
  for (const k of [...state.keys()].sort()) {
    const s = state.get(k)!;
    const steps = stepsOf(s.protocolId);
    if (!steps?.length || !steps.every((id) => s.steps.get(id) === true)) continue;
    const once = `${s.alertId}|${s.day}`;
    if (!done.has(once)) done.set(once, { alertId: s.alertId, protocolId: s.protocolId, day: s.day });
  }
  return [...done.values()];
}

export function scoreGamification(
  history: DailyMeasurement[],
  bonusXp = 0,
  carry?: GamificationCarry,
  completions: readonly ProtocolCompletion[] = [],
): Gamification {
  let xp = bonusXp + (carry?.xp ?? 0) + completions.length * GAM.xp.protocol;
  for (const m of history) xp += dayXp(m);

  // Racha: días consecutivos (hasta hoy) con ≥ 150 min de ejercicio.
  let streak = 0;
  let expected = history.at(-1)?.day ?? 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.day !== expected || (m.exerciseMin ?? 0) < GAM.exerciseMin) break;
    streak++;
    expected--;
  }
  // La racha llega al hueco de la ventana de entrada: continúa con la racha arrastrada.
  if (carry && streak > 0 && carry.streak > 0 && expected === carry.streakEndDay) streak += carry.streak;
  const today = history.at(-1);
  return {
    xp,
    level: Math.floor(xp / GAM.xpPerLevel) + 1,
    streak,
    medals: [
      { id: 'exercise', label: `${GAM.exerciseMin} min exercise`, earnedToday: (today?.exerciseMin ?? 0) >= GAM.exerciseMin },
      { id: 'report', label: 'On-time morning report', earnedToday: !!today?.manual },
      { id: 'hydration', label: 'Optimal hydration', earnedToday: (today?.waterL ?? 0) >= GAM.waterL },
      { id: 'protocol', label: 'Countermeasure completed', earnedToday: !!today && completions.some((c) => c.day === today.day) },
    ],
  };
}
