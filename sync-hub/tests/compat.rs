//! Cross-language compatibility: the Rust hub verifies envelopes and handshakes signed by the PWA (TypeScript).
mod common;

use astha_sync_hub::crypto::{verify_envelope, verify_handshake, Registry, Rejection};
use common::*;
use serde_json::json;

#[test]
fn every_pwa_envelope_verifies_sha256_and_ed25519() {
    let reg = registry();
    for env in all_envelopes() {
        let meta = verify_envelope(&reg, &env).expect("PWA envelope must verify");
        assert_eq!(meta.id, env["id"].as_str().unwrap());
        assert_eq!(meta.autor, env["autor"].as_str().unwrap());
    }
}

#[test]
fn seu_in_any_covered_field_is_detected_as_corruption() {
    let reg = registry();
    let env = &envelopes("envelopesA")[0];
    for field in ["ct", "iv", "sha256", "id", "keyRef"] {
        let bad = flip(env, field);
        assert!(
            matches!(verify_envelope(&reg, &bad), Err(Rejection::Corrupted(_))),
            "flip in {field} must be Corrupted"
        );
    }
    assert_eq!(
        verify_envelope(&reg, &flip(env, "firma")),
        Err(Rejection::BadSignature)
    );
}

#[test]
fn unknown_author_is_rejected_as_unknown_device() {
    let reg = registry();
    let v = vectors();
    let rogue = &v["rogueEnvelope"];
    assert!(matches!(
        verify_envelope(&reg, rogue),
        Err(Rejection::UnknownDevice(_))
    ));
}

#[test]
fn pwa_handshake_signature_verifies_and_rogue_is_unknown() {
    let reg = registry();
    let v = vectors();
    assert_eq!(
        verify_handshake(&reg, &v["handshakeA"]).unwrap(),
        device_a()
    );
    assert!(matches!(
        verify_handshake(&reg, &v["handshakeRogue"]),
        Err(Rejection::UnknownDevice(_))
    ));
    let mut forged = v["handshakeA"].clone();
    forged["timestampUtc"] = json!("2030-01-01T00:00:00.000Z");
    assert_eq!(
        verify_handshake(&reg, &forged),
        Err(Rejection::BadSignature)
    );
}

#[test]
fn enrollment_binds_device_id_to_its_key() {
    let v = vectors();
    let mut entry = v["enrolled"][0].clone();
    entry["deviceId"] = json!("000000000000");
    assert!(Registry::from_json(&json!([entry]).to_string())
        .unwrap_err()
        .contains("does not match"));
    let ecdsa = json!([{ "deviceId": "x", "publicJwk": { "kty": "EC", "crv": "P-256", "x": "a", "y": "b" } }]);
    assert!(Registry::from_json(&ecdsa.to_string()).is_err());
}
