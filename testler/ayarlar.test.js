// Faz 1b-2 · Tarayıcıda: Ayarlar ekranında sunucuda saklanan Claude anahtarı ve satış kullanıcısı ekleme,
// "Claude ile derin analiz"in sunucu üzerinden çalışması, anlık bildirimle (SSE) yeni siparişin satışa
// hemen düşmesi.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright');
const { sunucuBaslat, hataTopla, YONETICI_SIFRE } = require('./yardimci');

describe('Ayarlar, yapay zekâ ve anlık bildirim (tarayıcı)', () => {
  let s, sahte, tarayici, p, hatalar, istekler = [];
  before(async () => {
    sahte = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => {
      istekler.push({ anahtar: q.headers['x-api-key'], govde: JSON.parse(b) });
      const swot = { guclu: ['Sadık bayi ağı'], zayif: ['Az kategori'], firsat: ['Otel projeleri'], tehdit: ['Kur'], oneriler: [{ baslik: 'Kampanya', aciklama: 'Yaz öncesi' }] };
      r.writeHead(200, { 'content-type': 'application/json' });
      r.end(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(swot) }], usage: { input_tokens: 1, output_tokens: 1 } }));
    }); });
    await new Promise(ok => sahte.listen(0, '127.0.0.1', ok));
    s = await sunucuBaslat({ ortam: { ANTHROPIC_TABAN_URL: `http://127.0.0.1:${sahte.address().port}` } });
    tarayici = await chromium.launch();
    p = await (await tarayici.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); hatalar = hataTopla(p);
    // eski sürümde tarayıcıya kaydedilmiş anahtar
    await p.addInitScript(() => { if (!sessionStorage.getItem('t-ilk')) { sessionStorage.setItem('t-ilk', '1'); localStorage.setItem('exs-ai-anahtar', 'sk-ant-eski-tarayici-anahtari'); } });
    await p.goto(s.url + '/satis');
    await p.fill('#gKul', 'satis'); await p.fill('#gSif', YONETICI_SIFRE); await p.click('#fGiris button.btn.marka');
    await p.waitForFunction(() => window.EXIT_OTURUM && window.EXIT_OTURUM.kul === 'satis');
  });
  after(async () => { await tarayici?.close(); s?.kapat(); sahte?.close(); });

  test('tarayıcıda kalmış eski anahtar silinir', async () => {
    assert.equal(await p.evaluate(() => localStorage.getItem('exs-ai-anahtar')), null);
  });

  test('yönetici anahtarı Ayarlar\'dan sunucuya kaydeder', async () => {
    await p.evaluate(() => window.git('ayarlar'));
    await p.locator('#aiDurum', { hasText: 'tanımlı değil' }).waitFor();
    await p.fill('#aiYeni', 'sk-ant-sunucu-0123456789abcdefghij'); await p.click('#aiKaydet');
    await p.locator('#aiDurum', { hasText: '✓ Anahtar tanımlı' }).waitFor();
    assert.ok(!(await p.evaluate(() => JSON.stringify(localStorage))).includes('sk-ant-sunucu'), 'anahtar tarayıcıda yok');
  });

  test('yönetici yeni temsilci ekler ve geçici şifresini görür', async () => {
    await p.fill('#kyKul', 'mehmet'); await p.fill('#kyAd', 'Mehmet Temsilci'); await p.selectOption('#kyRol', 'temsilci');
    await p.click('#kyEkle');
    const g = (await p.locator('#kyGecici').innerText()).trim();
    assert.match(g, /^[A-Za-z0-9]{10}$/);
    await s.giris('satis', 'mehmet', g);
    assert.equal(JSON.parse(s.veri().veri['exs-kullanicilar']).mehmet.rol, 'temsilci');
  });

  test('"Claude ile derin analiz" sunucu üzerinden çalışır', async () => {
    await p.evaluate(() => window.git('ai'));
    await p.click('#aiBtn');
    await p.locator('#swot', { hasText: 'Sadık bayi ağı' }).waitFor();
    const i = istekler.at(-1);
    assert.equal(i.anahtar, 'sk-ant-sunucu-0123456789abcdefghij');
    assert.equal(i.govde.model, 'claude-opus-5-5'); assert.equal(i.govde.fallbacks, 'default');
  });

  test('anlık bildirim: bayi siparişi satış tarayıcısına 2 sn içinde düşer', async () => {
    await p.evaluate(() => window.git('siparisler'));
    await p.waitForTimeout(1500); // SSE bağlantısı açık; yoklama 30 sn'ye indi
    const b = await s.kayit('ssebayi');
    const no = `EXG-${new Date().getFullYear()}-0777`;
    const t0 = Date.now();
    await s.api('/api/veri', { degisen: [['exb-siparisler', JSON.stringify([{ no, kul: 'ssebayi', tarih: 1, kalemler: [], toplam: 0, durum: 'yeni' }])]] }, { cerez: b, uyg: 'bayi' });
    await p.waitForFunction(n => (localStorage.getItem('exb-siparisler') || '').includes(n), no, { timeout: 2000 });
    assert.ok(Date.now() - t0 < 2000);
  });

  test('sayfa hatası yok', () => { assert.deepEqual(hatalar, []); });
});
