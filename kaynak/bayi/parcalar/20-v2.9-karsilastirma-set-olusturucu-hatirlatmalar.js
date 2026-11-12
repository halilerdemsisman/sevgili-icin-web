
(function () {
  const pencere = (html, sinif) => { const p = document.createElement('div'); p.className = 'perde ' + sinif; p.onclick = e => { if (e.target === p) p.remove(); };
    p.innerHTML = `<div class="pencere" style="position:relative"><button class="kapat" aria-label="Kapat">×</button>${html}</div>`; document.body.appendChild(p); p.querySelector('.kapat').onclick = () => p.remove(); return p; };
  const bugun = () => new Date().toISOString().slice(0, 10);
  const gunFark = t => Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  const urun = id => VERI.urunler.find(u => u.id === id);

  // ================= 9. ürün karşılaştırma =================
  const KK = 'exb-kars';
  const kOku = () => { try { return (JSON.parse(sessionStorage.getItem(KK)) || []).filter(id => urun(id)); } catch (e) { return []; } };
  const kYaz = L => { try { sessionStorage.setItem(KK, JSON.stringify(L)); } catch (e) {} kartIsaret(); kBar(); };
  function kDegis(id) {
    let L = kOku();
    if (L.includes(id)) L = L.filter(x => x !== id);
    else { if (L.length >= 4) return toast('En fazla 4 ürün karşılaştırabilirsiniz.'); L.push(id); }
    kYaz(L);
  }
  function kartIsaret() {
    const L = kOku();
    $$('#izgara .kart').forEach(k => { const id = +k.dataset.id, f = k.querySelector('.foto'); if (!f) return; let b = f.querySelector('.kr-sec');
      if (!b) { f.insertAdjacentHTML('beforeend', '<button class="kr-sec" title="Karşılaştırmaya ekle"><i></i><span>Karşılaştır</span></button>'); b = f.querySelector('.kr-sec'); b.onclick = e => { e.stopPropagation(); kDegis(id); }; }
      b.classList.toggle('on', L.includes(id)); });
  }
  function kBar() {
    let b = $('#krBar'); const L = kOku(), gor = typeof ben !== 'undefined' && ben && L.length && !$('#uyg').classList.contains('gizli');
    if (!gor) { if (b) b.remove(); return; }
    if (!b) { document.body.insertAdjacentHTML('beforeend', '<div id="krBar"></div>'); b = $('#krBar'); }
    b.innerHTML = `<div class="k-th">${L.map(id => { const u = urun(id); return `<span title="${esc(u.ad)}" style="${u.gorsel ? `background-image:url(${u.gorsel})` : ''}"><b data-kc="${id}">×</b></span>`; }).join('')}</div>
      <span class="yz">${L.length} ürün seçili</span><button class="btn marka" id="krAc" ${L.length < 2 ? 'disabled title="En az 2 ürün seçin"' : ''}>Karşılaştır</button><button class="btn cizgi" id="krTem">Temizle</button>`;
    b.querySelectorAll('[data-kc]').forEach(x => x.onclick = () => kDegis(+x.dataset.kc));
    b.querySelector('#krAc').onclick = karsilastir; b.querySelector('#krTem').onclick = () => kYaz([]);
  }
  const NORM = { 'OTURMA YÜKSEKLİĞİ': 'OTURUM YÜKSEKLİĞİ', 'OTURMA DERİNLİĞİ': 'OTURUM DERİNLİĞİ', 'OTURMA GENİŞLİĞİ': 'OTURUM GENİŞLİĞİ', 'TOPLAM TÜKSEKLİK': 'TOPLAM YÜKSEKLİK', 'W/EN': 'EN', 'L/BOY': 'BOY', 'H/YÜKSEKLİK': 'YÜKSEKLİK', 'W': 'EN', 'L': 'BOY', 'H': 'YÜKSEKLİK', 'GENİŞLİK': 'EN', 'DERİNLİK': 'BOY' };
  const bas = h => { const k = String(h || '').trim().toLocaleUpperCase('tr'); return NORM[k] || k; };
  const BASAD = { 'OTURUM YÜKSEKLİĞİ': 'Oturum yüksekliği', 'OTURUM DERİNLİĞİ': 'Oturum derinliği', 'OTURUM GENİŞLİĞİ': 'Oturum genişliği', 'SIRT YÜKSEKLİĞİ': 'Sırt yüksekliği', 'TOPLAM YÜKSEKLİK': 'Toplam yükseklik', 'KG': 'Ağırlık (kg)', 'EN': 'En', 'BOY': 'Boy / derinlik', 'YÜKSEKLİK': 'Yükseklik' };
  function olculer(u) {
    const M = {}; ((u.teknik || {}).tablolar || []).forEach(tb => tb.basliklar.forEach((h, i) => { const k = bas(h); if (!k) return; tb.satirlar.forEach(r => { const v = String(r[i] ?? '').trim(); if (v) (M[k] = M[k] || []).includes(v) || M[k].push(v); }); }));
    return M;
  }
  function karsilastir() {
    const L = kOku().map(urun); if (L.length < 2) return toast('En az 2 ürün seçin.');
    const p = pencere('', 'kr-p'); let fark = false;
    const ciz = () => {
      const L = kOku().map(urun); if (L.length < 1) { p.remove(); return; }
      const dus = L.map(enDusuk), min = Math.min(...dus.filter(x => x != null));
      const O = L.map(olculer), basl = [...new Set(O.flatMap(o => Object.keys(o)))].sort((a, b) => Object.keys(BASAD).indexOf(a) - Object.keys(BASAD).indexOf(b));
      const ih = L.map(u => ihtiyac(u, u.secenek[0]));
      const satir = (ad, D) => { const fk = new Set(D.map(x => x.replace(/<[^>]+>/g, '').trim())).size > 1; return `<tr class="${fark && fk ? 'fark' : ''}"><th>${ad}</th>${D.map(d => `<td>${d}</td>`).join('')}</tr>`; };
      p.querySelector('.pencere').innerHTML = `<button class="kapat" aria-label="Kapat">×</button>
        <div class="kr-ust"><div><h2 style="margin:0">Ürün karşılaştırma</h2><div class="kucuk">${L.length} ürün yan yana. Fiyatlar USD, KDV hariç; kampanya varsa indirimli fiyat gösterilir.</div></div>
          <label class="kucuk" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="krFark" ${fark ? 'checked' : ''}> Farklı olan satırları vurgula</label></div>
        <div class="kr-kay"><table class="kr-tb"><tr><th></th>${L.map(u => `<td><div class="f" style="${u.gorsel ? `background-image:url(${u.gorsel})` : ''}"></div><div class="u-ad"><b>${esc(u.ad)}</b><button data-kc="${u.id}" title="Çıkar">×</button></div></td>`).join('')}</tr>
          ${satir('Kategori', L.map(u => esc(u.kategori)))}
          ${satir('Fiyat', L.map((u, i) => dus[i] == null ? 'Fiyat sorunuz' : `${u.secenek.length > 1 ? '<span class="kucuk">başlayan </span>' : ''}<b>${para(dus[i])}</b>${dus[i] === min && L.length > 1 ? '<span class="eniyi">En uygun</span>' : ''}`))}
          ${satir('Kampanya', L.map(u => u.kmp ? `%${u.kmp.oran} · ${esc(u.kmp.ad)}` : '—'))}
          ${satir('Seçenekler', L.map(u => u.secenek.length ? `<div class="sec-l">${u.secenek.map(s => `<div><span>${esc(s.ad)}</span><b>${para(s.fiyat)}</b></div>`).join('')}</div>` : '—'))}
          ${basl.map(h => satir(BASAD[h] || esc(h.charAt(0) + h.slice(1).toLocaleLowerCase('tr')), O.map(o => o[h] ? esc(o[h].join(' / ')) : '—'))).join('')}
          ${satir('Renk seçimi', ih.map(x => ['İskelet', x.file && 'File', x.kumas && 'Kumaş', x.fitil && 'Fitil'].filter(Boolean).join(', ')))}
          ${satir('Malzeme', L.map(u => ((u.teknik || {}).malzeme || []).length ? `<ul>${u.teknik.malzeme.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : '—'))}
          <tr><th></th>${L.map(u => `<td><button class="btn marka" data-ka="${u.id}" style="width:100%">Ürünü aç</button></td>`).join('')}</tr></table></div>`;
      p.querySelector('.kapat').onclick = () => p.remove();
      p.querySelector('#krFark').onchange = e => { fark = e.target.checked; ciz(); };
      p.querySelectorAll('[data-kc]').forEach(b => b.onclick = () => { kDegis(+b.dataset.kc); ciz(); });
      p.querySelectorAll('[data-ka]').forEach(b => b.onclick = () => { p.remove(); urunAc(+b.dataset.ka); });
    };
    ciz();
  }
  const _katalogK = katalog;
  katalog = function () { _katalogK(); kartIsaret(); kBar(); };
  const _urunAcK = urunAc;
  urunAc = function (id) {
    _urunAcK(id); const p = $$('.perde').pop(); if (!p) return; let mesgul = false;
    const ekle = () => { if (mesgul) return; const h = p.querySelector('.p-bilgi h2'); if (!h || h.querySelector('.kr-pbtn')) return; mesgul = true;
      const on = kOku().includes(id); h.insertAdjacentHTML('beforeend', `<button class="btn cizgi kr-pbtn">${on ? 'Karşılaştırmada ✓' : 'Karşılaştır'}</button>`);
      h.querySelector('.kr-pbtn').onclick = () => { kDegis(id); const b = h.querySelector('.kr-pbtn'); if (b) b.textContent = kOku().includes(id) ? 'Karşılaştırmada ✓' : 'Karşılaştır'; };
      mesgul = false; };
    ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
  };
  const _gitK = git; git = function (s) { _gitK(s); kBar(); };

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
      const on = window.onizleSvg;
      p.querySelector('.pencere').innerHTML = `<button class="kapat" aria-label="Kapat">×</button>
        <div><h2>Set oluşturucu</h2><div class="kucuk">Masa, sandalye, sehpa gibi ürünleri tek renk seçimiyle birlikte kurun; tek tıkla hepsi sepete eklenir.</div>
          <div class="set-tip">${Object.entries(SETTIP).map(([k, t]) => `<button data-tip="${k}" class="${S.tip === k ? 'on' : ''}">${t.ad}</button>`).join('')}</div>
          <input class="set-ad" id="setAd" placeholder="Set adı (isteğe bağlı), örn. Teras yemek alanı" value="${esc(S.ad)}">
          <div style="margin-top:8px">${S.K.map((k, i) => { const v = kalemVeri(k); return `<div class="set-kalem"><span class="rol">${esc(k.rol)}</span>
            <select data-ku="${i}">${k.kat ? '' : '<option value="">Ürün seçin</option>'}${(k.kat ? katUrun(k.kat) : KATSIRA.flatMap(c => katUrun(c))).map(u => `<option value="${u.id}" ${u.id === k.id ? 'selected' : ''}>${esc(k.kat ? u.ad : u.kategori + ' · ' + u.ad)}</option>`).join('')}</select>
            <select data-ks="${i}" ${v.u && v.u.secenek.length ? '' : 'disabled'}>${v.u && v.u.secenek.length ? v.u.secenek.map((s, j) => `<option value="${j}" ${j === k.si ? 'selected' : ''}>${esc(s.ad)} · ${para(s.fiyat)}</option>`).join('') : '<option>Teklif</option>'}</select>
            <input data-ka="${i}" value="${k.adet}" inputmode="numeric" title="Adet">
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

  // ================= 18. hatırlatmalar =================
  const hKey = () => 'exb-hat-' + ben.kul, gKey = () => 'exb-hat-gizli-' + ben.kul;
  const hOku = () => oku(hKey(), []) || [], hYaz = L => yaz(hKey(), L);
  const hb = $('[data-git=projeler]') || $('#hSepet');
  if (hb && !$('#hHat')) hb.insertAdjacentHTML('beforebegin', `<button class="h-btn" id="hHat" title="Hatırlatmalar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="y">Hatırlatmalar</span><span class="rozet gizli"></span></button>`);
  function otomatik() {
    const A = [], gz = oku(gKey(), {}) || {}, bg = bugun(), ekle = x => { if (gz[x.k] !== bg) A.push(x); };
    // satış ekibinden gelen hatırlatmalar
    oku('exb-hatirlat', []).filter(m => m.kul === ben.kul && !m.okundu).forEach(m => A.push({ k: 'm-' + m.id, renk: m.tur === 'odeme' ? 'kirmizi' : 'sari', metin: m.metin, alt: 'EXIT Garden satış ekibi · ' + tarih(m.zaman), mesaj: m.id, git: m.tur === 'odeme' ? 'cari' : '' }));
    // cari: vadesi geçmiş / yaklaşan
    try { const c = (oku('exb-cari', {}) || {})[ben.kul]; if (c) { const z = cariOzet(c);
      if (z.gecmis > 0.5 && !A.some(x => x.mesaj && x.renk === 'kirmizi')) ekle({ k: 'vg', renk: 'kirmizi', metin: `Vadesi geçmiş bakiyeniz var: ${para(Math.round(z.gecmis))}`, alt: 'Ödeme yaptıysanız Cari hesabım ekranından bildirebilirsiniz.', git: 'cari' });
      z.D.filter(f => f.acik > 0.5 && f.vade >= Date.now() && f.vade < Date.now() + 7 * 864e5).forEach(f => ekle({ k: 'fv-' + f.no, renk: 'sari', metin: `${f.no} faturasının vadesi ${gunFark(f.vade) <= 0 ? 'bugün' : gunFark(f.vade) + ' gün sonra'} doluyor`, alt: `Kalan ${para(Math.round(f.acik))} · vade ${tarih(f.vade)}`, git: 'cari' })); } } catch (e) {}
    // teslimat yaklaşan siparişler
    oku('exb-siparisler', []).filter(o => o.kul === ben.kul && o.termin && !['sevk', 'iptal'].includes(o.durum)).forEach(o => { const g = gunFark(o.termin); if (g >= 0 && g <= 3) ekle({ k: 'tr-' + o.no, renk: 'yesil', metin: `${o.no}: tahmini teslim ${g === 0 ? 'bugün' : g + ' gün sonra'}`, alt: 'Teslim tarihi ' + tarih(o.termin), git: 'siparisler' }); });
    // favori üründe kampanya bitiyor
    const FV = oku('exb-fav-' + ben.kul, []) || [];
    VERI.urunler.filter(u => u.kmp && u.kmp.bit && FV.includes(u.id)).forEach(u => { const g = gunFark(u.kmp.bit); if (g >= 0 && g <= 5) ekle({ k: 'km-' + u.id + '-' + u.kmp.bit, renk: 'sari', metin: `${u.ad}: %${u.kmp.oran} kampanya ${g === 0 ? 'bugün' : g + ' gün sonra'} bitiyor`, alt: 'Favori ürününüz', urun: u.id }); });
    // bekleyen proje sepetleri
    (oku('exb-proje-' + ben.kul, []) || []).filter(p => p.kalemler.length && !(p.siparisler || []).length).forEach(p => { const g = Math.floor((Date.now() - p.guncel) / 864e5); if (g >= 14) ekle({ k: 'pr-' + p.id, renk: 'mavi', metin: `“${p.ad}” projesi ${g} gündür bekliyor`, alt: p.kalemler.length + ' kalem hazır; sipariş vermeyi unutmayın.', git: 'projeler' }); });
    // sepette ürün
    const sn = sepet().length; if (sn) ekle({ k: 'sp', renk: 'mavi', metin: `Sepetinizde ${sn} kalem bekliyor`, alt: 'Sipariş talebini göndermeyi unutmayın.', sepet: true });
    return A;
  }
  const bekleyenler = () => hOku().filter(h => !h.bitti && h.tarih <= bugun());
  function hRozet() {
    const b = $('#hHat'); if (!b || !ben) return; const n = bekleyenler().length + otomatik().length, r = b.querySelector('.rozet');
    r.textContent = n; r.classList.toggle('gizli', !n); return n;
  }
  function hatirlatmalar() {
    const c = document.createElement('div'); c.className = 'perde hat-p'; c.style.padding = 0; c.onclick = e => { if (e.target === c) c.remove(); }; document.body.appendChild(c);
    function ciz() {
      const A = otomatik(), H = hOku(), B = H.filter(h => !h.bitti && h.tarih <= bugun()).sort((a, b) => a.tarih.localeCompare(b.tarih)), P = H.filter(h => !h.bitti && h.tarih > bugun()).sort((a, b) => a.tarih.localeCompare(b.tarih)), T = H.filter(h => h.bitti).sort((a, b) => b.bitti - a.bitti).slice(0, 5);
      const kendi = (h, gec) => `<div class="hat ${gec ? (h.tarih < bugun() ? 'kirmizi' : 'sari') : ''}"><span class="n"></span><div class="m">${esc(h.metin)}<small>${h.tarih < bugun() && gec ? gunFark(h.tarih) * -1 + ' gün gecikti · ' : ''}${tarih(h.tarih)}</small>
        <div class="a"><button class="ana" data-hb="${h.id}">Tamamlandı</button><button data-he="${h.id}" data-g="1">Yarın</button><button data-he="${h.id}" data-g="7">1 hafta sonra</button><button data-hs="${h.id}">Sil</button></div></div></div>`;
      c.innerHTML = `<div class="cekmece"><div class="c-ust"><h3>Hatırlatmalar</h3><button>×</button></div><div class="c-liste" style="padding:0">
        <div class="hat-g"><h4>Kendime hatırlatma ekle</h4><div class="hat-ekle"><input type="text" id="hMet" placeholder="Örn. Otel Mavi Koy'a teklifi sor"><input type="date" id="hTar" value="${bugun()}"><button class="btn marka" id="hEkle">Ekle</button></div></div>
        <div class="hat-g"><h4>Şimdi ilgilenilecekler (${A.length + B.length})</h4>${A.length + B.length ? B.map(h => kendi(h, true)).join('') + A.map((x, i) => `<div class="hat ${x.renk}"><span class="n"></span><div class="m">${esc(x.metin)}<small>${esc(x.alt || '')}</small><div class="a">
          ${x.git ? `<button class="ana" data-ag="${i}">${{ cari: 'Cari hesabım', siparisler: 'Siparişlerim', projeler: 'Projeler' }[x.git]}</button>` : ''}${x.urun ? `<button class="ana" data-au="${i}">Ürünü aç</button>` : ''}${x.sepet ? `<button class="ana" data-as="${i}">Sepete git</button>` : ''}
          ${x.mesaj ? `<button data-am="${i}">Okundu</button>` : `<button data-ah="${i}">Bugün gizle</button>`}</div></div></div>`).join('') : '<div class="hat-bos">Şu an bekleyen bir şey yok.</div>'}</div>
        <div class="hat-g"><h4>Planlanan (${P.length})</h4>${P.length ? P.map(h => kendi(h, false)).join('') : '<div class="hat-bos">Planlanmış hatırlatma yok.</div>'}</div>
        ${T.length ? `<div class="hat-g"><h4>Son tamamlananlar</h4>${T.map(h => `<div class="hat yesil"><span class="n"></span><div class="m" style="text-decoration:line-through;opacity:.7">${esc(h.metin)}<small>${tarih(h.tarih)}</small></div></div>`).join('')}</div>` : ''}
        </div></div>`;
      c.querySelector('.c-ust button').onclick = () => c.remove();
      c.querySelector('#hEkle').onclick = () => { const m = c.querySelector('#hMet').value.trim(); if (!m) return toast('Hatırlatma metnini yazın.'); const L = hOku(); L.push({ id: 'h' + Date.now().toString(36), metin: m, tarih: c.querySelector('#hTar').value || bugun(), zaman: Date.now() }); hYaz(L); toast('Hatırlatma eklendi.'); hRozet(); ciz(); };
      c.querySelector('#hMet').onkeydown = e => { if (e.key === 'Enter') c.querySelector('#hEkle').click(); };
      const bul = id => { const L = hOku(); return [L, L.find(h => h.id === id)]; };
      c.querySelectorAll('[data-hb]').forEach(b => b.onclick = () => { const [L, h] = bul(b.dataset.hb); h.bitti = Date.now(); hYaz(L); hRozet(); ciz(); });
      c.querySelectorAll('[data-he]').forEach(b => b.onclick = () => { const [L, h] = bul(b.dataset.he), d = new Date(); d.setDate(d.getDate() + +b.dataset.g); h.tarih = d.toISOString().slice(0, 10); hYaz(L); toast('Ertelendi: ' + tarih(h.tarih)); hRozet(); ciz(); });
      c.querySelectorAll('[data-hs]').forEach(b => b.onclick = () => { if (!b.dataset.emin) { b.dataset.emin = 1; b.textContent = 'Silinsin mi?'; return; } const [L] = bul(b.dataset.hs); hYaz(L.filter(h => h.id !== b.dataset.hs)); hRozet(); ciz(); });
      c.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => { c.remove(); git(A[+b.dataset.ag].git); });
      c.querySelectorAll('[data-au]').forEach(b => b.onclick = () => { c.remove(); urunAc(A[+b.dataset.au].urun); });
      c.querySelectorAll('[data-as]').forEach(b => b.onclick = () => { c.remove(); $('#hSepet').click(); });
      c.querySelectorAll('[data-ah]').forEach(b => b.onclick = () => { const G = oku(gKey(), {}) || {}; G[A[+b.dataset.ah].k] = bugun(); yaz(gKey(), G); hRozet(); ciz(); });
      c.querySelectorAll('[data-am]').forEach(b => b.onclick = () => { const M = oku('exb-hatirlat', []), m = M.find(x => x.id === A[+b.dataset.am].mesaj); if (m) { m.okundu = Date.now(); yaz('exb-hatirlat', M); } hRozet(); ciz(); });
    }
    ciz();
  }
  if ($('#hHat')) $('#hHat').onclick = hatirlatmalar;
  const _girisH = girisYap;
  girisYap = function (u) { _girisH(u); hRozet(); kBar(); setTimeout(() => { if (!ben) return; const n = hRozet(); if (n) toast(`${n} hatırlatmanız var.`); }, 4600); };
  const _cikH = $('#hCikis').onclick; $('#hCikis').onclick = () => { const b = $('#krBar'); if (b) b.remove(); _cikH && _cikH(); };
  let _hSon = 0; setInterval(() => { if (!ben) return; const n = hRozet() || 0; if (n > _hSon && _hSon && oku('exb-hatirlat', []).some(m => m.kul === ben.kul && !m.okundu && Date.now() - m.zaman < 30000)) toast('Satış ekibinden yeni hatırlatma var.'); _hSon = n; }, 15000);
  setTimeout(() => { if (ben) { hRozet(); kBar(); } }, 1500);
  const _sepetKH = sepetKaydet; sepetKaydet = function (s) { _sepetKH(s); hRozet(); };

  // İngilizce karşılıklar
  if (window.dilEkle) window.dilEkle({
    'Karşılaştır': 'Compare', 'Karşılaştırmada ✓': 'In comparison ✓', 'Karşılaştırmaya ekle': 'Add to comparison', 'Temizle': 'Clear', 'Ürün karşılaştırma': 'Product comparison', 'Farklı olan satırları vurgula': 'Highlight differences',
    'Kategori': 'Category', 'Fiyat': 'Price', 'Kampanya': 'Promotion', 'Seçenekler': 'Options', 'Renk seçimi': 'Colour choices', 'Malzeme': 'Materials', 'Ürünü aç': 'Open product', 'En uygun': 'Best price', 'Fiyat sorunuz': 'Price on request', 'başlayan': 'from',
    'Oturum yüksekliği': 'Seat height', 'Oturum derinliği': 'Seat depth', 'Oturum genişliği': 'Seat width', 'Sırt yüksekliği': 'Back height', 'Toplam yükseklik': 'Total height', 'Ağırlık (kg)': 'Weight (kg)', 'En': 'Width', 'Boy / derinlik': 'Length / depth', 'Yükseklik': 'Height',
    'İskelet, File, Kumaş, Fitil': 'Frame, Mesh, Fabric, Piping', 'İskelet, Kumaş, Fitil': 'Frame, Fabric, Piping', 'İskelet, File': 'Frame, Mesh', 'İskelet': 'Frame',
    'En az 2 ürün seçin.': 'Select at least 2 products.', 'En fazla 4 ürün karşılaştırabilirsiniz.': 'You can compare up to 4 products.', 'En az 2 ürün seçin': 'Select at least 2 products',
    'Set oluştur': 'Build a set', 'Set oluşturucu': 'Set builder', 'Masa, sandalye, sehpa gibi ürünleri tek renk seçimiyle birlikte kurun; tek tıkla hepsi sepete eklenir.': 'Combine tables, chairs, side tables and more with one colour choice; add them all to the cart in one click.',
    'Masa, sandalye ve sehpayı tek renk seçimiyle birlikte kurun': 'Combine table, chairs and side table with one colour choice',
    'Yemek takımı': 'Dining set', 'Bar takımı': 'Bar set', 'Oturma takımı': 'Lounge set', 'Havuz başı': 'Poolside', 'Serbest set': 'Custom set', 'Masa': 'Table', 'Sandalye': 'Chair', 'Bar masası': 'Bar table', 'Bar sandalyesi': 'Bar stool', 'Oturma grubu': 'Sofa set', 'Sehpa': 'Side table', 'Şezlong': 'Sun lounger', 'Ürün': 'Product', 'Ürün seçin': 'Select product',
    'Set adı (isteğe bağlı), örn. Teras yemek alanı': 'Set name (optional), e.g. Terrace dining', '+ Kalem ekle…': '+ Add item…', 'Ortak renkler': 'Shared colours', 'Seçtiğiniz renk, setteki uygun tüm ürünlere uygulanır.': 'The colour you choose is applied to every matching product in the set.',
    'İskelet rengi': 'Frame colour', 'File rengi': 'Mesh colour', 'Kumaş': 'Fabric', 'Fitil rengi': 'Piping colour', 'Set özeti': 'Set summary', 'Set toplamı': 'Set total', 'Seti sepete ekle': 'Add set to cart', 'Teklif': 'Quote', 'Adet': 'Qty', 'Kaldır': 'Remove',
    'Renkler ekranda temsilidir; kesin ton için kartelaya bakınız.': 'Colours on screen are indicative; check the colour card for the exact shade.',
    'Hatırlatmalar': 'Reminders', 'Kendime hatırlatma ekle': 'Add a reminder for myself', "Örn. Otel Mavi Koy'a teklifi sor": 'E.g. ask Hotel Mavi Koy about the quote', 'Ekle': 'Add', 'Tamamlandı': 'Done', 'Yarın': 'Tomorrow', '1 hafta sonra': 'In 1 week', 'Sil': 'Delete', 'Silinsin mi?': 'Delete?',
    'Şu an bekleyen bir şey yok.': 'Nothing needs attention right now.', 'Planlanmış hatırlatma yok.': 'No scheduled reminders.', 'Son tamamlananlar': 'Recently completed', 'Cari hesabım': 'My account', 'Siparişlerim': 'My orders', 'Projeler': 'Projects', 'Sepete git': 'Go to cart', 'Okundu': 'Mark read', 'Bugün gizle': 'Hide today',
    'Ödeme yaptıysanız Cari hesabım ekranından bildirebilirsiniz.': 'If you have paid, you can report it from My account.', 'Sipariş talebini göndermeyi unutmayın.': 'Remember to send your order request.', 'Favori ürününüz': 'Your favourite product', 'Hatırlatma eklendi.': 'Reminder added.', 'Hatırlatma metnini yazın.': 'Enter the reminder text.', 'Satış ekibinden yeni hatırlatma var.': 'New reminder from the sales team.'
  }, [
    [/^(\d+) ürün seçili$/, (m, n) => n + ' selected'], [/^Şimdi ilgilenilecekler \((\d+)\)$/, (m, n) => `Needs attention (${n})`], [/^Planlanan \((\d+)\)$/, (m, n) => `Scheduled (${n})`],
    [/^(\d+) ürün yan yana\. (.+)$/, (m, n) => `${n} products side by side. Prices in USD excl. VAT; promotional prices shown where applicable.`],
    [/^(\d+) hatırlatmanız var\.$/, (m, n) => `You have ${n} reminder(s).`], [/^Vadesi geçmiş bakiyeniz var: (.+)$/, (m, a) => 'You have an overdue balance: ' + a], [/^Sepetinizde (\d+) kalem bekliyor$/, (m, n) => `${n} item(s) waiting in your cart`],
    [/^“(.+)” projesi (\d+) gündür bekliyor$/, (m, a, n) => `Project “${a}” has been waiting for ${n} days`], [/^(\d+) kalem hazır; sipariş vermeyi unutmayın\.$/, (m, n) => `${n} item(s) ready; remember to place the order.`],
    [/^(.+): tahmini teslim bugün$/, (m, a) => a + ': estimated delivery today'], [/^(.+): tahmini teslim (\d+) gün sonra$/, (m, a, n) => `${a}: estimated delivery in ${n} day(s)`], [/^Teslim tarihi (.+)$/, (m, t) => 'Delivery date ' + t],
    [/^(.+) faturasının vadesi bugün doluyor$/, (m, a) => `Invoice ${a} is due today`], [/^(.+) faturasının vadesi (\d+) gün sonra doluyor$/, (m, a, n) => `Invoice ${a} is due in ${n} day(s)`], [/^Kalan (.+) · vade (.+)$/, (m, a, t) => `Remaining ${a} · due ${t}`],
    [/^(.+): %(\d+) kampanya bugün bitiyor$/, (m, a, o) => `${a}: ${o}% promotion ends today`], [/^(.+): %(\d+) kampanya (\d+) gün sonra bitiyor$/, (m, a, o, n) => `${a}: ${o}% promotion ends in ${n} day(s)`],
    [/^(\d+) gün gecikti · (.+)$/, (m, n, t) => `${n} day(s) late · ${t}`], [/^Ertelendi: (.+)$/, (m, t) => 'Snoozed to ' + t], [/^“(.+)” sepete eklendi \((\d+) kalem\)\.$/, (m, a, n) => `“${a}” added to cart (${n} items).`],
    [/^Eksik seçim: (.+)$/, (m, a) => 'Missing: ' + a.replace('iskelet rengi', 'frame colour').replace('file rengi', 'mesh colour').replace('kumaş', 'fabric').replace('fitil rengi', 'piping colour').replace('ürün', 'product')],
    [/^(\d+) parça · USD, KDV hariç(.*)$/, (m, n, r) => `${n} pieces · USD excl. VAT${r ? ' · a quote will be prepared for items without a price' : ''}`], [/^EXIT Garden satış ekibi · (.+)$/, (m, t) => 'EXIT Garden sales team · ' + t],
    [/^(\d+) × (.+)$/, (m, n, a) => n + ' × ' + a]
  ]);
})();
