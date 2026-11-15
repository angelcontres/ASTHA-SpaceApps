# SRS – Astronaut Health Monitoring Software

Nov 14, 2026 · @angel

## 1. Introduction

This document specifies the requirements for **ASTHA**, an autonomous biomedical monitoring and clinical decision support system for crews on missions beyond low Earth orbit, where communication latency with Earth (3 to 22 minutes one-way) precludes real-time consultation. It follows the structure of ISO/IEC/IEEE 29148.

**Purpose.** To provide a non-specialist crew member with a tool that detects physiological drift, classifies its severity, and prescribes countermeasures executable with onboard resources, with no external connectivity.

**Scope.** Offline web application (single-node PWA) featuring data ingestion, evaluation engine, trend detection, interactive anatomical model, countermeasure guide, gamification, and crisis simulator. Out of scope: definitive medical diagnosis, integration with flight-certified hardware, and replacement of the Flight Surgeon's clinical judgment.

**Definitions.**

| Term | Meaning |
| --- | --- |
| CMO | Crew Medical Officer (crew member with basic medical training) |
| SANS | Spaceflight Associated Neuro-ocular Syndrome |
| SPE | Solar Particle Event |
| ARED / LBNP | Advanced Resistive Exercise Device / Lower Body Negative Pressure |
| HRV (rMSSD) | Heart Rate Variability |
| Drift | Gradual change in a time series that has not yet crossed a threshold |
| Edge / Offline | All processing and medical knowledge reside on the local node |

**References.** NASA-STD-3001 (Vol. 1 and 2), NASA HRP (Hazards and Risks), CSA (Astroskin, CANS), ISO/IEC/IEEE 29148, and the provided DOMINIO\_Y\_PROBLEMATICA\_ESPACIAL and HEALTH\_MONITORING\_SOFTWARE\_SPEC documents.

## 2. General Description

ASTHA is a local node that correlates physiological telemetry (Astroskin-style) with environmental and radiation telemetry (ECLSS- and CANS-style) to produce a three-state health status (Nominal, Caution, Critical) per crew member and per organ system.

### 2.1 Actors

| Actor | System Usage | Critical Need |
| --- | --- | --- |
| Astronaut | Logs data, views health status, executes daily countermeasures | Immediate interpretation without jargon or false alarms |
| CMO | Responds to alerts, follows step-by-step protocols | Sequential and verifiable clinical decision support |
| Flight Surgeon (Earth) | Receives asynchronous summaries | Consolidated trends and events to validate treatments |
| Judge / Evaluator | Triggers the crisis simulator | Clear demonstration of system autonomy |

### 2.2 Domain Constraints (Non-Negotiable)

1. **Zero external dependency:** no cloud, no remote APIs; data, rules, and medical knowledge reside on the node.
2. **Non-specialist user:** every alert explains what is occurring, severity with estimated time to impact, and exact, verifiable actions.
3. **Limited medical resources:** interventions are restricted to ARED, cycle ergometer or treadmill, LBNP, exploration medical kit, and storm shelter.
4. **Low cognitive load:** unambiguous color coding, minimal taps, glove-operable controls.

### 2.3 Assumptions and Dependencies

- Thresholds originate from NASA-STD-3001 as established in the domain document; countermeasure values are advisory and must be validated with medical personnel prior to operational flight use.
- Telemetry is **simulated** (180-day synthetic dataset); integration with flight sensors remains a documented interface.
- The system supports decision-making; it does not replace the CMO or the Flight Surgeon.

## 3. Functional Requirements

Priority per MoSCoW: **M** (Must), **S** (Should), **C** (Could). Every requirement is verifiable (see Section 8).

### 3.1 Data Ingestion (ING)

