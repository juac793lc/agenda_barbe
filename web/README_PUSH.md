# Probar Push / suscripción (rápido)

1) Asegúrate de que `baken` esté ejecutándose (por defecto http://localhost:3333) y que en `baken/.env` tengas `VAPID_PUBLIC_KEY` configurada.

2) Coloca `push_sw.js` y `push_subscribe.js` en la carpeta `web/` (ya están añadidos). Sirve tu app (por ejemplo `flutter run -d chrome` o un servidor estático que sirva `web/`).

3) En la consola del navegador (o incluye `push_subscribe.js` en tu HTML), ejecuta:

```js
// si tu backend corre en otro origen, ajusta window.BACKEND_ORIGIN
window.BACKEND_ORIGIN = 'http://localhost:3333';
// luego inicializa la suscripción (opcionalmente pasa user id o metadata)
await window.initPush(null, { from: 'manual-test' });
```

4) El navegador pedirá permiso para mostrar notificaciones. Al aceptar, se registrará el service worker y se enviará la suscripción a `POST /subscribe`. Revisa la tabla `push_subscriptions` en Supabase para verificar la fila insertada.

5) Para probar envío inmediato, crea una cita y ajusta su `notification_at` a `now()` (o usa un endpoint de prueba) y espera a que el worker en `baken` la procese. Revisa `notification_logs` para ver intentos de entrega.

Notas:
- Los VAPID keys deben generarse y mantenerse en secreto (la privada). Solo la pública se comparte al cliente.
- Para integrar con Flutter Web, usa JS interop para llamar a `initPush()` o abrir una pequeña página web que haga el registro y envíe la subscripción al backend.
