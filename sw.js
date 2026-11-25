const CACHE_NAME = 'finanzas-movil-ghpages-v2';
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

// Network-first usando URL string con cache:'no-cache' (evita TypeError de Chromium al clonar Request con mode:'navigate')
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = event.request.url;
  const isNav = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');
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