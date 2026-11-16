// Bayilerin özel teklif talepleri (v3.2).
(function () {
  const bayiMesaj = (kul, metin) => { const M = oku('exb-hatirlat', []) || []; M.push({ id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), kul, tur: 'teklif', metin, zaman: Date.now(), kim: kimAd(), okundu: false }); yaz('exb-hatirlat', M); };
  menuEkle('teklifler', 'Özel teklif talepleri', '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><circle cx="17" cy="14" r="1.5"/>', 'talepler');
  const TK = () => oku('exb-teklif', []) || [];
  const DZ = { bekliyor: 'Onay bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
  const listeF = p => { const u = VERI.urunler.find(x => x.id === p.id), s = u && u.secenek.find(x => x.ad === p.secenek); return s ? s.fiyat : 0; };
  function rozet() { const n = TK().filter(t => t.durum === 'bekliyor').length, b = $('aside button.m[data-s=teklifler] .say'); if (b) { b.textContent = n; b.classList.toggle('gizli', !n); } }
  let tF = 'bekliyor';
  S6.teklifler = function () {
    $('#baslik').textContent = 'Bayi özel teklif talepleri';
    $('#ustSag').innerHTML = `<select class="btn cizgi" id="tkF"><option value="bekliyor">Bekleyenler</option><option value="hepsi">Tümü</option></select>`; $('#tkF').value = tF; $('#tkF').onchange = e => { tF = e.target.value; S6.teklifler(); };
    const L = TK().filter(t => tF === 'hepsi' || t.durum === 'bekliyor').sort((a, b) => b.zaman - a.zaman);
    const urn = p => p ? `<div><b>${esc(p.ad)}</b> · ${esc(p.secenek || '')}</div><div class="kucuk">${esc([p.iskelet, p.file, p.kumas].filter(Boolean).join(' · '))} · liste ${usd2(listeF(p))}</div>` : '';
    $('#icerik').innerHTML = `<div class="kart"><h3>Talepler</h3><div class="alt">Bayi masa ve sandalyeyi, takımdaki oranı ve renkleri kendisi seçip özel fiyat ister. Birim fiyatları girip onaylayın; bayi onaylanan teklifi tek tıkla bu fiyatlarla sepetine ekler.</div>
      ${L.map(t => { const lm = t.masa ? listeF(t.masa) : 0, ls = listeF(t.sandalye), lt = lm + ls * t.oran;
        return `<div style="border-top:1px solid var(--cizgi,#e5e7eb);padding:12px 0;display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(220px,1.5fr) minmax(260px,1.3fr);gap:14px">
        <div><b>${esc(t.no)}</b> <span class="a8-dz ${t.durum}">${DZ[t.durum]}</span><div>${esc(firmaAd(t.kul))}</div><div class="kucuk">${tarih(t.zaman)}${t.termin ? ' · termin ' + tarih(t.termin) : ''}</div>${t.not ? `<div class="kucuk">“${esc(t.not)}”</div>` : ''}</div>
        <div>${urn(t.masa)}${urn(t.sandalye)}<div class="kucuk" style="margin-top:4px"><b>${t.takim} takım</b> (${t.masa ? `1 masa + ${t.oran} sandalye; ${t.takim} masa, ${t.takim * t.oran} sandalye` : t.takim + ' adet'}) · liste takım ${usd2(lt)}${t.hedef ? ` · <b>bayi hedefi ${usd2(t.hedef)}</b>` : ''}</div></div>
        <div>${t.durum === 'bekliyor' ? `<div class="s6-form" style="grid-template-columns:1fr 1fr">${t.masa ? `<div><label>Masa birim $</label><input class="s6-in" data-fm="${t.no}" value="${lm}"></div>` : ''}<div><label>Sandalye birim $</label><input class="s6-in" data-fs="${t.no}" value="${ls}"></div></div>
          <div class="kucuk" data-fo="${t.no}" style="margin:6px 0"></div><input class="s6-in" data-fy="${t.no}" placeholder="Yanıt (isteğe bağlı)" style="width:100%;margin-bottom:6px"><button class="btn kucuk" data-fok="${t.no}">Onayla</button> <button class="btn kucuk cizgi" data-fred="${t.no}">Reddet</button>`
          : t.durum === 'onaylandi' ? `<b>${usd2(t.fiyat.takim)}</b> / takım<div class="kucuk">${t.masa ? 'masa ' + usd2(t.fiyat.masa) + ' · ' : ''}sandalye ${usd2(t.fiyat.sandalye)} · liste fiyatına göre %${Math.round((1 - t.fiyat.takim / lt) * 100)} indirim</div><div class="kucuk">${esc(t.kim || '')}${t.sepette ? ' · bayi sepete ekledi' : ''}</div>` : `<div class="kucuk">${esc(t.yanit || '')} · ${esc(t.kim || '')}</div>`}</div></div>`; }).join('') || '<p class="kucuk">Talep yok.</p>'}</div>`;
    const hesap = no => { const t = TK().find(x => x.no === no), m = $(`[data-fm="${no}"]`), s = $(`[data-fs="${no}"]`), fm = m ? sayiTR(m.value) || 0 : 0, fs = sayiTR(s.value) || 0, lt = (t.masa ? listeF(t.masa) : 0) + listeF(t.sandalye) * t.oran, tk = fm + fs * t.oran;
      $(`[data-fo="${no}"]`).innerHTML = `Takım ${usd2(tk)} · toplam ${usd2(tk * t.takim)} · indirim %${lt ? Math.round((1 - tk / lt) * 100) : 0}${t.hedef ? ' · hedef ' + usd2(t.hedef) : ''}`; return { fm, fs, tk }; };
    $$('[data-fs]').forEach(i => { const no = i.dataset.fs; hesap(no); i.oninput = () => hesap(no); const m = $(`[data-fm="${no}"]`); if (m) m.oninput = () => hesap(no); });
    // Faz 3b: karar yalnız talep hâlâ bekliyorsa yazılır
    const karar = async (no, onay) => { const t0 = TK().find(x => x.no === no); if (!t0 || t0.durum !== 'bekliyor') return; const y = ($(`[data-fy="${no}"]`) || {}).value || '';
      let h = null; if (onay) { h = hesap(no); if (!(h.fs > 0) || (t0.masa && !(h.fm > 0))) return toast('Birim fiyatları girin.'); }
      const r = await kosullu([{ k: 'exb-teklif', a: 'no', id: no, yol: 'durum', esit: 'bekliyor' }], () => { const L = TK(), t = L.find(x => x.no === no); if (!t) return;
        if (onay) t.fiyat = { masa: h.fm, sandalye: h.fs, takim: h.tk };
        Object.assign(t, { durum: onay ? 'onaylandi' : 'reddedildi', yanit: y.trim(), kim: kimAd(), karar: Date.now() }); yaz('exb-teklif', L);
        bayiMesaj(t.kul, `${t.no} özel teklif talebiniz ${onay ? 'onaylandı: takım ' + usd2(t.fiyat.takim) : 'reddedildi'}${y ? ' · ' + y : ''}`);
        islemYaz(`Özel teklif ${onay ? 'onaylandı' : 'reddedildi'}`, `${t.no} · ${firmaAd(t.kul)}${onay ? ' · ' + usd2(t.fiyat.takim) + '/takım' : ''}`); });
      if (r.ok) toast('Karar bayiye iletildi.');
      else { const t = TK().find(x => x.no === no); toast(r.durum === 409 && t && t.durum !== 'bekliyor' ? `${no} bu arada ${t.kim || 'başka bir kullanıcı'} tarafından karara bağlandı (${DZ[t.durum] || t.durum}).` : r.hata); }
      rozet(); if (aktif === 'teklifler') S6.teklifler(); };
    $$('[data-fok]').forEach(b => b.onclick = () => karar(b.dataset.fok, true)); $$('[data-fred]').forEach(b => b.onclick = () => karar(b.dataset.fred, false));
  };
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
  setInterval(rozet, 4000); setTimeout(rozet, 800);
})();
