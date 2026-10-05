// Service worker minimal : ne sert qu'à recevoir et afficher les notifications push.
// Ne met rien en cache, ne modifie aucune requête réseau.

self.addEventListener("push", (event) => {
  let donnees = { titre: "TraceDon", corps: "", url: "/" };
  if (event.data) {
    try {
      donnees = event.data.json();
    } catch {
      donnees.corps = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(donnees.titre, {
      body: donnees.corps,
      icon: "/window.svg",
      data: { url: donnees.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
      for (const client of liste) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
