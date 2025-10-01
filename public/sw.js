// Service Worker for PWA functionality and offline support

const CACHE_NAME = 'gringo-forms-v1';
const STATIC_CACHE_NAME = 'gringo-static-v1';
const DYNAMIC_CACHE_NAME = 'gringo-dynamic-v1';

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/favicon.ico',
  '/manifest.json',
  // Add other critical assets
];

// API endpoints that can work offline
const OFFLINE_FALLBACK_PAGES = {
  '/api/': '/offline.html'
};

// Background sync tags
const SYNC_TAGS = {
  FORM_SUBMISSION: 'form-submission-sync',
  MEDIA_UPLOAD: 'media-upload-sync',
  DRAFT_SYNC: 'draft-sync'
};

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('Service Worker: Static resources cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static resources', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached resources and handle offline scenarios
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request));
  } else if (request.method === 'POST' && url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
});

async function handleGetRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first for API requests
    if (url.pathname.startsWith('/api/')) {
      return await handleApiGetRequest(request);
    }

    // For static resources, try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok && networkResponse.type === 'basic') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.error('Service Worker: Fetch failed', error);

    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback
    return getOfflineFallback(request);
  }
}

async function handleApiGetRequest(request) {
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful API responses for offline access
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.log('Service Worker: API network failed, trying cache', error);

    // Fallback to cached API response
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator to response headers
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }

    // Return mock offline response for critical APIs
    return getMockOfflineResponse(request);
  }
}

async function handleApiRequest(request) {
  try {
    // Try to send the request normally
    return await fetch(request);

  } catch (error) {
    console.log('Service Worker: API POST failed, registering for background sync');

    // Store the request for background sync
    await storeFailedRequest(request);

    // Register background sync
    const registration = await self.registration;
    if ('sync' in registration) {
      const url = new URL(request.url);
      let syncTag = SYNC_TAGS.FORM_SUBMISSION;

      if (url.pathname.includes('/media/')) {
        syncTag = SYNC_TAGS.MEDIA_UPLOAD;
      } else if (url.pathname.includes('/drafts/')) {
        syncTag = SYNC_TAGS.DRAFT_SYNC;
      }

      await registration.sync.register(syncTag);
    }

    // Return success response to prevent error on client
    return new Response(
      JSON.stringify({
        success: true,
        queued: true,
        message: 'Request queued for background sync'
      }),
      {
        status: 202,
        statusText: 'Accepted',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync event - retry failed requests when online
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);

  switch (event.tag) {
    case SYNC_TAGS.FORM_SUBMISSION:
      event.waitUntil(syncFormSubmissions());
      break;
    case SYNC_TAGS.MEDIA_UPLOAD:
      event.waitUntil(syncMediaUploads());
      break;
    case SYNC_TAGS.DRAFT_SYNC:
      event.waitUntil(syncDrafts());
      break;
    default:
      console.log('Service Worker: Unknown sync tag', event.tag);
  }
});

async function syncFormSubmissions() {
  try {
    const failedRequests = await getStoredRequests('form-submissions');

    for (const requestData of failedRequests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });

        if (response.ok) {
          await removeStoredRequest('form-submissions', requestData.id);
          console.log('Service Worker: Form submission synced successfully');

          // Notify client of successful sync
          await notifyClient('form-submission-synced', {
            id: requestData.id,
            status: 'success'
          });
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync form submission', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

async function syncMediaUploads() {
  try {
    const failedRequests = await getStoredRequests('media-uploads');

    for (const requestData of failedRequests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });

        if (response.ok) {
          await removeStoredRequest('media-uploads', requestData.id);
          console.log('Service Worker: Media upload synced successfully');

          await notifyClient('media-upload-synced', {
            id: requestData.id,
            status: 'success'
          });
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync media upload', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Media sync failed', error);
  }
}

async function syncDrafts() {
  try {
    const failedRequests = await getStoredRequests('drafts');

    for (const requestData of failedRequests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });

        if (response.ok) {
          await removeStoredRequest('drafts', requestData.id);
          console.log('Service Worker: Draft synced successfully');
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync draft', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Draft sync failed', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');

  let notificationData = {
    title: 'Gringo Forms',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {}
  };

  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() };
    } catch (error) {
      console.error('Service Worker: Failed to parse push data', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// Utility functions
async function storeFailedRequest(request) {
  const requestData = {
    id: Date.now().toString(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now()
  };

  const url = new URL(request.url);
  let storeName = 'form-submissions';

  if (url.pathname.includes('/media/')) {
    storeName = 'media-uploads';
  } else if (url.pathname.includes('/drafts/')) {
    storeName = 'drafts';
  }

  // Store in IndexedDB (implementation would depend on your IndexedDB service)
  console.log('Service Worker: Storing failed request', requestData);
}

async function getStoredRequests(storeName) {
  // This would integrate with your IndexedDB service
  console.log('Service Worker: Getting stored requests from', storeName);
  return [];
}

async function removeStoredRequest(storeName, id) {
  // This would integrate with your IndexedDB service
  console.log('Service Worker: Removing stored request', id, 'from', storeName);
}

async function notifyClient(type, data) {
  const clients = await self.clients.matchAll({ type: 'window' });

  clients.forEach(client => {
    client.postMessage({
      type,
      data
    });
  });
}

function getOfflineFallback(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This feature requires an internet connection'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Return offline page for navigation requests
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Offline - Gringo Forms</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .offline-icon { font-size: 48px; margin-bottom: 20px; }
        .offline-message { color: #666; }
      </style>
    </head>
    <body>
      <div class="offline-icon">📱</div>
      <h1>You're Offline</h1>
      <p class="offline-message">
        You're currently offline. Your form data will be saved and synced when you reconnect.
      </p>
      <button onclick="location.reload()">Try Again</button>
    </body>
    </html>
    `,
    {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

function getMockOfflineResponse(request) {
  const url = new URL(request.url);

  // Provide mock data for critical API endpoints
  if (url.pathname.includes('/templates')) {
    return new Response(
      JSON.stringify([]),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-From': 'offline-mock'
        }
      }
    );
  }

  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This data is not available offline'
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
