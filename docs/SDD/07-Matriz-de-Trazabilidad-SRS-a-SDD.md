# 🧭 SDD-07: Matriz de Trazabilidad Completa (SRS ⟷ ADRs ⟷ SDD)
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** ISO/IEC/IEEE 29148 | NASA-STD-8739.8 | IEEE Std 1016-2009 | **Regla de Autoridad:** ADR-001

---

## 1. Cobertura de Requisitos Funcionales (`42 RF` del SRS)

Esta matriz vincula los **42 Requisitos Funcionales** oficiales definidos en la Sección 3 del **SRS** con sus entidades, componentes y flujos de diseño en el **SDD**, indicando el **ADR** que ratifica o precisa cada decisión.

### 1.1 Ingesta de Datos (`RF-ING-01..07`)

| ID SRS | Prior. | Requisito en SRS | Componente / Clase en SDD | ADR Aplicable | Verificación en Diseño |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-ING-01`** | M | Registro de 9 variables diarias con controles grandes aptos para guantes | `DailyMeasurement`, `TacticalHUD` ($\ge 48\text{ px}$) | [ADR-016](08-Architecture-decisions.md#adr-016) | SDD-02, SDD-06 (JSON Schema) |
| **`RF-ING-02`** | M | Telemetría ambiental: $pp\text{CO}_2$, presión, $\% O_2$, radiación ($\mu\text{Sv/h}$) | `HabitatTelemetry`, `Data & Sync Worker` | [ADR-014](08-Architecture-decisions.md#adr-014) | SDD-02, SDD-06 |
| **`RF-ING-03`** | M | Simular bio-monitor y reproducir dataset sintético de 180 días | `LocalDatasets` (en `Data & Sync Worker`) | [ADR-002](08-Architecture-decisions.md#adr-002), [ADR-016](08-Architecture-decisions.md#adr-016) | SDD-04 (~273 KB en bundle) |
| **`RF-ING-04`** | M | Reportar síntomas subjetivos (catálogo cerrado) con un toque | `SubjectiveSymptom` (6 síntomas en SDD-06) | — | SDD-02, SDD-06 |
| **`RF-ING-05`** | S | Validar rangos posibles y marcar dudosos **sin descartar** | `RangeValidator` (`isSuspect = true`) | [ADR-005](08-Architecture-decisions.md#adr-005) | SDD-03 (Escenario A), SDD-04 |
| **`RF-ING-06`** | S | Importar y exportar historial en JSON | `ExportBuilder` / `Data & Sync Worker` | [ADR-010](08-Architecture-decisions.md#adr-010) | SDD-04, SDD-06 |
| **`RF-ING-07`** | C | Prueba de reflejo pupilar o escaneo cutáneo por cámara | *Diferido fuera de MVP* (C4 `00-README §2.1`: requiere `getUserMedia` sin presupuesto de energía) | [ADR-001](08-Architecture-decisions.md#adr-001) | Documentado explícitamente como GAP aceptado (Prioridad C) |

### 1.2 Evaluación y Triage (`RF-EVA-01..07`)

| ID SRS | Prior. | Requisito en SRS | Componente / Clase en SDD | ADR Aplicable | Verificación en Diseño |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-EVA-01`** | M | Clasificar cada indicador (Nominal, Precaución, Crítico) | `ThresholdEval` en `Clinical Engine Worker` | [ADR-001](08-Architecture-decisions.md#adr-001) | Umbrales SRS §6.1 / Dominio |
| **`RF-EVA-02`** | M | Estado global del tripulante = peor estado activo | `ClinicalEngine.evaluateRecord()` | [ADR-014](08-Architecture-decisions.md#adr-014) | SDD-02, SDD-04 |
| **`RF-EVA-03`** | M | Asignar cada hallazgo a uno de los 7 sistemas de órganos | `OrganMapper` / `ClinicalAlert.organSystem` | [ADR-004](08-Architecture-decisions.md#adr-004) | SDD-02, SDD-04 |
| **`RF-EVA-04`** | M | Aplicar 10 reglas de correlación ambiental-fisiológica | `CorrEngine` (`R-ENV`..`R-CARD`) | [ADR-005](08-Architecture-decisions.md#adr-005) | SDD-04, Sección 3 abajo |
| **`RF-EVA-05`** | M | Condiciones sostenidas (`HRV < 20ms`; `sueño < 5.5h >= 2d`) | `Threshold & Sustained Engine` | [ADR-016](08-Architecture-decisions.md#adr-016) | SDD-04 |
| **`RF-EVA-06`** | M | Explicabilidad: regla, valores causantes y umbral | `ClinicalAlert` (`ruleId`, `triggeringValues`, `thresholdRef`) | — | SDD-02 |
| **`RF-EVA-07`** | M | Evaluación con cero paquetes de red enviados o recibidos | `Clinical Engine Worker` (sin `fetch` ni `WS`) | [ADR-002](08-Architecture-decisions.md#adr-002), [ADR-005](08-Architecture-decisions.md#adr-005) | SDD-01, SDD-04 (regla lint) |

### 1.3 Detección de Deriva (`RF-DER-01..04`)

| ID SRS | Prior. | Requisito en SRS | Componente / Clase en SDD | ADR Aplicable | Verificación en Diseño |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-DER-01`** | M | Tendencia por regresión lineal en ventana móvil de 7 días | `DriftDetector` (`D-01`: sumas móviles $O(1)$) | [ADR-005](08-Architecture-decisions.md#adr-005) | SDD-01, SDD-02 |
| **`RF-DER-02`** | M | Alerta precoz si proyección a 7 días cruza precaución | `DriftDetector` (`D-01`) | — | SDD-01 |
| **`RF-DER-03`** | S | Línea base 14 días y z-score $\ge 2.5$ | `DriftDetector` (`D-02`: **Z-Score Modificado MAD**) | [ADR-011](08-Architecture-decisions.md#adr-011) | Reconciliado por ADR-011 (SDD-01) |
| **`RF-DER-04`** | M | Patrón combinado (sueño decreciente + PAD creciente) | `DriftDetector` (`D-03`) | — | SDD-01 |

### 1.4 Guía de Contramedidas (`RF-GUI-01..05`)

| ID SRS | Prior. | Requisito en SRS | Componente / Clase en SDD | ADR Aplicable | Verificación en Diseño |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-GUI-01`** | M | 3 bloques obligatorios: impacto anatómico, severidad/tiempo, acciones | `CountermeasureProtocol` / `CountermeasureUI` | [ADR-017](08-Architecture-decisions.md#adr-017) | SDD-02, SDD-03 (Escenario B) |
| **`RF-GUI-02`** | M | Acciones secuenciales y verificables (casilla por paso) | `CountermeasureUI` (máximo 4 pasos) | [ADR-017](08-Architecture-decisions.md#adr-017) | SDD-03 (Escenario B) |
| **`RF-GUI-03`** | M | Solo recursos a bordo (ARED, LBNP, botiquín, refugio, LiOH/CDRA) | `CounterResolver` (catálogo JSON cerrado) | [ADR-017](08-Architecture-decisions.md#adr-017) | SDD-04 |
| **`RF-GUI-04`** | M | Lenguaje no médico y definición de términos | `CountermeasureUI` | — | SDD-04 |
| **`RF-GUI-05`** | S | Indicar qué enviar al Flight Surgeon asíncronamente | `ExportBuilder` (JSON firmado para DSN) | [ADR-010](08-Architecture-decisions.md#adr-010) | SDD-03 (Escenario C) |

### 1.5 Modelo Anatómico, Panel, Gamificación, Simulador y Registro (`RF-ANA`, `RF-DSH`, `RF-GAM`, `RF-SIM`, `RF-REG`)

| ID SRS | Prior. | Requisito en SRS | Componente / Clase en SDD | ADR Aplicable | Verificación en Diseño |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`RF-ANA-01..04`** | M | Cuerpo interactivo frontal/posterior, 5 regiones, color + símbolo, detalle | `AnatomyViewer` (Three.js bajo demanda + respaldo SVG) | [ADR-004](08-Architecture-decisions.md#adr-004), [ADR-018](08-Architecture-decisions.md#adr-018) | SDD-03 (Escenario B), SDD-04 |
| **`RF-DSH-01..04`** | M/S | Tarjetas, gráficas con bandas, selector tripulación, telemetría hábitat | `TacticalHUD` (Svelte 5 + `uPlot` canvas 2D) | [ADR-003](08-Architecture-decisions.md#adr-003), [ADR-014](08-Architecture-decisions.md#adr-014) | SDD-04, SDD-05 |
| **`RF-GAM-01..03`** | M/S | XP/medallas, rachas, sin ocultar ni retrasar alertas clínicas | `GamificationCalc`, `PNCounter` (CRDT) | [ADR-009](08-Architecture-decisions.md#adr-009), [ADR-013](08-Architecture-decisions.md#adr-013) | SDD-02, SDD-03 (Escenario B) |
| **`RF-SIM-01..05`** | M/S | Escenarios crisis A (SPE), B (SANS), C (CO2), D (Cálculo renal), Reset | `CrisisSimUI` ➔ inyecta registros al `Clinical Engine` | [ADR-016](08-Architecture-decisions.md#adr-016) | SDD-03 (Escenario A), SDD-04 |
| **`RF-REG-01..03`** | M/S | Bitácora local, exportación asíncrona, modo alto contraste y texto grande | `AuditLedger`, `SignedDsnExport`, Tokens CSS AAA | [ADR-006](08-Architecture-decisions.md#adr-006), [ADR-010](08-Architecture-decisions.md#adr-010), [ADR-018](08-Architecture-decisions.md#adr-018) | SDD-02, SDD-06 |

---

## 2. Cobertura de Requisitos No Funcionales (`19 RNF` + `RNF-09` del SRS)

| ID SRS | Requisito No Funcional | Diseño Arquitectónico en SDD | ADR de Soporte | Mecanismo de Verificación |
| :--- | :--- | :--- | :--- | :--- |
| **`RNF-POW-01`** | CPU en reposo $\le 3.0\%$, cero polling | Web Workers dormidos, Svelte sin VDOM, Three.js 0 FPS pasivos | [ADR-003](08-Architecture-decisions.md#adr-003), [ADR-004](08-Architecture-decisions.md#adr-004), [ADR-005](08-Architecture-decisions.md#adr-005) | Performance Profiler (throttling x4) |
| **`RNF-POW-02`** | Autonomía 16h ($< 350\text{ mW}$) | OLED `#030712`, `low-power` GPU, Modo Supervivencia manual | [ADR-003](08-Architecture-decisions.md#adr-003), [ADR-019](08-Architecture-decisions.md#adr-019) | Medición drenaje en tableta 8h |
| **`RNF-POW-03`** | RAM $\le 150\text{ MB}$ | `Float32Array` ($< 1\text{ MB}$), `dispose()` WebGL, 1 registro/día | [ADR-004](08-Architecture-decisions.md#adr-004), [ADR-016](08-Architecture-decisions.md#adr-016) | Heap Snapshot en DevTools |
| **`RNF-POW-04`** | Bundle total $\le 5.0\text{ MB}$ | Svelte 5 + uPlot + Three.js local + dataset (~273 KB). Excluye 24 MB | [ADR-003](08-Architecture-decisions.md#adr-003) | Peso total `npm run build` |
| **`RNF-PER-01`** | Latencia de evaluación $< 50\text{ ms}$ | Pipeline $O(\text{reglas})$ y regresión $O(1)$ en Worker | [ADR-005](08-Architecture-decisions.md#adr-005), [ADR-011](08-Architecture-decisions.md#adr-011) | `performance.now()` en Worker |
| **`RNF-PER-02`** | Arranque en frío $< 1.5\text{ s}$ | Medido hasta **pantalla de bloqueo** con hábitat y semáforo global | [ADR-014](08-Architecture-decisions.md#adr-014), [ADR-015](08-Architecture-decisions.md#adr-015) | Lighthouse FCP/TTI offline |
| **`RNF-USA-01`** | Táctil guantes $\ge 48\text{ px}$ / $12\text{ px}$ gap | Contratos CSS estrictos en SDD-06 (`--touch-target-min`) | — | Inspección CSS & prueba con guante |
| **`RNF-USA-02`** | Regla de oro de $\le 3$ toques | Navegación plana en `App.svelte` / `AnatomyViewer` | — | Conteo de toques por caso de uso |
| **`RNF-USA-03`** | Contraste WCAG AAA ($\ge 7:1$) + Modo Rojo | Token `alert-red-text #fca5a5` ($10.6:1$) + modo $630\text{ nm}$ | [ADR-018](08-Architecture-decisions.md#adr-018) | Analizador de contraste WCAG AAA |
| **`RNF-USA-04`** | Alarmas redundantes 800–1200 Hz (ISO 9703-2) | Web Audio tono 10s + **escalada a 2m (CMO) y 5m (Cabina)** | [ADR-013](08-Architecture-decisions.md#adr-013) | Espectro de audio y secuencia SDD-03 |
| **`RNF-USA-05`** | 3 bloques y pasos secuenciales | **Reconciliado a $\le 4$ pasos máximos** (cadenas si excede) | [ADR-017](08-Architecture-decisions.md#adr-017) | Validación `CounterResolver` |
| **`RNF-SEC-01`** | Cifrado local `AES-GCM 256` (`crypto.subtle`) | `EncryptedEnvelope` en IndexedDB (`{id, hlc, autor, iv, ct, sha256, firma}`) | [ADR-006](08-Architecture-decisions.md#adr-006) | Lectura cruda de IndexedDB |
| **`RNF-SEC-02`** | Control RBAC local (Astronauta vs CMO) | Segregación criptográfica por claves envueltas con PIN (Privacy Act) | [ADR-012](08-Architecture-decisions.md#adr-012), [ADR-020](08-Architecture-decisions.md#adr-020) | Pruebas de descifrado cruzado |
| **`RNF-SEC-03`** | Resiliencia SEU / Bit-flip con `SHA-256` | Verificación SHA-256 al leer + recuperación desde Op-Log/pares | [ADR-006](08-Architecture-decisions.md#adr-006) | Inyección de corrupción de bytes |
| **`RNF-SEC-04`** | Bitácora inmutable *Append-Only* | `AuditLedger` encadenado con `SHA-256` previo + firma `Ed25519` | [ADR-006](08-Architecture-decisions.md#adr-006), [ADR-009](08-Architecture-decisions.md#adr-009) | Pruebas de inmutabilidad |
| **`RNF-NET-01`** | Sync LAN sin Internet (Zero-WAN) | LAN cerrada `astha.local` vía WSS TLS 1.3 con Hub opcional | [ADR-002](08-Architecture-decisions.md#adr-002), [ADR-007](08-Architecture-decisions.md#adr-007), [ADR-008](08-Architecture-decisions.md#adr-008) | Captura Wireshark sin tráfico WAN |
| **`RNF-NET-02`** | Tolerancia a particiones (CRDTs) | `G-Set` + `LWW-Map (HLC)` + `PN-Counter` + `VersionVector` | [ADR-009](08-Architecture-decisions.md#adr-009) | Partición intencional y merge |
| **`RNF-NET-03`** | Descubrimiento autónomo $< 3\text{ s}$ | Anuncio mDNS `astha.local` desde Sync Hub en Rust | [ADR-007](08-Architecture-decisions.md#adr-007), [ADR-008](08-Architecture-decisions.md#adr-008) | Alta de nodo en LAN $< 3\text{ s}$ |
| **`RNF-NET-04`** | Exportación JSON firmado para DSN | `SignedDsnExport` firmado con `Ed25519` entregado al router externo | [ADR-010](08-Architecture-decisions.md#adr-010) | Validación contra JSON Schema SDD-06 |
| **`RNF-09`** *(SRS §6)* | Umbrales editables como datos | Reglas y rangos separados como catálogos JSON en `ClinicalEngine` | [ADR-005](08-Architecture-decisions.md#adr-005) | Inspección de catálogo JSON |

---

## 3. Cobertura de Reglas Clínicas (`10 R-*` y `3 D-*` del SRS §6.2–6.3)

Todas las reglas de correlación y deriva se ejecutan de forma determinista dentro de **`Clinical Engine Worker`** (`CorrEngine` y `DriftDetector`):

| ID Regla SRS | Condición Clínica | Sistema de Órganos | Módulo SDD Responsable |
| :--- | :--- | :--- | :--- |
| **`R-ENV-01`** | $pp\text{CO}_2 > 3.0\text{ mmHg}$ y $SpO_2 < 94\%$ | Respiratorio / Ambiental | `CorrEngine` (SDD-04) |
| **`R-ENV-02`** | $pp\text{CO}_2 > 3.0\text{ mmHg}$ y Cefalea | Neuro-ocular | `CorrEngine` (SDD-04) |
| **`R-SANS-01`** | $PAS > 135\text{ mmHg}$ y Visión borrosa | Neuro-ocular | `CorrEngine` (SDD-04) |
| **`R-SANS-02`** | $PAS > 135\text{ mmHg}$ y Sueño $< 6\text{ h}$ | Neuro-ocular | `CorrEngine` (SDD-04) |
| **`R-RAD-01`** | Radiación $> 100\ \mu\text{Sv/h}$ | Radiación | `CorrEngine` (SDD-04) |
| **`R-RAD-02`** | Radiación $> 100\ \mu\text{Sv/h}$ y Náuseas | Radiación (Emergencia) | `CorrEngine` (SDD-04) |
| **`R-COG-01`** | Sueño $< 5.5\text{ h}$ y $HRV < 25\text{ ms}$ | Cognitivo | `CorrEngine` (SDD-04) |
| **`R-REN-01`** | Calcio urinario $> 300\text{ mg/día}$ y Dolor lumbar | Renal | `CorrEngine` (SDD-04) |
| **`R-REN-02`** | Calcio urinario $250 - 300\text{ mg/día}$ | Renal | `CorrEngine` (SDD-04) |
| **`R-CARD-01`** | Mareo ortostático y $HR > 100\text{ bpm}$ | Cardiovascular | `CorrEngine` (SDD-04) |
| **`D-01`** | Proyección lineal 7 días cruza umbral precaución | Multiorgánico | `DriftDetector` (SDD-01) |
| **`D-02`** | Modified Z-Score $\|M_i\| \ge 2.5$ (`MAD`, `ADR-011`) | Multiorgánico | `DriftDetector` (SDD-01) |
| **`D-03`** | Sueño pendiente $(-)$ y $PAD$ pendiente $(+)$ en 7 días | Neuro-cardiovascular | `DriftDetector` (SDD-01) |
