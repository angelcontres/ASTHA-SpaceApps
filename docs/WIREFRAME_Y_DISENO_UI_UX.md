# 📐 Especificación de Wireframes, Ergonomía y Diseño UI/UX
### ASTHA — NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-3001 Vol 2 (Human Factors & Habitation) | ISO 9241-11 (Usabilidad) | MIL-STD-1472H (Human Engineering)

> [!NOTE]
> **Suite Modular Oficial de Diseño UI/UX:** La especificación normativa completa (Wireframes Vista A/B/C, Design System WCAG AAA `#fca5a5` y Mockups/Componentes Svelte 5 + `uPlot`) se encuentra organizada en [**`docs/Diseno-UI-UX/README.md`**](./Diseno-UI-UX/README.md). Este documento se mantiene alineado como referencia ejecutiva rápida.

---

## 🎯 1. Filosofía de Diseño en Microgravedad y Espacio Profundo

Diseñar una interfaz médica para un astronauta en tránsito a Marte exige descartar los paradigmas de diseño web convencionales. La cabina espacial impone restricciones físicas severas:

1. **Estrés Cognitivo y Visión Alterada (SANS):** Debido al desplazamiento cefálico de fluidos, los astronautas experimentan fluctuaciones en la refracción ocular y visión borrosa transitoria. La interfaz requiere **fuentes nativas del sistema de alta legibilidad (`system-ui` / `ui-monospace` según `ADR-003`)** y **contraste cromático $> 7:1$ (WCAG 2.1 AAA)**.
2. **Manipulación con Dedos Enguantados y Microgravedad:** En gravedad cero los dedos flotan y la propiocepción motora fina disminuye. Todos los elementos clicables deben tener un área de activación táctil mínima de **$48 \times 48\text{ px}$** con una separación mínima de **$12\text{ px}$** (`RNF-USA-01`) para evitar pulsaciones erróneas.
3. **Consumo Eléctrico y Fatiga Visual:** Fondo negro espacial profundo (`#030712` / `#060913`) que apaga los píxeles en pantallas OLED, reduciendo el consumo de potencia a menos de 5W y protegiendo la adaptación a la oscuridad de la cabina.
4. **Doble Codificación para Daltonismo:** Ninguna alerta puede basarse exclusivamente en el color. Todo semáforo médico combina **Color + Icono + Pulso Rítmico + Etiqueta Textual**.

---

## 🗺️ 2. Arquitectura de Información y Sistema de Cuadrícula (12-Column Grid)

La pantalla principal se estructura en una cuadrícula simétrica de 12 columnas optimizada para pantallas táctiles de mamparo ($1920 \times 1080\text{ px}$) y tabletas ($1024 \times 768\text{ px}$):

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. BARRA SUPERIOR DE TELEMETRÍA DE CABINA (Sticky Top Bar - 56px)                              │
│ [Logo ASTHA] [Badge NASA-STD-3001] [Badge Edge 100%] ... [Radiación CANS] [ppCO2 Cabina] │
├────────────────────────────────┬───────────────────────────────────────────────────────────────┤
│ COLUMNA IZQUIERDA (4 COLUMNAS) │ COLUMNA DERECHA (8 COLUMNAS)                                  │
│                                │                                                               │
│ 2. SELECTOR DE TRIPULACIÓN     │ 4. CUADRÍCULA DE TARJETAS DE SIGNOS VITALES (4 Cards)         │
│ [C01 Jared] [C02 Hayley]       │ [FC: 98 bpm]  [PA: 144/92]  [SpO2: 95.8%]  [HRV: 19.5 ms]     │
│ [C03 Sian ] [C04 Chris ]       ├───────────────────────────────┬───────────────────────────────┤
│                                │ 5. CURVA HISTÓRICA uPlot      │ 6. PROTOCOLO DE CONTRAMEDIDA  │
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
| [o] ASTHA | NASA-STD-3001 | [x] EDGE OFFLINE        || Radiacion: 28.4 uSv/h | ppCO2: 2.1 mmHg     |
+----------------------------------------------------------------------------------------------------+
| CREW SELECTOR (OSD-574)            | VITALS GRID                                                   |
| +----------------+---------------+ | +---------------+ +---------------+ +---------------+ +-------+ |
| | [C01] Jared I. | [C02] Hayley A| | | FC: 98 bpm    | | PA: 144/92*   | | SpO2: 95.8%   | | HRV:19| |
| | Cmdte (Nominal)| Med (Nominal) | | | Nom: 55-85    | | Nom: 120/80   | | Nom: >=96%    | | Nom>35| |
| +----------------+---------------+ | +---------------+ +---------------+ +---------------+ +-------+ |
| | [C03] Sian P.* | [C04] Chris S | | *ALERTA: SANS CRITICAL (Pulsacion Roja 1.5s)                  |
| | Piloto (SANS!) | Esp (Nominal) | |---------------------------------------------------------------|
| +----------------+---------------+ | TELEMETRY CHART (uPlot Canvas)| CONTRAMEASURE CHECKLIST       |
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

