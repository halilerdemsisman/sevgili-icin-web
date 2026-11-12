// Sunucu tarafında sipariş fiyatı doğrulaması (rapor V4).
// Bayi portalı fiyatı tarayıcıda hesaplayıp siparişe yazar. Sunucu aynı hesabı katalogdan yapar:
//   liste fiyatı = satışın fiyat güncellemesi (exb-fiyat[ürün adı][seçenek adı]) varsa o, yoksa katalog fiyatı
//   bayi fiyatı  = bayiye geçerli en yüksek kampanya varsa yuvarlanmış indirimli fiyat, yoksa liste fiyatı
//   özel teklif  = kalemde onaylı teklif no'su varsa teklifteki birim fiyat da kabul edilir
// Kural: Bayinin yazdığı birim fiyat beklenenden DÜŞÜKSE beklenen fiyata yükseltilir ve sipariş işaretlenir.
// Eşit veya yüksekse dokunulmaz (ör. sepette beklerken kampanya bitmiş, fiyat düşmüş: şirket zarar etmez,
// gereksiz müdahale olmaz).
const fs = require('fs');

const bugun = () => new Date().toISOString().slice(0, 10); // bayi portalıyla aynı (UTC gün)
const kmpGecerli = k => k && k.aktif !== false && (!k.bas || k.bas <= bugun()) && (!k.bit || k.bit >= bugun());
const coz = (s, v) => { try { return s == null ? v : JSON.parse(s); } catch (e) { return v; } };

class Fiyatlar {
  /** @param katalogYolu urunler.json veya katalog.json; @param ham anahtar → depo metni */
  constructor(katalogYolu, ham) {
    this.ham = ham;
    const V = JSON.parse(fs.readFileSync(katalogYolu, 'utf8'));
    this.urunler = (V.urunler || V).map(u => ({ id: u.id, ad: u.ad, kategori: u.kategori, secenek: (u.secenek || []).map(s => ({ ad: s.ad, fiyat: s.fiyat })) }));
    this.id = new Map(this.urunler.map(u => [u.id, u]));
  }

  kampanya(u, kul) {
    let en = null;
    for (const k of coz(this.ham('exb-kampanya'), []) || []) {
      if (!kmpGecerli(k) || ((k.bayiler || []).length && !k.bayiler.includes(kul))) continue;
      const uy = k.kapsam === 'tumu' || (k.kapsam === 'kategori' && (k.hedef || []).includes(u.kategori)) || (k.kapsam === 'urun' && (k.hedef || []).includes(u.ad));
      if (uy && (!en || k.oran > en.oran)) en = k;
    }
    return en;
  }

  /** @returns {number|null} bayinin bu seçenek için ödemesi gereken birim fiyat; null: fiyat yok (teklif) */
  beklenen(u, secenekAd, kul) {
    const s = u.secenek.find(x => x.ad === secenekAd); if (!s) return null;
    const FY = coz(this.ham('exb-fiyat'), {}) || {}, f = (FY[u.ad] || {})[s.ad];
    const liste = f != null && f !== '' ? +f : s.fiyat;
    if (liste == null || !isFinite(liste)) return null;
    const k = this.kampanya(u, kul);
    return k ? Math.round(liste * (1 - k.oran / 100)) : liste;
  }

  teklifFiyati(no, urunId, kul) {
    if (!no) return null;
    const t = (coz(this.ham('exb-teklif'), []) || []).find(x => x && x.no === no && x.kul === kul && x.durum === 'onaylandi' && x.fiyat);
    if (!t) return null;
    if (t.masa && t.masa.id === urunId) return t.fiyat.masa;
    if (t.sandalye && t.sandalye.id === urunId) return t.fiyat.sandalye;
    return null;
  }

  /**
   * Siparişin kalemlerini denetler ve gerekirse düzeltir (yerinde). Toplamı yeniden hesaplar.
   * @returns {Array<{ad, secenek, gelen, beklenen}>} yapılan düzeltmeler
   */
  denetle(o, kul) {
    const duz = [];
    if (!Array.isArray(o.kalemler)) { o.kalemler = []; }
    o.kalemler = o.kalemler.filter(x => x && typeof x === 'object').map(x => {
      const y = { ...x, adet: Math.min(100000, Math.max(1, Math.round(+x.adet) || 1)) };
      if (y.birim == null) return y; // fiyatsız kalem: satış teklif verir
      const u = this.id.get(y.id) || this.urunler.find(z => z.ad === y.ad);
      const beklenen = u ? this.beklenen(u, y.secenek, kul) : null;
      const teklif = u ? this.teklifFiyati(y.teklif, u.id, kul) : null;
      const gelen = +y.birim;
      const alt = Math.min(...[beklenen, teklif].filter(v => v != null && isFinite(v)));
      if (!isFinite(alt)) { duz.push({ ad: y.ad, secenek: y.secenek || '', gelen: y.birim, beklenen: null }); y.birim = null; return y; } // katalogda yok: teklife çevir
      if (!isFinite(gelen) || gelen < alt - 0.01) {
        const dogru = teklif != null ? teklif : beklenen;
        duz.push({ ad: y.ad, secenek: y.secenek || '', gelen: y.birim, beklenen: dogru });
        y.birim = dogru;
      }
      return y;
    });
    o.toplam = Math.round(o.kalemler.reduce((a, x) => a + (x.birim == null ? 0 : x.birim * x.adet), 0) * 100) / 100;
    o.teklif = o.kalemler.some(x => x.birim == null);
    if (duz.length) o.fiyatKontrol = { zaman: Date.now(), duzeltme: duz };
    return duz;
  }
}

module.exports = { Fiyatlar };
