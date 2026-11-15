//! REST conformance with openapi.yaml and the issue #12 DoD:
//! 401 for an unknown Ed25519 signer, 422 for SHA-256 corruption, and full recovery of a new tablet through
//! `GET /sync/deltas?since_hlc=…` — including after a hub restart.
mod common;

use astha_sync_hub::router;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use common::*;
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

async fn call(
    app: &axum::Router,
    method: &str,
    uri: &str,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let mut req = Request::builder().method(method).uri(uri);
    let body = match body {
        Some(b) => {
            req = req.header("content-type", "application/json");
            Body::from(b.to_string())
        }
        None => Body::empty(),
    };
    let res = app.clone().oneshot(req.body(body).unwrap()).await.unwrap();
    let status = res.status();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    (
        status,
        serde_json::from_slice(&bytes).unwrap_or(Value::Null),
    )
}

#[tokio::test]
async fn health_matches_schema() {
    let dir = tempfile::tempdir().unwrap();
    let app = router(hub_in(dir.path()), None);
    let (s, b) = call(&app, "GET", "/api/v1/health", None).await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(b["status"], "ONLINE");
    assert_eq!(b["mdnsHost"], "astha.local");
    assert_eq!(b["oplogSequence"], 0);
    assert!(b["hubVersion"].is_string());
    assert_eq!(b["bundleHashSha256"].as_str().unwrap().len(), 0); // no static dir configured in this test
}

#[tokio::test]
async fn post_deltas_202_then_idempotent() {
    let dir = tempfile::tempdir().unwrap();
    let app = router(hub_in(dir.path()), None);
    let body = json!({ "deviceId": device_a(), "envelopes": all_envelopes() });
    let (s, b) = call(&app, "POST", "/api/v1/sync/deltas", Some(body.clone())).await;
    assert_eq!(s, StatusCode::ACCEPTED);
    assert_eq!(b["acceptedCount"], 10);
    assert_eq!(b["rejectedIds"], json!([]));
    assert_eq!(b["oplogTipSeq"], 10);
    let (s, b) = call(&app, "POST", "/api/v1/sync/deltas", Some(body)).await;
    assert_eq!(s, StatusCode::ACCEPTED);
    assert_eq!(b["acceptedCount"], 0);
    assert_eq!(b["duplicateCount"], 10);
    assert_eq!(b["oplogTipSeq"], 10); // append-only: nothing rewritten
}

