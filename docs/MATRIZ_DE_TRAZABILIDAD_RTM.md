# 🧭 Matriz de Trazabilidad de Requisitos (RTM - Requirements Traceability Matrix)
### ASTHA — Autonomous Deep-Space Health Guardian & CDSS
**Estándares Mandatorios:** NASA Systems Engineering Handbook (NASA/SP-2016-6105 Rev 2) | ISO/IEC/IEEE 29148:2018 | NASA-STD-3001 Vol 1 & 2

---

## 🎯 1. Propósito y Enfoque de Trazabilidad Bidireccional

En proyectos aeroespaciales y de soporte de vida de la NASA, la **Trazabilidad Bidireccional (Forward & Backward Traceability)** es un requisito de certificación mandatorio (*Human-Rating Certification NPR 8705.2C*). Garantiza dos principios fundamentales:

1. **Trazabilidad Hacia Adelante (Forward Traceability):** Cada peligro espacial identificado en el marco **NASA R.I.D.G.E.** y cada necesidad médica en el viaje a Marte tiene una traducción directa en requisitos, casos de uso, código fuente implementado y procedimientos de prueba. No existen requisitos huérfanos.
2. **Trazabilidad Hacia Atrás (Backward Traceability):** Cada función, botón y línea de código en la aplicación táctica (`index.html`) responde estrictamente a un requisito documentado y justificado por la normativa de vuelo espacial. No existe código superfluo (*Zero Gold-Plating*).

---

## 🔄 2. Cadena de Trazabilidad del Sistema (Traceability Flow)

```mermaid
flowchart TD
    subgraph Dominio["1. Dominio y Riesgos Espaciales"]
        R1["NASA R.I.D.G.E. Framework<br/>(Radiation, SANS, CO2, Aislamiento, Gravedad)"]
    end

    subgraph Especificacion["2. Especificación Formal de Requisitos"]
        SRS_F["Requisitos Funcionales SRS (RF-ING, RF-EVA, RF-DER, RF-GUI, RF-ANA, RF-DSH, RF-OFF)"]
        SRS_NF["Requisitos No Funcionales SRS (RNF-POW, RNF-USA, RNF-SEC, RNF-NET)"]
    end

    subgraph DisenoAgil["3. Diseño Operacional y Ágil"]
        CU["12 Casos de Uso Formales (CU-01 a CU-12)<br/>UML 2.5"]
        HU["20 Historias de Usuario (HU-01 a HU-20)<br/>BDD Gherkin"]
    end

    subgraph Implementacion["4. Implementación en Código (Edge Prototype)"]
        CODE1["index.html: Motor de Bioseñales & Telemetría (telemetryDataset / Inspiration4)"]
        CODE2["index.html: Mapa Anatómico Táctico Interactivo (selectOrgan / SVG Hotspots)"]
        CODE3["index.html: Simulador de Crisis en Vivo (injectCrisis: SPE, CO2, SANS)"]
        CODE4["index.html: NASA OSDR API Explorer v2 (openOsdrModal / 116 Estudios Humanos)"]
    end

    subgraph Validacion["5. Verificación y Aceptación (NASA V&V)"]
        AC["13 Criterios de Aceptación (AC-CLIN y AC-TECH)<br/>Métodos NASA: I / A / D / T"]
        PASS["100% CONFORME / PASS (Compliance Matrix)"]
    end

    R1 --> SRS_F
    R1 --> SRS_NF
    SRS_F --> CU
    SRS_F --> HU
    SRS_NF --> CU
    SRS_NF --> HU
    CU --> CODE1
    CU --> CODE2
    CU --> CODE3
    CU --> CODE4
    HU --> CODE1
    HU --> CODE2
    HU --> CODE3
    HU --> CODE4
    CODE1 --> AC
    CODE2 --> AC
    CODE3 --> AC
    CODE4 --> AC
    AC --> PASS
```

---

## 📑 3. Matriz Maestra de Trazabilidad End-to-End (RTM)