| Token Semántico | Valor Hexadecimal | Uso Operacional en ASTHA | Razón Ergonómica |
| :--- | :---: | :--- | :--- |
| **`space-950`** | `#030712` | Fondo absoluto de la aplicación | Apagado de píxeles en paneles OLED; consumo $< 5\text{ W}$. |
| **`space-900`** | `#060913` | Fondo de viewport y contenedores | Contraste de profundidad sin deslumbramiento nocturno. |
| **`space-800`** | `#0c1222` | Fondo de tarjetas y modales | Delimitación nítida de componentes con bordes `#141e36`. |
| **`cyan-400`** | `#38bdf8` | Acento nominal, curvas de presión | Longitud de onda cian de máxima agudeza foveal escotópica. |
| **`alert-green`** | `#10b981` | Estado Nominal (NASA-STD-3001) | Señal de parámetros fisiológicos seguros y dentro de rango. |
| **`alert-yellow`**| `#f59e0b` | Estado de Precaución / Deriva | Alerta temprana preventiva sin disparar alarma sonora. |
| **`alert-red`** | `#ef4444` | Estado Crítico / Código Rojo (solo rellenos/bordes) | Pulsación lenta (1.5s) y bordes de alerta sin texto rojo sobre oscuro. |
| **`alert-red-text`** | `#fca5a5` | Texto en alertas críticas (`ADR-018`) | Contraste **WCAG AAA (`10.61:1` sobre `#030712`)** para legibilidad bajo estrés SANS. |

### 4.2. Tipografía y Jerarquía

* **Fuente de Datos y Bioseñales:** `ui-monospace` / `"SF Mono"` / `monospace` (`ADR-003`, cero fuentes externas). Garantiza cifras `tabular-nums` sin saltos visuales en el pulso cardíaco.
* **Fuente de Interfaz y Procedimientos:** `system-ui` / `sans-serif`. Máxima legibilidad nativa offline a distancias de 1 metro en cabina.

### 4.3. Zonas Táctiles y Controles de Vuelo (Touch Targets)

* **Botones Primarios de Crisis:** Alto $48\text{ px}$, relleno lateral $16\text{ px}$, separación mínima (`gap`) de **$12\text{ px}$** (`RNF-USA-01`).
* **Hotspots del Mapa Anatómico:** Área de captura táctil mínima de $48 \times 48\text{ px}$ con micro-animación de resplandor (*glow effect*) al pasar el cursor o posar el dedo.
* **Casillas de Verificación de Checklists:** Caja táctil de $24 \times 24\text{ px}$ centrada en un contenedor acolchado de **$48\text{ px}$** de altura mínima (`RNF-USA-01`) para fácil pulsación.

---

## 📱 5. Prototipo Visual Interactivo de Wireframe

Para visualizar y auditar las dimensiones, acotaciones y diseño interactivo del wireframe, se ha creado el archivo interactivo:
👉 **[`wireframe.html`](../wireframe.html)**

