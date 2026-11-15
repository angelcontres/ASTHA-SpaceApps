# 📖 Diccionario de Datos Formal — ASTHA
### Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
**Autoridad de Umbrales:** [SRS §6.1](../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md) & [Documento de Dominio](../DOCUMENTO_DOMINIO_Y_PROBLEMATICA_ESPACIAL.md) · **ADRs:** [006](../SDD/08-Architecture-decisions.md#adr-006), [009](../SDD/08-Architecture-decisions.md#adr-009), [012](../SDD/08-Architecture-decisions.md#adr-012), [016](../SDD/08-Architecture-decisions.md#adr-016), [017](../SDD/08-Architecture-decisions.md#adr-017)

---

## 1. Entidad: `CREW_MEMBER` (Tripulante)

| Campo | Tipo | Nulo | Restricciones / Dominio | Cifrado / CRDT | Descripción y Trazabilidad |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `crew_id` | `string (4)` | NO | PK · `ENUM('C001','C002','C003','C004')` | Metadato | Identificador único del astronauta (`SRS §5.1`). |
| `full_name` | `string (100)` | NO | Longitud $2..100$ | Cifrado / Estático | Nombre completo del tripulante. |
| `role` | `string (20)` | NO | `ENUM('ASTRONAUT','CMO','COMMANDER')` | Metadato | Rol operativo para segregación RBAC (`RNF-SEC-02`). |
| `level` | `integer` | NO | $\ge 1$ | Derivado de `xp_total` | Nivel de gamificación actual (`RF-GAM-02`). |
| `xp_total` | `integer` | NO | $\ge 0$ | `PN-Counter` (`ADR-009`) | Puntos de experiencia acumulados sin colisiones multi-nodo (`RF-GAM-01`). |
| `streak_days` | `integer` | NO | $0..180$ | `G-Set` derivado | Días consecutivos cumpliendo hábitos de vuelo (`RF-GAM-02`). |
| `global_status` | `string (10)` | NO | `ENUM('NOMINAL','CAUTION','CRITICAL')` | Clave Hábitat (`ADR-014`) | Peor estado entre todos los indicadores y reglas (`RF-EVA-02`). |
| `pin_salt` | `string (32)` | NO | Hex 128-bit aleatorio | Base64 local | Sal criptográfica única para derivación PBKDF2 (`ADR-006`). |

---

## 2. Entidad: `DAILY_MEASUREMENT` (Medición Fisiológica Diaria)

Contiene las **9 variables biométricas obligatorias** de `RF-ING-01` más el biomarcador renal opcional (`SRS §6.1`). Opera bajo la regla de 1 registro diario + inyecciones de simulador (`ADR-016`).

| Campo | Tipo | Nulo | Rango Plausible (`RF-ING-05`) | Umbrales Clínicos `NASA-STD-3001` (`SRS §6.1`) | Cifrado / CRDT |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `measurement_id` | `uuid v4` | NO | PK único global | — | `G-Set` (`ADR-009`) |
| `crew_id` | `string (4)` | NO | FK $\to$ `CREW_MEMBER` | — | AES-GCM 256 (`ADR-006`) |
| `mission_day` | `integer` | NO | $1..180$ | — | AES-GCM 256 |
| `hr_bpm` | `integer` | NO | $25..220\text{ bpm}$ | **Nom:** 55–85 \| **Prec:** 45–54, 86–105 \| **Crít:** $< 45$ o $> 110$ | AES-GCM 256 |
| `hrv_rmssd_ms` | `float` | NO | $5.0..200.0\text{ ms}$ | **Nom:** 35–70 \| **Prec:** 20–34 \| **Crít:** $< 20$ ($\ge 2\text{ días}$, `RF-EVA-05`) | AES-GCM 256 |
| `pas_mmhg` | `integer` | NO | $60..260\text{ mmHg}$ | **Nom:** 105–125 \| **Prec:** 126–139 \| **Crít:** $\ge 140$ | AES-GCM 256 |
| `pad_mmhg` | `integer` | NO | $35..160\text{ mmHg}$ | **Nom:** 65–84 \| **Prec:** 85–89 \| **Crít:** $\ge 90$ | AES-GCM 256 |
| `spo2_pct` | `float` | NO | $65.0..100.0\%$ | **Nom:** 96–100 \| **Prec:** 93–95 \| **Crít:** $< 93$ | AES-GCM 256 |
| `glucose_mg_dl` | `float` | NO | $30.0..400.0\text{ mg/dL}$ | **Nom:** 75–105 \| **Prec:** 65–74, 106–125 \| **Crít:** $< 65$ o $> 140$ | AES-GCM 256 |
| `temp_c` | `float` | NO | $34.0..42.0\text{ °C}$ | **Nom:** 36.2–37.3 \| **Prec:** 37.4–37.9 \| **Crít:** $\ge 38.0$ | AES-GCM 256 |
| `sleep_hours` | `float` | NO | $0.0..24.0\text{ h}$ | **Nom:** 7.0–8.5 \| **Prec:** 5.5–6.9 \| **Crít:** $< 5.5$ ($\ge 2\text{ días}$) | AES-GCM 256 |
| `mood_score` | `integer` | NO | $1..10$ | **Nom:** 7–10 \| **Prec:** 4–6 \| **Crít:** 1–3 | AES-GCM 256 |
| `urinary_calcium_mg` | `float` | SÍ | $0.0..1000.0\text{ mg/día}$ | **Nom:** $< 250$ \| **Prec:** 250–300 \| **Crít:** $> 300$ | AES-GCM 256 |
| `is_suspect` | `boolean` | NO | Default `false` | `true` si algún valor sale de rango plausible (**se marca sin descartar**, `RF-ING-05`) | AES-GCM 256 |
| `hlc_timestamp` | `string` | NO | Formato `ms:cnt:node` | Reloj Lógico Híbrido para orden causal (`ADR-009`) | Metadato |
| `recorded_at` | `datetime` | NO | ISO 8601 UTC | Marca temporal física de captura | AES-GCM 256 |

---

## 3. Entidad: `HABITAT_TELEMETRY` (Telemetría Ambiental ECLSS / CANS)

| Campo | Tipo | Nulo | Umbrales `NASA-STD-3001` (`SRS §6.1`) | Cifrado / Visibilidad | Descripción |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `habitat_id` | `uuid v4` | NO | PK | Clave Hábitat (`ADR-014`) | Identificador único del muestreo de cabina. |
| `mission_day` | `integer` | NO | $1..180$ | Clave Hábitat | Día de misión correspondiente. |
| `pp_co2_mmhg` | `float` | NO | **Nom:** $< 2.0$ \| **Prec:** $2.0–3.0$ \| **Crít:** $> 3.0$ | Clave Hábitat | Presión parcial de $CO_2$ en cabina (`RF-ING-02`). |
| `cabin_pressure_kpa` | `float` | NO | **Nom:** $97.9..102.7\text{ kPa}$ ($14.2–14.9\text{ psi}$) | Clave Hábitat | Presión barométrica total de hábitat. |
| `o2_pct` | `float` | NO | **Nom:** $19.5..23.5\%$ | Clave Hábitat | Porcentaje estequiométrico de oxígeno en cabina. |
| `radiation_usv_h` | `float` | NO | **Nom:** $15–35$ \| **Prec:** $36–100$ \| **Crít:** $> 100$ | Clave Hábitat | Tasa de dosis combinada + neutrones CANS ($\mu\text{Sv/h}$). |
| `habitat_status` | `string (10)` | NO | `ENUM('NOMINAL','CAUTION','CRITICAL')` | Público en Cabina | Estado consolidado mostrado en pantallas de cabina (`ADR-014`). |
| `hlc_timestamp` | `string` | NO | `ms:cnt:node` | Metadato | Reloj híbrido (`ADR-009`). |

---

## 4. Entidad: `SUBJECTIVE_SYMPTOM` (Síntomas Subjetivos)

| Campo | Tipo | Nulo | Restricciones | Cifrado / CRDT | Descripción |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `symptom_id` | `uuid v4` | NO | PK | `G-Set` (`ADR-009`) | Identificador único del reporte táctil (`RF-ING-04`). |
| `crew_id` | `string (4)` | NO | FK $\to$ `CREW_MEMBER` | AES-GCM 256 (`ADR-012`) | Tripulante que reporta el síntoma. |
| `mission_day` | `integer` | NO | $1..180$ | AES-GCM 256 | Día de misión. |
| `symptom_type` | `string (25)` | NO | `ENUM('blurredVision','headache','nausea','lumbarPain','orthostaticDizziness','extremeFatigue')` | AES-GCM 256 | Catálogo cerrado de 6 síntomas táctiles (SRS §5.1 + `RF-ING-04`). |
| `recorded_at` | `datetime` | NO | ISO 8601 UTC | AES-GCM 256 | Instante del reporte con 1 toque. |

---

## 5. Entidad: `CLINICAL_ALERT` (Alerta Generada por Motor)

| Campo | Tipo | Nulo | Restricciones / Dominio | Cifrado / CRDT | Descripción |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `alert_id` | `uuid v4` | NO | PK | `G-Set` (`ADR-009`) | Identificador único de la alerta. |
| `crew_id` | `string (4)` | NO | FK $\to$ `CREW_MEMBER` | AES-GCM 256 (`ADR-012`) | Tripulante afectado. |
| `rule_id` | `string (20)` | NO | `R-ENV-01..02`, `R-SANS-01..02`, `R-RAD-01..02`, `R-COG-01`, `R-REN-01..02`, `R-CARD-01`, `D-01..03`, `THRESHOLD` | AES-GCM 256 | Regla exacta disparada (explicabilidad `RF-EVA-06`). |
| `organ_system` | `string (25)` | NO | `ENUM('neuro-ocular','cardiovascular','musculoesquelético','renal','cognitivo','radiación','respiratorio/ambiental')` | AES-GCM 256 | Los 7 sistemas anatómicos (`RF-EVA-03`). |
| `severity` | `string (10)` | NO | `ENUM('CAUTION','CRITICAL')` | AES-GCM 256 | Severidad (`RF-EVA-01`). |
| `triggering_values` | `string` | NO | JSON serializado | AES-GCM 256 | Valores exactos que causaron la alerta (`RF-EVA-06`). |
| `threshold_ref` | `string (64)` | NO | Referencia NASA-STD-3001 | AES-GCM 256 | Umbral normativo superado. |
| `acknowledged` | `boolean` | NO | Default `false` | `LWW-Map` (`ADR-009`) | Acuse de recibo del tripulante/CMO (`RNF-USA-04`). |
| `escalation_level` | `integer` | NO | `0` (local), `1` (2 min CMO), `2` (5 min Cabina) | Local / Hub | Nivel de escalada automática (`ADR-013`). |

---

## 6. Entidad: `COUNTERMEASURE_PROTOCOL` y `PROTOCOL_EXECUTION`

| Campo | Tipo | Nulo | Restricciones | Descripción y Trazabilidad |
| :--- | :--- | :---: | :--- | :--- |
| `protocol_id` | `string (32)` | NO | PK | Identificador del catálogo JSON estático (`RF-GUI-03`). |
| `anatomical_impact_block` | `string (300)` | NO | Bloque 1 de `RF-GUI-01` | Explicación anatómica en lenguaje no médico (`RF-GUI-04`). |
| `severity_time_block` | `string (200)` | NO | Bloque 2 de `RF-GUI-01` | Severidad y ventana estimada de impacto clínico. |
| `onboard_resource` | `string (50)` | NO | `ENUM('ARED','LBNP','BOTIQUIN','REFUGIO_SPE','FILTROS_LIOH_CDRA')` | Recurso físico exclusivo de a bordo (`RF-GUI-03`). |
| `steps_max_4` | `json array` | NO | **`1 <= length <= 4`** (`ADR-017`) | Lista secuencial accionable; validada por `CounterResolver` ($\le 4$ pasos). |
| `chained_next_id` | `string (32)` | SÍ | FK $\to$ `COUNTERMEASURE_PROTOCOL` | Encadena un segundo protocolo si la intervención supera 4 pasos (`ADR-017`). |
| `steps_completed` | `json array` | NO | Array booleano `[true, ...]` | Registro verificable paso por paso (`RF-GUI-02`). |
| `xp_awarded` | `integer` | NO | $\ge 0$ | Recompensa enviada al `PN-Counter` (`RF-GAM-01`). |

---

## 7. Entidad Física: `ENCRYPTED_ENVELOPE` y `AUDIT_LEDGER_ENTRY` (`ADR-006`, `RNF-SEC-03/04`)

| Campo | Tipo | Nulo | Especificación Criptográfica (`window.crypto.subtle`) | Propósito |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `uuid v4` | NO | PK en `envelopes_gset` | Identificador único del sobre. |
| `hlc` | `string (40)` | NO | `timestamp_ms:counter:node_id` | Orden total causal (`ADR-009`). |
| `autor` | `string (32)` | NO | ID del dispositivo firmante | Trazabilidad de origen multi-dispositivo. |
| `iv` | `string (16)` | NO | Base64 de 12 bytes (96 bits) | Vector de inicialización único por cifrado AES-GCM. |
| `ct` | `string` | NO | Base64 (`AES-GCM-256`) | Carga útil cifrada con `crewDataKey` (`ADR-012`) o clave de hábitat (`ADR-014`). |
| `sha256` | `string (64)` | NO | Hex 256 bits | Verificación anti-SEU (bit-flips por radiación cósmica, `RNF-SEC-03`). |
| `firma` | `string (128)` | NO | Base64 (`Ed25519`) | Firma digital asimétrica del dispositivo emisor (`ADR-006`). |
| `prev_sha256` | `string (64)` | NO | Hex del registro `seq - 1` | Encadenamiento criptográfico *Append-Only* (`RNF-SEC-04`). |
