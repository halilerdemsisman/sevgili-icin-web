// Set oluşturucu: masa, sandalye, sehpa… tek renk seçimiyle birlikte kurulur, tek tıkla sepete eklenir.
(function () {
  const pencere = pencereAc, urun = urunBul;

  // ================= 10. set oluşturucu =================
  const SETTIP = {
    yemek: { ad: 'Yemek takımı', k: [['Masa', 'Masalar', 1], ['Sandalye', 'Sandalyeler', 6, 'masa']] },
    bar: { ad: 'Bar takımı', k: [['Bar masası', 'Bar Masaları', 1], ['Bar sandalyesi', 'Bar Sandalyeleri', 4, 'masa']] },
    oturma: { ad: 'Oturma takımı', k: [['Oturma grubu', 'Oturma Grupları', 1], ['Sehpa', 'Sehpalar', 1]] },
    havuz: { ad: 'Havuz başı', k: [['Şezlong', 'Şezlonglar', 2], ['Sehpa', 'Sehpalar', 1]] },
    serbest: { ad: 'Serbest set', k: [['Ürün', '', 1]] }
  };
  const katUrun = k => VERI.urunler.filter(u => !k || u.kategori === k).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  function sandalyeOner(sec) {
    const t = String(sec && sec.ad || ''), m = t.match(/(\d{2,3})\s*[*x×]\s*(\d{2,3})/i);
    if (!m) return /Ø|çap|yuvarlak/i.test(t) ? 4 : null;
    const b = Math.max(+m[1], +m[2]); return b <= 100 ? 4 : b <= 180 ? 6 : b <= 240 ? 8 : 10;
  }
  function setOlustur() {
    const S = { tip: 'yemek', ad: '', K: [], isk: null, fl: null, km: null, ft: null };
    const tipKur = t => { S.tip = t; S.K = SETTIP[t].k.map(([rol, kat, adet, bag]) => { const u = katUrun(kat)[0]; return { rol, kat, id: u ? u.id : null, si: 0, adet, bag, elle: false }; }); oneri(); };
    const oneri = () => { const m = S.K.find(k => !k.bag && /masa/i.test(k.rol)); if (!m) return; const u = urun(m.id), n = u && sandalyeOner(u.secenek[m.si]); S.K.filter(k => k.bag === 'masa' && !k.elle).forEach(k => { if (n) k.adet = n; }); };
    tipKur('yemek');
    const p = pencere('', 'set-p');
    const kalemVeri = k => { const u = urun(k.id), s = u ? u.secenek[k.si] || null : null; return { u, s, ih: u ? ihtiyac(u, s) : {} }; };
    function ciz() {
      const V = S.K.map(kalemVeri).filter(v => v.u), ih = { file: V.some(v => v.ih.file), kumas: V.some(v => v.ih.kumas), fitil: V.some(v => v.ih.fitil) };
      if (!ih.file) S.fl = null; if (!ih.kumas) S.km = null; if (!ih.fitil) S.ft = null;
      const eksik = []; if (!V.length) eksik.push('ürün'); if (!S.isk) eksik.push('iskelet rengi'); if (ih.file && !S.fl) eksik.push('file rengi'); if (ih.kumas && !S.km) eksik.push('kumaş'); if (ih.fitil && !S.ft) eksik.push('fitil rengi');
      const top = S.K.reduce((a, k) => { const v = kalemVeri(k); return a + (v.s && v.s.fiyat != null ? v.s.fiyat * k.adet : 0); }, 0), teklif = S.K.some(k => { const v = kalemVeri(k); return v.u && (!v.s || v.s.fiyat == null); });
      const renk = (bas, L, a) => `<h4>${bas}${S[a] ? ` · <span class="kucuk">${esc((L.find(r => r.kod === S[a]) || {}).ad || S[a])}</span>` : ''}</h4><div class="renkler">${L.map(r => `<button class="renk ${S[a] === r.kod ? 'on' : ''}" data-ra="${a}" data-rk="${esc(r.kod)}"><div class="ornek" style="background:${r.ornek}"></div><b>${esc(r.ad)}</b></button>`).join('')}</div>`;
      const on = RENK_ONIZLEME.svg;
      p.querySelector('.pencere').innerHTML = `<button class="kapat" aria-label="Kapat">×</button>
        <div><h2>Set oluşturucu</h2><div class="kucuk">Masa, sandalye, sehpa gibi ürünleri tek renk seçimiyle birlikte kurun; tek tıkla hepsi sepete eklenir.</div>
          <div class="set-tip">${Object.entries(SETTIP).map(([k, t]) => `<button data-tip="${k}" class="${S.tip === k ? 'on' : ''}">${t.ad}</button>`).join('')}</div>
          <input class="set-ad" id="setAd" placeholder="Set adı (isteğe bağlı), örn. Teras yemek alanı" value="${esc(S.ad)}">
          <div style="margin-top:8px">${S.K.map((k, i) => { const v = kalemVeri(k); return `<div class="set-kalem"><span class="rol">${esc(k.rol)}</span>
            <select data-ku="${i}">${k.kat ? '' : '<option value="">Ürün seçin</option>'}${(k.kat ? katUrun(k.kat) : KATSIRA.flatMap(c => katUrun(c))).map(u => `<option value="${u.id}" ${u.id === k.id ? 'selected' : ''}>${esc(k.kat ? u.ad : u.kategori + ' · ' + u.ad)}</option>`).join('')}</select>
            <select data-ks="${i}" ${v.u && v.u.secenek.length ? '' : 'disabled'}>${v.u && v.u.secenek.length ? v.u.secenek.map((s, j) => `<option value="${j}" ${j === k.si ? 'selected' : ''}>${esc(s.ad)} · ${para(s.fiyat)}</option>`).join('') : '<option>Teklif</option>'}</select>
            <input data-ka="${i}" value="${k.adet}" inputmode="numeric" title="Adet" aria-label="Adet">
            <span class="t">${v.s && v.s.fiyat != null ? para(v.s.fiyat * k.adet) : v.u ? 'Teklif' : '—'}</span><button class="x" data-kx="${i}" title="Kaldır">×</button></div>`; }).join('')}</div>
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><select id="setYeniKat" class="set-ad" style="width:auto"><option value="">+ Kalem ekle…</option>${KATSIRA.filter(c => VERI.urunler.some(u => u.kategori === c)).map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
          <div class="set-renk"><h3 style="margin:18px 0 0;font-size:15px">Ortak renkler</h3><div class="kucuk">Seçtiğiniz renk, setteki uygun tüm ürünlere uygulanır.</div>
            ${renk('İskelet rengi', ISKELET, 'isk')}${ih.file ? renk('File rengi', FILE, 'fl') : ''}${ih.kumas ? renk('Kumaş', KUMAS, 'km') : ''}${ih.fitil ? renk('Fitil rengi', KUMAS, 'ft') : ''}</div></div>
        <div class="set-sag"><b>Set özeti</b>
          ${on && V.length ? `<div class="set-on" style="margin-top:8px">${V.map(v => `<div>${on(v.u.kategori, S.isk, v.ih.file ? S.fl : null, v.ih.kumas ? S.km : null, v.ih.fitil ? S.ft : null)}${esc(v.u.ad)}</div>`).join('')}</div>` : ''}
          <div style="margin-top:10px;font-size:13px">${S.K.filter(k => urun(k.id)).map(k => { const v = kalemVeri(k); return `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0"><span>${k.adet} × ${esc(v.u.ad)}</span><span>${v.s && v.s.fiyat != null ? para(v.s.fiyat * k.adet) : 'Teklif'}</span></div>`; }).join('')}</div>
          <div class="set-top"><span>Set toplamı</span><b>${para(top)}${teklif ? ' +' : ''}</b></div>
          <div class="kucuk">${S.K.reduce((a, k) => a + (urun(k.id) ? k.adet : 0), 0)} parça · USD, KDV hariç${teklif ? ' · fiyatı olmayan kalemler için teklif hazırlanır' : ''}</div>
          ${eksik.length ? `<div class="eksik">Eksik seçim: ${eksik.join(', ')}</div>` : ''}
          <button class="btn marka tam" id="setEkle" style="margin-top:10px" ${eksik.length ? 'disabled' : ''}>Seti sepete ekle</button>
          <p class="kucuk" style="margin:8px 0 0">Renkler ekranda temsilidir; kesin ton için kartelaya bakınız.</p></div>`;
      p.querySelector('.kapat').onclick = () => p.remove();
      p.querySelectorAll('[data-tip]').forEach(b => b.onclick = () => { tipKur(b.dataset.tip); ciz(); });
      p.querySelector('#setAd').oninput = e => S.ad = e.target.value;
      p.querySelectorAll('[data-ku]').forEach(s => s.onchange = () => { const k = S.K[+s.dataset.ku]; k.id = s.value ? +s.value : null; k.si = 0; oneri(); ciz(); });
      p.querySelectorAll('[data-ks]').forEach(s => s.onchange = () => { S.K[+s.dataset.ks].si = +s.value; oneri(); ciz(); });
      p.querySelectorAll('[data-ka]').forEach(i => i.onchange = () => { const k = S.K[+i.dataset.ka]; k.adet = Math.max(1, parseInt(i.value) || 1); k.elle = true; ciz(); });
      p.querySelectorAll('[data-kx]').forEach(b => b.onclick = () => { S.K.splice(+b.dataset.kx, 1); ciz(); });
      p.querySelector('#setYeniKat').onchange = e => { const c = e.target.value; if (!c) return; const u = katUrun(c)[0]; S.K.push({ rol: c.replace(/lar$|ler$/, '').replace(/ları$|leri$/, ''), kat: c, id: u ? u.id : null, si: 0, adet: 1 }); ciz(); };
      p.querySelectorAll('[data-ra]').forEach(b => b.onclick = () => { S[b.dataset.ra] = b.dataset.rk; ciz(); });
      const g = p.querySelector('#setEkle'); if (g) g.onclick = () => {
        const isk = ISKELET.find(x => x.kod === S.isk), fl = FILE.find(x => x.kod === S.fl), ad = S.ad.trim() || SETTIP[S.tip].ad, s = sepet(); let n = 0;
        S.K.forEach(k => { const v = kalemVeri(k); if (!v.u) return; n++;
          s.push({ id: v.u.id, ad: v.u.ad, kategori: v.u.kategori, secenek: v.s ? v.s.ad : '', sinif: v.s ? v.s.sinif : '', birim: v.s ? v.s.fiyat : null, liste: v.s ? v.s.liste : null, kampanya: v.u.kmp ? v.u.kmp.ad + ' (%' + v.u.kmp.oran + ')' : '', adet: k.adet,
            iskelet: isk ? isk.ad + ' (' + isk.kod + ')' : '', file: v.ih.file && fl ? fl.ad + ' (' + fl.kod + ')' : '', kumas: v.ih.kumas ? S.km || '' : '', fitil: v.ih.fitil ? S.ft || '' : '', not: 'Set: ' + ad, set: ad }); });
        sepetKaydet(s); p.remove(); toast(`“${ad}” sepete eklendi (${n} kalem).`); $('#hSepet').click();
      };
    }
    ciz();
  }
  const kp = $('#katPdf');
  if (kp && !$('#setBtn')) { kp.insertAdjacentHTML('beforebegin', `<button class="btn cizgi" id="setBtn" title="Masa, sandalye ve sehpayı tek renk seçimiyle birlikte kurun" style="padding:8px 12px;font-size:13px">Set oluştur</button>`); $('#setBtn').onclick = setOlustur; }
})();
