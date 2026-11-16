// İade ve şikâyetler (v3.1).
(function () {
  menuEkle('iadeler', 'İade ve şikâyetler', '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', 'siparisler');
  const pencere = (html, gen) => pencereAc(html, gen ? 'max-width:760px' : 'max-width:560px');
  const IAD = { yeni: ['Yeni', 'ia-yeni'], inceleme: ['İnceleniyor', 'ia-inceleme'], onay: ['Onaylandı', 'ia-onay'], red: ['Reddedildi', 'ia-red'], cozuldu: ['Çözüldü', 'ia-cozuldu'] };
  const iadeL = () => (oku('exb-iade', []) || []).filter(x => EK.gorur(x.kul));
  function iadeRozet() { const n = iadeL().filter(x => x.durum === 'yeni').length, b = $('aside button.m[data-s=iadeler] .say'); if (b) { b.textContent = n; b.classList.toggle('gizli', !n); } }
  setInterval(iadeRozet, 5000);
  S6.iadeF = S6.iadeF || 'acik';
  S6.iadeler = function () {
    $('#baslik').textContent = 'İade ve şikâyetler';
    const A = iadeL().sort((a, b) => b.zaman - a.zaman), L = A.filter(x => S6.iadeF === 'hepsi' || (S6.iadeF === 'acik' ? !['red', 'cozuldu'].includes(x.durum) : ['red', 'cozuldu'].includes(x.durum)));
    $('#ustSag').innerHTML = `<select class="btn cizgi" id="iaF"><option value="acik" ${S6.iadeF === 'acik' ? 'selected' : ''}>Açık kayıtlar</option><option value="kapali" ${S6.iadeF === 'kapali' ? 'selected' : ''}>Kapananlar</option><option value="hepsi" ${S6.iadeF === 'hepsi' ? 'selected' : ''}>Tümü</option></select>`;
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Yeni</span><b>${A.filter(x => x.durum === 'yeni').length}</b><small>yanıt bekliyor</small></div><div><span>İnceleniyor</span><b>${A.filter(x => x.durum === 'inceleme').length}</b></div><div><span>Bu ay</span><b>${A.filter(x => new Date(x.zaman).getMonth() === new Date().getMonth() && new Date(x.zaman).getFullYear() === new Date().getFullYear()).length}</b></div><div><span>En sık konu</span><b style="font-size:16px">${(() => { const c = {}; A.forEach(x => c[x.tur] = (c[x.tur] || 0) + 1); const t = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return t ? esc(t[0]) : '—'; })()}</b></div></div>
      <div class="kart"><table class="tablo"><tr><th>No</th><th>Bayi</th><th>Sipariş / ürün</th><th>Konu</th><th>Durum</th><th></th></tr>${L.map(x => `<tr><td><b>${esc(x.no)}</b><div class="kucuk">${tarih(x.zaman)}</div></td><td>${esc(x.firma || x.kul)}</td><td>${esc(x.sip)}<div class="kucuk">${esc(x.urun || '')} · ${x.adet} adet</div></td><td>${esc(x.tur)}<div class="kucuk">${esc((x.aciklama || '').slice(0, 70))}</div></td><td><span class="ia-d ${IAD[x.durum][1]}">${IAD[x.durum][0]}</span></td><td class="sag-hiza"><button class="btn kucuk" data-ia="${x.id}">Aç</button></td></tr>`).join('') || '<tr><td colspan="6" class="kucuk">Kayıt yok.</td></tr>'}</table></div>`;
    $('#iaF').onchange = e => { S6.iadeF = e.target.value; S6.iadeler(); };
    $$('[data-ia]').forEach(b => b.onclick = () => iadeAc(b.dataset.ia));
  };
  function iadeAc(id) {
    const T = oku('exb-iade', []) || [], x = T.find(y => y.id === id); if (!x) return;
    const p = pencere(`<h2 style="margin:0">${esc(x.no)} · ${esc(x.tur)}</h2><div class="kucuk">${esc(x.firma || x.kul)} · ${tarih(x.zaman)} · Sipariş ${esc(x.sip)}</div>
      <p><b>Ürün:</b> ${esc(x.urun || '')} · ${x.adet} adet</p><p style="white-space:pre-wrap">${esc(x.aciklama)}</p>
      ${(x.foto || []).length ? `<div class="ia-foto">${x.foto.map(f => `<img src="${f}" data-buyut>`).join('')}</div>` : '<p class="kucuk">Fotoğraf eklenmemiş.</p>'}
      <div class="s6-form" style="margin-top:12px"><div><label>Durum</label><select class="s6-in" id="iaD">${Object.entries(IAD).map(([k, v]) => `<option value="${k}" ${x.durum === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div></div>
      <div style="margin-top:10px"><label class="kucuk"><b>Bayiye yanıt</b></label><textarea class="s6-in" id="iaY" rows="3" style="width:100%;box-sizing:border-box">${esc(x.yanit || '')}</textarea></div>
      <div class="kucuk" style="margin-top:8px">${(x.gecmis || []).map(g => `${new Date(g.zaman).toLocaleString('tr-TR')} · ${esc(IAD[g.durum] ? IAD[g.durum][0] : g.durum)} · ${esc(g.kim || '')}`).join('<br>')}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn cizgi" id="iaMus">Müşteri kartı</button><button class="btn marka" id="iaK">Kaydet ve bayiye bildir</button></div>`, true);
    p.querySelectorAll('[data-buyut]').forEach(i => i.onclick = () => { const w = window.open(''); w && w.document.write(`<img src="${i.src}" style="max-width:100%">`); });
    p.querySelector('#iaMus').onclick = () => { p.remove(); musteriKarti(x.kul); };
    p.querySelector('#iaK').onclick = () => { const T2 = oku('exb-iade', []) || [], y = T2.find(z => z.id === id), d = p.querySelector('#iaD').value, yt = p.querySelector('#iaY').value.trim();
      if (y.durum !== d) (y.gecmis = y.gecmis || []).push({ zaman: Date.now(), durum: d, kim: kimAd() }); y.durum = d; y.yanit = yt; y.guncel = Date.now(); yaz('exb-iade', T2);
      (CRM[y.kul] = CRM[y.kul] || []).push({ tarih: Date.now(), tur: 'İade/şikâyet', yazi: `${y.no}: ${IAD[d][0]}${yt ? ' · ' + yt : ''}`, kim: kimAd() }); yaz('exs-crm', CRM);
      islemKaydi('İade/şikâyet', `${y.no} → ${IAD[d][0]}`); p.remove(); toast('Kaydedildi; bayi portalında görünür.'); iadeRozet(); S6.iadeler(); };
  }
  EK.iadeRozet = iadeRozet; EK.iadeListesi = iadeL;
})();
