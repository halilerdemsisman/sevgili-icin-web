// Faz 2b-2 / 3b-2: ekranlar tek fonksiyonda. Eskiden "ek" parçaları ekran fonksiyonlarını (git, katalog,
// urunAc…) üst üste sarıyordu; artık her ekran fonksiyonu tek yerde tanımlı ve eklerini (EK.<ad>) kendi
// içinde, yazılı sırayla çağırıyor. Bu dosya her ekin ekranda gerçekten çalıştığını ve hiçbir ekran
// fonksiyonunun artık sarılmadığını sınar.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla, KOK, PAKET } = require('./yardimci');

// kaynakta tanımlanan ekler: { ad: dosya }
function ekTanimlari(klasorler) {
  const T = {};
  for (const k of klasorler) for (const f of fs.readdirSync(path.join(KOK, 'kaynak', k)).filter(f => f.endsWith('.js'))) {
    for (const m of fs.readFileSync(path.join(KOK, 'kaynak', k, f), 'utf8').matchAll(/\bEK\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) T[m[1]] = k + '/' + f;
  }
  return T;
}
const BAYI_EK = ekTanimlari(['bayi/parcalar']), WEB_EK = ekTanimlari(['web']);

test('sarmalama kalmadı; her çağrılan ekin tanımı var (araclar/sarmalama.mjs --denetle)', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(KOK, 'araclar', 'sarmalama.mjs'), '--denetle', 'bayi'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

describe('Bayi web sitesi: ekler', () => {
  let s, b, cerez;
  before(async () => {
    s = await sunucuBaslat();
    cerez = await s.kayit('ekbayi', 'Ek-Bayi-2026');
    // kredi limiti kartı (EK.cariLimit) limit tanımlı bayide görünür
    const c = await s.api('/api/veri', { degisen: [['exb-cari', JSON.stringify({ ekbayi: { vade: 60, limit: 5000, hareket: [] } })]] });
    assert.equal(c.durum, 200, c.metin);
    const r = await s.api('/api/v1/siparisler', { adres: 'İzmir', kalemler: [{ id: 21, secenek: 'Fileli', adet: 3 }] }, { cerez, uyg: 'bayi' });
    assert.equal(r.durum, 201, r.metin);
    b = await chromium.launch();
  });
  after(async () => { await b?.close(); s?.kapat(); });

  test('katalog, ürün penceresi, siparişler, cari ve ek sayfalar eklerini gösterir', async () => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const [k, v] = cerez.split('=');
    await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    const p = await ctx.newPage(), H = hataTopla(p);
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
    // bütün parçalar eklerini tanımladı (erken çıkan parça yok)
    const tanimli = await p.evaluate(() => Object.keys(EK));
    for (const ad of Object.keys({ ...BAYI_EK, ...WEB_EK })) assert.ok(tanimli.includes(ad), `EK.${ad} tanımlı değil`);

    // katalog: favoriler (EK.katalogFavori + EK.favoriUygun), duyuru/numune (EK.katalogDuyuru), karşılaştırma (EK.katalogKarsilastirma)
    assert.ok(await p.isVisible('#katNav [data-fav-nav]'));
    assert.ok(await p.isVisible('#numuneBtn'));
    assert.ok(await p.locator('#izgara .kart .kr-sec').count() > 1);
    const n = await p.locator('#izgara .kart').count();
    await p.locator('#izgara .kart[data-id="21"] .fav-btn').click();
    await p.click('#katNav [data-fav-nav]');
    await p.locator('#baslik', { hasText: 'Favorilerim' }).waitFor();
    assert.equal(await p.locator('#izgara .kart').count(), 1, `favori süzgeci: ${n} üründen 1`);
    await p.click('#katNav [data-fav-nav]'); await p.locator('#baslik', { hasText: 'Tüm ürünler' }).waitFor();
    assert.equal(await p.locator('#izgara .kart').count(), n);
    // karşılaştırma çubuğu (EK.karsilastirmaCubugu: sayfa geçişinde de kalır)
    await p.locator('#izgara .kart[data-id="21"] .kr-sec').click();
    await p.locator('#krBar').waitFor();
    await p.click('header .h-sag > [data-git=siparisler]'); await p.waitForURL('**/siparisler');
    assert.ok(await p.isVisible('#krBar'));
    await p.click('header .h-sag > [data-git=katalog]'); await p.waitForURL('**/katalog');

    // ürün penceresi: favori + karşılaştır düğmesi, renk önizleme, numune, özel teklif, kendi adresi
    await p.click('#izgara .kart[data-id="21"]'); await p.waitForURL(/\/urun\/21-/);
    for (const sec of ['.p-bilgi h2 .p-fav.on', '.p-bilgi h2 .kr-pbtn', '.r-onizle', '[data-numune-urun]', '.of-iste']) assert.equal(await p.locator('.perde ' + sec).count(), 1, sec);
    assert.match(await p.textContent('.perde .kr-pbtn'), /Karşılaştırmada ✓/);
    // seçim değişince pencere yeniden çizilir; ekler kendini yeniler (tekrar etmeden)
    await p.locator('.perde .renk[data-a=iskelet]').first().click();
    for (const sec of ['.p-fav', '.kr-pbtn', '.r-onizle', '[data-numune-urun]', '.of-iste']) assert.equal(await p.locator('.perde ' + sec).count(), 1, 'yeniden çizimde ' + sec);
    await p.click('.perde .kapat'); await p.waitForURL('**/katalog');

    // siparişler: tekrar sipariş (EK.siparislerTekrar), numune talepleri (EK.siparislerNumune), düzenle/iptal (EK.siparislerTalep)
    await p.click('header .h-sag > [data-git=siparisler]'); await p.waitForURL('**/siparisler');
    for (const sec of ['.sk-tekrar', '#nmYeni', '.sd-btns [data-sdd]', '.sd-btns [data-sdi]']) assert.equal(await p.locator('#s-siparisler ' + sec).count(), 1, sec);
    // cari: ödeme bildir + online öde, adresler, kredi limiti
    await p.click('header .h-sag > [data-git=cari]'); await p.waitForURL('**/cari');
    for (const sec of ['#obAc', '#olAc', '#adKisa', '#lmKart']) assert.equal(await p.locator('#s-cari ' + sec).count(), 1, sec);
    assert.match(await p.textContent('#lmKart'), /Kredi limitiniz: 5\.000,00 \$/);
    // ek sayfalar: menüde ve adres çubuğunda
    for (const [s_, yol] of [['projeler', '/projeler'], ['belgeler', '/belgeler'], ['odeme', '/odeme'], ['teklifler', '/ozel-teklif']]) {
      await p.evaluate(x => git(x), s_); await p.waitForURL('**' + yol);
      const gorunen = await p.$$eval('section[id^="s-"]', L => L.filter(x => !x.classList.contains('gizli')).map(x => x.id));
      assert.deepEqual(gorunen, ['s-' + s_], s_);
      assert.ok(await p.locator('#s-' + s_).evaluate(x => x.innerHTML.length > 50), s_ + ' çizildi');
    }
    await p.evaluate(() => git('cari')); await p.click('#olAc'); await p.waitForURL('**/odeme');
    assert.deepEqual(H, []);
    await ctx.close();
  });

  test('sipariş gönderilince Siparişlerim kendi adresinde açılır, kayıt durumu korunur; sunucuya bağlıyken dosya inmez', async () => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const [k, v] = cerez.split('=');
    await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    const p = await ctx.newPage(), H = hataTopla(p); let indirme = 0; p.on('download', () => indirme++);
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
    await p.click('#izgara .kart[data-id="21"]');
    for (const a of ['iskelet', 'file']) await p.locator(`.perde .renk[data-a=${a}]`).first().click();
    await p.click('#pEkle'); await p.click('#hSepet'); await p.click('#sGonder');
    await p.locator('.toast', { hasText: 'Sipariş talebiniz alındı' }).waitFor();
    // REST yanıtının HTTP kodu kaydın kendi "durum" alanını ezmez (2b-1 hatası: sayfa yarıda kalıyordu, adres /katalog'da)
    await p.waitForURL('**/siparisler');
    assert.equal(await p.locator('#s-siparisler .sk').count(), 2);
    assert.deepEqual(await p.evaluate(() => oku('exb-siparisler', []).map(o => o.durum)), ['yeni', 'yeni']);
    await p.waitForTimeout(500);
    assert.equal(indirme, 0);
    assert.deepEqual(H, []);
    await ctx.close();
  });
});

