# ADR-013: Escalada de alarmas críticas no reconocidas

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-USA-04, RF-GAM-03, RF-EVA-06

## Contexto
RNF-USA-04 define tono de 800-1200 Hz para críticos y precaución sin sonido, pero no qué hacer si nadie reconoce la alerta. Un tono continuo provoca fatiga; uno único puede pasar desapercibido.

## Decisión
Un crítico suena 10 s. Si a los 2 min nadie lo ha reconocido, vuelve a sonar y se replica en la consola del CMO. A los 5 min se avisa también en las pantallas de cabina.

## Consecuencias
- Hay que añadir el requisito al SRS.
- La réplica al CMO y a cabina depende del Hub (ADR-008).
- Sin Hub, la escalada es solo local.
- El reconocimiento queda en la bitácora.

## Alternativas
Sonar hasta reconocer; sonar una sola vez; escalar al Comandante.
