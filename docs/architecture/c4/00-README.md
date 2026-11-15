# Arquitectura C4 — ASTHA (Autonomous Space Telemetry & Health Analytics)

Modelo C4 de la arquitectura **objetivo** de ASTHA: un dashboard de monitoreo de salud que corre en una nave en órbita, sin Internet, con una única LAN cerrada. Los diagramas usan Mermaid (`C4Context`, `C4Container`, `C4Component`, `C4Deployment`), que GitHub renderiza.

| Nivel | Archivo | Contenido |
| --- | --- | --- |
| 1 | [01-contexto.md](01-contexto.md) | Personas, sistemas externos y frontera de la LAN |
| 2 | [02-contenedores.md](02-contenedores.md) | PWA, workers, IndexedDB, Service Worker, Sync Hub; presupuestos de consumo |
| 3 | [03-componentes.md](03-componentes.md) | Clinical Engine, Crew PWA (+ fichas de design system de 4 componentes UI), capa de datos/sync |
| 4 | [04-despliegue.md](04-despliegue.md) | Tabletas, consola CMO, pantallas de cabina, Sync Hub opcional, LAN aislada |

## 1. Fuentes y regla de autoridad

- **Autoridad principal:** [SRS](../../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md). Es el documento fechado, sigue ISO/IEC/IEEE 29148 y define los IDs `RF-*`, `RNF-*`, `R-*`, `D-*`, `AC-01..05` y `CU-01..09`.
- **Umbrales:** [Documento de dominio](../../DOCUMENTO_DOMINIO_Y_PROBLEMATICA_ESPACIAL.md). El propio SRS §6 lo declara autoridad.
- **Trazabilidad:** se referencia la [RTM existente](../../MATRIZ_DE_TRAZABILIDAD_RTM.md) y la [Matriz V&V](../Criterios-de-aceptacion/MATRIZ_VERIFICACION_Y_VALIDACION_NASA.md). **No se crea una matriz nueva.** Las tablas C4 indican qué requisitos cubre cada elemento, y la sección 2 lista lo que la RTM no cubre.
- **Catálogos con IDs que chocan:** `CU-01..09` del SRS §7 y `CU-01..12` de [Casos-de-uso/](../Casos-de-uso/README.md) tienen significados distintos. Igual pasa con `AC-01..05` (SRS) y `AC-CLIN-*` / `AC-TECH-*` (carpeta). En estos documentos se escribe "CU-xx (SRS §7)" o "CU-xx (carpeta)".
- Marcas: **GAP** = sin cobertura en el repo · **⚠** = contradicción.

## 2. GAPs de trazabilidad

### 2.1 Requisitos del SRS sin fila en la RTM

| ID (SRS) | Tema | Dónde lo cubre la arquitectura |
| --- | --- | --- |
| RF-ING-06 | Importar/exportar JSON | Export Builder (03 §3.3) |
| RF-ING-07 | Cámara: reflejo pupilar / piel (C) | **Sin cubrir**: requiere `getUserMedia` y no hay presupuesto definido |
| RF-GAM-01..03 | Gamificación | Gamification Scorer y Alarm Manager (03) |
| RF-SIM-01..05 | Simulador de crisis | Telemetry Sources y Simulator (03) · la RTM solo lo menciona en el diagrama de flujo |
| RF-REG-01..03 | Bitácora, resumen, alto contraste | Audit Ledger, Export Builder y Settings (03) |
| RNF-POW-04 | Bundle ≤ 5 MB | Service Worker (02) |
| RNF-PER-01 | Triage < 50 ms | Clinical Engine, `latencyMs` (03) |
| RNF-PER-02 | Arranque < 1,5 s | SW y Svelte (02) · pregunta abierta sobre el PIN |
| RNF-USA-04 | Alarmas redundantes 800-1200 Hz | Alarm Manager (03) |
| RNF-USA-05 | 3 bloques, ≤ 7 pasos | Countermeasure Guide (03) |
| RNF-SEC-02 | RBAC local | Key Manager (RBAC criptográfico) y Role Guard (03) |
| RNF-SEC-03 | SHA-256 por registro / SEU | Integrity Guard (03) · la RTM lo pone bajo RNF-SEC-04 |
| RNF-NET-04 | JSON firmado para DSN | Export Builder (03) |

