
(function () {
  const IK = { odeme: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>', numune: '<path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>', duyuru: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12"/>' };
  const dug = (s, ik, ad) => `<button class="m" data-s="${s}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[ik]}</svg>${ad} <span class="say gizli"></span></button>`;
  const sb = $('aside button.m[data-s=siparisler]'), kb = $('aside button.m[data-s=kampanyalar]');
  if (sb && !$('aside button.m[data-s=odemeler]')) sb.insertAdjacentHTML('afterend', dug('odemeler', 'odeme', 'Ödeme bildirimleri') + dug('numuneler', 'numune', 'Numune talepleri'));
  if (kb && !$('aside button.m[data-s=duyurular]')) kb.insertAdjacentHTML('afterend', dug('duyurular', 'duyuru', 'Duyurular'));
  const zaman = t => new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  const firmaAd = k => (MUS[k] || {}).firma || k;
  function pencere(html, gen) { const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) p.remove(); }; p.innerHTML = `<div class="pencere" style="${gen ? '' : 'max-width:560px'}"><button class="kapat">×</button>${html}</div>`; document.body.appendChild(p); p.querySelector('.kapat').onclick = () => p.remove(); return p; }
  function rozetler() {
    const n1 = oku('exb-odeme', []).filter(o => o.durum === 'bekliyor').length, n2 = oku('exb-numune', []).filter(o => o.durum === 'yeni').length;
    [['odemeler', n1], ['numuneler', n2]].forEach(([s, n]) => { const r = $(`aside button.m[data-s=${s}] .say`); if (r) { r.textContent = n; r.classList.toggle('gizli', !n); } });
  }

  // ---------- ödeme bildirimleri
  const ODZ = { bekliyor: 'Bekliyor', onaylandi: 'Tahsilat işlendi', reddedildi: 'Reddedildi' };
  let OF = 'bekliyor';
  function odemeler() {
    const T = oku('exb-odeme', []), L = T.filter(o => !OF || o.durum === OF).sort((a, b) => b.zaman - a.zaman), B = T.filter(o => o.durum === 'bekliyor');
    const ay = new Date(); ay.setDate(1); ay.setHours(0, 0, 0, 0);
    $('#baslik').textContent = 'Ödeme bildirimleri';
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Bekleyen bildirim</span><b>${B.length}</b><small>kontrol edilecek</small></div><div><span>Bekleyen tutar</span><b>${usd(B.reduce((a, o) => a + o.tutar, 0))}</b><small>bayilerin bildirdiği</small></div>
      <div><span>Bu ay işlenen</span><b>${usd(T.filter(o => o.durum === 'onaylandi' && o.karar >= +ay).reduce((a, o) => a + o.tutar, 0))}</b><small>cariye tahsilat olarak</small></div></div>
      <div class="kart"><h3>Bayilerden gelen ödeme bildirimleri</h3><div class="alt">Bayi, portaldaki Cari hesabım ekranından ödemesini ve dekontunu bildirir. “Tahsilat olarak işle” dediğinizde tutar bayinin cari hesabına ödeme olarak düşer ve bayi bunu kendi ekranında görür.</div>
      <div class="sek">${[['bekliyor', 'Bekleyen'], ['onaylandi', 'İşlenen'], ['reddedildi', 'Reddedilen'], ['', 'Tümü']].map(([k, a]) => `<button data-of="${k}" class="${OF === k ? 'on' : ''}">${a}</button>`).join('')}</div>
      ${L.length ? `<table class="tablo"><tr><th>No</th><th>Bayi</th><th>Ödeme tarihi</th><th>Yöntem</th><th class="sag-hiza">Tutar</th><th>Dekont</th><th>Durum</th><th></th></tr>
        ${L.map(o => `<tr><td><b>${esc(o.no)}</b><div class="kucuk">${zaman(o.zaman)}</div></td><td>${esc(o.firma || firmaAd(o.kul))}<div class="kucuk">${esc(o.ad || '')}</div></td><td>${tarih(o.tarih)}</td><td>${esc(o.yontem)}${o.ref ? `<div class="kucuk">${esc(o.ref)}</div>` : ''}${o.not ? `<div class="kucuk">${esc(o.not)}</div>` : ''}</td>
          <td class="sag-hiza"><b>${usd(o.tutar)}</b></td><td>${o.dosya ? `<button class="btn cizgi kucuk" data-dk="${esc(o.no)}">Görüntüle</button>` : '<span class="kucuk">Yok</span>'}</td>
          <td><span class="dz ${o.durum}">${ODZ[o.durum]}</span>${o.kim ? `<div class="kucuk">${esc(o.kim)} · ${zaman(o.karar)}</div>` : ''}${o.redNot ? `<div class="kucuk">${esc(o.redNot)}</div>` : ''}</td>
          <td style="white-space:nowrap">${o.durum === 'bekliyor' ? `<button class="btn marka" data-oi="${esc(o.no)}">Tahsilat olarak işle</button> <button class="btn cizgi" data-or="${esc(o.no)}">Reddet</button>` : ''}</td></tr>`).join('')}</table>` : '<div class="bos">Bu filtrede bildirim yok.</div>'}</div>`;
    $$('[data-of]').forEach(b => b.onclick = () => { OF = b.dataset.of; odemeler(); });
    const bul = no => { const T = oku('exb-odeme', []); return [T, T.find(o => o.no === no)]; };
    $$('[data-dk]').forEach(b => b.onclick = () => { const [, o] = bul(b.dataset.dk); if (!o || !o.dosya) return; const d = o.dosya;
      pencere(`<h3 style="margin:0">${esc(o.no)} · dekont</h3><div class="kucuk">${esc(o.firma)} · ${usd(o.tutar)} · ${tarih(o.tarih)}</div>${/^image\//.test(d.tip) ? `<img class="dk-onizle" src="${d.veri}" alt="Dekont">` : `<object class="dk-onizle" data="${d.veri}" type="application/pdf" style="width:100%;height:70vh"></object>`}<a class="btn cizgi" href="${d.veri}" download="${esc(d.ad || o.no)}">Dosyayı indir</a>`, true); });
    $$('[data-oi]').forEach(b => b.onclick = () => { const [T, o] = bul(b.dataset.oi); if (!o) return;
      const th = 'TH-' + Date.now().toString(36).toUpperCase();
      cariHesap(o.kul).hareket.push({ tip: 'odeme', no: th, tarih: Date.parse(o.tarih) || Date.now(), tutar: o.tutar, aciklama: o.yontem + ' · bayi bildirimi ' + o.no + (o.ref ? ' · ' + o.ref : '') }); cariYaz();
      Object.assign(o, { durum: 'onaylandi', kim: kimAd(), karar: Date.now(), tahsilatNo: th }); yaz('exb-odeme', T); toast(o.firma + ' ödemesi cariye işlendi: ' + usd(o.tutar)); rozetler(); odemeler(); });
    $$('[data-or]').forEach(b => b.onclick = () => { const p = pencere(`<h3>Bildirimi reddet</h3><div class="alan"><label>Neden (bayi görür)</label><input id="rNed" placeholder="Örn. dekont okunmuyor, tutar hesaba geçmedi"></div><button class="btn marka" id="rKay">Reddet</button>`);
      p.querySelector('#rKay').onclick = () => { const [T, o] = bul(b.dataset.or); if (!o) return; Object.assign(o, { durum: 'reddedildi', kim: kimAd(), karar: Date.now(), redNot: p.querySelector('#rNed').value.trim() }); yaz('exb-odeme', T); p.remove(); toast('Bildirim reddedildi.'); rozetler(); odemeler(); }; });
  }

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
        ${L.map(o => `<tr data-nn="${esc(o.no)}"><td><b>${esc(o.no)}</b><div class="kucuk">${zaman(o.zaman)}</div></td><td>${esc(o.firma || firmaAd(o.kul))}<div class="kucuk">${esc([o.ad, o.tel].filter(Boolean).join(' · '))}</div></td>
          <td>${esc(o.tur.join(', '))}<div class="kucuk">${esc([o.urun, o.kod, o.adet + ' adet'].filter(Boolean).join(' · '))}</div>${o.not ? `<div class="kucuk">Not: ${esc(o.not)}</div>` : ''}</td><td class="kucuk" style="max-width:220px">${esc(o.adres)}</td>
          <td><select data-a="durum">${Object.entries(NDZ).map(([k, v]) => `<option value="${k}" ${o.durum === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
          <td><input data-a="kargo" placeholder="Kargo firması" value="${esc(o.kargo || '')}"><input data-a="takip" placeholder="Takip no" value="${esc(o.takip || '')}" style="margin-top:4px"></td><td><button class="btn" data-nk>Kaydet</button></td></tr>`).join('')}</table>` : '<div class="bos">Bu filtrede talep yok.</div>'}</div>`;
    $$('[data-nf]').forEach(b => b.onclick = () => { NF = b.dataset.nf; numuneler(); });
    $$('[data-nk]').forEach(b => b.onclick = () => { const r = b.closest('tr'), T = oku('exb-numune', []), o = T.find(x => x.no === r.dataset.nn); if (!o) return;
      r.querySelectorAll('[data-a]').forEach(i => o[i.dataset.a] = i.value.trim()); o.guncel = Date.now(); o.kim = kimAd(); yaz('exb-numune', T); toast(o.no + ' güncellendi.'); rozetler(); numuneler(); });
  }

  // ---------- duyurular
  let DY = oku('exs-duyuru', null) || oku('exb-duyuru', []) || [];
  const dyYaz = () => { yaz('exs-duyuru', DY); yaz('exb-duyuru', DY); };
  const TUR = { genel: 'Genel duyuru', urun: 'Yeni ürün', fiyat: 'Fiyat değişikliği', kampanya: 'Kampanya' };
  const dyDurum = d => { const b = new Date().toISOString().slice(0, 10); return d.aktif === false ? ['Pasif', 'iptal'] : d.bas && d.bas > b ? ['Planlandı', 'hazirlaniyor'] : d.bit && d.bit < b ? ['Süresi doldu', ''] : ['Yayında', 'gonderildi']; };
  function duyurular() {
    $('#baslik').textContent = 'Duyurular';
    const BY = Object.values(MUS).filter(m => m && m.kul).sort((a, b) => String(a.firma || a.kul).localeCompare(String(b.firma || b.kul), 'tr'));
    const okuyan = d => BY.filter(m => (oku('exb-duyuru-okundu-' + m.kul, []) || []).includes(d.id)).length;
    $('#icerik').innerHTML = `<div class="kart"><h3>Yeni duyuru</h3><div class="alt">Duyuru, bayi portalında katalogun üstünde görünür; bayi girişte yeni duyuru olduğunu görür. Hedef bayi seçmezseniz tüm bayilere gider.</div>
      <div class="dy-form"><div class="alan"><label>Başlık</label><input id="dBas" placeholder="Örn. 2027 koleksiyonu yayında"></div><div class="alan"><label>Tür</label><select id="dTur">${Object.entries(TUR).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="alan genis"><label>Metin</label><textarea id="dMet" rows="3" placeholder="Bayilere iletmek istediğiniz bilgi"></textarea></div>
        <div class="alan"><label>Yayın başlangıcı</label><input id="dBs" type="date" value="${new Date().toISOString().slice(0, 10)}"></div><div class="alan"><label>Yayın bitişi (isteğe bağlı)</label><input id="dBt" type="date"></div>
        <div class="alan genis"><label>Hedef bayiler (boş = tümü)</label><div class="bayi-sec">${BY.map(m => `<label><input type="checkbox" value="${esc(m.kul)}"> ${esc(m.firma || m.kul)}</label>`).join('') || '<span class="kucuk">Kayıtlı bayi yok.</span>'}</div></div></div>
      <button class="btn marka" id="dYay">Yayınla</button></div>
      <div class="kart"><h3>Duyurular (${DY.length})</h3>${DY.length ? `<table class="tablo"><tr><th>Duyuru</th><th>Tür</th><th>Yayın</th><th>Hedef</th><th class="sag-hiza">Okuyan</th><th>Durum</th><th></th></tr>
        ${DY.slice().sort((a, b) => b.zaman - a.zaman).map(d => { const [ds, dc] = dyDurum(d); return `<tr><td><b>${esc(d.baslik)}</b>${d.metin ? `<div class="kucuk" style="max-width:380px;white-space:pre-line">${esc(d.metin)}</div>` : ''}<div class="kucuk">${esc(d.kim || '')} · ${zaman(d.zaman)}</div></td><td>${TUR[d.tur] || ''}</td>
          <td class="kucuk">${d.bas ? tarih(d.bas) : '—'}${d.bit ? ' – ' + tarih(d.bit) : ''}</td><td class="kucuk">${(d.bayiler || []).length ? esc(d.bayiler.map(firmaAd).join(', ')) : 'Tüm bayiler'}</td><td class="sag-hiza">${okuyan(d)}</td><td><span class="dz ${dc}">${ds}</span></td>
          <td style="white-space:nowrap"><button class="btn cizgi" data-dp="${d.id}">${d.aktif === false ? 'Yayına al' : 'Durdur'}</button> <button class="btn cizgi" data-ds="${d.id}">Sil</button></td></tr>`; }).join('')}</table>` : '<div class="bos">Henüz duyuru yok.</div>'}</div>`;
    $('#dYay').onclick = () => { const bs = $('#dBas').value.trim(); if (!bs) return toast('Başlık yazın.');
      DY.push({ id: 'd' + Date.now().toString(36), baslik: bs, metin: $('#dMet').value.trim(), tur: $('#dTur').value, bas: $('#dBs').value, bit: $('#dBt').value, bayiler: $$('.bayi-sec input:checked').map(i => i.value), aktif: true, zaman: Date.now(), kim: kimAd() });
      dyYaz(); toast('Duyuru bayi portalında yayınlandı.'); duyurular(); };
    $$('[data-dp]').forEach(b => b.onclick = () => { const d = DY.find(x => x.id === b.dataset.dp); d.aktif = d.aktif === false; dyYaz(); duyurular(); });
    $$('[data-ds]').forEach(b => b.onclick = () => { if (!b.dataset.emin) { b.dataset.emin = 1; b.textContent = 'Silinsin mi?'; return; } DY = DY.filter(x => x.id !== b.dataset.ds); dyYaz(); toast('Duyuru silindi.'); duyurular(); });
  }

  const SAY = { odemeler: ['Ödeme bildirimleri', odemeler], numuneler: ['Numune talepleri', numuneler], duyurular: ['Duyurular', duyurular] };
  const _gitE = git;
  git = function (s) { const S = SAY[s]; if (S) { try { $('#yol').textContent = 'Satış Yönetimi  /  ' + S[0]; } catch (e) {} aktif = s; $$('aside button.m[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = ''; S[1](); window.scrollTo(0, 0); } else _gitE(s); rozetler(); };
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
  const adet = () => oku('exb-odeme', []).length + oku('exb-numune', []).length; let son = adet();
  setInterval(() => { const y = adet(); if (y > son) { rozetler(); if (aktif === 'odemeler' && !$('.perde')) odemeler(); if (aktif === 'numuneler' && !$('.perde') && !document.activeElement.closest('#icerik')) numuneler(); toast('Bayiden yeni bildirim geldi.'); } son = y; }, 20000);
  rozetler();
})();
