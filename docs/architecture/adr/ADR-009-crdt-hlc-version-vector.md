# ADR-009: CRDT con reloj híbrido y version vector

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-NET-02 · CU-10 FA-01, AC-TECH-04

## Contexto
RNF-NET-02 pide fusionar sin pérdida usando "LWW con marcas vectoriales"; CU-10 cita relojes de Lamport y el encargo, un reloj híbrido. LWW necesita orden total; los vectores solo dan un orden parcial.

## Decisión
CRDT propio: G-Set para todo dato clínico, LWW-Map para preferencias y PN-Counter para XP. El HLC (hora, contador, nodo) ordena los LWW; el version vector por nodo decide qué deltas intercambiar.

## Consecuencias
- Ningún dato clínico se sobrescribe: solo se añade.
- Merge idempotente y sin coordinación.
- El HLC tolera relojes desfasados.
- Hay que precisar RNF-NET-02 y CU-10.

## Alternativas
Solo vector clocks; solo Lamport; Automerge o Yjs (más peso en el bundle).
