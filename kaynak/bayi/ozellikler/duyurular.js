// Duyurular: katalogda duyuru bandı, tüm duyurular penceresi, girişte yeni duyuru bildirimi.
(function () {
  const pencere = pencereAc;

  // ================= 6. duyurular =================
  const dyOkundu = () => (ben && oku('exb-duyuru-okundu-' + ben.kul, [])) || [];
  const dyListe = () => (oku('exb-duyuru', []) || []).filter(d => d.aktif !== false && (!d.bas || d.bas <= bugun()) && (!d.bit || d.bit >= bugun()) && (!(d.bayiler || []).length || (ben && d.bayiler.includes(ben.kul)))).sort((a, b) => b.zaman - a.zaman);
  const DYTUR = { genel: 'Duyuru', urun: 'Yeni ürün', fiyat: 'Fiyat', kampanya: 'Kampanya' };
  const dyKart = (d, x) => `<div class="dy ${d.tur || 'genel'}"><div><span class="t">${DYTUR[d.tur] || 'Duyuru'} · ${tarih(d.zaman)}</span><b>${esc(d.baslik)}</b>${d.metin ? `<p>${esc(d.metin)}</p>` : ''}</div>${x ? `<button class="x" data-dy-ok="${d.id}">Okundu ✓</button>` : ''}</div>`;
  EK.tumDuyurular = () => tumDuyurular();
  function tumDuyurular() {
    const L = dyListe(); pencere(`<h3>Duyurular</h3><div class="dy-bant" style="margin-top:12px">${L.map(d => dyKart(d, false)).join('') || '<div class="kucuk">Yayında duyuru yok.</div>'}</div>`);
    if (ben) yaz('exb-duyuru-okundu-' + ben.kul, [...new Set([...dyOkundu(), ...L.map(d => d.id)])]); katalog();
  }
  EK.katalogDuyuru = function () {
    if (!ben) return;
    const L = dyListe(), ok = dyOkundu(), Y = L.filter(d => !ok.includes(d.id)), ust = $('#s-katalog .ust-satir');
    let b = $('#dyBant'); if (!b && ust) { ust.insertAdjacentHTML('afterend', '<div id="dyBant"></div>'); b = $('#dyBant'); }
    if (b) { b.innerHTML = L.length ? `<div class="dy-bant">${Y.slice(0, 3).map(d => dyKart(d, true)).join('')}<button class="dy-hepsi" id="dyHepsi">${Y.length ? 'Tüm duyurular' : 'Duyurular'} (${L.length})</button></div>` : '';
      $$('[data-dy-ok]').forEach(x => x.onclick = () => { yaz('exb-duyuru-okundu-' + ben.kul, [...dyOkundu(), x.dataset.dyOk]); katalog(); });
      if ($('#dyHepsi')) $('#dyHepsi').onclick = tumDuyurular; }
  };
  EK.girisDuyuru = function () { setTimeout(() => { const n = dyListe().filter(d => !dyOkundu().includes(d.id)).length; if (n) toast(n + ' yeni duyuru var.'); }, 2900); };
  let _dySon = localStorage.getItem('exb-duyuru');
  setInterval(() => { const y = localStorage.getItem('exb-duyuru'); if (y !== _dySon) { _dySon = y; try { if (ben && !$('#s-katalog').classList.contains('gizli')) katalog(); } catch (e) {} } }, 15000);
})();
