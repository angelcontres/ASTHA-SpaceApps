# 🚨 ÉPICA 3: Protocolos de Contramedidas y Manejo de Crisis Espaciales
**Módulo:** Soporte a la Decisión y Procedimientos Médicos | **Estándar:** NASA Flight Procedures / NASA-STD-3001

---

## 📌 HU-09: Ejecución de Protocolos Médicos Asistidos Paso a Paso (Checklists No Médicos)

* **ID:** `HU-09`
* **Épica:** Épica 3 - Protocolos de Contramedidas y Manejo de Crisis
* **Prioridad MoSCoW:** **Must Have** (Supervivencia de Tripulación)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RF-GUI-01..04`, `RNF-USA-01`, `RNF-USA-04`
* **Fuentes Oficiales:** NASA Flight Procedures Handbook / Astronaut Cognitive Safety

### 📖 Narrativa de Usuario:
> **Como** Astronauta sin estudios médicos,  
> **Quiero** que cuando ocurra una alerta clínica el sistema me guíe a través de una lista de verificación secuencial e interactiva con casillas de confirmación (checklist estilo aviación),  
> **Para** aplicar el tratamiento correcto sin titubear, sin cometer errores de dosificación y sin entrar en pánico en microgravedad.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Estructura clara en 3 bloques de una contramedida
* **Dado que** se dispara cualquier alerta médica de prioridad Media o Alta,
* **Cuando** el astronauta visualiza la tarjeta de protocolo de contramedida,
* **Entonces** debe observar obligatoriamente tres secciones:
  1. **Qué ocurre:** Explicación fisiológica directa en español claro y sin jerga médica críptica.
  2. **Severidad y Urgencia:** Nivel de prioridad y tiempo estimado de acción.
  3. **Acciones:** Pasos numerados secuenciales con casillas de verificación interactivas (`checkbox`).

#### Escenario 2: Restricción exclusiva a recursos disponibles en nave
* **Dado que** la nave espacial viaja a Marte con un inventario médico estrictamente delimitado (sin quirófano ni tomógrafo),
* **Cuando** el motor de contramedidas genera la lista de acciones,
* **Entonces** únicamente debe recomendar dispositivos y fármacos comprobados a bordo (Pantalones LBNP, Máquina ARED, Botiquín de Emergencia, Rejilla de Amsler, Filtros LiOH).

---

## 📌 HU-10: Protocolo Automático de Evacuación ante Tormentas Solares (SPE)

* **ID:** `HU-10`
* **Épica:** Épica 3 - Protocolos de Contramedidas y Manejo de Crisis
* **Prioridad MoSCoW:** **Must Have** (Riesgo de Vida Inmediato)
* **Puntos de Historia (Story Points):** 8 SP
* **Requisitos SRS Trazados:** `RF-EVA-04`, `RF-GUI-03`, `RNF-USA-04`
* **Fuentes Oficiales:** NASA Space Permissible Exposure Limits (SPELs) / CSA CANS Project

### 📖 Narrativa de Usuario:
> **Como** Tripulación de Vuelo en Espacio Profundo,  
> **Quiero** que cuando el dosímetro CANS detecte un evento de partículas solares (SPE) con radiación superior a $100\ \mu\text{Sv/h}$, el sistema active de inmediato el protocolo de emergencia máxima,  
> **Para** protegerme dentro del módulo central blindado antes de absorber una dosis letal o desarrollar síndrome agudo por radiación (ARS).

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Activación de Código Rojo SPE
* **Dado que** el dosímetro de neutrones y partículas CANS detecta una tasa de dosis de $\text{Radiación} = 184.2\ \mu\text{Sv/h}$,
* **Cuando** el algoritmo evalúa la telemetría ambiental,
* **Entonces** la interfaz debe encender la alarma sonora táctica y cambiar el encabezado a **"CÓDIGO ROJO - EMERGENCIA SPE"**,
* **Y** reemplazar la lista de tareas activas por el checklist crítico de 3 pasos:
  * Paso 1: Evacuar de inmediato al módulo central blindado (*Storm Shelter*).
  * Paso 2: Administrar cóctel radioprotector antioxidante oral del Botiquín Bravo.
  * Paso 3: Fijar dosímetros personales pasivos en el mamparo interior blindado.

#### Escenario 2: Cancelación y verificación post-tormenta
* **Dado que** la tormenta solar ha declinado y la tasa de dosis vuelve a niveles de fondo nominales ($< 35\ \mu\text{Sv/h}$),
* **Cuando** el Oficial de Vuelo confirma la estabilidad ambiental durante más de 60 minutos,
* **Entonces** el sistema debe calcular la dosis acumulada total absorbida por cada tripulante durante el evento y registrarla en el log médico inmutable.

---

## 📌 HU-11: Manejo de Hipertensión Cefálica y Edema Ocular con Pantalones LBNP

* **ID:** `HU-11`
* **Épica:** Épica 3 - Protocolos de Contramedidas y Manejo de Crisis
* **Prioridad MoSCoW:** **Must Have** (Contramedida SANS)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RF-GUI-01`, `RF-GUI-02`, `RF-ANA-02`
* **Fuentes Oficiales:** NASA Lower Body Negative Pressure (LBNP) Operational Protocol

