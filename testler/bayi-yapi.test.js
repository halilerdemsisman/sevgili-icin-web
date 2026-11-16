// Faz 2b-2 (adım 2b): bayi portalı ekran ve özellik dosyalarına bölündü.
//   • Şablondaki her dosya var; sürüm adlı parçalar kalmadı; web sitesinde çekirdek ve özellikler birer pakette.
//   • İlk çizimde ekler hazır: oturum bütün özellik dosyaları yüklendikten sonra açılır (web ve tek dosya).
//   • Bir özellik açılışta hata verirse paketteki diğer özellikler çalışmaya devam eder.
//   • Bölme sırasında bulunan iki hata: kayıttan sonra karşılama mesajı, bildirimde duyuruya tıklayınca duyurular.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla, PAKET } = require('./yardimci');

const KOK = path.join(__dirname, '..');
// ilk #izgara .kart eklendiği anda kartta favori kalbi ve karşılaştırma seçimi var mı (sonradan yeniden çizimle değil)
const ILK_CIZIM = () => new MutationObserver((L, o) => { const k = document.querySelector('#izgara .kart'); if (!k) return; o.disconnect();
  window.__ilk = { fav: !!k.querySelector('.fav-btn'), kars: !!k.querySelector('.kr-sec'), favNav: !!document.querySelector('#katNav [data-fav-nav]') }; })
  .observe(document, { childList: true, subtree: true });

