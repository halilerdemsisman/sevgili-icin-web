// Faz 2b-2 (adım 2): bayi web sitesi iş verisini REST'ten okur; eşitleme ucu sitede yalnız kişisel anahtarlar için.
//   • Okuma uçları: katalog + kampanyalar, tam cari, hatırlatmalar (okundu: PATCH), duyurular, hedef, ödeme linki, stok.
//     Başka bayilerin adı (kampanya/duyuru hedef listesi) bayiye gitmez. Her kaynak imzasıyla (ETag) döner.
//   • ?kapsam=kisisel: eşitleme ucu yalnız bayinin kişisel anahtarlarını verir ve kabul eder; değişen iş verisi için
//     kaynakların yeni imzası gelir ve imza GET'teki ETag ile aynıdır.
//   • Tarayıcı: site eşitleme ucuna iş verisi göndermez; satışın değişikliği (sipariş durumu, fiyat, kampanya) sayfa
//     yenilenmeden gelir; fiyatlar sunucunun hesabıdır.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla } = require('./yardimci');

let s, c1, c2;
const bayi = (yol, govde, yontem, c = c1) => s.api('/api/v1/' + yol, govde, { cerez: c, uyg: 'bayi', yontem });
const satisYaz = degisen => s.api('/api/veri', { degisen: degisen.map(([k, v]) => [k, JSON.stringify(v)]) });
const kayitlar = k => JSON.parse(s.veri().veri[k] || '[]');

