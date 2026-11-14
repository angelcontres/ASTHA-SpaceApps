# 🚀 AstroVital: Autonomous Deep-Space Health Guardian & CDSS
### NASA Space Apps Challenge | Create Health Monitoring Software for Astronauts on Space Missions

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen.svg?style=for-the-badge&logo=github)](https://angelcontres.github.io/AstroVital-SpaceApps/)
[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-2026%20Challenge-orange.svg)](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources)
[![Standard](https://img.shields.io/badge/Standard-NASA--STD--3001%20Vol%201%20%26%202-blue.svg)](https://standards.nasa.gov/)
[![Requirements](https://img.shields.io/badge/Requirements-ISO%2FIEC%2FIEEE%2029148-green.svg)](docs/SRS%20–%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md)
[![NASA OSDR API](https://img.shields.io/badge/NASA%20OSDR%20API-116%20Human%20Studies-blueviolet.svg)](https://visualization.osdr.nasa.gov/biodata/api/v2/)
[![Architecture](https://img.shields.io/badge/Architecture-100%25%20Edge%20%2F%20Mars--Zero--Ping-red.svg)](#)

---

> 🎮 **PROBADOR EN VIVO (LIVE WEB DEMO):** Puedes probar la aplicación interactiva de inmediato en tu navegador en:  
> **👉 [https://angelcontres.github.io/AstroVital-SpaceApps/](https://angelcontres.github.io/AstroVital-SpaceApps/)**  
> *(Incluye simulador de tormenta solar, fuga de CO₂, SANS, mapa anatómico táctico interactivo y explorador de la API de NASA OSDR)*

---

## 🛰️ 1. Declaración del Problema Operacional (The Deep Space Challenge)

En la Estación Espacial Internacional (LEO), cualquier descompensación médica cuenta con telemedicina en vivo con Houston y posibilidad de aborto de misión. **En el viaje hacia Marte (hasta 400 millones de km), ese paradigma colapsa:**

* **Latencia de Radio Ineludible:** Retraso de comunicación electromagnética de hasta **22 minutos por sentido (44 minutos ida y vuelta)**. La telemedicina en tiempo real es físicamente imposible.
* **Cero Evacuación Médica (*No MEDEVAC*):** La tripulación debe diagnosticar, clasificar y tratar emergencias *in-situ*.
* **Tripulación No Especialista:** Los tripulantes son ingenieros, pilotos y científicos, no médicos intensivistas. El sistema debe traducir la complejidad fisiológica en **protocolos de acción ejecutables paso a paso**.

---

## 🧬 2. Fundamento Biomédico Espacial (NASA R.I.D.G.E. Framework)

AstroVital correlaciona continuamente el exposoma espacial contra la fisiología humana:

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
Para evitar falsas alarmas derivadas de valores atípicos y heterogeneidad individual, AstroVital utiliza la Desviación Absoluta de la Mediana ($MAD$):

$$M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{MAD}$$

Un valor $|M_i| \ge 2.5$ dispara una alerta preventiva de deriva fisiológica antes de que el astronauta experimente síntomas incapacitantes.

---

## 📁 4. Estructura del Repositorio y Documentación

```text
Nasa-Project/
├── docs/
│   ├── SRS – Software de Monitoreo de Salud para Astronautas.md   # Especificación formal ISO/IEC/IEEE 29148
│   ├── VALIDACION_FUENTES_OFICIALES_NASA.md                    # Certificación cruzada contra NASA-STD-3001
│   ├── DOCUMENTO_DOMINIO_Y_PROBLEMATICA_ESPACIAL.md            # Análisis de dominio operacional
│   └── HEALTH_MONITORING_SOFTWARE_SPEC.md                      # Especificación técnica inicial
├── data/
│   ├── human_telemetry_astronauts.json                         # 360 registros longitudinales (4 astronautas, 90 días)
│   └── human_telemetry_astronauts.csv                          # Dataset tabular listo para análisis ML
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
