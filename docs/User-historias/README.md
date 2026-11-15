# 📋 ASTHA System User Stories
### NASA Space Apps Challenge | Create Health Monitoring Software for Astronauts on Space Missions
**Regulatory Framework:** ISO/IEC/IEEE 29148 | NASA-STD-3001 Vol 1 & 2 | Human-Rating Requirements (NPR 8705.2C)

---

## 🎯 1. Purpose and Overview

This document and its associated modules detail the **User Stories (HU)** for **ASTHA**, the autonomous Clinical Decision Support System (CDSS) for crewed deep-space missions (Earth–Mars transit).

Because a Mars mission faces one-way electromagnetic signal latency of up to **22 minutes (44 min round-trip time)** and medical evacuation is impossible (*No MEDEVAC*), the software must meet the operational needs of both the crew in transit and the ground support team (Mission Control Center in Houston).

---

## 👥 2. User Personas

| Persona / Role | Scenario Representative | Operational Profile and Clinical Needs |
| :--- | :--- | :--- |
| **Mission Astronaut (Non-Physician)** | Dr. Marcus Dalton / Hannah Sutton | Flight Scientist/Engineer. High cognitive workload in microgravity. Requires an unambiguous interface, immediate visual readouts, and step-by-step checklists without complex medical jargon. |
| **Crew Medical Officer (CMO)** | Dra. Lauren Pierce | Crewmember trained in advanced life support. Requires a fleet-wide overview of the entire crew, AI-assisted differential diagnoses, and countermeasure adherence tracking (ARED, LBNP). |
| **Mission Commander** | Rachel Calloway | Responsible for operational safety. Needs immediate awareness if a crewmember enters a critical or incapacitating condition that could jeopardize spacecraft operations. |
| **Ground Flight Surgeon** | Medical Director at Houston (JSC) | Aerospace medicine specialist. Operates 100% asynchronously. Needs aggregated telemetry bundles, event audit trails, and clinical rationale for onboard countermeasures applied. |
| **Habitat Systems Engineer (ECLSS)** | Life Support Operator | Monitors correlations between cabin environmental variables ($CO_2$ pockets, depressurization, neutron flux from solar particle events [SPE]) and human physiology. |
| **Embedded Software / Cybersecurity Engineer** | Flight Hardware Developer | Oversees Edge computing performance, power draw (< 350 mW), P2P mesh synchronization, and radiation fault tolerance (SEU). |

---

## ✅ 3. Aerospace Definition of Done (DoD)

For a User Story to be considered **DONE** in ASTHA, it must satisfy the following 6 rigorous criteria:

1. **NASA-STD-3001 Compliance:** Medical alert thresholds and nominal/critical ranges must match the physiological limits defined in the NASA standard.
2. **100% Edge Autonomy:** Functionality must execute locally with zero dependency on external network calls or cloud connectivity.
3. **Acceptance Criteria (Gherkin):** All `Given / When / Then` scenarios must be verified via unit or integration tests.
4. **Crisis Ergonomics (RNF-USA):** The interface must not rely solely on color (must include icons, patterns, or supporting text for color-vision deficiency) and must support touch interaction with flight gloves.
5. **Bidirectional Traceability:** The User Story (HU) must map directly to a Functional Requirement (RF) or Non-Functional Requirement (RNF) in the SRS document.
6. **Radiation Integrity:** Persisted data must include checksums (SHA-256 / CRC32) to verify that no corruption occurred due to high-energy particles (SEU).

---

## 🗺️ 4. Epics Map and User Story Catalog

The stories are modularized into 5 thematic documents within this folder:

| Epic | File | Description | Included Stories |
| :--- | :--- | :--- | :--- |
| **EPIC 1: Continuous Monitoring and Telemetry** | [`HU-01-Monitoreo-Telemetria-Vital.md`](HU-01-Monitoreo-Telemetria-Vital.md) | Continuous ingestion from Astroskin/Bio-Monitor SmartShirt, environmental telemetry, and rapid symptom reporting. | HU-01, HU-02, HU-03, HU-04 |
| **EPIC 2: Clinical Triage and Anatomical Visualization** | [`HU-02-Triage-Clinico-Modelo-Anatomico.md`](HU-02-Triage-Clinico-Modelo-Anatomico.md) | Interactive body model, SANS detection, Modified Z-Score, and CMO crew overview. | HU-05, HU-06, HU-07, HU-08 |
| **EPIC 3: Countermeasure Protocols and Crisis Management** | [`HU-03-Protocolos-Contramedidas-Emergencia.md`](HU-03-Protocolos-Contramedidas-Emergencia.md) | Step-by-step guides for non-physicians, Solar Particle Event (SPE) evacuation, LBNP, and ARED. | HU-09, HU-10, HU-11, HU-12 |
| **EPIC 4: Edge Resilience, Mesh Network, and Houston Link** | [`HU-04-Arquitectura-Edge-Red-Malla.md`](HU-04-Arquitectura-Edge-Red-Malla.md) | Decentralized P2P sync, asynchronous DTN bundles (44m RTT), and SEU integrity protection. | HU-13, HU-14, HU-15, HU-16 |
| **EPIC 5: Scientific Evidence and NASA OSDR Explorer** | [`HU-05-Explorador-NASA-OSDR.md`](HU-05-Explorador-NASA-OSDR.md) | Integration with the 116 NASA OSDR API studies, Inspiration4 dataset, and crisis simulator. | HU-17, HU-18, HU-19, HU-20 |