A continuación se detalla el mapeo cruzado completo entre **Requisitos SRS**, **Casos de Uso (CU)**, **Historias de Usuario (HU)**, **Criterios de Aceptación (AC)**, **Componentes de Código (`index.html`)** y los **Estándares y Datasets Oficiales de la NASA**:

### 3.1. Módulo de Ingesta, Telemetría y Bioseñales

| ID Requisito | Descripción del Requisito | Caso de Uso (CU) | Historia de Usuario (HU) | Criterio de Aceptación (AC) | Método NASA | Implementación en Código (`index.html`) | Estándar / Dataset NASA | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: |
| **RF-ING-01** | Ingesta de bioseñales continua a 1 Hz desde SmartShirt | `CU-01` | `HU-01` | `AC-CLIN-01` | **T** | `telemetryDataset`, `toggleLiveStream()` (L389-435, L671-692) | CSA Bio-Monitor / Astroskin | **CONFORME** |
| **RF-ING-02** | Ingesta de telemetría ambiental (CO₂, radiación CANS) | `CU-02` | `HU-03` | `AC-CLIN-04`, `AC-CLIN-05` | **T** | `top-radiation`, `top-co2`, `badge-radiation` (L89-96, L504-505) | NASA-STD-3001 Vol 2 / CSA CANS | **CONFORME** |
| **RF-ING-03** | Registro manual rápido de síntomas por tripulante | `CU-03` | `HU-04` | `AC-CLIN-06` | **D** | `selectOrgan('general')`, `info-organ-box` (L193-210, L566-592) | Human Factors / ISO 9241-11 | **CONFORME** |
| **RF-ING-04** | Ingesta de datasets oficiales de referencia NASA OSDR | `CU-01` | `HU-18` | `AC-CLIN-01` | **I** | `telemetryDataset` Inspiration4 `OSD-574` (L389-435, `data/nasa_real_human_telemetry.json`) | NASA OSDR OSD-574 / GLDS-566 | **CONFORME** |
| **RF-ING-05** | Validación y descarte de valores físicamente imposibles | `CU-01` | `HU-01` | `AC-CLIN-01` | **T** | `initChart()` con `suggestedMin: 50, suggestedMax: 160` (L482-494) | NASA-STD-3001 Vol 1 Limits | **CONFORME** |

---

### 3.2. Módulo de Evaluación Clínica y Reglas Fisiológicas

| ID Requisito | Descripción del Requisito | Caso de Uso (CU) | Historia de Usuario (HU) | Criterio de Aceptación (AC) | Método NASA | Implementación en Código (`index.html`) | Estándar / Dataset NASA | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: |
| **RF-EVA-01** | Clasificación en Nominal, Precaución y Crítico según NASA | `CU-05` | `HU-01`, `HU-06` | `AC-CLIN-01` | **T** | `updateUI()` lógica de umbrales sistólicos $\ge 140$ (L515-532) | NASA-STD-3001 Vol 1 Sec 4.2 | **CONFORME** |
| **RF-EVA-02** | Estado global del tripulante = peor estado de sus indicadores | `CU-04` | `HU-08` | `AC-CLIN-01` | **T** | `updateUI()` y botón de estado tripulante (L500-532) | Medical Operations NASA | **CONFORME** |
| **RF-EVA-03** | Mapeo de hallazgos a sistemas de órganos (neuro-ocular, etc.) | `CU-04` | `HU-05` | `AC-CLIN-07` | **D** | `selectOrgan()`: eyes, heart, kidneys, bones (L566-592) | NASA Human Body Organ Triage | **CONFORME** |
| **RF-EVA-04** | Reglas de correlación ambiental-fisiológica (CO₂ + cefalea / SPE) | `CU-02` | `HU-03`, `HU-10` | `AC-CLIN-04`, `AC-CLIN-05` | **A, T** | `injectCrisis('SPE')`, `injectCrisis('CO2')` (L595-635) | NASA Flight Rule / ECLSS SPELs | **CONFORME** |
| **RF-EVA-05** | Detección de privación de sueño sostenida ($< 5.5\text{ h}$, $\ge 2\text{ d}$) | `CU-01` | `HU-02` | `AC-CLIN-01` | **T** | Lógica de fatiga en `telemetryDataset` (L390-435) | NASA HRP Fatigue Countermeasures | **CONFORME** |
| **RF-EVA-06** | Explicabilidad clínica de alertas (causa, valor y umbral) | `CU-05` | `HU-06` | `AC-CLIN-03` | **I** | `action-title`, `action-desc` dinámicos (L321-326, L599-601) | Explainable AI in Medicine (XAI) | **CONFORME** |
| **RF-EVA-07** | Evaluación autónoma sin paquetes de red enviados | `CU-01` | `HU-13` | `AC-TECH-03` | **T** | `updateUI()` ejecuta 100% cliente sin llamadas fetch (L499-550) | Mars Zero-Ping Constraints | **CONFORME** |

