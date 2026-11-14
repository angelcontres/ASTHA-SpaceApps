# 🧬 Criterios de Aceptación Clínicos y Fisiológicos (AC-CLIN)
### AstroVital — NASA Space Apps Challenge 2026
**Estándar Mandatorio:** NASA-STD-3001 (Volume 1: Crew Health | Volume 2: Human Factors, Habitation, and Environment)

---

## 📌 AC-CLIN-01: Clasificación Tri-Estado de Bioseñales Fisiológicas

| Identificador | `AC-CLIN-01` |
| :--- | :--- |
| **Requisitos SRS** | `RF-ING-01`, `RF-EVA-01`, `RF-EVA-02`, `RF-DSH-01` |
| **Historias de Usuario** | `HU-01`, `HU-08` |
| **Casos de Uso** | `CU-01` |
| **Método de Verificación** | **Prueba (T) y Análisis (A)** |

### Declaración del Criterio:
El sistema **debe** clasificar cada valor de telemetría biomédica individual recibido en uno de tres estados mutuamente excluyentes (**Nominal**, **Precaución**, **Crítico**) utilizando con exactitud los umbrales fisiológicos definidos en la siguiente tabla:

| Parámetro Vital | Unidad | Nominal (Verde) | Precaución (Amarillo) | Crítico (Rojo) |
| :--- | :---: | :---: | :---: | :---: |
| **Frecuencia Cardíaca en Reposo (FC)** | bpm | $55 - 85$ | $45 - 54$ ó $86 - 109$ | $< 45$ ó $\ge 110$ |
| **Presión Arterial Sistólica (PAS)** | mmHg | $105 - 125$ | $90 - 104$ ó $126 - 139$ | $< 90$ ó $\ge 140$ |
| **Presión Arterial Diastólica (PAD)** | mmHg | $65 - 85$ | $55 - 64$ ó $86 - 94$ | $< 55$ ó $\ge 95$ |
| **Saturación de Oxígeno ($\text{SpO}_2$)** | % | $\ge 96.0$ | $93.0 - 95.9$ | $< 93.0$ |
| **Variabilidad Cardíaca ($\text{HRV rMSSD}$)** | ms | $> 35.0$ | $20.0 - 35.0$ | $< 20.0$ |
| **Duración del Sueño Nocturno** | horas | $\ge 7.0$ | $5.5 - 6.9$ | $< 5.5$ (por $\ge 2$ días) |

### Procedimiento de Prueba y Validación:
1. Se inyecta un vector de prueba sintético con 10,000 puntos distribuidos en todo el espectro biomédico (incluyendo valores límite exactos: 85, 86, 109, 110 bpm; 125, 126, 139, 140 mmHg).
2. Se evalúa que la clasificación emitida por el motor CDSS coincida al **$100.0\%$** con la tabla de verdad.
3. Se verifica que el **Estado Global del Tripulante** sea calculado como el peor estado entre todos sus indicadores activos ($\text{EstadoGlobal} = \max(\text{Severidad}_i)$).

---

## 📌 AC-CLIN-02: Detección Algorítmica de Deriva Fisiológica (Modified Z-Score)

| Identificador | `AC-CLIN-02` |
| :--- | :--- |
| **Requisitos SRS** | `RF-DER-01`, `RF-DER-02`, `RF-DER-03`, `RF-DER-04` |
| **Historias de Usuario** | `HU-02`, `HU-07` |
| **Casos de Uso** | `CU-06` |
| **Método de Verificación** | **Análisis Matemático (A) y Prueba (T)** |

### Declaración del Criterio:
El sistema **debe** calcular diariamente para cada astronauta el Z-Score Modificado de Iglewicz & Hoaglin utilizando la Desviación Absoluta respecto a la Mediana ($\text{MAD}$) sobre una ventana móvil de los últimos 7 días:

$$M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{\text{MAD}} \quad \text{donde} \quad \text{MAD} = \text{mediana}(|x_i - \tilde{x}|)$$

### Criterios Específicos de Aceptación:
1. **Detección de Anomalía Estadística:** Todo valor con $|M_i| \ge 2.5$ respecto a la línea base individual pre-vuelo (primeros 14 días en órbita o `L-44`) debe marcarse como "Deriva Estadística Significativa", incluso si el valor absoluto se encuentra dentro del rango nominal de población.
2. **Alerta Predictiva por Tendencia:** Se debe calcular la pendiente de regresión lineal ($\beta_1$) sobre los 7 días. Si la proyección matemática $x(t) = \beta_0 + \beta_1 \cdot t$ cruza el umbral de Precaución en $t \le 7\text{ días}$, el sistema debe disparar la **Alerta Precoz de Deriva**.
3. **Robustez ante Outliers:** La presencia de un valor atípico extremo aislado (ej. un artefacto de movimiento de $160\text{ bpm}$ durante 5 segundos) no debe distorsionar la mediana ni generar falsas alarmas de deriva sostenida.

