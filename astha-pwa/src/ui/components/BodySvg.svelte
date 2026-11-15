<script lang="ts">
  // Front/Back SVG silhouette (RF-ANA-01..03): interactive fallback for the 3D avatar and 96 px compact variant
  // used in crew summary cards (C4 §3.2). Every region carries dual coding (color + SVG pattern + glyph).
  import { REGION_IDS, type RegionId, type RegionState } from '../../engine/types';
  import { REGION_HOTSPOT_SHORT, REGION_LABEL, STATUS_LABEL } from '../bridge/uiState.svelte';

  interface Props {
    regions: Record<RegionId, RegionState>;
    view?: 'front' | 'back';
    selected?: RegionId | null;
    compact?: boolean;
    /** Hides HTML overlay pins when rendered underneath the 3D hotspot layer. */
    hotspots?: boolean;
    onselect?: (id: RegionId) => void;
    label?: string;
  }
  const { regions, view = 'front', selected = null, compact = false, hotspots = true, onselect, label = '' }: Props = $props();

  // Hotspot placement (% of SVG stage) offset beside the EVA silhouette for unobstructed visual inspection.
  const SPOT: Record<RegionId, { x: number; y: number }> = {
    head: { x: 78, y: 12 },
    chest: { x: 78, y: 31 },
    lumbar: { x: 22, y: 52 },
    legs: { x: 78, y: 78 },
    general: { x: 18, y: 41 },
  };
  const fill = (id: RegionId) => `url(#fill-${regions[id]?.status ?? 'none'})`;
  const sym = (r: RegionState | undefined) => (r?.isSuspect ? '?' : '');
</script>

