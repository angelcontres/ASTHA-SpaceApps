# 🛡️ Paquete 4: Arquitectura, Resiliencia y Comunicaciones
**Módulo:** Red Malla P2P, Protocolo DTN y Eficiencia Energética | **Estándar:** CCSDS DTN / Deep Space Constraints

---

## 📋 Caso de Uso: CU-10
### Nombre: Sincronización Descentralizada Malla P2P entre Nodos de Cabina

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-10` |
| **Actor Primario** | Nodo Local ASTHA (Cliente Edge) |
| **Actores Secundarios** | Nodos Vecinos en Cabina / Ingeniero de Software |
| **Nivel** | Nivel de Arquitectura / Sincronización Distribuida |
| **Requisitos SRS** | `RNF-NET-02`, `RNF-NET-04`, `RNF-SEC-04` |
| **Historias Trazadas** | `HU-15`, `HU-16` |

### 1. Descripción Breve:
Garantiza que cualquier modificación en el estado de salud, checklist completado o lectura de telemetría realizada en un dispositivo (ej. tableta en camarote) se propague y reconcilie de forma automática con las demás terminales de la nave mediante una red de malla ad-hoc sin depender de un servidor central.

### 2. Precondiciones:
1. Al menos dos terminales de ASTHA están encendidas y con sus interfaces de radio local (Wi-Fi 802.11s o Bluetooth Mesh) habilitadas.
2. Cada nodo posee un par de claves criptográficas asimétricas locales para autenticar las transacciones.

### 3. Disparador (Trigger):
Conclusión de un checklist médico, cambio de estado clínico o conexión de un nuevo nodo a la red local.

### 4. Flujo Principal de Eventos:
1. Un astronauta completa una tarea en su tableta táctil (ej. administración de fármaco oral en el camarote).
2. El nodo emisor crea un registro estructurado con identificador único UUIDv4, marca de tiempo MET y firma digital con clave privada.
3. El registro se almacena en la base de datos distribuida local basada en tipos de datos replicados libres de conflicto (**CRDT - Conflict-free Replicated Data Type**).
4. El nodo emisor transmite un vector de estado comprimido a sus pares directos en la red malla mediante protocolo Gossip sobre UDP multicast.
5. Los nodos vecinos reciben el paquete, verifican la firma criptográfica y comparan su reloj lógico de Lamport.
6. Al detectar un evento más reciente, los nodos pares integran la mutación en sus bases de datos locales sin generar bloqueos ni inconsistencias.
7. En menos de 3 segundos, todas las pantallas de mamparo y tabletas de la nave reflejan el checklist completado.

### 5. Flujos Alternativos:
* **FA-01: Reconciliación tras partición de red (puertas blindadas cerradas):**
  1. Si un módulo queda temporalmente aislado por el cierre de una compuerta neumática blindada, el nodo de ese compartimento continúa operando y registrando datos de forma local.
  2. Al reabrirse la compuerta y restablecerse el enlace de radio, los nodos intercambian sus historiales y resuelven cualquier conflicto utilizando la regla del reloj causal determinista (*Last-Write-Wins con vector timestamps*).

### 6. Flujos de Excepción:
* **FE-01: Intrusión o corrupción de paquete por radiación:**
  1. Si un nodo recibe un paquete cuya firma digital o checksum SHA-256 no coincide, el paquete es rechazado inmediatamente, se añade la IP/MAC a una lista de aislamiento temporal y se notifica al Ingeniero de Comunicaciones.

### 7. Postcondiciones:
* **Éxito:** Coherencia de datos al $100\%$ en toda la nave sin que exista un punto único de fallo (*No Single Point of Failure*).

---

## 📋 Caso de Uso: CU-11
### Nombre: Empaquetado y Encolamiento Asíncrono DTN para Houston

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-11` |
| **Actor Primario** | Motor de Comunicaciones ASTHA |
| **Actores Secundarios** | Cirujano de Vuelo en Tierra (Houston Flight Surgeon) |
| **Nivel** | Nivel de Comunicación Interplanetaria / Protocolo de Transporte |
| **Requisitos SRS** | `RF-GUI-05`, `RNF-NET-03`, `RNF-SEC-01` |
| **Historias Trazadas** | `HU-14` |

### 1. Descripción Breve:
Consolida, comprime y cifra la telemetría histórica, los incidentes clínicos y las acciones de contramedida en paquetes autónomos compatibles con el estándar de redes tolerantes a demoras e interrupciones (**DTN - Delay-Tolerant Networking / CCSDS Bundle Protocol**), gestionando su transmisión hacia la Red de Espacio Profundo (DSN) sin esperar confirmación en tiempo real.

### 2. Precondiciones:
1. El sistema ha acumulado telemetría durante el ciclo diario de vuelo o se ha producido una alerta médica de prioridad Media/Alta.
2. La nave espacial tiene configurado el router DTN interplanetario conectado al transpondedor de banda X/Ka.

### 3. Disparador (Trigger):
Fin de ciclo diario (23:59 MET), disparo de una alerta clínica crítica o apertura de una ventana de enlace de radio con la Tierra.

