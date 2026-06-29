/* Libre Pedal — Service Worker
   App-shell offline + runtime cache de mapas y librerías CDN. */
const CACHE = 'librepedal-v1';

// Núcleo que se precachea al instalar (lo propio de la app).
const CORE = [
  './',
  './index.html',
  './como-funciona.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      // addAll falla si UN recurso falla; cacheamos uno a uno para tolerar fallos.
      .then(function (c) { return Promise.allSettled(CORE.map(function (u) { return c.add(u); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return; // nunca cachear escrituras (Firestore, etc.)

  const url = new URL(req.url);
  // No interceptar Firestore/realtime: necesita la red siempre.
  if (/firestore|googleapis|firebaseio|gstatic\.com\/firebasejs/.test(url.href)) return;

  // App-shell (mismo origen): cache-first con fallback a red; si falla todo, index.html.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }).catch(function () { return caches.match('./index.html'); });
      })
    );
    return;
  }

  // Recursos externos (tiles del mapa, Leaflet, jsPDF, FontAwesome):
  // stale-while-revalidate — sirve cache al toque y actualiza en segundo plano.
  e.respondWith(
    caches.match(req).then(function (hit) {
      const net = fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
