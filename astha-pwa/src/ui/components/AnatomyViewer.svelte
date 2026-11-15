<script lang="ts">
  // Anatomy Viewer (COMP-02, C4 §3.2, ADR-004): 3-layer hybrid renderer (on-demand Three.js WebGL canvas,
  // >= 48 px HTML hotspot overlay, and automatic SVG fallback). 0 FPS at rest: renders one frame per state/view
  // change, resize, or coalesced pointer drag; explicitly disposes WebGL resources on unmount or fallback toggle.
  import { untrack } from 'svelte';
  import { REGION_IDS, type RegionId, type RegionState } from '../../engine/types';
  import { REGION_HOTSPOT_SHORT, REGION_LABEL, STATUS_LABEL } from '../bridge/uiState.svelte';
  import type { Anchors, Avatar } from './avatar3d';
  import BodySvg from './BodySvg.svelte';

  interface Props {
    regions: Record<RegionId, RegionState>;
    view?: 'front' | 'back';
    selected?: RegionId | null;
    variant?: 'full' | 'compact' | 'crisis' | 'fallback';
    maxPixelRatio?: number;
    onselect?: (id: RegionId) => void;
  }
  let {
    regions,
    view = $bindable('front'),
    selected = null,
    variant = 'full',
    maxPixelRatio = 1.5,
    onselect,
  }: Props = $props();

  let canvas = $state<HTMLCanvasElement>();
  let avatar = $state<Avatar | null>(null);
  let failed = $state(false);
  let anchors = $state<Anchors | null>(null);
  let dragging = $state(false);

  const webglAllowed = $derived(variant !== 'compact' && variant !== 'fallback' && !failed);
  const useSvg = $derived(!webglAllowed || !avatar);

  const DRAG_THRESHOLD_PX = 6;
  let pointerId: number | null = null;
  let startX = 0;
  let lastX = 0;
  let dragRaf: number | null = null;
  let deltaYaw = 0;

  function draw() {
    if (avatar) anchors = avatar.render(regions, selected);
  }

  // Lifecycle tied reactively to `webglAllowed` so dynamic Survival Mode or `webglcontextlost` disposes WebGL cleanly.
  $effect(() => {
    if (!webglAllowed || !canvas) return;
    const targetCanvas = canvas;
    const ratio = maxPixelRatio;
    let disposed = false;
    let initRaf: number | null = null;
    let ro: ResizeObserver | null = null;
    let localAvatar: Avatar | null = null;

    // Deferred dynamic import AFTER first paint so startup stays < 1.5 s while SVG handles triage immediately.
    initRaf = requestAnimationFrame(() => {
      initRaf = null;
      if (disposed) return;
      import('./avatar3d')
        .then(({ createAvatar }) => {
          if (disposed || !targetCanvas.isConnected) return;
          localAvatar = createAvatar(targetCanvas, {
            maxPixelRatio: ratio,
            onContextLost: () => {
              failed = true;
            },
          });
          localAvatar.setYaw(untrack(() => (view === 'back' ? Math.PI : 0)));
          avatar = localAvatar;
          ro = new ResizeObserver(() => {
            localAvatar?.resize();
            draw();
          });
          ro.observe(targetCanvas);
          draw();
        })
        .catch(() => {
          failed = true;
        });
    });

    return () => {
      disposed = true;
      if (initRaf !== null) cancelAnimationFrame(initRaf);
      if (dragRaf !== null) {
        cancelAnimationFrame(dragRaf);
        dragRaf = null;
      }
      ro?.disconnect();
      localAvatar?.dispose();
      avatar = null;
      anchors = null;
      dragging = false;
      pointerId = null;
    };
  });

  // Render single frame when anatomical region statuses or selection change.
  $effect(() => {
    void regions;
    void selected;
    untrack(draw);
  });

  // Finite Front/Back rotation transition (halted on arrival or 1-frame snap under reduced-motion).
  $effect(() => {
    const target = view === 'back' ? Math.PI : 0;
    untrack(() => avatar?.animateTo(target, draw));
  });

  // Drag-to-rotate: frames only while pointer is held (zero inertia, zero idle RAF).
  function down(e: PointerEvent) {
    if (!avatar || (e.target as Element).closest('.hotspot')) return;
    pointerId = e.pointerId;
    startX = lastX = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function move(e: PointerEvent) {
    if (e.pointerId !== pointerId || !avatar) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD_PX) return;
      dragging = true;
    }
    deltaYaw += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
    if (dragRaf !== null) return;
    dragRaf = requestAnimationFrame(() => {
      dragRaf = null;
      if (!avatar) return;
      avatar.setYaw(avatar.yaw + deltaYaw);
      deltaYaw = 0;
      draw();
    });
  }

  function up(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    const tap = !dragging && e.type === 'pointerup';
    pointerId = null;
    dragging = false;
    if (tap && avatar) {
      const id = avatar.pick(e.clientX, e.clientY);
      if (id) onselect?.(id);
    }
  }

  function keydown(e: KeyboardEvent) {
    if (e.key === 'v' || e.key === 'V') {
      view = view === 'front' ? 'back' : 'front';
    } else if (avatar && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      avatar.setYaw(avatar.yaw + (e.key === 'ArrowLeft' ? -1 : 1) * (Math.PI / 4));
      draw();
    }
  }