describe('Bayi portalı: dosya yapısı', () => {
  test('şablondaki her dosya var; sürüm adlı parça yok; web sitesinde paketler', () => {
    const sablon = fs.readFileSync(path.join(KOK, 'kaynak', 'bayi', 'sablon.html'), 'utf8');
    const yollar = [...sablon.matchAll(/\{\{(?:dahil|web) ([^}]+)\}\}/g)].map(m => m[1]);
    for (const y of yollar) assert.ok(fs.existsSync(path.join(KOK, 'kaynak', y)), y);
    assert.ok(!fs.existsSync(path.join(KOK, 'kaynak', 'bayi', 'parcalar')), 'parcalar/ klasörü kalmamalı');
    assert.ok(!yollar.some(y => /v\d\.\d|ek\d/.test(path.basename(y)) && y.startsWith('bayi/')), 'bayi dosya adlarında sürüm yok');
    const html = fs.readFileSync(path.join(PAKET, 'web', 'index.html'), 'utf8');
    for (const p of ['/js/cekirdek.', '/js/ozellikler.', '/css/stil.', '/js/web.']) assert.ok(html.includes(p), p);
    assert.ok((html.match(/<script src=/g) || []).length <= 12, 'web sitesinde en fazla 12 betik dosyası');
    const tek = fs.readFileSync(path.join(PAKET, 'exit_bayi_siparis.html'), 'utf8');
    assert.ok(!/\{\{(dahil|web|paket) /.test(tek) && !/\{\{(dahil|web|paket) /.test(html), 'doldurulmamış işaret kalmamalı');
    assert.ok(!tek.includes('/* ---- web/'), 'web dosyaları tek dosyaya girmez');
  });
});

describe('Bayi web sitesi: ilk açılış ve özellikler', () => {
  let s, b, cerez;
  before(async () => {
    s = await sunucuBaslat();
    cerez = await s.kayit('yapibayi');
    b = await chromium.launch();
  });
  after(async () => { await b?.close(); s?.kapat(); });
  const baglam = async () => { const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const [k, v] = cerez.split('='); await ctx.addCookies([{ name: k, value: v, url: s.url }]); return ctx; };

  test('ilk çizimde ekler hazır (favori kalbi, karşılaştırma, Favorilerim)', async () => {
    const ctx = await baglam(); await ctx.addInitScript(ILK_CIZIM);
    const p = await ctx.newPage(), H = hataTopla(p);
    await p.goto(s.url + '/katalog'); await p.waitForFunction(() => window.__ilk);
    assert.deepEqual(await p.evaluate(() => window.__ilk), { fav: true, kars: true, favNav: true });
    assert.deepEqual(H, []);
    await ctx.close();
  });

  test('bir özellik açılışta hata verirse diğer özellikler çalışır', async () => {
    const ctx = await baglam();
    // renk önizleme motoru yüklenemezse bayi renk önizleme dosyası açılışta hata verir
    await ctx.addInitScript(() => Object.defineProperty(window, 'RENK_ONIZLEME', { get: () => undefined, set: () => {}, configurable: true }));
    const p = await ctx.newPage(), H = [];
    p.on('console', m => m.type() === 'error' && H.push(m.text()));
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
    assert.ok(H.some(h => h.includes('bayi/ozellikler/renk-onizleme.js')), 'hata dosya adıyla raporlanır: ' + H.join(' | '));
    // aynı pakette sonra gelen özellikler çalışıyor: özel teklif sayfası, sunucu oturumu (çıkış), web paketi (adres)
    assert.ok(await p.locator('#s-teklifler').count(), 'özel teklif sayfası');
    await p.goto(s.url + '/ozel-teklif'); await p.locator('#s-teklifler:not(.gizli)').waitFor();
    await ctx.close();
  });

  test('kayıttan sonra karşılama mesajı çıkar', async () => {
    const ctx = await b.newContext(), p = await ctx.newPage(), T = [];
    await p.exposeFunction('__t', x => T.push(x));
    await p.addInitScript(() => new MutationObserver(L => L.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('toast') && window.__t(n.textContent)))).observe(document, { childList: true, subtree: true }));
    await p.goto(s.url + '/'); await p.click('[data-s=kayit]');
    for (const [k, v] of Object.entries({ kKul: 'karsilanan', kSif: 'Sifre-1234', kFirma: 'Karşılanan Ltd.', kAd: 'Ayşe', kTel: '0555', kMail: 'k@ornek.com', kSehir: 'İzmir' })) await p.fill('#' + k, v);
    await p.check('#kKvkk'); await p.click('#fKayit button[type=submit]');
    await p.locator('#izgara .kart').first().waitFor();
    await p.waitForFunction(() => document.querySelector('.toast'));
    assert.ok(T.includes('Kaydınız oluşturuldu, hoş geldiniz.'), T.join(' | '));
    await ctx.close();
  });

  test('bildirim panelinde yeni duyuruya tıklayınca duyurular açılır', async () => {
    const ctx = await baglam(), p = await ctx.newPage(), H = hataTopla(p);
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
    await p.waitForTimeout(2000); // bildirimlerin ilk taraması (yeni sayılmasın)
    await s.api('/api/veri', { degisen: [['exb-duyuru', JSON.stringify([{ id: 'yd1', baslik: 'Yeni sezon', metin: 'Yeni koleksiyon', tarih: '2026-11-16' }])]] });
    await p.locator('#hBildirim .bl-say').waitFor({ state: 'attached', timeout: 20000 });
    await p.evaluate(() => document.querySelector('#hBildirim').click());
    await p.locator('#bnPanel .bn', { hasText: 'Yeni duyuru' }).first().click();
    await p.locator('.perde', { hasText: 'Yeni sezon' }).waitFor();
    assert.deepEqual(H, []);
    await ctx.close();
  });
});

describe('Bayi tek dosyalık sürüm: ilk açılış', () => {
  test('kayıtlı oturum yeniden açılınca ilk çizimde ekler hazır', async () => {
    const b = await chromium.launch();
    try {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage(), H = hataTopla(p);
      await p.goto(pathToFileURL(path.join(PAKET, 'exit_bayi_siparis.html')).href);
      await p.click('[data-s=kayit]');
      for (const [k, v] of Object.entries({ kFirma: 'Yerel Ltd.', kAd: 'Yerel', kTel: '05551112233', kMail: 'y@ornek.com', kSehir: 'Bursa', kKul: 'yerelilk', kSif: 'Sifre123' })) await p.fill('#' + k, v);
      await p.check('#kKvkk'); await p.click('#fKayit button[type=submit]');
      await p.locator('#izgara .kart').first().waitFor();
      await ctx.addInitScript(ILK_CIZIM);
      await p.reload(); await p.waitForFunction(() => window.__ilk);
      assert.deepEqual(await p.evaluate(() => window.__ilk), { fav: true, kars: true, favNav: true });
      assert.deepEqual(H, []);
    } finally { await b.close(); }
  });
});
