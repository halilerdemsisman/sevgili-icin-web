// Veri deposu.
//
// Uygulamaların gördüğü yüz aynıdır: anahtar → JSON metni (al/koy), değişiklik zamanları (degisenler),
// numara sayaçları (yeniNo), dosya bilgileri (D.dosya). Okumalar bellekten yapılır.
//
// Kalıcı saklama iki biçimde olabilir:
//   • SqliteDepo (varsayılan, Faz 1b-2): VERI_KLASORU/veri.sqlite. Her değişiklik anında ve atomik olarak
//     yazılır (WAL). Kayıt listeleri (siparişler, ödemeler, teklifler, iadeler, numuneler, mesajlar) satır
//     satır "kayit" tablosunda tutulur; bayiye göre sorgulanabilir. Eski veri.json ilk açılışta içe alınır.
//   • Depo (JSON): Node'un SQLite modülü yoksa veya DEPO=json verilirse veri.json (eski davranış).
// Günlük yedek her iki biçimde de veri-YYYY-AA-GG.json olarak alınır (eski sürüm de okuyabilir);
// SQLite'ta ayrıca veri-YYYY-AA-GG.sqlite kopyası alınır.
const fs = require('fs');
const path = require('path');
const { LISTE } = require('./kurallar');

const HANE = { EXG: 4, IAD: 4, OL: 4, OT: 4, OB: 3, NMN: 3 };

class Depo {
  constructor(klasor) {
    this.klasor = klasor; this.dosya = path.join(klasor, 'veri.json'); this.yedekKlasoru = path.join(klasor, 'yedek');
    this.tur = 'json'; this.dinleyiciler = [];
    fs.mkdirSync(this.yedekKlasoru, { recursive: true });
    this.D = { zaman: 0, veri: {}, degisim: {} };
    this.yukle();
    this.D.veri ||= {}; this.D.degisim ||= {}; this.D.sayac ||= {}; this.D.dosya ||= {};
  }
  yukle() { try { this.D = JSON.parse(fs.readFileSync(this.dosya, 'utf8')); } catch (e) {} }
  get zaman() { return this.D.zaman; }
  al(k) { return this.D.veri[k]; }
  anahtarlar() { return Object.keys(this.D.veri); }
  /** Değer değiştiyse yazar ve true döner. deger null ise siler. */
  koy(k, deger, z) {
    const eski = this.D.veri[k];
    if (deger == null) { if (eski === undefined) return false; delete this.D.veri[k]; }
    else { if (eski === deger) return false; this.D.veri[k] = deger; }
    this.D.degisim[k] = z; this._sakla(k, deger, z); return true;
  }
  _sakla() {}
  yeniZaman() { return Math.max(Date.now(), this.D.zaman + 1); }
  /** Bir yazma turunu kapatır: zaman ilerler, dinleyicilere (anlık bildirim) haber verilir. */
  zamanla(z) { this.D.zaman = z; for (const f of this.dinleyiciler) { try { f(z); } catch (e) {} } }
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

