/* Caches the app shell so it opens without internet. Photos live in IndexedDB. */
const CACHE = 'lifetiles-v3';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'vendor/jszip.min.js', 'vendor/d3-array.min.js', 'vendor/d3-geo.min.js', 'vendor/topojson-client.min.js', 'vendor/countries-50m.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  // Network first (so updates arrive when there is wifi), cache when offline.
  if (e.request.method !== 'GET' || e.request.url.endsWith('.zip')) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
