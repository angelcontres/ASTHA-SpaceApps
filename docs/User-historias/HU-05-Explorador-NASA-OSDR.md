# 🔬 EPIC 5: Scientific Evidence and Real NASA OSDR Flight Data Explorer
**Module:** Open Science Integration and Flight Simulation | **Standard:** NASA OSDR / GeneLab / NASA Open Data

---

## 📌 HU-17: Query and Validation of Human Spaceflight Studies via the NASA OSDR API

* **ID:** `HU-17`
* **Epic:** Epic 5 - Scientific Evidence and NASA OSDR Explorer
* **MoSCoW Priority:** **Could Have / Should Have** (Open Science Validation)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RF-OFF-03`, `RNF-NET-01`
* **Official Sources:** NASA Open Science Data Repository (OSDR) API v2 (`visualization.osdr.nasa.gov`)

### 📖 User Story:
> **As a** Science Officer or NASA Space Apps Judge,  
> **I want** to access an embedded interactive explorer displaying the 116 official human (*Homo sapiens*) spaceflight studies indexed from the NASA OSDR API,  
> **So that** I can verify that ASTHA's clinical algorithms are grounded in real spaceflight biological evidence rather than theoretical assumptions.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Opening the explorer modal and browsing studies
* **Given** the user presses the "NASA OSDR API (116 Studies)" button in the application top bar,
* **When** the tactical modal opens,
* **Then** it must list key studies with their official identifier (`OSD-574`, `OSD-715`, `OSD-53`, `OSD-2`, `OSD-51`), title, mission of origin, and pathological correlation with ASTHA.

#### Scenario 2: Connectivity test against the official NASA endpoint
* **Given** the evaluator presses the "Check NASA API" button,
* **When** the system queries the endpoint `https://visualization.osdr.nasa.gov/biodata/api/v2/query/datasets/?study.characteristics.organism=Homo%20sapiens&format=json.records`,
* **Then** if Internet connectivity is available, it must display the successful response (200 OK with latency in ms),
* **And** if operating in isolated Edge mode (offline), it must automatically fail over to the locally indexed repository (`data/nasa_osdr_api_human_studies.json`), demonstrating total fault tolerance.

---

## 📌 HU-18: Calibration with the SpaceX Inspiration4 Mission Dataset (`OSD-574`)

* **ID:** `HU-18`
* **Epic:** Epic 5 - Scientific Evidence and NASA OSDR Explorer
* **MoSCoW Priority:** **Must Have** (100% Real Human Data)
* **Story Points:** 8 SP
* **Traced SRS Requirements:** `RF-ING-04`, `RF-DSH-01`, `RF-EVA-01`
* **Official Sources:** NASA GeneLab / OSDR OSD-574 ISA-Tab Metadata / Inspiration4 Crew Data

### 📖 User Story:
> **As a** Crew Medical Officer (CMO),  
> **I want** the software to load biomedical data from the 4 real civilian crewmembers of the SpaceX Inspiration4 mission (C001, C002, C003, C004) across their flight phases (L-44, FD-01, FD-02, FD-03, R+1),  
> **So that** I have a reliable empirical reference for how the civilian human body responds before, during, and after orbital flight.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Navigating flight phases per astronaut
* **Given** the user has selected Dr. Sian Proctor (C003),
* **When** they click the flight-phase buttons (`L-44`, `FD-01`, `FD-02`, `FD-03`, `R+1`),
* **Then** the vital sign cards and chart must update with the exact dataset values:
  * `L-44` (Ground): $\text{HR} = 68\text{ bpm}$, $\text{BP} = 122/78\text{ mmHg}$, $\text{HRV} = 46.0\text{ ms}$ (Nominal).
  * `FD-02` (Orbit): $\text{HR} = 98\text{ bpm}$, $\text{BP} = 144/92\text{ mmHg}$, $\text{HRV} = 19.5\text{ ms}$ (SANS Critical).
  * `R+1` (Return): $\text{HR} = 80\text{ bpm}$, $\text{BP} = 128/82\text{ mmHg}$, $\text{HRV} = 35.8\text{ ms}$ (Recovery).

#### Scenario 2: Traceability against the official ISA-Tab table
* **Given** a clinical auditor inspects the provenance of data for C001–C004,
* **When** they examine the system files,
* **Then** there must be verifiable correspondence with the official file `OSD-574_ISA/s_OSD-574.txt` stored in the NASA telemetry directory.

---

## 📌 HU-19: Crisis Scenario Injection for Training (Judge Simulator)

* **ID:** `HU-19`
* **Epic:** Epic 5 - Scientific Evidence and NASA OSDR Explorer
* **MoSCoW Priority:** **Should Have** (Impact Demonstration and Training)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RF-DSH-02`, `RF-GUI-01`
* **Official Sources:** NASA Simulation Training / Spaceflight Crisis Protocols

### 📖 User Story:
> **As a** Flight Instructor, Judge, or Crewmember in training,  
> **I want** to instantaneously inject simulated emergency scenarios (Solar Particle Event [SPE], $CO_2$ Leak, SANS Cephalad Hypertension Crisis),  
> **So that** I can verify live how the interface responds, how risk indicators transition, and how checklists are generated in real time.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Injection of Cabin $CO_2$ Leak
* **Given** the simulator is in nominal state,
* **When** the user presses the "2. Cabin CO₂ Leak" button,
* **Then** within $100\text{ ms}$:
  * The $ppCO_2$ indicator rises to $3.85\text{ mmHg}$ with a pulsing yellow animation,
  * The protocol title changes to "ECLSS ALERT: Carbon Dioxide Buildup",
  * The 3-step checklist is generated to switch the CDRA bed and replace LiOH cartridges.

#### Scenario 2: Reset to optimal baseline state
* **Given** the system is in a simulated emergency state,
* **When** the user presses the "Reset to Nominal" button,
* **Then** all indicators return to phase L-44 (100% Nominal Green),
* **And** the protocol updates to daily preventive routines (150 min ARED and hydration).

---

## 📌 HU-20: Ultra-Low Power Profile in Emergency Battery Mode

* **ID:** `HU-20`
* **Epic:** Epic 5 - Scientific Evidence and NASA OSDR Explorer
* **MoSCoW Priority:** **Must Have** (Flight Systems Survival)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RNF-POW-01..04`, `RNF-POW-03`
* **Official Sources:** Spacecraft Electrical Power Distribution Rules (EPS)

### 📖 User Story:
> **As a** Mission Commander and Spacecraft Power Engineer,  
> **I want** the software to reduce its power consumption to under 5 Watts whenever the spacecraft enters electrical contingency mode (backup batteries following solar array failure),  
> **So that** vital astronaut health monitoring remains operational for days without depleting critical life-support power reserves.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Switching to ultra-low power profile
* **Given** the main power bus signals a drop to backup battery reserves,
* **When** ASTHA receives the power-saving signal,
* **Then** it must automatically disable heavy CSS animations, throttle chart rendering to 1 frame every 5 seconds, and dim display brightness,
* **And** keep the rule engine for cardiac arrest and anoxia detection 100% active.

#### Scenario 2: Thermal limit and passive dissipation verification
* **Given** there is no forced air convection during depressurization or power contingency,
* **When** the processor executes the detection algorithms,
* **Then** sustained CPU utilization must not exceed $15\%$ of a single core, preventing localized heat buildup in medical avionics hardware.
