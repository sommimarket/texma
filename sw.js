/* TEXMA · service worker · cache-first para funcionar 100% offline */
const CACHE = 'texma-v14';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-mask.png',
  './maniqui.png',
  './onb1.jpg',
  './onb2.jpg',
  './onb3.jpg',
  './notif_texma.mp3',
  './gsap.min.js',
  './fonts/fonts.css',
  './fonts/cormorant-garamond-500i-latin.woff2',
  './fonts/cormorant-garamond-500i-latin-ext.woff2',
  './fonts/manrope-400-latin.woff2',
  './fonts/manrope-400-latin-ext.woff2',
  './fonts/jetbrains-mono-400-latin.woff2',
  './fonts/jetbrains-mono-400-latin-ext.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ---------- avisos en segundo plano (Web Push) ----------
   El servidor manda un JSON { title, body, tag, url }. Esto aguanta con la
   app cerrada. El SONIDO lo pone el celular (canal de notificaciones del
   navegador): un sonido propio de TEXMA con la app cerrada solo se puede
   en la app nativa (APK). Ver server/NOTIFICACIONES.md */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  const title = d.title || 'TEXMA';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: d.tag || 'texma',
      renotify: true,
      silent: false,
      vibrate: [90, 50, 90],
      requireInteraction: !!d.sticky,
      data: { url: d.url || './' }
    })
  );
});

/* si el navegador rota la suscripción, avisar a las pestañas abiertas */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true })
      .then(cs => cs.forEach(c => c.postMessage({ type: 'push-resubscribe' })))
  );
});

/* tocar el aviso abre (o enfoca) TEXMA */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) if ('focus' in c) return c.focus();
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.g') || e.request.url.includes('jsdelivr'))) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
