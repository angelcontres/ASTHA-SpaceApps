//! WebSocket relay at `/ws/sync` (03-Contratos §2.2): star-topology propagation of `EncryptedEnvelope` deltas.
//!
//! Per connection: nothing is accepted until a signed `HANDSHAKE` verifies against an enrolled device key.
//! Then the hub sends the envelopes the device lacks (`DELTA_PUSH`, ascending HLC) followed by its own
//! `HANDSHAKE`, so the device replies with what the hub lacks. Accepted deltas are relayed to every other
//! authenticated device in arrival order. Messages: HANDSHAKE, DELTA_PUSH, REPLICA_REQUEST, ALARM_ESCALATION and
//! the CABIN_STATUS extension (see `cabin.rs`).

use std::sync::atomic::{AtomicU64, Ordering};

use axum::extract::ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use tokio::sync::broadcast::error::RecvError;

use crate::api::AppState;
use crate::cabin;
use crate::hlc;

static NEXT_CONN: AtomicU64 = AtomicU64::new(1);
/// Application close code: handshake rejected (mirrors HTTP 401).
pub const CLOSE_UNAUTHORIZED: u16 = 4401;

pub async fn upgrade(ws: WebSocketUpgrade, State(hub): State<AppState>) -> Response {
    ws.max_message_size(8 << 20)
        .on_upgrade(move |socket| serve(socket, hub))
}

async fn serve(socket: WebSocket, hub: AppState) {
    let conn = NEXT_CONN.fetch_add(1, Ordering::Relaxed);
    let (mut tx, mut rx) = socket.split();
    let mut relay = hub.relay.subscribe();
    let mut device: Option<String> = None;

    loop {
        tokio::select! {
            incoming = rx.next() => {
                let text = match incoming {
                    Some(Ok(Message::Text(t))) => t.to_string(),
                    Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                    Some(Ok(_)) => continue, // binary / ping / pong: ignored (pings answered by the stack)
                };
                let Ok(msg) = serde_json::from_str::<Value>(&text) else { continue };
                let replies = handle(&hub, conn, &mut device, &msg);
                for r in replies {
                    match r {
                        Reply::Send(v) => if tx.send(Message::Text(v.to_string().into())).await.is_err() { return },
                        Reply::Close(reason) => {
                            let _ = tx.send(Message::Close(Some(CloseFrame { code: CLOSE_UNAUTHORIZED, reason: reason.into() }))).await;
                            return;
                        }
                    }
                }
            }
            relayed = relay.recv() => match relayed {
                Ok(r) if r.from != conn && device.is_some() => {
                    if tx.send(Message::Text(r.json.to_string().into())).await.is_err() { break }
                }
                Ok(_) => {}
                // A slow client missed relays: closing makes it reconnect and catch up through the handshake.
                Err(RecvError::Lagged(_)) => break,
                Err(RecvError::Closed) => break,
            }
        }
    }
}

enum Reply {
    Send(Value),
    Close(String),
}

fn handle(hub: &AppState, conn: u64, device: &mut Option<String>, msg: &Value) -> Vec<Reply> {
    let kind = msg.get("type").and_then(Value::as_str).unwrap_or("");
    if kind == "HANDSHAKE" {
        return match hub.verify_handshake(msg) {
            Ok(id) => {
                *device = Some(id);
                let client_vv = hlc::from_wire(msg.get("versionVector").unwrap_or(&Value::Null));
                let missing = hub.missing_for(&client_vv);
                let mut out = Vec::new();
                if !missing.is_empty() {
                    out.push(Reply::Send(
                        json!({ "type": "DELTA_PUSH", "envelopes": missing }),
                    ));
                }
                out.push(Reply::Send(json!({
                    "type": "HANDSHAKE", "deviceId": "hub", "versionVector": hub.wire_version_vector(),
                    "timestampUtc": "", "ed25519Signature": "",
                })));
                out
            }
            Err(r) => vec![Reply::Close(r.reason())],
        };
    }
    if device.is_none() {
        return vec![Reply::Close("handshake required".into())];
    }
    match kind {
        "DELTA_PUSH" => {
            let envelopes = msg
                .get("envelopes")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            let report = hub.accept(&envelopes);
            if !report.accepted.is_empty() {
                hub.broadcast(
                    conn,
                    &json!({ "type": "DELTA_PUSH", "envelopes": report.accepted }),
                );
            }
            if report.rejected.is_empty() {
                return vec![];
            }
            let reasons: Vec<Value> = report
                .rejected
                .iter()
                .map(|(id, r)| json!({ "id": id, "reason": r.reason() }))
                .collect();
            vec![Reply::Send(
                json!({ "type": "REJECTED", "rejections": reasons }),
            )]
        }
        "REPLICA_REQUEST" => {
            let ids: Vec<String> = msg
                .get("ids")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();
            let found = hub.by_ids(&ids);
            if found.is_empty() {
                vec![]
            } else {
                vec![Reply::Send(
                    json!({ "type": "DELTA_PUSH", "envelopes": found }),
                )]
            }
        }
        "ALARM_ESCALATION" => {
            hub.broadcast(conn, msg);
            vec![]
        }
        "CABIN_STATUS" => match msg.get("status").map(cabin::validate) {
            Some(Ok(status)) => {
                hub.set_cabin_status(status);
                vec![]
            }
            Some(Err(why)) => vec![Reply::Send(
                json!({ "type": "REJECTED", "rejections": [{ "id": "CABIN_STATUS", "reason": why }] }),
            )],
            None => vec![],
        },
        _ => vec![],
    }
}
