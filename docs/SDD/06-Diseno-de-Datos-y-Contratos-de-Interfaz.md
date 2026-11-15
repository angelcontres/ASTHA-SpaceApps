# 📦 SDD-06: Diseño de Datos y Contratos de Interfaz
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | JSON Schema Draft-07 | **ADRs:** 006, 009, 010, 012, 016, 018

---

## 1. Modelo de Registro Fisiológico Diario y Hábitat (`SRS §5.1`, `ADR-016`)

Conforme a **[ADR-016](08-Architecture-decisions.md#adr-016)** y `RF-ING-01`, cada tripulante registra una medición diaria consolidada (9 variables fisiológicas obligatorias + calcio urinario opcional) junto con la telemetría ambiental compartida del hábitat (`RF-ING-02`).

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
        "isSuspect": { "type": "boolean", "description": "RF-ING-05: Marcado sin descartar si excede rango plausible" }
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
      "description": "Catálogo cerrado de 6 síntomas táctiles (RF-ING-04)",
      "items": {
        "type": "string",
        "enum": ["blurredVision", "headache", "nausea", "lumbarPain", "orthostaticDizziness", "extremeFatigue"]
      }
    }
  }
}
```

---

## 2. Sobre Criptográfico de Persistencia en IndexedDB (`ADR-006`, `RNF-SEC-01/03/04`)

De acuerdo con **[ADR-006](08-Architecture-decisions.md#adr-006)** y **SRS §5.2**, todo registro clínico se cifra localmente en **IndexedDB** utilizando la API nativa `window.crypto.subtle` sin librerías criptográficas externas ni WASM:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ASTHA_Encrypted_Envelope",
  "type": "object",
  "required": ["id", "hlc", "autor", "iv", "ct", "sha256", "firma"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "hlc": { "type": "string", "example": "1794800000000:0001:tablet-c001", "description": "Hybrid Logical Clock (ADR-009)" },
    "autor": { "type": "string", "description": "ID del dispositivo o tripulante emisor" },
    "iv": { "type": "string", "description": "Vector de inicialización AES-GCM 96-bit en Base64" },
    "ct": { "type": "string", "description": "Ciphertext AES-GCM-256 cifrado con clave del tripulante (ADR-012)" },
    "sha256": { "type": "string", "description": "Suma SHA-256 del sobre para detección de bit-flips SEU (RNF-SEC-03)" },
    "firma": { "type": "string", "description": "Firma digital Ed25519 del dispositivo + hash previo para bitácora append-only (RNF-SEC-04)" }
  }
}
```

---

## 3. Estructuras CRDT y Reloj Lógico Híbrido (`ADR-009`, `RNF-NET-02`)

La sincronización sin coordinación en LAN cerrada utiliza tres estructuras CRDT específicas:

| Estructura CRDT | Uso en ASTHA | Regla de Resolución de Conflictos |
| :--- | :--- | :--- |
| **`G-Set` (Grow-Only Set)** | Registros diarios, síntomas, alertas y pasos de bitácora | Unión pura de conjuntos por `id`. Ningún dato médico se sobrescribe ni borra (`RNF-SEC-04`). |
| **`LWW-Map` (Last-Write-Wins)** | Preferencias de usuario, modo alto contraste, estado de reconocimiento | Orden total determinista mediante `HybridLogicalClock (HLC)`: `(tiempo_fisico, contador, id_nodo)`. |
| **`PN-Counter`** | Puntos de experiencia (XP) y racha diaria de gamificación (`RF-GAM-01..02`) | Suma convergente de incrementos locales por nodo sin colisión aritmética. |

---

## 4. Contrato de Exportación Firmada para Tierra (`ADR-010`, `RNF-NET-04`)

Con base en **[ADR-010](08-Architecture-decisions.md#adr-010)** y `RF-REG-02`, el archivo exportado por el CMO para entrega al router DTN externo de la nave sigue este contrato:

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

## 5. Contrato de Tokens de Diseño y Ergonomía (`ADR-018`, `RNF-USA-01`, `RNF-USA-03`)

Cumpliendo estrictamente con **`ADR-018`** (contraste $\ge 7:1$ WCAG AAA) y **`RNF-USA-01`** (uso con guantes presurizados):

| Token / Propiedad | Valor Especificado | Propósito y Cumplimiento Normativo |
| :--- | :--- | :--- |
| **`--bg-space`** | `#030712` | Fondo primario nocturno/OLED (bajo consumo `RNF-POW-02`). |
| **`--bg-card`** | `#0c1222` | Superficie de tarjetas clínicas. |
| **`--alert-red`** | `#ef4444` | **Uso exclusivo** para rellenos de estado, bordes y pulsos de alarma (**No usar en texto**). |
| **`--alert-red-text`** | `#fca5a5` | **Uso obligatorio para texto crítico** (`ADR-018`). Contraste $10.61:1$ sobre `#030712` y $9.83:1$ sobre `#0c1222` (WCAG AAA). |
| **`--touch-target-min`** | `48px × 48px` | Tamaño mínimo interactivo de botones y checkboxes para guantes (`RNF-USA-01`). |
| **`--touch-gap-min`** | `12px` | Separación mínima entre controles adyacentes (`RNF-USA-01`). |
