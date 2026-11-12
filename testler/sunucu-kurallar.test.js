// Faz 1a · Sunucu kuralları: oturum, yetki, alan koruması, numaralandırma, dosyalar.
// Tarayıcı kullanmaz; doğrudan API'ye istek atar (uygulamaların senkron katmanının yaptığı gibi).
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { sunucuBaslat } = require('./yardimci');

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const YIL = new Date().getFullYear();
let s, ali, veli;

const yaz = (cerez, uyg, degisen, basliklar) => s.api('/api/veri', { degisen }, { cerez, uyg, basliklar });
const oku = async (cerez, uyg) => (await s.api('/api/veri', undefined, { cerez, uyg })).json;
const al = (veri, k, vars) => veri[k] == null ? vars : JSON.parse(veri[k]);
const sunucuda = k => JSON.parse(s.veri().veri[k] || 'null');
const bekle = ms => new Promise(r => setTimeout(r, ms));
// Neo (id 21) · Fileli · katalog fiyatı 83 $
const kalem = (birim, ek = {}) => ({ id: 21, ad: 'Neo', secenek: 'Fileli', adet: 2, birim, ...ek });
const siparis = (no, kul, ek = {}) => ({ no, kul, firma: kul, tarih: 1700000000000 + no.length, kalemler: [kalem(83)], toplam: 166, durum: 'yeni', ...ek });

