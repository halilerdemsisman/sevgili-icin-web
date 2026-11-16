// Bayilere duyurular (v2.8): portalda katalogun üstünde görünür.
(function () {
  const IK = { odeme: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>', numune: '<path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>', duyuru: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12"/>' };
  const dug = (s, ik, ad) => `<button class="m" data-s="${s}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[ik]}</svg>${ad} <span class="say gizli"></span></button>`;
  const kb = $('aside button.m[data-s=kampanyalar]');
  if (kb && !$('aside button.m[data-s=duyurular]')) kb.insertAdjacentHTML('afterend', dug('duyurular', 'duyuru', 'Duyurular'));
  // ---------- duyurular
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
        ${DY.slice().sort((a, b) => b.zaman - a.zaman).map(d => { const [ds, dc] = dyDurum(d); return `<tr><td><b>${esc(d.baslik)}</b>${d.metin ? `<div class="kucuk" style="max-width:380px;white-space:pre-line">${esc(d.metin)}</div>` : ''}<div class="kucuk">${esc(d.kim || '')} · ${tarihSaat(d.zaman)}</div></td><td>${TUR[d.tur] || ''}</td>
          <td class="kucuk">${d.bas ? tarih(d.bas) : '—'}${d.bit ? ' – ' + tarih(d.bit) : ''}</td><td class="kucuk">${(d.bayiler || []).length ? esc(d.bayiler.map(firmaAd).join(', ')) : 'Tüm bayiler'}</td><td class="sag-hiza">${okuyan(d)}</td><td><span class="dz ${dc}">${ds}</span></td>
          <td style="white-space:nowrap"><button class="btn cizgi" data-dp="${d.id}">${d.aktif === false ? 'Yayına al' : 'Durdur'}</button> <button class="btn cizgi" data-ds="${d.id}">Sil</button></td></tr>`; }).join('')}</table>` : '<div class="bos">Henüz duyuru yok.</div>'}</div>`;
    $('#dYay').onclick = () => { const bs = $('#dBas').value.trim(); if (!bs) return toast('Başlık yazın.');
      DY.push({ id: 'd' + Date.now().toString(36), baslik: bs, metin: $('#dMet').value.trim(), tur: $('#dTur').value, bas: $('#dBs').value, bit: $('#dBt').value, bayiler: $$('.bayi-sec input:checked').map(i => i.value), aktif: true, zaman: Date.now(), kim: kimAd() });
      dyYaz(); toast('Duyuru bayi portalında yayınlandı.'); duyurular(); };
    $$('[data-dp]').forEach(b => b.onclick = () => { const d = DY.find(x => x.id === b.dataset.dp); d.aktif = d.aktif === false; dyYaz(); duyurular(); });
    $$('[data-ds]').forEach(b => b.onclick = () => { if (!b.dataset.emin) { b.dataset.emin = 1; b.textContent = 'Silinsin mi?'; return; } DY = DY.filter(x => x.id !== b.dataset.ds); dyYaz(); toast('Duyuru silindi.'); duyurular(); });
  }
  EK.sayfalar.duyurular = ['Duyurular', duyurular];
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
})();
