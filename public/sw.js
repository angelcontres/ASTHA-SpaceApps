/* ASTHA Service Worker — Strict Cache-Only Runtime (ADR-002, ADR-020, RNF-POW-04) */
/* Values below are atomically stamped during production build by scripts/generate-sw-manifest.mjs */
const CACHE_NAME = '__ASTHA_CACHE_NAME__';
const PRECACHE_ASSETS = __ASTHA_PRECACHE_MANIFEST__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((oldKey) => caches.delete(oldKey))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Enforce Zero-WAN policy: never forward external/CDN requests.
  if (requestUrl.origin !== self.location.origin) {
    event.respondWith(
      new Response('Blocked by ASTHA Zero-WAN Service Worker policy (RNF-NET-01).', {
        status: 403,
        statusText: 'Zero-WAN Policy Violation',
      }),
    );
    return;
  }

  // Strict cache-only lookup after Earth provisioning (ADR-020).
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) {
        return cached;
      }
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('Resource absent from provisioned offline cache.', {
        status: 503,
        statusText: 'Offline Cache Miss',
      });
    }),
  );
});
