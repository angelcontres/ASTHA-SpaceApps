//! TLS 1.3 only (ADR-007): a TLS 1.3 client completes the handshake; a TLS 1.2-only client is refused.
use std::sync::Arc;

use astha_sync_hub::tls::{install_crypto_provider, server_config};
use rustls::pki_types::ServerName;
use rustls::{ClientConfig, RootCertStore};
use tokio::io::AsyncWriteExt;
use tokio_rustls::{TlsAcceptor, TlsConnector};

static TLS13_ONLY: &[&rustls::SupportedProtocolVersion] = &[&rustls::version::TLS13];
static TLS12_ONLY: &[&rustls::SupportedProtocolVersion] = &[&rustls::version::TLS12];

#[tokio::test]
async fn negotiates_tls13_and_refuses_tls12() {
    install_crypto_provider();
    let cert = rcgen::generate_simple_self_signed(vec!["astha.local".into()]).unwrap();
    let server = server_config(
        cert.cert.pem().as_bytes(),
        cert.key_pair.serialize_pem().as_bytes(),
    )
    .unwrap();
    let acceptor = TlsAcceptor::from(server);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        loop {
            let (sock, _) = listener.accept().await.unwrap();
            let acceptor = acceptor.clone();
            tokio::spawn(async move {
                if let Ok(mut s) = acceptor.accept(sock).await {
                    let _ = s.write_all(b"ok").await;
                }
            });
        }
    });

    let mut roots = RootCertStore::empty();
    roots.add(cert.cert.der().clone()).unwrap();
    let connect = |versions: &'static [&'static rustls::SupportedProtocolVersion]| {
        let cfg = ClientConfig::builder_with_protocol_versions(versions)
            .with_root_certificates(roots.clone())
            .with_no_client_auth();
        TlsConnector::from(Arc::new(cfg))
    };
    let name = ServerName::try_from("astha.local").unwrap();

    let tcp = tokio::net::TcpStream::connect(addr).await.unwrap();
    let s = connect(TLS13_ONLY)
        .connect(name.clone(), tcp)
        .await
        .unwrap();
    assert_eq!(
        s.get_ref().1.protocol_version(),
        Some(rustls::ProtocolVersion::TLSv1_3)
    );

    let tcp = tokio::net::TcpStream::connect(addr).await.unwrap();
    assert!(connect(TLS12_ONLY).connect(name, tcp).await.is_err());
}
