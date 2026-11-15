# 🛰️ SDD – Software Design Description
## ASTHA: Autonomous Space Telemetry & Health Analytics
### NASA Space Apps Challenge 2026 | Human Spaceflight Biomedical Engineering

---

| **Metadata** | **Official Engineering Specification** |
| :--- | :--- |
| **Document Identifier** | `NASA-ASTHA-SDD-2026-REV-3.0` *(Consolidated Archive — See `docs/SDD/` for Canonical Baseline)* |
| **Engineering Standard** | **NASA-STD-8739.8** (Software Engineering Requirements) / **IEEE Std 1016-2009** |
| **Reference Medical Standards** | **NASA-STD-3001** (Vol 1: Crew Health; Vol 2: Habitat Ergonomics & ECLSS) |
| **Software Safety Classification** | **Class B – Non-Core Avionics / Mission Critical Crew Safety Supporting Software** |
| **Reference Architecture** | *Hexagonal Event-Driven Web Workers (Svelte 5 + uPlot + On-Demand Three.js) + IndexedDB WebCrypto + Sync Hub LAN* |
| **Reference Operational Mission** | Interplanetary Mars Transit (*Deep Space Transport DST-1*) / Isolated Zero-WAN LAN |
| **Verification Status** | **Phase 2: Approved Detailed Design (Baseline v3.0.0 — Zero SRS/ADR Drift)** |

---

