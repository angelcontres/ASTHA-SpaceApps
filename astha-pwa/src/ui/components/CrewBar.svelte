<script lang="ts">
  // Selector de tripulante y línea de tiempo de misión (COMP-01, RF-DSH-03). Muestra el semáforo global de cada
  // tripulante (doble codificación) y solo permite abrir a los que la sesión puede descifrar (ADR-012).
  import { bridge } from '../bridge/workerBridge.svelte';
  import { fd, ROLE_LABEL, STATUS_LABEL } from '../bridge/uiState.svelte';

  const allowed = $derived(new Set(bridge.data.session?.allowedCrew ?? []));
  const pct = $derived((bridge.data.day / bridge.data.maxDay) * 100);
  const marks = [1, 14, 30, 60, 90, 120, 150, 180];
</script>

<nav class="crewbar" aria-label="Tripulación y línea de tiempo">
  <div class="row crew" role="group" aria-label="Tripulantes">
    {#each bridge.data.crew as c (c.id)}
      {@const st = bridge.crewStatus[c.id] ?? 'none'}
      <button
        type="button"
        class="btn member st {st}"
        aria-pressed={bridge.data.selectedCrew === c.id}
        disabled={!allowed.has(c.id)}
        aria-label="{c.id} {c.name}, {ROLE_LABEL[c.role]}, {STATUS_LABEL[st]}{allowed.has(c.id) ? '' : ', sin acceso'}"
        onclick={() => bridge.selectCrew(c.id)}
      >
        <span class="sym" aria-hidden="true"></span>
        <span class="num">{c.id}</span>
        <span class="name">{c.name.split(' ').slice(-1)[0]}</span>
      </button>
    {/each}
  </div>
  <div class="timeline" aria-label="Día de misión {bridge.data.day} de {bridge.data.maxDay}">
    <div class="track"><div class="fill" style="width:{pct}%"></div><div class="base" style="width:{(14 / 180) * 100}%"></div></div>
    <div class="marks label">
      {#each marks as m (m)}<span style="left:{((m - 1) / 179) * 100}%" class:now={Math.abs(m - bridge.data.day) < 3}>{fd(m)}</span>{/each}
    </div>
  </div>
</nav>

<style>
  .crewbar { display: flex; flex-wrap: wrap; gap: var(--gap); align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--border); }
  .member { border-color: var(--st); }
  .member .sym { color: var(--st-text); }
  .member[aria-pressed='true'] { outline: 3px solid var(--accent); outline-offset: 2px; }
  .name { font-weight: 500; }
  .timeline { flex: 1 1 280px; min-width: 240px; }
  .track { position: relative; height: 8px; background: var(--space-800); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
  .fill { position: absolute; inset: 0 auto 0 0; background: color-mix(in srgb, var(--accent) 55%, transparent); }
  .base { position: absolute; inset: 0 auto 0 0; border-right: 2px dashed var(--text-muted); }
  .marks { position: relative; height: 18px; margin-top: 4px; }
  .marks span { position: absolute; translate: -50% 0; white-space: nowrap; }
  .marks span:first-child { translate: 0 0; }
  .marks span:last-child { translate: -100% 0; }
  .marks .now { color: var(--accent); }
  @media (max-width: 767px) { .name, .marks span:nth-child(even) { display: none; } }
</style>