### 📖 Narrativa de Usuario:
> **Como** Oficial Médico de la Tripulación (CMO),  
> **Quiero** que el sistema asista la colocación, presurización y duración del dispositivo de presión negativa en extremidades inferiores (LBNP) ante episodios de SANS o sobrepresión intracraneal,  
> **Para** redistribuir los fluidos corporales hacia las piernas y descomprimir las venas cerebrales y la papila óptica.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Protocolo estándar LBNP guiado
* **Dado que** un tripulante presenta $\text{PAS} \ge 140\text{ mmHg}$ y reporte de visión borrosa,
* **Cuando** se activa el checklist de SANS en pantalla,
* **Entonces** el sistema debe indicar con precisión:
  * "Colocar y presurizar dispositivo LBNP a $-35\text{ mmHg}$ por $60\text{ minutos}$",
  * "Realizar examen visual en pantalla táctil con Rejilla de Amsler al minuto 0 y al minuto 60",
  * "Restringir la ingesta dietética de sodio a $< 2.0\text{ g/día}$ para reducir la retención cefálica de líquido".

#### Escenario 2: Monitoreo hemodinámico de seguridad durante LBNP
* **Dado que** la presión negativa en piernas puede inducir hipotensión o síncope si la presión arterial cae demasiado rápido,
* **Cuando** el sensor de presión arterial continua registra una caída de presión sistólica por debajo de $90\text{ mmHg}$ durante la sesión de LBNP,
* **Entonces** el sistema debe emitir una alarma de aborto inmediato: "Despresurizar LBNP lentamente y colocar al astronauta en posición horizontal neutra".

---

## 📌 HU-12: Adherencia a Ejercicio ARED y Prevención de Cálculos Renales (Litiasis)

* **ID:** `HU-12`
* **Épica:** Épica 3 - Protocolos de Contramedidas y Manejo de Crisis
* **Prioridad MoSCoW:** **Should Have** (Mantenimiento de Salud Crónico)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RF-EVA-03`, `RF-GUI-03`, `RF-GAM-01`
* **Fuentes Oficiales:** NASA HRP Bone Loss Risk / Renal Stone Prevention Guidelines

### 📖 Narrativa de Usuario:
> **Como** Astronauta en misión de larga duración,  
> **Quiero** registrar y visualizar mi cumplimiento diario de ejercicio resistivo (ARED) y mi balance hídrico,  
> **Para** evitar la pérdida acelerada de masa ósea ($1.0\% - 1.5\%$ mensual) y prevenir la formación de cálculos renales de oxalato de calcio en el espacio.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Monitoreo de sesión diaria de ARED
* **Dado que** el estándar médico de NASA exige un mínimo de 150 minutos diarios de ejercicio físico y de carga axial,
* **Cuando** el tripulante finaliza su rutina en la máquina ARED y confirma el registro,
* **Entonces** la tarjeta musculoesquelética del mapa anatómico debe actualizarse a estado **Nominal (Verde)**,
* **Y** sumar puntos a su barra de adherencia de vuelo para incentivar el cumplimiento de la rutina.

#### Escenario 2: Alerta preventiva de litiasis renal por baja hidratación
* **Dado que** la microgravedad incrementa la excreción urinaria de calcio por reabsorción ósea,
* **Cuando** el registro de ingesta hídrica del astronauta es menor a $2.5\text{ L/día}$ durante más de 36 horas,
* **Entonces** la región lumbar del mapa anatómico debe tornarse **Amarilla (Precaución)**,
* **Y** el sistema debe recomendar: "Ingerir 500 mL de agua con sales de citrato de potasio para alcalinizar la orina y prevenir precipitación de cristales de calcio".
