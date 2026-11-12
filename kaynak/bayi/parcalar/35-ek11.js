
(function () {
  const usd = n => (Math.round((n || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
  // siparişe bağlı ödemeler: online ödemede sipariş no, havale bildiriminde açıklamadaki sipariş no
  const odemeler = no => (oku('exb-odeme', []) || []).filter(x => x.kul === ben.kul && (x.siparis === no || (!x.siparis && String(x.not || '').includes(no))));
  window.siparisOdeme = function (o) {
    if (o.net == null || !['onay', 'uretim', 'sevk'].includes(o.durum)) return null;
    const O = odemeler(o.no), ok = O.filter(x => x.durum === 'onaylandi').reduce((a, x) => a + x.tutar, 0), bek = O.filter(x => x.durum === 'bekliyor').reduce((a, x) => a + x.tutar, 0), kalan = Math.max(0, o.net - ok);
    return { net: o.net, ok, bek, kalan, durum: kalan < 0.01 ? 'odendi' : bek >= kalan - 0.01 ? 'kontrol' : ok > 0 ? 'kismi' : 'bekleniyor' };
  };
  const _sk = siparisKarti;
  siparisKarti = function (o) {
    const h = _sk(o), d = siparisOdeme(o); if (!d) return h;
    const blok = d.durum === 'odendi' ? `<div class="sk-ode ok">✓ <span>Ödeme alındı · <b>${usd(d.ok)}</b></span></div>`
      : `<div class="sk-ode"><span>${d.durum === 'kontrol' ? 'Ödemeniz kontrol ediliyor' : d.durum === 'kismi' ? 'Kalan ödeme bekleniyor' : 'Sipariş onaylandı · <b>Ödeme bekleniyor</b>'}<br>İskontolu net tutar <b>${usd(d.net)}</b>${d.ok ? ` · ödenen ${usd(d.ok)}` : ''}${d.bek ? ` · kontrolde ${usd(d.bek)}` : ''}</span>${d.durum === 'kontrol' ? '' : `<button class="btn marka" onclick="siparisOde('${o.no}', ${Math.round(d.kalan * 100) / 100})">${usd(d.kalan)} öde</button>`}</div>`;
    return h.replace('<div class="adimlar">', blok + '<div class="adimlar">').replace('<div class="sk-iptal">', blok + '<div class="sk-iptal">');
  };
  // ödeme bekleyen sipariş sayısı: Siparişlerim butonunda rozet
  function rozet() { if (!ben) return; const n = (oku('exb-siparisler', []) || []).filter(o => o.kul === ben.kul).map(siparisOdeme).filter(d => d && ['bekleniyor', 'kismi'].includes(d.durum)).length, b = $('[data-git=siparisler]'); if (!b) return;
    let r = b.querySelector('.od-rz'); if (!r) { b.style.position = 'relative'; b.insertAdjacentHTML('beforeend', '<i class="od-rz" title="Ödeme bekleyen sipariş" style="position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:#ea580c;color:#fff;font:700 10px/16px sans-serif;text-align:center;font-style:normal;padding:0 3px"></i>'); r = b.querySelector('.od-rz'); }
    r.textContent = n; r.style.display = n ? '' : 'none'; }
  let son = '';
  setInterval(() => { rozet(); if (!ben || $('#s-siparisler').classList.contains('gizli')) return; const s = JSON.stringify((oku('exb-siparisler', []) || []).filter(o => o.kul === ben.kul).map(o => [o.no, o.durum, o.net]).concat((oku('exb-odeme', []) || []).filter(x => x.kul === ben.kul).map(x => [x.no, x.durum]))); if (son && s !== son) siparislerim(); son = s; }, 4000);
})();
