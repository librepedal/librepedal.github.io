/* Libre Pedal — Service Worker
   App-shell offline + runtime cache de mapas y librerías CDN.
   El cache de mosaicos (TILES_CACHE) es aparte y NUNCA se borra al actualizar:
   si un ciclista descargó el mapa de su ruta para andar sin señal, una
   actualización de la app no le debe borrar ese trabajo. */
const CACHE = 'librepedal-v61';
const TILES_CACHE = 'librepedal-tiles';

// Núcleo que se precachea al instalar (lo propio de la app).
const CORE = [
  './',
  './index.html',
  './como-funciona.html',
  './manifest.json',
  './icon.svg',
  './logo.jpg'
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
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== TILES_CACHE; }).map(function (k) { return caches.delete(k); })); })
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
  // stale-while-revalidate, guardados en TILES_CACHE (sobrevive a actualizaciones de la app).
  e.respondWith(
    caches.match(req).then(function (hit) {
      const net = fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(TILES_CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});

// Descarga proactiva de mosaicos del mapa (para andar sin señal). El botón
// "Descargar mapa de la ruta" en index.html manda la lista de URLs de tiles;
// las guardamos en TILES_CACHE de a poco y avisamos el avance.
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') { self.skipWaiting(); return; }
  if (e.data && e.data.type === 'PRECACHE_TILES' && Array.isArray(e.data.urls)) {
    const urls = e.data.urls, client = e.source;
    e.waitUntil(
      caches.open(TILES_CACHE).then(async function (c) {
        let ok = 0, total = urls.length;
        for (const url of urls) {
          try {
            const hit = await c.match(url);
            if (!hit) { const res = await fetch(url); if (res && (res.status === 200 || res.type === 'opaque')) await c.put(url, res); }
            ok++;
          } catch (e2) { /* sigue con el resto aunque falle un mosaico */ }
          if (client) client.postMessage({ type: 'PRECACHE_PROGRESS', done: ok, total: total });
        }
        if (client) client.postMessage({ type: 'PRECACHE_DONE', done: ok, total: total });
      })
    );
  }
});
