# 🎨 UI/UX Design, Wireframes, Mockups & Style Guide — ASTHA
### Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
**Standards:** NASA-STD-3001 Vol 2 (Human Factors) | MIL-STD-1472H | ISO 9241-11 | WCAG 2.1 AAA | **ADRs:** [003](../SDD/08-Architecture-decisions.md#adr-003), [004](../SDD/08-Architecture-decisions.md#adr-004), [013](../SDD/08-Architecture-decisions.md#adr-013), [014](../SDD/08-Architecture-decisions.md#adr-014), [015](../SDD/08-Architecture-decisions.md#adr-015), [017](../SDD/08-Architecture-decisions.md#adr-017), [018](../SDD/08-Architecture-decisions.md#adr-018), [019](../SDD/08-Architecture-decisions.md#adr-019)

---

## 🎯 Purpose & Reference Baseline Prototype

This collection formalizes the user interface and user experience (**UI/UX**) engineering of **ASTHA**, building directly on the interactive visual architecture prototype in **[wireframe.html](../../wireframe.html)** and its tactical implementation in **[index.html](../../index.html)**.

All visual and ergonomic decisions are strictly aligned with the **SRS (§4.2 `RNF-USA-01..05`)**, the component design specification **[C4-03](../c4/03-componentes.md)**, and the project **ADRs** (zero drift).

---

## 📂 Modular UI/UX Documentation Structure

| Document | Technical Scope | Key Traceability |
| :--- | :--- | :--- |
| [**README.md**](README.md) | Master index, interactive prototype links, and standards alignment table | `NASA-STD-3001 Vol 2`, `MIL-STD-1472H` |
| [**01-Wireframes-y-Arquitectura-de-Pantalla.md**](01-Wireframes-y-Arquitectura-de-Pantalla.md) | Structural wireframes based on `wireframe.html`: 12-Col Grid (`COMP-00` to `COMP-06`), Code Red View, Lock Screen (`< 1.5s`), and Cabin Displays | `ADR-014`, `ADR-015`, `RNF-USA-02`, `RF-DSH-01..04` |
| [**02-Guia-de-Estilo-y-Design-System.md**](02-Guia-de-Estilo-y-Design-System.md) | OLED/Blueprint color tokens, WCAG AAA contrast (`#fca5a5`), 630 nm Red Spectral Mode, Dual Coding, system font stacks, $\ge 48\text{ px}$ touch targets / $12\text{ px}$ gap, and 960 Hz audio | `ADR-003`, `ADR-018`, `RNF-USA-01`, `RNF-USA-03`, `RNF-USA-04` |
| [**03-Mockups-y-Especificacion-de-Componentes.md**](03-Mockups-y-Especificacion-de-Componentes.md) | High-fidelity mockups (Tactical Dashboard, On-Demand 3D Triage + Accordion, $\le 4$-step Guide, Modals, Zen Mode, and `< 350 mW` Survival Mode) with full state & accessibility matrix | `ADR-004`, `ADR-013`, `ADR-017`, `ADR-019`, `C4-03` |

---

## 🌐 Live Interactive Prototypes

* **📐 Interactive Wireframe & Blueprint (Low-Fidelity / Dimensions / Crisis):**  
  [Open local `wireframe.html`](../../wireframe.html) · [View on GitHub Pages](https://angelcontres.github.io/AstroVital-SpaceApps/wireframe.html)
* **🚀 Functional Mockup / Hi-Fi Tactical Dashboard (Three.js + Modals + Simulator):**  
  [Open local `index.html`](../../index.html) · [View on GitHub Pages](https://angelcontres.github.io/AstroVital-SpaceApps/)
