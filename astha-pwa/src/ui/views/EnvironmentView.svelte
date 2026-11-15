<script lang="ts">
  // Tab 2 · ECLSS Environment & CANS Radiation Dosimetry (RF-DSH-04, COMP-03B): 6 habitat indicators,
  // accumulated module dose, uPlot trend (or static Survival table under <5 W), and active environmental alerts.
  import { accumulatedDose, CAREER_LIMIT_MSV, SPE_EVENT_LIMIT_MSV } from '../../engine/dose';
  import type { HabitatIndicator } from '../../engine/types';
  import IndicatorCard from '../components/IndicatorCard.svelte';
  import TrendChart from '../components/TrendChart.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import { fd, fmt, indLabel, indShort, ui } from '../bridge/uiState.svelte';

  interface Props { survival: boolean }
  const { survival }: Props = $props();

  const hab = $derived(bridge.series.habitat);
  const days = $derived(hab.map((h) => h.day));
  const values = $derived(hab.map((h) => (h[ui.envIndicator as HabitatIndicator] ?? null) as number | null));
  const current = $derived(bridge.habitatTelemetry.indicators.find((i) => i.id === ui.envIndicator));
  const dose = $derived(accumulatedDose(hab));
  const envAlerts = $derived(bridge.activeAlerts.filter((a) => (a.organ === 'respiratory_env' || a.organ === 'radiation') && !a.overridden));
</script>

<div class="env">
  <section aria-labelledby="env-h">
    <div class="hud-head">
      <h2 id="env-h" class="label">ECLSS Life Support &amp; CANS Dosimetry · {bridge.habitatTelemetry.day ? fd(bridge.habitatTelemetry.day) : ''}</h2>
      <span class="hud-tag">COMP-03B // ECLSS &amp; CANS</span>
    </div>
    <div class="grid">
      {#each bridge.habitatTelemetry.indicators as ind (ind.id)}
        <IndicatorCard indicator={ind} variant="habitat" active={ui.envIndicator === ind.id} onopen={() => (ui.envIndicator = ind.id)} />
      {/each}
    </div>
  </section>

  <!-- Accumulated dose (AC-CLIN-05, CU-08): integral of CANS dose rate across mission days. -->
  <section class="panel" aria-labelledby="dose-h">
    <h2 id="dose-h" class="label">Accumulated Radiation Dose · Habitat Module</h2>
    <dl class="dose num">
      <div class="st {dose.careerFraction >= 1 ? 'critical' : dose.careerFraction >= 0.8 ? 'caution' : 'nominal'}">
        <dt class="label">Mission Cumulative</dt>
        <dd><span class="sym" aria-hidden="true"></span> {fmt(dose.missionMsv, 1)} <small class="unit">mSv · {fmt(dose.careerFraction * 100, 0)}% of career limit ({CAREER_LIMIT_MSV} mSv)</small></dd>
      </div>
      <div>
        <dt class="label">Last 24h</dt>
        <dd>{fmt(dose.lastDayMsv, 2)} <small class="unit">mSv</small></dd>
      </div>
      <div class="st {dose.speDays ? (dose.speFraction >= 1 ? 'critical' : 'caution') : 'nominal'}">
        <dt class="label">Active SPE Event</dt>
        <dd><span class="sym" aria-hidden="true"></span> {#if dose.speDays}{fmt(dose.speEventMsv, 1)} <small class="unit">mSv over {dose.speDays} d · limit {SPE_EVENT_LIMIT_MSV} mSv</small>{:else}No active event{/if}</dd>
      </div>
    </dl>
    <p class="muted small">Integrates equivalent dose rate (µSv/h) day by day across the habitat module; individual dose varies with storm shielding and crew dosimetry.</p>
  </section>

  <section class="panel" aria-labelledby="envt-h">
    <h2 id="envt-h" class="label">Trend · {current ? indLabel(current) : ''}</h2>
    {#if survival}
      <table class="tab num">
        <thead><tr><th>Flight Day</th><th>{current ? indShort(current) : ''} ({current?.unit ?? ''})</th></tr></thead>
        <tbody>
          {#each hab.slice(-7).reverse() as h (h.day)}
            <tr><td>{fd(h.day)}</td><td>{fmt(h[ui.envIndicator as HabitatIndicator] as number, current?.decimals ?? 1)}</td></tr>
          {/each}
        </tbody>
      </table>
    {:else if days.length}
      <TrendChart indicator={ui.envIndicator} {days} {values} />
    {/if}
  </section>

  <section class="panel" aria-labelledby="enva-h">
    <h2 id="enva-h" class="label">Environmental Alerts</h2>
    {#if envAlerts.length}
      <ul class="stack list">
        {#each envAlerts as al (al.id)}
          <li>
            <button type="button" class="btn st {al.status} alert" onclick={() => ui.openProtocol(al.id, al.region)}>
              <span class="sym" aria-hidden="true"></span>
              <span class="txt"><strong>{al.ruleId}</strong> {al.explanation}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="st nominal"><span class="sym" aria-hidden="true"></span> Habitat telemetry within nominal NASA-STD-3001 bounds.</p>
    {/if}
  </section>
</div>

<style>
  .env { display: flex; flex-direction: column; gap: var(--gap); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--gap); margin-top: 8px; }
  .list { list-style: none; margin: 8px 0 0; padding: 0; }
  .alert { width: 100%; justify-content: flex-start; text-align: left; height: auto; padding: 10px 14px; border-color: var(--st); }
  .alert .sym { color: var(--st-text); }
  .st.critical .txt { color: var(--alert-red-text); }
  .st.nominal .sym { color: var(--alert-green); }
  .dose { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--gap); margin: 8px 0; }
  .dose dd { margin: 4px 0 0; font-size: 1.25rem; font-weight: 700; }
  .dose .st .sym { color: var(--st-text); }
  .small { font-size: 0.875rem; }
  .tab { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .tab th, .tab td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); }
</style>
