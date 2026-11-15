# ⏱️ SDD-03: Diagramas de Secuencia UML
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | UML 2.5

---

## 1. Escenario A: Ingesta en Tiempo Real, Detección de Deriva (Modified Z-Score) y Master Caution

Este flujo dinámico modela la recepción continua de bioseñales, el filtrado estadístico robusto contra falsos positivos y el disparo de la alarma centralizada **Master Caution & Warning** ante una deriva fisiológica crítica.

```mermaid
sequenceDiagram
    autonumber
    actor Sensor as Astroskin Bio-Harness / ECLSS
    participant EdgeIngest as TelemetryIngestionService
    participant ZScore as ModifiedZScoreDetector
    participant CDSS as CdssRuleEngine
    participant Caution as MasterCautionSystem
    participant Audio as CockpitAudioEngine
    participant HUD as TacticalHUDView
    participant Twin as DigitalTwin3D

    Sensor->>EdgeIngest: Transmit Raw Telemetry Packet (HR, BP, SpO2, HRV, CO2)
    EdgeIngest->>ZScore: Stream Vital Sample (currentSample, baselineWindow)
    Note over ZScore: Compute MAD & Modified Z-Score: Mi = 0.6745*(xi - x_med)/MAD
    alt Modified Z-Score > 3.5 (Significant Drift)
        ZScore-->>CDSS: Flag Anomaly (Drift Detected in Intracranial Pressure & SpO2)
        CDSS->>CDSS: Correlate Vitals with ECLSS (High CO2 + Microgravity Fluid Shift)
        CDSS->>Caution: Raise Critical Alert (SANS Grade 3 / SPE / Acidosis)
        Caution->>Audio: Play Audio Alarm (Alarm Siren / Klaxon)
        Caution->>HUD: Display Specialized Alert Modal with Clinical Diagnostics
        CDSS->>Twin: Set Organ Distress Beacon & Warning Halos (target: Eyes / Heart)
        Twin->>Twin: Focus 3D Camera & Pulse Target Anatomy
    else Normal Physiological Deviation
        ZScore-->>EdgeIngest: Nominal (Within Operational Envelope)
        EdgeIngest->>HUD: Update Real-time Trend Sparklines
    end
```

---

## 2. Escenario B: Triage Fisiológico Interactivo en 3D y Ejecución de Contramedidas

Describe la interacción directa cuando el astronauta o el oficial médico inspecciona un órgano comprometido mediante **raycasting 3D** en el gemelo digital y ejecuta las directivas del protocolo clínico guiado.

```mermaid
sequenceDiagram
    autonumber
    actor Astronaut as Astronaut / Crew Medical Officer
    participant Canvas as ThreeJS 3D Viewport
    participant Raycast as RaycastPicker
    participant Drawer as OrganModalDrawer
    participant Protocol as CountermeasureEngine
    participant DTN as DtnBundleLogger
    actor FlightSurgeon as Earth Flight Surgeon (Houston)

    Astronaut->>Canvas: Click on 3D Anatomical Organ (e.g. Head / Eyes)
    Canvas->>Raycast: Evaluate Pointer Coordinates (Raycaster.intersectObjects)
    Raycast-->>Canvas: Hit Detected: meshEyesNode (y >= 1.95)
    Canvas->>Drawer: triggerOrganInspection('eyes')
    Drawer->>Drawer: Load Pathophysiology, Pain Score (7/10), SANS Protocol
    Drawer-->>Astronaut: Display Clinical Drawer with Action Checklist
    Astronaut->>Drawer: Confirm Directive: "Infusión IV Salina Hipertónica 3% + LBNP"
    Drawer->>Protocol: applyDrawerTreatment()
    Protocol->>Protocol: Update Pain Score (7/10 -> 1/10 Aliviado)
    Protocol->>DTN: Log Treatment Execution into Mission Medical Logbook
    Note over DTN: Package into RFC 9171 DTN Bundle (Bundle Protocol v7)
    DTN-->>FlightSurgeon: Asynchronous Telemetry Delivery via Deep Space Network (22-min delay)
```

---

## 3. Escenario C: Empaquetamiento y Sincronización Asíncrona Resiliente DTN

Modela el protocolo de transporte tolerante a demoras e interrupciones (**RFC 9171 / CCSDS**) para transferir la bitácora médica de vuelo hacia la Tierra salvando los retardos relativistas y ventanas de ocultamiento orbital.

```mermaid
sequenceDiagram
    autonumber
    participant System as ASTHA Telemetry Engine
    participant BundlePacker as DtnBundleProtocolEngine
    participant Storage as LocalStorage / IndexedDB
    participant DtnDaemon as On-Board DTN Node
    participant Transceiver as Deep Space Ka-Band Antenna
    participant GroundStation as DSN Earth Station (Madrid / Goldstone)

    System->>BundlePacker: New Medical Telemetry Event (Vital Shift / Treatment Log)
    BundlePacker->>BundlePacker: Serialize to CBOR / RFC 9171 Bundle Structure
    BundlePacker->>Storage: Store Bundle Locally in Persistent Buffer Queue
    Storage-->>BundlePacker: Commit Acknowledged (Local Resilience Guaranteed)

    loop Every Telemetry Sweep (1 Hz)
        DtnDaemon->>Transceiver: Query RF Carrier Link State
        alt Carrier Available & Ephemeris Lock
            Transceiver-->>DtnDaemon: Link Open (Ka-Band / Optical Ground Track Active)
            DtnDaemon->>Storage: Dequeue Buffered Telemetry Bundles
            Storage-->>DtnDaemon: Deliver Bundles [B_001, B_002, B_003]
            DtnDaemon->>Transceiver: Transmit Bundles with Custody Transfer Flag
            Transceiver-->>GroundStation: Physical Propagation (Speed of Light, 22 min)
            GroundStation-->>DtnDaemon: Return Custody Acceptance Signal
            DtnDaemon->>Storage: Mark Bundles as Transmitted / Archive
        else Out of Line-of-Sight / Solar Occlusion
            Transceiver-->>DtnDaemon: Link Down (RF Blackout / Occlusion)
            Note over Storage: Maintain Zero-Loss Buffer in Flash Storage indefinitely
        end
    end
```
