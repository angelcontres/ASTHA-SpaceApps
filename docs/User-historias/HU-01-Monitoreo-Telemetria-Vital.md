# 📡 ÉPICA 1: Monitoreo Continuo e Ingesta de Telemetría Biomédica y Ambiental
**Módulo:** Ingesta de Datos y Sensores de Vuelo | **Estándar:** NASA-STD-3001 Vol 1 & 2 / CSA Bio-Monitor

---

## 📌 HU-01: Visualización del Estado Vital en Vivo desde Sensores Corporales (SmartShirt)

* **ID:** `HU-01`
* **Épica:** Épica 1 - Monitoreo Continuo y Telemetría
* **Prioridad MoSCoW:** **Must Have** (Crítico de Misión)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RF-ING-01`, `RF-DSH-01`, `RNF-USA-02`, `RNF-POW-03`
* **Fuentes Oficiales:** CSA Bio-Monitor (SmartShirt Astroskin) / NASA-STD-3001 Vol 1 Sec 4.2

### 📖 Narrativa de Usuario:
> **Como** Astronauta en Misión (sin formación médica especializada),  
> **Quiero** ver mis constantes vitales actualizadas en tiempo real (Frecuencia Cardíaca, Presión Arterial, SpO₂ y HRV rMSSD) en una interfaz táctica con códigos de color normalizados,  
> **Para** evaluar de un vistazo mi estado cardiovascular y fisiológico sin tener que interpretar gráficos médicos complejos durante mi jornada de trabajo en microgravedad.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Ingesta de datos biomédicos con valores en rango nominal
* **Dado que** mi camiseta inteligente (SmartShirt Astroskin) está sincronizada por Bluetooth LE de baja energía con mi nodo local AstroVital,
* **Cuando** el sensor transmite una lectura de $\text{FC} = 68\text{ bpm}$, $\text{PA} = 118/76\text{ mmHg}$, $\text{SpO}_2 = 98.5\%$ y $\text{HRV} = 48\text{ ms}$,
* **Entonces** las tarjetas de vitales deben mostrarse en color Verde (#10b981) con la etiqueta textual "Nominal",
* **Y** la tasa de refresco en pantalla no debe exceder de 1 Hz para no consumir ciclos de CPU innecesarios.

#### Escenario 2: Desconexión o pérdida de señal de sensor
* **Dado que** el astronauta se retira temporalmente la prenda biomédica para aseo personal o cambio de módulo,
* **Cuando** no se reciban paquetes de telemetría durante más de 60 segundos,
* **Entonces** la tarjeta correspondiente debe atenuarse a color gris neutro (#64748b) con la etiqueta "Sensor Desconectado",
* **Y** no debe disparar falsas alarmas audibles ni visuales de paro cardíaco o desaturación.

---

## 📌 HU-02: Detección Automática de Ruptura Circadiana y Deuda Crítica de Sueño

* **ID:** `HU-02`
* **Épica:** Épica 1 - Monitoreo Continuo y Telemetría
* **Prioridad MoSCoW:** **Must Have** (Riesgo HRP Humano)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RF-EVA-05`, `RF-DER-04`, `RNF-USA-04`
* **Fuentes Oficiales:** NASA Human Research Program (HRP) Risk of Fatigue-Induced Performance Decrement

### 📖 Narrativa de Usuario:
> **Como** Oficial Médico de la Tripulación (CMO),  
> **Quiero** que el sistema monitoree de forma autónoma la duración del sueño y la variabilidad de la frecuencia cardíaca nocturna de cada astronauta,  
> **Para** detectar fatiga acumulada y riesgo de lapso cognitivo antes de que el tripulante opere maquinaria crítica o realice una actividad extravehicular (EVA).

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Activación de alerta por privación de sueño sostenida
* **Dado que** el registro de descanso de un astronauta marca menos de 5.5 horas de sueño por noche,
* **Cuando** esta condición se repite durante 2 o más días consecutivos ($\text{Días} \ge 2$),
* **Entonces** AstroVital debe elevar automáticamente el estado del tripulante a nivel **Precaución (Amarillo)**,
* **Y** debe desplegar una notificación al CMO recomendando: "Suspender tareas de alto riesgo motor y administrar prueba psicomotora de vigilancia (PVT)".

#### Escenario 2: Correlación con caída de HRV rMSSD
* **Dado que** un tripulante presenta sueño corto sostenido,
* **Cuando** adicionalmente su $\text{HRV rMSSD}$ promedio nocturno cae por debajo de $20\text{ ms}$ (indicador de estrés autonómico severo),
* **Entonces** el sistema debe emitir una alerta combinada de "Sobrecarga de Estrés y Desincronización Circadiana",
* **Y** sugerir el ajuste inmediato del espectro lumínico de su camarote (cambio a luz enriquecida en azul matutina o roja nocturna).

