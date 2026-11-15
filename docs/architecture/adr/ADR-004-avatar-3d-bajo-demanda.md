# ADR-004: Avatar 3D con Three.js renderizado bajo demanda

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RF-ANA-01..04, RNF-POW-01, RNF-POW-04 · SPEC §2 y §4.2

## Contexto
El equipo exige el avatar 3D (SPEC); el SRS solo pide un cuerpo interactivo frontal y posterior. El prototipo dibuja en bucle continuo con auto-rotación, lo que es incompatible con CPU ≤ 3 % y cero polling.

## Decisión
Three.js empaquetado en local, solo en el Anatomy Viewer, un contexto WebGL y un frame por cambio. Pulsos de alerta en capa HTML y respaldo SVG.

## Consecuencias
- 0 frames/s en monitoreo pasivo.
- +150-180 KB gzip al bundle.
- RAM por medir.
- Sin auto-rotación.
- El resumen de tripulación usa SVG.

## Alternativas
Avatar solo SVG; 3D en consola y SVG en tabletas; sprites o vídeo prerenderizado.
