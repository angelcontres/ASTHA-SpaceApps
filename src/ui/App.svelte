<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    CabinGlobalStatus,
    ClinicalAssessment,
    ClinicalEngineCommand,
    ClinicalEngineEvent,
    CrewId,
    CrisisScenarioId,
    DataSyncCommand,
    DataSyncEvent,
    IndicatorStatus,
  } from '../shared/contracts';

  type ActiveTab = 'biomedical' | 'eclss' | 'triage' | 'simulator';

  const CREW_DIRECTORY: Record<CrewId, { name: string; role: string }> = {
    C001: { name: 'Jared Isaacman', role: 'Commander' },
    C002: { name: 'Hayley Arceneaux', role: 'CMO' },
    C003: { name: 'Dr. Sian Proctor', role: 'Mission Specialist' },
    C004: { name: 'Chris Sembroski', role: 'Flight Engineer' },
  };

  const STATUS_SYMBOL: Record<IndicatorStatus, string> = {
    NOMINAL: '✓ Nominal',
    CAUTION: '▲ Caution',
    CRITICAL: '✕ Critical',
  };

  let swStatus = $state<'checking' | 'cached' | 'dev-bypass'>('checking');
  let unlocked = $state(false);
  let pinInput = $state('');
  let unlockLatencyMs = $state<number | null>(null);
  let activeCrew = $state<CrewId>('C001');
  let activeTab = $state<ActiveTab>('biomedical');
  let nightRed630 = $state(false);
  let survivalMode = $state(false);

  let engineReady = $state(false);
  let dataWorkerReady = $state(false);
  let uplotLoaded = $state(false);
  let threeLoaded = $state(false);

  let publicStatus = $state<CabinGlobalStatus>({
    updatedAtUtc: '2026-11-15T12:00:00Z',
    habitatStatus: 'NOMINAL',
    habitat: {
      moduleId: 'HAB-CORE-01',
      recordedAtUtc: '2026-11-15T12:00:00Z',
      ppCo2MmHg: 1.85,
      cabinPressureKpa: 101.3,
      o2ConcentrationPct: 21.1,
      temperatureC: 22.1,
      relativeHumidityPct: 45.0,
      radiationRateUSvH: 28.4,
    },
    crewTrafficLight: {
      C001: 'NOMINAL',
      C002: 'CAUTION',
      C003: 'NOMINAL',
      C004: 'NOMINAL',
    },
  });

  let latestAssessment = $state<ClinicalAssessment | null>(null);
  let clinicalWorker: Worker | null = null;
  let dataWorker: Worker | null = null;

  const overallClass = $derived(
    latestAssessment?.overallStatus === 'CRITICAL'
      ? 'status-critical'
      : latestAssessment?.overallStatus === 'CAUTION'
        ? 'status-caution'
        : 'status-nominal',
  );

  onMount(() => {
    if ('serviceWorker' in navigator) {
      if (import.meta.env.PROD) {
        navigator.serviceWorker.ready
          .then(() => {
            swStatus = 'cached';
          })
          .catch(() => {
            swStatus = 'dev-bypass';
          });
      } else {
        swStatus = 'dev-bypass';
      }
    }

    clinicalWorker = new Worker(
      new URL('../workers/clinical-engine/worker.ts', import.meta.url),
      { type: 'module' },
    );
    clinicalWorker.onmessage = (event: MessageEvent<ClinicalEngineEvent>) => {
      const payload = event.data;
      if (payload.type === 'ENGINE_READY') {
        engineReady = true;
      } else if (payload.type === 'ASSESSMENT_RESULT') {
        latestAssessment = payload.assessment;
      }
    };

    dataWorker = new Worker(
      new URL('../workers/data-sync/worker.ts', import.meta.url),
      { type: 'module' },
    );
    dataWorker.onmessage = (event: MessageEvent<DataSyncEvent>) => {
      const payload = event.data;
      if (payload.type === 'DATA_WORKER_READY') {
        dataWorkerReady = true;
        const req: DataSyncCommand = {
          type: 'REQUEST_PUBLIC_STATUS',
          requestId: crypto.randomUUID(),
        };
        dataWorker?.postMessage(req);
      } else if (payload.type === 'PUBLIC_STATUS_SNAPSHOT') {
        publicStatus = payload.status;
      } else if (payload.type === 'SESSION_UNLOCKED') {
        unlockLatencyMs = payload.unlockLatencyMs;
        unlocked = true;
        pinInput = '';
        injectScenario('NOMINAL');
      } else if (payload.type === 'SESSION_LOCKED') {
        unlocked = false;
      }
    };

    return () => {
      clinicalWorker?.terminate();
      dataWorker?.terminate();
    };
  });

  function pressPinDigit(digit: string): void {
    if (pinInput.length < 6) {
      pinInput += digit;
    }
  }

  function clearPin(): void {
    pinInput = '';
  }

  function submitUnlock(): void {
    if (pinInput.length < 4) return;
    const cmd: DataSyncCommand = {
      type: 'UNLOCK_SESSION',
      requestId: crypto.randomUUID(),
      pin: pinInput,
      role: 'CMO',
    };
    dataWorker?.postMessage(cmd);
  }

  function lockConsole(): void {
    dataWorker?.postMessage({ type: 'LOCK_SESSION', requestId: crypto.randomUUID() });
  }

  function injectScenario(scenario: CrisisScenarioId): void {
    const cmd: ClinicalEngineCommand = {
      type: 'INJECT_SCENARIO',
      requestId: crypto.randomUUID(),
      scenario,
      crewId: activeCrew,
    };
    clinicalWorker?.postMessage(cmd);
  }

  async function verifyLocalBundles(): Promise<void> {
    const [uplotMod, threeMod] = await Promise.all([import('uplot'), import('three')]);
    uplotLoaded = Boolean(uplotMod.default);
    threeLoaded = Boolean(threeMod.WebGLRenderer);
  }

  $effect(() => {
    document.body.classList.toggle('night-red-630', nightRed630);
    document.body.classList.toggle('survival-mode', survivalMode);
  });
