<script lang="ts">
  // Habitat Strip (COMP-00, C4 §3.2): sticky top bar with ASTHA identity, active crew/role, flight day,
  // 6 ECLSS/CANS telemetry indicators with dual coding, cycle latency & sync state, display modes,
  // and 1-tap EMERGENCY trigger (RNF-USA-02).
  import {
    fd, fmt, indLabel, indShort, ROLE_LABEL, STATUS_LABEL, ui,
  } from '../bridge/uiState.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import HudIcon from './HudIcon.svelte';

  interface Props { onemergency: () => void; onsettings: () => void; zen: boolean; survival: boolean; red: boolean }
  const { onemergency, onsettings, zen, survival, red }: Props = $props();

  const me = $derived(bridge.data.crew.find((c) => c.id === bridge.unlockedCrewId));
  const global = $derived(bridge.currentAssessment?.global ?? 'none');
  const alertCount = $derived(bridge.activeAlerts.filter((a) => !a.overridden && a.status !== 'nominal').length);
  const hasAlert = $derived(alertCount > 0);
  const syncLabel = {
    disabled: 'Autonomous',
    offline: 'No Hub',
    connecting: 'Connecting',
    online: 'Sync OK',
  } as const;
</script>

<header class="strip">
  <div class="brand">
    <svg class="nasa-worm" viewBox="0 0 508.204 141.732" fill="currentColor" aria-hidden="true">
      <path d="M91.991,104.699c1.576,5.961,4.119,8.266,8.613,8.266c4.659,0,7.102-2.799,7.102-8.266V3.2h29.184v101.499 c0,14.307-1.856,20.506-9.11,27.762c-5.228,5.229-14.871,9.271-27.047,9.271c-9.837,0-19.25-3.256-25.253-9.27 c-5.263-5.273-8.154-10.689-12.672-27.764L44.9,37.033c-1.577-5.961-4.119-8.265-8.613-8.265c-4.66,0-7.103,2.798-7.103,8.265 v101.5H0v-101.5C0,22.727,1.857,16.527,9.111,9.271C14.337,4.044,23.981,0,36.158,0c9.837,0,19.25,3.257,25.253,9.27 c5.263,5.273,8.154,10.689,12.672,27.764L91.991,104.699z"/>
      <path d="M478.038,138.533L444.334,33.096c-0.372-1.164-0.723-2.152-1.263-2.811 c-0.926-1.127-2.207-1.719-3.931-1.719c-1.723,0-3.004,0.592-3.931,1.719c-0.539,0.658-0.891,1.646-1.262,2.811l-33.703,105.437 h-30.167l36.815-115.177c1.918-6,4.66-11.094,8.139-14.488C421.002,3.047,428.038,0,439.141,0s18.14,3.047,24.109,8.867 c3.479,3.395,6.221,8.488,8.14,14.488l36.814,115.177H478.038z"/>
      <path d="M328.878,138.533c19.12,0,28.446-4.062,35.814-11.389c8.153-8.105,12.053-16.973,12.053-30.213 c0-11.699-4.283-22.535-10.804-29.019c-8.526-8.479-19.116-11.151-36.384-11.151L305.37,56.76c-9.242,0-12.925-1.117-15.839-3.98 c-2.001-1.964-2.939-4.885-2.939-8.328c0-3.559,0.857-7.074,3.303-9.475c2.171-2.131,5.13-3.109,10.816-3.109h69.903V3.2H306.05 c-19.12,0-28.445,4.063-35.814,11.389c-8.152,8.105-12.053,16.972-12.053,30.212c0,11.701,4.283,22.536,10.804,29.019 c8.527,8.479,19.116,11.152,36.384,11.152l24.188,0.002c9.242,0,12.925,1.115,15.839,3.979c2.001,1.965,2.939,4.885,2.939,8.328 c0,3.559-0.857,7.074-3.302,9.475c-2.172,2.131-5.131,3.109-10.817,3.109h-72.094l-27.651-86.509 c-1.918-6-4.66-11.094-8.139-14.488C220.363,3.047,213.327,0,202.224,0s-18.14,3.047-24.108,8.867 c-3.48,3.395-6.221,8.488-8.139,14.488l-36.815,115.177h30.166l33.704-105.437c0.372-1.164,0.723-2.152,1.263-2.811 c0.926-1.127,2.208-1.719,3.931-1.719s3.004,0.592,3.931,1.719c0.54,0.658,0.891,1.646,1.262,2.811l33.704,105.437H328.878z"/>
    </svg>
    <div>
      <div class="brand-row">
        <strong>ASTHA</strong>
        <span class="hud-tag">ESTD 1958</span>
        <span class="edge-pill label">OFFLINE EDGE</span>
      </div>
      <span class="label sub">AUTONOMOUS SPACE TELEMETRY · {fd(bridge.data.day)} / {bridge.data.maxDay}</span>
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
      title={bridge.activeRole === 'commander' ? 'Power survival mode < 5 W' : 'Commander only'}
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
      <HudIcon name="settings" size={18} />
    </button>
    <button
      type="button"
      class="btn icon lock-btn"
      aria-label="Lock session and return to PIN screen"
      title="Lock session / Exit"
      onclick={() => bridge.lock()}
    >
      <HudIcon name="log-out" size={16} />
      <span class="lock-txt">Exit</span>
    </button>
    <button
      type="button"
      class="btn danger emergency"
      class:pulse={hasAlert}
      class:peek-active={hasAlert}
      aria-expanded={ui.emergencyOpen}
      title="Open emergency alerts & records drawer"
      onclick={onemergency}
    >
      <HudIcon name="alert" size={16} /> EMERGENCY
      {#if hasAlert}<span class="em-count num">{alertCount}</span>{/if}
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
    background: color-mix(in srgb, var(--space-900) 94%, #0f2854);
    border-bottom: 1px solid var(--border-strong);
    box-shadow: 0 8px 24px rgb(2 8 23 / 0.55);
    overflow-x: clip;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-row { display: flex; align-items: center; gap: 6px; }
  .edge-pill {
    padding: 2px 7px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--alert-green) 70%, transparent);
    background: var(--nominal-fill);
    color: var(--alert-green);
  }
  .nasa-worm { display: block; width: 68px; height: auto; flex: 0 0 auto; color: var(--text); }
  .brand strong { display: block; letter-spacing: 0.14em; font-family: var(--font-num); }
  .sub { display: block; color: var(--blueprint-text); }
  .who { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid var(--border); border-left: 3px solid var(--st); border-radius: var(--radius-btn); background: var(--space-800); }
  .who .sym { color: var(--st-text); }
  .who .label { display: block; }
  .eclss { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 10px; flex: 1 1 380px; }
  .eclss li { display: flex; align-items: baseline; gap: 6px; padding: 4px 10px; border: 1px solid var(--border); border-bottom: var(--st-bw) solid var(--st); border-radius: var(--radius-btn); background: var(--space-800); }
  .eclss .v { font-weight: 700; }
  .eclss .sym { color: var(--st-text); }
  .meta { display: flex; flex-direction: column; gap: 2px; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--gap); margin-left: auto; }
  .emergency {
    font-weight: 800;
    letter-spacing: 0.04em;
    animation: emergencyPeekRight 440ms cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: transform 180ms ease;
  }
  .emergency:hover { transform: translateX(-3px); }
  .emergency.peek-active {
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--alert-red) 55%, transparent), 0 6px 18px rgb(220 38 38 / 0.25);
  }
  .em-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--alert-red);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 800;
    line-height: 1;
  }
  @keyframes emergencyPeekRight {
    0% { opacity: 0; transform: translateX(48px); }
    70% { opacity: 1; transform: translateX(-3px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .emergency { animation: none; transition: none; }
  }
  .btn.icon.lock-btn { width: auto; padding: 0 12px; gap: 6px; font-weight: 600; }
  @media (max-width: 767px) {
    .actions .btn:not(.emergency):not(.icon) { display: none; }
    .btn.icon.lock-btn { width: var(--touch); padding: 0; }
    .lock-btn .lock-txt { display: none; }
  }
</style>
