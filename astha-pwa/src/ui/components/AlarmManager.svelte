<script lang="ts" module>
  // Tono de advertencia no intrusivo (estilo aviso clínico aeronáutico): cadencia suave de dos notas
  // cálidas (G4 392 Hz -> C5 523 Hz) con ataque progresivo y caída exponencial cada 2 s para alertar
  // sin sobresaltar. Programado en el reloj de audio (0 CPU tras suspenderse).
  let ctx: AudioContext | null = null;
  let activeOscs: OscillatorNode[] = [];

  export function unlockAudio(): void {
    try {
      ctx ??= new AudioContext();
      void ctx.resume().then(() => ctx?.suspend());
    } catch { /* sin Web Audio: se degrada a solo visual */ }
  }

  export function audioReady(): boolean {
    return ctx !== null;
  }

  function scheduleNote(audioCtx: AudioContext, freq: number, start: number, peakGain: number, tailSec: number): OscillatorNode {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    // Ataque gradual de 35 ms y caída suave tipo campana para evitar clics o sobresaltos.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peakGain, start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tailSec);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + tailSec + 0.02);
    return osc;
  }

  export function playCritical(seconds = 8): boolean {
    if (!ctx) return false;
    stopTone();
    void ctx.resume();
    const audioCtx = ctx;
    const t = audioCtx.currentTime + 0.03;
    const cycles = Math.max(1, Math.floor(seconds / 2));
    const scheduled: OscillatorNode[] = [];

    for (let i = 0; i < cycles; i++) {
      const onset = t + i * 2.0;
      scheduled.push(scheduleNote(audioCtx, 392.0, onset, 0.14, 0.55));
      scheduled.push(scheduleNote(audioCtx, 523.25, onset + 0.22, 0.11, 0.72));
    }

    const last = scheduled[scheduled.length - 1];
    if (last) {
      last.onended = () => {
        if (activeOscs === scheduled) {
          activeOscs = [];
          void ctx?.suspend();
        }
      };
    }
    activeOscs = scheduled;
    return true;
  }

  export function stopTone(): void {
    const prev = activeOscs;
    activeOscs = [];
    for (const osc of prev) {
      osc.onended = null;
      try { osc.stop(); } catch { /* ya detenido */ }
    }
    if (ctx?.state === 'running') void ctx.suspend();
  }
</script>

<script lang="ts">
  // Alarm Manager (C4 §3.2, ADR-013, docs/Diseno-UI-UX/03 §2.4). Única capa con aria-live asertivo, por encima
  // de todo (gamificación incluida, RF-GAM-03).
  //  · Precaución: franja amarilla estática ▲, sin sonido.
  //  · Crítico: franja roja con pulso de 1,5 s ✕ + aviso acústico suave (392/523 Hz) durante 8 s.
  //  · Escalada sin reconocimiento: a los 2 min vuelve a sonar y se marca para el CMO; a los 5 min se difunde a
  //    cabina (Vista B). Son dos setTimeout por alerta, cancelados al reconocer: no hay polling.
  import { onMount } from 'svelte';
  import { bridge, type ActiveAlert } from '../bridge/workerBridge.svelte';
  import { STATUS_LABEL, SYSTEM_LABEL, ui } from '../bridge/uiState.svelte';
  import HudIcon from './HudIcon.svelte';

  const ESCALATE_CMO_MS = 2 * 60_000;
  const ESCALATE_CABIN_MS = 5 * 60_000;
  /** Reglas que abren la Vista B (Código Rojo) directamente. */
  const CODE_RED = new Set(['R-RAD-01', 'R-RAD-02', 'R-ENV-01']);

  let audioOn = $state(false);
  const stage = $state<Record<string, 1 | 2 | 3>>({});
  // Temporizadores de escalada: estado interno que no se pinta, por eso no es reactivo.
  const timers = new Map<string, ReturnType<typeof setTimeout>[]>();

  const visible = $derived(bridge.activeAlerts.filter((a) => !a.overridden && a.status !== 'nominal'));
  const criticals = $derived(visible.filter((a) => a.status === 'critical'));
  const unacked = $derived(criticals.filter((a) => !a.acknowledged));
  const top = $derived<ActiveAlert | null>(visible[0] ?? null);

  onMount(() => {
    const unlock = () => { unlockAudio(); audioOn = audioReady(); };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      for (const ts of timers.values()) ts.forEach(clearTimeout);
      timers.clear();
      stopTone();
    };
  });

  // Reacciona a cambios en las alertas críticas sin reconocer: inicia o cancela su escalada.
  $effect(() => {
    const ids = new Set(unacked.map((a) => a.id));
    for (const [id, ts] of timers) {
      if (!ids.has(id)) {
        ts.forEach(clearTimeout);
        timers.delete(id);
        delete stage[id];
      }
    }
    if (!ids.size) stopTone();
    for (const a of unacked) {
      if (timers.has(a.id)) continue;
      stage[a.id] = 1;
      playCritical(); // 0-10 s, consola local
      if (CODE_RED.has(a.ruleId) || a.urgency === 'emergency') {
        if (!ui.codeRedDismissed.includes(a.id)) ui.codeRedId = a.id;
      }
      timers.set(a.id, [
        setTimeout(() => { stage[a.id] = 2; playCritical(); }, ESCALATE_CMO_MS),
        setTimeout(() => {
          stage[a.id] = 3;
          playCritical();
          ui.codeRedId = a.id; // difusión a cabina: Vista B
        }, ESCALATE_CABIN_MS),
      ]);
    }
  });

  function ack(a: ActiveAlert) {
    stopTone();
    bridge.acknowledge(a);
  }

  const stageText = { 1: 'Tono local', 2: 'Escalado al CMO (2 min)', 3: 'Difundido a cabina (5 min)' } as const;
