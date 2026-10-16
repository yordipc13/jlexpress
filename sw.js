self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "Tu pedido tiene una actualización." };
  }

  event.waitUntil(self.registration.showNotification(payload.title || "JL Express", {
    body: payload.body || "El estado de tu pedido cambió.",
    icon: "/logo/logo.png",
    badge: "/logo/logo.png",
    tag: payload.tag || "jl-express-update",
    renotify: true,
    actions: [{ action: "open_tracking", title: "Ver pedido", icon: "/logo/logo.png" }],
    data: { url: payload.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = new URL(event.notification.data?.url || "/", self.location.origin);
  const targetUrl = requestedUrl.origin === self.location.origin ? requestedUrl.href : `${self.location.origin}/`;

  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin) && "navigate" in client) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  }));
});