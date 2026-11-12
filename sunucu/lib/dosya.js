// Kayıtların içine gömülü dosyalar (dekont, iade fotoğrafı, logo…) data URI olarak gelir.
// Sunucu bunları diske çıkarır ve kayıtta yerine "api/dosya/<kimlik>.<uzantı>" adresini yazar.
// Böylece tarayıcılara yalnız küçük JSON iner (rapor V2) ve dosyalar yetki kontrolüyle sunulur.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA = /^data:([\w.+-]+\/[\w.+-]+)(;[^,]*)?;base64,/;
const UZANTI = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' };
const MIME = Object.fromEntries(Object.entries(UZANTI).map(([m, u]) => [u, m]));
const ESIK = 1024; // bundan küçük data URI'ler (ör. minik ikonlar) kayıtta kalır
const ADRES = /^api\/dosya\/([0-9a-f]{32})\.([a-z0-9]{2,5})$/;

class Dosyalar {
  constructor(klasor, meta) {
    this.klasor = klasor; this.meta = meta; // meta: { kimlik: { tip, boyut, sahip: [kul…], zaman } } (depoda saklanır)
    fs.mkdirSync(klasor, { recursive: true });
  }

  /**
   * Değer içindeki data URI'leri dosyaya çıkarır (yerinde değiştirir).
   * sahip: kaydın ait olduğu bayi; bulunamazsa en yakın üst nesnedeki "kul" alanı kullanılır.
   * @returns {number} çıkarılan dosya sayısı
   */
  cikar(deger, sahip = null) {
    let n = 0;
    const gez = (x, kul) => {
      if (Array.isArray(x)) { x.forEach((y, i) => { if (typeof y === 'string') { const r = this._tek(y, kul); if (r) { x[i] = r; n++; } } else if (y && typeof y === 'object') gez(y, kul); }); return; }
      if (!x || typeof x !== 'object') return;
      const k = typeof x.kul === 'string' ? x.kul : kul;
      for (const [a, y] of Object.entries(x)) {
        if (typeof y === 'string') { const r = this._tek(y, k); if (r) { x[a] = r; n++; } } else if (y && typeof y === 'object') gez(y, k);
      }
    };
    gez(deger, sahip);
    return n;
  }

  _tek(s, sahip) {
    if (s.length < ESIK || !s.startsWith('data:')) return null;
    const m = s.match(DATA); if (!m) return null;
    const tip = m[1].toLowerCase(), veri = Buffer.from(s.slice(m[0].length), 'base64');
    const kimlik = crypto.createHash('sha256').update(veri).digest('hex').slice(0, 32);
    const uz = UZANTI[tip] || 'bin';
    const yol = path.join(this.klasor, kimlik + '.' + uz);
    if (!fs.existsSync(yol)) fs.writeFileSync(yol, veri);
    const m2 = this.meta[kimlik] || (this.meta[kimlik] = { tip, boyut: veri.length, sahip: [], zaman: Date.now() });
    if (sahip && !m2.sahip.includes(sahip)) m2.sahip.push(sahip);
    if (!sahip && !m2.sahip.length) m2.genel = true;
    return `api/dosya/${kimlik}.${uz}`;
  }

  /** Dosyayı okur; oturum yetkisizse null. Satış ekibi tüm dosyaları, bayi yalnız kendisininkileri görür. */
  oku(ad, oturum) {
    const m = String(ad).match(/^([0-9a-f]{32})\.([a-z0-9]{2,5})$/); if (!m || !oturum) return null;
    const bilgi = this.meta[m[1]]; if (!bilgi) return null;
    if (oturum.tur !== 'satis' && !(bilgi.genel || bilgi.sahip.includes(oturum.kul))) return null;
    const yol = path.join(this.klasor, m[1] + '.' + m[2]);
    if (!fs.existsSync(yol)) return null;
    const tip = MIME[m[2]];
    return { veri: fs.readFileSync(yol), tip: tip || 'application/octet-stream', indir: !tip };
  }
}

// G8 (Faz 2): dosya alanlarına (dekont, iade fotoğrafı, logo) yalnız dosya adresi veya küçük bir
// resim/PDF data URI yazılabilir. Aksi hâlde ekranlardaki "Görüntüle" bağlantısı ve <img src> için
// "javascript:…" ya da tırnakla öznitelikten çıkan bir değer yazılabilirdi.
const DOSYA_ALANI = new Set(['dosya', 'foto', 'logo']);
const GECERLI = /^(api\/dosya\/[0-9a-f]{32}\.[a-z0-9]{2,5}|data:(image\/(png|jpeg|webp|gif)|application\/pdf);base64,[A-Za-z0-9+/=]*)$/;
/** Değerdeki dosya alanlarını denetler (yerinde). @returns {number} temizlenen alan sayısı */
function dosyaAlanlariniTemizle(deger) {
  let n = 0;
  const gez = x => {
    if (Array.isArray(x)) return x.forEach(gez);
    if (!x || typeof x !== 'object') return;
    for (const [a, y] of Object.entries(x)) {
      if (DOSYA_ALANI.has(a)) {
        if (typeof y === 'string' && y && !GECERLI.test(y)) { x[a] = null; n++; }
        else if (Array.isArray(y)) { const t = y.filter(z => typeof z === 'string' && GECERLI.test(z)); if (t.length !== y.length) { x[a] = t; n++; } }
        else if (y && typeof y === 'object') gez(y);
      } else if (y && typeof y === 'object') gez(y);
    }
  };
  gez(deger);
  return n;
}

module.exports = { Dosyalar, ADRES, dosyaAlanlariniTemizle };
