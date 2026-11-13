// Faz 3: satış masaüstü uygulaması (Electron). Uygulama gerçek bir test sunucusuna bağlanır.
//   • ilk açılışta sunucu adresi sorulur, sonra hatırlanır; sunucuya ulaşılamazsa bağlantı hatası sayfası
//   • sayfa Node'a erişemez, başka siteye gidemez (dış bağlantı tarayıcıya devredilir)
//   • bayi siparişi masaüstü bildirimi ve görev çubuğu sayacı olarak düşer; bildirime tıklayınca sipariş açılır
//   • ayrı pencere, Ctrl+K hızlı arama, Ctrl+1..9, dışa aktarılan dosyanın kaydı, PDF
//   • Faz 3b: bağlantı yokken son görülen listeler salt okunur; çıkışta silinir
// Uygulama kurulu değilse (satis-masaustu/node_modules yok) atlanır: cd satis-masaustu && npm install
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { spawn } = require('node:child_process');
const { _electron, chromium } = require('playwright');
const { sunucuBaslat, hataTopla, YONETICI_SIFRE } = require('./yardimci');

const UYG = path.join(__dirname, '..', 'satis-masaustu');
let ELECTRON = null; try { ELECTRON = require(path.join(UYG, 'node_modules', 'electron')); if (!fs.existsSync(ELECTRON)) ELECTRON = null; } catch (e) {}
const EKRAN_YOK = process.platform === 'linux' && !process.env.DISPLAY && !fs.existsSync('/usr/bin/Xvfb');
const ATLA = !ELECTRON ? 'Electron kurulu değil (satis-masaustu içinde npm install)' : EKRAN_YOK ? 'ekran yok (DISPLAY veya Xvfb gerekli)' : false;
const bekle = ms => new Promise(r => setTimeout(r, ms));
async function kosul(f, sure = 10000, ad = 'koşul') { const b = Date.now() + sure; let son; while (Date.now() < b) { son = await f(); if (son) return son; await bekle(150); } assert.fail(ad + ' sağlanmadı'); }

