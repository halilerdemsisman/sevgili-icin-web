// Sepet: Excel/CSV ile toplu sipariş, şablon indirme, kalem bazında termin.
(function () {
  const stokD = stokOzeti;
  // ---------- sepet: toplu sipariş (Excel/CSV), kalem bazında termin
  const KOLON = { urun: ['ürün', 'urun', 'ürün adı', 'model', 'product'], secenek: ['seçenek', 'secenek', 'ölçü', 'option', 'variant', 'size'], adet: ['adet', 'miktar', 'qty', 'quantity'], iskelet: ['iskelet', 'iskelet rengi', 'frame', 'frame colour', 'frame color'], file: ['file', 'file rengi', 'mesh'], kumas: ['kumaş', 'kumas', 'fabric'], fitil: ['fitil', 'piping'], not: ['not', 'note', 'açıklama'] };
  function sablonIndir() {
    const R = [['Ürün', 'Seçenek', 'Adet', 'İskelet', 'File', 'Kumaş', 'Fitil', 'Not']];
    KATSIRA.forEach(k => VERI.urunler.filter(u => u.kategori === k).forEach(u => (u.secenek.length ? u.secenek : [{ ad: '' }]).forEach(s => R.push([u.ad, s.ad, '', '', '', '', '', '']))));
    R.push([], ['# İskelet: ' + ISKELET.map(x => x.ad + (x.ad !== x.kod ? ' / ' + x.kod : '')).join(', ')], ['# File: ' + FILE.map(x => x.ad + ' / ' + x.kod).join(', ')], ['# Kumaş ve fitil: ' + KUMAS.map(x => x.kod).join(', ')], ['# Adet boş bırakılan satırlar atlanır.']);
    csvIndir('exit_toplu_siparis_sablonu.csv', R);
  }
  const renkBul = (L, v) => { const n = trNorm(v).replace(/\s*\(.*\)$/, ''); if (!n) return null; return L.find(x => trNorm(x.kod) === n || trNorm(x.ad) === n || trNorm(x.ad + ' ' + x.kod) === n) || L.find(x => n.includes(trNorm(x.kod))) || null; };
  async function topluYukle(f) {
    let R; try { R = await dosyaSatirlar(f); } catch (e) { return toast('Dosya okunamadı. Excel (.xlsx) veya CSV yükleyin.'); }
    const bi = R.findIndex(r => r.some(c => KOLON.urun.includes(trNorm(c)))); if (bi < 0) return toast('Başlık satırı bulunamadı: “Ürün” ve “Adet” sütunları gerekli.');
    const H = R[bi].map(trNorm), ci = k => H.findIndex(h => KOLON[k].includes(h));
    const C = Object.fromEntries(Object.keys(KOLON).map(k => [k, ci(k)])); if (C.adet < 0) return toast('“Adet” sütunu bulunamadı.');
    const s = sepet(), hata = []; let eklenen = 0;
    R.slice(bi + 1).forEach((r, i) => {
      const al = k => C[k] >= 0 ? String(r[C[k]] ?? '').trim() : '', satir = bi + i + 2, ad = al('urun');
      if (!ad || ad.startsWith('#')) return; const adet = parseInt(al('adet').replace(/\D/g, '')) || 0; if (!adet) return;
      const u = VERI.urunler.find(x => trNorm(x.ad) === trNorm(ad)) || VERI.urunler.find(x => trNorm(x.ad).startsWith(trNorm(ad)));
      if (!u) return hata.push([satir, ad, 'Ürün bulunamadı']);
      let sc = null; const sv = al('secenek');
      if (u.secenek.length) { sc = sv ? (u.secenek.find(x => trNorm(x.ad) === trNorm(sv)) || u.secenek.find(x => trNorm(x.ad).includes(trNorm(sv)))) : u.secenek.length === 1 ? u.secenek[0] : null;
        if (!sc) return hata.push([satir, ad, sv ? 'Seçenek bulunamadı: ' + sv : 'Seçenek yazılmamış']); }
      const ih = ihtiyac(u, sc), isk = renkBul(ISKELET, al('iskelet')), fl = ih.file ? renkBul(FILE, al('file')) : null, km = ih.kumas ? renkBul(KUMAS, al('kumas')) : null, ft = ih.fitil ? renkBul(KUMAS, al('fitil')) : null;
      const eks = [!isk && 'iskelet', ih.file && !fl && 'file', ih.kumas && !km && 'kumaş', ih.fitil && !ft && 'fitil'].filter(Boolean);
      if (eks.length) return hata.push([satir, ad + (sc ? ' · ' + sc.ad : ''), 'Eksik veya hatalı renk: ' + eks.join(', ')]);
      s.push({ id: u.id, ad: u.ad, kategori: u.kategori, secenek: sc ? sc.ad : '', sinif: sc ? sc.sinif : '', birim: sc ? sc.fiyat : null, liste: sc ? sc.liste : null, kampanya: u.kmp ? u.kmp.ad + ' (%' + u.kmp.oran + ')' : '', adet,
        iskelet: isk.ad + ' (' + isk.kod + ')', file: fl ? fl.ad + ' (' + fl.kod + ')' : '', kumas: km ? km.kod : '', fitil: ft ? ft.kod : '', not: al('not') });
      eklenen++;
    });
    sepetKaydet(s); const c = $$('.perde').find(x => x.querySelector('.cekmece')); if (c) c.remove(); $('#hSepet').click();
    if (hata.length) bilgiPenceresi('Toplu sipariş', `<p><b>${eklenen}</b> kalem sepete eklendi, <b>${hata.length}</b> satır atlandı.</p><table><tr><th>Satır</th><th>Ürün</th><th>Sorun</th></tr>${hata.map(h => `<tr><td>${h[0]}</td><td>${esc(h[1])}</td><td>${esc(h[2])}</td></tr>`).join('')}</table>`);
    else toast(eklenen ? eklenen + ' kalem sepete eklendi.' : 'Dosyada adedi girilmiş satır bulunamadı.');
  }
  function sepetTahmin() {
    const D = stokD(); if (!D) return null; let en = 0, hepsi = true;
    sepet().forEach(x => { const z = terminTahmin(D, x.ad, x.kategori, x.secenek, x.iskelet, x.adet); if (!z) return; en = Math.max(en, z.gun); if (!z.stok) hepsi = false; });
    return { gun: en, stok: hepsi };
  }
  const _sepetAc = $('#hSepet').onclick;
  $('#hSepet').onclick = () => {
    _sepetAc(); const c = $$('.perde').pop(); if (!c || !c.querySelector('.cekmece')) return;
    let mesgul = false;
    const ekle = () => {
      if (mesgul) return; mesgul = true;
      try {
        const ust = c.querySelector('.c-ust');
        if (ust && !c.querySelector('.c-toplu')) {
          ust.insertAdjacentHTML('afterend', `<div class="c-toplu"><b>Toplu sipariş (Excel)</b><button class="btn cizgi" data-ts="sablon">Şablon indir</button><button class="btn marka" data-ts="yukle">Excel / CSV yükle</button></div>`);
          c.querySelector('[data-ts=sablon]').onclick = sablonIndir;
          c.querySelector('[data-ts=yukle]').onclick = () => dosyaSec('.xlsx,.csv,.txt', topluYukle);
        }
        const D = stokD(); if (!D) return; const s = sepet();
        c.querySelectorAll('.s-kalem').forEach((k, i) => { const x = s[i]; if (!x || k.querySelector('.stk-k')) return; const z = terminTahmin(D, x.ad, x.kategori, x.secenek, x.iskelet, x.adet); if (!z) return;
          k.children[1].insertAdjacentHTML('beforeend', `<div class="stk-k">${z.stok ? '<b>Stokta</b>' : '<b class="u">Üretilecek</b>'} · tahmini teslim ${tarih(gunSonra(z.gun))}</div>`); });
        const g = c.querySelector('#sGonder'), t = sepetTahmin();
        if (g && t && s.length && !c.querySelector('.c-termin')) g.insertAdjacentHTML('beforebegin', `<div class="c-termin ${t.stok ? '' : 'u'}"><span>${t.stok ? 'Tüm kalemler stokta' : 'Tahmini teslim (en geç kalem)'}</span><b>~${tarih(gunSonra(t.gun))}</b></div>`);
      } finally { mesgul = false; }
    };
    c.addEventListener('click', e => { if (e.target.closest('#sGonder')) { const t = sepetTahmin(); window._sepetTermin = t ? gunSonra(t.gun) : null; } }, true);
    ekle(); new MutationObserver(ekle).observe(c, { childList: true, subtree: true });
  };
})();
