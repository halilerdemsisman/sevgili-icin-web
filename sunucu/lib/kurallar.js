// Okuma ve yazma kuralları (rapor G1, G2, G4, V1).
//
// Uygulamalar veriyi anahtar–değer olarak (localStorage anahtarları) eşitler. Sunucu her anahtarın
// anlamını bilir ve oturuma göre:
//   • okurken: kullanıcının görmemesi gereken kayıtları süzer, şifre özetlerini gizler;
//   • yazarken: yalnız izin verilen kayıt ve alanları kabul eder, gerisini sunucudaki hâliyle korur,
//     çakışan numaraları yeniden numaralandırır.
//
// Roller: bayi (kendi kayıtları), satış temsilcisi (atandığı bayiler), satış yöneticisi (hepsi).
const { MASKE } = require('./kimlik');

// Kayıt listeleri ve kimlik alanları (kayıtların "kul" alanı bayiyi gösterir)
const LISTE = { 'exb-siparisler': 'no', 'exb-odeme': 'no', 'exb-numune': 'no', 'exb-teklif': 'no', 'exb-hatirlat': 'id', 'exb-iade': 'id' };
// Bayinin yeni kayıtta kullanabileceği ilk durum
const ILK_DURUM = { 'exb-siparisler': 'yeni', 'exb-odeme': 'bekliyor', 'exb-teklif': 'bekliyor', 'exb-numune': 'yeni', 'exb-iade': 'yeni' };
// Yalnız satışın yazabileceği alanlar: bayinin yeni kaydında gelirse silinir
const SATIS_ALANLARI = ['net', 'iskonto', 'odemeBekleniyor', 'onay', 'termin', 'nakliye', 'takip', 'irsaliye', 'fatura', 'faturaNo', 'musIskonto', 'ekIskonto',
  'kim', 'karar', 'tahsilatNo', 'fiyat', 'yanit', 'redNot', 'sepette', 'okundu'];
// Bayinin kendi kaydında değiştirebileceği alanlar
function bayiAlanlari(k, s) {
  switch (k) {
    case 'exb-siparisler': return s.durum === 'yeni'
      ? ['kalemler', 'toplam', 'teklif', 'adres', 'revizyon', 'rev', 'revZaman', 'gecmis', 'bayiIptal', 'proje', 'tahminiTeslim', 'talep', 'durum']
      : ['talep', 'proje'];
    case 'exb-teklif': return s.durum === 'onaylandi' ? ['sepette'] : [];
    case 'exb-hatirlat': return ['okundu', 'gizli'];
    default: return [];
  }
}
// Bayiye özel anahtarlar: exb-<tür>-<kullanıcı adı>  (uzun adlar önce: hat-gizli, duyuru-okundu)
const KISISEL = /^exb-(hat-gizli|duyuru-okundu|sepet|fav|proje|adres|bildirim|gorulen|mkat|hat)-(.+)$/;
// Bayi adına anahtarlanmış sözlükler: bayi yalnız kendi girdisini görür
const BAYI_SOZLUK = ['exb-cari', 'exb-odeme-link', 'exb-bayi-hedef'];
// Satışın bayilere yayınladığı, hedef bayi listesi (bayiler) olabilen listeler
const BAYI_HEDEFLI = ['exb-kampanya', 'exb-duyuru'];
// Satışın bayilere yayınladığı genel veriler
const BAYI_GENEL = ['exb-fiyat', 'exb-gizli', 'exb-stok'];
// Temsilci kapsamı uygulanan, bayi adına anahtarlanmış sözlükler
const SATIS_SOZLUK = ['exs-musteriler', 'exs-cari', 'exb-cari', 'exs-crm', 'exs-iskonto', 'exb-odeme-link', 'exb-bayi-hedef', 'exs-bayi-hedef', 'exb-kullanicilar'];
const KULLANICI = { 'exb-kullanicilar': 'bayi', 'exs-kullanicilar': 'satis' };

const coz = (s, vars) => { if (s == null) return vars; try { return JSON.parse(s); } catch (e) { return vars; } };
const nesne = x => x && typeof x === 'object' && !Array.isArray(x);
const maskele = u => nesne(u) && u.sifre ? { ...u, sifre: MASKE } : u;
const maskeliSozluk = o => Object.fromEntries(Object.entries(nesne(o) ? o : {}).map(([k, u]) => [k, maskele(u)]));
const ayniKayit = (s, r) => { const a = s.tarih ?? s.zaman, b = r.tarih ?? r.zaman; return a == null || b == null || a === b; };

class Kurallar {
  /** @param ctx {{ham(k):string|undefined, yeniNo(on,yil,hane):string, fiyatlar?: import('./fiyat').Fiyatlar, limitler?: import('./limit').Limitler}} */
  constructor(ctx) { this.ctx = ctx; }