describe('Sunucu kuralları (Faz 1a)', () => {
  before(async () => {
    s = await sunucuBaslat({
      veri: {
        veri: {
          // eski sürümden kalan hesaplar: tarayıcıda üretilmiş sha256 özetleri
          'exb-kullanicilar': JSON.stringify({ eskibayi: { kul: 'eskibayi', firma: 'Eski Bayi', rol: 'musteri', durum: 'aktif', sifre: sha('exitbayi:Eski-Sifre-1') } }),
          'exs-kullanicilar': JSON.stringify({ mudur: { kul: 'mudur', ad: 'Müdür', rol: 'yonetici', sifre: sha('exitsatis:1234') }, temsil: { kul: 'temsil', ad: 'Temsilci', rol: 'temsilci', sifre: sha('exitsatis:Temsil-123') } }),
        },
      },
    });
    ali = await s.kayit('ali'); veli = await s.kayit('veli');
  });
  after(() => s?.kapat());

  test('giriş yapmamış istemci: veri inmez, yazamaz, numara alamaz', async () => {
    const j = await oku(null, 'bayi');
    assert.deepEqual(j.veri, {}); assert.equal(j.oturum, null);
    assert.deepEqual((await s.api('/api/degisen?son=0', undefined, { cerez: null })).json.degisen, []);
    assert.equal((await yaz(null, 'bayi', [['exb-siparisler', '[]']])).durum, 401);
    assert.equal((await s.api('/api/numara', { on: 'EXG' }, { cerez: null })).durum, 401);
  });

  test('oturum çerezi HttpOnly ve SameSite; güvenlik başlıkları var', async () => {
    const r = await s.api('/api/giris', { tur: 'bayi', kul: 'ali', sifre: 'Sifre123' }, { cerez: null, uyg: 'bayi' });
    const c = r.basliklar.get('set-cookie');
    assert.match(c, /HttpOnly/); assert.match(c, /SameSite=Lax/);
    assert.equal(r.basliklar.get('x-content-type-options'), 'nosniff');
    assert.equal(r.basliklar.get('x-frame-options'), 'SAMEORIGIN');
  });

  test('bayi yalnız kendi siparişini ve kendi kişisel anahtarlarını görür', async () => {
    await yaz(ali, 'bayi', [['exb-siparisler', JSON.stringify([siparis(`EXG-${YIL}-0101`, 'ali')])], ['exb-sepet-ali', '[{"id":1}]']]);
    await yaz(veli, 'bayi', [['exb-siparisler', JSON.stringify([siparis(`EXG-${YIL}-0102`, 'veli')])]]);
    const v = await oku(veli, 'bayi');
    assert.deepEqual(al(v.veri, 'exb-siparisler').map(o => o.no), [`EXG-${YIL}-0102`]);
    assert.equal(v.veri['exb-sepet-ali'], undefined);
    assert.deepEqual(Object.keys(al(v.veri, 'exb-kullanicilar')), ['veli'], 'yalnız kendi kullanıcı kaydı');
    assert.equal(al(v.veri, 'exb-kullanicilar').veli.sifre, '••••');
    assert.ok(!Object.keys(v.veri).some(k => k.startsWith('exs-')), 'satış verisi bayiye inmez');
    const d = (await s.api('/api/degisen?son=0', undefined, { cerez: veli, uyg: 'bayi' })).json.degisen.map(x => x[0]);
    assert.ok(!d.includes('exb-sepet-ali'));
    assert.deepEqual(al(Object.fromEntries((await s.api('/api/degisen?son=0', undefined, { cerez: veli, uyg: 'bayi' })).json.degisen), 'exb-siparisler').map(o => o.kul), ['veli']);
  });

  test('bayi kendi siparişini onaylayamaz; satış alanları ve başka bayi adına kayıt kabul edilmez', async () => {
    const no = `EXG-${YIL}-0101`;
    const r = await yaz(ali, 'bayi', [['exb-siparisler', JSON.stringify([siparis(no, 'ali', { durum: 'onay', net: 1, iskonto: 99 }), siparis(`EXG-${YIL}-0150`, 'veli', { net: 5 })])]]);
    const L = sunucuda('exb-siparisler'), o = L.find(x => x.no === no), y = L.find(x => x.no === `EXG-${YIL}-0150`);
    assert.equal(o.durum, 'yeni'); assert.equal(o.net, undefined); assert.equal(o.iskonto, undefined);
    assert.equal(y.kul, 'ali', 'yeni kayıt oturumdaki bayiye yazılır'); assert.equal(y.net, undefined);
    const geri = Object.fromEntries(r.json.birlesen);
    assert.equal(al(geri, 'exb-siparisler').find(x => x.no === no).durum, 'yeni', 'düzeltilmiş hâl istemciye geri gönderilir');
  });

  test('bayi satışa ait anahtarları yazamaz', async () => {
    const r = await yaz(ali, 'bayi', [['exb-cari', '{"ali":{"hareket":[]}}'], ['exs-iskonto', '{"ali":{"oran":50}}'], ['exb-sepet-veli', '[]'], ['exb-kampanya', '[]']]);
    assert.deepEqual(r.json.reddedilen.map(x => x[0]).sort(), ['exb-cari', 'exb-kampanya', 'exb-sepet-veli', 'exs-iskonto']);
    assert.equal(sunucuda('exs-iskonto'), null);
  });

  test('değişiklik talebi: bayi açar, satış karar verir, bayi kararı geri alamaz', async () => {
    const no = `EXG-${YIL}-0101`, L = sunucuda('exb-siparisler');
    L.find(x => x.no === no).durum = 'onay';
    await yaz(s.yoneticiCerez, 'satis', [['exb-siparisler', JSON.stringify(L)]]);
    const ben = () => sunucuda('exb-siparisler').find(x => x.no === no);
    const talep = { id: 't1', tur: 'duzenle', kalemler: [{ id: 21, adet: 5 }], durum: 'bekliyor' };
    await yaz(ali, 'bayi', [['exb-siparisler', JSON.stringify([{ ...ben(), talep, kalemler: [{ id: 21, adet: 999 }], durum: 'iptal' }])]]);
    assert.equal(ben().talep.durum, 'bekliyor'); assert.equal(ben().kalemler[0].adet, 2, 'onaylı siparişte kalem doğrudan değişmez'); assert.equal(ben().durum, 'onay');
    const L2 = sunucuda('exb-siparisler'); L2.find(x => x.no === no).talep.durum = 'reddedildi';
    await yaz(s.yoneticiCerez, 'satis', [['exb-siparisler', JSON.stringify(L2)]]);
    await yaz(ali, 'bayi', [['exb-siparisler', JSON.stringify([{ ...ben(), talep }])]]); // eski (bekliyor) kopya
    assert.equal(ben().talep.durum, 'reddedildi');
    await yaz(ali, 'bayi', [['exb-siparisler', JSON.stringify([{ ...ben(), talep: { ...talep, id: 't2' } }])]]);
    assert.equal(ben().talep.id, 't2', 'karar verildikten sonra yeni talep açılabilir');
  });

  test('numara çakışması: aynı numarayla gelen ikinci sipariş yeniden numaralandırılır', async () => {
    const no = `EXG-${YIL}-0200`;
    await yaz(ali, 'bayi', [['exb-siparisler', JSON.stringify([siparis(no, 'ali')])]]);
    const r = await yaz(veli, 'bayi', [['exb-siparisler', JSON.stringify([siparis(no, 'veli', { tarih: 1800000000000 })])]]);
    const L = sunucuda('exb-siparisler');
    assert.equal(L.find(x => x.no === no).kul, 'ali', 'ilk sipariş korunur');
    const yeni = al(Object.fromEntries(r.json.birlesen), 'exb-siparisler').find(x => x.tarih === 1800000000000);
    assert.notEqual(yeni.no, no); assert.ok(L.some(x => x.no === yeni.no && x.kul === 'veli'), 'ikinci sipariş yeni numarayla kaydedilir');
  });

  test('sunucudan numara: eşzamanlı 20 istek, 20 farklı ardışık numara', async () => {
    const L = await Promise.all(Array.from({ length: 20 }, () => s.api('/api/numara', { on: 'OT' }, { cerez: ali, uyg: 'bayi' })));
    const N = L.map(r => r.json.no);
    assert.equal(new Set(N).size, 20);
    assert.ok(N.every(n => new RegExp(`^OT-${YIL}-\\d{4}$`).test(n)));
    assert.equal((await s.api('/api/numara', { on: 'XYZ' }, { cerez: ali, uyg: 'bayi' })).durum, 400);
  });

  test('dosyalar: dekont diske çıkar; sahibi ve satış görür, başka bayi ve anonim göremez', async () => {
    const png = 'data:image/png;base64,' + crypto.randomBytes(3000).toString('base64');
    await yaz(ali, 'bayi', [['exb-odeme', JSON.stringify([{ no: `OB-${YIL}-001`, kul: 'ali', tutar: 100, durum: 'bekliyor', zaman: 1, dosya: { ad: 'd.png', tip: 'image/png', veri: png } }])]]);
    const od = sunucuda('exb-odeme')[0];
    assert.match(od.dosya.veri, /^api\/dosya\/[0-9a-f]{32}\.png$/);
    const yol = '/' + od.dosya.veri;
    const a = await fetch(s.url + yol, { headers: { Cookie: ali } });
    assert.equal(a.status, 200); assert.equal(a.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await a.arrayBuffer()), Buffer.from(png.split(',')[1], 'base64'));
    assert.equal((await fetch(s.url + yol, { headers: { Cookie: veli } })).status, 404);
    assert.equal((await fetch(s.url + yol)).status, 404);
    assert.equal((await fetch(s.url + yol, { headers: { Cookie: s.yoneticiCerez } })).status, 200);
  });

  test('temsilci yalnız atandığı bayileri görür; yazarken diğer bayilerin verisi korunur', async () => {
    await yaz(s.yoneticiCerez, 'satis', [
      ['exs-musteriler', JSON.stringify({ ali: { kul: 'ali', firma: 'Ali', temsilci: 'temsil' }, veli: { kul: 'veli', firma: 'Veli' } })],
    ]);
    const t = await s.giris('satis', 'temsil', 'Temsil-123');
    assert.match(sunucuda('exs-kullanicilar').temsil.sifre, /^scrypt\$/, 'eski özet ilk girişte scrypt\'e yükseltilir');
    assert.ok(sunucuda('exs-kullanicilar').satis, 'yönetici hesabı silinmedi (kullanıcı sözlüğü birleştirilir)');
    const v = (await oku(t, 'satis')).veri;
    assert.deepEqual([...new Set(al(v, 'exb-siparisler').map(o => o.kul))], ['ali']);
    assert.deepEqual(Object.keys(al(v, 'exs-musteriler')), ['ali']);
    await yaz(t, 'satis', [['exs-musteriler', JSON.stringify({ ali: { kul: 'ali', firma: 'Ali (güncel)', temsilci: 'temsil' } })]]);
    const M = sunucuda('exs-musteriler');
    assert.equal(M.ali.firma, 'Ali (güncel)'); assert.ok(M.veli, 'kapsam dışı bayi korunur');
    const r = await yaz(t, 'satis', [['exs-kullanicilar', JSON.stringify({ temsil: { kul: 'temsil', rol: 'yonetici', sifre: '••••' } })]]);
    assert.equal(r.durum, 200); assert.equal(sunucuda('exs-kullanicilar').temsil.rol, 'temsilci', 'temsilci kendi rolünü yükseltemez');
  });

  test('yönetici kullanıcı listesini maskeli görür; geri yazınca şifre özetleri bozulmaz', async () => {
    const v = (await oku(s.yoneticiCerez, 'satis')).veri, B = al(v, 'exb-kullanicilar');
    assert.ok(Object.values(B).every(u => u.sifre === '••••'));
    const once = sunucuda('exb-kullanicilar').ali.sifre;
    await yaz(s.yoneticiCerez, 'satis', [['exb-kullanicilar', JSON.stringify({ ali: B.ali })]]);
    assert.equal(sunucuda('exb-kullanicilar').ali.sifre, once);
    assert.ok(sunucuda('exb-kullanicilar').veli, 'listede gönderilmeyen bayi silinmez');
  });

  test('eski (tarayıcıda üretilmiş) bayi şifre özetiyle giriş yapılır ve özet yükseltilir', async () => {
    await s.giris('bayi', 'eskibayi', 'Eski-Sifre-1');
    assert.match(sunucuda('exb-kullanicilar').eskibayi.sifre, /^scrypt\$/);
  });

  test('varsayılan 1234 özetli satış hesabı girişe kapalı', async () => {
    const r = await s.api('/api/giris', { tur: 'satis', kul: 'mudur', sifre: '1234' }, { cerez: null, uyg: 'satis' });
    assert.equal(r.durum, 403); assert.match(r.json.hata, /Varsayılan şifre/);
  });

  test('pasife alınan bayinin oturumu kapanır ve giriş yapamaz', async () => {
    const c = await s.kayit('pasifbayi');
    const B = al((await oku(s.yoneticiCerez, 'satis')).veri, 'exb-kullanicilar');
    await yaz(s.yoneticiCerez, 'satis', [['exb-kullanicilar', JSON.stringify({ pasifbayi: { ...B.pasifbayi, durum: 'pasif' } })]]);
    assert.equal((await oku(c, 'bayi')).oturum, null);
    const r = await s.api('/api/giris', { tur: 'bayi', kul: 'pasifbayi', sifre: 'Sifre123' }, { cerez: null, uyg: 'bayi' });
    assert.equal(r.durum, 403);
  });

  test('kayıt doğrulaması: kısa şifre, KVKK onayı, alınmış kullanıcı adı', async () => {
    const k = g => s.api('/api/kayit', { kul: 'yeni1', sifre: 'Sifre123', firma: 'F', ad: 'A', tel: '1', mail: 'a@b.co', kvkk: true, ...g }, { cerez: null, uyg: 'bayi' });
    assert.equal((await k({ sifre: '123' })).durum, 400);
    assert.equal((await k({ kvkk: false })).durum, 400);
    assert.equal((await k({ kul: 'ali' })).durum, 409);
  });

  test('başka siteden gelen yazma isteği reddedilir (CSRF)', async () => {
    const r = await yaz(ali, 'bayi', [['exb-sepet-ali', '[]']], { Origin: 'https://kotu-site.example' });
    assert.equal(r.durum, 403);
  });

  test('sunucu klasörü ve veri dosyaları dışarıya kapalı', async () => {
    for (const y of ['/sunucu/veri.json', '/sunucu/oturumlar.json', '/sunucu/lib/kimlik.js', '/../sunucu/veri.json', '/%2e%2e/sunucu/veri.json']) {
      const r = await fetch(s.url + y);
      assert.ok([403, 404].includes(r.status), `${y} → ${r.status}`);
    }
  });

  test('hatalı giriş sınırı: 5 hatadan sonra doğru şifre de 15 dakika reddedilir', async () => {
    await s.kayit('deneme');
    for (let i = 0; i < 5; i++) assert.equal((await s.api('/api/giris', { tur: 'bayi', kul: 'deneme', sifre: 'yanlis' + i }, { cerez: null, uyg: 'bayi' })).durum, 401);
    const r = await s.api('/api/giris', { tur: 'bayi', kul: 'deneme', sifre: 'Sifre123' }, { cerez: null, uyg: 'bayi' });
    assert.equal(r.durum, 429);
  });

  test('işlem kaydı: giriş, kayıt ve yazmalar sunucuda kayıt altında', async () => {
    await bekle(100);
    const fs = require('node:fs'), path = require('node:path');
    const d = path.join(s.klasor, 'sunucu', 'kayitlar');
    const satirlar = fs.readdirSync(d).flatMap(f => fs.readFileSync(path.join(d, f), 'utf8').trim().split('\n')).map(JSON.parse);
    const olaylar = new Set(satirlar.map(x => x.olay));
    for (const o of ['giriş', 'bayi kaydı', 'yazma', 'red', 'giriş hatalı', 'giriş engellendi']) assert.ok(olaylar.has(o), o);
  });
});

