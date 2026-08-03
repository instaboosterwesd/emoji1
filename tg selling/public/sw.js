/* Keep the app's existing service-worker registration valid without
   introducing a cache that could mix the high and low entry points. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});