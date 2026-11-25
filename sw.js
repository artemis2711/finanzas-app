const CACHE_NAME = 'finanzas-movil-ghpages-v4';
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

// Cache-first para apertura instantánea en la versión actual (permite mostrar siempre el diálogo de nueva versión + notas).
// Cuando el usuario presiona "Actualizar" (?v=...), descarga desde la red sin caché y guarda la nueva versión en caché.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = event.request.url;
  const isCheck = reqUrl.includes('?t=') || reqUrl.includes('&t=');
  const isApplyUpdate = reqUrl.includes('?v=') || reqUrl.includes('&v=');
  const isNav = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');

  // 1. Consulta silenciosa de versión (?t=...): siempre red sin tocar caché
  if (isCheck) {
    event.respondWith(fetch(reqUrl, { cache: 'no-store' }));
    return;
  }

  // 2. Usuario confirmó "Actualizar" (?v=...): bajar versión nueva y guardarla como ./index.html en caché
  if (isApplyUpdate) {
    event.respondWith(
      fetch(reqUrl, { cache: 'no-store' }).then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3. Apertura normal de la app: servir versión cacheada al instante (y si no hay caché aún, bajar de red y cachear)
  if (isNav) {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        if (cached) return cached;
        return fetch(reqUrl, { cache: 'no-cache' }).then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // 4. Otros recursos estáticos (íconos, manifest): cache-first con fallback a red
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((resp) => {
        if (resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'cors')) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});