describe('MRP erişimi', () => {
  let m;
  before(async () => { m = await sunucuBaslat({ ortam: { GUVENILIR_VEKIL: '1', MRP_IZINLI_IP: '85.1.2., 90.0.0.1' } }); });
  after(() => m?.kapat());
  test('MRP: dışarıdan girişsiz kapalı; yerel ağ, izinli IP ve satış girişi açık', async () => {
    const d = (ip, ek = {}) => fetch(m.url + '/api/mrp/durum', { headers: { 'X-Forwarded-For': ip, ...ek } }).then(r => r.status);
    assert.equal(await d('8.8.8.8'), 403);
    assert.equal(await d('192.168.1.20'), 200);
    assert.equal(await d('85.1.2.77'), 200, 'izinli IP öneki');
    assert.equal(await d('90.0.0.1'), 200, 'izinli IP');
    assert.equal(await d('8.8.8.8', { Cookie: m.yoneticiCerez }), 200, 'satış paneline giriş yapmış kullanıcı');
    const sayfa = await fetch(m.url + '/mrp', { headers: { 'X-Forwarded-For': '8.8.8.8' } });
    assert.equal(sayfa.status, 403); assert.match(await sayfa.text(), /satış paneline/);
  });
});

describe('Sipariş fiyat denetimi (V4)', () => {
  let f, b;
  before(async () => { f = await sunucuBaslat(); b = await f.kayit('fiyatbayi'); });
  after(() => f?.kapat());
  const ver = async (no, kalemler) => {
    await f.api('/api/veri', { degisen: [['exb-siparisler', JSON.stringify([{ no, kul: 'fiyatbayi', tarih: Date.now(), kalemler, toplam: 1, durum: 'yeni' }])]] }, { cerez: b, uyg: 'bayi' });
    return JSON.parse(f.veri().veri['exb-siparisler']).find(o => o.no === no);
  };
  const yonetici = degisen => f.api('/api/veri', { degisen });

  test('katalog fiyatının altındaki birim fiyat düzeltilir, toplam yeniden hesaplanır', async () => {
    const o = await ver(`EXG-${YIL}-0301`, [kalem(1)]);
    assert.equal(o.kalemler[0].birim, 83); assert.equal(o.toplam, 166);
    assert.deepEqual(o.fiyatKontrol.duzeltme, [{ ad: 'Neo', secenek: 'Fileli', gelen: 1, beklenen: 83 }]);
  });
  test('doğru veya daha yüksek fiyata dokunulmaz; işaret konmaz', async () => {
    const o = await ver(`EXG-${YIL}-0302`, [kalem(83), kalem(90, { secenek: 'Fileli' })]);
    assert.deepEqual(o.kalemler.map(x => x.birim), [83, 90]); assert.equal(o.fiyatKontrol, undefined);
  });
  test('katalogda olmayan ürün veya seçenek fiyatsız (teklif) kaleme çevrilir', async () => {
    const o = await ver(`EXG-${YIL}-0303`, [kalem(5, { id: 9999, ad: 'Yok' }), kalem(5, { secenek: 'Uydurma' })]);
    assert.deepEqual(o.kalemler.map(x => x.birim), [null, null]); assert.equal(o.teklif, true); assert.equal(o.toplam, 0);
  });
  test('kampanya ve satışın fiyat güncellemesi hesaba katılır', async () => {
    await yonetici([['exb-kampanya', JSON.stringify([{ ad: 'Yaz', oran: 10, kapsam: 'tumu', aktif: true }])]]);
    assert.equal((await ver(`EXG-${YIL}-0304`, [kalem(75)])).kalemler[0].birim, 75, 'round(83 × 0,9) = 75 kabul');
    assert.equal((await ver(`EXG-${YIL}-0305`, [kalem(70)])).kalemler[0].birim, 75);
    await yonetici([['exb-fiyat', JSON.stringify({ Neo: { Fileli: 100 } })]]);
    assert.equal((await ver(`EXG-${YIL}-0306`, [kalem(75)])).kalemler[0].birim, 90, 'yeni liste 100, %10 kampanya → 90');
    await yonetici([['exb-kampanya', JSON.stringify([{ ad: 'Başka bayi', oran: 50, kapsam: 'tumu', bayiler: ['baskasi'] }])], ['exb-fiyat', '{}']]);
    assert.equal((await ver(`EXG-${YIL}-0307`, [kalem(42)])).kalemler[0].birim, 83, 'başka bayiye tanımlı kampanya uygulanmaz');
  });
  test('onaylı özel teklif fiyatı yalnız teklif no\'suyla ve teklifin sahibine geçerli', async () => {
    await yonetici([['exb-teklif', JSON.stringify([{ no: `OT-${YIL}-0001`, kul: 'fiyatbayi', durum: 'onaylandi', sandalye: { id: 21 }, fiyat: { sandalye: 60, takim: 240 } }])]]);
    assert.equal((await ver(`EXG-${YIL}-0308`, [kalem(60, { teklif: `OT-${YIL}-0001` })])).kalemler[0].birim, 60);
    assert.equal((await ver(`EXG-${YIL}-0309`, [kalem(60)])).kalemler[0].birim, 83, 'teklif no yoksa katalog fiyatı');
    assert.equal((await ver(`EXG-${YIL}-0310`, [kalem(50, { teklif: `OT-${YIL}-0001` })])).kalemler[0].birim, 60, 'teklif fiyatının altı da düzeltilir');
  });
  test('"yeni" siparişte bayi kalemleri değiştirirse fiyat yeniden denetlenir', async () => {
    const no = `EXG-${YIL}-0302`, o = JSON.parse(f.veri().veri['exb-siparisler']).find(x => x.no === no);
    await f.api('/api/veri', { degisen: [['exb-siparisler', JSON.stringify([{ ...o, kalemler: [kalem(2, { adet: 3 })] }])]] }, { cerez: b, uyg: 'bayi' });
    const y = JSON.parse(f.veri().veri['exb-siparisler']).find(x => x.no === no);
    assert.equal(y.kalemler[0].birim, 83); assert.equal(y.toplam, 249); assert.ok(y.fiyatKontrol);
  });
});

