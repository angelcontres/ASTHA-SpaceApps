<script lang="ts">
  // Tab 1 · Biomedical Cockpit (WIREFRAME §6.1, View A): 12-col grid (COMP-02 anatomy 4 cols, COMP-03 vitals 2x2,
  // COMP-03B ECLSS 6 metrics, COMP-04 uPlot trend 7 cols, COMP-05 action checklist 5 cols), morning log & habits.
  // Zen Mode: essential vitals enlarged cleanly. Survival Mode (<5 W, ADR-019): disables 3D & uPlot with static tables.
  import { resolveProtocol } from '../../engine/countermeasures';
  import type { CrewIndicator, IndicatorId, IndicatorState } from '../../engine/types';
  import AnatomyViewer from '../components/AnatomyViewer.svelte';
  import BodySvg from '../components/BodySvg.svelte';
  import CountermeasureGuide from '../components/CountermeasureGuide.svelte';
  import EntrySymptomPad from '../components/EntrySymptomPad.svelte';
  import HudIcon from '../components/HudIcon.svelte';
  import IndicatorCard from '../components/IndicatorCard.svelte';
  import TrendChart from '../components/TrendChart.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';
  import { fd, fmt, indLabel, indShort, ROLE_LABEL, STATUS_LABEL, ui } from '../bridge/uiState.svelte';

  interface Props { zen: boolean; survival: boolean }
  const { zen, survival }: Props = $props();

  const a = $derived(bridge.currentAssessment);
  const byId = $derived(new Map((a?.indicators ?? []).map((i) => [i.id, i])));
  const get = (id: IndicatorId) => byId.get(id) as IndicatorState | undefined;
  const PRIMARY: CrewIndicator[] = ['hr', 'sbp', 'spo2', 'hrv'];
  const SECONDARY: CrewIndicator[] = ['glucose', 'temp', 'sleep', 'mood', 'urineCa'];
  const CHARTABLE: CrewIndicator[] = [...PRIMARY, ...SECONDARY];

  const days = $derived(bridge.series.measurements.map((m) => m.day));
  const seriesValues = (id: CrewIndicator) => bridge.series.measurements.map((m) => (typeof m[id] === 'number' ? (m[id] as number) : null));
  const todayRow = $derived(bridge.series.measurements.find((m) => m.day === bridge.data.day) ?? null);
  const activeTrend = $derived(get(ui.bioIndicator));

  const topAlert = $derived(bridge.activeAlerts.find((x) => !x.overridden && x.status !== 'nominal' && (x.crewId === a?.crewId || x.crewId === 'HAB')) ?? null);
  const topProtocol = $derived(topAlert ? resolveProtocol(topAlert.countermeasureId) : null);
  const gam = $derived(a?.gamification ?? null);
  const multiCrew = $derived((bridge.data.session?.allowedCrew.length ?? 0) > 1);

  type DeckId = 0 | 1 | 2 | 3;
  let deck = $state<DeckId>(0);
  let deckTrack = $state<HTMLDivElement | null>(null);
  let dragging = $state(false);
  let dragPointer: number | null = null;
  let dragStartX = 0;
  let dragStartScroll = 0;

  const worstOf = (items: Array<IndicatorState | undefined>) => {
    let critical = 0;
    let caution = 0;
    for (const x of items) {
      if (x?.status === 'critical') critical += 1;
      else if (x?.status === 'caution') caution += 1;
    }
    return { status: critical > 0 ? 'critical' : caution > 0 ? 'caution' : 'nominal', count: critical + caution };
  };

  const deckBadges = $derived([
    { id: 0 as DeckId, title: 'Core Vitals (4)', tag: '01', ...worstOf(PRIMARY.map((id) => get(id))), pending: false },
    { id: 1 as DeckId, title: 'Metabolic (5)', tag: '02', ...worstOf(SECONDARY.map((id) => get(id))), pending: false },
    { id: 2 as DeckId, title: 'Habitat ECLSS (6)', tag: '03', ...worstOf(bridge.habitatTelemetry.indicators), pending: false },
    { id: 3 as DeckId, title: 'Daily Log', tag: '04', status: 'nominal' as const, count: 0, pending: !todayRow?.manual },
  ]);

  function goDeck(next: DeckId) {
    deck = next;
    if (!deckTrack) return;
    const reduced = survival || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    deckTrack.scrollTo({ left: next * deckTrack.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  }

  function onTrackScroll() {
    if (!deckTrack || !deckTrack.clientWidth || dragging) return;
    const idx = Math.round(deckTrack.scrollLeft / deckTrack.clientWidth);
    if (idx >= 0 && idx <= 3 && idx !== deck) deck = idx as DeckId;
  }

  function onTrackDown(e: PointerEvent) {
    if (e.pointerType === 'touch') return; // Native touch scroll-snap is already buttery smooth.
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select, summary')) return;
    dragPointer = e.pointerId;
    dragStartX = e.clientX;
    dragStartScroll = deckTrack?.scrollLeft ?? 0;
    dragging = false;
  }

  function onTrackMove(e: PointerEvent) {
    if (dragPointer !== e.pointerId || !deckTrack) return;
    const dx = e.clientX - dragStartX;
    if (!dragging && Math.abs(dx) > 10) {
      dragging = true;
      deckTrack.setPointerCapture(e.pointerId);
    }
    if (dragging) deckTrack.scrollLeft = dragStartScroll - dx;
  }

  function onTrackUp(e: PointerEvent) {
    if (dragPointer !== e.pointerId || !deckTrack) return;
    const wasDragging = dragging;
    const dx = e.clientX - dragStartX;
    dragPointer = null;
    dragging = false;
    if (!wasDragging) return;
    const width = deckTrack.clientWidth || 1;
    let target = Math.round(deckTrack.scrollLeft / width);
    if (dx < -45 && deck < 3) target = deck + 1;
    else if (dx > 45 && deck > 0) target = deck - 1;
    goDeck(Math.max(0, Math.min(3, target)) as DeckId);
  }

  function onTabKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') goDeck(((deck + 1) % 4) as DeckId);
    else if (e.key === 'ArrowLeft') goDeck(((deck + 3) % 4) as DeckId);
  }
</script>

{#if !a}
  <p class="panel muted">Awaiting crew clinical assessment…</p>
{:else if zen}
  <section class="zen" aria-label="Zen Mode: essential crew vitals">
    {#each ['hr', 'sbp', 'spo2', 'hrv'] as id (id)}
      {@const ind = get(id as IndicatorId)}
      {#if ind}<IndicatorCard indicator={ind} second={id === 'sbp' ? get('dbp') : null} variant="zen" />{/if}
    {/each}
  </section>
{:else}
  <div class="cockpit">
    <!-- COMP-02 -->
    <section class="anatomy panel" aria-label="Anatomical viewer">
      <div class="hud-head">
        <span class="label">Anatomical Triage Scanner</span>
        <span class="hud-tag">COMP-02 // HOLO-3D</span>
      </div>
      <AnatomyViewer
        regions={a.regions}
        bind:view={ui.view}
        selected={ui.selectedRegion}
        variant={survival ? 'fallback' : 'full'}
        onselect={(r) => { ui.selectedRegion = r; ui.tab = 'triage'; }}
      />
    </section>

    <div class="main">
      <!-- COMP-03 · Interactive Swipeable & Draggable 4-Screen Telemetry Deck -->
      <section class="panel deck-shell" aria-labelledby="vit-h" aria-label="Encapsulated telemetry decks">
        <div class="hud-head">
          <h2 id="vit-h" class="label">Biomedical Vitals · {bridge.data.crew.find((c) => c.id === a.crewId)?.name}</h2>
          <span class="hud-tag">COMP-03 // SWIPE OR DRAG</span>
        </div>

        <div class="deck-bar">
          <div class="deck-tabs" role="tablist" aria-label="Telemetry decks" tabindex="-1" onkeydown={onTabKey}>
            {#each deckBadges as d (d.id)}
              <button
                type="button"
                role="tab"
                class="btn deck-tab"
                class:active={deck === d.id}
                aria-selected={deck === d.id}
                onclick={() => goDeck(d.id)}
              >
                <span class="deck-num num">{d.tag}</span>
                <span>{d.title}</span>
                {#if d.count > 0}
                  <span class="deck-alert st {d.status}" aria-label="{d.count} alerts">
                    <span class="sym" aria-hidden="true"></span> {d.count}
                  </span>
                {:else if d.pending}
                  <span class="pill-pending" aria-label="Daily log pending">Pending</span>
                {/if}
              </button>
            {/each}
          </div>
          <div class="deck-nav" aria-label="Swipe deck controls">
            <button
              type="button"
              class="btn deck-arrow"
              disabled={deck === 0}
              aria-label="Previous telemetry deck"
              onclick={() => goDeck((deck - 1) as DeckId)}
            ><HudIcon name="chevron-left" size={18} /></button>
            <span class="num muted deck-pos">{deck + 1} / 4</span>
            <button
              type="button"
              class="btn deck-arrow"
              disabled={deck === 3}
              aria-label="Next telemetry deck"
              onclick={() => goDeck((deck + 1) as DeckId)}
            ><HudIcon name="chevron-right" size={18} /></button>
          </div>
        </div>

        <!-- Interactive pointer-draggable & touch-swipeable viewport -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="deck-track"
          class:dragging
          bind:this={deckTrack}
          onscroll={onTrackScroll}
          onpointerdown={onTrackDown}
          onpointermove={onTrackMove}
          onpointerup={onTrackUp}
          onpointercancel={onTrackUp}
        >
          <!-- Screen 01: Core 4 Primary Vitals -->
          <div class="deck-slide" role="tabpanel" aria-label="Core biomedical vitals">
            <div class="vitals">
              {#each PRIMARY as id (id)}
                {@const ind = get(id)}
                {#if ind}
                  <IndicatorCard
                    indicator={ind}
                    second={id === 'sbp' ? get('dbp') : null}
                    variant={id === 'sbp' ? 'compound' : 'vital'}
                    active={ui.bioIndicator === id}
                    onopen={() => (ui.bioIndicator = id)}
                  />
                {/if}
              {/each}
            </div>
          </div>

          <!-- Screen 02: Secondary Metabolic, Sleep & Renal (5 metrics) -->
          <div class="deck-slide" role="tabpanel" aria-label="Metabolic and neuro-wellness metrics">
            <div class="secondary">
              {#each SECONDARY as id (id)}
                {@const ind = get(id)}
                {#if ind}
                  <IndicatorCard
                    indicator={ind}
                    active={ui.bioIndicator === id}
                    onopen={() => (ui.bioIndicator = id)}
                  />
                {/if}
              {/each}
            </div>
          </div>

          <!-- Screen 03: ECLSS Habitat Telemetry (6 Parameters) -->
          <div class="deck-slide" role="tabpanel" aria-label="ECLSS habitat telemetry">
            <div class="slide-subhead">
              <h3 id="eclss-h" class="label">ECLSS Habitat Telemetry · 6 Parameters</h3>
              <span class="hud-tag">COMP-03B // CABIN ECLSS</span>
            </div>
            <div class="eclss">
              {#each bridge.habitatTelemetry.indicators as ind (ind.id)}
                <IndicatorCard indicator={ind} variant="habitat" onopen={() => { ui.envIndicator = ind.id; ui.tab = 'env'; }} />
              {/each}
            </div>
          </div>

          <!-- Screen 04: Morning Self-Report & Adherence & Habits -->
          <div class="deck-slide" role="tabpanel" aria-label="Morning self-report and adherence">
            <div class="lower-capsule">
              <section class="panel" aria-label="Morning Self-Report and Symptoms Log">
                <div class="slide-subhead">
                  <h3 class="label">Morning Self-Report &amp; Symptoms Log</h3>
                  {#if !todayRow?.manual}<span class="pill-pending">Pending</span>{/if}
                </div>
                <EntrySymptomPad
                  crewId={a.crewId}
                  today={todayRow}
                  symptoms={bridge.data.symptoms[a.crewId] ?? []}
                  onsubmit={(f) => bridge.manualEntry(a.crewId, f)}
                  onsymptom={(s, on) => bridge.toggleSymptom(a.crewId, s, on)}
                />
              </section>

              {#if gam}
                <!-- Gamification strictly below clinical alerts per RF-GAM-03 -->
                <section class="panel gam" aria-labelledby="gam-h">
                  <h2 id="gam-h" class="label">Adherence &amp; Habits</h2>
                  <p><span class="value num">{gam.xp}</span> <span class="unit">XP · Level {gam.level} · {gam.streak}-day streak</span></p>
                  <ul class="medals">
                    {#each gam.medals as m (m.id)}
                      <li class:earned={m.earnedToday}>
                        <HudIcon name={m.earnedToday ? 'star-filled' : 'star'} size={14} /> {m.label}
                      </li>
                    {/each}
                  </ul>
                </section>
              {/if}
            </div>
          </div>
        </div>

        <!-- Interactive bottom pager dots + progress rail -->
        <div class="deck-footer" aria-label="Telemetry capsule pagination">
          <div class="deck-dots">
            {#each deckBadges as d (d.id)}
              <button
                type="button"
                class="dot-btn"
                class:active={deck === d.id}
                aria-label="Go to {d.title}"
                aria-current={deck === d.id ? 'step' : undefined}
                onclick={() => goDeck(d.id)}
              >
                <span class="dot"></span>
              </button>
            {/each}
          </div>
          <span class="muted hint">Click any biometric card to inspect live trend below</span>
        </div>
      </section>

      <!-- Live Interactive Trend & Countermeasure Dock (always synchronized with tapped card) -->
      <div class="split">
        <!-- COMP-04 -->
        <section class="panel trend" aria-labelledby="trend-h">
          <div class="hud-head">
            <h2 id="trend-h" class="label">Trend · {activeTrend ? indLabel(activeTrend) : ''}</h2>
            <div class="row">
              <label class="sr-only" for="trend-metric-select">Select chart metric</label>
              <select
                id="trend-metric-select"
                class="btn metric-select"
                value={ui.bioIndicator}
                onchange={(e) => (ui.bioIndicator = e.currentTarget.value as CrewIndicator)}
              >
                {#each CHARTABLE as id (id)}
                  {@const ind = get(id)}
                  {#if ind}<option value={id}>{indShort(ind)} · {indLabel(ind)}</option>{/if}
                {/each}
              </select>
              <span class="hud-tag">COMP-04 // UPLOT 2D</span>
            </div>
          </div>
          {#if survival}
            <table class="tab num">
              <thead><tr><th>Flight Day</th><th>{activeTrend ? indShort(activeTrend) : ''} ({activeTrend?.unit ?? ''})</th></tr></thead>
              <tbody>
                {#each bridge.series.measurements.slice(-7).reverse() as m (m.day)}
                  <tr><td>{fd(m.day)}</td><td>{fmt(m[ui.bioIndicator as CrewIndicator] as number, activeTrend?.decimals ?? 0)}</td></tr>
                {/each}
              </tbody>
            </table>
          {:else if days.length}
            <TrendChart indicator={ui.bioIndicator} {days} values={seriesValues(ui.bioIndicator as CrewIndicator)} />
          {/if}
        </section>

        <!-- COMP-05 -->
        <section class="check" aria-label="Active countermeasure protocol">
          {#if topAlert && topProtocol}
            <CountermeasureGuide protocol={topProtocol} alert={topAlert} oncheck={(s, c, p) => bridge.checkStep(topAlert, s, c, p)} />
          {:else}
            <div class="panel st nominal"><span class="sym" aria-hidden="true"></span> No active emergency protocols. Maintain daily ARED, hydration, and sleep schedule.</div>
          {/if}
        </section>
      </div>

      {#if multiCrew}
        <section class="panel" aria-labelledby="crew-h">
          <h2 id="crew-h" class="label">Crew Roster Summary</h2>
          <div class="row">
            {#each bridge.data.crew as c (c.id)}
              {@const ca = bridge.assessments.find((x) => x.crewId === c.id)}
              {#if ca && !ca.statusOnly}
                <button
                  type="button"
                  class="btn crewcard st {ca.global}"
                  onclick={() => bridge.selectCrew(c.id)}
                  aria-label="{c.name}, {ROLE_LABEL[c.role]}, {STATUS_LABEL[ca.global]}"
                >
                  <BodySvg regions={ca.regions} compact label={c.name} />
                  <span><strong>{c.id}</strong><br /><span class="sym" aria-hidden="true"></span> {STATUS_LABEL[ca.global]}</span>
                </button>
              {/if}
            {/each}
          </div>
        </section>
      {/if}
    </div>
  </div>
{/if}

<style>
  .cockpit { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--gap); align-items: start; }
  .anatomy { grid-column: span 4; }
  .main { grid-column: span 8; display: flex; flex-direction: column; gap: var(--gap); min-width: 0; }

  /* Encapsulated Swipeable Telemetry Deck */
  .deck-shell { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .deck-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .deck-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
  .deck-tab {
    min-height: var(--touch);
    padding: 0 12px;
    gap: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    border-color: var(--border);
    color: var(--text-muted);
  }
  .deck-tab.active {
    border-color: var(--accent);
    color: var(--text);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }
  .deck-num { font-size: 0.75rem; opacity: 0.72; }
  .deck-alert {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid var(--st);
    color: var(--st-text);
    font-size: 0.75rem;
    font-weight: 700;
  }
  .deck-nav { display: inline-flex; align-items: center; gap: 6px; }
  .deck-arrow { min-width: var(--touch); min-height: var(--touch); font-size: 1.25rem; padding: 0; }
  .deck-pos { font-size: 0.8125rem; min-width: 34px; text-align: center; }

  .deck-track {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    touch-action: pan-x pan-y;
    cursor: grab;
  }
  .deck-track.dragging {
    cursor: grabbing;
    scroll-snap-type: none;
    user-select: none;
  }
  .deck-track::-webkit-scrollbar { display: none; }
  .deck-slide {
    flex: 0 0 100%;
    min-width: 100%;
    box-sizing: border-box;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
  }
  .slide-subhead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  .deck-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }
  .deck-dots { display: flex; align-items: center; gap: 2px; }
  .dot-btn {
    all: unset;
    box-sizing: border-box;
    min-width: var(--touch);
    min-height: var(--touch);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 6px;
  }
  .dot-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: -4px; }
  .dot {
    width: 18px;
    height: 5px;
    border-radius: 999px;
    background: var(--border-strong);
    opacity: 0.45;
    transition: width 140ms ease, opacity 140ms ease, background-color 140ms ease;
  }
  .dot-btn.active .dot { width: 32px; background: var(--accent); opacity: 1; }
  .hint { font-size: 0.75rem; }

  .vitals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); margin-top: 4px; }
  .secondary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap); margin-top: 4px; }
  .secondary :global(.value) { font-size: 1.375rem; }
  .eclss { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap); margin-top: 4px; }
  .split { display: grid; grid-template-columns: 7fr 5fr; gap: var(--gap); }
  .trend, .check { min-width: 0; }
  .metric-select { min-height: 36px; height: auto; padding: 4px 10px; font-size: 0.85rem; max-width: 240px; }
  .lower-capsule {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: var(--gap);
    align-items: start;
    max-height: 318px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .pill-pending {
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--alert-yellow);
    color: var(--alert-yellow-text);
    font-size: 0.75rem;
    font-weight: 700;
  }
  .medals { list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-direction: column; gap: 4px; }
  .medals .earned { color: var(--alert-yellow); }
  .crewcard { height: auto; padding: 8px 12px; gap: 12px; border-color: var(--st); }
  .crewcard .sym { color: var(--st-text); }
  .zen { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); }
  .tab { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .tab th, .tab td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); }
  @media (min-width: 1280px) {
    .anatomy { position: sticky; top: 88px; }
  }
  @media (max-width: 1279px) {
    .anatomy, .main { grid-column: 1 / -1; }
    .split, .lower-capsule { grid-template-columns: 1fr; }
  }
  @media (max-width: 767px) {
    .vitals, .secondary, .eclss, .zen { grid-template-columns: 1fr; }
  }
</style>
