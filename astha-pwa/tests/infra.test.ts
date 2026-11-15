import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PWA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PWA_ROOT, '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

describe('Docker containerization & CI/CD pipeline contracts', () => {
  it('provides a multi-stage unprivileged Dockerfile enforcing npm run build budget check and healthcheck', () => {
    const dockerfile = readRepo('astha-pwa/Dockerfile');
    expect(dockerfile).toContain('FROM node:22-alpine AS builder');
    expect(dockerfile).toContain('RUN npm run build');
    expect(dockerfile).toContain('FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime');
    expect(dockerfile).toContain('EXPOSE 8080');
    expect(dockerfile).toContain('HEALTHCHECK');
    expect(dockerfile).toContain('/healthz');
  });

  it('excludes heavy NASA official telemetry from Docker build context', () => {
    const rootIgnore = readRepo('.dockerignore');
    const pwaIgnore = readRepo('astha-pwa/.dockerignore');
    expect(rootIgnore).toContain('data/nasa_official_telemetry');
    expect(rootIgnore).toContain('node_modules');
    expect(pwaIgnore).toContain('node_modules');
    expect(pwaIgnore).toContain('dist');
  });

  it('configures Nginx with /healthz, no-store on sw.js, immutable /assets, and security headers', () => {
    const nginxConf = readRepo('astha-pwa/nginx/default.conf');
    expect(nginxConf).toContain('listen 8080;');
    expect(nginxConf).toContain('location = /healthz');
    expect(nginxConf).toContain('location = /sw.js');
    expect(nginxConf).toContain('no-cache, no-store, must-revalidate');
    expect(nginxConf).toContain('application/manifest+json');
    expect(nginxConf).toContain('public, max-age=31536000, immutable');
    expect(nginxConf).toContain('X-Frame-Options "DENY"');
    expect(nginxConf).toContain('X-Content-Type-Options "nosniff"');
    expect(nginxConf).toContain('try_files $uri $uri/ /index.html;');
  });

  it('defines hardened docker-compose stack and Caddy TLS profile without breaking default interpolation', () => {
    const compose = readRepo('docker-compose.yml');
    expect(compose).toContain('read_only: true');
    expect(compose).toContain('no-new-privileges:true');
    expect(compose).toContain('profiles: ["tls"]');
    expect(compose).toContain('caddy:2.9-alpine');
    expect(compose).toContain('${ASTHA_DOMAIN:-localhost}');
    expect(compose).not.toContain('${ASTHA_DOMAIN:?');

    const caddyfile = readRepo('deploy/Caddyfile');
    expect(caddyfile).toContain('{$ASTHA_DOMAIN}');
    expect(caddyfile).toContain('reverse_proxy astha-pwa:8080');
  });

  it('ships complete CI verification (including Docker smoke test) and CD auto-deploy workflows', () => {
    const ci = readRepo('.github/workflows/ci.yml');
    expect(ci).toContain('verify-astha-pwa:');
    expect(ci).toContain('verify-docker-image:');
    expect(ci).toContain('docker compose --profile tls config -q');
    expect(ci).toContain('http://127.0.0.1:8080/healthz');

    const cd = readRepo('.github/workflows/cd.yml');
    expect(cd).toContain('build-and-publish-image:');
    expect(cd).toContain('ghcr.io');
    expect(cd).toContain('packages: write');
    expect(cd).toContain('deploy-aws:');
    expect(cd).toContain('SSH_HOST');
    expect(cd).toContain('docker logout ghcr.io');
  });

  it('includes English CI/CD documentation and server bootstrap script', () => {
    const doc = readRepo('docs/CICD_DOCKER_DEPLOYMENT.md');
    expect(doc).toContain('AWS Lightsail');
    expect(doc).toContain('SSH_PRIVATE_KEY');
    expect(doc).toContain('ASTHA_DOMAIN');

    const bootstrap = readRepo('deploy/server-bootstrap.sh');
    expect(bootstrap).toContain('docker-compose-plugin');
    expect(bootstrap).toContain('ufw allow 443/tcp');
  });
});
