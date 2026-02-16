self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: "New message", body: "Open the app to view." }
  }

  const title = data.title || "New message"
  const options = {
    body: data.body || "Open the app to view.",
    icon: data.icon || "/icon.png",
    data: { url: data.url || "/messages" },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/messages"
  event.waitUntil(clients.openWindow(url))
})
