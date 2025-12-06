// NUCLEAR OPTION: Force unregister all service workers
console.log('[SW] Unregistering all service workers...');

self.addEventListener('install', () => {
  console.log('[SW] Installing UNREGISTER version');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating UNREGISTER version');
  event.waitUntil(
    Promise.all([
      // Delete ALL caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Force deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Claim all clients
      self.clients.claim(),
      // Unregister this service worker after activation
      self.registration.unregister().then(() => {
        console.log('[SW] Service worker unregistered successfully');
        // Force reload all clients to clear everything
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            console.log('[SW] Reloading client:', client.url);
            client.postMessage({ type: 'FORCE_RELOAD' });
          });
        });
      })
    ])
  );
});

self.addEventListener('fetch', () => {
  // Pass through - no caching
});
