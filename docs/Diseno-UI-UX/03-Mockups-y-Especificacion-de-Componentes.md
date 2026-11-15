# 03 — Mockups y Especificación de Componentes

[<- Guía de Estilo](./02-Guia-de-Estilo-y-Design-System.md) · [Índice](./README.md) · [Prototipo Hi-Fi `index.html`](../../index.html)

---

## 1. Mockup Hi-Fi Operativo vs. Prototipo `wireframe.html`

El diseño de alta fidelidad de **ASTHA** materializa la retícula de [`wireframe.html`](../../wireframe.html) en la interfaz productiva Svelte 5 (visible en el prototipo de referencia [`index.html`](../../index.html)), respetando exactamente la geometría de bloques y eliminando toda latencia o sobrecarga cognitiva:

```text
+---------------------------------------------------------------------------------------------------+
|  [ASTHA]  FD-15 · MISIÓN ARTEMIS-MARS · pO2 21.2 kPa  ppCO2 0.35 kPa  [MODO ZEN] [SUPERVIVENCIA]  |
+---------------------------------------------------------------------------------------------------+
|  [● C01 Isaacman OK] [▲ C02 Arceneaux +SANS] [● C03 Proctor OK] [● C04 Sembroski OK] | Timeline  |
+----------------------------------+----------------------------------------------------------------+
|  VISOR ANATÓMICO (COMP-02)       |  VITALES BIOMÉDICOS (COMP-03)                                  |
|  Three.js On-Demand + 4 Hotspots |  +---------------------------+  +---------------------------+  |
|                                  |  | FC: 68 BPM    [✓ Nominal] |  | Rad: 0.42 mSv [✓ Nominal] |  |
|      [H1: Ojos/SANS 48x48]       |  | Baseline: 66 (+2 BPM)     |  | Límite NASA: 50 mSv/yr    |  |
|      [H2: Tórax/FC  48x48]       |  +---------------------------+  +---------------------------+  |
|      [H3: Riñón/Ca  48x48]       |  | PIC/SANS: 19.4 mmHg [▲]   |  | DEXA: 98.2 %  [✓ Nominal] |  |
|      [H4: Fémur/ARED 48x48]      |  | Deriva: +3.1 mmHg vs Pre  |  | Pérdida: -1.8 % (FD-15)   |  |
|                                  |  +---------------------------+  +---------------------------+  |
|  [Fallback SVG si WebGL falla]   +--------------------------------+-------------------------------+
|                                  |  uPlot Tendencia (COMP-04)     | Contr. CDSS (COMP-05 <=4 pas) |
|                                  |  22 |             *---*        | [✓] 1. Gafas LBNP             |
|                                  |  19 |   *---*----/             | [ ] 2. Sesión ARED 25m        |
|                                  |  16 +--------------------      | [ ] 3. Registro EVA           |
|                                  |     L-44   FD-01   FD-15       | [>] Bloque Cirujano CMO       |
+----------------------------------+--------------------------------+-------------------------------+
```

---

## 2. Catálogo Normativo de Componentes UI (Svelte 5)

