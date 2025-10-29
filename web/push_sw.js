/* Service Worker for Push Notifications
   Place this file in the web/ folder served by your app (or register from a local dev server).
   It listens for 'push' events and shows a notification. Adjust payload handling as needed.
*/
self.addEventListener('push', function(event) {
  let data = { title: 'Notificación', body: 'Tienes una nueva notificación' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // ignore and use default
  }

  const title = data.title || 'Notificación';
  const options = {
    body: data.body || '',
    data: data,
    // add other options like icon, badge, actions as needed
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.matchAll({ type: 'window' }).then(windowClients => {
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === url && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});

// optional: cleanup on activate
self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
