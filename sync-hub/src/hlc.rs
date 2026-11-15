//! Hybrid Logical Clock values and VersionVectors as used by the PWA (`astha-pwa/src/storage/crdt.ts`, ADR-009).
//! The hub never ticks a clock of its own: it only parses, compares and summarises the HLCs carried by envelopes.

use std::cmp::Ordering;
use std::collections::BTreeMap;

use serde_json::Value;

/// Counter ceiling used by the PWA when packing `wallMs * 1000 + counter`.
pub const COUNTER_MAX: u64 = 999;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Hlc {
    pub wall_ms: u64,
    pub counter: u64,
    pub node: String,
}

impl Hlc {
    /// Parses `ms:cnt:node` (openapi.yaml pattern `^\d+:\d+:[a-zA-Z0-9-]+$`).
    pub fn parse(s: &str) -> Option<Hlc> {
        let mut parts = s.splitn(3, ':');
        let wall = parts.next()?;
        let counter = parts.next()?;
        let node = parts.next()?;
        if wall.is_empty() || counter.is_empty() || node.is_empty() {
            return None;
        }
        if !wall.bytes().all(|b| b.is_ascii_digit()) || !counter.bytes().all(|b| b.is_ascii_digit())
        {
            return None;
        }
        if !node.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-') {
            return None;
        }
        Some(Hlc {
            wall_ms: wall.parse().ok()?,
            counter: counter.parse().ok()?,
            node: node.to_string(),
        })
    }

    /// Same packing as the PWA (`packHlc`).
    pub fn packed(&self) -> u64 {
        self.wall_ms
            .saturating_mul(1000)
            .saturating_add(self.counter)
    }

    /// Same encoding as the PWA (`encodeHlc`): lexicographically sortable.
    pub fn encode(&self) -> String {
        format!("{:015}:{:03}:{}", self.wall_ms, self.counter, self.node)
    }
}

impl Ord for Hlc {
    fn cmp(&self, other: &Self) -> Ordering {
        self.wall_ms
            .cmp(&other.wall_ms)
            .then(self.counter.cmp(&other.counter))
            .then_with(|| self.node.cmp(&other.node))
    }
}

impl PartialOrd for Hlc {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// node → highest packed HLC seen from that node.
pub type VersionVector = BTreeMap<String, u64>;

pub fn observe(vv: &mut VersionVector, h: &Hlc) {
    let p = h.packed();
    let e = vv.entry(h.node.clone()).or_insert(0);
    if *e < p {
        *e = p;
    }
}

/// Does a peer with `vv` already have the event `h`?
pub fn has(vv: &VersionVector, h: &Hlc) -> bool {
    vv.get(&h.node).is_some_and(|p| *p >= h.packed())
}

/// Contract wire format (openapi.yaml `VersionVector`): node → HLC string.
pub fn to_wire(vv: &VersionVector) -> BTreeMap<String, String> {
    vv.iter()
        .map(|(node, p)| {
            (
                node.clone(),
                Hlc {
                    wall_ms: p / 1000,
                    counter: p % 1000,
                    node: node.clone(),
                }
                .encode(),
            )
        })
        .collect()
}

/// Wire → internal. Malformed entries, or entries whose HLC names another node, are ignored (never trusted).
pub fn from_wire(v: &Value) -> VersionVector {
    let mut out = VersionVector::new();
    if let Some(obj) = v.as_object() {
        for (node, value) in obj {
            if let Some(h) = value.as_str().and_then(Hlc::parse) {
                if &h.node == node && h.counter <= COUNTER_MAX {
                    out.insert(node.clone(), h.packed());
                }
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_pwa_and_contract_encodings() {
        let a = Hlc::parse("001794800000000:004:tablet-c001").unwrap();
        let b = Hlc::parse("1794800000000:0004:tablet-c001").unwrap();
        assert_eq!(a, b);
        assert_eq!(a.encode(), "001794800000000:004:tablet-c001");
        assert!(Hlc::parse("1:2").is_none());
        assert!(Hlc::parse("x:2:n").is_none());
        assert!(Hlc::parse("1:2:bad node").is_none());
    }

    #[test]
    fn total_order_breaks_ties_by_node() {
        let a = Hlc::parse("5:0:a").unwrap();
        let b = Hlc::parse("5:0:b").unwrap();
        let c = Hlc::parse("5:1:a").unwrap();
        assert!(a < b && b < c);
    }

    #[test]
    fn wire_round_trip_and_rejects_mismatched_nodes() {
        let mut vv = VersionVector::new();
        observe(&mut vv, &Hlc::parse("1794800000000:4:tablet-c001").unwrap());
        assert_eq!(from_wire(&json!(to_wire(&vv))), vv);
        assert!(from_wire(&json!({"x": "nope", "y": 1, "n1": "1:2:other"})).is_empty());
    }
}
