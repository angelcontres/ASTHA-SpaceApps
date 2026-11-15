<script lang="ts">
  // Silueta SVG frontal/posterior (RF-ANA-01..03). Es el respaldo del avatar 3D y la variante `compact` de 96 px
  // del resumen de tripulación (C4 §3.2). Cada región lleva color + patrón + símbolo; nunca solo color.
  import { REGION_IDS, type RegionId, type RegionState } from '../../engine/types';
  import { REGION_LABEL, STATUS_LABEL } from '../bridge/uiState.svelte';

  interface Props {
    regions: Record<RegionId, RegionState>;
    view?: 'front' | 'back';
    selected?: RegionId | null;
    compact?: boolean;
    /** Oculta los hotspots HTML (los pone el visor 3D). */
    hotspots?: boolean;
    onselect?: (id: RegionId) => void;
    label?: string;
  }
  let { regions, view = 'front', selected = null, compact = false, hotspots = true, onselect, label = '' }: Props = $props();

  // Posición del hotspot (% del contenedor) por región.
  const SPOT: Record<RegionId, { x: number; y: number; short: string }> = {
    head: { x: 50, y: 10, short: 'Cabeza' },
    chest: { x: 50, y: 30, short: 'Tórax' },
    lumbar: { x: 50, y: 50, short: 'Lumbar' },
    legs: { x: 50, y: 78, short: 'Piernas' },
    general: { x: 13, y: 40, short: 'General' },
  };
  const fill = (id: RegionId) => `url(#fill-${regions[id]?.status ?? 'none'})`;
  const sym = (r: RegionState | undefined) => (r?.isSuspect ? '?' : '');
</script>

<div class="body" class:compact role="group" aria-label={label || `Silueta anatómica, vista ${view === 'front' ? 'frontal' : 'posterior'}`}>
  <svg viewBox="0 0 200 400" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="pat-caution" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="3" height="8" fill="var(--alert-yellow)" opacity="0.55" />
      </pattern>
      <pattern id="pat-critical" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 0H8M0 0V8" stroke="var(--alert-red)" stroke-width="1.6" opacity="0.8" />
      </pattern>
      {#each ['nominal', 'caution', 'critical', 'none'] as s (s)}
        <pattern id="fill-{s}" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={s === 'nominal' ? 'var(--alert-green)' : s === 'caution' ? 'var(--alert-yellow)' : s === 'critical' ? 'var(--alert-red)' : 'var(--none)'} opacity={s === 'none' ? 0.25 : 0.32} />
          {#if s === 'caution'}<rect width="8" height="8" fill="url(#pat-caution)" />{/if}
          {#if s === 'critical'}<rect width="8" height="8" fill="url(#pat-critical)" />{/if}
        </pattern>
      {/each}
    </defs>

    <g class="region" class:sel={selected === 'general'} data-status={regions.general?.status}>
      <path d="M58 82 L36 92 L26 210 L40 214 L50 120 Z" fill={fill('general')} />
      <path d="M142 82 L164 92 L174 210 L160 214 L150 120 Z" fill={fill('general')} />
    </g>
    <g class="region" class:sel={selected === 'head'} data-status={regions.head?.status}>
      <ellipse cx="100" cy="40" rx="24" ry="28" fill={fill('head')} />
      <rect x="92" y="66" width="16" height="12" fill={fill('head')} />
      {#if view === 'front'}
        <circle cx="91" cy="38" r="3" class="mark" /><circle cx="109" cy="38" r="3" class="mark" />
      {/if}
    </g>
    <g class="region" class:sel={selected === 'chest'} data-status={regions.chest?.status}>
      <path d="M58 80 Q100 70 142 80 L138 168 L62 168 Z" fill={fill('chest')} />
      {#if view === 'front'}<path d="M106 108 q8 -10 14 0 q-4 10 -14 18 q-10 -8 -14 -18 q6 -10 14 0" class="mark" />{/if}
    </g>
    <g class="region" class:sel={selected === 'lumbar'} data-status={regions.lumbar?.status}>
      <path d="M62 170 L138 170 L134 226 L66 226 Z" fill={fill('lumbar')} />
      {#if view === 'back'}
        <ellipse cx="84" cy="196" rx="8" ry="12" class="mark" /><ellipse cx="116" cy="196" rx="8" ry="12" class="mark" />
      {/if}
    </g>
    <g class="region" class:sel={selected === 'legs'} data-status={regions.legs?.status}>
      <path d="M66 228 L98 228 L96 392 L74 392 Z" fill={fill('legs')} />
      <path d="M102 228 L134 228 L126 392 L104 392 Z" fill={fill('legs')} />
    </g>
  </svg>

  {#if hotspots && !compact}
    {#each REGION_IDS as id (id)}
      {@const r = regions[id]}
      <button
        type="button"
        class="hotspot st {r?.status ?? 'none'}"
        class:pulse={r?.status === 'critical'}
        class:selected={selected === id}
        style="left:{SPOT[id].x}%; top:{SPOT[id].y}%"
        aria-pressed={selected === id}
        aria-label="{REGION_LABEL[id]}, {STATUS_LABEL[r?.status ?? 'none']}, {r?.alertCount ?? 0} alertas{r?.isSuspect ? ', dato dudoso' : ''}"
        onclick={() => onselect?.(id)}
      >
        <span class="sym" aria-hidden="true">{sym(r)}</span>
        <span class="short">{SPOT[id].short}</span>
      </button>
    {/each}
  {/if}
</div>

<style>
  .body { position: relative; width: 100%; max-width: 300px; margin: 0 auto; aspect-ratio: 1 / 2; }
  .body.compact { width: 48px; height: 96px; max-width: none; aspect-ratio: auto; }
  svg { width: 100%; height: 100%; display: block; }
  .region path, .region ellipse, .region rect { stroke: var(--border-strong); stroke-width: 1.2; }
  .region[data-status='critical'] path, .region[data-status='critical'] ellipse { stroke: var(--alert-red); stroke-width: 2.5; }
  .region[data-status='caution'] path, .region[data-status='caution'] ellipse { stroke: var(--alert-yellow); stroke-width: 2; }
  .region.sel path, .region.sel ellipse { stroke: var(--accent); stroke-width: 3; }
  .mark { fill: none; stroke: var(--text-muted); stroke-width: 1.5; }
  circle.mark { fill: var(--text-muted); stroke: none; }

  .hotspot {
    position: absolute;
    translate: -50% -50%;
    min-width: var(--touch);
    min-height: var(--touch);
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: var(--radius-btn);
    border: var(--st-bw) solid var(--st);
    background: var(--space-900);
    color: var(--st-text);
    font-weight: 700;
    cursor: pointer;
    transition: transform 100ms;
  }
  .hotspot::after { content: ''; position: absolute; inset: 0; background: var(--st-fill); border-radius: inherit; pointer-events: none; }
  .hotspot:active { transform: scale(0.98); }
  .hotspot.selected { outline: 3px solid var(--accent); outline-offset: 2px; }
  .hotspot:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  .short { font-size: 0.8125rem; }
  @media (max-width: 420px) { .short { display: none; } }
</style>
