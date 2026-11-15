# 📡 EPIC 1: Continuous Monitoring and Biomedical & Environmental Telemetry Ingestion
**Module:** Data Ingestion and Flight Sensors | **Standard:** NASA-STD-3001 Vol 1 & 2 / CSA Bio-Monitor

---

## 📌 HU-01: Live Vital Signs Visualization from Wearable Sensors (SmartShirt)

* **ID:** `HU-01`
* **Epic:** Epic 1 - Continuous Monitoring and Telemetry
* **MoSCoW Priority:** **Must Have** (Mission-Critical)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RF-ING-01`, `RF-DSH-01`, `RNF-USA-02`, `RNF-POW-03`
* **Official Sources:** CSA Bio-Monitor (Astroskin SmartShirt) / NASA-STD-3001 Vol 1 Sec 4.2

### 📖 User Story:
> **As a** Mission Astronaut (without specialized medical training),  
> **I want** to view my real-time vital signs (Heart Rate, Blood Pressure, SpO₂, and HRV rMSSD) on a tactical interface with standardized color coding,  
> **So that** I can assess my cardiovascular and physiological status at a glance without having to interpret complex medical waveforms during my workday in microgravity.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Biomedical data ingestion with values within nominal range
* **Given** my Astroskin SmartShirt is paired via Bluetooth Low Energy (BLE) with my local ASTHA node,
* **When** the sensor transmits a reading of $\text{HR} = 68\text{ bpm}$, $\text{BP} = 118/76\text{ mmHg}$, $\text{SpO}_2 = 98.5\%$, and $\text{HRV} = 48\text{ ms}$,
* **Then** the vital sign cards must display in Green (#10b981) with the text label "Nominal",
* **And** the screen refresh rate must not exceed 1 Hz to avoid consuming unnecessary CPU cycles.

#### Scenario 2: Sensor disconnection or signal loss
* **Given** the astronaut temporarily removes the biometric garment for personal hygiene or module transfer,
* **When** no telemetry packets are received for more than 60 seconds,
* **Then** the corresponding card must dim to neutral gray (#64748b) with the label "Sensor Disconnected",
* **And** it must not trigger false audible or visual alarms for cardiac arrest or desaturation.

---

## 📌 HU-02: Automated Detection of Circadian Disruption and Critical Sleep Debt

* **ID:** `HU-02`
* **Epic:** Epic 1 - Continuous Monitoring and Telemetry
* **MoSCoW Priority:** **Must Have** (NASA HRP Human Risk)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RF-EVA-05`, `RF-DER-04`, `RNF-USA-04`
* **Official Sources:** NASA Human Research Program (HRP) Risk of Fatigue-Induced Performance Decrement

### 📖 User Story:
> **As a** Crew Medical Officer (CMO),  
> **I want** the system to autonomously monitor each astronaut's sleep duration and nocturnal heart rate variability,  
> **So that** I can detect cumulative fatigue and cognitive lapse risk before a crewmember operates critical machinery or performs an extravehicular activity (EVA).

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Alert activation for sustained sleep deprivation
* **Given** an astronaut's rest log records fewer than 5.5 hours of sleep per night,
* **When** this condition repeats for 2 or more consecutive days ($\text{Days} \ge 2$),
* **Then** ASTHA must automatically elevate the crewmember's status to **Caution (Yellow)**,
* **And** display a notification to the CMO recommending: "Suspend high-precision motor tasks and administer Psychomotor Vigilance Task (PVT)".

#### Scenario 2: Correlation with HRV rMSSD drop
* **Given** a crewmember exhibits sustained short sleep duration,
* **When** their mean nocturnal $\text{HRV rMSSD}$ additionally drops below $20\text{ ms}$ (an indicator of severe autonomic stress),
* **Then** the system must issue a combined alert for "Stress Overload and Circadian Desynchronization",
* **And** suggest immediate adjustment of their crew quarters lighting spectrum (switching to blue-enriched light in the morning or red-shifted light at night).

