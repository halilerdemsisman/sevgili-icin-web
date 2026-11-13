// Faz 2b-1: bayi web sitesinin yazma uçları (REST) ve tarayıcıda iş verisi tutulmaması.
//   • Ödeme bildirimi, iade, numune, özel teklif: numara, sahip ve ilk durum sunucuda; satış alanları kabul edilmez.
//   • Sipariş değişikliği (PATCH): yalnız bayinin değiştirebildiği alanlar; kurala takılan istek 409 ile söylenir.
//   • Tarayıcı: iş verisi localStorage'a yazılmaz, eski kopyalar silinir; bağlantı yokken sipariş gönderilmez.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla } = require('./yardimci');

const YIL = new Date().getFullYear();
let s, cerez, cerez2;
const bayi = (yol, govde, yontem, c = cerez) => s.api('/api/v1/' + yol, govde, { cerez: c, uyg: 'bayi', yontem });
const kayitlar = k => JSON.parse(s.veri().veri[k] || '[]');
// satış yöneticisi bir kaydı değiştirir (satış paneli eşitleme ucuyla yazar)
const satisYaz = (k, kayit) => s.api('/api/veri', { degisen: [[k, JSON.stringify([kayit])]] });

describe('REST yazma uçları (Faz 2b)', () => {
  let siparis;
  before(async () => {
    s = await sunucuBaslat();
    cerez = await s.kayit('rest1'); cerez2 = await s.kayit('rest2');
    const r = await bayi('siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 2 }], adres: 'İzmir' });
    assert.equal(r.durum, 201, r.metin); siparis = r.json;
  });
  after(() => s?.kapat());

  test('ödeme bildirimi: numara ve sahip sunucuda, satış alanları ve ilk durum bayiden alınmaz', async () => {
    const r = await bayi('odemeler', { tutar: 150.5, tarih: '2026-11-10', yontem: 'Havale / EFT', ref: 'TR12', not: 'deneme', durum: 'onaylandi', karar: 'x', kul: 'baska', no: 'OB-2026-999' });
    assert.equal(r.durum, 201, r.metin);
    assert.match(r.json.no, new RegExp(`^OB-${YIL}-\\d{3}$`));
    assert.equal(r.json.kul, 'rest1'); assert.equal(r.json.firma, 'rest1 Ltd.'); assert.equal(r.json.durum, 'bekliyor'); assert.equal(r.json.karar, undefined);
    assert.equal(kayitlar('exb-odeme').find(x => x.no === r.json.no).tutar, 150.5);
    const ol = await bayi('odemeler', { tutar: 10, on: 'OL', online: true });
    assert.match(ol.json.no, /^OL-/); assert.equal(ol.json.online, true);
    assert.equal((await bayi('odemeler', { tutar: 0 })).durum, 400);
    // başka bayi göremez; kendi listesi döner
    const L = await bayi('odemeler', undefined, 'GET', cerez2);
    assert.equal(L.json.toplam, 0);
    assert.equal((await bayi('odemeler', undefined, 'GET')).json.toplam, 2);
  });

  test('ödeme dekontu dosyaya çıkarılır, javascript: adresi kabul edilmez', async () => {
    const png = 'data:image/png;base64,' + Buffer.alloc(3000, 7).toString('base64');
    const r = await bayi('odemeler', { tutar: 5, dosya: png });
    assert.match(r.json.dosya, /^api\/dosya\/[0-9a-f]{32}\.png$/);
    const k = await bayi('odemeler', { tutar: 5, dosya: 'javascript:alert(1)' });
    assert.equal(k.durum, 201); assert.equal(k.json.dosya, null); assert.ok(k.json.uyari && k.json.uyari.length);
  });

  test('iade: yalnız kendi siparişi için; fotoğraflar süzülür', async () => {
    const yok = await bayi('iadeler', { sip: siparis.no, aciklama: 'kırık' }, 'POST', cerez2);
    assert.equal(yok.durum, 400); assert.match(yok.json.hata, /Sipariş bulunamadı/);
    assert.equal((await bayi('iadeler', { sip: siparis.no })).durum, 400);
    const r = await bayi('iadeler', { sip: siparis.no, urun: 'Neo · Fileli', adet: 1, tur: 'Hasarlı ürün', aciklama: 'Ayağı kırık', foto: ['javascript:alert(1)', 'data:image/png;base64,AAAA'], durum: 'cozuldu' });
    assert.equal(r.durum, 201, r.metin);
    assert.match(r.json.no, new RegExp(`^IAD-${YIL}-\\d{4}$`)); assert.match(r.json.id, /^ia/);
    assert.equal(r.json.durum, 'yeni'); assert.deepEqual(r.json.foto, ['data:image/png;base64,AAAA']);
  });

  test('numune ve özel teklif talebi', async () => {
    assert.equal((await bayi('numuneler', { tur: [], adres: 'x' })).durum, 400);
    const n = await bayi('numuneler', { tur: ['Kumaş kartelası'], adres: 'İzmir', adet: 2 });
    assert.equal(n.durum, 201, n.metin); assert.match(n.json.no, /^NMN-/); assert.equal(n.json.tel, '05550000000');
    const t = await bayi('teklifler', { oran: 4, takim: 10, sandalye: { id: 21, ad: 'Neo', secenek: 'Fileli', iskelet: 'Granit' }, masa: { id: 36, ad: 'Masa', secenek: '' }, fiyat: { masa: 1 }, durum: 'onaylandi' });
    assert.equal(t.durum, 201, t.metin); assert.match(t.json.no, /^OT-/);
    assert.equal(t.json.durum, 'bekliyor'); assert.equal(t.json.fiyat, undefined); assert.equal(t.json.oran, 4);
    assert.equal((await bayi('teklifler/' + t.json.no, { sepette: true }, 'PATCH')).durum, 409, 'onaylanmamış teklif sepete işaretlenemez');
  });

  test('satış hesabı bayi kaydı oluşturamaz; başka siteden gelen PATCH reddedilir', async () => {
    assert.equal((await s.api('/api/v1/odemeler', { tutar: 5 })).durum, 403);
    const r = await s.api('/api/v1/siparisler/' + siparis.no, { proje: 'x' }, { cerez, uyg: 'bayi', yontem: 'PATCH', basliklar: { Origin: 'https://kotu.ornek.com' } });
    assert.equal(r.durum, 403);
  });

  test('sipariş değişikliği: yeni siparişte kalem ve proje; başka bayinin siparişi bulunamaz', async () => {
    assert.equal((await bayi('siparisler/' + siparis.no, { proje: 'Otel' }, 'PATCH', cerez2)).durum, 404);
    const r = await bayi('siparisler/' + siparis.no, { proje: 'Otel', kalemler: [{ ...siparis.kalemler[0], adet: 5, birim: 1 }], net: 1 }, 'PATCH');
    assert.equal(r.durum, 200, r.metin);
    assert.equal(r.json.proje, 'Otel'); assert.equal(r.json.kalemler[0].adet, 5);
    assert.equal(r.json.kalemler[0].birim, 83, 'fiyatı sunucu belirler'); assert.equal(r.json.toplam, 415); assert.equal(r.json.net, undefined);
    assert.equal((await bayi('siparisler/' + siparis.no, { fiyat: 1 }, 'PATCH')).durum, 400);
  });

  test('onaylanan sipariş iptal edilemez (409), yalnız talep açılır; ikinci talep reddedilir', async () => {
    const o = kayitlar('exb-siparisler').find(x => x.no === siparis.no);
    assert.equal((await satisYaz('exb-siparisler', { ...o, durum: 'onay' })).durum, 200);
    const ip = await bayi('siparisler/' + siparis.no, { durum: 'iptal' }, 'PATCH');
    assert.equal(ip.durum, 409); assert.match(ip.json.hata, /işleme alındı/); assert.equal(ip.json.kayit.durum, 'onay');
    const talep = { id: 't1', tur: 'iptal', kalemler: null, not: 'vazgeçtik', zaman: Date.now(), durum: 'bekliyor', durumAnda: 'onay' };
    const t = await bayi('siparisler/' + siparis.no, { talep }, 'PATCH');
    assert.equal(t.durum, 200, t.metin); assert.equal(t.json.talep.id, 't1');
    const t2 = await bayi('siparisler/' + siparis.no, { talep: { ...talep, id: 't2' } }, 'PATCH');
    assert.equal(t2.durum, 409);
  });

  test('istemcinin düşük fiyatı işaretlenir, yüksek fiyat yerine katalog fiyatı geçerli', async () => {
    const d = await bayi('siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 1, birim: 1 }] });
    assert.equal(d.json.kalemler[0].birim, 83); assert.ok(d.json.fiyatKontrol);
    const y = await bayi('siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 1, birim: 500 }], kaynak: 'web' });
    assert.equal(y.json.kalemler[0].birim, 83); assert.equal(y.json.fiyatKontrol, undefined); assert.equal(y.json.kaynak, 'web');
  });
});

describe('Bayi web sitesi: tarayıcıda iş verisi yok (Faz 2b)', () => {
  let b, ctx, p, H, c;
  before(async () => {
    s = await sunucuBaslat();
    c = await s.kayit('tarayici1');
    b = await chromium.launch();
    ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const [k, v] = c.split('='); await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    // önceki sürümden kalmış iş verisi kopyası (ilk açılışta silinmeli)
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('t-ilk')) { sessionStorage.setItem('t-ilk', '1'); localStorage.setItem('exb-siparisler', '[{"no":"ESKI-1","kul":"baska"}]'); localStorage.setItem('exb-sepet-tarayici1', '[]'); } });
    p = await ctx.newPage(); H = hataTopla(p);
  });
  after(async () => { await b?.close(); s?.kapat(); });

  const isVerisi = () => p.evaluate(() => Object.keys(localStorage).filter(k => /^ex[bs]-/.test(k) && !/^(exb-dil|exb-kars)$/.test(k)));
  const sepeteNeo = async () => {
    await p.goto(s.url + '/urun/21-neo'); await p.locator('.perde #pEkle').waitFor();
    for (const a of ['iskelet', 'file']) await p.locator(`.perde .renk[data-a=${a}]`).first().click();
    await p.click('#pEkle');
  };

  test('sipariş, ödeme bildirimi ve sepet localStorage\'a yazılmaz; eski kopyalar silinir', async () => {
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
    assert.deepEqual(await isVerisi(), [], 'açılışta eski kopyalar silinmeli');
    assert.ok(await p.evaluate(() => window.EXIT_BELLEK === true));
    await sepeteNeo();
    await p.click('#hSepet'); await p.click('#sGonder');
    await p.locator('.toast', { hasText: 'Sipariş talebiniz alındı: EXG-' }).waitFor();
    assert.equal(kayitlar('exb-siparisler').filter(x => x.kul === 'tarayici1').length, 1);
    await p.goto(s.url + '/cari'); await p.click('#obAc');
    await p.fill('#obTut', '120'); await p.click('#obGon');
    await p.locator('.toast', { hasText: 'Ödeme bildiriminiz' }).waitFor();
    assert.equal(kayitlar('exb-odeme').filter(x => x.kul === 'tarayici1').length, 1);
    assert.deepEqual(await isVerisi(), []);
    // sayfa yenilenince veri yine sunucudan gelir
    await p.goto(s.url + '/siparisler'); await p.locator('#s-siparisler', { hasText: 'EXG-' }).waitFor();
  });

  test('bağlantı yokken sipariş gönderilmez; sepet korunur', async () => {
    await sepeteNeo();
    await p.route('**/api/v1/siparisler', r => r.abort());
    await p.click('#hSepet'); await p.click('#sGonder');
    await p.locator('.toast', { hasText: 'Sunucuya ulaşılamıyor' }).waitFor();
    assert.ok(await p.locator('#sGonder').isEnabled(), 'düğme yeniden denenebilir olmalı');
    assert.equal(await p.evaluate(() => sepet().length), 1);
    assert.equal(kayitlar('exb-siparisler').filter(x => x.kul === 'tarayici1').length, 1, 'yeni sipariş oluşmamalı');
    await p.unroute('**/api/v1/siparisler');
    await p.click('#sGonder'); await p.locator('.toast', { hasText: 'Sipariş talebiniz alındı' }).waitFor();
    assert.equal(kayitlar('exb-siparisler').filter(x => x.kul === 'tarayici1').length, 2);
  });

  test('sunucuya ulaşılamazsa giriş ve kayıt kapalı (yerelde hesap açılmaz)', async () => {
    const c2 = await b.newContext(); const q = await c2.newPage();
    await q.route('**/api/veri', r => r.abort());
    await q.goto(s.url + '/'); await q.locator('#gHata', { hasText: 'Sunucuya ulaşılamıyor' }).waitFor();
    assert.ok(await q.evaluate(() => window.EXIT_CEVRIMDISI === true));
    assert.ok(await q.locator('#fGiris button[type=submit], #fGiris button.marka').first().isDisabled());
    await c2.close();
  });

  test('sayfa hatası yok', () => { assert.deepEqual(H.filter(h => !/ERR_FAILED|net::/.test(h)), []); });
});

