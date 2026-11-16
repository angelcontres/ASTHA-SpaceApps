//! Public cabin snapshot (`GET /habitat/status`, openapi.yaml `CabinGlobalStatus`, ADR-014).
//!
//! The hub is zero-knowledge, so it cannot derive this view from encrypted envelopes. An authenticated device
//! publishes it over the WebSocket (`CABIN_STATUS`, a documented extension of the contract) and the hub serves it
//! to bulkhead displays. Validation is a strict allow-list: any field outside the schema (an individual
//! biomarker, an organ, a diagnosis) rejects the whole snapshot, so private clinical data can never reach a
//! public screen through the hub.

use serde_json::{Map, Value};

use crate::hlc::Hlc;

const TOP: &[&str] = &["updatedAtHlc", "habitat", "crewTrafficLights"];
const HABITAT: &[&str] = &[
    "missionDay",
    "ppCo2Mmhg",
    "cabinPressureKpa",
    "o2Percent",
    "radiationUSvH",
];
const LIGHT: &[&str] = &["crewId", "globalStatus", "hasUnacknowledgedCritical5Min"];
const CREW: &[&str] = &["C001", "C002", "C003", "C004"];
const STATUS: &[&str] = &["NOMINAL", "CAUTION", "CRITICAL"];

fn exact_keys(obj: &Map<String, Value>, allowed: &[&str], what: &str) -> Result<(), String> {
    if let Some(extra) = obj.keys().find(|k| !allowed.contains(&k.as_str())) {
        return Err(format!(
            "{what}: field `{extra}` is not allowed on public displays (ADR-014)"
        ));
    }
    if let Some(missing) = allowed.iter().find(|k| !obj.contains_key(**k)) {
        return Err(format!("{what}: missing `{missing}`"));
    }
    Ok(())
}

pub fn validate(v: &Value) -> Result<Value, String> {
    let top = v.as_object().ok_or("status must be an object")?;
    exact_keys(top, TOP, "CabinGlobalStatus")?;
    let hlc = top["updatedAtHlc"]
        .as_str()
        .ok_or("updatedAtHlc must be a string")?;
    Hlc::parse(hlc).ok_or("updatedAtHlc must be an HLC")?;

    let habitat = top["habitat"]
        .as_object()
        .ok_or("habitat must be an object")?;
    exact_keys(habitat, HABITAT, "habitat")?;
    let day = habitat["missionDay"]
        .as_u64()
        .ok_or("habitat.missionDay must be an integer")?;
    if !(1..=180).contains(&day) {
        return Err("habitat.missionDay must be 1..180".into());
    }
    for k in &HABITAT[1..] {
        if !habitat[*k].is_number() {
            return Err(format!("habitat.{k} must be a number"));
        }
    }

    let lights = top["crewTrafficLights"]
        .as_array()
        .ok_or("crewTrafficLights must be an array")?;
    if lights.len() > CREW.len() {
        return Err("too many crewTrafficLights".into());
    }
    for l in lights {
        let o = l.as_object().ok_or("traffic light must be an object")?;
        exact_keys(o, LIGHT, "crewTrafficLights[]")?;
        if !o["crewId"].as_str().is_some_and(|c| CREW.contains(&c)) {
            return Err("crewId must be C001..C004".into());
        }
        if !o["globalStatus"]
            .as_str()
            .is_some_and(|s| STATUS.contains(&s))
        {
            return Err("globalStatus must be NOMINAL, CAUTION or CRITICAL".into());
        }
        if !o["hasUnacknowledgedCritical5Min"].is_boolean() {
            return Err("hasUnacknowledgedCritical5Min must be a boolean".into());
        }
    }
    Ok(v.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    pub fn sample() -> Value {
        json!({
            "updatedAtHlc": "001794800000000:000:abc123def456",
            "habitat": { "missionDay": 120, "ppCo2Mmhg": 1.6, "cabinPressureKpa": 101.3, "o2Percent": 20.9, "radiationUSvH": 24.0 },
            "crewTrafficLights": [
                { "crewId": "C001", "globalStatus": "NOMINAL", "hasUnacknowledgedCritical5Min": false },
                { "crewId": "C003", "globalStatus": "CRITICAL", "hasUnacknowledgedCritical5Min": true }
            ]
        })
    }

    #[test]
    fn accepts_the_contract_shape() {
        assert!(validate(&sample()).is_ok());
    }

    #[test]
    fn rejects_any_clinical_or_unknown_field() {
        let mut s = sample();
        s["crewTrafficLights"][0]["sbp"] = json!(144);
        assert!(validate(&s).unwrap_err().contains("ADR-014"));
        let mut s = sample();
        s["habitat"]["heartRate"] = json!(80);
        assert!(validate(&s).is_err());
        let mut s = sample();
        s["diagnosis"] = json!("SANS");
        assert!(validate(&s).is_err());
        let mut s = sample();
        s["crewTrafficLights"][0]["globalStatus"] = json!("SANS CRITICAL");
        assert!(validate(&s).is_err());
    }
}
