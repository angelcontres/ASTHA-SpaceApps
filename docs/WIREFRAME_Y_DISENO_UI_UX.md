# 📐 Especificación de Wireframes, Ergonomía y Diseño UI/UX
### AstroVital — NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-3001 Vol 2 (Human Factors & Habitation) | ISO 9241-11 (Usabilidad) | MIL-STD-1472H (Human Engineering)

---

## 🎯 1. Filosofía de Diseño en Microgravedad y Espacio Profundo

Diseñar una interfaz médica para un astronauta en tránsito a Marte exige descartar los paradigmas de diseño web convencionales. La cabina espacial impone restricciones físicas severas:

1. **Estrés Cognitivo y Visión Alterada (SANS):** Debido al desplazamiento cefálico de fluidos, los astronautas experimentan fluctuaciones en la refracción ocular y visión borrosa transitoria. La interfaz requiere **fuentes de alta legibilidad (*monospace/sans-serif* pesadas)** y **contraste cromático $> 7:1$ (WCAG 2.1 AAA)**.
2. **Manipulación con Dedos Enguantados y Microgravedad:** En gravedad cero los dedos flotan y la propiocepción motora fina disminuye. Todos los elementos clicables deben tener un área de activación táctil mínima de **$48 \times 48\text{ px}$** con una separación mínima de $8\text{ px}$ para evitar pulsaciones erróneas.
3. **Consumo Eléctrico y Fatiga Visual:** Fondo negro espacial profundo (`#030712` / `#060913`) que apaga los píxeles en pantallas OLED, reduciendo el consumo de potencia a menos de 5W y protegiendo la adaptación a la oscuridad de la cabina.
4. **Doble Codificación para Daltonismo:** Ninguna alerta puede basarse exclusivamente en el color. Todo semáforo médico combina **Color + Icono + Pulso Rítmico + Etiqueta Textual**.

---

## 🗺️ 2. Arquitectura de Información y Sistema de Cuadrícula (12-Column Grid)