| ID | Requirement | Prior. | AC |
| --- | --- | --- | --- |
| RF-ING-01 | The system must allow logging heart rate, HRV, systolic and diastolic blood pressure, SpO2, glucose, temperature, sleep hours, and mood (1-10) with large, glove-friendly controls. | M | AC-01 |
| RF-ING-02 | It must accept environmental telemetry: ppCO2, cabin pressure, % O2, and radiation dose rate (µSv/h). | M | AC-05 |
| RF-ING-03 | It must simulate continuous bio-monitor telemetry (Astroskin-type) and replay a 180-day synthetic dataset per crew member. | M | AC-02 |
| RF-ING-04 | It must allow reporting subjective symptoms (blurred vision, headache, nausea, lower back pain, orthostatic dizziness upon standing) with a single tap per symptom. | M | AC-03 |
| RF-ING-05 | It must validate physiologically plausible ranges and flag suspect data without discarding it. | S | AC-01 |
| RF-ING-06 | It must import and export history in JSON format. | S | AC-01 |
| RF-ING-07 | It could offer a pupillary reflex test or skin scan via camera. | C | AC-03 |

### 3.2 Evaluation and Triage (EVA)

| ID | Requirement | Prior. | AC |
| --- | --- | --- | --- |
| RF-EVA-01 | It must classify each indicator as Nominal, Caution, or Critical using the thresholds in Section 6. | M | AC-01 |
| RF-EVA-02 | A crew member's global status must be the worst status across their indicators and active rules. | M | AC-01 |
| RF-EVA-03 | It must assign each finding to an organ system: neuro-ocular, cardiovascular, musculoskeletal, renal, cognitive, radiation, respiratory/environmental. | M | AC-03 |
| RF-EVA-04 | It must apply environmental-physiological correlation rules (Section 6.2). | M | AC-05 |
| RF-EVA-05 | It must handle sustained conditions (HRV < 20 ms sustained; sleep < 5.5 h for 2 days or more). | M | AC-01 |
| RF-EVA-06 | Every alert must indicate the triggered rule, the values that caused it, and the threshold (explainability). | M | AC-03 |
| RF-EVA-07 | Evaluation must operate with zero network packets sent or received. | M | AC-01 |

### 3.3 Drift Detection (DER)

| ID | Requirement | Prior. | AC |
| --- | --- | --- | --- |
| RF-DER-01 | It must compute the trend of each indicator via linear regression over a 7-day rolling window. | M | AC-02 |
| RF-DER-02 | It must issue an early warning if the projection crosses the caution threshold within 7 days or less while the current value is still nominal. | M | AC-02 |
| RF-DER-03 | It must compare against the personal baseline (mean and deviation of the first 14 days) and flag values with z greater than or equal to 2.5. | S | AC-02 |
| RF-DER-04 | It must detect combined patterns (decreasing sleep alongside increasing diastolic blood pressure). | M | AC-02 |

### 3.4 Countermeasure Guidance (GUI)

| ID | Requirement | Prior. | AC |
| --- | --- | --- | --- |
| RF-GUI-01 | Every alert must display three blocks: what is occurring anatomically, severity with estimated time to impact, and actions. | M | AC-04 |
| RF-GUI-02 | Actions must be sequential, verifiable steps (checkbox per step). | M | AC-04 |
| RF-GUI-03 | It must suggest only resources available onboard (ARED, LBNP, medical kit, storm shelter, LiOH/CDRA scrubbers). | M | AC-04 |
| RF-GUI-04 | It must use non-medical language and define any unavoidable technical term. | M | AC-04 |
| RF-GUI-05 | On red alerts, it must indicate what to send to the Flight Surgeon as an asynchronous message, without depending on a reply. | S | AC-01 |

### 3.5 Anatomical Model (ANA)

| ID | Requirement | Prior. | AC |
| --- | --- | --- | --- |
| RF-ANA-01 | It must display an interactive human body with front and back views. | M | AC-03 |
| RF-ANA-02 | It must provide clickable regions: eyes/head, thorax/heart, lumbar region/kidneys, legs/femur, general system/blood. | M | AC-03 |
| RF-ANA-03 | Each region must be colored green, yellow, or red according to its status and include a symbol or pattern (not color alone). | M | AC-03 |
| RF-ANA-04 | Selecting a region must display its indicators, trend, and active countermeasures. | M | AC-03 |

