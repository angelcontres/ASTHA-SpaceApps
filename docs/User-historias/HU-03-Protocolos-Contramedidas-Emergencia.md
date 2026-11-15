# 🚨 EPIC 3: Countermeasure Protocols and Space Crisis Management
**Module:** Decision Support and Medical Procedures | **Standard:** NASA Flight Procedures / NASA-STD-3001

---

## 📌 HU-09: Assisted Step-by-Step Medical Protocol Execution (Non-Physician Checklists)

* **ID:** `HU-09`
* **Epic:** Epic 3 - Countermeasure Protocols and Crisis Management
* **MoSCoW Priority:** **Must Have** (Crew Survival)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RF-GUI-01..04`, `RNF-USA-01`, `RNF-USA-04`
* **Official Sources:** NASA Flight Procedures Handbook / Astronaut Cognitive Safety

### 📖 User Story:
> **As an** Astronaut without medical training,  
> **I want** the system to guide me through a sequential, interactive checklist with confirmation boxes (aviation-style checklist) whenever a clinical alert occurs,  
> **So that** I can administer the correct treatment without hesitation, dosing errors, or panic in microgravity.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Clear 3-block countermeasure structure
* **Given** any Medium- or High-priority medical alert is triggered,
* **When** the astronaut views the countermeasure protocol card,
* **Then** they must see three mandatory sections:
  1. **What is happening:** Direct physiological explanation in plain language without cryptic medical jargon.
  2. **Severity and Urgency:** Priority level and estimated time-to-action.
  3. **Actions:** Sequential numbered steps with interactive confirmation checkboxes (`checkbox`).

#### Scenario 2: Strict restriction to onboard resources
* **Given** the spacecraft is en route to Mars with a strictly bounded medical inventory (no operating room or CT scanner),
* **When** the countermeasure engine generates the action list,
* **Then** it must recommend only verified onboard devices and pharmaceuticals (LBNP Trousers, ARED Machine, Emergency Medical Kit, Amsler Grid, LiOH Canisters).

---

## 📌 HU-10: Automated Solar Particle Event (SPE) Evacuation Protocol

* **ID:** `HU-10`
* **Epic:** Epic 3 - Countermeasure Protocols and Crisis Management
* **MoSCoW Priority:** **Must Have** (Immediate Life Safety Risk)
* **Story Points:** 8 SP
* **Traced SRS Requirements:** `RF-EVA-04`, `RF-GUI-03`, `RNF-USA-04`
* **Official Sources:** NASA Space Permissible Exposure Limits (SPELs) / CSA CANS Project

### 📖 User Story:
> **As a** Deep-Space Flight Crew,  
> **I want** the system to immediately activate the maximum-priority emergency protocol whenever the CANS dosimeter detects a Solar Particle Event (SPE) with radiation exceeding $100\ \mu\text{Sv/h}$,  
> **So that** we can take shelter inside the shielded central module before absorbing a lethal dose or developing Acute Radiation Syndrome (ARS).

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Code Red SPE activation
* **Given** the CANS neutron and particle dosimeter detects a dose rate of $\text{Radiation} = 184.2\ \mu\text{Sv/h}$,
* **When** the algorithm evaluates the environmental telemetry,
* **Then** the interface must sound the tactical audio alarm and switch the header to **"CODE RED - SPE EMERGENCY"**,
* **And** replace the active task list with the critical 3-step checklist:
  * Step 1: Evacuate immediately to the shielded central module (*Storm Shelter*).
  * Step 2: Administer oral antioxidant radioprotectant cocktail from Medical Kit Bravo.
  * Step 3: Mount passive personal dosimeters on the shielded interior bulkhead.

#### Scenario 2: Stand-down and post-storm verification
* **Given** the solar storm has subsided and the dose rate returns to nominal background levels ($< 35\ \mu\text{Sv/h}$),
* **When** the Flight Officer confirms environmental stability for more than 60 minutes,
* **Then** the system must compute the total cumulative dose absorbed by each crewmember during the event and record it in the immutable medical log.

---

## 📌 HU-11: Management of Cephalad Hypertension and Ocular Edema with LBNP Trousers

* **ID:** `HU-11`
* **Epic:** Epic 3 - Countermeasure Protocols and Crisis Management
* **MoSCoW Priority:** **Must Have** (SANS Countermeasure)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RF-GUI-01`, `RF-GUI-02`, `RF-ANA-02`
* **Official Sources:** NASA Lower Body Negative Pressure (LBNP) Operational Protocol

### 📖 User Story:
> **As a** Crew Medical Officer (CMO),  
> **I want** the system to guide the donning, pressurization, and duration of the Lower Body Negative Pressure (LBNP) device during episodes of SANS or intracranial overpressure,  
> **So that** bodily fluids are redistributed toward the lower extremities, decompressing the cerebral veins and the optic disc.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Guided standard LBNP protocol
* **Given** a crewmember presents $\text{SBP} \ge 140\text{ mmHg}$ and reports blurred vision,
* **When** the SANS checklist activates on screen,
* **Then** the system must specify precisely:
  * "Don and pressurize LBNP device to $-35\text{ mmHg}$ for $60\text{ minutes}$",
  * "Perform touchscreen visual test with Amsler Grid at minute 0 and minute 60",
  * "Restrict dietary sodium intake to $< 2.0\text{ g/day}$ to reduce cephalad fluid retention".

#### Scenario 2: Hemodynamic safety monitoring during LBNP
* **Given** lower-body negative pressure can induce hypotension or syncope if arterial blood pressure drops too rapidly,
* **When** the continuous blood pressure sensor records a drop in systolic pressure below $90\text{ mmHg}$ during the LBNP session,
* **Then** the system must trigger an immediate abort alarm: "Depressurize LBNP slowly and place astronaut in a neutral horizontal position".

---

## 📌 HU-12: ARED Exercise Adherence and Renal Stone (Lithiasis) Prevention

* **ID:** `HU-12`
* **Epic:** Epic 3 - Countermeasure Protocols and Crisis Management
* **MoSCoW Priority:** **Should Have** (Chronic Health Maintenance)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RF-EVA-03`, `RF-GUI-03`, `RF-GAM-01`
* **Official Sources:** NASA HRP Bone Loss Risk / Renal Stone Prevention Guidelines

### 📖 User Story:
> **As an** Astronaut on a long-duration mission,  
> **I want** to log and track my daily resistive exercise compliance (ARED) and fluid balance,  
> **So that** I can prevent accelerated bone mineral loss ($1.0\% - 1.5\%$ per month) and prevent calcium oxalate kidney stone formation in space.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Daily ARED session tracking
* **Given** NASA medical standards require a minimum of 150 minutes per day of physical and axial-loading exercise,
* **When** the crewmember completes their routine on the ARED machine and confirms the log entry,
* **Then** the musculoskeletal card on the anatomical map must update to **Nominal (Green)** status,
* **And** add points to their flight adherence bar to encourage routine compliance.

#### Scenario 2: Preventive renal lithiasis alert for low hydration
* **Given** microgravity increases urinary calcium excretion due to bone resorption,
* **When** the astronaut's logged fluid intake is less than $2.5\text{ L/day}$ for more than 36 hours,
* **Then** the lumbar region on the anatomical map must turn **Yellow (Caution)**,
* **And** the system must recommend: "Ingest 500 mL of water with potassium citrate salts to alkalinize urine and prevent calcium crystal precipitation".
