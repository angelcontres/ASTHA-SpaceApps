# 🧩 SDD-04: Diagrama de Componentes UML
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | UML 2.5

---

## 1. Diagrama de Componentes del Sistema

Muestra la descomposición modular de alto nivel de ASTHA, destacando los puertos y adaptadores de ingesta, el núcleo de soporte de decisiones, la persistencia local y la interfaz de cabina.

```mermaid
flowchart TB
    subgraph UI_Layer ["Capa de Presentación y Experiencia de Vuelo (Avionics Cockpit)"]
        HUD["Tactical HUD Controller"]
        ThreeJS["Digital Twin 3D Viewport (Three.js WebGL)"]
        ChartTelemetry["Aerospace Telemetry Charts (Chart.js)"]
        Modals["Clinical Modals (Master Caution, Bio-Passport, Technical Schematics)"]
        AudioFX["Web Audio Synthesizer (Cockpit Sounds & Klaxon)"]
    end

    subgraph CDSS_Layer ["Capa de Soporte de Decisiones Clínicas (CDSS Core)"]
        IngestionService["Telemetry Ingestion & Validation Service"]
        MAD_Engine["Modified Z-Score & Outlier Engine (MAD)"]
        ClinicalRules["Aerospace Clinical Rule Engine (NASA-STD-3001)"]
        CountermeasureCtrl["Countermeasure & Protocol Execution Controller"]
    end

    subgraph Storage_DTN ["Capa de Resiliencia Edge & Red Tolerante a Retardos (DTN)"]
        LocalStore["Local Edge Storage (IndexedDB / LocalStorage)"]
        DtnPackager["DTN Space-Link Packager (RFC 9171 / CCSDS)"]
        SyncManager["Store-and-Forward Synchronization Manager"]
    end

    subgraph External_Sensors ["Fuentes Telemétricas & Sensores de Cabina"]
        AstroskinBLE["Astroskin Smart-Shirt (BLE / Mesh WiFi)"]
        ECLSS_Bus["ECLSS Cabin Sensors (MIL-STD-1553 / RS-485)"]
        OSDR_API["NASA Open Science Data Repository (OSDR REST API)"]
    end

    AstroskinBLE --> IngestionService
    ECLSS_Bus --> IngestionService
    OSDR_API --> IngestionService

    IngestionService --> MAD_Engine
    MAD_Engine --> ClinicalRules
    ClinicalRules --> CountermeasureCtrl

    ClinicalRules --> HUD
    ClinicalRules --> ThreeJS
    ClinicalRules --> Modals
    ClinicalRules --> AudioFX
    IngestionService --> ChartTelemetry

    CountermeasureCtrl --> LocalStore
    LocalStore --> DtnPackager
    DtnPackager --> SyncManager
```

---

## 2. Descripción de Subsistemas e Interfaces

### 2.1 Subsistema de Ingesta y Adaptación de Sensores
* **`AstroskinBLE`**: Driver de comunicación inalámbrica de baja energía (Bluetooth Low Energy 5.0) para la ingesta continua de ECG de 3 derivaciones (250 Hz) y pletismografía inductiva respiratoria (25 Hz).
* **`ECLSS_Bus`**: Interfaz de hardware para el bus de instrumentación de cabina (MIL-STD-1553 / RS-485) que reporta $	ext{PPO}_2$, $	ext{PPCO}_2$, presión total y dosimetría de neutrones secundarios.
* **`OSDR_API`**: Gateway de sincronización previa al vuelo con los 116 estudios biológicos humanos del repositorio oficial **NASA Open Science Data Repository (OSDR)**.

### 2.2 Subsistema Núcleo de Soporte Clínico (CDSS Core)
* **`MAD_Engine`**: Algoritmo que calcula la dispersión no paramétrica para filtrar anomalías verdaderas frente a variaciones circadianas normales.
* **`ClinicalRules`**: Conjunto determinista de reglas médicas calibradas según los límites permisibles del estándar **NASA-STD-3001**.
* **`CountermeasureCtrl`**: Motor de despacho terapéutico que guía la ejecución de contramedidas paso a paso (farmacológicas, fluidoterapia, LBNP o purgas de $	ext{CO}_2$).

### 2.3 Subsistema de Presentación (Avionics Cockpit)
* **`Tactical HUD`**: Cabecera táctica con reloj de tiempo transcurrido de misión (MET) y selector de tripulante.
* **`ThreeJS Viewport`**: Escena WebGL con gemelo digital procedural, selector de capas (`Humano`, `Híbrido`, `Traje EVA`, `Rayos-X`) e interactividad por raycast.
* **`AudioFX`**: Sintetizador de tonos de audio de cabina mediante osciladores Web Audio (chime, blip, alarma Klaxon de dos tonos para emergencias críticas).
