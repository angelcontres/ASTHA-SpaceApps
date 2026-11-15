# 🏛️ SDD-08: Architecture Decision Records (ADR)
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026

---

Architecture Decision Log for ASTHA. Each ADR contains four sections: **Context**, **Decision**, **Consequences** (bulleted), and **Alternatives** (semicolon-separated). Each section is capped at 50 words (80 in exceptional cases). Requirement IDs follow the SRS ([ADR-001](#adr-001)). The C4 model resides in [../c4/](../c4/00-README.md).

Statuses: **Proposed** (draft for review) · **Accepted** · **Pending** (awaiting team response) · **Superseded**.

## Decision Index

| ADR | Title | Status |
| --- | --- | --- |
| [001](#adr-001) | Source of authority for requirements | Accepted |
| [002](#adr-002) | Offline-first autonomous node without WAN | Accepted |
| [003](#adr-003) | Compiled UI: Svelte 5, uPlot, and system fonts | Accepted |
| [004](#adr-004) | On-demand rendered 3D avatar with Three.js | Accepted |
| [005](#adr-005) | Event-driven clinical computation in Web Workers | Accepted |
| [006](#adr-006) | IndexedDB persistence encrypted with Web Crypto | Accepted |
| [007](#adr-007) | Secure context with internal CA and mDNS | Accepted |
| [008](#adr-008) | Star-topology synchronization with an optional Sync Hub | Accepted |
| [009](#adr-009) | CRDT with hybrid logical clock and version vector | Accepted |
| [010](#adr-010) | Ground link: signed JSON outside the system | Accepted |
| [011](#adr-011) | Drift detection via Modified Z-Score (MAD) | Accepted |
| [012](#adr-012) | Medical data access under the Privacy Act of 1974 and HIPAA | Accepted |
| [013](#adr-013) | Escalation of unacknowledged critical alarms | Accepted |
| [014](#adr-014) | Cabin displays: habitat telemetry and global status indicator | Accepted |
| [015](#adr-015) | Startup measured to the lock screen | Accepted |
| [016](#adr-016) | Physiological telemetry with a single daily record | Accepted |
| [017](#adr-017) | Countermeasure protocols capped at 4 steps | Accepted |
| [018](#adr-018) | Text red separated from alarm red | Accepted |
| [019](#adr-019) | Manually activated power survival mode | Accepted |
| [020](#adr-020) | Pre-flight ground provisioning of devices | Accepted |

## Gap Backlog

Empty. Any newly identified gaps are appended here with the next available number.

---

<a id="adr-001"></a>

## ADR-001: Source of authority for requirements

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** SRS §1-§8 · RTM · AC-TECH · CU (folder)

### Context
The repository contains conflicting IDs: SRS, RTM, AC-TECH, and folder-level CUs define RNF-POW, RNF-NET, and CUs with differing values (5 W vs. 350 mW, DTN vs. mDNS). Without a rule, decisions could rely on contradictory requirements.

### Decision
The SRS prevails, and the domain document sets the thresholds. RTM, AC-TECH, HU, and CU are aligned to the SRS. An explicit team decision may override the SRS, but only if recorded in an ADR.

### Consequences
- ADRs and the C4 model cite SRS IDs.
- RTM, AC-TECH, and CU-10..12 must be updated.
- Gaps are marked GAP; no requirements are invented.

### Alternatives
Treat the RTM as authoritative; rewrite the SRS from the ACs; maintain both catalogs with distinct prefixes.

---

<a id="adr-002"></a>

## ADR-002: Offline-first autonomous node without WAN

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** SRS §1, RF-EVA-07, RNF-NET-01, RNF-NET-02

### Context
The spacecraft has no Internet connectivity and one-way Earth latency reaches 22 min. RF-EVA-07 and RNF-NET-01 forbid external packets. Triage cannot depend on another device or on the network.

### Decision
Every device runs the full PWA: data, rules, catalogs, and assets are bundled and served by the Service Worker. The LAN only synchronizes; it is never required for classification or alerting.

### Consequences
- Zero CDNs and zero remote resources.
- Triage works even when the LAN is down.
- CDNs and remote OSDR queries must be removed from the prototype.
- Initial installation requires the Hub or provisioning.

### Alternatives
Central spacecraft server with thin clients; native per-platform app; Electron.

---

<a id="adr-003"></a>

## ADR-003: Compiled UI: Svelte 5, uPlot, and system fonts

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-POW-01..04, RNF-PER-02, RF-DSH-01..04

### Context
RNF-POW-01..04 sets CPU ≤ 3%, < 350 mW, RAM ≤ 150 MB, and bundle ≤ 5 MB; RNF-PER-02 mandates startup < 1.5 s. The prototype loads Tailwind, Chart.js, and Lucide from CDNs.

### Decision
Svelte 5 (compiled, no VDOM) for the UI, uPlot on 2D canvas for time series, system fonts, and custom CSS using the WIREFRAME tokens.

### Consequences
- Runtime of a few tens of KB.
- Only changed DOM nodes are updated.
- index.html must be rewritten.
- uPlot threshold bands are drawn using custom hooks.

### Alternatives
React + Recharts; vanilla JavaScript + Chart.js; Preact + Chart.js.

---

<a id="adr-004"></a>

## ADR-004: On-demand rendered 3D avatar with Three.js

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RF-ANA-01..04, RNF-POW-01, RNF-POW-04 · SPEC §2 and §4.2

### Context
The team mandates a 3D avatar (SPEC); the SRS only requests an interactive front and back body. The prototype renders in a continuous loop with auto-rotation, which is incompatible with CPU ≤ 3% and zero polling.

### Decision
Locally bundled Three.js, only inside the Anatomy Viewer, single WebGL context, and one frame rendered per change. Alert pulses in an HTML layer, with SVG fallback.

### Consequences
- 0 frames/s during passive monitoring.
- +150-180 KB gzip added to bundle.
- RAM footprint to be measured.
- No auto-rotation.
- Crew overview uses SVG.

### Alternatives
SVG-only avatar; 3D on console and SVG on tablets; pre-rendered sprites or video.

---

<a id="adr-005"></a>

## ADR-005: Event-driven clinical computation in Web Workers

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-PER-01, RNF-POW-01, RF-EVA-07

### Context
RNF-PER-01 requires triage < 50 ms and RNF-POW-01 prohibits polling; the SRS itself suggests Web Workers. The prototype computes on the main thread using timers.

### Decision
Two Dedicated Workers: Clinical Engine (pure TypeScript, rules as data) and Data & Sync. They communicate via postMessage; nothing executes without an event.

### Consequences
- Main thread only paints.
- Deterministic, testable engine.
- Message serialization overhead ~1 ms.
- fetch and WebSocket forbidden in the engine (lint).

### Alternatives
Everything on the main thread; a single worker; a SharedWorker across all tabs.

---

<a id="adr-006"></a>

## ADR-006: IndexedDB persistence encrypted with Web Crypto

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-SEC-01, RNF-SEC-03, RNF-SEC-04, SRS §5.2 · AC-TECH-06

### Context
RNF-SEC-01 requires AES-GCM 256 with crypto.subtle, RNF-SEC-03 SHA-256 per record, and RNF-SEC-04 an append-only log. AC-TECH-06 mentions SQLite/SQLCipher, which requires WASM in the browser.

### Decision
IndexedDB storing {id, hlc, autor, iv, ct, sha256, firma} envelopes; native AES-GCM 256, SHA-256, and Ed25519; key derived from PIN via PBKDF2; per-device chained audit log.

### Consequences
- Zero WASM and zero external crypto libraries.
- Requires a secure context (HTTPS).
- Ed25519 requires modern browsers.
- PBKDF2 may impact startup time (pending).

### Alternatives
SQLCipher in WASM; encrypted localStorage; encryption only on the Hub.

---

<a id="adr-007"></a>

## ADR-007: Secure context with internal CA and mDNS

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-NET-03, RNF-SEC-01, RNF-PER-02

### Context
crypto.subtle and Service Workers require HTTPS. RNF-NET-03 mandates discovery under 3 s without manual IP configuration. No public CA is reachable aboard the spacecraft.

### Decision
The Hub serves https://astha.local with a certificate from a spacecraft internal CA, whose root is installed on each device, and advertises astha.local via mDNS.

### Consequences
- Same origin across all devices.
- Provisioning and rotation still to be defined (GAP).
- Depends on OS resolution of .local.
- Without the Hub, the already-installed PWA remains operational.

### Alternatives
Per-device self-signed certificate; http://localhost on each device; static IP with certificate.

---

<a id="adr-008"></a>

## ADR-008: Star-topology synchronization with an optional Sync Hub

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-NET-01..03 · CU-10, HU-15, AC-TECH-04

### Context
CU-10, HU-15, and AC-TECH-04 request a P2P mesh without a single point of failure (UDP gossip, BLE mesh), but browsers lack access to UDP and BLE mesh. RNF-NET-01 does allow local WebSockets.

### Decision
A single optional Rust Sync Hub in a star topology: devices send it CRDT deltas over WSS (astha.local). If the Hub goes down, each device stays autonomous and converges upon return.

### Consequences
- The Hub is a single point of failure only for convergence, not for triage.
- CU-10, HU-15, and AC-TECH-04 must be updated.
- One additional host: minimal hardware and low power draw.

### Alternatives
Two replicated Hubs; WebRTC mesh with signaling server; native app with BLE mesh.

---

<a id="adr-009"></a>

## ADR-009: CRDT with hybrid logical clock and version vector

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-NET-02 · CU-10 FA-01, AC-TECH-04

### Context
RNF-NET-02 requires lossless merging using "LWW with vector clocks"; CU-10 cites Lamport clocks and the specification cites a hybrid clock. LWW requires total order; vectors only provide partial order.

### Decision
Custom CRDT: G-Set for all clinical data, LWW-Map for preferences, and PN-Counter for XP. HLC (time, counter, node) orders LWW entries; per-node version vector determines which deltas to exchange.

### Consequences
- No clinical data is ever overwritten: append-only.
- Idempotent, coordination-free merge.
- HLC tolerates skewed clocks.
- RNF-NET-02 and CU-10 must be refined.

### Alternatives
Vector clocks only; Lamport clocks only; Automerge or Yjs (heavier bundle).

---

<a id="adr-010"></a>

## ADR-010: Ground link: signed JSON outside the system

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-NET-04, RF-GUI-05, RF-REG-02 · CU-11, HU-14, AC-TECH-05

### Context
RNF-NET-04 calls for exporting signed JSON for the DSN. CU-11, HU-14, and AC-TECH-05 assign ASTHA the RFC 5050 DTN bundle, a 30-day queue, and response reception.

### Decision
ASTHA stops at the file: the CMO exports an Ed25519-signed JSON and hands it to the spacecraft communications system, which packages and transmits it via DTN/DSN.

### Consequences
- ASTHA has zero external network routes (RNF-NET-01 is trivially verifiable).
- No DTN queue or response ingestion.
- CU-11, HU-14, and AC-TECH-05 must be updated.

### Alternatives
ASTHA builds DTN bundles and persistent queue; direct transponder integration; transmission via Sync Hub.

---

<a id="adr-011"></a>

## ADR-011: Drift detection via Modified Z-Score (MAD)

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RF-DER-01..04, D-01..D-03, RNF-PER-01 · AC-CLIN-02

### Context
RF-DER-03 uses a classical z-score (mean and standard deviation over days 1-14), whereas RNF-PER-01, the README, and AC-CLIN-02 cite Hoaglin and Iglewicz's Modified Z-Score. With few days, the mean is sensitive to outliers.

### Decision
Use M = 0.6745·(x − median)/MAD over the days 1-14 baseline, raising an early alert if |M| ≥ 2.5. The 7-day regression (D-01) and combined pattern (D-03) are retained.

### Consequences
- Baseline resilient to outliers.
- RF-DER-03 and D-02 must be updated in the SRS.
- If MAD = 0 (constant series), no D-02 alert is emitted.
- Minimal cost: the median is computed once.

### Alternatives
Classical Z-score from the SRS; both z-scores in parallel; regression only without z-score.

---

<a id="adr-012"></a>

## ADR-012: Medical data access under the Privacy Act of 1974 and HIPAA

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-SEC-01, RNF-SEC-02, RNF-NET-04, RF-REG-02

### Context
RNF-SEC-02 requires local RBAC without specifying the mechanism. The Privacy Act of 1974 and HIPAA restrict access to authorized medical personnel and the astronaut themselves, require anonymizing external non-medical uses, and mandate secure repositories such as LSAH.

### Decision
Each crew member has their own data key, wrapped with both their PIN and the CMO's PIN. Only the owner and medical staff can decrypt. Exports for non-medical uses are anonymized.

### Consequences
- Isolation is cryptographic, not merely UI-level.
- Provisioning is more complex (ADR-020).
- The Hub and cabin displays cannot read clinical data.
- Anonymization format still needs definition.

### Alternatives
Shared key with UI-only permissions; encryption at rest without per-crew separation; delegating control to the operating system.

---

<a id="adr-013"></a>

## ADR-013: Escalation of unacknowledged critical alarms

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-USA-04, RF-GAM-03, RF-EVA-06

### Context
RNF-USA-04 defines an 800-1200 Hz tone for criticals and silent cautions, but not what happens if nobody acknowledges the alert. A continuous tone causes alarm fatigue; a single tone can be missed.

### Decision
A critical alarm sounds for 10 s. If unacknowledged after 2 min, it sounds again and replicates to the CMO console. After 5 min, it also alerts on cabin displays.

### Consequences
- Requirement must be added to the SRS.
- Replication to CMO and cabin depends on the Hub (ADR-008).
- Without the Hub, escalation is local only.
- Acknowledgment is recorded in the audit log.

### Alternatives
Sound continuously until acknowledged; sound once only; escalate to the Commander.

---

<a id="adr-014"></a>

## ADR-014: Cabin displays: habitat telemetry and global status indicator

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RF-DSH-03, RF-DSH-04, RNF-SEC-02 · ADR-012

### Context
ADR-012 restricts clinical data to the owner and medical staff. Cabin displays are visible to all crew and hold no crew keys. What they show must be decided without violating the Privacy Act.

### Decision
They show ECLSS/CANS telemetry and a Nominal/Caution/Critical status light per crew member, without values, rules, or organ systems. Global status travels in a separate record encrypted with the habitat key.

### Consequences
- Crew-wide situational awareness.
- Minimal identifiable data is disclosed, intentionally accepted.
- The Engine must publish a status-only record.
- Displays never acknowledge alerts.

### Alternatives
Habitat only; habitat plus anonymous status; displays with full clinical data.

---

<a id="adr-015"></a>

## ADR-015: Startup measured to the lock screen

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-PER-02, RNF-SEC-01, RNF-SEC-02 · ADR-012, ADR-014

### Context
RNF-PER-02 demands the dashboard in under 1.5 s, but ADR-012 requires PIN unlock and PBKDF2 can take hundreds of ms. Lowering iterations weakens encryption.

### Decision
The 1.5 s budget is measured to the lock screen, which already displays habitat telemetry and the global status indicator (ADR-014). The personal dashboard opens after PIN entry, outside that budget.

### Consequences
- PBKDF2 retains high iteration counts.
- Situational awareness is available before PIN entry.
- RNF-PER-02 must be clarified in the SRS.
- Unlock latency budget still needed (proposed: < 1 s).

### Alternatives
Persistent session until reboot; PIN within 1.5 s with fewer iterations; no PIN, using the device key.

---

<a id="adr-016"></a>

## ADR-016: Physiological telemetry with a single daily record

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RF-ING-01, RF-ING-03, RNF-POW-03, SRS §5.1 · RTM, CU-01

### Context
SRS §5.1 defines one daily measurement per crew member (180 days). The RTM and CU-01 describe continuous 1 Hz ingestion over BLE, multiplying CPU, RAM, and storage, and requiring Web Bluetooth in the browser.

### Decision
One daily physiological record per crew member, entered manually or from the synthetic dataset. Simulator scenarios inject discrete records, not continuous streams.

### Consequences
- About 720 measurements over 180 days: well below 150 MB.
- No Web Bluetooth or sensor bridge required.
- RF-ING-01 in the RTM and CU-01 must be updated.
- Habitat telemetry falls outside this decision.

### Alternatives
Continuous 1 Hz; daily logging with 1 Hz streaming in the demo only; event-driven sensor ingestion.

---

<a id="adr-017"></a>

## ADR-017: Countermeasure protocols capped at 4 steps

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-USA-05, RF-GUI-01..04 · AC-CLIN-06

### Context
RNF-USA-05 permits up to 7 steps per procedure; AC-CLIN-06 caps at 4. Crew members act under stress, fatigue, and in gloves, and each extra step increases cognitive load.

### Decision
Every protocol has at most 4 actionable steps, alongside the three blocks of RF-GUI-01. If a countermeasure requires more, it is split into chained protocols.

### Consequences
- AC-CLIN-06 overrides the SRS (recorded exception, ADR-001).
- RNF-USA-05 must be updated.
- The Countermeasure Resolver enforces ≤ 4 steps.
- SPE and LBNP may require chaining.

### Alternatives
7 steps (SRS); 4 in emergencies and 7 in routine care; no fixed limit.

---

<a id="adr-018"></a>

## ADR-018: Text red separated from alarm red

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-USA-03, RF-ANA-03 · WIREFRAME §4.1

### Context
RNF-USA-03 requires contrast ≥ 7:1 (WCAG AAA). The WIREFRAME token alert-red (#ef4444) achieves 5.35:1 on the background and 4.96:1 on cards, making it unsuitable for text.

### Decision
#ef4444 is reserved for fills, borders, and the pulse. A new token, alert-red-text (#fca5a5, 10.6:1), is used for all critical-state text.

### Consequences
- Alarm red remains unchanged.
- All critical text achieves AAA compliance.
- The token must be added to WIREFRAME §4.1.
- Under 630 nm red spectral mode, symbol and pattern remain mandatory.

### Alternatives
Lighten alert-red to #f87171; keep #ef4444 with an AA exception; white text on a red background.

---

<a id="adr-019"></a>

## ADR-019: Manually activated power survival mode

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-POW-01, RNF-POW-02 · CU-12, AC-TECH-02 §3

### Context
CU-12 and AC-TECH-02 require cutting power consumption upon receiving a critical battery signal from the EPS. This is absent from the SRS, and the browser cannot receive that spacecraft signal.

### Decision
The Commander activates a "survival mode": no 3D avatar or charts, CSS-dimmed brightness, and sync restricted to critical events. Triage and alarms remain intact. Later, the Hub may relay the EPS signal.

### Consequences
- Zero dependency on spacecraft hardware.
- Requirement must be added to the SRS and CU-12 adjusted.
- Activation relies on a human operator.
- Hub-based relay remains future work.

### Alternatives
Out of scope; device Battery Status API; EPS signal via Hub from day one.

---

<a id="adr-020"></a>

## ADR-020: Pre-flight ground provisioning of devices

**Status:** Accepted · **Date:** 2026-11-15 · **Requirements:** RNF-SEC-01, RNF-SEC-02, RNF-NET-03 · ADR-007, ADR-012

### Context
ADR-007 and ADR-012 require an internal CA, per-device Ed25519 keys, and PIN-wrapped per-crew keys. No source defines who installs them or when, and no IT support exists onboard.

### Decision
Engineering prepares every device on the ground: CA root, PWA installed, device key enrolled in the Hub, and per-crew keys wrapped with PINs. In flight, the CMO only swaps tablets using a defined procedure.

### Consequences
- The crew does not manage cryptography.
- An onboard tablet-replacement procedure is required.
- In-flight PIN changes must re-wrap keys.
- Requirement must be added to the SRS.

### Alternatives
Onboard by the CMO; hybrid (CA on ground, enrollment onboard); no per-crew keys.
