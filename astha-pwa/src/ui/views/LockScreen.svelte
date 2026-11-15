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
  import HudIcon from '../components/HudIcon.svelte';

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
  <header class="top panel">
    <div class="top-brand">
      <svg class="nasa-worm" viewBox="0 0 508.204 141.732" fill="currentColor" aria-hidden="true">
        <path d="M91.991,104.699c1.576,5.961,4.119,8.266,8.613,8.266c4.659,0,7.102-2.799,7.102-8.266V3.2h29.184v101.499 c0,14.307-1.856,20.506-9.11,27.762c-5.228,5.229-14.871,9.271-27.047,9.271c-9.837,0-19.25-3.256-25.253-9.27 c-5.263-5.273-8.154-10.689-12.672-27.764L44.9,37.033c-1.577-5.961-4.119-8.265-8.613-8.265c-4.66,0-7.103,2.798-7.103,8.265 v101.5H0v-101.5C0,22.727,1.857,16.527,9.111,9.271C14.337,4.044,23.981,0,36.158,0c9.837,0,19.25,3.257,25.253,9.27 c5.263,5.273,8.154,10.689,12.672,27.764L91.991,104.699z"/>
        <path d="M478.038,138.533L444.334,33.096c-0.372-1.164-0.723-2.152-1.263-2.811 c-0.926-1.127-2.207-1.719-3.931-1.719c-1.723,0-3.004,0.592-3.931,1.719c-0.539,0.658-0.891,1.646-1.262,2.811l-33.703,105.437 h-30.167l36.815-115.177c1.918-6,4.66-11.094,8.139-14.488C421.002,3.047,428.038,0,439.141,0s18.14,3.047,24.109,8.867 c3.479,3.395,6.221,8.488,8.14,14.488l36.814,115.177H478.038z"/>
        <path d="M328.878,138.533c19.12,0,28.446-4.062,35.814-11.389c8.153-8.105,12.053-16.973,12.053-30.213 c0-11.699-4.283-22.535-10.804-29.019c-8.526-8.479-19.116-11.151-36.384-11.151L305.37,56.76c-9.242,0-12.925-1.117-15.839-3.98 c-2.001-1.964-2.939-4.885-2.939-8.328c0-3.559,0.857-7.074,3.303-9.475c2.171-2.131,5.13-3.109,10.816-3.109h69.903V3.2H306.05 c-19.12,0-28.445,4.063-35.814,11.389c-8.152,8.105-12.053,16.972-12.053,30.212c0,11.701,4.283,22.536,10.804,29.019 c8.527,8.479,19.116,11.152,36.384,11.152l24.188,0.002c9.242,0,12.925,1.115,15.839,3.979c2.001,1.965,2.939,4.885,2.939,8.328 c0,3.559-0.857,7.074-3.302,9.475c-2.172,2.131-5.131,3.109-10.817,3.109h-72.094l-27.651-86.509 c-1.918-6-4.66-11.094-8.139-14.488C220.363,3.047,213.327,0,202.224,0s-18.14,3.047-24.108,8.867 c-3.48,3.395-6.221,8.488-8.139,14.488l-36.815,115.177h30.166l33.704-105.437c0.372-1.164,0.723-2.152,1.263-2.811 c0.926-1.127,2.208-1.719,3.931-1.719s3.004,0.592,3.931,1.719c0.54,0.658,0.891,1.646,1.262,2.811l33.704,105.437H328.878z"/>
      </svg>
      <div>
        <div class="brand-tags">
          <strong class="brand">ASTHA {cabin ? 'CABIN MONITOR' : ''}</strong>
          <span class="hud-tag">ESTD 1958</span>
          <span class="hud-tag">OFFLINE EDGE</span>
        </div>
        <span class="label">
          {cabin ? 'Public Cabin Monitor' : 'Security Lock Screen'} · {fd(bridge.data.day || 1)}
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
  <div class="nasa-spectrum" aria-hidden="true"></div>

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
    <h2 id="crew-h" class="label">Crew Global Status · private clinical values protected</h2>
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
        <h2 id="pin-h" class="label">Rapid Clinical Unlock (&lt; 1.5 s)</h2>
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
          <button type="button" class="btn key" aria-label="Backspace" onclick={() => (pin = pin.slice(0, -1))}><HudIcon name="backspace" size={20} /></button>
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
        {#if error}<p class="err" role="alert"><HudIcon name="x" size={15} /> {error.message}</p>{/if}
        {#if bridge.data.provisioning}<p class="muted small">Provisioning device cryptographic keyring…</p>{/if}
        <p class="muted small">
          Demo PINs: 1001–1004 (C002 is CMO), keyboard 0–9/Enter, or NFC badge tap.
        </p>
      </section>
    {/if}
  </div>

  <footer class="label foot">
    UI mounted {mountMs != null ? `${fmt(mountMs, 0)} ms` : '…'} · telemetry ready
    {readyMs != null ? `${fmt(readyMs, 0)} ms` : '…'} (target &lt; 1500 ms) · node {bridge.data.nodeId || '—'}
    <br />Synthetic demo telemetry · not measured NASA flight data.
  </footer>
</main>

<style>
  .lock { max-width: 1200px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: var(--gap); }
  .top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--gap); padding: 12px 16px; }
  .top-brand { display: flex; align-items: center; gap: 14px; }
  .brand-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 2px; }
  .nasa-worm { display: block; width: 78px; height: auto; flex: 0 0 auto; color: var(--text); }
  .brand { display: block; letter-spacing: 0.14em; font-size: 1.25rem; font-family: var(--font-num); }
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
