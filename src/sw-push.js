/* Service worker de GoalScore: sólo atiende notificaciones Web Push (no cachea nada). */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener('push', (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch (e) {
    datos = { cuerpo: evento.data ? evento.data.text() : '' };
  }
  const icono = new URL('assets/images/logo-goalscore-icono.png', self.registration.scope).href;
  const opciones = {
    body: datos.cuerpo || '',
    icon: icono,
    badge: icono,
    tag: datos.tag || undefined,
    renotify: !!datos.tag,
    data: { url: datos.url || '/', partido_id: datos.partido_id, campeonato_id: datos.campeonato_id },
  };
  evento.waitUntil(self.registration.showNotification(datos.titulo || 'GoalScore', opciones));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = new URL((evento.notification.data && evento.notification.data.url) || '/', self.registration.scope).href;
  evento.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const propia = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
    if (propia) {
      await propia.focus();
      if ('navigate' in propia) {
        try { await propia.navigate(destino); } catch (e) { /* la pestaña no se puede redirigir */ }
      }
      return;
    }
    await self.clients.openWindow(destino);
  })());
});
