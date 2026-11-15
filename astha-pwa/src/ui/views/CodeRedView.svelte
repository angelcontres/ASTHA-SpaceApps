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

  interface Props { alert: ActiveAlert }
  let { alert }: Props = $props();

  const protocol = $derived(resolveProtocol(alert.countermeasureId));
  const value = $derived(Object.entries(alert.values).find(([, v]) => typeof v === 'number'));
  const allowed = $derived(new Set(bridge.data.session?.allowedCrew ?? []));
  const isRad = $derived(alert.organ === 'radiation');
  const dose = $derived(isRad ? accumulatedDose(bridge.series.habitat) : null);
  const sheltered = $derived(new Set(alert.completedSteps.filter((s) => s.startsWith('shelter:')).map((s) => s.slice(8))));

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

<div class="codered" role="alertdialog" aria-modal="true" aria-labelledby="cr-title" aria-describedby="cr-desc">
  <header class="bar st critical pulse">
    <span class="sym big" aria-hidden="true"></span>
    <h1 id="cr-title" class="alarm-title">CÓDIGO ROJO · {protocol?.title ?? alert.ruleId}</h1>
    <div class="row">
      {#if !alert.acknowledged}<button type="button" class="btn danger" onclick={silence}>Silenciar 960 Hz</button>{/if}
      <button type="button" class="btn" onclick={close}>Cerrar vista</button>
    </div>
  </header>

  <p id="cr-desc" class="exposure">
    {#if value}<strong class="num">{value[0]} {fmt(value[1] as number, 1)}</strong> · {/if}
    {alert.explanation} · {fd(alert.day)}
    {#if dose}<br /><strong class="num">Dosis del evento SPE: {fmt(dose.speEventMsv, 1)} mSv</strong> de {SPE_EVENT_LIMIT_MSV} mSv permitidos · misión {fmt(dose.missionMsv, 1)} mSv{/if}
  </p>

  <div class="cols">
    {#if protocol}
      <CountermeasureGuide {protocol} {alert} variant="emergency" oncheck={(s, c, p) => bridge.checkStep(alert, s, c, p)} />
    {/if}

    <aside class="panel stack" aria-labelledby="crew-h">
      <h2 id="crew-h" class="label">Estado de resguardo por tripulante</h2>
      <ul class="stack crew">
        {#each bridge.data.crew as c (c.id)}
          {@const ok = sheltered.has(c.id)}
          <li class="row">
            <span class="st {ok ? 'nominal' : 'critical'} who"><span class="sym" aria-hidden="true"></span> {c.id}</span>
            <span class="state">{ok ? 'En refugio / confirmado' : 'Sin confirmar'}</span>
            {#if !ok && allowed.has(c.id)}
              <button type="button" class="btn" onclick={() => bridge.checkStep(alert, `shelter:${c.id}`, true)}>Confirmar</button>
            {/if}
          </li>
        {/each}
      </ul>
      <h2 class="label">Escalada automática (ADR-013)</h2>
      <ol class="esc">
        <li class="on">0-10 s · tono local 960 Hz</li>
        <li>2 min · consola del CMO</li>
        <li>5 min · difusión a cabina</li>
      </ol>
      <p class="muted small">Estado: {STATUS_LABEL[alert.status]}{alert.acknowledged ? ' · reconocida' : ' · sin reconocer'}</p>
    </aside>
  </div>

  <button type="button" class="btn danger confirm" onclick={confirmAll}>Confirmar resguardo completado</button>
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
