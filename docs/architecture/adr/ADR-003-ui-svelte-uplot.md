# ADR-003: UI compilada: Svelte 5, uPlot y fuentes del sistema

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-POW-01..04, RNF-PER-02, RF-DSH-01..04

## Contexto
RNF-POW-01..04 fija CPU ≤ 3 %, < 350 mW, RAM ≤ 150 MB y bundle ≤ 5 MB; RNF-PER-02 exige arranque < 1,5 s. El prototipo carga Tailwind, Chart.js y Lucide desde CDN.

## Decisión
Svelte 5 (compilado, sin VDOM) para la UI, uPlot en canvas 2D para las series, fuentes del sistema y CSS propio con los tokens del WIREFRAME.

## Consecuencias
- Runtime de pocas decenas de KB.
- Solo se actualizan los nodos que cambian.
- Hay que reescribir index.html.
- Las bandas de umbral de uPlot se dibujan con hooks propios.

## Alternativas
React + Recharts; JavaScript sin framework + Chart.js; Preact + Chart.js.
