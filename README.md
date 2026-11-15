# 🚀 ASTHA: Autonomous Space Telemetry & Health Analytics
### Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
### NASA Space Apps Challenge | Create Health Monitoring Software for Astronauts on Space Missions

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen.svg?style=for-the-badge&logo=github)](https://angelcontres.github.io/AstroVital-SpaceApps/)
[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-2026%20Challenge-orange.svg)](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources)
[![Standard](https://img.shields.io/badge/Standard-NASA--STD--3001%20Vol%201%20%26%202-blue.svg)](https://standards.nasa.gov/)
[![Requirements](https://img.shields.io/badge/Requirements-ISO%2FIEC%2FIEEE%2029148-green.svg)](docs/SRS%20–%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md)
[![Design SDD](https://img.shields.io/badge/Design%20SDD-IEEE%201016%20%2F%20NASA--STD--8739.8-blue.svg)](docs/SDD/README.md)
[![NASA OSDR API](https://img.shields.io/badge/NASA%20OSDR%20API-116%20Human%20Studies-blueviolet.svg)](https://visualization.osdr.nasa.gov/biodata/api/v2/)
[![User Stories](https://img.shields.io/badge/User%20Stories-20%20Agile%20BDD%20%28NASA%29-yellow.svg)](docs/User-historias/README.md)
[![Use Cases](https://img.shields.io/badge/Use%20Cases-12%20UML%20%28ISO%2029148%29-cyan.svg)](docs/Casos-de-uso/README.md)
[![Acceptance Criteria](https://img.shields.io/badge/Acceptance%20Criteria-NASA%20V%26V%20Compliance-emerald.svg)](docs/Criterios-de-aceptacion/README.md)
[![RTM Traceability](https://img.shields.io/badge/RTM%20Traceability-100%25%20NASA%20Covered-purple.svg)](docs/MATRIZ_DE_TRAZABILIDAD_RTM.md)
[![Wireframe](https://img.shields.io/badge/Wireframe-Interactive%20Blueprint-blue.svg)](wireframe.html)
[![Glossary](https://img.shields.io/badge/Glossary->60%20Aerospace%20Terms-informational.svg)](docs/GLOSARIO_TERMINOLOGICO_AEROESPACIAL.md)
[![Architecture](https://img.shields.io/badge/Architecture-100%25%20Edge%20%2F%20Mars--Zero--Ping-red.svg)](#)

---

> 🎮 **LIVE WEB DEMOS ON GITHUB PAGES:**  
> * **👉 [Tactical Production Dashboard](https://angelcontres.github.io/AstroVital-SpaceApps/)** *(SPE storm simulator, CO₂ leak, SANS, interactive anatomical map, and NASA OSDR explorer)*  
> * **📐 [Interactive Wireframe & Blueprint Prototype](https://angelcontres.github.io/AstroVital-SpaceApps/wireframe.html)** *(Cabin technical dimensions, glove-ready ergonomics $\ge 48\text{px}$, WCAG AAA accessibility, and view switcher)*

---

## 🛰️ 1. Operational Problem Statement (The Deep Space Challenge)

On the International Space Station (LEO), any medical decompensation has access to live telemedicine with Houston and mission abort capability. **On a transit to Mars (up to 400 million km), that paradigm collapses:**

* **Unavoidable Radio Latency:** Electromagnetic communication delay of up to **22 minutes one-way (44 minutes round-trip)**. Real-time telemedicine is physically impossible.
* **No Medical Evacuation (*No MEDEVAC*):** The crew must diagnose, triage, and treat emergencies *in-situ*.
* **Non-Specialist Crew:** Crew members are engineers, pilots, and scientists, not critical-care physicians. The system must translate physiological complexity into **executable step-by-step action protocols**.

---

## 🧬 2. Space Biomedical Foundation (NASA R.I.D.G.E. Framework)

**ASTHA** (**Autonomous Space Telemetry & Health Analytics**) continuously correlates the space exposome against human physiology:

1. **Radiation (Space Radiation):** Exposure to GCR and Solar Particle Events (SPE). Secondary neutron monitoring (~30% of the biological dose in cabin) calibrated against the Canadian Space Agency (CSA) **CANS** spectrometer.
2. **Isolation & Confinement:** Circadian rhythm disruption and autonomic depression detected via Heart Rate Variability (**HRV rMSSD**).
3. **Distance from Earth:** Self-sufficiency and **100% offline (Edge)** operation.
4. **Gravity Fields (Microgravity 0G / Moon 1/6G / Mars 3/8G):**
   * **SANS (Spaceflight Associated Neuro-ocular Syndrome):** Cephalad fluid shift that flattens the globe and causes optic disc edema.
   * **Accelerated Bone Loss ($1.0\% - 1.5\%$ per month):** Hypercalciuria and critical risk of **renal calculi (kidney stones)**.
5. **Hostile Closed Environments:** Detection of $CO_2$ pockets ($> 3.0\text{ mmHg} / > 3950\text{ ppm}$) and cabin deoxygenation.

---

## ⚙️ 3. System Architecture and Capabilities

```mermaid
flowchart TD
    subgraph InputLayer["Synchronized Multi-Channel Ingestion"]
        A["Continuous Telemetry: Astroskin / Bio-Monitor"]
        B["Environmental Telemetry: ECLSS / CO2 / Pressure"]
        C["CANS CSA Dosimetry / Radiation uSv/h"]
        D["Rapid Manual Symptom Report"]
    end

    subgraph CoreEngine["Local Clinical Decision Support Engine (CDSS Edge)"]
        E["Individual Crew Member Baseline"]
        F["Modified Z-Score Algorithm (Boris Iglewicz & David Hoaglin)"]
        G["NASA Flight Rules Cross-Correlation Rules"]
        H["NASA-STD-3001 Ground Truth Thresholds"]
    end

    subgraph PresentationLayer["Tactical Visual Layer"]
        I["Interactive Organ-by-Organ Human Anatomical Model"]
        J["Control Dashboard & Risk Traffic Light"]
        K["Step-by-Step Countermeasures Guide: ARED, LBNP, Storm Shelter"]
        L["Crisis Simulator for Technical Evaluation"]
    end

    InputLayer --> CoreEngine
    CoreEngine --> PresentationLayer
```

### Drift Detection Algorithm (Modified Z-Score)
To avoid false alarms caused by outliers and inter-individual variability, ASTHA uses the Median Absolute Deviation ($MAD$):

$$M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{MAD}$$

A value $|M_i| \ge 2.5$ triggers an early physiological drift warning before the astronaut experiences incapacitating symptoms.

---

## 📁 4. Repository Structure and Documentation

```text
Nasa-Project/
├── docs/
│   ├── User-historias/                                         # Catalog of 20 Aerospace BDD User Stories
│   │   ├── README.md                                           # Epic map, archetypes (personas), and DoD
│   │   ├── HU-01-Monitoreo-Telemetria-Vital.md                 # Epic 1: Continuous ingestion, sleep, and environmental data
│   │   ├── HU-02-Triage-Clinico-Modelo-Anatomico.md            # Epic 2: Body hotspots, SANS, and Z-score
│   │   ├── HU-03-Protocolos-Contramedidas-Emergencia.md        # Epic 3: Non-physician checklists, SPE, LBNP, and ARED
│   │   ├── HU-04-Arquitectura-Edge-Red-Malla.md                # Epic 4: Zero-ping offline, DTN, and SEU tolerance
│   │   └── HU-05-Explorador-NASA-OSDR.md                       # Epic 5: NASA OSDR API, Inspiration4, and simulator
│   ├── Casos-de-uso/                                           # Formal Specification of 12 Use Cases (UML / ISO 29148)
│   │   ├── README.md                                           # Actor model, Mermaid diagram, and matrix
│   │   ├── CU-01-Monitoreo-Telemetria-Ingesta.md               # CU-01 Continuous ingestion, CU-02 CO2/CANS, CU-03 Symptoms
│   │   ├── CU-02-Triage-Diagnostico-Soporte.md                 # CU-04 Anatomical map, CU-05 SANS, CU-06 Z-Score
│   │   ├── CU-03-Contramedidas-Emergencias-Vuelo.md            # CU-07 Checklists, CU-08 SPE Storm, CU-09 LBNP
│   │   └── CU-04-Arquitectura-Red-Resiliencia-Edge.md          # CU-10 P2P Mesh Network, CU-11 DTN Houston, CU-12 EPS <5W
│   ├── Criterios-de-aceptacion/                                # Verification & Validation Framework (NASA V&V)
│   │   ├── README.md                                           # I/A/D/T methods and criteria classification
│   │   ├── CRITERIOS_FUNCIONALES_AC_CLINICOS.md                # AC-CLIN-01 to 07: NASA-STD-3001 ranges, SANS, and CO2
│   │   ├── CRITERIOS_NO_FUNCIONALES_AC_TECNICOS.md             # AC-TECH-01 to 06: Zero-ping, <5W power, and SEU
│   │   └── MATRIZ_VERIFICACION_Y_VALIDACION_NASA.md            # Cross-compliance matrix (100% PASS)
│   ├── MATRIZ_DE_TRAZABILIDAD_RTM.md                           # Master End-to-End Traceability Matrix (RTM)
│   ├── GLOSARIO_TERMINOLOGICO_AEROESPACIAL.md                  # Formal glossary with >60 terms (SANS, LBNP, CANS, etc.)
│   ├── WIREFRAME_Y_DISENO_UI_UX.md                             # Touch ergonomics and UI/UX design specification
│   ├── SRS – Software de Monitoreo de Salud para Astronautas.md   # Formal ISO/IEC/IEEE 29148 specification
│   ├── SDD/                                                    # Detailed Design SDD Folder (Modular UML Collection v3.0.0)
│   │   ├── README.md                                           # Master Index, Authority Rule, and ADR/C4 Map
│   │   ├── 01-Arquitectura-Global-del-Sistema.md               # SDD-01: Hexagonal, Event-Driven Web Workers, and Z-Score MAD
│   │   ├── 02-Diagrama-de-Clases-UML.md                        # SDD-02: SRS §5.1 Entities, WebCrypto AES-GCM, and CRDT
│   │   ├── 03-Diagramas-de-Secuencia-UML.md                    # SDD-03: ADR-013 Alarm Escalation, On-Demand 3D, Signed JSON
│   │   ├── 04-Diagrama-de-Componentes-UML.md                   # SDD-04: Svelte 5, uPlot, Clinical & Data Workers, Sync Hub
│   │   ├── 05-Diagrama-de-Despliegue-UML.md                    # SDD-05: Isolated LAN Topology C4-L4 and Cabin Displays
│   │   ├── 06-Diseno-de-Datos-y-Contratos-de-Interfaz.md       # SDD-06: JSON Schemas, Encrypted Envelope, CRDT HLC, and AAA Tokens
│   │   ├── 07-Matriz-de-Trazabilidad-SRS-a-SDD.md              # SDD-07: 100% Traceability (42 RF + 19 RNF + 10 R-* + 3 D-*)
│   │   └── 08-Architecture-decisions.md                          # SDD-08: Consolidated Registry of 20 ADRs (ADR-001..020)
│   ├── c4/                                                     # C4 Architecture Model (Context, Containers, Components, Deployment)
│   ├── Diseno-UI-UX/                                           # Modular UI/UX Design (Wireframes, Design System, Mockups)
│   │   ├── README.md                                           # Normative UI/UX Index (SRS, C4, and ADR traceability)
│   │   ├── 01-Wireframes-y-Arquitectura-de-Pantalla.md         # View A/B/C wireframes, 12-col grid, and breakpoints
│   │   ├── 02-Guia-de-Estilo-y-Design-System.md                # WCAG AAA tokens (#fca5a5), 630nm dual coding, and 960Hz audio
│   │   └── 03-Mockups-y-Especificacion-de-Componentes.md       # Hi-Fi mockups, Svelte 5 components, and <5W Survival Mode
│   ├── Modelo-datos-y-APIs/                                    # Data Model (ERD, Dictionary) & OpenAPI 3.1.0 Contracts
│   │   ├── README.md                                           # Index and encryption/CRDT/LAN principles
│   │   ├── 01-Diagrama-Entidad-Relacion.md                     # Entity-Relationship Diagram (ERD) and IndexedDB Object Stores
│   │   ├── 02-Diccionario-de-Datos.md                          # Complete dictionary with NASA-STD-3001 thresholds
│   │   ├── 03-Contratos-API-OpenAPI-y-Eventos.md               # REST/WSS (Sync Hub), Worker postMessage, and DSN Export guide
│   │   └── openapi.yaml                                        # Formal importable OpenAPI 3.1.0 specification
│   ├── SDD – Software Design Description ASTHA.md                 # Complementary consolidated technical document
│   ├── VALIDACION_FUENTES_OFICIALES_NASA.md                    # Cross-certification against NASA-STD-3001
│   ├── DOCUMENTO_DOMINIO_Y_PROBLEMATICA_ESPACIAL.md            # Operational domain analysis
│   └── HEALTH_MONITORING_SOFTWARE_SPEC.md                      # Initial technical specification
├── data/
│   ├── nasa_real_human_telemetry.json                          # 100% real Inspiration4 telemetry (OSD-574)
│   ├── nasa_osdr_api_human_studies.json                        # 116 official human studies from NASA OSDR API
│   ├── nasa_osdr_enriched_human_studies.json                   # 10 enriched studies (Inspiration4, SANS, etc.)
│   └── nasa_official_telemetry/                                # Real ISS packets and ISA-Tab tables
├── index.html                                                  # 100% offline interactive tactical dashboard
├── wireframe.html                                              # Interactive Wireframe & Blueprint visual prototype
├── .nojekyll                                                   # GitHub Pages deployment support
├── .gitignore
└── README.md
```

---

## 📊 5. Datasets and Scientific Validation

* **NASA OSDR Study OSD-574 (SOMA):** Clinical and microgravity adaptation data from the SpaceX Inspiration4 commercial crew mission.
* **NASA Planetary Data System (PDS) RAD:** Deep-space radiation telemetry from the Mars Science Laboratory.
* **Canadian Space Agency (CSA):** Specifications for the *Astroskin/Bio-Monitor* smart garment and *CANS* neutron dosimetry.
* **NASA-STD-3001 (Volume 1 & 2):** Mandatory standard for permissible medical exposure limits and cabin environmental factors.

---

## 👥 Development Team & Credits
* **Challenge:** NASA Space Apps Challenge 2026
* **Topic:** *Create Health Monitoring Software for Astronauts on Space Missions*
* **Requirements Engineering:** @angel & Team
