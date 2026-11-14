# 🛡️ ÉPICA 4: Resiliencia Edge, Red Malla P2P y Enlace Asíncrono con Tierra
**Módulo:** Arquitectura y Red Aeroespacial | **Estándar:** CCSDS DTN / NASA Deep Space Constraints

---

## 📌 HU-13: Operación Médica Autónoma 100% Offline (Zero-Ping Edge Computing)

* **ID:** `HU-13`
* **Épica:** Épica 4 - Resiliencia Edge y Red Malla
* **Prioridad MoSCoW:** **Must Have** (Condición *Sine Qua Non* de Espacio Profundo)
* **Puntos de Historia (Story Points):** 8 SP
* **Requisitos SRS Trazados:** `RF-OFF-01..04`, `RNF-NET-01`, `RNF-POW-01`
* **Fuentes Oficiales:** Deep Space Mars Mission Physics (44 min RTT) / Edge Architecture

### 📖 Narrativa de Usuario:
> **Como** Toda la Tripulación de Vuelo en trayecto a Marte,  
> **Quiero** que el 100% de los algoritmos de detección, cálculo de Z-score, mapas anatómicos y generación de checklists funcionen de manera local sin conexión a Internet ni a la nube,  
> **Para** que la seguridad de mi vida y el diagnóstico médico no dependan jamás de un enlace de radio con la Tierra que tarda 44 minutos en responder.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Ejecución completa en aislamiento de red
* **Dado que** se desconecta completamente el adaptador de red o se activa el modo de vuelo aislado en el nodo cliente,
* **Cuando** se inyecta o se recibe una nueva señal de telemetría biomédica,
* **Entonces** el sistema debe procesar las reglas de decisión, actualizar la interfaz gráfica y generar las recomendaciones clínicas en menos de $100\text{ ms}$,
* **Y** no debe generar ningún error de red, bloqueo de UI ni excepción de conexión.

#### Escenario 2: Disponibilidad de recursos locales embebidos
* **Dado que** el software se ejecuta en una tableta o nodo de cabina sin acceso a repositorios externos,
* **Cuando** la aplicación se inicia en frío,
* **Entonces** todos los modelos, reglas clínicas, catálogos de contramedidas y bases de datos deben cargarse desde el almacenamiento flash local sin descargar scripts o fuentes en tiempo de ejecución.

---

## 📌 HU-14: Empaquetado Asíncrono DTN para el Cirujano de Vuelo en Houston

