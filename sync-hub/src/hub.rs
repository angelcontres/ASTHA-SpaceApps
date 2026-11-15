//! In-memory hub state over the Op-Log: verified envelopes indexed by id and HLC, the hub VersionVector, the
//! latest public cabin status, and the broadcast channel that feeds the WebSocket relay.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use serde_json::{json, Value};
use tokio::sync::broadcast;

use crate::crypto::{verify_envelope, Registry, Rejection};
use crate::hlc::{self, Hlc, VersionVector};
use crate::oplog::{OpLog, DEFAULT_SEGMENT_RECORDS};

pub const MDNS_HOST: &str = "astha.local";

#[derive(Clone)]
pub struct HubConfig {
    pub data_dir: PathBuf,
    pub segment_records: usize,
    pub fsync: bool,
    /// SHA-256 of the app shell served to the Service Worker (`GET /health`).
    pub bundle_hash: String,
}

impl HubConfig {
    pub fn new(data_dir: PathBuf) -> Self {
        HubConfig {
            data_dir,
            segment_records: DEFAULT_SEGMENT_RECORDS,
            fsync: true,
            bundle_hash: String::new(),
        }
    }
}

/// Message fanned out to every authenticated WebSocket except its origin.
#[derive(Clone, Debug)]
pub struct Relay {
    pub from: u64,
    pub json: Arc<str>,
}

struct Stored {
    hlc: Hlc,
    envelope: Value,
}

struct Index {
    entries: Vec<Stored>,
    by_id: HashMap<String, usize>,
    vv: VersionVector,
}

#[derive(Debug, Default)]
pub struct AcceptReport {
    pub accepted: Vec<Value>,
    pub duplicates: usize,
    pub rejected: Vec<(String, Rejection)>,
    pub tip_seq: u64,
}

impl AcceptReport {
    pub fn has_corruption(&self) -> bool {
        self.rejected
            .iter()
            .any(|(_, r)| !matches!(r, Rejection::UnknownDevice(_)))
    }
    pub fn has_unknown_device(&self) -> bool {
        self.rejected
            .iter()
            .any(|(_, r)| matches!(r, Rejection::UnknownDevice(_)))
    }
}

pub struct Hub {
    pub registry: Registry,
    pub config: HubConfig,
    oplog: Mutex<OpLog>,
    index: Mutex<Index>,
    cabin: Mutex<Option<Value>>,
    degraded: Mutex<Vec<String>>,
    pub relay: broadcast::Sender<Relay>,
}

impl Hub {
    pub fn open(registry: Registry, config: HubConfig) -> std::io::Result<Arc<Hub>> {
        let (oplog, report) = OpLog::open(
            &config.data_dir,
            config.segment_records,
            config.fsync,
            &registry,
        )?;
        let mut index = Index {
            entries: Vec::new(),
            by_id: HashMap::new(),
            vv: VersionVector::new(),
        };
        for r in report.records {
            if index.by_id.contains_key(&r.meta.id) {
                continue;
            }
            hlc::observe(&mut index.vv, &r.meta.hlc);
            index.by_id.insert(r.meta.id.clone(), index.entries.len());
            index.entries.push(Stored {
                hlc: r.meta.hlc,
                envelope: r.envelope,
            });
        }
        let degraded = report
            .corrupted
            .iter()
            .map(|(file, line, why)| format!("{file}:{line} skipped: {why}"))
            .collect::<Vec<_>>();
        for d in &degraded {
            eprintln!("[oplog] {d}");
        }
        let (relay, _) = broadcast::channel(1024);
        Ok(Arc::new(Hub {
            registry,
            config,
            oplog: Mutex::new(oplog),
            index: Mutex::new(index),
            cabin: Mutex::new(None),
            degraded: Mutex::new(degraded),
            relay,
        }))
    }

