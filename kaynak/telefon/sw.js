// EXIT Garden Bayi Portalı: çevrimdışı önbellek
const SURUM = 'exit-bayi-v2.6';
const DOSYALAR = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(L => Promise.all(L.filter(k => k !== SURUM && k !== 'exit-gorsel').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    // uygulama dosyası: önce ağ (güncel sürüm), ağ yoksa önbellek
    e.respondWith(fetch(r).then(y => { const k = y.clone(); caches.open(SURUM).then(c => c.put(r, k)); return y; }).catch(() => caches.match(r).then(x => x || caches.match('./index.html'))));
  } else if (/\.(jpe?g|png|webp)$/i.test(u.pathname)) {
    // ürün fotoğrafları: önbellekte varsa hemen, arkada yenile
    e.respondWith(caches.open('exit-gorsel').then(c => c.match(r).then(x => { const ag = fetch(r).then(y => { if (y.ok || y.type === 'opaque') c.put(r, y.clone()); return y; }).catch(() => x); return x || ag; })));
  }
});
