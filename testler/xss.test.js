// G8 (Faz 2): bayinin girdiği metinler hiçbir ekranda kod olarak çalışmamalı.
// Bayiler kendi kendine kayıt olabildiği için kötü niyetli bir bayi, firma adına, sipariş notuna,
// ödeme açıklamasına… HTML/JS yazarak satış yöneticisinin oturumunda kod çalıştırmayı deneyebilir.
// Bu test böyle bir bayiyi taklit eder: her metin alanına aynı anda düz metin, çift tırnaklı ve tek
// tırnaklı öznitelik bağlamlarından çıkan bir yük yazar, sonra satış panelinin ve bayi sitesinin
// bütün sayfalarını açar. Yük çalışırsa window.__xss dolar.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla } = require('./yardimci');

const Y = n => `X"'><img/src=x/onerror=__x(${n})>`; // boşluksuz: e-posta denetiminden de geçer
const yakala = () => { window.__xss = []; window.__x = n => window.__xss.push(n); };
// ekranda düz metin olarak görünen yüklerin numaraları (testin gerçekten o alanları gösterdiğini kanıtlar)
const gorunen = p => p.evaluate(() => [...new Set([...document.body.innerText.matchAll(/onerror=__x\((\d+)\)/g)].map(m => +m[1]))]);
const KAPSAM = { satis: new Set(), bayi: new Set() };

