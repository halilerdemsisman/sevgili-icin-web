// Ziyaret ve görüşmeler (v3.1).
(function () {
  menuEkle('ziyaret', 'Ziyaret ve görüşmeler', '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', 'gruplar');
  S6.ziyaret = function () {
    $('#baslik').textContent = 'Ziyaret ve görüşmeler';
    const M = Object.values(MUS).filter(m => m && m.kul).sort((a, b) => (a.firma || a.kul).localeCompare(b.firma || b.kul, 'tr'));
    const N = []; Object.keys(CRM).forEach(k => { if (MUS[k] !== undefined || EK.gorur(k)) (CRM[k] || []).forEach(n => N.push({ ...n, kul: k })); }); N.sort((a, b) => b.tarih - a.tarih);
    const ZF = S6.zf || (S6.zf = { kim: '', kul: '' }), L = N.filter(n => (!ZF.kul || n.kul === ZF.kul) && (!ZF.kim || n.kim === ZF.kim));
    const bg = new Date().toISOString().slice(0, 10), HT2 = oku('exs-hatirlatma', []).filter(h => !h.bitti && h.ziyaret && EK.gorur(h.kul)).sort((a, b) => a.tarih.localeCompare(b.tarih));
    const temasYok = M.filter(m => { const t = Math.max(0, ...(CRM[m.kul] || []).map(n => n.tarih)); return !t || Date.now() - t > 30 * GUN; });
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Bu ay görüşme</span><b>${N.filter(n => new Date(n.tarih).getMonth() === new Date().getMonth() && new Date(n.tarih).getFullYear() === new Date().getFullYear()).length}</b></div><div><span>Planlı görüşme</span><b>${HT2.length}</b><small>${HT2.filter(h => h.tarih < bg).length} gecikmiş</small></div><div><span>30 gündür temas yok</span><b>${temasYok.length}</b><small>bayi</small></div></div>
      <div class="kart"><h3>Yeni kayıt</h3><div class="s6-form"><div><label>Bayi</label><select class="s6-in" id="zBayi">${M.map(m => `<option value="${esc(m.kul)}">${esc(m.firma || m.kul)}</option>`).join('')}</select></div>
        <div><label>Tür</label><select class="s6-in" id="zTur"><option>Ziyaret</option><option>Telefon</option><option>E-posta</option><option>Toplantı</option><option>Showroom</option></select></div>
        <div><label>Tarih</label><input class="s6-in" type="date" id="zTar" value="${bg}"></div><div><label>Sonraki görüşme</label><input class="s6-in" type="date" id="zSon"></div></div>
        <textarea class="s6-in" id="zNot" rows="3" style="width:100%;box-sizing:border-box;margin-top:10px" placeholder="Görüşme notu: konuşulanlar, talepler, teklif, rakip bilgisi…"></textarea><button class="btn marka" id="zKay" style="margin-top:8px">Kaydet</button></div>
      ${HT2.length ? `<div class="kart"><h3>Planlı görüşmeler</h3><table class="tablo">${HT2.map(h => `<tr><td style="white-space:nowrap" class="${h.tarih < bg ? 'azl' : ''}">${tarih(new Date(h.tarih))}</td><td><b>${esc((MUS[h.kul] || {}).firma || h.kul)}</b></td><td>${esc(h.metin)}</td><td class="kucuk">${esc(h.kim || '')}</td><td class="sag-hiza"><button class="btn kucuk cizgi" data-zb="${h.id}">Yapıldı</button></td></tr>`).join('')}</table></div>` : ''}
      <div class="kart"><h3>Görüşme geçmişi</h3><div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap"><select class="s6-in" id="zfK"><option value="">Tüm bayiler</option>${M.map(m => `<option value="${esc(m.kul)}" ${ZF.kul === m.kul ? 'selected' : ''}>${esc(m.firma || m.kul)}</option>`).join('')}</select><select class="s6-in" id="zfP"><option value="">Tüm personel</option>${[...new Set(N.map(n => n.kim))].map(k => `<option ${ZF.kim === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
      <table class="tablo">${L.slice(0, 200).map(n => `<tr><td style="white-space:nowrap">${tarih(n.tarih)}</td><td><b>${esc((MUS[n.kul] || {}).firma || n.kul)}</b></td><td><span class="uy uy-bilgi">${esc(n.tur || 'Not')}</span></td><td>${esc(n.yazi)}</td><td class="kucuk">${esc(n.kim || '')}</td></tr>`).join('') || '<tr><td class="kucuk">Kayıt yok.</td></tr>'}</table></div>
      ${temasYok.length ? `<div class="kart"><h3>Uzun süredir temas kurulmayan bayiler</h3><div>${temasYok.map(m => `<span class="uy uy-uyari" style="margin:0 6px 6px 0;display:inline-block">${esc(m.firma || m.kul)}</span>`).join('')}</div></div>` : ''}`;
    $('#zKay').onclick = () => { const kul = $('#zBayi').value, y = $('#zNot').value.trim(); if (!kul || !y) return toast('Bayi ve not gerekli.');
      const t = new Date($('#zTar').value || bg); t.setHours(12); (CRM[kul] = CRM[kul] || []).push({ tarih: t.getTime(), tur: $('#zTur').value, yazi: y, kim: kimAd() }); yaz('exs-crm', CRM);
      const s = $('#zSon').value; if (s) { const H = oku('exs-hatirlatma', []); H.push({ id: 'h' + Date.now().toString(36), metin: `${$('#zTur').value} sonrası görüşme: ${y.slice(0, 80)}`, tarih: s, kul, no: '', kim: kimAd(), zaman: Date.now(), ziyaret: true }); yaz('exs-hatirlatma', H); EK.hatirlatmaYenile?.(); }
      islemKaydi('Görüşme kaydı', `${(MUS[kul] || {}).firma || kul} · ${$('#zTur').value}`); toast(s ? 'Kaydedildi; sonraki görüşme hatırlatmalara eklendi.' : 'Kaydedildi.'); S6.ziyaret(); };
    $$('[data-zb]').forEach(b => b.onclick = () => { const H = oku('exs-hatirlatma', []), h = H.find(x => x.id === b.dataset.zb); if (h) h.bitti = Date.now(); yaz('exs-hatirlatma', H); EK.hatirlatmaYenile?.(); S6.ziyaret(); });
    $('#zfK').onchange = e => { ZF.kul = e.target.value; S6.ziyaret(); }; $('#zfP').onchange = e => { ZF.kim = e.target.value; S6.ziyaret(); };
  };
})();
