<script lang="ts">
  // Indicator Card (COMP-03 / COMP-03B, C4 §3.2): telemetry value, unit, dual-coded badge, trend slope arrow,
  // NASA-STD-3001 range gauge bar, and baseline drift chip WITHOUT coloring nominal cards yellow ([UI-09]).
  import { INDICATORS } from '../../engine/classifier';
  import type { IndicatorState } from '../../engine/types';
  import { fmt, indLabel, STATUS_LABEL } from '../bridge/uiState.svelte';

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

  const valueText = $derived(
    second
      ? `${fmt(indicator.value, indicator.decimals)}/${fmt(second.value, second.decimals)}`
      : fmt(indicator.value, indicator.decimals),
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
      <span class="label">{title}</span>
      <span class="badge"><span class="sym" aria-hidden="true"></span> {statusText}</span>
    </span>
    <span class="main">
      <span class="value num st-value">{valueText}</span>
      {#if indicator.isSuspect || second?.isSuspect}<span class="suspect" title="Outside plausible physiological range">?</span>{/if}
      <span class="unit">{indicator.unit}</span>
      {#if arrow}<span class="arrow" aria-hidden="true">{arrow}</span>{/if}
    </span>
    {#if variant !== 'zen'}
      {#if gauge}
        <span class="gauge" aria-hidden="true">
          <span class="gauge-safe" style="left:{gauge.safeLeft}%; width:{gauge.safeWidth}%"></span>
          <span class="gauge-ptr" style="left:{gauge.pointer}%"></span>
        </span>
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
  }
  .ind.critical { background: color-mix(in srgb, var(--alert-red) 12%, var(--space-800)); }
  .ind.active { outline: 3px solid var(--accent); }
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
  }
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
  .gauge-ptr {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 4px;
    margin-left: -2px;
    border-radius: 2px;
    background: var(--st);
  }
  :root[data-survival] .gauge { display: none; }
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