  /**
   * Kayıt listesini sorgular (en yeni önce).
   * @param secenek {{kul?: string|Set<string>|null, durum?: string, no?: string, sinir?: number, atla?: number}}
   * @returns {{toplam: number, kayitlar: object[]}}
   */
  kayitlar(anahtar, { kul = null, durum, no, sinir = 50, atla = 0 } = {}) {
    let L; try { L = JSON.parse(this.D.veri[anahtar] || '[]'); } catch (e) { L = []; }
    if (!Array.isArray(L)) L = [];
    const uy = r => r && (kul == null || (kul instanceof Set ? kul.has(r.kul) : r.kul === kul)) && (!durum || r.durum === durum) && (!no || r[LISTE[anahtar]] === no);
    const F = L.filter(uy).reverse();
    return { toplam: F.length, kayitlar: F.slice(atla, atla + sinir) };
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
  disaAktar(hedef) { fs.writeFileSync(hedef, JSON.stringify(this.D)); }
  // günlük yedek, son 30 gün; dosyalar klasörü de yedeğe kopyalanır (dosyalar değişmez, yalnız yeniler eklenir)
  yedekAl(dosyaKlasoru) {
    const g = new Date().toISOString().slice(0, 10), f = path.join(this.yedekKlasoru, 'veri-' + g + '.json');
    if (!fs.existsSync(f)) this.disaAktar(f);
    this._ekYedek(g);
    for (const uz of ['json', 'sqlite']) fs.readdirSync(this.yedekKlasoru).filter(x => new RegExp(`^veri-.*\\.${uz}$`).test(x)).sort().slice(0, -30).forEach(x => fs.unlinkSync(path.join(this.yedekKlasoru, x)));
    if (dosyaKlasoru && fs.existsSync(dosyaKlasoru)) {
      const h = path.join(this.yedekKlasoru, 'dosyalar'); fs.mkdirSync(h, { recursive: true });
      for (const x of fs.readdirSync(dosyaKlasoru)) if (!fs.existsSync(path.join(h, x))) fs.copyFileSync(path.join(dosyaKlasoru, x), path.join(h, x));
    }
  }
  _ekYedek() {}
}

// ---------------- SQLite ----------------
const SEMA = `
CREATE TABLE IF NOT EXISTS kv (anahtar TEXT PRIMARY KEY, deger TEXT, liste INTEGER NOT NULL DEFAULT 0, silindi INTEGER NOT NULL DEFAULT 0, degisim INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS kayit (anahtar TEXT NOT NULL, kimlik TEXT NOT NULL, sira INTEGER NOT NULL, kul TEXT, durum TEXT, json TEXT NOT NULL, PRIMARY KEY (anahtar, kimlik));
CREATE INDEX IF NOT EXISTS kayit_kul ON kayit (anahtar, kul);
CREATE TABLE IF NOT EXISTS meta (ad TEXT PRIMARY KEY, deger TEXT NOT NULL);
`;

function sqliteAc(dosya) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dosya);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;');
  db.exec(SEMA);
  return db;
}
// Liste satırlarının kimliği: kayıt no/id; boş veya tekrar eden kimlikler (eski sürümdeki mükerrer
// numaralar) "#2", "#3" ekiyle ayrıştırılır, sıra korunur.
function satirlar(k, L) {
  const a = LISTE[k], gor = new Map();
  return L.map((r, i) => {
    let kim = r && r[a] != null ? String(r[a]) : '#' + i;
    const n = (gor.get(kim) || 0) + 1; gor.set(kim, n); if (n > 1) kim += '#' + n;
    return { kimlik: kim, sira: i, kul: r && typeof r.kul === 'string' ? r.kul : null, durum: r && typeof r.durum === 'string' ? r.durum : null, json: JSON.stringify(r) };
  });
}
// Veritabanından bellek görünümünü (D) kurar. Araçlar da kullanır (veri_incele, testler).
function sqlitedenD(db) {
  const D = { zaman: 0, veri: {}, degisim: {}, sayac: {}, dosya: {} };
  for (const { ad, deger } of db.prepare('SELECT ad, deger FROM meta').all()) { try { D[ad] = JSON.parse(deger); } catch (e) {} }
  const sec = db.prepare('SELECT json FROM kayit WHERE anahtar = ? ORDER BY sira');
  for (const r of db.prepare('SELECT anahtar, deger, liste, silindi, degisim FROM kv').all()) {
    D.degisim[r.anahtar] = r.degisim;
    if (r.silindi) continue;
    D.veri[r.anahtar] = r.liste ? '[' + sec.all(r.anahtar).map(x => x.json).join(',') + ']' : r.deger;
  }
  return D;
}

