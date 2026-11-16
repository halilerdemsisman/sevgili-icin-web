// Cari hesabım: bakiye, vadesi geçmiş/yaklaşan, faturalar ve hareketler.
// cari hesabım
function cariOzet(c) {
  const F = c.hareket.filter(h => h.tip === 'fatura').sort((a, b) => a.tarih - b.tarih), odeme = c.hareket.filter(h => h.tip === 'odeme').reduce((a, h) => a + h.tutar, 0);
  let kalan = odeme, gecmis = 0, yaklasan = 0; const simdi = Date.now();
  const D = F.map(f => { const ac = Math.max(0, f.tutar - kalan); kalan = Math.max(0, kalan - f.tutar); if (ac > 0.5) { if (f.vade < simdi) gecmis += ac; else if (f.vade < simdi + 30 * 864e5) yaklasan += ac; } return { ...f, acik: ac }; });
  return { borc: F.reduce((a, h) => a + h.tutar, 0), odeme, bakiye: F.reduce((a, h) => a + h.tutar, 0) - odeme, gecmis, yaklasan, D };
}
function cariSayfa() {
  const c = (oku('exb-cari', {}) || {})[ben.kul] || { vade: 60, hareket: [] }, z = cariOzet(c), H = c.hareket.slice().sort((a, b) => a.tarih - b.tarih); let b = 0;
  const p2 = n => (Math.round(n * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
  $('#s-cari').innerHTML = `<h2>Cari hesabım</h2><p class="kucuk">Faturalar sipariş sevk edildiğinde, ödemeler satış ekibi tahsilatı işlediğinde görünür. Ödeme vadeniz: <b>${c.vade} gün</b>.</p>
    <div class="sk-ozet"><div><span>Güncel bakiye</span><b>${p2(z.bakiye)}</b></div><div class="${z.gecmis > 0.5 ? 'kirmizi' : ''}"><span>Vadesi geçmiş</span><b>${p2(z.gecmis)}</b></div><div><span>30 gün içinde vadesi dolacak</span><b>${p2(z.yaklasan)}</b></div><div><span>Toplam ödeme</span><b>${p2(z.odeme)}</b></div></div>
    ${z.D.some(f => f.acik > 0.5) ? `<div class="kart-b"><h3>Ödenmemiş faturalar</h3><table class="tablo"><tr><th>Fatura</th><th>Tarih</th><th>Vade</th><th style="text-align:right">Tutar</th><th style="text-align:right">Kalan</th><th></th></tr>
      ${z.D.filter(f => f.acik > 0.5).map(f => { const g = Math.floor((Date.now() - f.vade) / 864e5); return `<tr><td><b>${esc(f.no)}</b><div class="kucuk">${esc(f.aciklama || '')}</div></td><td>${tarih(f.tarih)}</td><td>${tarih(f.vade)}</td><td style="text-align:right">${p2(f.tutar)}</td><td style="text-align:right"><b>${p2(f.acik)}</b></td><td>${g > 0 ? `<span class="durum d-iptal">${g} gün gecikti</span>` : `<span class="durum d-onay">${-g} gün kaldı</span>`}</td></tr>`; }).join('')}</table></div>` : ''}
    <div class="kart-b"><h3>Hesap hareketleri</h3>${H.length ? `<table class="tablo"><tr><th>Tarih</th><th>Belge</th><th>Açıklama</th><th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th><th style="text-align:right">Bakiye</th></tr>
      ${H.map(h => { b += h.tip === 'fatura' ? h.tutar : -h.tutar; return `<tr><td>${tarih(h.tarih)}</td><td>${esc(h.no)}</td><td class="kucuk">${esc(h.aciklama || '')}</td><td style="text-align:right">${h.tip === 'fatura' ? p2(h.tutar) : ''}</td><td style="text-align:right">${h.tip === 'odeme' ? p2(h.tutar) : ''}</td><td style="text-align:right"><b>${p2(b)}</b></td></tr>`; }).join('')}</table>` : '<div class="kucuk">Henüz hesap hareketi yok.</div>'}</div>
    <p class="kucuk">Tutarlar USD'dir. Hesap ekstresi için satış temsilcinizle iletişime geçebilirsiniz.</p>`;
  EK.cariOdemeBildirimi?.(); EK.cariHedef?.(); EK.cariAdresler?.(); EK.cariLimit?.(); EK.cariOnlineOdeme?.();
}
