// Ödeme linkleri ve net tahsilat (v3.2).
(function () {
  menuEkle('tahsilat', 'Ödeme linkleri ve tahsilat', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>', 'limit');
  let donem = 'ay';
  S6.tahsilat = function () {
    $('#baslik').textContent = 'Ödeme linkleri ve net tahsilat';
    const LNK = oku('exb-odeme-link', {}) || {}, OD = oku('exb-odeme', []) || [], simdi = new Date();
    const bas = donem === 'ay' ? new Date(simdi.getFullYear(), simdi.getMonth(), 1).getTime() : donem === 'yil' ? new Date(simdi.getFullYear(), 0, 1).getTime() : simdi - 30 * 864e5;
    const R = Object.keys(MUS).filter(k => MUS[k]).map(k => { const c = CARI[k] || { hareket: [] }, o = cariOzet(k);
      const tah = c.hareket.filter(h => h.tip === 'odeme' && h.tarih >= bas), fat = c.hareket.filter(h => h.tip === 'fatura' && h.tarih >= bas), bek = OD.filter(x => x.kul === k && x.durum === 'bekliyor');
      return { k, link: LNK[k] || '', tah: tah.reduce((a, h) => a + h.tutar, 0), onl: tah.filter(h => /online|link/i.test(h.aciklama || h.no || '')).reduce((a, h) => a + h.tutar, 0), fat: fat.reduce((a, h) => a + h.tutar, 0), bek: bek.reduce((a, x) => a + x.tutar, 0), bekN: bek.length, bakiye: o.bakiye, gecmis: o.gecmis }; }).sort((a, b) => b.tah - a.tah || b.bakiye - a.bakiye);
    const T = R.reduce((a, r) => ({ tah: a.tah + r.tah, fat: a.fat + r.fat, bek: a.bek + r.bek, bak: a.bak + r.bakiye }), { tah: 0, fat: 0, bek: 0, bak: 0 });
    $('#ustSag').innerHTML = `<select class="btn cizgi" id="tDon"><option value="ay">Bu ay</option><option value="30">Son 30 gün</option><option value="yil">Bu yıl</option></select>`; $('#tDon').value = donem; $('#tDon').onchange = e => { donem = e.target.value; S6.tahsilat(); };
    $('#icerik').innerHTML = `<div class="a8-ozet"><div>Net tahsilat<b>${usd2(T.tah)}</b><span class="kucuk">onaylanmış ödemeler</span></div><div>Faturalanan<b>${usd2(T.fat)}</b></div><div>Tahsilat oranı<b>${T.fat ? Math.round(T.tah / T.fat * 100) : 0}%</b></div><div>Onay bekleyen ödeme<b>${usd2(T.bek)}</b></div><div>Toplam açık bakiye<b>${usd2(T.bak)}</b></div></div>
      <div class="kart"><h3>Bayi ödeme linkleri</h3><div class="alt">Her bayiye kendi sanal POS / ödeme linkini tanımlayın. Bayi portalda <b>Cari hesabım › Online öde</b> ile ayrı ödeme sayfasından bu linke yönlenir; ödemesi "Ödeme bildirimleri" ekranına düşer, onaylayınca net tahsilata işlenir.</div>
      <table class="tablo"><tr><th>Bayi</th><th>Ödeme linki</th><th class="sag-hiza">Tahsil edilen</th><th class="sag-hiza">Faturalanan</th><th class="sag-hiza">Bekleyen bildirim</th><th class="sag-hiza">Bakiye</th></tr>
      ${R.map(r => `<tr><td><b>${esc(firmaAd(r.k))}</b><div class="kucuk">${esc(r.k)}</div></td><td><input class="s6-in" data-ln="${esc(r.k)}" value="${esc(r.link)}" placeholder="https://… (bayiye özel link)" style="width:100%;min-width:220px"></td>
        <td class="sag-hiza"><b>${usd2(r.tah)}</b></td><td class="sag-hiza">${usd2(r.fat)}</td><td class="sag-hiza">${r.bekN ? usd2(r.bek) + `<div class="kucuk">${r.bekN} bildirim</div>` : '—'}</td><td class="sag-hiza">${usd2(r.bakiye)}${r.gecmis > 0 ? `<div class="kucuk" style="color:#b91c1c">${usd2(r.gecmis)} vadesi geçmiş</div>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="kucuk">Bayi yok.</td></tr>'}</table></div>`;
    $$('[data-ln]').forEach(i => i.onchange = () => { const v = i.value.trim(); if (v && !/^https:\/\//i.test(v)) { toast('Link https:// ile başlamalı.'); i.value = (oku('exb-odeme-link', {}) || {})[i.dataset.ln] || ''; return; }
      const L = oku('exb-odeme-link', {}) || {}; if (v) L[i.dataset.ln] = v; else delete L[i.dataset.ln]; yaz('exb-odeme-link', L); islemYaz('Ödeme linki', `${firmaAd(i.dataset.ln)}: ${v || 'kaldırıldı'}`); toast('Ödeme linki kaydedildi.'); });
      EK.tahsilatSiparisler?.();
};
})();