> ⚠️ **DOCUMENT AUTHORITY NOTICE (`ADR-001`):**  
> The **current canonical specification (v3.0.0 — Zero Drift with SRS and ADRs 001–020)** resides in the modular directory [**docs/SDD/**](SDD/README.md). This monolithic file is preserved solely as a preliminary historical reference; in the event of any discrepancy, the modular collection prevails:
> * [**SDD-01:** Global System Architecture (Workers, <5W/3% CPU Budgets, Z-Score MAD)](SDD/01-Arquitectura-Global-del-Sistema.md)
> * [**SDD-02:** UML Class Diagram (SRS §5.1 Entities, WebCrypto AES-GCM, CRDT)](SDD/02-Diagrama-de-Clases-UML.md)
> * [**SDD-03:** UML Sequence Diagrams (ADR-013 Escalation, On-Demand 3D, Signed JSON)](SDD/03-Diagramas-de-Secuencia-UML.md)
> * [**SDD-04:** UML Component Diagram (Svelte 5, uPlot, 2 Workers, Sync Hub)](SDD/04-Diagrama-de-Componentes-UML.md)
> * [**SDD-05:** UML Deployment Diagram (Isolated C4-L4 LAN, Internal CA, Cabin ADR-014)](SDD/05-Diagrama-de-Despliegue-UML.md)
> * [**SDD-06:** Data Design and Interface Contracts (SRS Schemas, CRDT, AAA Tokens)](SDD/06-Diseno-de-Datos-y-Contratos-de-Interfaz.md)
> * [**SDD-07:** Complete SRS-to-SDD Traceability Matrix (42 RF + 19 RNF + 10 R-* + 3 D-*)](SDD/07-Matriz-de-Trazabilidad-SRS-a-SDD.md)
> * [**SDD-08:** Architecture Decision Record (ADR-001 to ADR-020)](SDD/08-Architecture-decisions.md)

---

## 📑 Table of Contents
1. [Introduction and System Scope](#1-introduction-and-system-scope)
2. [Software Architecture Overview](#2-software-architecture-overview)
3. [UML Class Diagram](#3-uml-class-diagram)
4. [UML Sequence Diagrams](#4-uml-sequence-diagrams)
   - *Scenario A: Real-Time Ingestion, Drift Detection (Modified Z-Score), and Master Caution*
   - *Scenario B: Interactive 3D Physiological Triage and Countermeasure Execution*
   - *Scenario C: Resilient DTN Packaging and Asynchronous Synchronization*
5. [UML Component Diagram](#5-uml-component-diagram)
6. [UML Deployment Diagram](#6-uml-deployment-diagram)
7. [Data Design and Interface Contracts](#7-data-design-and-interface-contracts)
8. [Requirements-to-Design Traceability Matrix (RTM: SRS to SDD)](#8-requirements-to-design-traceability-matrix-rtm-srs-to-sdd)

---

## 1. Introduction and System Scope

### 1.1 Purpose
This **Software Design Description (SDD)** specifies the structural decomposition, object-oriented design, dynamic event flows, components, and deployment topology for the **ASTHA (Autonomous Space Telemetry & Health Analytics)** system, in strict compliance with **NASA-STD-8739.8** and international standard **IEEE Std 1016-2009**.

### 1.2 System Scope
ASTHA is an autonomous edge-computing medical **Clinical Decision Support System (CDSS)** and telemetry analytics platform engineered to safeguard crew lives during deep-space exploration missions where real-time Earth-based medical assistance is physically impossible due to relativistic communication latency (up to **22 minutes one-way** / 44 minutes round-trip delay to Mars).

The system operates under the following operational mandates:
1. **Level 4 Operational Autonomy (NASA ExMC):** Guided diagnostic and therapeutic capability without Mission Control intervention from Earth.
2. **Physiological Determinism:** Predictive anomaly detection prior to catastrophic events using the robust **Modified Z-Score (MAD)** deviation algorithm.
3. **Zero-Connectivity Resilience:** Local persistence and asynchronous transmission via Delay/Disruption Tolerant Networking (**DTN Bundle Protocol RFC 9171**).

---

## 2. Software Architecture Overview

The ASTHA architecture implements the **Hexagonal (Ports & Adapters)** pattern combined with an **Event-Driven Edge Processing Reactive Model**.

```
+------------------------------------------------------------------------------------+
|                                    UI & AVIONICS COCKPIT LAYER                     |
|   Tactical HUD  |  Three.js 3D Viewport  |  Chart.js Telemetry  |  Audio Alarms    |
+------------------------------------------------------------------------------------+
                                       │ ▲ (Events & Reactive State)
                                       ▼ │
+------------------------------------------------------------------------------------+
|                         APPLICATION & CDSS CORE (DOMAIN SERVICES)                  |
|   Rule Engine (NASA-STD-3001)  |  Modified Z-Score (MAD)  |  Countermeasure Engine |
+------------------------------------------------------------------------------------+
                                       │ ▲ (Clean Interfaces / Ports)
                                       ▼ │
+------------------------------------------------------------------------------------+
|                          INFRASTRUCTURE & ADAPTERS (EDGE & HARDWARE)               |
|   Astroskin BLE Adapter  |  ECLSS 1553 Driver  |  IndexedDB Store  |  DTN RFC 9171 |
+------------------------------------------------------------------------------------+
```

### 2.1 Key Architectural Principles
* **Edge First:** 100% of diagnostic evaluation logic executes locally within the spacecraft runtime. Zero dependencies on cloud servers or external services.
* **Separation of Concerns:** The 3D rendering engine (Three.js WebGL) is decoupled from the physiological computation engine. State flows unidirectionally (*Unidirectional Data Flow*).
* **Dual-Fault Tolerant Reliability:** If a sensor degrades or emits telemetry noise, the Median Absolute Deviation (MAD) filter isolates the outlier without triggering false alarms that cognitively overload the astronaut.

---

## 3. UML Class Diagram

The class diagram models the physiological and environmental domain entities, the CDSS clinical evaluators, the DTN persistence layer, and the biomedical visualization controllers.

```mermaid
classDiagram
    class AstronautProfile {
        +String astronautId
        +String fullName
        +String missionRole
        +String flightPhase
        +VitalSignReading currentVitals
        +GenomicBiomarkerProfile biomarkers
        +updateVitals(VitalSignReading reading)
        +getClinicalRiskLevel() String
    }

    class VitalSignReading {
        +int heartRate
        +int systolicBp
        +int diastolicBp
        +float spo2
        +float hrvRmssd
        +float bodyTemp
        +DateTime timestamp
        +isNominal() bool
    }

    class GenomicBiomarkerProfile {
        +String osdrStudyId
        +float cellFreeDnaLevel
        +float telomereLengthIndex
        +float mitochondrialDnaDamage
        +float gcrRadiationDoseMsv
        +assessLongTermRisk() String
    }

    class EclssEnvironmentReading {
        +float cabinPressureKpa
        +float co2PartialPressureMmhg
        +float o2Percentage
        +float ambientTempC
        +float relativeHumidity
        +float ionizingRadiationUsvH
        +isAtmosphereBreathable() bool
    }

    class CdssRuleEngine {
        -List rules
        -ModifiedZScoreDetector zScoreEngine
        +evaluatePhysiology(AstronautProfile astro, EclssEnvironmentReading env) ClinicalEvaluation
        +triggerMasterCaution(AlertSeverity severity, String diagnosis)
    }

    class ModifiedZScoreDetector {
        -float madThreshold
        -List baselineWindow
        +computeModifiedZScore(float currentValue) float
        +detectPhysiologicalDrift(float currentValue) bool
    }

    class ClinicalEvaluation {
        +String primaryDiagnosis
        +AlertSeverity severity
        +int painScore
        +String targetedOrgan
        +List directives
        +DateTime evaluationTime
    }

    class ClinicalDirective {
        +String directiveId
        +String actionTitle
        +String pharmacologicalDose
        +bool requiresSurgeonApproval
        +executeAction() bool
    }

    class DigitalTwin3DController {
        -Scene scene
        -Camera camera
        -Renderer renderer
        +renderFrame()
        +highlightOrgan(String organId)
        +setCameraZoom(String targetZone)
        +toggleLayerMode(String mode)
        +handleRaycastIntersection(Vector2 mouseCoords) String
    }

    class DtnBundleProtocolEngine {
        -Queue storageQueue
        -int bundleSequenceNumber
        +generateMedicalBundle(AstronautProfile astro) DtnBundle
        +bufferLocally(DtnBundle bundle)
        +transmitWhenLinked(DtnTransceiver link)
    }

    AstronautProfile "1" *-- "1" VitalSignReading : has current
    AstronautProfile "1" *-- "1" GenomicBiomarkerProfile : contains
    CdssRuleEngine "1" o-- "1" ModifiedZScoreDetector : utilizes
    CdssRuleEngine ..> ClinicalEvaluation : produces
    ClinicalEvaluation "1" *-- "many" ClinicalDirective : prescribes
    DigitalTwin3DController ..> ClinicalEvaluation : visually highlights
    DtnBundleProtocolEngine ..> AstronautProfile : packages
```

### 3.1 Core Class Responsibilities
* **`AstronautProfile`**: Represents the crew member's longitudinal medical record. Manages mapping between real-time biometrics and reference genomic background (**NASA OSDR OSD-574**).
* **`VitalSignReading`**: Immutable object storing instantaneous vital-sign readings captured by the Astroskin (Bio-Monitor) smart garment biosensors.
* **`CdssRuleEngine`**: Central clinical decision support orchestrator. Cross-correlates human vital telemetry against habitat environmental parameters (**NASA-STD-3001 Vol 2**).
* **`ModifiedZScoreDetector`**: Deterministic implementation of the anomaly detection algorithm based on the **Median Absolute Deviation ($MAD$)**:
  $$M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{MAD}$$
  Prevents false positives caused by isolated telemetry noise spikes.
* **`DigitalTwin3DController`**: Abstraction of the WebGL rendering subsystem (Three.js) that renders the biomechanical digital twin and manages interactive raycasting over internal organs.
* **`DtnBundleProtocolEngine`**: Implementation of **RFC 9171 / CCSDS 734.2-B-1** for asynchronous *Store-and-Forward* bundling, ensuring guaranteed delivery to Earth once a DSN link is re-established.

---

## 4. UML Sequence Diagrams

### 4.1 Scenario A: Real-Time Ingestion, Drift Detection (Modified Z-Score), and Master Caution

This diagram illustrates the critical workflow when an astronaut experiences physiological drift (for example, intracranial hypertension and loss of heart rate variability triggered by a solar storm or $\text{CO}_2$ buildup in microgravity).

```mermaid
sequenceDiagram
    autonumber
    actor Sensor as Astroskin Bio-Harness / ECLSS
    participant EdgeIngest as TelemetryIngestionService
    participant ZScore as ModifiedZScoreDetector
    participant CDSS as CdssRuleEngine
    participant Caution as MasterCautionSystem
    participant Audio as CockpitAudioEngine
    participant HUD as TacticalHUDView
    participant Twin as DigitalTwin3D

    Sensor->>EdgeIngest: Transmit Raw Telemetry Packet (HR, BP, SpO2, HRV, CO2)
    EdgeIngest->>ZScore: Stream Vital Sample (currentSample, baselineWindow)
    Note over ZScore: Compute MAD & Modified Z-Score: Mi = 0.6745*(xi - x_med)/MAD
    alt Modified Z-Score > 3.5 (Significant Drift)
        ZScore-->>CDSS: Flag Anomaly (Drift Detected in Intracranial Pressure & SpO2)
        CDSS->>CDSS: Correlate Vitals with ECLSS (High CO2 + Microgravity Fluid Shift)
        CDSS->>Caution: Raise Critical Alert (SANS Grade 3 / SPE / Acidosis)
        Caution->>Audio: Play Audio Alarm (Alarm Siren / Klaxon)
        Caution->>HUD: Display Specialized Alert Modal with Clinical Diagnostics
        CDSS->>Twin: Set Organ Distress Beacon & Warning Halos (target: Eyes / Heart)
        Twin->>Twin: Focus 3D Camera & Pulse Target Anatomy
    else Normal Physiological Deviation
        ZScore-->>EdgeIngest: Nominal (Within Operational Envelope)
        EdgeIngest->>HUD: Update Real-time Trend Sparklines
    end
```

---

### 4.2 Scenario B: Interactive 3D Physiological Triage and Countermeasure Execution

Models direct interaction when the Crew Medical Officer or astronaut inspects a compromised organ via raycasting on the 3D model and executes a guided medical protocol.

```mermaid
sequenceDiagram
    autonumber
    actor Astronaut as Astronaut / Crew Medical Officer
    participant Canvas as ThreeJS 3D Viewport
    participant Raycast as RaycastPicker
    participant Drawer as OrganModalDrawer
    participant Protocol as CountermeasureEngine
    participant DTN as DtnBundleLogger
    actor FlightSurgeon as Earth Flight Surgeon (Houston)

    Astronaut->>Canvas: Click on 3D Anatomical Organ (e.g. Head / Eyes)
    Canvas->>Raycast: Evaluate Pointer Coordinates (Raycaster.intersectObjects)
    Raycast-->>Canvas: Hit Detected: meshEyesNode (y >= 1.95)
    Canvas->>Drawer: triggerOrganInspection('eyes')
    Drawer->>Drawer: Load Pathophysiology, Pain Score (7/10), SANS Protocol
    Drawer-->>Astronaut: Display Clinical Drawer with Action Checklist
    Astronaut->>Drawer: Confirm Directive: "3% Hypertonic Saline IV Infusion + LBNP"
    Drawer->>Protocol: applyDrawerTreatment()
    Protocol->>Protocol: Update Pain Score (7/10 -> 1/10 Relieved)
    Protocol->>DTN: Log Treatment Execution into Mission Medical Logbook
    Note over DTN: Package into RFC 9171 DTN Bundle (Bundle Protocol v7)
    DTN-->>FlightSurgeon: Asynchronous Telemetry Delivery via Deep Space Network (22-min delay)
```

---

### 4.3 Scenario C: Resilient DTN Packaging and Asynchronous Synchronization

Models the *Store-and-Forward* protocol for the flight medical logbook during orbital communications blackouts or planetary occultations.

```mermaid
sequenceDiagram
    autonumber
    participant System as ASTHA Telemetry Engine
    participant BundlePacker as DtnBundleProtocolEngine
    participant Storage as LocalStorage / IndexedDB
    participant DtnDaemon as On-Board DTN Node
    participant Transceiver as Deep Space Ka-Band Antenna
    participant GroundStation as DSN Earth Station (Madrid / Goldstone)

    System->>BundlePacker: New Medical Telemetry Event (Vital Shift / Treatment Log)
    BundlePacker->>BundlePacker: Serialize to CBOR / RFC 9171 Bundle Structure
    BundlePacker->>Storage: Store Bundle Locally in Persistent Buffer Queue
    Storage-->>BundlePacker: Commit Acknowledged (Local Resilience Guaranteed)

    loop Every Telemetry Sweep (1 Hz)
        DtnDaemon->>Transceiver: Query RF Carrier Link State
        alt Carrier Available & Ephemeris Lock
            Transceiver-->>DtnDaemon: Link Open (Ka-Band / Optical Ground Track Active)
            DtnDaemon->>Storage: Dequeue Buffered Telemetry Bundles
            Storage-->>DtnDaemon: Deliver Bundles [B_001, B_002, B_003]
            DtnDaemon->>Transceiver: Transmit Bundles with Custody Transfer Flag
            Transceiver-->>GroundStation: Physical Propagation (Speed of Light, 22 min)
            GroundStation-->>DtnDaemon: Return Custody Acceptance Signal
            DtnDaemon->>Storage: Mark Bundles as Transmitted / Archive
        else Out of Line-of-Sight / Solar Occlusion
            Transceiver-->>DtnDaemon: Link Down (RF Blackout / Occlusion)
            Note over Storage: Maintain Zero-Loss Buffer in Flash Storage indefinitely
        end
    end
```

---

## 5. UML Component Diagram

Illustrates ASTHA's high-level modular decomposition, highlighting ingestion ports and adapters, the decision-support core, local persistence, and the cockpit interface.

```mermaid
flowchart TB
    subgraph UI_Layer ["Presentation and Flight Experience Layer (Avionics Cockpit)"]
        HUD["Tactical HUD Controller"]
        ThreeJS["Digital Twin 3D Viewport (Three.js WebGL)"]
        ChartTelemetry["Aerospace Telemetry Charts (Chart.js)"]
        Modals["Clinical Modals (Master Caution, Bio-Passport, Technical Schematics)"]
        AudioFX["Web Audio Synthesizer (Cockpit Sounds & Klaxon)"]
    end

    subgraph CDSS_Layer ["Clinical Decision Support Layer (CDSS Core)"]
        IngestionService["Telemetry Ingestion & Validation Service"]
        MAD_Engine["Modified Z-Score & Outlier Engine (MAD)"]
        ClinicalRules["Aerospace Clinical Rule Engine (NASA-STD-3001)"]
        CountermeasureCtrl["Countermeasure & Protocol Execution Controller"]
    end

    subgraph Storage_DTN ["Edge Resilience and Delay-Tolerant Networking Layer (DTN)"]
        LocalStore["Local Edge Storage (IndexedDB / LocalStorage)"]
        DtnPackager["DTN Space-Link Packager (RFC 9171 / CCSDS)"]
        SyncManager["Store-and-Forward Synchronization Manager"]
    end

    subgraph External_Sensors ["Telemetry Sources & Cabin Sensors"]
        AstroskinBLE["Astroskin Smart-Shirt (BLE / Mesh WiFi)"]
        ECLSS_Bus["ECLSS Cabin Sensors (MIL-STD-1553 / RS-485)"]
        OSDR_API["NASA Open Science Data Repository (OSDR REST API)"]
    end

    AstroskinBLE --> IngestionService
    ECLSS_Bus --> IngestionService
    OSDR_API --> IngestionService

    IngestionService --> MAD_Engine
    MAD_Engine --> ClinicalRules
    ClinicalRules --> CountermeasureCtrl

    ClinicalRules --> HUD
    ClinicalRules --> ThreeJS
    ClinicalRules --> Modals
    ClinicalRules --> AudioFX
    IngestionService --> ChartTelemetry

    CountermeasureCtrl --> LocalStore
    LocalStore --> DtnPackager
    DtnPackager --> SyncManager
```

---

## 6. UML Deployment Diagram

Represents the distributed execution topology spanning astronaut body-worn sensors, the spacecraft onboard network (*Deep Space Transport DST-1*), the deep-space link, and the Earth control center.

```mermaid
flowchart TB
    subgraph Crew_Wearable ["Crew Wearable Node"]
        Astroskin["Astroskin / Bio-Monitor Smart Shirt<br>• 3-Lead ECG (250 Hz)<br>• Thoracic Inductive Plethysmography (25 Hz)<br>• Triaxial Accelerometer & Skin Temp"]
        SmartWrist["Wrist Telemetry Display<br>• Haptic Alerts & BLE 5.0 Link"]
        Astroskin -->|Bluetooth Low Energy| SmartWrist
    end

    subgraph Habitat_ECLSS ["Habitat Sensor Node (Cabin ECLSS Bus)"]
        AtmSensors["Cabin Atmospheric Sensors<br>• Total Pressure (CDRA/OGS)<br>• Stoichiometric PCO2 & PO2<br>• Neutron Radiation Dosimeter (CANS)"]
    end

    subgraph Deep_Space_Transport ["Deep Space Transport Spacecraft (DST-1 Mars Transit Node)"]
        subgraph Edge_Medical_Server ["Redundant Onboard Medical Server (Dual-Fault Tolerant)"]
            ASTHA_Core["ASTHA Core Telemetry & CDSS Engine<br>• NodeJS / Edge Runtime<br>• SQLite / IndexedDB Local Storage<br>• Offline NASA OSDR Enriched Database"]
            DTN_Daemon["DTN Bundle Protocol v7 Agent<br>• RFC 9171 Store-and-Forward Buffer"]
        end

        subgraph Crew_Terminal ["Cabin Medical Terminal (Crew Workstation)"]
            Browser["Avionics Web Cockpit (PWA / WebGL)<br>• Three.js 3D Digital Twin Mannequin<br>• Chart.js Flight Telemetry Dashboard<br>• Master Caution & Warning System"]
        end
    end

    subgraph Ground_Segment ["Ground Segment (NASA Johnson Space Center / Houston)"]
        DSN["Deep Space Network (DSN 70m Antennas Goldstone/Madrid/Canberra)"]
        FlightSurgeonConsole["Flight Surgeon Telemetry Console (BMed / Houston)<br>• Asynchronous DTN Bundle Reassembly<br>• Longitudinal Mission Telemetry Archive"]
    end

    SmartWrist -->|WiFi 6 Mesh IEEE 802.11ax| ASTHA_Core
    AtmSensors -->|MIL-STD-1553 / CAN Bus Controller| ASTHA_Core
    ASTHA_Core <-->|WebSocket / Local IPC| Browser
    ASTHA_Core --> DTN_Daemon

    DTN_Daemon <==|Optical / Ka-Band Link (22-min one-way latency)|==> DSN
    DSN --> FlightSurgeonConsole
```

---

## 7. Data Design and Interface Contracts

### 7.1 Unified Biomedical Telemetry Schema (JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ASTHA_Unified_Telemetry_Packet",
  "type": "object",
  "properties": {
    "packetId": { "type": "string", "format": "uuid" },
    "metTimestamp": { "type": "string", "example": "048:14:28:10" },
    "astronaut": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "enum": ["C001", "C002", "C003", "C004"] },
        "name": { "type": "string" },
        "heartRateBpm": { "type": "integer", "minimum": 30, "maximum": 220 },
        "systolicPressureMmhg": { "type": "integer", "minimum": 60, "maximum": 260 },
        "diastolicPressureMmhg": { "type": "integer", "minimum": 40, "maximum": 160 },
        "spo2Percentage": { "type": "number", "minimum": 70.0, "maximum": 100.0 },
        "hrvRmssdMs": { "type": "number", "minimum": 5.0, "maximum": 150.0 },
        "skinTempCelsius": { "type": "number", "minimum": 34.0, "maximum": 42.0 }
      },
      "required": ["id", "heartRateBpm", "systolicPressureMmhg", "spo2Percentage", "hrvRmssdMs"]
    },
    "habitatEclss": {
      "type": "object",
      "properties": {
        "cabinPressureKpa": { "type": "number", "minimum": 50.0, "maximum": 110.0 },
        "co2PartialPressureMmhg": { "type": "number", "minimum": 0.0, "maximum": 15.0 },
        "o2Percentage": { "type": "number", "minimum": 15.0, "maximum": 30.0 },
        "radiationDoseRateUsvH": { "type": "number", "minimum": 0.0 }
      },
      "required": ["cabinPressureKpa", "co2PartialPressureMmhg", "o2Percentage"]
    },
    "cdssState": {
      "type": "object",
      "properties": {
        "driftDetected": { "type": "boolean" },
        "madScore": { "type": "number" },
        "masterCautionActive": { "type": "boolean" },
        "activeProtocol": { "type": "string" }
      }
    }
  },
  "required": ["packetId", "metTimestamp", "astronaut", "habitatEclss", "cdssState"]
}
```

### 7.2 DTN Bundle Packet Structure (RFC 9171 / CCSDS Bundle)
```
+-------------------------------------------------------------------------+
|                  PRIMARY BUNDLE HEADER (RFC 9171)                       |
| Bundle Processing Flags | Destination EID: dtn://jsc.nasa.gov/bmed      |
| Source EID: dtn://dst1.mars/astha | Creation Timestamp: MET 048:14:28:10 |
| Lifetime: 604,800 s (7 days)      | Payload Length: 4,096 bytes         |
+-------------------------------------------------------------------------+
|                    BUNDLE PAYLOAD BLOCK (CBOR Encoded)                  |
|  - Encrypted Medical Telemetry Vector (AES-256-GCM)                    |
|  - Vital Sign Baseline Moving Averages (10-minute Epoch)                |
|  - Countermeasure Interventions Administered by Crew                    |
|  - NASA OSDR Genomic Mutation Divergence Delta                         |
+-------------------------------------------------------------------------+
```

---

## 8. Requirements-to-Design Traceability Matrix (RTM: SRS to SDD)

This matrix formally traces the Functional and Non-Functional Requirements specified in the **SRS (Phase 1)** to the architectural components and classes designed in this **SDD (Phase 2)**.

| SRS Requirement ID | Functional Requirement Description | SDD Design Class / Module | Design Verification Mechanism |
| :--- | :--- | :--- | :--- |
| **RF-01** | Vital signs telemetry ingestion (HR, BP, SpO2, HRV, Temp) | `TelemetryIngestionService`, `VitalSignReading` | Class Diagram & Sequence Scenario A |
| **RF-02** | Physiological drift detection and anomaly filtering without false alarms | `ModifiedZScoreDetector` | MAD Algorithm (CDSS Layer) |
| **RF-03** | Interactive 3D Digital Twin with anatomical layers and raycasting | `DigitalTwin3DController`, `RaycastPicker` | Component Diagram (Three.js WebGL) |
| **RF-04** | Centralized visual and audible Master Caution & Warning alarm | `MasterCautionSystem`, `CockpitAudioEngine` | Sequence Scenario A |
| **RF-05** | Step-by-step countermeasure prescription and checklist | `ClinicalDirective`, `CountermeasureEngine` | Sequence Scenario B |
| **RF-06** | Life-support environmental correlation (ECLSS NASA-STD-3001) | `EclssEnvironmentReading`, `CdssRuleEngine` | Component & Class Diagrams |
| **RF-07** | Genomic integration with NASA OSDR (OSD-574 Inspiration4) | `GenomicBiomarkerProfile`, `OSDR_API` Gateway | Class & Data Design |
| **RF-08** | Local persistent storage and asynchronous DTN transmission | `DtnBundleProtocolEngine`, `LocalStore` | Sequence Scenario C & Deployment |
| **RNF-01** | 100% onboard Edge autonomy (Zero dependency on cloud servers) | `Edge_Medical_Server` (DST-1 Node) | Deployment Diagram |
| **RNF-02** | 3D rendering latency $\le 16.6\text{ ms}$ (steady 60 FPS) | `DigitalTwin3DController` (procedural Three.js) | Presentation Layer |
| **RNF-03** | Temporal resilience to communication delays up to 22 minutes | `DTN_Daemon` (RFC 9171 Store-and-Forward) | Deployment Diagram & Sequence C |

---

### Conclusion and Design Sign-Off
This **Software Design Description (SDD)** formally validates the transition from **Phase 1 (Requirements / SRS)** to **Phase 2 (Architectural Design / SDD)** of the **ASTHA** system.  
It provides the comprehensive technical foundation required by the **NASA Space Apps Challenge** for code auditing, safety-critical life-support software verification, and evaluation by aerospace engineering panels.
