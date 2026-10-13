/* Installable app shell. Never caches pages, so an update is always picked up. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => { if (e.request.mode === "navigate") e.respondWith(fetch(e.request)); });