### 4. Flujo Principal de Eventos:
1. El motor de comunicaciones extrae el log consolidado de las últimas 24 horas (o del episodio agudo).
2. El sistema aplica compresión Brotli/Gzip de alta eficiencia, reduciendo el tamaño del archivo en más del $75\%$.
3. Se encapsula la información en un paquete estándar **Bundle Protocol (RFC 5050 / CCSDS 734.2-B-1)**.
4. Se firma criptográficamente el bundle con certificado digital de misión de la nave.
5. El bundle se transfiere a la cola de salida persistente del router de a bordo.
6. Cuando la antena de alta ganancia establece contacto con una estación terrestre de la DSN (Goldstone, Madrid o Canberra), el bundle es transmitido a la velocidad disponible.
7. El sistema no bloquea ninguna función de a bordo y continúa su operación médica autónoma, asumiendo un retraso de propagación de 22 minutos de ida hacia la Tierra.

### 5. Flujos Alternativos:
* **FA-01: Recepción de mensaje de recomendación médica diferido desde Houston:**
  1. Tras 44 minutos (22 min ida + 22 min vuelta), el transpondedor recibe un bundle de respuesta firmado por el Cirujano de Vuelo en Tierra.
  2. ASTHA valida la autenticidad del mensaje y despliega una notificación no intrusiva: "Mensaje Asíncrono del Flight Surgeon recibido; consultar sugerencias secundarias".
  3. El Oficial Médico revisa las sugerencias de Houston como apoyo consultivo, manteniendo la autonomía operativa de la nave.

### 6. Flujos de Excepción:
* **FE-01: Pérdida prolongada de señal con la DSN (Conjunción solar):**
  1. Durante la conjunción solar con Marte, el Sol bloquea toda comunicación de radio por hasta 2 semanas.
  2. Los bundles DTN permanecen protegidos en el almacenamiento no volátil local sin descartarse por caducidad (*Time-to-Live* extendido a 30 días).

### 7. Postcondiciones:
* **Éxito:** Los datos médicos se preservan y transmiten sin pérdidas, adaptándose a las leyes físicas de la propagación interplanetaria.

---

## 📋 Caso de Uso: CU-12
### Nombre: Conmutación a Perfil de Contingencia Eléctrica (< 5W)

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-12` |
| **Actor Primario** | Bus de Potencia de la Nave (EPS - Electrical Power System) |
| **Actores Secundarios** | Comandante de Misión |
| **Nivel** | Nivel de Supervivencia de Aviónica / Gestión Térmica y de Energía |
| **Requisitos SRS** | `RNF-POW-01..04`, `RNF-POW-03` |
| **Historias Trazadas** | `HU-20` |

### 1. Descripción Breve:
Cuando la nave espacial sufre un fallo en la generación de energía (ej. rotura de paneles solares o desvío de potencia a maniobras de propulsión de emergencia) y entra en modo de baterías de respaldo, ASTHA reduce drásticamente su demanda eléctrica a menos de 5 Watts para garantizar la continuidad ininterrumpida del monitoreo vital durante días.

### 2. Precondiciones:
1. El subsistema de potencia EPS emite la señal de contingencia "Bus de Batería Primaria Bajo / Nivel 2".
2. ASTHA recibe la señal a través de la interfaz de gestión de energía del sistema operativo embebido.

### 3. Disparador (Trigger):
Recepción de evento de telemetría de bus de energía: $\text{PowerState} == \text{BATTERY\_CRITICAL}$.

### 4. Flujo Principal de Eventos:
1. El núcleo de ASTHA intercepta el evento de emergencia eléctrica.
2. El sistema desactiva de inmediato todas las animaciones gráficas complejas, sombras CSS y transiciones fluidas.
3. La tasa de refresco visual de la pantalla se reduce de 60 Hz a 0.2 Hz (1 actualización cada 5 segundos).
4. El brillo de la pantalla táctil OLED se reduce al $20\%$ (aprovechando que los píxeles negros apagan los diodos orgánicos, reduciendo el consumo del panel en más del $65\%$).
5. Se suspende la sincronización periódica Gossip en la red malla, transmitiendo únicamente ante eventos clínicos de severidad roja.
6. El hilo de ejecución del procesador se configura en frecuencia reducida (CPU Governor en modo `powersave`), manteniendo un consumo sostenido del SoC por debajo de $2.5\text{ W}$.
7. El sistema verifica que los algoritmos de detección de paro cardíaco, taquicardia ventricular y anoxia permanecen $100\%$ activos en memoria.
8. Se muestra en la esquina superior una insignia discreta: "Modo Supervivencia Energética Activo (< 5W)".

### 5. Flujos Alternativos:
* **FA-01: Restauración del bus de potencia solar:**
  1. Al normalizarse el flujo de corriente desde los paneles fotovoltaicos, el sistema restaura gradualmente la tasa de refresco a 60 fps y el brillo táctico normal.

### 6. Flujos de Excepción:
* **FE-01: Temperatura crítica por falta de convección de aire:**
  1. Si los ventiladores de refrigeración se apagan por ahorro eléctrico y la temperatura del procesador supera los $75^\circ\text{C}$, el software desactiva hilos secundarios no vitales (ej. cálculo de regresión lineal predictiva) para prevenir el estrangulamiento térmico (*thermal throttling*).

### 7. Postcondiciones:
* **Éxito:** El sistema de monitoreo de vida continúa salvaguardando a los astronautas sin acelerar el agotamiento de las baterías críticas de la nave.
