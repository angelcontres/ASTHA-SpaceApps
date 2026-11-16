<script lang="ts">
  // Pestaña 4 · Simulador de crisis (RF-SIM-01..05, COMP-06), bitácora append-only (RF-REG-01), prueba de SEU
  // (RNF-SEC-03) y exportación JSON firmada para el enlace con Tierra (RF-REG-02, RNF-NET-04).
  import { SCENARIO_IDS, SYNTHETIC, type ScenarioDef, type ScenarioId } from '../../storage/telemetrySources';
  import { power } from '../bridge/power.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import { fd, fmt, ui } from '../bridge/uiState.svelte';
  import HudIcon from '../components/HudIcon.svelte';

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
  <section class="panel net-card" aria-labelledby="net-h">
    <div class="net-head">
      <div>
        <h2 id="net-h">Connected Devices &amp; Telemetry Feeds</h2>
        <p class="muted small">
          Sync Hub: <strong>{bridge.syncStatus}</strong> ·
          Enrolled: <strong class="num">{bridge.hubHealth?.enrolledDevices ?? bridge.data.peerNodes.length}</strong> ·
          Node: <code class="num">{bridge.data.nodeId || '—'}</code> ·
          External Ingest Ops: <strong class="num">{bridge.data.ingestCount}</strong>
        </p>
      </div>
      <button type="button" class="btn primary" onclick={() => { ui.devicesOpen = true; bridge.refreshHubHealth(); }}>
        Inspect Devices &amp; Test Telemetry Input
      </button>
    </div>
  </section>

  <section class="panel stack" aria-labelledby="sc-h">
    <h2 id="sc-h">Crisis Scenarios</h2>
    <label class="row target">
      <span class="label">Target crew member</span>
      <select class="btn" bind:value={target}>
        {#each allowed as c (c.id)}<option value={c.id}>{c.id} · {c.name}</option>{/each}
      </select>
    </label>
    <div class="scenarios">
      {#each SCENARIO_IDS as id (id)}
        {@const s = scen(id)}
        <button type="button" class="btn scenario" class:active={bridge.data.activeScenarios.includes(id)} onclick={() => bridge.injectScenario(id, target)}>
          <strong>{id} · {s.label}</strong>
          <span class="unit">{s.req}{s.allCrew ? ' · all crew' : ''}</span>
        </button>
      {/each}
    </div>
    <button type="button" class="btn primary reset" onclick={() => bridge.reset()}><HudIcon name="check" size={16} /> Reset Nominal State</button>
  </section>

  <section class="panel stack" aria-labelledby="clk-h">
    <h2 id="clk-h">Simulated Mission Clock · <span class="num">{fd(bridge.data.day)}</span></h2>
    <div class="row">
      <button type="button" class="btn" onclick={() => bridge.advance(-1)} aria-label="Step back 1 day">−1 day</button>
      <button type="button" class="btn" onclick={() => bridge.advance(1)}>+1 day</button>
      <button type="button" class="btn" onclick={() => bridge.advance(7)}>+7 days</button>
      {#if bridge.data.playing}
        <button type="button" class="btn primary" onclick={() => bridge.pause()}><HudIcon name="pause" size={14} /> Pause</button>
      {:else}
        <button type="button" class="btn" onclick={() => bridge.play(3000)}><HudIcon name="play" size={14} /> Play (1 day / 3 s)</button>
      {/if}
    </div>
    <label class="stack">
      <span class="label">Jump to flight day</span>
      <input type="range" min="1" max={bridge.data.maxDay} value={bridge.data.day} onchange={(e) => bridge.setDay(+e.currentTarget.value)} />
    </label>
    <dl class="metrics num">
      <div><dt class="label">Engine (4 crew)</dt><dd>{fmt(bridge.engineMs, 2)} ms</dd></div>
      <div><dt class="label">Worst individual triage</dt><dd>{fmt(maxLatency, 2)} ms</dd></div>
      <div><dt class="label">Action → UI cycle</dt><dd>{fmt(bridge.cycleMs, 1)} ms</dd></div>
      <div><dt class="label">Engine budget</dt><dd>&lt; 50 ms</dd></div>
    </dl>
  </section>

  <details class="panel capsule" aria-labelledby="int-h">
    <summary id="int-h" class="cap-sum">
      <span>Data Integrity, SEU Faults &amp; Earth Downlink</span>
      <span class="muted small num">Recovered {bridge.data.recoveredCount} · Quarantined {bridge.quarantinedCount}</span>
    </summary>
    <div class="stack cap-body">
      <dl class="metrics num">
        <div><dt class="label">Recovered from replica</dt><dd>{bridge.data.recoveredCount}</dd></div>
        <div><dt class="label">Quarantined records</dt><dd>{bridge.quarantinedCount}</dd></div>
        <div><dt class="label">Sync Hub</dt><dd>{bridge.syncStatus}</dd></div>
        <div><dt class="label">Battery</dt><dd>{power.supported && power.level !== null ? `${Math.round(power.level * 100)}%${power.charging ? ' · charging' : ''}` : 'API unavailable'}{power.low ? ' · critical mode' : ''}</dd></div>
        <div><dt class="label">Node</dt><dd>{bridge.data.nodeId}</dd></div>
      </dl>
      <div class="row">
        <button type="button" class="btn danger" onclick={() => bridge.injectBitFlip()}>Inject SEU (bit-flip)</button>
        <button type="button" class="btn danger" onclick={() => bridge.injectBitFlip(true)}>SEU in envelope &amp; replica</button>
        <button type="button" class="btn" aria-pressed={power.simulated} onclick={() => power.simulate(!power.simulated)}>
          {power.simulated ? 'Restore Battery' : 'Simulate Critical Battery (EPS)'}
        </button>
        <button type="button" class="btn" onclick={() => bridge.verifyLedger()}>Verify Ledger Chain</button>
      </div>
      {#if bridge.ledgerChain}
        <p class="st {bridge.ledgerChain.ok ? 'nominal' : 'critical'}" role="status">
          <span class="sym" aria-hidden="true"></span>
          {bridge.ledgerChain.ok ? `Chain intact: ${bridge.ledgerChain.checked} entries verified` : `Chain broken at ${bridge.ledgerChain.brokenAt}: ${bridge.ledgerChain.reason}`}
        </p>
      {/if}
      <div class="row">
        <button type="button" class="btn" onclick={() => bridge.exportData('summary')}>Flight Surgeon Summary</button>
        <button type="button" class="btn" onclick={() => bridge.exportData('history')}>Full Mission History</button>
        {#if bridge.lastExport}
          <button type="button" class="btn primary" onclick={() => bridge.downloadExport()}><HudIcon name="download" size={16} /> {bridge.lastExport.fileName}</button>
        {/if}
      </div>
      <label class="btn file">
        Import signed history (.json)
        <input type="file" accept="application/json,.json" class="sr-only" onchange={importFile} />
      </label>
      <button type="button" class="btn" disabled={bridge.activeRole !== 'cmo'} onclick={() => bridge.loadReferenceDataset()}>
        Load reference dataset (OSD-574-calibrated, 90 days)
      </button>
      <p class="muted small">Offline alternative source bundled with the app. Overrides days 1–90 for the whole crew (CMO only).</p>
    </div>
  </details>

  <details class="panel log capsule" aria-labelledby="log-h">
    <summary id="log-h" class="cap-sum">
      <span>Append-Only Audit Ledger</span>
      <span class="unit num">({bridge.ledgerEntries.length} latest entries)</span>
    </summary>
    <ol class="entries">
      {#each ledger as e (e.key)}
        <li>
          <span class="num unit">#{e.seq} · {new Date(Number(e.hlc.split(':')[0])).toLocaleTimeString()}</span>
          <strong>{e.type}</strong>{#if e.crewId} · {e.crewId}{/if}
          <span class="detail">
            {#if e.detail}
              {e.detail}
            {:else}
              <HudIcon name="lock" size={13} /> encrypted (no access)
            {/if}
          </span>
        </li>
      {:else}
        <li class="muted">No entries yet.</li>
      {/each}
    </ol>
  </details>
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
  .net-card { grid-column: 1 / -1; }
  .net-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .net-head h2 { margin: 0 0 4px; font-size: 1.05rem; }
  .capsule { grid-column: 1 / -1; }
  .cap-sum {
    cursor: pointer;
    min-height: var(--touch);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font-weight: 700;
    list-style: none;
  }
  .cap-sum::-webkit-details-marker { display: none; }
  .cap-body { padding-top: 12px; border-top: 1px solid var(--border); margin-top: 8px; }
</style>
