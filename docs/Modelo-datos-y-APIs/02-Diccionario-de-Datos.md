# 📖 Formal Data Dictionary — ASTHA
### Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
**Threshold Authority:** [SRS §6.1](../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md) & [Domain Document](../DOCUMENTO_DOMINIO_Y_PROBLEMATICA_ESPACIAL.md) · **ADRs:** [006](../SDD/08-Architecture-decisions.md#adr-006), [009](../SDD/08-Architecture-decisions.md#adr-009), [012](../SDD/08-Architecture-decisions.md#adr-012), [016](../SDD/08-Architecture-decisions.md#adr-016), [017](../SDD/08-Architecture-decisions.md#adr-017)

---

## 1. Entity: `CREW_MEMBER`

| Field | Type | Nullable | Constraints / Domain | Encryption / CRDT | Description & Traceability |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `crew_id` | `string (4)` | NO | PK · `ENUM('C001','C002','C003','C004')` | Metadata | Unique astronaut identifier (`SRS §5.1`). |
| `full_name` | `string (100)` | NO | Length $2..100$ | Encrypted / Static | Crew member full name. |
| `role` | `string (20)` | NO | `ENUM('ASTRONAUT','CMO','COMMANDER')` | Metadata | Operational role for RBAC segregation (`RNF-SEC-02`). |
| `level` | `integer` | NO | $\ge 1$ | Derived from `xp_total` | Current gamification level (`RF-GAM-02`). |
| `xp_total` | `integer` | NO | $\ge 0$ | `PN-Counter` (`ADR-009`) | Accumulated experience points without multi-node collisions (`RF-GAM-01`). |
| `streak_days` | `integer` | NO | $0..180$ | Derived `G-Set` | Consecutive days fulfilling flight-health habits (`RF-GAM-02`). |
| `global_status` | `string (10)` | NO | `ENUM('NOMINAL','CAUTION','CRITICAL')` | Habitat Key (`ADR-014`) | Worst status across all indicators and rules (`RF-EVA-02`). |
| `pin_salt` | `string (32)` | NO | Random 128-bit hex | Local Base64 | Unique cryptographic salt for PBKDF2 derivation (`ADR-006`). |

---

## 2. Entity: `DAILY_MEASUREMENT`

Contains the **9 mandatory biometric variables** from `RF-ING-01` plus the optional renal biomarker (`SRS §6.1`). Operates under the 1-record-per-day rule + simulator injections (`ADR-016`).

| Field | Type | Nullable | Plausible Range (`RF-ING-05`) | `NASA-STD-3001` Clinical Thresholds (`SRS §6.1`) | Encryption / CRDT |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `measurement_id` | `uuid v4` | NO | Globally unique PK | — | `G-Set` (`ADR-009`) |
| `crew_id` | `string (4)` | NO | FK $\to$ `CREW_MEMBER` | — | AES-GCM 256 (`ADR-006`) |
| `mission_day` | `integer` | NO | $1..180$ | — | AES-GCM 256 |
| `hr_bpm` | `integer` | NO | $25..220\text{ bpm}$ | **Nom:** 55–85 \| **Caut:** 45–54, 86–105 \| **Crit:** $< 45$ or $> 110$ | AES-GCM 256 |
| `hrv_rmssd_ms` | `float` | NO | $5.0..200.0\text{ ms}$ | **Nom:** 35–70 \| **Caut:** 20–34 \| **Crit:** $< 20$ ($\ge 2\text{ days}$, `RF-EVA-05`) | AES-GCM 256 |
| `pas_mmhg` | `integer` | NO | $60..260\text{ mmHg}$ | **Nom:** 105–125 \| **Caut:** 126–139 \| **Crit:** $\ge 140$ | AES-GCM 256 |
| `pad_mmhg` | `integer` | NO | $35..160\text{ mmHg}$ | **Nom:** 65–84 \| **Caut:** 85–89 \| **Crit:** $\ge 90$ | AES-GCM 256 |
| `spo2_pct` | `float` | NO | $65.0..100.0\%$ | **Nom:** 96–100 \| **Caut:** 93–95 \| **Crit:** $< 93$ | AES-GCM 256 |
| `glucose_mg_dl` | `float` | NO | $30.0..400.0\text{ mg/dL}$ | **Nom:** 75–105 \| **Caut:** 65–74, 106–125 \| **Crit:** $< 65$ or $> 140$ | AES-GCM 256 |
| `temp_c` | `float` | NO | $34.0..42.0\text{ °C}$ | **Nom:** 36.2–37.3 \| **Caut:** 37.4–37.9 \| **Crit:** $\ge 38.0$ | AES-GCM 256 |
| `sleep_hours` | `float` | NO | $0.0..24.0\text{ h}$ | **Nom:** 7.0–8.5 \| **Caut:** 5.5–6.9 \| **Crit:** $< 5.5$ ($\ge 2\text{ days}$) | AES-GCM 256 |
| `mood_score` | `integer` | NO | $1..10$ | **Nom:** 7–10 \| **Caut:** 4–6 \| **Crit:** 1–3 | AES-GCM 256 |
| `urinary_calcium_mg` | `float` | YES | $0.0..1000.0\text{ mg/day}$ | **Nom:** $< 250$ \| **Caut:** 250–300 \| **Crit:** $> 300$ | AES-GCM 256 |
| `is_suspect` | `boolean` | NO | Default `false` | `true` if any value falls outside plausible range (**flagged without discarding**, `RF-ING-05`) | AES-GCM 256 |
| `hlc_timestamp` | `string` | NO | `ms:cnt:node` format | Hybrid Logical Clock for causal ordering (`ADR-009`) | Metadata |
| `recorded_at` | `datetime` | NO | ISO 8601 UTC | Physical capture timestamp | AES-GCM 256 |

---

## 3. Entity: `HABITAT_TELEMETRY` (ECLSS / CANS Environmental Telemetry)

| Field | Type | Nullable | `NASA-STD-3001` Thresholds (`SRS §6.1`) | Encryption / Visibility | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `habitat_id` | `uuid v4` | NO | PK | Habitat Key (`ADR-014`) | Unique cabin sampling identifier. |
| `mission_day` | `integer` | NO | $1..180$ | Habitat Key | Corresponding mission day. |
| `pp_co2_mmhg` | `float` | NO | **Nom:** $< 2.0$ \| **Caut:** $2.0–3.0$ \| **Crit:** $> 3.0$ | Habitat Key | Cabin $CO_2$ partial pressure (`RF-ING-02`). |
| `cabin_pressure_kpa` | `float` | NO | **Nom:** $97.9..102.7\text{ kPa}$ ($14.2–14.9\text{ psi}$) | Habitat Key | Total habitat barometric pressure. |
| `o2_pct` | `float` | NO | **Nom:** $19.5..23.5\%$ | Habitat Key | Cabin oxygen stoichiometric percentage. |
| `radiation_usv_h` | `float` | NO | **Nom:** $15–35$ \| **Caut:** $36–100$ \| **Crit:** $> 100$ | Habitat Key | Combined + CANS neutron dose rate ($\mu\text{Sv/h}$). |
| `habitat_status` | `string (10)` | NO | `ENUM('NOMINAL','CAUTION','CRITICAL')` | Cabin Public | Consolidated status displayed on cabin screens (`ADR-014`). |
| `hlc_timestamp` | `string` | NO | `ms:cnt:node` | Metadata | Hybrid clock (`ADR-009`). |

---

## 4. Entity: `SUBJECTIVE_SYMPTOM`

| Field | Type | Nullable | Constraints | Encryption / CRDT | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `symptom_id` | `uuid v4` | NO | PK | `G-Set` (`ADR-009`) | Unique tactile report identifier (`RF-ING-04`). |
| `crew_id` | `string (4)` | NO | FK $\to$ `CREW_MEMBER` | AES-GCM 256 (`ADR-012`) | Crew member reporting the symptom. |
| `mission_day` | `integer` | NO | $1..180$ | AES-GCM 256 | Mission day. |
| `symptom_type` | `string (25)` | NO | `ENUM('blurredVision','headache','nausea','lumbarPain','orthostaticDizziness','extremeFatigue')` | AES-GCM 256 | Closed catalog of 6 tactile symptoms (SRS §5.1 + `RF-ING-04`). |
| `recorded_at` | `datetime` | NO | ISO 8601 UTC | AES-GCM 256 | Timestamp of the 1-tap report. |

---

## 5. Entity: `CLINICAL_ALERT` (Engine-Generated Alert)

| Field | Type | Nullable | Constraints / Domain | Encryption / CRDT | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `alert_id` | `uuid v4` | NO | PK | `G-Set` (`ADR-009`) | Unique alert identifier. |
| `crew_id` | `string (4)` | NO | FK $\to$ `CREW_MEMBER` | AES-GCM 256 (`ADR-012`) | Affected crew member. |
| `rule_id` | `string (20)` | NO | `R-ENV-01..02`, `R-SANS-01..02`, `R-RAD-01..02`, `R-COG-01`, `R-REN-01..02`, `R-CARD-01`, `D-01..03`, `THRESHOLD` | AES-GCM 256 | Exact rule triggered (`RF-EVA-06` explainability). |
| `organ_system` | `string (25)` | NO | `ENUM('neuro-ocular','cardiovascular','musculoskeletal','renal','cognitive','radiation','respiratory/environmental')` | AES-GCM 256 | The 7 anatomical systems (`RF-EVA-03`). |
| `severity` | `string (10)` | NO | `ENUM('CAUTION','CRITICAL')` | AES-GCM 256 | Severity (`RF-EVA-01`). |
| `triggering_values` | `string` | NO | Serialized JSON | AES-GCM 256 | Exact values that triggered the alert (`RF-EVA-06`). |
| `threshold_ref` | `string (64)` | NO | NASA-STD-3001 reference | AES-GCM 256 | Regulatory threshold exceeded. |
| `acknowledged` | `boolean` | NO | Default `false` | `LWW-Map` (`ADR-009`) | Crew member / CMO acknowledgment (`RNF-USA-04`). |
| `escalation_level` | `integer` | NO | `0` (local), `1` (2 min CMO), `2` (5 min Cabin) | Local / Hub | Automatic escalation level (`ADR-013`). |

---

## 6. Entities: `COUNTERMEASURE_PROTOCOL` & `PROTOCOL_EXECUTION`

| Field | Type | Nullable | Constraints | Description & Traceability |
| :--- | :--- | :---: | :--- | :--- |
| `protocol_id` | `string (32)` | NO | PK | Static JSON catalog identifier (`RF-GUI-03`). |
| `anatomical_impact_block` | `string (300)` | NO | `RF-GUI-01` Block 1 | Anatomical explanation in non-medical plain language (`RF-GUI-04`). |
| `severity_time_block` | `string (200)` | NO | `RF-GUI-01` Block 2 | Severity and estimated window of clinical impact. |
| `onboard_resource` | `string (50)` | NO | `ENUM('ARED','LBNP','BOTIQUIN','REFUGIO_SPE','FILTROS_LIOH_CDRA')` | Exclusive onboard physical resource (`RF-GUI-03`). |
| `steps_max_4` | `json array` | NO | **`1 <= length <= 4`** (`ADR-017`) | Actionable sequential list; validated by `CounterResolver` ($\le 4$ steps). |
| `chained_next_id` | `string (32)` | YES | FK $\to$ `COUNTERMEASURE_PROTOCOL` | Chains a second protocol if the intervention exceeds 4 steps (`ADR-017`). |
| `steps_completed` | `json array` | NO | Boolean array `[true, ...]` | Verifiable step-by-step log (`RF-GUI-02`). |
| `xp_awarded` | `integer` | NO | $\ge 0$ | Reward dispatched to `PN-Counter` (`RF-GAM-01`). |

---

## 7. Physical Entities: `ENCRYPTED_ENVELOPE` & `AUDIT_LEDGER_ENTRY` (`ADR-006`, `RNF-SEC-03/04`)

| Field | Type | Nullable | Cryptographic Specification (`window.crypto.subtle`) | Purpose |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `uuid v4` | NO | PK in `envelopes_gset` | Unique envelope identifier. |
| `hlc` | `string (40)` | NO | `timestamp_ms:counter:node_id` | Causal total ordering (`ADR-009`). |
| `autor` | `string (32)` | NO | Signing device ID | Multi-device origin traceability. |
| `iv` | `string (16)` | NO | Base64 of 12 bytes (96 bits) | Unique initialization vector per AES-GCM encryption. |
| `ct` | `string` | NO | Base64 (`AES-GCM-256`) | Payload encrypted with `crewDataKey` (`ADR-012`) or habitat key (`ADR-014`). |
| `sha256` | `string (64)` | NO | 256-bit hex | Anti-SEU verification (cosmic-ray bit-flips, `RNF-SEC-03`). |
| `firma` | `string (128)` | NO | Base64 (`Ed25519`) | Asymmetric digital signature of the issuing device (`ADR-006`). |
| `prev_sha256` | `string (64)` | NO | Hex of record `seq - 1` | *Append-Only* cryptographic chaining (`RNF-SEC-04`). |
