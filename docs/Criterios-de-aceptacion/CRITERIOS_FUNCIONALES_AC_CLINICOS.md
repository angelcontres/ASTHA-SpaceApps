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
The system **must** classify each received individual biomedical telemetry reading into one of three mutually exclusive states (**Nominal**, **Caution**, **Critical**) using the exact physiological thresholds defined in the following table:

| Vital Parameter | Unit | Nominal (Green) | Caution (Yellow) | Critical (Red) |
| :--- | :---: | :---: | :---: | :---: |
| **Resting Heart Rate (HR)** | bpm | $55 - 85$ | $45 - 54$ or $86 - 109$ | $< 45$ or $\ge 110$ |
| **Systolic Blood Pressure (SBP)** | mmHg | $105 - 125$ | $90 - 104$ or $126 - 139$ | $< 90$ or $\ge 140$ |
| **Diastolic Blood Pressure (DBP)** | mmHg | $65 - 85$ | $55 - 64$ or $86 - 94$ | $< 55$ or $\ge 95$ |
| **Oxygen Saturation ($\text{SpO}_2$)** | % | $\ge 96.0$ | $93.0 - 95.9$ | $< 93.0$ |
| **Heart Rate Variability ($\text{HRV rMSSD}$)** | ms | $> 35.0$ | $20.0 - 35.0$ | $< 20.0$ |
| **Nighttime Sleep Duration** | hours | $\ge 7.0$ | $5.5 - 6.9$ | $< 5.5$ (for $\ge 2$ days) |

### Test and Validation Procedure:
1. A synthetic test vector containing 10,000 points distributed across the full biomedical spectrum (including exact boundary values: 85, 86, 109, 110 bpm; 125, 126, 139, 140 mmHg) is injected.
2. The classification output by the CDSS engine is verified to match the truth table at **$100.0\%$**.
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
1. **Statistical Anomaly Detection:** Any value with $|M_i| \ge 2.5$ relative to the individual pre-flight baseline (first 14 days on orbit or `L-44`) must be flagged as "Significant Statistical Drift", even if the absolute value lies within the population nominal range.
2. **Trend-Based Predictive Alert:** The linear regression slope ($\beta_1$) over the 7 days must be computed. If the mathematical projection $x(t) = \beta_0 + \beta_1 \cdot t$ crosses the Caution threshold in $t \le 7\text{ days}$, the system must trigger the **Early Drift Alert**.
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
1. **Critical Trigger Condition (Red):**
   * In orbital or deep-space phase ($\text{Phase} \ge \text{FD-01}$), if $\text{SBP} \ge 140\text{ mmHg}$, the blood pressure card must blink red (#ef4444) with the text "SANS CRITICAL".
   * The eye hotspot on the anatomical map must turn red instantaneously.
2. **Preventive Trigger Condition (Yellow):**
   * If $\text{SBP} \ge 126\text{ mmHg}$ and the astronaut logs "Blurred vision" or "Frontal headache" in the symptom module, the system must elevate the status to SANS Caution.
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
1. **$ppCO_2$ Limits per NASA-STD-3001 Vol 2 Sec 6:**
   * **Nominal:** $ppCO_2 < 2.0\text{ mmHg}$ ($< 2600\text{ ppm}$).
   * **Caution:** $2.0 \le ppCO_2 \le 3.0\text{ mmHg}$ ($2600 - 3950\text{ ppm}$).
   * **Critical (Flight Rule Violation):** $ppCO_2 > 3.0\text{ mmHg}$ ($> 3950\text{ ppm}$).
2. **Cross-Correlation Rule:**
   * If $ppCO_2 > 2.5\text{ mmHg}$ and an astronaut in that module exhibits Respiratory Rate $\ge 20\text{ breaths/min}$ or headache, the assigned primary root cause must be **"Cabin $CO_2$ Pocket"**, recommending inspection of forced-convection fans before administering analgesics.

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
1. **Dose Rate Limits (NASA SPELs):**
   * **Nominal GCR (Galactic Cosmic Background):** $15.0 - 35.0\ \mu\text{Sv/h}$.
   * **Caution (Moderate Solar Activity):** $35.1 - 99.9\ \mu\text{Sv/h}$.
   * **Critical (Imminent SPE Solar Storm):** $\ge 100.0\ \mu\text{Sv/h}$.
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
