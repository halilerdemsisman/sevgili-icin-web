// Fiyat ve kampanya: liste fiyatı, kampanyalı fiyat ve gizli ürünler. Web sitesinde sunucunun hesabı kullanılır
// (GET /api/v1/katalog); sunucusuz sürümde satışın yayınladığı fiyat/kampanya anahtarlarından hesaplanır.
// ===== kampanya / sezon indirimi (satış panelinden tanımlanır) =====
let KMP = [];
const benKul = () => { try { return ben ? ben.kul : ''; } catch (e) { return ''; } };
const bugunStr = () => new Date().toISOString().slice(0, 10);
const kmpGecerli = k => k.aktif !== false && (!k.bas || k.bas <= bugunStr()) && (!k.bit || k.bit >= bugunStr());
function kmpBul(u) { let en = null; KMP.filter(kmpGecerli).filter(k => !(k.bayiler || []).length || (benKul() && k.bayiler.includes(benKul()))).forEach(k => { const uy = k.kapsam === 'tumu' || (k.kapsam === 'kategori' && (k.hedef || []).includes(u.kategori)) || (k.kapsam === 'urun' && (k.hedef || []).includes(u.ad)); if (uy && (!en || k.oran > en.oran)) en = k; }); return en; }
function kampanyaUygula() {
  if (!VERI._tum) VERI._tum = VERI.urunler.slice();
  // web sitesi: liste fiyatı, kampanyalı fiyat ve gizli ürünler sunucuda hesaplanır (GET /api/v1/katalog, web/veri.js);
  // sipariş fiyatını belirleyen hesapla (sunucu/lib/fiyat.js) aynı yerden geldiği için tarayıcıda ikinci bir hesap yok
  const SK = window.EXIT_VERI && EXIT_VERI.katalog;
  if (SK) {
    KMP = SK.kampanyalar || []; const M = new Map((SK.urunler || []).map(u => [u.id, u]));
    VERI.urunler = VERI._tum.filter(u => M.has(u.id));
    VERI.urunler.forEach(u => { const S = new Map((M.get(u.id).secenekler || []).map(s => [s.ad, s])); let k = null;
      u.secenek.forEach(s => { if (s.orj === undefined) s.orj = s.fiyat; const x = S.get(s.ad); s.liste = x ? x.liste : s.orj; s.fiyat = x ? x.fiyat : s.liste; if (x && x.kampanya) k = x.kampanya; });
      u.kmp = k ? { ad: k.ad, oran: k.oran, bit: k.bit } : null; });
    return;
  }
  KMP = oku('exb-kampanya', []) || []; const FY = oku('exb-fiyat', {}) || {}, GZ = oku('exb-gizli', []) || [];
  if (!VERI._tum) VERI._tum = VERI.urunler.slice(); VERI.urunler = VERI._tum.filter(u => !GZ.includes(u.ad));
  VERI.urunler.forEach(u => { const k = kmpBul(u); u.kmp = k ? { ad: k.ad, oran: k.oran, bit: k.bit } : null;
    u.secenek.forEach(s => { if (s.orj === undefined) s.orj = s.fiyat; const f = (FY[u.ad] || {})[s.ad]; s.liste = f != null && f !== '' ? +f : s.orj; s.fiyat = s.liste == null ? null : k ? Math.round(s.liste * (1 - k.oran / 100)) : s.liste; }); });
}
const kmpImza = () => window.EXIT_VERI ? [EXIT_VERI.imza.katalog, !!EXIT_VERI.katalog, benKul()].join('|') : JSON.stringify([oku('exb-kampanya', []), oku('exb-fiyat', {}), oku('exb-gizli', []), benKul()]);
let _kmpSon = '';
function kampanyaKontrol() { const i = kmpImza(); if (i === _kmpSon) return; const ilk = !_kmpSon; _kmpSon = i; kampanyaUygula(); if (!ilk && benKul()) { try { if (!$('#s-katalog').classList.contains('gizli')) katalog(); } catch (e) {} toast('Fiyatlar ve kampanyalar güncellendi.'); } }
kampanyaKontrol(); setInterval(kampanyaKontrol, 15000);
const listeDusuk = u => { const f = u.secenek.filter(s => !/Aksesuar/.test(s.sinif)).map(s => s.liste).filter(x => x != null); return f.length ? Math.min(...f) : null; };
const enDusuk = u => { const f = u.secenek.filter(s => !/Aksesuar/.test(s.sinif)).map(s => s.fiyat).filter(x => x != null); return f.length ? Math.min(...f) : null; };
