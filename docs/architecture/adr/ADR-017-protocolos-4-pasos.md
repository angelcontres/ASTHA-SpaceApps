# ADR-017: Protocolos de contramedida de 4 pasos como máximo

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-USA-05, RF-GUI-01..04 · AC-CLIN-06

## Contexto
RNF-USA-05 permite hasta 7 pasos por procedimiento; AC-CLIN-06 limita a 4. Los tripulantes actúan bajo estrés, fatiga y con guantes, y cada paso extra aumenta la carga cognitiva.

## Decisión
Cada protocolo tiene como máximo 4 pasos accionables, con los tres bloques de RF-GUI-01. Si una contramedida necesita más, se divide en protocolos encadenados.

## Consecuencias
- Prevalece AC-CLIN-06 sobre el SRS (excepción registrada, ADR-001).
- Hay que actualizar RNF-USA-05.
- El Countermeasure Resolver valida ≤ 4 pasos.
- SPE y LBNP pueden necesitar encadenarse.

## Alternativas
7 pasos (SRS); 4 en emergencia y 7 en rutina; sin límite fijo.