describe('Şifre değiştirme ve sıfırlama', () => {
  let t;
  before(async () => { t = await sunucuBaslat(); });
  after(() => t?.kapat());
  const api = (yol, govde, cerez, uyg = 'bayi') => t.api(yol, govde, { cerez, uyg });

  test('kullanıcı şifresini değiştirir; eski şifre geçersiz olur, diğer oturumları kapanır', async () => {
    const c1 = await t.kayit('sifreci'), c2 = await t.giris('bayi', 'sifreci', 'Sifre123');
    assert.equal((await api('/api/sifre', { eski: 'yanlis', yeni: 'YeniSifre9' }, c1)).durum, 400);
    assert.equal((await api('/api/sifre', { eski: 'Sifre123', yeni: 'kisa' }, c1)).durum, 400);
    const r = await api('/api/sifre', { eski: 'Sifre123', yeni: 'YeniSifre9' }, c1);
    assert.equal(r.durum, 200);
    assert.equal((await api('/api/veri', undefined, c2)).json.oturum, null, 'diğer cihazdaki oturum kapandı');
    const yeniCerez = r.basliklar.get('set-cookie').split(';')[0];
    assert.equal((await api('/api/veri', undefined, yeniCerez)).json.oturum.kul, 'sifreci', 'değiştiren oturum devam eder');
    await assert.rejects(t.giris('bayi', 'sifreci', 'Sifre123'));
    await t.giris('bayi', 'sifreci', 'YeniSifre9');
  });

  test('yönetici geçici şifre üretir; kullanıcı şifresini değiştirene kadar veri göremez ve yazamaz', async () => {
    const eski = await t.kayit('unutkan');
    const r = await t.api('/api/sifre-sifirla', { tur: 'bayi', kul: 'unutkan' });
    assert.equal(r.durum, 200); assert.match(r.json.gecici, /^[A-Za-z0-9]{10}$/);
    assert.equal((await api('/api/veri', undefined, eski)).json.oturum, null, 'açık oturum kapandı');
    await assert.rejects(t.giris('bayi', 'unutkan', 'Sifre123'));
    const c = await t.giris('bayi', 'unutkan', r.json.gecici);
    const v = (await api('/api/veri', undefined, c)).json;
    assert.equal(v.oturum.sifreDegistir, true); assert.deepEqual(v.veri, {});
    assert.equal((await api('/api/veri', { degisen: [['exb-sepet-unutkan', '[]']] }, c)).durum, 403);
    assert.equal((await api('/api/numara', { on: 'EXG' }, c)).durum, 401);
    // satışın elindeki eski kopya (sifreDegistir: true) geri yazılsa da zorunluluk geri gelmez
    const B = JSON.parse((await t.api('/api/veri')).json.veri['exb-kullanicilar']);
    const s2 = await api('/api/sifre', { eski: r.json.gecici, yeni: 'KendiSifrem1' }, c);
    assert.equal(s2.durum, 200);
    await t.api('/api/veri', { degisen: [['exb-kullanicilar', JSON.stringify({ unutkan: B.unutkan })]] });
    const c2 = await t.giris('bayi', 'unutkan', 'KendiSifrem1');
    const v2 = (await api('/api/veri', undefined, c2)).json;
    assert.equal(v2.oturum.sifreDegistir, undefined); assert.ok(v2.veri['exb-kullanicilar']);
  });

  test('yalnız yönetici sıfırlayabilir; kendi şifresini sıfırlayamaz', async () => {
    const bc = await t.kayit('merakli');
    assert.equal((await t.api('/api/sifre-sifirla', { tur: 'bayi', kul: 'unutkan' }, { cerez: bc, uyg: 'bayi' })).durum, 403);
    assert.equal((await t.api('/api/sifre-sifirla', { tur: 'satis', kul: 'satis' })).durum, 400);
    assert.equal((await t.api('/api/sifre-sifirla', { tur: 'bayi', kul: 'olmayan' })).durum, 404);
  });

  test('yeni bayi kaydı satışın işlem kaydına düşer', async () => {
    await t.kayit('kayitbildirim');
    const I = JSON.parse((await t.api('/api/veri')).json.veri['exs-islem']);
    assert.ok(I.some(x => x.olay === 'Yeni bayi kaydı' && x.kim === 'kayitbildirim'));
  });
});

