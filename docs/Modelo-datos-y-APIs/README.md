# 🗄️ Modelo de Datos y Diseño de APIs — Sistema ASTHA
### Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
**Estándares:** IEEE Std 1016-2009 | OpenAPI 3.1.0 | JSON Schema Draft-07 | **Autoridad:** [SRS](../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md) & [ADRs](../SDD/08-Architecture-decisions.md)

---

## 🎯 Propósito de esta Colección

Este directorio formaliza el **Modelo de Datos** (conceptual, lógico y físico en IndexedDB cifrado + Op-Log del Sync Hub) y los **Contratos de API e Interfaces** de **ASTHA**, manteniendo **cero desfase** con la especificación **SRS §5**, el **Modelo C4** ([docs/c4/](../c4/00-README.md)), el **SDD v3.0.0** ([docs/SDD/](../SDD/README.md)) y los **20 ADRs** ([SDD-08](../SDD/08-Architecture-decisions.md)).

---

## 📂 Estructura de Archivos

| Archivo | Contenido Técnico | Estándares / ADRs Aplicados |
| :--- | :--- | :--- |
| [**README.md**](README.md) | Índice maestro y arquitectura de persistencia / contratos | `ADR-001`, `SRS §5` |
| [**01-Diagrama-Entidad-Relacion.md**](01-Diagrama-Entidad-Relacion.md) | Diagrama Entidad-Relación (ERD) lógico + Object Stores físicos en IndexedDB + Op-Log en Rust | `ADR-006`, `ADR-008`, `ADR-009`, `ADR-012`, `ADR-014`, `ADR-016` |
| [**02-Diccionario-de-Datos.md**](02-Diccionario-de-Datos.md) | Diccionario completo de campos, tipos, nulabilidad, rangos NASA-STD-3001, cifrado y semántica CRDT | `SRS §6.1`, `RF-ING-01..05`, `RNF-SEC-01..04`, `ADR-011`, `ADR-017` |
| [**03-Contratos-API-OpenAPI-y-Eventos.md**](03-Contratos-API-OpenAPI-y-Eventos.md) | Guía de endpoints REST/HTTPS del Sync Hub (`astha.local`), canal WebSocket de deltas CRDT, contrato de exportación DSN firmado y eventos `postMessage` entre Web Workers | `ADR-005`, `ADR-007`, `ADR-008`, `ADR-010`, `RNF-NET-01..04` |
| [**openapi.yaml**](openapi.yaml) | Especificación formal importable **OpenAPI 3.1.0** (Sync Hub LAN, Ingesta Futura de Sensores y Exportación DSN) | OpenAPI 3.1.0, `ADR-008`, `ADR-010` |

---

## 🔗 Principios de Diseño de Datos e Interfaces (Trazabilidad ADR)

1. **Almacenamiento Cero-Servidor y Cifrado (`ADR-006`, `ADR-012`):** La persistencia primaria reside en el navegador (**IndexedDB**) dentro de sobres cifrados `AES-GCM-256` (`EncryptedEnvelope`) con hash `SHA-256` anti-SEU y clave simétrica envuelta con el PIN del astronauta y del CMO.
2. **Inmutabilidad Clínica y CRDT (`ADR-009`, `RNF-SEC-04`):** Ningún registro médico se edita ni se elimina. Los datos clínicos usan un **G-Set** (*Grow-Only Set*) y bitácora encadenada por hash; preferencias y gamificación usan **LWW-Map (HLC)** y **PN-Counter**.
3. **Frontera Zero-WAN (`ADR-002`, `ADR-008`, `ADR-010`):** Las APIs HTTP/WSS operan exclusivamente dentro de la red LAN aislada de la nave (`https://astha.local`, certificado de CA interna `ADR-007`). El envío hacia Houston termina en la exportación local de un JSON firmado con **Ed25519** entregado al sistema DTN externo de la nave.
4. **Cómputo Desacoplado en Workers (`ADR-005`):** Toda comunicación entre la interfaz Svelte 5 y los algoritmos clínicos o criptográficos ocurre mediante contratos de mensajes asíncronos (`postMessage` / `MessageChannel`) sin llamadas de red desde el motor clínico.
