import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/engine/countermeasures';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('UI-10 · COMP-05 Countermeasures Guide (ADR-017, AC-CLIN-06)', () => {
  it('enforces <= 4 actionable steps per protocol in catalog and UI slice', () => {
    for (const protocol of Object.values(CATALOG.protocols)) {
      expect(protocol.steps.length).toBeLessThanOrEqual(4);
      expect(protocol.steps.length).toBeGreaterThanOrEqual(1);
    }
    const comp = read('src/ui/components/CountermeasureGuide.svelte');
    expect(comp).toContain('protocol.steps.slice(0, 4)');
    expect(comp).toContain('1 · Situation');
    expect(comp).toContain('2 · Severity &amp; Impact');
    expect(comp).toContain('3 · Action Steps');
    expect(comp).toContain('Report to Flight Surgeon');
    expect(comp).toContain("variant?: 'inline' | 'emergency' | 'daily'");
    expect(comp).toContain('min-height: var(--touch)');
    expect(comp).toContain('gap: 12px');
  });
});

describe('UI-10 · AlarmManager Web Audio, Escalation & Lock-Screen Redaction (ADR-013, ADR-014)', () => {
  it('synthesizes non-startling Web Audio tones locally with zero external media files', () => {
    const alarm = read('src/ui/components/AlarmManager.svelte');
    expect(alarm).toContain('new AudioContext()');
    expect(alarm).toContain('audioCtx.createOscillator()');
    expect(alarm).not.toMatch(/<audio|src=.*\.(mp3|wav|ogg)/i);
    expect(alarm).toContain('ESCALATE_CMO_MS = 2 * 60_000');
    expect(alarm).toContain('ESCALATE_CABIN_MS = 5 * 60_000');
    expect(alarm).toContain('role="alert"');
    expect(alarm).toContain('aria-live="assertive"');
    expect(alarm).toContain('isRedacted');
  });

  it('mounts AlarmManager and CodeRedView outside unlock branch for 5-min cabin broadcast', () => {
    const app = read('src/App.svelte');
    const lockPos = app.indexOf('{#if !unlocked}');
    const alarmPos = app.indexOf('<AlarmManager locked={!unlocked} />');
    const codeRedPos = app.indexOf('{#if codeRed}<CodeRedView alert={codeRed}');
    const noticesPos = app.indexOf('<div class="notices"');
    expect(lockPos).toBeGreaterThan(-1);
    expect(alarmPos).toBeLessThan(lockPos);
    expect(codeRedPos).toBeGreaterThan(app.indexOf('</main>'));
    expect(codeRedPos).toBeLessThan(noticesPos);
  });
});

describe('UI-10 · View B Code Red SPE & Complementary Modals', () => {
  it('implements View B Code Red with 3px pulsing alert-red border, #fca5a5 contrast & <=4 evacuation checklist', () => {
    const tokens = read('src/ui/styles/tokens.css');
    expect(tokens).toContain('--alert-red: #ef4444');
    expect(tokens).toContain('--alert-red-text: #fca5a5');

    const cr = read('src/ui/views/CodeRedView.svelte');
    expect(cr).toContain('role="alertdialog"');
    expect(cr).toContain('class:pulse={!alert.acknowledged}');
    expect(cr).toContain('border: 3px solid var(--alert-red)');
    expect(cr).toContain('var(--alert-red-text)');
    expect(cr).toContain('variant="emergency"');
    expect(cr).toContain('Crew Shelter Status');
    expect(cr).toContain('ui.alertStage');
  });

  it('implements Master Caution right-edge drawer, Bio-Passport Ed25519 modal, and offline NASA OSDR explorer', () => {
    const drawer = read('src/ui/components/EmergencyDrawer.svelte');
    expect(drawer).toContain('Master Caution');
    expect(drawer).toContain('role="dialog"');
    expect(drawer).toContain('drawerPeekRight');
    expect(drawer).toContain('SEV_RANK');

    const crewBar = read('src/ui/components/CrewBar.svelte');
    expect(crewBar).toContain('ui.bioPassportOpen = true');

    const passport = read('src/ui/components/BioPassportModal.svelte');
    expect(passport).toContain('Bio-Passport &amp; Ed25519 DSN Export');
    expect(passport).toContain('L-44');
    expect(passport).toContain('FD-180 / R+1');
    expect(passport).toContain('bridge.exportData');
    expect(passport).toContain('bridge.downloadExport');

    const osdr = read('src/ui/components/OsdrStudies.svelte');
    expect(osdr).toContain('NASA OSDR Offline Reference Explorer');
    expect(osdr).toContain('role="dialog"');
    expect(osdr).toContain('Filter NASA OSDR studies');
    expect(osdr).not.toMatch(/https?:\/\//);

    const sim = read('src/ui/views/SimulatorView.svelte');
    expect(sim).toContain('SCENARIO_IDS');
    expect(sim).toContain('bridge.exportData');
  });
});