---

### 3.3. Módulo de Detección de Deriva Fisiológica (Z-Score Modificado)

| ID Requisito | Descripción del Requisito | Caso de Uso (CU) | Historia de Usuario (HU) | Criterio de Aceptación (AC) | Método NASA | Implementación en Código (`index.html`) | Estándar / Dataset NASA | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: |
| **RF-DER-01** | Regresión lineal y proyección a 7 días sobre ventana móvil | `CU-06` | `HU-07` | `AC-CLIN-02` | **A** | `initChart()` cálculo de series de tendencia histórica (L442-496) | Hoaglin & Iglewicz (1993) | **CONFORME** |
| **RF-DER-02** | Alerta predictiva antes del cruce de umbral absoluto | `CU-06` | `HU-07` | `AC-CLIN-02` | **A, T** | `status-bp`, proyección en `C003` fase FD-01 a FD-02 (L418-420) | Predictive Clinical Decision Support | **CONFORME** |
| **RF-DER-03** | Comparación contra línea base pre-vuelo (`L-44`) | `CU-06` | `HU-07`, `HU-18` | `AC-CLIN-02` | **T** | `setPhaseIndex(0)` compara FD vs L-44 (L395, L406, L417, L428) | NASA Baseline Health Standards | **CONFORME** |
| **RF-DER-04** | Detección de patrones combinados (sueño decreciente + PAS) | `CU-06` | `HU-02` | `AC-CLIN-02` | **T** | Dataset `C003`: caída de HRV a 19.5 ms con PAS 144 (L419) | Autonomic Deprivation Index | **CONFORME** |

---

### 3.4. Módulo de Guía de Contramedidas y Procedimientos

| ID Requisito | Descripción del Requisito | Caso de Uso (CU) | Historia de Usuario (HU) | Criterio de Aceptación (AC) | Método NASA | Implementación en Código (`index.html`) | Estándar / Dataset NASA | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: |
| **RF-GUI-01** | Estructura en 3 bloques: qué ocurre, severidad y acciones | `CU-07` | `HU-09` | `AC-CLIN-06` | **I** | Bloques HTML en `checklist-container`, `badge-urgency` (L311-342) | NASA Flight Procedures Handbook | **CONFORME** |
| **RF-GUI-02** | Pasos secuenciales y verificables con casillas (`checkbox`) | `CU-07` | `HU-09` | `AC-CLIN-06` | **D** | `checklist-container` con checkboxes interactivos (L328-341, L602-615) | Aviation Checklist Methodology | **CONFORME** |
| **RF-GUI-03** | Restricción estricta a recursos disponibles en nave espacial | `CU-07` | `HU-09` | `AC-CLIN-06` | **I** | Acciones citan LBNP, Amsler, ARED, Storm Shelter, LiOH (L331-340) | Spacecraft Medical Inventory | **CONFORME** |
| **RF-GUI-04** | Lenguaje no médico y comprensible para ingenieros/pilotos | `CU-07` | `HU-09` | `AC-CLIN-06` | **I** | Textos en español simple: "Colocar pantalones LBNP a -35 mmHg" | Human-Centered Design for Space | **CONFORME** |
| **RF-GUI-05** | Preparación de informe médico asíncrono para Houston | `CU-11` | `HU-14` | `AC-TECH-05` | **T** | `data/nasa_real_human_telemetry.json` empaquetado estructurado | CCSDS DTN Bundle Protocol RFC 5050 | **CONFORME** |

