// Service Worker for Restoran Wawasan Pak Usop Admin Control
const CACHE_NAME = 'wawasan-admin-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/assets/wawasan_logo.jpg',
  '/assets/batik_pattern.jpg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Non-blocking pre-cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Listener (Cache-first with Network fallback and dynamic caching for critical assets)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip API calls, Firestore, and Firebase connections
  if (
    url.pathname.startsWith('/api') || 
    url.hostname.includes('firestore') || 
    url.hostname.includes('firebase') ||
    url.pathname.includes('__vite_ping') ||
    url.pathname.includes('hot-reload')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if found
      if (cachedResponse) {
        // Asynchronously check network for updates to stale assets (stale-while-revalidate pattern for stability)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Ignore network errors during silent revalidation */});

        return cachedResponse;
      }

      // If not in cache, fetch from network and cache dynamically if it's a critical asset
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Check if the resource is a critical asset worth caching dynamically
        const isCacheable = (
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.jpeg') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.woff2') ||
          url.pathname.includes('/assets/')
        );

        if (isCacheable) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      }).catch((err) => {
        console.warn('[Service Worker] Fetch failed, probably offline:', err);
        // Fallback for document navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// Background Sync Listener
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered. Event tag:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      syncOrdersInBackground()
    );
  }
});

// Sync Orders helper function
async function syncOrdersInBackground() {
  console.log('[Service Worker] Syncing order logs in background...');
  
  // Attempt to notify all clients that a background sync operation is in progress
  const clientsList = await self.clients.matchAll({ type: 'window' });
  for (const client of clientsList) {
    client.postMessage({
      type: 'BACKGROUND_SYNC_IN_PROGRESS',
      timestamp: Date.now()
    });
  }
  
  try {
    // A standard background query check (can be expanded based on API needs)
    const response = await fetch('/api/health');
    if (response.ok) {
      console.log('[Service Worker] Background sync completed successfully');
      for (const client of clientsList) {
        client.postMessage({
          type: 'BACKGROUND_SYNC_COMPLETE',
          status: 'success',
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error);
    for (const client of clientsList) {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        status: 'failed',
        timestamp: Date.now()
      });
    }
  }
}

// Push Notification Listener
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);
  
  let notificationData = {
    title: 'New Update',
    body: 'There are updates to your orders.',
    icon: '/assets/wawasan_logo.jpg'
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'Restoran Wawasan Pak Usop',
        body: event.data.text(),
        icon: '/assets/wawasan_logo.jpg'
      };
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/assets/wawasan_logo.jpg',
    badge: '/assets/wawasan_logo.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: '/admin',
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'open_dashboard', title: 'Open Dashboard' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received:', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/admin');
      }
    })
  );
});
