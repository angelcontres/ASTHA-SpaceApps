# 02 — Guía de Estilo y Design System

[<- Wireframes y Arquitectura](./01-Wireframes-y-Arquitectura-de-Pantalla.md) · [Índice](./README.md) · [Mockups y Componentes ->](./03-Mockups-y-Especificacion-de-Componentes.md)

---

## 1. Fundamentos Cromáticos (*Zero-Glare Dark Telemetry*)

El sistema visual de **ASTHA** está calibrado para cabinas con iluminación reducida o penumbra orbital (estándar **NASA-STD-3001 Vol. 2** y **MIL-STD-1472H**), eliminando fondos blancos que generen fatiga pupilar y garantizando relación de contraste **WCAG 2.1 AAA ($\ge 7:1$)** en todo texto crítico, conforme a [`ADR-018`](../SDD/08-Architecture-decisions.md#adr-018).

### 1.1 Tokens de Superficies y Blueprint (`wireframe.html` + `index.html`)

| Token CSS | Hex | Uso Exacto | Modo |
| :--- | :--- | :--- | :--- |
| `--color-space-950` | `#030712` | Fondo maestro de consola Hi-Fi (`index.html`), máximo ahorro OLED | Operativo (Hi-Fi) |
| `--color-space-900` | `#060913` | Barra superior, tarjetas secundarias y contenedores *scroll* | Operativo (Hi-Fi) |
| `--color-space-800` | `#0c1222` | Tarjetas de signos vitales (`COMP-03`), modales y paneles activos | Operativo (Hi-Fi) |
| `--color-blueprint-bg` | `#040915` | Fondo reticulado de arquitectura técnica (`wireframe.html`) | Blueprint Wireframe |
| `--color-blueprint-line` | `#79a7df` | Bordes de cota (`.blueprint-box`), líneas guía y etiquetas de grid | Blueprint Wireframe |
| `--color-blueprint-text` | `#9fc5f8` | Etiquetas técnicas `.dimension-tag`, iconos de cota y tipografía de plano | Blueprint Wireframe |
| `--color-cyan-400` | `#38bdf8` | Acento interactivo principal, foco de teclado y métricas activas (`9.40:1` sobre `space-950`, `8.71:1` sobre `space-800`) | Transversal |

### 1.2 Tokens Semánticos de Estado y Regla Crítica `ADR-018`

Los ratios de contraste listados provienen directamente de la medición normativa documentada en [`03-componentes.md`](../c4/03-componentes.md#3-sistema-de-diseño-normativo-tokens-accesibilidad-y-estados):

| Token Semántico | Hex | Contraste sobre `#030712` | Contraste sobre `#0c1222` | Regla de Uso Estricta |
| :--- | :--- | :--- | :--- | :--- |
| `--color-alert-green` | `#10b981` | **7.94 : 1** (AAA) | **7.36 : 1** (AAA) | Estado **Nominal**, indicadores `✓`, cumplimiento de rango NASA-STD-3001. |
| `--color-alert-yellow` | `#f59e0b` | **9.37 : 1** (AAA) | **8.69 : 1** (AAA) | Estado **Precaución / Caution**, tendencia `▲`, advertencia sin interrupción sonora. |
| `--color-alert-red` | `#ef4444` | 5.35 : 1 (Solo AA) | 4.96 : 1 (Solo AA) | **PROHIBIDO PARA TEXTO DE LECTURA.** Uso exclusivo en fondos de alarma, bordes pulsantes (`3px`), *glow* e iconos gráficos grandes (`>= 24px`). |
| `--color-alert-red-text` | `#fca5a5` | **10.61 : 1** (AAA) | **9.83 : 1** (AAA) | **OBLIGATORIO para texto de alerta crítica**, etiquetas `✕ Crítico`, titulares de Código Rojo y cifras en peligro ([`ADR-018`](../SDD/08-Architecture-decisions.md#adr-018)). |

> [!CAUTION]
> **Prohibición de texto rojo puro (`#ef4444`)**: En paneles oscuros aeroespaciales `#0c1222`, `#ef4444` cae a `4.96:1`, insuficiente bajo fatiga visual orbital o visión con luz roja nocturna. Todo texto dentro de una alerta crítica debe usar `--color-alert-red-text` (`#fca5a5`).

---

## 2. Sistema de Doble Codificación (*Color-Blindness & Night 630nm*)

Bajo luz nocturna roja de **630 nm** en cabina o en usuarios con deuteranopía/protanopía, la distinción cromática verde/amarillo/rojo colapsa. ASTHA exige **doble codificación visual** en cada estado:

| Nivel de Severidad | Token Color | Símbolo Obligatorio | Patrón Geométrico de Borde/Fondo | Comportamiento Sonoro ([`ADR-013`](../SDD/08-Architecture-decisions.md#adr-013)) |
| :--- | :--- | :--- | :--- | :--- |
| **Nominal** | `#10b981` | `✓ Nominal` | Borde sólido `1px` | Silencio total. |
| **Precaución (*Caution*)** | `#f59e0b` | `▲ Precaución` | Borde sólido `2px` + franja diagonal tenue (*diagonal stripe*) | Silencio total (notificación visual estática en cabecera). |
| **Crítico (*Warning / Código Rojo*)** | `#ef4444` / `#fca5a5` | `✕ Crítico` | Borde `3px` + cuadrícula/retícula sutil + pulso suave (`<= 1.5 Hz`, respetando `prefers-reduced-motion`) | Tono intermitente **960 Hz** (`0-10s` local -> `2m` CMO -> `5m` Cabina). |

---

## 3. Tipografía, Escala Numérica y Cero Dependencias Externas (`ADR-003`)

Por restricción estricta de operación offline sin descargas de red en espacio profundo ([`ADR-003`](../SDD/08-Architecture-decisions.md#adr-003)), ASTHA **no carga Google Fonts en producción** y utiliza pilas tipográficas nativas del sistema operativo:

```css
:root {
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
}
```

| Rol Tipográfico | Familia | Tamaño / Peso | Regla Numérica |
| :--- | :--- | :--- | :--- |
| **Valor Biométrico Principal** | `--font-mono` | `2rem` (`32px`) / `700` | `font-variant-numeric: tabular-nums` obligatorio (evita saltos horizontales al refrescar telemetría cada segundo). |
| **Unidad y Rango NASA-STD-3001** | `--font-mono` | `0.75rem` (`12px`) / `500` | Color `#94a3b8` (`slate-400`), siempre alineado a la derecha del valor. |
| **Etiqueta Técnica / Blueprint** | `--font-mono` | `0.6875rem` (`11px`) / `700` | Mayúsculas + `letter-spacing: 0.08em`. |
| **Texto Operativo y Checklist** | `--font-sans` | `0.875rem`–`1rem` (`14px`–`16px`) / `500` | Interlineado mínimo `1.5`, longitud de línea máxima `65 ch`. |
| **Titular de Alarma / Código Rojo** | `--font-sans` | `1.25rem`–`1.5rem` (`20px`–`24px`) / `700` | Color `--color-alert-red-text` (`#fca5a5`). |

---

## 4. Espaciado, Geometría Táctil y Modos Especiales de Energía

| Parámetro Geométrico | Valor Normativo | Referencia |
| :--- | :--- | :--- |
| **Área mínima táctil (*Touch Target*)** | `min-width: 48px; min-height: 48px;` | `RNF-USA-01` (actualizado sobre `wireframe.html` `.touch-target`) |
| **Separación mínima entre controles (*Gap*)** | `12px` (`0.75rem`) | `RNF-USA-01` (previene doble toque en flotación) |
| **Radio de bordes en consola operativa** | `8px` (`0.5rem`) tarjetas · `6px` (`0.375rem`) botones | Consistencia visual sin deformar cuadrículas de 12 cols |
| **Modo Nocturno Cabina (630 nm)** | Filtro CSS `night-red-630` con atenuación de canal azul/verde | Protección de ciclo circadiano tripulado |
| **Modo Supervivencia (`< 5W`, `ADR-019`)** | Fondo `#000000` puro, texto monocromo `#e2e8f0` / `#fca5a5`, **0 animaciones**, Three.js y uPlot desactivados (solo lectura tabular) | [`ADR-019`](../SDD/08-Architecture-decisions.md#adr-019) |

---

## 5. Especificación Sonora y Accesibilidad ARIA (`RNF-USA-04`)

- **Síntesis local Web Audio API**: Generación directa vía `OscillatorNode` a **960 Hz** (onda senoidal suavizada con envolvente ADSR sin archivos `.mp3`/`.wav` externos, garantizando funcionamiento offline).
- **Patrón de Escalamiento (`ADR-013`)**:
  1. **`0–10 s` (Local)**: Pulso intermitente en la consola del tripulante con botón visible `Silenciar` ($48 \times 48\text{ px}$).
  2. **`2 min` (CMO / Flight Surgeon)**: Si no hay *Ack*, escala alerta sonora y visual al rol médico a bordo.
  3. **`5 min` (Cabina Completa)**: Difusión global a todos los monitores de mamparo (`Vista B`).
- **Lectores de pantalla y foco**: Toda alerta crítica monta `role="alert"` y `aria-live="assertive"`; los controles de precaución usan `aria-live="polite"` y anillos de foco `outline: 3px solid #38bdf8; outline-offset: 2px;`.

---

## 6. Fragmento Canónico de Design Tokens (`tokens.css`)

```css
:root {
  /* Superficies */
  --space-950: #030712;
  --space-900: #060913;
  --space-800: #0c1222;
  --blueprint-bg: #040915;
  --blueprint-line: #79a7df;
  --blueprint-text: #9fc5f8;

  /* Acentos y Semáforos */
  --cyan-400: #38bdf8;
  --alert-green: #10b981;
  --alert-yellow: #f59e0b;
  --alert-red: #ef4444;       /* Solo rellenos, bordes e íconos grandes */
  --alert-red-text: #fca5a5;  /* Texto crítico WCAG AAA (10.61:1) */

  /* Geometría Táctil RNF-USA-01 */
  --touch-min: 48px;
  --touch-gap: 12px;
}
```
