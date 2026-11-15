# C4 Architecture — ASTHA (Autonomous Space Telemetry & Health Analytics)

C4 model of ASTHA's **target** architecture: a health-monitoring dashboard running aboard an orbiting spacecraft, with no Internet connectivity and over a single closed LAN. The diagrams use Mermaid (`C4Context`, `C4Container`, `C4Component`, `C4Deployment`), which GitHub renders natively.

| Level | File | Contents |
| --- | --- | --- |
| 1 | [01-contexto.md](01-contexto.md) | Personas, external systems, and LAN boundary |
| 2 | [02-contenedores.md](02-contenedores.md) | PWA, workers, IndexedDB, Service Worker, Sync Hub; power and resource budgets |
| 3 | [03-componentes.md](03-componentes.md) | Clinical Engine, Crew PWA (+ design system spec sheets for 4 UI components), data/sync layer |
| 4 | [04-despliegue.md](04-despliegue.md) | Tablets, CMO console, cabin displays, optional Sync Hub, isolated LAN |

The decisions justifying this model are recorded in the [ADR log](../SDD/08-Architecture-decisions.md).

## 1. Sources and Authority Rule

- **Primary authority:** [SRS](../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md). This is the dated baseline document, conforms to ISO/IEC/IEEE 29148, and defines the IDs `RF-*`, `RNF-*`, `R-*`, `D-*`, `AC-01..05`, and `CU-01..09`.
- **Thresholds:** [Domain Document](../DOCUMENTO_DOMINIO_Y_PROBLEMATICA_ESPACIAL.md). SRS §6 explicitly designates it as the authority.
- **Traceability:** References the [existing RTM](../MATRIZ_DE_TRAZABILIDAD_RTM.md) and the [V&V Matrix](../Criterios-de-aceptacion/MATRIZ_VERIFICACION_Y_VALIDACION_NASA.md). **No new matrix is created.** The C4 tables indicate which requirements each element satisfies, and Section 2 lists what the RTM leaves uncovered.
- **Colliding ID catalogs:** `CU-01..09` in SRS §7 and `CU-01..12` in [Casos-de-uso/](../Casos-de-uso/README.md) carry different meanings. The same applies to `AC-01..05` (SRS) and `AC-CLIN-*` / `AC-TECH-*` (folder). Throughout these documents they are cited as "CU-xx (SRS §7)" or "CU-xx (folder)".
- Markers: **GAP** = no coverage in the repository · **⚠** = contradiction.

## 2. Traceability GAPs

### 2.1 SRS Requirements Without a Row in the RTM

| ID (SRS) | Topic | Where the Architecture Covers It |
| --- | --- | --- |
| RF-ING-06 | JSON import/export | Export Builder (03 §3.3) |
| RF-ING-07 | Camera: pupillary reflex / skin (C) | **Uncovered**: requires `getUserMedia` and has no defined resource budget |
| RF-GAM-01..03 | Gamification | Gamification Scorer and Alarm Manager (03) |
| RF-SIM-01..05 | Crisis simulator | Telemetry Sources and Simulator (03) · the RTM only mentions it in the flow diagram |
| RF-REG-01..03 | Audit log, summary, high contrast | Audit Ledger, Export Builder, and Settings (03) |
| RNF-POW-04 | Bundle ≤ 5 MB | Service Worker (02) |
| RNF-PER-01 | Triage < 50 ms | Clinical Engine, `latencyMs` (03) |
| RNF-PER-02 | Startup < 1.5 s | SW and Svelte (02) · open question regarding PIN unlock |
| RNF-USA-04 | Redundant alarms 800-1200 Hz | Alarm Manager (03) |
| RNF-USA-05 | 3 blocks, ≤ 7 steps (ADR-017 lowers this to 4) | Countermeasure Guide (03) |
| RNF-SEC-02 | Local RBAC | Key Manager (cryptographic RBAC) and Role Guard (03) |
| RNF-SEC-03 | Per-record SHA-256 / SEU | Integrity Guard (03) · the RTM places this under RNF-SEC-04 |
| RNF-NET-04 | Signed JSON for DSN | Export Builder (03) |

