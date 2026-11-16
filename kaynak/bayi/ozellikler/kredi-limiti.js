// Cari hesabım: kredi limiti kartı (kullanılan / kalan).
(function () {
  const p2 = n => (Math.round((n || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
  const benim = () => oku('exb-siparisler', []).filter(o => ben && o.kul === ben.kul);

  // ================= 9. Kredi limiti (bayi görünümü) =================
  EK.cariLimit = function () {
    const c = (oku('exb-cari', {}) || {})[ben.kul]; if (!c || !(+c.limit > 0) || $('#lmKart')) return;
    const z = cariOzet(c), acik = benim().filter(o => !['iptal', 'sevk'].includes(o.durum)).reduce((a, o) => a + (o.net != null ? o.net : o.toplam || 0), 0), risk = z.bakiye + acik, kul = Math.max(0, c.limit - risk), oran = Math.min(100, risk / c.limit * 100);
    const h = $('#s-cari h2'); (h && h.nextElementSibling ? h.nextElementSibling : h).insertAdjacentHTML('afterend', `<div class="lm-kart" id="lmKart"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><b>Kredi limitiniz: ${p2(c.limit)}</b><span>Kullanılabilir: <b style="color:${kul > 0 ? '#047857' : '#b91c1c'}">${p2(kul)}</b></span></div>
      <div class="lm-bar"><i style="width:${oran}%;background:${oran >= 100 ? '#dc2626' : oran > 80 ? '#d97706' : '#16a34a'}"></i></div><div class="kucuk">Bakiye ${p2(z.bakiye)} + açık siparişler ${p2(acik)} = ${p2(risk)}${oran >= 100 ? ' · Limit doldu; yeni siparişler satış yöneticisinin onayından sonra işleme alınır.' : ''}</div></div>`);
  };
})();
