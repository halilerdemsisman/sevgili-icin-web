// Bayilerin ödeme bildirimleri: tahsilat olarak işleme veya reddetme (v2.8). Menü rozetleri (ödeme ve numune).
(function () {
  const IK = { odeme: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>', numune: '<path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>', duyuru: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12"/>' };
  const dug = (s, ik, ad) => `<button class="m" data-s="${s}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[ik]}</svg>${ad} <span class="say gizli"></span></button>`;
  const sb = $('aside button.m[data-s=siparisler]');
  if (sb && !$('aside button.m[data-s=odemeler]')) sb.insertAdjacentHTML('afterend', dug('odemeler', 'odeme', 'Ödeme bildirimleri'));
  const pencere = (html, gen) => pencereAc(html, gen ? '' : 'max-width:560px');
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
        ${L.map(o => `<tr><td><b>${esc(o.no)}</b><div class="kucuk">${tarihSaat(o.zaman)}</div></td><td>${esc(o.firma || firmaAd(o.kul))}<div class="kucuk">${esc(o.ad || '')}</div></td><td>${tarih(o.tarih)}</td><td>${esc(o.yontem)}${o.ref ? `<div class="kucuk">${esc(o.ref)}</div>` : ''}${o.not ? `<div class="kucuk">${esc(o.not)}</div>` : ''}</td>
          <td class="sag-hiza"><b>${usd(o.tutar)}</b></td><td>${o.dosya ? `<button class="btn cizgi kucuk" data-dk="${esc(o.no)}">Görüntüle</button>` : '<span class="kucuk">Yok</span>'}</td>
          <td><span class="dz ${o.durum}">${ODZ[o.durum]}</span>${o.kim ? `<div class="kucuk">${esc(o.kim)} · ${tarihSaat(o.karar)}</div>` : ''}${o.redNot ? `<div class="kucuk">${esc(o.redNot)}</div>` : ''}</td>
          <td style="white-space:nowrap">${o.durum === 'bekliyor' ? `<button class="btn marka" data-oi="${esc(o.no)}">Tahsilat olarak işle</button> <button class="btn cizgi" data-or="${esc(o.no)}">Reddet</button>` : ''}</td></tr>`).join('')}</table>` : '<div class="bos">Bu filtrede bildirim yok.</div>'}</div>`;
    $$('[data-of]').forEach(b => b.onclick = () => { OF = b.dataset.of; odemeler(); });
    const bul = no => { const T = oku('exb-odeme', []); return [T, T.find(o => o.no === no)]; };
    $$('[data-dk]').forEach(b => b.onclick = () => { const [, o] = bul(b.dataset.dk); if (!o || !o.dosya) return; const d = o.dosya;
      pencere(`<h3 style="margin:0">${esc(o.no)} · dekont</h3><div class="kucuk">${esc(o.firma)} · ${usd(o.tutar)} · ${tarih(o.tarih)}</div>${/^image\//.test(d.tip) ? `<img class="dk-onizle" src="${d.veri}" alt="Dekont">` : `<object class="dk-onizle" data="${d.veri}" type="application/pdf" style="width:100%;height:70vh"></object>`}<a class="btn cizgi" href="${d.veri}" download="${esc(d.ad || o.no)}">Dosyayı indir</a>`, true); });
    // Faz 3b: karar yalnız bildirim hâlâ bekliyorsa yazılır (iki kişi aynı ödemeyi işlerse cariye iki kez düşmesin)
    const kararVer = async (no, f) => {
      const r = await kosullu([{ k: 'exb-odeme', a: 'no', id: no, yol: 'durum', esit: 'bekliyor' }], () => { const [T, o] = bul(no); if (o && o.durum === 'bekliyor') { f(o); yaz('exb-odeme', T); } });
      if (!r.ok) { const [, y] = bul(no); toast(r.durum === 409 && y && y.durum !== 'bekliyor' ? `${no} bu arada ${y.kim || 'başka bir kullanıcı'} tarafından işlendi (${ODZ[y.durum] || y.durum}).` : r.hata); }
      rozetler(); if (aktif === 'odemeler') odemeler(); return r.ok;
    };
    $$('[data-oi]').forEach(b => b.onclick = async () => { b.disabled = true; let o;
      const ok = await kararVer(b.dataset.oi, x => { o = x; const th = 'TH-' + Date.now().toString(36).toUpperCase();
        cariHesap(x.kul).hareket.push({ tip: 'odeme', no: th, tarih: Date.parse(x.tarih) || Date.now(), tutar: x.tutar, aciklama: x.yontem + ' · bayi bildirimi ' + x.no + (x.ref ? ' · ' + x.ref : '') }); cariYaz();
        Object.assign(x, { durum: 'onaylandi', kim: kimAd(), karar: Date.now(), tahsilatNo: th }); });
      if (ok && o) toast(o.firma + ' ödemesi cariye işlendi: ' + usd(o.tutar)); });
    $$('[data-or]').forEach(b => b.onclick = () => { const p = pencere(`<h3>Bildirimi reddet</h3><div class="alan"><label>Neden (bayi görür)</label><input id="rNed" placeholder="Örn. dekont okunmuyor, tutar hesaba geçmedi"></div><button class="btn marka" id="rKay">Reddet</button>`);
      p.querySelector('#rKay').onclick = async () => { const ned = p.querySelector('#rNed').value.trim(); p.querySelector('.kapat').click();
        if (await kararVer(b.dataset.or, o => Object.assign(o, { durum: 'reddedildi', kim: kimAd(), karar: Date.now(), redNot: ned }))) toast('Bildirim reddedildi.'); }; });
  }

  function rozetler() {
    const n1 = oku('exb-odeme', []).filter(o => o.durum === 'bekliyor').length, n2 = oku('exb-numune', []).filter(o => o.durum === 'yeni').length;
    [['odemeler', n1], ['numuneler', n2]].forEach(([s, n]) => { const r = $(`aside button.m[data-s=${s}] .say`); if (r) { r.textContent = n; r.classList.toggle('gizli', !n); } });
  }
  EK.rozetler = () => rozetler();
  EK.sayfalar.odemeler = ['Ödeme bildirimleri', odemeler];
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
})();
