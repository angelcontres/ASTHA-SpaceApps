# ASTHA Containerization & Full CI/CD Auto-Deployment Guide

This document describes the containerized packaging and automated GitHub Actions CI/CD pipeline for **ASTHA** (`astha-pwa`), designed for zero-CDN, offline-first operation and automated rollout to **AWS Lightsail** or **AWS EC2** behind a custom domain with automatic HTTPS.

---

## 1. Architecture Overview

| Component | File | Purpose |
| --- | --- | --- |
| Multi-stage Container Build | `astha-pwa/Dockerfile` | Compiles `astha-pwa` with Node 22 (`npm run build`, enforcing the `<= 5.0 MB` RNF-POW-04 budget and Service Worker hash stamping) and packages `dist/` into unprivileged `nginxinc/nginx-unprivileged:1.27-alpine` on port `8080`. |
| Hardened PWA Nginx Config | `astha-pwa/nginx/default.conf` | Serves `/healthz`, enforces `no-store`/`no-cache` on `/sw.js` and `/manifest.webmanifest`, sets `immutable` caching on hashed `/assets/`, and adds security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `COOP`). |
| Compose Stack | `docker-compose.yml` | Runs `astha-pwa` with a `read_only` root filesystem, bounded `tmpfs` mounts, `128 MB` RAM cap, healthchecks, and an optional `tls` profile launching **Caddy** (`deploy/Caddyfile`) for automatic Let's Encrypt HTTPS. |
| CI Pipeline | `.github/workflows/ci.yml` | On every PR and push to `main`: executes `npm run verify` (`svelte-check`, `tsc`, `eslint`, `vitest`, bundle budget), validates `docker compose config`, builds the Docker image, and runs an end-to-end hardened container smoke test. |
| CD & Auto-Deploy Pipeline | `.github/workflows/cd.yml` | On merge to `main`, release tags (`v*`), or manual dispatch: verifies the app, publishes an immutable image (`sha-<7>` and `latest`) to **GHCR**, and automatically deploys to AWS over SSH when deployment secrets are configured. |

---

## 2. Local Docker Execution

Run the full production container locally without Node installed on the host:

```bash
# Build and start HTTP-only container on http://localhost:8080
docker compose up --build -d

# Verify health and headers
curl -i http://localhost:8080/healthz

# Stop stack
docker compose down
```

---

## 3. Recommended AWS Hosting Specification (Lightsail / EC2)

Because ASTHA compiles to a static, edge-first PWA (`< 1 MB` compressed) plus Caddy for TLS termination, server overhead is minimal:

- **Minimum viable (Demo / Hackathon):** AWS Lightsail **$5/mo** (`1 vCPU`, `1 GB RAM`, `40 GB SSD`, Ubuntu `24.04 LTS`) or EC2 `t3.micro` / `t4g.micro`.
- **Recommended with headroom (future Rust Sync Hub + TLS):** AWS Lightsail **$12/mo** (`2 vCPU`, `2 GB RAM`, `60 GB SSD`) or EC2 `t3.small` / `t4g.small`.
- **Open firewall / Security Group ports:** `22/tcp` (SSH), `80/tcp` (ACME HTTP-01 + redirect), `443/tcp` & `443/udp` (HTTPS / HTTP-3).

---

## 4. Provisioning an AWS Host & Enabling Auto-Deploy

### Step 1 — Bootstrap the server (one-time)
SSH into your Ubuntu/Debian EC2 or Lightsail instance and run:

```bash
curl -fsSL https://raw.githubusercontent.com/angelcontres/ASTHA-SpaceApps/main/deploy/server-bootstrap.sh | bash
```

### Step 2 — Point your domain DNS
Create an **A record** in your DNS provider pointing your domain (for example `astha.yourdomain.com`) to the instance's static public IPv4 address.  
*(HTTPS is mandatory for `crypto.subtle` Ed25519 and Service Worker registration on non-localhost origins.)*

### Step 3 — Configure GitHub Repository Secrets & Variables
In **GitHub → Settings → Secrets and variables → Actions**:

| Kind | Name | Required | Description |
| --- | --- | --- | --- |
| Secret | `SSH_HOST` | Yes (for deploy) | Public IPv4 or hostname of your AWS instance |
| Secret | `SSH_USER` | Yes (for deploy) | SSH user (e.g., `ubuntu`) |
| Secret | `SSH_PRIVATE_KEY` | Yes (for deploy) | Private SSH key matching `~/.ssh/authorized_keys` on the server |
| Variable | `ASTHA_DOMAIN` | Recommended | Custom domain (e.g., `astha.yourdomain.com`). When set, enables `--profile tls` with automatic Caddy HTTPS. When omitted, exposes HTTP directly on port `80`. |
| Variable | `SSH_PORT` | Optional | Custom SSH port (defaults to `22`) |
| Variable | `DEPLOY_DIR` | Optional | Target folder on host (defaults to `/opt/astha`) |

> If `SSH_HOST`, `SSH_USER`, or `SSH_PRIVATE_KEY` are not yet defined, `.github/workflows/cd.yml` still builds and publishes the verified Docker image to `ghcr.io` and cleanly skips the SSH rollout step.

---

## 5. Rollback Procedure

Every deployment pins `.env` on `/opt/astha` to an immutable SHA tag (`ghcr.io/angelcontres/astha-spaceapps-pwa:sha-<7>`). To roll back on the host:

```bash
cd /opt/astha
sed -i 's/^ASTHA_IMAGE=.*/ASTHA_IMAGE=ghcr.io\/angelcontres\/astha-spaceapps-pwa:sha-<previous7>/' .env
docker compose --profile tls pull && docker compose --profile tls up -d
```
