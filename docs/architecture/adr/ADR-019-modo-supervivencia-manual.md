# ADR-019: Modo supervivencia energética activado a mano

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-POW-01, RNF-POW-02 · CU-12, AC-TECH-02 §3

## Contexto
CU-12 y AC-TECH-02 piden reducir el consumo al recibir una señal de batería crítica del EPS. No está en el SRS y el navegador no puede recibir esa señal de la nave.

## Decisión
El Comandante activa un "modo supervivencia": sin avatar 3D ni gráficas, brillo reducido por CSS y sync solo por eventos críticos. El triage y las alarmas siguen intactos. Más adelante, el Hub podrá reenviar la señal del EPS.

## Consecuencias
- Sin dependencia del hardware de la nave.
- Hay que añadir el requisito al SRS y ajustar CU-12.
- La activación depende de una persona.
- El reenvío por el Hub queda como trabajo futuro.

## Alternativas
Fuera de alcance; Battery Status API del dispositivo; señal del EPS vía Hub desde el inicio.