describe('Bayi tek dosyalık sürüm: ekler', () => {
  let b;
  before(async () => { b = await chromium.launch(); });
  after(async () => { await b?.close(); });

  test('web dışı bütün ekler tanımlı; sipariş dosyası iner; ek sayfalar açılır', async () => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }), p = await ctx.newPage(), H = hataTopla(p);
    await p.goto(pathToFileURL(path.join(PAKET, 'exit_bayi_siparis.html')).href);
    await p.click('[data-s=kayit]');
    for (const [k, v] of Object.entries({ kFirma: 'Yerel Ltd.', kAd: 'Yerel', kTel: '05551112233', kMail: 'y@ornek.com', kSehir: 'Bursa', kKul: 'yerel', kSif: 'Sifre123' })) await p.fill('#' + k, v);
    await p.check('#kKvkk'); await p.click('#fKayit button[type=submit]');
    await p.locator('#izgara .kart').first().waitFor();
    const tanimli = await p.evaluate(() => Object.keys(EK));
    for (const ad of Object.keys(BAYI_EK)) assert.ok(tanimli.includes(ad), `EK.${ad} tanımlı değil`);
    for (const ad of Object.keys(WEB_EK)) assert.ok(!tanimli.includes(ad), `EK.${ad} tek dosyada olmamalı`);
    assert.ok(await p.isVisible('#katNav [data-fav-nav]'));
    await p.click('#izgara .kart[data-id="21"]');
    for (const sec of ['.p-fav', '.kr-pbtn', '.r-onizle']) assert.equal(await p.locator('.perde ' + sec).count(), 1, sec);
    for (const a of ['iskelet', 'file']) await p.locator(`.perde .renk[data-a=${a}]`).first().click();
    await p.click('#pEkle'); await p.click('#hSepet');
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('#sGonder')]);
    assert.match(d.suggestedFilename(), /^EXG-\d{4}-0001\.json$/);
    const o = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
    assert.equal(o.tur, 'exit-bayi-siparis'); assert.equal(o.musteri.kul, 'yerel');
    for (const s_ of ['projeler', 'belgeler', 'odeme', 'teklifler', 'cari']) {
      await p.evaluate(x => git(x), s_);
      assert.ok(await p.isVisible('#s-' + s_), s_);
    }
    assert.equal(await p.locator('#s-cari #obAc').count(), 1);
    assert.deepEqual(H, []);
    await ctx.close();
  });
});
