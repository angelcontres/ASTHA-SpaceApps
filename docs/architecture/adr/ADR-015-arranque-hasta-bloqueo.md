# ADR-015: Arranque medido hasta la pantalla de bloqueo

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-PER-02, RNF-SEC-01, RNF-SEC-02 · ADR-012, ADR-014

## Contexto
RNF-PER-02 exige el panel en menos de 1,5 s, pero ADR-012 obliga a desbloquear con PIN y PBKDF2 puede tardar cientos de ms. Bajar las iteraciones debilita el cifrado.

## Decisión
Los 1,5 s se miden hasta la pantalla de bloqueo, que ya muestra el hábitat y el semáforo global (ADR-014). El panel personal se abre tras el PIN, fuera de ese presupuesto.

## Consecuencias
- PBKDF2 conserva iteraciones altas.
- La conciencia situacional está disponible antes del PIN.
- Hay que precisar RNF-PER-02 en el SRS.
- Falta un presupuesto para el desbloqueo (propuesta: < 1 s).

## Alternativas
Sesión persistente hasta reiniciar; PIN dentro de los 1,5 s con menos iteraciones; sin PIN, con la clave del dispositivo.