class SqliteDepo extends Depo {
  yukle() {
    this.tur = 'sqlite';
    this.vt = path.join(this.klasor, 'veri.sqlite');
    this.db = sqliteAc(this.vt);
    const db = this.db;
    this.st = {
      kv: db.prepare('INSERT INTO kv (anahtar, deger, liste, silindi, degisim) VALUES (?, ?, ?, ?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, liste = excluded.liste, silindi = excluded.silindi, degisim = excluded.degisim'),
      satirlar: db.prepare('SELECT kimlik, sira, json FROM kayit WHERE anahtar = ?'),
      satirYaz: db.prepare('INSERT INTO kayit (anahtar, kimlik, sira, kul, durum, json) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(anahtar, kimlik) DO UPDATE SET sira = excluded.sira, kul = excluded.kul, durum = excluded.durum, json = excluded.json'),
      satirSil: db.prepare('DELETE FROM kayit WHERE anahtar = ? AND kimlik = ?'),
      tumunuSil: db.prepare('DELETE FROM kayit WHERE anahtar = ?'),
      meta: db.prepare('INSERT INTO meta (ad, deger) VALUES (?, ?) ON CONFLICT(ad) DO UPDATE SET deger = excluded.deger'),
    };
    const bos = !db.prepare('SELECT 1 FROM kv LIMIT 1').get() && !db.prepare('SELECT 1 FROM meta LIMIT 1').get();
    if (bos && fs.existsSync(this.dosya)) {
      // ilk açılış: eski veri.json içe alınır, dosya "veri.json.tasindi-<zaman>" adıyla saklanır
      super.yukle();
      this.D.veri ||= {}; this.D.degisim ||= {}; this.D.sayac ||= {}; this.D.dosya ||= {};
      this._islem(() => { for (const [k, v] of Object.entries(this.D.veri)) this._sakla(k, v, this.D.degisim[k] || this.D.zaman || 1); this.hemenKaydet(); });
      const ad = this.dosya + '.tasindi-' + new Date().toISOString().replace(/[:.]/g, '-');
      fs.renameSync(this.dosya, ad);
      this.ice = { anahtar: Object.keys(this.D.veri).length, dosya: path.basename(ad) };
    } else if (!bos) this.D = sqlitedenD(db);
  }
  _islem(f) {
    if (this._tx) return f();
    this.db.exec('BEGIN'); this._tx = true;
    try { f(); this.db.exec('COMMIT'); } catch (e) { this.db.exec('ROLLBACK'); throw e; } finally { this._tx = false; }
  }
  _sakla(k, deger, z) {
    const st = this.st;
    let L = null;
    if (deger != null && LISTE[k]) { try { L = JSON.parse(deger); } catch (e) {} if (!Array.isArray(L)) L = null; }
    this._islem(() => {
      if (deger == null) { st.kv.run(k, null, 0, 1, z); st.tumunuSil.run(k); return; }
      if (!L) { st.kv.run(k, deger, 0, 0, z); st.tumunuSil.run(k); return; }
      st.kv.run(k, null, 1, 0, z);
      // yalnız değişen satırlar yazılır
      const eski = new Map(st.satirlar.all(k).map(r => [r.kimlik, r]));
      for (const s of satirlar(k, L)) {
        const e = eski.get(s.kimlik); eski.delete(s.kimlik);
        if (!e || e.json !== s.json || e.sira !== s.sira) st.satirYaz.run(k, s.kimlik, s.sira, s.kul, s.durum, s.json);
      }
      for (const kim of eski.keys()) st.satirSil.run(k, kim);
    });
  }
  kayitlar(anahtar, { kul = null, durum, no, sinir = 50, atla = 0 } = {}) {
    // satırlar "kayit" tablosunda; bayiye göre indeksli sorgu
    const kosul = ['anahtar = ?'], arg = [anahtar];
    if (kul instanceof Set) { if (!kul.size) return { toplam: 0, kayitlar: [] }; kosul.push(`kul IN (${[...kul].map(() => '?').join(',')})`); arg.push(...kul); }
    else if (kul != null) { kosul.push('kul = ?'); arg.push(kul); }
    if (durum) { kosul.push('durum = ?'); arg.push(durum); }
    if (no) { kosul.push('(kimlik = ? OR kimlik LIKE ?)'); arg.push(no, no + '#%'); }
    const w = kosul.join(' AND ');
    const toplam = this.db.prepare(`SELECT COUNT(*) AS n FROM kayit WHERE ${w}`).get(...arg).n;
    const kayitlar = this.db.prepare(`SELECT json FROM kayit WHERE ${w} ORDER BY sira DESC LIMIT ? OFFSET ?`).all(...arg, sinir, atla).map(x => JSON.parse(x.json));
    return { toplam, kayitlar };
  }
  kaydet() { this.hemenKaydet(); }
  hemenKaydet() { for (const ad of ['zaman', 'sayac', 'dosya']) this.st.meta.run(ad, JSON.stringify(this.D[ad] ?? null)); }
  zamanla(z) { super.zamanla(z); this.hemenKaydet(); }
  disaAktar(hedef) { fs.writeFileSync(hedef, JSON.stringify(this.D)); }
  _ekYedek(g) {
    const f = path.join(this.yedekKlasoru, 'veri-' + g + '.sqlite');
    if (!fs.existsSync(f)) this.db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`);
  }
  kapat() { try { this.hemenKaydet(); this.db.close(); } catch (e) {} }
}

/** Ortama göre depoyu açar: DEPO=json veya SQLite modülü yoksa JSON, yoksa SQLite. */
function depoAc(klasor) {
  if (process.env.DEPO !== 'json') {
    try { require('node:sqlite'); return new SqliteDepo(klasor); }
    catch (e) { if (e.code !== 'ERR_UNKNOWN_BUILTIN_MODULE' && !/node:sqlite/.test(e.message)) throw e; console.log('  Not: Bu Node sürümünde SQLite yok; veri.json kullanılıyor (Node 22.5+ önerilir).'); }
  }
  return new Depo(klasor);
}

/** Araçlar için: veri.sqlite veya veri.json dosyasından bellek görünümünü okur. */
function veriOku(dosya) {
  if (/\.sqlite$/.test(dosya)) { const db = sqliteAc(dosya); try { return sqlitedenD(db); } finally { db.close(); } }
  return JSON.parse(fs.readFileSync(dosya, 'utf8'));
}

module.exports = { Depo, SqliteDepo, depoAc, veriOku, HANE };
