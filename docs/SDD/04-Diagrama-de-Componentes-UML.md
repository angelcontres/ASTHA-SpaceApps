# 🧩 SDD-04: Diagrama de Componentes UML
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | UML 2.5 | Modelo C4 L2/L3 | **ADRs:** 003, 004, 005, 006, 008, 009, 010, 017

---

## 1. Arquitectura de Contenedores y Componentes Internos

De acuerdo con la descomposición C4-L2/L3 y **[ADR-005](08-Architecture-decisions.md#adr-005)**, el sistema separa estrictamente la **UI compilada en Svelte 5** (`ADR-003`), el **Motor Clínico Determinista** (`Clinical Engine Worker`) y la **Capa de Persistencia Cifrada y Sincronización** (`Data & Sync Worker`).

```mermaid
flowchart TB
    subgraph Crew_PWA_UI ["1. Crew PWA - Hilo Principal UI (Svelte 5 Compilado - ADR-003)"]
        LockScreen["Lock Screen & Global Habitat<br>(Arranque < 1.5s - ADR-014/015)"]
        TacticalHUD["Tactical Dashboard & Cards<br>(uPlot Canvas 2D - ADR-003)"]
        AnatomyViewer["Anatomy Viewer<br>(Three.js Bajo Demanda ADR-004 + SVG)"]
        CountermeasureUI["Countermeasure Guide<br>(3 Bloques, <= 4 Pasos - ADR-017)"]
        AlarmManager["Alarm Manager & Audio<br>(800-1200 Hz, Escalada ADR-013)"]
        CrisisSimUI["Crisis Simulator & Survival Switch<br>(Escenarios A-D, Modo <5W ADR-019)"]
    end

    subgraph Clinical_Worker ["2. Clinical Engine Worker (Dedicated Web Worker TS Puro - ADR-005)"]
        RangeVal["Range Validator<br>(Marca dudosos sin descartar RF-ING-05)"]
        ThresholdEval["Threshold & Sustained Engine<br>(NASA-STD-3001, RF-EVA-01/05)"]
        CorrEngine["Correlation Rule Engine<br>(10 Reglas R-ENV..R-CARD)"]
        DriftDetector["Drift Detector<br>(Regresión 7d + MAD ADR-011)"]
        CounterResolver["Countermeasure Resolver<br>(Valida <= 4 pasos ADR-017)"]
        GamificationCalc["Gamification Scorer<br>(XP, Rachas RF-GAM-01..03)"]
    end

    subgraph Data_Sync_Worker ["3. Data & Sync Worker (Dedicated Web Worker - ADR-006/008/009)"]
        KeyMgr["Key Manager & Role Guard<br>(PBKDF2, Privacy Act ADR-012)"]
        CryptoGuard["Integrity & Crypto Guard<br>(AES-GCM 256, SHA-256 SEU ADR-006)"]
        AuditLedger["Audit Ledger (Append-Only)<br>(Bitácora encadenada RNF-SEC-04)"]
        CRDT_Engine["CRDT & HLC Sync Engine<br>(G-Set, LWW-Map, PNCounter ADR-009)"]
        ExportBuilder["Signed Export Builder<br>(JSON Ed25519 DSN ADR-010)"]
        LocalDatasets["Local Datasets & Synthetic Sim<br>(180d + OSDR Snapshot Local)"]
    end

    subgraph Browser_Infra ["4. Almacenamiento y Caché de Navegador"]
        IndexedDB[("IndexedDB Encrypted Store<br>{id, hlc, autor, iv, ct, sha256, firma}")]
        ServiceWorker["Service Worker Cache-Only<br>(Bundle <= 5 MB RNF-POW-04)"]
    end

    subgraph Optional_Hub ["5. Sync Hub Opcional en LAN (Rust Binary - ADR-008)"]
        HubWSS["WSS Relay & mDNS<br>(astha.local, TLS 1.3 ADR-007)"]
        HubOpLog[("Op-Log Append-Only<br>(Zero-Knowledge Cifrado)")]
    end

    Crew_PWA_UI <-->|postMessage (< 1ms)| Clinical_Worker
    Crew_PWA_UI <-->|postMessage| Data_Sync_Worker
    Data_Sync_Worker <-->|MessageChannel| Clinical_Worker

    Data_Sync_Worker <--> CryptoGuard
    CryptoGuard <--> IndexedDB
    ServiceWorker -.->|Sirve App Shell Offline| Crew_PWA_UI
    CRDT_Engine <==>|WSS TLS 1.3 (LAN Aislada)| HubWSS
    HubWSS <--> HubOpLog
```

---

## 2. Especificación Detallada de Componentes

### 2.1 Subsistema de Presentación (`Crew PWA - UI`, `ADR-003`, `ADR-004`, `ADR-018`)
* **Tecnología Base:** **Svelte 5 (Runes)** compilado sin Virtual DOM. Solo muta los nodos DOM afectados tras recibir eventos de los Workers (0 `setInterval` pasivos).
* **Gráficas (`uPlot`):** Reemplaza a Chart.js/Recharts para minimizar peso y CPU. Dibuja bandas de umbral (`Nominal`, `Precaución`, `Crítico`) mediante hooks Canvas 2D propios.
* **Visor Anatómico (`AnatomyViewer`):** Carga dinámicamente Three.js empaquetado localmente tras el primer pintado. Opera **estrictamente bajo demanda** (1 frame por interacción/cambio de estado, sin auto-rotación ni bucle `requestAnimationFrame`). Dispone de respaldo SVG si el contexto WebGL se pierde o el Comandante activa el Modo Supervivencia (`ADR-019`).
* **Accesibilidad y Diseño (`ADR-018`, `RNF-USA-01..03`):** Fuentes del sistema (`system-ui`, `ui-monospace`), dianas táctiles $\ge 48\text{ px}$ con separación $\ge 12\text{ px}$ para guantes presurizados, y token `alert-red-text` (`#fca5a5`, ratio $10.6:1$ WCAG AAA) separado de `alert-red` (`#ef4444` para pulsos y bordes).

### 2.2 Subsistema Motor Clínico (`Clinical Engine Worker`, `ADR-005`)
* **Aislamiento Estricto:** TypeScript puro sin dependencias externas. Por regla arquitectónica (verificada mediante *lint*), **están prohibidos `fetch`, `WebSocket`, acceso al DOM y temporizadores continuos**.
* **Pipeline Determinista (`< 50 ms`, `RNF-PER-01`):**
  1. `RangeValidator`: Verifica verosimilitud biológica y marca anomalías con `isSuspect = true` sin eliminarlas (`RF-ING-05`).
  2. `Threshold & Sustained`: Evalúa los 12 indicadores contra **NASA-STD-3001** y condiciones sostenidas (`HRV < 20 ms`, `Sueño < 5.5 h >= 2 días`, `RF-EVA-05`).
  3. `CorrEngine`: Evalúa las 10 reglas cruzadas (`R-ENV-01..02`, `R-SANS-01..02`, `R-RAD-01..02`, `R-COG-01`, `R-REN-01..02`, `R-CARD-01`).
  4. `DriftDetector`: Calcula `D-01` (regresión 7d $O(1)$), `D-02` (Z-score modificado MAD $|M_i| \ge 2.5$, `ADR-011`) y `D-03` (patrón combinado).
  5. `CounterResolver`: Selecciona el protocolo terapéutico de 3 bloques (`RF-GUI-01`) y valida la regla estricta de $\le 4$ pasos (`ADR-017`).

### 2.3 Subsistema de Datos, Cifrado y Sync (`Data & Sync Worker`, `ADR-006`, `ADR-008`, `ADR-009`, `ADR-010`)
* **Criptografía Nativa (`crypto.subtle`):** Cifrado `AES-GCM-256` por registro, checksum `SHA-256` contra errores por radiación (*Single Event Upsets* `RNF-SEC-03`), firmas `Ed25519` y derivación `PBKDF2` por PIN (`ADR-012`).
* **Replicación Libre de Conflictos (`CRDT`):** Emplea un `G-Set` para registros clínicos inmutables, `LWW-Map` para configuraciones y `PNCounter` para XP, ordenados por reloj híbrido lógico (`HLC`) y `VersionVector`.
* **Sync Hub Opcional (`ADR-008`):** Binario estático en **Rust** (`tokio`, `rustls`, `tokio-tungstenite`, `mdns-sd`) que anuncia `astha.local` en la LAN y retransmite deltas cifrados sin conocer el contenido clínico (*Zero-Knowledge*).
* **Exportación DSN (`ADR-010`):** Construye un paquete JSON firmado con `Ed25519` para su entrega externa al sistema de comunicaciones de la nave.
