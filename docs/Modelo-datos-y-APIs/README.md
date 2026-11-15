# 🗄️ Data Model & API Design — ASTHA System
### Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
**Standards:** IEEE Std 1016-2009 | OpenAPI 3.1.0 | JSON Schema Draft-07 | **Authority:** [SRS](../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md) & [ADRs](../SDD/08-Architecture-decisions.md)

---

## 🎯 Purpose of This Collection

This directory formalizes the **Data Model** (conceptual, logical, and physical in encrypted IndexedDB + Sync Hub Op-Log) and the **API & Interface Contracts** of **ASTHA**, maintaining **zero drift** with the **SRS §5** specification, the **C4 Model** ([docs/c4/](../c4/00-README.md)), the **SDD v3.0.0** ([docs/SDD/](../SDD/README.md)), and the **20 ADRs** ([SDD-08](../SDD/08-Architecture-decisions.md)).

---

## 📂 File Structure

| File | Technical Content | Standards / Applied ADRs |
| :--- | :--- | :--- |
| [**README.md**](README.md) | Master index and persistence / contract architecture | `ADR-001`, `SRS §5` |
| [**01-Diagrama-Entidad-Relacion.md**](01-Diagrama-Entidad-Relacion.md) | Logical Entity-Relationship Diagram (ERD) + physical Object Stores in IndexedDB + Rust Op-Log | `ADR-006`, `ADR-008`, `ADR-009`, `ADR-012`, `ADR-014`, `ADR-016` |
| [**02-Diccionario-de-Datos.md**](02-Diccionario-de-Datos.md) | Complete dictionary of fields, types, nullability, NASA-STD-3001 thresholds, encryption, and CRDT semantics | `SRS §6.1`, `RF-ING-01..05`, `RNF-SEC-01..04`, `ADR-011`, `ADR-017` |
| [**03-Contratos-API-OpenAPI-y-Eventos.md**](03-Contratos-API-OpenAPI-y-Eventos.md) | Sync Hub (`astha.local`) REST/HTTPS endpoints guide, CRDT delta WebSocket channel, signed DSN export contract, and `postMessage` events between Web Workers | `ADR-005`, `ADR-007`, `ADR-008`, `ADR-010`, `RNF-NET-01..04` |
| [**openapi.yaml**](openapi.yaml) | Importable formal **OpenAPI 3.1.0** specification (LAN Sync Hub, Future Sensor Ingestion, and DSN Export) | OpenAPI 3.1.0, `ADR-008`, `ADR-010` |

---

## 🔗 Data & Interface Design Principles (ADR Traceability)

1. **Zero-Server Encrypted Storage (`ADR-006`, `ADR-012`):** Primary persistence resides in the browser (**IndexedDB**) inside `AES-GCM-256` encrypted envelopes (`EncryptedEnvelope`) with an anti-SEU `SHA-256` hash and symmetric key wrapped with both the astronaut PIN and CMO PIN.
2. **Clinical Immutability & CRDTs (`ADR-009`, `RNF-SEC-04`):** No medical record is ever edited or deleted. Clinical data uses a **G-Set** (*Grow-Only Set*) and a hash-chained audit ledger; preferences and gamification use **LWW-Map (HLC)** and **PN-Counter**.
3. **Zero-WAN Boundary (`ADR-002`, `ADR-008`, `ADR-010`):** HTTP/WSS APIs operate exclusively within the spacecraft's isolated LAN (`https://astha.local`, internal CA certificate `ADR-007`). Downlink to Houston terminates at the local export of an **Ed25519**-signed JSON file handed off to the spacecraft's external DTN system.
4. **Decoupled Worker Computation (`ADR-005`):** All communication between the Svelte 5 interface and clinical or cryptographic algorithms occurs via asynchronous message contracts (`postMessage` / `MessageChannel`) with zero network calls from the clinical engine.
