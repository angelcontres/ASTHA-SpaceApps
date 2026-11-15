<script lang="ts">
  // Bio-Passport & Signed DSN Export Modal (UI-10, docs/Diseno-UI-UX/03 §3, ADR-010, ADR-012):
  // Longitudinal milestone review from L-44 pre-flight baseline through FD-180 / R+1 recovery,
  // paired with one-tap Ed25519 signed JSON packaging for offline Earth/DSN downlink.
  import { fd, fmt, indShort, missionPhase, ROLE_LABEL, STATUS_LABEL, ui } from '../bridge/uiState.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import HudIcon from './HudIcon.svelte';

  const MILESTONES = [
    { code: 'L-44', day: 1, title: 'Pre-flight Baseline', detail: '14-day ground baseline reference' },
    { code: 'FD-01', day: 15, title: 'Orbit Insertion', detail: 'Early microgravity fluid shift' },
    { code: 'FD-30', day: 30, title: '30-Day Adaptation', detail: 'SANS & orthostatic monitoring' },
    { code: 'FD-90', day: 90, title: 'Mid-Mission Audit', detail: 'DEXA / urinary calcium drift check' },
    { code: 'FD-180 / R+1', day: 180, title: 'Recovery Handoff', detail: 'Full longitudinal Bio-Passport' },
  ] as const;

  let anonymize = $state(false);

  const crew = $derived(bridge.data.crew.find((c) => c.id === bridge.data.selectedCrew));
  const assessment = $derived(bridge.currentAssessment);
  const keyInds = $derived((assessment?.indicators ?? []).filter((i) => !['o2', 'ppco2', 'pressure', 'tempHab', 'rh', 'radiation'].includes(i.id)).slice(0, 8));

  function close() {
    ui.bioPassportOpen = false;
  }

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="bp-layer">
  <button type="button" class="bp-scrim" aria-label="Close Bio-Passport modal" onclick={close}></button>
  <div class="bp-modal panel stack" role="dialog" aria-modal="true" aria-labelledby="bp-h" tabindex="-1">
    <header class="bp-head">
      <div>
        <h2 id="bp-h">Bio-Passport &amp; Ed25519 DSN Export</h2>
        <p class="label">
          {crew ? `${crew.id} · ${crew.name} · ${ROLE_LABEL[crew.role]}` : bridge.data.selectedCrew} · {fd(bridge.data.day)} ({missionPhase(bridge.data.day)})
        </p>
      </div>
      <button type="button" class="btn icon" aria-label="Close Bio-Passport" onclick={close}>
        <HudIcon name="x" size={18} />
      </button>
    </header>

    <section class="stack" aria-label="Longitudinal phases L-44 to R+1">
      <span class="label">Longitudinal Mission Phases (L-44 → FD-180 → R+1)</span>
      <div class="milestones">
        {#each MILESTONES as m (m.code)}
          <button
            type="button"
            class="btn milestone"
            aria-pressed={Math.abs(bridge.data.day - m.day) <= 7}
            onclick={() => bridge.setDay(m.day)}
          >
            <strong class="num">{m.code}</strong>
            <span class="small">{m.title}</span>
            <span class="unit">{m.detail}</span>
          </button>
        {/each}
      </div>
    </section>

    <section class="stack" aria-label="Current physiological snapshot">
      <span class="label">Physiological Snapshot · {fd(bridge.data.day)}</span>
      {#if keyInds.length}
        <dl class="snap-grid">
          {#each keyInds as ind (ind.id)}
            <div class="snap st {ind.status}">
              <dt class="label"><span class="sym" aria-hidden="true"></span> {indShort(ind)}</dt>
              <dd class="num">
                {ind.value === null ? '—' : fmt(ind.value, ind.id === 'temp' || ind.id === 'urineCa' ? 1 : 0)}
                <span class="unit">{ind.unit}</span>
              </dd>
              <dd class="unit">{STATUS_LABEL[ind.status]}</dd>
            </div>
          {/each}
        </dl>
      {:else}
        <p class="muted small">Telemetry restricted for current cryptographic session.</p>
      {/if}
    </section>

    <section class="panel export-box stack" aria-label="Signed DSN Export">
      <div class="export-top">
        <div>
          <h3>Cryptographic Earth/DSN Downlink (Ed25519 + SHA-256)</h3>
          <p class="small muted">Generates an offline signed JSON file for handoff to spacecraft communications router.</p>
        </div>
        <label class="anon">
          <input type="checkbox" bind:checked={anonymize} />
          <span>Anonymize crew IDs</span>
        </label>
      </div>
      <div class="row">
        <button type="button" class="btn primary" onclick={() => bridge.exportData('summary', anonymize)}>
          Export Flight Surgeon Summary
        </button>
        <button type="button" class="btn" onclick={() => bridge.exportData('history', anonymize)}>
          Export Full L-44..R+1 History
        </button>
        {#if bridge.lastExport}
          <button type="button" class="btn primary" onclick={() => bridge.downloadExport()}>
            <HudIcon name="download" size={16} /> Download {bridge.lastExport.fileName}
          </button>
        {/if}
      </div>
    </section>
  </div>
</div>

<style>
  .bp-layer {
    position: fixed;
    inset: 0;
    z-index: 65;
    display: grid;
    place-items: center;
    padding: 16px;
  }
  .bp-scrim {
    position: fixed;
    inset: 0;
    border: 0;
    margin: 0;
    padding: 0;
    background: rgba(2, 6, 14, 0.72);
    backdrop-filter: blur(3px);
    cursor: pointer;
  }
  .bp-modal {
    position: relative;
    z-index: 1;
    width: min(880px, 96vw);
    max-height: 90vh;
    overflow: auto;
    padding: 18px;
    background: var(--space-900);
    border: 2px solid var(--accent);
    box-shadow: 0 20px 56px rgba(0, 0, 0, 0.65);
  }
  .bp-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .bp-head h2 { margin: 0 0 2px; font-size: 1.15rem; }
  .milestones {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--gap);
  }
  .milestone {
    height: auto;
    min-height: var(--touch);
    padding: 10px 12px;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 2px;
  }
  .snap-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--gap);
    margin: 0;
  }
  .snap {
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-left: 3px solid var(--st);
    border-radius: var(--radius-btn);
    background: var(--space-800);
  }
  .snap dd { margin: 2px 0 0; }
  .export-box { background: var(--space-800); }
  .export-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .export-top h3 { margin: 0 0 2px; font-size: 0.95rem; }
  .anon {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--touch);
    padding: 0 10px;
    cursor: pointer;
  }
  .anon input { width: 22px; height: 22px; accent-color: var(--accent); }
  .small { font-size: 0.875rem; }
</style>
