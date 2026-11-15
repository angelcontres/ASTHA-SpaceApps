# 🧭 SDD-07: Complete Traceability Matrix (SRS ⟷ ADRs ⟷ SDD)
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Reference Standards:** ISO/IEC/IEEE 29148 | NASA-STD-8739.8 | IEEE Std 1016-2009 | **Authority Rule:** ADR-001

---

## 1. Functional Requirements Coverage (`42 RF` from SRS)

This matrix links the **42 official Functional Requirements** defined in Section 3 of the **SRS** to their design entities, components, and flows in the **SDD**, indicating the **ADR** that ratifies or refines each decision.

### 1.1 Data Ingestion (`RF-ING-01..07`)

| SRS ID | Priority | SRS Requirement | SDD Component / Class | Applicable ADR | Design Verification |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-ING-01`** | M | Logging of 9 daily variables with large glove-friendly controls | `DailyMeasurement`, `TacticalHUD` ($\ge 48\text{ px}$) | [ADR-016](08-Architecture-decisions.md#adr-016) | SDD-02, SDD-06 (JSON Schema) |
| **`RF-ING-02`** | M | Environmental telemetry: $pp\text{CO}_2$, pressure, $\% O_2$, radiation ($\mu\text{Sv/h}$) | `HabitatTelemetry`, `Data & Sync Worker` | [ADR-014](08-Architecture-decisions.md#adr-014) | SDD-02, SDD-06 |
| **`RF-ING-03`** | M | Simulate bio-monitor and replay 180-day synthetic dataset | `LocalDatasets` (in `Data & Sync Worker`) | [ADR-002](08-Architecture-decisions.md#adr-002), [ADR-016](08-Architecture-decisions.md#adr-016) | SDD-04 (~273 KB in bundle) |
| **`RF-ING-04`** | M | Report subjective symptoms (closed catalog) with one tap | `SubjectiveSymptom` (6 symptoms in SDD-06) | — | SDD-02, SDD-06 |
| **`RF-ING-05`** | S | Validate plausible bounds and flag suspects **without discarding** | `RangeValidator` (`isSuspect = true`) | [ADR-005](08-Architecture-decisions.md#adr-005) | SDD-03 (Scenario A), SDD-04 |
| **`RF-ING-06`** | S | Import and export history in JSON | `ExportBuilder` / `Data & Sync Worker` | [ADR-010](08-Architecture-decisions.md#adr-010) | SDD-04, SDD-06 |
| **`RF-ING-07`** | C | Pupillary reflex test or camera skin scan | *Deferred outside MVP* (C4 `00-README §2.1`: requires `getUserMedia` without power budget) | [ADR-001](08-Architecture-decisions.md#adr-001) | Explicitly documented as an accepted GAP (Priority C) |

### 1.2 Evaluation and Triage (`RF-EVA-01..07`)

| SRS ID | Priority | SRS Requirement | SDD Component / Class | Applicable ADR | Design Verification |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-EVA-01`** | M | Classify each indicator (Nominal, Caution, Critical) | `ThresholdEval` in `Clinical Engine Worker` | [ADR-001](08-Architecture-decisions.md#adr-001) | SRS §6.1 / Domain thresholds |
| **`RF-EVA-02`** | M | Crew member global status = worst active state | `ClinicalEngine.evaluateRecord()` | [ADR-014](08-Architecture-decisions.md#adr-014) | SDD-02, SDD-04 |
| **`RF-EVA-03`** | M | Assign each finding to one of the 7 organ systems | `OrganMapper` / `ClinicalAlert.organSystem` | [ADR-004](08-Architecture-decisions.md#adr-004) | SDD-02, SDD-04 |
| **`RF-EVA-04`** | M | Apply 10 environmental-physiological correlation rules | `CorrEngine` (`R-ENV`..`R-CARD`) | [ADR-005](08-Architecture-decisions.md#adr-005) | SDD-04, Section 3 below |
| **`RF-EVA-05`** | M | Sustained conditions (`HRV < 20ms`; `sleep < 5.5h >= 2d`) | `Threshold & Sustained Engine` | [ADR-016](08-Architecture-decisions.md#adr-016) | SDD-04 |
| **`RF-EVA-06`** | M | Explainability: rule, triggering values, and threshold | `ClinicalAlert` (`ruleId`, `triggeringValues`, `thresholdRef`) | — | SDD-02 |
| **`RF-EVA-07`** | M | Evaluation with zero network packets sent or received | `Clinical Engine Worker` (no `fetch` or `WS`) | [ADR-002](08-Architecture-decisions.md#adr-002), [ADR-005](08-Architecture-decisions.md#adr-005) | SDD-01, SDD-04 (lint rule) |

### 1.3 Drift Detection (`RF-DER-01..04`)

| SRS ID | Priority | SRS Requirement | SDD Component / Class | Applicable ADR | Design Verification |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-DER-01`** | M | Linear regression trend over 7-day rolling window | `DriftDetector` (`D-01`: $O(1)$ rolling sums) | [ADR-005](08-Architecture-decisions.md#adr-005) | SDD-01, SDD-02 |
| **`RF-DER-02`** | M | Early alert if 7-day projection crosses caution | `DriftDetector` (`D-01`) | — | SDD-01 |
| **`RF-DER-03`** | S | 14-day baseline and z-score $\ge 2.5$ | `DriftDetector` (`D-02`: **Modified Z-Score MAD**) | [ADR-011](08-Architecture-decisions.md#adr-011) | Reconciled by ADR-011 (SDD-01) |
| **`RF-DER-04`** | M | Combined pattern (decreasing sleep + increasing DBP / PAD) | `DriftDetector` (`D-03`) | — | SDD-01 |

### 1.4 Countermeasure Guide (`RF-GUI-01..05`)

| SRS ID | Priority | SRS Requirement | SDD Component / Class | Applicable ADR | Design Verification |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-GUI-01`** | M | 3 mandatory blocks: anatomical impact, severity/time, actions | `CountermeasureProtocol` / `CountermeasureUI` | [ADR-017](08-Architecture-decisions.md#adr-017) | SDD-02, SDD-03 (Scenario B) |
| **`RF-GUI-02`** | M | Sequential, verifiable actions (checkbox per step) | `CountermeasureUI` (maximum 4 steps) | [ADR-017](08-Architecture-decisions.md#adr-017) | SDD-03 (Scenario B) |
| **`RF-GUI-03`** | M | Onboard resources only (ARED, LBNP, med kit, shelter, LiOH/CDRA) | `CounterResolver` (closed JSON catalog) | [ADR-017](08-Architecture-decisions.md#adr-017) | SDD-04 |
| **`RF-GUI-04`** | M | Non-medical plain language and term definitions | `CountermeasureUI` | — | SDD-04 |
| **`RF-GUI-05`** | S | Indicate what to send asynchronously to Flight Surgeon | `ExportBuilder` (signed JSON for DSN) | [ADR-010](08-Architecture-decisions.md#adr-010) | SDD-03 (Scenario C) |

### 1.5 Anatomical Model, Dashboard, Gamification, Simulator, and Logging (`RF-ANA`, `RF-DSH`, `RF-GAM`, `RF-SIM`, `RF-REG`)

| SRS ID | Priority | SRS Requirement | SDD Component / Class | Applicable ADR | Design Verification |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-ANA-01..04`** | M | Interactive front/back body, 5 regions, color + symbol, detail view | `AnatomyViewer` (On-demand Three.js + SVG fallback) | [ADR-004](08-Architecture-decisions.md#adr-004), [ADR-018](08-Architecture-decisions.md#adr-018) | SDD-03 (Scenario B), SDD-04 |
| **`RF-DSH-01..04`** | M/S | Cards, charts with threshold bands, crew selector, habitat telemetry | `TacticalHUD` (Svelte 5 + `uPlot` 2D canvas) | [ADR-003](08-Architecture-decisions.md#adr-003), [ADR-014](08-Architecture-decisions.md#adr-014) | SDD-04, SDD-05 |
| **`RF-GAM-01..03`** | M/S | XP/badges, streaks, never hide or delay clinical alerts | `GamificationCalc`, `PNCounter` (CRDT) | [ADR-009](08-Architecture-decisions.md#adr-009), [ADR-013](08-Architecture-decisions.md#adr-013) | SDD-02, SDD-03 (Scenario B) |
| **`RF-SIM-01..05`** | M/S | Crisis scenarios A (SPE), B (SANS), C (CO2), D (Renal stone), Reset | `CrisisSimUI` ➔ injects records into `Clinical Engine` | [ADR-016](08-Architecture-decisions.md#adr-016) | SDD-03 (Scenario A), SDD-04 |
| **`RF-REG-01..03`** | M/S | Local audit log, async export, high-contrast and large-text mode | `AuditLedger`, `SignedDsnExport`, AAA CSS Tokens | [ADR-006](08-Architecture-decisions.md#adr-006), [ADR-010](08-Architecture-decisions.md#adr-010), [ADR-018](08-Architecture-decisions.md#adr-018) | SDD-02, SDD-06 |

---

## 2. Non-Functional Requirements Coverage (`19 RNF` + `RNF-09` from SRS)

| SRS ID | Non-Functional Requirement | Architectural Design in SDD | Supporting ADR | Verification Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **`RNF-POW-01`** | Idle CPU $\le 3.0\%$, zero polling | Sleeping Web Workers, VDOM-less Svelte, 0 FPS passive Three.js | [ADR-003](08-Architecture-decisions.md#adr-003), [ADR-004](08-Architecture-decisions.md#adr-004), [ADR-005](08-Architecture-decisions.md#adr-005) | Performance Profiler (4x throttling) |
| **`RNF-POW-02`** | 16h endurance ($< 350\text{ mW}$) | OLED `#030712`, `low-power` GPU, manual Survival Mode | [ADR-003](08-Architecture-decisions.md#adr-003), [ADR-019](08-Architecture-decisions.md#adr-019) | 8h tablet battery drain measurement |
| **`RNF-POW-03`** | RAM $\le 150\text{ MB}$ | `Float32Array` ($< 1\text{ MB}$), WebGL `dispose()`, 1 record/day | [ADR-004](08-Architecture-decisions.md#adr-004), [ADR-016](08-Architecture-decisions.md#adr-016) | DevTools Heap Snapshot |
| **`RNF-POW-04`** | Total bundle $\le 5.0\text{ MB}$ | Svelte 5 + uPlot + local Three.js + dataset (~273 KB). Excludes 24 MB | [ADR-003](08-Architecture-decisions.md#adr-003) | Total `npm run build` size |
| **`RNF-PER-01`** | Evaluation latency $< 50\text{ ms}$ | $O(\text{rules})$ pipeline and $O(1)$ regression inside Worker | [ADR-005](08-Architecture-decisions.md#adr-005), [ADR-011](08-Architecture-decisions.md#adr-011) | `performance.now()` inside Worker |
| **`RNF-PER-02`** | Cold startup $< 1.5\text{ s}$ | Measured to **lock screen** with habitat and global status light | [ADR-014](08-Architecture-decisions.md#adr-014), [ADR-015](08-Architecture-decisions.md#adr-015) | Offline Lighthouse FCP/TTI |
| **`RNF-USA-01`** | Glove touch $\ge 48\text{ px}$ / $12\text{ px}$ gap | Strict CSS contracts in SDD-06 (`--touch-target-min`) | — | CSS inspection & gloved usability test |
| **`RNF-USA-02`** | Golden rule of $\le 3$ taps | Flat navigation in `App.svelte` / `AnatomyViewer` | — | Tap count per use case |
| **`RNF-USA-03`** | WCAG AAA contrast ($\ge 7:1$) + Red Mode | `alert-red-text #fca5a5` ($10.6:1$) token + $630\text{ nm}$ mode | [ADR-018](08-Architecture-decisions.md#adr-018) | WCAG AAA contrast analyzer |
| **`RNF-USA-04`** | Redundant 800–1200 Hz alarms (ISO 9703-2) | Web Audio 10s tone + **2m (CMO) and 5m (Cabin) escalation** | [ADR-013](08-Architecture-decisions.md#adr-013) | Audio spectrum & SDD-03 sequence |
| **`RNF-USA-05`** | 3 blocks and sequential steps | **Reconciled to $\le 4$ steps max** (chained if exceeded) | [ADR-017](08-Architecture-decisions.md#adr-017) | `CounterResolver` validation |
| **`RNF-SEC-01`** | Local `AES-GCM 256` encryption (`crypto.subtle`) | `EncryptedEnvelope` in IndexedDB (`{id, hlc, autor, iv, ct, sha256, firma}`) | [ADR-006](08-Architecture-decisions.md#adr-006) | Raw IndexedDB inspection |
| **`RNF-SEC-02`** | Local RBAC control (Astronaut vs. CMO) | Cryptographic segregation via PIN-wrapped keys (Privacy Act) | [ADR-012](08-Architecture-decisions.md#adr-012), [ADR-020](08-Architecture-decisions.md#adr-020) | Cross-decryption tests |
| **`RNF-SEC-03`** | SEU / Bit-flip resilience via `SHA-256` | SHA-256 verification on read + recovery from Op-Log/peers | [ADR-006](08-Architecture-decisions.md#adr-006) | Byte corruption injection |
| **`RNF-SEC-04`** | Immutable *Append-Only* Ledger | `AuditLedger` chained with previous `SHA-256` + `Ed25519` sig | [ADR-006](08-Architecture-decisions.md#adr-006), [ADR-009](08-Architecture-decisions.md#adr-009) | Immutability tests |
| **`RNF-NET-01`** | LAN sync without Internet (Zero-WAN) | Closed LAN `astha.local` via WSS TLS 1.3 with optional Hub | [ADR-002](08-Architecture-decisions.md#adr-002), [ADR-007](08-Architecture-decisions.md#adr-007), [ADR-008](08-Architecture-decisions.md#adr-008) | Wireshark capture with zero WAN traffic |
| **`RNF-NET-02`** | Partition tolerance (CRDTs) | `G-Set` + `LWW-Map (HLC)` + `PN-Counter` + `VersionVector` | [ADR-009](08-Architecture-decisions.md#adr-009) | Intentional partition & merge |
| **`RNF-NET-03`** | Autonomous discovery $< 3\text{ s}$ | `astha.local` mDNS advertisement from Rust Sync Hub | [ADR-007](08-Architecture-decisions.md#adr-007), [ADR-008](08-Architecture-decisions.md#adr-008) | LAN node onboarding $< 3\text{ s}$ |
| **`RNF-NET-04`** | Signed JSON export for DSN | `SignedDsnExport` signed with `Ed25519` handed off to external router | [ADR-010](08-Architecture-decisions.md#adr-010) | Validation against SDD-06 JSON Schema |
| **`RNF-09`** *(SRS §6)* | Editable thresholds as data | Rules and ranges separated as JSON catalogs in `ClinicalEngine` | [ADR-005](08-Architecture-decisions.md#adr-005) | JSON catalog inspection |

---

## 3. Clinical Rules Coverage (`10 R-*` and `3 D-*` from SRS §6.2–6.3)

All correlation and drift rules execute deterministically inside the **`Clinical Engine Worker`** (`CorrEngine` and `DriftDetector`):

| SRS Rule ID | Clinical Condition | Organ System | Responsible SDD Module |
| :--- | :--- | :--- | :--- |
| **`R-ENV-01`** | $pp\text{CO}_2 > 3.0\text{ mmHg}$ and $SpO_2 < 94\%$ | Respiratory / Environmental | `CorrEngine` (SDD-04) |
| **`R-ENV-02`** | $pp\text{CO}_2 > 3.0\text{ mmHg}$ and Headache | Neuro-ocular | `CorrEngine` (SDD-04) |
| **`R-SANS-01`** | $PAS > 135\text{ mmHg}$ and Blurred vision | Neuro-ocular | `CorrEngine` (SDD-04) |
| **`R-SANS-02`** | $PAS > 135\text{ mmHg}$ and Sleep $< 6\text{ h}$ | Neuro-ocular | `CorrEngine` (SDD-04) |
| **`R-RAD-01`** | Radiation $> 100\ \mu\text{Sv/h}$ | Radiation | `CorrEngine` (SDD-04) |
| **`R-RAD-02`** | Radiation $> 100\ \mu\text{Sv/h}$ and Nausea | Radiation (Emergency) | `CorrEngine` (SDD-04) |
| **`R-COG-01`** | Sleep $< 5.5\text{ h}$ and $HRV < 25\text{ ms}$ | Cognitive | `CorrEngine` (SDD-04) |
| **`R-REN-01`** | Urinary calcium $> 300\text{ mg/day}$ and Lumbar pain | Renal | `CorrEngine` (SDD-04) |
| **`R-REN-02`** | Urinary calcium $250 - 300\text{ mg/day}$ | Renal | `CorrEngine` (SDD-04) |
| **`R-CARD-01`** | Orthostatic dizziness and $HR > 100\text{ bpm}$ | Cardiovascular | `CorrEngine` (SDD-04) |
| **`D-01`** | 7-day linear projection crosses caution threshold | Multi-organ | `DriftDetector` (SDD-01) |
| **`D-02`** | Modified Z-Score $\|M_i\| \ge 2.5$ (`MAD`, `ADR-011`) | Multi-organ | `DriftDetector` (SDD-01) |
| **`D-03`** | Sleep slope $(-)$ and $PAD$ slope $(+)$ over 7 days | Neuro-cardiovascular | `DriftDetector` (SDD-01) |