<div class="body" class:compact role="group" aria-label={label || `Anatomical silhouette, ${view} view`}>
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

    <!-- Holographic turntable floor rings -->
    <ellipse cx="100" cy="390" rx="74" ry="7" class="eva-ring" />
    <ellipse cx="100" cy="390" rx="48" ry="4" class="eva-ring-inner" />

    <!-- Arms, deltoid bells, wrist telemetry cuff & EVA gloves -->
    <g class="region" class:sel={selected === 'general'} data-status={regions.general?.status}>
      <path d="M56 80 Q36 80 30 98 L19 156 L18 198 L24 214 L38 214 L42 194 L46 158 L54 114 Z" fill={fill('general')} />
      <path d="M144 80 Q164 80 170 98 L181 156 L182 198 L176 214 L162 214 L158 194 L154 158 L146 114 Z" fill={fill('general')} />
      <path d="M35 84 Q42 104 54 112" class="mark" />
      <path d="M165 84 Q158 104 146 112" class="mark" />
      <line x1="24" y1="146" x2="46" y2="149" class="mark" />
      <line x1="176" y1="146" x2="154" y2="149" class="mark" />
      {#if view === 'front'}
        <rect x="20" y="160" width="14" height="18" rx="3" class="eva-cuff" />
      {/if}
    </g>

    <!-- EVA Helmet, Neck Seal Collar & Gold Reflective Visor / Rear Shell -->
    <g class="region" class:sel={selected === 'head'} data-status={regions.head?.status}>
      <rect x="82" y="64" width="36" height="14" rx="5" fill={fill('head')} />
      <ellipse cx="100" cy="40" rx="29" ry="31" fill={fill('head')} />
      <path d="M76 68 Q100 75 124 68" class="eva-trim" />
      <rect x="68" y="34" width="6" height="11" rx="2" class="eva-trim" />
      <rect x="126" y="34" width="6" height="11" rx="2" class="eva-trim" />
      {#if view === 'front'}
        <path d="M77 35 Q100 17 123 35 Q122 55 100 59 Q78 55 77 35 Z" class="eva-visor" />
        <circle cx="91" cy="39" r="2.8" class="mark" /><circle cx="109" cy="39" r="2.8" class="mark" />
      {:else}
        <path d="M78 28 Q100 22 122 28 L118 58 Q100 63 82 58 Z" class="mark" />
      {/if}
    </g>

    <!-- Broad EVA Chest Carapace, Sternum Telemetry Beacon & Back PLSS Backpack + O2 Tanks -->
    <g class="region" class:sel={selected === 'chest'} data-status={regions.chest?.status}>
      {#if view === 'back'}
        <line x1="126" y1="48" x2="126" y2="82" class="eva-trim" />
      {/if}
      <path d="M54 78 Q100 67 146 78 L138 166 L62 166 Z" fill={fill('chest')} />
      {#if view === 'front'}
        <path d="M68 88 L94 94 L94 128 L66 122 Z" class="mark" />
        <path d="M132 88 L106 94 L106 128 L134 122 Z" class="mark" />
        <circle cx="100" cy="108" r="8" class="eva-beacon" />
        <path d="M100 103 q4 -6 8 0 q-2 6 -8 10 q-6 -4 -8 -10 q4 -6 8 0" class="mark" />
      {:else}
        <rect x="66" y="76" width="68" height="86" rx="8" class="eva-pack" />
        <rect x="76" y="84" width="16" height="70" rx="8" class="eva-tank" />
        <rect x="108" y="84" width="16" height="70" rx="8" class="eva-tank" />
      {/if}
    </g>

    <!-- Utility Belt, Pelvic Girdle, Umbilical Hose & Dorsal Kidneys -->
    <g class="region" class:sel={selected === 'lumbar'} data-status={regions.lumbar?.status}>
      <path d="M62 168 L138 168 L142 226 L58 226 Z" fill={fill('lumbar')} />
      <rect x="59" y="168" width="82" height="10" rx="3" class="eva-trim" />
      <rect x="132" y="165" width="10" height="16" rx="2" class="eva-trim" />
      <path d="M56 154 Q46 182 64 204" class="mark" />
      {#if view === 'back'}
        <ellipse cx="83" cy="198" rx="8" ry="12" class="mark" /><ellipse cx="117" cy="198" rx="8" ry="12" class="mark" />
      {/if}
    </g>

    <!-- EVA Legs, Knee Seal Rings & Lunar Boots -->
    <g class="region" class:sel={selected === 'legs'} data-status={regions.legs?.status}>
      <path d="M60 228 L97 228 L95 364 L64 364 Z" fill={fill('legs')} />
      <path d="M103 228 L140 228 L136 364 L105 364 Z" fill={fill('legs')} />
      <path d="M63 364 L96 364 L98 389 L56 389 Q56 374 63 364 Z" fill={fill('legs')} />
      <path d="M104 364 L137 364 Q144 374 144 389 L102 389 Z" fill={fill('legs')} />
      <ellipse cx="79" cy="296" rx="14" ry="8" class="eva-trim" />
      <ellipse cx="121" cy="296" rx="14" ry="8" class="eva-trim" />
      <line x1="65" y1="352" x2="94" y2="352" class="mark" />
      <line x1="106" y1="352" x2="135" y2="352" class="mark" />
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
        aria-label="{REGION_LABEL[id]}, {STATUS_LABEL[r?.status ?? 'none']}, {r?.alertCount ?? 0} alerts{r?.isSuspect ? ', suspect reading' : ''}"
        onclick={() => onselect?.(id)}
      >
        <span class="sym" aria-hidden="true">{sym(r)}</span>
        <span class="short">{REGION_HOTSPOT_SHORT[id]}</span>
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
  .mark { fill: none; stroke: var(--text-muted); stroke-width: 1.4; }
  circle.mark { fill: var(--text-muted); stroke: none; }
  .eva-ring { fill: none; stroke: var(--alert-yellow); stroke-width: 1.4; opacity: 0.72; }
  .eva-ring-inner { fill: none; stroke: var(--accent); stroke-width: 1.1; opacity: 0.78; }
  .eva-trim { fill: rgba(29, 78, 216, 0.28); stroke: var(--accent); stroke-width: 1.2; }
  .eva-visor { fill: rgba(245, 158, 11, 0.34); stroke: var(--alert-yellow); stroke-width: 1.6; }
  .eva-pack { fill: rgba(148, 163, 184, 0.16); stroke: var(--border-strong); stroke-width: 1.3; }
  .eva-tank { fill: rgba(56, 189, 248, 0.25); stroke: var(--accent); stroke-width: 1.3; }
  .eva-beacon { fill: rgba(16, 185, 129, 0.28); stroke: var(--accent); stroke-width: 1.4; }
  .eva-cuff { fill: rgba(10, 27, 56, 0.8); stroke: var(--accent); stroke-width: 1.2; }

  .hotspot {
    position: absolute;
    translate: -50% -50%;
    min-width: var(--touch);
    min-height: var(--touch);
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
  .short { font-size: 0.8125rem; white-space: nowrap; }
  @media (max-width: 420px) { .short { display: none; } }
</style>
