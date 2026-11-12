
/* ek9: sipariş onaylanınca bayiye iskontolu net tutar yazılır, bayi "Ödeme bekleniyor" görür ve öder */
(function () {
  const S6 = window.S6; if (!S6) return;
  const usd = n => (Math.round((n || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
  const netYaz = no => { const o = SIP[no]; if (!o) return; const P = oku('exb-siparisler', []) || [], x = P.find(p => p.no === no); if (!x) return;
    x.net = Math.round(tutarlar(o).net * 100) / 100; x.iskonto = Math.round(tutarlar(o).oran * 10) / 10; x.odemeBekleniyor = true; yaz('exb-siparisler', P); };
  const _dy9 = durumYaz;
  durumYaz = function (no, d) { const r = _dy9.apply(this, arguments); if (['onay', 'uretim', 'sevk'].includes(d) && SIP[no] && SIP[no].durum === d) netYaz(no); return r; };
  const odenen = (kul, no, net) => { const O = (oku('exb-odeme', []) || []).filter(x => x.kul === kul && (x.siparis === no || (!x.siparis && String(x.not || '').includes(no))));
    return { ok: O.filter(x => x.durum === 'onaylandi').reduce((a, x) => a + x.tutar, 0), bek: O.filter(x => x.durum === 'bekliyor').reduce((a, x) => a + x.tutar, 0) }; };
  const _th = S6.tahsilat;
  S6.tahsilat = function () { _th(); const L = (oku('exb-siparisler', []) || []).filter(p => p.net != null && ['onay', 'uretim', 'sevk'].includes(p.durum)).map(p => ({ p, ...odenen(p.kul, p.no, p.net) })).filter(r => r.p.net - r.ok > 0.01).sort((a, b) => a.p.tarih - b.p.tarih);
    $('#icerik').insertAdjacentHTML('afterbegin', `<div class="kart"><h3>Ödeme bekleyen onaylı siparişler (${L.length})</h3><div class="alt">Sipariş onaylandığında bayiye iskontolu net tutar gider; bayi Siparişlerim ekranında "Ödeme bekleniyor" görür ve kendi ödeme linkinden öder. Ödeme bildirimi onaylanınca sipariş "Ödeme alındı" olur.</div>
      <table class="tablo"><tr><th>Sipariş</th><th>Bayi</th><th>Durum</th><th class="sag-hiza">İskonto</th><th class="sag-hiza">Net tutar</th><th class="sag-hiza">Ödenen</th><th class="sag-hiza">Kontrolde</th><th class="sag-hiza">Kalan</th></tr>
      ${L.map(r => `<tr><td><b>${esc(r.p.no)}</b><div class="kucuk">${tarih(r.p.tarih)}</div></td><td>${esc(r.p.firma || r.p.kul)}</td><td>${esc(r.p.durum)}</td><td class="sag-hiza">%${String(r.p.iskonto ?? '—').replace('.', ',')}</td><td class="sag-hiza"><b>${usd(r.p.net)}</b></td><td class="sag-hiza">${usd(r.ok)}</td><td class="sag-hiza">${r.bek ? usd(r.bek) : '—'}</td><td class="sag-hiza"><b>${usd(r.p.net - r.ok)}</b></td></tr>`).join('') || '<tr><td colspan="8" class="kucuk">Ödeme bekleyen sipariş yok.</td></tr>'}</table></div>`); };
})();
