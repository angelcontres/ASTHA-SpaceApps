<script lang="ts">
  // Entry y Symptom Pad (C4 §3.2): 9 variables de RF-ING-01 con pasos grandes (+/−, ≥ 48 px)
  // y 5 síntomas de un toque (RF-ING-04). Los valores imposibles se guardan marcados como dudosos (RF-ING-05).
  import { INDICATORS } from '../../engine/classifier';
  import { MANUAL_FIELDS, SYMPTOMS, type CrewIndicator, type DailyMeasurement, type SymptomType } from '../../engine/types';
  import { fmt, SYMPTOM_LABEL } from '../bridge/uiState.svelte';

  interface Props {
    crewId: string;
    today: DailyMeasurement | null;
    symptoms: SymptomType[];
    onsubmit: (fields: Partial<Record<CrewIndicator, number>>) => void;
    onsymptom: (s: SymptomType, active: boolean) => void;
  }
  let { crewId, today, symptoms, onsubmit, onsymptom }: Props = $props();

  const STEP: Record<string, number> = { hr: 1, hrv: 1, sbp: 1, dbp: 1, spo2: 1, glucose: 1, temp: 0.1, sleep: 0.1, mood: 1 };

  let values = $state<Record<string, number>>({});
  let touched = $state<Record<string, boolean>>({});

  // Al cambiar de tripulante o de día, se parte de la medición de hoy.
  $effect(() => {
    void crewId;
    const base: Record<string, number> = {};
    for (const f of MANUAL_FIELDS) base[f] = (today?.[f] as number | undefined) ?? 0;
    values = base;
    touched = {};
  });

  function bump(f: CrewIndicator, dir: 1 | -1) {
    const d = INDICATORS[f].decimals;
    values[f] = Math.round((values[f] + dir * STEP[f]) * 10 ** d) / 10 ** d;
    touched[f] = true;
  }

  function submit() {
    const fields: Partial<Record<CrewIndicator, number>> = {};
    for (const f of MANUAL_FIELDS) fields[f] = values[f];
    onsubmit(fields);
    touched = {};
  }

  const active = $derived(new Set(symptoms));
</script>

<section class="pad stack" aria-labelledby="pad-title">
  <h2 id="pad-title">Registro matutino</h2>
  <div class="fields">
    {#each MANUAL_FIELDS as f (f)}
      <div class="field card" class:touched={touched[f]}>
        <span class="label">{INDICATORS[f].short}</span>
        <div class="stepper">
          <button type="button" class="btn icon" aria-label="Bajar {INDICATORS[f].label}" onclick={() => bump(f, -1)}>−</button>
          <output class="value num" aria-live="off">{fmt(values[f], INDICATORS[f].decimals)}</output>
          <button type="button" class="btn icon" aria-label="Subir {INDICATORS[f].label}" onclick={() => bump(f, 1)}>+</button>
        </div>
        <span class="unit">{INDICATORS[f].unit}</span>
      </div>
    {/each}
  </div>
  <button type="button" class="btn primary" onclick={submit}>Confirmar registro (+20 XP)</button>

  <h3>Síntomas de hoy · un toque</h3>
  <div class="row" role="group" aria-label="Síntomas">
    {#each SYMPTOMS as s (s)}
      <button type="button" class="btn" aria-pressed={active.has(s)} onclick={() => onsymptom(s, !active.has(s))}>
        {active.has(s) ? '● ' : '○ '}{SYMPTOM_LABEL[s]}
      </button>
    {/each}
  </div>
</section>

<style>
  .fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: var(--gap); }
  .field { padding: 10px; display: flex; flex-direction: column; gap: 6px; }
  .field.touched { border-color: var(--accent); }
  .stepper { display: flex; align-items: center; gap: var(--gap); justify-content: space-between; }
  .stepper .value { font-size: 1.5rem; min-width: 4ch; text-align: center; }
  h3 { font-size: 1rem; }
</style>
