# syntax=docker/dockerfile:1.7

# ---- Stage 1: Deterministic Vite + Svelte 5 production build & 5 MB budget audit ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# VITE_ASTHA_HUB=1 enables the same-origin Sync Hub client (served behind Caddy); the mission secret makes every
# device derive the same crew keys (ADR-020 stand-in). Both are baked in at build time.
ARG VITE_ASTHA_HUB=0
ARG VITE_ASTHA_MISSION_SECRET=
ENV VITE_ASTHA_HUB=${VITE_ASTHA_HUB} VITE_ASTHA_MISSION_SECRET=${VITE_ASTHA_MISSION_SECRET}
# Runs vite build AND scripts/check-bundle-budget.mjs (enforces <= 5.0 MB, zero-CDN, stamped sw.js)
RUN npm run build

# ---- Stage 2: Minimal unprivileged Nginx static runtime (RNF-POW-04 / Zero-WAN) ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="ASTHA Crew PWA" \
      org.opencontainers.image.description="Autonomous Space Telemetry & Health Analytics offline-first PWA" \
      org.opencontainers.image.source="https://github.com/angelcontres/ASTHA-SpaceApps" \
      org.opencontainers.image.licenses="MIT"

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz | grep -q "ok" || exit 1
