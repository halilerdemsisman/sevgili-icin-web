// Excel ile toplu fiyat güncelleme (v2.9): Ürünler ve fiyatlar sayfasında.
(function () {
  const pencere = (html, gen) => pencereAc(html, gen ? '' : 'max-width:620px');
  const sayi = v => { if (typeof v === 'number') return v; let s = String(v ?? '').replace(/[$\s]/g, '').replace(/usd/i, ''); if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return +s; if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) || /,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, ''); const n = parseFloat(s); return isFinite(n) ? n : null; };
  async function fiyatExcel(f) {
    let R; try { R = await dosyaSatirlar(f); } catch (e) { return toast('Dosya okunamadı. Excel (.xlsx) veya CSV yükleyin.'); }
    const bi = R.findIndex(r => r.some(c => ['ürün', 'urun', 'ürün adı', 'product'].includes(trNorm(c)))); if (bi < 0) return toast('Başlık satırı bulunamadı: “Ürün” sütunu olmalı.');
    const B = R[bi].map(trNorm), sut = L => { for (const a of L) { const i = B.indexOf(a); if (i >= 0) return i; } return -1; };
    const iU = sut(['ürün', 'urun', 'ürün adı', 'product']), iS = sut(['seçenek', 'secenek', 'option', 'ölçü']), iF = sut(['yeni $', 'yeni fiyat', 'yeni fiyat $', 'güncel $', 'fiyat', 'fiyat $', 'fiyat (usd)', 'price']);
    if (iF < 0) return toast('Fiyat sütunu bulunamadı: “Güncel $”, “Yeni $” veya “Fiyat” olmalı.');
    const D = [], H = []; let ayni = 0, bos = 0;
    R.slice(bi + 1).forEach((r, j) => {
      const sat = bi + j + 2, ua = String(r[iU] ?? '').trim(); if (!ua && !r.some(c => String(c ?? '').trim())) return;
      const u = VERI.urunler.find(x => trNorm(x.ad) === trNorm(ua)); if (!u) return H.push([sat, ua || '(boş)', 'Ürün bulunamadı']);
      const sa = iS >= 0 ? String(r[iS] ?? '').trim() : '', s = sa ? u.secenek.find(x => trNorm(x.ad) === trNorm(sa)) : u.secenek.length === 1 ? u.secenek[0] : null;
      if (!s) return H.push([sat, ua + (sa ? ' · ' + sa : ''), sa ? 'Seçenek bulunamadı' : 'Seçenek sütunu boş']);
      const ham = r[iF]; if (String(ham ?? '').trim() === '') { bos++; return; }
      const v = sayi(ham); if (v == null || v < 0) return H.push([sat, u.ad + ' · ' + s.ad, 'Fiyat okunamadı: ' + ham]);
      const y = Math.round(v * 100) / 100, e = fiyatAl(u, s); if (e === y) { ayni++; return; }
      if (D.some(d => d.u === u && d.s === s)) return H.push([sat, u.ad + ' · ' + s.ad, 'Aynı satır dosyada tekrar ediyor']);
      D.push({ u, s, e, y, o: e ? (y - e) / e * 100 : null });
    });
    const p = pencere('', true), uy = D.filter(d => d.o != null && Math.abs(d.o) > 30).length;
    p.querySelector('.pencere').insertAdjacentHTML('beforeend', `<h2 style="margin:0">Excel'den fiyat güncelleme</h2><div class="kucuk">${esc(f.name)} · onaylamadan önce değişiklikleri kontrol edin. Uygulamadan önce mevcut fiyat listesi sürüm olarak saklanır; Fiyat geçmişi’nden geri dönebilirsiniz.</div>
      <div class="fx-ozet"><div><b>${D.length}</b>fiyat değişecek</div><div><b>${ayni}</b>aynı kaldı</div><div><b>${bos}</b>boş (atlandı)</div><div><b style="color:${H.length ? 'var(--kotu)' : 'inherit'}">${H.length}</b>eşleşmeyen satır</div>${uy ? `<div style="border-color:#f59e0b"><b style="color:#b45309">${uy}</b>%30'dan fazla değişen</div>` : ''}</div>
      ${D.length ? `<div class="fx-kay"><table class="tablo"><tr><th>Ürün</th><th>Seçenek</th><th class="sag-hiza">Mevcut</th><th class="sag-hiza">Yeni</th><th class="sag-hiza">Fark</th></tr>
        ${D.map(d => `<tr class="${d.o != null && Math.abs(d.o) > 30 ? 'fx-uy' : ''}"><td><b>${esc(d.u.ad)}</b><div class="kucuk">${esc(d.u.kategori)}</div></td><td>${esc(d.s.ad)}</td><td class="sag-hiza">${d.e == null ? 'teklif' : usd(d.e)}</td><td class="sag-hiza"><b>${usd(d.y)}</b></td>
          <td class="sag-hiza ${d.o > 0 ? 'fx-art' : 'fx-az'}">${d.o == null ? 'yeni' : (d.o > 0 ? '+' : '') + yuzde(d.o)}</td></tr>`).join('')}</table></div>` : '<div class="bos">Değişecek fiyat yok.</div>'}
      ${H.length ? `<details style="margin-top:10px"><summary class="kucuk" style="cursor:pointer">Eşleşmeyen ${H.length} satırı göster</summary><table class="tablo"><tr><th>Satır</th><th>Değer</th><th>Neden</th></tr>${H.map(h => `<tr><td>${h[0]}</td><td>${esc(h[1])}</td><td class="kucuk">${esc(h[2])}</td></tr>`).join('')}</table></details>` : ''}
      <div class="alan" style="margin-top:12px"><label>Değişiklik notu (fiyat geçmişinde görünür)</label><input id="fxNot" value="Excel: ${esc(f.name)}"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn cizgi" id="fxVaz">Vazgeç</button><button class="btn marka" id="fxUyg" ${D.length ? '' : 'disabled'}>${D.length} fiyatı uygula</button></div>`);
    p.querySelector('#fxVaz').onclick = () => p.remove();
    p.querySelector('#fxUyg').onclick = () => {
      surumKaydet('Excel yüklemesi öncesi · ' + f.name, true);
      D.forEach(d => { FIYAT[d.u.ad] = FIYAT[d.u.ad] || {}; if (d.y === d.s.fiyat) delete FIYAT[d.u.ad][d.s.ad]; else FIYAT[d.u.ad][d.s.ad] = d.y; if (!Object.keys(FIYAT[d.u.ad]).length) delete FIYAT[d.u.ad]; });
      window._fNot = p.querySelector('#fxNot').value.trim() || 'Excel ile toplu güncelleme'; urunYaz(); p.remove(); toast(`${D.length} fiyat güncellendi; bayi portalına yansıdı.`); urunler();
    };
  }
  function sablonIndir() {
    const R = [['Ürün', 'Kategori', 'Seçenek', 'Ürün tipi', 'Liste $', 'Güncel $', 'Yeni $']];
    VERI.urunler.forEach(u => u.secenek.forEach(s => R.push([u.ad, u.kategori, s.ad, s.sinif, s.fiyat ?? '', fiyatAl(u, s) ?? '', ''])));
    csvIndir('exit_fiyat_guncelleme_sablonu.csv', R);
  }
  EK.urunlerExcel = function () {
    const u = $('#ustSag'); if (!u || $('#fxYukle')) return;
    u.insertAdjacentHTML('afterbegin', `<button class="btn cizgi" id="fxSablon" title="Yeni $ sütununu doldurup geri yükleyin">Fiyat şablonu</button> <button class="btn marka" id="fxYukle">Excel'den fiyat yükle</button> `);
    $('#fxSablon').onclick = sablonIndir;
    $('#fxYukle').onclick = () => dosyaSec('.xlsx,.csv,.txt', fiyatExcel);
  };
})();
