# ADR-001: Fuente de autoridad de requisitos

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** SRS §1-§8 · RTM · AC-TECH · CU (carpeta)

## Contexto
El repo tiene IDs que chocan: SRS, RTM, AC-TECH y CU de la carpeta definen RNF-POW, RNF-NET y CU con valores distintos (5 W frente a 350 mW, DTN frente a mDNS). Sin una regla, cada decisión puede apoyarse en un requisito contradictorio.

## Decisión
El SRS prevalece y el documento de dominio fija los umbrales. RTM, AC-TECH, HU y CU se alinean al SRS. Una decisión explícita del equipo puede contradecir al SRS, pero solo si queda registrada en un ADR.

## Consecuencias
- Los ADR y el C4 citan IDs del SRS.
- Hay que corregir RTM, AC-TECH y CU-10..12.
- Las brechas se marcan GAP; no se inventan requisitos.

## Alternativas
Tomar la RTM como autoridad; reescribir el SRS a partir de los AC; mantener ambos catálogos con prefijos distintos.