describe('REST okuma uçları (Faz 2b-2)', () => {
  before(async () => {
    s = await sunucuBaslat();
    c1 = await s.kayit('okbayi'); c2 = await s.kayit('okbayi2');
    const z = Date.now();
    const H = Array.from({ length: 60 }, (_, i) => ({ tip: i % 2 ? 'odeme' : 'fatura', tutar: 10, tarih: z - i * 1000, no: 'F' + i }));
    const r = await satisYaz([
      ['exb-kampanya', [{ ad: 'Herkese', oran: 5, kapsam: 'tumu' }, { ad: 'Seçili', oran: 10, kapsam: 'urun', hedef: ['Neo'], bayiler: ['okbayi', 'gizlibayi'] }, { ad: 'Başkası', oran: 30, kapsam: 'tumu', bayiler: ['okbayi2'] }]],
      ['exb-gizli', ['Artemis Bar']],
      ['exb-duyuru', [{ id: 'd1', baslik: 'Genel', metin: 'a' }, { id: 'd2', baslik: 'Özel', metin: 'b', bayiler: ['okbayi', 'gizlibayi'] }, { id: 'd3', baslik: 'Başka', bayiler: ['okbayi2'] }]],
      ['exb-hatirlat', [{ id: 'm1', kul: 'okbayi', metin: 'ödeme', zaman: z }, { id: 'm2', kul: 'okbayi2', metin: 'x', zaman: z }]],
      ['exs-cari', { okbayi: { vade: 45, limit: 9000, hareket: H } }], ['exb-cari', { okbayi: { vade: 45, limit: 9000, hareket: H } }],
      ['exb-bayi-hedef', { okbayi: { [new Date().getFullYear()]: { hedef: 1000 } }, okbayi2: { 2026: { hedef: 5 } } }],
      ['exb-odeme-link', { okbayi: ' https://odeme.ornek/x ', okbayi2: 'https://odeme.ornek/y' }],
      ['exb-stok', { Neo: { gun: 7 } }],
    ]);
    assert.equal(r.durum, 200, r.metin);
  });
  after(() => s?.kapat());

  test('katalog: bayiye geçerli fiyat ve kampanyalar; hedef listesi ve gizli ürün gitmez; ETag', async () => {
    const r = await bayi('katalog');
    assert.equal(r.durum, 200); assert.match(r.basliklar.get('etag'), /^"[\w-]{16}"$/);
    assert.deepEqual(r.json.kampanyalar.map(k => k.ad), ['Herkese', 'Seçili']);
    assert.ok(r.json.kampanyalar.every(k => !('bayiler' in k)), 'başka bayilerin adı gitmez');
    assert.ok(!r.json.urunler.some(u => u.ad === 'Artemis Bar'));
    const neo = r.json.urunler.find(u => u.id === 21).secenekler.find(x => x.ad === 'Fileli');
    assert.equal(neo.kampanya.ad, 'Seçili'); assert.equal(neo.fiyat, Math.round(neo.liste * 0.9));
    const r2 = await bayi('katalog', undefined, 'GET', c2);
    assert.deepEqual(r2.json.kampanyalar.map(k => k.ad), ['Herkese', 'Başkası']);
    assert.notEqual(r2.basliklar.get('etag'), r.basliklar.get('etag'));
  });

  test('cari: ?hareket=tum bütün hareketleri verir; limit ve vade', async () => {
    const k = await bayi('cari'), t = await bayi('cari?hareket=tum');
    assert.equal(k.json.hareketler.length, 50); assert.equal(t.json.hareketler.length, 60);
    assert.equal(t.json.limit, 9000); assert.equal(t.json.vade, 45); assert.equal(t.json.tanimli, true);
    assert.ok(t.basliklar.get('etag'));
    assert.equal((await bayi('cari?hareket=tum', undefined, 'GET', c2)).json.tanimli, false);
  });

  test('hatırlatmalar: bayi yalnız kendi mesajını görür ve yalnız okundu/gizli işaretleyebilir', async () => {
    const L = await bayi('hatirlatmalar');
    assert.deepEqual(L.json.kayitlar.map(x => x.id), ['m1']); assert.ok(L.basliklar.get('etag'));
    const p = await bayi('hatirlatmalar/m1', { okundu: 123, metin: 'değiştirildi' }, 'PATCH');
    assert.equal(p.durum, 200, p.metin); assert.equal(p.json.okundu, 123); assert.equal(p.json.metin, 'ödeme');
    assert.equal(kayitlar('exb-hatirlat').find(x => x.id === 'm1').okundu, 123);
    assert.equal((await bayi('hatirlatmalar/m1', { metin: 'x' }, 'PATCH')).durum, 400, 'değiştirilecek alan yok');
    assert.equal((await bayi('hatirlatmalar/m2', { okundu: 1 }, 'PATCH')).durum, 404, 'başka bayinin mesajı');
    assert.equal(kayitlar('exb-hatirlat').find(x => x.id === 'm2').okundu, undefined);
    assert.equal((await s.api('/api/v1/hatirlatmalar/m1', { okundu: 1 }, { yontem: 'PATCH' })).durum, 403, 'satış PATCH etmez');
  });

  test('duyurular, hedef, ödeme linki, stok: yalnız bu bayiye ait kısım', async () => {
    const d = await bayi('duyurular');
    assert.deepEqual(d.json.duyurular.map(x => x.id), ['d1', 'd2']); assert.ok(d.json.duyurular.every(x => !('bayiler' in x)));
    assert.equal((await bayi('hedef')).json.hedef[new Date().getFullYear()].hedef, 1000);
    assert.equal((await bayi('odeme-linki')).json.link, 'https://odeme.ornek/x');
    assert.equal((await bayi('odeme-linki', undefined, 'GET', c2)).json.link, 'https://odeme.ornek/y');
    assert.deepEqual((await bayi('stok')).json.stok, { Neo: { gun: 7 } });
    for (const y of ['duyurular', 'hedef', 'odeme-linki', 'stok']) assert.equal((await s.api('/api/v1/' + y)).durum, 403, y + ': bayi kaynağı');
    assert.equal((await s.api('/api/v1/ben', undefined, { cerez: null, uyg: 'bayi' })).durum, 401);
  });

  test('?kapsam=kisisel: eşitleme ucu yalnız kişisel anahtarları verir ve kabul eder', async () => {
    const yaz = await s.api('/api/veri?kapsam=kisisel', { degisen: [['exb-sepet-okbayi', '[{"id":21}]'], ['exb-sepet-okbayi2', '[]'], ['exb-hatirlat', JSON.stringify([{ id: 'm1', kul: 'okbayi', okundu: 999, zaman: 1 }])]] }, { cerez: c1, uyg: 'bayi' });
    assert.equal(yaz.durum, 200, yaz.metin);
    const red = yaz.json.reddedilen.map(x => x[0]);
    assert.ok(red.includes('exb-hatirlat') && red.includes('exb-sepet-okbayi2'), JSON.stringify(yaz.json.reddedilen));
    assert.equal(kayitlar('exb-hatirlat').find(x => x.id === 'm1').okundu, 123, 'iş verisi eşitleme ucuyla yazılmadı');
    assert.equal(s.veri().veri['exb-sepet-okbayi'], '[{"id":21}]');
    const v = (await s.api('/api/veri?kapsam=kisisel', undefined, { cerez: c1, uyg: 'bayi' })).json;
    assert.deepEqual(Object.keys(v.veri), ['exb-sepet-okbayi']);
    // kapsamsız (eski istemci, testler) davranış değişmedi
    assert.ok('exb-hatirlat' in (await s.api('/api/veri', undefined, { cerez: c1, uyg: 'bayi' })).json.veri);
  });

  test('değişen iş verisi için kaynak imzası gelir ve GET ETag ile aynıdır; başka bayinin değişikliği imzayı değiştirmez', async () => {
    const o = (await bayi('siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 1 }] }, 'POST')).json;
    const o2 = (await bayi('siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 1 }] }, 'POST', c2)).json;
    const son = (await s.api('/api/degisen?son=0&kapsam=kisisel', undefined, { cerez: c1, uyg: 'bayi' })).json.zaman;
    const e1 = (await bayi('siparisler?adet=200')).basliklar.get('etag');
    // başka bayinin siparişi değişti: bu bayinin sipariş imzası aynı kalır
    await satisYaz([['exb-siparisler', kayitlar('exb-siparisler').map(x => x.no === o2.no ? { ...x, durum: 'onay' } : x)]]);
    let d = (await s.api('/api/degisen?son=' + son + '&kapsam=kisisel', undefined, { cerez: c1, uyg: 'bayi' })).json;
    assert.deepEqual(d.degisen, [], 'iş verisi anahtarı gelmez');
    assert.equal(new Map(d.kaynaklar).get('siparisler'), e1);
    // bu bayinin siparişi değişti: yeni imza = yeni ETag
    await satisYaz([['exb-siparisler', kayitlar('exb-siparisler').map(x => x.no === o.no ? { ...x, durum: 'onay' } : x)]]);
    d = (await s.api('/api/degisen?son=' + son + '&kapsam=kisisel', undefined, { cerez: c1, uyg: 'bayi' })).json;
    const e2 = (await bayi('siparisler?adet=1')).basliklar.get('etag');
    assert.notEqual(e2, e1); assert.equal(new Map(d.kaynaklar).get('siparisler'), e2, 'sayfalı yanıtta da bütün listenin imzası');
    // satış oturumuna kaynak imzası gitmez
    assert.equal((await s.api('/api/degisen?son=' + son + '&kapsam=kisisel')).json.kaynaklar, undefined);
  });
});

describe('Bayi web sitesi: okumalar REST\'ten (Faz 2b-2)', () => {
  let b, p, H, no; const govdeler = [];
  before(async () => {
    s = await sunucuBaslat();
    c1 = await s.kayit('canlibayi');
    no = (await bayi('siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 2 }] }, 'POST')).json.no;
    await satisYaz([['exb-hatirlat', [{ id: 'c1', kul: 'canlibayi', metin: 'Ödeme hatırlatması', zaman: Date.now() }]]]);
    b = await chromium.launch();
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const [k, v] = c1.split('='); await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    p = await ctx.newPage(); H = hataTopla(p);
    p.on('request', q => { if (/\/api\/veri/.test(q.url()) && q.method() === 'POST') govdeler.push([q.url(), q.postData() || '']); });
    await p.goto(s.url + '/siparisler'); await p.locator('#s-siparisler .sk').first().waitFor();
  });
  after(async () => { await b?.close(); s?.kapat(); });

  test('veri REST\'ten gelir: siparişler, profil, katalog fiyatı sunucunun hesabı', async () => {
    assert.match(await p.textContent('#s-siparisler'), new RegExp(no));
    assert.match(await p.textContent('#hKim'), /canlibayi Ltd\./);
    const kat = (await bayi('katalog')).json.urunler.find(u => u.id === 21).secenekler.find(x => x.ad === 'Fileli').fiyat;
    assert.equal(await p.evaluate(() => VERI.urunler.find(u => u.id === 21).secenek.find(x => x.ad === 'Fileli').fiyat), kat);
  });

  test('satışın değişikliği sayfa yenilenmeden gelir: sipariş durumu, fiyat, kampanya', async () => {
    await satisYaz([['exb-siparisler', kayitlar('exb-siparisler').map(x => x.no === no ? { ...x, durum: 'onay', satisNot: 'Hazırlanıyor' } : x)]]);
    await p.locator('#s-siparisler .sk', { hasText: 'Hazırlanıyor' }).waitFor({ timeout: 20000 });
    await satisYaz([['exb-fiyat', { Neo: { Fileli: 200 } }], ['exb-kampanya', [{ ad: 'Kış fırsatı', oran: 10, kapsam: 'tumu' }]]]);
    await p.waitForFunction(() => VERI.urunler.find(u => u.id === 21).secenek.find(x => x.ad === 'Fileli').fiyat === 180, null, { timeout: 20000 });
    await p.click('header .h-sag > [data-git=katalog]');
    await p.locator('#kmpBant', { hasText: 'Kış fırsatı' }).waitFor();
  });

  test('satış mesajı "Okundu": REST ile işaretlenir', async () => {
    await p.evaluate(() => document.querySelector('#hHat').click()); // web menüsünde hesap menüsünün içinde
    await p.locator('.hat-p [data-am]').first().click();
    await p.waitForFunction(() => !document.querySelector('.hat-p [data-am]'));
    assert.ok(kayitlar('exb-hatirlat').find(x => x.id === 'c1').okundu > 0);
  });

  test('site eşitleme ucuna yalnız kişisel anahtar gönderir; sayfa hatası yok', async () => {
    // sepete ekleme (kişisel anahtar) eşitleme ucundan gider
    await p.goto(s.url + '/urun/21-neo'); await p.locator('.perde #pEkle').waitFor();
    for (const a of ['iskelet', 'file']) await p.locator(`.perde .renk[data-a=${a}]`).first().click();
    await p.click('#pEkle');
    await new Promise(r => setTimeout(r, 800)); // eşitleme 250 ms sonra gönderir
    assert.ok(govdeler.length, 'kişisel anahtar yazıldı');
    for (const [u, g] of govdeler) {
      assert.match(u, /kapsam=kisisel/);
      // sayfadan ayrılırken bekleyen değişiklik sendBeacon ile gider; Playwright onun gövdesini göstermez (adres yine denetlenir)
      if (!g) continue;
      const J = JSON.parse(g), K = [...(J.degisen || []), ...(J.yama || [])].map(x => x[0]);
      assert.ok(K.every(k => /^exb-(hat-gizli|duyuru-okundu|sepet|fav|proje|adres|bildirim|gorulen|mkat|hat)-canlibayi$/.test(k)), K.join(', '));
    }
    assert.ok(JSON.parse(s.veri().veri['exb-sepet-canlibayi'] || '[]').length >= 1);
    assert.deepEqual(H, []);
  });
});
