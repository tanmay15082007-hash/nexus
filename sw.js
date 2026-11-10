/**
 * NEXUS - PWA Service Worker
 * Offline enabled. Relative paths only, for GitHub Pages sub-path hosting.
 */

const CACHE_NAME = 'nexus-v2.4.1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/effects.css',
  './css/layout.css',
  './css/components.css',
  './css/nexus-ui.css',
  './js/config.js',
  './js/audio.js',
  './js/dates.js',
  './js/storage.js',
  './js/state.js',
  './js/recurring.js',
  './js/tasks.js',
  './js/transfer.js',
  './js/calendar.js',
  './js/charts.js',
  './js/hub.js',
  './js/palette.js',
  './js/dialog.js',
  './js/timer.js',
  './js/pwa.js',
  './js/ui.js',
  './js/recurring-ui.js',
  './js/extras.js',
  './js/nav-back.js',
  './js/app.js',
  './assets/icons/icon.svg',
  './assets/icons/favicon-32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[NEXUS SW] Could not cache:', url, err);
          })
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache first, refresh in the background
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
