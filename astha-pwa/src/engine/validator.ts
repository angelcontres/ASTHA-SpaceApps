// RF-ING-05: valida rangos fisiológicamente posibles y marca flags.dubious SIN descartar.
import thresholds from '../data/thresholds.json';
import type { IndicatorId } from './types';

export type ThresholdTable = typeof thresholds.indicators;
type Plausible = Record<string, { plausible: number[] }>;

export interface ValidatedValue {
  id: IndicatorId;
  value: number | null;
  dubious: boolean;
  reason?: string;
}

/** Rechaza tipos inválidos (null) y marca valores fuera de rango posible; nunca los descarta. */
export function validateValue(
  id: IndicatorId,
  raw: unknown,
  table: Plausible = thresholds.indicators as Plausible,
): ValidatedValue {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return { id, value: null, dubious: false, reason: 'sin dato' };
  }
  const [min, max] = table[id]?.plausible ?? [-Infinity, Infinity];
  if (raw < min || raw > max) {
    return { id, value: raw, dubious: true, reason: `fuera del rango posible ${min}–${max}` };
  }
  return { id, value: raw, dubious: false };
}

export function validateRecord<T extends object>(
  record: T,
  ids: readonly IndicatorId[],
): Record<string, ValidatedValue> {
  const out: Record<string, ValidatedValue> = {};
  for (const id of ids) out[id] = validateValue(id, (record as Record<string, unknown>)[id]);
  return out;
}