La pantalla principal se estructura en una cuadrícula simétrica de 12 columnas optimizada para pantallas táctiles de mamparo ($1920 \times 1080\text{ px}$) y tabletas ($1024 \times 768\text{ px}$):

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. BARRA SUPERIOR DE TELEMETRÍA DE CABINA (Sticky Top Bar - 56px)                              │
│ [Logo AstroVital] [Badge NASA-STD-3001] [Badge Edge 100%] ... [Radiación CANS] [ppCO2 Cabina] │
├────────────────────────────────┬───────────────────────────────────────────────────────────────┤
│ COLUMNA IZQUIERDA (4 COLUMNAS) │ COLUMNA DERECHA (8 COLUMNAS)                                  │
│                                │                                                               │
│ 2. SELECTOR DE TRIPULACIÓN     │ 4. CUADRÍCULA DE TARJETAS DE SIGNOS VITALES (4 Cards)         │
│ [C01 Jared] [C02 Hayley]       │ [FC: 98 bpm]  [PA: 144/92]  [SpO2: 95.8%]  [HRV: 19.5 ms]     │
│ [C03 Sian ] [C04 Chris ]       ├───────────────────────────────┬───────────────────────────────┤
│                                │ 5. CURVA HISTÓRICA CHART.JS   │ 6. PROTOCOLO DE CONTRAMEDIDA  │
│ [Línea de Tiempo: L-44 a R+1]  │ (7 Columnas de Ancho)         │ (5 Columnas de Ancho)         │
│                                │ [Curva PA Sistólica (Cian) ]  │ [Título y Severidad Clínica]  │
│ 3. MAPA ANATÓMICO TÁCTICO      │ [Curva Pulso Cardíaco (Rojo)] │ [Qué ocurre / Explicación ]  │
│ [SVG Humano con Hotspots]:     │ [Eje X: Fases / Eje Y: mmHg]  │ [Checklist con Checkboxes]:   │
│ * Cabeza / Ojos (SANS)         │                               │ [x] Paso 1: Pantalones LBNP   │
│ * Tórax / Corazón              │                               │ [ ] Paso 2: Rejilla Amsler    │
│ * Abdomen / Riñones            │                               │ [ ] Paso 3: Dieta baja sodio  │
│ * Fémur / Huesos               │                               │                               │
│                                ├───────────────────────────────┴───────────────────────────────┤
│ [Tarjeta Flotante de Órgano]   │ 7. SIMULADOR DE CRISIS ESPACIALES EN VIVO (Demo Jurado)       │
│ Estado, Bioseñales y Triage    │ [1. Tormenta Solar SPE]  [2. Fuga CO2]  [3. SANS]  [Reset]    │
└────────────────────────────────┴───────────────────────────────────────────────────────────────┘
```

---

## 📐 3. Esquemas Wireframe Detallados (Low-Fidelity Blueprint Schematics)

### Vista A: Panel Táctico Principal (Cockpit Bulkhead View)

```text
+----------------------------------------------------------------------------------------------------+
| [o] ASTROVITAL | NASA-STD-3001 | [x] EDGE OFFLINE   || Radiacion: 28.4 uSv/h | ppCO2: 2.1 mmHg     |
+----------------------------------------------------------------------------------------------------+
| CREW SELECTOR (OSD-574)            | VITALS GRID                                                   |
| +----------------+---------------+ | +---------------+ +---------------+ +---------------+ +-------+ |
| | [C01] Jared I. | [C02] Hayley A| | | FC: 98 bpm    | | PA: 144/92*   | | SpO2: 95.8%   | | HRV:19| |
| | Cmdte (Nominal)| Med (Nominal) | | | Nom: 55-85    | | Nom: 120/80   | | Nom: >=96%    | | Nom>35| |
| +----------------+---------------+ | +---------------+ +---------------+ +---------------+ +-------+ |
| | [C03] Sian P.* | [C04] Chris S | | *ALERTA: SANS CRITICAL (Pulsacion Roja 1.5s)                  |
| | Piloto (SANS!) | Esp (Nominal) | |---------------------------------------------------------------|
| +----------------+---------------+ | TELEMETRY CHART (Chart.js)    | CONTRAMEASURE CHECKLIST       |
| TIMELINE: [L-44] [FD1] [FD2*] [FD3]| | mmHg                        | [!] ALTA PRIORIDAD: SANS      |
|------------------------------------| | 160+     /--- PAS Sistolica | Cefalea y congestion ocular   |
| ANATOMICAL TACTICAL BODY MAP       | | 140+====*======             | por microgravedad.            |
|              ( O )  <-- Ojos SANS! | | 120+---/                    | [x] 1. LBNP -35 mmHg (60 min) |
|             /  |  \ <-- Torax/Cor  | | 100+                        | [ ] 2. Test Rejilla de Amsler |
|            |  (o)  |               | |  80+   *---*--- FC Pulso    | [ ] 3. Dieta sodio < 2.0 g/d  |
|               / \   <-- Rinon/Lumb | |  60+--/                     |-------------------------------|
|              |   |  <-- Femur/Hues | |    L-44 FD1 FD2 FD3 R+1     | SIMULADOR DE CRISIS EN VIVO   |
|              |   |                 +-------------------------------+ [1. SPE] [2. CO2] [3. SANS]   |
| [Info Box: Sistema Neuro-Ocular]   | Mars RTT Delay: 44m | P2P Mesh Synced | DB: AES-256 Encrypted |
+----------------------------------------------------------------------------------------------------+
```

### Vista B: Pantalla de Emergencia Máxima (Código Rojo SPE / Tormenta Solar)

```text
+----------------------------------------------------------------------------------------------------+
| [!] ALERTA MAXIMA - CODIGO ROJO || TASA RADIACION: 184.2 uSv/h (CRITICO) || TIEMPO IMPACTO: < 5 MIN|
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|      /!\   EMERGENCIA SPE: FLUJO MASIVO DE PROTONES Y NEUTRONES SOLARES EN CURSO   /!\            |
|                                                                                                    |
| +------------------------------------------------------------------------------------------------+ |
| | CHECKLIST DE SUPERVIVENCIA INMEDIATA (EJECUCION OBLIGATORIA TRIPULACION):                      | |
| |                                                                                                | |
| | [ ] PASO 1: Evacuar de inmediato al modulo central blindado (STORM SHELTER).                   | |
| |              Blindaje pasivo de agua y polietileno reduce dosis biológica en >70%.              | |
| |                                                                                                | |
| | [ ] PASO 2: Administrar cóctel radioprotector antioxidante oral (Botiquín Bravo mamparo 2).    | |
| |              Mitigación de roturas de doble cadena de ADN celular.                             | |
| |                                                                                                | |
| | [ ] PASO 3: Fijar dosímetros pasivos CANS personales en el mamparo interior blindado.          | |
| |              Registro continuo de dosis absorbida individual acumulada (mSv).                  | |
| +------------------------------------------------------------------------------------------------+ |
|                                                                                                    |
| Dosis Acumulada Misión: 42.8 mSv || Limite SPELs Carrera: 600 mSv || Houston DTN Packet: Queued     |
+----------------------------------------------------------------------------------------------------+
```

---

## 🎨 4. Sistema de Diseño Atómico (Design System Tokens)

### 4.1. Paleta Cromática Aeroespacial Táctica (Dark Tactical Scheme)

| Token Semántico | Valor Hexadecimal | Uso Operacional en AstroVital | Razón Ergonómica |
| :--- | :---: | :--- | :--- |
| **`space-950`** | `#030712` | Fondo absoluto de la aplicación | Apagado de píxeles en paneles OLED; consumo $< 5\text{ W}$. |
| **`space-900`** | `#060913` | Fondo de viewport y contenedores | Contraste de profundidad sin deslumbramiento nocturno. |
| **`space-800`** | `#0c1222` | Fondo de tarjetas y modales | Delimitación nítida de componentes con bordes `#141e36`. |
| **`cyan-400`** | `#38bdf8` | Acento nominal, curvas de presión | Longitud de onda cian de máxima agudeza foveal escotópica. |
| **`alert-green`** | `#10b981` | Estado Nominal (NASA-STD-3001) | Señal de parámetros fisiológicos seguros y dentro de rango. |
| **`alert-yellow`**| `#f59e0b` | Estado de Precaución / Deriva | Alerta temprana preventiva sin disparar alarma sonora. |
| **`alert-red`** | `#ef4444` | Estado Crítico / Código Rojo | Pulsación lenta (1.5s) que exige intervención o contramedida. |

