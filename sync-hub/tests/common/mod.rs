#![allow(dead_code)]
//! Shared fixtures: envelopes and handshakes produced by the PWA's own crypto code (`tests/fixtures/pwa_vectors.json`).

use std::sync::Arc;

use astha_sync_hub::crypto::Registry;
use astha_sync_hub::{Hub, HubConfig};
use serde_json::Value;

pub fn vectors() -> Value {
    serde_json::from_str(include_str!("../fixtures/pwa_vectors.json")).unwrap()
}

pub fn registry() -> Registry {
    Registry::from_json(&vectors()["enrolled"].to_string()).unwrap()
}

pub fn envelopes(key: &str) -> Vec<Value> {
    vectors()[key].as_array().unwrap().clone()
}

pub fn all_envelopes() -> Vec<Value> {
    let mut v = envelopes("envelopesA");
    v.extend(envelopes("envelopesB"));
    v
}

pub fn device_a() -> String {
    vectors()["enrolled"][0]["deviceId"]
        .as_str()
        .unwrap()
        .to_string()
}

pub fn hub_in(dir: &std::path::Path) -> Arc<Hub> {
    let mut cfg = HubConfig::new(dir.to_path_buf());
    cfg.fsync = false;
    cfg.segment_records = 4; // small segments to exercise rotation
    Hub::open(registry(), cfg).unwrap()
}

/// Flips one base64 character of a field (simulated SEU).
pub fn flip(env: &Value, field: &str) -> Value {
    let mut e = env.clone();
    let s = e[field].as_str().unwrap().to_string();
    let mut chars: Vec<char> = s.chars().collect();
    let i = chars.len() / 2;
    chars[i] = if chars[i] == 'A' { 'B' } else { 'A' };
    e[field] = Value::String(chars.into_iter().collect());
    e
}
