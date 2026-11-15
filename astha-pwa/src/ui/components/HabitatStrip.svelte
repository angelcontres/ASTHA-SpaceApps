<script lang="ts">
  // Habitat Strip (COMP-00, C4 §3.2): cabecera fija con identidad, tripulante/rol, día de misión, los 6 parámetros
  // ECLSS/CANS con semáforo, latencia/sync, modos (Zen, Supervivencia, Rojo) y el botón de EMERGENCIA, que abre
  // el protocolo activo en 1 toque (RNF-USA-02).
  import { bridge } from '../bridge/workerBridge.svelte';
  import { fd, fmt, ROLE_LABEL, STATUS_LABEL } from '../bridge/uiState.svelte';

  interface Props { onemergency: () => void; onsettings: () => void; zen: boolean; survival: boolean; red: boolean }
  let { onemergency, onsettings, zen, survival, red }: Props = $props();

  const me = $derived(bridge.data.crew.find((c) => c.id === bridge.unlockedCrewId));
  const global = $derived(bridge.currentAssessment?.global ?? 'none');
  const hasAlert = $derived(bridge.activeAlerts.some((a) => !a.overridden && a.status !== 'nominal'));
  const syncLabel = { disabled: 'Autónomo', offline: 'Sin Hub', connecting: 'Conectando', online: 'Sync OK' } as const;
</script>

<header class="strip">
  <div class="brand">
    <img src="./icon.svg" alt="" width="28" height="28" class="logo-img" />
    <div>
      <strong>ASTHA</strong>
      <span class="label">{fd(bridge.data.day)} · de {bridge.data.maxDay}</span>
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

  <ul class="eclss" aria-label="Telemetría del hábitat">
    {#each bridge.habitatTelemetry.indicators as i (i.id)}
      <li class="st {i.status}" title="{i.label}: nominal {i.nominalRange}">
        <span class="label">{i.short}</span>
        <span class="num v">{fmt(i.value, i.decimals)}<small class="unit"> {i.unit}</small></span>
        <span class="sym" aria-label={STATUS_LABEL[i.status]}></span>
      </li>
    {/each}
  </ul>

  <div class="meta label" aria-live="off">
    <span>Ciclo {bridge.cycleMs != null ? `${fmt(bridge.cycleMs, 1)} ms` : '—'}</span>
    <span>{syncLabel[bridge.syncStatus]}</span>
  </div>

  <div class="actions">
    <button type="button" class="btn" aria-pressed={zen} onclick={() => bridge.setPref('zen', !zen)}>Zen</button>
    <button
      type="button"
      class="btn"
      aria-pressed={survival}
      disabled={bridge.activeRole !== 'commander'}
      title={bridge.activeRole === 'commander' ? 'Modo supervivencia energética (ADR-019)' : 'Solo el Comandante (ADR-019)'}
      onclick={() => bridge.setPref('survival', !survival)}
    >Supervivencia</button>
    <button type="button" class="btn" aria-pressed={red} onclick={() => bridge.setPref('redMode', !red)}>Rojo 630</button>
    <button type="button" class="btn icon" aria-label="Ajustes" onclick={onsettings}>⚙</button>
    <button type="button" class="btn icon" aria-label="Bloquear sesión" onclick={() => bridge.lock()}>🔒</button>
    <button type="button" class="btn danger emergency" class:pulse={hasAlert} onclick={onemergency}>
      ✕ EMERGENCIA
    </button>
  </div>
</header>

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
  .logo-img { display: block; width: 28px; height: 28px; flex: 0 0 auto; }
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
