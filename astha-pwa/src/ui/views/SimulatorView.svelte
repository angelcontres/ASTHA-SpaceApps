<script lang="ts">
  // Pestaña 4 · Simulador de crisis (RF-SIM-01..05, COMP-06), bitácora append-only (RF-REG-01), prueba de SEU
  // (RNF-SEC-03) y exportación JSON firmada para el enlace con Tierra (RF-REG-02, RNF-NET-04).
  import { SCENARIO_IDS, SYNTHETIC, type ScenarioDef, type ScenarioId } from '../../storage/telemetrySources';
  import { power } from '../bridge/power.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import { fd, fmt } from '../bridge/uiState.svelte';

  let target = $state<string>('');
  $effect(() => { if (!target) target = bridge.data.selectedCrew; });

  const scen = (id: ScenarioId) => SYNTHETIC.scenarios[id] as ScenarioDef;
  const allowed = $derived(bridge.data.crew.filter((c) => bridge.data.session?.allowedCrew.includes(c.id)));
  const maxLatency = $derived(Math.max(0, ...bridge.assessments.map((a) => a.latencyMs)));
  const ledger = $derived([...bridge.ledgerEntries].reverse());

  async function importFile(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (f) bridge.importData(await f.text());
  }
</script>

<div class="sim">
  <section class="panel stack" aria-labelledby="sc-h">
    <h2 id="sc-h">Escenarios de crisis</h2>
    <label class="row target">
      <span class="label">Tripulante objetivo</span>
      <select class="btn" bind:value={target}>
        {#each allowed as c (c.id)}<option value={c.id}>{c.id} · {c.name}</option>{/each}
      </select>
    </label>
    <div class="scenarios">
      {#each SCENARIO_IDS as id (id)}
        {@const s = scen(id)}
        <button type="button" class="btn scenario" class:active={bridge.data.activeScenarios.includes(id)} onclick={() => bridge.injectScenario(id, target)}>
          <strong>{id} · {s.label}</strong>
          <span class="unit">{s.req}{s.allCrew ? ' · toda la tripulación' : ''}</span>
        </button>
      {/each}
    </div>
    <button type="button" class="btn primary reset" onclick={() => bridge.reset()}>✓ Restablecer estado nominal</button>
  </section>

  <section class="panel stack" aria-labelledby="clk-h">
    <h2 id="clk-h">Tiempo simulado · <span class="num">{fd(bridge.data.day)}</span></h2>
    <div class="row">
      <button type="button" class="btn" onclick={() => bridge.advance(-1)} aria-label="Retroceder un día">−1 día</button>
      <button type="button" class="btn" onclick={() => bridge.advance(1)}>+1 día</button>
      <button type="button" class="btn" onclick={() => bridge.advance(7)}>+7 días</button>
      {#if bridge.data.playing}
        <button type="button" class="btn primary" onclick={() => bridge.pause()}>❚❚ Pausar</button>
      {:else}
        <button type="button" class="btn" onclick={() => bridge.play(3000)}>▶ Reproducir (1 día / 3 s)</button>
      {/if}
    </div>
    <label class="stack">
      <span class="label">Saltar al día</span>
      <input type="range" min="1" max={bridge.data.maxDay} value={bridge.data.day} onchange={(e) => bridge.setDay(+e.currentTarget.value)} />
    </label>
    <dl class="metrics num">
      <div><dt class="label">Motor (4 tripulantes)</dt><dd>{fmt(bridge.engineMs, 2)} ms</dd></div>
      <div><dt class="label">Peor triage individual</dt><dd>{fmt(maxLatency, 2)} ms</dd></div>
      <div><dt class="label">Ciclo acción → UI</dt><dd>{fmt(bridge.cycleMs, 1)} ms</dd></div>
      <div><dt class="label">Presupuesto RNF-PER-01</dt><dd>&lt; 50 ms</dd></div>
    </dl>
  </section>

  <section class="panel stack" aria-labelledby="int-h">
    <h2 id="int-h">Integridad y enlace con Tierra</h2>
    <dl class="metrics num">
      <div><dt class="label">Restaurados desde réplica</dt><dd>{bridge.data.recoveredCount}</dd></div>
      <div><dt class="label">Registros en cuarentena</dt><dd>{bridge.quarantinedCount}</dd></div>
      <div><dt class="label">Sync Hub</dt><dd>{bridge.syncStatus}</dd></div>
      <div><dt class="label">Batería</dt><dd>{power.supported && power.level !== null ? `${Math.round(power.level * 100)} %${power.charging ? ' · cargando' : ''}` : 'API no disponible'}{power.low ? ' · modo crítico' : ''}</dd></div>
      <div><dt class="label">Nodo</dt><dd>{bridge.data.nodeId}</dd></div>
    </dl>
    <div class="row">
      <button type="button" class="btn danger" onclick={() => bridge.injectBitFlip()}>Inyectar SEU (bit-flip)</button>
      <button type="button" class="btn danger" onclick={() => bridge.injectBitFlip(true)}>SEU en sobre y réplica</button>
      <button type="button" class="btn" aria-pressed={power.simulated} onclick={() => power.simulate(!power.simulated)}>
        {power.simulated ? 'Restaurar batería' : 'Simular batería crítica (EPS)'}
      </button>
      <button type="button" class="btn" onclick={() => bridge.verifyLedger()}>Verificar cadena de bitácora</button>
    </div>
    {#if bridge.ledgerChain}
      <p class="st {bridge.ledgerChain.ok ? 'nominal' : 'critical'}" role="status">
        <span class="sym" aria-hidden="true"></span>
        {bridge.ledgerChain.ok ? `Cadena íntegra: ${bridge.ledgerChain.checked} entradas verificadas` : `Cadena rota en ${bridge.ledgerChain.brokenAt}: ${bridge.ledgerChain.reason}`}
      </p>
    {/if}
    <div class="row">
      <button type="button" class="btn" onclick={() => bridge.exportData('summary')}>Resumen para Flight Surgeon</button>
      <button type="button" class="btn" onclick={() => bridge.exportData('history')}>Historial completo</button>
      {#if bridge.lastExport}
        <button type="button" class="btn primary" onclick={() => bridge.downloadExport()}>⬇ {bridge.lastExport.fileName}</button>
      {/if}
    </div>
    <label class="btn file">
      Importar historial firmado (.json)
      <input type="file" accept="application/json,.json" class="sr-only" onchange={importFile} />
    </label>
    <button type="button" class="btn" disabled={bridge.activeRole !== 'cmo'} onclick={() => bridge.loadReferenceDataset()}>
      Load reference dataset (OSD-574-calibrated, 90 days)
    </button>
    <p class="muted small">Offline alternative source bundled with the app. Overrides days 1–90 for the whole crew (CMO only).</p>
  </section>

  <section class="panel log" aria-labelledby="log-h">
    <h2 id="log-h">Bitácora append-only <span class="unit">({bridge.ledgerEntries.length} últimas)</span></h2>
    <ol class="entries">
      {#each ledger as e (e.key)}
        <li>
          <span class="num unit">#{e.seq} · {new Date(Number(e.hlc.split(':')[0])).toLocaleTimeString()}</span>
          <strong>{e.type}</strong>{#if e.crewId} · {e.crewId}{/if}
          <span class="detail">{e.detail ?? '🔒 cifrado (sin acceso)'}</span>
        </li>
      {:else}
        <li class="muted">Sin entradas todavía.</li>
      {/each}
    </ol>
  </section>
</div>

<style>
  .sim { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); }
  .scenarios { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--gap); }
  .scenario { flex-direction: column; align-items: flex-start; height: auto; padding: 10px 14px; text-align: left; }
  .scenario.active { border-color: var(--alert-red); background: var(--critical-fill); }
  .target select { flex: 1; }
  .reset { align-self: flex-start; }
  input[type='range'] { width: 100%; min-height: var(--touch); accent-color: var(--accent); }
  .metrics { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--gap); margin: 0; }
  .metrics dd { margin: 2px 0 0; font-weight: 700; }
  .st.nominal { color: var(--alert-green); }
  .st.critical { color: var(--alert-red-text); }
  .file { position: relative; align-self: flex-start; }
  .log { grid-column: 1 / -1; }
  .entries { list-style: none; margin: 8px 0 0; padding: 0; max-height: 360px; overflow: auto; display: flex; flex-direction: column; gap: 6px; }
  .entries li { display: flex; flex-wrap: wrap; gap: 8px; padding: 6px 8px; border-bottom: 1px solid var(--border); }
  .detail { flex: 1 1 100%; color: var(--text-muted); font-size: 0.9375rem; }
  @media (max-width: 1023px) { .sim { grid-template-columns: 1fr; } }
  .small { font-size: 0.875rem; }
</style>