### 3.6 Dashboard and Visualization (DSH)

| ID | Requirement | Prior. | AC |
| --- | --- | --- | --- |
| RF-DSH-01 | It must display per-indicator cards with value, unit, status indicator, and trend arrow. | M | AC-01 |
| RF-DSH-02 | It must plot historical time series with threshold bands. | M | AC-02 |
| RF-DSH-03 | It must allow switching between crew members and viewing a crew-wide summary. | S | AC-01 |
| RF-DSH-04 | It must display habitat environmental telemetry (CO2, pressure, O2, radiation) with its status indicator. | M | AC-05 |

### 3.7 Gamification (GAM)

| ID | Requirement | Prior. | AC |
| --- | --- | --- | --- |
| RF-GAM-01 | It must award XP and badges for 150 daily minutes of exercise, on-time morning check-in, and optimal hydration. | S | AC-04 |
| RF-GAM-02 | It must track daily streaks and crew member level. | S | AC-04 |
| RF-GAM-03 | Gamification must never hide or delay a clinical alert. | M | AC-01 |

### 3.8 Crisis Simulator (SIM)

| ID | Requirement | Prior. | AC |
| --- | --- | --- | --- |
| RF-SIM-01 | It must inject Scenario A: solar particle event (SPE) with guidance to the storm shelter. | M | AC-05 |
| RF-SIM-02 | It must inject Scenario B: acute SANS with visual acuity test and LBNP. | M | AC-05 |
| RF-SIM-03 | It must inject Scenario C: CO2 micro-leak with scrubber verification. | M | AC-05 |
| RF-SIM-04 | It must inject Scenario D: hypercalciuria with kidney stone risk. | S | AC-05 |
| RF-SIM-05 | It must allow resetting to nominal status in one tap and advancing simulated time. | M | AC-05 |

### 3.9 Logging and Configuration (REG)

| ID | Requirement | Prior. | AC |
| --- | --- | --- | --- |
| RF-REG-01 | It must maintain a local log of alerts, completed actions, and acknowledgments. | M | AC-03 |
| RF-REG-02 | It must generate an exportable asynchronous summary for the Flight Surgeon. | S | AC-01 |
| RF-REG-03 | It must support high-contrast mode and large text. | S | AC-03 |

## 4. Non-Functional Requirements (RNF)

This section defines the quality, performance, power efficiency, space ergonomics, cryptographic security, and multi-node communication constraints governing ASTHA under ISO/IEC/IEEE 29148 and NASA-STD-3001.

### 4.1 Power Efficiency, Performance, and Resource Footprint (Ultra-Low Power & Resource Footprint)

In space habitats and planetary transit vehicles, electrical power is a scarce, mission-critical resource supplied by solar arrays or fuel cells. The software must operate under an ultra-low-power regime:

