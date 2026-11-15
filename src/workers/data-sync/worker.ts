import type { CabinGlobalStatus, DataSyncCommand, DataSyncEvent } from '../../shared/contracts';

const DEFAULT_PUBLIC_STATUS: CabinGlobalStatus = {
  updatedAtUtc: new Date().toISOString(),
  habitatStatus: 'NOMINAL',
  habitat: {
    moduleId: 'HAB-CORE-01',
    recordedAtUtc: new Date().toISOString(),
    ppCo2MmHg: 1.85,
    cabinPressureKpa: 101.3,
    o2ConcentrationPct: 21.1,
    temperatureC: 22.1,
    relativeHumidityPct: 45.0,
    radiationRateUSvH: 28.4,
  },
  // ADR-014: Global traffic lights only; biometric values are never exposed on the lock screen.
  crewTrafficLight: {
    C001: 'NOMINAL',
    C002: 'CAUTION',
    C003: 'NOMINAL',
    C004: 'NOMINAL',
  },
};

function emit(event: DataSyncEvent): void {
  self.postMessage(event);
}

self.onmessage = (message: MessageEvent<DataSyncCommand>) => {
  const command = message.data;
  const startedAt = performance.now();

  if (command.type === 'REQUEST_PUBLIC_STATUS') {
    emit({
      type: 'PUBLIC_STATUS_SNAPSHOT',
      requestId: command.requestId,
      status: DEFAULT_PUBLIC_STATUS,
    });
    return;
  }

  if (command.type === 'UNLOCK_SESSION') {
    // Key derivation via PBKDF2 + AES-GCM unwrapping will be wired in #3 [Data-02].
    const latency = Math.max(0.1, Number((performance.now() - startedAt).toFixed(2)));
    emit({
      type: 'SESSION_UNLOCKED',
      requestId: command.requestId,
      role: command.role,
      unlockLatencyMs: latency,
    });
    return;
  }

  if (command.type === 'LOCK_SESSION') {
    emit({
      type: 'SESSION_LOCKED',
      requestId: command.requestId,
    });
  }
};

emit({
  type: 'DATA_WORKER_READY',
  persistenceEngine: 'IndexedDB',
  zeroExternalNetwork: true,
});
