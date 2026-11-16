// Faz 3b-2: satış paneli ekran ve özellik dosyalarına bölündü (bayi portalındaki 2b-2 ile aynı yol).
//   • Şablondaki her dosya var; sürüm adlı parçalar (03-ana.js, 22-ek6.js…) kalmadı; dosyalar paketlerde.
//   • Bir özellik açılışta hata verirse paketteki diğer özellikler çalışmaya devam eder.
//   • Bölerken bulunan hata: ziyaret kaydından oluşan hatırlatma, Hatırlatmalar sayfası açılmadan rozete yansımıyordu.
// Adım 3: tek veri modülü (cekirdek/veri.js, DEPO).
//   • Bellekte tutulan satış verisi yalnız veri modülünde tanımlı; canlı güncelleme aynı tabloyu kullanır.
//   • Sunucudan açılan satış paneli, oturum açıkken iş verisini tarayıcının kalıcı alanına yazmaz.
//   • Önceden ekran açılışında okunup bir daha tazelenmeyen duyurular (ve fiyat grupları, bayi hedefleri)
//     başka kullanıcı değiştirince sayfa yenilenmeden güncellenir.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla, PAKET } = require('./yardimci');

const KOK = path.join(__dirname, '..');

describe('Satış paneli: dosya yapısı', () => {
  test('şablondaki her dosya var; sürüm adlı parça yok; paketler', () => {
    const sablon = fs.readFileSync(path.join(KOK, 'kaynak', 'satis', 'sablon.html'), 'utf8');
    const yollar = [...sablon.matchAll(/\{\{dahil ([^}]+)\}\}/g)].map(m => m[1]);
    for (const y of yollar) assert.ok(fs.existsSync(path.join(KOK, 'kaynak', y)), y);
    assert.ok(!fs.existsSync(path.join(KOK, 'kaynak', 'satis', 'parcalar')), 'parcalar/ klasörü kalmamalı');
    assert.ok(!yollar.some(y => y.startsWith('satis/') && /v\d\.\d|ek\d|^\d\d-/.test(path.basename(y))), 'satış dosya adlarında sürüm yok');
    for (const p of ['cekirdek', 'ozellikler', 'ozellikler-stil']) assert.ok(sablon.includes(`<!-- paket: ${p} -->`), p);
    // her özellik dosyası kendi klasöründe; şablonda olmayan dosya kalmamış
    for (const k of ['cekirdek', 'ekranlar', 'ozellikler', 'stil'])
      for (const f of fs.readdirSync(path.join(KOK, 'kaynak', 'satis', k))) assert.ok(yollar.includes(`satis/${k}/${f}`), `şablonda yok: ${k}/${f}`);
    const html = fs.readFileSync(path.join(PAKET, 'exit_satis_paneli.html'), 'utf8');
    assert.ok(!/\{\{(dahil|paket) /.test(html), 'doldurulmamış işaret kalmamalı');
  });
});

describe('Satış paneli: tek veri modülü', () => {
  const oku = f => fs.readFileSync(path.join(KOK, 'kaynak', 'satis', f), 'utf8');
  test('bellekteki veri yalnız veri modülünde tanımlı; canlı güncelleme aynı tabloyu kullanır', () => {
    const veri = oku('cekirdek/veri.js');
    const satirlar = [...veri.matchAll(/^\s*\['(ex[sb]-[a-z-]+)',\s*\(\) => ([A-Z]+),/gm)];
    assert.ok(satirlar.length >= 18, 'tablo satırları: ' + satirlar.length);
    for (const [, k, ad] of satirlar) assert.match(veri, new RegExp(`\\b${ad} = depoIlk\\('${k}'\\)`), `${ad} tablodaki anahtardan okunur`);
    for (const k of ['cekirdek', 'ekranlar', 'ozellikler'])
      for (const f of fs.readdirSync(path.join(KOK, 'kaynak', 'satis', k))) {
        if (`${k}/${f}` === 'cekirdek/veri.js') continue;
        const L = oku(`${k}/${f}`).split('\n').filter(l => /^\s*(let|var|const)\s+[A-Z][A-Z0-9_]*\s*=\s*oku\('exs-/.test(l) && !/exs-kullanicilar/.test(l));
        assert.deepEqual(L, [], `${k}/${f}: kalıcı veri değişkeni veri modülünde tanımlanmalı`);
      }
    assert.ok(!/'exs-[a-z-]+'\s*:/.test(oku('ozellikler/canli.js')), 'canli.js kendi anahtar listesini tutmaz');
  });
});

describe('Satış paneli: özellikler', () => {
  let s, b;
  before(async () => { s = await sunucuBaslat(); await s.kayit('ziyaretbayi'); b = await chromium.launch(); });
  after(async () => { await b?.close(); s?.kapat(); });
  const ac = async (init) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const [k, v] = s.yoneticiCerez.split('=');
    await ctx.addCookies([{ name: k, value: v, url: s.url }]); if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); return [ctx, p];
  };

  test('bir özellik açılışta hata verirse diğer özellikler çalışır', async () => {
    // temsilci görünürlüğü dosyası işlem kaydını window.islemKaydi'ya yazarken hata verir
    const [ctx, p] = await ac(() => Object.defineProperty(window, 'islemKaydi', { get: () => () => {}, set: () => { throw new Error('deneme'); }, configurable: true }));
    const H = []; p.on('console', m => m.type() === 'error' && H.push(m.text()));
    await p.goto(s.url + '/satis'); await p.locator('#uyg:not(.gizli)').waitFor();
    assert.ok(H.some(h => h.includes('satis/ozellikler/temsilci-gorunurluk.js')), 'hata dosya adıyla raporlanır: ' + H.join(' | '));
    const menu = await p.$$eval('aside button.m[data-s]', L => L.map(x => x.dataset.s));
    for (const m of ['limit', 'gruplar', 'iadeler', 'panel', 'tahsilat', 'teklifler', 'urunanaliz']) assert.ok(menu.includes(m), 'sonraki özellik çalıştı: ' + m);
    await p.click('aside button.m[data-s=limit]'); assert.match(await p.textContent('#icerik'), /Bayi limitleri/);
    await ctx.close();
  });

  test('iş verisi tarayıcının kalıcı alanına yazılmaz; ekranlar bellekten okur', async () => {
    const [ctx, p] = await ac(); const H = hataTopla(p);
    await p.goto(s.url + '/satis'); await p.locator('#uyg:not(.gizli)').waitFor();
    assert.equal(await p.evaluate(() => window.EXIT_BELLEK), true);
    await p.click('aside button.m[data-s=musteriler]'); assert.match(await p.textContent('#icerik'), /ziyaretbayi/);
    await p.evaluate(() => { HDF['2099-01'] = { temsilci: {}, bolge: {} }; yaz('exs-hedef', HDF); });
    await p.waitForTimeout(600);
    assert.ok(JSON.parse(s.veri().veri['exs-hedef'] || '{}')['2099-01'], 'değişiklik sunucuya gitti');
    const disk = (await ctx.storageState()).origins.flatMap(o => o.localStorage.map(x => x.name)).filter(k => /^ex[bs]-/.test(k) && !/^(exb-dil|exs-ai-anahtar)$/.test(k));
    assert.deepEqual(disk, [], 'diskte iş verisi yok');
    assert.deepEqual(H, []);
    await ctx.close();
  });

  test('başka kullanıcının duyuru değişikliği sayfa yenilenmeden gelir', async () => {
    const [ctx, p] = await ac(); const H = hataTopla(p);
    await p.goto(s.url + '/satis'); await p.locator('#uyg:not(.gizli)').waitFor();
    await p.click('aside button.m[data-s=duyurular]');
    const d = [{ id: 'dx', baslik: 'Yeni sezon kataloğu', metin: '', tur: 'genel', bas: '', bit: '', bayiler: [], aktif: true, zaman: Date.now(), kim: 'başka' }];
    assert.equal((await s.api('/api/veri', { degisen: [['exs-duyuru', JSON.stringify(d)]] })).durum, 200);
    await p.waitForFunction(() => /Yeni sezon kataloğu/.test(document.querySelector('#icerik').textContent), null, { timeout: 8000 });
    assert.equal(await p.evaluate(() => DY.length), 1);
    assert.deepEqual(H, []);
    await ctx.close();
  });

  test('ziyaret kaydından oluşan hatırlatma rozete hemen yansır', async () => {
    const [ctx, p] = await ac(); const H = hataTopla(p);
    await p.goto(s.url + '/satis'); await p.locator('#uyg:not(.gizli)').waitFor();
    const rozet = () => p.evaluate(() => { const r = document.querySelector('aside button.m[data-s=hatirlatmalar] .say'); return r && !r.classList.contains('gizli') ? +r.textContent : 0; });
    const once = await rozet();
    await p.click('aside button.m[data-s=ziyaret]');
    await p.selectOption('#zBayi', 'ziyaretbayi'); await p.fill('#zNot', 'Yeni koleksiyon konuşuldu');
    await p.fill('#zSon', await p.evaluate(() => new Date().toISOString().slice(0, 10)));
    await p.click('#zKay');
    assert.equal(await rozet(), once + 1, 'bugünkü hatırlatma rozette');
    assert.equal(await p.evaluate(() => 'HT' in window), false, 'yanlışlıkla genel değişken oluşmaz');
    assert.deepEqual(H, []);
    await ctx.close();
  });
});
