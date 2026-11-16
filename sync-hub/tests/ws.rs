//! WebSocket relay over a real socket: signed handshake, backlog delivery, star relay, rejection of unknown
//! devices, and the ADR-014-validated cabin snapshot.
mod common;

use std::time::Duration;

use astha_sync_hub::router;
use common::*;
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use tokio_tungstenite::tungstenite::Message;

type Ws =
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;

async fn serve() -> (
    String,
    std::sync::Arc<astha_sync_hub::Hub>,
    tempfile::TempDir,
) {
    let dir = tempfile::tempdir().unwrap();
    let hub = hub_in(dir.path());
    let app = router(hub.clone(), None);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (format!("ws://{addr}/ws/sync"), hub, dir)
}

async fn connect(url: &str) -> Ws {
    tokio_tungstenite::connect_async(url).await.unwrap().0
}

async fn send(ws: &mut Ws, v: Value) {
    ws.send(Message::Text(v.to_string().into())).await.unwrap();
}

/// Next JSON message, or None on close/timeout.
async fn next(ws: &mut Ws) -> Option<Value> {
    loop {
        match tokio::time::timeout(Duration::from_secs(3), ws.next()).await {
            Ok(Some(Ok(Message::Text(t)))) => return serde_json::from_str(&t).ok(),
            Ok(Some(Ok(Message::Close(_)))) | Ok(None) | Err(_) => return None,
            Ok(Some(Ok(_))) => continue,
            Ok(Some(Err(_))) => return None,
        }
    }
}

/// Every socket authenticates with the PWA-signed fixture handshake of device A. The relay excludes only the
/// origin *connection*, so several sockets of the same device are enough to observe star propagation.
fn handshake_for(_socket: usize) -> Value {
    vectors()["handshakeA"].clone()
}

#[tokio::test]
async fn relays_deltas_in_star_and_sends_backlog_on_handshake() {
    let (url, hub, _dir) = serve().await;
    let mut a = connect(&url).await;
    let mut b = connect(&url).await;
    send(&mut a, handshake_for(0)).await;
    assert_eq!(next(&mut a).await.unwrap()["type"], "HANDSHAKE"); // empty hub: no backlog
    send(&mut b, handshake_for(1)).await;
    assert_eq!(next(&mut b).await.unwrap()["type"], "HANDSHAKE");

    let push = envelopes("envelopesA");
    send(&mut a, json!({ "type": "DELTA_PUSH", "envelopes": push })).await;
    let relayed = next(&mut b).await.unwrap();
    assert_eq!(relayed["type"], "DELTA_PUSH");
    assert_eq!(relayed["envelopes"].as_array().unwrap().len(), 6);
    assert_eq!(hub.len(), 6);

    // A late tablet gets the backlog first, then the hub HANDSHAKE.
    let mut c = connect(&url).await;
    send(&mut c, handshake_for(2)).await;
    let first = next(&mut c).await.unwrap();
    assert_eq!(first["type"], "DELTA_PUSH");
    assert_eq!(first["envelopes"].as_array().unwrap().len(), 6);
    assert_eq!(next(&mut c).await.unwrap()["type"], "HANDSHAKE");

    // REPLICA_REQUEST returns the requested envelope (SEU recovery, RNF-SEC-03).
    send(
        &mut c,
        json!({ "type": "REPLICA_REQUEST", "ids": [push[2]["id"]] }),
    )
    .await;
    let rep = next(&mut c).await.unwrap();
    assert_eq!(rep["envelopes"][0]["id"], push[2]["id"]);
}

#[tokio::test]
async fn rejects_unknown_device_and_unauthenticated_pushes() {
    let (url, hub, _dir) = serve().await;
    let mut rogue = connect(&url).await;
    send(&mut rogue, vectors()["handshakeRogue"].clone()).await;
    assert!(next(&mut rogue).await.is_none()); // closed with 4401
    let mut anon = connect(&url).await;
    send(
        &mut anon,
        json!({ "type": "DELTA_PUSH", "envelopes": envelopes("envelopesA") }),
    )
    .await;
    assert!(next(&mut anon).await.is_none());
    assert_eq!(hub.len(), 0);
}

#[tokio::test]
async fn corrupted_envelope_over_ws_is_rejected_and_not_relayed() {
    let (url, hub, _dir) = serve().await;
    let mut a = connect(&url).await;
    send(&mut a, handshake_for(0)).await;
    next(&mut a).await;
    let good = envelopes("envelopesB");
    send(
        &mut a,
        json!({ "type": "DELTA_PUSH", "envelopes": [flip(&good[0], "iv"), good[1].clone()] }),
    )
    .await;
    let r = next(&mut a).await.unwrap();
    assert_eq!(r["type"], "REJECTED");
    assert_eq!(r["rejections"][0]["id"], good[0]["id"]);
    assert_eq!(hub.len(), 1);
}

#[tokio::test]
async fn cabin_status_is_validated_against_adr_014() {
    let (url, hub, _dir) = serve().await;
    let mut a = connect(&url).await;
    send(&mut a, handshake_for(0)).await;
    next(&mut a).await;
    let status = json!({
        "updatedAtHlc": "001794800000000:000:abc123def456",
        "habitat": { "missionDay": 120, "ppCo2Mmhg": 1.6, "cabinPressureKpa": 101.3, "o2Percent": 20.9, "radiationUSvH": 24.0 },
        "crewTrafficLights": [{ "crewId": "C001", "globalStatus": "NOMINAL", "hasUnacknowledgedCritical5Min": false }]
    });
    let mut leaky = status.clone();
    leaky["crewTrafficLights"][0]["sbp"] = json!(144);
    send(&mut a, json!({ "type": "CABIN_STATUS", "status": leaky })).await;
    assert_eq!(next(&mut a).await.unwrap()["type"], "REJECTED");
    assert!(hub.cabin_status().is_none());
    send(
        &mut a,
        json!({ "type": "CABIN_STATUS", "status": status.clone() }),
    )
    .await;
    tokio::time::sleep(Duration::from_millis(50)).await;
    assert_eq!(hub.cabin_status(), Some(status));
}
