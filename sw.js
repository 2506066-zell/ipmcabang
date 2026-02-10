const STATIC_CACHE = 'static-v9';
const RUNTIME_CACHE = 'runtime-v1';
const CDN_CACHE = 'cdn-v2';
const CDN_ORIGINS = [
  'https://cdnjs.cloudflare.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];
const CDN_MAX_ENTRIES = 30;
const CDN_MAX_AGE = 5 * 24 * 60 * 60 * 1000; // 5 days
const CDN_META_SUFFIX = '::meta';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/articles.html',
  '/article.html',
  '/profile/',
  '/profile/index.html',
  '/quiz.html',
  '/materi.html',
  '/ranking.html',
  '/login.html',
  '/register.html',
  '/help.html',
  '/struktur-organisasi.html',
  '/offline.html',
  '/admin/offline.html',
  '/styles/style.css',
  '/styles/home-dynamic.css',
  '/styles/profile.css',
  '/styles/article-enhancements.css',
  '/styles/quiz-enhancements.css',
  '/styles/ranking.css',
  '/scripts/main.js',
  '/scripts/profile.js',
  '/scripts/install-header.js',
  '/scripts/toast.js',
  '/scripts/public-articles.js',
  '/scripts/public-materials.js',
  '/quiz.js',
  '/ranking.js',
  '/scripts/login.js',
  '/scripts/register.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE, CDN_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isCdnRequest(url) {
  return CDN_ORIGINS.includes(url.origin);
}

function shouldCacheApi(url, response) {
  if (!response || !response.ok) return false;
  if (url.pathname.startsWith('/api/auth')) return false;
  if (url.pathname.startsWith('/api/admin')) return false;
  const allow = ['/api/articles', '/api/materials', '/api/events'];
  return allow.some((path) => url.pathname.startsWith(path));
}

function metaRequest(url) {
  return new Request(`${url}${CDN_META_SUFFIX}`);
}

async function writeCdnMeta(cache, url) {
  await cache.put(metaRequest(url), new Response(Date.now().toString(), {
    headers: { 'content-type': 'text/plain' }
  }));
}

async function readCdnMeta(cache, url) {
  const res = await cache.match(metaRequest(url));
  if (!res) return 0;
  const text = await res.text();
  const ts = parseInt(text, 10);
  return Number.isFinite(ts) ? ts : 0;
}

async function purgeCdnEntry(cache, url) {
  await cache.delete(url);
  await cache.delete(metaRequest(url));
}

async function trimCdnCache(cache) {
  const keys = await cache.keys();
  const assetKeys = keys.filter((req) => !req.url.endsWith(CDN_META_SUFFIX));
  if (assetKeys.length <= CDN_MAX_ENTRIES) return;

  const entries = await Promise.all(
    assetKeys.map(async (req) => ({
      req,
      ts: await readCdnMeta(cache, req.url)
    }))
  );

  entries.sort((a, b) => a.ts - b.ts);
  const excess = entries.length - CDN_MAX_ENTRIES;
  for (let i = 0; i < excess; i++) {
    await purgeCdnEntry(cache, entries[i].req.url);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const url = new URL(request.url);
    if (shouldCacheApi(url, response)) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirstCdn(request) {
  const cache = await caches.open(CDN_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    const ts = await readCdnMeta(cache, request.url);
    if (!ts || (Date.now() - ts) <= CDN_MAX_AGE) return cached;
    await purgeCdnEntry(cache, request.url);
  }

  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    await cache.put(request, response.clone());
    await writeCdnMeta(cache, request.url);
    await trimCdnCache(cache);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== location.origin) {
    if (isCdnRequest(url)) {
      event.respondWith(cacheFirstCdn(request));
    }
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    const isAdmin = url.pathname.startsWith('/admin/');
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || caches.match(isAdmin ? '/admin/offline.html' : '/offline.html')
          )
        )
    );
    return;
  }

  event.respondWith(cacheFirst(request));
});

// --- PUSH NOTIFICATIONS ---
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Notifikasi IPM';
  const options = {
    body: data.body || 'Ada pembaruan baru.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
      return null;
    })
  );
});


