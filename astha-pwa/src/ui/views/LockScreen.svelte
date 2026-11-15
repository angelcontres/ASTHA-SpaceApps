<script lang="ts">
  // View C · Security Lock Screen & Cabin Public Monitor (docs/Diseno-UI-UX/01 §5, ADR-014, ADR-015).
  // Before PIN/NFC unlock, only crew global status traffic lights (zero names or clinical values) and the
  // 6 habitat ECLSS parameters are exposed. RNF-PER-02 budget: < 1,500 ms startup telemetry.
  import { onMount } from 'svelte';
  import { resolveProtocol } from '../../engine/countermeasures';
  import {
    fd, fmt, indLabel, indShort, ROLE_LABEL, STATUS_LABEL, ui,
  } from '../bridge/uiState.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';

  interface NdefReadingEventLike {
    message?: { records?: Array<{ recordType?: string }> };
  }
  interface NdefReaderLike {
    scan: () => Promise<void>;
    onreading: ((ev: NdefReadingEventLike) => void) | null;
    onreadingerror: (() => void) | null;
  }
  type WindowWithNfc = Window & { NDEFReader?: new () => NdefReaderLike };

  let cabin = $state(false);
  let person = $state<string>('');
  let pin = $state('');
  let cabinProtocolOpen = $state(false);
  let mountMs = $state<number | null>(null);
  let readyMs = $state<number | null>(null);
  let nfcStatus = $state<string>('');
  let nfcBusy = $state(false);

  onMount(() => {
    mountMs = performance.now();
  });

  $effect(() => {
    if (!person && bridge.data.crew.length) person = bridge.data.crew[0].id;
  });

  // Measure time until global crew status & ECLSS telemetry are active (RNF-PER-02 / ADR-015).
  $effect(() => {
    if (readyMs === null && bridge.assessments.length) readyMs = performance.now();
  });

  const habCritical = $derived(
    bridge.habitatTelemetry.indicators.filter((i) => i.status === 'critical'),
  );
  const cabinProtocol = $derived.by(() => {
    if (!habCritical.length) return null;
    const ids = habCritical.map((i) => i.id);
    return resolveProtocol(
      ids.includes('radiation') ? 'CM-RAD-01' : ids.includes('ppco2') ? 'CM-IND-ppco2' : `CM-IND-${ids[0]}`,
    );
  });
  const error = $derived(bridge.notices.findLast((n) => n.code === 'wrong-pin'));
  const selectedCrewRole = $derived(
    bridge.data.crew.find((c) => c.id === person)?.role ?? '',
  );

  // Auto-open cabin emergency protocol after 5 min of persistent critical habitat alarm (ADR-013).
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
    nfcStatus = '';
    bridge.unlock(person, pin);
    pin = '';
  }

  async function tapNfcBadge() {
    if (!person || bridge.data.provisioning || nfcBusy) return;
    if (error) bridge.dismissNotice(error.id);
    const w = window as WindowWithNfc;
    if (typeof w.NDEFReader === 'function') {
      nfcBusy = true;
      nfcStatus = 'Hold NFC crew badge near reader…';
      try {
        const reader = new w.NDEFReader();
        await reader.scan();
        reader.onreading = () => {
          nfcBusy = false;
          nfcStatus = `Badge verified for ${person}`;
          bridge.unlockBadge(person);
        };
        reader.onreadingerror = () => {
          nfcBusy = false;
          nfcStatus = 'NFC read error — fallback to demo badge or PIN';
        };
        return;
      } catch {
        nfcBusy = false;
      }
    }
    // Demo hardware-badge tap (ADR-015 / ADR-020): unlocks selected crew keyring via Worker.
    nfcStatus = `NFC badge tapped · ${person}`;
    bridge.unlockBadge(person);
  }

  function selectPerson(id: string) {
    person = id;
    nfcBusy = false;
    nfcStatus = '';
  }

  function onKeyDown(ev: KeyboardEvent) {
    if (cabin || bridge.data.provisioning) return;
    if (ev.key >= '0' && ev.key <= '9') {
      ev.preventDefault();
      key(ev.key);
    } else if (ev.key === 'Backspace') {
      ev.preventDefault();
      pin = pin.slice(0, -1);
    } else if (ev.key === 'Enter' && pin && !(ev.target instanceof HTMLButtonElement)) {
      ev.preventDefault();
      submit();
    } else if (ev.key === 'Escape') {
      pin = '';
      nfcBusy = false;
      nfcStatus = '';
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<main class="lock" class:cabin>
  <header class="top">
    <div class="top-brand">
      <img class="logo-img" src="./icon.svg" alt="" width="36" height="36" />
      <div>
        <strong class="brand">ASTHA {cabin ? 'CABIN MONITOR' : ''}</strong>
        <span class="label">
          {cabin ? 'Public Cabin Monitor (ADR-014)' : 'Security Lock Screen'} · {fd(bridge.data.day || 1)}
        </span>
      </div>
    </div>
    <div class="row">
      <button
        type="button"
        class="btn"
        aria-pressed={ui.lockRedMode}
        onclick={() => (ui.lockRedMode = !ui.lockRedMode)}
      >
        Red 630 nm
      </button>
      <button type="button" class="btn" aria-pressed={cabin} onclick={() => (cabin = !cabin)}>
        {cabin ? 'Exit Cabin Mode' : 'Cabin Monitor Mode'}
      </button>
    </div>
  </header>

  {#if habCritical.length}
    <section class="hab-alert st critical pulse" role="alert">
      <span class="sym big" aria-hidden="true"></span>
      <div>
        <strong class="alarm-title">Critical Habitat Environmental Alert</strong>
        <p>{habCritical.map((i) => `${indLabel(i)} ${fmt(i.value, i.decimals)} ${i.unit}`).join(' · ')}</p>
      </div>
      {#if cabinProtocol}
        <button type="button" class="btn danger" onclick={() => (cabinProtocolOpen = !cabinProtocolOpen)}>
          {cabinProtocolOpen ? 'Hide Protocol' : 'View Cabin Protocol'}
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
    <h2 id="crew-h" class="label">Crew Global Status · zero clinical values exposed (ADR-014)</h2>
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
      <h2 id="eclss-h" class="label">Habitat ECLSS Environmental Parameters (6 metrics)</h2>
      <ul class="eclss">
        {#each bridge.habitatTelemetry.indicators as i (i.id)}
          <li class="st {i.status}" title="{indLabel(i)}: nominal {i.nominalRange}">
            <span class="label">{indShort(i)}</span>
            <span class="num v">{fmt(i.value, i.decimals)} <small class="unit">{i.unit}</small></span>
            <span class="sym" aria-label={STATUS_LABEL[i.status]}></span>
          </li>
        {/each}
      </ul>
    </section>

    {#if !cabin}
      <section class="panel unlock" aria-labelledby="pin-h">
        <h2 id="pin-h" class="label">Rapid Clinical Unlock (&lt; 1.5 s · ADR-015)</h2>
        <div class="row people" role="group" aria-label="Select crew identity">
          {#each bridge.data.crew as c (c.id)}
            <button type="button" class="btn" aria-pressed={person === c.id} onclick={() => selectPerson(c.id)}>
              {c.id}{c.role === 'cmo' ? ' · CMO' : ''}
            </button>
          {/each}
        </div>
        <p class="muted small">{ROLE_LABEL[selectedCrewRole] ?? ''}</p>
        <output class="dots num" aria-live="polite" aria-label="{pin.length} PIN digits entered">
          {'●'.repeat(pin.length) || '— — — —'}
        </output>
        <div class="pad" role="group" aria-label="Numeric PIN keypad">
          {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as d (d)}
            <button type="button" class="btn key" onclick={() => key(d)}>{d}</button>
          {/each}
          <button type="button" class="btn key" aria-label="Backspace" onclick={() => (pin = pin.slice(0, -1))}>⌫</button>
          <button type="button" class="btn key" onclick={() => key('0')}>0</button>
          <button
            type="button"
            class="btn key primary"
            aria-label="Submit PIN"
            onclick={submit}
            disabled={!pin || bridge.data.provisioning}
          >
            OK
          </button>
        </div>
        <div class="nfc-row">
          <button
            type="button"
            class="btn nfc-btn"
            onclick={tapNfcBadge}
            disabled={!person || bridge.data.provisioning || nfcBusy}
          >
            {nfcBusy ? 'Scanning NFC Badge…' : `NFC Badge Tap · ${person || 'Crew'}`}
          </button>
        </div>
        {#if nfcStatus}<p class="nfc-note num small" aria-live="polite">{nfcStatus}</p>{/if}
        {#if error}<p class="err" role="alert">✕ {error.message}</p>{/if}
        {#if bridge.data.provisioning}<p class="muted small">Provisioning device cryptographic keyring…</p>{/if}
        <p class="muted small">
          Demo PINs: 1001–1004 (C002 is CMO), keyboard 0–9/Enter, or NFC badge tap (ADR-020).
        </p>
      </section>
    {/if}
  </div>

  <footer class="label foot">
    UI mounted {mountMs != null ? `${fmt(mountMs, 0)} ms` : '…'} · telemetry ready
    {readyMs != null ? `${fmt(readyMs, 0)} ms` : '…'} (budget 1500 ms, RNF-PER-02) · node {bridge.data.nodeId || '—'}
    <br />Synthetic demo telemetry · not measured NASA flight data.
  </footer>
</main>

<style>
  .lock { max-width: 1200px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: var(--gap); }
  .top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--gap); }
  .top-brand { display: flex; align-items: center; gap: 12px; }
  .logo-img { display: block; width: 36px; height: 36px; flex: 0 0 auto; border-radius: 6px; }
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
  .key { min-width: var(--touch); height: 64px; font-size: 1.375rem; }
  .nfc-row { display: flex; justify-content: center; margin-top: 4px; }
  .nfc-btn { min-width: min(288px, 100%); border-color: var(--blueprint-line); color: var(--blueprint-text); }
  .nfc-note { color: var(--accent); text-align: center; }
  .err { color: var(--alert-red-text); font-weight: 700; text-align: center; }
  .small { font-size: 0.875rem; }
  .foot { text-align: center; }
  @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } .crew { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
