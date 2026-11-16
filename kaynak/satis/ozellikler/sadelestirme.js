/* v2.7 sadeleştirme: onay akışı ve onay sekmesi kaldırıldı (onayGerekli 03-ana.js'de boş döner), stok/termin yayını kapatıldı */
(function () {
  const b = document.querySelector('aside button.m[data-s=onaylar]'); if (b) b.remove();
  let d = false; Object.values(SIP).forEach(o => { if (o.onay) { delete o.onay; d = true; } }); if (d) yaz('exs-siparisler', SIP);
  try { localStorage.removeItem('exb-stok'); } catch (e) {}
})();
