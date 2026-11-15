<script lang="ts">
  // Habitat Strip (COMP-00, C4 §3.2): sticky top bar with ASTHA identity, active crew/role, flight day,
  // 6 ECLSS/CANS telemetry indicators with dual coding, cycle latency & sync state, display modes,
  // and 1-tap EMERGENCY trigger (RNF-USA-02).
  import {
    fd, fmt, indLabel, indShort, ROLE_LABEL, STATUS_LABEL, ui,
  } from '../bridge/uiState.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';

  interface Props { onemergency: () => void; onsettings: () => void; zen: boolean; survival: boolean; red: boolean }
  const { onemergency, onsettings, zen, survival, red }: Props = $props();

  const me = $derived(bridge.data.crew.find((c) => c.id === bridge.unlockedCrewId));
  const global = $derived(bridge.currentAssessment?.global ?? 'none');
  const hasAlert = $derived(bridge.activeAlerts.some((a) => !a.overridden && a.status !== 'nominal'));
  const syncLabel = {
    disabled: 'Autonomous',
    offline: 'No Hub',
    connecting: 'Connecting',
    online: 'Sync OK',
  } as const;
</script>

<header class="strip">
  <div class="brand">
    <img class="logo-img" src="./icon.svg" alt="" width="30" height="30" />
    <div>
      <div class="brand-row">
        <strong>ASTHA</strong>
        <span class="edge-pill label">OFFLINE EDGE</span>
      </div>
      <span class="label">{fd(bridge.data.day)} · of {bridge.data.maxDay}</span>
    </div>
  </div>

  {#if me}
    <div class="who st {global}">
      <span class="sym" aria-hidden="true"></span>
      <span>
        <strong>{me.id}</strong> {me.name}
        <span class="label">{ROLE_LABEL[me.role]} · {STATUS_LABEL[global]}</span>
      </span>
    </div>
  {/if}

  <ul class="eclss" aria-label="Habitat ECLSS telemetry">
    {#each bridge.habitatTelemetry.indicators as i (i.id)}
      <li class="st {i.status}" title="{indLabel(i)}: nominal {i.nominalRange}">
        <span class="label">{indShort(i)}</span>
        <span class="num v">{fmt(i.value, i.decimals)}<small class="unit"> {i.unit}</small></span>
        <span class="sym" aria-label={STATUS_LABEL[i.status]}></span>
      </li>
    {/each}
  </ul>

  <div class="meta label" aria-live="off">
    <span>Cycle {bridge.cycleMs != null ? `${fmt(bridge.cycleMs, 1)} ms` : '—'}</span>
    <span>{syncLabel[bridge.syncStatus]}</span>
  </div>

  <div class="actions">
    <button type="button" class="btn" aria-pressed={zen} onclick={() => bridge.setPref('zen', !zen)}>Zen</button>
    <button
      type="button"
      class="btn"
      aria-pressed={survival}
      disabled={bridge.activeRole !== 'commander'}
      title={bridge.activeRole === 'commander' ? 'Power survival mode < 5 W (ADR-019)' : 'Commander only (ADR-019)'}
      onclick={() => bridge.setPref('survival', !survival)}
    >
      Survival
    </button>
    <button type="button" class="btn" aria-pressed={red} onclick={() => bridge.setPref('redMode', !red)}>
      Red 630
    </button>
    <button
      type="button"
      class="btn icon"
      aria-label="Display settings"
      aria-expanded={ui.settingsOpen}
      onclick={onsettings}
    >
      ⚙
    </button>
    <button type="button" class="btn icon" aria-label="Lock session" onclick={() => bridge.lock()}>🔒</button>
    <button type="button" class="btn danger emergency" class:pulse={hasAlert} onclick={onemergency}>
      ✕ EMERGENCY
    </button>
  </div>
</header>
<div class="nasa-spectrum" aria-hidden="true"></div>

<style>
  .strip {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--gap);
    padding: 8px 16px;
    background: var(--space-900);
    border-bottom: 1px solid var(--border);
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-row { display: flex; align-items: center; gap: 8px; }
  .edge-pill {
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--alert-green) 70%, transparent);
    background: var(--nominal-fill);
    color: var(--alert-green);
  }
  .logo-img { display: block; width: 30px; height: 30px; flex: 0 0 auto; border-radius: 6px; }
  .brand strong { display: block; letter-spacing: 0.12em; }
  .who { display: flex; align-items: center; gap: 8px; padding: 4px 10px; border-left: 3px solid var(--st); }
  .who .sym { color: var(--st-text); }
  .who .label { display: block; }
  .eclss { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 14px; flex: 1 1 380px; }
  .eclss li { display: flex; align-items: baseline; gap: 6px; padding: 2px 8px; border-bottom: var(--st-bw) solid var(--st); }
  .eclss .v { font-weight: 700; }
  .eclss .sym { color: var(--st-text); }
  .meta { display: flex; flex-direction: column; gap: 2px; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--gap); margin-left: auto; }
  .emergency { font-weight: 800; letter-spacing: 0.04em; }
  @media (max-width: 767px) {
    .actions .btn:not(.emergency):not(.icon) { display: none; }
  }
</style>
