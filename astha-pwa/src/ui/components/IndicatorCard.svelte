<script lang="ts">
  // Indicator Card (COMP-03 / COMP-03B, C4 §3.2): valor, unidad, semáforo con icono, flecha de tendencia,
  // rango nominal y chip de deriva (días a precaución) SIN teñir la tarjeta (el estado sigue siendo nominal).
  import type { IndicatorState } from '../../engine/types';
  import { fmt, STATUS_LABEL } from '../bridge/uiState.svelte';

  interface Props {
    indicator: IndicatorState;
    /** Segundo valor para la variante compuesta (PA sistólica/diastólica). */
    second?: IndicatorState | null;
    variant?: 'vital' | 'habitat' | 'compound' | 'zen';
    active?: boolean;
    onopen?: () => void;
  }
  let { indicator, second = null, variant = 'vital', active = false, onopen }: Props = $props();

  const SEV = { none: -1, nominal: 0, caution: 1, critical: 2 } as const;
  const status = $derived(second && SEV[second.status] > SEV[indicator.status] ? second.status : indicator.status);
  // AC-CLIN-03 / CU-09: con PAS ≥ 140 la tarjeta de presión dice "SANS CRÍTICO", no solo "Crítico".
  const statusText = $derived(indicator.id === 'sbp' && indicator.status === 'critical' ? 'SANS CRÍTICO' : STATUS_LABEL[status]);
  const slope = $derived(indicator.slope);
  const arrow = $derived(slope == null ? '' : slope > 0.05 ? '↑' : slope < -0.05 ? '↓' : '→');
  const trendWord = $derived(arrow === '↑' ? 'ascendente' : arrow === '↓' ? 'descendente' : arrow ? 'estable' : '');
  const drift = $derived(
    status === 'nominal' && indicator.daysToCaution != null && indicator.daysToCaution <= 7 ? indicator.daysToCaution : null,
  );
  const zDrift = $derived(status === 'nominal' && indicator.z != null && Math.abs(indicator.z) >= 2.5);
  const valueText = $derived(
    second
      ? `${fmt(indicator.value, indicator.decimals)}/${fmt(second.value, second.decimals)}`
      : fmt(indicator.value, indicator.decimals),
  );
  const aria = $derived(
    `${second ? 'Presión arterial' : indicator.label}, ${valueText} ${indicator.unit}, ${statusText}` +
      (trendWord ? `, tendencia ${trendWord}` : '') +
      `, nominal ${indicator.nominalRange}` +
      (drift ? `, precaución en ${drift} días` : '') +
      (indicator.dubious ? ', dato dudoso' : ''),
  );
</script>

<article class="card ind st {status} {variant}" class:active aria-label={aria}>
  <button type="button" class="hit" onclick={onopen} aria-label={aria} aria-pressed={active}>
    <span class="head">
      <span class="label">{second ? 'Presión arterial' : indicator.label}</span>
      <span class="badge"><span class="sym" aria-hidden="true"></span> {statusText}</span>
    </span>
    <span class="main">
      <span class="value st-value">{valueText}</span>
      {#if indicator.dubious || second?.dubious}<span class="dubious" title="Fuera del rango fisiológico posible">?</span>{/if}
      <span class="unit">{indicator.unit}</span>
      {#if arrow}<span class="arrow" aria-hidden="true">{arrow}</span>{/if}
    </span>
    {#if variant !== 'zen'}
      <span class="unit range">Nominal: {indicator.nominalRange}{second ? ` · ${second.nominalRange}` : ''}</span>
      {#if drift}
        <span class="chip">Tendencia: precaución en {drift} {drift === 1 ? 'día' : 'días'}</span>
      {:else if zDrift}
        <span class="chip">Inusual frente a tu línea base (Z {fmt(indicator.z, 1)})</span>
      {/if}
      {#if indicator.value == null}<span class="muted range">Sin registro hoy</span>{/if}
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
  .dubious { font-weight: 800; color: var(--alert-yellow); }
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
