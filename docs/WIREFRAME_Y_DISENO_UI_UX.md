# 📐 Wireframe, Ergonomics, and UI/UX Design Specification
### ASTHA — NASA Space Apps Challenge 2026
**Reference Standards:** NASA-STD-3001 Vol 2 (Human Factors & Habitation) | ISO 9241-11 (Usability) | MIL-STD-1472H (Human Engineering)

> [!NOTE]
> **Official Modular UI/UX Design Suite:** The complete normative specification (View A/B/C Wireframes, WCAG AAA `#fca5a5` Design System, and Svelte 5 + `uPlot` Mockups/Components) is organized in [**`docs/Diseno-UI-UX/README.md`**](./Diseno-UI-UX/README.md). This document is maintained in alignment as a rapid executive reference.

---

## 🎯 1. Design Philosophy in Microgravity and Deep Space

Designing a medical interface for an astronaut in transit to Mars requires discarding conventional web design paradigms. The spacecraft cabin imposes severe physical constraints:

1. **Cognitive Stress and Altered Vision (SANS):** Due to cephalad fluid shift, astronauts experience refractive fluctuations and transient blurred vision. The interface requires **high-legibility native system fonts (`system-ui` / `ui-monospace` per `ADR-003`)** and **color contrast $> 7:1$ (WCAG 2.1 AAA)**.
2. **Gloved Operation and Microgravity:** In zero-G, fingers float and fine motor proprioception degrades. All interactive elements must provide a minimum touch target area of **$48 \times 48\text{ px}$** with a minimum spacing of **$12\text{ px}$** (`RNF-USA-01`) to prevent mis-taps.
3. **Power Consumption and Visual Fatigue:** Deep space black background (`#030712` / `#060913`) powers off pixels on OLED displays, lowering power draw below 5W and preserving cabin dark adaptation.
4. **Redundant Coding for Color Vision Deficiency:** No alert may rely solely on color. Every medical indicator combines **Color + Icon + Rhythmic Pulse + Text Label**.

---

## 🗺️ 2. Information Architecture and Grid System (12-Column Grid)

