self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", () => {
  // Intentionally no-op.
});

self.addEventListener("push", () => {
  // Intentionally disabled. Native iOS/Android push only.
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
});