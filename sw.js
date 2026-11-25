const CACHE_NAME = 'finanzas-movil-ghpages-v5';
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

// Cache-first seguro: SOLO intercepta peticiones del mismo origen (nunca fuentes externas/CDNs)
// y SOLO guarda en './index.html' respuestas con Content-Type text/html.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = event.request.url;
  let parsedUrl;
  try {
    parsedUrl = new URL(reqUrl);
  } catch (_e) {
    return;
  }

  // Nunca interceptar ni cachear recursos de otros dominios (Google Fonts, CDNs, Apps Script, etc.)
  if (parsedUrl.origin !== self.location.origin) return;

  const isCheck = parsedUrl.searchParams.has('t');
  const isApplyUpdate = parsedUrl.searchParams.has('v');
  const isNav = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');

  // 1. Consulta silenciosa de versión (?t=...): siempre red sin tocar caché
  if (isCheck) {
    event.respondWith(fetch(reqUrl, { cache: 'no-store' }));
    return;
  }

  // 2. Usuario confirmó "Actualizar" (?v=...) en navegación HTML: bajar versión nueva y cachear SOLO si es text/html
  if (isApplyUpdate && isNav) {
    event.respondWith(
      fetch(reqUrl, { cache: 'no-store' }).then((resp) => {
        const ct = (resp && resp.headers && resp.headers.get('content-type')) || '';
        if (resp && resp.status === 200 && ct.includes('text/html')) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3. Apertura normal de la app (navegación HTML): servir versión cacheada al instante (verificando que sea text/html)
  if (isNav) {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const cachedCt = (cached && cached.headers && cached.headers.get('content-type')) || '';
        if (cached && cachedCt.includes('text/html')) return cached;
        return fetch(reqUrl, { cache: 'no-cache' }).then((resp) => {
          const ct = (resp && resp.headers && resp.headers.get('content-type')) || '';
          if (resp && resp.status === 200 && ct.includes('text/html')) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // 4. Otros recursos estáticos del mismo origen (íconos, manifest): cache-first con fallback a red
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});