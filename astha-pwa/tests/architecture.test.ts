import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('ASTHA Architectural & Zero-WAN Invariants', () => {
  it('enforces ADR-005 pure isolation in engine modules and clinical worker', () => {
    const engineDir = path.join(ROOT, 'src', 'engine');
    const engineFiles = fs
      .readdirSync(engineDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => path.join(engineDir, f));
    engineFiles.push(path.join(ROOT, 'src', 'workers', 'clinical.worker.ts'));

    const forbidden =
      /\b(fetch|WebSocket|XMLHttpRequest|EventSource|window|document|localStorage|sessionStorage|indexedDB|setInterval|setTimeout)\b/;

    for (const filePath of engineFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(forbidden.test(codeOnly), `Forbidden API in ${path.basename(filePath)}`).toBe(false);
    }
  });

  it('ships Zero-CDN system typography and WCAG AAA #fca5a5 / 48px / 12px tokens', () => {
    const tokens = fs.readFileSync(path.join(ROOT, 'src', 'ui', 'styles', 'tokens.css'), 'utf8');
    expect(tokens).toContain('--alert-red-text: #fca5a5;');
    expect(tokens).toContain('--touch: 48px;');
    expect(tokens).toContain('--gap: 12px;');
    expect(tokens).toContain('system-ui');
    expect(tokens).toContain('ui-monospace');
    expect(tokens).not.toMatch(/fonts\.googleapis\.com/i);
  });

  it('enforces Zero-WAN cache-only policy and CSP lock-down', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
    expect(sw).toContain('url.origin !== self.location.origin');
    expect(sw).toContain('cache.match');
    expect(sw).not.toMatch(/\bfetch\s*\(/);

    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    expect(html).toContain('Content-Security-Policy');
  });

  it('ships the custom ECG telemetry SVG brand icon and valid uPlot/Three dependencies', () => {
    const icon = fs.readFileSync(path.join(ROOT, 'public', 'icon.svg'), 'utf8');
    expect(icon).toContain('<path');
    expect(icon).toContain('#38bdf8');
    expect(icon).toContain('#10b981');

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.dependencies).toHaveProperty('uplot');
    expect(pkg.dependencies).toHaveProperty('three');
    expect(pkg.dependencies).not.toHaveProperty('chart.js');
    expect(pkg.dependencies).not.toHaveProperty('recharts');
  });
});
