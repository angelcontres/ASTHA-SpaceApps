# 🔬 ÉPICA 5: Evidencia Científica y Explorador de Datos de Vuelo Real NASA OSDR
**Módulo:** Integración de Ciencia Abierta y Simulación de Vuelo | **Estándar:** NASA OSDR / GeneLab / NASA Open Data

---

## 📌 HU-17: Consulta y Validación de Estudios de Vuelo Humano en la API NASA OSDR

* **ID:** `HU-17`
* **Épica:** Épica 5 - Evidencia Científica y Explorador NASA OSDR
* **Prioridad MoSCoW:** **Could Have / Should Have** (Validación Científica Abierta)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RF-OFF-03`, `RNF-NET-01`
* **Fuentes Oficiales:** NASA Open Science Data Repository (OSDR) API v2 (`visualization.osdr.nasa.gov`)

### 📖 Narrativa de Usuario:
> **Como** Oficial Científico o Evaluador del Jurado de NASA Space Apps,  
> **Quiero** acceder a un explorador interactivo embebido que muestre los 116 estudios espaciales oficiales de seres humanos (*Homo sapiens*) indexados desde la API de NASA OSDR,  
> **Para** comprobar que los algoritmos clínicos de AstroVital están anclados en evidencia biológica real de vuelo espacial y no en suposiciones teóricas.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Apertura del modal explorador y consulta de estudios
* **Dado que** el usuario presiona el botón "NASA OSDR API (116 Estudios)" en la barra superior de la aplicación,
* **Cuando** se abre el modal táctico,
* **Entonces** debe listar los estudios clave con su identificador oficial (`OSD-574`, `OSD-715`, `OSD-53`, `OSD-2`, `OSD-51`), su título, su misión de origen y su correlación patológica con AstroVital.

#### Escenario 2: Prueba de conectividad con endpoint oficial de NASA
* **Dado que** el evaluador presiona el botón "Comprobar API NASA",
* **Cuando** el sistema consulta el endpoint `https://visualization.osdr.nasa.gov/biodata/api/v2/query/datasets/?study.characteristics.organism=Homo%20sapiens&format=json.records`,
* **Entonces** si hay conectividad a Internet debe mostrar la respuesta exitosa (200 OK con latencia en ms),
* **Y** si se encuentra en modo Edge aislado (sin red), debe conmutar automáticamente al repositorio indexado local (`data/nasa_osdr_api_human_studies.json`) demostrando tolerancia total a fallos.

---

## 📌 HU-18: Calibración con el Dataset de la Misión SpaceX Inspiration4 (`OSD-574`)

* **ID:** `HU-18`
* **Épica:** Épica 5 - Evidencia Científica y Explorador NASA OSDR
* **Prioridad MoSCoW:** **Must Have** (Datos Humanos 100% Reales)
* **Puntos de Historia (Story Points):** 8 SP
* **Requisitos SRS Trazados:** `RF-ING-04`, `RF-DSH-01`, `RF-EVA-01`
* **Fuentes Oficiales:** NASA GeneLab / OSDR OSD-574 ISA-Tab Metadata / Inspiration4 Crew Data

### 📖 Narrativa de Usuario:
> **Como** Oficial Médico de la Tripulación (CMO),  
> **Quiero** que el software cargue los datos biomédicos de los 4 tripulantes civiles reales de la misión SpaceX Inspiration4 (C001, C002, C003, C004) a través de sus fases de vuelo (L-44, FD-01, FD-02, FD-03, R+1),  
> **Para** contar con una referencia empírica fidedigna de cómo responde el organismo humano civil antes, durante y después del vuelo orbital.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Navegación de fases de vuelo por astronauta
* **Dado que** el usuario tiene seleccionada a la Dra. Sian Proctor (C003),
* **Cuando** hace clic en los botones de fase de vuelo (`L-44`, `FD-01`, `FD-02`, `FD-03`, `R+1`),
* **Entonces** las tarjetas de vitales y el gráfico deben actualizarse con las cifras exactas del dataset:
  * `L-44` (Tierra): $\text{FC} = 68\text{ bpm}$, $\text{PA} = 122/78\text{ mmHg}$, $\text{HRV} = 46.0\text{ ms}$ (Nominal).
  * `FD-02` (Órbita): $\text{FC} = 98\text{ bpm}$, $\text{PA} = 144/92\text{ mmHg}$, $\text{HRV} = 19.5\text{ ms}$ (SANS Critical).
  * `R+1` (Regreso): $\text{FC} = 80\text{ bpm}$, $\text{PA} = 128/82\text{ mmHg}$, $\text{HRV} = 35.8\text{ ms}$ (Recuperación).