### 4.2. Tipografía y Jerarquía

* **Fuente de Datos y Bioseñales:** `JetBrains Mono` / `SF Mono` / `monospace`. Garantiza que las cifras numéricas no cambien de ancho al fluctuar (evitando saltos visuales en el pulso cardíaco).
* **Fuente de Interfaz y Procedimientos:** `Inter` / `system-ui` / `sans-serif`. Máxima legibilidad a distancias de 1 metro en cabina.

### 4.3. Zonas Táctiles y Controles de Vuelo (Touch Targets)

* **Botones Primarios de Crisis:** Alto $48\text{ px}$, relleno lateral $16\text{ px}$, radio de curvatura $12\text{ px}$.
* **Hotspots del Mapa Anatómico:** Área de captura táctil mínima de $48 \times 48\text{ px}$ con micro-animación de resplandor (*glow effect*) al pasar el cursor o posar el dedo.
* **Casillas de Verificación de Checklists:** Caja táctil de $24 \times 24\text{ px}$ centrada en un contenedor acolchado de $44\text{ px}$ de altura para fácil pulsación.

---

## 📱 5. Prototipo Visual Interactivo de Wireframe

Para visualizar y auditar las dimensiones, acotaciones y diseño interactivo del wireframe, se ha creado el archivo interactivo:
👉 **[`wireframe.html`](file:///C:/Users/OMEN/Documents/Hackaton/Nasa-Project/wireframe.html)**

Este archivo permite a los evaluadores alternar en tiempo real entre:
1. **Vista Wireframe Blueprint (Baja Fidelidad):** Líneas de acotación ortogonales, cuadrícula técnica espacial y medidas en píxeles.
2. **Vista UI Táctica (Alta Fidelidad):** Colores de vuelo reales, gráficos de telemetría y animaciones de pulso.
3. **Modo Crisis (Código Rojo):** Demostración del layout de evacuación inmediata ante tormentas solares.
