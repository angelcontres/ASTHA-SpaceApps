# ADR-014: Pantallas de cabina: hábitat y semáforo global

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RF-DSH-03, RF-DSH-04, RNF-SEC-02 · ADR-012

## Contexto
ADR-012 limita los datos clínicos al dueño y al personal médico. Las pantallas de cabina las ve toda la tripulación y no tienen claves de tripulante. Hay que decidir qué muestran sin vulnerar el Privacy Act.

## Decisión
Muestran la telemetría ECLSS/CANS y un semáforo Nominal/Precaución/Crítico por tripulante, sin valores, regla ni sistema de órganos. El estado global viaja en un registro aparte, cifrado con la clave de hábitat.

## Consecuencias
- Conciencia situacional de toda la tripulación.
- Se divulga un dato mínimo identificable, aceptado a propósito.
- El Engine debe publicar un registro solo de estado.
- Las pantallas nunca reconocen alertas.

## Alternativas
Solo hábitat; hábitat y estado anónimo; pantallas con los datos completos.
