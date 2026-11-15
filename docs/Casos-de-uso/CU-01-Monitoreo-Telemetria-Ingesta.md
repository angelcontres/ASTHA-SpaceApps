# 📡 Package 1: Ingestion, Filtering, and Flight Telemetry
**Module:** Signal Acquisition and Ambient Environment | **Standard:** NASA-STD-3001 Vol 1 & 2 / CSA Bio-Monitor

---

## 📋 Use Case: CU-01
### Title: Continuous Ingestion and Filtering of Biomedical Telemetry

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-01` |
| **Primary Actor** | Biomedical Sensor (SmartShirt Astroskin / Bio-Monitor) |
| **Secondary Actors** | Mission Astronaut |
| **Level** | System Level / Continuous Support Function |
| **SRS Requirements** | `RF-ING-01`, `RF-DSH-01`, `RNF-POW-03` |
| **Traced Stories** | `HU-01` |

### 1. Brief Description:
The system receives continuous physiological data packets at 1 Hz from the astronaut's biomedical garment via Bluetooth Low Energy (BLE), applies noise-reduction and microgravity motion-artifact filters, validates values against physically admissible ranges, and updates the local database and tactical interface.

### 2. Preconditions:
1. The biomedical garment (SmartShirt) has its electrodes and plethysmographic bands in proper contact with the astronaut's torso.
2. The ASTHA client node has its BLE interface active and paired with the MAC address of the sensor assigned to the crew member.
3. The local persistence engine (encrypted IndexedDB, ADR-006) has free space available ($> 50\text{ MB}$).

### 3. Trigger:
Periodic receipt of a BLE telemetry packet (1000 ms interval).

### 4. Main Flow of Events:
1. The biomedical sensor emits a packet containing: Heart Rate (bpm), estimated Blood Pressure (mmHg), SpO₂ (%), R-R Intervals (ms), and triaxial Accelerometry (g).
2. The ASTHA communications subsystem receives the binary packet and computes the CRC32 checksum to discard corruption caused by electromagnetic noise.
3. The filtering module applies a digital bandpass filter and discards motion artifacts when accelerometry indicates vigorous physical activity (e.g., treadmill session).
4. The system computes the time-domain heart rate variability metric ($\text{HRV rMSSD}$) over a 5-minute sliding window.
5. The system compares the values against `NASA-STD-3001` physiological thresholds.
6. The system persists the validated record in the local database with a UTC flight timestamp (Mission Elapsed Time - MET).
7. The tactical interface updates the numeric vital-sign cards and appends the new point to the Chart.js historical curve.

### 5. Alternative Flows:
* **FA-01: Transient sensor disconnection ($< 60\text{ seconds}$):**
  1. If no packet is received for 2 consecutive seconds, the system retains the last valid value on screen with a delay warning icon.
  2. Upon BLE signal resumption, the system processes the packets queued in the garment's internal memory and synchronizes the timeline.
* **FA-02: Automatic resting baseline calibration:**
  1. If accelerometry indicates absolute rest and the MET time corresponds to the crew member's rest period, the system logs the values as "Nocturnal Baseline" to calibrate the fatigue algorithm.

### 6. Exception Flows:
* **FE-01: Prolonged signal loss ($> 60\text{ seconds}$):**
  1. The system switches the vitals card to an inactive state (Gray #64748b) with the label "Sensor Disconnected".
  2. No audible medical alarm for cardiac arrest or asystole is triggered, preventing unnecessary alarm across the spacecraft.
  3. An operational disconnection event is recorded in the system log.
* **FE-02: Radiation-corrupted packet (SEU / Single-Event Upset):**
  1. The packet CRC32 check fails.
  2. The system discards the defective packet and requests retransmission from the sensor's local buffer.
  3. If the fault persists for 5 consecutive packets, a technical alert is issued: "Parity failure in BLE receiver".

### 7. Postconditions:
* **Success:** The astronaut's vital signs are updated on screen and persisted in the local immutable log.
* **Failure:** The interface transparently reflects the absence of data without displaying phantom values or freezing the application.

---

## 📋 Use Case: CU-02
### Title: Environmental-Physiological Correlation ($CO_2$ Pockets and CANS Radiation)

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-02` |
| **Primary Actor** | Cabin Sensors (ECLSS / CSA CANS Dosimeter) |
| **Secondary Actors** | Crew Medical Officer (CMO), Habitat Systems Engineer |
| **Level** | Clinical Decision and Flight Safety Level |
| **SRS Requirements** | `RF-ING-02`, `RF-EVA-04`, `RF-DSH-04`, `RNF-SEC-01` |
| **Traced Stories** | `HU-03` |

### 1. Brief Description:
The system monitors carbon dioxide partial pressure ($ppCO_2$) and radiation dose rate in real time. When environmental levels exceed NASA-STD-3001 limits, the system correlates these data with the biosignals of astronauts present in that module to distinguish between an individual illness and a general spacecraft atmospheric fault.

