<script lang="ts">
  // App Shell (C4 §3.2): View C Lock Screen until PIN/NFC unlock; then COMP-00 header, COMP-01 crew & timeline bar,
  // AlarmManager, 4 progressive tabs (WIREFRAME §6.1), COMP-06 crisis simulator bar, and View B Code Red overlay.
  import { onMount } from 'svelte';
  import { SCENARIO_IDS, SYNTHETIC, type ScenarioDef } from './storage/telemetrySources';
  import AlarmManager from './ui/components/AlarmManager.svelte';
  import CrewBar from './ui/components/CrewBar.svelte';
  import EmergencyDrawer from './ui/components/EmergencyDrawer.svelte';
  import HabitatStrip from './ui/components/HabitatStrip.svelte';
  import HudIcon from './ui/components/HudIcon.svelte';
  import { power } from './ui/bridge/power.svelte';
  import { scenarioLabel, ui, type Tab } from './ui/bridge/uiState.svelte';
  import { bridge } from './ui/bridge/workerBridge.svelte';
  import BiomedicalView from './ui/views/BiomedicalView.svelte';
  import CodeRedView from './ui/views/CodeRedView.svelte';
  import EnvironmentView from './ui/views/EnvironmentView.svelte';
  import LockScreen from './ui/views/LockScreen.svelte';
  import SimulatorView from './ui/views/SimulatorView.svelte';
  import TriageView from './ui/views/TriageView.svelte';

  onMount(() => {
    bridge.start();
    const stopPower = power.start();
    return () => { stopPower(); bridge.stop(); };
  });

  const prefs = $derived(bridge.data.prefs);
  const unlocked = $derived(!!bridge.data.session);
  // Effective survival mode: manual (Commander) or automatic on critical battery (AC-TECH-02 §3, ADR-019).
  const survival = $derived(prefs.survival || power.low);
  const effectiveRed = $derived(unlocked ? prefs.redMode : (prefs.redMode || ui.lockRedMode));

  // Apply visual modes as <html> attributes so CSS tokens and canvas renderers stay synchronized.
  $effect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-red', effectiveRed);
    root.toggleAttribute('data-contrast', prefs.highContrast);
    root.toggleAttribute('data-large', prefs.largeText);
    root.toggleAttribute('data-survival', survival);
    root.toggleAttribute('data-lowpower', power.low);
  });

  // Reset navigation state when locking session.
  $effect(() => {
    if (!unlocked) {
      ui.tab = 'bio';
      ui.openAlertId = null;
      ui.codeRedId = null;
      ui.selectedRegion = null;
    }
  });

  const codeRed = $derived(
    ui.codeRedId
      ? bridge.activeAlerts.find((a) => a.id === ui.codeRedId && !a.overridden) ?? null
      : null,
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: 'bio', label: '1 · Biomedical' },
    { id: 'env', label: '2 · ECLSS Environment' },
    { id: 'triage', label: '3 · Anatomical Triage' },
    { id: 'sim', label: '4 · Simulator' },
  ];

  function onTabKeyDown(ev: KeyboardEvent, idx: number) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const next = (idx + (ev.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    ui.tab = TABS[next].id;
  }

  /** Emergency button: slides in right-edge emergency & records drawer in 1 tap (RNF-USA-02). */
  function emergency() {
    ui.emergencyOpen = !ui.emergencyOpen;
  }

  const scen = (id: (typeof SCENARIO_IDS)[number]) => SYNTHETIC.scenarios[id] as ScenarioDef;
</script>

<svelte:head>
  <title>{unlocked ? `ASTHA · ${bridge.unlockedCrewId}` : 'ASTHA · Security Lock'}</title>
</svelte:head>

{#if !unlocked}
  <LockScreen />
{:else}
  <HabitatStrip
    onemergency={emergency}
    onsettings={() => (ui.settingsOpen = !ui.settingsOpen)}
    zen={prefs.zen}
    {survival}
    red={prefs.redMode}
  />
  <AlarmManager />
  {#if !prefs.zen}<CrewBar />{/if}

  {#if power.low}
    <p class="lowpower st caution" role="status">
      <span class="sym" aria-hidden="true"></span>
      Critical battery{power.level !== null && !power.simulated ? ` (${Math.round(power.level * 100)}%)` : ' (simulated signal)'}: automatic survival mode active.
      Display dimmed, telemetry throttled to 5 s; clinical triage and alarms remain instant.
    </p>
  {/if}

  {#if ui.settingsOpen}
    <section class="settings panel" aria-labelledby="set-h">
      <h2 id="set-h" class="label">Display &amp; Power Mode Settings</h2>
      <div class="row">
        <button
          type="button"
          class="btn"
          aria-pressed={!prefs.redMode && !prefs.survival}
          onclick={() => {
            bridge.setPref('redMode', false);
            if (prefs.survival && bridge.activeRole === 'commander') bridge.setPref('survival', false);
          }}
        >
          Standard OLED
        </button>
        <button type="button" class="btn" aria-pressed={prefs.redMode} onclick={() => bridge.setPref('redMode', !prefs.redMode)}>
          630 nm Red Spectral
        </button>
        <button
          type="button"
          class="btn"
          aria-pressed={prefs.survival}
          disabled={bridge.activeRole !== 'commander'}
          onclick={() => bridge.setPref('survival', !prefs.survival)}
        >
          Survival Mode (&lt; 5 W)
        </button>
        <button type="button" class="btn" aria-pressed={prefs.highContrast} onclick={() => bridge.setPref('highContrast', !prefs.highContrast)}>
          High Contrast
        </button>
        <button type="button" class="btn" aria-pressed={prefs.largeText} onclick={() => bridge.setPref('largeText', !prefs.largeText)}>
          Large Text
        </button>
        <button type="button" class="btn" aria-pressed={prefs.zen} onclick={() => bridge.setPref('zen', !prefs.zen)}>
          Zen Mode
        </button>
        <button type="button" class="btn" onclick={() => (ui.settingsOpen = false)}>Close</button>
      </div>
      {#if bridge.activeRole !== 'commander'}
        <p class="muted small">Manual Survival Mode can only be toggled by the Commander; triggers automatically on critical battery.</p>
      {/if}
    </section>
  {/if}

  {#if !prefs.zen}
    <nav class="tabs" aria-label="Primary operational views">
      {#each TABS as t, idx (t.id)}
        <button
          type="button"
          class="btn tab"
          aria-current={ui.tab === t.id ? 'page' : undefined}
          aria-pressed={ui.tab === t.id}
          onclick={() => (ui.tab = t.id)}
          onkeydown={(ev) => onTabKeyDown(ev, idx)}
        >
          {t.label}
        </button>
      {/each}
    </nav>
  {/if}

  <main class="content">
    {#if prefs.zen || ui.tab === 'bio'}
      <BiomedicalView zen={prefs.zen} {survival} />
    {:else if ui.tab === 'env'}
      <EnvironmentView {survival} />
    {:else if ui.tab === 'triage'}
      <TriageView {survival} />
    {:else}
      <SimulatorView />
    {/if}
  </main>

  {#if !prefs.zen}
    <!-- COMP-06: quick crisis fault-injection bar -->
    <footer class="simbar" aria-label="Quick crisis simulator">
      {#each SCENARIO_IDS.slice(0, 4) as id (id)}
        <button type="button" class="btn" onclick={() => bridge.injectScenario(id)}>
          <HudIcon name="alert" size={14} /> {id} · {scenarioLabel(id, scen(id).label)}
        </button>
      {/each}
      <button type="button" class="btn primary" onclick={() => bridge.reset()}><HudIcon name="check" size={15} /> Reset Nominal</button>
      <span class="label provenance">Synthetic demo telemetry · not measured NASA flight data</span>
    </footer>
  {/if}

  {#if ui.emergencyOpen}<EmergencyDrawer />{/if}
  {#if codeRed}<CodeRedView alert={codeRed} />{/if}
{/if}

<div class="notices" aria-live="polite">
  {#each bridge.notices.filter((n) => n.code !== 'wrong-pin') as n (n.id)}
    <div class="notice {n.level}" role={n.level === 'error' ? 'alert' : 'status'}>
      <span>{n.message}</span>
      <button type="button" class="btn icon" aria-label="Dismiss notice" onclick={() => bridge.dismissNotice(n.id)}>
        <HudIcon name="x" size={16} />
      </button>
    </div>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
    margin: 12px 16px 0;
    background: var(--space-900);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    width: fit-content;
    max-width: calc(100% - 32px);
  }
  .tab { border-color: transparent; background: transparent; font-family: var(--font-num); letter-spacing: 0.03em; }
  .tab[aria-current='page'] {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, var(--space-800));
    color: var(--accent);
    box-shadow: 0 0 14px rgb(56 189 248 / 0.2);
  }
  :root[data-survival] .tab[aria-current='page'] { box-shadow: none; }
  .content { padding: 16px; max-width: 1600px; margin: 0 auto; }
  .settings { margin: 12px 16px 0; }
  .lowpower { margin: 12px 16px 0; padding: 10px 14px; border: var(--st-bw) solid var(--st); border-radius: var(--radius); }
  .lowpower .sym { color: var(--st-text); }
  .simbar {
    position: sticky;
    bottom: 0;
    z-index: 20;
    display: flex;
    flex-wrap: wrap;
    gap: var(--gap);
    padding: 8px 16px;
    background: var(--space-900);
    border-top: 1px solid var(--border);
  }
  .provenance { align-self: center; margin-left: auto; }
  .notices { position: fixed; right: 16px; bottom: 88px; z-index: 120; display: flex; flex-direction: column; gap: 8px; max-width: min(420px, calc(100vw - 32px)); }
  .notice { display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 14px; background: var(--space-800); border: 1px solid var(--border-strong); border-radius: var(--radius); }
  .notice span { flex: 1; }
  .notice.error { border-color: var(--alert-red); color: var(--alert-red-text); }
  .small { font-size: 0.875rem; margin-top: 8px; }
  @media (max-width: 767px) { .simbar .btn:not(.primary) { display: none; } }
</style>