  // ---------- temsilci kapsamı ----------
  // Atama hiç yoksa temsilci de tümünü görür (uygulamadaki davranışla aynı).
  kapsam(ot) {
    if (!ot || ot.tur !== 'satis' || ot.rol === 'yonetici') return null;
    if (ot._kapsam !== undefined) return ot._kapsam; // istek başına önbellek (oturumun kopyası üzerinde)
    const M = coz(this.ctx.ham('exs-musteriler'), {});
    const V = Object.values(nesne(M) ? M : {});
    ot._kapsam = V.some(m => m && m.temsilci) ? new Set(Object.entries(M).filter(([, m]) => m && m.temsilci === ot.kul).map(([k]) => k)) : null;
    return ot._kapsam;
  }

  // ---------- okuma ----------
  /** @returns {string|undefined} kullanıcıya gidecek değer; undefined = erişim yok */
  oku(k, ham, ot) {
    if (!ot || ham == null) return ot && ham === null ? null : undefined;
    return ot.tur === 'bayi' ? this._bayiOku(k, ham, ot) : this._satisOku(k, ham, ot);
  }

  _bayiOku(k, ham, ot) {
    const m = k.match(KISISEL);
    if (m) return m[2] === ot.kul ? ham : undefined;
    if (k === 'exb-kullanicilar') { const o = coz(ham, {}), u = o[ot.kul]; return JSON.stringify(u ? { [ot.kul]: maskele(u) } : {}); }
    if (LISTE[k]) { const L = coz(ham, []); return JSON.stringify(Array.isArray(L) ? L.filter(r => r && r.kul === ot.kul) : []); }
    if (BAYI_SOZLUK.includes(k)) { const o = coz(ham, {}); return JSON.stringify(nesne(o) && ot.kul in o ? { [ot.kul]: o[ot.kul] } : {}); }
    if (BAYI_HEDEFLI.includes(k)) { const L = coz(ham, []); return JSON.stringify(Array.isArray(L) ? L.filter(x => x && (!(x.bayiler || []).length || x.bayiler.includes(ot.kul))) : []); }
    if (BAYI_GENEL.includes(k)) return ham;
    return undefined;
  }

  _satisOku(k, ham, ot) {
    const K = this.kapsam(ot);
    if (KULLANICI[k] && !K) return JSON.stringify(maskeliSozluk(coz(ham, {})));
    if (!K) return ham;
    const m = k.match(KISISEL);
    if (m) return K.has(m[2]) ? ham : undefined;
    if (LISTE[k]) { const L = coz(ham, []); return JSON.stringify(Array.isArray(L) ? L.filter(r => r && K.has(r.kul)) : []); }
    if (k === 'exs-kullanicilar') return JSON.stringify(maskeliSozluk(coz(ham, {})));
    if (SATIS_SOZLUK.includes(k)) {
      const o = coz(ham, {}), f = Object.fromEntries(Object.entries(nesne(o) ? o : {}).filter(([b]) => K.has(b)));
      return JSON.stringify(k === 'exb-kullanicilar' ? maskeliSozluk(f) : f);
    }
    if (k === 'exs-siparisler') { const o = coz(ham, {}); return JSON.stringify(Object.fromEntries(Object.entries(nesne(o) ? o : {}).filter(([, s]) => s && K.has(s.kul)))); }
    return ham;
  }

  // ---------- yazma ----------
  /**
   * @param gelen string | null (silme)
   * @returns {{deger?: string|null, red?: string, not?: string[]}} deger: sunucuda saklanacak yeni değer
   */
  yaz(k, gelen, ot) {
    if (!ot) return { red: 'oturum yok' };
    if (!/^ex[bs]-/.test(k)) return { red: 'geçersiz anahtar' };
    return ot.tur === 'bayi' ? this._bayiYaz(k, gelen, ot) : this._satisYaz(k, gelen, ot);
  }

  _bayiYaz(k, gelen, ot) {
    const m = k.match(KISISEL);
    if (m) return m[2] === ot.kul ? { deger: gelen } : { red: 'başka bayinin anahtarı' };
    if (gelen === null) return { red: 'silme yetkisi yok' };
    const G = coz(gelen, undefined); if (G === undefined) return { red: 'geçersiz JSON' };
    if (k === 'exb-kullanicilar') {
      const S = coz(this.ctx.ham(k), {}), s = S[ot.kul], g = nesne(G) ? G[ot.kul] : null;
      if (!s || !nesne(g)) return { red: 'kullanıcı kaydı yok' };
      const y = { ...s };
      for (const [a, v] of Object.entries(g)) {
        if (['kul', 'rol', 'durum', 'tarih', 'sifreDegistir', 'kvkk'].includes(a)) continue;
        if (a === 'sifre') continue; // şifre yalnız sunucu uçlarından değişir (/api/sifre, /api/sifre-sifirla)
        y[a] = v;
      }
      S[ot.kul] = y; return { deger: JSON.stringify(S) };
    }
    if (LISTE[k]) return this._bayiListe(k, G, ot);
    return { red: 'bayi bu anahtarı yazamaz' };
  }

