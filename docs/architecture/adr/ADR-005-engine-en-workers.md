# ADR-005: Cómputo clínico en Web Workers dirigido por eventos

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-PER-01, RNF-POW-01, RF-EVA-07

## Contexto
RNF-PER-01 pide triage < 50 ms y RNF-POW-01 prohíbe el polling; el propio SRS sugiere Web Workers. El prototipo calcula en el hilo principal con timers.

## Decisión
Dos Dedicated Workers: Clinical Engine (TypeScript puro, reglas como datos) y Data y Sync. Se comunican por postMessage; nada se ejecuta sin un evento.

## Consecuencias
- El hilo principal solo pinta.
- Engine determinista y testeable.
- Coste de serializar mensajes ~1 ms.
- fetch y WebSocket prohibidos en el engine (lint).

## Alternativas
Todo en el hilo principal; un solo worker; SharedWorker común a todas las pestañas.