The primary display is structured on a symmetric 12-column grid optimized for bulkhead touchscreens ($1920 \times 1080\text{ px}$) and flight tablets ($1024 \times 768\text{ px}$):

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. CABIN TELEMETRY TOP BAR (Sticky Top Bar - 56px)                                             │
│ [ASTHA Logo] [Badge NASA-STD-3001] [Badge Edge 100%] ... [CANS Radiation] [Cabin ppCO2]        │
├────────────────────────────────┬───────────────────────────────────────────────────────────────┤
│ LEFT COLUMN (4 COLUMNS)        │ RIGHT COLUMN (8 COLUMNS)                                      │
│                                │                                                               │
│ 2. CREW SELECTOR               │ 4. VITAL SIGNS CARD GRID (4 Cards)                            │
│ [C01 Jared] [C02 Hayley]       │ [HR: 98 bpm]  [BP: 144/92]  [SpO2: 95.8%]  [HRV: 19.5 ms]     │
│ [C03 Sian ] [C04 Chris ]       ├───────────────────────────────┬───────────────────────────────┤
│                                │ 5. HISTORICAL uPlot CURVE     │ 6. COUNTERMEASURE PROTOCOL    │
│ [Timeline: L-44 to R+1]        │ (7 Columns Wide)              │ (5 Columns Wide)              │
│                                │ [Systolic BP Curve (Cyan)   ] │ [Title & Clinical Severity]   │
│ 3. TACTICAL ANATOMICAL MAP     │ [Heart Rate Curve (Red)     ] │ [What's Happening / Explain ] │
│ [Human SVG with Hotspots]:     │ [X-Axis: Phases / Y-Axis:mmHg]│ [Interactive Checklist]:      │
│ * Head / Eyes (SANS)           │                               │ [x] Step 1: LBNP Suit         │
│ * Thorax / Heart               │                               │ [ ] Step 2: Amsler Grid       │
│ * Abdomen / Kidneys            │                               │ [ ] Step 3: Low-Sodium Diet   │
│ * Femur / Bones                │                               │                               │
│                                ├───────────────────────────────┴───────────────────────────────┤
│ [Floating Organ Info Card]     │ 7. LIVE SPACE CRISIS SIMULATOR (Evaluation Demo)              │
│ Status, Biosignals & Triage    │ [1. Solar Storm SPE]  [2. CO2 Leak]  [3. SANS]  [Reset]       │
└────────────────────────────────┴───────────────────────────────────────────────────────────────┘
```

---

## 📐 3. Detailed Wireframe Schematics (Low-Fidelity Blueprint Schematics)

### View A: Primary Tactical Dashboard (Cockpit Bulkhead View)

```text
+----------------------------------------------------------------------------------------------------+
| [o] ASTHA | NASA-STD-3001 | [x] EDGE OFFLINE        || Radiation: 28.4 uSv/h | ppCO2: 2.1 mmHg     |
+----------------------------------------------------------------------------------------------------+
| CREW SELECTOR (OSD-574)            | VITALS GRID                                                   |
| +----------------+---------------+ | +---------------+ +---------------+ +---------------+ +-------+ |
| | [C01] Jared I. | [C02] Hayley A| | | HR: 98 bpm    | | BP: 144/92*   | | SpO2: 95.8%   | | HRV:19| |
| | Cmdr (Nominal) | Med (Nominal) | | | Nom: 55-85    | | Nom: 120/80   | | Nom: >=96%    | | Nom>35| |
| +----------------+---------------+ | +---------------+ +---------------+ +---------------+ +-------+ |
| | [C03] Sian P.* | [C04] Chris S | | *ALERT: SANS CRITICAL (Red Pulse 1.5s)                        |
| | Pilot (SANS!)  | Spec (Nominal)| |---------------------------------------------------------------|
| +----------------+---------------+ | TELEMETRY CHART (uPlot Canvas)| COUNTERMEASURE CHECKLIST      |
| TIMELINE: [L-44] [FD1] [FD2*] [FD3]| | mmHg                        | [!] HIGH PRIORITY: SANS       |
|------------------------------------| | 160+     /--- Systolic BP   | Headache & ocular congestion  |
| ANATOMICAL TACTICAL BODY MAP       | | 140+====*======             | from microgravity fluid shift.|
|              ( O )  <-- Eyes SANS! | | 120+---/                    | [x] 1. LBNP -35 mmHg (60 min) |
|             /  |  \ <-- Thorax/Hrt | | 100+                        | [ ] 2. Amsler Grid Test       |
|            |  (o)  |               | |  80+   *---*--- HR Pulse    | [ ] 3. Sodium Intake < 2.0 g/d|
|               / \   <-- Kidney/Lmb | |  60+--/                     |-------------------------------|
|              |   |  <-- Femur/Bone | |    L-44 FD1 FD2 FD3 R+1     | LIVE CRISIS SIMULATOR         |
|              |   |                 +-------------------------------+ [1. SPE] [2. CO2] [3. SANS]   |
| [Info Box: Neuro-Ocular System]    | Mars RTT Delay: 44m | P2P Mesh Synced | DB: AES-256 Encrypted |
+----------------------------------------------------------------------------------------------------+
```

### View B: Maximum Emergency Display (Code Red SPE / Solar Storm)

```text
+----------------------------------------------------------------------------------------------------+
| [!] MAXIMUM ALERT - CODE RED || RADIATION RATE: 184.2 uSv/h (CRITICAL) || TIME TO IMPACT: < 5 MIN  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|      /!\   SPE EMERGENCY: MASSIVE SOLAR PROTON AND NEUTRON FLUX IN PROGRESS   /!\                  |
|                                                                                                    |
| +------------------------------------------------------------------------------------------------+ |
| | IMMEDIATE SURVIVAL CHECKLIST (MANDATORY CREW EXECUTION):                                       | |
| |                                                                                                | |
| | [ ] STEP 1: Evacuate immediately to the central shielded module (STORM SHELTER).               | |
| |             Passive water and polyethylene shielding reduces biological dose by >70%.          | |
| |                                                                                                | |
| | [ ] STEP 2: Administer oral antioxidant radioprotective cocktail (Med Kit Bravo Bulkhead 2).    | |
| |             Mitigation of cellular DNA double-strand breaks.                                     | |
| |                                                                                                | |
| | [ ] STEP 3: Mount personal passive CANS dosimeters on the shielded inner bulkhead.             | |
| |             Continuous logging of cumulative individual absorbed dose (mSv).                   | |
| +------------------------------------------------------------------------------------------------+ |
|                                                                                                    |
| Mission Cumulative Dose: 42.8 mSv || Career SPELs Limit: 600 mSv || Houston DTN Packet: Queued     |
+----------------------------------------------------------------------------------------------------+
```

---

## 🎨 4. Atomic Design System (Design System Tokens)

### 4.1. Tactical Aerospace Color Palette (Dark Tactical Scheme)

| Semantic Token | Hex Value | Operational Usage in ASTHA | Ergonomic Rationale |
| :--- | :---: | :--- | :--- |
| **`space-950`** | `#030712` | Application absolute background | Powers off OLED pixels; display draw $< 5\text{ W}$. |
| **`space-900`** | `#060913` | Viewport and container background | Depth contrast without nighttime glare. |
| **`space-800`** | `#0c1222` | Card and modal background | Crisp component framing with `#141e36` borders. |
| **`cyan-400`** | `#38bdf8` | Nominal accent, blood pressure curves | Cyan wavelength tuned for peak scotopic foveal acuity. |
| **`alert-green`** | `#10b981` | Nominal State (NASA-STD-3001) | Signals safe, in-range physiological parameters. |
| **`alert-yellow`**| `#f59e0b` | Caution / Drift State | Early preventive warning without triggering audible klaxon. |
| **`alert-red`** | `#ef4444` | Critical / Code Red State (fills/borders only) | Slow pulse (1.5s) and alert borders without dark-on-red text. |
| **`alert-red-text`** | `#fca5a5` | Critical alert text (`ADR-018`) | **WCAG AAA contrast (`10.61:1` against `#030712`)** for legibility under SANS stress. |

### 4.2. Typography and Hierarchy

* **Data & Biosignal Font:** `ui-monospace` / `"SF Mono"` / `monospace` (`ADR-003`, zero external fonts). Guarantees `tabular-nums` alignment without visual jitter on live heart-rate updates.
* **UI & Procedure Font:** `system-ui` / `sans-serif`. Maximum native offline legibility at 1-meter cabin viewing distances.

### 4.3. Touch Targets and Flight Controls

* **Primary Crisis Buttons:** Height $48\text{ px}$, horizontal padding $16\text{ px}$, minimum gap of **$12\text{ px}$** (`RNF-USA-01`).
* **Anatomical Map Hotspots:** Minimum touch capture zone of $48 \times 48\text{ px}$ with subtle glow micro-animation on hover or touch.
* **Checklist Checkboxes:** $24 \times 24\text{ px}$ touch box centered inside a padded container with **$48\text{ px}$** minimum height (`RNF-USA-01`) for reliable gloved actuation.

---

## 📱 5. Interactive Wireframe Prototype

To inspect and audit wireframe dimensions, callouts, and interactive layout behavior, an interactive prototype file has been created:
👉 **[`wireframe.html`](../wireframe.html)**

This file enables evaluators to switch in real time between:
1. **Blueprint Wireframe View (Low-Fidelity):** Orthogonal dimension lines, technical spatial grid, and pixel callouts.
2. **Tactical UI View (High-Fidelity):** Flight-grade dark colors, telemetry charts, and pulse animations.
3. **Crisis Mode (Code Red):** Demonstration of the immediate solar storm evacuation layout.

---

## 🧘 6. Minimalist Architecture and Environmental Telemetry (ECLSS)

### 6.1. Cognitive Load Reduction via Progressive Disclosure
During spaceflight contingency events (such as solar storms or atmospheric faults), sensory overload and simultaneous exposure to excessive data increase human error rates. Following **NASA-STD-3001 Vol 2 (Chapter 10: "Crew Interfaces - Minimizing Display Clutter")**:
* The dashboard organizes information into **independent tactical tabs**:
  1. `[👤 1. Astronaut Biomedical]`: Essential vital signs (HR, BP, SpO₂, HRV) and adaptation trend curve.
  2. `[🛰️ 2. Environment & Cabin (ECLSS)]`: Spacecraft environmental telemetry and life-support subsystem health.
  3. `[🧬 3. Anatomical Triage & CDSS]`: Interactive body map and clinical intervention checklists.
  4. `[⚡ 4. Crisis Simulator]`: Controlled scenario injection for verification and evaluation.
* **Quick-Status Strip**: Provides instantaneous situational awareness in 1 fixed line beneath the header: active astronaut, flight phase, cabin pressure, $ppCO_2$, CANS radiation, and overall medical status beacon.

### 6.2. Cabin Environmental Telemetry Specification (ECLSS & CANS)
The space habitat environment monitors 6 critical parameters correlated with astronaut physiology:
1. **Carbon Dioxide ($ppCO_2$):** Cabin partial pressure ($2.10 - 2.85\text{ mmHg} \approx 2760 - 3750\text{ ppm}$). NASA-STD-3001 alert limit: $3.0\text{ mmHg}$.
2. **Total Atmospheric Pressure ($P_{cab}$):** $101.3\text{ kPa}$ ($14.7\text{ psi}$ / $1.0\text{ atm}$). Safe range: $98.6 - 102.7\text{ kPa}$.
3. **Oxygen Concentration ($pO_2$ / $\%O_2$):** $20.9\%$ ($ppO_2 \approx 21.2\text{ kPa}$). Operational margin: $19.5\% - 23.0\%$.
4. **Ambient Temperature ($T_{cab}$):** $21.5^\circ\text{C}$ ($70.7^\circ\text{F}$). NASA comfort range: $18.3 - 26.7^\circ\text{C}$.
5. **Relative Humidity ($RH\%$):** $45.0\%$. Nominal range: $25\% - 75\%$.
6. **CANS Radiation Dosimetry (CSA):** Real-time dose rate ($28.4 - 32.8\ \mu\text{Sv/h}$). Storm Shelter evacuation threshold: $> 100\ \mu\text{Sv/h}$.

### 6.3. Minimalist Zen Mode and Survival Mode (`< 5W`, `ADR-019`)
* **Zen Mode:** When enabled, hides decorative borders, highlights only critical figures in oversized typography, and widens spacing for distraction-free distance reading.
* **Survival Mode (`< 5W`):** Triggered when battery drops to $\le 15\%$ or via manual backup toggle (`ADR-019`); disables Three.js and `uPlot`, enforces pure `#000000` background with zero animations or pulses, and retains tabular vital-sign and ECLSS readouts.
