const CACHE_NAME = 'careiq-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/chat/new',
  '/dashboard',
  '/notifications',
  '/manifest.json',
  // Add other important routes and assets
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and external requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API calls - always fetch from network
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.match(event.request)
          .then((cachedResponse) => {
            // If found in cache, return it
            if (cachedResponse) {
              console.log('Service Worker: Serving from cache', event.request.url);
              return cachedResponse;
            }

            // Otherwise, fetch from network
            console.log('Service Worker: Fetching from network', event.request.url);
            return fetch(event.request)
              .then((networkResponse) => {
                // Cache the response if it's successful and not opaque
                if (networkResponse.status === 200 && networkResponse.type === 'basic') {
                  const responseClone = networkResponse.clone();
                  cache.put(event.request, responseClone);
                }
                return networkResponse;
              })
              .catch(() => {
                // Return offline page if available
                if (event.request.destination === 'document') {
                  return cache.match('/offline.html');
                }
                return new Response('Network error', {
                  status: 408,
                  headers: { 'Content-Type': 'text/plain' },
                });
              });
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-chat') {
    console.log('Service Worker: Background sync for chat messages');
    event.waitUntil(
      // Handle offline chat messages here
      syncOfflineMessages()
    );
  }
});

async function syncOfflineMessages() {
  try {
    // Retrieve offline messages from IndexedDB
    const offlineMessages = await getOfflineMessages();
    
    for (const message of offlineMessages) {
      try {
        // Attempt to send the message
        const response = await fetch('/api/messages/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          // Remove from offline storage
          await removeOfflineMessage(message.id);
        }
      } catch (error) {
        console.log('Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'CareIQ';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'careiq-notification',
    data: data.url || '/',
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/action-open.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/action-dismiss.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if the app is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Placeholder functions for IndexedDB operations
async function getOfflineMessages() {
  // TODO: Implement IndexedDB retrieval
  return [];
}

async function removeOfflineMessage(messageId) {
  // TODO: Implement IndexedDB removal
  return true;
}