// RF-GAM-01..03: XP, rachas y medallas. Se ejecuta DESPUÉS de emitir el triage y nunca afecta a las alertas.
import type { DailyMeasurement, Gamification } from './types';

export const GAM = {
  exerciseMin: 150,
  waterL: 2.5,
  xp: { exercise: 50, report: 20, hydration: 20 },
  xpPerLevel: 500,
};

function dayXp(m: DailyMeasurement): number {
  let xp = 0;
  if ((m.exerciseMin ?? 0) >= GAM.exerciseMin) xp += GAM.xp.exercise;
  if ((m.waterL ?? 0) >= GAM.waterL) xp += GAM.xp.hydration;
  // El XP del informe matutino llega por el PN-Counter (bonusXp) para que se sincronice sin doble conteo.
  return xp;
}

export function scoreGamification(history: DailyMeasurement[], bonusXp = 0): Gamification {
  let xp = bonusXp;
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
  const today = history.at(-1);
  return {
    xp,
    level: Math.floor(xp / GAM.xpPerLevel) + 1,
    streak,
    medals: [
      { id: 'exercise', label: `${GAM.exerciseMin} min de ejercicio`, earnedToday: (today?.exerciseMin ?? 0) >= GAM.exerciseMin },
      { id: 'report', label: 'Informe matutino a tiempo', earnedToday: !!today?.manual },
      { id: 'hydration', label: 'Hidratación óptima', earnedToday: (today?.waterL ?? 0) >= GAM.waterL },
    ],
  };
}
