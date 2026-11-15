# ADR-012: Acceso a datos médicos según el Privacy Act de 1974 y HIPAA

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-SEC-01, RNF-SEC-02, RNF-NET-04, RF-REG-02

## Contexto
RNF-SEC-02 pide RBAC local sin definir el mecanismo. El Privacy Act de 1974 y HIPAA restringen el acceso al personal médico autorizado y al propio astronauta, exigen anonimizar cualquier uso externo y prevén repositorios seguros como el LSAH.

## Decisión
Cada tripulante tiene su propia clave de datos, envuelta con su PIN y con el del CMO. Solo el dueño y el personal médico descifran. Las exportaciones para usos no médicos se anonimizan.

## Consecuencias
- El aislamiento es criptográfico, no solo de interfaz.
- El aprovisionamiento es más complejo (ADR-020).
- El Hub y las pantallas de cabina no pueden leer datos clínicos.
- Falta definir el formato de anonimización.

## Alternativas
Clave común con permisos solo en la interfaz; cifrado solo en reposo, sin separación por tripulante; delegar el control al sistema operativo.
