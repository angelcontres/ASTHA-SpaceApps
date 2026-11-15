import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { INDICATORS } from '../src/engine/classifier';
import { evaluate } from '../src/engine/pipeline';
import type { DailyMeasurement, HabitatRecord } from '../src/engine/types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

function buildDriftSeries(): {
  measurements: DailyMeasurement[];
  habitat: HabitatRecord[];
} {
  const measurements: DailyMeasurement[] = [];
  const habitat: HabitatRecord[] = [];

  for (let day = 1; day <= 21; day++) {
    // Realistic baseline (days 1-14) around 62 bpm with non-zero MAD, followed by upward drift inside nominal (64..78 bpm)
    const hr = day <= 14 ? 61 + (day % 3) : 62 + (day - 14) * 2.2;
    measurements.push({
      crewId: 'C001',
      day,
      hr,
      hrv: 52,
      sbp: 118,
      dbp: 76,
      spo2: 98,
      glucose: 92,
      temp: 36.7,
      sleep: 7.4,
      mood: 8,
      urineCa: 185,
    });
    habitat.push({
      day,
      ppco2: 1.4,
      pressure: 101.3,
      o2: 20.9,
      radiation: 1.2,
      cabinTemp: 22.0,
      humidity: 46,
    });
  }

  return { measurements, habitat };
}

describe('[UI-09] COMP-03 IndicatorCard & COMP-03B Dual-Coded Chips', () => {
  const card = read('src/ui/components/IndicatorCard.svelte');
  const tokens = read('src/ui/styles/tokens.css');

  it('supports vital, habitat, compound, and zen variants with Svelte 5 const props', () => {
    expect(card).toContain('const {');
    expect(card).toContain("'vital' | 'habitat' | 'compound' | 'zen'");
    expect(card).toContain('indLabel(indicator)');
    expect(card).toContain('value num st-value');
    expect(tokens).toContain('tabular-nums');
    expect(card).toContain("indicator.id === 'sbp' && indicator.status === 'critical'");
    expect(card).toContain('CRITICAL SANS');
  });

  it('renders drift and baseline deviation chips only as non-intrusive metadata without flipping nominal status', () => {
    expect(card).toContain('Drift: caution in');
    expect(card).toContain('Baseline deviation (Z');
    expect(card).toContain('.gauge');
    expect(card).toContain(':root[data-survival] .gauge');

    const { measurements, habitat } = buildDriftSeries();
    const assessment = evaluate({
      crewId: 'C001',
      day: 21,
      symptoms: [],
      measurements,
      habitat,
    });
    const hrState = assessment.indicators.find((i) => i.id === 'hr');
    expect(hrState).toBeDefined();
    expect(hrState!.status).toBe('nominal');
    expect(hrState!.slope).not.toBeNull();
    expect(hrState!.slope!).toBeGreaterThan(0);
    expect(hrState!.z).not.toBeNull();
    expect(INDICATORS.hr.plausible).toHaveLength(2);
    expect(INDICATORS.hr.bands.length).toBeGreaterThanOrEqual(3);
  });
});

describe('[UI-09] COMP-04 uPlot Canvas 2D TrendChart & Visibility Suspension', () => {
  const chart = read('src/ui/components/TrendChart.svelte');

  it('uses uPlot 2D canvas with NASA-STD-3001 threshold bands and personal baseline', () => {
    expect(chart).toContain("import uPlot from 'uplot'");
    expect(chart).toContain("import 'uplot/dist/uPlot.min.css'");
    expect(chart).toContain('drawClear: [drawBands]');
    expect(chart).toContain('days 1–14 baseline');
    expect(chart).toContain('indLabel({ id: indicator, label: def.label })');
    expect(chart).toContain('indShort({ id: indicator, short: def.short })');
  });

  it('suspends canvas redraws when document.hidden is true and runs zero passive timers', () => {
    expect(chart).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(chart).toContain('document.hidden');
    expect(chart).toContain('pendingData');
    expect(chart).toContain('pendingRebuild');
    expect(chart).toContain('chart?.destroy()');
    expect(chart).not.toContain('setInterval');
  });
});

describe('[UI-09] Biomedical & Environment Views, Zen Mode & Survival Mode (< 5W)', () => {
  const bio = read('src/ui/views/BiomedicalView.svelte');
  const env = read('src/ui/views/EnvironmentView.svelte');

  it('replaces 3D AnatomyViewer and uPlot with static Survival fallbacks under < 5W while preserving active protocols', () => {
    expect(bio).toContain("variant={survival ? 'fallback' : 'full'}");
    expect(bio).toContain('{#if survival}');
    expect(bio).toContain('<table class="tab num">');
    expect(env).toContain('{#if survival}');
    expect(env).toContain('<table class="tab num">');
    expect(bio).toContain('Zen Mode: essential crew vitals');
    expect(bio).toContain('CountermeasureGuide');
    expect(bio).toContain('Biomedical Vitals');
    expect(bio).toContain('ECLSS Habitat Telemetry · 6 Parameters');
    expect(bio).toContain('Adherence &amp; Habits');
    expect(bio).toContain('Crew Roster Summary');
  });

  it('exposes full English ECLSS telemetry and accumulated CANS radiation dose in EnvironmentView', () => {
    expect(env).toContain('ECLSS Life Support &amp; CANS Dosimetry');
    expect(env).toContain('Accumulated Radiation Dose · Habitat Module');
    expect(env).toContain('Habitat telemetry within nominal NASA-STD-3001 bounds.');
    expect(env).toContain('accumulatedDose(hab)');
  });
});

describe('[UI-09] NASA HUD Visual Alignment within Zero-CDN & WCAG AAA Invariants', () => {
  const tokens = read('src/ui/styles/tokens.css');
  const strip = read('src/ui/components/HabitatStrip.svelte');
  const lock = read('src/ui/views/LockScreen.svelte');
  const crewBar = read('src/ui/components/CrewBar.svelte');

  it('provides Blueprint grid, deep navy AAA surfaces, 4-color NASA spectrum stripe, NASA Worm logo, and HUD tags with Survival reset', () => {
    expect(tokens).toContain('--space-950: #040915');
    expect(tokens).toContain('.nasa-spectrum');
    expect(tokens).toContain('.hud-head');
    expect(tokens).toContain('.hud-tag');
    expect(tokens).toContain(':root[data-survival]');
    expect(tokens).toContain('#000000');
    expect(tokens).toContain('--alert-red-text: #fca5a5');
    expect(tokens).toContain('--touch: 48px');
    expect(tokens).not.toMatch(/https?:\/\/(fonts\.googleapis|cdn\.tailwindcss|cdn\.jsdelivr|unpkg\.com)/i);

    expect(strip).toContain('OFFLINE EDGE');
    expect(strip).toContain('ESTD 1958');
    expect(strip).toContain('nasa-worm');
    expect(strip).toContain('nasa-spectrum');
    expect(lock).toContain('nasa-worm');
    expect(lock).toContain('nasa-spectrum');
    expect(read('src/ui/views/BiomedicalView.svelte')).toContain('COMP-02 // HOLO-3D');
    expect(crewBar).toContain('<span class="sym" aria-hidden="true"></span>');
    expect(crewBar).toContain('ROLE_LABEL');
    expect(crewBar).toContain('STATUS_LABEL');
  });
});
