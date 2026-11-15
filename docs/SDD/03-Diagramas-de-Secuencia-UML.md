# ⏱️ SDD-03: UML Sequence Diagrams
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Reference Standards:** NASA-STD-8739.8 | IEEE Std 1016-2009 | UML 2.5 | **ADRs:** 004, 005, 006, 008, 009, 010, 011, 013, 014, 017

---

## 1. Scenario A: Web Worker Clinical Pipeline (< 50 ms) and Alarm Escalation (`ADR-005`, `ADR-011`, `ADR-013`)

Models the reactive, event-driven flow (zero polling) from daily logging or crisis injection through clinical evaluation and the timed escalation protocol for unacknowledged critical alarms.

```mermaid
sequenceDiagram
    autonumber
    actor Crew as Astronaut / Simulator
    participant UI as Crew PWA (Svelte 5 Main Thread)
    participant Engine as Clinical Engine Worker (ADR-005)
    participant Audio as WebAudio & Visual Layer
    participant DataW as Data & Sync Worker
    participant Hub as Sync Hub (astha.local - ADR-008)
    participant CMO as CMO Console / Cabin (ADR-014)

    Crew->>UI: Enters Daily Log or Injects Crisis (RF-SIM-01..04)
    UI->>Engine: postMessage(DailyMeasurement, HabitatTelemetry, Symptoms)
    
    Note over Engine: Budget RNF-PER-01: Full cycle < 50 ms
    Engine->>Engine: 1. Validate bounds and flag suspects without discarding (RF-ING-05)
    Engine->>Engine: 2. Compute Modified Z-Score MAD (ADR-011) and 7d Regression (D-01..D-03)
    Engine->>Engine: 3. Evaluate Correlation Rules R-ENV..R-CARD (RF-EVA-04)
    Engine->>Engine: 4. Resolve Countermeasure <= 4 steps (ADR-017)

    Engine-->>UI: postMessage(TriageResult, ClinicalAlert, Protocol)
    UI->>DataW: MessageChannel: Persist AES-GCM + SHA-256 encrypted envelope (ADR-006)

    alt Alert Severity == CRITICAL (ADR-013 Escalation)
        UI->>Audio: t=0s: Emit 800-1200 Hz tone (10 sec) + #ef4444 Pulse / #fca5a5 Text (ADR-018)
        
        opt If acknowledged == false after 2 minutes
            UI->>Audio: t=120s: Repeat 800-1200 Hz tone (10 sec)
            UI->>DataW: Replicate critical alert via CRDT delta
            DataW->>Hub: WSS Push Encrypted Delta (ADR-008)
            Hub-->>CMO: Notify alert on CMO Console
        end

        opt If acknowledged == false after 5 minutes
            UI->>DataW: Publish global status (no clinical values - ADR-014)
            DataW->>Hub: WSS Push Habitat Global Status
            Hub-->>CMO: Alert on Public Cabin Displays
        end
    else Alert == CAUTION or NOMINAL
        UI->>UI: Update card and status indicator without audio tone (RNF-USA-04)
    end
```

---

## 2. Scenario B: On-Demand 3D Anatomical Triage (`ADR-004`), $\le 4$-Step Checklist (`ADR-017`), and Gamification

Models ergonomic touch interaction ($\ge 48\text{ px}$), the **zero idle frames** rule of the Three.js 3D renderer to satisfy `RNF-POW-01` (CPU $\le 3\%$), and verifiable countermeasure execution.

```mermaid
sequenceDiagram
    autonumber
    actor Astro as Astronaut (Gloves >= 48px)
    participant UI as Anatomy Viewer (Svelte 5)
    participant WebGL as Three.js On-Demand Renderer (ADR-004)
    participant DataW as Data & Sync Worker
    participant IDB as IndexedDB (AES-GCM 256)

    Note over WebGL: Passive monitoring: 0 FPS, no requestAnimationFrame loop
    Astro->>UI: Taps anatomical region (Eyes/Head, Thorax, Kidneys, Legs)
    UI->>WebGL: Request Raycast + 1 Render Frame (onInteraction)
    
    alt WebGL Context Active
        WebGL-->>UI: Draws exactly 1 frame highlighting organ + returns to idle
    else Context Lost or Survival Mode (ADR-019)
        UI->>UI: Instant fallback to interactive SVG Anatomical Map
    end

    UI->>UI: Renders 3 Blocks (RF-GUI-01): Impact, Severity/Time, and Steps (<= 4 ADR-017)
    
    loop For each verified step (Maximum 4 steps - ADR-017)
        Astro->>UI: Checks tactile step completion checkbox (RF-GUI-02)
        UI->>DataW: postMessage(LogActionStep, IncrementXP)
        DataW->>DataW: Update XP PN-Counter (ADR-009) & Chain SHA-256 Ledger (RNF-SEC-04)
        DataW->>IDB: Store EncryptedEnvelope (iv, ct, sha256, Ed25519 sig)
    end
    
    DataW-->>UI: Confirmation of completed protocol and daily streak (RF-GAM-02)
```

---

## 3. Scenario C: LAN Synchronization with Sync Hub (`ADR-008`) and Signed JSON Export (`ADR-010`)

Models partition tolerance without Internet (`RNF-NET-01`), conflict-free convergence via CRDT (`ADR-009`), and offline signed-file generation for handoff to the spacecraft DTN communications system (`ADR-010`).

```mermaid
sequenceDiagram
    autonumber
    actor CMO as Crew Medical Officer (CMO)
    participant ClientA as Device A (Data & Sync Worker)
    participant Hub as Rust Sync Hub (astha.local - ADR-008)
    participant ClientB as CMO Console (Data & Sync Worker)
    participant Transponder as Spacecraft DTN Router (External - ADR-010)

    Note over ClientA,Hub: Isolated spacecraft LAN (mDNS < 3s - RNF-NET-03, WSS TLS 1.3)
    
    alt Sync Hub Available on LAN
        ClientA->>Hub: Connects WSS + Sends local VersionVector (ADR-009)
        Hub-->>ClientA: Sends missing encrypted deltas (G-Set / LWW-Map / PN-Counter)
        ClientA->>Hub: Sends new encrypted EncryptedEnvelopes (Zero-Knowledge on Hub)
        Hub->>Hub: Verifies Ed25519 signature and appends to on-disk Op-Log
        Hub-->>ClientB: Relays encrypted deltas over WSS
        ClientB->>ClientB: Idempotent HLC merge and decrypts with CMO key (ADR-012)
    else Sync Hub Down or Isolated Module
        ClientA->>ClientA: Remains 100% autonomous; accumulates local envelopes for future convergence
    end

    Note over CMO,Transponder: DSN Link Window to Houston (ADR-010)
    CMO->>ClientB: Requests Asynchronous Export for Flight Surgeon (RF-REG-02, RNF-NET-04)
    ClientB->>ClientB: Consolidates trends and events + Anonymizes if non-medical use (ADR-012)
    ClientB->>ClientB: Signs JSON package with device Ed25519 private key
    ClientB-->>CMO: Downloads astha_export_signed.json file
    CMO->>Transponder: Physical/local handoff of JSON to external spacecraft DTN subsystem
```
