//! mDNS advertisement of `astha.local` and `_astha._tcp` (ADR-007, RNF-NET-03: discovery without typing IPs).
//! Failure is never fatal: tablets that already know the hub keep working, and the PWA stays autonomous.

use mdns_sd::{ServiceDaemon, ServiceInfo};

pub fn advertise(port: u16) -> Option<ServiceDaemon> {
    let daemon = match ServiceDaemon::new() {
        Ok(d) => d,
        Err(e) => {
            eprintln!("[mdns] disabled: {e}");
            return None;
        }
    };
    let props = [("path", "/ws/sync"), ("api", "/api/v1")];
    let info = match ServiceInfo::new(
        "_astha._tcp.local.",
        "ASTHA Sync Hub",
        "astha.local.",
        "",
        port,
        &props[..],
    ) {
        Ok(i) => i.enable_addr_auto(),
        Err(e) => {
            eprintln!("[mdns] invalid service info: {e}");
            return None;
        }
    };
    match daemon.register(info) {
        Ok(()) => {
            eprintln!("[mdns] advertising astha.local:{port} (_astha._tcp)");
            Some(daemon)
        }
        Err(e) => {
            eprintln!("[mdns] register failed: {e}");
            None
        }
    }
}