### 2.2 IDs de la RTM con un significado distinto al del SRS

| ID | En el SRS | En RTM / AC / HU |
| --- | --- | --- |
| RF-ING-01 | Registro manual de 9 variables | Ingesta continua a 1 Hz desde la SmartShirt |
| RF-ING-03 | Simulación y dataset de 180 días | Registro de síntomas (que en el SRS es RF-ING-04) |
| RF-ING-04 | Síntomas con un toque | Datasets NASA OSDR |
| RF-ING-05 | Marcar dudosos **sin descartar** | "Validación y **descarte**" |
| RF-DER-03 | Línea base = primeros 14 días | Línea base pre-vuelo L-44 |
| RNF-POW-01 | CPU ≤ 3 % | Consumo < 5 W |
| RNF-POW-02 | < 350 mW, 16 h de batería | CPU < 15 % de un núcleo |
| RNF-POW-03 | RAM ≤ 150 MB | Modo de contingencia a 0,2 fps |
| RNF-USA-01 | Táctil con guantes 48 px / 12 px | Lenguaje sin jerga |
| RNF-USA-02 | Regla de los 3 toques | Respuesta táctil < 100 ms |
| RNF-SEC-04 | Bitácora append-only | Bit-flips SEU con CRC32 |
| RNF-NET-01 | Sync por LAN sin WAN | Operación 100 % offline |
| RNF-NET-03 | Descubrimiento mDNS < 3 s | Bundle Protocol DTN (RFC 5050) |

### 2.3 IDs que se citan pero no existen en el SRS

- **RF-OFF-01..04**: citados en la RTM (diagrama), AC-TECH-03, HU-13, HU-17 y la Matriz V&V (RF-OFF-01).
- **RNF-09**: citado en SRS §6 ("editables como datos").
- La Matriz V&V usa RF-DER-02 para "Z-score modificado"; en el SRS, RF-DER-02 es la alerta por proyección.

### 2.4 Elementos de la arquitectura sin requisito que los respalde

PKI y CA interna · aprovisionamiento de dispositivos, claves y PIN · presupuesto de energía y RAM del Sync Hub · retención del op-log · transporte de los sensores reales y del ECLSS · primera instalación sin Hub · política de escalada de alarmas · asignación de los sistemas cognitivo, radiación y respiratorio a regiones anatómicas · qué datos personales pueden mostrar las pantallas de cabina.

## 3. Diferencias entre el encargo y el repo

Regla aplicada: **si el repo contradice el encargo, gana el repo** y aquí queda el aviso. Si el repo se contradice a sí mismo, gana el SRS.

