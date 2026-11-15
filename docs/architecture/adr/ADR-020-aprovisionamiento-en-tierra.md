# ADR-020: Aprovisionamiento de dispositivos en Tierra antes del vuelo

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-SEC-01, RNF-SEC-02, RNF-NET-03 · ADR-007, ADR-012

## Contexto
ADR-007 y ADR-012 exigen una CA interna, claves Ed25519 por dispositivo y claves por tripulante envueltas con PIN. Ninguna fuente define quién lo instala ni cuándo, y a bordo no hay soporte técnico.

## Decisión
Ingeniería prepara cada dispositivo en Tierra: raíz de la CA, PWA instalada, clave del dispositivo inscrita en el Hub y claves por tripulante envueltas con los PIN. En vuelo, el CMO solo reemplaza tabletas con un procedimiento definido.

## Consecuencias
- La tripulación no gestiona criptografía.
- Hace falta un procedimiento de reemplazo a bordo.
- El cambio de PIN en vuelo debe re-envolver claves.
- Hay que añadir el requisito al SRS.

## Alternativas
A bordo por el CMO; mixto (CA en Tierra, inscripción a bordo); sin claves por tripulante.
