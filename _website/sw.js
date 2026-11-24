/* J. Leaders Realty app service worker */
const V = 'jlr-v2';
const CORE = ['/', '/offline/', '/app/', '/search/', '/manifest.webmanifest', '/js/app.js', '/img/app/icon-192.png', '/img/app/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin !== location.origin && !fonts) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('/offline/'))));
    return;
  }
  /* scripts + search index: network first so site updates show on the first visit (cache only if offline) */
  if (u.pathname.startsWith('/js/') || u.pathname === '/search-index.json') {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; }).catch(() => caches.match(r)));
    return;
  }
  if (fonts || u.pathname.startsWith('/img/') || u.pathname.startsWith('/js/')) {
    e.respondWith(caches.match(r).then(m => {
      const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; }).catch(() => m);
      return m || net;
    }));
  }
});
