import { del, entries } from "./idb-keyval.js";

const cacheName = 'app-cache';
const filesToCache = [
    '/manifest.json',
    '/',
    '/index.html',
    '/icons/android-chrome-192x192.png',
    '/icons/android-chrome-512x512.png',
    '/icons/favicon-16x16.png',
    '/icons/favicon-32x32.png',
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(cacheName).then((cache) => {
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener("activate", (event) => {
    console.log("**************************************");
    console.log("**   Activating new service worker... **");
    console.log("**************************************");
    const cacheWhitelist = [cacheName];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                const responseToCache = networkResponse.clone();

                return caches.open(cacheName).then((cache) => {
                    cache.put(event.request, responseToCache);
                    return new Response(responseToCache.body, {
                        status: responseToCache.status,
                        statusText: responseToCache.statusText,
                        headers: new Headers(responseToCache.headers),
                    });
                });
            })
            .catch(() => {
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        return new Response('Resource not found in cache or network', { status: 404 });
                    })
                    .catch((cacheError) => {
                        console.error('Error reading cache:', cacheError);
                        return new Response('Error reading cache', { status: 500 });
                    });
            })
    );
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'syncData') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    entries().then((entries) => {
        entries.forEach((entry) => {
            let note = entry[1];
            fetch("/save-note", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(note),
            })
                .then(function (res) {
                    if (res.ok) {
                        res.json().then(function (data) {
                            console.log("Deleting from idb:", data.text);
                            del(data.text);
                        });
                    } else {
                        console.log(res);
                    }
                })
                .catch(function (error) {
                    console.log(error);
                });
        });
    });
}

self.addEventListener("notificationclick", (event) => {
    let notification = event.notification;
    notification.close();
    console.log("notificationclick", notification);
    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (clis) {
                if (clis && clis.length > 0) {
                    clis.forEach(async (client) => {
                        await client.navigate(notification.data.redirectUrl);
                        return client.focus();
                    });
                } else if (clients.openWindow) {
                    return clients
                        .openWindow(notification.data.redirectUrl)
                        .then((windowClient) =>
                            windowClient ? windowClient.focus() : null
                        );
                }
            })
    );
});


self.addEventListener("push", function (event) {

    var data = { title: "title", body: "body", redirectUrl: "/" };

    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.body,
        icon: '/icons/android-chrome-192x192.png',
        badge: '/icons/android-chrome-192x192.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
            redirectUrl: data.redirectUrl,
        },
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );

});