Este archivo permite a los evaluadores alternar en tiempo real entre:
1. **Vista Wireframe Blueprint (Baja Fidelidad):** Líneas de acotación ortogonales, cuadrícula técnica espacial y medidas en píxeles.
2. **Vista UI Táctica (Alta Fidelidad):** Colores de vuelo reales, gráficos de telemetría y animaciones de pulso.
3. **Modo Crisis (Código Rojo):** Demostración del layout de evacuación inmediata ante tormentas solares.

---

## 🧘 6. Arquitectura Minimalista y Telemetría Ambiental (ECLSS)

### 6.1. Reducción de Carga Cognitiva mediante Divulgación Progresiva (*Progressive Disclosure*)
En situaciones de contingencia de vuelo espacial (como tormentas solares o fallos atmosféricos), la sobrecarga sensorial y la exposición excesiva de información simultánea incrementan la tasa de error humano. Siguiendo el estándar **NASA-STD-3001 Vol 2 (Capítulo 10: "Crew Interfaces - Minimizing Display Clutter")**:
* El dashboard organiza la información en **pestañas tácticas independientes**:
  1. `[👤 1. Biomédico Astronauta]`: Signos vitales esenciales (FC, PA, SpO₂, HRV) y curva de adaptación.
  2. `[🛰️ 2. Entorno y Cabina (ECLSS)]`: Telemetría ambiental de la nave y estado de los sistemas de soporte vital.
  3. `[🧬 3. Triage Anatómico & CDSS]`: Mapa corporal interactivo y checklists de intervención clínica.
  4. `[⚡ 4. Simulador de Crisis]`: Inyección controlada de escenarios para pruebas y evaluación.
* **Cinta de Estado Rápido (*Quick-Status Strip*)**: Proporciona conciencia situacional instantánea en 1 línea fija bajo la cabecera: astronauta activo, fase de vuelo, presión de cabina, $ppCO_2$, radiación CANS y semáforo médico general.

### 6.2. Especificación de Telemetría Ambiental de Cabina (ECLSS & CANS)
El entorno de hábitat espacial supervisa 6 parámetros críticos correlacionados con la fisiología del astronauta:
1. **Dióxido de Carbono ($ppCO_2$):** Presión parcial en cabina ($2.10 - 2.85\text{ mmHg} \approx 2760 - 3750\text{ ppm}$). Límite de alerta NASA-STD-3001: $3.0\text{ mmHg}$.
2. **Presión Atmosférica Total ($P_{cab}$):** $101.3\text{ kPa}$ ($14.7\text{ psi}$ / $1.0\text{ atm}$). Rango seguro: $98.6 - 102.7\text{ kPa}$.
3. **Concentración de Oxígeno ($pO_2$ / $\%O_2$):** $20.9\%$ ($ppO_2 \approx 21.2\text{ kPa}$). Margen operativo: $19.5\% - 23.0\%$.
4. **Temperatura Ambiente ($T_{cab}$):** $21.5^\circ\text{C}$ ($70.7^\circ\text{F}$). Rango de confort NASA: $18.3 - 26.7^\circ\text{C}$.
5. **Humedad Relativa ($RH\%$):** $45.0\%$. Rango nominal: $25\% - 75\%$.
6. **Dosimetría de Radiación CANS (CSA):** Tasa de dosis en tiempo real ($28.4 - 32.8\ \mu\text{Sv/h}$). Límite de evacuación a Storm Shelter: $> 100\ \mu\text{Sv/h}$.

### 6.3. Modo Zen Minimalista y Modo Supervivencia (`< 5W`, `ADR-019`)
* **Modo Zen:** Al activarse, oculta bordes decorativos, resalta exclusivamente las cifras críticas con tipografía sobredimensionada y amplía el espaciado para lectura a distancia sin distracciones.
* **Modo Supervivencia (`< 5W`):** Cuando la batería baja de $\le 15\%$ o se activa respaldo manual (`ADR-019`), desactiva Three.js y `uPlot`, fija fondo `#000000` puro sin animaciones ni pulsos y conserva la lectura tabular de vitales y ECLSS.
