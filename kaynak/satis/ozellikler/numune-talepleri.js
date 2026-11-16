// Bayilerin numune ve katalog talepleri (v2.8). Yeni ödeme bildirimi veya numune talebi gelince sayfa yenilenir.
(function () {
  const IK = { odeme: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>', numune: '<path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>', duyuru: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12"/>' };
  const dug = (s, ik, ad) => `<button class="m" data-s="${s}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[ik]}</svg>${ad} <span class="say gizli"></span></button>`;
  const ob = $('aside button.m[data-s=odemeler]');
  if (ob && !$('aside button.m[data-s=numuneler]')) ob.insertAdjacentHTML('afterend', dug('numuneler', 'numune', 'Numune talepleri'));
  // ---------- numune talepleri
  const NDZ = { yeni: 'Yeni', hazirlaniyor: 'Hazırlanıyor', gonderildi: 'Gönderildi', iptal: 'İptal' };
  let NF = 'acik';
  function numuneler() {
    const T = oku('exb-numune', []), L = T.filter(o => NF === '' || (NF === 'acik' ? ['yeni', 'hazirlaniyor'].includes(o.durum) : o.durum === NF)).sort((a, b) => b.zaman - a.zaman);
    $('#baslik').textContent = 'Numune talepleri';
    const say = {}; T.forEach(o => o.tur.forEach(t => say[t] = (say[t] || 0) + 1));
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Yeni talep</span><b>${T.filter(o => o.durum === 'yeni').length}</b><small>hazırlanmayı bekliyor</small></div><div><span>Hazırlanıyor</span><b>${T.filter(o => o.durum === 'hazirlaniyor').length}</b><small>gönderilecek</small></div>
      <div><span>Gönderilen</span><b>${T.filter(o => o.durum === 'gonderildi').length}</b><small>toplam</small></div><div><span>En çok istenen</span><b style="font-size:16px">${esc((Object.entries(say).sort((a, b) => b[1] - a[1])[0] || ['—'])[0])}</b><small>${T.length} talep</small></div></div>
      <div class="kart"><h3>Numune ve katalog talepleri</h3><div class="alt">Bayiler portaldan kartela, numune veya basılı katalog ister. Durumu ve kargo bilgisini burada güncellediğinizde bayi Siparişlerim sayfasında görür.</div>
      <div class="sek">${[['acik', 'Açık'], ['gonderildi', 'Gönderilen'], ['iptal', 'İptal'], ['', 'Tümü']].map(([k, a]) => `<button data-nf="${k}" class="${NF === k ? 'on' : ''}">${a}</button>`).join('')}</div>
      ${L.length ? `<table class="tablo ns-sat"><tr><th>No</th><th>Bayi</th><th>Talep</th><th>Adres</th><th>Durum</th><th>Kargo / takip</th><th></th></tr>
        ${L.map(o => `<tr data-nn="${esc(o.no)}"><td><b>${esc(o.no)}</b><div class="kucuk">${tarihSaat(o.zaman)}</div></td><td>${esc(o.firma || firmaAd(o.kul))}<div class="kucuk">${esc([o.ad, o.tel].filter(Boolean).join(' · '))}</div></td>
          <td>${esc(o.tur.join(', '))}<div class="kucuk">${esc([o.urun, o.kod, o.adet + ' adet'].filter(Boolean).join(' · '))}</div>${o.not ? `<div class="kucuk">Not: ${esc(o.not)}</div>` : ''}</td><td class="kucuk" style="max-width:220px">${esc(o.adres)}</td>
          <td><select data-a="durum">${Object.entries(NDZ).map(([k, v]) => `<option value="${k}" ${o.durum === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
          <td><input data-a="kargo" placeholder="Kargo firması" value="${esc(o.kargo || '')}"><input data-a="takip" placeholder="Takip no" value="${esc(o.takip || '')}" style="margin-top:4px"></td><td><button class="btn" data-nk>Kaydet</button></td></tr>`).join('')}</table>` : '<div class="bos">Bu filtrede talep yok.</div>'}</div>`;
    $$('[data-nf]').forEach(b => b.onclick = () => { NF = b.dataset.nf; numuneler(); });
    $$('[data-nk]').forEach(b => b.onclick = () => { const r = b.closest('tr'), T = oku('exb-numune', []), o = T.find(x => x.no === r.dataset.nn); if (!o) return;
      r.querySelectorAll('[data-a]').forEach(i => o[i.dataset.a] = i.value.trim()); o.guncel = Date.now(); o.kim = kimAd(); yaz('exb-numune', T); toast(o.no + ' güncellendi.'); EK.rozetler(); numuneler(); });
  }

  EK.sayfalar.numuneler = ['Numune talepleri', numuneler];
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
  const odemeler = () => EK.sayfalar.odemeler[1]();
  const adet = () => oku('exb-odeme', []).length + oku('exb-numune', []).length; let son = adet();
  setInterval(() => { const y = adet(); if (y > son) { EK.rozetler(); if (aktif === 'odemeler' && !$('.perde')) odemeler(); if (aktif === 'numuneler' && !$('.perde') && !document.activeElement.closest('#icerik')) numuneler(); toast('Bayiden yeni bildirim geldi.'); } son = y; }, 20000);
  EK.rozetler();
})();