### 2.2 RTM IDs with a Different Meaning Than in the SRS

| ID | In the SRS | In RTM / AC / HU |
| --- | --- | --- |
| RF-ING-01 | Manual logging of 9 variables | Continuous 1 Hz ingestion from SmartShirt |
| RF-ING-03 | Simulation and 180-day dataset | Symptom logging (which in the SRS is RF-ING-04) |
| RF-ING-04 | One-tap symptoms | NASA OSDR datasets |
| RF-ING-05 | Flag dubious values **without discarding** | "Validation and **discarding**" |
| RF-DER-03 | Baseline = first 14 days | Pre-flight baseline L-44 |
| RNF-POW-01 | CPU ≤ 3 % | ✅ Resolved: RTM, V&V Matrix and AC-TECH-02 now use the SRS meaning |
| RNF-POW-02 | < 350 mW, 16 h battery life | ✅ Resolved: RTM, V&V Matrix and AC-TECH-02 now use the SRS meaning |
| RNF-POW-03 | RAM ≤ 150 MB | ✅ Resolved: the 0.2 fps contingency mode is traced to ADR-019, not to an SRS RNF |
| RNF-USA-01 | Glove-friendly touch 48 px / 12 px | Jargon-free language |
| RNF-USA-02 | 3-tap rule | Touch response < 100 ms |
| RNF-SEC-04 | Append-only audit log | SEU bit-flips with CRC32 |
| RNF-NET-01 | LAN sync without WAN | 100 % offline operation |
| RNF-NET-03 | mDNS discovery < 3 s | DTN Bundle Protocol (RFC 5050) |

### 2.3 Cited IDs That Do Not Exist in the SRS

- **RF-OFF-01..04**: cited in the RTM (diagram), AC-TECH-03, HU-13, HU-17, and the V&V Matrix (RF-OFF-01).
- **RNF-09**: cited in SRS §6 ("editable as data").
- The V&V Matrix uses RF-DER-02 for "Modified Z-score"; in the SRS, RF-DER-02 is the projection alert.

### 2.4 Architectural Elements Without a Supporting Requirement

Internal PKI and CA · device, key, and PIN provisioning · Sync Hub power and RAM budget · op-log retention · transport for real sensors and ECLSS · first-time installation without Hub · alarm escalation policy · mapping of cognitive, radiation, and respiratory systems to anatomical regions · what personal data cabin displays are allowed to show.

## 3. Differences Between the Brief and the Repository

Applied rule: **if the repository contradicts the brief, the repository wins**, and the discrepancy is noted here. If the repository contradicts itself, the SRS wins.

