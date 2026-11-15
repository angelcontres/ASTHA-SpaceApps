# 🧬 Clinical and Physiological Acceptance Criteria (AC-CLIN)
### ASTHA — NASA Space Apps Challenge 2026
**Mandatory Standard:** NASA-STD-3001 (Volume 1: Crew Health | Volume 2: Human Factors, Habitation, and Environment)

---

## 📌 AC-CLIN-01: Tri-State Classification of Physiological Biosignals

| Identifier | `AC-CLIN-01` |
| :--- | :--- |
| **SRS Requirements** | `RF-ING-01`, `RF-EVA-01`, `RF-EVA-02`, `RF-DSH-01` |
| **User Stories** | `HU-01`, `HU-08` |
| **Use Cases** | `CU-01` |
| **Verification Method** | **Test (T) and Analysis (A)** |

### Criterion Statement:
The system **must** classify each received individual biomedical telemetry reading into one of three mutually exclusive states (**Nominal**, **Caution**, **Critical**) using exactly the thresholds of **SRS §6.1** (single source of truth; these values are reproduced here for verification and must not diverge from the SRS):

| Vital Parameter | Unit | Nominal (Green) | Caution (Yellow) | Critical (Red) |
| :--- | :---: | :---: | :---: | :---: |
| **Resting Heart Rate (HR)** | bpm | $55 - 85$ | $86 - 105$ or $45 - 54$ | $< 45$ or $> 110$ |
| **Systolic Blood Pressure (SBP)** | mmHg | $105 - 125$ | $126 - 139$ | $\ge 140$ |
| **Diastolic Blood Pressure (DBP)** | mmHg | $65 - 84$ | $85 - 89$ | $\ge 90$ |
| **Oxygen Saturation ($\text{SpO}_2$)** | % | $96 - 100$ | $93 - 95$ | $< 93$ |
| **Heart Rate Variability ($\text{HRV rMSSD}$)** | ms | $35 - 70$ | $20 - 34$ | $< 20$ (for $\ge 2$ days) |
| **Nighttime Sleep Duration** | hours | $7.0 - 8.5$ | $5.5 - 6.9$ | $< 5.5$ (for $\ge 2$ days) |

**Gap rule (SRS §6.1):** a value falling between two bands is classified into the more severe band (e.g., HR $106 - 110$ bpm is Critical; radiation $81 - 100\ \mu\text{Sv/h}$ is Caution).

### Test and Validation Procedure:
1. A synthetic test vector containing 10,000 points distributed across the full biomedical spectrum is injected, including each threshold at the exact value, one below, and one above (SRS §8 Test Plan), e.g., 85, 86, 105, 106, 110, 111 bpm; 125, 126, 139, 140 mmHg; 84, 85, 89, 90 mmHg.
2. The classification output by the CDSS engine is verified to match the SRS §6.1 truth table at **$100.0\%$**.
3. The **Global Crew Status** is verified to be computed as the worst state among all active indicators ($\text{GlobalStatus} = \max(\text{Severity}_i)$).

---

## 📌 AC-CLIN-02: Algorithmic Detection of Physiological Drift (Modified Z-Score)

| Identifier | `AC-CLIN-02` |
| :--- | :--- |
| **SRS Requirements** | `RF-DER-01`, `RF-DER-02`, `RF-DER-03`, `RF-DER-04` |
| **User Stories** | `HU-02`, `HU-07` |
| **Use Cases** | `CU-06` |
| **Verification Method** | **Mathematical Analysis (A) and Test (T)** |

### Criterion Statement:
The system **must** compute daily for each astronaut the Iglewicz & Hoaglin Modified Z-Score using the Median Absolute Deviation ($\text{MAD}$) over a trailing 7-day sliding window:

$$M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{\text{MAD}} \quad \text{where} \quad \text{MAD} = \text{median}(|x_i - \tilde{x}|)$$

### Specific Acceptance Criteria:
1. **Statistical Anomaly Detection (SRS §6.3 D-02):** Any value with $|M_i| \ge 2.5$ relative to the individual baseline of the first 14 days must be flagged as "Significant Statistical Drift", even if the absolute value lies within the population nominal range.
2. **Trend-Based Predictive Alert (SRS §6.3 D-01):** The linear regression slope ($\beta_1$) over the 7 days must be computed. If the current value is nominal and the projection $x(t) = \beta_0 + \beta_1 \cdot t$ crosses the Caution threshold in $t \le 7\text{ days}$, the system must trigger the **Early Drift Alert**.
3. **Outlier Robustness:** An isolated extreme outlier (e.g., a 5-second $160\text{ bpm}$ motion artifact) must not distort the median or generate false sustained-drift alarms.