* **ID:** `HU-14`
* **Épica:** Épica 4 - Resiliencia Edge y Red Malla
* **Prioridad MoSCoW:** **Must Have** (Comunicación Tierra-Espacio)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RF-GUI-05`, `RNF-NET-03`, `RNF-SEC-01`
* **Fuentes Oficiales:** CCSDS Delay-Tolerant Networking (DTN) Bundle Protocol

### 📖 Narrativa de Usuario:
> **Como** Cirujano de Vuelo en el Centro de Control de Houston (JSC),  
> **Quiero** recibir periódicamente paquetes consolidados y comprimidos con la auditoría médica, tendencias de telemetría y contramedidas aplicadas por la tripulación,  
> **Para** analizar la evolución clínica de los astronautas y enviar recomendaciones secundarias sin interferir con la autonomía médica de la nave.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Generación de paquete DTN ante alerta médica crítica
* **Dado que** se registra un evento clínico severo (ej. episodio agudo de SANS en C003),
* **Cuando** el sistema ejecuta el protocolo médico local,
* **Entonces** debe generar automáticamente un paquete comprimido (`.dtn.bundle`) conteniendo:
  * Resumen de signos vitales (30 minutos previos y posteriores al evento),
  * Regla disparada y justificación clínica,
  * Acciones marcadas por la tripulación en el checklist,
  * Firma digital criptográfica SHA-256.

#### Escenario 2: Encolamiento tolerante a interrupciones de radio
* **Dado que** la antena de alta ganancia de la nave puede perder alineación con la Red de Espacio Profundo (DSN) durante rotaciones o maniobras orbitales,
* **Cuando** el enlace con la Tierra no está disponible,
* **Entonces** el paquete debe permanecer almacenado de forma segura en la cola DTN local persistente sin descartarse,
* **Y** transmitirse de manera automática en la siguiente ventana de visibilidad orbital confirmada.

---

## 📌 HU-15: Sincronización P2P en Red Malla Descentralizada entre Nodos de Cabina

* **ID:** `HU-15`
* **Épica:** Épica 4 - Resiliencia Edge y Red Malla
* **Prioridad MoSCoW:** **Should Have** (Tolerancia a Fallos)
* **Puntos de Historia (Story Points):** 8 SP
* **Requisitos SRS Trazados:** `RNF-NET-02`, `RNF-NET-04`, `RNF-POW-04`
* **Fuentes Oficiales:** P2P Mesh Architectures for Manned Spacecraft / CRDTs

### 📖 Narrativa de Usuario:
> **Como** Oficial de Comunicaciones y Tripulación de Vuelo,  
> **Quiero** que cada astronauta pueda consultar y actualizar su estado de salud desde cualquier tableta o nodo de mamparo de la nave mediante sincronización punto a punto (P2P),  
> **Para** que el fallo catastrófico de una tableta o módulo no destruya el historial médico de la tripulación ni deje al equipo sin soporte clínico.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Sincronización automática sin servidor central
* **Dado que** la nave cuenta con múltiples nodos de monitoreo distribuidos (camarote, módulo médico, gimnasio ARED, esclusa),
* **Cuando** dos nodos entran en alcance de radio local (Wi-Fi de baja potencia o Bluetooth Mesh),
* **Entonces** deben reconciliar sus registros médicos utilizando estructuras de datos libres de conflicto (CRDTs),
* **Y** garantizar que el último checklist completado se refleje en todos los dispositivos en menos de 5 segundos.

#### Escenario 2: Recuperación ante pérdida de un nodo físico
* **Dado que** una tableta médica sufre una descompresión o fallo de hardware total,
* **Cuando** el tripulante enciende una tableta de repuesto,
* **Entonces** la nueva tableta debe descubrir a sus pares en la red malla local y descargar de forma transparente el historial completo de la tripulación sin intervención manual.

---

## 📌 HU-16: Protección de Integridad de Datos Médicos ante Radiación Espacial (SEU)

* **ID:** `HU-16`
* **Épica:** Épica 4 - Resiliencia Edge y Red Malla
* **Prioridad MoSCoW:** **Must Have** (Ciberseguridad y Confiabilidad Espacial)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RNF-SEC-04`, `RNF-SEC-02`
* **Fuentes Oficiales:** NASA Single-Event Upset (SEU) Avionics Architecture

### 📖 Narrativa de Usuario:
> **Como** Ingeniero de Software y Sistemas de la Misión,  
> **Quiero** que todas las lecturas de telemetría, dosis acumuladas y bases de datos clínicas cuenten con códigos de redundancia cíclica y sumas de verificación inmutables (CRC32 / SHA-256),  
> **Para** detectar y corregir automáticamente cualquier alteración de bits en la memoria (Bit-Flips / SEU) provocada por iones pesados de rayos cósmicos galácticos (GCR).

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Detección de bit-flip en registros biomédicos
* **Dado que** una partícula ionizante de alta energía altera un bit en la memoria RAM o flash donde se almacena el historial de presión arterial,
* **Cuando** el sistema lee el registro para calcular el Z-score de la mañana,
* **Entonces** el validador de integridad debe detectar la discordancia contra el checksum almacenado,
* **Y** recuperar el bloque íntegro desde la réplica espejo del nodo vecino en la red malla sin propagar datos corruptos al médico.

#### Escenario 2: Auditoría criptográfica inmutable
* **Dado que** se deben auditar todos los cambios en los expedientes de salud de los astronautas,
* **Cuando** se registra una nueva medición o se completa un checklist de emergencia,
* **Entonces** el registro debe firmarse criptográficamente y enlazarse en un log de eventos inmutable (Append-Only Hash Chain) protegido contra escritura no autorizada.
