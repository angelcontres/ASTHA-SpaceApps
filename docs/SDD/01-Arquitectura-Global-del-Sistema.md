# 🏛️ SDD-01: Global System Architecture
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Reference Standards:** NASA-STD-8739.8 | IEEE Std 1016-2009 | ISO/IEC/IEEE 29148 | **ADRs:** 001, 002, 003, 005, 011, 015, 019

---

## 1. Architectural Style: Hexagonal + Event-Driven Edge Workers

In accordance with **[ADR-003](08-Architecture-decisions.md#adr-003)** and **[ADR-005](08-Architecture-decisions.md#adr-005)**, ASTHA implements a **Hexagonal (Ports & Adapters)** architecture executed entirely on the client layer (**Offline PWA**), where the main UI thread is isolated from clinical computation and persistence by **two event-driven Dedicated Web Workers** (zero polling).

```text
+----------------------------------------------------------------------------------------+
|               CREW PWA — MAIN THREAD (COMPILED VDOM-LESS UI - ADR-003)                 |
|   Svelte 5 Runes UI  |  uPlot 2D Canvas  |  On-Demand Three.js (ADR-004) + SVG         |
|   Web Audio (800-1200Hz RNF-USA-04)      |  WCAG AAA Tokens (alert-red-text ADR-018)   |
+----------------------------------------------------------------------------------------+
                 │ ▲ (postMessage: UI Commands / Triage Results < 50ms)
                 ▼ │
+----------------------------------------------------------------------------------------+
|            CLINICAL ENGINE WORKER (DETERMINISTIC DEDICATED WORKER - ADR-005)           |
|   O(rules) Pipeline: RF-ING-05 Validation ➔ RF-EVA-01 Classification ➔ Sustained       |
|   R-ENV..R-CARD Correlation ➔ D-01..D-03 Drift (MAD ADR-011) ➔ <=4-Step Resolver       |
|   [FORBIDDEN: fetch, WebSocket, DOM, timers/polling]                                   |
+----------------------------------------------------------------------------------------+
                 │ ▲ (MessageChannel: Validated records and events)
                 ▼ │
+----------------------------------------------------------------------------------------+
|           DATA & SYNC WORKER (ENCRYPTED PERSISTENCE & LAN SYNC - ADR-006/008/009)      |
|   IndexedDB Web Crypto (AES-GCM 256, SHA-256, Ed25519, PBKDF2) | Append-Only Ledger    |
|   CRDT (G-Set, LWW-Map, PN-Counter + HLC) | WSS Client (astha.local) | DSN JSON Export |
+----------------------------------------------------------------------------------------+
```

---

## 2. Aerospace Design Principles and Domain Constraints

### 2.1 Edge-First Autonomy and Zero WAN (`ADR-002`, `RF-EVA-07`, `RNF-NET-01`)
* **Closed Network Boundary:** ASTHA operates as a fully autonomous node on each crew tablet or medical console. It neither sends nor receives Internet traffic (zero remote APIs, zero CDNs).
* **Cache-Only Service Worker:** Following ground provisioning (**[ADR-020](08-Architecture-decisions.md#adr-020)**), all assets and the 180-day synthetic dataset ($\le 5.0\text{ MB}$ total per `RNF-POW-04`) are served exclusively from local Cache Storage.
* **Decoupled Ground Link (`ADR-010`):** The software does not implement an interplanetary DTN networking stack inside the browser; it generates a **cryptographically Ed25519-signed JSON file** (`RNF-NET-04`), which the CMO hands off to the spacecraft communications router.

### 2.2 Power, Compute, and Startup Budgets (`RNF-POW-01..04`, `RNF-PER-01..02`)

| Budget (SRS §4.1) | Strict Limit | ASTHA Design Strategy | Supporting ADR |
| :--- | :---: | :--- | :--- |
| **Idle CPU Usage (`RNF-POW-01`)** | $\le 3.0\%$ | Zero `setInterval` or `requestAnimationFrame` loops. Workers sleep until a `postMessage` event. 3D avatar at 0 passive FPS. | ADR-003, ADR-004, ADR-005 |
| **Power Consumption (`RNF-POW-02`)** | $< 350\text{ mW}$ (16h) | `#030712` background (OLED pixels off), `powerPreference: 'low-power'`, suspension on `visibilitychange`. | ADR-003, ADR-019 |
| **RAM Memory (`RNF-POW-03`)** | $\le 150\text{ MB}$ | 720 measurements in `Float32Array` ($< 1\text{ MB}$); WebGL disposal (`dispose()`) upon leaving anatomy view. | ADR-004, ADR-016 |
| **Bundle Weight (`RNF-POW-04`)** | $\le 5.0\text{ MB}$ | Compiled Svelte 5 (~KB), uPlot (~KB), local modular Three.js, synthetic dataset (~273 KB). *Excludes 24 MB files.* | ADR-003, C4-02 |
| **Triage Latency (`RNF-PER-01`)** | $< 50\text{ ms}$ | $O(1)$ rolling sums for 7-day regression and deterministic rule evaluation inside Worker. | ADR-005, ADR-011 |
| **Cold Startup (`RNF-PER-02`)** | $< 1.5\text{ s}$ | Measured to the **lock screen**, which already displays ECLSS telemetry and global status lights (without waiting for PIN PBKDF2 derivation). | ADR-014, ADR-015 |

### 2.3 Power Survival Mode (`ADR-019`)
During a spacecraft electrical power contingency, the Commander manually activates **Survival Mode**:
* Completely disables the 3D avatar WebGL context (switches to static SVG) and disables historical charts.
* Dims display brightness via CSS and restricts WSS synchronization strictly to critical-severity events.
* The clinical evaluation pipeline and 800–1200 Hz audible alarms remain 100% operational.

---

## 3. Physiological Drift Detection Algorithms (`RF-DER-01..04`)

The `Clinical Engine Worker` executes three complementary detectors on every daily logging event:

1. **D-01 (7-Day Linear Regression Projection — `RF-DER-01`, `RF-DER-02`):**
   Computed in $O(1)$ time complexity by maintaining rolling sums ($\Sigma x, \Sigma y, \Sigma xy, \Sigma x^2$). Emits an early alert if the 7-day projected line crosses a caution threshold while the current value is still nominal.
2. **D-02 (Modified Z-Score with MAD — `ADR-011`, `RF-DER-03`):**
   Over the individual baseline from mission days 1–14, the Median ($\tilde{x}$) and Median Absolute Deviation ($MAD$) are computed:
   $$\text{MAD} = \text{median}(|x_i - \tilde{x}|), \qquad M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{\text{MAD}}$$
   If $|M_i| \ge 2.5$ (guarded by `MAD > 0`), an outlier-immune early alert is triggered.
3. **D-03 (Multivariate Combined Pattern — `RF-DER-04`):**
   Correlates a sustained negative slope in sleep hours together with a positive slope in diastolic blood pressure (DBP / PAD) within the same 7-day window.
