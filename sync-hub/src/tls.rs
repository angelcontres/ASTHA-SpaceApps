//! TLS 1.3-only server configuration with the spacecraft internal CA certificate (ADR-007).

use std::path::Path;
use std::sync::Arc;

use rustls::ServerConfig;
use rustls_pki_types::pem::PemObject;
use rustls_pki_types::{CertificateDer, PrivateKeyDer};

/// Installs `ring` as the process-wide crypto provider (no C/cmake toolchain needed). Idempotent.
pub fn install_crypto_provider() {
    let _ = rustls::crypto::ring::default_provider().install_default();
}

/// Builds a server config that negotiates TLS 1.3 only, with ALPN `http/1.1` (WebSocket upgrade over HTTP/1.1).
pub fn server_config(cert_pem: &[u8], key_pem: &[u8]) -> Result<Arc<ServerConfig>, String> {
    install_crypto_provider();
    let certs: Vec<CertificateDer<'static>> = CertificateDer::pem_slice_iter(cert_pem)
        .collect::<Result<_, _>>()
        .map_err(|e| format!("certificate chain: {e}"))?;
    if certs.is_empty() {
        return Err("certificate chain is empty".into());
    }
    let key = PrivateKeyDer::from_pem_slice(key_pem).map_err(|e| format!("private key: {e}"))?;
    let mut cfg = ServerConfig::builder_with_protocol_versions(&[&rustls::version::TLS13])
        .with_no_client_auth()
        .with_single_cert(certs, key)
        .map_err(|e| format!("TLS config: {e}"))?;
    cfg.alpn_protocols = vec![b"http/1.1".to_vec()];
    Ok(Arc::new(cfg))
}

pub fn server_config_from_files(cert: &Path, key: &Path) -> Result<Arc<ServerConfig>, String> {
    let c = std::fs::read(cert).map_err(|e| format!("{}: {e}", cert.display()))?;
    let k = std::fs::read(key).map_err(|e| format!("{}: {e}", key.display()))?;
    server_config(&c, &k)
}