#[tokio::test]
async fn dod_422_on_sha256_corruption_and_valid_envelopes_still_accepted() {
    let dir = tempfile::tempdir().unwrap();
    let app = router(hub_in(dir.path()), None);
    let good = envelopes("envelopesA");
    let bad = flip(&good[0], "ct");
    let body = json!({ "deviceId": device_a(), "envelopes": [bad, good[1].clone()] });
    let (s, b) = call(&app, "POST", "/api/v1/sync/deltas", Some(body)).await;
    assert_eq!(s, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(b["acceptedCount"], 1);
    assert_eq!(b["rejectedIds"], json!([good[0]["id"]]));
    assert!(b["rejections"][0]["reason"]
        .as_str()
        .unwrap()
        .contains("SHA-256"));
    // A forged signature from an enrolled device is also a 422.
    let body = json!({ "deviceId": device_a(), "envelopes": [flip(&good[2], "firma")] });
    assert_eq!(
        call(&app, "POST", "/api/v1/sync/deltas", Some(body))
            .await
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
}

#[tokio::test]
async fn dod_401_on_unknown_ed25519_signer() {
    let dir = tempfile::tempdir().unwrap();
    let app = router(hub_in(dir.path()), None);
    let v = vectors();
    let rogue_id = v["rogueDevice"]["deviceId"].clone();
    // Unknown submitting device.
    let body = json!({ "deviceId": rogue_id, "envelopes": [v["rogueEnvelope"]] });
    assert_eq!(
        call(&app, "POST", "/api/v1/sync/deltas", Some(body))
            .await
            .0,
        StatusCode::UNAUTHORIZED
    );
    // Enrolled submitter relaying an envelope signed by an unknown device.
    let body = json!({ "deviceId": device_a(), "envelopes": [v["rogueEnvelope"]] });
    let (s, b) = call(&app, "POST", "/api/v1/sync/deltas", Some(body)).await;
    assert_eq!(s, StatusCode::UNAUTHORIZED);
    assert_eq!(b["acceptedCount"], 0);
    // Handshake.
    assert_eq!(
        call(
            &app,
            "POST",
            "/api/v1/sync/handshake",
            Some(v["handshakeRogue"].clone())
        )
        .await
        .0,
        StatusCode::UNAUTHORIZED
    );
    let mut forged = v["handshakeA"].clone();
    forged["timestampUtc"] = json!("2031-01-01T00:00:00.000Z");
    assert_eq!(
        call(&app, "POST", "/api/v1/sync/handshake", Some(forged))
            .await
            .0,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn handshake_returns_hub_vv_and_missing_ids() {
    let dir = tempfile::tempdir().unwrap();
    let app = router(hub_in(dir.path()), None);
    let body = json!({ "deviceId": device_a(), "envelopes": all_envelopes() });
    call(&app, "POST", "/api/v1/sync/deltas", Some(body)).await;
    let (s, b) = call(
        &app,
        "POST",
        "/api/v1/sync/handshake",
        Some(vectors()["handshakeA"].clone()),
    )
    .await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(b["missingEnvelopeIds"].as_array().unwrap().len(), 10); // handshakeA carries an empty VV
    for v in b["hubVersionVector"].as_object().unwrap().values() {
        assert!(astha_sync_hub::hlc::Hlc::parse(v.as_str().unwrap()).is_some());
    }
}

/// DoD: a brand-new tablet pages `GET /sync/deltas?since_hlc=` until empty and recovers everything, in HLC order,
/// also after the hub restarts from its on-disk Op-Log.
#[tokio::test]
async fn dod_new_tablet_full_recovery_via_since_hlc_also_after_restart() {
    let dir = tempfile::tempdir().unwrap();
    let all = all_envelopes();
    {
        let app = router(hub_in(dir.path()), None);
        call(
            &app,
            "POST",
            "/api/v1/sync/deltas",
            Some(json!({ "deviceId": device_a(), "envelopes": all })),
        )
        .await;
    }
    let app = router(hub_in(dir.path()), None); // restart: state rebuilt from the segmented Op-Log
    let mut got: Vec<Value> = Vec::new();
    let mut since = String::new();
    loop {
        let uri = format!("/api/v1/sync/deltas?limit=3&since_hlc={since}");
        let (s, b) = call(&app, "GET", &uri, None).await;
        assert_eq!(s, StatusCode::OK);
        let page = b["envelopes"].as_array().unwrap().clone();
        if page.is_empty() {
            break;
        }
        assert!(page.len() <= 3);
        since = page.last().unwrap()["hlc"].as_str().unwrap().to_string();
        got.extend(page);
    }
    let mut want_ids: Vec<&str> = all.iter().map(|e| e["id"].as_str().unwrap()).collect();
    let mut got_ids: Vec<&str> = got.iter().map(|e| e["id"].as_str().unwrap()).collect();
    let hlcs: Vec<astha_sync_hub::hlc::Hlc> = got
        .iter()
        .map(|e| astha_sync_hub::hlc::Hlc::parse(e["hlc"].as_str().unwrap()).unwrap())
        .collect();
    assert!(hlcs.windows(2).all(|w| w[0] < w[1]), "ascending HLC");
    assert_eq!(
        got,
        got.iter()
            .map(|e| all.iter().find(|a| a["id"] == e["id"]).unwrap().clone())
            .collect::<Vec<_>>(),
        "byte-identical envelopes"
    );
    want_ids.sort();
    got_ids.sort();
    assert_eq!(got_ids, want_ids);
    assert_eq!(
        call(&app, "GET", "/api/v1/sync/deltas?since_hlc=bad", None)
            .await
            .0,
        StatusCode::BAD_REQUEST
    );
}

#[tokio::test]
async fn corrupted_oplog_line_is_skipped_and_reported_as_degraded() {
    let dir = tempfile::tempdir().unwrap();
    {
        let app = router(hub_in(dir.path()), None);
        call(
            &app,
            "POST",
            "/api/v1/sync/deltas",
            Some(json!({ "deviceId": device_a(), "envelopes": all_envelopes() })),
        )
        .await;
    }
    // Segments rotate every 4 records: 10 envelopes → 3 files. Flip one byte inside the first record.
    let seg = dir.path().join("segment-000001.jsonl");
    let mut text = std::fs::read_to_string(&seg).unwrap();
    let pos = text.find("\"ct\":\"").unwrap() + 8;
    let c = text.as_bytes()[pos] as char;
    text.replace_range(pos..pos + 1, if c == 'A' { "B" } else { "A" });
    std::fs::write(&seg, text).unwrap();
    assert!(dir.path().join("segment-000003.jsonl").exists());

    let hub = hub_in(dir.path());
    assert_eq!(hub.len(), 9);
    let app = router(hub, None);
    let (_, b) = call(&app, "GET", "/api/v1/health", None).await;
    assert_eq!(b["status"], "DEGRADED");
    assert!(b["degradedReasons"][0]
        .as_str()
        .unwrap()
        .contains("segment-000001.jsonl:1"));
    // The healthy peer re-supplies the lost envelope; the log only grows.
    let (s, body) = call(
        &app,
        "POST",
        "/api/v1/sync/deltas",
        Some(json!({ "deviceId": device_a(), "envelopes": all_envelopes() })),
    )
    .await;
    assert_eq!(s, StatusCode::ACCEPTED);
    assert_eq!(body["acceptedCount"], 1);
    assert_eq!(body["oplogTipSeq"], 11);
}

#[tokio::test]
async fn habitat_status_is_503_until_published() {
    let dir = tempfile::tempdir().unwrap();
    let app = router(hub_in(dir.path()), None);
    assert_eq!(
        call(&app, "GET", "/api/v1/habitat/status", None).await.0,
        StatusCode::SERVICE_UNAVAILABLE
    );
}
