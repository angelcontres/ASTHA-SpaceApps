//! `astha-sync-hub` binary. Single-threaded tokio runtime (low power, ADR-008).
//!
//! ```text
//! astha-sync-hub --enrollment devices.json --tls-cert astha.local.crt --tls-key astha.local.key \
//!                [--bind 0.0.0.0:8443] [--data-dir ./hub-data] [--static-dir ../astha-pwa/dist] \
//!                [--segment-records 10000] [--no-mdns] [--no-fsync] [--insecure-http]
//! ```
//! `--insecure-http` serves plain HTTP for local development only (the PWA treats `localhost` as secure).

use std::net::SocketAddr;
use std::path::PathBuf;

use astha_sync_hub::crypto::Registry;
use astha_sync_hub::{bundle_hash, mdns, router, tls, Hub, HubConfig};

struct Args {
    bind: SocketAddr,
    data_dir: PathBuf,
    enrollment: PathBuf,
    static_dir: Option<PathBuf>,
    tls_cert: Option<PathBuf>,
    tls_key: Option<PathBuf>,
    segment_records: usize,
    mdns: bool,
    fsync: bool,
    insecure_http: bool,
}

fn parse_args() -> Result<Args, String> {
    let mut a = Args {
        bind: "0.0.0.0:8443".parse().unwrap(),
        data_dir: PathBuf::from("hub-data"),
        enrollment: PathBuf::from("devices.json"),
        static_dir: None,
        tls_cert: None,
        tls_key: None,
        segment_records: astha_sync_hub::oplog::DEFAULT_SEGMENT_RECORDS,
        mdns: true,
        fsync: true,
        insecure_http: false,
    };
    let mut it = std::env::args().skip(1);
    while let Some(flag) = it.next() {
        let mut value = || it.next().ok_or(format!("{flag} needs a value"));
        match flag.as_str() {
            "--bind" => a.bind = value()?.parse().map_err(|e| format!("--bind: {e}"))?,
            "--data-dir" => a.data_dir = value()?.into(),
            "--enrollment" => a.enrollment = value()?.into(),
            "--static-dir" => a.static_dir = Some(value()?.into()),
            "--tls-cert" => a.tls_cert = Some(value()?.into()),
            "--tls-key" => a.tls_key = Some(value()?.into()),
            "--segment-records" => {
                a.segment_records = value()?
                    .parse()
                    .map_err(|e| format!("--segment-records: {e}"))?
            }
            "--no-mdns" => a.mdns = false,
            "--no-fsync" => a.fsync = false,
            "--insecure-http" => a.insecure_http = true,
            "-h" | "--help" => {
                println!(
                    "{}",
                    include_str!("main.rs")
                        .lines()
                        .take(9)
                        .collect::<Vec<_>>()
                        .join("\n")
                );
                std::process::exit(0);
            }
            other => return Err(format!("unknown flag {other}")),
        }
    }
    if !a.insecure_http && (a.tls_cert.is_none() || a.tls_key.is_none()) {
        return Err(
            "--tls-cert and --tls-key are required (or --insecure-http for local development)"
                .into(),
        );
    }
    Ok(a)
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let args = parse_args().unwrap_or_else(|e| {
        eprintln!("error: {e}");
        std::process::exit(2);
    });
    let registry = Registry::from_file(&args.enrollment).unwrap_or_else(|e| {
        eprintln!("error: {e}");
        std::process::exit(2);
    });
    let mut config = HubConfig::new(args.data_dir.clone());
    config.segment_records = args.segment_records;
    config.fsync = args.fsync;
    config.bundle_hash = bundle_hash(args.static_dir.as_deref());
    let hub = Hub::open(registry, config).unwrap_or_else(|e| {
        eprintln!(
            "error: cannot open Op-Log in {}: {e}",
            args.data_dir.display()
        );
        std::process::exit(1);
    });
    eprintln!(
        "[hub] {} envelopes, Op-Log tip {}, {} enrolled devices",
        hub.len(),
        hub.tip_seq(),
        hub.registry.len()
    );
    let app = router(hub, args.static_dir.as_deref());
    let _mdns = if args.mdns {
        mdns::advertise(args.bind.port())
    } else {
        None
    };

    if args.insecure_http {
        eprintln!(
            "[hub] WARNING: plain HTTP on {} (development only)",
            args.bind
        );
        let listener = tokio::net::TcpListener::bind(args.bind)
            .await
            .expect("bind");
        axum::serve(listener, app).await.expect("server");
    } else {
        let cfg = tls::server_config_from_files(
            args.tls_cert.as_ref().unwrap(),
            args.tls_key.as_ref().unwrap(),
        )
        .unwrap_or_else(|e| {
            eprintln!("error: {e}");
            std::process::exit(2);
        });
        eprintln!("[hub] TLS 1.3 on https://{} (wss://…/ws/sync)", args.bind);
        axum_server::bind_rustls(
            args.bind,
            axum_server::tls_rustls::RustlsConfig::from_config(cfg),
        )
        .serve(app.into_make_service())
        .await
        .expect("server");
    }
}
