// Faz 1b · Şifre sıfırlama, tarayıcıda uçtan uca:
// yönetici satış panelinden geçici şifre üretir → bayi geçici şifreyle girer → kapatılamaz pencerede
// yeni şifresini belirler → kataloğa geçer. Ayrıca fiyatı düzeltilen siparişte satış uyarıyı görür.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla, YONETICI_SIFRE } = require('./yardimci');

describe('Şifre sıfırlama ve fiyat uyarısı (tarayıcı)', () => {
  let s, tarayici, satis, bayi, hatalar = [];
  before(async () => {
    s = await sunucuBaslat(); tarayici = await chromium.launch();
    satis = await (await tarayici.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); hatalar.push(hataTopla(satis));
    bayi = await (await tarayici.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); hatalar.push(hataTopla(bayi));
    await s.kayit('ayse');
  });
  after(async () => { await tarayici?.close(); s?.kapat(); });

  test('yönetici geçici şifre üretir, bayi ilk girişte yeni şifresini belirler', async () => {
    await satis.goto(s.url + '/satis');
    await satis.fill('#gKul', 'satis'); await satis.fill('#gSif', YONETICI_SIFRE); await satis.click('#fGiris button.btn.marka');
    await satis.waitForFunction(() => window.EXIT_OTURUM && window.EXIT_OTURUM.kul === 'satis');
    await satis.evaluate(() => window.git('kullanicilar6'));
    await satis.selectOption('#ssKim', 'bayi|ayse');
    await satis.click('#ssBtn');
    const gecici = (await satis.locator('#ssGecici').innerText()).trim();
    assert.match(gecici, /^[A-Za-z0-9]{10}$/);

    await bayi.goto(s.url + '/');
    await bayi.fill('#gKul', 'ayse'); await bayi.fill('#gSif', gecici); await bayi.click('#fGiris button[type=submit], #fGiris button.marka');
    await bayi.locator('#exSifPerde').waitFor();
    assert.equal(await bayi.locator('#uyg').isVisible(), false, 'şifre değişmeden uygulama açılmaz');
    await bayi.fill('#exSifEski', gecici); await bayi.fill('#exSifYeni', 'AyseYeni2026'); await bayi.fill('#exSifYeni2', 'AyseYeni2026');
    await bayi.click('#exSifPerde button[type=submit]');
    await bayi.waitForFunction(() => window.EXIT_OTURUM && window.EXIT_OTURUM.kul === 'ayse' && !window.EXIT_OTURUM.sifreDegistir);
    await bayi.locator('#izgara .kart').first().waitFor();
    assert.equal(await bayi.locator('#exSifPerde').count(), 0);
  });

  test('bayi firma adına tıklayıp şifresini değiştirebilir', async () => {
    await bayi.click('.h-firma');
    await bayi.fill('#exSifEski', 'AyseYeni2026'); await bayi.fill('#exSifYeni', 'AyseDaha2027'); await bayi.fill('#exSifYeni2', 'farkli-sifre');
    await bayi.click('#exSifPerde button[type=submit]');
    await bayi.locator('#exSifHata', { hasText: 'aynı değil' }).waitFor();
    await bayi.fill('#exSifYeni2', 'AyseDaha2027'); await bayi.click('#exSifPerde button[type=submit]');
    await bayi.waitForFunction(() => document.readyState === 'complete' && !document.getElementById('exSifPerde') && window.EXIT_OTURUM);
    await s.giris('bayi', 'ayse', 'AyseDaha2027');
  });

  test('bayi tarayıcıda fiyatı düşürse de sipariş katalog fiyatıyla kaydedilir; satış uyarıyı görür', async () => {
    await bayi.locator('#izgara .kart').first().waitFor();
    await bayi.click('#izgara .kart[data-id="21"]');
    for (const a of ['iskelet', 'file']) await bayi.locator(`.perde .renk[data-a=${a}]`).first().click();
    await bayi.click('#pEkle');
    // kötü niyetli düzenleme: sepetteki birim fiyatı 1 $ yap
    await bayi.evaluate(() => { const k = 'exb-sepet-ayse', S = JSON.parse(localStorage.getItem(k)); S[0].birim = 1; localStorage.setItem(k, JSON.stringify(S)); });
    await bayi.click('#hSepet'); await bayi.click('#sGonder');
    let o;
    for (let i = 0; i < 40 && !o; i++) { await new Promise(r => setTimeout(r, 150)); o = JSON.parse(s.veri().veri['exb-siparisler'] || '[]').find(x => x.kul === 'ayse'); }
    assert.ok(o, 'sipariş sunucuya ulaştı');
    assert.equal(o.kalemler[0].birim, 83); assert.ok(o.fiyatKontrol);
    await satis.reload(); await satis.evaluate(() => window.git('siparisler'));
    await satis.click(`tr[data-no="${o.no}"]`);
    await satis.locator('.fk-uyari', { hasText: 'Fiyat düzeltildi' }).waitFor();
  });

  test('sayfa hatası yok', () => { assert.deepEqual(hatalar.flat(), []); });
});
