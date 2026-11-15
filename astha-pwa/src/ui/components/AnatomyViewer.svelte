<script lang="ts">
  // Anatomy Viewer (COMP-02, C4 §3.2, ADR-004): avatar 3D bajo demanda + hotspots HTML ≥ 48 px + respaldo SVG.
  // 0 fps en reposo: se dibuja un frame por cambio de estado, de vista, de tamaño o por pointermove (agrupado en
  // rAF solo mientras el dedo está apoyado). Al desmontar (salir de la vista) se llama a dispose().
  import { onMount, untrack } from 'svelte';
  import { REGION_IDS, type RegionId, type RegionState } from '../../engine/types';
  import { REGION_LABEL, STATUS_LABEL } from '../bridge/uiState.svelte';
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
  let { regions, view = $bindable('front'), selected = null, variant = 'full', maxPixelRatio = 1.5, onselect }: Props = $props();

  let canvas = $state<HTMLCanvasElement>();
  let avatar = $state<Avatar | null>(null);
  let failed = $state(false);
  let anchors = $state<Anchors | null>(null);
  let dragging = $state(false);

  const useSvg = $derived(variant === 'compact' || variant === 'fallback' || failed || !avatar);

  function draw() {
    if (avatar) anchors = avatar.render(regions, selected);
  }

  onMount(() => {
    if (variant === 'compact' || variant === 'fallback') return;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    // Import diferido DESPUÉS del primer pintado: el triage funciona con el SVG mientras carga Three.js.
    requestAnimationFrame(() => {
      import('./avatar3d')
        .then(({ createAvatar }) => {
          if (disposed || !canvas) return;
          avatar = createAvatar(canvas, { maxPixelRatio, onContextLost: () => { failed = true; } });
          avatar.setYaw(view === 'back' ? Math.PI : 0);
          ro = new ResizeObserver(() => { avatar?.resize(); draw(); });
          ro.observe(canvas);
          draw();
        })
        .catch(() => { failed = true; });
    });
    return () => {
      disposed = true;
      ro?.disconnect();
      avatar?.dispose();
      avatar = null;
    };
  });

  // Un frame por cambio de estado o selección.
  $effect(() => {
    void regions; void selected;
    untrack(draw);
  });

  // Cambio de vista: transición finita.
  $effect(() => {
    const target = view === 'back' ? Math.PI : 0;
    untrack(() => avatar?.animateTo(target, draw));
  });

  // Arrastre para girar: frames solo mientras hay contacto, sin inercia.
  let lastX = 0;
  let pending = false;
  let deltaYaw = 0;
  function down(e: PointerEvent) {
    if (!avatar) return;
    dragging = true;
    lastX = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!dragging || !avatar) return;
    deltaYaw += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (!avatar) return;
      avatar.setYaw(avatar.yaw + deltaYaw);
      deltaYaw = 0;
      draw();
    });
  }
  function up() { dragging = false; }

  function keydown(e: KeyboardEvent) {
    if (e.key === 'v' || e.key === 'V') view = view === 'front' ? 'back' : 'front';
    else if (avatar && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      avatar.setYaw(avatar.yaw + (e.key === 'ArrowLeft' ? -1 : 1) * (Math.PI / 4));
      draw();
    }
  }
</script>

<div class="viewer" class:crisis={variant === 'crisis'}>
  <div class="row toolbar" role="toolbar" aria-label="Orientación del avatar">
    <button type="button" class="btn" aria-pressed={view === 'front'} onclick={() => (view = 'front')}>Frontal</button>
    <button type="button" class="btn" aria-pressed={view === 'back'} onclick={() => (view = 'back')}>Posterior</button>
    {#if failed}<span class="muted note">Vista simplificada</span>{/if}
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="stage" onkeydown={keydown}>
    {#if useSvg}
      <BodySvg {regions} {view} {selected} {onselect} />
    {/if}
    {#if variant !== 'compact' && variant !== 'fallback' && !failed}
      <div
        class="scene"
        class:hidden={!avatar}
        role="group"
        aria-label="Avatar anatómico, vista {view === 'front' ? 'frontal' : 'posterior'}"
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
              style="translate: {a.x}px {a.y}px"
              aria-pressed={selected === id}
              aria-label="{REGION_LABEL[id]}, {STATUS_LABEL[r?.status ?? 'none']}, {r?.alertCount ?? 0} alertas"
              onfocus={() => { if (a.hidden) view = view === 'front' ? 'back' : 'front'; }}
              onclick={() => onselect?.(id)}
            >
              <span class="sym" aria-hidden="true">{r?.dubious ? '?' : ''}</span>
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
  .stage { position: relative; min-height: 420px; }
  .scene { position: absolute; inset: 0; touch-action: none; cursor: grab; }
  .scene.hidden { visibility: hidden; }
  canvas { width: 100%; height: 100%; display: block; }
  .crisis :global(.region:not([data-status='critical'])) { opacity: 0.4; }
  .hotspot {
    position: absolute;
    left: 0;
    top: 0;
    margin: -24px 0 0 -24px;
    width: var(--touch);
    height: var(--touch);
    border-radius: 50%;
    border: var(--st-bw) solid var(--st);
    background: color-mix(in srgb, var(--space-950) 70%, transparent);
    color: var(--st-text);
    font-weight: 800;
    font-size: 1.125rem;
    cursor: pointer;
  }
  .hotspot::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: var(--st-fill); pointer-events: none; }
  .hotspot.selected, .hotspot:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  .hotspot.away { opacity: 0.35; pointer-events: none; }
</style>
