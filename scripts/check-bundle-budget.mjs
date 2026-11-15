import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const MAX_BUNDLE_BYTES = 5 * 1024 * 1024; // 5.0 MB strict limit per RNF-POW-04
const EXCLUDED_SEGMENTS = ['nasa_official_telemetry'];

if (!fs.existsSync(distDir)) {
  console.error('ERROR: dist/ directory not found.');
  process.exit(1);
}

let totalBytes = 0;
const fileReport = [];

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(distDir, fullPath).replace(/\\/g, '/');

    if (EXCLUDED_SEGMENTS.some((seg) => relPath.includes(seg))) {
      console.error(`ERROR: Forbidden heavy telemetry directory leaked into dist/: ${relPath}`);
      process.exit(1);
    }

    if (entry.isDirectory()) {
      scan(fullPath);
    } else if (entry.isFile()) {
      const size = fs.statSync(fullPath).size;
      totalBytes += size;
      fileReport.push({ relPath, size });

      if (/\.(html|js|css|webmanifest)$/i.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/fonts\.googleapis\.com|cdn\.jsdelivr\.net|unpkg\.com|cdn\.tailwindcss\.com/i.test(content)) {
          console.error(`ERROR: External CDN reference detected in built artifact ${relPath} (violates RNF-NET-01 / ADR-003).`);
          process.exit(1);
        }
      }
    }
  }
}

scan(distDir);
fileReport.sort((a, b) => b.size - a.size);

const totalMb = (totalBytes / (1024 * 1024)).toFixed(3);
console.log('--- ASTHA Bundle Budget Audit (RNF-POW-04 <= 5.000 MB) ---');
for (const item of fileReport.slice(0, 12)) {
  console.log(`  ${(item.size / 1024).toFixed(2).padStart(8)} KB  ${item.relPath}`);
}
console.log(`Total dist/ size: ${totalBytes} bytes (${totalMb} MB / 5.000 MB max)`);

if (totalBytes > MAX_BUNDLE_BYTES) {
  console.error(`FAIL: dist/ exceeds 5.0 MB budget (${totalMb} MB > 5.000 MB).`);
  process.exit(1);
}

const swContent = fs.readFileSync(path.join(distDir, 'sw.js'), 'utf8');
if (swContent.includes('__ASTHA_CACHE_NAME__') || swContent.includes('__ASTHA_PRECACHE_MANIFEST__')) {
  console.error('FAIL: dist/sw.js was not stamped with precache manifest.');
  process.exit(1);
}

console.log('PASS: Bundle budget, Zero-CDN check, and Service Worker manifest verified.');
