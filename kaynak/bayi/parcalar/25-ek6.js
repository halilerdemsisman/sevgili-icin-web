
(function () {
  const p2 = n => (Math.round((n || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
  const tr = t => new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const benim = () => oku('exb-siparisler', []).filter(o => ben && o.kul === ben.kul);
  const perde = html => { const p = document.createElement('div'); p.className = 'perde form-p'; p.onclick = e => { if (e.target === p) p.remove(); }; p.innerHTML = `<div class="pencere" style="position:relative;max-width:640px"><button class="kapat" aria-label="Kapat">×</button>${html}</div>`; document.body.appendChild(p); p.querySelector('.kapat').onclick = () => p.remove(); return p; };
  const svg = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IADE_D = { yeni: ['Alındı', 'iade-yeni'], inceleme: ['İnceleniyor', 'iade-inceleme'], onay: ['Onaylandı', 'iade-onay'], red: ['Reddedildi', 'iade-red'], cozuldu: ['Çözüldü', 'iade-cozuldu'] };
  const iadeler = () => (oku('exb-iade', []) || []).filter(x => ben && x.kul === ben.kul);

  // ================= 1. Bildirimler =================
  const BK = () => 'exb-bildirim-' + ben.kul, bnOku = () => oku(BK(), { liste: [], iz: null }), bnYaz = v => yaz(BK(), v);
  function izCikar() {
    const iz = { s: {}, i: {}, d: [], h: [] };
    benim().forEach(o => iz.s[o.no] = [o.durum, o.termin || '', o.kargo || '', o.takip || ''].join('|'));
    iadeler().forEach(x => iz.i[x.id] = x.durum + '|' + (x.yanit || ''));
    iz.d = (oku('exb-duyuru', []) || []).filter(d => d.aktif !== false && (!(d.bayiler || []).length || d.bayiler.includes(ben.kul))).map(d => d.id || d.zaman);
    iz.h = (oku('exb-hatirlat', []) || []).filter(m => m.kul === ben.kul).map(m => m.id);
    return iz;
  }
  function bnKontrol() {
    if (!ben) return; const B = bnOku(), yeni = izCikar();
    if (!B.iz) { B.iz = yeni; bnYaz(B); return bnRozet(); }
    const E = [], O = benim(), I = iadeler();
    Object.keys(yeni.s).forEach(no => { const es = B.iz.s[no]; if (es === undefined || es === yeni.s[no]) return; const o = O.find(x => x.no === no), ed = es.split('|')[0];
      E.push({ baslik: ed !== o.durum ? `${no}: ${(DURUM[o.durum] || [o.durum])[0]}` : `${no}: teslim / nakliye bilgisi güncellendi`, alt: [o.termin && 'Termin: ' + o.termin, o.kargo && 'Nakliye: ' + o.kargo, o.takip && 'Takip: ' + o.takip].filter(Boolean).join(' · '), git: 'siparisler' }); });
    Object.keys(yeni.i).forEach(id => { const es = B.iz.i[id]; if (es === undefined || es === yeni.i[id]) return; const x = I.find(y => y.id === id);
      E.push({ baslik: `${x.no} iade/şikayet: ${IADE_D[x.durum][0]}`, alt: x.yanit || '', git: 'belgeler', sek: 'iade' }); });
    yeni.d.filter(d => !B.iz.d.includes(d)).forEach(id => { const d = (oku('exb-duyuru', []) || []).find(x => (x.id || x.zaman) === id); if (d) E.push({ baslik: 'Yeni duyuru: ' + (d.baslik || ''), alt: (d.metin || '').slice(0, 90), duyuru: 1 }); });
    yeni.h.filter(h => !B.iz.h.includes(h)).forEach(id => { const m = (oku('exb-hatirlat', []) || []).find(x => x.id === id); if (m) E.push({ baslik: 'Satış ekibinden mesaj', alt: (m.metin || '').slice(0, 120) }); });
    B.iz = yeni;
    if (E.length) { E.forEach(e => { e.id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); e.zaman = Date.now(); e.okundu = false; B.liste.unshift(e); masaustu(e); });
      B.liste = B.liste.slice(0, 60); }
    bnYaz(B); bnRozet(); if ($('#bnPanel')) bnPanel(true);
  }
  function masaustu(e) {
    try { if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      const n = new Notification('EXIT Garden · ' + e.baslik, { body: e.alt || '', tag: e.id, icon: (document.querySelector('link[rel*=icon]') || {}).href });
      n.onclick = () => { window.focus(); bnAc(e); n.close(); }; } } catch (x) {}
  }
  function bnRozet() {
    const b = $('#hBildirim'); if (!b || !ben) return; const n = bnOku().liste.filter(e => !e.okundu).length;
    let r = b.querySelector('.bl-say'); if (!r) { b.insertAdjacentHTML('beforeend', '<span class="bl-say"></span>'); r = b.querySelector('.bl-say'); }
    r.textContent = n > 9 ? '9+' : n; r.style.display = n ? 'flex' : 'none';
    try { n ? navigator.setAppBadge && navigator.setAppBadge(n) : navigator.clearAppBadge && navigator.clearAppBadge(); } catch (x) {}
  }
  function bnAc(e) {
    const B = bnOku(), x = B.liste.find(y => y.id === e.id); if (x) x.okundu = true; bnYaz(B); bnRozet(); $('#bnPanel') && $('#bnPanel').remove();
    if (e.duyuru && typeof tumDuyurular === 'function') return tumDuyurular();
    if (e.git) { git(e.git); if (e.sek) setTimeout(() => belgeSek(e.sek), 0); }
  }
  function bnPanel(yenile) {
    let p = $('#bnPanel'); if (p && !yenile) return p.remove(); if (!p) { p = document.createElement('div'); p.id = 'bnPanel'; document.body.appendChild(p); setTimeout(() => document.addEventListener('click', function k(ev) { if (!p.contains(ev.target) && !ev.target.closest('#hBildirim')) { p.remove(); document.removeEventListener('click', k); } }), 0); }
    const B = bnOku(), izin = 'Notification' in window ? Notification.permission : 'yok';
    p.innerHTML = `<div class="bn-ust"><b>Bildirimler</b><span>${B.liste.some(e => !e.okundu) ? '<button class="btn cizgi" id="bnHepsi" style="padding:5px 10px;font-size:12px">Tümünü okundu say</button>' : ''}</span></div>
      ${izin === 'default' ? '<div class="bn" id="bnIzin" style="background:#eff6ff">🔔 <b>Telefon / masaüstü bildirimlerini aç</b><small>Uygulama kapalıyken de sipariş durumu değişince haber verelim.</small></div>' : ''}
      ${izin === 'denied' ? '<div class="bn"><small>Tarayıcı bildirimleri engellenmiş; tarayıcı ayarlarından bu siteye izin verebilirsiniz.</small></div>' : ''}
      ${B.liste.map(e => `<div class="bn ${e.okundu ? '' : 'yeni'}" data-bn="${e.id}"><b>${esc(e.baslik)}</b>${e.alt ? `<small>${esc(e.alt)}</small>` : ''}<small>${new Date(e.zaman).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div>`).join('') || '<div class="bn"><small>Henüz bildirim yok. Sipariş durumu, iade yanıtı, duyuru veya satış ekibinden mesaj gelince burada görünür.</small></div>'}`;
    p.querySelectorAll('[data-bn]').forEach(d => d.onclick = () => bnAc(B.liste.find(e => e.id === d.dataset.bn)));
    const h = p.querySelector('#bnHepsi'); if (h) h.onclick = ev => { ev.stopPropagation(); const B2 = bnOku(); B2.liste.forEach(e => e.okundu = true); bnYaz(B2); bnRozet(); bnPanel(true); };
    const iz = p.querySelector('#bnIzin'); if (iz) iz.onclick = ev => { ev.stopPropagation(); Notification.requestPermission().then(() => bnPanel(true)); };
  }

  // ================= 6 + 7. Belgelerim ve iade/şikayet sayfası =================
  const hs = $('#hSepet');
  if (hs && !$('#hBildirim')) hs.insertAdjacentHTML('beforebegin', `<button class="h-btn" data-git="belgeler">${svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>')}<span class="y">Belgeler</span></button><button class="h-btn" id="hBildirim" title="Bildirimler" style="position:relative">${svg('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>')}</button>`);
  const hh = $('#hHat'); if (hh) { const sv = hh.querySelector('svg'); if (sv) sv.outerHTML = svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M5 3 2 6M19 3l3 3"/>'); }
  $('#hBildirim').onclick = e => { e.stopPropagation(); bnPanel(); };
  if (!$('#s-belgeler')) $('#s-cari').insertAdjacentHTML('afterend', '<section id="s-belgeler" class="sayfa gizli"></section>');
  let SEK = 'fatura';
  function belgeSek(s) { SEK = s; belgeler(); }
  function belgeler() {
    const c = (oku('exb-cari', {}) || {})[ben.kul] || { vade: 60, hareket: [] }, F = c.hareket.filter(h => h.tip === 'fatura').sort((a, b) => b.tarih - a.tarih);
    const S = benim().filter(o => o.durum === 'sevk').sort((a, b) => b.tarih - a.tarih), I = iadeler().sort((a, b) => b.zaman - a.zaman);
    const ust = `<h2>Belgeler ve destek</h2><p class="kucuk">Faturalarınızı, irsaliyelerinizi ve hesap ekstrenizi PDF olarak kaydedin; ürün iadesi veya şikâyet bildirin.</p>
      <div class="bg-sek">${[['fatura', 'Faturalar (' + F.length + ')'], ['irsaliye', 'İrsaliyeler (' + S.length + ')'], ['ekstre', 'Hesap ekstresi'], ['iade', 'İade ve şikâyet (' + I.length + ')']].map(([k, l]) => `<button data-sek="${k}" class="${SEK === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    let ic = '';
    if (SEK === 'fatura') ic = F.length ? `<table class="bg-tab"><tr><th>Fatura no</th><th>Tarih</th><th>Vade</th><th class="sag">Tutar</th><th></th></tr>${F.map(f => `<tr><td><b>${esc(f.no)}</b><div class="kucuk">${esc(f.aciklama || '')}</div></td><td>${tr(f.tarih)}</td><td>${f.vade ? tr(f.vade) : '—'}</td><td class="sag">${p2(f.tutar)}</td><td class="sag"><button class="btn cizgi" data-pf="${esc(f.no)}">PDF</button></td></tr>`).join('')}</table>` : '<div class="bos-durum">Henüz fatura yok. Siparişiniz sevk edildiğinde faturası burada görünür.</div>';
    if (SEK === 'irsaliye') ic = S.length ? `<table class="bg-tab"><tr><th>Sipariş</th><th>Tarih</th><th>Nakliye</th><th class="sag">Kalem</th><th></th></tr>${S.map(o => `<tr><td><b>${esc(o.no)}</b></td><td>${tr(o.tarih)}</td><td>${esc([o.kargo, o.takip].filter(Boolean).join(' · ') || '—')}</td><td class="sag">${o.kalemler.reduce((a, x) => a + x.adet, 0)}</td><td class="sag"><button class="btn cizgi" data-pi="${esc(o.no)}">PDF</button></td></tr>`).join('')}</table>` : '<div class="bos-durum">Sevk edilmiş sipariş yok.</div>';
    if (SEK === 'ekstre') { const y = new Date(); ic = `<div class="lm-kart"><div class="ia-form"><div><label>Başlangıç</label><input type="date" id="exB" value="${y.getFullYear()}-01-01"></div><div><label>Bitiş</label><input type="date" id="exS" value="${y.toISOString().slice(0, 10)}"></div></div><button class="btn marka" id="exPdf" style="margin-top:12px">Ekstreyi PDF olarak al</button><p class="kucuk">Açılan sayfada “PDF olarak kaydet” seçin.</p></div>`; }
    if (SEK === 'iade') ic = `<button class="btn marka" id="iaYeni">+ Yeni iade / şikâyet</button>
      ${I.length ? `<table class="bg-tab" style="margin-top:14px"><tr><th>No</th><th>Sipariş</th><th>Konu</th><th>Durum</th><th>Yanıt</th></tr>${I.map(x => `<tr><td><b>${esc(x.no)}</b><div class="kucuk">${tr(x.zaman)}</div></td><td>${esc(x.sip)}<div class="kucuk">${esc(x.urun || '')}${x.adet ? ' · ' + x.adet + ' adet' : ''}</div></td><td>${esc(x.tur)}<div class="kucuk">${esc((x.aciklama || '').slice(0, 80))}</div>${(x.foto || []).length ? `<div class="ia-foto" style="margin-top:4px">${x.foto.map(f => `<img src="${f}">`).join('')}</div>` : ''}</td><td><span class="iade-d ${IADE_D[x.durum][1]}">${IADE_D[x.durum][0]}</span></td><td class="kucuk">${esc(x.yanit || '—')}</td></tr>`).join('')}</table>` : '<div class="bos-durum" style="margin-top:14px">Henüz iade veya şikâyet kaydınız yok.</div>'}`;
    $('#s-belgeler').innerHTML = ust + ic;
    $$('#s-belgeler [data-sek]').forEach(b => b.onclick = () => belgeSek(b.dataset.sek));
    $$('[data-pf]').forEach(b => b.onclick = () => faturaPdf(F.find(f => f.no === b.dataset.pf)));
    $$('[data-pi]').forEach(b => b.onclick = () => irsaliyePdf(S.find(o => o.no === b.dataset.pi)));
    const ex = $('#exPdf'); if (ex) ex.onclick = () => ekstrePdf(c, new Date($('#exB').value).getTime(), new Date($('#exS').value).getTime() + 864e5 - 1);
    const iy = $('#iaYeni'); if (iy) iy.onclick = iadeForm;
  }
  function yazdir(baslik, govde) {
    const w = window.open('', '_blank'); if (!w) return toast('Açılır pencere engellendi; tarayıcıda bu siteye izin verin.');
    w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(baslik)}</title><style>body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;margin:32px;font-size:13px}h1{font-size:22px;margin:0}.ust{display:flex;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:18px}.k{color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f1f5f9;font-size:11px;text-transform:uppercase}.s{text-align:right}.top{margin-top:14px;text-align:right;font-size:15px}.imza{display:flex;justify-content:space-between;margin-top:60px}.imza div{width:40%;border-top:1px solid #94a3b8;padding-top:6px;text-align:center;color:#64748b}@media print{body{margin:12mm}}</style></head><body>
      <div class="ust"><div><h1>EXIT Garden</h1><div class="k">BG Group · EXIT Innovative Solutions</div></div><div style="text-align:right"><h1>${esc(baslik)}</h1><div class="k">Düzenlenme: ${tr(Date.now())}</div></div></div>
      <div style="margin-bottom:10px"><b>${esc(ben.firma || ben.ad || ben.kul)}</b><div class="k">${esc([ben.ad, ben.tel, ben.mail, ben.vergi && 'VKN: ' + ben.vergi].filter(Boolean).join(' · '))}</div></div>${govde}
      <script>setTimeout(function(){print()},300)<\/script></body></html>`); w.document.close();
  }
  const kalemTablo = (o, fiyatli) => `<table><tr><th>Ürün</th><th>Seçenek</th><th class="s">Adet</th>${fiyatli ? '<th class="s">Birim</th><th class="s">Tutar</th>' : ''}</tr>${o.kalemler.map(x => `<tr><td>${esc(x.ad)}</td><td>${esc([x.secenek, x.kumas && 'Kumaş: ' + x.kumas, x.iskelet && 'İskelet: ' + x.iskelet].filter(Boolean).join(' · '))}</td><td class="s">${x.adet}</td>${fiyatli ? `<td class="s">${x.birim == null ? 'teklif' : p2(x.birim)}</td><td class="s">${x.birim == null ? '—' : p2(x.birim * x.adet)}</td>` : ''}</tr>`).join('')}</table>`;
  function faturaPdf(f) {
    const o = benim().find(x => x.no === f.sip);
    yazdir('Fatura ' + f.no, `<div class="k">Fatura tarihi ${tr(f.tarih)} · Vade ${f.vade ? tr(f.vade) : '—'} · Sipariş ${esc(f.sip || '')}</div>${o ? kalemTablo(o, true) + (o.toplam && Math.abs(o.toplam - f.tutar) > 0.5 ? `<div class="top k">Liste toplamı ${p2(o.toplam)} · iskonto ${p2(o.toplam - f.tutar)}</div>` : '') : ''}<div class="top">Fatura tutarı: <b>${p2(f.tutar)}</b></div><p class="k" style="margin-top:30px">Bu belge bilgi amaçlıdır; resmî e-fatura ayrıca iletilir.</p>`);
  }
  function irsaliyePdf(o) {
    yazdir('İrsaliye ' + o.no, `<div class="k">Sipariş tarihi ${tr(o.tarih)}${o.termin ? ' · Termin ' + esc(o.termin) : ''}${o.kargo ? ' · Nakliye ' + esc(o.kargo) : ''}${o.takip ? ' · Takip ' + esc(o.takip) : ''}</div>${o.adres ? `<div style="margin-top:8px"><b>Teslimat adresi:</b> ${esc(o.adres)}</div>` : ''}${kalemTablo(o, false)}<div class="top">Toplam ${o.kalemler.reduce((a, x) => a + x.adet, 0)} adet</div><div class="imza"><div>Teslim eden</div><div>Teslim alan (kaşe / imza)</div></div>`);
  }
  function ekstrePdf(c, b, s) {
    const H = c.hareket.slice().sort((x, y) => x.tarih - y.tarih); let bak = 0, devir = 0; const sat = [];
    H.forEach(h => { const d = h.tip === 'fatura' ? h.tutar : -h.tutar; if (h.tarih < b) { devir += d; return; } if (h.tarih > s) return; sat.push([h, d]); });
    bak = devir;
    yazdir('Hesap ekstresi', `<div class="k">${tr(b)} – ${tr(s)} · Vade ${c.vade} gün</div><table><tr><th>Tarih</th><th>Belge</th><th>Açıklama</th><th class="s">Borç</th><th class="s">Alacak</th><th class="s">Bakiye</th></tr><tr><td colspan="5"><i>Devreden bakiye</i></td><td class="s">${p2(devir)}</td></tr>
      ${sat.map(([h, d]) => { bak += d; return `<tr><td>${tr(h.tarih)}</td><td>${esc(h.no || (h.tip === 'fatura' ? 'Fatura' : 'Ödeme'))}</td><td>${esc(h.aciklama || (h.tip === 'fatura' ? '' : 'Ödeme'))}</td><td class="s">${d > 0 ? p2(d) : ''}</td><td class="s">${d < 0 ? p2(-d) : ''}</td><td class="s">${p2(bak)}</td></tr>`; }).join('')}</table><div class="top">Dönem sonu bakiye: <b>${p2(bak)}</b></div><div class="imza"><div>EXIT Garden</div><div>Mutabakat (kaşe / imza)</div></div>`);
  }
  function kucult(file) { return new Promise(r => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 900 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = im.width * k; cv.height = im.height * k; cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); r(cv.toDataURL('image/jpeg', .7)); }; im.onerror = () => r(null); im.src = fr.result; }; fr.readAsDataURL(file); }); }
  function iadeForm() {
    const O = benim().filter(o => o.durum !== 'iptal').sort((a, b) => b.tarih - a.tarih); let FOTO = [];
    if (!O.length) return toast('İade veya şikâyet için önce bir siparişiniz olmalı.');
    const p = perde(`<h3>İade / şikâyet bildir</h3><div class="ia-form" style="margin-top:12px">
      <div><label>Sipariş</label><select id="iaSip">${O.map(o => `<option value="${esc(o.no)}">${esc(o.no)} · ${tr(o.tarih)}</option>`).join('')}</select></div>
      <div><label>Konu</label><select id="iaTur"><option>Hasarlı ürün</option><option>Eksik ürün</option><option>Yanlış ürün</option><option>Kalite sorunu</option><option>İade talebi</option><option>Diğer şikâyet</option></select></div>
      <div><label>Ürün</label><select id="iaUrun"></select></div><div><label>Adet</label><input id="iaAdet" type="number" min="1" value="1"></div>
      <div class="ia-tam"><label>Açıklama</label><textarea id="iaAcik" rows="3" placeholder="Sorunu kısaca anlatın"></textarea></div>
      <div class="ia-tam"><label>Fotoğraflar (en fazla 4)</label><input type="file" id="iaFoto" accept="image/*" multiple><div class="ia-foto" id="iaOn" style="margin-top:6px"></div></div></div>
      <button class="btn marka" id="iaGonder" style="margin-top:14px;width:100%">Gönder</button>`);
    const urunler = () => { const o = O.find(x => x.no === $('#iaSip').value); $('#iaUrun').innerHTML = '<option value="">Tüm sipariş</option>' + o.kalemler.map((x, i) => `<option value="${i}">${esc(x.ad)}${x.secenek ? ' · ' + esc(x.secenek) : ''} (${x.adet})</option>`).join(''); };
    $('#iaSip').onchange = urunler; urunler();
    $('#iaFoto').onchange = async e => { for (const f of [...e.target.files].slice(0, 4 - FOTO.length)) { const d = await kucult(f); if (d) FOTO.push(d); } $('#iaOn').innerHTML = FOTO.map(f => `<img src="${f}">`).join(''); e.target.value = ''; };
    $('#iaGonder').onclick = () => {
      const ac = $('#iaAcik').value.trim(); if (!ac) return toast('Lütfen açıklama yazın.');
      const o = O.find(x => x.no === $('#iaSip').value), ui = $('#iaUrun').value, k = ui === '' ? null : o.kalemler[+ui], L = oku('exb-iade', []) || [], y = new Date().getFullYear();
      const x = { id: 'ia' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), no: 'IAD-' + y + '-' + String(L.filter(z => (z.no || '').includes('-' + y + '-')).length + 1).padStart(4, '0'), kul: ben.kul, firma: ben.firma, sip: o.no, urun: k ? k.ad + (k.secenek ? ' · ' + k.secenek : '') : 'Tüm sipariş', adet: +$('#iaAdet').value || 1, tur: $('#iaTur').value, aciklama: ac, foto: FOTO, durum: 'yeni', zaman: Date.now(), gecmis: [{ zaman: Date.now(), durum: 'yeni', kim: ben.firma || ben.kul }] };
      L.push(x); yaz('exb-iade', L); p.remove(); toast('Kaydınız alındı: ' + x.no); try { const B = bnOku(); B.iz && (B.iz.i[x.id] = x.durum + '|'); bnYaz(B); } catch (e) {} belgeSek('iade');
    };
  }

  // ================= 3. Sık aldıklarım =================
  function sikAlinan() {
    const C = {}; benim().filter(o => o.durum !== 'iptal').forEach(o => o.kalemler.forEach(x => { const k = x.ad + '|' + (x.secenek || ''); const c = C[k] = C[k] || { x, sip: 0, adet: 0, son: 0 }; c.sip++; c.adet += x.adet; if (o.tarih > c.son) { c.son = o.tarih; c.x = x; } }));
    return Object.values(C).sort((a, b) => b.sip - a.sip || b.adet - a.adet).slice(0, 8);
  }
  function sikEkle(c, adet) {
    const x = c.x, u = VERI.urunler.find(y => y.id === x.id) || VERI.urunler.find(y => y.ad === x.ad); if (!u) return toast(x.ad + ' artık katalogda yok.');
    const sc = x.secenek ? u.secenek.find(y => y.ad === x.secenek) : null; if (x.secenek && !sc) return toast('Bu seçenek artık satılmıyor.');
    const s = sepet(); s.push({ ...x, adet, id: u.id, ad: u.ad, kategori: u.kategori, birim: sc ? sc.fiyat : null, liste: sc ? sc.liste : null, kampanya: u.kmp ? u.kmp.ad + ' (%' + u.kmp.oran + ')' : '' }); sepetKaydet(s); toast(`${u.ad} × ${adet} sepete eklendi.`);
  }
  const _sip = siparislerim;
  siparislerim = function () {
    _sip.apply(this, arguments); const L = sikAlinan(); if (!L.length) return; const h = $('#s-siparisler h2'); if (!h || $('#saBlok')) return;
    (h.nextElementSibling || h).insertAdjacentHTML('afterend', `<div id="saBlok"><h3 style="margin:14px 0 0;font-size:15px;color:inherit">Sık aldıklarım</h3><div class="sa-izgara">${L.map((c, i) => { const u = VERI.urunler.find(y => y.id === c.x.id) || VERI.urunler.find(y => y.ad === c.x.ad), sc = u && c.x.secenek ? u.secenek.find(y => y.ad === c.x.secenek) : null, f = sc ? sc.fiyat : null;
      return `<div class="sa-k"><b>${esc(c.x.ad)}</b><span class="kucuk">${esc(c.x.secenek || '')}</span><span class="kucuk">${c.sip} siparişte · toplam ${c.adet} adet${f != null ? ' · ' + para(f) : ''}</span><div class="sa-alt"><input type="number" min="1" value="${Math.max(1, Math.round(c.adet / c.sip))}" data-saa="${i}"><button class="btn marka" data-sa="${i}" style="padding:7px 12px;font-size:12.5px" ${u ? '' : 'disabled title="Katalogda yok"'}>Sepete ekle</button></div></div>`; }).join('')}</div></div>`);
    $$('[data-sa]').forEach(b => b.onclick = () => sikEkle(L[+b.dataset.sa], Math.max(1, parseInt($(`[data-saa="${b.dataset.sa}"]`).value) || 1)));
  };

  // ================= 9. Kredi limiti (bayi görünümü) =================
  const _cariL = cariSayfa;
  cariSayfa = function () {
    _cariL.apply(this, arguments); const c = (oku('exb-cari', {}) || {})[ben.kul]; if (!c || !(+c.limit > 0) || $('#lmKart')) return;
    const z = cariOzet(c), acik = benim().filter(o => !['iptal', 'sevk'].includes(o.durum)).reduce((a, o) => a + (o.net != null ? o.net : o.toplam || 0), 0), risk = z.bakiye + acik, kul = Math.max(0, c.limit - risk), oran = Math.min(100, risk / c.limit * 100);
    const h = $('#s-cari h2'); (h && h.nextElementSibling ? h.nextElementSibling : h).insertAdjacentHTML('afterend', `<div class="lm-kart" id="lmKart"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><b>Kredi limitiniz: ${p2(c.limit)}</b><span>Kullanılabilir: <b style="color:${kul > 0 ? '#047857' : '#b91c1c'}">${p2(kul)}</b></span></div>
      <div class="lm-bar"><i style="width:${oran}%;background:${oran >= 100 ? '#dc2626' : oran > 80 ? '#d97706' : '#16a34a'}"></i></div><div class="kucuk">Bakiye ${p2(z.bakiye)} + açık siparişler ${p2(acik)} = ${p2(risk)}${oran >= 100 ? ' · Limit doldu; yeni siparişler satış yöneticisinin onayından sonra işleme alınır.' : ''}</div></div>`);
  };

  // ================= gezinme =================
  const _gitB = git;
  git = function (s) {
    if (s === 'belgeler') { $$('section.sayfa').forEach(x => x.classList.toggle('gizli', x.id !== 's-belgeler')); const k = $('#s-katalog'); k && k.classList.add('gizli'); $$('[data-git]').forEach(b => b.classList.toggle('aktif', b.dataset.git === s)); belgeler(); window.scrollTo(0, 0); }
    else { $('#s-belgeler').classList.add('gizli'); _gitB(s); }
  };
  $$('[data-git=belgeler]').forEach(b => b.onclick = () => git('belgeler'));
  window.belgeSek = belgeSek;
  setInterval(bnKontrol, 8000); setTimeout(bnKontrol, 1500);
  const rz = setInterval(() => { if (ben) { bnRozet(); clearInterval(rz); } }, 700);
  addEventListener('storage', e => { if (e.key && /^exb-(siparisler|iade|duyuru|hatirlat)$/.test(e.key)) bnKontrol(); });
})();
