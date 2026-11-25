const CACHE_NAME = 'finanzas-movil-ghpages-v3';
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

// Network-first real con bypass de caché para ?t= y ?v= (actualización instantánea) y fallback offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = event.request.url;
  const isBypass = reqUrl.includes('?t=') || reqUrl.includes('&t=') || reqUrl.includes('?v=') || reqUrl.includes('&v=');
  const isNav = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');
  if (isBypass) {
    event.respondWith(
      fetch(reqUrl, { cache: 'no-store' }).then((resp) => {
        if (resp && resp.status === 200 && isNav) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  const fetchPromise = isNav
    ? fetch(reqUrl, { cache: 'no-cache' })
    : fetch(event.request);

  event.respondWith(
    fetchPromise
      .then((resp) => {
        if (resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'cors')) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(isNav ? './index.html' : event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(isNav ? './index.html' : event.request))
  );
});