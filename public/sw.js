/**
 * OneLine PWA Service Worker
 * ==========================
 * 
 * Caching Strategy:
 * - Static assets (JS, CSS, fonts): Cache-first
 * - API calls: Network-first with fallback
 * - Images: Cache-first with network fallback
 * - Pages: Network-first for fresh content
 * 
 * Features:
 * - Offline page support
 * - Background sync for entries
 * - Smart cache invalidation
 */

const SW_VERSION = 'v4-pwa-2025-12-07';
const CACHE_NAME = `oneline-${SW_VERSION}`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/today',
  '/offline',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Static assets - cache first
  static: [
    /\/_next\/static\/.*/,
    /\.(?:js|css|woff2?|ttf|otf)$/,
  ],
  // Images - cache first
  images: [
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico)$/,
    /supabase.*storage/,
  ],
  // API - network first
  network: [
    /\/api\//,
    /supabase.*rest/,
    /supabase.*auth/,
  ],
};

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', SW_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS.map(url => {
          return new Request(url, { cache: 'reload' });
        })).catch(err => {
          console.warn('[SW] Some precache assets failed:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', SW_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('oneline-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Helper: Check if URL matches any pattern in array
function matchesPatterns(url, patterns) {
  return patterns.some(pattern => pattern.test(url));
}

// Fetch event - smart caching
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http
  if (!url.startsWith('http')) {
    return;
  }

  // Network-first for API calls
  if (matchesPatterns(url, CACHE_STRATEGIES.network)) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  if (matchesPatterns(url, CACHE_STRATEGIES.static)) {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) return cached;

          return fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          });
        })
    );
    return;
  }

  // Cache-first for images
  if (matchesPatterns(url, CACHE_STRATEGIES.images)) {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) return cached;

          return fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          });
        })
    );
    return;
  }

  // Network-first for pages (HTML)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cached) => {
            if (cached) return cached;
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline');
            }
          });
      })
  );
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ====================
// PUSH NOTIFICATIONS
// ====================

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'OneLine',
    body: 'Time to capture your thoughts ✨',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    tag: 'oneline-reminder',
    data: { url: '/today' },
  };

  // Try to parse push data
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      { action: 'write', title: 'Write now', icon: '/icons/icon-192.svg' },
      { action: 'later', title: 'Later' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  // Handle action buttons
  if (event.action === 'later') {
    return;
  }

  // Default action: open the app
  const urlToOpen = event.notification.data?.url || '/today';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to focus existing window
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});
