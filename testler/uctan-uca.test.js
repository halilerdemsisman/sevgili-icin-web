// Faz 0 · Mevcut davranışın kaydı (regresyon testi).
// Bayi portalı ve satış paneli aynı sunucuya bağlanır; tek bir iş akışı uçtan uca izlenir:
// kayıt → sipariş → satış onayı → değişiklik talebi → ödeme → tahsilat → özel teklif.
// Testler sırayla çalışır ve birbirinin bıraktığı veriyi kullanır.
//
// Çalıştırma: npm test   (önce dist/ derlenir)
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla, YONETICI_SIFRE } = require('./yardimci');

const BAYI = { kFirma: 'Deniz Bahçe Ltd.', kAd: 'Deniz Yılmaz', kTel: '05551112233', kMail: 'deniz@ornek.com', kSehir: 'İzmir', kKul: 'denizbahce', kSif: 'Sifre123' };
const YIL = new Date().getFullYear();
const NO = `EXG-${YIL}-0001`;
const ODEME_LINKI = 'https://odeme.ornek.com/denizbahce';

let s, tarayici, bayi, satis, bayiHata, satisHata;

// Sunucudaki bir anahtarın koşulu sağlamasını bekler (istemci 250 ms gecikmeyle gönderir)
async function sunucudaBekle(anahtar, kosul, sure = 8000) {
  const bitis = Date.now() + sure; let son;
  while (Date.now() < bitis) {
    const { json } = await s.api('/api/veri');
    son = json.veri[anahtar] != null ? JSON.parse(json.veri[anahtar]) : undefined;
    if (son !== undefined && kosul(son)) return son;
    await new Promise(r => setTimeout(r, 150));
  }
  assert.fail(`${anahtar} beklenen duruma gelmedi. Son değer: ${JSON.stringify(son)?.slice(0, 500)}`);
}
const siparis = L => L.find(o => o.no === NO);
// Diğer kullanıcının değişikliğini hemen almak için sayfayı yenile (oturum sessionStorage'da kalır)
const yenile = async (p, git) => { await p.reload(); await p.waitForSelector('#uyg:not(.gizli), #uyg', { state: 'attached' }); if (git) await p.evaluate(g => window.git(g), git); };

