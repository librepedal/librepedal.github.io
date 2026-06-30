/* Libre Pedal — Service Worker
   App-shell offline + runtime cache de mapas y librerías CDN. */
const CACHE = 'librepedal-v7';

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

self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });

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
  // version.txt SIEMPRE de la red (nunca cache): habilita la auto-reparación.
  if (/version\.txt/.test(url.pathname)) return;

  // Mismo origen.
  if (url.origin === self.location.origin) {
    const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
    if (isHTML) {
      // HTML: network-first → siempre sirve la última versión desplegada;
      // si no hay red, cae al cache (offline).
      e.respondWith(
        fetch(req).then(function (res) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }).catch(function () {
          return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
        })
      );
      return;
    }
    // Otros recursos propios (manifest, icon): cache-first.
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
