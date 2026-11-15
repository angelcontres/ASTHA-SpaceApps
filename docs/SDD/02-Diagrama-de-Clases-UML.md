# 🧬 SDD-02: UML Class Diagram
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Reference Standards:** NASA-STD-8739.8 | IEEE Std 1016-2009 | UML 2.5 | **ADRs:** 006, 009, 010, 011, 012, 016, 017

---

## 1. Class Diagram for Clinical Domain, Security, and Synchronization

This model represents the data entities defined in **SRS §5.1**, the deterministic inference engine in **Clinical Engine Worker** (`ADR-005`), and the cryptographic persistence and replication contracts in **Data & Sync Worker** (`ADR-006`, `ADR-009`, `ADR-012`).

```mermaid
classDiagram
    class CrewMember {
        +String crewId
        +String fullName
        +String role
        +int level
        +int xp
        +int streakDays
        +String globalStatus
        +getClinicalRiskLevel() String
    }

    class DailyMeasurement {
        +int missionDay
        +int heartRateBpm
        +float hrvRmssdMs
        +int systolicBpMmhg
        +int diastolicBpMmhg
        +float spo2Percent
        +float glucoseMgDl
        +float bodyTempC
        +float sleepHours
        +int moodScore
        +float urinaryCalciumMg
        +bool isSuspect
        +DateTime recordedAt
        +validatePhysiologicalBounds() bool
    }

    class HabitatTelemetry {
        +int missionDay
        +float ppCo2Mmhg
        +float cabinPressureKpa
        +float o2Percent
        +float radiationUSvH
        +DateTime timestamp
        +getHabitatStatus() String
    }

    class SubjectiveSymptom {
        +String symptomId
        +String crewId
        +int missionDay
        +String symptomType
        +DateTime timestamp
    }

    class ClinicalEngine {
        +RuleSet nasaStd3001Rules
        +evaluateRecord(DailyMeasurement m, HabitatTelemetry h, List symptoms) TriageResult
        +computeModifiedZScore(float current, List baseline14Days) float
        +compute7DayLinearDrift(List window7Days) DriftProjection
        +resolveCountermeasure(ClinicalAlert alert) CountermeasureProtocol
    }

    class ClinicalAlert {
        +String alertId
        +String ruleId
        +String organSystem
        +String severity
        +String urgency
        +String triggeringValues
        +String thresholdRef
        +DateTime createdAt
        +bool acknowledged
        +DateTime acknowledgedAt
        +String acknowledgedBy
    }

    class CountermeasureProtocol {
        +String protocolId
        +String alertRuleRef
        +String anatomicalImpactBlock
        +String severityTimeBlock
        +List~ActionStep~ steps
        +bool isChained
        +validateMaxFourSteps() bool
    }

    class EncryptedEnvelope {
        +String id
        +String hlcTimestamp
        +String authorDeviceId
        +String ivBase64
        +String ciphertextAesGcm
        +String sha256Checksum
        +String ed25519Signature
        +verifyIntegrity() bool
    }

    class KeyManager {
        +CryptoKey crewDataKey
        +bytes wrappedKeyUserPin
        +bytes wrappedKeyCmoPin
        +deriveKeyFromPinPBKDF2(String pin, bytes salt) CryptoKey
        +unwrapCrewKey(String pin) CryptoKey
        +signPayloadEd25519(bytes payload) String
    }

    class CRDTReplicator {
        +GSet clinicalRecordsSet
        +LWWMap preferencesMap
        +PNCounter gamificationXpCounter
        +HybridLogicalClock hlc
        +VersionVector deviceVector
        +mergeDelta(List~EncryptedEnvelope~ deltas) void
        +computeMissingDeltas(VersionVector remoteVector) List~EncryptedEnvelope~
    }

    class SignedDsnExport {
        +String exportId
        +String crewId
        +bool isAnonymized
        +String jsonPayload
        +String sha256Digest
        +String ed25519Signature
        +generateForTransponder() File
    }

    CrewMember "1" *-- "0..180" DailyMeasurement : logs (ADR-016)
    CrewMember "1" *-- "0..*" SubjectiveSymptom : reports (RF-ING-04)
    CrewMember "1" o-- "0..*" ClinicalAlert : owns
    HabitatTelemetry "1" ..> "1" ClinicalEngine : correlates (RF-EVA-04)
    DailyMeasurement "1" ..> "1" ClinicalEngine : evaluates < 50ms
    ClinicalEngine "1" --> "0..*" ClinicalAlert : generates (R-*, D-*)
    ClinicalAlert "1" --> "1" CountermeasureProtocol : dispatches (ADR-017)
    ClinicalAlert ..> EncryptedEnvelope : encrypts & immutalizes (RNF-SEC-04)
    DailyMeasurement ..> EncryptedEnvelope : encrypts AES-GCM 256 (ADR-006)
    KeyManager "1" --> "1..*" EncryptedEnvelope : protects (ADR-012)
    CRDTReplicator "1" o-- "0..*" EncryptedEnvelope : synchronizes (ADR-009)
    CRDTReplicator "1" ..> "0..1" SignedDsnExport : exports (ADR-010)
```

