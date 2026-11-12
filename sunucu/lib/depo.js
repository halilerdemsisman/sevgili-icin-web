// Veri deposu: sunucu/veri.json (anahtar → JSON metni), değişiklik zamanları, numara sayaçları,
// dosya bilgileri. Atomik yazma (önce .tmp sonra yeniden adlandırma) ve günlük yedek.
// Faz 1b'de SQLite'a taşınacak; dışarıya açılan yüz (al/koy/degisenler) aynı kalacak.
const fs = require('fs');
const path = require('path');
const { LISTE } = require('./kurallar');

const HANE = { EXG: 4, IAD: 4, OL: 4, OT: 4, OB: 3, NMN: 3 };

class Depo {
  constructor(klasor) {
    this.klasor = klasor; this.dosya = path.join(klasor, 'veri.json'); this.yedekKlasoru = path.join(klasor, 'yedek');
    this.D = { zaman: 0, veri: {}, degisim: {} };
    try { this.D = JSON.parse(fs.readFileSync(this.dosya, 'utf8')); } catch (e) {}
    this.D.veri ||= {}; this.D.degisim ||= {}; this.D.sayac ||= {}; this.D.dosya ||= {};
    fs.mkdirSync(this.yedekKlasoru, { recursive: true });
  }
  get zaman() { return this.D.zaman; }
  al(k) { return this.D.veri[k]; }
  anahtarlar() { return Object.keys(this.D.veri); }
  /** Değer değiştiyse yazar ve true döner. deger null ise siler. */
  koy(k, deger, z) {
    const eski = this.D.veri[k];
    if (deger == null) { if (eski === undefined) return false; delete this.D.veri[k]; }
    else { if (eski === deger) return false; this.D.veri[k] = deger; }
    this.D.degisim[k] = z; return true;
  }
  yeniZaman() { return Math.max(Date.now(), this.D.zaman + 1); }
  zamanla(z) { this.D.zaman = z; }
  degisenler(son) { return Object.entries(this.D.degisim).filter(([, z]) => z > son).map(([k]) => k); }

  // Sunucu tarafında, çakışmasız numara: ön ek + yıl için sayaç; mevcut kayıtlardaki en büyük numaradan aşağı inmez.
  yeniNo(on, yil = new Date().getFullYear(), hane) {
    const s = on + '-' + yil, re = new RegExp(`^${on}-${yil}-(\\d+)$`);
    let enb = this.D.sayac[s] || 0;
    for (const k of Object.keys(LISTE)) {
      let L; try { L = JSON.parse(this.D.veri[k] || '[]'); } catch (e) { continue; }
      if (Array.isArray(L)) for (const r of L) { const m = String(r && r.no || '').match(re); if (m) enb = Math.max(enb, +m[1]); }
    }
    this.D.sayac[s] = enb + 1; this.kaydet();
    return `${on}-${yil}-${String(enb + 1).padStart(hane || HANE[on] || 4, '0')}`;
  }

  kaydet() {
    if (process.env.VERI_HEMEN_KAYDET === '1') return this.hemenKaydet(); // testler için: her değişiklikte hemen yaz
    clearTimeout(this.z);
    this.z = setTimeout(() => this.hemenKaydet(), 300);
  }
  hemenKaydet() {
    clearTimeout(this.z);
    fs.writeFileSync(this.dosya + '.tmp', JSON.stringify(this.D)); fs.renameSync(this.dosya + '.tmp', this.dosya);
  }
  // günlük yedek, son 30 gün; dosyalar klasörü de yedeğe kopyalanır (dosyalar değişmez, yalnız yeniler eklenir)
  yedekAl(dosyaKlasoru) {
    const g = new Date().toISOString().slice(0, 10), f = path.join(this.yedekKlasoru, 'veri-' + g + '.json');
    if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify(this.D));
    fs.readdirSync(this.yedekKlasoru).filter(x => /^veri-.*\.json$/.test(x)).sort().slice(0, -30).forEach(x => fs.unlinkSync(path.join(this.yedekKlasoru, x)));
    if (dosyaKlasoru && fs.existsSync(dosyaKlasoru)) {
      const h = path.join(this.yedekKlasoru, 'dosyalar'); fs.mkdirSync(h, { recursive: true });
      for (const x of fs.readdirSync(dosyaKlasoru)) if (!fs.existsSync(path.join(h, x))) fs.copyFileSync(path.join(dosyaKlasoru, x), path.join(h, x));
    }
  }
}

module.exports = { Depo, HANE };