---

## 📌 HU-03: Correlación Fisiológica con Factores Ambientales de Cabina ($ppCO_2$ y Radiación)

* **ID:** `HU-03`
* **Épica:** Épica 1 - Monitoreo Continuo y Telemetría
* **Prioridad MoSCoW:** **Must Have** (Seguridad de Vuelo)
* **Puntos de Historia (Story Points):** 8 SP
* **Requisitos SRS Trazados:** `RF-ING-02`, `RF-EVA-04`, `RF-DSH-04`, `RNF-SEC-01`
* **Fuentes Oficiales:** NASA-STD-3001 Vol 2 Sec 6 (Atmospheric Quality) / CSA CANS Dosimeter

### 📖 Narrativa de Usuario:
> **Como** Ingeniero de Sistemas de Hábitat (ECLSS) y Oficial de Vuelo,  
> **Quiero** que el software cruce de forma automática los picos de dióxido de carbono ($ppCO_2$) y la tasa de dosis de radiación en tiempo real con las constantes vitales del astronauta,  
> **Para** distinguir inmediatamente entre una patología médica intrínseca y una degradación del entorno atmosférico de la nave.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Correlación cruzada de cefalea y sobrepresión de $CO_2$
* **Dado que** el sensor atmosférico de la cabina registra un aumento de $ppCO_2 > 2.5\text{ mmHg}$ ($> 3300\text{ ppm}$),
* **Cuando** un astronauta en ese mismo módulo presenta taquipnea ($\text{FR} > 20\text{ rpm}$) o reporta cefalea/dolor de cabeza,
* **Entonces** el sistema debe clasificar el evento como "Riesgo de Hipercapnia por Bolsa de $CO_2$ en Cabina",
* **Y** la recomendación prioritaria debe ser ambiental ("Verificar ventiladores de circulación forzada y conmutar absorbedor CDRA") antes de prescribir analgésicos.

#### Escenario 2: Pico de radiación CANS por partículas solares
* **Dado que** el dosímetro de neutrones CANS de la CSA reporta un incremento en la tasa de dosis de radiación superando los $100\ \mu\text{Sv/h}$,
* **Cuando** el algoritmo procesa la telemetría ambiental,
* **Entonces** la barra superior de hábitat debe entrar en estado de **Alerta Roja Pulsante**,
* **Y** desplegar inmediatamente el aviso de "Evacuación a Zona Central Blindada (Storm Shelter)".

---

## 📌 HU-04: Registro Rápido y Fricción-Cero de Síntomas Clínicos Subjetivos

* **ID:** `HU-04`
* **Épica:** Épica 1 - Monitoreo Continuo y Telemetría
* **Prioridad MoSCoW:** **Should Have** (Alta Usabilidad)
* **Puntos de Historia (Story Points):** 3 SP
* **Requisitos SRS Trazados:** `RF-ING-03`, `RNF-USA-01`, `RNF-USA-02`
* **Fuentes Oficiales:** Human-Centered Design for Spaceflight UIs / ISO 9241-11

### 📖 Narrativa de Usuario:
> **Como** Astronauta en órbita,  
> **Quiero** reportar síntomas subjetivos (mareo por adaptación espacial SAS, visión borrosa, dolor lumbar o náuseas) en menos de 10 segundos mediante selectores táctiles grandes,  
> **Para** no interrumpir mi cronograma operacional y alimentar los algoritmos de diagnóstico precoz del sistema.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Registro rápido de síntoma en 3 toques
* **Dado que** el astronauta experimenta mareo por adaptación espacial (SAS) al iniciar el segundo día de vuelo (FD-02),
* **Cuando** abre el módulo de reporte rápido,
* **Entonces** debe poder seleccionar el síntoma "Mareo / SAS", graduar la severidad (Leve, Moderado, Severo) y presionar "Guardar" en un máximo de 3 toques táctiles,
* **Y** el sistema debe confirmar el registro con retroalimentación visual clara sin exigir ingreso de texto mediante teclado.

#### Escenario 2: Fusión de síntoma subjetivo con telemetría objetiva
* **Dado que** el tripulante acaba de ingresar el síntoma "Visión Borrosa / Puntos Ciegos",
* **Cuando** el sistema evalúa la telemetría actual y encuentra una Presión Arterial Sistólica de $144\text{ mmHg}$,
* **Entonces** el motor de reglas debe asociar ambos eventos y activar de inmediato la sospecha clínica de **Síndrome Neuro-Ocular Asociado al Vuelo Espacial (SANS)**.