---

## 2. Class Responsibilities and SRS / ADR Traceability

### 2.1 Clinical and Data Entities (`SRS §5.1` & `ADR-016`)
* **`DailyMeasurement` (`RF-ING-01`, `RF-ING-05`, `ADR-016`)**: Encapsulates the 9 daily clinical variables (`HR, HRV, PAS, PAD, SpO2, glucose, temperature, sleep, mood`) plus optional urinary calcium. Its `validatePhysiologicalBounds()` method flags anomalous values with `isSuspect = true` **without discarding them**, fulfilling `RF-ING-05`.
* **`SubjectiveSymptom` (`RF-ING-04`, `SRS §5.1`)**: Closed catalog of 6 one-tap selectable symptoms: `blurredVision`, `headache`, `nausea`, `lumbarPain`, `orthostaticDizziness`, and `extremeFatigue`.

### 2.2 Deterministic Inference Engine (`ClinicalEngine`, `ADR-005`, `ADR-011`, `ADR-017`)
* **`ClinicalEngine`**: Operates inside the `Clinical Engine Worker` with zero network dependencies. Implements:
  * **10 Correlation Rules (`RF-EVA-04`, `SRS §6.2`)**: `R-ENV-01`, `R-ENV-02`, `R-SANS-01`, `R-SANS-02`, `R-RAD-01`, `R-RAD-02`, `R-COG-01`, `R-REN-01`, `R-REN-02`, `R-CARD-01`.
  * **3 Drift Rules (`RF-DER-01..04`, `ADR-011`)**: `D-01` (7-day linear regression), `D-02` (Modified Z-Score with MAD over days 1–14), and `D-03` (decreasing sleep + increasing DBP / PAD).
* **`CountermeasureProtocol` (`RF-GUI-01..04`, `ADR-017`)**: Structures alerts into the 3 mandatory blocks (*What is happening anatomically*, *Severity and estimated time*, *Actions*) and strictly validates that `steps.length <= 4` (**`ADR-017`**). Longer interventions (such as combined SPE or LBNP protocols) are chained via `isChained = true`.

### 2.3 Cryptographic Security, Privacy, and CRDT (`ADR-006`, `ADR-009`, `ADR-010`, `ADR-012`)
* **`KeyManager` (`ADR-012`, `RNF-SEC-02`)**: Implements cryptographic segregation compliant with the *Privacy Act of 1974* and *HIPAA*. Each crew member has a symmetric data key wrapped simultaneously with their personal PIN and the CMO's PIN via `PBKDF2`. Neither cabin displays nor the Sync Hub can decrypt individual envelopes.
* **`EncryptedEnvelope` (`ADR-006`, `RNF-SEC-01`, `RNF-SEC-03`, `RNF-SEC-04`)**: Envelope stored in IndexedDB with native `AES-GCM-256` encryption, `SHA-256` checksum to detect cosmic-radiation bit-flips (*Single Event Upsets - SEU*), and `Ed25519` signature in an *append-only* chained ledger.
* **`CRDTReplicator` (`ADR-009`, `RNF-NET-02`)**: Resolves offline conflicts without coordination using a `G-Set` (immutable clinical data), `LWW-Map` ordered by Hybrid Logical Clock `HLC` (UI preferences), and `PNCounter` (gamification XP score).
* **`SignedDsnExport` (`ADR-010`, `RNF-NET-04`, `RF-REG-02`)**: Packages a consolidated `Ed25519`-signed JSON report (with an anonymization option per `ADR-012`) for manual handoff to the spacecraft's external communications system.