| # | Encargo | Repo | Resolución en estos documentos |
| --- | --- | --- | --- |
| 1 | Nombre "ASTHA" | ✅ Resuelto en `286bb1f`: el repo usa ahora "ASTHA (Autonomous Space Telemetry & Health Analytics)". Quedan "AstroVital" solo en las URLs de GitHub Pages del README (nombre del repositorio) | Se usa "ASTHA" |
| 2 | Svelte 5, SVG, uPlot; sin Three.js, React ni CDN | `index.html` carga Three.js r128, Chart.js, Tailwind y `lucide@latest` **desde CDN**. La SPEC §6 propone React + Three.js + Recharts. Los commits `8fbccd1` y `953c50d` (silueta del traje xEMU) refuerzan el astronauta 3D | **El avatar 3D se mantiene** (decisión del equipo, 2026-11-15; SPEC §2 y §4.2). Se admite Three.js **solo en el Anatomy Viewer**: empaquetado en local, render bajo demanda sin bucle continuo y respaldo SVG (02 "WebGL / Three.js" y 03 ficha Anatomy Viewer). El resto sigue el stack del encargo. **El prototipo actual tiene que cambiar**: quitar los CDN, los bucles `requestAnimationFrame` continuos (`animate3d`, `animateSparklines`) y la auto-rotación |
| 3 | Presupuestos: CPU ≤ 3 %, < 350 mW, 150 MB, 5 MB, 50 ms, 1,5 s | **Coinciden con el SRS.** AC-TECH, la RTM y la Matriz V&V usan otros: < 5 W, CPU < 15 %, arranque de 3,0 s, 60 fps y 0,2 fps en contingencia | Se usa el SRS. Habría que actualizar AC-TECH y la RTM |
| 4 | Sync Hub opcional en estrella por WebSocket | El SRS RNF-NET-01 permite "WebSockets locales". **CU-10, HU-15 y AC-TECH-04 exigen una malla P2P sin servidor central** (Gossip UDP, 802.11s, BLE mesh) | Se mantiene el Hub, porque el navegador no tiene acceso a UDP ni a BLE mesh, y WebRTC necesita señalización (que también sería un servidor). El Hub es un punto único de fallo **solo para la convergencia**, no para la función clínica. Si se exige "sin SPOF", un segundo Hub replicando el op-log es trivial con CRDT. **Requiere decisión** |
| 5 | CRDT con reloj híbrido (HLC) | RNF-NET-02: "LWW con marcas de tiempo **vectoriales**". CU-10 (carpeta): relojes de Lamport | El HLC ordena los LWW y el version vector guía los deltas (03 §3.3). Confirmar |
| 6 | DSN = archivo JSON firmado, fuera del sistema | El SRS RNF-NET-04 coincide. **CU-11, HU-14 y AC-TECH-05** asignan a ASTHA el bundle DTN RFC 5050, Brotli/Zstd, la cola de 30 días y la recepción de respuestas | Se sigue el SRS: el empaquetado DTN lo hace el router de la nave. Habría que actualizar CU-11 y AC-TECH-05 |
| 7 | IndexedDB + Web Crypto | El SRS §5.2 dice IndexedDB. **AC-TECH-06 y la Matriz V&V** hablan de SQLite/SQLCipher y CRC32 | IndexedDB, AES-GCM y SHA-256 (SRS) |
| 8 | Multi-dispositivo | SRS §1: "PWA de un solo nodo". SRS §4.4: multi-dispositivo | Cada dispositivo es un nodo autónomo completo y la sync es aditiva, lo que hace compatibles las dos lecturas |
| 9 | Fuentes del sistema | El WIREFRAME §4.2 nombra Inter y JetBrains Mono | Pilas del sistema; esas fuentes solo se usan si ya están instaladas |
| 10 | — | Tokens del WIREFRAME: `alert-red #ef4444` da **5,35:1** sobre `#030712` y **4,96:1** sobre `#0c1222`. RNF-USA-03 exige ≥ 7:1 | Se propone `alert-red-text #fca5a5` (10,6:1) para texto y se mantiene `#ef4444` para rellenos (03 §3.2) |
| 11 | — | WIREFRAME: separación táctil de 8 px y checkbox de 44 px. SRS RNF-USA-01: 12 px y 48 px | SRS |
| 12 | — | AC-CLIN-06: ≤ 4 pasos. RNF-USA-05: ≤ 7 pasos | SRS (7). Confirmar |
| 13 | — | SRS RF-DER-03: z clásico (media y desviación). SRS RNF-PER-01, README y AC-CLIN-02: Z-score modificado (MAD) | Se implementa RF-DER-03 y queda como pregunta abierta |
| 14 | — | SRS §5.1: "6 síntomas". RF-ING-04 enumera 5 | Se usan los 5 enumerados. Confirmar el sexto |
| 15 | Bundle ≤ 5 MB | `data/nasa_official_telemetry/` pesa unos 24 MB | No puede entrar en el bundle: solo el dataset sintético (~273 KB) |
| 16 | Cero red | El explorador OSDR (HU-17) consulta la API remota de NASA OSDR. `data/scopes.md` cita URLs de las API EDA y RadLab | Solo se admiten instantáneas JSON locales, empaquetadas en el bundle |
| 17 | — | CU-12 (carpeta): modo de contingencia eléctrica con una señal del EPS | Sin respaldo en el SRS y sin una API de navegador que reciba esa señal → GAP |
| 18 | — | `286bb1f` quitó el "Formato M (Recto)" de `index.html`, pero WIREFRAME §6.3 lo sigue documentando | El C4 no lo usa (solo cita el Modo Zen). Habría que quitarlo también del WIREFRAME |