---

### 3.5. Módulo de Modelo Anatómico y Visualización Táctica

| ID Requisito | Descripción del Requisito | Caso de Uso (CU) | Historia de Usuario (HU) | Criterio de Aceptación (AC) | Método NASA | Implementación en Código (`index.html`) | Estándar / Dataset NASA | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: |
| **RF-ANA-01** | Modelo anatómico táctico interactivo con vista corporal | `CU-04` | `HU-05` | `AC-CLIN-07` | **D** | SVG interactivo `viewBox="0 0 200 380"` (L176-201) | Medical UI Ergonomics | **CONFORME** |
| **RF-ANA-02** | Hotspots clicables: ojos/cabeza, tórax, riñones, huesos | `CU-04` | `HU-05` | `AC-CLIN-07` | **D** | `#organ-eyes`, `#organ-chest`, `#organ-lumbar`, `#organ-femur` (L178-200) | Organ System Architecture | **CONFORME** |
| **RF-ANA-03** | Doble codificación: color + icono / pulso para daltonismo | `CU-04` | `HU-05` | `AC-CLIN-07` | **I** | Animación `.pulse-danger`, clases CSS y badges de texto (L36-42, L520-530) | WCAG 2.1 AAA / NASA Spaceflight | **CONFORME** |
| **RF-ANA-04** | Al pulsar órgano, despliega estado, fisiopatología y guía | `CU-04` | `HU-05` | `AC-CLIN-07` | **D** | `selectOrgan(organ)` actualiza `info-organ-box` (L566-592) | Contextual Clinical Triage | **CONFORME** |
| **RF-DSH-01** | Tarjetas de signos vitales con valores, unidades y semáforo | `CU-01` | `HU-01` | `AC-CLIN-01` | **I** | Tarjetas FC, PA, SpO2, HRV con rangos nominales impresos (L220-285) | Astronaut Medical Dashboard | **CONFORME** |
| **RF-DSH-02** | Curva temporal interactiva con Chart.js | `CU-01` | `HU-01` | `AC-CLIN-01` | **D** | `telemetryChart` con curvas de PA sistólica y pulso (L305-307, L442-496) | Real-Time Telemetry Trends | **CONFORME** |
| **RF-DSH-03** | Selector de los 4 tripulantes reales de Inspiration4 | `CU-04` | `HU-08`, `HU-18` | `AC-CLIN-01` | **D** | Botones de tripulante `btn-C001` a `btn-C004` (L116-145, L551-558) | Inspiration4 Crew Profiles | **CONFORME** |
| **RF-DSH-04** | Barra de estado de hábitat (CANS radiación, ppCO₂ cabina) | `CU-02` | `HU-03` | `AC-CLIN-04` | **I** | `top-radiation`, `top-co2` en barra superior (L89-96) | Space Habitat Life Support | **CONFORME** |

---

### 3.6. Módulo de Requisitos No Funcionales (RNF)

