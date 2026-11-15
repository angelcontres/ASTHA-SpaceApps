# 🚨 Package 3: Countermeasures and In-Flight Emergencies
**Module:** Crisis Management and Procedural Guidance | **Standard:** NASA Flight Procedures / NASA SPELs

---

## 📋 Use Case: CU-07
### Title: Step-by-Step Assisted Execution of Medical Checklists

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-07` |
| **Primary Actor** | Mission Astronaut (Non-Medical) |
| **Secondary Actors** | Crew Medical Officer (CMO) |
| **Level** | User Level / Intervention Task |
| **SRS Requirements** | `RF-GUI-01..04`, `RNF-USA-01`, `RNF-USA-04` |
| **Traced Stories** | `HU-09`, `HU-12` |

### 1. Brief Description:
Whenever any medical or environmental event triggers, ASTHA transforms clinical complexity into an interactive sequential checklist of at most 4 actionable steps. The crew member checks off each item as the task is completed, recording progress in real time in spacecraft memory.

### 2. Preconditions:
1. A clinical decision rule has transitioned to Caution or Critical state, or the user has manually selected a countermeasure protocol.
2. The screen displays the checklist container in the right side panel.

### 3. Trigger:
Appearance of an on-screen medical alert or user selection of a guide.

### 4. Main Flow of Events:
1. The system displays the protocol title with the severity level in a distinct badge (e.g., "SANS ALERT - HIGH PRIORITY").
2. The system displays a 2-line plain-language rationale ("What is happening").
3. The system lists operational steps with unchecked interactive checkboxes:
   * `[ ] Step 1: Don and pressurize LBNP suit to -35 mmHg for 60 min.`
   * `[ ] Step 2: Perform visual acuity exam on touchscreen (Amsler Grid).`
   * `[ ] Step 3: Restrict sodium intake to less than 2.0 g/day in nutritional ration.`
4. The astronaut physically completes the first step in the medical module and taps the Step 1 checkbox.
5. The system formats the step text with a soft strikethrough in green (#10b981) and stores the MET completion timestamp.
6. The astronaut completes and checks off Step 2 and Step 3.
7. Once all checklist steps are checked, the system issues a confirmation: "Protocol Successfully Completed".
8. The system schedules an automatic hemodynamic reassessment after 30 minutes to confirm treatment effectiveness.

### 5. Alternative Flows:
* **FA-01: Inability to complete a step due to missing supplies:**
  1. If a physical resource is non-operational (e.g., LBNP vacuum pump failure), the astronaut long-presses the step and selects "Resource Unavailable".
  2. The CDSS engine immediately recalculates a backup alternative procedure (e.g., "Elevate torso 30° relative to cephalic axis and apply elastic venous compression bands").

### 6. Exception Flows:
* **FE-01: Accidental omission or application closure during checklist:**
  1. If the tablet powers off or the app closes while an active checklist is running, the state of completed checkboxes remains saved in the encrypted IndexedDB store (ADR-006). Upon restart, the app restores the screen directly to the pending step.

### 7. Postconditions:
* **Success:** The medical countermeasure is executed rigorously and verifiably, minimizing errors caused by distraction or stress.

---

## 📋 Use Case: CU-08
### Title: Solar Particle Event (SPE) Emergency Activation and Management

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-08` |
| **Primary Actor** | CSA CANS Dosimeter (Hardware) / Mission Commander |
| **Secondary Actors** | Entire Flight Crew |
| **Level** | Mission Survival Level (Code Red) |
| **SRS Requirements** | `RF-EVA-04`, `RF-GUI-03`, `RNF-USA-04` |
| **Traced Stories** | `HU-10` |

### 1. Brief Description:
Upon detecting a massive flux of protons and secondary neutrons exceeding NASA permissible limits ($> 100\ \mu\text{Sv/h}$), the system activates the highest-priority cabin alarm, coordinates evacuation to the central shielded module (*Storm Shelter*), manages radioprotective drug intake, and computes cumulative biological dose.

### 2. Preconditions:
1. The CANS neutron spectrometer is operating on the exterior and interior of the spacecraft hull.
2. The spacecraft is in interplanetary space outside Earth's magnetosphere.

### 3. Trigger:
The ionizing radiation dose rate detected by CANS exceeds $100\ \mu\text{Sv/h}$ ($\text{Rate} > 100\ \mu\text{Sv/h}$).

