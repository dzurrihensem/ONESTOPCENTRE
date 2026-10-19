// sw.js "pembersih": buang service worker & cache lama yang menyebabkan skrin putih.
// Letak fail ini di public/sw.js, kemudian deploy semula.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url)); // muat semula halaman secara automatik
  })());
});

// Jangan cache apa-apa lagi: semua permintaan terus ke internet
self.addEventListener('fetch', () => {});
