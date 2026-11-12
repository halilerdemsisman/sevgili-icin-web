// Bilinen sorunlar (docs/BAYI_WEB_SATIS_MASAUSTU_RAPOR.md, bölüm 3).
// Faz 0'da bu testler doğru davranışı bekleyen ve bilerek başarısız olan "todo" testleriydi; orijinal
// pakette hepsinin başarısız olduğu görüldü. Faz 1a'da sorunlar kapatıldı, `todo` işaretleri kaldırıldı:
// artık kalıcı regresyon kontrolüdürler.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { sunucuBaslat } = require('./yardimci');
const anonim = { cerez: null };

let s, tarayici;
const post = degisen => s.api('/api/veri', { degisen });

async function bayiKaydol(kul) {
  const c = await tarayici.newContext(); const p = await c.newPage();
  await p.goto(s.url + '/'); await p.click('[data-s=kayit]');
  const v = { kFirma: kul + ' Ltd.', kAd: kul, kTel: '05550000000', kMail: kul + '@ornek.com', kSehir: 'İzmir', kKul: kul, kSif: 'Sifre123' };
  for (const [k, x] of Object.entries(v)) await p.fill('#' + k, x);
  await p.check('#kKvkk'); await p.click('#fKayit button[type=submit]');
  await p.waitForFunction(k => window.EXIT_OTURUM && window.EXIT_OTURUM.kul === k, kul);
  await p.locator('#izgara .kart').first().waitFor();
  return p;
}
async function sepeteEkle(p) {
  await p.click('#izgara .kart[data-id="21"]');
  for (const a of ['iskelet', 'file']) await p.locator(`.perde .renk[data-a=${a}]`).first().click();
  await p.click('#pEkle'); await p.click('#hSepet'); await p.locator('#sGonder').waitFor();
}

