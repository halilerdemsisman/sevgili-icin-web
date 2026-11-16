// Faz 2c: bayi web sitesinin yayın denetimi.
//   • Erişilebilirlik: axe-core ile WCAG 2.1 A/AA; giriş, kayıt, sayfalar, pencereler, telefon ve koyu tema.
//   • Etiketler alana bağlı (etikete tıklayınca alan seçilir; ekran okuyucu alanın adını söyler).
//   • Telefonda karşılaştırma çubuğu alt sekme çubuğunu örtmez.
//   • Hız (Lighthouse bulguları): tek stil dosyası başta, gövde betikleri defer, JSON sıkıştırılır,
//     girişli bayi açılışta giriş formunu görmez.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla, PAKET } = require('./yardimci');

const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ETIKET = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
async function denetle(p) {
  // animasyonlar kapalı (yarı saydam ara karelerde yanlış kontrast ölçülmesin)
  await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: AXE });
  const V = await p.evaluate(async e => (await axe.run(document, { runOnly: { type: 'tag', values: e } })).violations
    .map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 4).map(n => n.target.join(' ')).join(' | ')}`), ETIKET);
  return V;
}

describe('Bayi web sitesi: erişilebilirlik (WCAG 2.1 AA)', () => {
  let s, b, cerez;
  before(async () => {
    s = await sunucuBaslat();
    cerez = await s.kayit('erisbayi');
    const bayi = (y, g, m) => s.api('/api/v1/' + y, g, { cerez, uyg: 'bayi', yontem: m });
    await bayi('siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 3 }], adres: 'İzmir' }, 'POST');
    const z = Date.now(), cari = JSON.stringify({ erisbayi: { vade: 60, limit: 5000, hareket: [{ tip: 'fatura', tutar: 1200, tarih: z, vade: z + 30 * 864e5, no: 'F1' }] } });
    await s.api('/api/veri', { degisen: [['exs-cari', cari], ['exb-cari', cari], ['exb-duyuru', JSON.stringify([{ id: 'd1', baslik: 'Yeni koleksiyon', metin: 'Duyuru', tur: 'urun' }])]] });
    b = await chromium.launch();
  });
  after(async () => { await b?.close(); s?.kapat(); });
  const baglam = async (o = {}) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, ...o });
    const [k, v] = cerez.split('='); await ctx.addCookies([{ name: k, value: v, url: s.url }]); return ctx;
  };

  test('giriş ve kayıt formu', async () => {
    const ctx = await b.newContext(), p = await ctx.newPage();
    await p.goto(s.url + '/'); await p.locator('#fGiris').waitFor();
    assert.deepEqual(await denetle(p), [], 'giriş');
    await p.click('[data-s=kayit]');
    assert.deepEqual(await denetle(p), [], 'kayıt');
    // etiket alana bağlı: etikete tıklayınca alan seçilir
    await p.locator('#fKayit label', { hasText: 'Firma adı' }).click();
    assert.equal(await p.evaluate(() => document.activeElement.id), 'kFirma');
    await ctx.close();
  });

  test('sayfalar ve pencereler (masaüstü)', async () => {
    const ctx = await baglam(), p = await ctx.newPage(), H = hataTopla(p), K = {};
    const git = y => p.goto(s.url + y).then(() => p.locator('#uyg:not(.gizli)').waitFor());
    await git('/katalog'); await p.locator('#izgara .kart').first().waitFor(); K.katalog = await denetle(p);
    await git('/urun/21-neo'); await p.locator('.perde #pAdet').waitFor(); K.urun = await denetle(p);
    await p.locator('.perde .renk[data-a=iskelet]').first().click(); await p.locator('.perde .renk[data-a=file]').first().click();
    await p.click('#pEkle'); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('#hSepet').click());
    await p.locator('.perde').first().waitFor(); K.sepet = await denetle(p);
    for (const y of ['siparisler', 'cari', 'belgeler', 'odeme', 'ozel-teklif', 'projeler']) { await git('/' + y); await p.waitForTimeout(300); K[y] = await denetle(p); }
    await git('/cari'); await p.click('#obAc'); await p.locator('.perde #obYon').waitFor(); K['ödeme bildirimi'] = await denetle(p);
    // ödeme bildirimi formunda etiket alana bağlı
    assert.equal(await p.locator('.perde label', { hasText: 'Ödeme yöntemi' }).getAttribute('for'), 'obYon');
    await git('/katalog'); await p.evaluate(() => document.querySelector('#hHat').click()); await p.waitForTimeout(300); K['hatırlatmalar'] = await denetle(p);
    for (const [ad, V] of Object.entries(K)) assert.deepEqual(V, [], ad);
    assert.deepEqual(H, []);
    await ctx.close();
  });

  test('telefon ve koyu tema', async () => {
    const ctx = await baglam({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage(), K = {};
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor(); K['telefon katalog'] = await denetle(p);
    await p.goto(s.url + '/urun/21-neo'); await p.locator('.perde #pAdet').waitFor(); K['telefon ürün'] = await denetle(p);
    await p.evaluate(() => localStorage.setItem('exit-tema', 'koyu'));
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor(); K['koyu katalog'] = await denetle(p);
    await p.goto(s.url + '/cari'); await p.waitForTimeout(500); K['koyu cari'] = await denetle(p);
    for (const [ad, V] of Object.entries(K)) assert.deepEqual(V, [], ad);
    await ctx.close();
  });

  test('telefonda karşılaştırma çubuğu alt sekme çubuğunu örtmez', async () => {
    const ctx = await baglam({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
    for (const i of [0, 1]) await p.locator('#izgara .kart .kr-sec').nth(i).click();
    await p.locator('#krBar').waitFor();
    const [kb, as] = await p.evaluate(() => ['#krBar', '.alt-sekme'].map(k => document.querySelector(k).getBoundingClientRect().toJSON()));
    assert.ok(kb.bottom <= as.top, `çubuk ${kb.bottom} · alt sekme ${as.top}`);
    await p.locator('.alt-sekme .as-btn', { hasText: 'Daha fazla' }).click({ timeout: 3000 }); // örtülse tıklanamazdı
    await ctx.close();
  });
});

describe('Bayi web sitesi: hız (Lighthouse bulguları)', () => {
  let s, b, cerez;
  before(async () => { s = await sunucuBaslat(); cerez = await s.kayit('hizbayi'); b = await chromium.launch(); });
  after(async () => { await b?.close(); s?.kapat(); });

  test('tek stil dosyası başta; gövde betikleri defer; küçük baş betikleri sayfada', () => {
    const html = fs.readFileSync(path.join(PAKET, 'web', 'index.html'), 'utf8');
    const [bas, govde] = html.split('</head>');
    assert.equal((bas.match(/<link rel="stylesheet"/g) || []).length, 1, 'başta tek stil dosyası');
    assert.ok(!/<link rel="stylesheet"|<style>/.test(govde), 'gövdede stil yok');
    const g = govde.match(/<script[^>]*>/g) || [];
    assert.ok(g.length >= 3 && g.every(x => /^<script defer src=/.test(x)), 'gövde betikleri defer: ' + g.join(' '));
    assert.ok(bas.includes("classList.add('oturum-aciliyor')") && bas.includes("'data-tema'"), 'küçük betikler sayfanın içinde');
    assert.equal(fs.readdirSync(path.join(PAKET, 'web', 'css')).length, 1);
  });

  test('JSON yanıtları sıkıştırılır', async () => {
    const r = await fetch(s.url + '/api/v1/katalog', { headers: { Cookie: cerez, 'X-Exit-Uyg': 'bayi', 'Accept-Encoding': 'gzip' } });
    assert.equal(r.headers.get('content-encoding'), 'gzip');
    const j = await r.json(); assert.ok(j.urunler.length > 10);
    // küçük yanıt sıkıştırılmaz
    const k = await fetch(s.url + '/api/v1/hedef', { headers: { Cookie: cerez, 'X-Exit-Uyg': 'bayi', 'Accept-Encoding': 'gzip' } });
    assert.equal(k.headers.get('content-encoding'), null);
  });

  test('girişli bayi açılışta giriş formunu görmez; girişsiz ziyaretçi görür', async () => {
    const IZLE = () => { window.__giris = []; const bak = () => { const g = document.getElementById('giris'); if (g && document.body) window.__giris.push(g.checkVisibility({ visibilityProperty: true }) && !g.classList.contains('gizli')); if (!document.querySelector('#izgara .kart') || window.__giris.length < 5) requestAnimationFrame(bak); }; requestAnimationFrame(bak); };
    const ctx = await b.newContext(); const [k, v] = cerez.split('='); await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    // kayıtlı oturum: bayi bu tarayıcıda daha önce girmiş (3b-2 adım 4: veri eşzamansız gelir; oturum ipucu girişte yazılır)
    { const p0 = await ctx.newPage(); await p0.goto(s.url + '/katalog'); await p0.locator('#izgara .kart').first().waitFor(); await p0.close(); }
    await ctx.addInitScript(IZLE);
    const p = await ctx.newPage(), H = hataTopla(p);
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
    const L = await p.evaluate(() => window.__giris);
    assert.ok(L.length > 0 && !L.includes(true), 'giriş formu hiç görünmemeli: ' + L.join());
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('oturum-aciliyor')), false);
    // çıkışta giriş formu görünür
    await p.evaluate(() => document.querySelector('#hCikis').click());
    await p.locator('#giris:not(.gizli)').waitFor();
    assert.ok(await p.locator('#fGiris').isVisible());
    assert.deepEqual(H, []);
    await ctx.close();
    const c2 = await b.newContext(), p2 = await c2.newPage();
    await p2.goto(s.url + '/'); assert.ok(await p2.locator('#fGiris').isVisible());
    await c2.close();
  });
});
