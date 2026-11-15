/* ASTHA · Service Worker cache-only (RNF-NET-01, RNF-POW-04).
 * Install: precarga ATÓMICA de todos los activos compilados (si falla uno, no se instala la versión).
 * Fetch: responde SOLO desde la caché. Nunca va a la red ni a orígenes externos; las navegaciones
 * reciben index.html. La lista de activos la inyecta el build (vite.config.ts, plugin astha-precache).
 */
const VERSION = '__ASTHA_VERSION__';
const PRECACHE = ['./', './index.html'] /* __ASTHA_PRECACHE__ */;
const CACHE = `astha-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const tmp = await caches.open(`${CACHE}-staging`);
      // addAll es todo o nada: precarga atómica.
      await tmp.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' })));
      const cache = await caches.open(CACHE);
      for (const req of await tmp.keys()) await cache.put(req, await tmp.match(req));
      await caches.delete(`${CACHE}-staging`);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    // Cero peticiones externas: cualquier intento se corta aquí.
    event.respondWith(Response.error());
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('./index.html')) ?? Response.error();
      return Response.error(); // cache-only: sin red
    })(),
  );
});