</script>

<div class="viewer" class:crisis={variant === 'crisis'} class:compact-mode={variant === 'compact'} data-variant={variant}>
  <div class="row toolbar" role="toolbar" aria-label="Avatar orientation">
    <button type="button" class="btn" aria-pressed={view === 'front'} onclick={() => (view = 'front')}>Front</button>
    <button type="button" class="btn" aria-pressed={view === 'back'} onclick={() => (view = 'back')}>Back</button>
    {#if failed || variant === 'fallback'}
      <span class="muted note" role="status">SVG fallback active</span>
    {/if}
  </div>

  <!-- Collapsible top hotspot bar for `compact` variant and tablet/mobile viewports (< 1024 px) -->
  <details class="hotspot-bar" class:always={variant === 'compact'} open={variant === 'compact'}>
    <summary class="btn bar-toggle">Anatomical Hotspots ({REGION_IDS.length})</summary>
    <div class="row bar-list" role="group" aria-label="Quick anatomical region selector">
      {#each REGION_IDS as id (id)}
        {@const r = regions[id]}
        <button
          type="button"
          class="btn chip st {r?.status ?? 'none'}"
          class:pulse={r?.status === 'critical'}
          class:selected={selected === id}
          aria-pressed={selected === id}
          aria-label="{REGION_LABEL[id]}, {STATUS_LABEL[r?.status ?? 'none']}, {r?.alertCount ?? 0} alerts"
          onclick={() => onselect?.(id)}
        >
          <span class="sym" aria-hidden="true">{r?.isSuspect ? '?' : ''}</span>
          <span>{REGION_HOTSPOT_SHORT[id]}</span>
        </button>
      {/each}
    </div>
  </details>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="stage" onkeydown={keydown}>
    {#if useSvg}
      <BodySvg {regions} {view} {selected} {onselect} />
    {/if}
    {#if webglAllowed}
      <div
        class="scene"
        class:hidden={!avatar}
        role="group"
        aria-label="Anatomical 3D avatar, {view} view"
        onpointerdown={down}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={up}
      >
        <canvas bind:this={canvas} aria-hidden="true"></canvas>
        {#if anchors}
          {#each REGION_IDS as id (id)}
            {@const r = regions[id]}
            {@const a = anchors[id]}
            <button
              type="button"
              class="hotspot st {r?.status ?? 'none'}"
              class:pulse={r?.status === 'critical'}
              class:selected={selected === id}
              class:away={a.hidden || dragging}
              class:dim={variant === 'crisis' && r?.status !== 'critical' && selected !== id}
              style="translate: {a.x}px {a.y}px"
              aria-pressed={selected === id}
              aria-label="{REGION_LABEL[id]}, {STATUS_LABEL[r?.status ?? 'none']}, {r?.alertCount ?? 0} alerts{r?.isSuspect ? ', suspect reading' : ''}"
              onfocus={() => { if (a.hidden) view = view === 'front' ? 'back' : 'front'; }}
              onclick={() => onselect?.(id)}
            >
              <span class="sym" aria-hidden="true">{r?.isSuspect ? '?' : ''}</span>
              <span class="tag">{REGION_HOTSPOT_SHORT[id]}</span>
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .viewer { display: flex; flex-direction: column; gap: var(--gap); min-width: 0; }
  .note { font-size: 0.8125rem; }
  .hotspot-bar { display: none; }
  .hotspot-bar.always { display: block; }
  @media (max-width: 1023px) { .hotspot-bar { display: block; } }
  .bar-toggle { width: 100%; justify-content: space-between; list-style: none; }
  .bar-toggle::-webkit-details-marker { display: none; }
  .bar-list { margin-top: var(--gap); }
  .chip { border-color: var(--st); }
  .chip.selected { outline: 3px solid var(--accent); outline-offset: 2px; }

  .stage { position: relative; min-height: 420px; }
  .scene { position: absolute; inset: 0; touch-action: none; cursor: pointer; }
  .scene:active { cursor: grabbing; }
  .scene.hidden { visibility: hidden; }
  canvas { width: 100%; height: 100%; display: block; }
  .crisis :global(.region:not([data-status='critical'])) { opacity: 0.4; }
  .hotspot {
    position: absolute;
    left: 0;
    top: 0;
    margin: -24px 0 0 -24px;
    min-width: var(--touch);
    min-height: var(--touch);
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: var(--radius-btn);
    border: var(--st-bw) solid var(--st);
    background: color-mix(in srgb, var(--space-950) 82%, transparent);
    color: var(--st-text);
    font-weight: 800;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .hotspot::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: var(--st-fill); pointer-events: none; }
  .hotspot.selected, .hotspot:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  .hotspot.away { opacity: 0.35; pointer-events: none; }
  .hotspot.dim { opacity: 0.5; }
  .tag { font-size: 0.75rem; white-space: nowrap; }
  @media (max-width: 420px) { .tag { display: none; } }
</style>
