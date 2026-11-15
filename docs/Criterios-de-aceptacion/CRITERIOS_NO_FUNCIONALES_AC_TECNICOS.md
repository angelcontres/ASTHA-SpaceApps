# 🛡️ Criterios de Aceptación Técnicos y No Funcionales (AC-TECH)
### ASTHA — NASA Space Apps Challenge 2026
**Estándar Mandatorio:** NASA Software Safety Standard (NASA-STD-8719.13C) | CCSDS DTN | NPR 7150.2

---

## 📌 AC-TECH-01: Rendimiento, Tasa de Refresco y Latencia de Interfaz Edge

| Identificador | `AC-TECH-01` |
| :--- | :--- |
| **Requisitos SRS** | `RNF-POW-03`, `RNF-USA-02`, `RNF-USA-03` |
| **Historias de Usuario** | `HU-01`, `HU-05`, `HU-08` |
| **Casos de Uso** | `CU-01`, `CU-04` |
| **Método de Verificación** | **Prueba Automatizada (T)** |

### Declaración del Criterio:
La interfaz de usuario y los algoritmos de detección local **deben** responder en tiempo real garantizando una interacción inmediata y sin retardos perceptibles para el operador en situaciones de emergencia.

### Criterios Específicos de Aceptación:
1. **Latencia de Respuesta al Toque Táctil:**
   * Al pulsar cualquier órgano en el mapa anatómico o cambiar de tripulante (`C001` - `C004`), el tiempo de respuesta entre el evento `pointerdown` y el repintado en pantalla debe ser estrictamente inferior a **$100\text{ ms}$** ($t_{\text{render}} < 100\text{ ms}$).
2. **Fluidez de Renderizado en Modo Nominal:**
   * La interfaz táctica debe mantener una tasa de refresco sostenida de **$60\text{ fotogramas por segundo (fps)}$** en hardware de aviónica de referencia (procesador ARM Cortex-A72 o x86 de bajo consumo).
3. **Tiempo de Arranque en Frío (Cold Boot):**
   * El tiempo transcurrido desde el lanzamiento del proceso ejecutable hasta la plena operatividad del panel con bioseñales en pantalla no debe exceder de **$3.0\text{ segundos}$**.

---

## 📌 AC-TECH-02: Presupuesto de Potencia Eléctrica y Gestión Térmica Pasiva

| Identificador | `AC-TECH-02` |
| :--- | :--- |
| **Requisitos SRS** | `RNF-POW-01`, `RNF-POW-02`, `RNF-POW-04` |
| **Historias de Usuario** | `HU-20` |
| **Casos de Uso** | `CU-12` |
| **Método de Verificación** | **Prueba en Banco de Potencia (T)** |

### Declaración del Criterio:
El software **debe** operar dentro de los estrictos límites de potencia eléctrica asignados a la aviónica médica de cabina, evitando sobrecalentamiento en entornos de microgravedad sin convección natural de aire.

### Criterios Específicos de Aceptación:
1. **Consumo Eléctrico Máximo en Reposo:**
   * El consumo de potencia del dispositivo cliente ejecutando ASTHA en modo de vigilancia nominal no debe superar los **$5.0\text{ Watts}$** medidos en el bus de alimentación DC.
2. **Carga Sostenida de CPU:**
   * El uso de CPU en estado estacionario (procesamiento de 4 flujos continuos a 1 Hz, evaluación de reglas y dibujo de curvas) no debe exceder del **$15.0\%$ de un solo núcleo de procesamiento**.
3. **Modo de Contingencia en Batería de Emergencia:**
   * Al recibir la señal de batería crítica, el sistema debe reducir automáticamente su tasa de repintado a **$0.2\text{ fps}$** (1 actualización cada 5 segundos), atenuar el brillo de pantalla al $20\%$ y mantener activos el $100\%$ de los algoritmos de detección vital.

---

## 📌 AC-TECH-03: Resiliencia y Autonomía 100% Offline (Zero-Ping Deep Space)

| Identificador | `AC-TECH-03` |
| :--- | :--- |
| **Requisitos SRS** | `RF-OFF-01..04`, `RNF-NET-01` |
| **Historias de Usuario** | `HU-13` |
| **Casos de Uso** | `CU-01`, `CU-05`, `CU-07` |
| **Método de Verificación** | **Prueba de Aislamiento de Red (T)** |

### Declaración del Criterio:
El software **debe** ejecutar todas sus funciones diagnósticas, visuales, matemáticas y procedimentales de forma local sin requerir conexión a Internet, a servidores en la nube ni a telemetría en tiempo real con la Tierra.

### Criterios Específicos de Aceptación:
1. **Prueba de Cortocircuito de Red:**
   * Con todos los adaptadores de red externa deshabilitados físicamente (bloqueo total de puertos WAN), la aplicación debe iniciar, procesar bioseñales, disparar alertas y guiar checklists con **cero excepciones de red** (`0 Network Exceptions`).
2. **Autosuficiencia de Recursos Estáticos:**
   * El sistema no debe intentar descargar fuentes tipográficas, scripts JS, estilos CSS ni imágenes de servidores CDN externos en tiempo de ejecución. Todo el código y los activos deben residir en el almacenamiento flash local.
