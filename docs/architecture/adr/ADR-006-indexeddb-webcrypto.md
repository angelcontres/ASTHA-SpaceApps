# ADR-006: Persistencia IndexedDB cifrada con Web Crypto

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Requisitos:** RNF-SEC-01, RNF-SEC-03, RNF-SEC-04, SRS §5.2 · AC-TECH-06

## Contexto
RNF-SEC-01 exige AES-GCM 256 con crypto.subtle, RNF-SEC-03 SHA-256 por registro y RNF-SEC-04 una bitácora append-only. AC-TECH-06 menciona SQLite/SQLCipher, que en el navegador exige WASM.

## Decisión
IndexedDB con sobres {id, hlc, autor, iv, ct, sha256, firma}; AES-GCM 256, SHA-256 y Ed25519 nativos; clave derivada del PIN con PBKDF2; bitácora encadenada por dispositivo.

## Consecuencias
- Sin WASM ni librerías criptográficas.
- Exige contexto seguro (HTTPS).
- Ed25519 exige navegadores recientes.
- PBKDF2 puede afectar al arranque (pendiente).

## Alternativas
SQLCipher en WASM; localStorage cifrado; cifrado solo en el Hub.