---

## 📌 HU-03: Physiological Correlation with Cabin Environmental Factors ($ppCO_2$ and Radiation)

* **ID:** `HU-03`
* **Epic:** Epic 1 - Continuous Monitoring and Telemetry
* **MoSCoW Priority:** **Must Have** (Flight Safety)
* **Story Points:** 8 SP
* **Traced SRS Requirements:** `RF-ING-02`, `RF-EVA-04`, `RF-DSH-04`, `RNF-SEC-01`
* **Official Sources:** NASA-STD-3001 Vol 2 Sec 6 (Atmospheric Quality) / CSA CANS Dosimeter

### 📖 User Story:
> **As a** Habitat Systems Engineer (ECLSS) and Flight Officer,  
> **I want** the software to automatically cross-reference carbon dioxide ($ppCO_2$) spikes and real-time radiation dose rates with the astronaut's vital signs,  
> **So that** we can immediately distinguish between an intrinsic medical pathology and a degradation of the spacecraft's atmospheric environment.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Cross-correlation of headache and $CO_2$ overpressure
* **Given** the cabin atmospheric sensor records $ppCO_2 > 3.0\text{ mmHg}$ (Critical, SRS §6.1),
* **When** an astronaut reports a headache (R-ENV-02) or exhibits $\text{SpO}_2 < 94\%$ (R-ENV-01),
* **Then** the system must classify the event per SRS §6.2 and attribute the root cause to a cabin $CO_2$ pocket,
* **And** the top-priority recommendation must be environmental ("Verify forced-circulation fans and switch CDRA scrubber bed") before prescribing analgesics.

#### Scenario 2: CANS radiation spike from solar particles
* **Given** the CSA CANS neutron dosimeter reports a radiation dose rate exceeding $100\ \mu\text{Sv/h}$,
* **When** the algorithm processes the environmental telemetry,
* **Then** the top habitat status bar must enter **Pulsing Red Alert** state,
* **And** immediately display the directive: "Evacuate to Shielded Central Zone (Storm Shelter)".

---

## 📌 HU-04: Rapid, Zero-Friction Logging of Subjective Clinical Symptoms

* **ID:** `HU-04`
* **Epic:** Epic 1 - Continuous Monitoring and Telemetry
* **MoSCoW Priority:** **Should Have** (High Usability)
* **Story Points:** 3 SP
* **Traced SRS Requirements:** `RF-ING-03`, `RNF-USA-01`, `RNF-USA-02`
* **Official Sources:** Human-Centered Design for Spaceflight UIs / ISO 9241-11

### 📖 User Story:
> **As an** Astronaut in orbit,  
> **I want** to report subjective symptoms (Space Adaptation Syndrome [SAS] motion sickness, blurred vision, lower back pain, or nausea) in under 10 seconds using large touch selectors,  
> **So that** I do not disrupt my operational timeline while continuously feeding the system's early diagnostic algorithms.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Rapid symptom entry in 3 taps
* **Given** the astronaut experiences Space Adaptation Syndrome (SAS) motion sickness at the start of Flight Day 2 (FD-02),
* **When** they open the rapid-reporting module,
* **Then** they must be able to select the symptom "Dizziness / SAS", grade its severity (Mild, Moderate, Severe), and press "Save" in a maximum of 3 touch taps,
* **And** the system must confirm the entry with clear visual feedback without requiring keyboard text input.

#### Scenario 2: Fusion of subjective symptom with objective telemetry
* **Given** the crewmember has just logged the symptom "Blurred Vision / Blind Spots",
* **When** the system evaluates current telemetry and finds a Systolic Blood Pressure of $144\text{ mmHg}$,
* **Then** the rule engine must associate both events and immediately trigger clinical suspicion of **Spaceflight Associated Neuro-ocular Syndrome (SANS)**.
