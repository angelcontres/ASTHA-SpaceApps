import type {
  ClinicalEngineCommand,
  ClinicalEngineEvent,
  DailyMeasurement,
  HabitatTelemetry,
} from '../../shared/contracts';
import { evaluateBaselineSample } from './engine-core';

const BASELINE_MEASUREMENT: DailyMeasurement = {
  recordId: '00000000-0000-4000-8000-000000000001',
  crewId: 'C001',
  missionDay: 15,
  recordedAtUtc: '2026-11-15T12:00:00Z',
  heartRateBpm: 68,
  systolicBpMmHg: 118,
  diastolicBpMmHg: 76,
  spo2Pct: 98.2,
  hrvRmssdMs: 46,
  sleepHours: 7.4,
  urinaryCalciumMgDay: 195,
  isSuspect: false,
};

const BASELINE_HABITAT: HabitatTelemetry = {
  moduleId: 'HAB-CORE-01',
  recordedAtUtc: '2026-11-15T12:00:00Z',
  ppCo2MmHg: 1.85,
  cabinPressureKpa: 101.3,
  o2ConcentrationPct: 21.1,
  temperatureC: 22.1,
  relativeHumidityPct: 45.0,
  radiationRateUSvH: 28.4,
};

function emit(event: ClinicalEngineEvent): void {
  self.postMessage(event);
}

self.onmessage = (message: MessageEvent<ClinicalEngineCommand>) => {
  const command = message.data;

  if (command.type === 'EVALUATE_TELEMETRY') {
    const assessment = evaluateBaselineSample(
      command.measurement,
      command.habitat,
      command.symptoms,
    );
    emit({ type: 'ASSESSMENT_RESULT', requestId: command.requestId, assessment });
    return;
  }

  if (command.type === 'INJECT_SCENARIO') {
    const measurement: DailyMeasurement = { ...BASELINE_MEASUREMENT, crewId: command.crewId };
    const habitat: HabitatTelemetry = { ...BASELINE_HABITAT };
    const symptoms: ('HEADACHE' | 'BLURRED_VISION')[] = [];

    if (command.scenario === 'SPE_STORM') {
      habitat.radiationRateUSvH = 184.2;
    } else if (command.scenario === 'CO2_SPIKE') {
      habitat.ppCo2MmHg = 3.8;
      symptoms.push('HEADACHE');
    } else if (command.scenario === 'SANS_CRISIS') {
      measurement.systolicBpMmHg = 144;
      symptoms.push('BLURRED_VISION');
    } else if (command.scenario === 'MULTI_FAULT') {
      habitat.radiationRateUSvH = 140.0;
      habitat.ppCo2MmHg = 3.4;
      measurement.systolicBpMmHg = 142;
      symptoms.push('BLURRED_VISION', 'HEADACHE');
    }

    const assessment = evaluateBaselineSample(measurement, habitat, symptoms, command.crewId);
    emit({ type: 'ASSESSMENT_RESULT', requestId: command.requestId, assessment });
  }
};

emit({
  type: 'ENGINE_READY',
  version: '3.0.0-core-01',
  pureDeterministicMode: true,
});
