<script lang="ts">
  // Countermeasure Guide (COMP-05, C4 §3.2): 3 bloques fijos — Qué ocurre / Severidad e impacto / Acciones —
  // más "Qué enviar al Flight Surgeon" en alertas rojas (RF-GUI-05). Checklist ≤ 4 pasos (ADR-017) con recursos
  // de a bordo (RF-GUI-03). Cada casilla emite un evento NUEVO al G-Set; nunca edita uno anterior.
  // CounterResolver: alternativa si un recurso no está operativo (CU-07 FA-01), prioridad Alta/Media/Baja
  // (AC-CLIN-06) y protocolos encadenados (ADR-017).
  import { inventoryLabel, resolveForAlert, unavailableFrom, UNAVAILABLE_PREFIX, type Priority } from '../../engine/countermeasures';
  import type { Protocol } from '../../engine/types';
  import type { ActiveAlert } from '../bridge/workerBridge.svelte';
  import { STATUS_LABEL, SYSTEM_LABEL } from '../bridge/uiState.svelte';
  import HudIcon from './HudIcon.svelte';

  interface Props {
    protocol: Protocol;
    alert: ActiveAlert;
    variant?: 'inline' | 'emergency' | 'daily';
    /** protocolId: protocolo cuyos pasos se marcan (el resuelto, que puede ser la alternativa). */
    oncheck: (stepId: string, checked: boolean, protocolId: string) => void;
  }
  let { protocol: base, alert, variant = 'inline', oncheck }: Props = $props();

  const PRIORITY_LABEL: Record<Priority, string> = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };
  const resolution = $derived(resolveForAlert(alert, unavailableFrom(alert.completedSteps)));
  const protocol = $derived(resolution?.protocol ?? base);
  // Cognitive cap (ADR-017, AC-CLIN-06): strictly <= 4 actionable steps rendered simultaneously.
  const visibleSteps = $derived(protocol.steps.slice(0, 4));
  const done = $derived(new Set(alert.completedSteps));
  const next = $derived(visibleSteps.find((s) => !done.has(s.id))?.id ?? null);
  const complete = $derived(visibleSteps.every((s) => done.has(s.id)));
  const outOfOrder = $derived(visibleSteps.some((s, i) => done.has(s.id) && visibleSteps.slice(0, i).some((p) => !done.has(p.id))));
</script>

<section class="guide st {alert.status} {variant}" aria-labelledby="g-{protocol.id}-{alert.id}">
  <header class="top">
    <span class="sym big" aria-hidden="true"></span>
    <div>
      <h2 id="g-{protocol.id}-{alert.id}" class:alarm-title={alert.status === 'critical'}>{protocol.title}</h2>
      <p class="label">{SYSTEM_LABEL[alert.organ]} · {STATUS_LABEL[alert.status]} · rule {alert.ruleId}</p>
      {#if resolution?.substitutedFor}
        <p class="alt" role="status">Alternative: {inventoryLabel(resolution.substitutedFor)} offline.</p>
      {/if}
    </div>
  </header>

  <div class="block">
    <h3>1 · Situation</h3>
    <p>{protocol.what}</p>
  </div>

  <div class="block">
    <h3>2 · Severity &amp; Impact</h3>
    <p>
      {#if resolution}<span class="badge prio {resolution.priority}">{PRIORITY_LABEL[resolution.priority]}</span>{/if}
      <strong class="sev">{protocol.severity}</strong> · action window: {protocol.timeToImpact}
    </p>
    <p class="why"><span class="label">Reason</span> {alert.explanation}</p>
  </div>

  <div class="block">
    <h3>3 · Action Steps</h3>
    <ol class="steps">
      {#each visibleSteps as s, i (s.id)}
        <li class:done={done.has(s.id)} class:next={next === s.id}>
          <label>
            <input
              type="checkbox"
              checked={done.has(s.id)}
              onchange={(e) => oncheck(s.id, e.currentTarget.checked, protocol.id)}
              aria-label="Step {i + 1} of {visibleSteps.length}: {s.text}"
            />
            <span class="txt">
              <span class="n num">{i + 1}</span>
              {s.text}
              {#if s.resource}<span class="unit res">Resource: {inventoryLabel(s.resource)}</span>{/if}
            </span>
          </label>
          {#if s.resource && protocol.alternatives?.[s.resource] && !done.has(s.id)}
            <button type="button" class="btn unavail" onclick={() => oncheck(`${UNAVAILABLE_PREFIX}${s.resource}`, true, protocol.id)}>
              {inventoryLabel(s.resource)} unavailable
            </button>
          {/if}
        </li>
      {/each}
    </ol>
    {#if outOfOrder && !complete}<p class="muted small">Steps checked out of order: review the highlighted step.</p>{/if}
    {#if complete}<p class="complete" role="status"><HudIcon name="check" size={15} /> Protocol completed and logged to audit ledger</p>{/if}
    {#if complete && resolution?.chain.length}
      <p class="chain">Continue with: <strong>{resolution.chain.map((p) => p.title).join(' → ')}</strong></p>
    {/if}
  </div>

  {#if alert.status === 'critical' && protocol.fsMessage}
    <details class="block fs" open={variant === 'emergency'}>
      <summary><h3>Report to Flight Surgeon</h3></summary>
      <p>{protocol.fsMessage}</p>
      <p class="muted small">Asynchronous report: do not wait for reply before continuing.</p>
    </details>
  {/if}
</section>

<style>
  .guide {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    border: var(--st-bw) solid var(--st);
    border-radius: var(--radius);
    background: var(--space-900);
    padding: 16px;
    min-width: 0;
  }
  .top { display: flex; gap: 12px; align-items: flex-start; }
  .big { font-size: 1.5rem; color: var(--st-text); line-height: 1; }
  h2 { font-size: 1.125rem; }
  h3 { font-size: 0.9375rem; color: var(--text-muted); margin-bottom: 4px; }
  .block p { max-width: 65ch; }
  .sev { color: var(--st-text); }
  .why { margin-top: 6px; font-size: 0.9375rem; }
  .steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--gap); }
  .steps label {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    min-height: var(--touch);
    padding: 10px 12px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-btn);
    background: var(--space-800);
    cursor: pointer;
  }
  .steps li.next label { border-color: var(--accent); }
  .steps li.done .txt { text-decoration: line-through; color: var(--text-muted); }
  input[type='checkbox'] { width: 28px; height: 28px; margin: 0; flex: none; accent-color: var(--accent); }
  .txt { display: flex; flex-direction: column; gap: 2px; }
  .n { font-weight: 700; color: var(--accent); }
  .res { display: block; }
  .complete { color: var(--alert-green); font-weight: 700; }
  .alt { color: var(--alert-yellow); font-weight: 700; margin-top: 4px; }
  .badge.prio { display: inline-block; margin-right: 8px; padding: 2px 10px; border: 2px solid var(--st); border-radius: var(--radius-btn); font-weight: 700; color: var(--st-text); }
  .badge.prio.medium, .badge.prio.low { border-style: dashed; }
  .unavail { margin: 6px 0 0 40px; height: auto; min-height: var(--touch); }
  .chain { margin-top: 6px; }
  .small { font-size: 0.875rem; }
  .fs summary { cursor: pointer; min-height: var(--touch); display: flex; align-items: center; }
  .fs summary h3 { margin: 0; color: var(--alert-red-text); }
  .emergency { border-width: 3px; }
  .daily { border-style: dashed; }
</style>
