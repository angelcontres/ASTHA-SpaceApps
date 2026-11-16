//! In-memory hub state over the Op-Log: verified envelopes indexed by id and HLC, the hub VersionVector, the
//! latest public cabin status, and the broadcast channel that feeds the WebSocket relay.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, RwLock};
use std::time::{Duration, Instant, SystemTime};

use serde_json::{json, Value};
use tokio::sync::broadcast;

use crate::crypto::{verify_envelope, verify_handshake, Registry, Rejection};
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
    /// Enrollment file (ADR-020). Re-read automatically when it changes, so enrolling needs no restart.
    pub enrollment_path: Option<PathBuf>,
    /// Trust on first use: enroll an unknown device that proves possession of the key in its handshake
    /// (`publicJwk` whose hash is its deviceId + valid signature). Development/demo only.
    pub auto_enroll: bool,
}

impl HubConfig {
    pub fn new(data_dir: PathBuf) -> Self {
        HubConfig {
            data_dir,
            segment_records: DEFAULT_SEGMENT_RECORDS,
            fsync: true,
            bundle_hash: String::new(),
            enrollment_path: None,
            auto_enroll: false,
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
    registry: RwLock<Registry>,
    enrollment_mtime: Mutex<Option<SystemTime>>,
    rejection_log: Mutex<HashMap<String, Instant>>,
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
        let mtime = config.enrollment_path.as_deref().and_then(file_mtime);
        Ok(Arc::new(Hub {
            registry: RwLock::new(registry),
            enrollment_mtime: Mutex::new(mtime),
            rejection_log: Mutex::new(HashMap::new()),
            config,
            oplog: Mutex::new(oplog),
            index: Mutex::new(index),
            cabin: Mutex::new(None),
            degraded: Mutex::new(degraded),
            relay,
        }))
    }

    pub fn registry_len(&self) -> usize {
        self.registry.read().unwrap().len()
    }

    pub fn enrolled_device_ids(&self) -> Vec<String> {
        self.registry.read().unwrap().device_ids()
    }

    /// Is the device enrolled? Re-reads the enrollment file first if it changed on disk.
    pub fn is_enrolled(&self, device_id: &str) -> bool {
        if self.registry.read().unwrap().contains(device_id) {
            return true;
        }
        self.reload_enrollment_if_changed() && self.registry.read().unwrap().contains(device_id)
    }

    /// Re-reads the enrollment file if its modification time changed. Returns true if it was reloaded.
    pub fn reload_enrollment_if_changed(&self) -> bool {
        let Some(path) = self.config.enrollment_path.as_deref() else {
            return false;
        };
        let now = file_mtime(path);
        let mut last = self.enrollment_mtime.lock().unwrap();
        if now.is_none() || now == *last {
            return false;
        }
        match Registry::from_file(path) {
            Ok(reg) => {
                eprintln!(
                    "[enroll] reloaded {} ({} devices)",
                    path.display(),
                    reg.len()
                );
                *self.registry.write().unwrap() = reg;
                *last = now;
                true
            }
            Err(e) => {
                eprintln!("[enroll] ignoring invalid enrollment file: {e}");
                *last = now; // do not retry the same broken content on every handshake
                false
            }
        }
    }

    /// Verifies a signed handshake (REST or WebSocket). Unknown devices trigger an enrollment-file reload and,
    /// in auto-enroll mode, proof-of-possession enrollment. Rejections are logged (once per device per minute).
    pub fn verify_handshake(&self, body: &Value) -> Result<String, Rejection> {
        let first = verify_handshake(&self.registry.read().unwrap(), body);
        let result = match first {
            Err(Rejection::UnknownDevice(id)) => {
                if self.reload_enrollment_if_changed() {
                    verify_handshake(&self.registry.read().unwrap(), body)
                } else if self.config.auto_enroll {
                    self.auto_enroll(&id, body)
                } else {
                    Err(Rejection::UnknownDevice(id))
                }
            }
            other => other,
        };
        if let Err(r) = &result {
            let id = body
                .get("deviceId")
                .and_then(Value::as_str)
                .unwrap_or("?")
                .to_string();
            self.log_rejection(&id, r);
        }
        result
    }

    fn auto_enroll(&self, device_id: &str, body: &Value) -> Result<String, Rejection> {
        let unknown = || Rejection::UnknownDevice(device_id.to_string());
        let jwk = body.get("publicJwk").ok_or_else(unknown)?;
        let mut candidate = Registry::default();
        candidate.enroll(device_id, jwk).map_err(|_| unknown())?; // key hash must equal the deviceId
        verify_handshake(&candidate, body)?; // proof of possession of the private key
        {
            let mut reg = self.registry.write().unwrap();
            reg.enroll(device_id, jwk).map_err(|_| unknown())?;
            if let Some(path) = self.config.enrollment_path.as_deref() {
                if let Err(e) = write_atomic(path, reg.to_json().as_bytes()) {
                    eprintln!("[enroll] could not persist {}: {e}", path.display());
                }
                *self.enrollment_mtime.lock().unwrap() = file_mtime(path);
            }
        }
        eprintln!("[enroll] auto-enrolled device {device_id}");
        Ok(device_id.to_string())
    }

    fn log_rejection(&self, device_id: &str, r: &Rejection) {
        let mut seen = self.rejection_log.lock().unwrap();
        let now = Instant::now();
        if seen
            .get(device_id)
            .is_some_and(|t| now.duration_since(*t) < Duration::from_secs(60))
        {
            return;
        }
        seen.insert(device_id.to_string(), now);
        eprintln!("[handshake] rejected {device_id}: {}", r.reason());
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
            let mut verdict = verify_envelope(&self.registry.read().unwrap(), env);
            if matches!(verdict, Err(Rejection::UnknownDevice(_)))
                && self.reload_enrollment_if_changed()
            {
                verdict = verify_envelope(&self.registry.read().unwrap(), env);
            }
            match verdict {
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

fn file_mtime(path: &std::path::Path) -> Option<SystemTime> {
    std::fs::metadata(path).and_then(|m| m.modified()).ok()
}

/// Writes via a temporary file + rename so a crash never leaves a half-written enrollment file.
fn write_atomic(path: &std::path::Path, bytes: &[u8]) -> std::io::Result<()> {
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, bytes)?;
    std::fs::rename(tmp, path)
}