| ID | Performance & Power Requirement | Measurable Technical Specification | Verification Method |
| --- | --- | --- | --- |
| **RNF-POW-01** | **Ultra-low CPU power profile** | The application must not execute active polling loops in either foreground or background. It must use reactive event observers (`requestIdleCallback`, Web Workers for trend regression computations). Sustained CPU usage during passive monitoring must not exceed **3.0%**. | CPU profiling with Chrome DevTools Performance Profiler at 4x throttling. |
| **RNF-POW-02** | **Extended battery autonomy** | On crew tablets and handheld consoles, application power draw must support a minimum of **16 hours** of continuous operation on a single battery charge ($< 350\text{ mW}$ attributable to the software process). | Battery drain measurement on a touch test device over 8 continuous hours. |
| **RNF-POW-03** | **Ultra-lightweight RAM footprint** | Working memory (RAM) consumption must not exceed **150 MB**, even after loading and processing 180 days of telemetry for the entire crew, preventing forced restarts by the operating system memory manager (*OOM killer*). | Heap memory inspection via browser Memory Snapshot. |
| **RNF-POW-04** | **Ultra-compact bundle size** | Total packaged application size (code, clinical logic, styles, and visual assets) must not exceed **5.0 MB** transferable and cached via Service Workers (PWA). | Measurement of total output file size in production build (`npm run build`). |
| **RNF-PER-01** | **Instantaneous clinical evaluation latency** | The complete cycle of ingestion, modified Z-score calculation, environmental cross-correlation, and visual update of the anatomical model must complete in under **50 ms**. | Timing with `performance.now()` during execution of the clinical triage function. |
| **RNF-PER-02** | **Cold start** | Application startup time from local storage to rendering of the main dashboard must be under **1.5 seconds** on mid-range hardware. | First Contentful Paint (FCP) and Time to Interactive (TTI) metrics via Lighthouse in offline mode. |

### 4.2 Space Usability, Accessibility, and Human Factors (Astronaut-Grade UX & Ergonomics)

Interaction design must accommodate crew members experiencing extreme fatigue, microgravity, acute stress, and flight gear constraints:

| ID | Usability & Ergonomics Requirement | Measurable Technical Specification | Verification Method |
| --- | --- | --- | --- |
| **RNF-USA-01** | **Touch operability with flight gloves** | All primary interactive elements (buttons, checkboxes, symptom selectors) must have a minimum hit area of **$48 \times 48\text{ px}$** with a minimum spacing of **$12\text{ px}$**, preventing mis-taps from muscle tremor or pressurized IVA/EVA gloves. | CSS layout inspection and touch testing wearing a thermal glove. |
| **RNF-USA-02** | **Three-tap golden rule** | Any critical emergency action (reporting an incapacitating symptom, consulting a countermeasure procedure, or activating the solar shelter protocol) must be reachable in a maximum of **3 screen taps** from any view. | Navigation tree audit and interaction count per use case. |
| **RNF-USA-03** | **Visual ergonomics and circadian preservation** | Compliance with **WCAG 2.1 AAA** contrast ratios ($\ge 7:1$). Must implement two color modes: (1) Dark Tactical Mode (for daytime cabin operations), and (2) Red Spectral Mode ($\approx 630\text{ nm}$ monochrome) for night watches, preventing melatonin suppression and preserving crew night vision. | Contrast validation via accessibility analyzer and night mode selector test. |
| **RNF-USA-04** | **Alarm fatigue mitigation** | Alert states must be differentiated across redundant sensory channels: (1) Caution Level (Yellow): static visual indicator with no intrusive sound; (2) Critical Level (Red): high-priority flashing visual indicator with an acoustic tone in the $800 - 1200\text{ Hz}$ band per **ISO 9703-2** (Aerospace medical alarms). | Audio spectrum inspection and CSS rendering pattern check. |
| **RNF-USA-05** | **Design tailored for non-physicians** | Every countermeasure screen must be strictly structured into: (1) What is happening anatomically, (2) Severity and estimated time to impact, and (3) Sequential task checklist with executable checkboxes, with a maximum of **7 steps per procedure**. | Readability audit against the Flesch-Kincaid scale in Spanish/English. |

### 4.3 Biomedical Security, Cryptographic Integrity, and Radiation Resilience (Space-Grade Security & Integrity)

