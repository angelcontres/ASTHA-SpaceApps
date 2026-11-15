# 📦 SDD-06: Diseño de Datos y Contratos de Interfaz
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | JSON Schema Draft-07

---

## 1. Esquema de Telemetría Biomédica Unificada (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ASTHA_Unified_Telemetry_Packet",
  "type": "object",
  "properties": {
    "packetId": { "type": "string", "format": "uuid" },
    "metTimestamp": { "type": "string", "example": "048:14:28:10" },
    "astronaut": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "enum": ["C001", "C002", "C003", "C004"] },
        "name": { "type": "string" },
        "heartRateBpm": { "type": "integer", "minimum": 30, "maximum": 220 },
        "systolicPressureMmhg": { "type": "integer", "minimum": 60, "maximum": 260 },
        "diastolicPressureMmhg": { "type": "integer", "minimum": 40, "maximum": 160 },
        "spo2Percentage": { "type": "number", "minimum": 70.0, "maximum": 100.0 },
        "hrvRmssdMs": { "type": "number", "minimum": 5.0, "maximum": 150.0 },
        "skinTempCelsius": { "type": "number", "minimum": 34.0, "maximum": 42.0 }
      },
      "required": ["id", "heartRateBpm", "systolicPressureMmhg", "spo2Percentage", "hrvRmssdMs"]
    },
    "habitatEclss": {
      "type": "object",
      "properties": {
        "cabinPressureKpa": { "type": "number", "minimum": 50.0, "maximum": 110.0 },
        "co2PartialPressureMmhg": { "type": "number", "minimum": 0.0, "maximum": 15.0 },
        "o2Percentage": { "type": "number", "minimum": 15.0, "maximum": 30.0 },
        "radiationDoseRateUsvH": { "type": "number", "minimum": 0.0 }
      },
      "required": ["cabinPressureKpa", "co2PartialPressureMmhg", "o2Percentage"]
    },
    "cdssState": {
      "type": "object",
      "properties": {
        "driftDetected": { "type": "boolean" },
        "madScore": { "type": "number" },
        "masterCautionActive": { "type": "boolean" },
        "activeProtocol": { "type": "string" }
      }
    }
  },
  "required": ["packetId", "metTimestamp", "astronaut", "habitatEclss", "cdssState"]
}
```

---

## 2. Estructura de Paquete DTN (RFC 9171 / CCSDS Bundle)

```
+-------------------------------------------------------------------------+
|                  PRIMARY BUNDLE HEADER (RFC 9171)                       |
| Bundle Processing Flags | Destination EID: dtn://jsc.nasa.gov/bmed      |
| Source EID: dtn://dst1.mars/astha | Creation Timestamp: MET 048:14:28:10 |
| Lifetime: 604,800 s (7 días)      | Payload Length: 4,096 bytes         |
+-------------------------------------------------------------------------+
|                    BUNDLE PAYLOAD BLOCK (CBOR Encoded)                  |
|  - Encrypted Medical Telemetry Vector (AES-256-GCM)                    |
|  - Vital Sign Baseline Moving Averages (10-minute Epoch)                |
|  - Countermeasure Interventions Administered by Crew                    |
|  - NASA OSDR Genomic Mutation Divergence Delta                         |
+-------------------------------------------------------------------------+
```

---

## 3. Modelo de Persistencia Local (IndexedDB Schema)

| Object Store | Primary Key | Índices | Propósito |
| :--- | :--- | :--- | :--- |
| `telemetry_epochs` | `timestamp_utc` | `[astronaut_id, timestamp]`, `[drift_flag]` | Registro cronológico continuo de bioseñales a 1 Hz |
| `clinical_events` | `event_id` | `[severity]`, `[diagnosis_code]` | Eventos clínicos, alarmas y tratamientos administrados |
| `dtn_outbox_queue` | `bundle_id` | `[priority]`, `[custody_status]` | Cola persistente de paquetes DTN para sincronización con Tierra |
| `osdr_genomic_cache` | `study_accession` | `[organ_system]`, `[assay_type]` | Base de datos local precargada de estudios NASA OSDR (Inspiration4) |