describe('Satış kullanıcıları ve kredi limiti (Faz 1b-2)', () => {
  let u, tc;
  const api = (yol, govde, cerez) => u.api(yol, govde, cerez === undefined ? {} : { cerez, uyg: 'satis' });
  const veri = k => JSON.parse(u.veri().veri[k] || 'null');
  before(async () => { u = await sunucuBaslat(); });
  after(() => u?.kapat());

  test('yönetici temsilci ekler: geçici şifre, ilk girişte zorunlu değişiklik', async () => {
    const r = await api('/api/kullanici-ekle', { kul: 'ayten', ad: 'Ayten Temsilci', rol: 'temsilci' });
    assert.equal(r.durum, 200); assert.match(r.json.gecici, /^[A-Za-z0-9]{10}$/);
    assert.equal(veri('exs-kullanicilar').ayten.rol, 'temsilci');
    const c = await u.giris('satis', 'ayten', r.json.gecici);
    assert.equal((await api('/api/veri', undefined, c)).json.oturum.sifreDegistir, true);
    const d = await api('/api/sifre', { eski: r.json.gecici, yeni: 'Ayten-2026' }, c);
    tc = d.basliklar.get('set-cookie').split(';')[0];
    assert.equal((await api('/api/kullanici-ekle', { kul: 'ayten' })).durum, 409);
    assert.equal((await api('/api/kullanici-ekle', { kul: 'x' })).durum, 400);
    assert.equal((await api('/api/kullanici-ekle', { kul: 'baska' }, tc)).durum, 403, 'temsilci kullanıcı ekleyemez');
  });

  test('senkronla gelen şifre alanı yok sayılır (şifre yalnız sunucu uçlarından)', async () => {
    const once = veri('exs-kullanicilar').ayten.sifre;
    await api('/api/veri', { degisen: [['exs-kullanicilar', JSON.stringify({ ayten: { kul: 'ayten', sifre: sha('exitsatis:123456') }, sahte: { kul: 'sahte', sifre: sha('exitsatis:123456') } })]] });
    assert.equal(veri('exs-kullanicilar').ayten.sifre, once);
    assert.equal(veri('exs-kullanicilar').sahte.sifre, undefined, 'senkronla eklenen kullanıcının şifresi olmaz, giriş yapamaz');
    await assert.rejects(u.giris('satis', 'sahte', '123456'));
  });

  test('yönetici kullanıcı siler; oturumu kapanır; kendini silemez', async () => {
    const r = await api('/api/kullanici-ekle', { kul: 'gecici1', rol: 'temsilci' });
    const c = await u.giris('satis', 'gecici1', r.json.gecici);
    assert.equal((await api('/api/kullanici-sil', { kul: 'gecici1' })).durum, 200);
    assert.equal(veri('exs-kullanicilar').gecici1, undefined);
    assert.equal((await api('/api/veri', undefined, c)).json.oturum, null);
    assert.equal((await api('/api/kullanici-sil', { kul: 'satis' })).durum, 400);
  });

  test('kredi limiti: temsilci limiti aşan siparişi onaylayamaz, yönetici onaylayabilir', async () => {
    const b = await u.kayit('limitbayi');
    const o = { no: `EXG-${YIL}-0500`, kul: 'limitbayi', tarih: 1, kalemler: [{ id: 21, ad: 'Neo', secenek: 'Fileli', adet: 20, birim: 83 }], toplam: 1660, durum: 'yeni' };
    await u.api('/api/veri', { degisen: [['exb-siparisler', JSON.stringify([o])]] }, { cerez: b, uyg: 'bayi' });
    // limit 1000 $, bakiye 0 → 1660 $'lık sipariş limiti aşar
    await api('/api/veri', { degisen: [['exs-cari', JSON.stringify({ limitbayi: { vade: 60, limit: 1000, hareket: [] } })], ['exs-siparisler', JSON.stringify({ [o.no]: o })]] });
    const L = veri('exb-siparisler'), S = veri('exs-siparisler');
    const onayli = x => ({ ...x, durum: 'onay', limitOnay: { kim: 'temsilci', zaman: 1 } });
    const r = await api('/api/veri', { degisen: [['exs-siparisler', JSON.stringify({ ...S, [o.no]: onayli(S[o.no]) })], ['exb-siparisler', JSON.stringify(L.map(x => x.no === o.no ? onayli(x) : x))]] }, tc);
    assert.equal(veri('exs-siparisler')[o.no].durum, 'yeni'); assert.equal(veri('exb-siparisler').find(x => x.no === o.no).durum, 'yeni');
    assert.ok(r.json.reddedilen.some(([, m]) => /kredi limiti/.test(m)), 'temsilciye açıklama döner');
    // limit içinde kalan küçük sipariş onaylanabilir
    await api('/api/veri', { degisen: [['exs-cari', JSON.stringify({ limitbayi: { vade: 60, limit: 5000, hareket: [] } })]] });
    await api('/api/veri', { degisen: [['exs-siparisler', JSON.stringify({ ...S, [o.no]: { ...S[o.no], durum: 'onay' } })]] }, tc);
    assert.equal(veri('exs-siparisler')[o.no].durum, 'onay');
    // yönetici limit aşımında da onaylayabilir (gerekçeyi satış paneli ister)
    await api('/api/veri', { degisen: [['exs-cari', JSON.stringify({ limitbayi: { vade: 60, limit: 10, hareket: [] } })], ['exs-siparisler', JSON.stringify({ ...S, [o.no]: { ...S[o.no], durum: 'yeni' } })]] });
    await api('/api/veri', { degisen: [['exs-siparisler', JSON.stringify({ ...S, [o.no]: { ...S[o.no], durum: 'onay', limitOnay: { kim: 'Yönetici' } } })]] });
    assert.equal(veri('exs-siparisler')[o.no].durum, 'onay');
  });
});