| ID | Security & Resilience Requirement | Measurable Technical Specification | Verification Method |
| --- | --- | --- | --- |
| **RNF-SEC-01** | **Local encryption at rest (Zero-Knowledge)** | All medical records, logs, and biomedical entries persisted locally on the device must be encrypted using **256-bit AES-GCM** via the native `window.crypto.subtle` API, ensuring compliance with HIPAA and the NASA Privacy Act. | Attempted raw read of the IndexedDB/localStorage database without the derived cryptographic key. |
| **RNF-SEC-02** | **Local role-based access control (Local RBAC)** | The system must enforce strict local privilege segregation: (1) *Astronaut* role: access to personal telemetry and execution of personal countermeasures; (2) *Crew Medical Officer (CMO)* role: crew-wide aggregated view, false-positive override, and unlocking of medical kit pharmacological protocols. | Authorization and privilege escalation testing per user role. |
| **RNF-SEC-03** | **Radiation bit-flip resilience (SEU / Bit-Flip Protection)** | Because galactic cosmic rays (GCR) induce *Single Event Upsets* (SEUs) that flip bits in memory and storage in deep space, every telemetry record must be stored with a cryptographic checksum (**SHA-256**). If an invalid hash is detected when reading a record, the system isolates it and restores the last consistent state without crashing the application. | Fault injection via byte corruption in local storage and verification of self-recovery. |
| **RNF-SEC-04** | **Clinical log immutability (Append-Only Audit Trail)** | The log of medical events, triggered alarms, and administered medications must operate under an insert-only cryptographically chained scheme (*Append-Only Ledger*). No operation to delete or edit past events shall exist. | Mutation attempt tests on historical log records. |

### 4.4 Interoperability and Local Mesh Synchronization (Offline LAN & Peer-to-Peer Mesh Sync)

Inside a spacecraft or space habitat, multiple devices coexist (individual astronaut tablets, the CMO medical console in the core module, and cabin telemetry displays):

| ID | Multi-Device Network & Communication Requirement | Measurable Technical Specification | Verification Method |
| --- | --- | --- | --- |
| **RNF-NET-01** | **Multi-device synchronization without Internet** | Spacecraft nodes must be able to communicate and synchronize state across the closed onboard local area network (onboard Wi-Fi or isolated local Ethernet) using local WebSockets or P2P data channels, with **zero packets routed to external Internet gateways**. | Packet capture analysis (Wireshark) on the local network interface verifying absence of WAN traffic. |
| **RNF-NET-02** | **Partition tolerance and convergence (CRDTs)** | If a crew member logs data or completes countermeasures in an isolated module or airlock without local Wi-Fi coverage (*temporary disconnected mode*), upon re-establishing local connectivity with other nodes, the system must automatically merge records using Conflict-Free Replicated Data Types (**CRDTs / Last-Write-Wins with vector timestamps**), guaranteeing **zero data loss and zero destructive overwrites**. | Intentional node disconnection, concurrent data logging, and automatic merge test upon reconnection. |
| **RNF-NET-03** | **Autonomous node discovery (Zero-Configuration)** | Client devices must automatically discover the spacecraft sync node on the LAN using local discovery protocols (mDNS / Bonjour or local beacon broadcast on a configured port), without requiring astronauts to enter IP addresses manually. | Connecting a new device to the local network and verifying automatic pairing in $< 3\text{ seconds}$. |
| **RNF-NET-04** | **Interoperable medical export format** | The system must support consolidated export of the log and trends into a standardized, cryptographically signed JSON file ready for transmission over the *Deep Space Network (DSN)* radio link to the Flight Surgeon on Earth during available communication windows. | Validation of the exported JSON schema against the formal data model specification in Section 5.1. |

## 5. Data and Interface Requirements

### 5.1 Data Model

| Entity | Main Fields | Notes |
| --- | --- | --- |
| Crew Member | id, name, role, level, XP, streak | 4 synthetic crew members |
| Daily Measurement | mission day, HR, HRV, SBP, DBP, SpO2, glucose, temperature, sleep hours, mood | 1 record per day, 180 days |
| Habitat Telemetry | day, ppCO2, pressure, % O2, radiation µSv/h | Shared across the crew |
| Symptom | crew member, day, type | Closed catalog of 6 symptoms |
| Alert | rule, organ system, status, urgency, values, timestamp, acknowledged | Generated by the engine |
| Log | timestamp, event type, detail | Append-only, never edited |
| Countermeasure | alert, steps, completed steps | Catalog defined as data |