describe('Bayi portalı + satış paneli: uçtan uca akış', () => {
  before(async () => {
    s = await sunucuBaslat();
    tarayici = await chromium.launch();
    const bc = await tarayici.newContext({ viewport: { width: 1440, height: 900 } });
    // ödeme linki dış siteye gider; testte sahte sayfa döner
    await bc.route('https://odeme.ornek.com/**', r => r.fulfill({ contentType: 'text/html', body: '<h1>Sahte ödeme sayfası</h1>' }));
    bayi = await bc.newPage(); bayiHata = hataTopla(bayi);
    const sc = await tarayici.newContext({ viewport: { width: 1440, height: 900 } });
    satis = await sc.newPage(); satisHata = hataTopla(satis);
  });
  after(async () => { await tarayici?.close(); s?.kapat(); });

  test('sayfalar açılır ve sunucuya bağlanır', async () => {
    await bayi.goto(s.url + '/');
    await satis.goto(s.url + '/satis');
    for (const p of [bayi, satis]) {
      await p.waitForFunction(() => window.EXIT_SUNUCU === true);
      await p.locator('#sunucuDurum', { hasText: 'Sunucuya bağlı' }).waitFor({ timeout: 8000 });
    }
  });

  test('bayi kayıt olur ve otomatik giriş yapar', async () => {
    await bayi.click('[data-s=kayit]');
    for (const [k, v] of Object.entries(BAYI)) await bayi.fill('#' + k, v);
    await bayi.check('#kKvkk');
    await bayi.click('#fKayit button[type=submit]');
    // kayıt sunucuda yapılır, sayfa yenilenir ve oturum çerezle açılır
    await bayi.waitForFunction(() => window.EXIT_OTURUM && window.EXIT_OTURUM.kul === 'denizbahce');
    await bayi.locator('#uyg').waitFor({ state: 'visible' });
    await bayi.locator('#izgara .kart').first().waitFor();
    const K = await sunucudaBekle('exb-kullanicilar', K => !!K.denizbahce);
    assert.equal(K.denizbahce.firma, BAYI.kFirma);
    assert.equal(K.denizbahce.sifre, '••••', 'şifre özeti tarayıcıya gönderilmemeli');
    const kayitli = JSON.parse(s.veri().veri['exb-kullanicilar']).denizbahce.sifre;
    assert.match(kayitli, /^scrypt\$/, 'şifre sunucuda scrypt ile saklanmalı');
  });

  test('katalogda 73 ürün var, ürün penceresi seçimler tamamlanınca sepete ekler', async () => {
    assert.equal(await bayi.locator('#izgara .kart').count(), 73);
    await bayi.click('#izgara .kart[data-id="21"]'); // Neo · Fileli · 83 $
    assert.ok(await bayi.isDisabled('#pEkle'), 'renk seçilmeden sepete eklenememeli');
    for (const a of ['iskelet', 'file', 'kumas', 'fitil']) { const r = bayi.locator(`.perde .renk[data-a=${a}]`).first(); if (await r.count()) await r.click(); }
    await bayi.fill('.perde #pAdet', '10'); await bayi.press('.perde #pAdet', 'Tab');
    await bayi.click('#pEkle');
    const S = await sunucudaBekle('exb-sepet-denizbahce', S => S.length === 1);
    assert.deepEqual([S[0].id, S[0].adet, S[0].birim], [21, 10, 83]);
  });

  test('bayi sipariş talebini gönderir', async () => {
    await bayi.click('#hSepet');
    await bayi.click('#sGonder');
    const L = await sunucudaBekle('exb-siparisler', L => !!siparis(L));
    const o = siparis(L);
    assert.equal(o.kul, 'denizbahce'); assert.equal(o.durum, 'yeni'); assert.equal(o.toplam, 830);
    await bayi.locator('#s-siparisler').getByText(NO).first().waitFor();
    assert.deepEqual(await sunucudaBekle('exb-sepet-denizbahce', S => S.length === 0), [], 'sipariş sonrası sepet boşalmalı');
  });

  test('satış yöneticisi girişi ve sipariş listede', async () => {
    await satis.fill('#gKul', 'satis'); await satis.fill('#gSif', YONETICI_SIFRE);
    await satis.click('#fGiris button.btn.marka');
    // giriş sunucuda yapılır, sayfa yenilenir; yeni sayfa sunucudaki son veriyle açılır
    await satis.waitForFunction(() => window.EXIT_OTURUM && window.EXIT_OTURUM.kul === 'satis');
    await satis.evaluate(() => window.git('siparisler'));
    await satis.locator(`tr[data-no="${NO}"]`).waitFor({ timeout: 8000 });
  });

  test('satış siparişi %15 iskontoyla onaylar → bayiye iskontolu net yazılır', async () => {
    await satis.click(`tr[data-no="${NO}"]`);
    await satis.fill('#pM', '15'); await satis.selectOption('#pD', 'onay'); await satis.click('#pK');
    const o = siparis(await sunucudaBekle('exb-siparisler', L => siparis(L)?.durum === 'onay'));
    assert.equal(o.iskonto, 15); assert.equal(o.net, 705.5); assert.equal(o.odemeBekleniyor, true);
    await satis.locator('.perde .kapat').click();
  });

  test('bayi onaylı siparişte "Ödeme bekleniyor" ve net tutarı görür', async () => {
    await yenile(bayi, 'siparisler');
    const k = bayi.locator('.sk-ode').first();
    await k.waitFor();
    const t = await k.innerText();
    assert.match(t, /Ödeme bekleniyor/); assert.match(t, /705,50 \$/);
  });

  test('bayi onaylı siparişte değişiklik ister, satış onaylar → adet ve net güncellenir', async () => {
    await bayi.click(`[data-sdd="${NO}"]`);
    await bayi.fill('.perde [data-sd="0"]', '12');
    await bayi.fill('#sdNot', 'Adet 12 olsun');
    await bayi.click('#sdOk');
    await sunucudaBekle('exb-siparisler', L => siparis(L)?.talep?.durum === 'bekliyor');
    await yenile(satis, 'talepler');
    await satis.click(`[data-tok="${NO}"]`);
    const o = siparis(await sunucudaBekle('exb-siparisler', L => siparis(L)?.talep?.durum === 'onaylandi'));
    assert.equal(o.kalemler[0].adet, 12);
    assert.equal(o.net, 846.6); // 12 × 83 × 0,85
  });

  test('satış bayiye ödeme linki tanımlar', async () => {
    await satis.evaluate(() => window.git('tahsilat'));
    const i = satis.locator('[data-ln="denizbahce"]');
    await i.fill(ODEME_LINKI); await i.dispatchEvent('change');
    const L = await sunucudaBekle('exb-odeme-link', L => !!L.denizbahce);
    assert.equal(L.denizbahce, ODEME_LINKI);
  });

  test('bayi "öde" ile ödeme linkine gider, ödeme kaydı satışa düşer', async () => {
    await yenile(bayi, 'siparisler');
    await bayi.locator('.sk-ode button').first().click(); // "… $ öde" → ödeme sayfası
    const [popup] = await Promise.all([bayi.context().waitForEvent('page'), bayi.click('#odGit')]);
    assert.equal(popup.url(), ODEME_LINKI); await popup.close();
    const O = await sunucudaBekle('exb-odeme', O => O.some(x => x.siparis === NO));
    const od = O.find(x => x.siparis === NO);
    assert.equal(od.tutar, 846.6); assert.equal(od.durum, 'bekliyor'); assert.equal(od.online, true);
    assert.match(od.no, new RegExp(`^OL-${YIL}-\\d{4}$`));
  });

  test('satış ödemeyi tahsilat olarak işler → cari hareketi, bayide "Ödeme alındı"', async () => {
    await yenile(satis, 'odemeler');
    await satis.locator('[data-oi]').first().click();
    const od = (await sunucudaBekle('exb-odeme', O => O.some(x => x.siparis === NO && x.durum === 'onaylandi'))).find(x => x.siparis === NO);
    assert.match(od.tahsilatNo, /^TH-/);
    const C = await sunucudaBekle('exs-cari', C => C.denizbahce?.hareket?.some(h => h.tip === 'odeme'));
    assert.equal(C.denizbahce.hareket.find(h => h.tip === 'odeme').tutar, 846.6);
    await yenile(bayi, 'siparisler');
    await bayi.locator('.sk-ode.ok', { hasText: 'Ödeme alındı' }).first().waitFor();
  });

  test('özel teklif: bayi takım ister, satış fiyat verir, bayi özel fiyatla sepete ekler', async () => {
    await bayi.evaluate(() => window.git('teklifler'));
    const ilk = sel => bayi.$eval(sel, e => [...e.options].find(o => o.value)?.value);
    await bayi.selectOption('#tfM', await ilk('#tfM')); await bayi.selectOption('#tfMi', await ilk('#tfMi'));
    await bayi.selectOption('#tfS', '21'); await bayi.selectOption('#tfSi', await ilk('#tfSi'));
    await bayi.fill('#tfOr', '4'); await bayi.fill('#tfAd', '5');
    await bayi.click('#tfGon');
    const t = (await sunucudaBekle('exb-teklif', L => L.length === 1))[0];
    assert.equal(t.durum, 'bekliyor'); assert.equal(t.takim, 5); assert.equal(t.oran, 4);
    assert.match(t.no, new RegExp(`^OT-${YIL}-0001$`));

    await yenile(satis, 'teklifler');
    await satis.fill(`[data-fm="${t.no}"]`, '300'); await satis.fill(`[data-fs="${t.no}"]`, '70');
    await satis.click(`[data-fok="${t.no}"]`);
    const t2 = (await sunucudaBekle('exb-teklif', L => L[0].durum === 'onaylandi'))[0];
    assert.deepEqual(t2.fiyat, { masa: 300, sandalye: 70, takim: 580 });

    await yenile(bayi, 'teklifler');
    await bayi.click(`[data-tsep="${t.no}"]`);
    const S = await sunucudaBekle('exb-sepet-denizbahce', S => S.length === 2);
    assert.deepEqual(S.map(x => [x.adet, x.birim, x.teklif]), [[5, 300, t.no], [20, 70, t.no]]);
  });

  test('akış boyunca sayfa hatası oluşmadı', () => {
    assert.deepEqual(bayiHata, [], 'bayi portalı hataları');
    assert.deepEqual(satisHata, [], 'satış paneli hataları');
  });
});
