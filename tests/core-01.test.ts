import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { evaluateBaselineSample } from '../src/workers/clinical-engine/engine-core';
import type { DailyMeasurement, HabitatTelemetry } from '../src/shared/contracts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const NOMINAL_MEASUREMENT: DailyMeasurement = {
  recordId: '00000000-0000-4000-8000-000000000001',
  crewId: 'C001',
  missionDay: 15,
  recordedAtUtc: '2026-11-15T12:00:00Z',
  heartRateBpm: 68,
  systolicBpMmHg: 118,
  diastolicBpMmHg: 76,
  spo2Pct: 98.2,
  hrvRmssdMs: 46,
  sleepHours: 7.4,
  urinaryCalciumMgDay: 195,
  isSuspect: false,
};

const NOMINAL_HABITAT: HabitatTelemetry = {
  moduleId: 'HAB-CORE-01',
  recordedAtUtc: '2026-11-15T12:00:00Z',
  ppCo2MmHg: 1.85,
  cabinPressureKpa: 101.3,
  o2ConcentrationPct: 21.1,
  temperatureC: 22.1,
  relativeHumidityPct: 45.0,
  radiationRateUSvH: 28.4,
};

describe('Core-01 PWA Architecture & Clinical Engine Boundaries', () => {
  it('evaluates nominal telemetry deterministically within < 50 ms budget (RNF-PER-01)', () => {
    const result = evaluateBaselineSample(NOMINAL_MEASUREMENT, NOMINAL_HABITAT, []);
    expect(result.overallStatus).toBe('NOMINAL');
    expect(result.triggeredRules).toEqual([]);
    expect(result.latencyMs).toBeLessThan(50);
  });

  it('triggers critical SPE and SANS rules while enforcing <= 4 steps (ADR-017)', () => {
    const spe = evaluateBaselineSample(
      NOMINAL_MEASUREMENT,
      { ...NOMINAL_HABITAT, radiationRateUSvH: 184.2 },
      [],
    );
    expect(spe.overallStatus).toBe('CRITICAL');
    expect(spe.organStates.radiation).toBe('CRITICAL');
    expect(spe.triggeredRules).toContain('R-RAD-01');
    expect(spe.recommendedStepsCount).toBeLessThanOrEqual(4);

    const sans = evaluateBaselineSample(
      { ...NOMINAL_MEASUREMENT, systolicBpMmHg: 144 },
      NOMINAL_HABITAT,
      ['BLURRED_VISION'],
    );
    expect(sans.overallStatus).toBe('CRITICAL');
    expect(sans.organStates['neuro-ocular']).toBe('CRITICAL');
    expect(sans.triggeredRules).toContain('R-SANS-01');
  });

  it('enforces ADR-005 pure isolation inside clinical-engine worker modules', () => {
    const engineDir = path.join(ROOT, 'src', 'workers', 'clinical-engine');
    const files = fs.readdirSync(engineDir).filter((f) => f.endsWith('.ts'));
    const forbidden = /\b(fetch|WebSocket|XMLHttpRequest|EventSource|window|document|localStorage|sessionStorage|indexedDB|setInterval|setTimeout)\b/;

    for (const file of files) {
      const source = fs.readFileSync(path.join(engineDir, file), 'utf8');
      expect(forbidden.test(source), `Forbidden API in ${file}`).toBe(false);
    }
  });

  it('ships Zero-CDN system typography and WCAG AAA #fca5a5 / 48px / 12px design tokens', () => {
    const tokens = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8');
    expect(tokens).toContain('--alert-red-text: #fca5a5;');
    expect(tokens).toContain('--touch-min: 48px;');
    expect(tokens).toContain('--touch-gap: 12px;');
    expect(tokens).toContain('system-ui');
    expect(tokens).toContain('ui-monospace');
    expect(tokens).not.toMatch(/fonts\.googleapis\.com/i);
  });

  it('enforces Zero-WAN cache-only policy in Service Worker template', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
    expect(sw).toContain('requestUrl.origin !== self.location.origin');
    expect(sw).toContain('caches.match');
    expect(sw).not.toMatch(/\bfetch\s*\(/);
  });

  it('uses locally bundled svelte, uplot, and three without Chart.js or Recharts (ADR-003)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.dependencies).toHaveProperty('svelte');
    expect(pkg.dependencies).toHaveProperty('uplot');
    expect(pkg.dependencies).toHaveProperty('three');
    expect(pkg.dependencies).not.toHaveProperty('chart.js');
    expect(pkg.dependencies).not.toHaveProperty('recharts');
  });
});
