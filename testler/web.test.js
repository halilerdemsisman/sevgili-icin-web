// Faz 2a: bayi web sitesi. Sunucunun siteyi nasıl yayınladığı (adresler, önbellek, sıkıştırma,
// güvenlik başlıkları), sayfa ağırlığı, adres tabanlı gezinme (geri/ileri, derin bağlantı),
// telefonda düzen (375 px, alt sekme çubuğu) ve çevrimdışı açılış.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');
const { sunucuBaslat, hataTopla, PAKET } = require('./yardimci');

const getir = (url, h = {}) => fetch(url, { headers: h });

describe('Bayi web sitesi: sunucu', () => {
  let s;
  before(async () => { s = await sunucuBaslat(); });
  after(() => s?.kapat());

  test('sayfa adresleri aynı index.html\'i döner; içerik güvenliği başlığı var', async () => {
    const ana = await (await getir(s.url + '/')).text();
    assert.match(ana, /<base href="\/">/);
    for (const yol of ['/katalog', '/katalog/sandalyeler', '/urun/21-neo', '/sepet', '/siparisler', '/siparisler/EXG-2026-0001', '/cari', '/belgeler', '/odeme', '/ozel-teklif', '/projeler']) {
      const r = await getir(s.url + yol);
      assert.equal(r.status, 200, yol);
      assert.equal(await r.text(), ana, yol);
      assert.match(r.headers.get('content-security-policy'), /default-src 'self'.*connect-src 'self'/, yol);
      assert.equal(r.headers.get('cache-control'), 'no-cache', yol);
    }
    assert.match((await getir(s.url + '/satis')).headers.get('content-security-policy'), /connect-src 'self' https:\/\/open\.er-api\.com/);
  });

  test('js/css içerik özetli ve kalıcı önbellekli; gzip ve ETag çalışır', async () => {
    const ana = await (await getir(s.url + '/')).text();
    const js = ana.match(/src="(\/js\/[^"]+)"/)[1];
    assert.match(js, /\.[0-9a-f]{10}\.js$/);
    const r = await getir(s.url + js, { 'Accept-Encoding': 'gzip' });
    assert.equal(r.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.equal(r.headers.get('content-encoding'), 'gzip');
    assert.equal(r.headers.get('content-type'), 'text/javascript; charset=utf-8');
    const r2 = await getir(s.url + js, { 'If-None-Match': r.headers.get('etag') });
    assert.equal(r2.status, 304);
    const g = await getir(s.url + '/gorsel/21-k.webp');
    assert.equal(g.status, 200); assert.equal(g.headers.get('content-type'), 'image/webp');
  });

  test('sunucu ve veri klasörü dışarıdan okunamaz; olmayan dosya 404', async () => {
    for (const yol of ['/../sunucu/sunucu.js', '/%2e%2e/sunucu/veri.sqlite', '/..%2fsunucu%2fsunucu.js']) {
      const r = await getir(s.url + yol);
      assert.ok([403, 404].includes(r.status), yol + ' → ' + r.status);
    }
    assert.equal((await getir(s.url + '/yok.js')).status, 404);
    assert.equal((await getir(s.url + '/katalog/a.b')).status, 404); // uzantılı adres sayfa sayılmaz
  });

  test('ilk açılış ağırlığı: html + js + css sıkıştırılmış 200 KB altında, küçük resimler 400 KB altında', async () => {
    const ana = await getir(s.url + '/', { 'Accept-Encoding': 'gzip' });
    let toplam = +ana.headers.get('content-length');
    const html = await ana.text(); // fetch gzip'i kendisi açar; content-length sıkıştırılmış boyuttur
    for (const [, yol] of html.matchAll(/(?:src|href)="(\/(?:js|css)\/[^"]+)"/g)) toplam += +(await getir(s.url + yol, { 'Accept-Encoding': 'gzip' })).headers.get('content-length');
    const k = fs.readdirSync(path.join(PAKET, 'web', 'gorsel')).filter(f => /-k\.webp$/.test(f)).reduce((a, f) => a + fs.statSync(path.join(PAKET, 'web', 'gorsel', f)).size, 0);
    console.log(`  kod ${(toplam / 1024).toFixed(0)} KB (gzip) · küçük resimler ${(k / 1024).toFixed(0)} KB · eski tek dosya ${(fs.statSync(path.join(PAKET, 'exit_bayi_siparis.html')).size / 1048576).toFixed(1)} MB`);
    assert.ok(toplam < 200 * 1024, 'kod ' + toplam);
    assert.ok(k < 400 * 1024, 'küçük resimler ' + k);
  });

  test('service worker derlemede sürümlenir; kişisel veri ve satış önbelleğe alınmaz', async () => {
    const r = await getir(s.url + '/sw.js'); const sw = await r.text();
    assert.equal(r.headers.get('cache-control'), 'no-cache');
    assert.match(sw, /const SURUM = 'exit-web-' \+ "[0-9a-f]{10}"/);
    const kabuk = JSON.parse(sw.match(/const KABUK = (\[.*\]);/)[1]);
    assert.ok(kabuk.includes('/') && kabuk.some(f => /^\/js\//.test(f)) && kabuk.some(f => /^\/css\//.test(f)));
    assert.ok(!kabuk.some(f => /^\/(api|satis|gorsel)/.test(f)));
    assert.match(sw, /\(api\|satis\|mrp\)/);
  });

  test('tek dosyalık sürüm web eklerini içermez', () => {
    const h = fs.readFileSync(path.join(PAKET, 'exit_bayi_siparis.html'), 'utf8');
    assert.ok(!h.includes('{{web') && !h.includes('EXIT_WEB = true') && !h.includes('<base href'));
  });
});

describe('Bayi web sitesi: tarayıcıda', () => {
  let s, b, cerez, no;
  before(async () => {
    s = await sunucuBaslat();
    cerez = await s.kayit('deniz', 'Deniz-Sifre-1');
    const r = await s.api('/api/v1/siparisler', { adres: 'İzmir', kalemler: [{ id: 21, secenek: 'Fileli', adet: 3 }] }, { cerez, uyg: 'bayi' });
    assert.equal(r.durum, 201, r.metin); no = r.json.no;
    b = await chromium.launch();
  });
  after(async () => { await b?.close(); s?.kapat(); });
  const baglam = async (secenek = { viewport: { width: 1440, height: 900 } }) => {
    const ctx = await b.newContext(secenek); const [k, v] = cerez.split('=');
    await ctx.addCookies([{ name: k, value: v, url: s.url }]); return ctx;
  };

  test('adres tabanlı gezinme: menü, ürün penceresi, geri/ileri, kategori, yenileme', async () => {
    const ctx = await baglam(), p = await ctx.newPage(), H = hataTopla(p);
    await p.goto(s.url + '/'); await p.locator('#izgara .kart').first().waitFor();
    assert.equal(new URL(p.url()).pathname, '/katalog');
    await p.click('header .h-sag > [data-git=siparisler]');
    await p.waitForURL('**/siparisler'); assert.ok(await p.isVisible('#s-siparisler'));
    assert.match(await p.title(), /Siparişlerim/);
    await p.click('header .h-sag > [data-git=cari]'); await p.waitForURL('**/cari');
    await p.goBack(); await p.waitForURL('**/siparisler'); assert.ok(await p.isVisible('#s-siparisler')); assert.ok(!(await p.isVisible('#s-cari')));
    await p.goForward(); await p.waitForURL('**/cari'); assert.ok(await p.isVisible('#s-cari'));
    // ürün penceresi kendi adresinde; kapatınca (×) ve geri tuşuyla katalog adresine dönülür
    await p.click('header .h-sag > [data-git=katalog]'); await p.waitForURL('**/katalog');
    await p.click('#izgara .kart >> nth=0');
    await p.waitForURL(/\/urun\/\d+-[a-z0-9-]+$/); assert.equal(await p.locator('.perde').count(), 1);
    await p.click('.perde .kapat'); await p.waitForURL('**/katalog'); assert.equal(await p.locator('.perde').count(), 0);
    await p.click('#izgara .kart >> nth=1'); await p.waitForURL(/\/urun\//);
    await p.goBack(); await p.waitForURL('**/katalog'); assert.equal(await p.locator('.perde').count(), 0);
    await p.goForward(); await p.waitForURL(/\/urun\//); assert.equal(await p.locator('.perde').count(), 1);
    await p.goBack(); await p.waitForURL('**/katalog');
    // kategori
    await p.click('#katNav button[data-k="Sandalyeler"]'); await p.waitForURL('**/katalog/sandalyeler');
    assert.equal(await p.textContent('#baslik'), 'Sandalyeler');
    await p.reload(); await p.locator('#izgara .kart').first().waitFor();
    assert.equal(await p.textContent('#baslik'), 'Sandalyeler');
    // yenileme sayfayı korur
    await p.goto(s.url + '/belgeler'); await p.locator('#s-belgeler:not(.gizli)').waitFor();
    assert.deepEqual(H, []);
    await ctx.close();
  });

  test('derin bağlantılar: sipariş, ürün, sepet; giriş ekranından sonra istenen sayfa açılır', async () => {
    const ctx = await baglam(), p = await ctx.newPage(), H = hataTopla(p);
    await p.goto(s.url + '/siparisler/' + no);
    await p.locator('#s-siparisler .adres-vurgu').waitFor();
    assert.match(await p.locator('.adres-vurgu').textContent(), new RegExp(no));
    await p.goto(s.url + '/urun/21-neo'); await p.locator('.perde .pencere').waitFor();
    assert.match(await p.textContent('.perde'), /Neo/);
    await p.click('.perde .kapat'); await p.waitForURL('**/katalog'); // bağlantıyla açılan pencere de kataloğa döner
    await p.goto(s.url + '/sepet'); await p.locator('.perde').waitFor();
    await ctx.close();
    // oturumsuz: giriş ekranı, girişten sonra aynı adres
    const c2 = await b.newContext(), p2 = await c2.newPage();
    await p2.goto(s.url + '/cari'); await p2.locator('#gKul').waitFor();
    await p2.fill('#gKul', 'deniz'); await p2.fill('#gSif', 'Deniz-Sifre-1'); await p2.click('#fGiris button[type=submit]');
    await p2.locator('#s-cari:not(.gizli)').waitFor(); assert.equal(new URL(p2.url()).pathname, '/cari');
    assert.deepEqual(H, []);
    await c2.close();
  });

  test('bilgisayar (1280 ve 1440 px): üst çubuk tek satır, firma adı kesilmez, hesap menüsü çalışır', async () => {
    for (const w of [1280, 1440]) {
      const ctx = await baglam({ viewport: { width: w, height: 900 } }), p = await ctx.newPage();
      await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
      const o = await p.evaluate(() => {
        const h = document.querySelector('#uyg>header'), y = document.querySelector('.h-firma .y');
        const satir = [...h.querySelectorAll('.h-sag > *')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect().top);
        return { yukseklik: h.getBoundingClientRect().height, satir: Math.max(...satir) - Math.min(...satir), kesik: y.scrollWidth > y.clientWidth, tasma: document.documentElement.scrollWidth - innerWidth,
          ana: [...h.querySelectorAll('.h-sag > [data-git]')].filter(e => e.offsetParent).map(e => e.dataset.git) };
      });
      assert.ok(o.yukseklik < 90, w + ': başlık ' + o.yukseklik);
      assert.ok(o.satir < 8, w + ': başlık öğeleri tek satırda değil');
      assert.ok(!o.kesik, w + ': firma adı kesik');
      assert.equal(o.tasma, 0, w + ': yatay taşma');
      assert.deepEqual(o.ana, ['katalog', 'siparisler', 'cari', 'belgeler', 'teklifler'], w);
      await p.click('.h-firma'); await p.locator('#hMenu:not([hidden])').waitFor();
      await p.click('#hMenu [data-git=projeler]'); await p.waitForURL('**/projeler');
      assert.ok(await p.isHidden('#hMenu'));
      await p.keyboard.press('Escape');
      await ctx.close();
    }
  });

  test('telefon (375 px): yatay kaydırma yok, alt sekme çubuğu ve "Daha fazla" menüsü çalışır', async () => {
    const ctx = await baglam({ ...devices['iPhone SE'], viewport: { width: 375, height: 667 } }), p = await ctx.newPage(), H = hataTopla(p);
    for (const yol of ['/katalog', '/siparisler', '/cari', '/belgeler', '/odeme', '/ozel-teklif', '/projeler']) {
      await p.goto(s.url + yol); await p.waitForTimeout(300);
      const t = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.equal(t, 0, yol + ': ' + t + ' px yatay taşma');
    }
    assert.ok(await p.isVisible('.alt-sekme'));
    await p.click('.alt-sekme [data-git=siparisler]'); await p.waitForURL('**/siparisler');
    assert.match(await p.getAttribute('.alt-sekme [data-git=siparisler]', 'class'), /aktif/);
    await p.click('.alt-sekme .as-btn:last-child'); await p.locator('#hMenu:not([hidden])').waitFor(); await p.waitForTimeout(300); // açılış animasyonu
    const k = await p.locator('#hMenu').boundingBox(); assert.ok(k.y + k.height <= 667 + 1, 'menü ekrandan taşıyor');
    await p.click('#hMenu [data-git=belgeler]'); await p.waitForURL('**/belgeler');
    await p.click('.alt-sekme .as-btn:nth-child(3)'); await p.locator('.perde').waitFor(); // sepet
    assert.ok(await p.isHidden('.alt-sekme'), 'pencere açıkken alt çubuk gizlenir');
    assert.deepEqual(H, []);
    await ctx.close();
  });

  test('çevrimdışı: kurulu site bağlantı yokken de açılır (uygulama kabuğu önbellekten)', async () => {
    const ctx = await baglam(), p = await ctx.newPage();
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload(); await p.evaluate(() => navigator.serviceWorker.ready); // artık sayfa SW kontrolünde
    assert.ok(await p.evaluate(() => !!navigator.serviceWorker.controller));
    await ctx.setOffline(true);
    await p.goto(s.url + '/siparisler').catch(() => {});
    assert.ok(await p.locator('#giris, #uyg').first().count(), 'çevrimdışı sayfa açılmadı');
    assert.match(await p.title(), /EXIT Garden/);
    await ctx.close();
  });
});
