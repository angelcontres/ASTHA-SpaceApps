// Dosis de radiación acumulada (AC-CLIN-05, CU-08 paso 7, data/scopes.md §radiation_accumulated_dose_msv).
// Integra la tasa de dosis equivalente (µSv/h) en el tiempo: cada registro de hábitat es un día de misión, así que
// la tasa diaria se mantiene 24 h (integración rectangular). Límites de data/scopes.md: 250 mSv por evento SPE y
// 600 mSv de dosis efectiva en toda la carrera.
// Limitación declarada: es dosis del MÓDULO, no la dosis individual de cada astronauta (blindaje, posición y tipo de
// dosímetro cambian la dosis real). Función pura: sin temporizadores ni E/S (ADR-005).

export const SPE_EVENT_LIMIT_MSV = 250;
export const CAREER_LIMIT_MSV = 600;
/** Tasa a partir de la cual se considera evento de partículas solares (SRS §6.1, crítico > 100 µSv/h). */
export const SPE_RATE_USV_H = 100;

export interface DoseRecord { day: number; radiation?: number | null }

export interface DoseSummary {
  /** Dosis acumulada desde el primer registro (mSv). */
  missionMsv: number;
  /** Dosis del último día registrado (mSv). */
  lastDayMsv: number;
  /** Dosis del evento SPE en curso: días consecutivos finales con tasa > 100 µSv/h (mSv). 0 si no hay evento. */
  speEventMsv: number;
  /** Días consecutivos del evento SPE en curso. */
  speDays: number;
  /** Fracción consumida de cada límite (0..∞). */
  speFraction: number;
  careerFraction: number;
}

const HOURS_PER_RECORD = 24;

/** µSv/h mantenidos durante `hours` horas, en mSv. */
export function integrateMsv(rateUsvH: number, hours = HOURS_PER_RECORD): number {
  return (rateUsvH * hours) / 1000;
}

export function accumulatedDose(records: readonly DoseRecord[]): DoseSummary {
  const sorted = [...records].filter((r) => typeof r.radiation === 'number' && Number.isFinite(r.radiation) && r.radiation >= 0)
    .sort((a, b) => a.day - b.day);
  let missionMsv = 0;
  for (const r of sorted) missionMsv += integrateMsv(r.radiation as number);

  let speEventMsv = 0;
  let speDays = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i];
    if ((r.radiation as number) <= SPE_RATE_USV_H) break;
    if (i < sorted.length - 1 && sorted[i + 1].day - r.day !== 1) break; // días consecutivos
    speEventMsv += integrateMsv(r.radiation as number);
    speDays++;
  }
  const last = sorted.at(-1);
  return {
    missionMsv,
    lastDayMsv: last ? integrateMsv(last.radiation as number) : 0,
    speEventMsv,
    speDays,
    speFraction: speEventMsv / SPE_EVENT_LIMIT_MSV,
    careerFraction: missionMsv / CAREER_LIMIT_MSV,
  };
}
