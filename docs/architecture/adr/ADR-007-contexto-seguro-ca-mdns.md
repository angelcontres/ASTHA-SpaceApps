# ADR-007: Contexto seguro con CA interna y mDNS

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-NET-03, RNF-SEC-01, RNF-PER-02

## Contexto
crypto.subtle y los Service Workers exigen HTTPS. RNF-NET-03 pide descubrimiento en menos de 3 s sin configurar IP a mano. En la nave no hay ninguna CA pública alcanzable.

## Decisión
El Hub sirve https://astha.local con un certificado de una CA interna de la nave, cuya raíz se instala en cada dispositivo, y anuncia astha.local por mDNS.

## Consecuencias
- Mismo origen en todos los dispositivos.
- Falta definir aprovisionamiento y rotación (GAP).
- Depende de que el SO resuelva .local.
- Sin Hub, la PWA ya instalada sigue operativa.

## Alternativas
Certificado autofirmado por dispositivo; http://localhost en cada dispositivo; IP fija con certificado.