    /// Verifies and appends envelopes. Valid ones are accepted even if others in the batch are rejected.
    pub fn accept(&self, envelopes: &[Value]) -> AcceptReport {
        let mut report = AcceptReport::default();
        let mut log = self.oplog.lock().unwrap();
        let mut index = self.index.lock().unwrap();
        for env in envelopes {
            let id = env
                .get("id")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            match verify_envelope(&self.registry, env) {
                Err(r) => report.rejected.push((id, r)),
                Ok(meta) if index.by_id.contains_key(&meta.id) => report.duplicates += 1,
                Ok(meta) => match log.append(env) {
                    Ok(_) => {
                        hlc::observe(&mut index.vv, &meta.hlc);
                        let pos = index.entries.len();
                        index.by_id.insert(meta.id.clone(), pos);
                        index.entries.push(Stored {
                            hlc: meta.hlc,
                            envelope: env.clone(),
                        });
                        report.accepted.push(env.clone());
                    }
                    Err(e) => {
                        self.degraded
                            .lock()
                            .unwrap()
                            .push(format!("append failed: {e}"));
                        report
                            .rejected
                            .push((id, Rejection::Corrupted(format!("storage error: {e}"))));
                    }
                },
            }
        }
        report.tip_seq = log.tip_seq();
        report
    }

    /// Envelopes a peer with `vv` is missing, in ascending HLC (same rule as the PWA's `deltaFor`).
    pub fn missing_for(&self, vv: &VersionVector) -> Vec<Value> {
        let index = self.index.lock().unwrap();
        let mut out: Vec<&Stored> = index
            .entries
            .iter()
            .filter(|s| !hlc::has(vv, &s.hlc))
            .collect();
        out.sort_by(|a, b| a.hlc.cmp(&b.hlc));
        out.into_iter().map(|s| s.envelope.clone()).collect()
    }

    /// `GET /sync/deltas`: envelopes with HLC strictly greater than `since`, ascending, at most `limit`.
    pub fn since(&self, since: Option<&Hlc>, limit: usize) -> Vec<Value> {
        let index = self.index.lock().unwrap();
        let mut out: Vec<&Stored> = index
            .entries
            .iter()
            .filter(|s| since.is_none_or(|h| &s.hlc > h))
            .collect();
        out.sort_by(|a, b| a.hlc.cmp(&b.hlc));
        out.into_iter()
            .take(limit)
            .map(|s| s.envelope.clone())
            .collect()
    }

    pub fn by_ids(&self, ids: &[String]) -> Vec<Value> {
        let index = self.index.lock().unwrap();
        let mut out: Vec<&Stored> = ids
            .iter()
            .filter_map(|id| index.by_id.get(id).map(|i| &index.entries[*i]))
            .collect();
        out.sort_by(|a, b| a.hlc.cmp(&b.hlc));
        out.into_iter().map(|s| s.envelope.clone()).collect()
    }

    pub fn version_vector(&self) -> VersionVector {
        self.index.lock().unwrap().vv.clone()
    }

    pub fn wire_version_vector(&self) -> Value {
        json!(hlc::to_wire(&self.version_vector()))
    }

    pub fn len(&self) -> usize {
        self.index.lock().unwrap().entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn tip_seq(&self) -> u64 {
        self.oplog.lock().unwrap().tip_seq()
    }

    pub fn degraded_reasons(&self) -> Vec<String> {
        self.degraded.lock().unwrap().clone()
    }

    pub fn cabin_status(&self) -> Option<Value> {
        self.cabin.lock().unwrap().clone()
    }

    /// Stores the public cabin snapshot after strict validation (see `cabin.rs`).
    pub fn set_cabin_status(&self, status: Value) {
        *self.cabin.lock().unwrap() = Some(status);
    }

    pub fn broadcast(&self, from: u64, msg: &Value) {
        let _ = self.relay.send(Relay {
            from,
            json: Arc::from(msg.to_string()),
        });
    }
}