### 5.2 Interfaces

| Interface | Description |
| --- | --- |
| User | High-contrast dark touch interface with dashboard, body map, guide, habitat, habits, and simulator |
| Storage | Browser localStorage / IndexedDB; serverless |
| Sensors (future) | JSON contract for a measurement with the same model fields; replaceable adapter |
| Export | JSON history and summary file for the Flight Surgeon |

## 6. Business Rules

The two source input documents differ slightly in some ranges (for example, nominal heart rate 55-85 versus 55-95). The **domain document** (NASA-STD-3001) is adopted as the authority. Thresholds marked with \* do not appear in it and are reasonable assumptions, editable as data (RNF-09).

### 6.1 Thresholds by Indicator

| Indicator | Nominal | Caution | Critical |
| --- | --- | --- | --- |
| Resting heart rate (bpm) | 55 to 85 | 86 to 105, or 45 to 54\* | less than 45 or greater than 110 |
| HRV rMSSD (ms) | 35 to 70 | 20 to 34 | less than 20, sustained 2 days or more |
| Systolic blood pressure (mmHg) | 105 to 125 | 126 to 139 | 140 or higher |
| Diastolic blood pressure (mmHg)\* | 65 to 84 | 85 to 89 | 90 or higher |
| SpO2 (%) | 96 to 100 | 93 to 95 | less than 93 |
| Cabin ppCO2 (mmHg) | less than 2.0 | 2.0 to 3.0 | greater than 3.0 |
| Radiation (µSv/h) | 15 to 35 | 36 to 80 | greater than 100 |
| Daily sleep (h) | 7.0 to 8.5 | 5.5 to 6.9 | less than 5.5 for 2 days or more |
| Fasting blood glucose (mg/dL) | 75 to 105 | 106 to 125, or 65 to 74\* | less than 65 or greater than 140 |
| Temperature (°C)\* | 36.2 to 37.3 | 37.4 to 37.9 | 38.0 or higher |
| Mood (1-10)\* | 7 to 10 | 4 to 6 | 1 to 3 |
| Urinary calcium (mg/day)\* | less than 250 | 250 to 300 | greater than 300 |

A value falling between two bands is classified into the more severe band. For example, radiation from 81 to 100 µSv/h, which the domain document does not assign, is treated as caution.

### 6.2 Correlation Rules

| ID | Condition | System | Outcome |
| --- | --- | --- | --- |
| R-ENV-01 | ppCO2 greater than 3.0 and SpO2 less than 94 | Respiratory/environmental | Critical: leak or inadequate ventilation |
| R-ENV-02 | ppCO2 greater than 3.0 and headache reported | Neuro-ocular | Critical: CO2-induced intracranial hypertension |
| R-SANS-01 | Systolic greater than 135 and blurred vision | Neuro-ocular | Critical: early SANS alert |
| R-SANS-02 | Systolic greater than 135 and sleep less than 6 | Neuro-ocular | High caution: cephalic hypertensive drift |
| R-RAD-01 | Radiation greater than 100 | Radiation | Critical: suspected SPE, proceed to shelter |
| R-RAD-02 | Radiation greater than 100 and nausea | Radiation | Critical with emergency urgency: solar storm shelter protocol |
| R-COG-01 | Sleep less than 5.5 and HRV less than 25 | Cognitive | Caution: fatigue and circadian desynchronization |
| R-REN-01 | Urinary calcium greater than 300 and lower back pain | Renal | Critical: suspected kidney stone |
| R-REN-02 | Urinary calcium between 250 and 300 | Renal | Caution: bone-loss hypercalciuria |
| R-CARD-01 | Dizziness upon standing and heart rate greater than 100 | Cardiovascular | High caution: orthostatic intolerance |

