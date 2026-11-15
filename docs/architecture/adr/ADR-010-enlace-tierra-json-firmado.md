# ADR-010: Enlace con Tierra: JSON firmado fuera del sistema

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-NET-04, RF-GUI-05, RF-REG-02 · CU-11, HU-14, AC-TECH-05

## Contexto
RNF-NET-04 pide exportar un JSON firmado para la DSN. CU-11, HU-14 y AC-TECH-05 asignan a ASTHA el bundle DTN RFC 5050, una cola de 30 días y la recepción de respuestas.

## Decisión
ASTHA termina en el archivo: el CMO exporta un JSON firmado con Ed25519 y lo entrega al sistema de comunicaciones de la nave, que lo empaqueta y transmite por DTN/DSN.

## Consecuencias
- ASTHA no tiene ninguna ruta de red externa (RNF-NET-01 se verifica fácilmente).
- Sin cola DTN ni recepción de respuestas.
- Hay que corregir CU-11, HU-14 y AC-TECH-05.

## Alternativas
ASTHA genera los bundles DTN y la cola persistente; integración directa con el transpondedor; envío por el Sync Hub.