### 2. Preconditions:
1. The ECLSS sensors and the CANS neutron dosimeter are operational and transmitting telemetry to the spacecraft data bus.
2. The astronaut's physical location within the habitat modules (Habitation Node, Laboratory, Core Module) is known.

### 3. Trigger:
$ppCO_2$ concentration reaches Caution ($\ge 2.0\text{ mmHg}$) or Critical ($> 3.0\text{ mmHg}$), or the radiation dose rate exceeds $100\ \mu\text{Sv/h}$ (SRS §6.1).

### 4. Main Flow of Events:
1. The atmospheric sensor detects $ppCO_2 = 3.2\text{ mmHg}$ ($> 4200\text{ ppm}$) in the sleep quarters module.
2. The ASTHA rule engine queries the biomedical status of astronauts located in that module.
3. The system detects that the astronaut's $\text{SpO}_2$ has dropped to $93\%$ ($< 94\%$) or that the astronaut reports a headache.
4. The system rules out an idiopathic hypertensive crisis and classifies the event per SRS §6.2: **R-ENV-01** (Critical: leak or inadequate ventilation) or **R-ENV-02** (Critical: CO₂-induced intracranial hypertension).
5. The habitat top status bar enters a red visual alert state (ppCO₂ $> 3.0\text{ mmHg}$ is Critical).
6. The system generates a priority environmental countermeasure command: "Switch CDRA to forced cycle and activate circulation fans to dissipate stagnant air pocket".
7. The affected astronaut and the Habitat Engineer are simultaneously notified on their respective terminals.

### 5. Alternative Flows:
* **FA-01: Isolated trigger with no physiological alteration in the astronaut:**
  1. If ambient telemetry rises while the astronaut maintains strictly nominal vitals ($\text{SpO}_2 \ge 96\%$, no headache), the system classifies the alert as "Early Environmental Warning" and does not disturb the crew member's rest, alerting only the Duty Officer.

### 6. Exception Flows:
* **FE-01: Atmospheric sensor failure or lockup:**
  1. If the cabin sensor stops transmitting telemetry or outputs constant unrealistic values ($0.00\text{ mmHg}$), the system flags the sensor as "Unreliable" and uses SmartShirt respiratory data to infer $CO_2$ concentration via tidal volume.

### 7. Postconditions:
* **Success:** An explainable alert is issued that prevents hypoxia or incapacitating astronaut headache by addressing the environmental root cause.

---

## 📋 Use Case: CU-03
### Title: Zero-Friction Logging of Subjective Symptoms by the Astronaut

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-03` |
| **Primary Actor** | Mission Astronaut |
| **Secondary Actors** | Crew Medical Officer (CMO) |
| **Level** | User Level / Operational Task |
| **SRS Requirements** | `RF-ING-03`, `RNF-USA-01`, `RNF-USA-02` |
| **Traced Stories** | `HU-04` |

### 1. Brief Description:
Allows any crew member to log qualitative symptoms (blurred vision, headache, nausea, lower back pain, or fatigue) in under 10 seconds using oversized touch selectors suitable for gloved fingers or extreme fatigue conditions.

### 2. Preconditions:
1. The ASTHA application is open on the astronaut's tablet or bulkhead display.
2. The astronaut has selected their crew identifier (`C001` - `C004`).

### 3. Trigger:
The astronaut experiences physical discomfort and taps the floating "Report Symptom" button.

### 4. Main Flow of Events:
1. The system displays a grid of 6 large touch icons ($64 \times 64\text{ px}$): Headache, Dizziness (SAS), Eyes/Vision, Lumbar/Back, Digestive, and Fatigue.
2. The astronaut taps the "Eyes/Vision" icon (1st tap).
3. The system displays a 3-level visual severity selector: Mild (Green/Yellow), Moderate (Orange), Severe (Red).
4. The astronaut taps "Moderate" (2nd tap).
5. The system presents a confirmation button with an automatic 3-second countdown or direct "Save" press (3rd tap).
6. The system saves the event in the local record linked to the current MET timestamp.
7. The CDSS engine recalculates the neuro-ocular system status incorporating this qualitative report.
8. The interface emits a subtle haptic vibration and closes the dialog, returning to the main screen without requiring keyboard input.

### 5. Alternative Flows:
* **FA-01: Report cancellation:**
  1. If the astronaut taps outside the dialog or presses "Cancel", the system discards the draft and leaves the medical history unmodified.

### 6. Exception Flows:
* **FE-01: Critical symptom report with discordant telemetry:**
  1. If the astronaut reports "Severe chest pain" while the electrocardiogram is normal, the system prioritizes life safety: it elevates triage to Caution and suggests that the CMO perform an in-person clinical examination.

### 7. Postconditions:
* **Success:** The symptom is logged in under 10 seconds and the clinical decision engine updates the crew member's triage status.