En alineación con la arquitectura de componentes [`03-componentes.md`](../c4/03-componentes.md#4-especificación-detallada-de-componentes-ui-críticos) y el SDD (`v3.0.0`), los 4 componentes críticos del sistema implementan las siguientes variantes, estados y reglas de accesibilidad:

### 2.1 `AnatomyViewer.svelte` (`COMP-02`)

Visor híbrido de 3 capas desacopladas para preservar rendimiento y confiabilidad ante fallos de WebGL:

| Aspecto | Especificación Exacta |
| :--- | :--- |
| **Arquitectura de Capas** | 1) Canvas **Three.js** con renderizado *on-demand* (`maxPixelRatio: 1.5`, `0 FPS` en reposo; 1 *frame* por rotación o selección, [`ADR-004`](../SDD/08-Architecture-decisions.md#adr-004)).<br>2) Capa HTML superpuesta con *hotspots* de mínimo `$48 \times 48\text{ px}$` y separación `$12\text{ px}$`.<br>3) Silueta **SVG interactiva** de respaldo (`wireframe.html` `COMP-02`). |
| **Variantes** | `full` (escritorio/mamparo 1280+ px) · `compact` (tablet con barra superior colapsable de *hotspots*) · `crisis` (enfoque directo al órgano comprometido) · `fallback` (SVG puro si falla WebGL o se activa Modo Supervivencia). |
| **Estados** | `idle` · `rotating` · `hotspot-selected` · `alert-pulsing` (`<= 1.5 Hz`) · `webgl-fallback`. |
| **Accesibilidad** | Navegación completa por teclado (`Tab` entre *hotspots*, `Enter`/`Space` selecciona órgano); `aria-label` con sistema anatómico y severidad actual. |

---

### 2.2 `IndicatorCards.svelte` + `UPlotChart.svelte` (`COMP-03`, `COMP-03B`, `COMP-04`)

Tarjetas de telemetría de alto contraste y series temporales de densidad orbital:

| Aspecto | Especificación Exacta |
| :--- | :--- |
| **Variantes de Tarjeta** | `vital` (4 biomarcadores de tripulante en `COMP-03`) · `habitat` (6 parámetros ECLSS en `COMP-03B`) · `compound` (biomarcador + *sparkline* integrado) · `zen` (solo cifra y estado en Modo Zen). |
| **Regla de Deriva vs. Baseline** | Cuando un valor muestra tendencia progresiva respecto a su *baseline* pre-vuelo (ej. `+3.1 mmHg`) pero permanece dentro del umbral seguro, se renderiza únicamente un **chip de deriva informativo** **sin** teñir toda la tarjeta de amarillo ni disparar falsa alarma. |
| **Motor de Gráficas (`COMP-04`)** | **`uPlot`** ([`ADR-003`](../SDD/08-Architecture-decisions.md#adr-003)) renderizado en *canvas* único para soportar miles de muestras offline sin nodos DOM extra, trazando curva real + banda límite **NASA-STD-3001** + línea punteada de *baseline* terrestre. |
| **Tipografía Numérica** | `font-variant-numeric: tabular-nums` en todas las lecturas vivas. |

---

### 2.3 `CountermeasureGuide.svelte` (`COMP-05`)

Panel de protocolos médicos accionables bajo estrés de misión:

| Aspecto | Especificación Exacta |
| :--- | :--- |
| **Bloques Fijos** | 1) Encabezado de Protocolo y Severidad · 2) Lista de verificación interactiva · 3) Bloque técnico colapsable para **Cirujano de Vuelo / CMO**. |
| **Límite Cognitivo (`ADR-017`)** | **Máximo $\le 4$ pasos** accionables visibles simultáneamente (`3 pasos` en protocolo SANS de `wireframe.html`, ampliable hasta `4` en SPE). Prohibido paginar instrucciones críticas. |
| **Variantes** | `inline` (`COMP-05` dentro del *Cockpit*) · `emergency` (Vista B Código Rojo a pantalla completa) · `daily` (rutina preventiva ARED / LBNP). |
| **Interacción Táctil** | Cada ítem del *checklist* envuelve toda la fila en un área clicable $\ge 48\text{ px}$ de alto con `gap: 12px`, marcado por teclado y persistencia inmediata en **IndexedDB / Yjs CRDT**. |

---

### 2.4 `AlarmManager.svelte` (`COMP-00`, `COMP-06` y Vista B)

Orquestador visual, sonoro y de escalamiento ante emergencias médicas o ambientales:

| Nivel | Comportamiento Visual | Audio (`960 Hz`) | Escalamiento (`ADR-013`) |
| :--- | :--- | :--- | :--- |
| **Precaución (*Caution*)** | Chip `#f59e0b` + `▲` + borde diagonal en cabecera; sin bloqueo de pantalla | Ninguno (silencio estricto) | Registro local + notificación pasiva. |
| **Crítico (*Warning / SPE*)** | Transición opcional a **Vista B**; borde `#ef4444` `3px`; texto `#fca5a5` (`10.61:1`); `role="alert"` | Tono intermitente **960 Hz** generado por Web Audio `OscillatorNode` | **`0–10 s`** Consola local -> **`2 min`** Rol CMO -> **`5 min`** Difusión total en cabina (incluso sobre Lock Screen). |

---

## 3. Flujos Modales, Modo Zen y Modo Supervivencia (`ADR-019`)

| Modo / Modal | Trigger | Comportamiento UI/UX |
| :--- | :--- | :--- |
| **Modal Master Caution** | Disparo manual desde cabecera o evento combinado ECLSS+Bio | Resumen de anomalías simultáneas con ordenamiento por severidad y enlace directo a protocolo de $\le 4$ pasos. |
| **Bio-Pasaporte & Exportación DSN** | Selección de historial en `COMP-01` | Visualización longitudinal `L-44` a `R+1` y descarga de paquete JSON firmado criptográficamente (**WebCrypto ECDSA P-256**) para enlace a Tierra/DSN. |
| **Explorador NASA OSDR** | Tab 3 (*Triage Anatómico & CDSS*) | Consulta local en **SQLite WASM** de estudios análogos pre-cargados offline sin dependencia de red. |
| **Modo Zen Minimalista** | Botón de cabecera `Modo Zen` | Oculta el simulador (`COMP-06`), el historial detallado y las vistas progresivas, dejando únicamente los vitales críticos del tripulante activo con tipografía ampliada. |
| **Modo Supervivencia (`< 5W`, `ADR-019`)** | Batería $\le 15\%$ o activación manual | Apaga WebGL (`Three.js`), desactiva `uPlot`, fuerza fondo `#000000` OLED, bloquea animaciones/pulsos CSS y deja lectura tabular estática de vitales y ECLSS con consumo objetivo $< 5\text{ W}$. |

---

## 4. Reglas *Do's & Don'ts* de Implementación Frontend

| Hacer (`DO`) | Evitar (`DON'T`) |
| :--- | :--- |
| Usar `--color-alert-red-text` (`#fca5a5`) para todo texto en alertas críticas ([`ADR-018`](../SDD/08-Architecture-decisions.md#adr-018)). | Poner texto rojo puro `#ef4444` sobre fondos oscuros `#0c1222` (falla WCAG AAA). |
| Mantener todo botón, *checkbox* y *hotspot* en $\ge 48 \times 48\text{ px}$ con `gap: 12px` (`RNF-USA-01`). | Usar controles compactos de `32–40 px` o separaciones de `4–8 px` imposibles de pulsar en microgravedad. |
| Renderizar Three.js solo bajo demanda (`0 FPS` en reposo) y proveer respaldo SVG ([`ADR-004`](../SDD/08-Architecture-decisions.md#adr-004)). | Ejecutar un `requestAnimationFrame` continuo al 60 Hz sobre el visor 3D. |
| Limitar los protocolos de emergencia a $\le 4$ pasos inmediatos ([`ADR-017`](../SDD/08-Architecture-decisions.md#adr-017)). | Presentar manuales extensos o formularios multipaso durante un Código Rojo. |
| Mostrar solo semáforo global y ECLSS en pantalla bloqueada ([`ADR-014`](../SDD/08-Architecture-decisions.md#adr-014)). | Exponer valores de frecuencia cardíaca, DEXA o síntomas privados en monitores públicos sin PIN/NFC. |
