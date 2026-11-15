# 🧭 SDD-07: Matriz de Trazabilidad Requisitos a Diseño (RTM)
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | ISO/IEC/IEEE 29148 | NASA Systems Engineering Handbook

---

## 1. Mapeo Bidireccional SRS (Fase 1) ➔ SDD (Fase 2)

Esta matriz vincula formalmente cada Requisito Funcional (**RF**) y No Funcional (**RNF**) del documento **SRS** con las clases de diseño, módulos arquitectónicos y mecanismos de verificación definidos en este **SDD**.

| ID Requisito SRS | Descripción del Requisito en SRS | Clase / Módulo de Diseño en SDD | Mecanismo de Verificación en Diseño |
| :--- | :--- | :--- | :--- |
| **RF-01** | Ingesta telemétrica de signos vitales (HR, BP, SpO2, HRV, Temp) | `TelemetryIngestionService`, `VitalSignReading` | Diagrama de Clases & Secuencia Escenario A |
| **RF-02** | Detección de deriva fisiológica y filtrado de anomalías sin falsas alarmas | `ModifiedZScoreDetector` | Algoritmo MAD (Capa CDSS) |
| **RF-03** | Gemelo Digital 3D interactivo con capas anatómicas y raycasting | `DigitalTwin3DController`, `RaycastPicker` | Diagrama de Componentes (Three.js WebGL) |
| **RF-04** | Alarma centralizada Master Caution & Warning visual y sonora | `MasterCautionSystem`, `CockpitAudioEngine` | Diagrama de Secuencia Escenario A |
| **RF-05** | Prescripción y checklist de contramedidas paso a paso | `ClinicalDirective`, `CountermeasureEngine` | Diagrama de Secuencia Escenario B |
| **RF-06** | Correlación ambiental de soporte vital (ECLSS NASA-STD-3001) | `EclssEnvironmentReading`, `CdssRuleEngine` | Diagrama de Componentes & Clases |
| **RF-07** | Integración genómica con NASA OSDR (OSD-574 Inspiration4) | `GenomicBiomarkerProfile`, `OSDR_API` Gateway | Diagrama de Clases & Datos |
| **RF-08** | Almacenamiento local persistente y transmisión asíncrona DTN | `DtnBundleProtocolEngine`, `LocalStore` | Diagrama de Secuencia Escenario C & Despliegue |
| **RNF-01** | Autonomía 100% Edge en la nave (Cero dependencia de servidores en la nube) | `Edge_Medical_Server` (DST-1 Node) | Diagrama de Despliegue |
| **RNF-02** | Latencia de renderizado 3D $\le 16.6	ext{ ms}$ (60 FPS estables) | `DigitalTwin3DController` (Three.js procedural) | Capa de Presentación |
| **RNF-03** | Resiliencia temporal ante retardo de comunicación de hasta 22 minutos | `DTN_Daemon` (RFC 9171 Store-and-Forward) | Diagrama de Despliegue & Secuencia C |

---

## 2. Conclusión de Cobertura de Diseño
* **100% de Requisitos Funcionales del SRS** cuentan con una entidad de clases, un componente arquitectónico y un flujo dinámico asignado.
* **Cero Requisitos Huérfanos:** No existe ningún componente en el SDD que no responda a un requerimiento operativo justificado por el exposoma espacial (**NASA R.I.D.G.E.**) y la normativa **NASA-STD-3001**.
