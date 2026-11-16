//! `astha-sync-hub` binary. Single-threaded tokio runtime (low power, ADR-008).
//!
//! ```text
//! astha-sync-hub [--enrollment devices.json] (--tls-cert C --tls-key K | --insecure-http)
//!                [--bind 0.0.0.0:8443] [--data-dir ./hub-data] [--static-dir ../astha-pwa/dist]
//!                [--segment-records 10000] [--auto-enroll] [--no-mdns] [--no-fsync]
//! astha-sync-hub healthcheck [127.0.0.1:8443]      # exit 0 if GET /api/v1/health answers 200 (plain HTTP)
//! astha-sync-hub enroll '<record JSON>' [devices.json]   # add a device (record copied from the PWA Simulator)
//! ```
//! Every flag can also come from the environment (containers): ASTHA_HUB_BIND, ASTHA_HUB_DATA_DIR,
//! ASTHA_HUB_ENROLLMENT, ASTHA_HUB_STATIC_DIR, ASTHA_HUB_TLS_CERT, ASTHA_HUB_TLS_KEY, ASTHA_HUB_SEGMENT_RECORDS,
//! and the booleans ASTHA_HUB_HTTP, ASTHA_HUB_AUTO_ENROLL, ASTHA_HUB_NO_MDNS, ASTHA_HUB_NO_FSYNC (1/true).
//! `--insecure-http` serves plain HTTP: only on localhost, or behind a TLS-terminating reverse proxy (Caddy).

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::time::Duration;

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
    auto_enroll: bool,
}

fn env(name: &str) -> Option<String> {
    std::env::var(name).ok().filter(|v| !v.is_empty())
}

fn env_flag(name: &str) -> bool {
    env(name)
        .is_some_and(|v| matches!(v.to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"))
}

fn parse_args(argv: Vec<String>) -> Result<Args, String> {
    let mut a = Args {
        bind: env("ASTHA_HUB_BIND")
            .unwrap_or_else(|| "0.0.0.0:8443".into())
            .parse()
            .map_err(|e| format!("ASTHA_HUB_BIND: {e}"))?,
        data_dir: env("ASTHA_HUB_DATA_DIR")
            .unwrap_or_else(|| "hub-data".into())
            .into(),
        enrollment: env("ASTHA_HUB_ENROLLMENT")
            .unwrap_or_else(|| "devices.json".into())
            .into(),
        static_dir: env("ASTHA_HUB_STATIC_DIR").map(PathBuf::from),
        tls_cert: env("ASTHA_HUB_TLS_CERT").map(PathBuf::from),
        tls_key: env("ASTHA_HUB_TLS_KEY").map(PathBuf::from),
        segment_records: env("ASTHA_HUB_SEGMENT_RECORDS")
            .map(|v| {
                v.parse()
                    .map_err(|e| format!("ASTHA_HUB_SEGMENT_RECORDS: {e}"))
            })
            .transpose()?
            .unwrap_or(astha_sync_hub::oplog::DEFAULT_SEGMENT_RECORDS),
        mdns: !env_flag("ASTHA_HUB_NO_MDNS"),
        fsync: !env_flag("ASTHA_HUB_NO_FSYNC"),
        insecure_http: env_flag("ASTHA_HUB_HTTP"),
        auto_enroll: env_flag("ASTHA_HUB_AUTO_ENROLL"),
    };
    let mut it = argv.into_iter();
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
            "--auto-enroll" => a.auto_enroll = true,
            "-h" | "--help" => {
                println!(
                    "{}",
                    include_str!("main.rs")
                        .lines()
                        .take(12)
                        .collect::<Vec<_>>()
                        .join("\n")
                );
                std::process::exit(0);
            }
            other => return Err(format!("unknown flag {other}")),
        }
    }
    if !a.insecure_http && (a.tls_cert.is_none() || a.tls_key.is_none()) {
        return Err("--tls-cert and --tls-key are required (or --insecure-http behind a TLS proxy / on localhost)".into());
    }
    Ok(a)
}

/// `healthcheck` subcommand for container orchestration (the runtime image has no shell or curl).
fn healthcheck(addr: &str) -> bool {
    let Ok(sock) = addr.parse::<SocketAddr>() else {
        return false;
    };
    let Ok(mut stream) = TcpStream::connect_timeout(&sock, Duration::from_secs(2)) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let req = format!("GET /api/v1/health HTTP/1.1\r\nHost: {addr}\r\nConnection: close\r\n\r\n");
    if stream.write_all(req.as_bytes()).is_err() {
        return false;
    }
    let mut buf = [0u8; 64];
    let n = stream.read(&mut buf).unwrap_or(0);
    String::from_utf8_lossy(&buf[..n]).starts_with("HTTP/1.1 200")
}

