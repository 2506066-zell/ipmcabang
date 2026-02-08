const CACHE_NAME = 'ipm-admin-v3';
const ASSETS = [
    './admin.html',
    './admin.css',
    './admin.js',
    './manifest.json',
    '../ipm (2).png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('/api/')) return;

    // Network First Strategy for Admin
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });
                return response;
            })
            .catch(() => {
                return caches.match(e.request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    // Optional: Return a fallback offline page or JSON if it's an API
                    // For now, allow it to fail if neither exists (browser will show error)
                    // or return a basic offline message if HTML
                    if (e.request.headers.get('accept').includes('text/html')) {
                        return new Response('<h1>Offline</h1><p>Anda sedang offline dan halaman ini belum tersimpan.</p>', {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    }
                    return undefined; // Let browser handle it
                });
            })
    );
});