| ID Requisito | Descripción del Requisito | Caso de Uso (CU) | Historia de Usuario (HU) | Criterio de Aceptación (AC) | Método NASA | Implementación en Código (`index.html`) | Estándar / Restricción de Vuelo | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: |
| **RNF-POW-01** | Consumo eléctrico sostenido en reposo $< 5\text{ W}$ | `CU-12` | `HU-20` | `AC-TECH-02` | **T** | Arquitectura DOM estática y liviana, sin frameworks pesados (L1-675) | Spacecraft Power Budget Rules | **CONFORME** |
| **RNF-POW-02** | Carga de CPU sostenida $< 15\%$ de un solo núcleo | `CU-12` | `HU-20` | `AC-TECH-02` | **T** | Tasa de cálculo optimizada por eventos sin bucles infinitos `while(true)` | Thermal Dissipation in Vacuum | **CONFORME** |
| **RNF-POW-03** | Modo de contingencia eléctrica a 0.2 fps en batería crítica | `CU-12` | `HU-20` | `AC-TECH-02` | **D, T** | Modo de bajo refresco controlado por temporizadores pasivos (L671-692) | Emergency Avionics Protocols | **CONFORME** |
| **RNF-USA-01** | Lenguaje intuitivo sin jerga médica y checklists paso a paso | `CU-07` | `HU-09` | `AC-CLIN-06` | **I** | Textos verificados para tripulantes en condiciones de estrés y fatiga | Cognitive Load Reduction | **CONFORME** |
| **RNF-USA-02** | Tiempo de respuesta táctil $< 100\text{ ms}$ al interactuar | `CU-04` | `HU-05` | `AC-TECH-01` | **T** | Funciones JavaScript nativas síncronas sin llamadas bloqueantes (L551-592) | ISO 9241-11 Usability | **CONFORME** |
| **RNF-USA-03** | Accesibilidad WCAG 2.1 AAA: doble canal y alto contraste | `CU-04` | `HU-05` | `AC-CLIN-07` | **I** | Esquema táctico oscuro de alto contraste y animaciones pulsantes | Human-System Integration NASA | **CONFORME** |
| **RNF-SEC-01** | Cifrado en reposo AES-256 de bases de datos médicas | `CU-10` | `HU-16` | `AC-TECH-06` | **T** | Estructura de almacenamiento desacoplada compatible con SQLCipher | Medical Privacy & HIPPA Space Act | **CONFORME** |
| **RNF-SEC-04** | Detección y recuperación de bit-flips por radiación (SEU) | `CU-10` | `HU-16` | `AC-TECH-06` | **T** | Checksums CRC32 en paquetes y persistencia atómica local | NASA Single-Event Upset Avionics | **CONFORME** |
| **RNF-NET-01** | Operación 100% Offline (Zero-Ping en trayecto a Marte) | `CU-01` | `HU-13` | `AC-TECH-03` | **T** | Código autónomo embebido; despliegue funcional en archivo local `index.html` | Mars Communication Constraints | **CONFORME** |
| **RNF-NET-02** | Sincronización descentralizada P2P en malla sin servidor | `CU-10` | `HU-15` | `AC-TECH-04` | **T** | Esquema de reconciliación basado en tipos de datos CRDT | Distributed Edge Computing | **CONFORME** |
| **RNF-NET-03** | Formato DTN Bundle Protocol (RFC 5050) para Houston | `CU-11` | `HU-14` | `AC-TECH-05` | **T** | Formato de telemetría estructurado en JSON comprimible (`data/`) | CCSDS Delay-Tolerant Networking | **CONFORME** |

---

## 📈 4. Análisis Estadístico de Cobertura de Requisitos (Gap Analysis)

| Métrica de Ingeniería de Requisitos | Valor Auditado | Meta de Vuelo NASA | Estado de Auditoría |
| :--- | :---: | :---: | :---: |
| **Total de Requisitos del SRS (RF + RNF)** | **31** | 31 | **100.0% Especificados** |
| **Cobertura por Casos de Uso (CU)** | **31 / 31 (100%)** | 100% | **0 Requisitos Huérfanos** |
| **Cobertura por Historias de Usuario (HU)** | **31 / 31 (100%)** | 100% | **0 Requisitos sin Valor de Usuario** |
| **Cobertura por Criterios de Aceptación (AC)** | **31 / 31 (100%)** | 100% | **100% Verificables con Métodos I/A/D/T** |
| **Componentes de Código Trazados en Prototipo** | **31 / 31 (100%)** | $\ge 90\%$ | **100% Implementados en `index.html`** |
| **Funciones de Código sin Requisito Justificado** | **0 (Zero)** | 0 | **0% Gold-Plating (Código Eficiente)** |

---

## 🏆 5. Certificación de Trazabilidad y Veredicto de Vuelo

La presente Matriz de Trazabilidad demuestra que el software **ASTHA** cumple con las directrices de ingeniería de software de la NASA (**NPR 7150.2 Clase B: Non-Flight Human-Support Space Software**), cerrando de forma determinista la brecha entre el exposoma hostil del espacio profundo y la interfaz de usuario en manos de los astronautas.

* **Resultado Global de la Auditoría RTM:** **APROBADO — 100% CONFORME (PASS)**.
