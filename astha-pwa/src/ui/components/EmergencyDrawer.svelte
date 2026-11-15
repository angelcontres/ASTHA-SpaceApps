<script lang="ts">
  // Right-edge peek drawer for quick Emergency Records & Active Protocols inspection.
  import { STATUS_LABEL, SYSTEM_LABEL, ui } from '../bridge/uiState.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import HudIcon from './HudIcon.svelte';

  const alerts = $derived(
    bridge.activeAlerts.filter((a) => !a.overridden && a.status !== 'nominal'),
  );
  const recentRecords = $derived([...bridge.ledgerEntries].reverse().slice(0, 6));

  function close() {
    ui.emergencyOpen = false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="em-layer">
  <button type="button" class="em-scrim" aria-label="Close emergency drawer" onclick={close}></button>
  <div
    class="em-drawer panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="em-drawer-h"
    tabindex="-1"
  >
    <header class="em-head">
      <div class="em-title">
        <HudIcon name="alert" size={18} />
        <div>
          <h2 id="em-drawer-h">Emergency &amp; Records</h2>
          <span class="label">{alerts.length} active alert{alerts.length === 1 ? '' : 's'} · {bridge.ledgerEntries.length} ledger entries</span>
        </div>
      </div>
      <button type="button" class="btn icon" aria-label="Close emergency drawer" onclick={close}>
        <HudIcon name="x" size={18} />
      </button>
    </header>

    <section class="em-sec stack" aria-label="Active alerts">
      <div class="sec-row">
        <span class="label">Active Alerts &amp; Protocols</span>
        <button type="button" class="btn compact" onclick={() => { ui.tab = 'triage'; close(); }}>
          Open Triage <HudIcon name="arrow-right" size={14} />
        </button>
      </div>

      {#if alerts.length === 0}
        <div class="panel st nominal em-empty">
          <span class="sym" aria-hidden="true"></span>
          <div>
            <strong>All Systems Nominal</strong>
            <p class="small muted">0 active emergency alerts across crew and ECLSS habitat.</p>
          </div>
        </div>
      {:else}
        <ul class="em-list stack">
          {#each alerts as al (al.id)}
            <li class="panel st {al.status} em-card">
              <div class="em-card-top">
                <span class="label">
                  <span class="sym" aria-hidden="true"></span>
                  {STATUS_LABEL[al.status]} · {al.ruleId} · {al.crewId === 'HAB' ? 'Habitat' : al.crewId}
                </span>
                <span class="hud-tag">{SYSTEM_LABEL[al.organ]}</span>
              </div>
              <p class="em-exp">{al.explanation}</p>
              <div class="row em-actions">
                <button type="button" class="btn primary compact" onclick={() => ui.openProtocol(al.id, al.region)}>
                  Open Protocol
                </button>
                {#if al.urgency === 'emergency' || al.status === 'critical'}
                  <button
                    type="button"
                    class="btn danger compact"
                    onclick={() => { ui.codeRedId = al.id; close(); }}
                  >
                    Code Red View
                  </button>
                {/if}
                {#if !al.acknowledged && bridge.activeRole}
                  <button type="button" class="btn compact" onclick={() => bridge.acknowledge(al)}>
                    Acknowledge
                  </button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="em-sec stack" aria-label="Recent event records">
      <div class="sec-row">
        <span class="label">Recent Bitácora Records</span>
        <button type="button" class="btn compact" onclick={() => { ui.tab = 'sim'; close(); }}>
          Full Ledger <HudIcon name="arrow-right" size={14} />
        </button>
      </div>
      {#if recentRecords.length === 0}
        <p class="muted small">No recorded emergency or telemetry events yet.</p>
      {:else}
        <ol class="em-records">
          {#each recentRecords as rec (rec.key)}
            <li>
              <span class="num unit">#{rec.seq} · {new Date(Number(rec.hlc.split(':')[0])).toLocaleTimeString()}</span>
              <strong>{rec.type}</strong>{#if rec.crewId} · {rec.crewId}{/if}
              <span class="rec-detail">
                {#if rec.detail}
                  {rec.detail}
                {:else}
                  <HudIcon name="lock" size={12} /> encrypted
                {/if}
              </span>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  </div>
</div>

<style>
  .em-layer {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    justify-content: flex-end;
  }
  .em-scrim {
    position: fixed;
    inset: 0;
    border: 0;
    padding: 0;
    margin: 0;
    background: rgba(2, 6, 14, 0.52);
    backdrop-filter: blur(2px);
    cursor: pointer;
    animation: backdropFade 180ms ease-out;
  }
  .em-drawer {
    position: relative;
    z-index: 1;
    width: min(440px, 94vw);
    height: 100%;
    border-radius: 0;
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
    border-left: 2px solid var(--alert-red);
    background: var(--space-900);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    box-shadow: -12px 0 36px rgba(0, 0, 0, 0.55);
    animation: drawerPeekRight 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .em-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .em-title { display: flex; align-items: center; gap: 10px; color: var(--alert-red-text); }
  .em-title h2 { margin: 0; font-size: 1.05rem; color: var(--text); }
  .sec-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .btn.compact { min-height: var(--touch); padding: 4px 12px; font-size: 0.85rem; }
  .em-empty { display: flex; align-items: center; gap: 10px; padding: 12px; }
  .em-empty p { margin: 2px 0 0; }
  .em-list { list-style: none; margin: 0; padding: 0; }
  .em-card { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; }
  .em-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .em-exp { margin: 0; font-size: 0.9rem; line-height: 1.35; }
  .em-actions { gap: 6px; }
  .em-records { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .em-records li {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
    padding: 6px 8px;
    background: var(--space-800);
    border: 1px solid var(--border);
    border-radius: var(--radius-btn);
    font-size: 0.85rem;
  }
  .rec-detail { color: var(--muted); }
  @keyframes drawerPeekRight {
    from { opacity: 0.4; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes backdropFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .em-scrim, .em-drawer { animation: none; }
  }
</style>
