import type {
  ClinicalAssessment,
  CrewId,
  DailyMeasurement,
  HabitatTelemetry,
  IndicatorStatus,
  OrganSystem,
  SubjectiveSymptomType,
} from '../../shared/contracts';

function initialOrganStates(): Record<OrganSystem, IndicatorStatus> {
  return {
    'neuro-ocular': 'NOMINAL',
    cardiovascular: 'NOMINAL',
    musculoskeletal: 'NOMINAL',
    renal: 'NOMINAL',
    cognitive: 'NOMINAL',
    radiation: 'NOMINAL',
    'respiratory/environmental': 'NOMINAL',
  };
}

function worstStatus(a: IndicatorStatus, b: IndicatorStatus): IndicatorStatus {
  const rank: Record<IndicatorStatus, number> = { NOMINAL: 0, CAUTION: 1, CRITICAL: 2 };
  return rank[a] >= rank[b] ? a : b;
}

/**
 * Pure deterministic baseline evaluator scaffold (ADR-005, < 50ms budget per RNF-PER-01).
 * Full 12-indicator, 10-rule correlation, and MAD drift pipelines will be completed in #4-#6.
 */
export function evaluateBaselineSample(
  measurement: DailyMeasurement,
  habitat: HabitatTelemetry,
  symptoms: SubjectiveSymptomType[],
  crewIdOverride?: CrewId,
): ClinicalAssessment {
  const startedAt = performance.now();
  const organStates = initialOrganStates();
  const triggeredRules: string[] = [];

  if (habitat.radiationRateUSvH > 100) {
    organStates.radiation = 'CRITICAL';
    triggeredRules.push('R-RAD-01');
  } else if (habitat.radiationRateUSvH >= 36) {
    organStates.radiation = 'CAUTION';
  }

  if (habitat.ppCo2MmHg > 3.0) {
    organStates['respiratory/environmental'] = 'CRITICAL';
    if (symptoms.includes('HEADACHE')) {
      organStates['neuro-ocular'] = 'CRITICAL';
      triggeredRules.push('R-ENV-02');
    } else if (measurement.spo2Pct < 94) {
      triggeredRules.push('R-ENV-01');
    }
  } else if (habitat.ppCo2MmHg >= 2.0) {
    organStates['respiratory/environmental'] = 'CAUTION';
  }

  if (measurement.systolicBpMmHg >= 140 || (measurement.systolicBpMmHg > 135 && symptoms.includes('BLURRED_VISION'))) {
    organStates['neuro-ocular'] = 'CRITICAL';
    if (symptoms.includes('BLURRED_VISION')) {
      triggeredRules.push('R-SANS-01');
    }
  } else if (measurement.systolicBpMmHg >= 126) {
    organStates['neuro-ocular'] = worstStatus(organStates['neuro-ocular'], 'CAUTION');
  }

  if (measurement.heartRateBpm < 45 || measurement.heartRateBpm > 110) {
    organStates.cardiovascular = 'CRITICAL';
  } else if (measurement.heartRateBpm < 55 || measurement.heartRateBpm > 85) {
    organStates.cardiovascular = 'CAUTION';
  }

  let overallStatus: IndicatorStatus = 'NOMINAL';
  for (const status of Object.values(organStates)) {
    overallStatus = worstStatus(overallStatus, status);
  }

  const elapsed = Math.max(0.01, Number((performance.now() - startedAt).toFixed(3)));
  return {
    crewId: crewIdOverride ?? measurement.crewId,
    overallStatus,
    organStates,
    triggeredRules,
    recommendedStepsCount: triggeredRules.length > 0 ? 3 : 0, // ADR-017 <= 4 steps invariant
    latencyMs: elapsed,
  };
}
