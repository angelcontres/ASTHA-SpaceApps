<script lang="ts">
  // Vista C · Pantalla de bloqueo y monitor público de cabina (docs/Diseno-UI-UX/01 §5, ADR-014, ADR-015).
  // Antes del PIN solo se muestran el semáforo global por tripulante (sin nombres ni valores clínicos) y los
  // 6 parámetros ECLSS. Presupuesto RNF-PER-02: < 1,5 s hasta esta pantalla (se mide y se muestra).
  import { resolveProtocol } from '../../engine/countermeasures';
  import { bridge } from '../bridge/workerBridge.svelte';
  import { fd, fmt, ROLE_LABEL, STATUS_LABEL } from '../bridge/uiState.svelte';

  let cabin = $state(false);
  let person = $state<string>('');
  let pin = $state('');
  let cabinProtocolOpen = $state(false);
  let readyMs = $state<number | null>(null);

  $effect(() => { if (!person && bridge.data.crew.length) person = bridge.data.crew[0].id; });

  // Tiempo hasta tener el semáforo global en pantalla (RNF-PER-02 según ADR-015).
  $effect(() => {
    if (readyMs === null && bridge.assessments.length) readyMs = performance.now();
  });

  const habCritical = $derived(bridge.habitatTelemetry.indicators.filter((i) => i.status === 'critical'));
  const cabinProtocol = $derived.by(() => {
    if (!habCritical.length) return null;
    const ids = habCritical.map((i) => i.id);
    return resolveProtocol(ids.includes('radiation') ? 'CM-RAD-01' : ids.includes('ppco2') ? 'CM-IND-ppco2' : `CM-IND-${ids[0]}`);
  });
  const error = $derived(bridge.notices.findLast((n) => n.code === 'wrong-pin'));

  // A los 5 min de una alarma ambiental crítica, el protocolo de cabina se abre solo (ADR-013).
  // Depende solo de si existe la alerta: el temporizador no se reinicia con cada evaluación.
  const hasHabCritical = $derived(habCritical.length > 0);
  $effect(() => {
    if (!hasHabCritical) return;
    const t = setTimeout(() => (cabinProtocolOpen = true), 5 * 60_000);
    return () => clearTimeout(t);
  });

  function key(d: string) {
    if (pin.length < 8) pin += d;
  }
  function submit() {
    if (!pin || !person) return;
    if (error) bridge.dismissNotice(error.id);
    bridge.unlock(person, pin);
    pin = '';
  }
</script>

