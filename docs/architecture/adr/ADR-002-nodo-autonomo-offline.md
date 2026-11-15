# ADR-002: Nodo autónomo offline-first sin WAN

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** SRS §1, RF-EVA-07, RNF-NET-01, RNF-NET-02

## Contexto
La nave no tiene Internet y la latencia con Tierra llega a 22 min por sentido. RF-EVA-07 y RNF-NET-01 prohíben paquetes externos. El triage no puede depender de otro dispositivo ni de la red.

## Decisión
Cada dispositivo ejecuta la PWA completa: datos, reglas, catálogos y recursos van en el bundle y los sirve el Service Worker. La LAN solo sincroniza; nunca hace falta para clasificar ni para alertar.

## Consecuencias
- Cero CDN y cero recursos remotos.
- El triage funciona con la LAN caída.
- Hay que quitar los CDN y la consulta remota a OSDR del prototipo.
- La primera instalación necesita el Hub o aprovisionamiento.

## Alternativas
Servidor central en la nave con clientes ligeros; app nativa por plataforma; Electron.
