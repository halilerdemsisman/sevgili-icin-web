// Faz 1a · Eski sürümden geçiş: sunucudaki gömülü dosyaların taşınması, tarayıcıda biriken verinin
// yönetici girişinde sunucuya aktarılması ve çıkışta yerel kopyaların temizlenmesi.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { sunucuBaslat, YONETICI_SIFRE } = require('./yardimci');

describe('Eski sürümden geçiş', () => {
  let tarayici;
  before(async () => { tarayici = await chromium.launch(); });
  after(async () => { await tarayici?.close(); });

  test('açılışta veri.json içindeki gömülü dekontlar dosyalar/ klasörüne taşınır', async () => {
    const jpg = 'data:image/jpeg;base64,' + crypto.randomBytes(5000).toString('base64');
    const s = await sunucuBaslat({ veri: { veri: { 'exb-odeme': JSON.stringify([{ no: 'OB-2026-001', kul: 'ali', tutar: 5, durum: 'bekliyor', dosya: { veri: jpg } }]) } } });
    try {
      const od = JSON.parse(s.veri().veri['exb-odeme'])[0];
      assert.match(od.dosya.veri, /^api\/dosya\/[0-9a-f]{32}\.jpg$/);
      const ad = od.dosya.veri.split('/').pop();
      assert.ok(fs.existsSync(path.join(s.klasor, 'sunucu', 'dosyalar', ad)));
    } finally { s.kapat(); }
  });

  test('yöneticinin tarayıcısındaki eski veri ilk girişte sunucuya aktarılır; çıkışta yerel kopya silinir', async () => {
    const s = await sunucuBaslat();
    try {
      const c = await tarayici.newContext(), p = await c.newPage();
      await p.goto(s.url + '/satis');
      // eski (dosyadan açılan) sürümde birikmiş veri
      await p.evaluate(() => { localStorage.setItem('exs-siparisler', JSON.stringify({ 'EXG-2025-0007': { no: 'EXG-2025-0007', kul: 'eskibayi', durum: 'sevk', kalemler: [], toplam: 10 } })); localStorage.setItem('exs-musteriler', JSON.stringify({ eskibayi: { kul: 'eskibayi', firma: 'Eski Bayi' } })); });
      await p.reload();
      assert.ok(await p.evaluate(() => !!localStorage.getItem('exs-siparisler')), 'giriş ekranında yerel veri silinmemeli');
      await p.fill('#gKul', 'satis'); await p.fill('#gSif', YONETICI_SIFRE); await p.click('#fGiris button.btn.marka');
      await p.waitForFunction(() => window.EXIT_OTURUM && window.EXIT_OTURUM.kul === 'satis');
      const V = s.veri().veri;
      assert.ok(JSON.parse(V['exs-siparisler'])['EXG-2025-0007'], 'eski sipariş sunucuya aktarıldı');
      assert.ok(JSON.parse(V['exs-musteriler']).eskibayi);
      await p.click('#cikis');
      await p.waitForFunction(() => !window.EXIT_OTURUM);
      assert.equal(await p.evaluate(() => localStorage.getItem('exs-siparisler')), null, 'çıkışta yerel kopya silinmeli');
      assert.ok(JSON.parse(s.veri().veri['exs-siparisler'])['EXG-2025-0007'], 'çıkış sunucudaki veriyi silmemeli');
      await c.close();
    } finally { s.kapat(); }
  });
});
