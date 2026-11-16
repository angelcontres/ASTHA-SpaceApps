//! ASTHA Sync Hub — optional zero-knowledge CRDT relay for the spacecraft LAN (ADR-007, ADR-008, ADR-009).
//!
//! The hub stores and relays AES-GCM-256 envelopes it cannot read. It verifies their SHA-256 integrity and the
//! Ed25519 signature of the enrolled device that produced them, keeps them in an append-only segmented Op-Log,
//! and serves the PWA app shell over HTTPS (TLS 1.3, internal CA). If the hub is down, every tablet keeps its
//! full clinical autonomy and converges when the hub returns.

pub mod api;
pub mod cabin;
pub mod crypto;
pub mod hlc;
pub mod hub;
pub mod mdns;
pub mod oplog;
pub mod tls;
pub mod ws;

use std::path::Path;

use axum::routing::{get, post};
use axum::Router;
use tower_http::services::{ServeDir, ServeFile};

pub use hub::{Hub, HubConfig};

/// `/api/v1/*` REST, `/ws/sync` relay and, optionally, the static PWA shell as fallback.
pub fn router(hub: api::AppState, static_dir: Option<&Path>) -> Router {
    let api = Router::new()
        .route("/health", get(api::health))
        .route("/sync/handshake", post(api::handshake))
        .route("/sync/deltas", get(api::get_deltas).post(api::post_deltas))
        .route("/habitat/status", get(api::habitat_status));
    let mut app = Router::new()
        .nest("/api/v1", api)
        .route("/ws/sync", get(ws::upgrade))
        .with_state(hub);
    if let Some(dir) = static_dir {
        let shell = ServeDir::new(dir).fallback(ServeFile::new(dir.join("index.html")));
        app = app.fallback_service(shell);
    }
    app
}

/// SHA-256 of the app shell advertised in `GET /health`: the Service Worker file, which embeds the build
/// version and the precache manifest (falls back to `index.html`).
pub fn bundle_hash(static_dir: Option<&Path>) -> String {
    let Some(dir) = static_dir else {
        return crypto::sha256_hex(b"");
    };
    for name in ["sw.js", "index.html"] {
        if let Ok(bytes) = std::fs::read(dir.join(name)) {
            return crypto::sha256_hex(&bytes);
        }
    }
    crypto::sha256_hex(b"")
}
