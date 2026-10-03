// Service worker for member apps: shows push notifications and opens their link on tap.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "New update", body: event.data ? event.data.text() : "" };
  }
  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(data.title || "New update", {
      body: data.body || "",
      tag: data.tag,
      renotify: data.tag === "live",
      icon: data.icon,
      badge: data.badge,
      data: { url: data.url || scope },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || self.registration.scope, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});
