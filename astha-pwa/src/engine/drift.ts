// RF-DER-01..04 (SRS §6.3, ADR-011):
//  D-01 regresión lineal en ventana móvil de 7 días con sumas acumuladas O(1) y proyección a 7 días.
//  D-02 Z-score modificado (mediana y MAD) frente a la línea base personal de los días 1-14; |M| ≥ 2,5.
//  D-03 sueño con pendiente negativa y presión diastólica con pendiente positiva en la misma ventana.
import rules from '../data/rules.json';
import { nominalBounds } from './classifier';
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

/** Regresión por sumas móviles (Σx, Σy, Σxy, Σx², Σy²): add/remove en O(1). */
export class RollingRegression {
  private n = 0;
  private sx = 0;
  private sy = 0;
  private sxy = 0;
  private sxx = 0;
  private syy = 0;
  private readonly buf: [number, number][] = [];

  constructor(private readonly size: number) {}

  push(x: number, y: number): void {
    this.buf.push([x, y]);
    this.n++; this.sx += x; this.sy += y; this.sxy += x * y; this.sxx += x * x; this.syy += y * y;
    if (this.buf.length > this.size) {
      const [ox, oy] = this.buf.shift()!;
      this.n--; this.sx -= ox; this.sy -= oy; this.sxy -= ox * oy; this.sxx -= ox * ox; this.syy -= oy * oy;
    }
  }

  get count(): number { return this.n; }

  fit(): { slope: number; intercept: number; r2: number } | null {
    const { n, sx, sy, sxy, sxx, syy } = this;
    if (n < 3) return null;
    const dx = n * sxx - sx * sx;
    if (dx === 0) return null;
    const slope = (n * sxy - sx * sy) / dx;
    const intercept = (sy - slope * sx) / n;
    const dy = n * syy - sy * sy;
    const r2 = dy === 0 ? 0 : ((n * sxy - sx * sy) ** 2) / (dx * dy);
    return { slope, intercept, r2 };
  }
}

export interface Trend { slope: number; intercept: number; r2: number; daysToCaution: number | null }

/** D-01: tendencia y días hasta salir del rango nominal (null si no cruza dentro del horizonte o el ajuste es pobre). */
export function trendFor(id: CrewIndicator, history: DailyMeasurement[], cfg = DRIFT): Trend | null {
  const reg = new RollingRegression(cfg.windowDays);
  const lastDay = history.at(-1)?.day ?? 0;
  for (let i = Math.max(0, history.length - cfg.windowDays); i < history.length; i++) {
    const m = history[i];
    if (m.day <= lastDay - cfg.windowDays) continue;
    const v = m[id];
    if (typeof v === 'number') reg.push(m.day, v);
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

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface Baseline { median: number; mad: number }

/** Línea base personal: mediana y MAD de los días 1..baselineDays. */
export function baselineFor(id: CrewIndicator, history: DailyMeasurement[], cfg = DRIFT): Baseline | null {
  const xs: number[] = [];
  for (const m of history) {
    if (m.day > cfg.baselineDays) break;
    const v = m[id];
    if (typeof v === 'number') xs.push(v);
  }
  if (xs.length < cfg.baselineDays / 2) return null;
  const med = median(xs);
  const mad = median(xs.map((x) => Math.abs(x - med)));
  return { median: med, mad };
}

/** Z-score modificado de Iglewicz-Hoaglin: M = 0,6745 (x − mediana) / MAD. */
export function modifiedZ(x: number, b: Baseline): number | null {
  if (b.mad === 0) return null;
  return (0.6745 * (x - b.median)) / b.mad;
}

/** D-03: sueño ↓ y diastólica ↑ en la misma ventana. */
export function combinedPattern(sleep: Trend | null, dbp: Trend | null, cfg = DRIFT): boolean {
  return !!sleep && !!dbp && sleep.slope <= cfg.d03.sleepSlopeMax && dbp.slope >= cfg.d03.dbpSlopeMin;
}