</script>

{#if top}
  {#if top.status === 'critical'}
    <div class="alarm st critical" class:pulse={!top.acknowledged} role="alert" aria-live="assertive">
      <span class="sym big" aria-hidden="true"></span>
      <div class="msg">
        <strong class="alarm-title">Alerta crítica · {SYSTEM_LABEL[top.organ]}</strong>
        <span>{top.explanation}</span>
        <span class="label">
          Regla {top.ruleId}{top.crewId !== 'HAB' ? ` · ${top.crewId}` : ' · hábitat'}
          {#if stage[top.id]} · {stageText[stage[top.id]]}{/if}
          {#if top.acknowledged} · reconocida{/if}
          {#if visible.length > 1} · {visible.length} alertas{/if}
        </span>
      </div>
      <div class="row">
        <button type="button" class="btn primary" onclick={() => ui.openProtocol(top.id, top.region)}>Abrir protocolo</button>
        {#if !top.acknowledged && bridge.activeRole}
          <button type="button" class="btn danger" onclick={() => ack(top)}>Reconocer y silenciar</button>
        {/if}
        {#if !audioOn}
          <button type="button" class="btn" onclick={() => { unlockAudio(); audioOn = audioReady(); playCritical(1); }}>
            <HudIcon name="volume-off" size={16} /> Activar sonido
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="alarm st caution" role="status" aria-live="polite">
      <span class="sym big" aria-hidden="true"></span>
      <div class="msg">
        <strong>Precaución · {SYSTEM_LABEL[top.organ]} · {STATUS_LABEL[top.status]}</strong>
        <span>{top.explanation}</span>
        {#if visible.length > 1}<span class="label">{visible.length} alertas</span>{/if}
      </div>
      <button type="button" class="btn" onclick={() => ui.openProtocol(top.id, top.region)}>Ver contramedida</button>
    </div>
  {/if}
{/if}

<style>
  .alarm {
    position: sticky;
    top: var(--strip-h, 0px);
    z-index: 25;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--gap);
    padding: 10px 16px;
    border-bottom: var(--st-bw) solid var(--st);
    background: var(--space-900);
    background-image: var(--st-fill);
  }
  .msg { display: flex; flex-direction: column; gap: 2px; flex: 1 1 320px; min-width: 0; }
  .big { font-size: 1.75rem; color: var(--st-text); }
  .caution strong { color: var(--alert-yellow); }
</style>