describe('Yapay zekâ aktarımı ve anlık bildirim (Faz 1b-2)', () => {
  let a, sahte, gelen = [];
  before(async () => {
    // sahte Anthropic API: gelen isteği kaydeder, Messages API biçiminde yanıt döner
    const http = require('node:http');
    sahte = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => {
      gelen.push({ yol: q.url, basliklar: q.headers, govde: JSON.parse(b) });
      r.writeHead(200, { 'content-type': 'application/json' });
      r.end(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: '{"guclu":["a"]}' }], usage: { input_tokens: 10, output_tokens: 5 } }));
    }); });
    await new Promise(ok => sahte.listen(0, '127.0.0.1', ok));
    a = await sunucuBaslat({ ortam: { ANTHROPIC_TABAN_URL: `http://127.0.0.1:${sahte.address().port}`, AI_SAATLIK: '3' } });
  });
  after(() => { a?.kapat(); sahte?.close(); });
  const istek = { model: 'claude-opus-5-5', max_tokens: 999999, fallbacks: 'default', output_config: { effort: 'medium' }, system: 'S', messages: [{ role: 'user', content: 'x' }], tools: [{ type: 'web_search_20260209', name: 'web_search' }] };

  test('anahtar yokken istek yapılamaz; anahtarı yalnız yönetici kaydeder, tarayıcıya geri gönderilmez', async () => {
    assert.equal((await a.api('/api/ai/mesaj', istek)).durum, 400);
    assert.equal((await a.api('/api/ai/anahtar', { anahtar: 'yanlis' })).durum, 400);
    const r = await a.api('/api/ai/anahtar', { anahtar: 'sk-ant-test-0123456789abcdefghij' });
    assert.equal(r.durum, 200); assert.equal(r.json.anahtarVar, true);
    const d = await a.api('/api/ai/durum');
    assert.deepEqual(d.json, { anahtarVar: true, kaynak: 'ayarlar' });
    assert.ok(!JSON.stringify((await a.api('/api/veri')).json).includes('sk-ant-test'), 'anahtar senkron verisinde yok');
    const bayi = await a.kayit('aibayi');
    assert.equal((await a.api('/api/ai/mesaj', istek, { cerez: bayi, uyg: 'bayi' })).durum, 401, 'bayi kullanamaz');
  });

  test('istek sunucu anahtarıyla, yalnız izinli alanlar ve 16000 sınırıyla iletilir', async () => {
    const r = await a.api('/api/ai/mesaj', istek);
    assert.equal(r.durum, 200); assert.equal(r.json.content[0].text, '{"guclu":["a"]}');
    const g = gelen.at(-1);
    assert.equal(g.yol, '/v1/messages');
    assert.equal(g.basliklar['x-api-key'], 'sk-ant-test-0123456789abcdefghij');
    assert.equal(g.basliklar['anthropic-beta'], 'server-side-fallback-2026-07-01');
    assert.equal(g.govde.max_tokens, 16000); assert.equal(g.govde.tools, undefined, 'izinsiz alan (araçlar) iletilmez');
    assert.equal(g.govde.fallbacks, 'default');
    assert.equal((await a.api('/api/ai/mesaj', { ...istek, model: 'claude-fable-5-2' })).durum, 400, 'izinsiz model');
  });

  test('saatlik sınır', async () => {
    await a.api('/api/ai/mesaj', istek); await a.api('/api/ai/mesaj', istek);
    assert.equal((await a.api('/api/ai/mesaj', istek)).durum, 429);
  });

  test('anlık bildirim: yazma olunca bağlı istemciye sinyal gider; oturumsuz bağlanılamaz', async () => {
    assert.equal((await fetch(a.url + '/api/olaylar')).status, 401);
    const ac = new AbortController();
    const r = await fetch(a.url + '/api/olaylar', { headers: { Cookie: a.yoneticiCerez, 'X-Exit-Uyg': 'satis' }, signal: ac.signal });
    assert.match(r.headers.get('content-type'), /text\/event-stream/);
    const okuyucu = r.body.getReader(), dec = new TextDecoder(); let metin = '';
    setTimeout(() => a.api('/api/veri', { degisen: [['exs-rapor-hafta', '"2026-W46"']] }), 100);
    const bitis = Date.now() + 5000;
    while (!/data: \d+/.test(metin) && Date.now() < bitis) { const { value, done } = await okuyucu.read(); if (done) break; metin += dec.decode(value); }
    ac.abort();
    assert.match(metin, /data: \d+/);
  });
});

