# 📦 SDD-06: Data Design and Interface Contracts
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Reference Standards:** NASA-STD-8739.8 | IEEE Std 1016-2009 | JSON Schema Draft-07 | **ADRs:** 006, 009, 010, 012, 016, 018

---

## 1. Daily Physiological and Habitat Record Model (`SRS §5.1`, `ADR-016`)

In accordance with **[ADR-016](08-Architecture-decisions.md#adr-016)** and `RF-ING-01`, each crew member logs one consolidated daily measurement (9 mandatory physiological variables + optional urinary calcium) together with shared habitat environmental telemetry (`RF-ING-02`).

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ASTHA_Daily_Health_Record",
  "type": "object",
  "required": ["crewId", "missionDay", "vitals", "habitat", "symptoms"],
  "properties": {
    "crewId": { "type": "string", "enum": ["C001", "C002", "C003", "C004"] },
    "missionDay": { "type": "integer", "minimum": 1, "maximum": 180 },
    "vitals": {
      "type": "object",
      "required": ["hr", "hrvRmssd", "pas", "pad", "spo2", "glucose", "tempC", "sleepHours", "mood"],
      "properties": {
        "hr": { "type": "integer", "minimum": 25, "maximum": 220 },
        "hrvRmssd": { "type": "number", "minimum": 5, "maximum": 200 },
        "pas": { "type": "integer", "minimum": 60, "maximum": 260 },
        "pad": { "type": "integer", "minimum": 35, "maximum": 160 },
        "spo2": { "type": "number", "minimum": 65, "maximum": 100 },
        "glucose": { "type": "number", "minimum": 30, "maximum": 400 },
        "tempC": { "type": "number", "minimum": 34.0, "maximum": 42.0 },
        "sleepHours": { "type": "number", "minimum": 0, "maximum": 24 },
        "mood": { "type": "integer", "minimum": 1, "maximum": 10 },
        "urinaryCalciumMgDay": { "type": "number", "minimum": 0, "maximum": 1000 },
        "isSuspect": { "type": "boolean", "description": "RF-ING-05: Flagged without discarding if outside plausible range" }
      }
    },
    "habitat": {
      "type": "object",
      "required": ["ppCo2Mmhg", "cabinPressureKpa", "o2Percent", "radiationUSvH"],
      "properties": {
        "ppCo2Mmhg": { "type": "number" },
        "cabinPressureKpa": { "type": "number" },
        "o2Percent": { "type": "number" },
        "radiationUSvH": { "type": "number" }
      }
    },
    "symptoms": {
      "type": "array",
      "description": "Closed catalog of 6 tactile symptoms (RF-ING-04)",
      "items": {
        "type": "string",
        "enum": ["blurredVision", "headache", "nausea", "lumbarPain", "orthostaticDizziness", "extremeFatigue"]
      }
    }
  }
}
```

---

## 2. IndexedDB Cryptographic Persistence Envelope (`ADR-006`, `RNF-SEC-01/03/04`)

In accordance with **[ADR-006](08-Architecture-decisions.md#adr-006)** and **SRS §5.2**, every clinical record is encrypted locally in **IndexedDB** using the native `window.crypto.subtle` API with no external cryptographic libraries or WASM:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ASTHA_Encrypted_Envelope",
  "type": "object",
  "required": ["id", "hlc", "autor", "iv", "ct", "sha256", "firma"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "hlc": { "type": "string", "example": "1794800000000:0001:tablet-c001", "description": "Hybrid Logical Clock (ADR-009)" },
    "autor": { "type": "string", "description": "Originating device or crew member ID" },
    "iv": { "type": "string", "description": "Base64-encoded 96-bit AES-GCM initialization vector" },
    "ct": { "type": "string", "description": "AES-GCM-256 ciphertext encrypted with the crew member's key (ADR-012)" },
    "sha256": { "type": "string", "description": "Envelope SHA-256 checksum for SEU bit-flip detection (RNF-SEC-03)" },
    "firma": { "type": "string", "description": "Device Ed25519 digital signature + previous hash for append-only ledger (RNF-SEC-04)" }
  }
}
```

---

## 3. CRDT Structures and Hybrid Logical Clock (`ADR-009`, `RNF-NET-02`)

Coordination-free synchronization over the closed LAN uses three specific CRDT structures:

| CRDT Structure | Usage in ASTHA | Conflict Resolution Rule |
| :--- | :--- | :--- |
| **`G-Set` (Grow-Only Set)** | Daily records, symptoms, alerts, and ledger steps | Pure set union by `id`. No medical data is ever overwritten or deleted (`RNF-SEC-04`). |
| **`LWW-Map` (Last-Write-Wins)** | User preferences, high-contrast mode, acknowledgment state | Deterministic total order via `HybridLogicalClock (HLC)`: `(physical_time, counter, node_id)`. |
| **`PN-Counter`** | Experience points (XP) and gamification daily streak (`RF-GAM-01..02`) | Convergent summation of per-node local increments without arithmetic collision. |

---

## 4. Signed Ground Export Contract (`ADR-010`, `RNF-NET-04`)

Based on **[ADR-010](08-Architecture-decisions.md#adr-010)** and `RF-REG-02`, the file exported by the CMO for handoff to the spacecraft's external DTN router follows this contract:

```json
{
  "exportSchemaVersion": "astha-dsn-v1.0",
  "generatedAtUtc": "2026-11-15T16:40:00Z",
  "missionId": "DST-1-MARS-TRANSIT",
  "isAnonymized": false,
  "signerDeviceId": "cmo-console-01",
  "crewSummary": {
    "crewId": "C001",
    "globalStatus": "CAUTION",
    "activeAlertsCount": 1,
    "driftsDetected": ["D-02: HR Modified Z-Score M = 2.74"]
  },
  "historyWindowDays": 14,
  "auditChainTipSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "ed25519Signature": "base64_signature_over_canonical_json_payload"
}
```

---

## 5. Design and Ergonomics Token Contract (`ADR-018`, `RNF-USA-01`, `RNF-USA-03`)

Strictly complying with **`ADR-018`** (WCAG AAA contrast $\ge 7:1$) and **`RNF-USA-01`** (operation with pressurized gloves):

| Token / Property | Specified Value | Purpose and Standards Compliance |
| :--- | :--- | :--- |
| **`--bg-space`** | `#030712` | Primary night/OLED background (low power `RNF-POW-02`). |
| **`--bg-card`** | `#0c1222` | Clinical card surface. |
| **`--alert-red`** | `#ef4444` | **Exclusive use** for status fills, borders, and alarm pulses (**Do not use for text**). |
| **`--alert-red-text`** | `#fca5a5` | **Mandatory for critical text** (`ADR-018`). Contrast ratio $10.61:1$ on `#030712` and $9.83:1$ on `#0c1222` (WCAG AAA). |
| **`--touch-target-min`** | `48px × 48px` | Minimum interactive size for buttons and checkboxes for gloved operation (`RNF-USA-01`). |
| **`--touch-gap-min`** | `12px` | Minimum spacing between adjacent controls (`RNF-USA-01`). |
