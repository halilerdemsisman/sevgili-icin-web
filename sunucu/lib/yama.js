// Kayıt düzeyinde yazma (Faz 3b, V3): istemci anahtarın tamamı yerine yalnız değişen kayıtları gönderir.
// Yama, kullanıcının o anda gördüğü değere (kurallar.oku sonucu) uygulanır; sonuç her zamanki yazma
// kurallarından geçer. Böylece iki kullanıcı aynı anda farklı kayıtları değiştirdiğinde ikisinin değişikliği de kalır.
//
//   {s: {koy: {anahtar: değer}, sil: [anahtar]}}       sözlük (ör. exs-siparisler, exs-cari)
//   {l: 'no'|'id', koy: [kayıt], sil: [kimlik]}        kimlikli liste (ör. exb-odeme); kayıt yerinde değişir, yenisi sona eklenir
//   {e: [öğe], n: sınır}                                sona ekleme (ör. exs-islem); n > 0 ise son n öğe kalır
const duz = x => x && typeof x === 'object' && !Array.isArray(x);
const coz = s => { if (s == null) return undefined; try { return JSON.parse(s); } catch (e) { return undefined; } };
const GECERSIZ = new Set(['__proto__', 'constructor', 'prototype']);

/** @returns {string|undefined} yeni değer (JSON); undefined = geçersiz yama */
function yamaUygula(gorunen, Y) {
  if (!duz(Y)) return undefined;
  const g = coz(gorunen);
  if (duz(Y.s)) {
    const { koy, sil } = Y.s; if (!duz(koy) || !Array.isArray(sil)) return undefined;
    const o = duz(g) ? { ...g } : {};
    for (const a of sil) if (typeof a === 'string') delete o[a];
    for (const [a, v] of Object.entries(koy)) if (!GECERSIZ.has(a)) o[a] = v;
    return JSON.stringify(o);
  }
  if (Y.l === 'no' || Y.l === 'id') {
    const a = Y.l; if (!Array.isArray(Y.koy) || !Array.isArray(Y.sil)) return undefined;
    const silinen = new Set(Y.sil);
    const L = (Array.isArray(g) ? g : []).filter(x => !(duz(x) && silinen.has(x[a])));
    const yer = new Map(L.map((x, i) => [duz(x) ? x[a] : undefined, i]));
    for (const r of Y.koy) {
      if (!duz(r) || r[a] == null) continue;
      const i = yer.get(r[a]); if (i == null) { yer.set(r[a], L.length); L.push(r); } else L[i] = r;
    }
    return JSON.stringify(L);
  }
  if (Array.isArray(Y.e)) {
    let L = (Array.isArray(g) ? g : []).concat(Y.e);
    const n = Math.floor(+Y.n || 0); if (n > 0 && L.length > n) L = L.slice(-n);
    return JSON.stringify(L);
  }
  return undefined;
}

// Koşullu yazma (Faz 3b): karar ekranları (ödeme onayı, değişiklik talebi, özel teklif) yazmayı bir koşula bağlar,
// ör. "OB-2026-001 hâlâ bekliyor". Koşul tutmazsa (başka kullanıcı bu arada karar verdiyse) hiçbir şey yazılmaz.
//   {k: 'exb-odeme', a: 'no', id: 'OB-2026-001', yol: 'durum', esit: 'bekliyor'}   (yol: 'talep.durum' gibi iç içe olabilir;
//   esit: null → alan yok/boş). Kayıt bulunamazsa koşul tutmaz.
function kosulTutar(gorunen, K) {
  const g = coz(gorunen);
  if (!duz(K) || typeof K.yol !== 'string') return false;
  let x = Array.isArray(g) ? g.find(r => duz(r) && r[K.a || 'no'] === K.id) : duz(g) ? g[K.id] : undefined;
  if (!duz(x)) return false;
  for (const p of K.yol.split('.')) x = duz(x) ? x[p] : undefined;
  return K.esit == null ? x == null : JSON.stringify(x) === JSON.stringify(K.esit);
}

module.exports = { yamaUygula, kosulTutar };