### 4. Main Flow of Events:
1. The CANS dosimeter detects a sudden solar particle flux reaching $184.2\ \mu\text{Sv/h}$.
2. The ASTHA system evaluates the rate of increase ($dD/dt$) and classifies the event as **"SPE Emergency: High-Energy Solar Particle Storm"**.
3. The system activates a distinctive intermittent high-tone tactical acoustic alarm.
4. All spacecraft displays switch to high-contrast evacuation mode: dark background with pulsing red borders.
5. The system displays the immediate 3-action priority procedure:
   * **Action 1:** "Evacuate crew to central shielded module (Storm Shelter) in under 5 minutes".
   * **Action 2:** "Administer oral antioxidant radioprotector cocktail (Medical Kit Bravo)".
   * **Action 3:** "Mount personal passive CANS dosimeters on the interior bulkhead".
6. The astronauts enter the shielded shelter and the Commander confirms shelter-in-place on the main display.
7. The system begins real-time temporal integration of absorbed dose ($\int \dot{D} \, dt$) for each crew member.

### 5. Alternative Flows:
* **FA-01: Low-intensity solar storm ($35 - 100\ \mu\text{Sv/h}$):**
  1. If the dose rate rises without crossing $100\ \mu\text{Sv/h}$, the system issues a "Yellow Monitoring Alert", recommending cancellation of activities in exterior modules (e.g., observation cupola) without ordering shelter confinement.

### 6. Exception Flows:
* **FE-01: Astronaut isolated in a module during the storm:**
  1. If a bulkhead sensor indicates a crew member remains outside the shelter 5 minutes after alarm onset, the system emits a localized audio warning in that compartment: "Radiation Alert: Immediate transfer to central bulkhead".

### 7. Postconditions:
* **Success:** The crew takes shelter in the area with the highest shielding mass density (water tanks and rations) and total received biological dose is reduced by more than $70\%$.

---

## 📋 Use Case: CU-09
### Title: Guided Pressurization of LBNP Suit for Cephalic Hypertension

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-09` |
| **Primary Actor** | Crew Medical Officer (CMO) |
| **Secondary Actors** | Astronaut Under Treatment (Patient) |
| **Level** | Clinical Level / Therapeutic Procedure |
| **SRS Requirements** | `RF-GUI-01`, `RF-GUI-02`, `RF-ANA-02` |
| **Traced Stories** | `HU-11` |

### 1. Brief Description:
Guides the Crew Medical Officer and astronaut through donning, pneumatic sealing, suction pump startup, and gradual adjustment of lower-body negative pressure (LBNP at $-35\text{ mmHg}$), while simultaneously monitoring electrocardiogram and blood pressure to prevent hemodynamic collapse or syncope.

### 2. Preconditions:
1. The LBNP device is deployed in the medical module and connected to the spacecraft vacuum line.
2. The patient is fitted with the continuous blood pressure cuff and cardiac electrodes.

### 3. Trigger:
Activation of the SANS protocol or therapeutic order by the Crew Medical Officer.

### 4. Main Flow of Events:
1. The CMO opens the interactive "LBNP Protocol" wizard in ASTHA.
2. The system guides placement of the neoprene waist seal on the patient with visual verification of airtight fit.
3. The system starts a 60-minute countdown timer calibrated to $-35\text{ mmHg}$.
4. The CMO engages the manual/automatic suction pump until the digital manometer reads $-35\text{ mmHg}$.
5. Throughout the 60-minute session, ASTHA samples blood pressure and heart rate every 30 seconds.
6. At the 30-minute mark, the system issues a gentle prompt asking the patient to confirm: "Do you feel dizziness, tunnel vision, or nausea?". The patient taps "No, Nominal".
7. Upon reaching 60 minutes, the system instructs: "Ending session: Depressurize gradually over 2 minutes to $0\text{ mmHg}$".
8. The system prompts for the post-countermeasure visual exam using the on-screen Amsler Grid.
9. The patient views the central grid and taps "Straight lines / No distortion".
10. The system logs the session as successful and archives the hemodynamic curve in the crew member's clinical record.

### 5. Alternative Flows:
* **FA-01: Blood pressure drop during session (Syncope Risk):**
  1. If Systolic Pressure drops to $< 90\text{ mmHg}$ or Heart Rate spikes abruptly $> 115\text{ bpm}$ (reflex sympathetic response), the system halts the timer and triggers an audible alarm: **"Hemodynamic Alert: Stop LBNP suction and depressurize immediately"**.

### 6. Exception Flows:
* **FE-01: Leak in the LBNP pneumatic seal:**
  1. If the pump fails to maintain negative pressure below $-20\text{ mmHg}$, the system notifies: "Pressure leak detected; inspect waist closure zipper".

### 7. Postconditions:
* **Success:** Intracranial venous decongestion is safely achieved without inducing orthostatic hypotension in the patient.
