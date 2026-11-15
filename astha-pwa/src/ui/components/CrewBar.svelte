<script lang="ts">
  // Crew Selector & Mission Timeline (COMP-01, RF-DSH-03, WIREFRAME §6.1).
  // Displays dual-coded global status for each crew member (C001..C004), enforces cryptographic session
  // boundaries (ADR-012), and provides interactive mission timeline scrubbing across L-44..R+1.
  import { fd, missionPhase, ROLE_LABEL, STATUS_LABEL } from '../bridge/uiState.svelte';
  import { bridge } from '../bridge/workerBridge.svelte';

  const allowed = $derived(new Set(bridge.data.session?.allowedCrew ?? []));
  const currentDay = $derived(Math.max(1, Math.min(bridge.data.maxDay || 180, bridge.data.day || 1)));
  const pct = $derived((currentDay / (bridge.data.maxDay || 180)) * 100);
  const preFlightMarks = ['L-44', 'L-15'];
  const flightMarks = [1, 14, 30, 60, 90, 120, 150, 180];

  function onScrub(ev: Event) {
    const val = Number((ev.currentTarget as HTMLInputElement).value);
    if (!Number.isNaN(val)) bridge.setDay(val);
  }
</script>

<nav class="crewbar" aria-label="Crew selector and mission timeline">
  <div class="row crew" role="group" aria-label="Crew members">
    {#each bridge.data.crew as c (c.id)}
      {@const st = bridge.crewStatus[c.id] ?? 'none'}
      <button
        type="button"
        class="btn member st {st}"
        aria-pressed={bridge.data.selectedCrew === c.id}
        disabled={!allowed.has(c.id)}
        aria-label="{c.id} {c.name}, {ROLE_LABEL[c.role]}, {STATUS_LABEL[st]}{allowed.has(c.id) ? '' : ', access restricted'}"
        onclick={() => bridge.selectCrew(c.id)}
      >
        <span class="sym" aria-hidden="true"></span>
        <span class="member-info">
          <span class="member-top">
            <strong class="num">{c.id}</strong>
            <span class="name">{c.name}</span>
          </span>
          <span class="member-role label">{ROLE_LABEL[c.role]} · {STATUS_LABEL[st]}</span>
        </span>
      </button>
    {/each}
  </div>

  <div class="timeline" aria-label="Mission day {currentDay} of {bridge.data.maxDay}">
    <div class="timeline-head">
      <span class="label">Mission Timeline · L-44 to R+1</span>
      <span class="label phase">{fd(currentDay)} · {missionPhase(currentDay)}</span>
    </div>
    <div class="scrubber">
      <div class="track" aria-hidden="true">
        <div class="fill" style="width:{pct}%"></div>
        <div class="base" style="width:{(14 / (bridge.data.maxDay || 180)) * 100}%" title="14-day Baseline"></div>
      </div>
      <input
        class="range"
        type="range"
        min="1"
        max={bridge.data.maxDay || 180}
        value={currentDay}
        aria-label="Mission flight day scrubber (FD-001 to FD-180)"
        aria-valuetext="{fd(currentDay)} · {missionPhase(currentDay)}"
        oninput={onScrub}
      />
    </div>
    <div class="marks-row label">
      <div class="preflight">
        {#each preFlightMarks as pm (pm)}<span title="Pre-flight baseline phase">{pm}</span>{/each}
      </div>
      <div class="marks">
        {#each flightMarks as m (m)}
          <span
            style="left:{((m - 1) / ((bridge.data.maxDay || 180) - 1)) * 100}%"
            class:now={Math.abs(m - currentDay) < 4}
          >
            {fd(m)}
          </span>
        {/each}
      </div>
      <span class="postflight" title="Post-flight recovery milestone">R+1</span>
    </div>
  </div>
</nav>

<style>
  .crewbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--gap);
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-strong);
    background: color-mix(in srgb, var(--space-950) 92%, #0a1f44);
  }
  .crew { display: grid; grid-template-columns: repeat(4, minmax(155px, 1fr)); gap: 10px; flex: 2 1 640px; }
  .member {
    border: 1px solid var(--border-strong);
    border-top: 3px solid var(--st);
    background: var(--space-800);
    height: auto;
    min-height: var(--touch);
    padding: 8px 12px;
    justify-content: flex-start;
    text-align: left;
  }
  .member .sym { color: var(--st-text); font-size: 1rem; }
  .member[aria-pressed='true'] {
    border-color: var(--accent);
    border-top-color: var(--st);
    outline: 2px solid color-mix(in srgb, var(--accent) 65%, transparent);
    outline-offset: 1px;
    background: color-mix(in srgb, var(--accent) 16%, var(--space-800));
    box-shadow: 0 0 16px rgb(56 189 248 / 0.22);
  }
  .member-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .member-top { display: flex; align-items: baseline; gap: 6px; }
  .name { font-weight: 600; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .member-role { display: block; color: var(--text-muted); }
  .timeline {
    flex: 1 1 320px;
    min-width: 260px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    background: var(--space-900);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
  }
  .timeline-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .phase { color: var(--accent); }
  .scrubber { position: relative; height: var(--touch); display: flex; align-items: center; }
  .track { position: relative; width: 100%; height: 8px; background: var(--space-800); border: 1px solid var(--border-strong); border-radius: 4px; overflow: hidden; pointer-events: none; }
  .fill { position: absolute; inset: 0 auto 0 0; background: color-mix(in srgb, var(--accent) 75%, transparent); }
  .base { position: absolute; inset: 0 auto 0 0; border-right: 2px dashed var(--text-muted); }
  .range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; touch-action: manipulation; }
  .marks-row { display: flex; align-items: center; gap: 12px; }
  .preflight, .postflight { display: flex; gap: 8px; color: var(--blueprint-text); flex: none; }
  .marks { position: relative; flex: 1; height: 16px; }
  .marks span { position: absolute; translate: -50% 0; white-space: nowrap; }
  .marks span:first-child { translate: 0 0; }
  .marks span:last-child { translate: -100% 0; }
  .marks .now { color: var(--accent); }
  :root[data-survival] .member[aria-pressed='true'] { box-shadow: none; }
  @media (max-width: 1100px) { .crew { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 767px) { .name, .marks span:nth-child(even), .preflight { display: none; } }
</style>
