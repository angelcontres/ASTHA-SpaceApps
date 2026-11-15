# 🧠 EPIC 2: Clinical Triage and Interactive Anatomical Visualization
**Module:** CDSS Rule Engine and Human Body Model | **Standard:** NASA-STD-3001 Vol 1 / NASA HRP Risks

---

## 📌 HU-05: Rapid Triage via Interactive Anatomical Map (Body Hotspots)

* **ID:** `HU-05`
* **Epic:** Epic 2 - Clinical Triage and Anatomical Visualization
* **MoSCoW Priority:** **Must Have** (Crisis Ergonomics)
* **Story Points:** 8 SP
* **Traced SRS Requirements:** `RF-ANA-01..04`, `RNF-USA-02`, `RNF-USA-03`
* **Official Sources:** ISO 9241-11 / NASA CDSS Ergonomics Guide

### 📖 User Story:
> **As a** Non-physician Astronaut under stress or fatigue,  
> **I want** to view an interactive anatomical map of the human body with organs color-coded by health status (Green, Yellow, or Red with distinctive symbols),  
> **So that** I can identify in under 3 seconds which physiological system is compromised simply by tapping the affected region.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Triage of affected organ upon click/tap
* **Given** the crewmember or Medical Officer is viewing the tactical anatomical map on the main screen,
* **When** they click or tap on the **Eyes and Head** region (Neuro-Ocular System),
* **Then** the system must display a contextual floating card detailing:
  * System name ("Neuro-Ocular System"),
  * Current clinical status ("SANS ALERT - Cephalad Hypertension"),
  * Pathophysiology explained in plain language ("Cephalad fluid shift in microgravity causing optic disc overpressure").

#### Scenario 2: Color-vision deficiency and flight-glove accessibility
* **Given** astronauts may experience temporary visual disturbances or wear intravehicular activity (IVA) gloves,
* **When** an organ transitions to Critical (Red) status,
* **Then** the anatomical region must not only change color (#ef4444), but also display a slow pulsing animation (1.5s) and a high-contrast white icon or border,
* **And** the hotspot touch target area must be at least $48 \times 48\text{ px}$.

---

## 📌 HU-06: Early Detection and Stratification of Neuro-Ocular Syndrome (SANS)

* **ID:** `HU-06`
* **Epic:** Epic 2 - Clinical Triage and Anatomical Visualization
* **MoSCoW Priority:** **Must Have** (Critical Human Spaceflight Risk)
* **Story Points:** 8 SP
* **Traced SRS Requirements:** `RF-EVA-01`, `RF-EVA-03`, `RF-GUI-01`
* **Official Sources:** NASA HRP SANS Risk / NASA OSDR OSD-715 (Retina Proteomics)

### 📖 User Story:
> **As a** Crew Medical Officer (CMO),  
> **I want** the system to continuously evaluate each astronaut's systolic blood pressure, visual acuity, and cranial symptoms during the microgravity phase,  
> **So that** I can detect SANS early before irreversible optic disc edema or structural optic nerve damage occurs.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: SANS alert triggered by orbital systolic overpressure
* **Given** the astronaut is in orbital flight or deep-space transit (FD-01 through FD-03),
* **When** their Systolic Blood Pressure reaches or exceeds $140\text{ mmHg}$ ($\text{SBP} \ge 140\text{ mmHg}$),
* **Then** the Blood Pressure card must enter **Pulsing Red Alert** state with the label "SANS CRITICAL",
* **And** the ocular hotspot on the body map must turn red,
* **And** the corresponding countermeasure protocol (LBNP trousers and Amsler Grid) must activate in the action panel.

#### Scenario 2: Normalization and return to nominal status
* **Given** a crewmember experienced a SANS event and received the Lower Body Negative Pressure (LBNP) countermeasure,
* **When** their systolic blood pressure drops below $125\text{ mmHg}$ steadily for 30 minutes,
* **Then** the neuro-ocular system status must return to **Nominal (Green)**,
* **And** the effectiveness of the applied countermeasure must be recorded in the clinical log.

---

## 📌 HU-07: Algorithmic Physiological Drift Detection (Modified Z-Score)

* **ID:** `HU-07`
* **Epic:** Epic 2 - Clinical Triage and Anatomical Visualization
* **MoSCoW Priority:** **Must Have** (Robust Biomedical Mathematics)
* **Story Points:** 8 SP
* **Traced SRS Requirements:** `RF-DER-01..03`, `RNF-USA-05`
* **Official Sources:** Hoaglin & Iglewicz (1993) / NASA Flight Surgeon Guidelines

### 📖 User Story:
> **As a** Crew Medical Officer (CMO) or Flight Surgeon,  
> **I want** the system to compute the Modified Z-Score based on the median and Median Absolute Deviation (MAD) over a 7-day rolling window,  
> **So that** subtle deviations from an astronaut's personal baseline are detected without transient outliers causing false positives in space.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Robust Modified Z-Score calculation
* **Given** the astronaut has a 7-day history of resting heart rate measurements,
* **When** the algorithm evaluates a new measurement $x_i$,
* **Then** it must apply the exact formula:
  $$M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{\text{MAD}}$$
  where $\tilde{x}$ is the median and $\text{MAD} = \text{median}(|x_i - \tilde{x}|)$,
* **And** if $|M_i| \ge 2.5$, it must classify the measurement as **Statistically Significant Drift**.

#### Scenario 2: Predictive alert prior to crossing absolute threshold
* **Given** a crewmember's blood pressure is currently in the nominal range ($122\text{ mmHg}$),
* **When** the 7-day linear regression projection indicates it will exceed $135\text{ mmHg}$ if the observed trend continues,
* **Then** ASTHA must issue an **Early Drift Alert**,
* **And** display the mathematical rationale: "Sustained upward trend (+1.8 mmHg/day) will cross the caution threshold in 4 days".

---

## 📌 HU-08: Crew-Wide Aggregated Dashboard for the Crew Medical Officer (CMO)

* **ID:** `HU-08`
* **Epic:** Epic 2 - Clinical Triage and Anatomical Visualization
* **MoSCoW Priority:** **Should Have** (Mission Situational Awareness)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RF-DSH-03`, `RNF-USA-03`
* **Official Sources:** NASA Medical Operations / Inspiration4 (Crew C001..C004)

### 📖 User Story:
> **As a** Crew Medical Officer (Dra. Lauren Pierce) or Mission Commander,  
> **I want** to rapidly switch between the 4 mission astronauts (C001, C002, C003, C004) or view a consolidated summary of the entire crew,  
> **So that** I can assess the health status of the entire team on a single console and prioritize care for the crewmember at highest clinical risk.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Immediate switching between crewmembers
* **Given** the user is currently viewing Commander Rachel Calloway (C001),
* **When** they press the crewmember button "Dr. Marcus Dalton (C003)",
* **Then** within 200 ms the interface must update the biosignal cards, anatomical map, Chart.js curves, and action plan corresponding to C003,
* **And** visually highlight the active astronaut button with a bright cyan border.

#### Scenario 2: Worst-case global health status rollup rule
* **Given** 3 astronauts are in Nominal (Green) status and 1 astronaut (C003) is in Critical status (Red due to SANS),
* **When** the CMO checks the overall spacecraft health summary,
* **Then** the global mission status indicator must show **Critical (Red)**,
* **And** explicitly flag astronaut C003 as the crewmember triggering the alert to prevent complacency or oversight.
