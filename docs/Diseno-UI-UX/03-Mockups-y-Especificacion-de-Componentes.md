# 03 — Mockups & Component Specification

[<- Style Guide](./02-Guia-de-Estilo-y-Design-System.md) · [Index](./README.md) · [Hi-Fi Prototype `index.html`](../../index.html)

---

## 1. Operational Hi-Fi Mockup vs. `wireframe.html` Prototype

The high-fidelity design of **ASTHA** realizes the [`wireframe.html`](../../wireframe.html) grid in the production Svelte 5 interface (demonstrated in the reference prototype [`index.html`](../../index.html)), preserving exact block geometry while eliminating latency and cognitive overload:

```text
+---------------------------------------------------------------------------------------------------+
|  [ASTHA]  FD-15 · ARTEMIS-MARS MISSION · pO2 21.2 kPa  ppCO2 0.35 kPa   [ZEN MODE] [SURVIVAL]     |
+---------------------------------------------------------------------------------------------------+
|  [● C01 Calloway OK] [▲ C02 Pierce +SANS] [● C03 Dalton OK] [● C04 Sutton OK] | Timeline   |
+----------------------------------+----------------------------------------------------------------+
|  ANATOMICAL VIEWER (COMP-02)     |  BIOMEDICAL VITALS (COMP-03)                                   |
|  Three.js On-Demand + 4 Hotspots |  +---------------------------+  +---------------------------+  |
|                                  |  | HR: 68 BPM    [✓ Nominal] |  | Rad: 0.42 mSv [✓ Nominal] |  |
|      [H1: Eyes/SANS  48x48]      |  | Baseline: 66 (+2 BPM)     |  | NASA Limit: 50 mSv/yr     |  |
|      [H2: Thorax/HR  48x48]      |  +---------------------------+  +---------------------------+  |
|      [H3: Kidney/Ca  48x48]      |  | ICP/SANS: 19.4 mmHg  [▲]  |  | DEXA: 98.2 %  [✓ Nominal] |  |
|      [H4: Femur/ARED 48x48]      |  | Drift: +3.1 mmHg vs Pre   |  | Loss: -1.8 % (FD-15)      |  |
|                                  |  +---------------------------+  +---------------------------+  |
|  [SVG Fallback if WebGL fails]   +--------------------------------+-------------------------------+
|                                  |  uPlot Trend (COMP-04)         | CDSS Counterm. (COMP-05 <=4)  |
|                                  |  22 |             *---*        | [✓] 1. LBNP Goggles           |
|                                  |  19 |   *---*----/             | [ ] 2. ARED Session 25m       |
|                                  |  16 +--------------------      | [ ] 3. EVA Symptom Log        |
|                                  |     L-44   FD-01   FD-15       | [>] CMO Flight Surgeon Block  |
+----------------------------------+--------------------------------+-------------------------------+
```

---

## 2. Normative UI Component Catalog (Svelte 5)

