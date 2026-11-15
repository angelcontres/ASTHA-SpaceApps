# 🧠 Package 2: Clinical Triage and Decision Support (CDSS)
**Module:** Edge Local Intelligence and Rule Engine | **Standard:** NASA-STD-3001 Vol 1 / NASA HRP Risks

---

## 📋 Use Case: CU-04
### Title: Visual Triage via Interactive Anatomical Map Exploration

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-04` |
| **Primary Actor** | Mission Astronaut / Crew Medical Officer (CMO) |
| **Secondary Actors** | SVG / Canvas Graphics Engine |
| **Level** | User Level / Diagnostic Interaction |
| **SRS Requirements** | `RF-ANA-01..04`, `RNF-USA-02`, `RNF-USA-03` |
| **Traced Stories** | `HU-05`, `HU-08` |

### 1. Brief Description:
The user interacts with the 2D/3D human anatomical figure rendered on a touchscreen. Tapping any body region (head/eyes, thorax/heart, abdomen/kidneys, extremities/bones) triggers instant visual triage, displaying health status, microgravity pathophysiology, and linked biosignals.

### 2. Preconditions:
1. The ASTHA application is running and displaying the main tactical dashboard.
2. The selected crew member's physiological data have been processed by the evaluation engine.

### 3. Trigger:
The user taps or clicks an organ or region on the anatomical map.

### 4. Main Flow of Events:
1. The user taps the **Eyes and Cranium** hotspot on the anatomical map.
2. The system highlights the selected region with a bright cyan glow effect and dims the rest of the body.
3. The system retrieves the current status of the **Neuro-Ocular System** from the database.
4. The lower information card updates in under $50\text{ ms}$, displaying:
   * **System Name:** "Neuro-Ocular System (Eyes and Brain)".
   * **Status Badge:** "SANS ALERT - DRIFT / CAUTION" (Amber background / white text).
   * **Key Metrics:** Systolic Blood Pressure ($144\text{ mmHg}$), Visual Acuity ($20/25$).
   * **Pathophysiology:** "Cephalad fluid shift in microgravity. Risk of venous congestion and globe flattening".
5. If the organ has an active alert, the system displays a direct-access button: "View LBNP Countermeasure Protocol".

### 5. Alternative Flows:
* **FA-01: Selection of Cardiovascular Organ (Heart/Thorax):**
  1. The system displays: current Heart Rate, synthetic ECG curve, $\text{HRV rMSSD}$ variability ($19.5\text{ ms}$), and vagal tone status.
* **FA-02: Selection of Renal Organ (Kidneys/Lumbar):**
  1. The system displays: estimated urinary calcium excretion ($> 300\text{ mg/day}$), daily fluid intake volume ($2.1\text{ L}$), and risk of calcium oxalate stone formation.
* **FA-03: Selection of Skeletal System (Femur/Spine):**
  1. The system displays: estimated cumulative bone resorption rate ($1.2\%/\text{month}$) and resistive exercise minutes completed on ARED (120 of 150 min target).

### 6. Exception Flows:
* **FE-01: Device with graphics acceleration disabled:**
  1. The system automatically switches to a lightweight SVG schematic view to maintain 60 fps during touch animation.

### 7. Postconditions:
* **Success:** The user immediately understands the organ's clinical status without requiring specialized medical knowledge.

---

## 📋 Use Case: CU-05
### Title: Early Detection and Stratification of Spaceflight Associated Neuro-ocular Syndrome (SANS)

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-05` |
| **Primary Actor** | Crew Medical Officer (CMO) |
| **Secondary Actors** | Affected Astronaut (Patient) |
| **Level** | Clinical Level / Medical Decision Support |
| **SRS Requirements** | `RF-EVA-01`, `RF-EVA-03`, `RF-GUI-01` |
| **Traced Stories** | `HU-06` |

### 1. Brief Description:
The CDSS engine continuously analyzes blood pressure, subjective visual symptoms, and microgravity flight history in the background. When it detects sustained cephalic hypertension with suspected optic disc edema (SANS), it activates the contingency protocol before permanent vision loss occurs.

### 2. Preconditions:
1. The astronaut is in microgravity flight phase ($\text{Phase} \ge \text{FD-01}$).
2. Validated continuous blood pressure readings are available.

### 3. Trigger:
Systolic Blood Pressure reaches or exceeds $140\text{ mmHg}$ ($\text{SBP} \ge 140\text{ mmHg}$, SRS §6.1) or $\text{SBP} > 135\text{ mmHg}$ combined with a report of blurred vision (R-SANS-01, SRS §6.2).

