// Faz 3b-1: çok kullanıcılı satış ekibi (V3).
//   • Kayıt düzeyinde yazma: istemci yalnız değişen kayıtları gönderir; iki kullanıcının aynı anda farklı kayıtlarda
//     yaptığı değişiklik birbirini ezmez (sözlük, kimlikli liste, sona eklenen işlem kaydı).
//   • Koşullu yazma: aynı ödeme bildirimine/talebe iki kişi karar veremez; ikincisi 409 alır, hiçbir şey yazılmaz.
//   • Canlı veri: başka kullanıcının değişikliği açık satış ekranına sayfa yenilenmeden gelir.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla } = require('./yardimci');

let s, bayiC, ikinci;
const veri = k => { const v = s.veri().veri[k]; return v == null ? undefined : JSON.parse(v); };
const yaz = (govde, cerez) => s.api('/api/veri', govde, cerez ? { cerez } : {});
async function bekle(f, sure = 8000) {
  const bitis = Date.now() + sure; let son;
  while (Date.now() < bitis) { son = await f(); if (son) return son; await new Promise(r => setTimeout(r, 120)); }
  assert.fail('beklenen duruma gelmedi');
}

describe('Eşzamanlı yazma (Faz 3b)', () => {
  before(async () => {
    s = await sunucuBaslat();
    bayiC = await s.kayit('esbayi');
    // ikinci satış kullanıcısı (aynı kullanıcıyla iki oturum açılamaz: yeni giriş eskisini kapatır)
    const r = await s.api('/api/kullanici-ekle', { kul: 'ikinci', ad: 'İkinci Yönetici', rol: 'yonetici' });
    const c = await s.giris('satis', 'ikinci', r.json.gecici);
    assert.equal((await s.api('/api/sifre', { eski: r.json.gecici, yeni: 'Ikinci-2026' }, { cerez: c })).durum, 200);
    ikinci = await s.giris('satis', 'ikinci', 'Ikinci-2026');
  });
  after(() => s?.kapat());

  describe('sunucu: yama ve koşul', () => {
    test('sözlük yaması: iki kullanıcı farklı girdileri değiştirir, ikisi de kalır; silme yalnız istenen girdiyi siler', async () => {
      await yaz({ degisen: [['exs-crm', JSON.stringify({ a: [1], b: [2], c: [3] })]] });
      const r1 = await yaz({ degisen: [], yama: [['exs-crm', { s: { koy: { a: [1, 'x'] }, sil: [] } }]] });
      const r2 = await yaz({ degisen: [], yama: [['exs-crm', { s: { koy: { b: [2, 'y'], d: [4] }, sil: ['c'] } }]] }, ikinci);
      assert.equal(r1.durum, 200); assert.equal(r2.durum, 200);
      assert.deepEqual(veri('exs-crm'), { a: [1, 'x'], b: [2, 'y'], d: [4] });
      // yamalı anahtarda son hâl her zaman döner (istemcinin elindeki değer bilinmez)
      assert.deepEqual(JSON.parse(new Map(r2.json.birlesen).get('exs-crm')), { a: [1, 'x'], b: [2, 'y'], d: [4] });
    });

    test('liste yaması: kayıt yerinde değişir, yenisi eklenir; temsilci kapsam dışı kaydı değiştiremez', async () => {
      await yaz({ degisen: [['exb-numune', JSON.stringify([{ no: 'NMN-1', kul: 'esbayi', durum: 'yeni' }, { no: 'NMN-2', kul: 'baska', durum: 'yeni' }])]] });
      await yaz({ degisen: [], yama: [['exb-numune', { l: 'no', koy: [{ no: 'NMN-1', kul: 'esbayi', durum: 'gonderildi' }], sil: [] }]] });
      await yaz({ degisen: [], yama: [['exb-numune', { l: 'no', koy: [{ no: 'NMN-2', kul: 'baska', durum: 'hazirlaniyor' }], sil: [] }]] }, ikinci);
      assert.deepEqual(veri('exb-numune').map(x => x.durum), ['gonderildi', 'hazirlaniyor']);
    });

    test('bayinin yaması yalnız kendi görünümüne uygulanır (başka bayinin kaydı yeni kayıt sayılmaz)', async () => {
      await yaz({ degisen: [['exb-hatirlat', JSON.stringify([{ id: 'm1', kul: 'esbayi', metin: 'a', okundu: false }, { id: 'm2', kul: 'baska', metin: 'b', okundu: false }])]] });
      const r = await s.api('/api/veri', { degisen: [], yama: [['exb-hatirlat', { l: 'id', koy: [{ id: 'm1', kul: 'esbayi', metin: 'değişti', okundu: 123 }], sil: [] }]] }, { cerez: bayiC, uyg: 'bayi' });
      assert.equal(r.durum, 200);
      const M = veri('exb-hatirlat');
      assert.equal(M.length, 2); assert.equal(M[0].okundu, 123); assert.equal(M[0].metin, 'a', 'bayi mesaj metnini değiştiremez'); assert.equal(M[1].okundu, false);
      assert.deepEqual(JSON.parse(new Map(r.json.birlesen).get('exb-hatirlat')).map(x => x.id), ['m1'], 'bayiye yalnız kendi kaydı döner');
    });

    test('sona ekleme yaması: işlem kaydına sunucunun eklediği satır ("Yeni bayi kaydı") kaybolmaz; sınır korunur', async () => {
      const once = veri('exs-islem') || [];
      await s.kayit('esbayi2'); // sunucu işlem kaydına "Yeni bayi kaydı" ekler; satış bunu henüz görmedi
      await yaz({ degisen: [], yama: [['exs-islem', { e: [{ t: 1, olay: 'Satıştan' }], n: 0 }]] });
      const L = veri('exs-islem');
      assert.equal(L.length, once.length + 2);
      assert.ok(L.some(x => x.olay === 'Yeni bayi kaydı' && x.kim === 'esbayi2')); assert.equal(L.at(-1).olay, 'Satıştan');
      await yaz({ degisen: [], yama: [['exs-islem', { e: [{ t: 2, olay: 'Son' }], n: 3 }]] });
      assert.deepEqual(veri('exs-islem').map(x => x.olay).slice(-1), ['Son']); assert.equal(veri('exs-islem').length, 3);
    });

    test('geçersiz yama reddedilir, diğer değişiklikler yazılır', async () => {
      const r = await yaz({ degisen: [['exs-kur', JSON.stringify({ TRY: 40 })]], yama: [['exs-crm', { x: 1 }], ['exs-crm', 'metin']] });
      assert.equal(r.durum, 200); assert.equal(r.json.reddedilen.filter(x => x[1] === 'geçersiz yama').length, 2);
      assert.equal(veri('exs-kur').TRY, 40);
    });

    test('koşullu yazma: koşul tutmazsa hiçbir anahtar yazılmaz ve son hâl döner', async () => {
      await yaz({ degisen: [['exb-odeme', JSON.stringify([{ no: 'OB-1', kul: 'esbayi', durum: 'bekliyor', tutar: 10 }])], ['exs-cari', '{}']] });
      const K = [{ k: 'exb-odeme', a: 'no', id: 'OB-1', yol: 'durum', esit: 'bekliyor' }];
      const onay = (kim, c) => yaz({ degisen: [], kosul: K, yama: [
        ['exb-odeme', { l: 'no', koy: [{ no: 'OB-1', kul: 'esbayi', durum: 'onaylandi', tutar: 10, kim }], sil: [] }],
        ['exs-cari', { s: { koy: { esbayi: { hareket: [{ tip: 'odeme', tutar: 10, kim }] } }, sil: [] } }]] }, c);
      const [a, b] = await Promise.all([onay('A'), onay('B', ikinci)]);
      assert.deepEqual([a.durum, b.durum].sort(), [200, 409]);
      const red = a.durum === 409 ? a : b, kazanan = a.durum === 200 ? 'A' : 'B';
      assert.match(red.json.hata, /başka bir kullanıcı/);
      assert.deepEqual(red.json.birlesen.map(x => x[0]).sort(), ['exb-odeme', 'exs-cari']);
      assert.equal(veri('exb-odeme')[0].kim, kazanan);
      assert.equal(veri('exs-cari').esbayi.hareket.length, 1, 'tahsilat cariye bir kez düşer');
      // iç içe alan ve "alan yok" koşulu; bulunamayan kayıt koşulu tutmaz
      assert.equal((await yaz({ degisen: [['exs-kur', '{"TRY":41}']], kosul: [{ k: 'exb-odeme', a: 'no', id: 'OB-1', yol: 'talep.durum', esit: null }] })).durum, 200);
      assert.equal((await yaz({ degisen: [['exs-kur', '{"TRY":42}']], kosul: [{ k: 'exb-odeme', a: 'no', id: 'YOK', yol: 'durum', esit: 'bekliyor' }] })).durum, 409);
      assert.equal(veri('exs-kur').TRY, 41);
    });
  });

  describe('satış paneli: iki kullanıcı aynı anda', () => {
    let tarayici, A, B, hataA, hataB, OD;
    const ac = async cerez => {
      const c = await tarayici.newContext({ viewport: { width: 1440, height: 900 } });
      const [ad, deger] = cerez.split('=');
      await c.addCookies([{ name: ad, value: deger, url: s.url }]);
      const p = await c.newPage(); await p.goto(s.url + '/satis');
      await p.waitForFunction(() => window.EXIT_OTURUM && typeof window.git === 'function');
      await p.locator('#uyg').waitFor({ state: 'visible' });
      return p;
    };
    before(async () => {
      // bayi iki sipariş ve iki ödeme bildirimi gönderir
      for (const adet of [2, 3]) assert.equal((await s.api('/api/v1/siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet }] }, { cerez: bayiC, uyg: 'bayi' })).durum, 201);
      OD = [];
      for (const tutar of [100, 200]) OD.push((await s.api('/api/v1/odemeler', { tutar }, { cerez: bayiC, uyg: 'bayi' })).json.no);
      s.yoneticiCerez = await s.giris('satis', 'satis', require('./yardimci').YONETICI_SIFRE);
      tarayici = await chromium.launch();
      A = await ac(s.yoneticiCerez); B = await ac(ikinci);
      hataA = hataTopla(A); hataB = hataTopla(B);
      for (const p of [A, B]) await p.waitForFunction(() => Object.keys(SIP).length >= 2);
      // açılışta satış paneli bayi siparişlerini kendi listesine alıp yazar; bu ilk yazmanın bitmesi beklenir
      await bekle(() => Object.keys(veri('exs-siparisler') || {}).length === 2);
      await new Promise(r => setTimeout(r, 700));
    });
    after(async () => { await tarayici?.close(); });

    test('iki kullanıcı farklı siparişlerin durumunu aynı anda değiştirir: ikisi de kalır', async () => {
      const [n1, n2] = await A.evaluate(() => Object.keys(SIP).sort());
      await Promise.all([A.evaluate(n => durumYaz(n, 'iptal'), n1), B.evaluate(n => durumYaz(n, 'iptal'), n2)]);
      const S = await bekle(() => { const S = veri('exs-siparisler'); return S && S[n1].durum === 'iptal' && S[n2].durum === 'iptal' && S; });
      assert.equal(S[n1].durum, 'iptal'); assert.equal(S[n2].durum, 'iptal');
      const P = veri('exb-siparisler');
      assert.deepEqual(P.map(x => x.durum), ['iptal', 'iptal'], 'bayinin gördüğü durum da ikisinde değişti');
    });

    test('canlı veri: diğer kullanıcının değişikliği açık ekrana sayfa yenilenmeden gelir', async () => {
      const no = await A.evaluate(() => Object.keys(SIP).sort()[0]);
      await A.evaluate(() => git('siparisler'));
      await B.evaluate(n => { SIP[n].satisNot = 'B yazdı'; yaz('exs-siparisler', SIP); }, no);
      await A.waitForFunction(n => SIP[n].satisNot === 'B yazdı', no, { timeout: 5000 });
      // A'nın sonraki (bellekten) yazması B'nin değişikliğini geri almaz
      const no2 = await A.evaluate(() => Object.keys(SIP).sort()[1]);
      await B.evaluate(n => { SIP[n].satisNot = 'B ikinci'; yaz('exs-siparisler', SIP); }, no);
      await A.evaluate(n => { SIP[n].satisNot = 'A yazdı'; yaz('exs-siparisler', SIP); }, no2);
      const S = await bekle(() => { const S = veri('exs-siparisler'); return S[no2].satisNot === 'A yazdı' && S[no].satisNot === 'B ikinci' && S; });
      assert.equal(S[no].satisNot, 'B ikinci');
    });

    test('aynı ödeme bildirimine iki kişi aynı anda "Tahsilat olarak işle" der: cariye bir kez düşer', async () => {
      for (const p of [A, B]) { await p.evaluate(() => git('odemeler')); await p.locator(`[data-oi="${OD[0]}"]`).waitFor(); }
      await Promise.all([A.click(`[data-oi="${OD[0]}"]`), B.click(`[data-oi="${OD[0]}"]`)]);
      await bekle(() => veri('exb-odeme').find(x => x.no === OD[0]).durum === 'onaylandi');
      const tost = await bekle(async () => { for (const p of [A, B]) { const t = await p.locator('.toast', { hasText: 'bu arada' }).count(); if (t) return p; } return null; });
      assert.ok(tost);
      await new Promise(r => setTimeout(r, 800));
      const H = (veri('exs-cari').esbayi?.hareket || []).filter(h => h.tip === 'odeme' && (h.aciklama || '').includes(OD[0]));
      assert.equal(H.length, 1, 'tahsilat bir kez');
      assert.equal(veri('exb-cari').esbayi.hareket.filter(h => h.aciklama && h.aciklama.includes(OD[0])).length, 1);
      // kaybeden ekranın bellekteki carisi de sunucudakine döner (yanlış bakiye gösterilmez)
      for (const p of [A, B]) await p.waitForFunction(no => (CARI.esbayi.hareket || []).filter(h => (h.aciklama || '').includes(no)).length === 1, OD[0], { timeout: 5000 });
    });

    test('ikinci ödeme reddedilir; aynı anda başka kayıtta çalışan kullanıcı etkilenmez', async () => {
      await A.click(`[data-or="${OD[1]}"]`); await A.fill('#rNed', 'Dekont okunmuyor');
      await Promise.all([A.click('#rKay'), B.evaluate(() => { CRM.esbayi = [{ tarih: Date.now(), not: 'aradım' }]; yaz('exs-crm', CRM); })]);
      const o = await bekle(() => veri('exb-odeme').find(x => x.no === OD[1] && x.durum === 'reddedildi'));
      assert.equal(o.redNot, 'Dekont okunmuyor');
      await bekle(() => (veri('exs-crm').esbayi || []).length === 1);
    });

    test('sayfa hatası yok', () => { assert.deepEqual(hataA, []); assert.deepEqual(hataB, []); });
  });
});
