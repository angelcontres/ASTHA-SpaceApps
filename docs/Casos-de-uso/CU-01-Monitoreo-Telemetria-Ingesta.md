# 📡 Paquete 1: Ingesta, Filtrado y Telemetría de Vuelo
**Módulo:** Adquisición de Señales y Entorno Ambiental | **Estándar:** NASA-STD-3001 Vol 1 & 2 / CSA Bio-Monitor

---

## 📋 Caso de Uso: CU-01
### Nombre: Ingesta Continua y Filtrado de Telemetría Biomédica

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-01` |
| **Actor Primario** | Sensor Biomédico (SmartShirt Astroskin / Bio-Monitor) |
| **Actores Secundarios** | Astronauta en Misión |
| **Nivel** | Nivel de Sistema / Función de Soporte Continuo |
| **Requisitos SRS** | `RF-ING-01`, `RF-DSH-01`, `RNF-POW-03` |
| **Historias Trazadas** | `HU-01` |

### 1. Descripción Breve:
El sistema recibe paquetes de datos fisiológicos continuos a 1 Hz desde la indumentaria biomédica del astronauta mediante Bluetooth Low Energy (BLE), aplica filtros de eliminación de ruido y artefactos de movimiento causados por microgravedad, valida los valores contra los rangos físicos admisibles y actualiza la base de datos local y la interfaz táctica.

### 2. Precondiciones:
1. La prenda biomédica (SmartShirt) tiene los electrodos y bandas pletismográficas en contacto adecuado con el torso del astronauta.
2. El nodo cliente de AstroVital tiene la interfaz BLE activa y emparejada con la dirección MAC del sensor asignado al tripulante.
3. El motor de persistencia local (SQLite / almacenamiento flash) dispone de espacio libre ($> 50\text{ MB}$).

### 3. Disparador (Trigger):
Recepción periódica de un paquete de telemetría BLE (intervalo de 1000 ms).

### 4. Flujo Principal de Eventos:
1. El sensor biomédico emite un paquete que contiene: Frecuencia Cardíaca (bpm), Presión Arterial estimada (mmHg), SpO₂ (%), Intervalos R-R (ms) y Acelerometría triaxial (g).
2. El subsistema de comunicaciones de AstroVital recibe el paquete binario y calcula la suma de verificación CRC32 para descartar corrupción por ruido electromagnético.
3. El módulo de filtrado aplica un filtro pasa-banda digital y descarta artefactos de movimiento cuando la acelerometría indica actividad física vigorosa (ej. sesión en cinta ergométrica).
4. El sistema calcula la métrica de variabilidad cardíaca en el dominio del tiempo ($\text{HRV rMSSD}$) sobre una ventana móvil de 5 minutos.
5. El sistema compara los valores contra los umbrales fisiológicos de `NASA-STD-3001`.
6. El sistema persiste el registro validado en la base de datos local con marca de tiempo UTC de vuelo (Mission Elapsed Time - MET).
7. La interfaz táctica actualiza las tarjetas numéricas de signos vitales y añade el nuevo punto a la curva histórica de Chart.js.

### 5. Flujos Alternativos:
* **FA-01: Desconexión transitoria del sensor ($< 60\text{ segundos}$):**
  1. Si no se recibe paquete en 2 segundos consecutivos, el sistema mantiene el último valor válido en pantalla con un icono de advertencia de retardo.
  2. Al reanudarse la señal BLE, el sistema procesa los paquetes encolados en la memoria interna de la prenda y sincroniza la línea temporal.
* **FA-02: Calibración automática de línea base en reposo:**
  1. Si la acelerometría indica reposo absoluto y la hora MET corresponde al horario de descanso del tripulante, el sistema registra los valores como "Línea Base Nocturna" para calibrar el algoritmo de fatiga.

### 6. Flujos de Excepción:
* **FE-01: Pérdida prolongada de señal ($> 60\text{ segundos}$):**
  1. El sistema conmuta la tarjeta de vitales a estado inactivo (Gris #64748b) con la leyenda "Sensor Desconectado".
  2. No se dispara alarma médica audible de paro o asistolia, evitando alarmar innecesariamente al resto de la nave.
  3. Se registra un evento operacional de desconexión en el log del sistema.
* **FE-02: Paquete corrupto por radiación (SEU / Single-Event Upset):**
  1. El CRC32 del paquete falla.
  2. El sistema descarta el paquete defectuoso y solicita una retransmisión al buffer local del sensor.
  3. Si la falla persiste por 5 paquetes, se emite una alerta técnica: "Fallo de paridad en receptor BLE".

### 7. Postcondiciones:
* **Éxito:** Las constantes vitales del astronauta están actualizadas en pantalla y persistidas en el registro inmutable local.
* **Fallo:** La interfaz refleja de forma transparente la ausencia de datos sin presentar valores fantasma ni congelar la aplicación.

---

## 📋 Caso de Uso: CU-02
### Nombre: Correlación Ambiental-Fisiológica (Bolsas de $CO_2$ y Radiación CANS)

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-02` |
| **Actor Primario** | Sensores de Cabina (ECLSS / Dosímetro CANS CSA) |
| **Actores Secundarios** | Oficial Médico (CMO), Ingeniero de Sistemas de Hábitat |
| **Nivel** | Nivel de Decisión Clínica y Seguridad de Vuelo |
| **Requisitos SRS** | `RF-ING-02`, `RF-EVA-04`, `RF-DSH-04`, `RNF-SEC-01` |
| **Historias Trazadas** | `HU-03` |

