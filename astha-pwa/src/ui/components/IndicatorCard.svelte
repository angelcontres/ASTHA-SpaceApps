<script lang="ts">
  // Indicator Card (COMP-03 / COMP-03B, C4 §3.2): telemetry value, unit, dual-coded badge, trend slope arrow,
  // NASA-STD-3001 range gauge bar, and baseline drift chip WITHOUT coloring nominal cards yellow ([UI-09]).
  import { INDICATORS } from '../../engine/classifier';
  import type { IndicatorState } from '../../engine/types';
  import { fmt, indLabel, STATUS_LABEL } from '../bridge/uiState.svelte';
  import HudIcon from './HudIcon.svelte';

  interface Props {
    indicator: IndicatorState;
    /** Secondary reading for compound cards (systolic/diastolic Blood Pressure). */
    second?: IndicatorState | null;
    variant?: 'vital' | 'habitat' | 'compound' | 'zen';
    active?: boolean;
    onopen?: () => void;
  }
  const { indicator, second = null, variant = 'vital', active = false, onopen }: Props = $props();

  const SEV = { none: -1, nominal: 0, caution: 1, critical: 2 } as const;
  const status = $derived(second && SEV[second.status] > SEV[indicator.status] ? second.status : indicator.status);
  // AC-CLIN-03 / CU-09: SBP >= 140 displays explicit "CRITICAL SANS" severity tag.
  const statusText = $derived(indicator.id === 'sbp' && indicator.status === 'critical' ? 'CRITICAL SANS' : STATUS_LABEL[status]);
  const title = $derived(second ? 'Blood Pressure' : indLabel(indicator));
  const slope = $derived(indicator.slope);
  const arrow = $derived(slope == null ? '' : slope > 0.05 ? '↑' : slope < -0.05 ? '↓' : '→');
  const trendWord = $derived(arrow === '↑' ? 'rising' : arrow === '↓' ? 'falling' : arrow ? 'steady' : '');

  // Drift chip policy (UI-09): while still nominal, display drift chip without turning the card yellow.
  const drift = $derived(
    status === 'nominal' && indicator.daysToCaution != null && indicator.daysToCaution <= 7 ? indicator.daysToCaution : null,
  );
  const zDrift = $derived(status === 'nominal' && indicator.z != null && Math.abs(indicator.z) >= 2.5);

  // Smooth one-shot numerical tween on value updates (0 idle timers; skipped in Survival / reduced-motion).
  let tweenVal = $state<number | null>(null);
  let tweenSecond = $state<number | null>(null);
  let flashKey = $state(0);
  let primed = false;

  $effect(() => {
    const target = indicator.value;
    const target2 = second?.value ?? null;
    const disabled =
      typeof window === 'undefined' ||
      document.hidden ||
      document.documentElement.hasAttribute('data-survival') ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!primed || disabled || target == null) {
      primed = true;
      tweenVal = target;
      tweenSecond = target2;
      return;
    }
    const start1 = tweenVal ?? target;
    const start2 = tweenSecond ?? target2;
    if (start1 === target && start2 === target2) return;
    flashKey += 1;
    const t0 = performance.now();
    const DUR = 340;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / DUR);
      const ease = 1 - (1 - k) ** 3;
      tweenVal = start1 + (target - start1) * ease;
      if (start2 != null && target2 != null) tweenSecond = start2 + (target2 - start2) * ease;
      else tweenSecond = target2;
      if (k < 1) raf = requestAnimationFrame(step);
      else {
        tweenVal = target;
        tweenSecond = target2;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });

  const valueText = $derived(
    second
      ? `${fmt(tweenVal ?? indicator.value, indicator.decimals)}/${fmt(tweenSecond ?? second.value, second.decimals)}`
      : fmt(tweenVal ?? indicator.value, indicator.decimals),
  );

  // Normalized gauge bar across NASA-STD-3001 threshold span + safe nominal band.
  const gauge = $derived.by(() => {
    if (indicator.value == null) return null;
    const def = INDICATORS[indicator.id];
    const nom = def?.bands.find((b) => b.status === 'nominal');
    const finite = def?.bands.flatMap((b) => [b.min, b.max]).filter((v): v is number => v !== undefined) ?? [];
    if (!finite.length || !nom) return null;
    const rawLo = Math.min(...finite, indicator.value);
    const rawHi = Math.max(...finite, indicator.value);
    const span = rawHi - rawLo || 1;
    const lo = rawLo - span * 0.1;
    const hi = rawHi + span * 0.1;
    const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
    const safeLeft = pct(nom.min ?? lo);
    const safeRight = pct(nom.max ?? hi);
    return {
      safeLeft,
      safeWidth: Math.max(4, safeRight - safeLeft),
      pointer: Math.max(2, Math.min(98, pct(indicator.value))),
    };
  });

  const aria = $derived(
    `${title}, ${valueText} ${indicator.unit}, ${statusText}` +
      (trendWord ? `, trend ${trendWord}` : '') +
      `, nominal ${indicator.nominalRange}` +
      (drift ? `, caution projected in ${drift} days` : '') +
      (indicator.isSuspect ? ', suspect reading' : ''),
  );
</script>

