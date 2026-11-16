//! REST API under `/api/v1`, faithful to `docs/Modelo-datos-y-APIs/openapi.yaml`.

use std::sync::Arc;

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::crypto::Rejection;
use crate::hlc::{self, Hlc};
use crate::hub::{Hub, MDNS_HOST};

pub type AppState = Arc<Hub>;

fn error(status: StatusCode, message: impl Into<String>) -> Response {
    (status, Json(json!({ "error": message.into() }))).into_response()
}

/// `GET /health`
pub async fn health(State(hub): State<AppState>) -> Json<Value> {
    let degraded = hub.degraded_reasons();
    let enrolled_ids = hub.enrolled_device_ids();
    Json(json!({
        "status": if degraded.is_empty() { "ONLINE" } else { "DEGRADED" },
        "hubVersion": env!("CARGO_PKG_VERSION"),
        "bundleHashSha256": hub.config.bundle_hash,
        "oplogSequence": hub.tip_seq(),
        "mdnsHost": MDNS_HOST,
        "enrolledDevices": enrolled_ids.len(),
        "enrolledDeviceIds": enrolled_ids,
        "autoEnroll": hub.config.auto_enroll,
        "degradedReasons": degraded,
    }))
}

/// `POST /sync/handshake`: 200 with the hub VersionVector and the ids the client lacks; 401 for an unknown
/// device or an invalid Ed25519 signature.
pub async fn handshake(State(hub): State<AppState>, Json(body): Json<Value>) -> Response {
    match hub.verify_handshake(&body) {
        Ok(_) => {
            let client_vv = hlc::from_wire(body.get("versionVector").unwrap_or(&Value::Null));
            let missing: Vec<Value> = hub
                .missing_for(&client_vv)
                .iter()
                .filter_map(|e| e.get("id").cloned())
                .collect();
            Json(json!({ "hubVersionVector": hub.wire_version_vector(), "missingEnvelopeIds": missing })).into_response()
        }
        Err(Rejection::Corrupted(why)) => error(StatusCode::BAD_REQUEST, why),
        Err(r) => error(StatusCode::UNAUTHORIZED, r.reason()),
    }
}

#[derive(Deserialize)]
pub struct DeltaQuery {
    since_hlc: Option<String>,
    limit: Option<usize>,
}

/// `GET /sync/deltas?since_hlc=&limit=`: envelopes after `since_hlc`, ascending HLC (limit 1..500, default 100).
/// A new tablet recovers the full history by paging with `since_hlc` = HLC of the last envelope received.
pub async fn get_deltas(State(hub): State<AppState>, Query(q): Query<DeltaQuery>) -> Response {
    let since = match q.since_hlc.as_deref().filter(|s| !s.is_empty()) {
        None => None,
        Some(s) => match Hlc::parse(s) {
            Some(h) => Some(h),
            None => return error(StatusCode::BAD_REQUEST, "since_hlc must match ms:cnt:node"),
        },
    };
    let limit = q.limit.unwrap_or(100).clamp(1, 500);
    let envelopes = hub.since(since.as_ref(), limit);
    Json(json!({ "envelopes": envelopes, "hubVersionVector": hub.wire_version_vector() }))
        .into_response()
}

#[derive(Deserialize)]
pub struct DeltaPush {
    #[serde(rename = "deviceId")]
    device_id: String,
    envelopes: Vec<Value>,
}

/// `POST /sync/deltas`: 202 when every envelope verifies; 422 if any fails SHA-256 or Ed25519 verification;
/// 401 if the submitting device, or an envelope author, is not enrolled. Valid envelopes in a mixed batch are
/// still appended and relayed (append-only CRDT deltas are independent of each other).
pub async fn post_deltas(State(hub): State<AppState>, Json(body): Json<DeltaPush>) -> Response {
    if !hub.is_enrolled(&body.device_id) {
        return error(
            StatusCode::UNAUTHORIZED,
            format!("unknown device {}", body.device_id),
        );
    }
    let report = hub.accept(&body.envelopes);
    if !report.accepted.is_empty() {
        hub.broadcast(
            0,
            &json!({ "type": "DELTA_PUSH", "envelopes": report.accepted }),
        );
    }
    let status = if report.has_corruption() {
        StatusCode::UNPROCESSABLE_ENTITY
    } else if report.has_unknown_device() {
        StatusCode::UNAUTHORIZED
    } else {
        StatusCode::ACCEPTED
    };
    let rejected_ids: Vec<&String> = report.rejected.iter().map(|(id, _)| id).collect();
    let reasons: Vec<Value> = report
        .rejected
        .iter()
        .map(|(id, r)| json!({ "id": id, "reason": r.reason() }))
        .collect();
    (
        status,
        Json(json!({
            "acceptedCount": report.accepted.len(),
            "rejectedIds": rejected_ids,
            "oplogTipSeq": report.tip_seq,
            "duplicateCount": report.duplicates,
            "rejections": reasons,
        })),
    )
        .into_response()
}

/// `GET /habitat/status`: public cabin view (ADR-014). 503 until an authenticated device has published one.
pub async fn habitat_status(State(hub): State<AppState>) -> Response {
    match hub.cabin_status() {
        Some(s) => Json(s).into_response(),
        None => error(
            StatusCode::SERVICE_UNAVAILABLE,
            "no cabin status published yet",
        ),
    }
}