#### Escenario 2: Trazabilidad contra la tabla ISA-Tab oficial
* **Dado que** un auditor clínico examina el origen de los datos de C001-C004,
* **Cuando** inspecciona los archivos del sistema,
* **Entonces** debe existir correspondencia verificable con el archivo oficial `OSD-574_ISA/s_OSD-574.txt` depositado en el directorio de telemetría de NASA.

---

## 📌 HU-19: Inyección de Escenarios de Crisis para Entrenamiento (Simulador Jurado)

* **ID:** `HU-19`
* **Épica:** Épica 5 - Evidencia Científica y Explorador NASA OSDR
* **Prioridad MoSCoW:** **Should Have** (Demostración de Impacto y Entrenamiento)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RF-DSH-02`, `RF-GUI-01`
* **Fuentes Oficiales:** NASA Simulation Training / Spaceflight Crisis Protocols

### 📖 Narrativa de Usuario:
> **Como** Instructor de Vuelo, Miembro del Jurado o Tripulante en entrenamiento,  
> **Quiero** inyectar de manera instantánea escenarios de emergencia simulados (Tormenta Solar SPE, Fuga de $CO_2$, Crisis de Hipertensión Cefálica SANS),  
> **Para** comprobar en vivo cómo responde la interfaz, cómo cambian los semáforos de riesgo y cómo se generan los checklists en tiempo real.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Inyección de Fuga de $CO_2$ en Cabina
* **Dado que** el simulador se encuentra en estado nominal,
* **Cuando** el usuario presiona el botón "2. Fuga CO₂ Cabina",
* **Entonces** en menos de $100\text{ ms}$:
  * El indicador de $ppCO_2$ sube a $3.85\text{ mmHg}$ con animación pulsante amarilla,
  * El título del protocolo cambia a "ALERTA ECLSS: Acumulación de Dióxido de Carbono",
  * Se genera el checklist de 3 pasos para conmutar el CDRA y reemplazar cartuchos de LiOH.

#### Escenario 2: Restablecimiento al estado basal óptimo
* **Dado que** el sistema se encuentra en un estado de emergencia simulado,
* **Cuando** el usuario presiona el botón "Restablecer Nominal",
* **Entonces** todos los indicadores vuelven a la fase L-44 (Verde 100% Nominal),
* **Y** el protocolo se actualiza a las rutinas preventivas diarias (150 min ARED e hidratación).

---

## 📌 HU-20: Perfil Energético Ultra-Bajo en Modo Batería de Emergencia

* **ID:** `HU-20`
* **Épica:** Épica 5 - Evidencia Científica y Explorador NASA OSDR
* **Prioridad MoSCoW:** **Must Have** (Supervivencia de Sistemas de Vuelo)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RNF-POW-01..04`, `RNF-POW-03`
* **Fuentes Oficiales:** Spacecraft Electrical Power Distribution Rules (EPS)

### 📖 Narrativa de Usuario:
> **Como** Comandante de Misión e Ingeniero de Potencia de la Nave,  
> **Quiero** que cuando la nave entre en modo de contingencia eléctrica (baterías de reserva tras fallo de paneles solares), el software reduzca su consumo a menos de 5 Watts,  
> **Para** garantizar que el monitoreo de salud vital de los astronautas permanezca encendido durante días sin agotar la energía crítica del soporte vital.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Conmutación a perfil de ultra-bajo consumo
* **Dado que** el bus de potencia principal notifica caída a batería de reserva,
* **Cuando** AstroVital recibe la señal de ahorro energético,
* **Entonces** debe desactivar automáticamente las animaciones CSS pesadas, reducir la tasa de renderizado de gráficos a 1 frame cada 5 segundos y atenuar el brillo de pantalla,
* **Y** mantener activo al 100% el motor de reglas de detección de parada cardíaca y anoxia.

#### Escenario 2: Verificación de límite térmico y disipación pasiva
* **Dado que** en descompresión o contingencia no hay convección forzada de aire,
* **Cuando** el procesador ejecuta los algoritmos de detección,
* **Entonces** el uso sostenido de CPU no debe exceder del $15\%$ de un solo núcleo, evitando la acumulación de calor localizado en los equipos de aviónica médica.
