# 🚀 SDD-05: UML Deployment Diagram
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Reference Standards:** NASA-STD-8739.8 | IEEE Std 1016-2009 | UML 2.5 | C4-L4 Model | **ADRs:** 002, 007, 008, 010, 012, 014, 020

---

## 1. Physical and Network Topology in Spacecraft / Habitat

In accordance with **[ADR-002](08-Architecture-decisions.md#adr-002)**, **[ADR-007](08-Architecture-decisions.md#adr-007)**, and **[ADR-008](08-Architecture-decisions.md#adr-008)**, ASTHA is deployed entirely within a **closed, isolated spacecraft LAN** (zero Internet gateways / Zero-WAN).

```mermaid
flowchart TB
    subgraph PreFlight ["Pre-Flight Ground Provisioning (ADR-020)"]
        EngGround["NASA Engineering (Ground)<br>• Installs Internal CA Root<br>• Pre-installs Offline PWA<br>• Enrolls Ed25519 Keys and PINs"]
    end

    subgraph Spacecraft_LAN ["Closed Spacecraft LAN (Zero-WAN / mDNS astha.local - ADR-002/007)"]
        
        subgraph Crew_Tablets ["Crew Tablets (x4 Autonomous Nodes)"]
            CrewPWA["Crew PWA (Svelte 5 + 2 Workers)<br>• IndexedDB AES-GCM 256 (ADR-006)<br>• Key wrapped with Personal PIN (ADR-012)<br>• 100% Clinical Autonomy if Hub fails"]
        end

        subgraph CMO_Console ["CMO Medical Workstation"]
            CmoPWA["CMO Console PWA<br>• Keys wrapped with CMO PIN (ADR-012)<br>• Decrypts all crew members<br>• Receives 2m alarm escalation (ADR-013)<br>• Generates Ed25519 Signed JSON (ADR-010)"]
        end

        subgraph Cabin_Screens ["Public Bulkhead / Cabin Displays (ADR-014)"]
            CabinDisplay["Bulkhead Status Display<br>• ECLSS/CANS Habitat Telemetry Only<br>• Per-Crew Global Status Indicator<br>• FORBIDDEN from showing clinical values<br>• Escalated alert at 5m (ADR-013)"]
        end

        subgraph Optional_Sync_Node ["Optional Central Node: Sync Hub (ADR-008)"]
            RustHub["ASTHA Sync Hub (Rust Binary)<br>• TLS 1.3 with Internal CA Cert (ADR-007)<br>• mDNS astha.local (< 3s RNF-NET-03)<br>• Zero-Knowledge Append-Only Op-Log"]
        end

        CA_Internal["Spacecraft Internal Certificate Authority (CA)"]
    end

    subgraph External_Comms ["External Communications Boundary (Outside ASTHA - ADR-010)"]
        ShipRouter["Spacecraft DTN Router / Transponder"]
        DSN["NASA Deep Space Network (DSN)<br>Goldstone / Madrid / Canberra"]
        Houston["Flight Surgeon Console (JSC Houston)"]
    end

    EngGround -.->|"Pre-launch"| Crew_Tablets
    EngGround -.->|"Pre-launch"| CMO_Console
    CA_Internal -->|"astha.local Certificate"| Optional_Sync_Node

    CrewPWA <==|"WSS TLS 1.3 (Encrypted CRDT Deltas)"|==> RustHub
    CmoPWA <==|"WSS TLS 1.3 (Encrypted CRDT Deltas)"|==> RustHub
    RustHub ==>|"WSS Habitat Global Status Only"| CabinDisplay

    CmoPWA -.->|"Manual File Handoff<br>astha_export_signed.json (ADR-010)"| ShipRouter
    ShipRouter ==|"Ka-Band / Optical Link (3-22 min latency)"|==> DSN --> Houston
```

---

## 2. Node Specifications and Security Boundaries

### 2.1 Pre-Flight Provisioning (`ADR-020`)
To prevent the crew from having to manage certificates or cryptographic infrastructure in deep space:
* Before launch, Engineering installs the **spacecraft internal CA** root onto every device (`ADR-007`), enabling the secure context (`https://astha.local`) required by the native `window.crypto.subtle` API and Service Workers.
* The PWA and 180-day synthetic dataset are pre-loaded into Cache Storage ($\le 5.0\text{ MB}$).
* Each tablet receives its `Ed25519` device key pair and the PBKDF2-wrapped crew symmetric keys.

### 2.2 Tablet and CMO Console Autonomy (`ADR-008`, `ADR-012`)
* Each tablet and the CMO console run the complete ASTHA bundle locally (`Crew PWA` + `Clinical Engine Worker` + `Data & Sync Worker`).
* **No Clinical Single Point of Failure (`ADR-008`):** The Rust `Sync Hub` operates in a star topology solely to facilitate automatic CRDT delta convergence on the LAN. If the Hub or Wi-Fi network fails, **every device retains 100% of its clinical triage, alerting, and logging capabilities**, converging automatically via `HLC` and `VersionVector` (`ADR-009`) once the link is restored.
* **Privacy Act and HIPAA (`ADR-012`):** The `Sync Hub` stores and relays `AES-GCM-256` encrypted envelopes; it holds no crew keys and is architecturally incapable of reading plaintext medical data (*Zero-Knowledge*).

### 2.3 Public Cabin Displays (`ADR-014`)
* Mounted in common habitat areas. Because they are visible to the entire crew, they hold no crew private keys.
* They render exclusively:
  1. Habitat environmental telemetry ($pp\text{CO}_2$, pressure, $\% O_2$, radiation $\mu\text{Sv/h}$).
  2. Global status indicator (Nominal / Caution / Critical) per crew member, encrypted in a separate record using the habitat key.
  3. **Strict Restriction:** They never display individual biomedical values, diagnoses, or affected organ systems, nor do they allow alarm acknowledgment.

### 2.4 Ground / DSN Boundary (`ADR-010`)
* Per **[ADR-010](08-Architecture-decisions.md#adr-010)** and `RNF-NET-04`, ASTHA opens no outbound sockets and does not implement the DTN network protocol inside the browser (strictly honoring `RNF-NET-01`).
* The CMO generates a standardized **Ed25519-signed JSON file** (anonymized when applicable per `ADR-012`) and hands it off to the spacecraft's external DTN subsystem/transponder, which manages queuing and transmission over the DSN to Houston.
