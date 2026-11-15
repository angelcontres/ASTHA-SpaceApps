<script lang="ts">
  // Pestaña 1 · Cockpit biomédico (docs/Diseno-UI-UX/01 §3, Vista A): COMP-02 anatomía (4 col) · COMP-03 vitales
  // 2×2 · COMP-03B ECLSS · COMP-04 tendencia (7) · COMP-05 checklist (5) · registro matutino y gamificación.
  // Modo Zen: solo vitales esenciales ampliados. Modo Supervivencia: sin 3D ni uPlot, lectura tabular (ADR-019).
  import { resolveProtocol } from '../../engine/countermeasures';
  import type { CrewIndicator, IndicatorId, IndicatorState } from '../../engine/types';
  import AnatomyViewer from '../components/AnatomyViewer.svelte';
  import BodySvg from '../components/BodySvg.svelte';
  import CountermeasureGuide from '../components/CountermeasureGuide.svelte';
  import EntrySymptomPad from '../components/EntrySymptomPad.svelte';
  import IndicatorCard from '../components/IndicatorCard.svelte';
  import TrendChart from '../components/TrendChart.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import { fmt, ROLE_LABEL, STATUS_LABEL, ui } from '../bridge/uiState.svelte';

  interface Props { zen: boolean; survival: boolean }
  let { zen, survival }: Props = $props();

  const a = $derived(bridge.currentAssessment);
  const byId = $derived(new Map((a?.indicators ?? []).map((i) => [i.id, i])));
  const get = (id: IndicatorId) => byId.get(id) as IndicatorState | undefined;
  const SECONDARY: CrewIndicator[] = ['glucose', 'temp', 'sleep', 'mood', 'urineCa'];

  const days = $derived(bridge.series.measurements.map((m) => m.day));
  const seriesValues = (id: CrewIndicator) => bridge.series.measurements.map((m) => (typeof m[id] === 'number' ? (m[id] as number) : null));
  const todayRow = $derived(bridge.series.measurements.find((m) => m.day === bridge.data.day) ?? null);

  const topAlert = $derived(bridge.activeAlerts.find((x) => !x.overridden && x.status !== 'nominal' && (x.crewId === a?.crewId || x.crewId === 'HAB')) ?? null);
  const topProtocol = $derived(topAlert ? resolveProtocol(topAlert.countermeasureId) : null);
  const gam = $derived(a?.gamification ?? null);
  const multiCrew = $derived((bridge.data.session?.allowedCrew.length ?? 0) > 1);
</script>

