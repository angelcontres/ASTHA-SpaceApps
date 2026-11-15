# 📘 Software Design Description (SDD) — ASTHA System
### Autonomous Space Telemetry & Health Analytics | Phase 2: Detailed Design
**NASA Space Apps Challenge 2026** | *Create Health Monitoring Software for Astronauts on Space Missions*

---

## 📋 Document Control and Regulatory Framework

| Parameter | Formal Specification |
| :--- | :--- |
| **Project** | ASTHA — Autonomous Space Telemetry & Health Analytics |
| **Document** | Software Design Description (SDD) — Modular Collection (Zero-Drift Baseline) |
| **Version / Baseline** | **v3.0.0** (Full SRS ↔ ADRs ↔ C4 ↔ SDD Alignment) |
| **Publication Date** | November 2026 |
| **Criticality Classification** | **NASA Class B** (Non-avionics human mission safety-critical / Crew health support) |
| **Applicable Standards** | **IEEE Std 1016-2009** (Software Design Descriptions)<br>**ISO/IEC/IEEE 29148:2018** (Requirements Traceability)<br>**NASA-STD-8739.8** (Software Assurance Standard)<br>**NASA-STD-3001** (Space Flight Human-System Standard, Vols 1 & 2)<br>**UML 2.5 & C4 Model** (OMG / Simon Brown) |
| **Requirements Authority** | [SRS v1.0](../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md) & [SDD-08: ADR Decisions (001–020)](08-Architecture-decisions.md) (`ADR-001`) |
| **Clinical Thresholds** | [Space Domain and Problem Definition Document](../DOCUMENTO_DOMINIO_Y_PROBLEMATICA_ESPACIAL.md) (SRS §6) |
| **Official Repository** | [angelcontres/AstroVital-SpaceApps](https://github.com/angelcontres/AstroVital-SpaceApps) |

---

## 🎯 1. Purpose, Authority Rule, and Modular Approach

This directory constitutes the formal architectural and detailed design specification (**SDD**) for **ASTHA**. In accordance with the governance rule established in **[ADR-001](08-Architecture-decisions.md#adr-001)**:
1. The **SRS** prevails as the authority for functional requirements (`RF-*`), non-functional requirements (`RNF-*`), rules (`R-*`, `D-*`), and acceptance criteria (`AC-*`).
2. The **Domain Document** establishes the physiological and environmental thresholds under **NASA-STD-3001**.
3. The **20 Architecture Decision Records (`ADR-001` through `ADR-020`)** consolidated in **[SDD-08](08-Architecture-decisions.md)** and the **C4 Model** ([docs/c4/](../c4/00-README.md)) document the binding team decisions that clarify and reconcile any technical discrepancies across prior documents.

```text
docs/SDD/
├── README.md                                     # 📍 Master Index, Authority Rule, and ADR/C4 Map
├── 01-Arquitectura-Global-del-Sistema.md         # 🏛️ Hexagonal, Event-Driven Web Workers, <5W/3% CPU Budgets
├── 02-Diagrama-de-Clases-UML.md                  # 🧬 SRS §5.1 Entities, AES-GCM Crypto Envelopes, CRDT & R-* Rules
├── 03-Diagramas-de-Secuencia-UML.md              # ⏱️ ADR-013 Alarm Escalation, On-Demand 3D, Signed JSON
├── 04-Diagrama-de-Componentes-UML.md             # 🧩 Svelte 5 + uPlot, Clinical Worker, Data/Sync Worker, Sync Hub
├── 05-Diagrama-de-Despliegue-UML.md              # 🚀 C4-L4 Isolated LAN Topology, Internal CA, Cabin Displays
├── 06-Diseno-de-Datos-y-Contratos-de-Interfaz.md # 📦 JSON Schemas, Encrypted Envelope, CRDT HLC & WCAG AAA Tokens
├── 07-Matriz-de-Trazabilidad-SRS-a-SDD.md        # 🧭 100% Closed Mapping: 42 RF + 19 RNF + 10 R-* + 3 D-*
└── 08-Architecture-decisions.md                  # ⚖️ Consolidated Registry of 20 Architecture Decisions (ADR-001..020)
```

---

## ⚖️ 2. Formal Reconciliation of Architectural Decisions (ADRs)

To ensure **zero drift** between the SRS, legacy use cases, and the target architecture, the SDD adopts the following resolutions ratified by the ADRs:

| Historical Discrepancy Detected | Official ADR Resolution | Impact on SDD Design |
| :--- | :--- | :--- |
| Classical Z-score vs. Modified Z-Score (`RF-DER-03`) | **[ADR-011](08-Architecture-decisions.md#adr-011)** | Adopts Modified Z-Score using Median and $MAD$ ($|M_i| \ge 2.5$) over the Days 1–14 baseline. |
| Countermeasures $\le 7$ vs. $\le 4$ steps (`RNF-USA-05`) | **[ADR-017](08-Architecture-decisions.md#adr-017)** | Every countermeasure protocol has $\le 4$ actionable steps; longer interventions are chained. |
| In-browser DTN vs. Signed Export (`RNF-NET-04`) | **[ADR-010](08-Architecture-decisions.md#adr-010)** | ASTHA generates an Ed25519-signed JSON file handed off to the spacecraft's external DTN router; zero WAN traffic in the browser. |
| Continuous 3D rendering vs. On-Demand (`RNF-POW-01`) | **[ADR-004](08-Architecture-decisions.md#adr-004)** | Local Three.js only in the Anatomy Viewer, rendering 1 frame per event (0 FPS idle) with SVG fallback. |
| In-browser UDP/BLE mesh vs. Sync Hub (`RNF-NET-01`) | **[ADR-008](08-Architecture-decisions.md#adr-008)** | Optional Rust Sync Hub over WSS (`astha.local`) with CRDT deltas ([ADR-009](08-Architecture-decisions.md#adr-009)); full autonomy if unreachable. |
| Startup $< 1.5\text{ s}$ vs. PBKDF2 (`RNF-PER-02`) | **[ADR-015](08-Architecture-decisions.md#adr-015)** | The $1.5\text{ s}$ budget is measured to the lock screen (which displays habitat telemetry and global status lights [ADR-014](08-Architecture-decisions.md#adr-014)). |
| Critical text contrast `#ef4444` (`RNF-USA-03`) | **[ADR-018](08-Architecture-decisions.md#adr-018)** | `#ef4444` is reserved for fills/pulses; all critical text uses `alert-red-text` (`#fca5a5`, $10.6:1$ AAA contrast ratio). |
| Continuous 1 Hz ingestion vs. Daily log (`RF-ING-01`) | **[ADR-016](08-Architecture-decisions.md#adr-016)** | Daily physiological record of the 9 variables + 180-day synthetic dataset (720 measurements); no Web Bluetooth. |

---

## 📑 3. SDD Module Catalog and C4/ADR Traceability

| SDD Module | Formal Title | Equivalent C4 Level | Governing ADRs |
| :--- | :--- | :--- | :--- |
| [**SDD-01**](01-Arquitectura-Global-del-Sistema.md) | **Global System Architecture** | [C4-L1 Context](../c4/01-contexto.md) & [C4-L2](../c4/02-contenedores.md) | ADR-001, ADR-002, ADR-003, ADR-005, ADR-011, ADR-015, ADR-019 |
| [**SDD-02**](02-Diagrama-de-Clases-UML.md) | **UML Class Diagram** | [C4-L3 Components](../c4/03-componentes.md) | ADR-006, ADR-009, ADR-011, ADR-012, ADR-016, ADR-017 |
| [**SDD-03**](03-Diagramas-de-Secuencia-UML.md) | **UML Sequence Diagrams** | C4 Dynamic Flows | ADR-004, ADR-005, ADR-008, ADR-010, ADR-013, ADR-017 |
| [**SDD-04**](04-Diagrama-de-Componentes-UML.md) | **UML Component Diagram** | [C4-L2 Containers](../c4/02-contenedores.md) & [C4-L3](../c4/03-componentes.md) | ADR-003, ADR-004, ADR-005, ADR-006, ADR-008 |
| [**SDD-05**](05-Diagrama-de-Despliegue-UML.md) | **UML Deployment Diagram** | [C4-L4 Deployment](../c4/04-despliegue.md) | ADR-002, ADR-007, ADR-008, ADR-010, ADR-012, ADR-014, ADR-020 |
| [**SDD-06**](06-Diseno-de-Datos-y-Contratos-de-Interfaz.md) | **Data Design and Interface Contracts** | SRS §5.1–5.2 Contracts | ADR-006, ADR-009, ADR-010, ADR-016, ADR-018 |
| [**SDD-07**](07-Matriz-de-Trazabilidad-SRS-a-SDD.md) | **SRS-to-SDD Traceability Matrix** | IEEE 29148 Contractual Closure | Full coverage of all 42 RF, 19 RNF, 10 `R-*` Rules, and 3 `D-*` Drifts |
| [**SDD-08**](08-Architecture-decisions.md) | **Architecture Decision Records (ADR)** | Binding Registry ADR-001..020 | Normative foundation for design decisions |
