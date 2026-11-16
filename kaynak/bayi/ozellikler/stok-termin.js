// Stok ve termin: satış panelinin yayınladığı özet (exb-stok) üzerinden tahmini teslim günü; sipariş kartında
// ve yeni siparişte tahmini teslim; stok değişince katalog yenilenir.
const renkAdi = s => String(s || '').replace(/\s*\(.*\)\s*$/, '').trim();
function terminTahmin(D, ad, kategori, sec, renk, adet) {
  if (!D) return null;
  const u = (D.u || {})[ad], hz = D.hazirlik ?? 3, kg = D.kuyrukGun || 0, vs = (D.kat || {})[kategori] ?? 21;
  adet = adet || 1; renk = renkAdi(renk);
  const lvl = o => o ? (renk && o.r ? (o.r[renk] ?? 0) : o.s) : undefined;
  let serbest = null;
  if (u) { const s = sec && u.sec ? u.sec[sec] : null; serbest = (s ? lvl(s) : lvl(u)) ?? 0; }
  if (serbest != null && serbest >= adet) return { stok: true, serbest, gun: hz };
  const ur = u && u.uretim;
  if (ur && ur.bitis && ur.adet >= adet - (serbest || 0)) return { stok: false, serbest: serbest || 0, gun: Math.max(hz, Math.ceil((Date.parse(ur.bitis) - Date.now()) / 864e5) + hz), mrp: true };
  return { stok: false, serbest: serbest || 0, gun: ((u && u.g) ?? vs) + kg + hz, tahmini: !u };
}
const gunSonra = g => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + g); return d.toISOString().slice(0, 10); };
const stokOzeti = () => oku('exb-stok', null);

(function () {
  const stokD = stokOzeti;
  window.terminTahmin = terminTahmin;
  EK.siparisKartiTahmin = function (o, h) {
    if (!o.termin && o.tahminiTeslim && !['sevk', 'iptal'].includes(o.durum)) h = h.replace('<b class="soluk">Onaydan sonra bildirilecek</b>', `<b class="soluk">~${tarih(o.tahminiTeslim)} · ön tahmin</b>`);
    return h;
  };
  EK.siparisTahminiTeslim = function (o) {
    if (window._sepetTermin && !o.tahminiTeslim) {
      o.tahminiTeslim = window._sepetTermin; window._sepetTermin = null;
      kayitGuncelle('siparisler', o.no, { tahminiTeslim: o.tahminiTeslim }).catch(e => console.warn('tahmini teslim kaydedilemedi:', e.message));
    }
  };
  // stok bilgisi değişince katalog yenilensin
  let _stkSon = JSON.stringify(stokD());
  setInterval(() => { const y = JSON.stringify(stokD()); if (y !== _stkSon) { _stkSon = y; try { if (ben && !$('#s-katalog').classList.contains('gizli')) katalog(); } catch (e) {} } }, 15000);
})();
