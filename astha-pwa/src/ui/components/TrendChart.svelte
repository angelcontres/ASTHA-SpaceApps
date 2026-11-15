<script lang="ts">
  // Trend Chart (COMP-04, ADR-003): uPlot 2D Canvas time-series chart across up to 180 flight days with
  // NASA-STD-3001 threshold bands (Nominal / Caution / Critical), dashed pre-flight baseline (days 1-14),
  // zero passive timers, and automatic visibilitychange suspension (RNF-POW-01).
  import { onMount } from 'svelte';
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';
  import { INDICATORS } from '../../engine/classifier';
  import { median } from '../../engine/drift';
  import type { IndicatorId } from '../../engine/types';
  import { indLabel, indShort } from '../bridge/uiState.svelte';

  interface Props {
    indicator: IndicatorId;
    days: number[];
    values: (number | null)[];
    height?: number;
  }
  const { indicator, days, values, height = 220 }: Props = $props();

  let host = $state<HTMLDivElement>();
  let chart: uPlot | null = null;
  let lastId: IndicatorId | null = null;
  let pendingData: uPlot.AlignedData | null = null;
  let pendingRebuild = false;

  const def = $derived(INDICATORS[indicator]);
  const displayLabel = $derived(indLabel({ id: indicator, label: def.label }));
  const displayShort = $derived(indShort({ id: indicator, short: def.short }));
  const baseline = $derived.by(() => {
    const xs = values.slice(0, 14).filter((v): v is number => v != null);
    return xs.length >= 7 ? median(xs) : null;
  });

  function css(name: string, fallback: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function yRange(): [number, number] {
    const xs = values.filter((v): v is number => v != null);
    const finite = def.bands.flatMap((b) => [b.min, b.max]).filter((v): v is number => v !== undefined);
    const lo = Math.min(...xs, ...finite);
    const hi = Math.max(...xs, ...finite);
    const pad = (hi - lo) * 0.08 || 1;
    return [lo - pad, hi + pad];
  }

  /** Renders NASA-STD-3001 threshold bands and personal baseline beneath the active curve (drawClear hook). */
  function drawBands(u: uPlot) {
    const ctx = u.ctx;
    const { left, top, width, height: h } = u.bbox;
    const color = {
      nominal: css('--alert-green', '#10b981'),
      caution: css('--alert-yellow', '#f59e0b'),
      critical: css('--alert-red', '#ef4444'),
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, h);
    ctx.clip();
    for (const b of def.bands) {
      const y1 = u.valToPos(b.max ?? u.scales.y.max!, 'y', true);
      const y0 = u.valToPos(b.min ?? u.scales.y.min!, 'y', true);
      ctx.globalAlpha = b.status === 'nominal' ? 0.07 : b.status === 'caution' ? 0.12 : 0.14;
      ctx.fillStyle = color[b.status];
      ctx.fillRect(left, Math.min(y0, y1), width, Math.abs(y0 - y1));
    }
    if (baseline != null) {
      const y = u.valToPos(baseline, 'y', true);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = css('--text-muted', '#a3acbd');
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5 * (globalThis.devicePixelRatio || 1);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function build() {
    if (!host) return;
    chart?.destroy();
    const text = css('--text-muted', '#a3acbd');
    const grid = css('--border', '#141e36');
    const opts: uPlot.Options = {
      width: host.clientWidth || 320,
      height,
      pxAlign: 1,
      cursor: { drag: { x: false, y: false }, points: { size: 8 } },
      legend: { show: false },
      scales: { x: { time: false }, y: { range: yRange } },
      axes: [
        { stroke: text, grid: { stroke: grid, width: 1 }, ticks: { stroke: grid }, values: (_u, v) => v.map((d) => `FD-${d}`) },
        { stroke: text, grid: { stroke: grid, width: 1 }, ticks: { stroke: grid }, size: 52 },
      ],
      series: [
        {},
        { label: displayShort, stroke: css('--accent', '#38bdf8'), width: 2, points: { show: false }, spanGaps: true },
      ],
      hooks: { drawClear: [drawBands] },
    };
    chart = new uPlot(opts, [days, values], host);
    lastId = indicator;
    pendingData = null;
    pendingRebuild = false;
  }

  function onVisibilityChange() {
    if (document.hidden || !chart) return;
    if (pendingRebuild) build();
    else if (pendingData) {
      chart.setData(pendingData);
      pendingData = null;
    }
  }

  onMount(() => {
    build();
    let w = host?.clientWidth ?? 0;
    const ro = new ResizeObserver(() => {
      if (document.hidden) return;
      const nw = host?.clientWidth ?? 0;
      if (chart && nw && nw !== w) {
        w = nw;
        chart.setSize({ width: nw, height });
      }
    });
    if (host) ro.observe(host);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      ro.disconnect();
      chart?.destroy();
      chart = null;
    };
  });

  // Redraw strictly on indicator or data change (0 passive timers; defers while document.hidden).
  $effect(() => {
    const id = indicator;
    const d = [days, values] as uPlot.AlignedData;
    if (!chart) return;
    if (document.hidden) {
      if (id !== lastId) pendingRebuild = true;
      else pendingData = d;
      return;
    }
    if (id !== lastId) build();
    else chart.setData(d);
  });
</script>

<figure class="chart" aria-label="{displayLabel} trend over {days.length} mission days with NASA-STD-3001 threshold bands and personal baseline">
  <div bind:this={host} class="plot"></div>
  <figcaption class="unit">
    {displayLabel} ({def.unit}) · bands: green nominal, yellow caution, red critical · dashed: days 1–14 baseline
  </figcaption>
</figure>

<style>
  .chart { margin: 0; min-width: 0; }
  .plot { width: 100%; }
  figcaption { margin-top: 6px; display: block; }
  .plot :global(.u-wrap) { background: transparent; }
</style>