  _bayiListe(k, G, ot) {
    if (!Array.isArray(G)) return { red: 'liste bekleniyor' };
    const a = LISTE[k], S = coz(this.ctx.ham(k), []), L = Array.isArray(S) ? S.slice() : [], not = [];
    const yer = new Map(L.map((r, i) => [r && r[a], i]));
    for (const r of G) {
      if (!nesne(r) || r[a] == null) continue;
      const i = yer.get(r[a]), s = i == null ? null : L[i];
      if (s && s.kul === ot.kul && ayniKayit(s, r)) {
        const y = { ...s };
        for (const f of bayiAlanlari(k, s)) if (f in r) y[f] = r[f];
        if (k === 'exb-siparisler') {
          if (!['yeni', 'iptal'].includes(y.durum)) y.durum = s.durum;
          // Değişiklik/iptal talebi: bayi yalnız "bekliyor" durumunda yeni talep açabilir.
          // Satışın karar verdiği talep (onaylandi/reddedildi) bayi tarafından geri alınamaz veya değiştirilemez.
          const gt = r.talep, st = s.talep;
          let kabul = false;
          if (gt && gt.durum === 'bekliyor') kabul = !st || (st.id === gt.id ? st.durum === 'bekliyor' : st.durum !== 'bekliyor');
          if (kabul) y.talep = gt; else if (st) y.talep = st; else delete y.talep;
          if (s.durum === 'yeni' && JSON.stringify(y.kalemler) !== JSON.stringify(s.kalemler)) this._fiyat(y, ot, not);
        }
        L[i] = y; continue;
      }
      if (k === 'exb-hatirlat') continue; // bayi mesaj oluşturamaz, başkasının mesajını değiştiremez
      if (s && a === 'id') continue;      // başka kaydın kimliği: yok say
      // yeni kayıt (veya başka kayıtla çakışan numara)
      const y = { ...r, kul: ot.kul };
      for (const f of SATIS_ALANLARI) delete y[f];
      if (ILK_DURUM[k]) y.durum = ILK_DURUM[k];
      if (k === 'exb-siparisler') { delete y.talep; delete y.fiyatKontrol; }
      if (s) {
        const p = String(r[a]).match(/^([A-Z]+)-(\d{4})-(\d+)$/);
        if (!p) continue;
        y[a] = this.ctx.yeniNo(p[1], +p[2], p[3].length);
        not.push(`${r[a]} → ${y[a]}`);
      }
      if (k === 'exb-siparisler') this._fiyat(y, ot, not);
      yer.set(y[a], L.length); L.push(y);
    }
    return { deger: JSON.stringify(L), not };
  }

  // sipariş fiyatlarını sunucu katalogundan denetle (fiyat modülü varsa)
  _fiyat(o, ot, not) {
    if (!this.ctx.fiyatlar) return;
    const d = this.ctx.fiyatlar.denetle(o, ot.kul);
    d.forEach(x => not.push(`fiyat düzeltildi ${o.no} ${x.ad} ${x.secenek}: ${x.gelen} → ${x.beklenen ?? 'teklif'}`));
  }

  // Temsilci: kredi limitini aşan siparişi ileri duruma geçiremez; "limitOnay" alanını kendisi yazamaz.
  // Engellenen kayıt sunucudaki hâliyle kalır. (Yönetici limit aşımını satış panelinde gerekçeyle onaylar.)
  _limitSuz(k, G, ot) {
    const uyari = [];
    if (!this.ctx.limitler || ot.rol === 'yonetici' || !['exb-siparisler', 'exs-siparisler'].includes(k)) return uyari;
    const S = coz(this.ctx.ham(k), k === 'exb-siparisler' ? [] : {});
    const bul = no => k === 'exb-siparisler' ? (Array.isArray(S) ? S.find(x => x && x.no === no) : null) : (nesne(S) ? S[no] : null);
    const denetle = r => {
      if (!nesne(r)) return r;
      const s = bul(r.no);
      if (r.limitOnay && !(s && s.limitOnay)) { r = { ...r }; delete r.limitOnay; }
      const e = this.ctx.limitler.engel(s, r);
      if (!e) return r;
      uyari.push(e);
      return s || null;
    };
    if (k === 'exb-siparisler' && Array.isArray(G)) { for (let i = G.length - 1; i >= 0; i--) { const y = denetle(G[i]); if (y) G[i] = y; else G.splice(i, 1); } }
    if (k === 'exs-siparisler' && nesne(G)) for (const [no, v] of Object.entries(G)) { const y = denetle(v); if (y) G[no] = y; else delete G[no]; }
    return uyari;
  }

