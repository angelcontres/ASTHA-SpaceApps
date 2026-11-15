<script lang="ts">
  // Pestaña 3 · Triage anatómico y CDSS (RF-ANA-01..04, COMP-02 + COMP-05): avatar 3D bajo demanda (SVG en
  // supervivencia), detalle de la región (indicadores, tendencia, alertas) y guía de contramedidas.
  // Desde cualquier alerta se llega a su protocolo en ≤ 3 toques (RNF-USA-02).
  import { resolveProtocol } from '../../engine/countermeasures';
  import type { RegionId } from '../../engine/types';
  import AnatomyViewer from '../components/AnatomyViewer.svelte';
  import CountermeasureGuide from '../components/CountermeasureGuide.svelte';
  import IndicatorCard from '../components/IndicatorCard.svelte';
  import OsdrStudies from '../components/OsdrStudies.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import { REGION_LABEL, regionOfIndicator, STATUS_LABEL, ui } from '../bridge/uiState.svelte';

  interface Props { survival: boolean }
  let { survival }: Props = $props();

  const a = $derived(bridge.currentAssessment);
  const alerts = $derived(bridge.activeAlerts.filter((x) => !x.overridden && x.status !== 'nominal' && (x.crewId === a?.crewId || x.crewId === 'HAB')));

  // Región por defecto: la de la alerta abierta o la más grave.
  const region = $derived<RegionId | null>(
    ui.selectedRegion ?? alerts.find((x) => x.id === ui.openAlertId)?.region ?? alerts[0]?.region ?? null,
  );
  const regionAlerts = $derived(region ? alerts.filter((x) => x.region === region) : alerts);
  const regionIndicators = $derived(region ? (a?.indicators ?? []).filter((i) => regionOfIndicator(i.id) === region) : []);
  const open = $derived(alerts.find((x) => x.id === ui.openAlertId) ?? regionAlerts[0] ?? null);
  const protocol = $derived(open ? resolveProtocol(open.countermeasureId) : null);
  const isCmo = $derived(bridge.activeRole === 'cmo');

  function select(id: RegionId) {
    ui.selectedRegion = id;
    ui.openAlertId = null;
  }
</script>

{#if !a}
  <p class="panel muted">Esperando la evaluación del tripulante…</p>
{:else}
  <div class="triage">
    <section class="panel body" aria-label="Anatomical avatar">
      <AnatomyViewer
        regions={a.regions}
        bind:view={ui.view}
        selected={region}
        variant={survival ? 'fallback' : open?.status === 'critical' ? 'crisis' : 'full'}
        onselect={select}
      />
      <p class="legend label">✓ Nominal · ▲ Caution (striped) · ✕ Critical (grid + pulse) · ? suspect reading</p>
    </section>

    <section class="detail stack" aria-labelledby="reg-h">
      <header class="row between">
        <h2 id="reg-h">{region ? REGION_LABEL[region] : 'Todas las regiones'}</h2>
        {#if region}
          <span class="st {a.regions[region].status} badge"><span class="sym" aria-hidden="true"></span> {STATUS_LABEL[a.regions[region].status]}</span>
          <button type="button" class="btn" onclick={() => (ui.selectedRegion = null)}>Ver todas</button>
        {/if}
      </header>

      {#if regionIndicators.length}
        <div class="inds">
          {#each regionIndicators as ind (ind.id)}<IndicatorCard indicator={ind} onopen={() => { ui.bioIndicator = ind.id; ui.tab = 'bio'; }} />{/each}
        </div>
      {/if}

      {#if regionAlerts.length}
        <div class="row alerts" role="group" aria-label="Alertas de la región">
          {#each regionAlerts as al (al.id)}
            <button type="button" class="btn st {al.status}" aria-pressed={open?.id === al.id} onclick={() => (ui.openAlertId = al.id)}>
              <span class="sym" aria-hidden="true"></span> {al.ruleId}
            </button>
          {/each}
        </div>
      {/if}

      {#if open && protocol}
        <CountermeasureGuide {protocol} alert={open} variant={open.urgency === 'emergency' ? 'emergency' : 'inline'}
          oncheck={(s, c, p) => bridge.checkStep(open, s, c, p)} />
        <div class="row">
          {#if open.status === 'critical' && !open.acknowledged}
            <button type="button" class="btn danger" onclick={() => bridge.acknowledge(open)}>Reconocer alerta</button>
          {/if}
          {#if isCmo}
            <button type="button" class="btn" onclick={() => bridge.override(open, 'Falso positivo confirmado por el CMO')}>Anular (falso positivo)</button>
          {/if}
        </div>
      {:else}
        <p class="panel st nominal"><span class="sym" aria-hidden="true"></span> Sin alertas en esta región.</p>
      {/if}
    </section>
  </div>
{/if}

<OsdrStudies />

<style>
  .triage { display: grid; grid-template-columns: 5fr 7fr; gap: var(--gap); }
  .body, .detail { min-width: 0; }
  .legend { margin-top: var(--gap); }
  .between { justify-content: space-between; }
  .badge { font-weight: 700; color: var(--st-text); }
  .inds { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--gap); }
  .alerts .btn { border-color: var(--st); }
  .alerts .sym { color: var(--st-text); }
  .st.nominal .sym { color: var(--alert-green); }
  @media (max-width: 1023px) { .triage { grid-template-columns: 1fr; } }
</style>
