# ADR-018: Rojo de texto separado del rojo de alarma

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-USA-03, RF-ANA-03 · WIREFRAME §4.1

## Contexto
RNF-USA-03 exige un contraste ≥ 7:1 (WCAG AAA). El token alert-red (#ef4444) del WIREFRAME da 5,35:1 sobre el fondo y 4,96:1 sobre las tarjetas, así que no sirve para texto.

## Decisión
#ef4444 se reserva para rellenos, bordes y el pulso. Un nuevo token, alert-red-text (#fca5a5, 10,6:1), se usa para todo texto en estado crítico.

## Consecuencias
- El rojo de alarma no cambia.
- Todo el texto crítico cumple AAA.
- Hay que añadir el token al WIREFRAME §4.1.
- En el modo espectral rojo siguen siendo obligatorios el símbolo y el patrón.

## Alternativas
Aclarar alert-red a #f87171; mantener #ef4444 con excepción AA; texto blanco sobre fondo rojo.