describe('REST API v1 (Faz 1b-2)', () => {
  let v, ali, veli;
  const get = (yol, cerez, uyg = 'bayi') => v.api(yol, undefined, { cerez, uyg });
  before(async () => { v = await sunucuBaslat(); ali = await v.kayit('restali'); veli = await v.kayit('restveli'); });
  after(() => v?.kapat());

  test('oturumsuz erişilemez; /ben şifre bilgisi içermez', async () => {
    assert.equal((await get('/api/v1/katalog', null)).durum, 401);
    const b = (await get('/api/v1/ben', ali)).json;
    assert.equal(b.kul, 'restali'); assert.equal(b.tur, 'bayi'); assert.equal(b.sifre, undefined);
  });

  test('katalog bayiye özel fiyatlarla; gizli ürün bayiye görünmez', async () => {
    await v.api('/api/veri', { degisen: [['exb-kampanya', JSON.stringify([{ ad: 'Ali özel', oran: 20, kapsam: 'urun', hedef: ['Neo'], bayiler: ['restali'] }])], ['exb-gizli', JSON.stringify(['Artemis Bar'])]] });
    const neo = k => k.json.urunler.find(u => u.id === 21).secenekler[0];
    const a = await get('/api/v1/katalog', ali), b = await get('/api/v1/katalog', veli);
    assert.deepEqual([neo(a).liste, neo(a).fiyat, neo(a).kampanya.oran], [83, 66, 20]);
    assert.deepEqual([neo(b).fiyat, neo(b).kampanya], [83, null]);
    assert.ok(!a.json.urunler.some(u => u.ad === 'Artemis Bar'));
    assert.equal(a.json.urunler.length, 72);
  });

  test('sipariş oluşturma: fiyatı sunucu belirler, numara sunucudan, eski ekranlara da yansır', async () => {
    const r = await v.api('/api/v1/siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 3, birim: 1, iskelet: 'Granit' }], adres: 'İzmir' }, { cerez: ali, uyg: 'bayi' });
    assert.equal(r.durum, 201);
    const o = r.json;
    assert.match(o.no, new RegExp(`^EXG-${YIL}-\\d{4}$`)); assert.equal(r.basliklar.get('location'), '/api/v1/siparisler/' + o.no);
    assert.deepEqual([o.kul, o.durum, o.kalemler[0].birim, o.kalemler[0].liste, o.toplam, o.kalemler[0].iskelet], ['restali', 'yeni', 66, 83, 198, 'Granit']);
    // eşitleme ucu (eski bayi portalı) aynı siparişi görür
    const kv = JSON.parse((await get('/api/veri', ali)).json.veri['exb-siparisler']);
    assert.ok(kv.some(x => x.no === o.no));
    // hatalı istekler
    const h = async (g, beklenen) => { const x = await v.api('/api/v1/siparisler', g, { cerez: ali, uyg: 'bayi' }); assert.equal(x.durum, 400, JSON.stringify(g)); assert.match(x.json.hata, beklenen); };
    await h({ kalemler: [] }, /En az bir kalem/);
    await h({ kalemler: [{ id: 9999, adet: 1 }] }, /ürün bulunamadı/);
    await h({ kalemler: [{ id: 21, secenek: 'Yok', adet: 1 }] }, /seçeneği yok/);
    await h({ kalemler: [{ id: 21, secenek: 'Fileli', adet: 0 }] }, /adet/);
    await h({ kalemler: [{ id: 37, secenek: 'Bar sandalye', adet: 1 }] }, /ürün bulunamadı/); // gizli ürün
    await h({ kalemler: [{ id: 21, secenek: 'Fileli', adet: 1, teklif: `OT-${YIL}-0099` }] }, /teklifi bu ürün için geçerli değil/);
    assert.equal((await v.api('/api/v1/siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 1 }] })).durum, 403, 'satış sipariş vermez');
  });

  test('sipariş listesi ve tek sipariş: bayi yalnız kendisininkini görür', async () => {
    await v.api('/api/v1/siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 1 }] }, { cerez: veli, uyg: 'bayi' });
    const a = (await get('/api/v1/siparisler', ali)).json, b = (await get('/api/v1/siparisler', veli)).json;
    assert.ok(a.siparisler.every(o => o.kul === 'restali') && a.toplam === 1);
    assert.ok(b.siparisler.every(o => o.kul === 'restveli') && b.toplam === 1);
    assert.equal((await get('/api/v1/siparisler/' + a.siparisler[0].no, veli)).durum, 404, 'başkasının siparişi');
    assert.equal((await get('/api/v1/siparisler/' + a.siparisler[0].no, ali)).json.kul, 'restali');
    const y = (await get('/api/v1/siparisler?durum=yeni&adet=1&sayfa=2', undefined, 'satis')).json; // yönetici: tümü
    assert.deepEqual([y.toplam, y.siparisler.length, y.sayfa], [2, 1, 2]);
    assert.equal((await get('/api/v1/siparisler?bayi=restveli', undefined, 'satis')).json.siparisler[0].kul, 'restveli');
  });

  test('cari: bayi kendi özetini, satış seçtiği bayininkini görür', async () => {
    await v.api('/api/veri', { degisen: [['exs-cari', JSON.stringify({ restali: { vade: 60, limit: 1000, hareket: [{ tip: 'fatura', tutar: 300, tarih: 1, sip: 'X' }, { tip: 'odeme', tutar: 100, tarih: 2 }] } })]] });
    const c = (await get('/api/v1/cari', ali)).json;
    assert.deepEqual([c.bakiye, c.limit, c.risk, c.kullanilabilir, c.hareketler.length], [200, 1000, 200, 800, 2]);
    assert.equal((await get('/api/v1/cari?bayi=restali', undefined, 'satis')).json.bakiye, 200);
    assert.equal((await get('/api/v1/cari?bayi=restali', veli)).json.bayi, 'restveli', 'bayi parametresi yok sayılır');
  });
});
