// Service worker do Gestao de Obras: so cuida das notificacoes push.
// (Nao faz cache de paginas - o app continua sempre carregando a versao publicada.)

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: event.data ? event.data.text() : "" };
  }
  const titulo = dados.titulo || "Gestão de Obras";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || "",
      tag: dados.tag || undefined,
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      lang: "pt-BR",
      data: { url: dados.url || "/?abrir=notificacoes" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/?abrir=notificacoes", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const cliente of abertas) {
        if (new URL(cliente.url).origin === self.location.origin) {
          cliente.postMessage({ tipo: "abrir-notificacoes" });
          return cliente.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