| # | Brief | Repository | Resolution in These Documents |
| --- | --- | --- | --- |
| 1 | Name "ASTHA" | ✅ Resolved in `286bb1f`: the repository now uses "ASTHA (Autonomous Space Telemetry & Health Analytics)". "AstroVital" remains only in the README GitHub Pages URLs (repository name) | "ASTHA" is used |
| 2 | Svelte 5, SVG, uPlot; no Three.js, React, or CDN | `index.html` loads Three.js r128, Chart.js, Tailwind, and `lucide@latest` **from CDN**. SPEC §6 proposes React + Three.js + Recharts. Commits `8fbccd1` and `953c50d` (xEMU suit silhouette) reinforce the 3D astronaut | **The 3D avatar is retained** (team decision, 2026-11-15; SPEC §2 and §4.2). Three.js is permitted **only in the Anatomy Viewer**: locally bundled, on-demand rendering with no continuous loop, and SVG fallback (02 "WebGL / Three.js" and 03 Anatomy Viewer spec sheet). The rest follows the brief's stack. **The current prototype must change**: remove CDNs, continuous `requestAnimationFrame` loops (`animate3d`, `animateSparklines`), and auto-rotation |
| 3 | Budgets: CPU ≤ 3 %, < 350 mW, 150 MB, 5 MB, 50 ms, 1.5 s | **Matches the SRS.** ✅ Resolved (2026-11-15): AC-TECH-01/02, the RTM, and the V&V Matrix were aligned with the SRS (formerly < 5 W, CPU < 15 %, 3.0 s startup). The 0.2 fps contingency mode is ADR-019 | The SRS figures are used everywhere |
| 4 | Optional star-topology Sync Hub over WebSocket | SRS RNF-NET-01 allows "local WebSockets". **CU-10, HU-15, and AC-TECH-04 require a serverless P2P mesh** (UDP Gossip, 802.11s, BLE mesh) | The Hub is retained because browsers have no access to UDP or BLE mesh, and WebRTC requires signaling (which would still be a server). The Hub is a single point of failure **only for convergence**, not for clinical function. If "no SPOF" is mandated, a second Hub replicating the op-log is trivial with CRDTs. **Requires decision** |
| 5 | CRDT with Hybrid Logical Clock (HLC) | RNF-NET-02: "LWW with **vector** timestamps". CU-10 (folder): Lamport clocks | The HLC orders LWW entries and the version vector drives deltas (03 §3.3). Confirm |
| 6 | DSN = signed JSON file, out-of-band / outside the system | SRS RNF-NET-04 agrees. **CU-11, HU-14, and AC-TECH-05** assign RFC 5050 DTN bundling, Brotli/Zstd, the 30-day queue, and response reception to ASTHA | Follows the SRS: DTN packaging is handled by the spacecraft router. CU-11 and AC-TECH-05 should be updated |
| 7 | IndexedDB + Web Crypto | SRS §5.2 specifies IndexedDB. **AC-TECH-06 and the V&V Matrix** refer to SQLite/SQLCipher and CRC32 | IndexedDB, AES-GCM, and SHA-256 (SRS) |
| 8 | Multi-device | SRS §1: "single-node PWA". SRS §4.4: multi-device | Each device is a complete autonomous node and sync is additive, making both readings compatible |
| 9 | System fonts | WIREFRAME §4.2 names Inter and JetBrains Mono | System font stacks; those fonts are used only if already installed locally |
| 10 | — | WIREFRAME tokens: `alert-red #ef4444` yields **5.35:1** on `#030712` and **4.96:1** on `#0c1222`. RNF-USA-03 requires ≥ 7:1 | Proposes `alert-red-text #fca5a5` (10.6:1) for text while keeping `#ef4444` for fills (03 §3.2) |
| 11 | — | WIREFRAME: 8 px touch spacing and 44 px checkbox. SRS RNF-USA-01: 12 px and 48 px | SRS |
| 12 | — | AC-CLIN-06: ≤ 4 steps. RNF-USA-05: ≤ 7 steps | 4 steps, per [ADR-017](../SDD/08-Architecture-decisions.md#adr-017). RNF-USA-05 must be updated |
| 13 | — | SRS RF-DER-03: classical z (mean and standard deviation). SRS RNF-PER-01, README, and AC-CLIN-02: Modified Z-score (MAD) | Modified Z-score (MAD), per [ADR-011](../SDD/08-Architecture-decisions.md#adr-011). RF-DER-03 and D-02 must be updated |
| 14 | — | SRS §5.1: "6 symptoms". RF-ING-04 lists 5 | The 5 listed symptoms are used. Confirm the 6th |
| 15 | Bundle ≤ 5 MB | `data/nasa_official_telemetry/` is ~24 MB | Cannot be included in the bundle: only the synthetic dataset (~273 KB) |
| 16 | Zero network | The OSDR explorer (HU-17) queries the remote NASA OSDR API. `data/scopes.md` cites EDA and RadLab API URLs | Only local JSON snapshots packaged inside the bundle are permitted |
| 17 | — | CU-12 (folder): electrical contingency mode triggered by an EPS signal | No backing in the SRS and no browser API capable of receiving that signal → GAP |
| 18 | — | `286bb1f` removed "Format M (Recto)" from `index.html`, yet WIREFRAME §6.3 still documents it | C4 does not use it (only Zen Mode is referenced). It should also be removed from WIREFRAME |
