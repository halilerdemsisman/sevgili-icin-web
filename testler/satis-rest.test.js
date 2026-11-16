// Faz 3b-2 (adım 4): satış okumaları REST'ten, açılışta eşzamanlı istek yok.
//   • Satış paneli bayi kayıt listelerini (siparişler, ödemeler, iadeler, numuneler, teklifler, mesajlar) REST liste
//     uçlarından okur. Eşitleme ucu ?kapsam=rest ile bu listeleri göndermez; değişince kaynak imzası gelir ve imza
//     GET'teki ETag ile aynıdır. Temsilcinin imzası kapsamı dışındaki bayinin değişikliğiyle değişmez.
//   • İki uygulama da açılışta sayfayı donduran (eşzamanlı) istek yapmaz; veri gelene kadar giriş formu, oturum
//     açıkken görünmez.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla, YONETICI_SIFRE } = require('./yardimci');

let s, b, c1, c2, tc;
const bayi = (yol, govde, c = c1) => s.api('/api/v1/' + yol, govde, { cerez: c, uyg: 'bayi' });
const siparis = (c = c1, adet = 2) => bayi('siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet }], adres: 'İzmir' }, c);
// eşzamanlı XMLHttpRequest çağrılarını sayar
const IZLE = () => { window.__esz = 0; const o = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function (m, u, a) { if (a === false) window.__esz++; return o.apply(this, arguments); }; };

describe('Satış okumaları REST\'ten (Faz 3b-2 adım 4)', () => {
  before(async () => {
    s = await sunucuBaslat();
    c1 = await s.kayit('rsbayi'); c2 = await s.kayit('rsbayi2');
    assert.equal((await siparis()).durum, 201); assert.equal((await siparis(c2)).durum, 201);
    assert.equal((await bayi('odemeler', { tutar: 50, ref: 'R1' })).durum, 201);
    // temsilci: yalnız rsbayi atanmış
    const r = await s.api('/api/kullanici-ekle', { kul: 'rstem', ad: 'Temsilci', rol: 'temsilci' });
    const c = await s.giris('satis', 'rstem', r.json.gecici);
    tc = (await s.api('/api/sifre', { eski: r.json.gecici, yeni: 'Rstem-2026' }, { cerez: c })).basliklar.get('set-cookie').split(';')[0];
    const M = JSON.parse(s.veri().veri['exs-musteriler'] || '{}');
    assert.equal((await s.api('/api/veri', { degisen: [['exs-musteriler', JSON.stringify({ ...M, rsbayi: { ...(M.rsbayi || {}), kul: 'rsbayi', temsilci: 'rstem' }, rsbayi2: { ...(M.rsbayi2 || {}), kul: 'rsbayi2' } })]] })).durum, 200);
    b = await chromium.launch();
  });
  after(async () => { await b?.close(); s?.kapat(); });

  test('eşitleme ucu ?kapsam=rest kayıt listelerini göndermez; liste uçları ETag verir', async () => {
    const tam = (await s.api('/api/veri')).json.veri, rest = (await s.api('/api/veri?kapsam=rest')).json.veri;
    for (const k of ['exb-siparisler', 'exb-odeme']) { assert.ok(k in tam); assert.ok(!(k in rest), k + ' REST\'ten okunur'); }
    assert.ok('exs-musteriler' in rest && 'exb-kullanicilar' in rest, 'satışın kendi verisi eşitleme ucunda');
    const L = await s.api('/api/v1/siparisler?adet=200');
    assert.equal(L.json.toplam, 2); assert.match(L.basliklar.get('etag'), /^"[\w-]{16}"$/);
    assert.equal((await s.api('/api/v1/siparisler?durum=yeni')).basliklar.get('etag'), null, 'süzgeçli istekte imza yok');
    // bayi siparişi: eşitleme ucu değeri değil imzayı gönderir; imza yeni GET'teki ETag ile aynı
    const z = (await s.api('/api/veri?kapsam=rest')).json.zaman;
    assert.equal((await siparis(c1, 5)).durum, 201);
    const d = (await s.api('/api/degisen?kapsam=rest&son=' + z)).json;
    assert.ok(!d.degisen.some(([k]) => k === 'exb-siparisler'));
    const im = new Map(d.kaynaklar); assert.ok(im.has('siparisler'));
    assert.equal(im.get('siparisler'), (await s.api('/api/v1/siparisler')).basliklar.get('etag'));
    // kapsamsız (eski istemci) eşitleme ucu eskisi gibi
    assert.ok((await s.api('/api/degisen?son=' + z)).json.degisen.some(([k]) => k === 'exb-siparisler'));
  });

  test('temsilci yalnız kendi bayilerinin kayıtlarını okur; başka bayinin siparişi imzasını değiştirmez', async () => {
    const t = (yol, c = tc) => s.api(yol, undefined, { cerez: c });
    const L = await t('/api/v1/siparisler');
    assert.ok(L.json.siparisler.length > 0 && L.json.siparisler.every(o => o.kul === 'rsbayi'));
    const z = (await t('/api/veri?kapsam=rest')).json.zaman, e1 = L.basliklar.get('etag');
    assert.equal((await siparis(c2, 7)).durum, 201);
    const d = (await t('/api/degisen?kapsam=rest&son=' + z)).json;
    assert.equal(new Map(d.kaynaklar).get('siparisler'), e1, 'kapsam dışındaki sipariş temsilcinin listesini değiştirmez');
    assert.notEqual((await s.api('/api/v1/siparisler')).basliklar.get('etag'), e1, 'yöneticinin listesi değişti');
  });

  test('satış paneli: açılışta eşzamanlı istek yok; listeler REST\'ten gelir; yeni sipariş yenilemeden düşer', async () => {
    const ctx = await b.newContext(); const [k, v] = s.yoneticiCerez.split('='); await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    await ctx.addInitScript(IZLE);
    const p = await ctx.newPage(), H = hataTopla(p), istek = [];
    p.on('request', r => istek.push(r.url().replace(s.url, ''))); const getler = []; p.on('request', r => r.method() === 'GET' && getler.push(r.url().replace(s.url, '')));
    await p.goto(s.url + '/satis'); await p.locator('#uyg:not(.gizli)').waitFor();
    assert.equal(await p.evaluate(() => window.__esz), 0, 'eşzamanlı XMLHttpRequest yok');
    assert.ok(istek.some(u => /^(\/satis)?\/api\/veri\?kapsam=rest$/.test(u)), istek.join(' '));
    for (const y of ['siparisler', 'odemeler', 'iadeler', 'numuneler', 'teklifler', 'hatirlatmalar']) assert.ok(istek.some(u => new RegExp('^(/satis)?/api/v1/' + y + '\\?').test(u)), y);
    assert.equal(await p.evaluate(() => oku('exb-siparisler', []).length), 4);
    assert.equal(await p.evaluate(() => window.EXIT_BELLEK), true);
    // bayi sipariş verir: liste sayfa yenilenmeden gelir, eşitleme ucundan bütün veri yeniden inmez
    const n = getler.length, no = (await siparis(c1, 9)).json.no;
    await p.waitForFunction(no => oku('exb-siparisler', []).some(o => o.no === no), no, { timeout: 8000 });
    assert.ok(!getler.slice(n).some(u => /api\/veri/.test(u)), getler.slice(n).join(' '));
    // satışın yazması eskisi gibi eşitleme ucundan (yama) gider ve sunucuya ulaşır
    await p.evaluate(no => { const L = oku('exb-siparisler', []); L.find(o => o.no === no).termin = '2099-01-01'; yaz('exb-siparisler', L); }, no);
    await p.waitForTimeout(700);
    assert.equal(JSON.parse(s.veri().veri['exb-siparisler']).find(o => o.no === no).termin, '2099-01-01');
    assert.deepEqual(H, []);
    await ctx.close();
  });

  test('oturum açıkken yeni sekmede giriş formu veri gelene kadar görünmez; çıkışta görünür', async () => {
    const GOZLE = () => { window.__giris = []; const bak = () => { const g = document.getElementById('giris'); if (g && document.body) window.__giris.push(g.checkVisibility({ visibilityProperty: true }) && !g.classList.contains('gizli')); if (!document.querySelector('#uyg:not(.gizli)') || window.__giris.length < 5) requestAnimationFrame(bak); }; requestAnimationFrame(bak); };
    const ctx = await b.newContext(); const [k, v] = s.yoneticiCerez.split('='); await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    const p0 = await ctx.newPage(); await p0.goto(s.url + '/satis'); await p0.locator('#uyg:not(.gizli)').waitFor();
    await ctx.addInitScript(GOZLE);
    const p = await ctx.newPage(), H = hataTopla(p);
    await p.goto(s.url + '/satis'); await p.locator('#uyg:not(.gizli)').waitFor();
    const L = await p.evaluate(() => window.__giris);
    assert.ok(L.length > 0 && !L.includes(true), 'giriş formu görünmemeli: ' + L.join());
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('oturum-aciliyor')), false);
    assert.deepEqual(H, []);
    await ctx.close();
    // oturumsuz ziyaretçi giriş formunu görür; formdan girince yenilenen sayfa giriş formunu bir an bile göstermez
    const c2x = await b.newContext(), q = await c2x.newPage();
    await q.goto(s.url + '/satis'); await q.locator('#fGiris').waitFor({ state: 'visible' });
    assert.equal(await q.evaluate(() => document.documentElement.classList.contains('oturum-aciliyor')), false);
    await c2x.addInitScript(GOZLE);
    await q.fill('#gKul', 'satis'); await q.fill('#gSif', YONETICI_SIFRE); await q.click('#fGiris button.btn.marka');
    await q.waitForFunction(() => window.__giris && document.querySelector('#uyg:not(.gizli)'));
    const L2 = await q.evaluate(() => window.__giris);
    assert.ok(!L2.includes(true), 'girişten sonra form görünmemeli: ' + L2.join());
    await c2x.close();
  });

  test('bayi web sitesi de açılışta eşzamanlı istek yapmaz', async () => {
    const ctx = await b.newContext(); const [k, v] = c1.split('='); await ctx.addCookies([{ name: k, value: v, url: s.url }]);
    await ctx.addInitScript(IZLE);
    const p = await ctx.newPage(), H = hataTopla(p);
    await p.goto(s.url + '/katalog'); await p.locator('#izgara .kart').first().waitFor();
    assert.equal(await p.evaluate(() => window.__esz), 0);
    assert.equal(await p.evaluate(() => window.EXIT_OTURUM && window.EXIT_OTURUM.kul), 'rsbayi');
    assert.deepEqual(H, []);
    await ctx.close();
  });
});
