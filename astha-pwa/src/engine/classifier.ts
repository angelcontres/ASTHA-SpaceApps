// Threshold Engine (SDD-02, issue #4) · RF-EVA-01: Nominal / Precaución / Crítico por indicador (SRS §6.1).
// Un valor entre dos bandas se asigna a la más grave.
import thresholds from '../data/thresholds.json';
import { SEVERITY, type IndicatorId, type Status } from './types';

export interface Band {
  status: Status;
  min?: number;
  max?: number;
  minExclusive?: boolean;
  maxExclusive?: boolean;
  sustainedDays?: number;
}

export interface IndicatorDef {
  label: string;
  short: string;
  unit: string;
  scope: 'crew' | 'habitat';
  decimals: number;
  plausible: number[];
  bands: Band[];
}

export const INDICATORS = thresholds.indicators as unknown as Record<IndicatorId, IndicatorDef>;

function inBand(v: number, b: Band): boolean {
  if (b.min !== undefined && (b.minExclusive ? v <= b.min : v < b.min)) return false;
  if (b.max !== undefined && (b.maxExclusive ? v >= b.max : v > b.max)) return false;
  return true;
}

export interface Classification { status: Status; band: Band | null }

export function classify(id: IndicatorId, v: number, defs = INDICATORS): Classification {
  const bands = defs[id].bands;
  for (const b of bands) if (inBand(v, b)) return { status: b.status, band: b };

  // Fuera de toda banda: entre dos bandas gana la más grave; más allá de los extremos, la banda extrema.
  let below: Band | null = null;
  let above: Band | null = null;
  for (const b of bands) {
    if (b.max !== undefined && b.max <= v && (!below || (below.max ?? -Infinity) < b.max)) below = b;
    if (b.min !== undefined && b.min >= v && (!above || (above.min ?? Infinity) > b.min)) above = b;
  }
  if (below && above) {
    const s = SEVERITY[below.status] >= SEVERITY[above.status] ? below : above;
    return { status: s.status, band: s };
  }
  const edge = below ?? above;
  return edge ? { status: edge.status, band: edge } : { status: 'nominal', band: null };
}

function fmt(n: number): string {
  return String(n).replace('.', ',');
}

export function bandText(b: Band | null, unit: string): string {
  if (!b) return '';
  if (b.min !== undefined && b.max !== undefined) return `${fmt(b.min)}–${fmt(b.max)} ${unit}`;
  if (b.min !== undefined) return `${b.minExclusive ? '>' : '≥'} ${fmt(b.min)} ${unit}`;
  if (b.max !== undefined) return `${b.maxExclusive ? '<' : '≤'} ${fmt(b.max)} ${unit}`;
  return '';
}

export function nominalRange(id: IndicatorId, defs = INDICATORS): string {
  const d = defs[id];
  return d.bands.filter((b) => b.status === 'nominal').map((b) => bandText(b, d.unit)).join(' · ');
}

/** Límites del rango nominal (para la proyección de deriva D-01). */
export function nominalBounds(id: IndicatorId, defs = INDICATORS): { lo: number; hi: number } {
  const n = defs[id].bands.filter((b) => b.status === 'nominal');
  return {
    lo: Math.min(...n.map((b) => b.min ?? -Infinity)),
    hi: Math.max(...n.map((b) => b.max ?? Infinity)),
  };
}