<main class="lock" class:cabin>
  <header class="top">
    <div class="top-brand">
      <img src="./icon.svg" alt="" width="28" height="28" class="logo-img" />
      <div>
        <strong class="brand">ASTHA {cabin ? 'CABIN MONITOR' : ''}</strong>
        <span class="label">{cabin ? 'Modo público de cabina (ADR-014)' : 'Bloqueo de seguridad'} · {fd(bridge.data.day || 1)}</span>
      </div>
    </div>
    <button type="button" class="btn" aria-pressed={cabin} onclick={() => (cabin = !cabin)}>
      {cabin ? 'Salir del modo cabina' : 'Modo pantalla de cabina'}
    </button>
  </header>

  {#if habCritical.length}
    <section class="hab-alert st critical pulse" role="alert">
      <span class="sym big" aria-hidden="true"></span>
      <div>
        <strong class="alarm-title">Alerta ambiental crítica</strong>
        <p>{habCritical.map((i) => `${i.label} ${fmt(i.value, i.decimals)} ${i.unit}`).join(' · ')}</p>
      </div>
      {#if cabinProtocol}
        <button type="button" class="btn danger" onclick={() => (cabinProtocolOpen = !cabinProtocolOpen)}>
          {cabinProtocolOpen ? 'Ocultar protocolo' : 'Ver protocolo de cabina'}
        </button>
      {/if}
    </section>
    {#if cabinProtocolOpen && cabinProtocol}
      <section class="panel">
        <h2 class="alarm-title">{cabinProtocol.title}</h2>
        <ol class="steps">{#each cabinProtocol.steps as s (s.id)}<li>{s.text}</li>{/each}</ol>
      </section>
    {/if}
  {/if}

  <section aria-labelledby="crew-h">
    <h2 id="crew-h" class="label">Estado global de tripulación · sin valores clínicos</h2>
    <ul class="crew">
      {#each bridge.data.crew as c (c.id)}
        {@const st = bridge.crewStatus[c.id] ?? 'none'}
        <li class="st {st}" class:pulse={st === 'critical'}>
          <span class="sym" aria-hidden="true"></span>
          <span class="num">{c.id}</span>
          <span class="state">{STATUS_LABEL[st]}</span>
        </li>
      {/each}
    </ul>
  </section>

  <div class="cols">
    <section class="panel" aria-labelledby="eclss-h">
      <h2 id="eclss-h" class="label">Parámetros ambientales ECLSS del hábitat</h2>
      <ul class="eclss">
        {#each bridge.habitatTelemetry.indicators as i (i.id)}
          <li class="st {i.status}">
            <span class="label">{i.short}</span>
            <span class="num v">{fmt(i.value, i.decimals)} <small class="unit">{i.unit}</small></span>
            <span class="sym" aria-label={STATUS_LABEL[i.status]}></span>
          </li>
        {/each}
      </ul>
    </section>

    {#if !cabin}
      <section class="panel unlock" aria-labelledby="pin-h">
        <h2 id="pin-h" class="label">Desbloqueo clínico</h2>
        <div class="row people" role="group" aria-label="Tripulante">
          {#each bridge.data.crew as c (c.id)}
            <button type="button" class="btn" aria-pressed={person === c.id} onclick={() => (person = c.id)}>
              {c.id}{c.role === 'cmo' ? ' · CMO' : ''}
            </button>
          {/each}
        </div>
        <p class="muted small">{ROLE_LABEL[bridge.data.crew.find((c) => c.id === person)?.role ?? ''] ?? ''}</p>
        <output class="dots num" aria-label="{pin.length} dígitos introducidos">{'●'.repeat(pin.length) || '— — — —'}</output>
        <div class="pad" role="group" aria-label="Teclado numérico">
          {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as d (d)}
            <button type="button" class="btn key" onclick={() => key(d)}>{d}</button>
          {/each}
          <button type="button" class="btn key" aria-label="Borrar" onclick={() => (pin = pin.slice(0, -1))}>⌫</button>
          <button type="button" class="btn key" onclick={() => key('0')}>0</button>
          <button type="button" class="btn key primary" onclick={submit} disabled={!pin || bridge.data.provisioning}>OK</button>
        </div>
        {#if error}<p class="err" role="alert">✕ {error.message}</p>{/if}
        {#if bridge.data.provisioning}<p class="muted small">Preparando claves del dispositivo…</p>{/if}
        <p class="muted small">PIN de demostración: 1001–1004 (C002 es CMO). Sustituye al aprovisionamiento en Tierra (ADR-020).</p>
      </section>
    {/if}
  </div>

  <footer class="label foot">
    Pantalla lista en {readyMs != null ? `${fmt(readyMs, 0)} ms` : '…'} (presupuesto 1500 ms, RNF-PER-02) · nodo {bridge.data.nodeId || '—'}
  </footer>
</main>

<style>
  .lock { max-width: 1200px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: var(--gap); }
  .top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--gap); }
  .top-brand { display: flex; align-items: center; gap: 10px; }
  .logo-img { display: block; width: 28px; height: 28px; flex: 0 0 auto; }
  .brand { display: block; letter-spacing: 0.14em; font-size: 1.25rem; }
  .hab-alert { display: flex; flex-wrap: wrap; align-items: center; gap: var(--gap); padding: 12px; border: 3px solid var(--alert-red); border-radius: var(--radius); background-image: var(--st-fill); }
  .hab-alert div { flex: 1 1 260px; }
  .hab-alert p { color: var(--alert-red-text); }
  .big { font-size: 2rem; color: var(--alert-red-text); }
  .steps { margin: 8px 0 0; padding-left: 22px; display: flex; flex-direction: column; gap: 6px; }
  .crew { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap); }
  .crew li { display: flex; align-items: center; gap: 10px; padding: 14px; border: var(--st-bw) solid var(--st); border-radius: var(--radius); background: var(--space-800); background-image: var(--st-fill); font-weight: 700; }
  .crew .sym, .crew .state { color: var(--st-text); }
  .cabin .crew li { font-size: 1.5rem; padding: 24px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
  .cabin .cols { grid-template-columns: 1fr; }
  .eclss { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); }
  .eclss li { display: flex; align-items: baseline; gap: 8px; padding: 10px; border-left: 4px solid var(--st); background: var(--space-800); border-radius: var(--radius-btn); }
  .eclss .v { font-weight: 700; flex: 1; }
  .eclss .sym { color: var(--st-text); }
  .cabin .eclss { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cabin .eclss .v { font-size: 1.75rem; }
  .unlock { display: flex; flex-direction: column; gap: var(--gap); }
  .dots { font-size: 1.5rem; letter-spacing: 0.3em; text-align: center; min-height: 36px; }
  .pad { display: grid; grid-template-columns: repeat(3, minmax(var(--touch), 88px)); gap: var(--gap); justify-content: center; }
  .key { height: 64px; font-size: 1.375rem; }
  .err { color: var(--alert-red-text); font-weight: 700; }
  .small { font-size: 0.875rem; }
  .foot { text-align: center; }
  @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } .crew { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
