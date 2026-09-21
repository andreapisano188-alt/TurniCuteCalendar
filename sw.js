const CACHE_NAME = 'turnicute-v2';
const ASSETS_TO_CACHE = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Gestore fetch minimo richiesto per i criteri PWA
});


// Installa: metti in cache solo i file locali (no risorse esterne)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(() => {
      // Non bloccare l'installazione se qualcosa fallisce
    })
  );
  self.skipWaiting();
});

// Attiva: rimuovi vecchie versioni cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-first per risorse locali, network-first per risorse esterne
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora richieste non-GET e risorse esterne (font, CDN)
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      return caches.match('./index.html');
    })
  );
});