3. **Tolerancia al Retraso de Radio de Marte:**
   * Ningún temporizador ni hilo de ejecución del sistema debe bloquear la interfaz de usuario esperando una confirmación de recepción (ACK) desde la estación de control en la Tierra.

---

## 📌 AC-TECH-04: Sincronización en Red Malla P2P y Reconciliación CRDT

| Identificador | `AC-TECH-04` |
| :--- | :--- |
| **Requisitos SRS** | `RNF-NET-02`, `RNF-NET-04` |
| **Historias de Usuario** | `HU-15` |
| **Casos de Uso** | `CU-10` |
| **Método de Verificación** | **Prueba de Red Distribuida (T)** |

### Declaración del Criterio:
Las tabletas y pantallas de mamparo de la nave **deben** sincronizar su información clínica de manera descentralizada mediante una red de malla ad-hoc sin un servidor central que constituya un punto único de fallo (*No Single Point of Failure*).

### Criterios Específicos de Aceptación:
1. **Tiempo Máximo de Reconciliación en Malla:**
   * Todo cambio en el expediente de salud o marcado de checklist en un nodo de cabina debe propagarse a todos los nodos en alcance de radio en un tiempo inferior a **$3.0\text{ segundos}$** ($t_{\text{sync}} \le 3.0\text{ s}$).
2. **Resolución de Conflictos Causalmente Consistente:**
   * Se deben emplear Tipos de Datos Replicados Libres de Conflicto (**CRDTs**). Si dos tripulantes modifican simultáneamente datos diferentes de un mismo astronauta durante una desconexión de módulo, la recombinación posterior debe fusionar ambos cambios automáticamente sin intervención humana y sin pérdida de datos.

---

## 📌 AC-TECH-05: Protocolo DTN para Comunicaciones Asíncronas con Houston

| Identificador | `AC-TECH-05` |
| :--- | :--- |
| **Requisitos SRS** | `RF-GUI-05`, `RNF-NET-03`, `RNF-SEC-01` |
| **Historias de Usuario** | `HU-14` |
| **Casos de Uso** | `CU-11` |
| **Método de Verificación** | **Prueba de Protocolo de Transporte (T)** |

### Declaración del Criterio:
El subsistema de enlace con la Tierra **debe** formatear los informes médicos y telemetría histórica bajo el estándar de redes tolerantes a demoras (*Delay-Tolerant Networking - DTN / CCSDS Bundle Protocol*), adaptándose a ventanas de visibilidad intermitentes y al retardo de ida y vuelta de 44 minutos.

### Criterios Específicos de Aceptación:
1. **Compatibilidad con Bundle Protocol (RFC 5050 / CCSDS 734.2-B-1):**
   * Los informes médicos consolidados deben empaquetarse en bundles DTN autónomos con su propio bloque de metadatos, tiempo de expiración y firma criptográfica.
2. **Eficiencia de Compresión:**
   * El algoritmo de compresión local (Brotli o Zstandard) debe reducir el tamaño del payload de telemetría médica en más de un **$70.0\%$** respecto al JSON crudo original.
3. **Retención en Cola Persistente:**
   * Ante la pérdida de visibilidad de la Red de Espacio Profundo (DSN) o conjunción solar, los bundles deben permanecer almacenados en el disco no volátil de la nave durante un mínimo de **$30\text{ días}$** sin descartarse por timeout.

---

## 📌 AC-TECH-06: Ciberseguridad, Privacidad Médica y Blindaje contra Radiación (SEU)

| Identificador | `AC-TECH-06` |
| :--- | :--- |
| **Requisitos SRS** | `RNF-SEC-01`, `RNF-SEC-02`, `RNF-SEC-04` |
| **Historias de Usuario** | `HU-16` |
| **Casos de Uso** | `CU-10`, `CU-11` |
| **Método de Verificación** | **Análisis Criptográfico (A) y Prueba de Inyección de Fallos (T)** |

### Declaración del Criterio:
Los datos de salud de los astronautas **deben** estar protegidos contra accesos no autorizados y, fundamentalmente, contra la corrupción física de bits (*Single-Event Upsets - SEU*) provocada por iones pesados de rayos cósmicos galácticos (GCR).

### Criterios Específicos de Aceptación:
1. **Cifrado en Reposo y en Tránsito Local:**
   * La base de datos médica local SQLite debe estar cifrada en reposo mediante **AES-256** (SQLCipher o equivalente de grado aeroespacial). Todas las transmisiones locales BLE/Wi-Fi deben contar con túnel seguro cifrado.
2. **Detección y Corrección de Bit-Flips (SEU):**
   * Cada bloque de registro biomédico persistido debe incluir una suma de verificación **CRC32 / SHA-256**.
   * Al leer un registro de la memoria flash, si la suma no coincide (detección de inversión de bit por partícula ionizante), el sistema debe descartar el bloque corrupto y restaurarlo automáticamente desde la réplica espejo del nodo vecino en la red de malla.
3. **Cadena Inmutable de Auditoría Médica:**
   * Todas las intervenciones médicas, administración de fármacos y dosis de radiación absorbidas deben registrarse en un log de eventos de sólo adición (*Append-Only Hash Chain*), garantizando que ningún registro pueda ser alterado retroactivamente.
