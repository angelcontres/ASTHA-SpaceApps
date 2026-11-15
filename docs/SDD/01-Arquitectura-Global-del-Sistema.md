# 🏛️ SDD-01: Arquitectura Global del Sistema
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | ISO/IEC/IEEE 29148 | **ADRs:** 001, 002, 003, 005, 011, 015, 019

---

## 1. Estilo Arquitectónico: Hexagonal + Event-Driven Edge Workers

De acuerdo con **[ADR-003](08-Architecture-decisions.md#adr-003)** y **[ADR-005](08-Architecture-decisions.md#adr-005)**, ASTHA implementa una arquitectura **Hexagonal (Ports & Adapters)** ejecutada íntegramente en la capa del cliente (**PWA Offline**), donde el hilo principal de interfaz queda aislado del cómputo clínico y de la persistencia mediante **dos Dedicated Web Workers dirigidos por eventos** (cero *polling*).

```text
+----------------------------------------------------------------------------------------+
|               CREW PWA — HILO PRINCIPAL (UI COMPILADA SIN VDOM - ADR-003)              |
|   Svelte 5 Runes UI  |  uPlot Canvas 2D  |  Three.js Bajo Demanda (ADR-004) + SVG      |
|   Web Audio (800-1200Hz RNF-USA-04)      |  Tokens WCAG AAA (alert-red-text ADR-018)   |
+----------------------------------------------------------------------------------------+
                 │ ▲ (postMessage: Comandos de UI / Resultados de Triage < 50ms)
                 ▼ │
+----------------------------------------------------------------------------------------+
|            CLINICAL ENGINE WORKER (DEDICATED WORKER DETERMINISTA - ADR-005)            |
|   Pipeline O(reglas): Validación RF-ING-05 ➔ Clasificación RF-EVA-01 ➔ Sostenidos      |
|   Correlación R-ENV..R-CARD ➔ Deriva D-01..D-03 (MAD ADR-011) ➔ Resolver <=4 pasos     |
|   [PROHIBIDO: fetch, WebSocket, DOM, timers/polling]                                   |
+----------------------------------------------------------------------------------------+
                 │ ▲ (MessageChannel: Registros validados y eventos)
                 ▼ │
+----------------------------------------------------------------------------------------+
|           DATA & SYNC WORKER (PERSISTENCIA CIFRADA & LAN SYNC - ADR-006/008/009)       |
|   IndexedDB Web Crypto (AES-GCM 256, SHA-256, Ed25519, PBKDF2) | Bitácora Append-Only  |
|   CRDT (G-Set, LWW-Map, PN-Counter + HLC) | WSS Client (astha.local) | Export JSON DSN |
+----------------------------------------------------------------------------------------+
```

---

## 2. Principios de Diseño Aeroespacial y Restricciones de Dominio

### 2.1 Autonomía Edge-First y Cero WAN (`ADR-002`, `RF-EVA-07`, `RNF-NET-01`)
* **Frontera de Red Cerrada:** ASTHA opera como un nodo autónomo completo en cada tableta de tripulación o consola médica. No emite ni recibe tráfico hacia Internet (cero APIs remotas, cero CDNs).
* **Service Worker Cache-Only:** Tras el aprovisionamiento en Tierra (**[ADR-020](08-Architecture-decisions.md#adr-020)**), todos los activos y el dataset sintético de 180 días ($\le 5.0\text{ MB}$ total según `RNF-POW-04`) se sirven exclusivamente desde Cache Storage local.
* **Enlace con Tierra Desacoplado (`ADR-010`):** El software no implementa una pila de red DTN interplanetaria dentro del navegador; genera un archivo **JSON firmado criptográficamente con Ed25519** (`RNF-NET-04`), que el CMO entrega al router de comunicaciones de la nave.

### 2.2 Presupuesto Energético, Cómputo y Arranque (`RNF-POW-01..04`, `RNF-PER-01..02`)

| Presupuesto (SRS §4.1) | Límite Estricto | Estrategia de Diseño en ASTHA | ADR de Soporte |
| :--- | :---: | :--- | :--- |
| **Uso de CPU en Reposo (`RNF-POW-01`)** | $\le 3.0\%$ | Cero `setInterval` ni bucles `requestAnimationFrame`. Workers dormidos hasta evento `postMessage`. Avatar 3D en 0 FPS pasivos. | ADR-003, ADR-004, ADR-005 |
| **Consumo Eléctrico (`RNF-POW-02`)** | $< 350\text{ mW}$ (16h) | Fondo `#030712` (píxeles OLED apagados), `powerPreference: 'low-power'`, suspensión en `visibilitychange`. | ADR-003, ADR-019 |
| **Memoria RAM (`RNF-POW-03`)** | $\le 150\text{ MB}$ | 720 mediciones en `Float32Array` ($< 1\text{ MB}$); liberación WebGL (`dispose()`) al salir de vista anatómica. | ADR-004, ADR-016 |
| **Peso del Bundle (`RNF-POW-04`)** | $\le 5.0\text{ MB}$ | Svelte 5 compilado (~KB), uPlot (~KB), Three.js modular local, dataset sintético (~273 KB). *Excluye archivos pesados de 24 MB.* | ADR-003, C4-02 |
| **Latencia de Triage (`RNF-PER-01`)** | $< 50\text{ ms}$ | Sumas móviles $O(1)$ para regresión de 7 días y evaluación determinista de reglas en Worker. | ADR-005, ADR-011 |
| **Arranque en Frío (`RNF-PER-02`)** | $< 1.5\text{ s}$ | Medido hasta la **pantalla de bloqueo**, la cual ya muestra telemetría ECLSS y semáforo global (sin esperar derivación PBKDF2 del PIN). | ADR-014, ADR-015 |

### 2.3 Modo de Supervivencia Energética (`ADR-019`)
Ante una contingencia eléctrica de la nave, el Comandante activa manualmente el **Modo Supervivencia**:
* Desactiva completamente el contexto WebGL del avatar 3D (conmuta a SVG estático) y desactiva gráficas históricas.
* Reduce el brillo mediante CSS y restringe la sincronización WSS únicamente a eventos de severidad crítica.
* El pipeline clínico de evaluación y las alarmas sonoras de 800–1200 Hz permanecen 100% operativos.

---

## 3. Algoritmos de Detección de Deriva Fisiológica (`RF-DER-01..04`)

El `Clinical Engine Worker` ejecuta tres detectores complementarios en cada evento de registro diario:

1. **D-01 (Proyección por Regresión Lineal de 7 Días — `RF-DER-01`, `RF-DER-02`):**
   Calculada en complejidad temporal $O(1)$ manteniendo sumas móviles ($\Sigma x, \Sigma y, \Sigma xy, \Sigma x^2$). Emite alerta precoz si la recta proyectada a 7 días cruza un umbral de precaución cuando el valor actual aún es nominal.
2. **D-02 (Modified Z-Score con MAD — `ADR-011`, `RF-DER-03`):**
   Sobre la línea base individual de los primeros 14 días de vuelo, se calcula la Mediana ($\tilde{x}$) y la Desviación Absoluta de la Mediana ($MAD$):
   $$\text{MAD} = \text{mediana}(|x_i - \tilde{x}|), \qquad M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{\text{MAD}}$$
   Si $|M_i| \ge 2.5$ (con guardia `MAD > 0`), se dispara una alerta precoz inmune a valores atípicos (*outliers*).
3. **D-03 (Patrón Combinado Multivariado — `RF-DER-04`):**
   Correlaciona pendiente negativa sostenida en horas de sueño junto con pendiente positiva en presión arterial diastólica (PAD) dentro de la misma ventana de 7 días.
