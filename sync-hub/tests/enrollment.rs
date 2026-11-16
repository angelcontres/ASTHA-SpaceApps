//! Enrollment lifecycle (ADR-020): hot reload of devices.json without restart, and the opt-in auto-enroll mode
//! (proof of possession). Root cause of the "online/offline flapping" report: an unenrolled device was refused.
mod common;

use std::sync::Arc;

use astha_sync_hub::crypto::{Registry, Rejection};
use astha_sync_hub::{Hub, HubConfig};
use common::*;
use serde_json::{json, Value};

fn hub_with(dir: &std::path::Path, devices: &Value, auto_enroll: bool) -> Arc<Hub> {
    let path = dir.join("devices.json");
    std::fs::write(&path, devices.to_string()).unwrap();
    let mut cfg = HubConfig::new(dir.join("data"));
    cfg.fsync = false;
    cfg.enrollment_path = Some(path.clone());
    cfg.auto_enroll = auto_enroll;
    Hub::open(Registry::from_file(&path).unwrap(), cfg).unwrap()
}

fn rogue_handshake_with_key() -> Value {
    let v = vectors();
    let mut hs = v["handshakeRogue"].clone();
    hs["publicJwk"] = v["rogueDevice"]["publicJwk"].clone();
    hs
}

#[test]
fn enrolling_a_device_in_devices_json_takes_effect_without_restart() {
    let dir = tempfile::tempdir().unwrap();
    let hub = hub_with(dir.path(), &json!([]), false);
    let hs = vectors()["handshakeA"].clone();
    assert!(matches!(
        hub.verify_handshake(&hs),
        Err(Rejection::UnknownDevice(_))
    ));
    std::thread::sleep(std::time::Duration::from_millis(20)); // distinct mtime
    std::fs::write(
        dir.path().join("devices.json"),
        json!([vectors()["enrolled"][0]]).to_string(),
    )
    .unwrap();
    assert_eq!(hub.verify_handshake(&hs).unwrap(), device_a());
    assert_eq!(hub.registry_len(), 1);
}

#[test]
fn auto_enroll_is_off_by_default() {
    let dir = tempfile::tempdir().unwrap();
    let hub = hub_with(dir.path(), &json!([]), false);
    assert!(matches!(
        hub.verify_handshake(&rogue_handshake_with_key()),
        Err(Rejection::UnknownDevice(_))
    ));
    assert_eq!(hub.registry_len(), 0);
}

#[test]
fn auto_enroll_registers_a_device_that_proves_its_key_and_persists_it() {
    let dir = tempfile::tempdir().unwrap();
    let hub = hub_with(dir.path(), &json!([]), true);
    let rogue_id = vectors()["rogueDevice"]["deviceId"]
        .as_str()
        .unwrap()
        .to_string();
    assert_eq!(
        hub.verify_handshake(&rogue_handshake_with_key()).unwrap(),
        rogue_id
    );
    assert!(hub.is_enrolled(&rogue_id));
    let saved = Registry::from_file(&dir.path().join("devices.json")).unwrap();
    assert!(saved.contains(&rogue_id)); // survives a restart
                                        // Its envelopes are now accepted.
    let report = hub.accept(&[vectors()["rogueEnvelope"].clone()]);
    assert_eq!(report.accepted.len(), 1);
}

#[test]
fn auto_enroll_rejects_a_key_that_does_not_match_the_device_id_or_a_bad_signature() {
    let dir = tempfile::tempdir().unwrap();
    let hub = hub_with(dir.path(), &json!([]), true);
    let v = vectors();
    let mut wrong_key = v["handshakeRogue"].clone();
    wrong_key["publicJwk"] = v["enrolled"][0]["publicJwk"].clone(); // someone else's key
    assert!(hub.verify_handshake(&wrong_key).is_err());
    let mut forged = rogue_handshake_with_key();
    forged["timestampUtc"] = json!("2040-01-01T00:00:00.000Z"); // signature no longer valid
    assert!(hub.verify_handshake(&forged).is_err());
    let mut no_key = v["handshakeRogue"].clone();
    no_key.as_object_mut().unwrap().remove("publicJwk");
    assert!(hub.verify_handshake(&no_key).is_err());
    assert_eq!(hub.registry_len(), 0);
}

#[test]
fn enroll_into_file_adds_validated_records_idempotently() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("devices.json");
    let rec = vectors()["enrolled"][0].to_string();
    assert_eq!(
        astha_sync_hub::crypto::enroll_into_file(&path, &rec).unwrap(),
        device_a()
    );
    astha_sync_hub::crypto::enroll_into_file(&path, &rec).unwrap(); // idempotent
    assert_eq!(Registry::from_file(&path).unwrap().len(), 1);
    let mut bad = vectors()["enrolled"][0].clone();
    bad["deviceId"] = json!("000000000000");
    assert!(astha_sync_hub::crypto::enroll_into_file(&path, &bad.to_string()).is_err());
}
