/* המשמרת — offline cache. Bump VERSION on every release. */
const VERSION = 'hamishmeret-v1.6.0';
const SHELL = ['./', './index.html', './css/game.css', './js/content.js', './js/engine.js', './js/data.js', './js/evidence.js', './js/core.js', './js/art.js', './js/ui.js', './js/battle.js', './js/world.js', './js/mae.js', './js/main.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // network first (fresh content when online), cache as fallback
  e.respondWith(fetch(e.request).then(r => { if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
