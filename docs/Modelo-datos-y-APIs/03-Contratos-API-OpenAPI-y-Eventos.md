# 🔌 API Design & Communication Contracts — ASTHA
### Autonomous Space Telemetry & Health Analytics | NASA Space Apps Challenge 2026
**Formal Specification:** [openapi.yaml](openapi.yaml) (OpenAPI 3.1.0) · **ADRs:** [002](../SDD/08-Architecture-decisions.md#adr-002), [005](../SDD/08-Architecture-decisions.md#adr-005), [007](../SDD/08-Architecture-decisions.md#adr-007), [008](../SDD/08-Architecture-decisions.md#adr-008), [009](../SDD/08-Architecture-decisions.md#adr-009), [010](../SDD/08-Architecture-decisions.md#adr-010), [014](../SDD/08-Architecture-decisions.md#adr-014)

---

## 1. System Boundary & Interface Map

In accordance with **[ADR-002](../SDD/08-Architecture-decisions.md#adr-002)** and **[ADR-008](../SDD/08-Architecture-decisions.md#adr-008)**, ASTHA consumes zero cloud APIs. All network interfaces operate within the **spacecraft's isolated LAN (`https://astha.local`)** or through in-memory local contracts (`postMessage` / signed file):

```mermaid
flowchart LR
    UI["Crew PWA UI (Svelte 5)"] <-->|"1. postMessage Contracts<br>(< 50ms Triage, ADR-005)"| Workers["Clinical & Data Workers"]
    Workers <==>|"2. OpenAPI REST / WSS TLS 1.3<br>(https://astha.local, ADR-008)"| Hub["ASTHA Sync Hub (Rust)"]
    Hub -->|"3. Traffic Light + ECLSS Only<br>(GET /habitat/status, ADR-014)"| Cabin["Cabin Displays"]
    Sensors["Future Sensor Adapter (SRS §5.2)"] -->|"4. JSON Ingestion Contract<br>(POST /ingest/telemetry)"| Workers
    Workers -.->|"5. Ed25519-Signed JSON File<br>(External handoff to DTN, ADR-010)"| DSN["Spacecraft DTN Router -> Houston"]
```

---

## 2. Sync Hub REST & WebSocket API (`https://astha.local:8443/api/v1`)

The complete specification importable into Swagger/OpenAPI is located in **[openapi.yaml](openapi.yaml)**.

### 2.1 Endpoint Summary (Closed LAN TLS 1.3 with Internal CA `ADR-007`)

| Method | Path | Purpose | Security & Privacy (`ADR-012` / `ADR-014`) | Traceability |
| :--- | :--- | :--- | :--- | :--- |
| **`GET`** | `/health` | Check Sync Hub availability, PWA bundle version, and Op-Log sequence | Spacecraft internal CA certificate (`ADR-007`) | `RNF-NET-03` |
| **`POST`** | `/sync/handshake` | Exchange device `VersionVector` and validate `Ed25519` signature | Device pre-enrolled on Earth (`ADR-020`) | `RNF-NET-02`, `ADR-009` |
| **`GET`** | `/sync/deltas` | Retrieve list of missing `EncryptedEnvelope` envelopes from a given vector | **Zero-Knowledge:** Hub only serves AES-GCM ciphertext (`ADR-006`) | `ADR-008`, `ADR-009` |
| **`POST`** | `/sync/deltas` | Submit new encrypted envelopes generated offline to the Op-Log | Per-record `Ed25519` signature and `SHA-256` hash verification | `RNF-SEC-03`, `RNF-SEC-04` |
| **`GET`** | `/habitat/status` | Query environmental telemetry (`ppCO2`, `O2`, radiation) and global traffic light per crew member | **No private clinical values** (Privacy Act / HIPAA compliant `ADR-014`) | `RF-DSH-04`, `ADR-014` |
| **`POST`** | `/ingest/telemetry` | Future adapter contract for receiving JSON frames from physical sensors (Astroskin / ECLSS) | Strict boundary validation (`RF-ING-05`: flags suspect values without discarding) | `SRS §5.2`, `RF-ING-01..02` |

### 2.2 Real-Time WebSocket Channel (`wss://astha.local:8443/ws/sync`)
* **Passive Keep-Alive (`RNF-POW-01`):** The Hub sends WebSocket protocol-level *ping frames* to maintain the channel without waking JS on client devices.
* **Transmitted Messages:**
  1. `DELTA_PUSH`: Immediate broadcast of a newly signed `EncryptedEnvelope` across tablets and the CMO console.
  2. `ALARM_ESCALATION` (**`ADR-013`**): Replication of an unacknowledged critical alarm after **2 minutes** to the CMO console and after **5 minutes** to public cabin displays (global traffic light only `ADR-014`).
* **Session rules (implemented in [`sync-hub/`](../../sync-hub/README.md)):**
  1. `HANDSHAKE` first: `{deviceId, versionVector, timestampUtc, ed25519Signature}` signed over the canonical JSON of the first three fields with the enrolled device key (`ADR-020`). An invalid handshake closes the socket with code `4401`. The hub answers with the envelopes the client lacks (`DELTA_PUSH`, ascending HLC) and then its own `HANDSHAKE`, so the client sends what the hub lacks before any live push.
  2. `REPLICA_REQUEST {ids}`: returns those envelopes (local SEU recovery, `RNF-SEC-03`).
  3. **Extension** `CABIN_STATUS {status: CabinGlobalStatus}`: the zero-knowledge hub cannot derive `GET /habitat/status` from encrypted envelopes, so an authenticated device publishes the public snapshot. The hub applies a strict allow-list and rejects any extra field, so no clinical value reaches a public display (`ADR-014`).
  4. **Extension** `REJECTED {rejections: [{id, reason}]}`: per-envelope rejection reasons (SHA-256 / Ed25519 / unknown device).

---

## 3. Internal Contracts Between Web Workers (`postMessage`, `ADR-005`)

Because the `Clinical Engine Worker` is architecturally prohibited from using `fetch` or `WebSocket`, internal communication follows this TypeScript-typed message contract:

### 3.1 UI / Data Worker $\to$ `Clinical Engine Worker`

```json
{
  "type": "EVALUATE_DAILY_RECORD",
  "requestId": "req-048-c001",
  "payload": {
    "crewId": "C001",
    "measurement": { "missionDay": 48, "hr": 114, "hrvRmssd": 18.2, "pas": 142, "pad": 92, "spo2": 93.1, "glucose": 98, "tempC": 37.1, "sleepHours": 4.8, "mood": 4 },
    "habitat": { "ppCo2Mmhg": 3.4, "cabinPressureKpa": 101.2, "o2Percent": 21.0, "radiationUSvH": 28.5 },
    "symptoms": ["blurredVision", "headache"],
    "baseline14Days": { "hr": [62, 64, 63], "pas": [116, 118, 115] }
  }
}
```

### 3.2 `Clinical Engine Worker` $\to$ Svelte 5 UI (`< 50 ms`, `RNF-PER-01`)

```json
{
  "type": "TRIAGE_RESULT",
  "requestId": "req-048-c001",
  "latencyMs": 4.2,
  "globalStatus": "CRITICAL",
  "alerts": [
    {
      "ruleId": "R-ENV-02",
      "organSystem": "neuro-ocular",
      "severity": "CRITICAL",
      "triggeringValues": "ppCO2=3.4 mmHg, symptom=headache",
      "thresholdRef": "NASA-STD-3001 ppCO2 > 3.0 mmHg",
      "countermeasure": {
        "protocolId": "PROTO-CO2-HEADACHE",
        "steps": [
          "1. Verify ventilation flow in current compartment.",
          "2. Inspect LiOH cartridge indicator / CDRA scrubber.",
          "3. Relocate crew member to a module with ppCO2 < 2.0 mmHg.",
          "4. Repeat SpO2 and headache assessment after 15 minutes."
        ]
      }
    }
  ],
  "drifts": [
    { "ruleId": "D-02", "indicator": "hr_bpm", "modifiedZScore": 3.12, "earlyWarning": true }
  ]
}
```

---

## 4. Signed Export Contract for Earth Downlink (`ADR-010`, `RNF-NET-04`)

ASTHA concludes its network chain by locally generating a downloadable `astha_export_signed.json` file that the CMO hands off to the spacecraft's external DTN router/transponder:
* **Local preview/validation endpoint:** Defined in `openapi.yaml` under the `SignedDsnExport` schema.
* **Integrity & privacy:** Includes `ed25519Signature` from the CMO's device and the `isAnonymized: true` flag if the export is intended for non-clinical statistical analysis (`ADR-012`).
