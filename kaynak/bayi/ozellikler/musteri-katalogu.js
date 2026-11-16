// Kendi müşterisine katalog: bayinin logosu ve satış fiyatıyla yazdırılabilir katalog.
(function () {
  const pencere = (html, sinif) => pencereAc(html, sinif);

  // ================= 20. kendi müşterisine katalog =================
  const kKey = () => 'exb-mkat-' + ben.kul;
  function musteriKatalog() {
    const A = Object.assign({ firma: ben.firma || '', iletisim: [ben.tel, ben.mail, ben.sehir].filter(Boolean).join(' · '), kar: 30, yuvarla: 5, para: 'USD', kur: '', kapsam: 'filtre', fiyat: true, kdv: false, logo: '' }, oku(kKey(), {}) || {});
    const p = pencere('', 'mk-p');
    const ciz = () => {
      p.querySelector('.pencere').innerHTML = `<button class="kapat" aria-label="Kapat">×</button><h3 style="margin:0">Müşteri kataloğu</h3><div class="kucuk" style="margin-bottom:12px">Kendi logonuz ve kendi satış fiyatınızla katalog hazırlayın. EXIT bayi fiyatı katalogda görünmez.</div>
        <div class="mk-f"><div><label>Firma adı</label><input id="mFir" value="${esc(A.firma)}"></div><div><label>Logo</label><div class="mk-logo">${A.logo ? `<img src="${A.logo}" alt="">` : ''}<button class="btn cizgi" id="mLog" type="button">${A.logo ? 'Değiştir' : 'Logo yükle'}</button>${A.logo ? '<button class="btn cizgi" id="mLogSil" type="button">Kaldır</button>' : ''}</div></div>
          <div class="g"><label>İletişim satırı</label><input id="mIlt" value="${esc(A.iletisim)}" placeholder="Telefon · e-posta · adres"></div>
          <div class="g"><label>Fiyat</label><div class="sec"><label><input type="checkbox" id="mFiy" ${A.fiyat ? 'checked' : ''}> Fiyatları göster</label><label><input type="checkbox" id="mKdv" ${A.kdv ? 'checked' : ''}> KDV dahil (%20)</label></div></div>
          <div><label>Kâr payı (%)</label><input id="mKar" inputmode="decimal" value="${A.kar}"></div><div><label>Yuvarlama</label><select id="mYuv">${[[1, 'Yok'], [5, "5'e"], [10, "10'a"], [50, "50'ye"], [100, "100'e"]].map(([v, a]) => `<option value="${v}" ${+A.yuvarla === v ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
          <div><label>Para birimi</label><select id="mPar"><option ${A.para === 'USD' ? 'selected' : ''}>USD</option><option ${A.para === 'EUR' ? 'selected' : ''}>EUR</option><option ${A.para === 'TL' ? 'selected' : ''}>TL</option></select></div>
          <div><label>Kur (1 USD = ?)</label><input id="mKur" inputmode="decimal" value="${esc(A.kur)}" placeholder="USD seçiliyse boş" ${A.para === 'USD' ? 'disabled' : ''}></div>
          <div class="g"><label>Hangi ürünler?</label><div class="sec"><label><input type="radio" name="mKap" value="filtre" ${A.kapsam === 'filtre' ? 'checked' : ''}> Katalogdaki mevcut filtre</label><label><input type="radio" name="mKap" value="tumu" ${A.kapsam === 'tumu' ? 'checked' : ''}> Tüm ürünler</label><label><input type="radio" name="mKap" value="fav" ${A.kapsam === 'fav' ? 'checked' : ''}> Favorilerim</label></div></div></div>
        <div class="kucuk" id="mOrn" style="margin-top:10px"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn cizgi" id="mVaz">Vazgeç</button><button class="btn marka" id="mOlus">Kataloğu oluştur</button></div>`;
      const oku_ = () => { A.firma = p.querySelector('#mFir').value.trim(); A.iletisim = p.querySelector('#mIlt').value.trim(); A.fiyat = p.querySelector('#mFiy').checked; A.kdv = p.querySelector('#mKdv').checked; A.kar = parseFloat(String(p.querySelector('#mKar').value).replace(',', '.')) || 0; A.yuvarla = +p.querySelector('#mYuv').value; A.para = p.querySelector('#mPar').value; A.kur = p.querySelector('#mKur').value.trim(); A.kapsam = p.querySelector('[name=mKap]:checked').value; };
      const ornek = () => { oku_(); const u = VERI.urunler.find(x => enDusuk(x) != null); p.querySelector('#mOrn').textContent = u ? `Örnek: ${u.ad} · bayi fiyatı ${para(enDusuk(u))} → katalogda ${satis(enDusuk(u), A)}` : ''; };
      p.querySelector('.kapat').onclick = p.querySelector('#mVaz').onclick = () => p.remove();
      p.querySelectorAll('input,select').forEach(i => i.addEventListener('input', ornek)); p.querySelectorAll('input,select').forEach(i => i.addEventListener('change', ornek));
      p.querySelector('#mPar').onchange = () => { oku_(); ciz(); };
      p.querySelector('#mLog').onclick = () => { oku_(); dosyaSec('image/*', f => { if (f.size > 3e6) return toast('Logo en fazla 3 MB olmalı.'); const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 400 / im.width), cv = document.createElement('canvas'); cv.width = im.width * s; cv.height = im.height * s; cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); A.logo = cv.toDataURL('image/png'); ciz(); }; im.src = r.result; }; r.readAsDataURL(f); }); };
      if (p.querySelector('#mLogSil')) p.querySelector('#mLogSil').onclick = () => { oku_(); A.logo = ''; ciz(); };
      p.querySelector('#mOlus').onclick = () => { oku_(); if (A.para !== 'USD' && !(parseFloat(String(A.kur).replace(',', '.')) > 0)) return toast('Kuru yazın.'); yaz(kKey(), A); p.remove(); katalogYaz(A); };
      ornek();
    };
    ciz();
  }
  function satis(f, A) {
    if (f == null) return 'Fiyat için sorunuz';
    const kur = A.para === 'USD' ? 1 : parseFloat(String(A.kur).replace(',', '.')) || 0, y = +A.yuvarla || 1;
    const v = Math.ceil(f * (1 + (+A.kar || 0) / 100) * (A.kdv ? 1.2 : 1) * kur / y) * y;
    return v.toLocaleString('tr-TR') + ' ' + ({ USD: '$', EUR: '€', TL: '₺' })[A.para];
  }
  function katalogYaz(A) {
    const FV = oku('exb-fav-' + ben.kul, []) || [];
    const L = VERI.urunler.filter(u => A.kapsam === 'tumu' ? true : A.kapsam === 'fav' ? FV.includes(u.id) : uygun(u));
    if (!L.length) return toast('Seçilen kapsamda ürün yok.');
    const w = window.open('', '_blank'); if (!w) return toast('Açılır pencere engellendi; tarayıcıda izin verin.');
    const kats = KATSIRA.filter(k => L.some(u => u.kategori === k)).concat([...new Set(L.map(u => u.kategori))].filter(k => !KATSIRA.includes(k)));
    const t = s => window.dilAktif && window.dilAktif() === 'en' && window.cevirEN ? window.cevirEN(s) : s;
    w.document.write(`<html><head><meta charset="utf-8"><title>${esc(A.firma)} · ${t('Katalog')} ${new Date().getFullYear()}</title><style>
      body{font-family:Inter,"Segoe UI",sans-serif;color:#0f172a;margin:0}.kapak{height:255mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:60px;border-left:14px solid #0f172a;page-break-after:always}
      .kapak img{max-height:90px;max-width:300px;margin-bottom:34px}.kapak h1{font-size:46px;margin:0 0 10px}.kapak .alt{font-size:18px;color:#475569}.kapak .ilt{margin-top:auto;font-size:13px;color:#334155;border-top:1px solid #e2e8f0;padding-top:14px;width:100%}
      h2{font-size:22px;border-bottom:3px solid #0f172a;padding-bottom:6px;margin:28px 32px 14px;page-break-before:always}h2:first-of-type{page-break-before:auto}
      .u{display:grid;grid-template-columns:220px 1fr;gap:20px;margin:0 32px 18px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;page-break-inside:avoid}
      .g{aspect-ratio:4/3;background:#fff center/contain no-repeat;border:1px solid #eef0f3;border-radius:6px}h3{margin:0 0 6px;font-size:17px}.a{font-size:12px;color:#475569;line-height:1.5;margin:0 0 8px}
      table{border-collapse:collapse;font-size:11px;margin:6px 0}td,th{border:1px solid #e5e7eb;padding:3px 7px;text-align:left}th{background:#f8fafc}
      .f{font-size:12px;margin-top:6px}.f div{display:flex;justify-content:space-between;border-bottom:1px dashed #e2e8f0;padding:2px 0;max-width:460px}.f b{font-weight:700}
      .ust{position:running(ust)}footer{font-size:10px;color:#94a3b8;margin:20px 32px}@page{margin:12mm}</style></head><body>
      <div class="kapak">${A.logo ? `<img src="${A.logo}" alt="">` : ''}<h1>${esc(A.firma)}</h1><div class="alt">${t('Dış mekân mobilya koleksiyonu')} ${new Date().getFullYear()}</div><div class="alt" style="font-size:14px;margin-top:8px">${L.length} ${t('ürün')} · ${kats.map(k => esc(t(k))).join(' · ')}</div>
        <div class="ilt">${esc(A.iletisim)}${A.fiyat ? `<br>${t('Fiyatlar')} ${A.para}${A.kdv ? ' · ' + t('KDV dahil') : ' · ' + t('KDV hariç')} · ${new Date().toLocaleDateString('tr-TR')}` : ''}</div></div>
      ${kats.map(k => `<h2>${esc(t(k))}</h2>${L.filter(u => u.kategori === k).map(u => `<div class="u"><div class="g" style="${u.gorsel ? `background-image:url(${u.gorselB || u.gorsel})` : ''}"></div><div><h3>${esc(u.ad)}</h3><p class="a">${esc(t(u.aciklama || ''))}</p>
        ${u.teknik ? `${(u.teknik.tablolar || []).map(tb => `<table><tr>${tb.basliklar.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${tb.satirlar.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`).join('')}` : ''}
        ${A.fiyat && u.secenek.length ? `<div class="f">${u.secenek.filter(s => !/Aksesuar/.test(s.sinif)).map(s => `<div><span>${esc(t(s.ad))}</span><b>${satis(s.fiyat, A)}</b></div>`).join('')}</div>` : ''}</div></div>`).join('')}`).join('')}
      <footer>${esc(A.firma)} · ${esc(A.iletisim)}</footer><script>setTimeout(()=>print(),700)<\/script></body></html>`);
    w.document.close();
  }
})();
