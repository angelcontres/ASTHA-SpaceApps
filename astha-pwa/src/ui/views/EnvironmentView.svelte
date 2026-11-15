<script lang="ts">
  // Pestaña 2 · Entorno ECLSS y dosimetría CANS (RF-DSH-04, COMP-03B): 6 parámetros con semáforo, tendencia y
  // alertas ambientales activas.
  import type { HabitatIndicator } from '../../engine/types';
  import IndicatorCard from '../components/IndicatorCard.svelte';
  import TrendChart from '../components/TrendChart.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import { fmt, ui } from '../bridge/uiState.svelte';

  interface Props { survival: boolean }
  let { survival }: Props = $props();

  const hab = $derived(bridge.series.habitat);
  const days = $derived(hab.map((h) => h.day));
  const values = $derived(hab.map((h) => (h[ui.envIndicator as HabitatIndicator] ?? null) as number | null));
  const current = $derived(bridge.habitatTelemetry.indicators.find((i) => i.id === ui.envIndicator));
  const envAlerts = $derived(bridge.activeAlerts.filter((a) => (a.organ === 'respiratory_env' || a.organ === 'radiation') && !a.overridden));
</script>

<div class="env">
  <section aria-labelledby="env-h">
    <h2 id="env-h" class="label">Soporte vital ECLSS y dosimetría CANS · {bridge.habitatTelemetry.day ? `FD-${bridge.habitatTelemetry.day}` : ''}</h2>
    <div class="grid">
      {#each bridge.habitatTelemetry.indicators as ind (ind.id)}
        <IndicatorCard indicator={ind} variant="habitat" active={ui.envIndicator === ind.id} onopen={() => (ui.envIndicator = ind.id)} />
      {/each}
    </div>
  </section>

  <section class="panel" aria-labelledby="envt-h">
    <h2 id="envt-h" class="label">Tendencia · {current?.label}</h2>
    {#if survival}
      <table class="tab num">
        <thead><tr><th>Día</th><th>{current?.short} ({current?.unit})</th></tr></thead>
        <tbody>
          {#each hab.slice(-7).reverse() as h (h.day)}
            <tr><td>FD-{h.day}</td><td>{fmt(h[ui.envIndicator as HabitatIndicator] as number, current?.decimals ?? 1)}</td></tr>
          {/each}
        </tbody>
      </table>
    {:else if days.length}
      <TrendChart indicator={ui.envIndicator} {days} {values} />
    {/if}
  </section>

  <section class="panel" aria-labelledby="enva-h">
    <h2 id="enva-h" class="label">Alertas ambientales</h2>
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
      <p class="st nominal"><span class="sym" aria-hidden="true"></span> Hábitat dentro de los rangos nominales.</p>
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
  .tab { width: 100%; border-collapse: collapse; }
  .tab th, .tab td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); }
</style>
