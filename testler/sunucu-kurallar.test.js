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
          'exs-kullanicilar': JSON.stringify({ mudur: { kul: 'mudur', ad: 'Müdür', rol: 'yonetici', sifre: sha('exitsatis:1234') } }),
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
      ['exs-kullanicilar', JSON.stringify({ temsil: { kul: 'temsil', ad: 'Temsilci', rol: 'temsilci', sifre: sha('exitsatis:Temsil-123') } })],
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
