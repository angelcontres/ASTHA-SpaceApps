# ADR-011: Deriva por Z-score modificado (MAD)

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RF-DER-01..04, D-01..D-03, RNF-PER-01 · AC-CLIN-02

## Contexto
RF-DER-03 usa un z clásico (media y desviación de los días 1-14), mientras que RNF-PER-01, el README y AC-CLIN-02 citan el Z modificado de Hoaglin e Iglewicz. Con pocos días, la media es sensible a valores atípicos.

## Decisión
Se usa M = 0,6745·(x − mediana)/MAD sobre la línea base de los días 1-14, con alerta precoz si |M| ≥ 2,5. Se mantienen la regresión de 7 días (D-01) y el patrón combinado (D-03).

## Consecuencias
- Línea base robusta a valores atípicos.
- Hay que actualizar RF-DER-03 y D-02 en el SRS.
- Si MAD = 0 (serie constante) no se emite alerta D-02.
- Coste mínimo: la mediana se calcula una vez.

## Alternativas
Z clásico del SRS; ambos z en paralelo; solo regresión sin z.
