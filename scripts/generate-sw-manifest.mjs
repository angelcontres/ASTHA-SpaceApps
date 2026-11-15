import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const swPath = path.join(distDir, 'sw.js');

if (!fs.existsSync(distDir) || !fs.existsSync(swPath)) {
  console.error('ERROR: dist/ or dist/sw.js does not exist. Run vite build first.');
  process.exit(1);
}

const EXCLUDED_SEGMENTS = ['nasa_official_telemetry'];
const precacheUrls = ['/'];
const hash = crypto.createHash('sha256');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(distDir, fullPath).replace(/\\/g, '/');

    if (EXCLUDED_SEGMENTS.some((seg) => relPath.includes(seg))) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && relPath !== 'sw.js') {
      precacheUrls.push(`/${relPath}`);
      hash.update(relPath);
      hash.update(fs.readFileSync(fullPath));
    }
  }
}

walk(distDir);

const buildDigest = hash.digest('hex').slice(0, 12);
const cacheName = `astha-pwa-v3-${buildDigest}`;

let swSource = fs.readFileSync(swPath, 'utf8');
swSource = swSource
  .replace('__ASTHA_CACHE_NAME__', cacheName)
  .replace('__ASTHA_PRECACHE_MANIFEST__', JSON.stringify(precacheUrls, null, 2));

fs.writeFileSync(swPath, swSource, 'utf8');
console.log(`Stamped dist/sw.js with cache "${cacheName}" (${precacheUrls.length} precached URLs).`);
