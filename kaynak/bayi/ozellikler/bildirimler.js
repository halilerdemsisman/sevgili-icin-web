// Bildirimler: zil paneli, sipariş/iade/duyuru/mesaj değişikliklerinin bildirimi, uygulama rozeti.
(function () {
  const tr = t => new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const benim = () => oku('exb-siparisler', []).filter(o => ben && o.kul === ben.kul);
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
    if (e.duyuru && EK.tumDuyurular) return EK.tumDuyurular(); // (önceden başka parçadaki yerel fonksiyona bakıyordu: hiç açılmıyordu)
    if (e.git) { git(e.git); if (e.sek) setTimeout(() => EK.belgeSek?.(e.sek), 0); }
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
  // belgeler sayfasından gönderilen iade/şikâyet bildirimde yeni sayılmasın
  EK.bildirimIade = x => { try { const B = bnOku(); B.iz && (B.iz.i[x.id] = x.durum + '|'); bnYaz(B); } catch (e) {} };
  $('#hBildirim').onclick = e => { e.stopPropagation(); bnPanel(); };
  setInterval(bnKontrol, 8000); setTimeout(bnKontrol, 1500);
  const rz = setInterval(() => { if (ben) { bnRozet(); clearInterval(rz); } }, 700);
  addEventListener('storage', e => { if (e.key && /^exb-(siparisler|iade|duyuru|hatirlat)$/.test(e.key)) bnKontrol(); });
})();