describe('Bilinen sorunlar (Faz 1a\'da kapatıldı)', () => {
  before(async () => { s = await sunucuBaslat(); tarayici = await chromium.launch(); });
  after(async () => { await tarayici?.close(); s?.kapat(); });

  test('G1 · giriş yapmamış biri API\'den kullanıcı listesini ve şifre özetlerini alamamalı', async () => {
    await post([['exb-kullanicilar', JSON.stringify({ ali: { kul: 'ali', sifre: 'ozet' } })]]);
    const { durum, json } = await s.api('/api/veri', undefined, anonim);
    assert.ok(durum === 401 || durum === 403 || !json?.veri?.['exb-kullanicilar'], `durum ${durum}, kullanıcılar açıkta`);
  });

  test('G1 · giriş yapmamış biri API ile sipariş durumunu değiştirememeli', async () => {
    const r = await s.api('/api/veri', { degisen: [['exb-siparisler', JSON.stringify([{ no: 'EXG-2026-0999', kul: 'ali', durum: 'sevk' }])]] }, anonim);
    assert.ok(r.durum === 401 || r.durum === 403, `kimliksiz yazma kabul edildi (HTTP ${r.durum})`);
  });

  test('G4 · bayinin tarayıcısına başka bayilerin siparişleri inmemeli', async () => {
    await post([['exb-siparisler', JSON.stringify([{ no: 'EXG-2026-0998', kul: 'baskabayi', firma: 'Başka Bayi', durum: 'yeni', kalemler: [], toplam: 1 }])]]);
    const p = await bayiKaydol('bayiuc');
    const L = await p.evaluate(() => JSON.parse(localStorage.getItem('exb-siparisler') || '[]'));
    await p.context().close();
    assert.deepEqual(L.filter(o => o.kul !== 'bayiuc').map(o => o.no), [], 'başka bayilerin siparişleri tarayıcıda');
  });

  test('G5 · varsayılan "satis / 1234" yönetici girişi çalışmamalı', async () => {
    const c = await tarayici.newContext(); const p = await c.newPage();
    await p.goto(s.url + '/satis');
    assert.equal(await p.locator('#giris .g-not').isVisible(), false, 'giriş ekranında varsayılan şifre yazmamalı');
    await p.fill('#gKul', 'satis'); await p.fill('#gSif', '1234');
    await p.click('#fGiris button.btn.marka');
    await p.locator('#gHata', { hasText: /hatalı/ }).waitFor();
    const girdi = await p.evaluate(() => !!sessionStorage.getItem('exs-oturum') || !!window.EXIT_OTURUM);
    await c.close();
    assert.equal(girdi, false, 'varsayılan şifreyle yönetici girişi yapıldı');
  });

  test('V1 · iki bayi aynı anda sipariş verince iki sipariş de ayrı numarayla kaydedilmeli', async () => {
    const [a, b] = [await bayiKaydol('bayibir'), await bayiKaydol('bayiiki')];
    await sepeteEkle(a); await sepeteEkle(b);
    await Promise.all([a.click('#sGonder'), b.click('#sGonder')]);
    await new Promise(r => setTimeout(r, 2000));
    const { json } = await s.api('/api/veri');
    const L = JSON.parse(json.veri['exb-siparisler'] || '[]').filter(o => ['bayibir', 'bayiiki'].includes(o.kul));
    await a.context().close(); await b.context().close();
    assert.equal(L.length, 2, `2 sipariş verildi, sunucuda ${L.length} kaldı: ${L.map(o => o.no + ' (' + o.kul + ')').join(', ')}`);
    assert.notEqual(L[0].no, L[1].no, 'aynı sipariş numarası');
  });

  test('V2 · ortak veri tarayıcı kotasını aşsa da sunucudaki tüm kayıtlar sayfaya eksiksiz yüklenmeli', async () => {
    // 36 adet ~250 KB dekont (~9 milyon karakter) ödeme bildirimlerinde; ardından küçük bir cari kaydı.
    // Bugün: kota (Chromium'da ~8 milyon karakter) aşılınca yükleme döngüsü ilk hatada durur; rozet yine
    // "Sunucuya bağlı" der ama exb-odeme ve sonraki anahtarlar tarayıcıda yoktur. Eksik listeyle yazan
    // kullanıcı, birleştirme dışındaki anahtarlarda (ör. cari) sunucudaki tam veriyi ezebilir.
    const dekont = 'data:image/jpeg;base64,' + 'A'.repeat(250 * 1024);
    const O = Array.from({ length: 36 }, (_, i) => ({ no: 'OB-2026-' + String(i + 1).padStart(4, '0'), kul: 'bayi' + i, tutar: 100, durum: 'bekliyor', dosya: { ad: 'dekont.jpg', tip: 'image/jpeg', veri: dekont } }));
    await post([['exb-odeme', JSON.stringify(O)]]);
    await post([['exs-cari', JSON.stringify({ bayi1: { hareket: [{ tip: 'fatura', tutar: 500 }] } })]]);
    // satış yöneticisi olarak aç (bayi kendisine ait olmayan ödemeleri zaten görmez)
    const c = await tarayici.newContext(); const p = await c.newPage();
    await c.addCookies([{ name: 'exit_s', value: decodeURIComponent(s.yoneticiCerez.split('=')[1]), url: s.url }]);
    await p.goto(s.url + '/satis');
    const durum = await p.evaluate(() => ({ bagli: window.EXIT_SUNUCU === true, odeme: !!localStorage.getItem('exb-odeme'), cari: !!localStorage.getItem('exs-cari') }));
    const odeme = await p.evaluate(() => localStorage.getItem('exb-odeme') || '');
    await c.close();
    assert.ok(!odeme.includes('data:') && odeme.includes('api/dosya/'), 'dekontlar kayıtta gömülü değil, dosya adresi olarak tutulmalı');
    await post([['exb-odeme', null], ['exs-cari', null]]);
    assert.deepEqual(durum, { bagli: true, odeme: true, cari: true }, 'sayfa "bağlı" görünüyor ama sunucu verisinin bir kısmı yüklenmedi');
  });
});
