# 🗺️ Data Model: Entity-Relationship Diagram (ERD)
### ASTHA — Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
**Authority:** SRS §5.1 · **ADRs:** [ADR-006](../SDD/08-Architecture-decisions.md#adr-006), [ADR-008](../SDD/08-Architecture-decisions.md#adr-008), [ADR-009](../SDD/08-Architecture-decisions.md#adr-009), [ADR-012](../SDD/08-Architecture-decisions.md#adr-012), [ADR-014](../SDD/08-Architecture-decisions.md#adr-014), [ADR-016](../SDD/08-Architecture-decisions.md#adr-016), [ADR-017](../SDD/08-Architecture-decisions.md#adr-017)

---

## 1. Logical Entity-Relationship Diagram (Clinical, Security, and Sync Domains)

Models the logical entities of the biomedical record, the **NASA-STD-3001** regulatory catalogs, the $\le 4$-step countermeasure engine (`ADR-017`), the immutable audit ledger (`RNF-SEC-04`), and the cryptographic/CRDT envelope (`ADR-006`, `ADR-009`).

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

    CREW_MEMBER ||--|| KEY_VAULT : "protected_by (ADR-012)"
    CREW_MEMBER ||--o{ DAILY_MEASUREMENT : "logs_daily (ADR-016)"
    CREW_MEMBER ||--o{ SUBJECTIVE_SYMPTOM : "reports (RF-ING-04)"
    CREW_MEMBER ||--o{ CLINICAL_ALERT : "generates_alert"
    CREW_MEMBER ||--o{ PROTOCOL_EXECUTION : "executes"
    CREW_MEMBER ||--|| CABIN_GLOBAL_STATUS : "publishes_traffic_light (ADR-014)"

    DAILY_MEASUREMENT ||--o{ CLINICAL_ALERT : "evaluated_in"
    HABITAT_TELEMETRY ||--o{ CLINICAL_ALERT : "correlates (RF-EVA-04)"

    COUNTERMEASURE_PROTOCOL ||--o| COUNTERMEASURE_PROTOCOL : "chains_if_exceeds_4 (ADR-017)"
    COUNTERMEASURE_PROTOCOL ||--o{ PROTOCOL_EXECUTION : "instantiated_in"
    CLINICAL_ALERT ||--o| PROTOCOL_EXECUTION : "resolved_via"

    CREW_MEMBER ||--o{ AUDIT_LEDGER_ENTRY : "records_immutable (RNF-SEC-04)"
    CREW_MEMBER ||--o{ ENCRYPTED_ENVELOPE : "isolates_in_IndexedDB (ADR-006)"
```

---

## 2. Physical Mapping: IndexedDB (Browser) & Op-Log (Sync Hub)

In accordance with **[ADR-006](../SDD/08-Architecture-decisions.md#adr-006)**, **[ADR-008](../SDD/08-Architecture-decisions.md#adr-008)**, and **[SRS §5.2](../SRS%20%E2%80%93%20Software%20de%20Monitoreo%20de%20Salud%20para%20Astronautas.md)**, logical entities are not stored in plaintext SQL tables, but rather encapsulated in IndexedDB *Object Stores* encrypted via `window.crypto.subtle` and replicated on the Sync Hub:

```mermaid
flowchart LR
    subgraph Logical ["Logical Clinical Entities"]
        L1["DAILY_MEASUREMENT"]
        L2["SUBJECTIVE_SYMPTOM"]
        L3["CLINICAL_ALERT"]
        L4["PROTOCOL_EXECUTION"]
        L5["AUDIT_LEDGER_ENTRY"]
        L6["HABITAT_TELEMETRY / CABIN_GLOBAL_STATUS"]
    end

    subgraph IDB ["Local IndexedDB (ASTHA_EDGE_DB v1)"]
        direction TB
        S1[("ObjectStore: envelopes_gset<br>Indexes: by_hlc, by_crew, by_type<br>Value: {id, hlc, autor, iv, ct, sha256, firma}")]
        S2[("ObjectStore: lww_preferences<br>Index: by_hlc<br>Value: LWW-Map (High contrast, language, acks)")]
        S3[("ObjectStore: pn_counters<br>Index: by_crew_node<br>Value: PN-Counter XP & streak")]
        S4[("ObjectStore: audit_chain<br>Index: by_seq (Auto-Increment)<br>Value: SHA-256 + Ed25519 Chain")]
        S5[("ObjectStore: key_vault<br>Value: PIN-wrapped symmetric keys")]
        S6[("ObjectStore: envelopes_replica<br>Value: redundant copy of each envelope<br>(local SEU recovery, RNF-SEC-03)")]
        S7[("ObjectStore: quarantine<br>Value: envelopes that failed SHA-256")]
    end

    subgraph Hub ["Optional Rust Sync Hub (ADR-008)"]
        H1[("Append-Only File: hub_oplog.jsonl<br>Stores solely encrypted EncryptedEnvelopes<br>(Zero-Knowledge over clinical data)")]
    end

    L1 & L2 & L3 & L4 -->|"AES-GCM 256 (Crew Key ADR-012)"| S1
    S1 -.->|"same transaction"| S6
    S1 -.->|"failed SHA-256, no valid replica"| S7
    L5 -->|"SHA-256 + Ed25519 Chaining"| S4
    L6 -->|"AES-GCM 256 (Habitat Key ADR-014)"| S1
    S1 & S2 & S3 <==>|"CRDT Deltas via WSS TLS 1.3 (ADR-009)"| H1
```

---

## 3. Referential Integrity Rules & Constraints

1. **Clinical Immutability (`RNF-SEC-04`, `ADR-009`):** There are no `UPDATE` or `DELETE` operations on `DAILY_MEASUREMENT`, `SUBJECTIVE_SYMPTOM`, `CLINICAL_ALERT`, or `AUDIT_LEDGER_ENTRY`. Any correction or alert acknowledgment generates a new event stamped with its logical clock `hlc`.
2. **Radiation Bit-Flip Protection (`RNF-SEC-03`):** `sha256` covers the canonical form of `{id, hlc, autor, keyRef, iv, ct}` and `firma` signs that digest, so a single flipped bit in any field is detected deterministically. Each envelope is written together with a copy in `envelopes_replica` and re-read after the write (write-verify). On read, the digest and signature are checked before decryption. If verification fails and the local replica is valid, the replica is restored and the damaged copy is kept in `quarantine`. If no valid copy exists, the envelope is quarantined and a clean replica is requested from the `Sync Hub` (`hub_oplog.jsonl`) or peers. `LWW` preferences and `PN` counters live as encrypted CRDT operations inside `envelopes_gset` instead of plaintext stores.
3. **RBAC Cryptographic Isolation (`RNF-SEC-02`, `ADR-012`):** Clinical data in `DAILY_MEASUREMENT` and `CLINICAL_ALERT` is encrypted with the crew member's exclusive `crewDataKey` (`KEY_VAULT`), wrapped with both their PIN and the CMO's PIN. The `Sync Hub` and `CABIN_GLOBAL_STATUS` (public bulkhead displays) **do not possess** `crewDataKey`.
4. **Daily Cardinality (`ADR-016`):** Under nominal operational conditions, `DAILY_MEASUREMENT` maintains 1 consolidated record per `(crew_id, mission_day)` across 180 days ($4 \times 180 = 720$ baseline records), plus ad-hoc simulator injections (`RF-SIM-01..05`).
5. **Step Limit (`ADR-017`):** Every record in `COUNTERMEASURE_PROTOCOL.steps_max_4` must satisfy `length(steps) <= 4`. Complex procedures use `chained_next_id` to link successive protocols.
