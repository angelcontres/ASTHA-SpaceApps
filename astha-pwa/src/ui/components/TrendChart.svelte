<script lang="ts">
  // Trend Chart (COMP-04, ADR-003): uPlot en canvas 2D con la serie de hasta 180 días, bandas de umbral
  // (Nominal / Precaución / Crítico) y línea punteada de la línea base personal (días 1-14).
  // Se redibuja solo cuando cambian los datos o el tamaño; al desmontar se llama a destroy().
  import { onMount } from 'svelte';
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';
  import { INDICATORS } from '../../engine/classifier';
  import { median } from '../../engine/drift';
  import type { IndicatorId } from '../../engine/types';

  interface Props {
    indicator: IndicatorId;
    days: number[];
    values: (number | null)[];
    height?: number;
  }
  let { indicator, days, values, height = 220 }: Props = $props();

  let host = $state<HTMLDivElement>();
  let chart: uPlot | null = null;

  const def = $derived(INDICATORS[indicator]);
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

  /** Bandas de umbral pintadas bajo la serie (hook drawClear). */
  function drawBands(u: uPlot) {
    const ctx = u.ctx;
    const { left, top, width, height: h } = u.bbox;
    const color = { nominal: css('--alert-green', '#10b981'), caution: css('--alert-yellow', '#f59e0b'), critical: css('--alert-red', '#ef4444') };
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
      ctx.lineWidth = 1.5 * devicePixelRatio;
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
        { label: def.short, stroke: css('--accent', '#38bdf8'), width: 2, points: { show: false }, spanGaps: true },
      ],
      hooks: { drawClear: [drawBands] },
    };
    chart = new uPlot(opts, [days, values], host);
  }

  onMount(() => {
    build();
    let w = host?.clientWidth ?? 0;
    const ro = new ResizeObserver(() => {
      const nw = host?.clientWidth ?? 0;
      if (chart && nw && nw !== w) { w = nw; chart.setSize({ width: nw, height }); }
    });
    if (host) ro.observe(host);
    return () => {
      ro.disconnect();
      chart?.destroy(); // libera canvas y listeners (RNF-POW-03)
      chart = null;
    };
  });

  // Cambio de indicador → reconstruir (cambian bandas y escala); cambio de datos → setData.
  let lastId: IndicatorId | null = null;
  $effect(() => {
    const id = indicator;
    const d = [days, values] as uPlot.AlignedData;
    if (!chart) return;
    if (id !== lastId) { lastId = id; build(); }
    else chart.setData(d);
  });
</script>

<figure class="chart" aria-label="Tendencia de {def.label} en {days.length} días, con bandas de umbral y línea base personal">
  <div bind:this={host} class="plot"></div>
  <figcaption class="unit">
    {def.label} ({def.unit}) · bandas: verde nominal, amarillo precaución, rojo crítico · línea punteada: línea base días 1-14
  </figcaption>
</figure>

<style>
  .chart { margin: 0; min-width: 0; }
  .plot { width: 100%; }
  figcaption { margin-top: 6px; display: block; }
  .plot :global(.u-wrap) { background: transparent; }
</style>
