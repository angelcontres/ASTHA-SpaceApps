<script lang="ts">
  // Countermeasure Guide (COMP-05, C4 §3.2): 3 bloques fijos — Qué ocurre / Severidad e impacto / Acciones —
  // más "Qué enviar al Flight Surgeon" en alertas rojas (RF-GUI-05). Checklist ≤ 4 pasos (ADR-017) con recursos
  // de a bordo (RF-GUI-03). Cada casilla emite un evento NUEVO al G-Set; nunca edita uno anterior.
  import { inventoryLabel } from '../../engine/countermeasures';
  import type { Protocol } from '../../engine/types';
  import type { ActiveAlert } from '../bridge/workerBridge.svelte';
  import { STATUS_LABEL, SYSTEM_LABEL } from '../bridge/uiState.svelte';

  interface Props {
    protocol: Protocol;
    alert: ActiveAlert;
    variant?: 'inline' | 'emergency' | 'daily';
    oncheck: (stepId: string, checked: boolean) => void;
  }
  let { protocol, alert, variant = 'inline', oncheck }: Props = $props();

  const done = $derived(new Set(alert.completedSteps));
  const next = $derived(protocol.steps.find((s) => !done.has(s.id))?.id ?? null);
  const complete = $derived(protocol.steps.every((s) => done.has(s.id)));
  const outOfOrder = $derived(protocol.steps.some((s, i) => done.has(s.id) && protocol.steps.slice(0, i).some((p) => !done.has(p.id))));
</script>

<section class="guide st {alert.status} {variant}" aria-labelledby="g-{protocol.id}-{alert.id}">
  <header class="top">
    <span class="sym big" aria-hidden="true"></span>
    <div>
      <h2 id="g-{protocol.id}-{alert.id}" class:alarm-title={alert.status === 'critical'}>{protocol.title}</h2>
      <p class="label">{SYSTEM_LABEL[alert.organ]} · {STATUS_LABEL[alert.status]} · regla {alert.ruleId}</p>
    </div>
  </header>

  <div class="block">
    <h3>1 · Qué ocurre</h3>
    <p>{protocol.what}</p>
  </div>

  <div class="block">
    <h3>2 · Severidad e impacto</h3>
    <p><strong class="sev">{protocol.severity}</strong> · impacto estimado: {protocol.timeToImpact}</p>
    <p class="why"><span class="label">Por qué</span> {alert.explanation}</p>
  </div>

  <div class="block">
    <h3>3 · Acciones</h3>
    <ol class="steps">
      {#each protocol.steps as s, i (s.id)}
        <li class:done={done.has(s.id)} class:next={next === s.id}>
          <label>
            <input
              type="checkbox"
              checked={done.has(s.id)}
              onchange={(e) => oncheck(s.id, e.currentTarget.checked)}
              aria-label="Paso {i + 1} de {protocol.steps.length}: {s.text}"
            />
            <span class="txt">
              <span class="n num">{i + 1}</span>
              {s.text}
              {#if s.resource}<span class="unit res">Recurso: {inventoryLabel(s.resource)}</span>{/if}
            </span>
          </label>
        </li>
      {/each}
    </ol>
    {#if outOfOrder && !complete}<p class="muted small">Pasos marcados fuera de orden: revisa el paso resaltado.</p>{/if}
    {#if complete}<p class="complete" role="status">✓ Protocolo completado y registrado en la bitácora</p>{/if}
  </div>

  {#if alert.status === 'critical' && protocol.fsMessage}
    <details class="block fs" open={variant === 'emergency'}>
      <summary><h3>Qué enviar al Flight Surgeon</h3></summary>
      <p>{protocol.fsMessage}</p>
      <p class="muted small">Mensaje asíncrono: no esperes respuesta para seguir el protocolo.</p>
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
  .small { font-size: 0.875rem; }
  .fs summary { cursor: pointer; min-height: var(--touch); display: flex; align-items: center; }
  .fs summary h3 { margin: 0; color: var(--alert-red-text); }
  .emergency { border-width: 3px; }
</style>
