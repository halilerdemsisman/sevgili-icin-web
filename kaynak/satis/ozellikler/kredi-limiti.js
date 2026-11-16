// Kredi limiti ve risk (v3.1).
(function () {
  menuEkle('limit', 'Kredi limiti ve risk', '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M12 8v5M12 16h.01"/>', 'musteriler');
  function riskHesap(kul) {
    const c = CARI[kul] || { hareket: [], vade: VADE_VARS }, z = cariOzet(kul), fat = new Set(c.hareket.filter(h => h.tip === 'fatura').map(h => h.sip));
    const acik = Object.values(SIP).filter(o => o.kul === kul && !['iptal', 'yeni'].includes(o.durum) && !fat.has(o.no)).reduce((a, o) => a + tutarlar(o).net, 0);
    const risk = z.bakiye + acik, limit = +c.limit || 0; return { limit, bakiye: z.bakiye, acik, risk, kul: limit ? limit - risk : null, gecmis: z.gecmis, gecikme: z.gecikmeGun, oran: limit ? risk / limit * 100 : 0 };
  }
  window.riskHesap = riskHesap;
  S6.limit = function () {
    $('#baslik').textContent = 'Kredi limiti ve risk';
    const R = Object.values(MUS).filter(m => m && m.kul).map(m => ({ m, ...riskHesap(m.kul) })).sort((a, b) => b.oran - a.oran || b.risk - a.risk);
    const asim = R.filter(r => r.limit && r.risk > r.limit), gec = R.filter(r => r.gecmis > 0.5);
    $('#ustSag').innerHTML = `<button class="btn cizgi" id="lmCsv">Excel'e aktar</button>`;
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Limit tanımlı bayi</span><b>${R.filter(r => r.limit).length}</b><small>${R.length} bayiden</small></div><div><span>Limiti aşan</span><b>${asim.length}</b><small>${usd(asim.reduce((a, r) => a + r.risk - r.limit, 0))} aşım</small></div><div><span>Vadesi geçmiş alacak</span><b>${usd(gec.reduce((a, r) => a + r.gecmis, 0))}</b><small>${gec.length} bayi</small></div><div><span>Toplam risk</span><b>${usd(R.reduce((a, r) => a + r.risk, 0))}</b><small>bakiye + faturalanmamış açık sipariş</small></div></div>
      <div class="kart"><h3>Bayi limitleri</h3><div class="alt">Risk = cari bakiye + onaylanmış ama faturası kesilmemiş siparişler. Limiti aşacak bir sipariş onaylanmak istendiğinde temsilci engellenir, yönetici ise gerekçeli onay verebilir. Bayi limitini ve kullanılabilir tutarı Cari hesabım ekranında görür.</div>
      <table class="tablo"><tr><th>Bayi</th><th class="sag-hiza">Limit $</th><th class="sag-hiza">Bakiye</th><th class="sag-hiza">Açık sipariş</th><th class="sag-hiza">Risk</th><th>Doluluk</th><th class="sag-hiza">Kullanılabilir</th><th class="sag-hiza">Vadesi geçmiş</th></tr>
      ${R.map(r => `<tr class="${r.limit && r.risk > r.limit ? 'lm-asim' : ''}"><td><b>${esc(r.m.firma || r.m.kul)}</b><div class="kucuk">${esc(r.m.sehir || '')}</div></td><td class="sag-hiza"><input class="s6-in" style="width:110px;text-align:right" data-lm="${esc(r.m.kul)}" value="${r.limit || ''}" placeholder="limit yok" ${yonetici() ? '' : 'disabled title="Yalnız yönetici değiştirebilir"'}></td>
        <td class="sag-hiza">${usd(r.bakiye)}</td><td class="sag-hiza">${usd(r.acik)}</td><td class="sag-hiza"><b>${usd(r.risk)}</b></td><td>${r.limit ? `<div class="bh-c" style="height:8px;border-radius:4px;background:var(--cizgi2,#f1f5f9);min-width:90px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, r.oran)}%;background:${r.oran >= 100 ? '#dc2626' : r.oran > 80 ? '#d97706' : '#16a34a'}"></i></div><span class="kucuk">${yuzde(r.oran)}</span>` : '<span class="kucuk">—</span>'}</td>
        <td class="sag-hiza">${r.limit ? `<span class="${r.kul < 0 ? 'azl' : 'art'}">${usd(r.kul)}</span>` : '—'}</td><td class="sag-hiza">${r.gecmis > 0.5 ? `<span class="azl">${usd(r.gecmis)}</span><div class="kucuk">${r.gecikme} gün</div>` : '—'}</td></tr>`).join('') || '<tr><td colspan="8" class="kucuk">Bayi yok.</td></tr>'}</table></div>`;
    $$('[data-lm]').forEach(i => { i.onkeydown = e => { if (e.key === 'Enter') i.blur(); }; i.onchange = () => { const k = i.dataset.lm, v = sayiTR(i.value), c = cariHesap(k), eski = c.limit; if (v > 0) c.limit = Math.round(v); else delete c.limit; cariYaz(); islemKaydi('Kredi limiti', `${(MUS[k] || {}).firma || k}: ${eski ? usd(eski) : 'yok'} → ${v > 0 ? usd(v) : 'yok'}`); toast('Limit kaydedildi.'); S6.limit(); }; });
    $('#lmCsv').onclick = () => csvTablo('exit_kredi_risk.csv', [['Bayi', 'Limit', 'Bakiye', 'Açık sipariş', 'Risk', 'Doluluk %', 'Kullanılabilir', 'Vadesi geçmiş', 'Gecikme gün']].concat(R.map(r => [r.m.firma || r.m.kul, r.limit, Math.round(r.bakiye), Math.round(r.acik), Math.round(r.risk), Math.round(r.oran), r.limit ? Math.round(r.kul) : '', Math.round(r.gecmis), r.gecikme])));
  };
})();
