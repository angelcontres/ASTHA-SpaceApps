# Registro de decisiones de arquitectura (ADR) — ASTHA

Cada ADR tiene cuatro secciones: **Contexto**, **Decisión**, **Consecuencias** (viñetas) y **Alternativas** (separadas por punto y coma). Cada sección ocupa 50 palabras como máximo (80 en casos excepcionales). Los IDs de requisitos son los del SRS ([ADR-001](ADR-001-fuente-de-autoridad.md)). El modelo C4 está en [../c4/](../c4/00-README.md).

Estados: **Propuesto** (borrador para revisar) · **Aceptado** · **Pendiente** (falta una respuesta del equipo) · **Reemplazado**.

## Decisiones redactadas

| ADR | Título | Estado |
| --- | --- | --- |
| [001](ADR-001-fuente-de-autoridad.md) | Fuente de autoridad de requisitos | Aceptado |
| [002](ADR-002-nodo-autonomo-offline.md) | Nodo autónomo offline-first sin WAN | Aceptado |
| [003](ADR-003-ui-svelte-uplot.md) | UI compilada: Svelte 5, uPlot y fuentes del sistema | Aceptado |
| [004](ADR-004-avatar-3d-bajo-demanda.md) | Avatar 3D con Three.js renderizado bajo demanda | Aceptado |
| [005](ADR-005-engine-en-workers.md) | Cómputo clínico en Web Workers dirigido por eventos | Aceptado |
| [006](ADR-006-indexeddb-webcrypto.md) | Persistencia IndexedDB cifrada con Web Crypto | Aceptado |
| [007](ADR-007-contexto-seguro-ca-mdns.md) | Contexto seguro con CA interna y mDNS | Aceptado |
| [008](ADR-008-sync-hub-opcional.md) | Sincronización en estrella con un Sync Hub opcional | Aceptado |
| [009](ADR-009-crdt-hlc-version-vector.md) | CRDT con reloj híbrido y version vector | Aceptado |
| [010](ADR-010-enlace-tierra-json-firmado.md) | Enlace con Tierra: JSON firmado fuera del sistema | Aceptado |
| [011](ADR-011-deriva-z-modificado-mad.md) | Deriva por Z-score modificado (MAD) | Aceptado |
| [012](ADR-012-acceso-privacy-act-hipaa.md) | Acceso a datos médicos según el Privacy Act de 1974 y HIPAA | Aceptado |
| [013](ADR-013-escalada-alarmas.md) | Escalada de alarmas críticas no reconocidas | Aceptado |
| [014](ADR-014-pantallas-cabina-semaforo.md) | Pantallas de cabina: hábitat y semáforo global | Aceptado |
| [015](ADR-015-arranque-hasta-bloqueo.md) | Arranque medido hasta la pantalla de bloqueo | Aceptado |
| [016](ADR-016-telemetria-diaria.md) | Telemetría fisiológica con un registro diario | Aceptado |
| [017](ADR-017-protocolos-4-pasos.md) | Protocolos de contramedida de 4 pasos como máximo | Aceptado |
| [018](ADR-018-paleta-rojo-texto.md) | Rojo de texto separado del rojo de alarma | Aceptado |
| [019](ADR-019-modo-supervivencia-manual.md) | Modo supervivencia energética activado a mano | Aceptado |
| [020](ADR-020-aprovisionamiento-en-tierra.md) | Aprovisionamiento de dispositivos en Tierra antes del vuelo | Aceptado |

## Backlog de brechas

Vacío. Si aparecen brechas nuevas, se añaden aquí con el siguiente número libre.