describe('Tek dosyalık portal (sunucusuz) kayıtları yerelde oluşturur', () => {
  let b;
  before(async () => { b = await chromium.launch(); });
  after(async () => { await b?.close(); });

  test('kayıt, sipariş, ödeme bildirimi ve sipariş iptali dosyadan açılan sürümde çalışır', async () => {
    const { pathToFileURL } = require('node:url'), path = require('node:path');
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(), H = hataTopla(p);
    p.on('dialog', d => d.accept());
    await p.goto(pathToFileURL(path.join(__dirname, '..', 'dist', 'exit_bayi_siparis.html')).href);
    await p.click('[data-s=kayit]');
    for (const [k, v] of Object.entries({ kFirma: 'Yerel Ltd.', kAd: 'Yerel', kTel: '05551112233', kMail: 'y@ornek.com', kSehir: 'Bursa', kKul: 'yerel', kSif: 'Sifre123' })) await p.fill('#' + k, v);
    await p.check('#kKvkk'); await p.click('#fKayit button[type=submit]');
    await p.locator('#izgara .kart').first().waitFor();
    await p.click('#izgara .kart[data-id="21"]');
    for (const a of ['iskelet', 'file']) await p.locator(`.perde .renk[data-a=${a}]`).first().click();
    await p.click('#pEkle'); await p.click('#hSepet'); await p.click('#sGonder');
    await p.locator('.toast', { hasText: `Sipariş talebiniz alındı: EXG-${YIL}-0001` }).waitFor();
    const L = await p.evaluate(() => JSON.parse(localStorage.getItem('exb-siparisler')));
    assert.equal(L.length, 1); assert.equal(L[0].kul, 'yerel'); assert.equal(L[0].toplam, 83);
    await p.evaluate(() => { git('siparisler'); });
    await p.click('[data-sdi]'); await p.click('#sdOk');
    await p.locator('.toast', { hasText: 'Sipariş iptal edildi' }).waitFor();
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('exb-siparisler'))[0].durum), 'iptal');
    await p.evaluate(() => git('cari')); await p.click('#obAc'); await p.fill('#obTut', '50'); await p.click('#obGon');
    await p.locator('.toast', { hasText: 'Ödeme bildiriminiz' }).waitFor();
    const O = await p.evaluate(() => JSON.parse(localStorage.getItem('exb-odeme')));
    assert.match(O[0].no, new RegExp(`^OB-${YIL}-001$`)); assert.equal(O[0].kul, 'yerel');
    assert.deepEqual(H, []);
  });
});
