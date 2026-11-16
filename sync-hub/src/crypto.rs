//! Envelope and handshake verification, byte-compatible with the PWA (`integrity.ts`, `syncClient.ts`).
//!
//! * `sha256` = SHA-256 (hex) of the canonical JSON of `{id, hlc, autor, keyRef, iv, ct}` (RNF-SEC-03).
//! * `firma`  = Ed25519 signature of the device over the UTF-8 bytes of that hex digest (ADR-006).
//! * Handshake signature = Ed25519 over canonical `{deviceId, versionVector, timestampUtc}`.
//!
//! The hub verifies ciphertext integrity and authorship only. It holds no AES key and never decrypts
//! (zero-knowledge, ADR-008 / ADR-012).

use std::collections::HashMap;
use std::path::Path;

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::Deserialize;
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

use crate::hlc::Hlc;

/// Canonical JSON identical to the PWA's `canonicalJson`: compact, object keys sorted, `null` fields kept.
/// `serde_json` (without `preserve_order`) stores objects in a `BTreeMap`, so keys serialise sorted.
pub fn canonical_json(v: &Value) -> String {
    serde_json::to_string(v).expect("JSON values always serialise")
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Rejection {
    /// Author not enrolled on the hub (pre-flight provisioning, ADR-020) → HTTP 401.
    UnknownDevice(String),
    /// Malformed or SEU-corrupted envelope (SHA-256 mismatch) → HTTP 422.
    Corrupted(String),
    /// Enrolled device but the Ed25519 signature does not verify → HTTP 422.
    BadSignature,
}

impl Rejection {
    pub fn reason(&self) -> String {
        match self {
            Rejection::UnknownDevice(d) => format!("unknown device {d}"),
            Rejection::Corrupted(why) => format!("corrupted envelope: {why}"),
            Rejection::BadSignature => "invalid Ed25519 signature".into(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct EnrolledDevice {
    #[serde(rename = "deviceId")]
    device_id: String,
    #[serde(rename = "publicJwk")]
    public_jwk: Value,
}

/// Devices enrolled before launch (ADR-020): deviceId → Ed25519 public key.
#[derive(Default, Clone, Debug)]
pub struct Registry {
    /// deviceId → (verifying key, original JWK kept to persist the enrollment file).
    devices: HashMap<String, (VerifyingKey, Value)>,
}

impl Registry {
    pub fn from_json(text: &str) -> Result<Registry, String> {
        let list: Vec<EnrolledDevice> =
            serde_json::from_str(text).map_err(|e| format!("enrollment file: {e}"))?;
        let mut reg = Registry::default();
        for d in list {
            reg.enroll(&d.device_id, &d.public_jwk)?;
        }
        Ok(reg)
    }

    pub fn from_file(path: &Path) -> Result<Registry, String> {
        let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
        Registry::from_json(&text)
    }

    /// Accepts only Ed25519 OKP JWKs. The deviceId must be the PWA's `nodeId`: the first 12 hex characters of
    /// SHA-256(canonical JWK), so an enrollment entry cannot bind a key to someone else's id.
    pub fn enroll(&mut self, device_id: &str, jwk: &Value) -> Result<(), String> {
        if jwk.get("kty") != Some(&json!("OKP")) || jwk.get("crv") != Some(&json!("Ed25519")) {
            return Err(format!("{device_id}: only Ed25519 OKP keys are supported"));
        }
        let x = jwk
            .get("x")
            .and_then(Value::as_str)
            .ok_or(format!("{device_id}: missing x"))?;
        let raw = URL_SAFE_NO_PAD
            .decode(x)
            .map_err(|_| format!("{device_id}: x is not base64url"))?;
        let bytes: [u8; 32] = raw
            .try_into()
            .map_err(|_| format!("{device_id}: x must be 32 bytes"))?;
        let key = VerifyingKey::from_bytes(&bytes)
            .map_err(|_| format!("{device_id}: invalid Ed25519 key"))?;
        let expected = &sha256_hex(canonical_json(jwk).as_bytes())[..12];
        if expected != device_id {
            return Err(format!(
                "{device_id}: does not match its key (expected {expected})"
            ));
        }
        self.devices
            .insert(device_id.to_string(), (key, jwk.clone()));
        Ok(())
    }

    /// Enrollment file content: entries sorted by deviceId (stable diffs).
    pub fn to_json(&self) -> String {
        let mut ids: Vec<&String> = self.devices.keys().collect();
        ids.sort();
        let list: Vec<Value> = ids
            .into_iter()
            .map(|id| json!({ "deviceId": id, "publicJwk": self.devices[id].1 }))
            .collect();
        serde_json::to_string_pretty(&list).expect("JSON values always serialise") + "\n"
    }

    pub fn contains(&self, device_id: &str) -> bool {
        self.devices.contains_key(device_id)
    }

    pub fn len(&self) -> usize {
        self.devices.len()
    }

    pub fn is_empty(&self) -> bool {
        self.devices.is_empty()
    }

    pub fn device_ids(&self) -> Vec<String> {
        let mut ids: Vec<String> = self.devices.keys().cloned().collect();
        ids.sort();
        ids
    }

    fn verify(&self, device_id: &str, message: &[u8], sig_b64: &str) -> Result<(), Rejection> {
        let (key, _) = self
            .devices
            .get(device_id)
            .ok_or_else(|| Rejection::UnknownDevice(device_id.to_string()))?;
        let raw = STANDARD
            .decode(sig_b64)
            .map_err(|_| Rejection::BadSignature)?;
        let sig = Signature::from_slice(&raw).map_err(|_| Rejection::BadSignature)?;
        key.verify(message, &sig)
            .map_err(|_| Rejection::BadSignature)
    }
}

fn str_field<'a>(v: &'a Value, k: &str) -> Result<&'a str, Rejection> {
    v.get(k)
        .and_then(Value::as_str)
        .ok_or_else(|| Rejection::Corrupted(format!("missing or non-string `{k}`")))
}

/// Verified metadata of an accepted envelope (the envelope itself is relayed byte-for-byte as received).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnvelopeMeta {
    pub id: String,
    pub hlc: Hlc,
    pub autor: String,
}

/// Verifies an `EncryptedEnvelope` (openapi.yaml): enrolled author, shape, SHA-256 digest, Ed25519 signature.
pub fn verify_envelope(reg: &Registry, env: &Value) -> Result<EnvelopeMeta, Rejection> {
    if !env.is_object() {
        return Err(Rejection::Corrupted("not an object".into()));
    }
    let autor = str_field(env, "autor")?;
    if !reg.contains(autor) {
        return Err(Rejection::UnknownDevice(autor.to_string()));
    }
    let id = str_field(env, "id")?;
    let hlc_s = str_field(env, "hlc")?;
    let iv = str_field(env, "iv")?;
    let digest = str_field(env, "sha256")?;
    let firma = str_field(env, "firma")?;
    let hlc = Hlc::parse(hlc_s).ok_or_else(|| Rejection::Corrupted("malformed hlc".into()))?;
    if hlc.node != autor {
        return Err(Rejection::Corrupted("hlc node differs from autor".into()));
    }
    if digest.len() != 64 || !digest.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(Rejection::Corrupted("sha256 field damaged".into()));
    }
    if STANDARD.decode(iv).map(|b| b.len()) != Ok(12) {
        return Err(Rejection::Corrupted("iv is not 96 bits".into()));
    }
    let mut covered = Map::new();
    for k in ["id", "hlc", "autor", "iv", "ct"] {
        covered.insert(k.into(), Value::String(str_field(env, k)?.to_string()));
    }
    if let Some(key_ref) = env.get("keyRef") {
        covered.insert("keyRef".into(), key_ref.clone());
    }
    if sha256_hex(canonical_json(&Value::Object(covered)).as_bytes()) != digest.to_ascii_lowercase()
    {
        return Err(Rejection::Corrupted(
            "SHA-256 mismatch (possible SEU)".into(),
        ));
    }
    reg.verify(autor, digest.as_bytes(), firma)?;
    Ok(EnvelopeMeta {
        id: id.to_string(),
        hlc,
        autor: autor.to_string(),
    })
}

/// Verifies a `HANDSHAKE` / `POST /sync/handshake` body. Returns the device id.
pub fn verify_handshake(reg: &Registry, body: &Value) -> Result<String, Rejection> {
    let device_id = str_field(body, "deviceId")?;
    let timestamp = str_field(body, "timestampUtc")?;
    let vv = body
        .get("versionVector")
        .cloned()
        .unwrap_or(Value::Object(Map::new()));
    if !vv.is_object() {
        return Err(Rejection::Corrupted(
            "versionVector must be an object".into(),
        ));
    }
    let sig = body
        .get("ed25519Signature")
        .and_then(Value::as_str)
        .unwrap_or("");
    let signed = canonical_json(
        &json!({ "deviceId": device_id, "versionVector": vv, "timestampUtc": timestamp }),
    );
    reg.verify(device_id, signed.as_bytes(), sig)?;
    Ok(device_id.to_string())
}

/// Adds one enrollment record (`{"deviceId", "publicJwk"}`, as shown by the PWA) to an enrollment file,
/// validating the key and the deviceId binding. Writes atomically. Returns the device id.
pub fn enroll_into_file(path: &Path, record: &str) -> Result<String, String> {
    let rec: EnrolledDevice = serde_json::from_str(record).map_err(|e| format!("record: {e}"))?;
    let mut reg = if path.exists() {
        Registry::from_file(path)?
    } else {
        Registry::default()
    };
    reg.enroll(&rec.device_id, &rec.public_jwk)?;
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, reg.to_json()).map_err(|e| format!("{}: {e}", tmp.display()))?;
    std::fs::rename(&tmp, path).map_err(|e| format!("{}: {e}", path.display()))?;
    Ok(rec.device_id)
}