### 6.3 Drift Rules

- **D-01:** 7-day window slope projected 7 days forward crosses the caution threshold while the current value is nominal.
- **D-02:** value with z of 2.5 or greater relative to the personal baseline of the first 14 days.
- **D-03:** sleep with a negative slope and diastolic pressure with a positive slope within the same window.

## 7. Scenarios and Use Cases

| ID | Use Case | Actor | Main Flow | Expected Result |
| --- | --- | --- | --- | --- |
| CU-01 | Morning check-in | Astronaut | Opens dashboard, enters vitals, sleep, and mood, confirms | Status indicator updated and XP awarded |
| CU-02 | Review anatomical status | Astronaut | Taps a body region | Views indicators, trend, and actions for that region |
| CU-03 | Handle red alert | CMO | Opens alert, reads what is happening, checks off each step | Protocol completed and recorded in log |
| CU-04 | Early drift alert | Astronaut | Receives yellow warning due to trend | Corrects habits before an incapacitating symptom |
| CU-05 | Solar storm (SPE) | Crew | Radiation exceeds 100 µSv/h | Guidance to storm shelter and symptom tracking |
| CU-06 | Acute SANS | CMO | Reports blurred vision with elevated pressure | Guided vision test and LBNP session |
| CU-07 | CO2 micro-leak | Crew | ppCO2 rises and SpO2 drops | LiOH/CDRA scrubber and ventilation inspection |
| CU-08 | Report to Earth | CMO | Exports asynchronous summary | File with trends and events for the Flight Surgeon |
| CU-09 | Jury demonstration | Judge | Activates a simulator scenario | Interface changes state and guides the response |

## 8. Traceability and Verification

| Acceptance Criterion | Covered Requirements | Verification |
| --- | --- | --- |
| AC-01 Local diagnostic autonomy | RF-ING-01, RF-EVA-01, RF-EVA-02, RF-EVA-05, RF-EVA-07, RF-DSH-01, RNF-POW-01, RNF-POW-04, RNF-PER-01, RNF-SEC-01 | With no external network, each crew member receives Nominal, Caution, or Critical status in under 50 ms; boundary tests at every threshold; locally encrypted data. |
| AC-02 Early drift detection | RF-ING-03, RF-DER-01 to RF-DER-04, RF-DSH-02, RNF-PER-01 | Across the 180-day dataset, the early warning via modified Z-score or regression is issued before the indicator crosses the critical threshold. |
| AC-03 Anatomical traceability & usability | RF-EVA-03, RF-EVA-06, RF-ANA-01 to RF-ANA-04, RF-ING-04, RF-REG-01, RNF-USA-01 to RNF-USA-05 | Each alert maps to its organ system and touch target ($\ge 48\text{ px}$); night spectral mode validated; immutable log with SHA-256. |
| AC-04 Countermeasure guidance | RF-GUI-01 to RF-GUI-04, RF-GAM-01, RF-GAM-02, RNF-USA-02, RNF-USA-05 | Every deviation provides countermeasures in 3 taps or fewer using onboard resources; maximum 7 sequential verifiable steps. |
| AC-05 Extreme-event resilience & sync | RF-ING-02, RF-EVA-04, RF-DSH-04, RF-SIM-01 to RF-SIM-05, RNF-SEC-03, RNF-NET-01 to RNF-NET-03 | Scenarios A through D trigger the protocol in $< 50\text{ ms}$; self-recovery from bit-flips; multi-device P2P sync without Internet on the spacecraft LAN. |

**Test Plan.** (1) Unit tests for each threshold at the exact value, one below, and one above. (2) Tests for rules R-ENV, R-SANS, R-RAD, R-COG, R-REN, and R-CARD. (3) Replay of the 180-day dataset verifying D-01 through D-03. (4) Execution of all four simulator scenarios. (5) Offline test and reload with persistence.
