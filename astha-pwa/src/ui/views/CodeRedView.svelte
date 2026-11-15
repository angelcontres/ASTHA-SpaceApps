<script lang="ts">
  // Vista B · Código Rojo a pantalla completa (docs/Diseno-UI-UX/01 §4, ADR-013, ADR-017): titular en
  // alert-red-text, borde pulsante de 3 px, protocolo de ≤ 4 pasos, estado de resguardo por tripulante y
  // etapa de escalada. "Silenciar" reconoce la alerta (detiene el tono y queda en la bitácora).
  import { resolveProtocol } from '../../engine/countermeasures';
  import { accumulatedDose, SPE_EVENT_LIMIT_MSV } from '../../engine/dose';
  import CountermeasureGuide from '../components/CountermeasureGuide.svelte';
  import { stopTone } from '../components/AlarmManager.svelte';
  import { bridge, type ActiveAlert } from '../bridge/workerBridge.svelte';
  import { fd, fmt, STATUS_LABEL, ui } from '../bridge/uiState.svelte';

  interface Props { alert: ActiveAlert; locked?: boolean }
  let { alert, locked = false }: Props = $props();

  const protocol = $derived(resolveProtocol(alert.countermeasureId));
  const value = $derived(Object.entries(alert.values).find(([, v]) => typeof v === 'number'));
  const allowed = $derived(new Set(bridge.data.session?.allowedCrew ?? []));
  const isRad = $derived(alert.organ === 'radiation');
  const dose = $derived(isRad ? accumulatedDose(bridge.series.habitat) : null);
  const sheltered = $derived(new Set(alert.completedSteps.filter((s) => s.startsWith('shelter:')).map((s) => s.slice(8))));
  const redactPhi = $derived(locked && alert.crewId !== 'HAB');
  const escStage = $derived(ui.alertStage[alert.id] ?? 1);

  function close() {
    ui.codeRedDismissed = [...ui.codeRedDismissed, alert.id];
    ui.codeRedId = null;
  }
  function silence() {
    stopTone();
    bridge.acknowledge(alert);
  }
  function confirmAll() {
    silence();
    close();
  }
</script>

<div class="codered" class:pulse={!alert.acknowledged} role="alertdialog" aria-modal="true" aria-labelledby="cr-title" aria-describedby="cr-desc">
  <header class="bar st critical pulse">
    <span class="sym big" aria-hidden="true"></span>
    <h1 id="cr-title" class="alarm-title">CODE RED · {redactPhi ? `Cabin Alert (${alert.ruleId})` : (protocol?.title ?? alert.ruleId)}</h1>
    <div class="row">
      {#if !locked && !alert.acknowledged}<button type="button" class="btn danger" onclick={silence}>Silence Chime</button>{/if}
      <button type="button" class="btn" onclick={close}>Close View</button>
    </div>
  </header>

  <p id="cr-desc" class="exposure">
    {#if redactPhi}
      Session locked: unlock with PIN or NFC to view individual biomarkers.
    {:else}
      {#if value}<strong class="num">{value[0]} {fmt(value[1] as number, 1)}</strong> · {/if}
      {alert.explanation} · {fd(alert.day)}
      {#if dose}<br /><strong class="num">SPE Event Dose: {fmt(dose.speEventMsv, 1)} mSv</strong> of {SPE_EVENT_LIMIT_MSV} mSv limit · mission {fmt(dose.missionMsv, 1)} mSv{/if}
    {/if}
  </p>

  <div class="cols">
    {#if protocol && !redactPhi}
      <CountermeasureGuide {protocol} {alert} variant="emergency" oncheck={(s, c, p) => { if (!locked) bridge.checkStep(alert, s, c, p); }} />
    {:else if redactPhi}
      <section class="panel stack">
        <h2 class="alarm-title">Protected Clinical Protocol</h2>
        <p class="muted">Cabin-wide broadcast after 5-min escalation. Close this view or unlock with PIN/NFC to execute countermeasures.</p>
      </section>
    {/if}

    <aside class="panel stack" aria-labelledby="crew-h">
      <h2 id="crew-h" class="label">Crew Shelter Status</h2>
      <ul class="stack crew">
        {#each bridge.data.crew as c (c.id)}
          {@const ok = sheltered.has(c.id)}
          <li class="row">
            <span class="st {ok ? 'nominal' : 'critical'} who"><span class="sym" aria-hidden="true"></span> {c.id}</span>
            <span class="state">{ok ? 'Sheltered / Confirmed' : 'Unconfirmed'}</span>
            {#if !locked && !ok && allowed.has(c.id)}
              <button type="button" class="btn" onclick={() => bridge.checkStep(alert, `shelter:${c.id}`, true)}>Confirm</button>
            {/if}
          </li>
        {/each}
      </ul>
      <h2 class="label">Automatic Escalation</h2>
      <ol class="esc">
        <li class:on={escStage >= 1}>0-8 s · gentle local advisory chime</li>
        <li class:on={escStage >= 2}>2 min · CMO console escalation</li>
        <li class:on={escStage >= 3}>5 min · full cabin broadcast</li>
      </ol>
      <p class="muted small">Status: {STATUS_LABEL[alert.status]}{alert.acknowledged ? ' · acknowledged' : ' · unacknowledged'}</p>
    </aside>
  </div>

  {#if !locked}
    <button type="button" class="btn danger confirm" onclick={confirmAll}>Confirm Shelter Completed</button>
  {/if}
</div>

<style>
  .codered {
    position: fixed;
    inset: 0;
    z-index: 100;
    overflow: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    background: var(--space-950);
    border: 3px solid var(--alert-red);
  }
  .bar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--gap); padding: 12px; border: 3px solid var(--alert-red); border-radius: var(--radius); background-image: var(--st-fill); }
  .bar h1 { flex: 1 1 300px; }
  .big { font-size: 2rem; color: var(--alert-red-text); }
  .exposure { color: var(--alert-red-text); font-size: 1.0625rem; }
  .cols { display: grid; grid-template-columns: 3fr 2fr; gap: var(--gap); }
  .crew { list-style: none; margin: 0; padding: 0; }
  .crew li { justify-content: space-between; }
  .who { font-weight: 700; min-width: 70px; }
  .st.nominal .sym, .st.nominal { color: var(--alert-green); }
  .st.critical.who { color: var(--alert-red-text); }
  .state { flex: 1; }
  .esc { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
  .esc .on { color: var(--alert-red-text); font-weight: 700; }
  .small { font-size: 0.875rem; }
  .confirm { align-self: center; min-height: 56px; padding: 0 28px; font-size: 1.0625rem; }
  @media (max-width: 1023px) { .cols { grid-template-columns: 1fr; } }
</style>
