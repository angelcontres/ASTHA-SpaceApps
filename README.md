# 🚀 ASTHA: Autonomous Space Telemetry & Health Analytics
### Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
### NASA Space Apps Challenge | Create Health Monitoring Software for Astronauts on Space Missions

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen.svg?style=for-the-badge&logo=github)](https://angelcontres.github.io/AstroVital-SpaceApps/)
[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-2026%20Challenge-orange.svg)](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources)
[![Standard](https://img.shields.io/badge/Standard-NASA--STD--3001%20Vol%201%20%26%202-blue.svg)](https://standards.nasa.gov/)
[![Requirements](https://img.shields.io/badge/Requirements-ISO%2FIEC%2FIEEE%2029148-green.svg)](docs/SRS%20–%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md)
[![Design SDD](https://img.shields.io/badge/Design%20SDD-IEEE%201016%20%2F%20NASA--STD--8739.8-blue.svg)](docs/SDD/README.md)
[![NASA OSDR API](https://img.shields.io/badge/NASA%20OSDR%20API-116%20Human%20Studies-blueviolet.svg)](https://visualization.osdr.nasa.gov/biodata/api/v2/)
[![User Stories](https://img.shields.io/badge/User%20Stories-20%20Agile%20BDD%20%28NASA%29-yellow.svg)](docs/User-historias/README.md)
[![Use Cases](https://img.shields.io/badge/Use%20Cases-12%20UML%20%28ISO%2029148%29-cyan.svg)](docs/Casos-de-uso/README.md)
[![Acceptance Criteria](https://img.shields.io/badge/Acceptance%20Criteria-NASA%20V%26V%20Compliance-emerald.svg)](docs/Criterios-de-aceptacion/README.md)
[![RTM Traceability](https://img.shields.io/badge/RTM%20Traceability-100%25%20NASA%20Covered-purple.svg)](docs/MATRIZ_DE_TRAZABILIDAD_RTM.md)
[![Wireframe](https://img.shields.io/badge/Wireframe-Interactive%20Blueprint-blue.svg)](wireframe.html)
[![Glossary](https://img.shields.io/badge/Glossary->60%20Aerospace%20Terms-informational.svg)](docs/GLOSARIO_TERMINOLOGICO_AEROESPACIAL.md)
[![Architecture](https://img.shields.io/badge/Architecture-100%25%20Edge%20%2F%20Mars--Zero--Ping-red.svg)](#)

---

> 🎮 **PROBADORES EN VIVO (LIVE WEB DEMOS EN GITHUB PAGES):**  
> * **👉 [Dashboard de Producción Táctico](https://angelcontres.github.io/AstroVital-SpaceApps/)** *(Simulador de tormentas SPE, fuga de CO₂, SANS, mapa anatómico interactivo y explorador NASA OSDR)*  
> * **📐 [Prototipo Wireframe & Blueprint Interactivo](https://angelcontres.github.io/AstroVital-SpaceApps/wireframe.html)** *(Cotas técnicas de cabina, ergonomía para guantes $\ge 48\text{px}$, accesibilidad WCAG AAA y alternador de vistas)*

---

## 🛰️ 1. Declaración del Problema Operacional (The Deep Space Challenge)

En la Estación Espacial Internacional (LEO), cualquier descompensación médica cuenta con telemedicina en vivo con Houston y posibilidad de aborto de misión. **En el viaje hacia Marte (hasta 400 millones de km), ese paradigma colapsa:**

* **Latencia de Radio Ineludible:** Retraso de comunicación electromagnética de hasta **22 minutos por sentido (44 minutos ida y vuelta)**. La telemedicina en tiempo real es físicamente imposible.
* **Cero Evacuación Médica (*No MEDEVAC*):** La tripulación debe diagnosticar, clasificar y tratar emergencias *in-situ*.
* **Tripulación No Especialista:** Los tripulantes son ingenieros, pilotos y científicos, no médicos intensivistas. El sistema debe traducir la complejidad fisiológica en **protocolos de acción ejecutables paso a paso**.

---

## 🧬 2. Fundamento Biomédico Espacial (NASA R.I.D.G.E. Framework)

**ASTHA** (**Autonomous Space Telemetry & Health Analytics**) correlaciona continuamente el exposoma espacial contra la fisiología humana:

1. **Radiation (Radiación Espacial):** Exposición a GCR y tormentas solares (SPE). Monitoreo de neutrones secundarios (~30% de la dosis biológica en cabina) calibrado con el espectrómetro **CANS** de la Agencia Espacial Canadiense (CSA).
2. **Isolation & Confinement (Aislamiento):** Ruptura de ritmos circadianos y depresión autonómica detectada mediante Variabilidad de la Frecuencia Cardíaca (**HRV rMSSD**).
3. **Distance from Earth (Distancia):** Autosuficiencia y funcionamiento **100% offline (Edge)**.
4. **Gravity Fields (Microgravedad 0G / Luna 1/6G / Marte 3/8G):**
   * **SANS (Spaceflight Associated Neuro-ocular Syndrome):** Desplazamiento cefálico de fluidos que aplana el globo ocular y produce edema papilar.
   * **Pérdida Ósea Acelerada ($1.0\% - 1.5\%$ mensual):** Hipercalciuria y riesgo crítico de **cálculos renales**.
5. **Hostile Closed Environments (Entornos Cerrados):** Detección de bolsas de $CO_2$ ($> 3.0\text{ mmHg} / > 3950\text{ ppm}$) y desoxigenación en cabina.

---

## ⚙️ 3. Arquitectura y Capacidades del Sistema

```mermaid
flowchart TD
    subgraph InputLayer["Ingesta Multicanal Sincronizada"]
        A[Telemetría Continua Astroskin / Bio-Monitor]
        B[Telemetría Ambiental ECLSS / CO2 / Presión]
        C[Dosimetría CANS CSA / Radiación uSv/h]
        D[Reporte Manual Rápido de Síntomas]
    end

    subgraph CoreEngine["Motor Local de Decisión Clínica (CDSS Edge)"]
        E[Línea Base Individual por Tripulante]
        F["Algoritmo Z-Score Modificado (Boris Iglewicz & David Hoaglin)"]
        G[Reglas de Correlación Cruzada NASA Flight Rules]
        H[Umbrales Ground Truth NASA-STD-3001]
    end

    subgraph PresentationLayer["Capa Visual Táctica"]
        I[Modelo Anatómico Humano Interactivo por Órganos]
        J[Panel de Control y Semáforo de Riesgo]
        K[Guía de Contramedidas Paso a Paso: ARED, LBNP, Storm Shelter]
        L[Simulador de Crisis para Evaluación Técnica]
    end

    InputLayer --> CoreEngine
    CoreEngine --> PresentationLayer
```

### Algoritmo de Detección de Deriva (Modified Z-Score)
Para evitar falsas alarmas derivadas de valores atípicos y heterogeneidad individual, ASTHA utiliza la Desviación Absoluta de la Mediana ($MAD$):

$$M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{MAD}$$

Un valor $|M_i| \ge 2.5$ dispara una alerta preventiva de deriva fisiológica antes de que el astronauta experimente síntomas incapacitantes.

---

## 📁 4. Estructura del Repositorio y Documentación

```text
Nasa-Project/
├── docs/
│   ├── User-historias/                                         # Catálogo de 20 Historias de Usuario BDD Aeroespaciales
│   │   ├── README.md                                           # Mapa de épicas, arquetipos (personas) y DoD
│   │   ├── HU-01-Monitoreo-Telemetria-Vital.md                 # Épica 1: Ingesta continua, sueño y ambientales
│   │   ├── HU-02-Triage-Clinico-Modelo-Anatomico.md            # Épica 2: Hotspots corporales, SANS y Z-score
│   │   ├── HU-03-Protocolos-Contramedidas-Emergencia.md        # Épica 3: Checklists no médicos, SPE, LBNP y ARED
│   │   ├── HU-04-Arquitectura-Edge-Red-Malla.md                # Épica 4: Zero-ping offline, DTN y tolerancia SEU
│   │   └── HU-05-Explorador-NASA-OSDR.md                       # Épica 5: API NASA OSDR, Inspiration4 y simulador
│   ├── Casos-de-uso/                                           # Especificación Formal de 12 Casos de Uso (UML / ISO 29148)
│   │   ├── README.md                                           # Modelo de actores, diagrama Mermaid y matriz
│   │   ├── CU-01-Monitoreo-Telemetria-Ingesta.md               # CU-01 Ingesta continua, CU-02 CO2/CANS, CU-03 Síntomas
│   │   ├── CU-02-Triage-Diagnostico-Soporte.md                 # CU-04 Mapa anatómico, CU-05 SANS, CU-06 Z-Score
│   │   ├── CU-03-Contramedidas-Emergencias-Vuelo.md            # CU-07 Checklists, CU-08 Tormenta SPE, CU-09 LBNP
│   │   └── CU-04-Arquitectura-Red-Resiliencia-Edge.md          # CU-10 Red Malla P2P, CU-11 DTN Houston, CU-12 EPS <5W
│   ├── Criterios-de-aceptacion/                                # Marco de Verificación y Validación (NASA V&V)
│   │   ├── README.md                                           # Métodos I/A/D/T y clasificación de criterios
│   │   ├── CRITERIOS_FUNCIONALES_AC_CLINICOS.md                # AC-CLIN-01 a 07: Rangos NASA-STD-3001, SANS y CO2
│   │   ├── CRITERIOS_NO_FUNCIONALES_AC_TECNICOS.md             # AC-TECH-01 a 06: Zero-ping, potencia <5W y SEU
│   │   └── MATRIZ_VERIFICACION_Y_VALIDACION_NASA.md            # Matriz de cumplimiento cruzado (100% PASS)
│   ├── MATRIZ_DE_TRAZABILIDAD_RTM.md                           # Matriz Maestra de Trazabilidad End-to-End (RTM)
│   ├── GLOSARIO_TERMINOLOGICO_AEROESPACIAL.md                  # Glosario formal con >60 términos (SANS, LBNP, CANS, etc.)
│   ├── WIREFRAME_Y_DISENO_UI_UX.md                             # Especificación de ergonomía táctil y diseño UI/UX
│   ├── SRS – Software de Monitoreo de Salud para Astronautas.md   # Especificación formal ISO/IEC/IEEE 29148
│   ├── SDD/                                                    # Carpeta de Diseño Detallado SDD (Colección Modular UML v3.0.0)
│   │   ├── README.md                                           # Índice Maestro, Regla de Autoridad y Mapa ADR/C4
│   │   ├── 01-Arquitectura-Global-del-Sistema.md               # SDD-01: Hexagonal, Web Workers por Eventos y Z-Score MAD
│   │   ├── 02-Diagrama-de-Clases-UML.md                        # SDD-02: Entidades SRS §5.1, WebCrypto AES-GCM y CRDT
│   │   ├── 03-Diagramas-de-Secuencia-UML.md                    # SDD-03: Escalada Alarmas ADR-013, 3D Bajo Demanda, JSON Firmado
│   │   ├── 04-Diagrama-de-Componentes-UML.md                   # SDD-04: Svelte 5, uPlot, Clinical & Data Workers, Sync Hub
│   │   ├── 05-Diagrama-de-Despliegue-UML.md                    # SDD-05: Topología LAN Aislada C4-L4 y Pantallas de Cabina
│   │   ├── 06-Diseno-de-Datos-y-Contratos-de-Interfaz.md       # SDD-06: JSON Schemas, Sobre Cifrado, CRDT HLC y Tokens AAA
│   │   ├── 07-Matriz-de-Trazabilidad-SRS-a-SDD.md              # SDD-07: Trazabilidad 100% (42 RF + 19 RNF + 10 R-* + 3 D-*)
│   │   └── 08-Architecture-decisions.md                          # SDD-08: Registro Consolidado de 20 ADRs (ADR-001..020)
│   ├── c4/                                                     # Modelo de Arquitectura C4 (Contexto, Contenedores, Componentes, Despliegue)
│   ├── Diseno-UI-UX/                                           # Diseño UI/UX Modular (Wireframes, Design System, Mockups)
│   │   ├── README.md                                           # Índice normativo UI/UX (trazabilidad SRS, C4 y ADRs)
│   │   ├── 01-Wireframes-y-Arquitectura-de-Pantalla.md         # Wireframes Vista A/B/C, grid 12 cols y breakpoints
│   │   ├── 02-Guia-de-Estilo-y-Design-System.md                # Tokens WCAG AAA (#fca5a5), doble codificación 630nm y audio 960Hz
│   │   └── 03-Mockups-y-Especificacion-de-Componentes.md       # Mockups Hi-Fi, componentes Svelte 5 y Modo Supervivencia <5W
│   ├── Modelo-datos-y-APIs/                                    # Modelo de Datos (ERD, Diccionario) & Contratos OpenAPI 3.1.0
│   │   ├── README.md                                           # Índice y principios de cifrado/CRDT/LAN
│   │   ├── 01-Diagrama-Entidad-Relacion.md                     # Diagrama Entidad-Relación (ERD) e IndexedDB Object Stores
│   │   ├── 02-Diccionario-de-Datos.md                          # Diccionario completo con umbrales NASA-STD-3001
│   │   ├── 03-Contratos-API-OpenAPI-y-Eventos.md               # Guía REST/WSS (Sync Hub), postMessage Workers y Export DSN
│   │   └── openapi.yaml                                        # Especificación formal importable OpenAPI 3.1.0
│   ├── SDD – Software Design Description ASTHA.md                 # Documento técnico consolidado complementario
│   ├── VALIDACION_FUENTES_OFICIALES_NASA.md                    # Certificación cruzada contra NASA-STD-3001
│   ├── DOCUMENTO_DOMINIO_Y_PROBLEMATICA_ESPACIAL.md            # Análisis de dominio operacional
│   └── HEALTH_MONITORING_SOFTWARE_SPEC.md                      # Especificación técnica inicial
├── data/
│   ├── nasa_real_human_telemetry.json                          # Telemetría 100% real Inspiration4 (OSD-574)
│   ├── nasa_osdr_api_human_studies.json                        # 116 estudios oficiales humanos de NASA OSDR API
│   ├── nasa_osdr_enriched_human_studies.json                   # 10 estudios enriquecidos (Inspiration4, SANS, etc.)
│   └── nasa_official_telemetry/                                # Paquetes reales ISS y tablas ISA-Tab
├── index.html                                                  # Dashboard táctico interactivo 100% offline
├── wireframe.html                                              # Prototipo visual interactivo de Wireframe & Blueprint
├── .nojekyll                                                   # Soporte para despliegue en GitHub Pages
├── .gitignore
└── README.md
```

---

## 📊 5. Datasets y Validación Científica

* **NASA OSDR Study OSD-574 (SOMA):** Datos clínicos y de adaptación a microgravedad de la tripulación comercial de la misión SpaceX Inspiration4.
* **NASA Planetary Data System (PDS) RAD:** Telemetría de radiación en espacio profundo del Mars Science Laboratory.
* **Canadian Space Agency (CSA):** Especificaciones de prenda inteligente *Astroskin/Bio-Monitor* y dosimetría de neutrones *CANS*.
* **NASA-STD-3001 (Volume 1 & 2):** Estándar mandatorio para límites permisibles de exposición médica y factores ambientales de cabina.

---

## 👥 Equipo de Desarrollo y Créditos
* **Desafío:** NASA Space Apps Challenge 2026
* **Reto:** *Create Health Monitoring Software for Astronauts on Space Missions*
* **Ingeniería de Requisitos:** @angel & Team
