// SAFE VERSION - No automatic reloads
const SW_VERSION = 'v3-safe-2025-12-06';

self.addEventListener('install', () => {
  console.log('[SW] Installing safe version:', SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating safe version:', SW_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// NO caching - everything passes through
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
