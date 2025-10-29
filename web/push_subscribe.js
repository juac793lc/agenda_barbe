/*
  Example client-side script to:
  - request Notification permission
  - register the service worker `push_sw.js`
  - subscribe to Push using the server's VAPID public key
  - POST the subscription to the backend `/subscribe` endpoint

  Usage (in browser console or include in a simple HTML page):
    1) Make sure your backend `baken` is running and reachable (e.g. http://localhost:3333)
    2) Load this script in the page or paste in the console. Set BACKEND_ORIGIN if needed.
    3) Call `initPush()` and follow prompts.

  NOTE: For Flutter web you can call the same logic via JS interop or open a small page to register.
*/

const BACKEND_ORIGIN = window.BACKEND_ORIGIN || (window.location.origin.includes('localhost') ? 'http://localhost:3333' : window.location.origin);
const SERVICE_WORKER_FILE = '/push_sw.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker not supported');
  const reg = await navigator.serviceWorker.register(SERVICE_WORKER_FILE);
  console.log('Service Worker registered', reg.scope);
  return reg;
}

async function getVapidPublicKey() {
  const res = await fetch(`${BACKEND_ORIGIN}/vapidPublicKey`);
  if (!res.ok) throw new Error('Could not fetch VAPID public key');
  const j = await res.json();
  return j.publicKey;
}

async function subscribeToPush(userId = null, metadata = {}) {
  // ensure permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const reg = await registerServiceWorker();
  const pubKey = await getVapidPublicKey();
  if (!pubKey) throw new Error('Server VAPID public key not configured');

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(pubKey)
  });

  // POST to backend subscribe endpoint
  const body = { subscription: sub, user_id: userId, metadata };
  const r = await fetch(`${BACKEND_ORIGIN}/subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error('Subscribe failed: ' + r.status + ' ' + txt);
  }
  const inserted = await r.json();
  console.log('Subscription saved on server:', inserted);
  // Return a JSON string so Dart JS interop can easily parse it.
  return JSON.stringify(inserted);
}

// exported convenience initializer
async function initPush(userId = null, metadata = {}) {
  try {
    const s = await subscribeToPush(userId, metadata);
    return s;
  } catch (e) {
    console.error('initPush error', e && e.message ? e.message : e);
    throw e;
  }
}

// expose for console use
window.initPush = initPush;
window.subscribeToPush = subscribeToPush;
window.getVapidPublicKey = getVapidPublicKey;
