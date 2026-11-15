// RF-DER-01..04 (SRS §6.3, ADR-011):
//  D-01 regresión lineal en ventana móvil de 7 días con sumas acumuladas O(1) y proyección a 7 días.
//  D-02 Z-score modificado (mediana y MAD) frente a la línea base personal de los días 1-14; |M| ≥ 2,5.
//  D-03 sueño con pendiente negativa y presión diastólica con pendiente positiva en la misma ventana.
import rules from '../data/rules.json';
import { nominalBounds } from './classifier';
import { SeriesMatrix } from './series';
import type { CrewIndicator, DailyMeasurement } from './types';

export const DRIFT = rules.drift as {
  windowDays: number;
  horizonDays: number;
  baselineDays: number;
  zThreshold: number;
  minR2: number;
  indicators: CrewIndicator[];
  d03: { sleepSlopeMax: number; dbpSlopeMin: number };
  countermeasures: Record<'D-01' | 'D-02' | 'D-03', string>;
};

/**
 * Regresión por sumas móviles (Σx, Σy, Σxy, Σx², Σy²) sobre un buffer circular de tamaño fijo: push en O(1) real,
 * sin copiar ni desplazar arrays (RNF-POW-03). x se centra en el primer valor recibido para evitar la cancelación
 * numérica de n·Σx² − (Σx)² con días de misión grandes.
 */
export class RollingRegression {
  private readonly xs: Float64Array;
  private readonly ys: Float64Array;
  private head = 0;
  private n = 0;
  private x0: number | null = null;
  private sx = 0;
  private sy = 0;
  private sxy = 0;
  private sxx = 0;
  private syy = 0;

  constructor(private readonly size: number) {
    this.xs = new Float64Array(size);
    this.ys = new Float64Array(size);
  }

  push(x: number, y: number): void {
    if (this.x0 === null) this.x0 = x;
    const cx = x - this.x0;
    if (this.n === this.size) {
      // Sale el punto más antiguo, que ocupa la posición que se va a sobrescribir.
      const ox = this.xs[this.head];
      const oy = this.ys[this.head];
      this.sx -= ox; this.sy -= oy; this.sxy -= ox * oy; this.sxx -= ox * ox; this.syy -= oy * oy;
    } else {
      this.n++;
    }
    this.xs[this.head] = cx;
    this.ys[this.head] = y;
    this.head = (this.head + 1) % this.size;
    this.sx += cx; this.sy += y; this.sxy += cx * y; this.sxx += cx * cx; this.syy += y * y;
  }

  get count(): number { return this.n; }

  fit(): { slope: number; intercept: number; r2: number } | null {
    const { n, sx, sy, sxy, sxx, syy } = this;
    if (n < 3) return null;
    const dx = n * sxx - sx * sx;
    if (dx <= 0) return null;
    const slope = (n * sxy - sx * sy) / dx;
    const interceptCentered = (sy - slope * sx) / n;
    const dy = n * syy - sy * sy;
    const r2 = dy <= 0 ? 0 : Math.min(1, ((n * sxy - sx * sy) ** 2) / (dx * dy));
    return { slope, intercept: interceptCentered - slope * (this.x0 ?? 0), r2 };
  }
}

export interface Trend { slope: number; intercept: number; r2: number; daysToCaution: number | null }

type Source = SeriesMatrix | readonly DailyMeasurement[];
const asMatrix = (s: Source): SeriesMatrix => (s instanceof SeriesMatrix ? s : SeriesMatrix.from(s));

/** D-01: tendencia y días hasta salir del rango nominal (null si no cruza dentro del horizonte o el ajuste es pobre). */
export function trendFor(id: CrewIndicator, source: Source, cfg = DRIFT): Trend | null {
  const m = asMatrix(source);
  const col = m.column(id);
  const lastDay = m.lastDay;
  const reg = new RollingRegression(cfg.windowDays);
  for (let row = Math.max(0, m.length - cfg.windowDays); row < m.length; row++) {
    if (m.days[row] <= lastDay - cfg.windowDays) continue;
    const v = col[row];
    if (!Number.isNaN(v)) reg.push(m.days[row], v);
  }
  const f = reg.fit();
  if (!f) return null;
  const { lo, hi } = nominalBounds(id);
  const now = f.slope * lastDay + f.intercept;
  let daysToCaution: number | null = null;
  if (f.r2 >= cfg.minR2 && f.slope !== 0 && now >= lo && now <= hi) {
    const bound = f.slope > 0 ? hi : lo;
    const d = (bound - now) / f.slope;
    if (d >= 0 && d <= cfg.horizonDays) daysToCaution = Math.max(1, Math.ceil(d));
  }
  return { ...f, daysToCaution };
}

export function median(xs: ArrayLike<number>): number {
  const s = Float64Array.from(xs).sort();
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface Baseline { median: number; mad: number }

/** Línea base personal: mediana y MAD de los días 1..baselineDays (ADR-011). */
export function baselineFor(id: CrewIndicator, source: Source, cfg = DRIFT): Baseline | null {
  const m = asMatrix(source);
  const col = m.column(id);
  const xs: number[] = [];
  for (let row = 0; row < m.length && m.days[row] <= cfg.baselineDays; row++) {
    if (!Number.isNaN(col[row])) xs.push(col[row]);
  }
  if (xs.length < cfg.baselineDays / 2) return null;
  const med = median(xs);
  const mad = median(xs.map((x) => Math.abs(x - med)));
  return { median: med, mad };
}

/** Z-score modificado de Iglewicz-Hoaglin: M = 0,6745 (x − mediana) / MAD. Guarda explícita MAD > 0 (ADR-011). */
export function modifiedZ(x: number, b: Baseline): number | null {
  if (!(b.mad > 0)) return null;
  return (0.6745 * (x - b.median)) / b.mad;
}

/** D-03: sueño ↓ y diastólica ↑ en la misma ventana. */
export function combinedPattern(sleep: Trend | null, dbp: Trend | null, cfg = DRIFT): boolean {
  return !!sleep && !!dbp && sleep.slope <= cfg.d03.sleepSlopeMax && dbp.slope >= cfg.d03.dbpSlopeMin;
}