  _satisYaz(k, gelen, ot) {
    const K = this.kapsam(ot);
    if (KULLANICI[k]) return this._kullaniciYaz(k, gelen, ot, K);
    if (gelen === null) return K ? { red: 'temsilci silemez' } : { deger: null };
    const G = coz(gelen, undefined); if (G === undefined) return { red: 'geçersiz JSON' };
    const uyari = this._limitSuz(k, G, ot);
    if (uyari.length) { const s = this._satisYaz2(k, G, ot, K); return { ...s, uyari, not: [...(s.not || []), ...uyari] }; }
    return this._satisYaz2(k, G, ot, K, gelen);
  }

  _satisYaz2(k, G, ot, K, gelen = JSON.stringify(G)) {
    if (LISTE[k]) {
      // kimliğe göre birleştir: gelen kazanır, gelmeyen kayıtlar korunur; temsilci yalnız kapsamındakileri değiştirir
      if (!Array.isArray(G)) return { red: 'liste bekleniyor' };
      const a = LISTE[k], S = coz(this.ctx.ham(k), []), L = Array.isArray(S) ? S.slice() : [];
      const yer = new Map(L.map((r, i) => [r && r[a], i]));
      for (const r of G) {
        if (!nesne(r) || r[a] == null) continue;
        const i = yer.get(r[a]), s = i == null ? null : L[i];
        if (K && !K.has((s || r).kul)) continue;
        if (i == null) { yer.set(r[a], L.length); L.push(r); } else L[i] = r;
      }
      return { deger: JSON.stringify(L) };
    }
    if (K && (SATIS_SOZLUK.includes(k) || k === 'exs-siparisler')) {
      if (!nesne(G)) return { red: 'sözlük bekleniyor' };
      const S = coz(this.ctx.ham(k), {}), y = nesne(S) ? { ...S } : {};
      const icinde = (anah, v) => k === 'exs-siparisler' ? K.has((v || {}).kul) : K.has(anah);
      // kapsamındakiler gelen hâliyle değişir/silinir; kapsam dışı korunur; yeni anahtar eklenebilir
      for (const [a, v] of Object.entries(y)) if (icinde(a, v) && !(a in G)) delete y[a];
      for (const [a, v] of Object.entries(G)) { if (a in y && !icinde(a, y[a])) continue; y[a] = v; }
      return { deger: JSON.stringify(y) };
    }
    if (K && k.match(KISISEL) && !K.has(k.match(KISISEL)[2])) return { red: 'kapsam dışı bayi' };
    return { deger: gelen };
  }

  // Kullanıcı sözlükleri silinmez (eşzamanlı yazmada yeni kayıt olan bayi kaybolmasın); şifre özetleri korunur.
  _kullaniciYaz(k, gelen, ot, K) {
    const G = coz(gelen, undefined); if (!nesne(G)) return { red: 'sözlük bekleniyor' };
    const S = coz(this.ctx.ham(k), {}), y = nesne(S) ? { ...S } : {};
    for (const [kul, g] of Object.entries(G)) {
      if (!nesne(g)) continue;
      const s = y[kul];
      if (K) { // temsilci
        if (k === 'exs-kullanicilar' && kul !== ot.kul) continue;
        if (k === 'exb-kullanicilar' && !K.has(kul)) continue;
      }
      const yeni = { ...(s || {}), ...g, kul };
      // şifre değiştirme zorunluluğunu yalnız sunucu yönetir (eski kopya yazan istemci geri getiremesin)
      if (s && s.sifreDegistir) yeni.sifreDegistir = true; else delete yeni.sifreDegistir;
      if (k === 'exs-kullanicilar' && K && s) yeni.rol = s.rol; // temsilci kendi rolünü değiştiremez
      // şifre yalnız sunucu uçlarından belirlenir; istemcinin gönderdiği şifre alanı yok sayılır
      if (s && s.sifre) yeni.sifre = s.sifre; else delete yeni.sifre;
      y[kul] = yeni;
    }
    return { deger: JSON.stringify(y) };
  }

  // Dosya çıkarırken sahip: hangi bayinin dosyası (satış verisi yalnız satışa açık)
  dosyaSahibi(k) {
    const m = k.match(KISISEL); if (m) return { tek: m[2] };
    if (BAYI_SOZLUK.includes(k)) return { sozluk: true };
    if (k.startsWith('exs-')) return { tek: '#satis' };
    return { tek: null };
  }
}

module.exports = { Kurallar, LISTE, KISISEL };
