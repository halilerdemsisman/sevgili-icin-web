
/* v2.7 sadeleştirme: onay akışı ve onay sekmesi kaldırıldı, stok/termin yayını kapatıldı */
(function () {
  const b = document.querySelector('aside button.m[data-s=onaylar]'); if (b) b.remove();
  onayGerekli = function () { return []; };
  let d = false; Object.values(SIP).forEach(o => { if (o.onay) { delete o.onay; d = true; } }); if (d) yaz('exs-siparisler', SIP);
  try { localStorage.removeItem('exb-stok'); } catch (e) {}
  const _ayarlarK = ayarlar;
  ayarlar = function () { _ayarlarK(); $$('#icerik .kart').filter(k => (k.querySelector('h3') || {}).textContent === 'Onay kuralı').forEach(k => k.remove()); };
})();