### 1. Descripción Breve:
El sistema supervisa la presión parcial de dióxido de carbono ($ppCO_2$) y la tasa de dosis de radiación en tiempo real. Cuando los niveles ambientales exceden los límites de NASA-STD-3001, el sistema correlaciona estos datos con las bioseñales de los astronautas presentes en ese módulo para diferenciar entre una enfermedad individual y un fallo atmosférico general de la nave.

### 2. Precondiciones:
1. Los sensores del sistema ECLSS y el dosímetro de neutrones CANS están operativos y transmitiendo telemetría al bus de datos de la nave.
2. Se conoce la ubicación física del astronauta dentro de los módulos del hábitat (Nodo de vivienda, laboratorio, módulo central).

### 3. Disparador (Trigger):
La concentración de $ppCO_2$ supera los $2.5\text{ mmHg}$ o la tasa de radiación supera los $100\ \mu\text{Sv/h}$.

### 4. Flujo Principal de Eventos:
1. El sensor atmosférico detecta $ppCO_2 = 3.2\text{ mmHg}$ ($> 4200\text{ ppm}$) en el módulo de descanso.
2. El motor de reglas de AstroVital consulta el estado biomédico de los astronautas ubicados en dicho módulo.
3. El sistema detecta que el astronauta presenta taquipnea ($\text{FR} = 22\text{ rpm}$) y una leve elevación de la presión arterial sistólica.
4. El sistema descarta una crisis hipertensiva idiopática y clasifica el cuadro como: **"Alerta ECLSS: Riesgo de Intoxicación por $CO_2$ / Hipercapnia"**.
5. La barra superior del hábitat entra en estado de advertencia visual amarilla.
6. El sistema genera una orden de contramedida ambiental prioritaria: "Conmutar CDRA a ciclo forzado y activar ventiladores de circulación para disipar bolsa de aire estancado".
7. Se notifica simultáneamente al astronauta afectado y al Ingeniero de Hábitat en sus respectivas terminales.

### 5. Flujos Alternativos:
* **FA-01: Disparo aislado sin alteración fisiológica en el astronauta:**
  1. Si la telemetría ambiental se eleva pero el astronauta mantiene vitales estrictamente nominales ($\text{SpO}_2 \ge 98\%$, $\text{FR}$ nominal), el sistema clasifica la alerta como "Advertencia Ambiental Precoz" y no perturba el descanso del tripulante, alertando únicamente al Oficial de Guardia.

### 6. Flujos de Excepción:
* **FE-01: Fallo o bloqueo del sensor atmosférico:**
  1. Si el sensor de cabina deja de enviar telemetría o emite valores constantes irreales ($0.00\text{ mmHg}$), el sistema marca el sensor como "No Confiable" y utiliza los datos de respiración de la SmartShirt para inferir la concentración de $CO_2$ mediante volumen corriente.

### 7. Postcondiciones:
* **Éxito:** Se emite una alerta explicable que previene la hipoxia o cefalea incapacitante del astronauta atacando la causa raíz ambiental.

---

## 📋 Caso de Uso: CU-03
### Nombre: Registro Fricción-Cero de Síntomas Subjetivos por el Astronauta

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-03` |
| **Actor Primario** | Astronauta en Misión |
| **Actores Secundarios** | Oficial Médico (CMO) |
| **Nivel** | Nivel de Usuario / Tarea Operacional |
| **Requisitos SRS** | `RF-ING-03`, `RNF-USA-01`, `RNF-USA-02` |
| **Historias Trazadas** | `HU-04` |

### 1. Descripción Breve:
Permite a cualquier tripulante registrar síntomas cualitativos (visión borrosa, cefalea, náuseas, dolor lumbar o fatiga) en menos de 10 segundos mediante selectores táctiles gigantes aptos para dedos enguantados o condiciones de fatiga extrema.

### 2. Precondiciones:
1. La aplicación AstroVital se encuentra abierta en la tableta del astronauta o en la pantalla de mamparo.
2. El astronauta ha seleccionado su identificador de tripulante (`C001` - `C004`).

### 3. Disparador (Trigger):
El astronauta experimenta una molestia física y pulsa el botón flotante "Reportar Síntoma".

### 4. Flujo Principal de Eventos:
1. El sistema despliega una cuadrícula de 6 iconos táctiles grandes ($64 \times 64\text{ px}$): Cefalea, Mareo (SAS), Ojos/Visión, Lumbar/Espalda, Digestivo y Fatiga.
2. El astronauta toca el icono "Ojos/Visión" (1er toque).
3. El sistema muestra un selector de severidad visual en 3 niveles: Leve (Verde/Amarillo), Moderado (Naranja), Severo (Rojo).
4. El astronauta toca "Moderado" (2do toque).
5. El sistema presenta un botón de confirmación con cuenta regresiva automática de 3 segundos o pulsación directa "Guardar" (3er toque).
6. El sistema guarda el evento en el expediente local enlazado con la marca de tiempo MET actual.
7. El motor CDSS recalcula el estado del sistema neuro-ocular incorporando este reporte cualitativo.
8. La interfaz emite una sutil vibración háptica y cierra el diálogo, volviendo a la pantalla principal sin requerir escribir en el teclado.

### 5. Flujos Alternativos:
* **FA-01: Cancelación del reporte:**
  1. Si el astronauta toca fuera del cuadro o presiona "Cancelar", el sistema descarta el borrador y no modifica el historial médico.

### 6. Flujos de Excepción:
* **FE-01: Reporte de síntoma crítico con telemetría discordante:**
  1. Si el astronauta reporta "Dolor torácico severo" pero el electrocardiograma es normal, el sistema prioriza la seguridad de la vida: eleva el triage a Precaución y sugiere al CMO realizar un examen clínico presencial.

### 7. Postcondiciones:
* **Éxito:** El síntoma queda registrado en menos de 10 segundos y el motor de decisión clínica ajusta el triage del tripulante.