<article class="card ind st {status} {variant}" class:active aria-label={aria}>
  <button type="button" class="hit" onclick={onopen} aria-label={aria} aria-pressed={active}>
    <span class="head">
      <span class="label">
        {#if variant === 'vital' || variant === 'compound'}<span class="live-dot st {status}" aria-hidden="true"></span>{/if}
        {title}
      </span>
      <span class="badge"><span class="sym" aria-hidden="true"></span> {statusText}</span>
    </span>
    {#key flashKey}
      <span class="main" class:val-flash={flashKey > 0}>
        <span class="value num st-value">{valueText}</span>
        {#if indicator.isSuspect || second?.isSuspect}<span class="suspect" title="Outside plausible physiological range">?</span>{/if}
        <span class="unit">{indicator.unit}</span>
        {#if arrow}
          <span class="arrow" aria-hidden="true">
            <HudIcon name={arrow === '↑' ? 'trending-up' : arrow === '↓' ? 'trending-down' : 'arrow-right'} size={15} />
          </span>
        {/if}
      </span>
    {/key}
    {#if variant !== 'zen'}
      {#if gauge}
        <span class="gauge" aria-hidden="true">
          <span class="gauge-safe" style="left:{gauge.safeLeft}%; width:{gauge.safeWidth}%"></span>
          <span class="gauge-fill" style="width:{gauge.pointer}%"></span>
          <span class="gauge-ptr" style="left:{gauge.pointer}%"></span>
        </span>
      {/if}
      {#if variant === 'vital' && indicator.id === 'hr'}
        <svg class="ecg-trace" viewBox="0 0 180 22" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0 12 L24 12 L30 9 L35 12 L42 12 L46 4 L51 20 L56 2 L61 16 L66 12 L76 12 L82 9 L88 12 L114 12 L120 9 L125 12 L132 12 L136 4 L141 20 L146 2 L151 16 L156 12 L180 12"
          />
        </svg>
      {/if}
      <span class="unit range">Nominal: {indicator.nominalRange}{second ? ` · ${second.nominalRange}` : ''}</span>
      {#if drift}
        <span class="chip">Drift: caution in {drift} {drift === 1 ? 'day' : 'days'}</span>
      {:else if zDrift}
        <span class="chip">Baseline deviation (Z {fmt(indicator.z, 1)})</span>
      {/if}
      {#if indicator.value == null}<span class="muted range">No reading recorded today</span>{/if}
    {/if}
  </button>
</article>

<style>
  .ind {
    position: relative;
    border-left: 4px solid var(--st);
    outline: var(--st-bw) solid color-mix(in srgb, var(--st) 55%, transparent);
    outline-offset: -1px;
    min-width: 0;
    transition: border-color 280ms ease, outline-color 280ms ease, background-color 280ms ease, transform 180ms ease;
  }
  .ind:hover { transform: translateY(-1px); }
  .ind.critical { background: color-mix(in srgb, var(--alert-red) 12%, var(--space-800)); }
  .ind.active { outline: 3px solid var(--accent); }
  .live-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 5px;
    border-radius: 50%;
    background: var(--st);
    box-shadow: 0 0 6px var(--st);
    vertical-align: 1px;
    animation: liveBreath 1.6s ease-in-out infinite;
  }
  .val-flash { animation: valueFlash 460ms cubic-bezier(0.22, 1, 0.36, 1); }
  .ecg-trace {
    width: 100%;
    height: 18px;
    margin: 2px 0;
    fill: none;
    stroke: var(--st);
    stroke-width: 1.5;
    opacity: 0.72;
  }
  .ecg-trace path {
    stroke-dasharray: 220;
    stroke-dashoffset: 0;
    animation: ecgSweep 2.4s linear infinite;
  }
  @keyframes liveBreath {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.78); }
  }
  @keyframes valueFlash {
    0% { transform: translateY(-2px); filter: brightness(1.35); }
    100% { transform: translateY(0); filter: brightness(1); }
  }
  @keyframes ecgSweep {
    0% { stroke-dashoffset: 220; }
    100% { stroke-dashoffset: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ind, .gauge-ptr, .gauge-fill { transition: none; }
    .ind:hover { transform: none; }
    .live-dot, .val-flash, .ecg-trace path { animation: none; }
  }
  .hit {
    all: unset;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    min-height: var(--touch);
    padding: 12px 14px;
    cursor: pointer;
    transition: background-color 140ms ease;
  }
  .hit:hover { background: color-mix(in srgb, var(--accent) 7%, transparent); }
  .hit:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: var(--radius); }
  .head { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
  .badge { font-size: 0.8125rem; font-weight: 700; color: var(--st-text); white-space: nowrap; }
  .main { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .st-value { color: var(--text); }
  .ind.critical .st-value { color: var(--alert-red-text); }
  .arrow { font: 700 1.25rem var(--font-num); color: var(--text-muted); }
  .suspect { font-weight: 800; color: var(--alert-yellow); }
  .gauge {
    position: relative;
    display: block;
    height: 6px;
    border-radius: 3px;
    background: var(--space-950);
    border: 1px solid var(--border-strong);
  }
  .gauge-safe {
    position: absolute;
    top: 0;
    bottom: 0;
    background: color-mix(in srgb, var(--alert-green) 35%, transparent);
  }
  .gauge-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    border-radius: 3px;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--st) 45%, transparent));
    transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1), background-color 280ms ease;
  }
  .gauge-ptr {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 4px;
    margin-left: -2px;
    border-radius: 2px;
    background: var(--st);
    box-shadow: 0 0 8px color-mix(in srgb, var(--st) 70%, transparent);
    transition: left 420ms cubic-bezier(0.22, 1, 0.36, 1), background-color 280ms ease;
  }
  :root[data-survival] .gauge { display: none; }
  :root[data-survival] .gauge-ptr { box-shadow: none; }
  .range { display: block; }
  .chip {
    align-self: flex-start;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--alert-yellow);
    border: 1px dashed var(--alert-yellow);
    border-radius: 999px;
    padding: 2px 10px;
  }
  .zen .value { font-size: 4rem; }
  .habitat .value { font-size: 1.5rem; }
</style>
