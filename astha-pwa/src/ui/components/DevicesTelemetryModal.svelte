<script lang="ts">
  // Connected Devices, Sync Hub Topology & Multi-Input Telemetry Connections Modal (ADR-008, ADR-016, ADR-020).
  import { ui } from '../bridge/uiState.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import HudIcon from './HudIcon.svelte';

  const SYNC_LABEL = {
    disabled: 'Autonomous (Offline)',
    offline: 'Hub Offline',
    connecting: 'Connecting...',
    online: 'Sync OK',
    unauthorized: 'Not Enrolled (4401)',
  } as const;

  const SYNC_CLASS = {
    disabled: 'nominal',
    offline: 'caution',
    connecting: 'caution',
    online: 'nominal',
    unauthorized: 'critical',
  } as const;

  const CHANNELS = [
    {
      name: 'External Wearable / Suit Bridge',
      contract: 'POST /ingest/telemetry -> adaptIngest()',
      status: 'Ready',
      detail: 'Normalizes Astroskin, BLE gateways, or CSV/JSON bridges into daily CRDT ops (RF-ING-05 flags suspect readings without discarding).',
    },
    {
      name: 'Habitat ECLSS & CANS Bus',
      contract: 'habitatTelemetry -> adaptIngest()',
      status: 'Active',
      detail: 'Captures ppCO2, cabin pressure, O2 %, and CANS neutron dose rate across 6 environmental parameters.',
    },
    {
      name: 'Crew Self-Report & Symptoms',
      contract: 'EntrySymptomPad -> manualEntry / symptom',
      status: 'Active',
      detail: '9 physiological vitals + 5 one-tap neurological/orthostatic symptoms on Tab 1 (Screen 04).',
    },
    {
      name: 'NASA OSDR 90-Day Reference',
      contract: 'reference_telemetry_90d.json -> adaptReferenceDataset()',
      status: 'Bundled',
      detail: 'Offline OSD-574 calibrated dataset (4 subjects x 90 days) loadable by CMO from Tab 4.',
    },
    {
      name: 'Signed DSN Mission Package',
      contract: 'parseImport() -> Ed25519 + SHA-256',
      status: 'Active',
      detail: 'Replays cryptographically verified JSON exports across disconnected devices or ground handoff.',
    },
  ] as const;

  let jsonError = $state('');
  let customJson = $state('');

  const defaultPayload = $derived(
    JSON.stringify(
      {
        crewId: bridge.data.selectedCrew || 'C001',
        measurement: {
          missionDay: bridge.data.day || 1,
          hr: 76,
          hrvRmssd: 44.5,
          pas: 122,
          pad: 78,
          spo2: 97.4,
          glucose: 94,
          tempC: 36.8,
          sleepHours: 7.2,
          mood: 8,
        },
        habitat: {
          missionDay: bridge.data.day || 1,
          ppCo2Mmhg: 1.6,
          cabinPressureKpa: 101.3,
          o2Percent: 20.9,
          radiationUSvH: 1.4,
        },
        symptoms: [],
      },
      null,
      2,
    ),
  );

  $effect(() => {
    if (!customJson) customJson = defaultPayload;
  });

  // Merge live Hub enrolled IDs with peer author nodes observed in CRDT envelopes.
  const devices = $derived.by(() => {
    const map = new Map<string, { id: string; isSelf: boolean; enrolled: boolean; envelopes: number }>();
    const enrolledSet = new Set(bridge.hubHealth?.enrolledDeviceIds ?? []);
    if (bridge.data.nodeId) {
      map.set(bridge.data.nodeId, {
        id: bridge.data.nodeId,
        isSelf: true,
        enrolled: enrolledSet.has(bridge.data.nodeId) || bridge.syncStatus === 'online',
        envelopes: 0,
      });
    }
    for (const id of enrolledSet) {
      const prev = map.get(id);
      map.set(id, { id, isSelf: prev?.isSelf ?? id === bridge.data.nodeId, enrolled: true, envelopes: prev?.envelopes ?? 0 });
    }
    for (const peer of bridge.data.peerNodes) {
      const prev = map.get(peer.nodeId);
      map.set(peer.nodeId, {
        id: peer.nodeId,
        isSelf: prev?.isSelf ?? peer.isSelf,
        enrolled: prev?.enrolled ?? enrolledSet.has(peer.nodeId),
        envelopes: peer.envelopes,
      });
    }
    return [...map.values()].sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.id.localeCompare(b.id));
  });

  function sendIngest() {
    jsonError = '';
    try {
      const parsed = JSON.parse(customJson || defaultPayload) as unknown;
      bridge.ingestTelemetry(parsed);
    } catch (e) {
      jsonError = e instanceof Error ? e.message : 'Invalid JSON payload';
    }
  }

  function close() {
    ui.devicesOpen = false;
  }

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="dm-layer">
  <button type="button" class="dm-scrim" aria-label="Close devices modal" onclick={close}></button>
  <div class="dm-modal panel stack" role="dialog" aria-modal="true" aria-labelledby="dm-h" tabindex="-1">
    <header class="dm-head">
      <div>
        <h2 id="dm-h">Connected Devices &amp; Telemetry Links</h2>
        <p class="label">
          Local Node <span class="num">{bridge.data.nodeId || '—'}</span> · Sync: {SYNC_LABEL[bridge.syncStatus]}
        </p>
      </div>
      <div class="row">
        <button type="button" class="btn" onclick={() => bridge.refreshHubHealth()}>Refresh Hub</button>
        <button type="button" class="btn icon" aria-label="Close devices modal" onclick={close}>
          <HudIcon name="x" size={18} />
        </button>
      </div>
    </header>

    <section class="card stack" aria-labelledby="dm-hub">
      <div class="row-between">
        <h3 id="dm-hub" class="label">Sync Hub &amp; Active Crew Devices ({devices.length})</h3>
        <span class="pill st {SYNC_CLASS[bridge.syncStatus]}">
          <span class="sym" aria-hidden="true"></span>
          {SYNC_LABEL[bridge.syncStatus]}
        </span>
      </div>

      <dl class="hub-stats num">
        <div>
          <dt class="label">Hub Status</dt>
          <dd>{bridge.hubHealth ? `${bridge.hubHealth.status} · v${bridge.hubHealth.hubVersion}` : SYNC_LABEL[bridge.syncStatus]}</dd>
        </div>
        <div>
          <dt class="label">Enrolled Devices</dt>
          <dd>{bridge.hubHealth?.enrolledDevices ?? devices.filter((d) => d.enrolled).length}</dd>
        </div>
        <div>
          <dt class="label">Op-Log Sequence</dt>
          <dd>{bridge.hubHealth?.oplogSequence ?? '—'}</dd>
        </div>
        <div>
          <dt class="label">Auto-Enroll Policy</dt>
          <dd>{bridge.hubHealth ? (bridge.hubHealth.autoEnroll ? 'ON (Demo)' : 'Allow-list') : 'Local'}</dd>
        </div>
        <div>
          <dt class="label">Ingested Ext. Ops</dt>
          <dd>{bridge.data.ingestCount}</dd>
        </div>
      </dl>

      <div class="dev-grid">
        {#each devices as d (d.id)}
          <div class="dev-card st {d.enrolled ? 'nominal' : 'caution'}">
            <div class="row-between">
              <strong class="num">{d.id}</strong>
              <span class="tag">{d.isSelf ? 'This Device' : 'Peer Node'}</span>
            </div>
            <p class="muted small">
              <span class="sym" aria-hidden="true"></span>
              {d.enrolled ? 'Enrolled (Ed25519)' : 'Local / Pending Hub'} · {d.envelopes} envelopes
            </p>
          </div>
        {/each}
      </div>

      {#if bridge.data.enrollment}
        <details class="subcap">
          <summary class="label">This Device Enrollment Record (ADR-020)</summary>
          {#if bridge.data.enrollment.alg !== 'Ed25519'}
            <p class="err small">Browser signs with {bridge.data.enrollment.alg}; Sync Hub accepts Ed25519 only.</p>
          {/if}
          <pre class="num">{JSON.stringify({ deviceId: bridge.data.enrollment.deviceId, publicJwk: bridge.data.enrollment.publicJwk })}</pre>
          <button
            type="button"
            class="btn"
            onclick={() => navigator.clipboard?.writeText(JSON.stringify({ deviceId: bridge.data.enrollment!.deviceId, publicJwk: bridge.data.enrollment!.publicJwk }))}
          >
            Copy for devices.json
          </button>
        </details>
      {/if}
    </section>

    <section class="card stack" aria-labelledby="dm-tel">
      <h3 id="dm-tel" class="label">Telemetry Input Connections (Multi-Source Adapter Boundary)</h3>
      <div class="ch-grid">
        {#each CHANNELS as ch (ch.name)}
          <div class="ch-card">
            <div class="row-between">
              <strong>{ch.name}</strong>
              <span class="pill st nominal"><span class="sym" aria-hidden="true"></span> {ch.status}</span>
            </div>
            <code class="contract num">{ch.contract}</code>
            <p class="muted small">{ch.detail}</p>
          </div>
        {/each}
      </div>

      <details class="subcap">
        <summary class="label">Test External Telemetry Feed (JSON Ingest)</summary>
        <p class="muted small">
          Simulates any wearable/ECLSS gateway dispatching a <code>POST /ingest/telemetry</code> frame into the Data Worker (<code>adaptIngest()</code> + <code>validateValue()</code>).
        </p>
        <textarea class="json-box num" rows="9" aria-label="External telemetry JSON payload" bind:value={customJson}></textarea>
        {#if jsonError}<p class="err small">{jsonError}</p>{/if}
        <div class="row">
          <button type="button" class="btn primary" onclick={sendIngest}>Send Telemetry Frame</button>
          <button type="button" class="btn" onclick={() => { jsonError = ''; customJson = defaultPayload; }}>Reset Sample JSON</button>
        </div>
      </details>
    </section>
  </div>
</div>

<style>
  .dm-layer { position: fixed; inset: 0; z-index: 95; display: grid; place-items: center; padding: 16px; }
  .dm-scrim {
    position: fixed;
    inset: 0;
    border: 0;
    margin: 0;
    padding: 0;
    background: rgba(2, 6, 14, 0.72);
    backdrop-filter: blur(3px);
    cursor: pointer;
  }
  .dm-modal {
    position: relative;
    z-index: 1;
    width: min(920px, 96vw);
    max-height: 90vh;
    overflow: auto;
    padding: 18px;
    background: var(--space-900);
    border: 2px solid var(--accent);
    box-shadow: 0 20px 56px rgba(0, 0, 0, 0.65);
  }
  .dm-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .dm-head h2 { margin: 0 0 2px; font-size: 1.15rem; }
  .card { padding: 12px; background: var(--space-800); border: 1px solid var(--border); border-radius: var(--radius); }
  .row-between { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--st); border-radius: 999px; font-size: 0.8125rem; font-weight: 700; }
  .pill.st.nominal { color: var(--alert-green); }
  .pill.st.caution { color: var(--alert-yellow); }
  .pill.st.critical { color: var(--alert-red-text); }
  .hub-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; margin: 0; }
  .hub-stats dd { margin: 2px 0 0; font-weight: 700; }
  .dev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .dev-card { padding: 10px 12px; border: 1px solid var(--border); border-left: 3px solid var(--st); border-radius: var(--radius-btn); background: var(--space-900); }
  .tag { font-size: 0.75rem; color: var(--accent); font-weight: 700; }
  .ch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
  .ch-card { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-btn); background: var(--space-900); display: flex; flex-direction: column; gap: 6px; }
  .contract { font-size: 0.78rem; color: var(--accent); }
  .subcap { border: 1px solid var(--border); border-radius: var(--radius-btn); padding: 6px 12px; background: var(--space-900); }
  .subcap summary { cursor: pointer; min-height: var(--touch); display: flex; align-items: center; }
  .subcap pre { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 0.8125rem; margin: 8px 0; }
  .json-box { width: 100%; padding: 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-btn); background: var(--space-950); color: var(--text); font-size: 0.8125rem; resize: vertical; }
  .err { color: var(--alert-red-text); }
  .small { font-size: 0.875rem; }
</style>