{#if !a}
  <p class="panel muted">Esperando la evaluación del tripulante…</p>
{:else if zen}
  <section class="zen" aria-label="Modo Zen: vitales esenciales">
    {#each ['hr', 'sbp', 'spo2', 'hrv'] as id (id)}
      {@const ind = get(id as IndicatorId)}
      {#if ind}<IndicatorCard indicator={ind} second={id === 'sbp' ? get('dbp') : null} variant="zen" />{/if}
    {/each}
  </section>
{:else}
  <div class="cockpit">
    <!-- COMP-02 -->
    <section class="anatomy panel" aria-label="Visor anatómico">
      {#if survival}
        <BodySvg regions={a.regions} view={ui.view} selected={ui.selectedRegion} onselect={(r) => { ui.selectedRegion = r; ui.tab = 'triage'; }} />
      {:else}
        <AnatomyViewer regions={a.regions} bind:view={ui.view} selected={ui.selectedRegion} onselect={(r) => { ui.selectedRegion = r; ui.tab = 'triage'; }} />
      {/if}
    </section>

    <div class="main">
      <!-- COMP-03 -->
      <section aria-labelledby="vit-h">
        <h2 id="vit-h" class="label">Monitoreo biomédico · {bridge.data.crew.find((c) => c.id === a.crewId)?.name}</h2>
        <div class="vitals">
          {#each ['hr', 'sbp', 'spo2', 'hrv'] as id (id)}
            {@const ind = get(id as IndicatorId)}
            {#if ind}
              <IndicatorCard indicator={ind} second={id === 'sbp' ? get('dbp') : null} variant={id === 'sbp' ? 'compound' : 'vital'}
                active={ui.bioIndicator === id} onopen={() => (ui.bioIndicator = id as IndicatorId)} />
            {/if}
          {/each}
        </div>
        <div class="secondary">
          {#each SECONDARY as id (id)}
            {@const ind = get(id)}
            {#if ind}<IndicatorCard indicator={ind} active={ui.bioIndicator === id} onopen={() => (ui.bioIndicator = id)} />{/if}
          {/each}
        </div>
      </section>

      <!-- COMP-03B -->
      <section aria-labelledby="eclss-h">
        <h2 id="eclss-h" class="label">Entorno ECLSS · 6 parámetros</h2>
        <div class="eclss">
          {#each bridge.habitatTelemetry.indicators as ind (ind.id)}
            <IndicatorCard indicator={ind} variant="habitat" onopen={() => { ui.envIndicator = ind.id; ui.tab = 'env'; }} />
          {/each}
        </div>
      </section>

      <div class="split">
        <!-- COMP-04 -->
        <section class="panel trend" aria-labelledby="trend-h">
          <h2 id="trend-h" class="label">Tendencia · {get(ui.bioIndicator)?.label ?? ''}</h2>
          {#if survival}
            <table class="tab num">
              <thead><tr><th>Día</th><th>{get(ui.bioIndicator)?.short}</th></tr></thead>
              <tbody>
                {#each bridge.series.measurements.slice(-7).reverse() as m (m.day)}
                  <tr><td>FD-{m.day}</td><td>{fmt(m[ui.bioIndicator as CrewIndicator] as number, get(ui.bioIndicator)?.decimals ?? 0)}</td></tr>
                {/each}
              </tbody>
            </table>
          {:else if days.length}
            <TrendChart indicator={ui.bioIndicator} {days} values={seriesValues(ui.bioIndicator as CrewIndicator)} />
          {/if}
        </section>

        <!-- COMP-05 -->
        <section class="check" aria-label="Contramedida activa">
          {#if topAlert && topProtocol}
            <CountermeasureGuide protocol={topProtocol} alert={topAlert} oncheck={(s, c) => bridge.checkStep(topAlert, s, c)} />
          {:else}
            <div class="panel st nominal"><span class="sym" aria-hidden="true"></span> Sin contramedidas activas. Mantén la rutina diaria (ARED, hidratación, sueño).</div>
          {/if}
        </section>
      </div>
    </div>
  </div>

  <div class="lower">
    <details class="panel" open={!todayRow?.manual}>
      <summary class="label">Registro matutino y síntomas</summary>
      <EntrySymptomPad
        crewId={a.crewId}
        today={todayRow}
        symptoms={bridge.data.symptoms[a.crewId] ?? []}
        onsubmit={(f) => bridge.manualEntry(a.crewId, f)}
        onsymptom={(s, on) => bridge.toggleSymptom(a.crewId, s, on)}
      />
    </details>

    {#if gam}
      <!-- Gamificación: después de las alertas y nunca por encima de ellas (RF-GAM-03) -->
      <section class="panel gam" aria-labelledby="gam-h">
        <h2 id="gam-h" class="label">Hábitos</h2>
        <p><span class="value">{gam.xp}</span> <span class="unit">XP · nivel {gam.level} · racha {gam.streak} días</span></p>
        <ul class="medals">
          {#each gam.medals as m (m.id)}<li class:earned={m.earnedToday}>{m.earnedToday ? '★' : '☆'} {m.label}</li>{/each}
        </ul>
      </section>
    {/if}

    {#if multiCrew}
      <section class="panel" aria-labelledby="crew-h">
        <h2 id="crew-h" class="label">Resumen de tripulación</h2>
        <div class="row">
          {#each bridge.data.crew as c (c.id)}
            {@const ca = bridge.assessments.find((x) => x.crewId === c.id)}
            {#if ca && !ca.statusOnly}
              <button type="button" class="btn crewcard st {ca.global}" onclick={() => bridge.selectCrew(c.id)}
                aria-label="{c.name}, {ROLE_LABEL[c.role]}, {STATUS_LABEL[ca.global]}">
                <BodySvg regions={ca.regions} compact label={c.name} />
                <span><strong>{c.id}</strong><br /><span class="sym" aria-hidden="true"></span> {STATUS_LABEL[ca.global]}</span>
              </button>
            {/if}
          {/each}
        </div>
      </section>
    {/if}
  </div>
{/if}

<style>
  .cockpit { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--gap); }
  .anatomy { grid-column: span 4; }
  .main { grid-column: span 8; display: flex; flex-direction: column; gap: var(--gap); min-width: 0; }
  .vitals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); margin-top: 8px; }
  .secondary { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: var(--gap); margin-top: var(--gap); }
  .secondary :global(.value) { font-size: 1.375rem; }
  .eclss { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap); margin-top: 8px; }
  .split { display: grid; grid-template-columns: 7fr 5fr; gap: var(--gap); }
  .trend, .check { min-width: 0; }
  .lower { display: grid; grid-template-columns: 2fr 1fr; gap: var(--gap); margin-top: var(--gap); }
  .lower > :last-child:nth-child(3) { grid-column: 1 / -1; }
  summary { cursor: pointer; min-height: var(--touch); display: flex; align-items: center; }
  .medals { list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-direction: column; gap: 4px; }
  .medals .earned { color: var(--alert-yellow); }
  .crewcard { height: auto; padding: 8px 12px; gap: 12px; border-color: var(--st); }
  .crewcard .sym { color: var(--st-text); }
  .zen { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); }
  .tab { width: 100%; border-collapse: collapse; }
  .tab th, .tab td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); }
  @media (max-width: 1279px) {
    .anatomy, .main { grid-column: 1 / -1; }
    .split, .lower { grid-template-columns: 1fr; }
  }
  @media (max-width: 767px) {
    .vitals, .eclss, .zen { grid-template-columns: 1fr; }
  }
</style>
