// Şifre özeti, oturumlar ve giriş denemesi sınırı.
// Ek paket yok: Node'un kendi crypto modülü (scrypt) kullanılır.
const crypto = require('crypto');
const fs = require('fs');

// ---------- şifre ----------
const SCRYPT = { N: 16384, r: 8, p: 1, uzunluk: 32 };

function sifreOzetle(sifre) {
  const tuz = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(sifre), tuz, SCRYPT.uzunluk, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${tuz.toString('base64')}$${h.toString('base64')}`;
}

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
// Uygulamaların eski (tarayıcıda hesaplanan) özetleri: sha256(önek + şifre) ve daha eski djb2 türevi
const eskiDjb2 = s => { let h = 5381; for (const c of s) h = (h * 33 ^ c.charCodeAt(0)) >>> 0; return 'h' + h.toString(16); };
const esit = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

/** @returns {{ok: boolean, yukselt: boolean}} yukselt: eski biçimde, scrypt'e çevrilmeli */
function sifreDogrula(sifre, kayitli, onEk) {
  if (!kayitli || typeof kayitli !== 'string') return { ok: false, yukselt: false };
  if (kayitli.startsWith('scrypt$')) {
    const [, N, r, p, tuz, h] = kayitli.split('$');
    const hesap = crypto.scryptSync(String(sifre), Buffer.from(tuz, 'base64'), Buffer.from(h, 'base64').length, { N: +N, r: +r, p: +p });
    return { ok: crypto.timingSafeEqual(hesap, Buffer.from(h, 'base64')), yukselt: false };
  }
  if (/^[0-9a-f]{64}$/.test(kayitli)) { const ok = esit(sha256(onEk + sifre), kayitli); return { ok, yukselt: ok }; }
  if (/^h[0-9a-f]+$/.test(kayitli)) { const ok = esit(eskiDjb2(onEk + sifre), kayitli); return { ok, yukselt: ok }; }
  return { ok: false, yukselt: false };
}

const ON_EK = { bayi: 'exitbayi:', satis: 'exitsatis:' };
// Satış panelinin eskiden kendiliğinden oluşturduğu "satis / 1234" hesabının özeti
const VARSAYILAN_SATIS_OZETI = sha256('exitsatis:1234');
// Tarayıcıya gönderilen kullanıcı kayıtlarında şifre özeti yerine bu yazılır
const MASKE = '••••';
// Tarayıcıdaki uygulamanın yeni şifre için ürettiği özet (yalnız bu biçim kabul edilir)
const tarayiciOzetiMi = s => typeof s === 'string' && (/^[0-9a-f]{64}$/.test(s) || /^h[0-9a-f]+$/.test(s));

// ---------- oturumlar ----------
class Oturumlar {
  constructor(dosya, gun = 7) {
    this.dosya = dosya; this.sure = gun * 864e5; this.L = {};
    try { this.L = JSON.parse(fs.readFileSync(dosya, 'utf8')); } catch (e) {}
    this.temizle();
  }
  ac(bilgi) {
    const anahtar = crypto.randomBytes(32).toString('base64url');
    this.L[sha256(anahtar)] = { ...bilgi, acilis: Date.now(), son: Date.now() };
    this.kaydet(); return anahtar;
  }
  bul(anahtar) {
    if (!anahtar) return null;
    const k = sha256(anahtar), o = this.L[k]; if (!o) return null;
    if (Date.now() - o.son > this.sure) { delete this.L[k]; this.kaydet(); return null; }
    if (Date.now() - o.son > 60e3) { o.son = Date.now(); this.kaydet(); }
    return o;
  }
  kapat(anahtar) { if (anahtar && delete this.L[sha256(anahtar)]) this.kaydet(); }
  // kullanıcı pasife alınınca veya şifresi değişince
  kullaniciyiKapat(tur, kul) { let d = false; for (const [k, o] of Object.entries(this.L)) if (o.tur === tur && o.kul === kul) { delete this.L[k]; d = true; } if (d) this.kaydet(); }
  temizle() { const s = Date.now() - this.sure; for (const [k, o] of Object.entries(this.L)) if (o.son < s) delete this.L[k]; }
  kaydet() { clearTimeout(this.z); this.z = setTimeout(() => { this.temizle(); fs.writeFileSync(this.dosya + '.tmp', JSON.stringify(this.L)); fs.renameSync(this.dosya + '.tmp', this.dosya); }, 200); }
}

// ---------- giriş denemesi sınırı ----------
// Aynı IP + kullanıcı adı için 15 dakikada 5 hatalı deneme; aynı IP için 15 dakikada 30 hatalı deneme.
class DenemeSiniri {
  constructor({ kisi = 5, ip = 30, pencere = 15 * 60e3 } = {}) { Object.assign(this, { kisiSiniri: kisi, ipSiniri: ip, pencere }); this.M = new Map(); }
  _al(k) { const x = this.M.get(k); if (!x || Date.now() - x.ilk > this.pencere) return { n: 0, ilk: Date.now() }; return x; }
  engelliMi(ip, kul) {
    const a = this._al('k|' + ip + '|' + kul), b = this._al('i|' + ip);
    const bitis = Math.max(a.n >= this.kisiSiniri ? a.ilk + this.pencere : 0, b.n >= this.ipSiniri ? b.ilk + this.pencere : 0);
    return bitis > Date.now() ? Math.ceil((bitis - Date.now()) / 60e3) : 0;
  }
  hata(ip, kul) { for (const k of ['k|' + ip + '|' + kul, 'i|' + ip]) { const x = this._al(k); x.n++; this.M.set(k, x); } }
  basari(ip, kul) { this.M.delete('k|' + ip + '|' + kul); }
}

module.exports = { sifreOzetle, sifreDogrula, ON_EK, VARSAYILAN_SATIS_OZETI, MASKE, tarayiciOzetiMi, Oturumlar, DenemeSiniri, sha256 };
