<script lang="ts">
  // App Shell (C4 §3.2): pantalla de bloqueo hasta el PIN; después cabecera COMP-00, selector COMP-01, alarmas,
  // 4 pestañas (WIREFRAME §6.1), barra de simulador COMP-06 y Vista B (Código Rojo) por encima de todo.
  import { onMount } from 'svelte';
  import { SCENARIO_IDS, SYNTHETIC, type ScenarioDef } from './storage/telemetrySources';
  import AlarmManager from './ui/components/AlarmManager.svelte';
  import CrewBar from './ui/components/CrewBar.svelte';
  import HabitatStrip from './ui/components/HabitatStrip.svelte';
  import { power } from './ui/bridge/power.svelte';
  import { bridge } from './ui/bridge/workerBridge.svelte';
  import { ui, type Tab } from './ui/bridge/uiState.svelte';
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
  // Supervivencia efectiva: manual (Comandante) o automática por batería crítica (AC-TECH-02 §3, ADR-019 enmendado).
  const survival = $derived(prefs.survival || power.low);

  // Modos visuales como atributos de <html>: los tokens CSS hacen el resto (también en canvas).
  $effect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-red', prefs.redMode);
    root.toggleAttribute('data-contrast', prefs.highContrast);
    root.toggleAttribute('data-large', prefs.largeText);
    root.toggleAttribute('data-survival', survival);
    root.toggleAttribute('data-lowpower', power.low);
  });

  // Al bloquear se vuelve al estado inicial de navegación.
  $effect(() => {
    if (!unlocked) { ui.tab = 'bio'; ui.openAlertId = null; ui.codeRedId = null; ui.selectedRegion = null; }
  });

  const codeRed = $derived(ui.codeRedId ? bridge.activeAlerts.find((a) => a.id === ui.codeRedId && !a.overridden) ?? null : null);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'bio', label: '1 · Biomédico' },
    { id: 'env', label: '2 · Entorno ECLSS' },
    { id: 'triage', label: '3 · Triage anatómico' },
    { id: 'sim', label: '4 · Simulador' },
  ];

  /** Botón de emergencia: abre el protocolo más grave en 1 toque (RNF-USA-02). */
  function emergency() {
    const top = bridge.activeAlerts.find((a) => !a.overridden && a.status !== 'nominal');
    if (top) {
      ui.openProtocol(top.id, top.region);
      if (top.urgency === 'emergency') ui.codeRedId = top.id;
    } else {
      ui.tab = 'triage';
    }
  }

  const scen = (id: (typeof SCENARIO_IDS)[number]) => SYNTHETIC.scenarios[id] as ScenarioDef;
</script>

<svelte:head>
  <title>{unlocked ? `ASTHA · ${bridge.unlockedCrewId}` : 'ASTHA · Bloqueo'}</title>
</svelte:head>

{#if !unlocked}
  <LockScreen />
{:else}
  <HabitatStrip onemergency={emergency} onsettings={() => (ui.settingsOpen = !ui.settingsOpen)} zen={prefs.zen} {survival} red={prefs.redMode} />
  <AlarmManager />
  {#if !prefs.zen}<CrewBar />{/if}

  {#if power.low}
    <p class="lowpower st caution" role="status">
      <span class="sym" aria-hidden="true"></span>
      Batería crítica{power.level !== null && !power.simulated ? ` (${Math.round(power.level * 100)} %)` : ' (señal simulada)'}: modo supervivencia automático.
      Pantalla atenuada, telemetría cada 5 s; triage y alarmas siguen al instante.
    </p>
  {/if}

  {#if ui.settingsOpen}
    <section class="settings panel" aria-labelledby="set-h">
      <h2 id="set-h" class="label">Ajustes de pantalla</h2>
      <div class="row">
        <button type="button" class="btn" aria-pressed={!prefs.redMode && !prefs.survival} onclick={() => { bridge.setPref('redMode', false); if (prefs.survival && bridge.activeRole === 'commander') bridge.setPref('survival', false); }}>Estándar OLED</button>
        <button type="button" class="btn" aria-pressed={prefs.redMode} onclick={() => bridge.setPref('redMode', !prefs.redMode)}>Espectral rojo 630 nm</button>
        <button type="button" class="btn" aria-pressed={prefs.survival} disabled={bridge.activeRole !== 'commander'} onclick={() => bridge.setPref('survival', !prefs.survival)}>Supervivencia energética</button>
        <button type="button" class="btn" aria-pressed={prefs.highContrast} onclick={() => bridge.setPref('highContrast', !prefs.highContrast)}>Alto contraste</button>
        <button type="button" class="btn" aria-pressed={prefs.largeText} onclick={() => bridge.setPref('largeText', !prefs.largeText)}>Texto grande</button>
        <button type="button" class="btn" aria-pressed={prefs.zen} onclick={() => bridge.setPref('zen', !prefs.zen)}>Modo Zen</button>
        <button type="button" class="btn" onclick={() => (ui.settingsOpen = false)}>Cerrar</button>
      </div>
      {#if bridge.activeRole !== 'commander'}<p class="muted small">El modo supervivencia manual solo lo activa el Comandante (ADR-019). Con batería crítica se activa solo.</p>{/if}
    </section>
  {/if}

  {#if !prefs.zen}
    <nav class="tabs" aria-label="Vistas">
      {#each TABS as t (t.id)}
        <button type="button" class="btn tab" aria-current={ui.tab === t.id ? 'page' : undefined} aria-pressed={ui.tab === t.id} onclick={() => (ui.tab = t.id)}>{t.label}</button>
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
    <!-- COMP-06: barra de simulador de crisis -->
    <footer class="simbar" aria-label="Simulador de crisis rápido">
      {#each SCENARIO_IDS.slice(0, 4) as id (id)}
        <button type="button" class="btn" onclick={() => bridge.injectScenario(id)}>! {id} · {scen(id).label}</button>
      {/each}
      <button type="button" class="btn primary" onclick={() => bridge.reset()}>✓ Resetear nominal</button>
      <span class="label provenance">Datos sintéticos de demostración · no son telemetría medida por NASA</span>
    </footer>
  {/if}

  {#if codeRed}<CodeRedView alert={codeRed} />{/if}
{/if}

<div class="notices" aria-live="polite">
  {#each bridge.notices.filter((n) => n.code !== 'wrong-pin') as n (n.id)}
    <div class="notice {n.level}" role={n.level === 'error' ? 'alert' : 'status'}>
      <span>{n.message}</span>
      <button type="button" class="btn icon" aria-label="Cerrar aviso" onclick={() => bridge.dismissNotice(n.id)}>×</button>
    </div>
  {/each}
</div>

<style>
  .tabs { display: flex; flex-wrap: wrap; gap: var(--gap); padding: 12px 16px 0; }
  .tab[aria-current='page'] { border-color: var(--accent); }
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