</script>

<main class="shell">
  <header class="topbar">
    <div class="brand">
      <span class="badge mono">ASTHA v3.0</span>
      <span class="mono subtitle">ZERO-WAN EDGE CREW PWA</span>
    </div>

    <div class="quick-strip mono" aria-label="Cabin ECLSS Quick-Status">
      <span>pO2 {publicStatus.habitat.o2ConcentrationPct.toFixed(1)}%</span>
      <span>ppCO2 {publicStatus.habitat.ppCo2MmHg.toFixed(2)} mmHg</span>
      <span>P {publicStatus.habitat.cabinPressureKpa.toFixed(1)} kPa</span>
      <span>Rad {publicStatus.habitat.radiationRateUSvH.toFixed(1)} uSv/h</span>
      <span class="pill">
        SW: {swStatus === 'cached' ? 'CACHE-ONLY' : swStatus === 'dev-bypass' ? 'DEV' : 'INIT'}
      </span>
    </div>

    <div class="touch-group">
      <button
        class="touch-btn"
        aria-pressed={nightRed630}
        onclick={() => (nightRed630 = !nightRed630)}
      >
        630nm Night
      </button>
      <button
        class="touch-btn"
        aria-pressed={survivalMode}
        onclick={() => (survivalMode = !survivalMode)}
      >
        {survivalMode ? 'Exit <5W' : 'Survival <5W'}
      </button>
      {#if unlocked}
        <button class="touch-btn" onclick={lockConsole}>Lock Screen</button>
      {/if}
    </div>
  </header>

  {#if !unlocked}
    <!-- ADR-014 / ADR-015 Lock Screen (< 1.5s Cold Start, Zero Clinical Values Exposed) -->
    <section class="lock-grid" aria-label="Public Habitat Display and Lock Screen">
      <article class="panel status-nominal">
        <h1>Cabin Global Status (Public Display · ADR-014)</h1>
        <p class="muted">
          Biomedical readings, organ findings, and diagnoses remain encrypted until crew PIN/NFC unlock.
        </p>

        <h2>Crew Global Traffic Light</h2>
        <div class="crew-grid">
          {#each Object.entries(CREW_DIRECTORY) as [id, meta] (id)}
            {@const crewId = id as CrewId}
            {@const status = publicStatus.crewTrafficLight[crewId]}
            <div
              class="card"
              class:status-nominal={status === 'NOMINAL'}
              class:status-caution={status === 'CAUTION'}
              class:status-critical={status === 'CRITICAL'}
            >
              <strong class="mono">{crewId} · {meta.name}</strong>
              <span class="muted">{meta.role}</span>
              <span class="mono">{STATUS_SYMBOL[status]}</span>
            </div>
          {/each}
        </div>

        <h2>Habitat ECLSS Telemetry (6 Metrics)</h2>
        <div class="eclss-grid tabular-nums">
          <div class="card status-nominal">
            <span>ppCO2</span>
            <strong>{publicStatus.habitat.ppCo2MmHg.toFixed(2)} mmHg</strong>
          </div>
          <div class="card status-nominal">
            <span>Total Pressure</span>
            <strong>{publicStatus.habitat.cabinPressureKpa.toFixed(1)} kPa</strong>
          </div>
          <div class="card status-nominal">
            <span>O2 Concentration</span>
            <strong>{publicStatus.habitat.o2ConcentrationPct.toFixed(1)} %</strong>
          </div>
          <div class="card status-nominal">
            <span>Temperature</span>
            <strong>{publicStatus.habitat.temperatureC.toFixed(1)} °C</strong>
          </div>
          <div class="card status-nominal">
            <span>Relative Humidity</span>
            <strong>{publicStatus.habitat.relativeHumidityPct.toFixed(0)} %</strong>
          </div>
          <div class="card status-nominal">
            <span>Radiation (CANS)</span>
            <strong>{publicStatus.habitat.radiationRateUSvH.toFixed(1)} uSv/h</strong>
          </div>
        </div>
      </article>

      <article class="panel">
        <h2>Clinical Unlock (PIN &lt; 1.5 s · ADR-015)</h2>
        <p class="muted">Enter any 4–6 digit mission PIN to unlock local Cockpit &amp; Web Workers.</p>
        <div class="pin-display tabular-nums" aria-live="polite">
          {pinInput.replace(/./g, '●') || '----'}
        </div>

        <div class="keypad">
          {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'OK'] as key (key)}
            <button
              class="touch-btn keypad-btn"
              onclick={() => {
                if (key === 'CLR') clearPin();
                else if (key === 'OK') submitUnlock();
                else pressPinDigit(key);
              }}
            >
              {key}
            </button>
          {/each}
        </div>

        <p class="mono worker-meta">
          Clinical Worker: {engineReady ? 'READY' : 'BOOTING'} · Data Worker: {dataWorkerReady ? 'READY' : 'BOOTING'}
        </p>
      </article>
    </section>
  {:else}
    <!-- Authenticated Core-01 Progressive Shell Ready for #8-#11 Feature Tickets -->
    <section class="panel">
      <div class="cockpit-header">
        <div>
          <h1>ASTHA Cockpit Shell · {activeCrew} ({CREW_DIRECTORY[activeCrew].name})</h1>
          <p class="muted mono">
            Unlock latency: {unlockLatencyMs ?? 0} ms · Clinical Worker latency:
            {latestAssessment?.latencyMs ?? 0} ms (Budget &lt; 50 ms RNF-PER-01)
          </p>
        </div>
        <div class="touch-group">
          {#each Object.keys(CREW_DIRECTORY) as id (id)}
            {@const crewId = id as CrewId}
            <button
              class="touch-btn"
              aria-pressed={activeCrew === crewId}
              onclick={() => {
                activeCrew = crewId;
                injectScenario('NOMINAL');
              }}
            >
              {crewId}
            </button>
          {/each}
        </div>
      </div>

      <nav class="touch-group tabs" aria-label="Progressive Disclosure Views">
        <button class="touch-btn" onclick={() => (activeTab = 'biomedical')}>1. Biomedical</button>
        <button class="touch-btn" onclick={() => (activeTab = 'eclss')}>2. ECLSS Habitat</button>
        <button class="touch-btn" onclick={() => (activeTab = 'triage')}>3. Triage &amp; CDSS</button>
        <button class="touch-btn" onclick={() => (activeTab = 'simulator')}>4. Crisis Simulator</button>
      </nav>

      <div class="card {overallClass}" role={latestAssessment?.overallStatus === 'CRITICAL' ? 'alert' : undefined}>
        <strong class="mono">
          Active Tab: {activeTab.toUpperCase()} · Clinical Assessment:
          {latestAssessment ? STATUS_SYMBOL[latestAssessment.overallStatus] : 'EVALUATING'}
        </strong>
        {#if latestAssessment && latestAssessment.triggeredRules.length > 0}
          <p class="mono">
            Triggered Rules: {latestAssessment.triggeredRules.join(', ')} · Max Countermeasure Steps:
            {latestAssessment.recommendedStepsCount} (&lt;= 4 ADR-017)
          </p>
        {/if}
      </div>

      <div class="touch-group actions-row">
        <button class="touch-btn" onclick={() => injectScenario('SPE_STORM')}>Test SPE (&gt;100 uSv/h)</button>
        <button class="touch-btn" onclick={() => injectScenario('CO2_SPIKE')}>Test CO2 (&gt;3.0 mmHg)</button>
        <button class="touch-btn" onclick={() => injectScenario('SANS_CRISIS')}>Test SANS (144 mmHg)</button>
        <button class="touch-btn" onclick={() => injectScenario('NOMINAL')}>Reset Nominal</button>
        <button class="touch-btn" onclick={verifyLocalBundles}>
          Verify Local uPlot &amp; Three.js
        </button>
      </div>

      {#if uplotLoaded || threeLoaded}
        <p class="mono muted">
          Local Zero-CDN Imports Verified — uPlot: {uplotLoaded ? 'OK' : 'NO'} · Three.js: {threeLoaded ? 'OK (0 FPS idle)' : 'NO'}
        </p>
      {/if}
    </section>
  {/if}
</main>

<style>
  .shell {
    max-width: 1360px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .topbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    background: var(--space-900);
    border: 1px solid var(--space-border);
    border-radius: var(--radius-card);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 4px;
    background: rgba(56, 189, 248, 0.14);
    border: 1px solid var(--cyan-400);
    color: var(--cyan-400);
    font-weight: 700;
  }

  .subtitle {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .quick-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .pill {
    padding: 2px 8px;
    border: 1px solid var(--alert-green);
    color: var(--alert-green);
    border-radius: 4px;
  }

  .lock-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;
  }

  @media (max-width: 960px) {
    .lock-grid {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    background: var(--space-900);
    border: 1px solid var(--space-border);
    border-radius: var(--radius-card);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  h1,
  h2 {
    margin: 0;
    font-size: 1.05rem;
  }

  .muted {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .crew-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .eclss-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .card {
    background: var(--space-800);
    border: 1px solid var(--space-border);
    border-radius: var(--radius-card);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pin-display {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    letter-spacing: 0.35em;
    background: var(--space-800);
    border: 1px solid var(--space-border);
    border-radius: var(--radius-btn);
  }

  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .keypad-btn {
    min-height: 52px;
    font-size: 1rem;
  }

  .worker-meta {
    margin: 4px 0 0;
    font-size: 0.75rem;
    color: var(--cyan-400);
  }

  .cockpit-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .tabs,
  .actions-row {
    padding-top: 4px;
  }
</style>
