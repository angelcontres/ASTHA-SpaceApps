# 🧠 Paquete 2: Triage Clínico y Soporte a la Decisión (CDSS)
**Módulo:** Motor de Reglas e Inteligencia Local Edge | **Estándar:** NASA-STD-3001 Vol 1 / NASA HRP Risks

---

## 📋 Caso de Uso: CU-04
### Nombre: Triage Visual mediante Exploración del Mapa Anatómico Interactivo

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-04` |
| **Actor Primario** | Astronauta en Misión / Oficial Médico (CMO) |
| **Actores Secundarios** | Motor Gráfico SVG / Canvas |
| **Nivel** | Nivel de Usuario / Interacción Diagnóstica |
| **Requisitos SRS** | `RF-ANA-01..04`, `RNF-USA-02`, `RNF-USA-03` |
| **Historias Trazadas** | `HU-05`, `HU-08` |

### 1. Descripción Breve:
El usuario interactúa con la figura anatómica humana 2D/3D rendered en pantalla táctil. Al pulsar sobre cualquier región corporal (cabeza/ojos, tórax/corazón, abdomen/riñones, extremidades/huesos), el sistema realiza un triage visual instantáneo, desplegando el estado de salud, la fisiopatología en microgravedad y las bioseñales vinculadas.

### 2. Precondiciones:
1. La aplicación ASTHA está en ejecución y mostrando el panel táctico principal.
2. Los datos fisiológicos del tripulante seleccionado han sido procesados por el motor de evaluación.

### 3. Disparador (Trigger):
El usuario toca o hace clic en un órgano o región del mapa anatómico.

### 4. Flujo Principal de Eventos:
1. El usuario toca el hotspot de **Ojos y Cráneo** en el mapa anatómico.
2. El sistema resalta la región seleccionada con un resplandor cian brillante (glow effect) y atenúa el resto del cuerpo.
3. El sistema extrae de la base de datos el estado actual del **Sistema Neuro-Ocular**.
4. La tarjeta informativa inferior se actualiza en menos de $50\text{ ms}$ mostrando:
   * **Nombre del Sistema:** "Sistema Neuro-Ocular (Ojos y Cerebro)".
   * **Insignia de Estado:** "ALERTA SANS - DERIVA / PRECAUCIÓN" (Fondo ámbar / texto blanco).
   * **Métricas Clave:** Presión Arterial Sistólica ($144\text{ mmHg}$), Agudeza Visual ($20/25$).
   * **Fisiopatología:** "Desplazamiento cefálico de fluidos en microgravedad. Riesgo de congestión venosa y aplanamiento del globo ocular".
5. Si el órgano presenta una alerta activa, el sistema despliega un botón de acceso directo: "Ver Protocolo de Contramedida LBNP".

### 5. Flujos Alternativos:
* **FA-01: Selección de Órgano Cardiovascular (Corazón/Tórax):**
  1. El sistema despliega: Frecuencia Cardíaca actual, Curva ECG sintética, Variabilidad $\text{HRV rMSSD}$ ($19.5\text{ ms}$) y estado del tono vagal.
* **FA-02: Selección de Órgano Renal (Riñones/Lumbar):**
  1. El sistema despliega: Estimación de excreción de calcio en orina ($> 300\text{ mg/día}$), volumen hídrico diario consumido ($2.1\text{ L}$) y riesgo de formación de cálculos de oxalato de calcio.
* **FA-03: Selección de Sistema Óseo (Fémur/Columna):**
  1. El sistema despliega: Tasa de resorción ósea acumulada estimada ($1.2\%/\text{mes}$), minutos de ejercicio resistivo completados en ARED (120 de 150 min objetivo).

### 6. Flujos de Excepción:
* **FE-01: Dispositivo con aceleración gráfica deshabilitada:**
  1. El sistema conmuta automáticamente a una vista esquemática vectorial SVG ligera para mantener los 60 fps en la animación táctil.

### 7. Postcondiciones:
* **Éxito:** El usuario comprende inmediatamente el estado clínico del órgano sin necesidad de conocimientos médicos especializados.

---

## 📋 Caso de Uso: CU-05
### Nombre: Detección Precoz y Estratificación del Síndrome Neuro-Ocular (SANS)

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-05` |
| **Actor Primario** | Oficial Médico (CMO) |
| **Actores Secundarios** | Astronauta Afectado (Paciente) |
| **Nivel** | Nivel Clínico / Soporte a la Decisión Médica |
| **Requisitos SRS** | `RF-EVA-01`, `RF-EVA-03`, `RF-GUI-01` |
| **Historias Trazadas** | `HU-06` |

### 1. Descripción Breve:
El motor CDSS analiza en segundo plano la presión arterial continua, la presencia de síntomas visuales subjetivos y el historial de vuelo en microgravedad. Cuando detecta hipertensión cefálica sostenida con sospecha de edema papilar (SANS), activa el protocolo de contingencia antes de que se produzca una pérdida visual permanente.

### 2. Precondiciones:
1. El astronauta se encuentra en fase de vuelo en microgravedad ($\text{Fase} \ge \text{FD-01}$).
2. Existen lecturas validadas de presión arterial continua.

### 3. Disparador (Trigger):
La Presión Arterial Sistólica alcanza o supera los $140\text{ mmHg}$ ($\text{PAS} \ge 140\text{ mmHg}$) o se combina una $\text{PAS} \ge 130\text{ mmHg}$ con reporte de visión borrosa.

