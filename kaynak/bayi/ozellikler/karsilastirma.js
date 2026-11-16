// Ürün karşılaştırma: kartta seçim, alt çubuk, yan yana tablo (en fazla 4 ürün).
(function () {
  const pencere = pencereAc, urun = urunBul;

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
  EK.katalogKarsilastirma = function () { kartIsaret(); kBar(); };
  EK.urunKarsilastir = function (p, u) {
    const id = u.id; let mesgul = false;
    const ekle = () => { if (mesgul) return; const h = p.querySelector('.p-bilgi h2'); if (!h || h.querySelector('.kr-pbtn')) return; mesgul = true;
      const on = kOku().includes(id); h.insertAdjacentHTML('beforeend', `<button class="btn cizgi kr-pbtn">${on ? 'Karşılaştırmada ✓' : 'Karşılaştır'}</button>`);
      h.querySelector('.kr-pbtn').onclick = () => { kDegis(id); const b = h.querySelector('.kr-pbtn'); if (b) b.textContent = kOku().includes(id) ? 'Karşılaştırmada ✓' : 'Karşılaştır'; };
      mesgul = false; };
    ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
  };
  EK.karsilastirmaCubugu = () => kBar();
  const _cikH = $('#hCikis').onclick; $('#hCikis').onclick = () => { const b = $('#krBar'); if (b) b.remove(); _cikH && _cikH(); };
})();
