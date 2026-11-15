import type {
  CabinGlobalStatus,
  CrewId,
  CrisisScenarioId,
  DailyMeasurement,
  HabitatTelemetry,
  IndicatorStatus,
  OrganSystem,
  SubjectiveSymptomType,
  UserRole,
} from './telemetry';

export interface ClinicalAssessment {
  crewId: CrewId;
  overallStatus: IndicatorStatus;
  organStates: Record<OrganSystem, IndicatorStatus>;
  triggeredRules: string[];
  recommendedStepsCount: number;
  latencyMs: number;
}

/** UI -> Clinical Engine Worker (ADR-005, postMessage only) */
export type ClinicalEngineCommand =
  | {
      type: 'EVALUATE_TELEMETRY';
      requestId: string;
      measurement: DailyMeasurement;
      habitat: HabitatTelemetry;
      symptoms: SubjectiveSymptomType[];
    }
  | {
      type: 'INJECT_SCENARIO';
      requestId: string;
      scenario: CrisisScenarioId;
      crewId: CrewId;
    };

/** Clinical Engine Worker -> UI */
export type ClinicalEngineEvent =
  | {
      type: 'ENGINE_READY';
      version: string;
      pureDeterministicMode: true;
    }
  | {
      type: 'ASSESSMENT_RESULT';
      requestId: string;
      assessment: ClinicalAssessment;
    };

/** UI -> Data & Sync Worker */
export type DataSyncCommand =
  | {
      type: 'REQUEST_PUBLIC_STATUS';
      requestId: string;
    }
  | {
      type: 'UNLOCK_SESSION';
      requestId: string;
      pin: string;
      role: UserRole;
    }
  | {
      type: 'LOCK_SESSION';
      requestId: string;
    };

/** Data & Sync Worker -> UI */
export type DataSyncEvent =
  | {
      type: 'DATA_WORKER_READY';
      persistenceEngine: 'IndexedDB';
      zeroExternalNetwork: true;
    }
  | {
      type: 'PUBLIC_STATUS_SNAPSHOT';
      requestId: string;
      status: CabinGlobalStatus;
    }
  | {
      type: 'SESSION_UNLOCKED';
      requestId: string;
      role: UserRole;
      unlockLatencyMs: number;
    }
  | {
      type: 'SESSION_LOCKED';
      requestId: string;
    };
