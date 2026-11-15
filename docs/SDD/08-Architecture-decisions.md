# 🏛️ SDD-08: Decisiones de Arquitectura (ADR)
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026

---

Registro de decisiones de arquitectura de ASTHA. Cada ADR tiene cuatro secciones: **Contexto**, **Decisión**, **Consecuencias** (viñetas) y **Alternativas** (separadas por punto y coma). Cada sección ocupa 50 palabras como máximo (80 en casos excepcionales). Los IDs de requisitos son los del SRS ([ADR-001](#adr-001)). El modelo C4 está en [../c4/](../c4/00-README.md).

Estados: **Propuesto** (borrador para revisar) · **Aceptado** · **Pendiente** (falta una respuesta del equipo) · **Reemplazado**.

## Índice de decisiones

| ADR | Título | Estado |
| --- | --- | --- |
| [001](#adr-001) | Fuente de autoridad de requisitos | Aceptado |
| [002](#adr-002) | Nodo autónomo offline-first sin WAN | Aceptado |
| [003](#adr-003) | UI compilada: Svelte 5, uPlot y fuentes del sistema | Aceptado |
| [004](#adr-004) | Avatar 3D con Three.js renderizado bajo demanda | Aceptado |
| [005](#adr-005) | Cómputo clínico en Web Workers dirigido por eventos | Aceptado |
| [006](#adr-006) | Persistencia IndexedDB cifrada con Web Crypto | Aceptado |
| [007](#adr-007) | Contexto seguro con CA interna y mDNS | Aceptado |
| [008](#adr-008) | Sincronización en estrella con un Sync Hub opcional | Aceptado |
| [009](#adr-009) | CRDT con reloj híbrido y version vector | Aceptado |
| [010](#adr-010) | Enlace con Tierra: JSON firmado fuera del sistema | Aceptado |
| [011](#adr-011) | Deriva por Z-score modificado (MAD) | Aceptado |
| [012](#adr-012) | Acceso a datos médicos según el Privacy Act de 1974 y HIPAA | Aceptado |
| [013](#adr-013) | Escalada de alarmas críticas no reconocidas | Aceptado |
| [014](#adr-014) | Pantallas de cabina: hábitat y semáforo global | Aceptado |
| [015](#adr-015) | Arranque medido hasta la pantalla de bloqueo | Aceptado |
| [016](#adr-016) | Telemetría fisiológica con un registro diario | Aceptado |
| [017](#adr-017) | Protocolos de contramedida de 4 pasos como máximo | Aceptado |
| [018](#adr-018) | Rojo de texto separado del rojo de alarma | Aceptado |
| [019](#adr-019) | Modo supervivencia energética activado a mano | Aceptado |
| [020](#adr-020) | Aprovisionamiento de dispositivos en Tierra antes del vuelo | Aceptado |

## Backlog de brechas

Vacío. Si aparecen brechas nuevas, se añaden aquí con el siguiente número libre.

---

<a id="adr-001"></a>

## ADR-001: Fuente de autoridad de requisitos

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** SRS §1-§8 · RTM · AC-TECH · CU (carpeta)

### Contexto
El repo tiene IDs que chocan: SRS, RTM, AC-TECH y CU de la carpeta definen RNF-POW, RNF-NET y CU con valores distintos (5 W frente a 350 mW, DTN frente a mDNS). Sin una regla, cada decisión puede apoyarse en un requisito contradictorio.

### Decisión
El SRS prevalece y el documento de dominio fija los umbrales. RTM, AC-TECH, HU y CU se alinean al SRS. Una decisión explícita del equipo puede contradecir al SRS, pero solo si queda registrada en un ADR.

### Consecuencias
- Los ADR y el C4 citan IDs del SRS.
- Hay que corregir RTM, AC-TECH y CU-10..12.
- Las brechas se marcan GAP; no se inventan requisitos.

### Alternativas
Tomar la RTM como autoridad; reescribir el SRS a partir de los AC; mantener ambos catálogos con prefijos distintos.

---

<a id="adr-002"></a>

## ADR-002: Nodo autónomo offline-first sin WAN

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** SRS §1, RF-EVA-07, RNF-NET-01, RNF-NET-02

### Contexto
La nave no tiene Internet y la latencia con Tierra llega a 22 min por sentido. RF-EVA-07 y RNF-NET-01 prohíben paquetes externos. El triage no puede depender de otro dispositivo ni de la red.

### Decisión
Cada dispositivo ejecuta la PWA completa: datos, reglas, catálogos y recursos van en el bundle y los sirve el Service Worker. La LAN solo sincroniza; nunca hace falta para clasificar ni para alertar.

### Consecuencias
- Cero CDN y cero recursos remotos.
- El triage funciona con la LAN caída.
- Hay que quitar los CDN y la consulta remota a OSDR del prototipo.
- La primera instalación necesita el Hub o aprovisionamiento.

### Alternativas
Servidor central en la nave con clientes ligeros; app nativa por plataforma; Electron.

---

<a id="adr-003"></a>

## ADR-003: UI compilada: Svelte 5, uPlot y fuentes del sistema

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-POW-01..04, RNF-PER-02, RF-DSH-01..04

### Contexto
RNF-POW-01..04 fija CPU ≤ 3 %, < 350 mW, RAM ≤ 150 MB y bundle ≤ 5 MB; RNF-PER-02 exige arranque < 1,5 s. El prototipo carga Tailwind, Chart.js y Lucide desde CDN.

### Decisión
Svelte 5 (compilado, sin VDOM) para la UI, uPlot en canvas 2D para las series, fuentes del sistema y CSS propio con los tokens del WIREFRAME.

### Consecuencias
- Runtime de pocas decenas de KB.
- Solo se actualizan los nodos que cambian.
- Hay que reescribir index.html.
- Las bandas de umbral de uPlot se dibujan con hooks propios.

### Alternativas
React + Recharts; JavaScript sin framework + Chart.js; Preact + Chart.js.

---

<a id="adr-004"></a>

## ADR-004: Avatar 3D con Three.js renderizado bajo demanda

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RF-ANA-01..04, RNF-POW-01, RNF-POW-04 · SPEC §2 y §4.2

### Contexto
El equipo exige el avatar 3D (SPEC); el SRS solo pide un cuerpo interactivo frontal y posterior. El prototipo dibuja en bucle continuo con auto-rotación, lo que es incompatible con CPU ≤ 3 % y cero polling.

### Decisión
Three.js empaquetado en local, solo en el Anatomy Viewer, un contexto WebGL y un frame por cambio. Pulsos de alerta en capa HTML y respaldo SVG.

### Consecuencias
- 0 frames/s en monitoreo pasivo.
- +150-180 KB gzip al bundle.
- RAM por medir.
- Sin auto-rotación.
- El resumen de tripulación usa SVG.

### Alternativas
Avatar solo SVG; 3D en consola y SVG en tabletas; sprites o vídeo prerenderizado.

---

<a id="adr-005"></a>

## ADR-005: Cómputo clínico en Web Workers dirigido por eventos

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-PER-01, RNF-POW-01, RF-EVA-07

### Contexto
RNF-PER-01 pide triage < 50 ms y RNF-POW-01 prohíbe el polling; el propio SRS sugiere Web Workers. El prototipo calcula en el hilo principal con timers.

### Decisión
Dos Dedicated Workers: Clinical Engine (TypeScript puro, reglas como datos) y Data y Sync. Se comunican por postMessage; nada se ejecuta sin un evento.

### Consecuencias
- El hilo principal solo pinta.
- Engine determinista y testeable.
- Coste de serializar mensajes ~1 ms.
- fetch y WebSocket prohibidos en el engine (lint).

### Alternativas
Todo en el hilo principal; un solo worker; SharedWorker común a todas las pestañas.

---

<a id="adr-006"></a>

## ADR-006: Persistencia IndexedDB cifrada con Web Crypto

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-SEC-01, RNF-SEC-03, RNF-SEC-04, SRS §5.2 · AC-TECH-06

### Contexto
RNF-SEC-01 exige AES-GCM 256 con crypto.subtle, RNF-SEC-03 SHA-256 por registro y RNF-SEC-04 una bitácora append-only. AC-TECH-06 menciona SQLite/SQLCipher, que en el navegador exige WASM.

### Decisión
IndexedDB con sobres {id, hlc, autor, iv, ct, sha256, firma}; AES-GCM 256, SHA-256 y Ed25519 nativos; clave derivada del PIN con PBKDF2; bitácora encadenada por dispositivo.

### Consecuencias
- Sin WASM ni librerías criptográficas.
- Exige contexto seguro (HTTPS).
- Ed25519 exige navegadores recientes.
- PBKDF2 puede afectar al arranque (pendiente).

### Alternativas
SQLCipher en WASM; localStorage cifrado; cifrado solo en el Hub.

---

<a id="adr-007"></a>

## ADR-007: Contexto seguro con CA interna y mDNS

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-NET-03, RNF-SEC-01, RNF-PER-02

### Contexto
crypto.subtle y los Service Workers exigen HTTPS. RNF-NET-03 pide descubrimiento en menos de 3 s sin configurar IP a mano. En la nave no hay ninguna CA pública alcanzable.

### Decisión
El Hub sirve https://astha.local con un certificado de una CA interna de la nave, cuya raíz se instala en cada dispositivo, y anuncia astha.local por mDNS.

### Consecuencias
- Mismo origen en todos los dispositivos.
- Falta definir aprovisionamiento y rotación (GAP).
- Depende de que el SO resuelva .local.
- Sin Hub, la PWA ya instalada sigue operativa.

### Alternativas
Certificado autofirmado por dispositivo; http://localhost en cada dispositivo; IP fija con certificado.

---

<a id="adr-008"></a>

## ADR-008: Sincronización en estrella con un Sync Hub opcional

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-NET-01..03 · CU-10, HU-15, AC-TECH-04

### Contexto
CU-10, HU-15 y AC-TECH-04 piden una malla P2P sin punto único de fallo (Gossip UDP, BLE mesh), pero un navegador no tiene acceso a UDP ni a BLE mesh. RNF-NET-01 sí admite WebSockets locales.

### Decisión
Un único Sync Hub en Rust, opcional, en estrella: los dispositivos le envían deltas CRDT por WSS (astha.local). Si el Hub cae, cada dispositivo sigue autónomo y converge al volver.

### Consecuencias
- El Hub es punto único de fallo solo para la convergencia, no para el triage.
- Hay que corregir CU-10, HU-15 y AC-TECH-04.
- Un solo host adicional: poco hardware y poco consumo.

### Alternativas
Dos Hubs replicados; malla WebRTC con servidor de señalización; app nativa con BLE mesh.

---

<a id="adr-009"></a>

## ADR-009: CRDT con reloj híbrido y version vector

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-NET-02 · CU-10 FA-01, AC-TECH-04

### Contexto
RNF-NET-02 pide fusionar sin pérdida usando "LWW con marcas vectoriales"; CU-10 cita relojes de Lamport y el encargo, un reloj híbrido. LWW necesita orden total; los vectores solo dan un orden parcial.

### Decisión
CRDT propio: G-Set para todo dato clínico, LWW-Map para preferencias y PN-Counter para XP. El HLC (hora, contador, nodo) ordena los LWW; el version vector por nodo decide qué deltas intercambiar.

### Consecuencias
- Ningún dato clínico se sobrescribe: solo se añade.
- Merge idempotente y sin coordinación.
- El HLC tolera relojes desfasados.
- Hay que precisar RNF-NET-02 y CU-10.

### Alternativas
Solo vector clocks; solo Lamport; Automerge o Yjs (más peso en el bundle).

---

<a id="adr-010"></a>

## ADR-010: Enlace con Tierra: JSON firmado fuera del sistema

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-NET-04, RF-GUI-05, RF-REG-02 · CU-11, HU-14, AC-TECH-05

### Contexto
RNF-NET-04 pide exportar un JSON firmado para la DSN. CU-11, HU-14 y AC-TECH-05 asignan a ASTHA el bundle DTN RFC 5050, una cola de 30 días y la recepción de respuestas.

### Decisión
ASTHA termina en el archivo: el CMO exporta un JSON firmado con Ed25519 y lo entrega al sistema de comunicaciones de la nave, que lo empaqueta y transmite por DTN/DSN.

### Consecuencias
- ASTHA no tiene ninguna ruta de red externa (RNF-NET-01 se verifica fácilmente).
- Sin cola DTN ni recepción de respuestas.
- Hay que corregir CU-11, HU-14 y AC-TECH-05.

### Alternativas
ASTHA genera los bundles DTN y la cola persistente; integración directa con el transpondedor; envío por el Sync Hub.

---

<a id="adr-011"></a>

## ADR-011: Deriva por Z-score modificado (MAD)

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RF-DER-01..04, D-01..D-03, RNF-PER-01 · AC-CLIN-02

### Contexto
RF-DER-03 usa un z clásico (media y desviación de los días 1-14), mientras que RNF-PER-01, el README y AC-CLIN-02 citan el Z modificado de Hoaglin e Iglewicz. Con pocos días, la media es sensible a valores atípicos.

### Decisión
Se usa M = 0,6745·(x − mediana)/MAD sobre la línea base de los días 1-14, con alerta precoz si |M| ≥ 2,5. Se mantienen la regresión de 7 días (D-01) y el patrón combinado (D-03).

### Consecuencias
- Línea base robusta a valores atípicos.
- Hay que actualizar RF-DER-03 y D-02 en el SRS.
- Si MAD = 0 (serie constante) no se emite alerta D-02.
- Coste mínimo: la mediana se calcula una vez.

### Alternativas
Z clásico del SRS; ambos z en paralelo; solo regresión sin z.

---

<a id="adr-012"></a>

## ADR-012: Acceso a datos médicos según el Privacy Act de 1974 y HIPAA

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-SEC-01, RNF-SEC-02, RNF-NET-04, RF-REG-02

### Contexto
RNF-SEC-02 pide RBAC local sin definir el mecanismo. El Privacy Act de 1974 y HIPAA restringen el acceso al personal médico autorizado y al propio astronauta, exigen anonimizar cualquier uso externo y prevén repositorios seguros como el LSAH.

### Decisión
Cada tripulante tiene su propia clave de datos, envuelta con su PIN y con el del CMO. Solo el dueño y el personal médico descifran. Las exportaciones para usos no médicos se anonimizan.

### Consecuencias
- El aislamiento es criptográfico, no solo de interfaz.
- El aprovisionamiento es más complejo (ADR-020).
- El Hub y las pantallas de cabina no pueden leer datos clínicos.
- Falta definir el formato de anonimización.

### Alternativas
Clave común con permisos solo en la interfaz; cifrado solo en reposo, sin separación por tripulante; delegar el control al sistema operativo.

---

<a id="adr-013"></a>

## ADR-013: Escalada de alarmas críticas no reconocidas

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-USA-04, RF-GAM-03, RF-EVA-06

### Contexto
RNF-USA-04 define tono de 800-1200 Hz para críticos y precaución sin sonido, pero no qué hacer si nadie reconoce la alerta. Un tono continuo provoca fatiga; uno único puede pasar desapercibido.

### Decisión
Un crítico suena 10 s. Si a los 2 min nadie lo ha reconocido, vuelve a sonar y se replica en la consola del CMO. A los 5 min se avisa también en las pantallas de cabina.

### Consecuencias
- Hay que añadir el requisito al SRS.
- La réplica al CMO y a cabina depende del Hub (ADR-008).
- Sin Hub, la escalada es solo local.
- El reconocimiento queda en la bitácora.

### Alternativas
Sonar hasta reconocer; sonar una sola vez; escalar al Comandante.

---

<a id="adr-014"></a>

## ADR-014: Pantallas de cabina: hábitat y semáforo global

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RF-DSH-03, RF-DSH-04, RNF-SEC-02 · ADR-012

### Contexto
ADR-012 limita los datos clínicos al dueño y al personal médico. Las pantallas de cabina las ve toda la tripulación y no tienen claves de tripulante. Hay que decidir qué muestran sin vulnerar el Privacy Act.

### Decisión
Muestran la telemetría ECLSS/CANS y un semáforo Nominal/Precaución/Crítico por tripulante, sin valores, regla ni sistema de órganos. El estado global viaja en un registro aparte, cifrado con la clave de hábitat.

### Consecuencias
- Conciencia situacional de toda la tripulación.
- Se divulga un dato mínimo identificable, aceptado a propósito.
- El Engine debe publicar un registro solo de estado.
- Las pantallas nunca reconocen alertas.

### Alternativas
Solo hábitat; hábitat y estado anónimo; pantallas con los datos completos.

---

<a id="adr-015"></a>

## ADR-015: Arranque medido hasta la pantalla de bloqueo

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-PER-02, RNF-SEC-01, RNF-SEC-02 · ADR-012, ADR-014

### Contexto
RNF-PER-02 exige el panel en menos de 1,5 s, pero ADR-012 obliga a desbloquear con PIN y PBKDF2 puede tardar cientos de ms. Bajar las iteraciones debilita el cifrado.

### Decisión
Los 1,5 s se miden hasta la pantalla de bloqueo, que ya muestra el hábitat y el semáforo global (ADR-014). El panel personal se abre tras el PIN, fuera de ese presupuesto.

### Consecuencias
- PBKDF2 conserva iteraciones altas.
- La conciencia situacional está disponible antes del PIN.
- Hay que precisar RNF-PER-02 en el SRS.
- Falta un presupuesto para el desbloqueo (propuesta: < 1 s).

### Alternativas
Sesión persistente hasta reiniciar; PIN dentro de los 1,5 s con menos iteraciones; sin PIN, con la clave del dispositivo.

---

<a id="adr-016"></a>

## ADR-016: Telemetría fisiológica con un registro diario

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RF-ING-01, RF-ING-03, RNF-POW-03, SRS §5.1 · RTM, CU-01

### Contexto
SRS §5.1 define una medición diaria por tripulante (180 días). La RTM y CU-01 hablan de ingesta continua a 1 Hz por BLE, lo que multiplica CPU, RAM y almacenamiento, y en el navegador exigiría Web Bluetooth.

### Decisión
Un registro fisiológico diario por tripulante, de entrada manual o del dataset sintético. Los escenarios del simulador inyectan registros puntuales, no flujos continuos.

### Consecuencias
- Unas 720 mediciones en 180 días: muy por debajo de 150 MB.
- Sin Web Bluetooth ni puente de sensores.
- Hay que corregir RF-ING-01 de la RTM y CU-01.
- La telemetría de hábitat queda fuera de esta decisión.

### Alternativas
1 Hz continuo; diario con flujo de 1 Hz solo en la demo; ingesta por eventos del sensor.

---

<a id="adr-017"></a>

## ADR-017: Protocolos de contramedida de 4 pasos como máximo

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-USA-05, RF-GUI-01..04 · AC-CLIN-06

### Contexto
RNF-USA-05 permite hasta 7 pasos por procedimiento; AC-CLIN-06 limita a 4. Los tripulantes actúan bajo estrés, fatiga y con guantes, y cada paso extra aumenta la carga cognitiva.

### Decisión
Cada protocolo tiene como máximo 4 pasos accionables, con los tres bloques de RF-GUI-01. Si una contramedida necesita más, se divide en protocolos encadenados.

### Consecuencias
- Prevalece AC-CLIN-06 sobre el SRS (excepción registrada, ADR-001).
- Hay que actualizar RNF-USA-05.
- El Countermeasure Resolver valida ≤ 4 pasos.
- SPE y LBNP pueden necesitar encadenarse.

### Alternativas
7 pasos (SRS); 4 en emergencia y 7 en rutina; sin límite fijo.

---

<a id="adr-018"></a>

## ADR-018: Rojo de texto separado del rojo de alarma

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-USA-03, RF-ANA-03 · WIREFRAME §4.1

### Contexto
RNF-USA-03 exige un contraste ≥ 7:1 (WCAG AAA). El token alert-red (#ef4444) del WIREFRAME da 5,35:1 sobre el fondo y 4,96:1 sobre las tarjetas, así que no sirve para texto.

### Decisión
#ef4444 se reserva para rellenos, bordes y el pulso. Un nuevo token, alert-red-text (#fca5a5, 10,6:1), se usa para todo texto en estado crítico.

### Consecuencias
- El rojo de alarma no cambia.
- Todo el texto crítico cumple AAA.
- Hay que añadir el token al WIREFRAME §4.1.
- En el modo espectral rojo siguen siendo obligatorios el símbolo y el patrón.

### Alternativas
Aclarar alert-red a #f87171; mantener #ef4444 con excepción AA; texto blanco sobre fondo rojo.

---

<a id="adr-019"></a>

## ADR-019: Modo supervivencia energética activado a mano

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-POW-01, RNF-POW-02 · CU-12, AC-TECH-02 §3

### Contexto
CU-12 y AC-TECH-02 piden reducir el consumo al recibir una señal de batería crítica del EPS. No está en el SRS y el navegador no puede recibir esa señal de la nave.

### Decisión
El Comandante activa un "modo supervivencia": sin avatar 3D ni gráficas, brillo reducido por CSS y sync solo por eventos críticos. El triage y las alarmas siguen intactos. Más adelante, el Hub podrá reenviar la señal del EPS.

### Consecuencias
- Sin dependencia del hardware de la nave.
- Hay que añadir el requisito al SRS y ajustar CU-12.
- La activación depende de una persona.
- El reenvío por el Hub queda como trabajo futuro.

### Alternativas
Fuera de alcance; Battery Status API del dispositivo; señal del EPS vía Hub desde el inicio.

---

<a id="adr-020"></a>

## ADR-020: Aprovisionamiento de dispositivos en Tierra antes del vuelo

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-SEC-01, RNF-SEC-02, RNF-NET-03 · ADR-007, ADR-012

### Contexto
ADR-007 y ADR-012 exigen una CA interna, claves Ed25519 por dispositivo y claves por tripulante envueltas con PIN. Ninguna fuente define quién lo instala ni cuándo, y a bordo no hay soporte técnico.

### Decisión
Ingeniería prepara cada dispositivo en Tierra: raíz de la CA, PWA instalada, clave del dispositivo inscrita en el Hub y claves por tripulante envueltas con los PIN. En vuelo, el CMO solo reemplaza tabletas con un procedimiento definido.

### Consecuencias
- La tripulación no gestiona criptografía.
- Hace falta un procedimiento de reemplazo a bordo.
- El cambio de PIN en vuelo debe re-envolver claves.
- Hay que añadir el requisito al SRS.

### Alternativas
A bordo por el CMO; mixto (CA en Tierra, inscripción a bordo); sin claves por tripulante.