In alignment with the component architecture [`03-componentes.md`](../c4/03-componentes.md#32-crew-pwa-ui) and the SDD (`v3.0.0`), the 4 critical system components implement the following variants, states, and accessibility rules:

### 2.1 `AnatomyViewer.svelte` (`COMP-02`)

Hybrid 3-layer decoupled viewer designed to preserve performance and reliability against WebGL failures:

| Aspect | Exact Specification |
| :--- | :--- |
| **Layer Architecture** | 1) **Three.js** canvas with *on-demand* rendering (`maxPixelRatio: 1.5`, `0 FPS` at rest; 1 *frame* per rotation or selection, [`ADR-004`](../SDD/08-Architecture-decisions.md#adr-004)).<br>2) Overlaid HTML layer with *hotspots* of minimum `$48 \times 48\text{ px}$` and `$12\text{ px}$` spacing.<br>3) Fallback **interactive SVG** silhouette (`wireframe.html` `COMP-02`). |
| **Variants** | `full` (desktop/bulkhead 1280+ px) · `compact` (tablet with collapsible top hotspot bar) · `crisis` (direct focus on the compromised organ) · `fallback` (pure SVG if WebGL fails or Survival Mode is active). |
| **States** | `idle` · `rotating` · `hotspot-selected` · `alert-pulsing` (`<= 1.5 Hz`) · `webgl-fallback`. |
| **Accessibility** | Full keyboard navigation (`Tab` between *hotspots*, `Enter`/`Space` selects organ); `aria-label` announcing anatomical system and current severity. |

---

### 2.2 `IndicatorCards.svelte` + `UPlotChart.svelte` (`COMP-03`, `COMP-03B`, `COMP-04`)

High-contrast telemetry cards and orbital-density time series:

| Aspect | Exact Specification |
| :--- | :--- |
| **Card Variants** | `vital` (4 crew biomarkers in `COMP-03`) · `habitat` (6 ECLSS parameters in `COMP-03B`) · `compound` (biomarker + embedded *sparkline*) · `zen` (value and status only in Zen Mode). |
| **Drift vs. Baseline Rule** | When a value exhibits a progressive trend relative to its pre-flight *baseline* (e.g., `+3.1 mmHg`) while remaining within the safe threshold, only an **informational drift chip** is rendered **without** tinting the entire card yellow or triggering a false alarm. |
| **Charting Engine (`COMP-04`)** | **`uPlot`** ([`ADR-003`](../SDD/08-Architecture-decisions.md#adr-003)) rendered on a single *canvas* to support thousands of offline samples with zero extra DOM nodes, plotting the actual curve + **NASA-STD-3001** limit band + dashed terrestrial *baseline* line. |
| **Numeric Typography** | `font-variant-numeric: tabular-nums` across all live readouts. |

---

### 2.3 `CountermeasureGuide.svelte` (`COMP-05`)

Actionable medical protocol panel engineered for high mission stress:

| Aspect | Exact Specification |
| :--- | :--- |
| **Fixed Blocks** | 1) Protocol & Severity Header · 2) Interactive verification checklist · 3) Collapsible technical block for the **Flight Surgeon / CMO**. |
| **Cognitive Cap (`ADR-017`)** | **Maximum $\le 4$ actionable steps** visible simultaneously (`3 steps` in the `wireframe.html` SANS protocol, expandable to `4` in SPE). Paginating critical instructions is strictly prohibited. |
| **Variants** | `inline` (`COMP-05` inside the *Cockpit*) · `emergency` (full-screen View B Code Red) · `daily` (preventive ARED / LBNP routine). |
| **Touch Interaction** | Each *checklist* item wraps the entire row in a clickable area $\ge 48\text{ px}$ high with `gap: 12px`, keyboard toggling, and immediate persistence in **IndexedDB / Yjs CRDT**. |

---

### 2.4 `AlarmManager.svelte` (`COMP-00`, `COMP-06` & View B)

Visual, acoustic, and escalation orchestrator for medical or environmental emergencies:

| Level | Visual Behavior | Audio (`960 Hz`) | Escalation (`ADR-013`) |
| :--- | :--- | :--- | :--- |
| **Caution** | `#f59e0b` chip + `▲` + diagonal header border; non-blocking screen | None (strict silence) | Local log + passive notification. |
| **Critical (*Warning / SPE*)** | Optional transition to **View B**; `#ef4444` `3px` border; `#fca5a5` text (`10.61:1`); `role="alert"` | Intermittent **960 Hz** tone synthesized by Web Audio `OscillatorNode` | **`0–10 s`** Local console -> **`2 min`** CMO Role -> **`5 min`** Full cabin broadcast (even over Lock Screen). |

---

## 3. Modal Flows, Zen Mode & Survival Mode (`ADR-019`)

| Mode / Modal | Trigger | UI/UX Behavior |
| :--- | :--- | :--- |
| **Master Caution Modal** | Manual header trigger or combined ECLSS+Bio event | Summary of simultaneous anomalies sorted by severity with a direct link to a $\le 4$-step protocol. |
| **Bio-Passport & DSN Export** | History selection in `COMP-01` | Longitudinal visualization from `L-44` to `R+1` and download of a cryptographically signed JSON package (**WebCrypto ECDSA P-256**) for Earth/DSN downlink. |
| **NASA OSDR Explorer** | Tab 3 (*Anatomical Triage & CDSS*) | Local **SQLite WASM** query of pre-loaded offline analog studies with zero network dependency. |
| **Minimalist Zen Mode** | Header `Zen Mode` button | Hides the simulator (`COMP-06`), detailed history, and progressive views, retaining only the active crew member's critical vitals in enlarged typography. |
| **Survival Mode (`< 350 mW`, `ADR-019`)** | Battery $\le 15\%$ or manual activation | Shuts down WebGL (`Three.js`), disables `uPlot`, forces OLED `#000000` background, freezes CSS animations/pulses, and leaves static tabular vitals and ECLSS readouts targeting $< 5\text{ W}$ power draw. |

---

## 4. Frontend Implementation *Do's & Don'ts*

| Do (`DO`) | Don't (`DON'T`) |
| :--- | :--- |
| Use `--color-alert-red-text` (`#fca5a5`) for all text inside critical alerts ([`ADR-018`](../SDD/08-Architecture-decisions.md#adr-018)). | Place pure red text `#ef4444` on dark `#0c1222` backgrounds (fails WCAG AAA). |
| Keep every button, *checkbox*, and *hotspot* at $\ge 48 \times 48\text{ px}$ with `gap: 12px` (`RNF-USA-01`). | Use compact `32–40 px` controls or `4–8 px` gaps that are error-prone in microgravity. |
| Render Three.js strictly on demand (`0 FPS` at rest) and provide an SVG fallback ([`ADR-004`](../SDD/08-Architecture-decisions.md#adr-004)). | Run a continuous 60 Hz `requestAnimationFrame` loop on the 3D viewer. |
| Cap emergency protocols at $\le 4$ immediate steps ([`ADR-017`](../SDD/08-Architecture-decisions.md#adr-017)). | Present lengthy manuals or multi-step forms during a Code Red. |
| Show only global traffic lights and ECLSS on the lock screen ([`ADR-014`](../SDD/08-Architecture-decisions.md#adr-014)). | Expose heart rate, DEXA, or private symptom values on public displays without PIN/NFC. |