describe('XSS (G8): bayi girdileri kod olarak çalışmaz', () => {
  let s, b, cerez, siparisNo;
  before(async () => {
    s = await sunucuBaslat();
    // kayıt: bütün profil alanları yük
    const r = await s.api('/api/kayit', { kul: 'kotu', sifre: 'Kotu-Sifre-1', firma: Y(1), ad: Y(2), tel: Y(3), mail: Y(4) + '@a.co', sehir: Y(5), vergi: Y(6), kvkk: true }, { cerez: null, uyg: 'bayi' });
    assert.equal(r.durum, 201, r.metin);
    cerez = r.basliklar.get('set-cookie').split(';')[0];
    const z = Date.now(), kalem = { id: 21, ad: Y(10), secenek: 'Fileli', sinif: Y(11), iskelet: Y(12), file: Y(13), kumas: Y(14), fitil: Y(15), not: Y(16), adet: 2, birim: 66, kampanya: Y(17) };
    const yaz = async (anahtar, deger) => { const x = await s.api('/api/veri', { degisen: [[anahtar, JSON.stringify(deger)]] }, { cerez, uyg: 'bayi' }); assert.equal(x.durum, 200, x.metin); return x.json; };
    await yaz('exb-siparisler', [{ no: 'EXG-2026-0001', kul: 'kotu', firma: Y(20), ad: Y(21), tarih: z, kalemler: [kalem], toplam: 132, adres: Y(22), proje: Y(23), durum: 'yeni',
      talep: { id: 't1', tur: 'duzenle', kalemler: [kalem], not: Y(24), zaman: z, durum: 'bekliyor', durumAnda: 'yeni' } }]);
    siparisNo = JSON.parse(s.veri().veri['exb-siparisler'])[0].no;
    await yaz('exb-odeme', [{ no: 'OB-2026-0001', kul: 'kotu', firma: Y(30), ad: Y(31), tutar: 10, tarih: '2026-11-12', yontem: Y(32), ref: Y(33), not: Y(34), dosya: 'javascript:__x(35)', durum: 'bekliyor', zaman: z, siparis: siparisNo }]);
    await yaz('exb-numune', [{ no: 'NMN-2026-0001', kul: 'kotu', firma: Y(40), ad: Y(41), tel: Y(42), tur: [Y(43)], urun: Y(44), adet: 1, kod: Y(45), adres: Y(46), not: Y(47), durum: 'yeni', zaman: z }]);
    await yaz('exb-teklif', [{ no: 'OT-2026-0001', kul: 'kotu', firma: Y(50), ad: Y(51), zaman: z, oran: 1, takim: 5, hedef: null, termin: Y(52), not: Y(53), durum: 'bekliyor', masa: null,
      sandalye: { id: 21, ad: Y(54), kategori: Y(55), secenek: Y(56), iskelet: Y(57), file: Y(58), kumas: Y(59) } }]);
    await yaz('exb-iade', [{ id: 'ia1', no: 'IAD-2026-0001', kul: 'kotu', firma: Y(60), sip: siparisNo, urun: Y(61), adet: 1, tur: Y(62), aciklama: Y(63), foto: ['x"><img/src=x/onerror=__x(64)>', 'javascript:__x(65)'], durum: 'yeni', zaman: z, gecmis: [{ zaman: z, durum: 'yeni', kim: Y(66) }] }]);
    await yaz('exb-hatirlat', [{ id: 'h1', metin: Y(70), tarih: '2026-12-01', zaman: z }]);
    await yaz('exb-proje-kotu', [{ id: 'p1', ad: Y(80), kalemler: [kalem], tarih: z, guncel: z, siparisler: [] }]);
    await yaz('exb-adres-kotu', [{ id: 'a1', ad: Y(81), adres: Y(82), il: Y(83), yetkili: Y(84), tel: Y(85), varsayilan: true }]);
    b = await chromium.launch();
  });
  after(async () => { await b?.close(); s?.kapat(); });

  test('sunucu dosya alanlarına data URI ve /api/dosya dışında değer yazdırmaz', () => {
    const V = s.veri().veri, od = JSON.parse(V['exb-odeme'])[0], ia = JSON.parse(V['exb-iade'])[0];
    assert.ok(!od.dosya, 'ödeme dekontu javascript: adresi kalmamalı: ' + od.dosya);
    assert.deepEqual(ia.foto, [], 'iade fotoğrafı yalnız dosya olabilir: ' + JSON.stringify(ia.foto));
  });

  test('satış paneli: bütün sayfalar ve kötü bayinin kayıtları açılınca kod çalışmaz', async () => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const [k, v] = s.yoneticiCerez.split('=');
    await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    await ctx.addInitScript(yakala);
    const p = await ctx.newPage(), H = hataTopla(p);
    p.on('dialog', d => d.dismiss());
    await p.goto(s.url + '/satis'); await p.locator('aside button.m[data-s]').first().waitFor();
    const menu = await p.$$eval('aside button.m[data-s]', L => L.map(x => x.dataset.s));
    for (const m of menu) { await p.click(`aside button.m[data-s="${m}"]`); await p.waitForTimeout(150); (await gorunen(p)).forEach(n => KAPSAM.satis.add(n)); }
    await p.evaluate(no => { git('siparisler'); siparisAc(no); }, siparisNo); await p.waitForTimeout(300);
    for (const e of await p.$$('.perde details, .perde summary')) await e.click().catch(() => {});
    (await gorunen(p)).forEach(n => KAPSAM.satis.add(n));
    await p.evaluate(() => { document.querySelectorAll('.perde').forEach(x => x.remove()); git('musteriler'); musteriKarti('kotu'); }); await p.waitForTimeout(300);
    // açılan pencerelerdeki sekme ve ayrıntı düğmelerine de tıkla (iade fotoğrafı, dekont, talep)
    (await gorunen(p)).forEach(n => KAPSAM.satis.add(n));
    for (const sec of ['.perde [data-sekme]', '.perde button.sekme', 'details']) for (const e of await p.$$(sec)) { await e.click().catch(() => {}); }
    await p.waitForTimeout(300); (await gorunen(p)).forEach(n => KAPSAM.satis.add(n));
    console.log('  satış panelinde görünen alanlar:', [...KAPSAM.satis].sort((a, b) => a - b).join(' '));
    // test anlamlı kalsın: yükler gerçekten ekrana basılmış olmalı (bugün 40 alan)
    assert.ok(KAPSAM.satis.size >= 35, 'satış panelinde yalnız ' + KAPSAM.satis.size + ' alan göründü');
    const x = await p.evaluate(() => window.__xss);
    assert.deepEqual(x, [], 'satış panelinde çalışan yükler: ' + x.join(', '));
    assert.deepEqual(H.filter(h => !/__x|x:1/.test(h)), []);
    await ctx.close();
  });

  test('bayi sitesi: bütün sayfalar açılınca kod çalışmaz', async () => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const [k, v] = cerez.split('=');
    await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    await ctx.addInitScript(yakala);
    const p = await ctx.newPage(), H = hataTopla(p);
    p.on('dialog', d => d.dismiss());
    for (const yol of ['/katalog', '/siparisler', '/siparisler/' + siparisNo, '/cari', '/belgeler', '/odeme', '/ozel-teklif', '/projeler', '/sepet']) {
      await p.goto(s.url + yol); await p.waitForTimeout(400); (await gorunen(p)).forEach(n => KAPSAM.bayi.add(n));
    }
    await p.goto(s.url + '/belgeler'); await p.waitForTimeout(200);
    for (const e of await p.$$('#s-belgeler button')) { await e.click().catch(() => {}); await p.waitForTimeout(80); }
    await p.click('#hBildirim').catch(() => {}); await p.waitForTimeout(200);
    await p.click('.h-firma'); await p.click('#hHat').catch(() => {}); await p.waitForTimeout(200); (await gorunen(p)).forEach(n => KAPSAM.bayi.add(n));
    console.log('  bayi sitesinde görünen alanlar:', [...KAPSAM.bayi].sort((a, b) => a - b).join(' '));
    const x = await p.evaluate(() => window.__xss);
    assert.deepEqual(x, [], 'bayi sitesinde çalışan yükler: ' + x.join(', '));
    assert.deepEqual(H.filter(h => !/__x|x:1/.test(h)), []);
    await ctx.close();
  });
});
