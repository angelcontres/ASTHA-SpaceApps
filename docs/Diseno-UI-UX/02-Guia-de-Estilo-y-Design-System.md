# 02 — Style Guide & Design System

[<- Wireframes & Architecture](./01-Wireframes-y-Arquitectura-de-Pantalla.md) · [Index](./README.md) · [Mockups & Components ->](./03-Mockups-y-Especificacion-de-Componentes.md)

---

## 1. Chromatic Foundations (*Zero-Glare Dark Telemetry*)

The visual system of **ASTHA** is calibrated for dimly lit spacecraft cabins or orbital twilight (**NASA-STD-3001 Vol. 2** and **MIL-STD-1472H**), eliminating white backgrounds that induce pupillary fatigue and guaranteeing **WCAG 2.1 AAA ($\ge 7:1$)** contrast ratios on all critical text per [`ADR-018`](../SDD/08-Architecture-decisions.md#adr-018).

### 1.1 Surface & Blueprint Tokens (`wireframe.html` + `index.html`)

| CSS Token | Hex | Exact Usage | Mode |
| :--- | :--- | :--- | :--- |
| `--color-space-950` | `#030712` | Master background for Hi-Fi console (`index.html`), maximum OLED power savings | Operational (Hi-Fi) |
| `--color-space-900` | `#060913` | Top bar, secondary cards, and scrollable containers | Operational (Hi-Fi) |
| `--color-space-800` | `#0c1222` | Vital-sign cards (`COMP-03`), modals, and active panels | Operational (Hi-Fi) |
| `--color-blueprint-bg` | `#040915` | Technical architecture grid background (`wireframe.html`) | Blueprint Wireframe |
| `--color-blueprint-line` | `#79a7df` | Dimension borders (`.blueprint-box`), guide lines, and grid labels | Blueprint Wireframe |
| `--color-blueprint-text` | `#9fc5f8` | Technical labels `.dimension-tag`, dimension icons, and blueprint typography | Blueprint Wireframe |
| `--color-cyan-400` | `#38bdf8` | Primary interactive accent, keyboard focus ring, and active metrics (`9.40:1` on `space-950`, `8.71:1` on `space-800`) | Cross-cutting |

### 1.2 Semantic Status Tokens & Critical Rule `ADR-018`

The contrast ratios listed below are derived directly from the normative measurements documented in [`03-componentes.md`](../c4/03-componentes.md#tokens-used-by-the-four-spec-sheets):

| Semantic Token | Hex | Contrast on `#030712` | Contrast on `#0c1222` | Strict Usage Rule |
| :--- | :--- | :--- | :--- | :--- |
| `--color-alert-green` | `#10b981` | **7.94 : 1** (AAA) | **7.36 : 1** (AAA) | **Nominal** status, `✓` indicators, NASA-STD-3001 range compliance. |
| `--color-alert-yellow` | `#f59e0b` | **9.37 : 1** (AAA) | **8.69 : 1** (AAA) | **Caution** status, `▲` trend, non-interruptive visual advisory. |
| `--color-alert-red` | `#ef4444` | 5.35 : 1 (AA Only) | 4.96 : 1 (AA Only) | **PROHIBITED FOR BODY/READING TEXT.** Reserved exclusively for alarm fills, pulsing borders (`3px`), *glow*, and large graphical icons (`>= 24px`). |
| `--color-alert-red-text` | `#fca5a5` | **10.61 : 1** (AAA) | **9.83 : 1** (AAA) | **MANDATORY for critical alert text**, `✕ Critical` badges, Code Red headlines, and endangered figures ([`ADR-018`](../SDD/08-Architecture-decisions.md#adr-018)). |

> [!CAUTION]
> **Prohibition on pure red text (`#ef4444`)**: On dark aerospace panels `#0c1222`, `#ef4444` drops to `4.96:1`, which is insufficient under orbital visual fatigue or red night-lighting. All text inside a critical alert must use `--color-alert-red-text` (`#fca5a5`).

---

## 2. Dual-Coding System (*Color-Blindness & Night 630nm*)

Under **630 nm** red cabin night-lighting or for users with deuteranopia/protanopia, green/yellow/red color discrimination collapses. ASTHA enforces **visual dual coding** on every state:

| Severity Level | Color Token | Mandatory Symbol | Geometric Border/Fill Pattern | Acoustic Behavior ([`ADR-013`](../SDD/08-Architecture-decisions.md#adr-013)) |
| :--- | :--- | :--- | :--- | :--- |
| **Nominal** | `#10b981` | `✓ Nominal` | Solid `1px` border | Complete silence. |
| **Caution** | `#f59e0b` | `▲ Caution` | Solid `2px` border + subtle diagonal stripe | Complete silence (static visual notice in header). |
| **Critical (*Warning / Code Red*)** | `#ef4444` / `#fca5a5` | `✕ Critical` | `3px` border + subtle grid/reticle + soft pulse (`<= 1.5 Hz`, honoring `prefers-reduced-motion`) | Intermittent **960 Hz** tone (`0-10s` local -> `2m` CMO -> `5m` Cabin). |

---

## 3. Typography, Numeric Scale & Zero External Dependencies (`ADR-003`)

Due to the strict offline deep-space operating constraint prohibiting network font downloads ([`ADR-003`](../SDD/08-Architecture-decisions.md#adr-003)), ASTHA **never loads Google Fonts in production** and uses native operating system font stacks:

```css
:root {
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
}
```

| Typographic Role | Family | Size / Weight | Numeric Rule |
| :--- | :--- | :--- | :--- |
| **Primary Biometric Value** | `--font-mono` | `2rem` (`32px`) / `700` | Mandatory `font-variant-numeric: tabular-nums` (prevents horizontal jitter when telemetry refreshes every second). |
| **Unit & NASA-STD-3001 Range** | `--font-mono` | `0.75rem` (`12px`) / `500` | Color `#94a3b8` (`slate-400`), always right-aligned next to the value. |
| **Technical / Blueprint Label** | `--font-mono` | `0.6875rem` (`11px`) / `700` | Uppercase + `letter-spacing: 0.08em`. |
| **Operational Copy & Checklist** | `--font-sans` | `0.875rem`–`1rem` (`14px`–`16px`) / `500` | Minimum line-height `1.5`, maximum line length `65 ch`. |
| **Alarm / Code Red Headline** | `--font-sans` | `1.25rem`–`1.5rem` (`20px`–`24px`) / `700` | Color `--color-alert-red-text` (`#fca5a5`). |

---

## 4. Spacing, Touch Geometry & Special Power Modes

| Geometric Parameter | Normative Value | Reference |
| :--- | :--- | :--- |
| **Minimum touch target area (*Touch Target*)** | `min-width: 48px; min-height: 48px;` | `RNF-USA-01` (updated over `wireframe.html` `.touch-target`) |
| **Minimum inter-control spacing (*Gap*)** | `12px` (`0.75rem`) | `RNF-USA-01` (prevents double-taps in microgravity) |
| **Operational console border radius** | `8px` (`0.5rem`) cards · `6px` (`0.375rem`) buttons | Visual consistency without distorting 12-column grids |
| **Cabin Night Mode (630 nm)** | CSS filter `night-red-630` with blue/green channel attenuation | Crew circadian rhythm protection |
| **Survival Mode (`< 350 mW`, `ADR-019`)** | Pure `#000000` background, monochrome `#e2e8f0` / `#fca5a5` text, **0 animations**, Three.js and uPlot disabled (tabular read-only) | [`ADR-019`](../SDD/08-Architecture-decisions.md#adr-019) |

---

## 5. Acoustic Specification & ARIA Accessibility (`RNF-USA-04`)

- **Local Web Audio API Synthesis**: Direct generation via `OscillatorNode` at **960 Hz** (smoothed sine wave with ADSR envelope, zero external `.mp3`/`.wav` files, guaranteeing offline operation).
- **Escalation Pattern (`ADR-013`)**:
  1. **`0–10 s` (Local)**: Intermittent pulse on the crew member's console with a visible `Mute` button ($48 \times 48\text{ px}$).
  2. **`2 min` (CMO / Flight Surgeon)**: If unacknowledged (*No Ack*), escalates visual and audio alert to the onboard medical role.
  3. **`5 min` (Full Cabin)**: Global broadcast to all bulkhead monitors (`View B`).
- **Screen readers & focus**: Every critical alert mounts `role="alert"` and `aria-live="assertive"`; caution controls use `aria-live="polite"` and focus rings `outline: 3px solid #38bdf8; outline-offset: 2px;`.

---

## 6. Canonical Design Tokens Snippet (`tokens.css`)

```css
:root {
  /* Surfaces */
  --space-950: #030712;
  --space-900: #060913;
  --space-800: #0c1222;
  --blueprint-bg: #040915;
  --blueprint-line: #79a7df;
  --blueprint-text: #9fc5f8;

  /* Accents & Traffic Lights */
  --cyan-400: #38bdf8;
  --alert-green: #10b981;
  --alert-yellow: #f59e0b;
  --alert-red: #ef4444;       /* Fills, borders, and large icons only */
  --alert-red-text: #fca5a5;  /* Critical text WCAG AAA (10.61:1) */

  /* Touch Geometry RNF-USA-01 */
  --touch-min: 48px;
  --touch-gap: 12px;
}
```
