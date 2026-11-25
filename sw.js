const CACHE_NAME = 'finanzas-movil-ghpages-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first con revalidación (no-cache) para recibir nuevas versiones al instante desde GitHub Pages
// y fallback automático a caché local cuando el teléfono está sin señal (offline).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isNav = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');
  const reqToFetch = isNav ? new Request(event.request, { cache: 'no-cache' }) : event.request;
  event.respondWith(
    fetch(reqToFetch)
      .then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request).then((hit) => hit || (isNav ? caches.match('./index.html') : undefined)))
  );
});
