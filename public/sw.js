/* eslint-disable no-restricted-globals */
/**
 * Royal Studio PWA Service Worker (v6)
 * Powered by Workbox (workbox-sw + BackgroundSyncPlugin + Aggressive Client-Portal Caching)
 * with built-in IndexedDB fallback queue for 100% offline reliability.
 */

const CACHE_NAME = 'royal-studio-pwa-v6';
const OFFLINE_DATA_CACHE = 'royal-studio-offline-data-v2';
const OFFLINE_IMAGE_CACHE = 'royal-studio-offline-images-v2';
const STATIC_ASSETS_CACHE = 'royal-studio-static-assets-v2';
const ALLOWED_CACHES = [
  CACHE_NAME,
  OFFLINE_DATA_CACHE,
  OFFLINE_IMAGE_CACHE,
  STATIC_ASSETS_CACHE,
];

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/RoyalLogo.png',
];

const SW_DB_NAME = 'royal-studio-sw-sync-db';
const SW_STORE_NAME = 'swSyncQueue';

// Load Workbox from Google CDN when online
try {
  importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js'
  );
} catch {
  // Workbox CDN unavailable during cold offline boot; native fallback handlers below remain active
}

function openSwSyncDB() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(SW_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SW_STORE_NAME)) {
          db.createObjectStore(SW_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function notifyAllClients(payload) {
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    for (const client of clientList) {
      client.postMessage(payload);
    }
  } catch {
    // Ignore client broadcast errors
  }
}

async function enqueueSwRequest(url, method, bodyText) {
  const db = await openSwSyncDB();
  if (!db) return;
  const record = {
    id: `sw-sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url,
    method: method || 'POST',
    bodyText,
    createdAt: new Date().toISOString(),
  };
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(SW_STORE_NAME, 'readwrite');
      tx.objectStore(SW_STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });

  await notifyAllClients({
    type: 'WORKBOX_BACKGROUND_SYNC_QUEUED',
    url,
    method: method || 'POST',
    timestamp: record.createdAt,
  });
}

async function replaySwQueuedRequests() {
  const db = await openSwSyncDB();
  let replayedCount = 0;

  if (db) {
    const items = await new Promise((resolve) => {
      try {
        const tx = db.transaction(SW_STORE_NAME, 'readonly');
        const req = tx.objectStore(SW_STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });

    const remaining = [];
    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: item.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Background-Sync': '1',
          },
          body: item.bodyText,
        });
        if (res.ok) {
          replayedCount += 1;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    await new Promise((resolve) => {
      try {
        const tx = db.transaction(SW_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SW_STORE_NAME);
        store.clear();
        remaining.forEach((r) => store.put(r));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  await notifyAllClients({
    type: 'SW_BACKGROUND_SYNC_TRIGGER',
    replayedCount,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// WORKBOX CONFIGURATION (BackgroundSyncPlugin + Aggressive Client-Portal Caching)
// ============================================================================
let workboxBgSyncQueue = null;

if (typeof self.workbox !== 'undefined' && self.workbox) {
  try {
    self.workbox.setConfig({ debug: false });

    const { routing, strategies, expiration, cacheableResponse, backgroundSync } =
      self.workbox;

    // 1. Workbox BackgroundSync Queue for Proposal Updates & Gallery Favorite Toggles
    if (backgroundSync && backgroundSync.Queue) {
      workboxBgSyncQueue = new backgroundSync.Queue(
        'royal-studio-workbox-mutation-queue',
        {
          maxRetentionTime: 7 * 24 * 60, // Retry for up to 7 days (in minutes)
          onSync: async ({ queue }) => {
            let entry;
            let synced = 0;
            while ((entry = await queue.shiftRequest())) {
              try {
                await fetch(entry.request.clone());
                synced += 1;
              } catch (err) {
                await queue.unshiftRequest(entry);
                throw err;
              }
            }
            await replaySwQueuedRequests();
            await notifyAllClients({
              type: 'SW_BACKGROUND_SYNC_TRIGGER',
              replayedCount: synced,
              timestamp: new Date().toISOString(),
            });
          },
        }
      );
    }

    // 2. Aggressive Caching for Client-Portal, Proposal & Gallery Data Routes (/api/client-portal, /api/proposal/*, /api/gallery/*)
    routing.registerRoute(
      ({ url, request }) =>
        request.method === 'GET' &&
        url.origin === self.location.origin &&
        (url.pathname.startsWith('/api/client-portal') ||
          url.pathname.startsWith('/api/proposal/') ||
          url.pathname.startsWith('/api/gallery/')),
      new strategies.NetworkFirst({
        cacheName: OFFLINE_DATA_CACHE,
        networkTimeoutSeconds: 3,
        plugins: [
          new cacheableResponse.CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new expiration.ExpirationPlugin({
            maxEntries: 120,
            maxAgeSeconds: 14 * 24 * 60 * 60, // 14 days aggressive retention
          }),
        ],
      })
    );

    // 3. Aggressive Caching for Client Portal HTML Navigation Routes (/client-portal, /proposal/*, /gallery/*)
    routing.registerRoute(
      ({ url, request }) =>
        request.mode === 'navigate' &&
        url.origin === self.location.origin &&
        (url.pathname.startsWith('/client-portal') ||
          url.pathname.startsWith('/proposal') ||
          url.pathname.startsWith('/gallery')),
      new strategies.NetworkFirst({
        cacheName: CACHE_NAME,
        networkTimeoutSeconds: 3,
        plugins: [
          new cacheableResponse.CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new expiration.ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 14 * 24 * 60 * 60,
          }),
        ],
      })
    );

    // 4. Aggressive StaleWhileRevalidate Caching for Next.js Static Chunks, CSS, JS & Fonts
    routing.registerRoute(
      ({ url, request }) =>
        request.method === 'GET' &&
        ((url.origin === self.location.origin &&
          url.pathname.startsWith('/_next/static/')) ||
          url.hostname.includes('fonts.googleapis.com') ||
          url.hostname.includes('fonts.gstatic.com')),
      new strategies.StaleWhileRevalidate({
        cacheName: STATIC_ASSETS_CACHE,
        plugins: [
          new cacheableResponse.CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new expiration.ExpirationPlugin({
            maxEntries: 250,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      })
    );

    // 5. Aggressive CacheFirst / StaleWhileRevalidate for Gallery Proof Images & Static Brand Assets
    routing.registerRoute(
      ({ url, request }) =>
        request.method === 'GET' &&
        (url.pathname.startsWith('/portfolio/') ||
          url.pathname.startsWith('/team/') ||
          /\.(png|jpg|jpeg|webp|avif|svg|ico)$/i.test(url.pathname)),
      new strategies.StaleWhileRevalidate({
        cacheName: OFFLINE_IMAGE_CACHE,
        plugins: [
          new cacheableResponse.CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new expiration.ExpirationPlugin({
            maxEntries: 300,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      })
    );
  } catch {
    // Fallback to native fetch listeners below if Workbox initialization encounters any issue
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_ASSETS.map((assetUrl) =>
            fetch(assetUrl)
              .then((res) => {
                if (res && res.ok) {
                  return cache.put(assetUrl, res);
                }
                return undefined;
              })
              .catch(() => {})
          )
        )
      )
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!ALLOWED_CACHES.includes(key) && !key.startsWith('workbox')) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'TRIGGER_BACKGROUND_SYNC') {
    event.waitUntil(
      (async () => {
        if (workboxBgSyncQueue) {
          try {
            await workboxBgSyncQueue.replayRequests();
          } catch {
            // Ignore
          }
        }
        await replaySwQueuedRequests();
      })()
    );
    return;
  }

  if (data.type === 'CACHE_OFFLINE_BUNDLE' && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const dataCache = await caches.open(OFFLINE_DATA_CACHE);
        const imgCache = await caches.open(OFFLINE_IMAGE_CACHE);
        const appCache = await caches.open(CACHE_NAME);

        for (const rawUrl of data.urls) {
          if (!rawUrl || typeof rawUrl !== 'string') continue;
          try {
            const parsed = new URL(rawUrl, self.location.origin);
            const isSameOrigin = parsed.origin === self.location.origin;

            if (!isSameOrigin) {
              const imgRes = await fetch(parsed.href, { mode: 'no-cors' });
              if (imgRes) {
                await imgCache.put(parsed.href, imgRes);
              }
            } else if (parsed.pathname.startsWith('/api/')) {
              const apiRes = await fetch(parsed.href);
              if (apiRes && apiRes.ok) {
                await dataCache.put(parsed.href, apiRes.clone());
                await appCache.put(parsed.href, apiRes);
              }
            } else {
              const pageRes = await fetch(parsed.href);
              if (pageRes && pageRes.ok) {
                await appCache.put(parsed.href, pageRes);
              }
            }
          } catch {
            // Ignore individual URL warm failure when offline
          }
        }
      })()
    );
  }
});

self.addEventListener('sync', (event) => {
  if (
    event.tag === 'royal-studio-bg-sync' ||
    event.tag === 'sync-gallery-favorites' ||
    event.tag === 'sync-proposals' ||
    event.tag.startsWith('workbox-background-sync')
  ) {
    event.waitUntil(
      (async () => {
        if (workboxBgSyncQueue) {
          try {
            await workboxBgSyncQueue.replayRequests();
          } catch {
            // Ignore
          }
        }
        await replaySwQueuedRequests();
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Intercept offline POST mutations to /api/gallery/*, /api/proposal/*, /api/client-portal
  // Queues into both Workbox BackgroundSync Queue and IndexedDB backup queue
  if (
    request.method === 'POST' &&
    url.origin === self.location.origin &&
    !request.headers.get('X-Background-Sync') &&
    (url.pathname.startsWith('/api/gallery/') ||
      url.pathname.startsWith('/api/proposal/') ||
      url.pathname.startsWith('/api/client-portal'))
  ) {
    event.respondWith(
      (async () => {
        const clonedForWorkbox = request.clone();
        const clonedForIdb = request.clone();
        try {
          return await fetch(request);
        } catch {
          try {
            if (workboxBgSyncQueue) {
              await workboxBgSyncQueue.pushRequest({ request: clonedForWorkbox });
            }
          } catch {
            // Fallback to IndexedDB queue below
          }
          try {
            const bodyText = await clonedForIdb.text();
            await enqueueSwRequest(request.url, 'POST', bodyText);
            if (self.registration && 'sync' in self.registration) {
              try {
                await self.registration.sync.register('royal-studio-bg-sync');
              } catch {
                // Fallback handled by client online event
              }
            }
          } catch {
            // Ignore body read error
          }
          return new Response(
            JSON.stringify({
              ok: true,
              success: true,
              offlineQueued: true,
              workboxQueued: Boolean(workboxBgSyncQueue),
              message:
                'Saved locally offline and queued in Workbox Background Sync for automatic re-sync when connection is restored.',
            }),
            {
              status: 202,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      })()
    );
    return;
  }

  if (request.method !== 'GET') return;

  // Handle cross-origin gallery favorite photos
  if (
    url.origin !== self.location.origin &&
    (url.hostname.includes('picsum.photos') ||
      url.hostname.includes('unsplash.com') ||
      /\.(png|jpg|jpeg|webp|avif)$/i.test(url.pathname))
  ) {
    event.respondWith(
      caches.open(OFFLINE_IMAGE_CACHE).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (
            networkResponse &&
            (networkResponse.ok || networkResponse.type === 'opaque')
          ) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          return Response.error();
        }
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Aggressive caching for Next.js static bundles so Client Portal works during internet outages
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_ASSETS_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((res) => {
            if (res && res.ok && res.status === 200) {
              cache.put(request, res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  // Navigation requests for Client Portal, Proposals, and Galleries: Network-First with Aggressive Cache Fallback
  if (
    request.mode === 'navigate' &&
    (url.pathname === '/' ||
      url.pathname.startsWith('/client-portal') ||
      url.pathname.startsWith('/proposal') ||
      url.pathname.startsWith('/gallery'))
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const exactMatch = await caches.match(request);
          if (exactMatch) return exactMatch;
          if (url.pathname.startsWith('/client-portal')) {
            const portalMatch = await caches.match('/client-portal');
            if (portalMatch) return portalMatch;
          }
          if (url.pathname.startsWith('/proposal/')) {
            const hubMatch = await caches.match('/proposal');
            if (hubMatch) return hubMatch;
          }
          if (url.pathname.startsWith('/gallery/')) {
            const hubMatch = await caches.match('/gallery');
            if (hubMatch) return hubMatch;
          }
          const rootMatch = await caches.match('/');
          return rootMatch || Response.error();
        })
    );
    return;
  }

  // API GET requests (especially /api/client-portal, /api/proposal/*, /api/gallery/*):
  // Aggressive caching into OFFLINE_DATA_CACHE + CACHE_NAME with ignoreSearch fallback for client-portal
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const contentType = response.headers.get('content-type') || '';
          if (
            response.ok &&
            response.status === 200 &&
            contentType.includes('application/json')
          ) {
            const copyForData = response.clone();
            const copyForApp = response.clone();
            caches
              .open(OFFLINE_DATA_CACHE)
              .then((cache) => cache.put(request, copyForData));
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copyForApp));
          }
          return response;
        })
        .catch(async () => {
          const dataCache = await caches.open(OFFLINE_DATA_CACHE);
          const exactData = await dataCache.match(request);
          if (exactData) return exactData;
          if (
            url.pathname.startsWith('/api/client-portal') ||
            url.pathname.startsWith('/api/proposal/') ||
            url.pathname.startsWith('/api/gallery/')
          ) {
            const ignoreQueryMatch = await dataCache.match(request, {
              ignoreSearch: true,
            });
            if (ignoreQueryMatch) return ignoreQueryMatch;
          }
          const cachedApp = await caches.match(request);
          return cachedApp || Response.error();
        })
    );
    return;
  }

  // Static images & manifest
  if (
    url.pathname.startsWith('/portfolio/') ||
    url.pathname.startsWith('/team/') ||
    /\.(png|jpg|jpeg|webp|avif|svg|ico|json)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(OFFLINE_IMAGE_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response && response.ok && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          return caches.match(request);
        }
      })
    );
  }
});