---

## 📌 AC-CLIN-03: Early Detection and Stratification of Spaceflight Associated Neuro-ocular Syndrome (SANS)

| Identifier | `AC-CLIN-03` |
| :--- | :--- |
| **SRS Requirements** | `RF-EVA-01`, `RF-EVA-03`, `RF-GUI-01` |
| **User Stories** | `HU-06`, `HU-11` |
| **Use Cases** | `CU-05`, `CU-09` |
| **Verification Method** | **Demonstration (D) and Test (T)** |

### Criterion Statement:
The system **must** immediately identify any indication of cerebral venous congestion and optic disc overpressure associated with cephalad fluid shift in microgravity, triggering the corresponding countermeasure protocol in less than $100\text{ ms}$.

### Specific Acceptance Criteria:
1. **Critical Trigger Conditions (Red):**
   * **Threshold (SRS §6.1):** if $\text{SBP} \ge 140\text{ mmHg}$, the blood pressure card must blink red (#ef4444) with the text "SANS CRITICAL" and the eye hotspot on the anatomical map must turn red instantaneously.
   * **Rule R-SANS-01 (SRS §6.2):** if $\text{SBP} > 135\text{ mmHg}$ and the astronaut reports "Blurred vision", the system must raise **Critical: early SANS alert**.
2. **High Caution Condition (Yellow) — Rule R-SANS-02 (SRS §6.2):**
   * If $\text{SBP} > 135\text{ mmHg}$ and sleep $< 6$ hours, the system must raise **High caution: cephalic hypertensive drift**.
3. **LBNP Protocol Deployment:**
   * The system must automatically load the 3-step checklist into the action panel:
     1. Pressurize LBNP negative-pressure suit to $-35\text{ mmHg}$ for 60 minutes.
     2. Perform touchscreen Amsler Grid test at minute 0 and minute 60.
     3. Restrict dietary sodium to $< 2.0\text{ g/day}$.

---

## 📌 AC-CLIN-04: Environmental-Physiological Correlation with Carbon Dioxide ($ppCO_2$)

| Identifier | `AC-CLIN-04` |
| :--- | :--- |
| **SRS Requirements** | `RF-ING-02`, `RF-EVA-04`, `RF-DSH-04` |
| **User Stories** | `HU-03` |
| **Use Cases** | `CU-02` |
| **Verification Method** | **Test (T)** |

### Criterion Statement:
The system **must** monitor cabin atmospheric carbon dioxide concentration and correlate it with crew respiration and hemodynamics to diagnose hypercapnia before it induces lethargy or respiratory acidosis.

### Specific Acceptance Criteria:
1. **$ppCO_2$ Limits (SRS §6.1, NASA-STD-3001 Vol 2 Sec 6):**
   * **Nominal:** $ppCO_2 < 2.0\text{ mmHg}$.
   * **Caution:** $2.0 \le ppCO_2 \le 3.0\text{ mmHg}$.
   * **Critical (Flight Rule Violation):** $ppCO_2 > 3.0\text{ mmHg}$.
2. **Cross-Correlation Rules (SRS §6.2):**
   * **R-ENV-01:** $ppCO_2 > 3.0\text{ mmHg}$ and $\text{SpO}_2 < 94\%$ → **Critical: leak or inadequate ventilation**.
   * **R-ENV-02:** $ppCO_2 > 3.0\text{ mmHg}$ and headache reported → **Critical: CO₂-induced intracranial hypertension**. The assigned primary root cause is the **cabin CO₂ pocket**, so the first protocol step is environmental (verify forced-circulation fans and switch the CDRA bed) before any analgesic is suggested.

---

## 📌 AC-CLIN-05: Space Radiation Dosimetry and Solar Particle Events (SPE)

| Identifier | `AC-CLIN-05` |
| :--- | :--- |
| **SRS Requirements** | `RF-EVA-04`, `RF-GUI-03`, `RNF-USA-04` |
| **User Stories** | `HU-03`, `HU-10` |
| **Use Cases** | `CU-02`, `CU-08` |
| **Verification Method** | **Demonstration (D) and Test (T)** |

### Criterion Statement:
The system **must** process readings from the CANS neutron and particle spectrometer (Canadian Space Agency) and activate the highest-priority emergency protocol whenever radiation flux threatens crew life.

### Specific Acceptance Criteria:
1. **Dose Rate Limits (SRS §6.1):**
   * **Nominal GCR (Galactic Cosmic Background):** $15 - 35\ \mu\text{Sv/h}$.
   * **Caution (Moderate Solar Activity):** $36 - 80\ \mu\text{Sv/h}$; by the gap rule, $81 - 100\ \mu\text{Sv/h}$ is also Caution.
   * **Critical (Imminent SPE Solar Storm, R-RAD-01):** $> 100\ \mu\text{Sv/h}$; with nausea, R-RAD-02 raises emergency urgency.
2. **Code Red SPE Response:**
   * The global interface must pulse red and emit a tactical alarm tone in less than $50\text{ ms}$.
   * The emergency action checklist must be ordered as:
     1. Evacuate crew to central shielded module (*Storm Shelter*).
     2. Administer oral radioprotective cocktail from Medical Kit Bravo.
     3. Mount passive personal dosimeters on the interior bulkhead.
   * The system must compute and accumulate total received biological dose in millisieverts ($\text{mSv}$).

---

## 📌 AC-CLIN-06: Checklist Architecture and Usability for Non-Medical Crew

| Identifier | `AC-CLIN-06` |
| :--- | :--- |
| **SRS Requirements** | `RF-GUI-01..04`, `RNF-USA-01`, `RNF-USA-04` |
| **User Stories** | `HU-09`, `HU-12` |
| **Use Cases** | `CU-07` |
| **Verification Method** | **Inspection (I) and Demonstration (D)** |

### Criterion Statement:
All medical countermeasure procedures presented by the system **must** follow a standardized format intelligible to engineers, pilots, and scientists without intensive-care medical training.

### Specific Acceptance Criteria:
1. **Mandatory 3-Block Structure:**
   * **Block 1 (Physiological Explanation):** Plain-language text explaining what is happening to the body (maximum 3 lines).
   * **Block 2 (Severity and Impact):** Visual badge with priority (High, Medium, Low) and recommended action time window.
   * **Block 3 (Sequential Checklist):** Numbered list with interactive checkboxes (`checkbox`).
2. **Actionable Step Limit:** No procedure may contain more than **4 sequential steps**, preventing working-memory overload during crises.
3. **Onboard Resource Constraint:** The system is prohibited from recommending resources unavailable aboard a deep-space vehicle (e.g., it must never suggest "MRI scan", "surgical endotracheal intubation", or "hospital transfer"). It must cite only confirmed onboard supplies (LBNP, ARED, Medical Kits Bravo/Alpha, LiOH/CDRA cartridges, potassium citrate).

---

## 📌 AC-CLIN-07: Anatomical Map Triage and Visual Accessibility (Color Blindness)

| Identifier | `AC-CLIN-07` |
| :--- | :--- |
| **SRS Requirements** | `RF-ANA-01..04`, `RNF-USA-02`, `RNF-USA-03` |
| **User Stories** | `HU-05` |
| **Use Cases** | `CU-04` |
| **Verification Method** | **Inspection (I) and Demonstration (D)** |

### Criterion Statement:
The interactive anatomical map **must** provide a clear visual representation of affected body organs without relying solely on color to convey critical information.

### Specific Acceptance Criteria:
1. **Clickable Anatomical Regions (Hotspots):** The vector human model must provide interactive touch zones for: Eyes/Brain, Thorax/Heart, Lumbar/Kidneys, Femur/Bones, and Extremities.
2. **Dual-Coding Principle (Dual-Channel):** Every warning or danger state must be conveyed through two simultaneous channels:
   * **Channel 1 (Chromatic):** Green (#10b981), Yellow (#f59e0b), or Red (#ef4444).
   * **Channel 2 (Morphic / Textual):** Representative icon, high-contrast border with slow rhythmic pulse (1.5s), and explicit text label ("NOMINAL", "CAUTION", "SANS CRITICAL").
3. **Ergonomic Touch Target Area:** Each anatomical hotspot must have a minimum touch activation area of $48 \times 48\text{ pixels}$, ensuring operability with gloved fingers or cold/stress-induced tremors.