### 4. Main Flow of Events:
1. The plethysmographic sensor reports a reading of $\text{BP} = 144/92\text{ mmHg}$ for crew member `C003` (Dr. Marcus Dalton).
2. The ASTHA rule engine verifies that the crew member is on Flight Day 2 (FD-02), a critical phase of cephalad blood and cerebrospinal fluid redistribution.
3. The system classifies the event with **Critical (Red)** severity level.
4. The on-screen Blood Pressure card enters an intermittent red pulse animation displaying "SANS CRITICAL".
5. The eye hotspot on the anatomical map switches from cyan to red (#ef4444).
6. The system updates the countermeasures panel with the specific venous decompression plan:
   * **Step 1:** Pressurize LBNP suit to $-35\text{ mmHg}$ for 60 min.
   * **Step 2:** Conduct visual test with the touchscreen Amsler Grid.
   * **Step 3:** Enforce strict dietary sodium restriction below $2.0\text{ g/day}$.
7. A high-priority alert is generated on the Crew Medical Officer's tablet (`C002` - Lauren Pierce).

### 5. Alternative Flows:
* **FA-01: Transient hypertension due to intense physical exercise:**
  1. If accelerometry indicates that the astronaut has just finished an ARED exercise session, the system defers SANS evaluation for 15 minutes to allow post-exertion hemodynamic normalization.

### 6. Exception Flows:
* **FE-01: Refractory progression despite countermeasures:**
  1. If after 60 minutes of LBNP systolic pressure does not drop below $135\text{ mmHg}$ or the crew member reports scotomas or central vision loss, the system escalates the alert to "Level 3 Neuro-Ocular Emergency" and suggests oral administration of acetazolamide (carbonic anhydrase inhibitor from the flight medical kit).

### 7. Postconditions:
* **Success:** Optic disc edema is treated early and the astronaut's vision is preserved.

---

## 📋 Use Case: CU-06
### Title: Algorithmic Detection of Physiological Drift (Modified Z-Score)

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-06` |
| **Primary Actor** | CDSS Mathematical Engine |
| **Secondary Actors** | Crew Medical Officer (CMO) |
| **Level** | Algorithm Level / Preventive Surveillance |
| **SRS Requirements** | `RF-DER-01..03`, `RNF-USA-05` |
| **Traced Stories** | `HU-07` |

### 1. Brief Description:
The system calculates the Modified Z-score over a 7-day sliding window for all astronaut vital signs, comparing them against their own pre-flight baseline (L-44). If it detects a sustained downward or upward trend toward deterioration, it issues a preventive alert before the absolute value crosses the NASA-STD-3001 critical limit.

### 2. Preconditions:
1. The astronaut has at least 3 days of historical measurements recorded onboard.
2. The individual pre-flight ground baseline (`L-44`) is available.

### 3. Trigger:
Scheduled daily calculation at 06:00 MET or receipt of a new telemetry series.

### 4. Main Flow of Events:
1. The algorithm extracts the data vector of the last 7 days for each biomarker (e.g., morning resting Heart Rate).
2. The algorithm computes the median ($\tilde{x}$) and the median absolute deviation ($\text{MAD}$):
   $$\text{MAD} = \text{median}(|x_i - \tilde{x}|)$$
3. The current value $x_{\text{today}}$ is evaluated by computing the Iglewicz & Hoaglin Modified Z-Score:
   $$M_i = \frac{0.6745 \cdot (x_{\text{today}} - \tilde{x})}{\text{MAD}}$$
4. The system evaluates the statistical drift condition: If $|M_i| \ge 2.5$, the variable is flagged as **Anomalous Drift**.
5. A linear regression is executed over the 7 time points to compute the rate-of-change slope ($\beta_1$).
6. If the slope projects that the medical alert threshold will be crossed in fewer than 7 days (e.g., systolic pressure will cross $135\text{ mmHg}$), the system generates a **"Predictive Drift Alert"**.
7. On the CMO dashboard, a yellow badge displays the message: "Drift detected in HR: Deviation $Z = +2.7$ vs. baseline; trend of $+2.1\text{ bpm/day}$".

### 5. Alternative Flows:
* **FA-01: Zero dispersion ($\text{MAD} = 0$):**
  1. If past measurements are identical ($\text{MAD} = 0$), the algorithm automatically switches to mean absolute deviation to avoid division by zero.

### 6. Exception Flows:
* **FE-01: Incomplete data due to transmission loss:**
  1. If more than $40\%$ of readings are missing in the 7-day window, the system skips projection calculation and notifies the CMO: "Insufficient data for predictive linear regression; static threshold monitoring maintained".

### 7. Postconditions:
* **Success:** Physical exhaustion or cardiovascular deconditioning is anticipated several days before manifesting as an acute emergency.
