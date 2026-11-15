import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, type Plugin } from 'vite';

/** Inyecta en dist/sw.js la lista de activos y una versión basada en su hash (precarga atómica). */
function asthaPrecache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'astha-precache',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files: string[] = [];
      const walk = (d: string) => {
        for (const f of readdirSync(d)) {
          const p = join(d, f);
          if (statSync(p).isDirectory()) walk(p);
          else if (f !== 'sw.js') files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      files.sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const swPath = join(outDir, 'sw.js');
      const list = JSON.stringify(['./', ...files.map((f) => `./${f}`)]);
      const sw = readFileSync(swPath, 'utf8')
        .replace('__ASTHA_VERSION__', hash.digest('hex').slice(0, 16))
        .replace(/\['\.\/', '\.\/index\.html'\] \/\* __ASTHA_PRECACHE__ \*\//, list);
      writeFileSync(swPath, sw);
    },
  };
}

/**
 * Los mensajes de error del runtime de Svelte incluyen enlaces de documentación (svelte.dev/e/…). Nunca se
 * piden, pero se reescriben para que el bundle no contenga ninguna URL https externa (RNF-NET-01).
 */
function stripDocLinks(): Plugin {
  return {
    name: 'astha-strip-doc-links',
    apply: 'build',
    renderChunk(code) {
      return code.includes('https://svelte.dev/e/') ? { code: code.replaceAll('https://svelte.dev/e/', 'svelte-error:'), map: null } : null;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [svelte(), stripDocLinks(), asthaPrecache()],
  // Workers como módulos ES (ADR-005).
  worker: { format: 'es' },
  // avatar3d (Three.js) ya se carga con import() diferido solo en el visor anatómico (ADR-004).
  build: { target: 'es2023', modulePreload: { polyfill: false }, chunkSizeWarningLimit: 600 },
});
