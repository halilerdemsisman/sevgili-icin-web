// EXIT Garden bayi web sitesi: çevrimdışı önbellek (service worker)
// SURUM ve KABUK derlemede yazılır (araclar/derle.mjs); her yeni sürümde tarayıcı bu dosyayı farklı
// bulur, yeni sürümü kurar ve eski önbelleği siler. Elle sürüm artırmaya gerek yoktur.
const SURUM = 'exit-web-' + /*@surum*/'';
const KABUK = /*@kabuk*/[];
const GORSEL = 'exit-gorsel';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(KABUK)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(L => Promise.all(L.filter(k => k !== SURUM && k !== GORSEL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  // kişisel veri (api), satış paneli ve MRP hiçbir zaman önbelleğe alınmaz
  if (/^\/(api|satis|mrp)(\/|$)/.test(u.pathname) || u.pathname === '/sw.js') return;

  // sayfa adresleri (/katalog, /siparisler/…): önce ağ; bağlantı yoksa önbellekteki uygulama kabuğu
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).catch(() => caches.open(SURUM).then(c => c.match('/'))));
    return;
  }
  // içerik özetli js/css: değişmez, önce önbellek
  if (/^\/(js|css)\//.test(u.pathname)) {
    e.respondWith(caches.match(r).then(x => x || fetch(r)));
    return;
  }
  // ürün fotoğrafları ve renk maskeleri: önbellekte varsa hemen, yoksa indir ve sakla
  if (/^\/(gorsel|maske)\//.test(u.pathname)) {
    e.respondWith(caches.open(GORSEL).then(c => c.match(r).then(x => x || fetch(r).then(y => { if (y.ok) c.put(r, y.clone()); return y; }))));
    return;
  }
  // diğerleri (manifest, simgeler): önce ağ, yoksa önbellek
  e.respondWith(fetch(r).catch(() => caches.match(r)));
});
