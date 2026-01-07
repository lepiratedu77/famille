const CACHE_NAME = 'cadario-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(['/']);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Listener for Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'CADARIO Hub', body: 'Nouvelle notification !' };

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icon-512x512.png',
            badge: '/icon-512x512.png'
        })
    );
});
