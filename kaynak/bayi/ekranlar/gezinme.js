// Sayfa geçişi (git): ana sayfalar (katalog, siparişler, cari) ve eklerin sayfaları (projeler, belgeler, online ödeme, özel teklif).
// Web sitesinde adres çubuğu web/adres.js ile güncellenir (EK.gitAdres).
// Menü sayfaları. Ana sayfalar burada çizilir; projeler, belgeler, online ödeme ve teklifler kendi parçalarında.
const ANA_SAYFA = ['katalog', 'siparisler', 'cari'], EK_SAYFA = { projeler: 'projeler', belgeler: 'belgeler', odeme: 'odemeSayfa', teklifler: 'teklifSayfa' };
function git(s) {
  for (const x of [...ANA_SAYFA, ...Object.keys(EK_SAYFA)]) { const e = $('#s-' + x); if (e) e.classList.toggle('gizli', x !== s); }
  if (s === 'katalog') katalog(); if (s === 'siparisler') { window._bekleyen = 0; siparislerim(); } if (s === 'cari') cariSayfa();
  if (EK_SAYFA[s]) EK[EK_SAYFA[s]]?.();
  $$('[data-git]').forEach(b => b.classList.toggle('aktif', b.dataset.git === s)); window.scrollTo(0, 0);
  if (!['belgeler', 'odeme', 'teklifler'].includes(s)) EK.karsilastirmaCubugu?.();
  EK.gitAdres?.(s);
}
$$('[data-git]').forEach(b => b.onclick = () => git(b.dataset.git));