---

## 📌 AC-CLIN-03: Detección Precoz y Estratificación del Síndrome Neuro-Ocular (SANS)

| Identificador | `AC-CLIN-03` |
| :--- | :--- |
| **Requisitos SRS** | `RF-EVA-01`, `RF-EVA-03`, `RF-GUI-01` |
| **Historias de Usuario** | `HU-06`, `HU-11` |
| **Casos de Uso** | `CU-05`, `CU-09` |
| **Método de Verificación** | **Demostración (D) y Prueba (T)** |

### Declaración del Criterio:
El sistema **debe** identificar de forma inmediata cualquier indicio de congestión venosa cerebral y sobrepresión en la papila óptica asociada al desplazamiento cefálico de fluidos en microgravedad, disparando el protocolo de contramedida correspondiente en menos de $100\text{ ms}$.

### Criterios Específicos de Aceptación:
1. **Condición de Disparo Crítico (Rojo):**
   * En fase orbital o espacio profundo ($\text{Fase} \ge \text{FD-01}$), si $\text{PAS} \ge 140\text{ mmHg}$, la tarjeta de presión arterial debe parpadear en rojo (#ef4444) con el texto "SANS CRITICAL".
   * El hotspot ocular del mapa anatómico debe tornarse rojo instantáneamente.
2. **Condición de Disparo Preventivo (Amarillo):**
   * Si $\text{PAS} \ge 126\text{ mmHg}$ y el astronauta registra en el módulo de síntomas "Visión borrosa" o "Cefalea frontal", el sistema debe promover el estado a Precaución SANS.
3. **Despliegue del Protocolo LBNP:**
   * El sistema debe cargar automáticamente en el panel de acciones el checklist de 3 pasos:
     1. Presurizar pantalones de presión negativa LBNP a $-35\text{ mmHg}$ durante 60 minutos.
     2. Realizar test de Rejilla de Amsler en pantalla táctil al minuto 0 y minuto 60.
     3. Restringir sodio en ración nutricional a $< 2.0\text{ g/día}$.

---

## 📌 AC-CLIN-04: Correlación Ambiental-Fisiológica con Dióxido de Carbono ($ppCO_2$)

| Identificador | `AC-CLIN-04` |
| :--- | :--- |
| **Requisitos SRS** | `RF-ING-02`, `RF-EVA-04`, `RF-DSH-04` |
| **Historias de Usuario** | `HU-03` |
| **Casos de Uso** | `CU-02` |
| **Método de Verificación** | **Prueba (T)** |

### Declaración del Criterio:
El sistema **debe** monitorizar la concentración de dióxido de carbono en la atmósfera de la cabina y correlacionarla con la respiración y hemodinámica de la tripulación para diagnosticar hipercapnia antes de que provoque letargo o acidosis respiratoria.

### Criterios Específicos de Aceptación:
1. **Límites de $ppCO_2$ según NASA-STD-3001 Vol 2 Sec 6:**
   * **Nominal:** $ppCO_2 < 2.0\text{ mmHg}$ ($< 2600\text{ ppm}$).
   * **Precaución:** $2.0 \le ppCO_2 \le 3.0\text{ mmHg}$ ($2600 - 3950\text{ ppm}$).
   * **Crítico (Violación de Regla de Vuelo):** $ppCO_2 > 3.0\text{ mmHg}$ ($> 3950\text{ ppm}$).
2. **Regla de Correlación Cruzada:**
   * Si $ppCO_2 > 2.5\text{ mmHg}$ y un astronauta en ese módulo presenta Frecuencia Respiratoria $\ge 20\text{ rpm}$ o cefalea, la causa raíz prioritaria asignada debe ser **"Bolsa de $CO_2$ en Cabina"**, recomendando verificar ventiladores de convección forzada antes de administrar analgesia.

---

## 📌 AC-CLIN-05: Dosimetría de Radiación Espacial y Tormentas Solares (SPE)

| Identificador | `AC-CLIN-05` |
| :--- | :--- |
| **Requisitos SRS** | `RF-EVA-04`, `RF-GUI-03`, `RNF-USA-04` |
| **Historias de Usuario** | `HU-03`, `HU-10` |
| **Casos de Uso** | `CU-02`, `CU-08` |
| **Método de Verificación** | **Demostración (D) y Prueba (T)** |

### Declaración del Criterio:
El sistema **debe** procesar las lecturas del espectrómetro de neutrones y partículas CANS (Agencia Espacial Canadiense) y activar el protocolo de emergencia de máxima prioridad cuando el flujo de radiación ponga en riesgo la vida de la tripulación.

### Criterios Específicos de Aceptación:
1. **Límites de Tasa de Dosis (NASA SPELs):**
   * **Nominal GCR (Rayos Cósmicos de Fondo):** $15.0 - 35.0\ \mu\text{Sv/h}$.
   * **Precaución (Actividad Solar Moderada):** $35.1 - 99.9\ \mu\text{Sv/h}$.
   * **Crítico (Tormenta Solar SPE Inminente):** $\ge 100.0\ \mu\text{Sv/h}$.
2. **Respuesta ante Código Rojo SPE:**
   * La interfaz general debe pulsar en color rojo y emitir un tono de alarma táctica en menos de $50\text{ ms}$.
   * El checklist de acciones de emergencia debe ordenarse según:
     1. Evacuar tripulación al módulo central blindado (*Storm Shelter*).
     2. Administrar cóctel radioprotector oral del Botiquín Bravo.
     3. Fijar dosímetros personales pasivos en el mamparo interior.
   * El sistema debe computar y acumular la dosis biológica total recibida en unidades de milisieverts ($\text{mSv}$).

---

## 📌 AC-CLIN-06: Arquitectura y Usabilidad de Checklists para No Médicos

| Identificador | `AC-CLIN-06` |
| :--- | :--- |
| **Requisitos SRS** | `RF-GUI-01..04`, `RNF-USA-01`, `RNF-USA-04` |
| **Historias de Usuario** | `HU-09`, `HU-12` |
| **Casos de Uso** | `CU-07` |
| **Método de Verificación** | **Inspección (I) y Demostración (D)** |

### Declaración del Criterio:
Todos los procedimientos médicos de contramedida presentados por el sistema **deben** estructurarse bajo un formato estandarizado comprensible para ingenieros, pilotos y científicos sin formación en medicina intensiva.

### Criterios Específicos de Aceptación:
1. **Estructura Obligatoria en 3 Bloques:**
   * **Bloque 1 (Explicación Fisiológica):** Texto en español simple que explica qué le ocurre al cuerpo (máximo 3 líneas).
   * **Bloque 2 (Severidad e Impacto):** Badge visual con prioridad (Alta, Media, Baja) y ventana de tiempo recomendada para la acción.
   * **Bloque 3 (Checklist Secuencial):** Lista numerada con casillas interactivas (`checkbox`).
2. **Restricción de Pasos Accionables:** Ningún procedimiento debe contener más de **4 pasos secuenciales** para evitar sobrecarga de memoria de trabajo en situaciones de crisis.
3. **Restricción a Recursos de a Bordo:** El sistema tiene prohibido sugerir recursos que no existan en una nave de espacio profundo (ej. no debe sugerir "resonancia magnética", "intubación endotraqueal quirúrgica" o "traslado hospitalario"). Solo debe citar insumos confirmados a bordo (LBNP, ARED, Botiquines Bravo/Alfa, cartuchos LiOH/CDRA, citrato de potasio).

---

## 📌 AC-CLIN-07: Triage en Mapa Anatómico y Accesibilidad Visual (Daltonismo)

| Identificador | `AC-CLIN-07` |
| :--- | :--- |
| **Requisitos SRS** | `RF-ANA-01..04`, `RNF-USA-02`, `RNF-USA-03` |
| **Historias de Usuario** | `HU-05` |
| **Casos de Uso** | `CU-04` |
| **Método de Verificación** | **Inspección (I) y Demostración (D)** |

### Declaración del Criterio:
El mapa anatómico interactivo **debe** proporcionar una representación visual clara de los órganos corporales afectados sin depender exclusivamente del color para transmitir información crítica.

### Criterios Específicos de Aceptación:
1. **Regiones Anatómicas Clicables (Hotspots):** El modelo humano vectorial debe poseer zonas de toque interactivas para: Ojos/Cerebro, Tórax/Corazón, Zona Lumbar/Riñones, Fémur/Huesos y Extremidades.
2. **Principio de Doble Codificación (Doble-Canal):** Todo estado de advertencia o peligro debe transmitirse mediante dos canales simultáneos:
   * **Canal 1 (Cromático):** Verde (#10b981), Amarillo (#f59e0b) o Rojo (#ef4444).
   * **Canal 2 (Mórfico / Textual):** Icono representativo, borde de alto contraste con pulsación rítmica lenta (1.5s) y etiqueta textual explícita ("NOMINAL", "PRECAUCIÓN", "SANS CRITICAL").
3. **Área de Toque Ergonómica:** Cada hotspot anatómico debe tener un área de activación táctil mínima de $48 \times 48\text{ píxeles}$, garantizando operabilidad con dedos enguantados o temblores por frío/estrés.
