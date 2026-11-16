//! Segmented, append-only Op-Log on disk (ADR-008, RNF-SEC-03/04).
//!
//! * Files `segment-000001.jsonl`, `segment-000002.jsonl`, … opened in append mode only: no record is ever
//!   rewritten, truncated or deleted by the hub.
//! * One JSON line per accepted envelope: `{"seq":n,"recordSha256":<hex>,"envelope":{…}}`, where `recordSha256`
//!   covers the canonical envelope. On startup every line is re-verified (record digest + envelope SHA-256 +
//!   Ed25519); a damaged line (bit flip on flash, torn write after power loss) is skipped and reported instead of
//!   poisoning the log. Healthy peers re-supply the missing envelope on their next handshake.
//! * Only ciphertext envelopes are written. The hub never stores AES keys and never decrypts (zero-knowledge).

use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use serde_json::{json, Value};

use crate::crypto::{canonical_json, sha256_hex, verify_envelope, EnvelopeMeta, Registry};

pub const DEFAULT_SEGMENT_RECORDS: usize = 10_000;

pub struct LoadedRecord {
    pub seq: u64,
    pub meta: EnvelopeMeta,
    pub envelope: Value,
}

pub struct LoadReport {
    pub records: Vec<LoadedRecord>,
    /// Lines that failed verification and were skipped (segment file, line number, reason).
    pub corrupted: Vec<(String, usize, String)>,
}

pub struct OpLog {
    dir: PathBuf,
    segment_records: usize,
    segment_index: u32,
    segment_count: usize,
    file: File,
    seq: u64,
    fsync: bool,
}

fn segment_name(i: u32) -> String {
    format!("segment-{i:06}.jsonl")
}

impl OpLog {
    /// Opens (or creates) the log, verifying and returning every stored record in order.
    pub fn open(
        dir: &Path,
        segment_records: usize,
        fsync: bool,
        registry: &Registry,
    ) -> std::io::Result<(OpLog, LoadReport)> {
        fs::create_dir_all(dir)?;
        let mut segments: Vec<(u32, PathBuf)> = fs::read_dir(dir)?
            .filter_map(Result::ok)
            .filter_map(|e| {
                let name = e.file_name().into_string().ok()?;
                let n = name
                    .strip_prefix("segment-")?
                    .strip_suffix(".jsonl")?
                    .parse::<u32>()
                    .ok()?;
                Some((n, e.path()))
            })
            .collect();
        segments.sort_by_key(|(n, _)| *n);

        let mut report = LoadReport {
            records: Vec::new(),
            corrupted: Vec::new(),
        };
        let mut seq = 0u64;
        let mut last_index = 1u32;
        let mut last_count = 0usize;
        for (n, path) in &segments {
            last_index = *n;
            last_count = 0;
            let name = path.file_name().unwrap().to_string_lossy().to_string();
            for (lineno, line) in BufReader::new(File::open(path)?).lines().enumerate() {
                let line = match line {
                    Ok(l) => l,
                    Err(e) => {
                        report.corrupted.push((
                            name.clone(),
                            lineno + 1,
                            format!("unreadable: {e}"),
                        ));
                        continue;
                    }
                };
                if line.trim().is_empty() {
                    continue;
                }
                last_count += 1;
                match verify_line(&line, registry) {
                    Ok((s, meta, envelope)) => {
                        seq = seq.max(s);
                        report.records.push(LoadedRecord {
                            seq: s,
                            meta,
                            envelope,
                        });
                    }
                    Err(why) => report.corrupted.push((name.clone(), lineno + 1, why)),
                }
            }
        }
        if last_count >= segment_records {
            last_index += 1;
            last_count = 0;
        }
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(dir.join(segment_name(last_index)))?;
        let log = OpLog {
            dir: dir.to_path_buf(),
            segment_records: segment_records.max(1),
            segment_index: last_index,
            segment_count: last_count,
            file,
            seq,
            fsync,
        };
        Ok((log, report))
    }

    /// Appends one verified envelope. Returns its sequence number.
    pub fn append(&mut self, envelope: &Value) -> std::io::Result<u64> {
        if self.segment_count >= self.segment_records {
            self.segment_index += 1;
            self.segment_count = 0;
            self.file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(self.dir.join(segment_name(self.segment_index)))?;
        }
        let seq = self.seq + 1;
        let line = canonical_json(&json!({
            "seq": seq,
            "recordSha256": sha256_hex(canonical_json(envelope).as_bytes()),
            "envelope": envelope,
        }));
        self.file.write_all(line.as_bytes())?;
        self.file.write_all(b"\n")?;
        self.file.flush()?;
        if self.fsync {
            self.file.sync_data()?;
        }
        self.seq = seq;
        self.segment_count += 1;
        Ok(seq)
    }

    pub fn tip_seq(&self) -> u64 {
        self.seq
    }

    pub fn segment_index(&self) -> u32 {
        self.segment_index
    }
}

fn verify_line(line: &str, registry: &Registry) -> Result<(u64, EnvelopeMeta, Value), String> {
    let v: Value = serde_json::from_str(line).map_err(|e| format!("not JSON: {e}"))?;
    let seq = v.get("seq").and_then(Value::as_u64).ok_or("missing seq")?;
    let digest = v
        .get("recordSha256")
        .and_then(Value::as_str)
        .ok_or("missing recordSha256")?;
    let envelope = v.get("envelope").cloned().ok_or("missing envelope")?;
    if sha256_hex(canonical_json(&envelope).as_bytes()) != digest {
        return Err("record SHA-256 mismatch (SEU or torn write)".into());
    }
    let meta = verify_envelope(registry, &envelope).map_err(|r| r.reason())?;
    Ok((seq, meta, envelope))
}
