# 🎨 Diseño UI/UX, Wireframes, Mockups y Guía de Estilo — ASTHA
### Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
**Estándares:** NASA-STD-3001 Vol 2 (Human Factors) | MIL-STD-1472H | ISO 9241-11 | WCAG 2.1 AAA | **ADRs:** [003](../SDD/08-Architecture-decisions.md#adr-003), [004](../SDD/08-Architecture-decisions.md#adr-004), [013](../SDD/08-Architecture-decisions.md#adr-013), [014](../SDD/08-Architecture-decisions.md#adr-014), [015](../SDD/08-Architecture-decisions.md#adr-015), [017](../SDD/08-Architecture-decisions.md#adr-017), [018](../SDD/08-Architecture-decisions.md#adr-018), [019](../SDD/08-Architecture-decisions.md#adr-019)

---

## 🎯 Propósito y Prototipo Base de Referencia

Esta colección formaliza la ingeniería de interfaz y experiencia de usuario (**UI/UX**) de **ASTHA**, partiendo directamente del prototipo interactivo de arquitectura visual construido en **[wireframe.html](../../wireframe.html)** y su implementación táctica en **[index.html](../../index.html)**.

Todas las decisiones visuales y ergonómicas están estrictamente alineadas con el **SRS (§4.2 `RNF-USA-01..05`)**, la especificación de diseño de componentes **[C4-03](../c4/03-componentes.md)** y los **ADRs** del proyecto (cero desfase).

---

## 📂 Estructura Modular de Documentación UI/UX

| Documento | Alcance Técnico | Trazabilidad Clave |
| :--- | :--- | :--- |
| [**README.md**](README.md) | Índice maestro, enlaces a prototipos interactivos y tabla de alineación normativa | `NASA-STD-3001 Vol 2`, `MIL-STD-1472H` |
| [**01-Wireframes-y-Arquitectura-de-Pantalla.md**](01-Wireframes-y-Arquitectura-de-Pantalla.md) | Wireframes estructurales basados en `wireframe.html`: Grilla 12-Col (`COMP-00` a `COMP-06`), Vista Código Rojo, Pantalla de Bloqueo (`< 1.5s`) y Pantallas de Cabina | `ADR-014`, `ADR-015`, `RNF-USA-02`, `RF-DSH-01..04` |
| [**02-Guia-de-Estilo-y-Design-System.md**](02-Guia-de-Estilo-y-Design-System.md) | Tokens de color OLED/Blueprint, contraste WCAG AAA (`#fca5a5`), Modo Espectral Rojo 630 nm, Doble Codificación, pilas tipográficas del sistema, dianas táctiles $\ge 48\text{ px}$ / $12\text{ px}$ gap y audio 960 Hz | `ADR-003`, `ADR-018`, `RNF-USA-01`, `RNF-USA-03`, `RNF-USA-04` |
| [**03-Mockups-y-Especificacion-de-Componentes.md**](03-Mockups-y-Especificacion-de-Componentes.md) | Mockups de alta fidelidad (Tablero Táctico, Triage 3D Bajo Demanda + Acordeón, Guía $\le 4$ pasos, Modales, Modo Zen y Modo Supervivencia `< 5W`) con matriz completa de estados y accesibilidad | `ADR-004`, `ADR-013`, `ADR-017`, `ADR-019`, `C4-03` |

---

## 🌐 Prototipos Interactivos en Vivo

* **📐 Wireframe & Blueprint Interactivo (Baja Fidelidad / Cotas / Crisis):**  
  [Abrir `wireframe.html` local](../../wireframe.html) · [Ver en GitHub Pages](https://angelcontres.github.io/AstroVital-SpaceApps/wireframe.html)
* **🚀 Mockup Funcional / Dashboard Táctico Hi-Fi (Three.js + Modales + Simulador):**  
  [Abrir `index.html` local](../../index.html) · [Ver en GitHub Pages](https://angelcontres.github.io/AstroVital-SpaceApps/)
