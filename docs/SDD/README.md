# 📘 Software Design Description (SDD) — Sistema ASTHA
### Autonomous Space Telemetry & Health Analytics | Fase 2: Diseño Detallado
**NASA Space Apps Challenge 2026** | *Create Health Monitoring Software for Astronauts on Space Missions*

---

## 📋 Control del Documento y Marco Normativo

| Parámetro | Especificación Formal |
| :--- | :--- |
| **Proyecto** | ASTHA — Autonomous Space Telemetry & Health Analytics |
| **Documento** | Software Design Description (SDD) — Colección Modular (Baseline Zero-Desfase) |
| **Versión / Baseline** | **v3.0.0** (Alineación Total SRS ↔ ADRs ↔ C4 ↔ SDD) |
| **Fecha de Publicación** | Noviembre 2026 |
| **Clasificación de Criticidad** | **NASA Class B** (Non-avionics human mission safety-critical / Crew health support) |
| **Estándares Aplicados** | **IEEE Std 1016-2009** (Software Design Descriptions)<br>**ISO/IEC/IEEE 29148:2018** (Requirements Traceability)<br>**NASA-STD-8739.8** (Software Assurance Standard)<br>**NASA-STD-3001** (Space Flight Human-System Standard, Vols 1 & 2)<br>**UML 2.5 & Modelo C4** (OMG / Simon Brown) |
| **Autoridad de Requisitos** | [SRS v1.0](../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md) & [SDD-08: Decisiones ADR (001–020)](08-Architecture-decisions.md) (`ADR-001`) |
| **Umbrales Clínicos** | [Documento de Dominio y Problemática Espacial](../DOCUMENTO_DOMINIO_Y_PROBLEMATICA_ESPACIAL.md) (SRS §6) |
| **Repositorio Oficial** | [angelcontres/AstroVital-SpaceApps](https://github.com/angelcontres/AstroVital-SpaceApps) |

---

## 🎯 1. Propósito, Regla de Autoridad y Enfoque Modular

Este directorio constituye la especificación formal de diseño arquitectónico y detallado (**SDD**) para **ASTHA**. De acuerdo con la regla de gobierno establecida en **[ADR-001](08-Architecture-decisions.md#adr-001)**:
1. El **SRS** prevalece como autoridad de requisitos funcionales (`RF-*`), no funcionales (`RNF-*`), reglas (`R-*`, `D-*`) y criterios (`AC-*`).
2. El **Documento de Dominio** fija los umbrales fisiológicos y ambientales bajo **NASA-STD-3001**.
3. Los **20 Registros de Decisiones de Arquitectura (`ADR-001` a `ADR-020`)** consolidados en **[SDD-08](08-Architecture-decisions.md)** y el **Modelo C4** ([docs/c4/](../c4/00-README.md)) documentan las decisiones vinculantes del equipo que precisan y reconcilian cualquier discrepancia técnica entre documentos previos.

```text
docs/SDD/
├── README.md                                     # 📍 Índice Maestro, Regla de Autoridad y Mapa ADR/C4
├── 01-Arquitectura-Global-del-Sistema.md         # 🏛️ Hexagonal, Web Workers por Eventos, Presupuestos <5W/3% CPU
├── 02-Diagrama-de-Clases-UML.md                  # 🧬 Entidades SRS §5.1, Sobres Cripto AES-GCM, CRDT y Reglas R-*
├── 03-Diagramas-de-Secuencia-UML.md              # ⏱️ Escalada Alarmas ADR-013, 3D Bajo Demanda, JSON Firmado
├── 04-Diagrama-de-Componentes-UML.md             # 🧩 Svelte 5 + uPlot, Clinical Worker, Data/Sync Worker, Sync Hub
├── 05-Diagrama-de-Despliegue-UML.md              # 🚀 Topología LAN Aislada C4-L4, CA Interna, Pantallas de Cabina
├── 06-Diseno-de-Datos-y-Contratos-de-Interfaz.md # 📦 JSON Schemas, Sobre Cifrado, CRDT HLC y Tokens WCAG AAA
├── 07-Matriz-de-Trazabilidad-SRS-a-SDD.md        # 🧭 Mapeo 100% Cerrado: 42 RF + 19 RNF + 10 R-* + 3 D-*
└── 08-Architecture-decisions.md                  # ⚖️ Registro Consolidado de 20 Decisiones de Arquitectura (ADR-001..020)
```

---

## ⚖️ 2. Reconciliación Formal de Decisiones Arquitectónicas (ADRs)

Para garantizar **cero desfase** entre el SRS, los casos de uso históricos y la arquitectura objetivo, el SDD adopta las siguientes resoluciones ratificadas por los ADRs:

| Desfase Histórico Detectado | Resolución Oficial en ADR | Impacto en el Diseño del SDD |
| :--- | :--- | :--- |
| Z clásico vs Z-Score Modificado (`RF-DER-03`) | **[ADR-011](08-Architecture-decisions.md#adr-011)** | Se adopta Z-Score Modificado con Mediana y $MAD$ ($|M_i| \ge 2.5$) sobre línea base de días 1–14. |
| Contramedidas $\le 7$ vs $\le 4$ pasos (`RNF-USA-05`) | **[ADR-017](08-Architecture-decisions.md#adr-017)** | Todo protocolo de contramedida tiene $\le 4$ pasos accionables; intervenciones largas se encadenan. |
| DTN en navegador vs Exportación firmada (`RNF-NET-04`) | **[ADR-010](08-Architecture-decisions.md#adr-010)** | ASTHA genera un JSON firmado con Ed25519 entregado al router DTN externo de la nave; cero tráfico WAN en el navegador. |
| Renderizado 3D continuo vs Bajo demanda (`RNF-POW-01`) | **[ADR-004](08-Architecture-decisions.md#adr-004)** | Three.js local solo en Anatomy Viewer, renderizando 1 frame por evento (0 FPS en reposo) con respaldo SVG. |
| Malla UDP/BLE en navegador vs Sync Hub (`RNF-NET-01`) | **[ADR-008](08-Architecture-decisions.md#adr-008)** | Sync Hub opcional en Rust sobre WSS (`astha.local`) con deltas CRDT ([ADR-009](08-Architecture-decisions.md#adr-009)); autonomía total si cae. |
| Arranque $< 1.5\text{ s}$ vs PBKDF2 (`RNF-PER-02`) | **[ADR-015](08-Architecture-decisions.md#adr-015)** | Los $1.5\text{ s}$ se miden hasta la pantalla de bloqueo (que muestra hábitat y semáforo global [ADR-014](08-Architecture-decisions.md#adr-014)). |
| Contraste texto crítico `#ef4444` (`RNF-USA-03`) | **[ADR-018](08-Architecture-decisions.md#adr-018)** | `#ef4444` se reserva para rellenos/pulsos; todo texto crítico usa `alert-red-text` (`#fca5a5`, ratio $10.6:1$ AAA). |
| Ingesta 1 Hz continua vs Registro diario (`RF-ING-01`) | **[ADR-016](08-Architecture-decisions.md#adr-016)** | Registro fisiológico diario de las 9 variables + dataset sintético de 180 días (720 mediciones); sin Web Bluetooth. |

---

## 📑 3. Catálogo de Módulos SDD y Trazabilidad C4/ADR

| Módulo SDD | Título Formal | Nivel C4 Equivalente | ADRs que lo Gobiernan |
| :--- | :--- | :--- | :--- |
| [**SDD-01**](01-Arquitectura-Global-del-Sistema.md) | **Arquitectura Global del Sistema** | [C4-L1 Contexto](../c4/01-contexto.md) & [C4-L2](../c4/02-contenedores.md) | ADR-001, ADR-002, ADR-003, ADR-005, ADR-011, ADR-015, ADR-019 |
| [**SDD-02**](02-Diagrama-de-Clases-UML.md) | **Diagrama de Clases UML** | [C4-L3 Componentes](../c4/03-componentes.md) | ADR-006, ADR-009, ADR-011, ADR-012, ADR-016, ADR-017 |
| [**SDD-03**](03-Diagramas-de-Secuencia-UML.md) | **Diagramas de Secuencia UML** | Flujos Dinámicos C4 | ADR-004, ADR-005, ADR-008, ADR-010, ADR-013, ADR-017 |
| [**SDD-04**](04-Diagrama-de-Componentes-UML.md) | **Diagrama de Componentes UML** | [C4-L2 Contenedores](../c4/02-contenedores.md) & [C4-L3](../c4/03-componentes.md) | ADR-003, ADR-004, ADR-005, ADR-006, ADR-008 |
| [**SDD-05**](05-Diagrama-de-Despliegue-UML.md) | **Diagrama de Despliegue UML** | [C4-L4 Despliegue](../c4/04-despliegue.md) | ADR-002, ADR-007, ADR-008, ADR-010, ADR-012, ADR-014, ADR-020 |
| [**SDD-06**](06-Diseno-de-Datos-y-Contratos-de-Interfaz.md) | **Diseño de Datos y Contratos de Interfaz** | Contratos SRS §5.1–5.2 | ADR-006, ADR-009, ADR-010, ADR-016, ADR-018 |
| [**SDD-07**](07-Matriz-de-Trazabilidad-SRS-a-SDD.md) | **Matriz de Trazabilidad SRS a SDD** | Cierre Contractual IEEE 29148 | Cobertura integral de los 42 RF, 19 RNF, 10 Reglas `R-*` y 3 Derivas `D-*` |
| [**SDD-08**](08-Architecture-decisions.md) | **Decisiones de Arquitectura (ADR)** | Registro Vinculante ADR-001..020 | Base normativa de decisiones de diseño |
