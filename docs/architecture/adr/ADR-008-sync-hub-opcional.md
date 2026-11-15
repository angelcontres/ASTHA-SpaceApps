# ADR-008: Sincronización en estrella con un Sync Hub opcional

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-NET-01..03 · CU-10, HU-15, AC-TECH-04

## Contexto
CU-10, HU-15 y AC-TECH-04 piden una malla P2P sin punto único de fallo (Gossip UDP, BLE mesh), pero un navegador no tiene acceso a UDP ni a BLE mesh. RNF-NET-01 sí admite WebSockets locales.

## Decisión
Un único Sync Hub en Rust, opcional, en estrella: los dispositivos le envían deltas CRDT por WSS (astha.local). Si el Hub cae, cada dispositivo sigue autónomo y converge al volver.

## Consecuencias
- El Hub es punto único de fallo solo para la convergencia, no para el triage.
- Hay que corregir CU-10, HU-15 y AC-TECH-04.
- Un solo host adicional: poco hardware y poco consumo.

## Alternativas
Dos Hubs replicados; malla WebRTC con servidor de señalización; app nativa con BLE mesh.
