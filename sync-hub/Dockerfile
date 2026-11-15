# syntax=docker/dockerfile:1.7

# ---- Stage 1: static release build of the zero-knowledge Sync Hub ----
FROM rust:1-slim-bookworm AS builder
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release --locked \
 && mkdir -p /out/data /out/config \
 && cp target/release/astha-sync-hub /out/astha-sync-hub

# ---- Stage 2: distroless runtime (no shell, non-root, glibc only) ----
FROM gcr.io/distroless/cc-debian12:nonroot AS runtime

LABEL org.opencontainers.image.title="ASTHA Sync Hub" \
      org.opencontainers.image.description="Zero-knowledge CRDT relay for the ASTHA crew PWA (ADR-007, ADR-008)" \
      org.opencontainers.image.source="https://github.com/angelcontres/ASTHA-SpaceApps" \
      org.opencontainers.image.licenses="MIT"

COPY --from=builder /out/astha-sync-hub /usr/local/bin/astha-sync-hub
# Owned by the distroless nonroot user so named volumes inherit writable mount points.
COPY --from=builder --chown=65532:65532 /out/data /data
COPY --from=builder --chown=65532:65532 /out/config /config

# Behind Caddy: TLS is terminated by the reverse proxy, so the hub serves plain HTTP on the private network.
ENV ASTHA_HUB_BIND=0.0.0.0:8443 \
    ASTHA_HUB_DATA_DIR=/data \
    ASTHA_HUB_ENROLLMENT=/config/devices.json \
    ASTHA_HUB_HTTP=1 \
    ASTHA_HUB_NO_MDNS=1

USER nonroot
EXPOSE 8443
VOLUME ["/data", "/config"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/usr/local/bin/astha-sync-hub", "healthcheck"]
ENTRYPOINT ["/usr/local/bin/astha-sync-hub"]