---

## 📊 5. Quick Traceability Matrix (HU vs. SRS vs. NASA-STD-3001)

| Story ID | Short Title | Primary Role | MoSCoW Priority | SRS Requirement | NASA / CSA Standard |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HU-01** | Live Biosignal Visualization (1 Hz) | Astronaut | **Must Have** | RF-ING-01, RF-DSH-01 | NASA-STD-3001 Vol 1 / Astroskin |
| **HU-02** | Circadian Desynchronization Detection | CMO | **Must Have** | RF-EVA-05, RF-DER-04 | NASA HRP Fatigue Risk / PVT |
| **HU-03** | Physiological Correlation with $CO_2$ and Radiation | ECLSS Eng. | **Must Have** | RF-EVA-04, RF-DSH-04 | NASA-STD-3001 Vol 2 / CSA CANS |
| **HU-04** | Zero-Friction Symptom Logging | Astronaut | **Should Have** | RF-ING-03, RNF-USA-01 | NASA-STD-3001 Ergonomics |
| **HU-05** | Anatomical Triage with Clickable Hotspots | Astronaut | **Must Have** | RF-ANA-01..04 | ISO 9241-11 / NASA CDSS |
| **HU-06** | Early Detection of SANS Syndrome | CMO | **Must Have** | RF-EVA-01, RF-GUI-01 | NASA HRP SANS Risk / OSD-715 |
| **HU-07** | Drift Detection with Modified Z-Score | CMO | **Must Have** | RF-DER-01..03 | Hoaglin & Iglewicz (1993) |
| **HU-08** | Aggregated Crew-Wide Dashboard | CMO / Cmdr | **Should Have** | RF-DSH-03 | NASA Medical Operations |
| **HU-09** | Verifiable Checklists for Non-Physicians | Astronaut | **Must Have** | RF-GUI-01..04 | NASA Flight Procedures Handbook |
| **HU-10** | Automated Solar Particle Event (SPE) Protocol | Crew | **Must Have** | RF-EVA-04, RF-GUI-03 | NASA SPELs / CSA CANS |
| **HU-11** | Cephalad Hypertension Management with LBNP | CMO / Patient | **Must Have** | RF-GUI-01, RF-ANA-02 | NASA LBNP Protocol |
| **HU-12** | Renal Stone and Bone Loss Prevention | Astronaut | **Should Have** | RF-EVA-03, RF-GUI-03 | NASA Renal Stone Risk Countermeasure |
| **HU-13** | 100% Offline Autonomous Operation (Edge) | All | **Must Have** | RF-OFF-01..04, RNF-NET-01 | Deep Space Mars Constraints |
| **HU-14** | Asynchronous DTN Bundling for Houston | Flight Surgeon | **Must Have** | RF-GUI-05, RNF-NET-03 | Delay-Tolerant Networking (CCSDS) |
| **HU-15** | Serverless P2P Mesh Synchronization | Software Eng. | **Should Have** | RNF-NET-02, RNF-NET-04 | Distributed Edge Systems |
| **HU-16** | Radiation Bit-Error Shielding (SEU) | Software Eng. | **Must Have** | RNF-SEC-04 | NASA SEL/SEU Avionics Standard |
| **HU-17** | Official NASA OSDR API Explorer | Researcher | **Could Have** | RF-OFF-03 | NASA OSDR API v2 |
| **HU-18** | Calibration with Inspiration4 Mission (OSD-574) | CMO | **Must Have** | RF-ING-04 | NASA OSDR OSD-574 Dataset |
| **HU-19** | Crisis Scenario Injection (Simulator) | Crew | **Should Have** | RF-DSH-02 | NASA Astronaut Simulation Training |
| **HU-20** | Ultra-Low Power Profile (< 350 mW) | Software Eng. | **Must Have** | RNF-POW-01..04 | Spacecraft Power Budget Rules |

---

*Developed for the official documentation of the NASA Space Apps Challenge astronaut health monitoring software challenge.*
