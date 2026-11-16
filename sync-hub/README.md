# ASTHA Sync Hub (Rust)

Optional central node of the spacecraft LAN ([ADR-007](../docs/SDD/08-Architecture-decisions.md#adr-007), [ADR-008](../docs/SDD/08-Architecture-decisions.md#adr-008)). It advertises `astha.local` over mDNS, serves the PWA app shell over HTTPS (TLS 1.3, internal CA), and stores and relays CRDT deltas in a star topology.

The hub is **zero-knowledge**. It only handles AES-GCM-256 envelopes: it verifies their SHA-256 integrity and the Ed25519 signature of the enrolled device that produced them, and it never holds a key or decrypts anything. If the hub is down, every tablet keeps full clinical autonomy and converges again when the hub returns.

## Build and test

```bash
cargo build --release              # target/release/astha-sync-hub (~2.7 MB, single binary, libc only)
cargo test                         # unit + integration (REST, WebSocket, TLS 1.3, PWA crypto compatibility)
cargo clippy --all-targets -- -D warnings && cargo fmt --check
```

End-to-end interoperability with the PWA client (real binary, hub crash, convergence, `since_hlc` recovery):

```bash
cargo build
cd ../astha-pwa && ASTHA_HUB_BIN=../sync-hub/target/debug/astha-sync-hub npx vitest run tests/hub.e2e.test.ts
```

## Run

```bash
astha-sync-hub --enrollment devices.json \
               --tls-cert astha.local.crt --tls-key astha.local.key \
               --static-dir ../astha-pwa/dist \
               [--bind 0.0.0.0:8443] [--data-dir ./hub-data] [--segment-records 10000] [--auto-enroll] [--no-mdns] [--no-fsync]
astha-sync-hub enroll '<record JSON>' [devices.json]     # add a device; a running hub reloads the file
astha-sync-hub healthcheck [127.0.0.1:8443]             # container health probe (plain HTTP)
```

Every flag can also be set from the environment, which is how the container is configured: `ASTHA_HUB_BIND`, `ASTHA_HUB_DATA_DIR`, `ASTHA_HUB_ENROLLMENT`, `ASTHA_HUB_STATIC_DIR`, `ASTHA_HUB_TLS_CERT`, `ASTHA_HUB_TLS_KEY`, `ASTHA_HUB_SEGMENT_RECORDS`, and the booleans `ASTHA_HUB_HTTP`, `ASTHA_HUB_AUTO_ENROLL`, `ASTHA_HUB_NO_MDNS`, `ASTHA_HUB_NO_FSYNC`.

`--insecure-http` serves plain HTTP. Use it for local development only: the PWA treats `localhost` as a secure context, but `astha.local` must be HTTPS.

### Internal CA certificate (ADR-007)

Generate this before launch, during ground provisioning (ADR-020). The CA root is installed on every device.

```bash
openssl req -x509 -newkey ed25519 -nodes -days 3650 -subj "/CN=ASTHA Spacecraft CA" -keyout ca.key -out ca.crt
openssl req -newkey ed25519 -nodes -subj "/CN=astha.local" -keyout astha.local.key -out astha.local.csr
openssl x509 -req -in astha.local.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 825 \
  -extfile <(printf "subjectAltName=DNS:astha.local\nextendedKeyUsage=serverAuth") -out astha.local.crt
```

### Device enrollment (ADR-020)

`devices.json` lists the Ed25519 public keys of the enrolled tablets and consoles. The hub creates it empty if it is missing, and re-reads it whenever it changes:

```json
[{ "deviceId": "8a541e2411e7", "publicJwk": { "kty": "OKP", "crv": "Ed25519", "x": "…" } }]
```

The PWA shows each device's record in **Simulator → Sync Hub enrollment record**. The `deviceId` must match the key: it is the first 12 hex characters of SHA-256(canonical JWK), and the hub refuses mismatched entries. Devices whose browser only offers ECDSA P-256 cannot be enrolled.

## Local frontend testing (no certificates)

```bash
cd astha-pwa && npm run build:hub      # build mode `hub`: enables the sync client on localhost
cd ../sync-hub
cargo run -- --insecure-http --no-mdns --bind 127.0.0.1:8443 --static-dir ../astha-pwa/dist --auto-enroll
```

1. Open `http://localhost:8443` in **two browser profiles**. Each profile has its own IndexedDB, so it acts as a separate tablet. Avoid incognito windows: they lose the device identity when closed.
2. Unlock with a demo PIN (1001–1004). With `--auto-enroll` each profile enrols itself on its first handshake, proving possession of its key, and the header shows **Sync OK**.
3. Data entered on one tablet appears on the other. All devices derive the same crew keys from the mission secret, so synced records are readable everywhere.
4. Stop the hub (Ctrl+C), write on both tablets, and start it again: they converge without losing anything.

**Without `--auto-enroll`** (closer to flight), the hub creates an empty `devices.json`. Copy each profile's record from **Simulator → Integrity → Sync Hub enrollment record**, then add it with `cargo run -- enroll '<record>'` or paste it into the JSON array. The running hub reloads the file on the next handshake, so no restart is needed. Until then the header shows **Not enrolled**: the device is refused, retries with exponential backoff, and never flashes "online".

The relay URL is always the page's own origin (`ws://localhost:8443/ws/sync` here, `wss://astha.local:8443/ws/sync` aboard, `wss://<domain>/ws/sync` behind Caddy). A normal `npm run build` only turns the client on for `*.local` hosts.

### Sync status shown in the PWA header

| Label | Meaning |
| --- | --- |
| Autonomous | Sync disabled for this build/host; the tablet works fully offline |
| Connecting | Socket opening or handshake in progress |
| Sync OK | The hub verified the signed handshake and the delta exchange completed |
| No Hub | Hub unreachable; retries with exponential backoff (2 s → 5 min), paused while the tab is hidden |
| Not enrolled | The hub refused this device (close code 4401); enrol it as above |

## Production (Docker Compose + Caddy)

`docker-compose.yml` runs the hub as `astha-hub` (profile `tls`, next to Caddy). Its settings:

- **Image:** distroless and non-root, ~28 MB, read-only filesystem, 64 MB memory limit, graceful stop on SIGTERM.
- **Network:** reachable only through Caddy. Caddy routes `/ws/sync` and `/api/v1/*` to the hub and everything else to the PWA, so the PWA and the relay share one origin and one TLS certificate.
- **Storage:** Op-Log in the `hub_data` volume, enrollment file in `hub_config`.

```bash
ASTHA_DOMAIN=localhost docker compose --profile tls up -d --build    # local stack: https://localhost (Caddy local CA)
docker exec astha-hub astha-sync-hub enroll '<record>'             # enrol a device (hot-reloaded)
docker exec astha-hub astha-sync-hub healthcheck && echo healthy
```

CD (`.github/workflows/cd.yml`) publishes `ghcr.io/<repo>-hub` next to the PWA image. It builds the PWA with `VITE_ASTHA_HUB=1` and deploys both. Repository settings:

| Setting | Kind | Purpose |
| --- | --- | --- |
| `ASTHA_DOMAIN` | variable | Enables Caddy, and with it HTTPS and the hub. Without a domain the PWA is served over plain HTTP, where browsers disable WebCrypto, so sync stays off |
| `ASTHA_MISSION_SECRET` | secret | Shared mission secret from which every device derives the same crew keys (ADR-020 stand-in). It is compiled into the PWA bundle, so it protects demo data only; a real crew provisions keys out of band |
| `ASTHA_HUB_AUTO_ENROLL` | variable | `true` for a public demo (any device that proves its key may sync); leave `false` for real crews and enrol with `docker exec … enroll` |

## API (`openapi.yaml`, base `/api/v1`)

| Method | Path | Result |
| --- | --- | --- |
| GET | `/health` | `status` (`ONLINE`, or `DEGRADED` after skipping corrupted Op-Log lines), `hubVersion`, `bundleHashSha256` (SHA-256 of the served `sw.js`), `oplogSequence`, `mdnsHost` |
| POST | `/sync/handshake` | `200` `{hubVersionVector, missingEnvelopeIds}` · `401` unknown device or invalid Ed25519 signature |
| GET | `/sync/deltas?since_hlc=&limit=` | Envelopes after `since_hlc` in ascending HLC (limit 1–500, default 100). A new tablet pages with the HLC of the last envelope received until the page is empty |
| POST | `/sync/deltas` | `202` all verified · `422` any SHA-256 (SEU) or signature failure · `401` unknown submitter or author. Valid envelopes in a mixed batch are still appended |
| GET | `/habitat/status` | `CabinGlobalStatus` for bulkhead displays · `503` until a device has published one |

## WebSocket relay (`wss://astha.local:8443/ws/sync`)

| Message | Direction | Behaviour |
| --- | --- | --- |
| `HANDSHAKE` | both | The client signs `{deviceId, versionVector, timestampUtc}` and may attach its `publicJwk`, used only in `--auto-enroll` mode. The hub answers with the envelopes the client lacks (`DELTA_PUSH`), then its own `HANDSHAKE`, so the client sends what the hub lacks. An invalid handshake closes the socket with code `4401`, and the hub logs the reason once per device per minute |
| `DELTA_PUSH` | both | Verified, appended and relayed to every other authenticated socket in arrival order |
| `REPLICA_REQUEST` | client → hub | Returns the requested envelopes (local SEU recovery, RNF-SEC-03) |
| `ALARM_ESCALATION` | both | Relayed (ADR-013) |
| `CABIN_STATUS` | client → hub | *Extension.* Public snapshot for `/habitat/status`; strict allow-list, so any clinical field rejects it (ADR-014) |
| `REJECTED` | hub → client | *Extension.* Per-envelope rejection reasons |

## Op-Log

The Op-Log lives in `hub-data/segment-NNNNNN.jsonl`: append-only files, one verified envelope per line as `{"seq","recordSha256","envelope"}`, rotated every `--segment-records` lines. On startup every line is re-verified. A damaged line is skipped and reported in `/health`, and a healthy peer re-supplies the envelope on its next handshake. The hub never rewrites, truncates or deletes a record.

## Known limits

- **`since_hlc` paging** orders envelopes by HLC. An envelope that reaches the hub late with an older HLC (from a device that was offline) can fall behind a client's cursor. The WebSocket handshake compares VersionVectors and does not have this gap, so prefer it for ongoing sync. `since_hlc` is meant for recovering a new tablet from scratch.
- **The binary is not fully static:** it links against glibc. A fully static build needs the `x86_64-unknown-linux-musl` target and `musl-gcc`.
