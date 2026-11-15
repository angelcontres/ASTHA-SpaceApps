import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/engine/pipeline';
import { HABITAT_INDICATORS } from '../src/engine/types';
import { fd, fmt, missionPhase, ROLE_LABEL, SCENARIO_LABEL, STATUS_LABEL } from '../src/ui/bridge/uiState.svelte';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const c = parseInt(clean.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

function extractTokenHex(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Missing token ${name}`);
  return match[1];
}

describe('[UI-07] Design System WCAG 2.1 AAA & Ergonomics', () => {
  const tokensCss = read('src/ui/styles/tokens.css');

  it('meets WCAG 2.1 AAA (>= 7.0:1) contrast for all readable and critical tokens across dark surfaces', () => {
    const surfaces = [
      extractTokenHex(tokensCss, '--space-950'),
      extractTokenHex(tokensCss, '--space-900'),
      extractTokenHex(tokensCss, '--space-800'),
    ];
    const aaaTextTokens = [
      '--text',
      '--text-muted',
      '--alert-green',
      '--alert-yellow',
      '--alert-red-text',
      '--accent',
      '--blueprint-text',
      '--unit',
      '--none',
    ];

    for (const bg of surfaces) {
      for (const tok of aaaTextTokens) {
        const fg = extractTokenHex(tokensCss, tok);
        expect(
          contrastRatio(fg, bg),
          `${tok} (${fg}) on ${bg} must achieve WCAG AAA >= 7.0:1`,
        ).toBeGreaterThanOrEqual(7.0);
      }
    }

    // ADR-018: pure --alert-red (#ef4444) fails AAA on #0c1222 and must NEVER be used as text color.
    const alertRed = extractTokenHex(tokensCss, '--alert-red');
    const space800 = extractTokenHex(tokensCss, '--space-800');
    expect(contrastRatio(alertRed, space800)).toBeLessThan(7.0);

    const uiFiles = [
      'src/ui/styles/tokens.css',
      'src/ui/views/LockScreen.svelte',
      'src/ui/components/HabitatStrip.svelte',
      'src/ui/components/CrewBar.svelte',
      'src/App.svelte',
    ];
    for (const rel of uiFiles) {
      expect(read(rel)).not.toMatch(/(?:^|[;{\s])color\s*:\s*var\(--alert-red\)\s*[;}]/);
    }
  });

  it('enforces >= 48x48 px touch geometry, >= 12 px gaps, dual coding, 630nm filter, and survival mode', () => {
    expect(tokensCss).toContain('--touch: 48px;');
    expect(tokensCss).toContain('--gap: 12px;');
    expect(tokensCss).toContain('min-width: var(--touch);');
    expect(tokensCss).toContain('min-height: var(--touch);');
    expect(tokensCss).toContain('.st.nominal .sym::before');
    expect(tokensCss).toContain('.st.caution .sym::before');
    expect(tokensCss).toContain('.st.critical .sym::before');
    expect(tokensCss).toContain('repeating-linear-gradient(135deg');
    expect(tokensCss).toContain('repeating-linear-gradient(0deg');
    expect(tokensCss).toContain('repeating-linear-gradient(90deg');
    expect(tokensCss).toContain(':root[data-red] body');
    expect(tokensCss).toContain(':root[data-survival]');
    expect(tokensCss).toContain('transition: none !important; animation: none !important;');

    const html = read('index.html');
    expect(html).toContain('id="night-red-630"');
    expect(html).toContain('<html lang="en">');
    expect(html).not.toMatch(/fonts\.googleapis\.com/i);

    const manifest = JSON.parse(read('public/manifest.webmanifest'));
    expect(manifest.lang).toBe('en');
  });
});

describe('[UI-07] View C Lock Screen (ADR-014 & ADR-015)', () => {
  const lockSvelte = read('src/ui/views/LockScreen.svelte');

  it('exposes zero individual clinical values or assessments before authentication', () => {
    expect(lockSvelte).toContain('bridge.crewStatus');
    expect(lockSvelte).toContain('bridge.habitatTelemetry.indicators');
    expect(lockSvelte).not.toContain('currentAssessment');
    expect(lockSvelte).not.toContain('activeAlerts');
    expect(lockSvelte).not.toContain('series.measurements');
  });

  it('engine statusOnly mode strips all crew biometric indicators and alerts', () => {
    const assessment = evaluate({
      crewId: 'C001',
      day: 1,
      statusOnly: true,
      symptoms: ['blurred_vision', 'headache'],
      measurements: [
        {
          crewId: 'C001',
          day: 1,
          hr: 112,
          hrv: 18,
          sbp: 145,
          dbp: 92,
          spo2: 91,
          glucose: 135,
          temp: 38.2,
          sleep: 4.5,
          mood: 3,
          urineCa: 320,
        },
      ],
      habitat: [{ day: 1, ppco2: 1.5, pressure: 101.3, o2: 20.9, radiation: 25, cabinTemp: 22.0, humidity: 48 }],
    });

    expect(assessment.statusOnly).toBe(true);
    expect(assessment.alerts).toEqual([]);
    expect(assessment.gamification).toBeNull();
    expect(assessment.indicators.map((i) => i.id)).toEqual([...HABITAT_INDICATORS]);
  });

  it('provides PIN keypad, keyboard input, NFC badge quick unlock, 630nm toggle, and 1500ms budget telemetry', () => {
    expect(lockSvelte).toContain('tapNfcBadge');
    expect(lockSvelte).toContain('selectPerson');
    expect(lockSvelte).toContain('bridge.unlockBadge');
    expect(lockSvelte).toContain('onKeyDown');
    expect(lockSvelte).toContain('HTMLButtonElement');
    expect(lockSvelte).toContain('ui.lockRedMode');
    expect(lockSvelte).toContain('1500 ms');
  });
});

describe('[UI-07] COMP-00 HabitatStrip, COMP-01 CrewBar & English Shell', () => {
  it('formats English telemetry helpers and mission phases cleanly', () => {
    expect(fmt(21.25, 1)).toBe('21.3');
    expect(fmt(null, 1)).toBe('—');
    expect(fd(15)).toBe('FD-015');
    expect(STATUS_LABEL).toEqual({
      nominal: 'Nominal',
      caution: 'Caution',
      critical: 'Critical',
      none: 'No data',
    });
    expect(ROLE_LABEL.commander).toBe('Commander');
    expect(SCENARIO_LABEL.C).toBe('Solar Storm (SPE)');
    expect(missionPhase(14)).toContain('Baseline Window');
    expect(missionPhase(120)).toBe('Deep-Space Transit');
    expect(missionPhase(180)).toContain('R+1');
  });

  it('implements COMP-00, COMP-01 L-44..R+1 timeline, and English progressive tabs', () => {
    const strip = read('src/ui/components/HabitatStrip.svelte');
    expect(strip).toContain('<HudIcon name="alert"');
    expect(strip).toContain('EMERGENCY');
    expect(strip).toContain('Survival');
    expect(strip).toContain('Red 630');

    const crewBar = read('src/ui/components/CrewBar.svelte');
    expect(crewBar).toContain('L-44');
    expect(crewBar).toContain('L-15');
    expect(crewBar).toContain('R+1');
    expect(crewBar).toContain('type="range"');
    expect(crewBar).toContain('aria-valuetext=');

    const app = read('src/App.svelte');
    expect(app).toContain('1 · Biomedical');
    expect(app).toContain('2 · ECLSS Environment');
    expect(app).toContain('3 · Anatomical Triage');
    expect(app).toContain('4 · Simulator');
    expect(app).toContain('Reset Nominal');
  });
});