fn die(msg: impl std::fmt::Display, code: i32) -> ! {
    eprintln!("error: {msg}");
    std::process::exit(code);
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let mut argv: Vec<String> = std::env::args().skip(1).collect();
    if argv.first().map(String::as_str) == Some("healthcheck") {
        let addr = argv
            .get(1)
            .cloned()
            .or_else(|| env("ASTHA_HUB_BIND").map(|b| b.replace("0.0.0.0", "127.0.0.1")));
        std::process::exit(
            if healthcheck(&addr.unwrap_or_else(|| "127.0.0.1:8443".into())) {
                0
            } else {
                1
            },
        );
    }
    if argv.first().map(String::as_str) == Some("enroll") {
        let record = argv
            .get(1)
            .cloned()
            .unwrap_or_else(|| die("usage: enroll '<record JSON>' [devices.json]", 2));
        let path = argv
            .get(2)
            .cloned()
            .or_else(|| env("ASTHA_HUB_ENROLLMENT"))
            .unwrap_or_else(|| "devices.json".into());
        match astha_sync_hub::crypto::enroll_into_file(std::path::Path::new(&path), &record) {
            Ok(id) => {
                println!(
                    "enrolled {id} in {path} (a running hub picks it up on the next handshake)"
                );
                std::process::exit(0);
            }
            Err(e) => die(e, 2),
        }
    }
    let args = parse_args(std::mem::take(&mut argv)).unwrap_or_else(|e| die(e, 2));

    if !args.enrollment.exists() {
        if let Some(parent) = args
            .enrollment
            .parent()
            .filter(|p| !p.as_os_str().is_empty())
        {
            std::fs::create_dir_all(parent)
                .unwrap_or_else(|e| die(format!("{}: {e}", parent.display()), 2));
        }
        std::fs::write(&args.enrollment, "[]\n")
            .unwrap_or_else(|e| die(format!("{}: {e}", args.enrollment.display()), 2));
        eprintln!("[enroll] created empty {}", args.enrollment.display());
    }
    let registry = Registry::from_file(&args.enrollment).unwrap_or_else(|e| die(e, 2));
    let mut config = HubConfig::new(args.data_dir.clone());
    config.segment_records = args.segment_records;
    config.fsync = args.fsync;
    config.bundle_hash = bundle_hash(args.static_dir.as_deref());
    config.enrollment_path = Some(args.enrollment.clone());
    config.auto_enroll = args.auto_enroll;
    let hub = Hub::open(registry, config).unwrap_or_else(|e| {
        die(
            format!("cannot open Op-Log in {}: {e}", args.data_dir.display()),
            1,
        )
    });
    eprintln!(
        "[hub] {} envelopes, Op-Log tip {}, {} enrolled devices ({} reloads on change)",
        hub.len(),
        hub.tip_seq(),
        hub.registry_len(),
        args.enrollment.display()
    );
    if args.auto_enroll {
        eprintln!("[hub] WARNING: --auto-enroll accepts any device that proves possession of its key (demo/dev only)");
    }
    let app = router(hub, args.static_dir.as_deref());
    let _mdns = if args.mdns {
        mdns::advertise(args.bind.port())
    } else {
        None
    };

    if args.insecure_http {
        eprintln!(
            "[hub] plain HTTP on {} (localhost or behind a TLS proxy only)",
            args.bind
        );
        let listener = tokio::net::TcpListener::bind(args.bind)
            .await
            .unwrap_or_else(|e| die(e, 1));
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await
            .unwrap_or_else(|e| die(e, 1));
    } else {
        let cfg = tls::server_config_from_files(
            args.tls_cert.as_ref().unwrap(),
            args.tls_key.as_ref().unwrap(),
        )
        .unwrap_or_else(|e| die(e, 2));
        eprintln!("[hub] TLS 1.3 on https://{} (wss://…/ws/sync)", args.bind);
        let handle = axum_server::Handle::new();
        let stopper = handle.clone();
        tokio::spawn(async move {
            shutdown_signal().await;
            stopper.graceful_shutdown(Some(Duration::from_secs(5)));
        });
        axum_server::bind_rustls(
            args.bind,
            axum_server::tls_rustls::RustlsConfig::from_config(cfg),
        )
        .handle(handle)
        .serve(app.into_make_service())
        .await
        .unwrap_or_else(|e| die(e, 1));
    }
    eprintln!("[hub] stopped cleanly (append-only Op-Log: nothing to flush)");
}

/// SIGINT or SIGTERM (container stop). As PID 1 in a container the hub must handle SIGTERM itself.
async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let term = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut s) => {
                s.recv().await;
            }
            Err(_) => std::future::pending::<()>().await,
        }
    };
    #[cfg(not(unix))]
    let term = std::future::pending::<()>();
    tokio::select! {
        _ = ctrl_c => {},
        _ = term => {},
    }
    eprintln!("[hub] shutdown signal received");
}