### 4. Flujo Principal de Eventos:
1. El sensor pletismográfico reporta una lectura de $\text{PA} = 144/92\text{ mmHg}$ en el tripulante `C003` (Dra. Sian Proctor).
2. El motor de reglas de ASTHA verifica que el tripulante se encuentra en el día 2 de vuelo (FD-02), fase crítica de redistribución cefálica de sangre y líquido cefalorraquídeo.
3. El sistema clasifica el evento con nivel de severidad **Crítico (Rojo)**.
4. La tarjeta de Presión Arterial en pantalla entra en animación de pulso rojo intermitente con el texto "SANS CRITICAL".
5. El hotspot de los ojos en el mapa anatómico pasa de cian a rojo (#ef4444).
6. El sistema actualiza el panel de contramedidas con el plan específico de descompresión venosa:
   * **Paso 1:** Presurización de pantalones LBNP a $-35\text{ mmHg}$ por 60 min.
   * **Paso 2:** Prueba visual con Rejilla de Amsler en pantalla táctil.
   * **Paso 3:** Restricción estricta de sodio en dieta a menos de $2.0\text{ g/día}$.
7. Se genera una alerta de prioridad alta en la tableta del Oficial Médico (`C002` - Hayley Arceneaux).

### 5. Flujos Alternativos:
* **FA-01: Hipertensión transitoria por ejercicio físico intenso:**
  1. Si la acelerometría indica que el astronauta acaba de finalizar su sesión de ejercicio en ARED, el sistema pospone la evaluación de SANS durante 15 minutos para permitir la normalización hemodinámica post-esfuerzo.

### 6. Flujos de Excepción:
* **FE-01: Progresión refractaria a pesar de contramedidas:**
  1. Si tras 60 minutos de LBNP la presión sistólica no desciende de $135\text{ mmHg}$ o el tripulante reporta escotomas o pérdida de visión central, el sistema eleva la alerta a "Emergencia Neuro-Ocular de Nivel 3" y sugiere la administración oral de acetazolamida (inhibidor de anhidrasa carbónica del botiquín de vuelo).

### 7. Postcondiciones:
* **Éxito:** Se interviene tempranamente el edema papilar y se preserva la visión del astronauta.

---

## 📋 Caso de Uso: CU-06
### Nombre: Detección Algorítmica de Deriva Fisiológica (Z-Score Modificado)

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-06` |
| **Actor Primario** | Motor Matemático CDSS |
| **Actores Secundarios** | Oficial Médico (CMO) |
| **Nivel** | Nivel de Algoritmo / Vigilancia Preventiva |
| **Requisitos SRS** | `RF-DER-01..03`, `RNF-USA-05` |
| **Historias Trazadas** | `HU-07` |

### 1. Descripción Breve:
El sistema calcula el Modified Z-score sobre una ventana móvil de 7 días para todas las constantes vitales del astronauta, comparándolas contra su propia línea base previa al vuelo (L-44). Si detecta una tendencia sostenida hacia el deterioro, emite una alerta preventiva antes de que el valor absoluto cruce el límite crítico de NASA-STD-3001.

### 2. Precondiciones:
1. El astronauta tiene al menos 3 días de mediciones históricas registradas en la nave.
2. Se cuenta con la línea base terrestre individual pre-vuelo (`L-44`).

### 3. Disparador (Trigger):
Cálculo diario programado a las 06:00 MET o recepción de una nueva serie de telemetría.

### 4. Flujo Principal de Eventos:
1. El algoritmo extrae el vector de datos de los últimos 7 días para cada biomarcador (ej. Frecuencia Cardíaca en reposo matutina).
2. El algoritmo calcula la mediana ($\tilde{x}$) y la desviación absoluta respecto a la mediana ($\text{MAD}$):
   $$\text{MAD} = \text{mediana}(|x_i - \tilde{x}|)$$
3. Se evalúa el valor actual $x_{\text{hoy}}$ calculando el Z-Score Modificado de Iglewicz & Hoaglin:
   $$M_i = \frac{0.6745 \cdot (x_{\text{hoy}} - \tilde{x})}{\text{MAD}}$$
4. El sistema evalúa la condición de deriva estadística: Si $|M_i| \ge 2.5$, se marca la variable como **Deriva Anómala**.
5. Se ejecuta una regresión lineal sobre los 7 puntos temporales para calcular la pendiente de cambio ($\beta_1$).
6. Si la pendiente proyecta que en menos de 7 días se cruzará el umbral de alerta médica (ej. presión sistólica cruzará $135\text{ mmHg}$), el sistema genera una **"Alerta Predictiva de Deriva"**.
7. En el tablero del CMO se muestra un badge amarillo con el mensaje: "Deriva detectada en FC: Desviación $Z = +2.7$ respecto a línea base; tendencia de $+2.1\text{ bpm/día}$".

### 5. Flujos Alternativos:
* **FA-01: Dispersión nula ($\text{MAD} = 0$):**
  1. Si las mediciones pasadas son idénticas ($\text{MAD} = 0$), el algoritmo conmuta automáticamente a la desviación media absoluta para evitar división por cero.

### 6. Flujos de Excepción:
* **FE-01: Datos incompletos por fallo de transmisión:**
  1. Si en la ventana de 7 días faltan más del $40\%$ de las lecturas, el sistema no calcula la proyección y notifica al CMO: "Datos insuficientes para regresión lineal predictiva; se mantiene monitoreo por umbrales estáticos".

### 7. Postcondiciones:
* **Éxito:** Se anticipa el agotamiento físico o el desacondicionamiento cardiovascular varios días antes de que se manifieste como una emergencia aguda.
