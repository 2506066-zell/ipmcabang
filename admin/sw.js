const CACHE_NAME = 'ipm-admin-v2';
const ASSETS = [
    './admin.html',
    './admin.css',
    './admin.js',
    './manifest.json',
    '../ipm (2).png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (e) => {
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
        })
    );
});

self.addEventListener('fetch', (e) => {
    // API strategies could go here
    if (e.request.url.includes('/api/')) return;

    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
