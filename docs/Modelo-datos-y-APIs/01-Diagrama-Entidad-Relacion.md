# 🗺️ Modelo de Datos: Diagrama Entidad-Relación (ERD)
### ASTHA — Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
**Autoridad:** SRS §5.1 · **ADRs:** [ADR-006](../SDD/08-Architecture-decisions.md#adr-006), [ADR-008](../SDD/08-Architecture-decisions.md#adr-008), [ADR-009](../SDD/08-Architecture-decisions.md#adr-009), [ADR-012](../SDD/08-Architecture-decisions.md#adr-012), [ADR-014](../SDD/08-Architecture-decisions.md#adr-014), [ADR-016](../SDD/08-Architecture-decisions.md#adr-016), [ADR-017](../SDD/08-Architecture-decisions.md#adr-017)

---

## 1. Diagrama Entidad-Relación Lógico (Dominio Clínico, Seguridad y Sync)

Modela las entidades lógicas del expediente biomédico, los catálogos normativos **NASA-STD-3001**, el motor de contramedidas de $\le 4$ pasos (`ADR-017`), la bitácora inmutable (`RNF-SEC-04`) y el envoltorio criptográfico/CRDT (`ADR-006`, `ADR-009`).

```mermaid
erDiagram
    CREW_MEMBER {
        string crew_id PK
        string full_name
        string role
        int level
        int xp_total
        int streak_days
        string global_status
        string pin_salt
    }

    KEY_VAULT {
        string key_id PK
        string crew_id FK
        string wrapped_key_user_pin
        string wrapped_key_cmo_pin
        string device_pub_ed25519
        string pbkdf2_params
    }

    DAILY_MEASUREMENT {
        string measurement_id PK
        string crew_id FK
        int mission_day
        int hr_bpm
        float hrv_rmssd_ms
        int pas_mmhg
        int pad_mmhg
        float spo2_pct
        float glucose_mg_dl
        float temp_c
        float sleep_hours
        int mood_score
        float urinary_calcium_mg
        boolean is_suspect
        string hlc_timestamp
        datetime recorded_at
    }

    HABITAT_TELEMETRY {
        string habitat_id PK
        int mission_day
        float pp_co2_mmhg
        float cabin_pressure_kpa
        float o2_pct
        float radiation_usv_h
        string habitat_status
        string hlc_timestamp
        datetime recorded_at
    }

    SUBJECTIVE_SYMPTOM {
        string symptom_id PK
        string crew_id FK
        int mission_day
        string symptom_type
        string hlc_timestamp
        datetime recorded_at
    }

    CLINICAL_ALERT {
        string alert_id PK
        string crew_id FK
        string measurement_id FK
        string habitat_id FK
        string rule_id
        string organ_system
        string severity
        string urgency
        string triggering_values
        string threshold_ref
        boolean acknowledged
        datetime acknowledged_at
        string acknowledged_by
        int escalation_level
        datetime created_at
    }

    COUNTERMEASURE_PROTOCOL {
        string protocol_id PK
        string rule_id
        string title
        string anatomical_impact_block
        string severity_time_block
        string onboard_resource
        json steps_max_4
        string chained_next_id FK
    }

    PROTOCOL_EXECUTION {
        string execution_id PK
        string alert_id FK
        string protocol_id FK
        string crew_id FK
        json steps_completed
        int xp_awarded
        datetime completed_at
    }

    AUDIT_LEDGER_ENTRY {
        int seq PK
        string entry_id UK
        string crew_id FK
        string event_type
        string detail_json
        string prev_sha256
        string entry_sha256
        string ed25519_sig
        string hlc_timestamp
    }

    ENCRYPTED_ENVELOPE {
        string id PK
        string entity_type
        string crew_id FK
        string hlc
        string autor_device
        string iv_base64
        string ct_aes_gcm_256
        string sha256_seu
        string firma_ed25519
    }

    CABIN_GLOBAL_STATUS {
        string crew_id PK
        string global_status
        string habitat_status
        string hlc
        string ct_habitat_key
    }

    CREW_MEMBER ||--|| KEY_VAULT : "protegido_por (ADR-012)"
    CREW_MEMBER ||--o{ DAILY_MEASUREMENT : "registra_diario (ADR-016)"
    CREW_MEMBER ||--o{ SUBJECTIVE_SYMPTOM : "reporta (RF-ING-04)"
    CREW_MEMBER ||--o{ CLINICAL_ALERT : "genera_alerta"
    CREW_MEMBER ||--o{ PROTOCOL_EXECUTION : "ejecuta"
    CREW_MEMBER ||--|| CABIN_GLOBAL_STATUS : "publica_semaforo (ADR-014)"

    DAILY_MEASUREMENT ||--o{ CLINICAL_ALERT : "evaluado_en"
    HABITAT_TELEMETRY ||--o{ CLINICAL_ALERT : "correlaciona (RF-EVA-04)"

    COUNTERMEASURE_PROTOCOL ||--o| COUNTERMEASURE_PROTOCOL : "encadena_si_excede_4 (ADR-017)"
    COUNTERMEASURE_PROTOCOL ||--o{ PROTOCOL_EXECUTION : "instanciado_en"
    CLINICAL_ALERT ||--o| PROTOCOL_EXECUTION : "resuelto_mediante"

    CREW_MEMBER ||--o{ AUDIT_LEDGER_ENTRY : "registra_inmutable (RNF-SEC-04)"
    CREW_MEMBER ||--o{ ENCRYPTED_ENVELOPE : "aisla_en_IndexedDB (ADR-006)"
```

---

## 2. Mapeo Físico: IndexedDB (Navegador) y Op-Log (Sync Hub)

Conforme a **[ADR-006](../SDD/08-Architecture-decisions.md#adr-006)**, **[ADR-008](../SDD/08-Architecture-decisions.md#adr-008)** y **[SRS §5.2](../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md)**, las entidades lógicas no se almacenan en tablas SQL en claro, sino encapsuladas en *Object Stores* de IndexedDB cifrados con `window.crypto.subtle` y replicadas en el Sync Hub:

```mermaid
flowchart LR
    subgraph Logical ["Entidades Lógicas Clínicas"]
        L1["DAILY_MEASUREMENT"]
        L2["SUBJECTIVE_SYMPTOM"]
        L3["CLINICAL_ALERT"]
        L4["PROTOCOL_EXECUTION"]
        L5["AUDIT_LEDGER_ENTRY"]
        L6["HABITAT_TELEMETRY / CABIN_GLOBAL_STATUS"]
    end

    subgraph IDB ["IndexedDB Local (ASTHA_EDGE_DB v1)"]
        direction TB
        S1[("ObjectStore: envelopes_gset<br>Índices: by_hlc, by_crew, by_type<br>Valor: {id, hlc, autor, iv, ct, sha256, firma}")]
        S2[("ObjectStore: lww_preferences<br>Índice: by_hlc<br>Valor: LWW-Map (Alto contraste, idioma, acks)")]
        S3[("ObjectStore: pn_counters<br>Índice: by_crew_node<br>Valor: PN-Counter XP y racha")]
        S4[("ObjectStore: audit_chain<br>Índice: by_seq (Auto-Increment)<br>Valor: Cadena SHA-256 + Ed25519")]
        S5[("ObjectStore: key_vault<br>Valor: Claves simétricas envueltas por PIN")]
    end

    subgraph Hub ["Sync Hub Opcional en Rust (ADR-008)"]
        H1[("Archivo Append-Only: hub_oplog.jsonl<br>Almacena únicamente EncryptedEnvelopes cifrados<br>(Zero-Knowledge sobre datos clínicos)")]
    end

    L1 & L2 & L3 & L4 -->|"AES-GCM 256 (Clave Tripulante ADR-012)"| S1
    L5 -->|"Encadenamiento SHA-256 + Ed25519"| S4
    L6 -->|"AES-GCM 256 (Clave de Hábitat ADR-014)"| S1
    S1 & S2 & S3 <==>|"Deltas CRDT vía WSS TLS 1.3 (ADR-009)"| H1
```

---

## 3. Reglas de Integridad Referencial y Restricciones

1. **Inmutabilidad Clínica (`RNF-SEC-04`, `ADR-009`):** No existen operaciones `UPDATE` o `DELETE` sobre `DAILY_MEASUREMENT`, `SUBJECTIVE_SYMPTOM`, `CLINICAL_ALERT` ni `AUDIT_LEDGER_ENTRY`. Toda corrección o reconocimiento de alerta genera un nuevo evento con su reloj lógico `hlc`.
2. **Protección contra Bit-Flips por Radiación (`RNF-SEC-03`):** Todo `ENCRYPTED_ENVELOPE` recalcula y verifica `sha256_seu` antes del descifrado. Si falla la verificación, el sobre corrupto es puesto en cuarentena y se solicita réplica limpia al `Sync Hub` (`hub_oplog.jsonl`) o pares.
3. **Aislamiento Criptográfico RBAC (`RNF-SEC-02`, `ADR-012`):** Los datos clínicos de `DAILY_MEASUREMENT` y `CLINICAL_ALERT` se cifran con la `crewDataKey` exclusiva del tripulante (`KEY_VAULT`), envuelta con su PIN y con el PIN del CMO. El `Sync Hub` y las `CABIN_GLOBAL_STATUS` (pantallas públicas) **no poseen** `crewDataKey`.
4. **Cardinalidad Diaria (`ADR-016`):** En condiciones operacionales nominales, `DAILY_MEASUREMENT` mantiene 1 registro consolidado por `(crew_id, mission_day)` durante 180 días ($4 \times 180 = 720$ registros base), más inyecciones puntuales del simulador (`RF-SIM-01..05`).
5. **Límite de Pasos (`ADR-017`):** Todo registro en `COUNTERMEASURE_PROTOCOL.steps_max_4` debe satisfacer `length(steps) <= 4`. Procedimientos complejos utilizan `chained_next_id` para enlazar protocolos sucesivos.