let xvfb = null, ekran = process.env.DISPLAY;
function ekranAc() {
  if (ekran || process.platform !== 'linux') return;
  ekran = ':' + (90 + Math.floor(Math.random() * 9)); xvfb = spawn('Xvfb', [ekran, '-screen', '0', '1600x1000x24', '-nolisten', 'tcp'], { stdio: 'ignore' });
}
function uygulamaAc(veri, ek = {}) {
  const env = { ...process.env, DISPLAY: ekran, EXIT_TEST: '1', EXIT_VERI_KLASORU: veri, EXIT_TEST_INDIR: path.join(veri, 'indirilen'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1', ...ek };
  delete env.NODE_OPTIONS; // Electron desteklemediği seçenekleri reddeder
  fs.mkdirSync(env.EXIT_TEST_INDIR, { recursive: true });
  return _electron.launch({ executablePath: ELECTRON, args: [UYG, '--no-sandbox'], env });
}
const kayit = (app, k) => app.evaluate((e, k) => { const t = global.__exitTest; return k === 'pencere' ? t.pencereSayisi() : JSON.parse(JSON.stringify(t[k])); }, k);

describe('Satış masaüstü uygulaması (Faz 3)', { skip: ATLA }, () => {
  let s, veri, app, w, H;
  before(async () => { ekranAc(); s = await sunucuBaslat(); veri = fs.mkdtempSync(path.join(os.tmpdir(), 'exit-masaustu-')); });
  after(async () => { await app?.close().catch(() => {}); s?.kapat(); xvfb?.kill(); fs.rmSync(veri, { recursive: true, force: true }); });

  test('ilk açılışta sunucu adresi sorulur; yanlış adres reddedilir, doğrusu kaydedilir', async () => {
    app = await uygulamaAc(veri); w = await app.firstWindow();
    await w.locator('#adres').waitFor();
    await w.fill('#adres', 'http://ornek.com'); await w.click('#baglan');
    await w.locator('#hata', { hasText: 'https://' }).waitFor();
    await w.fill('#adres', s.url); await w.click('#baglan');
    await w.waitForURL(s.url + '/satis'); await w.locator('#gKul').waitFor();
    assert.equal(JSON.parse(fs.readFileSync(path.join(veri, 'ayarlar.json'), 'utf8')).sunucu, s.url);
    await app.close();
  });

  test('adres hatırlanır; sayfa Node ve Electron\'a erişemez, yalnız dar arayüzü görür', async () => {
    app = await uygulamaAc(veri); w = await app.firstWindow(); H = hataTopla(w);
    await w.waitForURL(s.url + '/satis'); await w.locator('#gKul').waitFor();
    const r = await w.evaluate(() => ({ require: typeof require, process: typeof process, M: Object.keys(window.exitMasaustu || {}).sort() }));
    assert.equal(r.require, 'undefined'); assert.equal(r.process, 'undefined');
    assert.deepEqual(r.M, ['acildiginda', 'anlik', 'anlikOku', 'bildir', 'bilgi', 'kisayol', 'pdf', 'pencere', 'rozet', 'sunucuAdresi', 'sunucuKaydet', 'yenidenDene']);
    // son görülen verileri yalnız uygulamanın kendi sayfası okuyabilir
    assert.equal(await w.evaluate(() => window.exitMasaustu.anlikOku()), null);
    // satış sayfası sunucu adresini değiştiremez (yalnız uygulamanın kendi sayfaları)
    assert.equal(await w.evaluate(() => window.exitMasaustu.sunucuKaydet('https://kotu.ornek.com')).then(x => x.ok), false);
    await w.fill('#gKul', 'satis'); await w.fill('#gSif', YONETICI_SIFRE); await w.click('#fGiris button.btn.marka');
    await w.locator('aside button.m[data-s=siparisler]').waitFor();
  });

  test('durum çubuğu menünün altında; sürüm görünür', async () => {
    await w.locator('aside .durum-cubugu #sunucuDurum').waitFor();
    await w.locator('aside .durum-cubugu .ds-surum', { hasText: 'Masaüstü 1.0.0' }).waitFor();
  });

  let no;
  test('bayi siparişi bildirim ve görev çubuğu sayacı olarak düşer; bildirime tıklayınca açılır', async () => {
    assert.equal(await kayit(app, 'rozet'), 0);
    const cerez = await s.kayit('masabayi');
    const t0 = Date.now();
    const r = await s.api('/api/v1/siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 3 }] }, { cerez, uyg: 'bayi' });
    assert.equal(r.durum, 201); no = r.json.no;
    const b = await kosul(async () => (await kayit(app, 'bildirimler')).find(x => x.hedef === 'siparis:' + no), 8000, 'bildirim');
    const sure = Date.now() - t0; console.log('  sipariş → masaüstü bildirimi:', sure, 'ms');
    assert.ok(sure < 2000, 'kabul ölçütü: 2 sn içinde (' + sure + ' ms)');
    assert.equal(b.baslik, 'Yeni sipariş talebi'); assert.match(b.metin, new RegExp(no + ' · masabayi Ltd\\.'));
    assert.equal(await kosul(() => kayit(app, 'rozet'), 3000, 'sayaç'), 1);
    // aynı iş için ikinci bildirim çıkmaz
    await bekle(5500); assert.equal((await kayit(app, 'bildirimler')).filter(x => x.hedef === 'siparis:' + no).length, 1);
    // ödeme bildirimi de sayılır
    await s.api('/api/v1/odemeler', { tutar: 40 }, { cerez, uyg: 'bayi' });
    await kosul(async () => (await kayit(app, 'bildirimler')).some(x => x.baslik === 'Ödeme bildirimi'), 8000, 'ödeme bildirimi');
    assert.equal(await kosul(async () => (await kayit(app, 'rozet')) === 2, 3000, 'sayaç 2'), true);
    const i = (await kayit(app, 'bildirimler')).findIndex(x => x.hedef === 'siparis:' + no);
    await app.evaluate((e, i) => global.__exitTest.tikla(i), i);
    await w.locator('.perde .pencere h2', { hasText: no }).waitFor();
  });

  test('sipariş ayrı pencerede açılır', async () => {
    const yeni = app.waitForEvent('window');
    await w.click('.perde .ayri-pencere');
    const w2 = await yeni; await w2.waitForURL(u => String(u).includes('ac=siparis'));
    await w2.locator('.perde .pencere h2', { hasText: no }).waitFor();
    assert.equal(await w.locator('.perde').count(), 0, 'ana penceredeki sipariş kapanır');
    await w2.close();
  });

  test('Ctrl+K hızlı arama ve Ctrl+1..9 kısayolları', async () => {
    await w.bringToFront(); await w.click('#baslik');
    await w.keyboard.press('Control+K');
    await w.locator('#haGir').waitFor();
    await w.fill('#haGir', 'masabayi');
    await w.locator('.ha-sonuc', { hasText: no }).waitFor();
    await w.keyboard.press('Enter');
    await w.locator('.perde .pencere h2', { hasText: no }).waitFor();
    await w.evaluate(() => document.querySelectorAll('.perde').forEach(p => p.remove()));
    // menüden fareyle seçilince de çalışır (ana süreç → sayfa)
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find(x => x.label === 'Git').submenu.items[0].click());
    await w.locator('#haGir').waitFor(); await w.keyboard.press('Escape');
    await w.keyboard.press('Control+3');
    const ucuncu = await w.evaluate(() => [...document.querySelectorAll('aside button.m[data-s]')].filter(x => x.offsetParent !== null)[2].dataset.s);
    await kosul(() => w.evaluate(s => document.querySelector(`aside button.m[data-s=${s}]`).classList.contains('on'), ucuncu), 3000, 'Ctrl+3');
  });

  test('dışa aktarılan dosya kaydedilir; sayfa PDF olarak kaydedilir', async () => {
    await w.evaluate(() => git('siparisler')); await w.click('#csv');
    const dosya = path.join(veri, 'indirilen', 'exit_satislar.csv');
    await kosul(() => fs.existsSync(dosya) && fs.statSync(dosya).size > 0, 8000, 'CSV');
    assert.match(fs.readFileSync(dosya, 'utf8'), new RegExp(no));
    await kosul(async () => (await kayit(app, 'bildirimler')).some(x => x.baslik === 'Dosya kaydedildi'), 3000, 'kayıt bildirimi');
    const pdf = await w.evaluate(() => window.exitMasaustu.pdf());
    assert.ok(pdf && fs.readFileSync(pdf).subarray(0, 4).toString() === '%PDF');
  });

  test('son görülen veriler bilgisayarda saklanır, çıkışta silinir (Faz 3b)', async () => {
    const dosya = path.join(veri, 'son-gorulen.bin');
    await kosul(() => fs.existsSync(dosya), 8000, 'son görülen veriler dosyası');
    const b = fs.readFileSync(dosya); assert.match(b.subarray(0, 2).toString(), /^(E1|D1)$/);
    console.log('  son görülen veriler:', b.subarray(0, 2).toString() === 'E1' ? 'şifreli (safeStorage)' : 'şifresiz (bu sistemde anahtarlık yok)', b.length, 'bayt');
    if (b.subarray(0, 2).toString() === 'E1') assert.ok(!b.includes(Buffer.from(no)), 'şifreli dosyada sipariş no düz metin olmamalı');
    fs.copyFileSync(dosya, dosya + '.yedek');
    await w.click('#cikis');
    await kosul(() => !fs.existsSync(dosya), 5000, 'çıkışta silinme');
    await w.locator('#gKul').waitFor();
    fs.renameSync(dosya + '.yedek', dosya); // sonraki test için (bağlantı yokken görünüm)
  });

  test('başka siteye gidilmez, dış bağlantı varsayılan tarayıcıya devredilir', async () => {
    await w.evaluate(() => { location.href = 'https://example.com/x'; });
    await bekle(500);
    assert.ok(w.url().startsWith(s.url + '/satis'));
    await w.evaluate(() => window.open('https://example.org/y', '_blank'));
    await kosul(async () => (await kayit(app, 'disari')).includes('https://example.org/y'), 3000, 'dış bağlantı');
    assert.equal(await kayit(app, 'pencere'), 1, 'uygulama içinde yeni pencere açılmamalı');
    // (sona yakın: engellenen gezinmeden sonra Playwright sayfayı gezinmede sanabiliyor)
  });

  test('sayfa hatası yok', () => { assert.deepEqual(H.filter(h => !/example\.com|ERR_ABORTED/.test(h)), []); });

  test('sunucuya ulaşılamazsa bağlantı hatası sayfası açılır', async () => {
    const v2 = fs.mkdtempSync(path.join(os.tmpdir(), 'exit-masaustu-'));
    const a2 = await uygulamaAc(v2, { EXIT_SUNUCU_ADRESI: 'http://127.0.0.1:1' });
    try {
      const p = await a2.firstWindow();
      await p.locator('h1', { hasText: 'Sunucuya ulaşılamıyor' }).waitFor();
      assert.equal(await p.locator('#adres').textContent(), 'http://127.0.0.1:1');
    } finally { await a2.close(); fs.rmSync(v2, { recursive: true, force: true }); }
  });
  test('sunucu kapanınca: bağlantı hatası sayfasında son görülen veriler salt okunur (Faz 3b)', async () => {
    await app.close(); s.kapat();
    app = await uygulamaAc(veri); const p = await app.firstWindow(); const H2 = hataTopla(p);
    await p.locator('h1', { hasText: 'Sunucuya ulaşılamıyor' }).waitFor();
    await p.locator('#sonGorulen').waitFor();
    assert.match(await p.locator('#sgZaman').textContent(), /itibarıyla/);
    assert.match(await p.locator('.sg-etiket').textContent(), /Salt okunur/);
    // bekleyen işler: sipariş ve ödeme bildirimi
    assert.match(await p.locator('#sgGovde').textContent(), new RegExp(no));
    await p.click('[data-sekme=siparisler]'); await p.locator('#sgBas th', { hasText: 'Termin' }).waitFor();
    assert.match(await p.locator('#sgGovde tr', { hasText: no }).textContent(), /masabayi Ltd\..*Yeni talep/);
    await p.click('[data-sekme=bayiler]'); await p.locator('#sgBas th', { hasText: 'Telefon' }).waitFor();
    await p.fill('#sgAra', '05550000000');
    assert.equal(await p.locator('#sgGovde tr').count(), 1);
    assert.match(await p.locator('#sgGovde tr').textContent(), /masabayi Ltd\./);
    await p.screenshot({ path: path.join(os.tmpdir(), 'exit-cevrimdisi.png') });
    await p.fill('#sgAra', 'olmayan-firma'); await p.locator('#sgAlt', { hasText: 'Aramaya uyan kayıt yok' }).waitFor();
    assert.deepEqual(H2, []);
  });
});

describe('Satış paneli tarayıcıda: durum çubuğu ve hızlı arama (Faz 3)', () => {
  let s, b;
  before(async () => { s = await sunucuBaslat(); b = await chromium.launch(); });
  after(async () => { await b?.close(); s?.kapat(); });
  test('rozet menünün altındaki çubukta; Ctrl+K sipariş ve bayi bulur', async () => {
    const cerez = await s.kayit('aramabayi');
    const r = await s.api('/api/v1/siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 1 }] }, { cerez, uyg: 'bayi' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(), H = hataTopla(p);
    const [k, v] = s.yoneticiCerez.split('='); await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    await p.goto(s.url + '/satis'); await p.locator('aside button.m[data-s=siparisler]').waitFor();
    await p.locator('aside .durum-cubugu #sunucuDurum', { hasText: 'Sunucuya bağlı' }).waitFor();
    // çubuk menüdeki son düğmenin üstüne binmez (A3)
    // menü kendi içinde kayar; en alta inince Çıkış düğmesi çubuğun üstünde, tamamen görünür ve tıklanabilir (A3)
    await p.evaluate(() => { const a = document.getElementById('menu'); a.scrollTop = a.scrollHeight; });
    const [cubuk, cikis] = await Promise.all(['aside .durum-cubugu', '#cikis'].map(q => p.locator(q).boundingBox()));
    assert.ok(cikis.y + cikis.height <= cubuk.y + 1 && cubuk.y + cubuk.height <= 901, JSON.stringify({ cubuk, cikis }));
    assert.equal(await p.evaluate(() => { const r = document.getElementById('cikis').getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.id; }), 'cikis');
    assert.equal(await p.evaluate(() => typeof window.exitMasaustu), 'undefined');
    await p.evaluate(() => { birlestir(); });
    await p.keyboard.press('Control+K'); await p.fill('#haGir', 'aramabayi');
    await p.locator('.ha-sonuc', { hasText: r.json.no }).waitFor();
    await p.locator('.ha-sonuc', { hasText: 'aramabayi Ltd.' }).first().waitFor();
    await p.keyboard.press('Escape'); assert.equal(await p.locator('#haPerde').count(), 0);
    await p.goto(s.url + '/satis?ac=siparis:' + r.json.no);
    await p.locator('.perde .pencere h2', { hasText: r.json.no }).waitFor();
    assert.equal(await p.locator('.ayri-pencere').count(), 0, 'tarayıcıda ayrı pencere düğmesi yok');
    assert.deepEqual(H, []);
    await ctx.close();
  });
});

describe('Sunucu: masaüstü uygulamasının güncelleme dosyaları (Faz 3)', () => {
  let s, k;
  before(async () => {
    k = fs.mkdtempSync(path.join(os.tmpdir(), 'exit-guncelleme-'));
    fs.writeFileSync(path.join(k, 'latest.yml'), 'version: 1.0.1\nfiles:\n  - url: EXIT-Satis-Kurulum-1.0.1.exe\npath: EXIT-Satis-Kurulum-1.0.1.exe\n');
    fs.writeFileSync(path.join(k, 'EXIT-Satis-Kurulum-1.0.1.exe'), Buffer.from('MZ' + '0123456789'.repeat(100)));
    fs.writeFileSync(path.join(k, 'gizli.json'), '{}');
    s = await sunucuBaslat({ ortam: { MASAUSTU_KLASORU: k } });
  });
  after(() => { s?.kapat(); fs.rmSync(k, { recursive: true, force: true }); });
  const al = (yol, b = {}) => fetch(s.url + yol, { headers: b, redirect: 'manual' });

  test('latest.yml önbelleğe alınmadan, kurulum dosyası parça parça (Range) indirilebilir', async () => {
    const y = await al('/masaustu/guncelleme/latest.yml');
    assert.equal(y.status, 200); assert.equal(y.headers.get('cache-control'), 'no-cache'); assert.match(await y.text(), /version: 1\.0\.1/);
    const t = await al('/masaustu/guncelleme/EXIT-Satis-Kurulum-1.0.1.exe');
    assert.equal(t.status, 200); assert.equal(+t.headers.get('content-length'), 1002); assert.equal(t.headers.get('accept-ranges'), 'bytes');
    assert.match(t.headers.get('content-disposition'), /attachment/);
    const p = await al('/masaustu/guncelleme/EXIT-Satis-Kurulum-1.0.1.exe', { Range: 'bytes=2-11' });
    assert.equal(p.status, 206); assert.equal(p.headers.get('content-range'), 'bytes 2-11/1002'); assert.equal(await p.text(), '0123456789');
    assert.equal((await al('/masaustu/guncelleme/EXIT-Satis-Kurulum-1.0.1.exe', { Range: 'bytes=5000-' })).status, 416);
  });

  test('/masaustu/indir son sürüme yönlendirir; yalnız güncelleme dosyaları verilir', async () => {
    const r = await al('/masaustu/indir');
    assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/masaustu/guncelleme/EXIT-Satis-Kurulum-1.0.1.exe');
    for (const y of ['gizli.json', '..%2Fsunucu%2Fsunucu.js', '../latest.yml', 'yok.exe']) assert.equal((await al('/masaustu/guncelleme/' + y)).status, 404, y);
  });

  test('satış panelinde (tarayıcı) indirme bağlantısı görünür', async () => {
    const b = await chromium.launch();
    try {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage();
      const [ad, v] = s.yoneticiCerez.split('='); await ctx.addCookies([{ name: ad, value: v, url: s.url }]);
      await p.goto(s.url + '/satis');
      assert.equal(await p.locator('aside .durum-cubugu .ds-indir').getAttribute('href'), '/masaustu/indir');
    } finally { await b.close(); }
  });
});
