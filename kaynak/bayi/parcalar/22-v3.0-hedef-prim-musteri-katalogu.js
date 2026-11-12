
(function () {
  const pencere = (html, sinif) => { const p = document.createElement('div'); p.className = 'perde ' + sinif; p.onclick = e => { if (e.target === p) p.remove(); };
    p.innerHTML = `<div class="pencere" style="position:relative"><button class="kapat" aria-label="Kapat">×</button>${html}</div>`; document.body.appendChild(p); p.querySelector('.kapat').onclick = () => p.remove(); return p; };

  // ================= 21. hedef ve prim =================
  function hedefBilgi() {
    const yil = new Date().getFullYear(), H = ((oku('exb-bayi-hedef', {}) || {})[ben.kul] || {})[yil]; if (!H || !(H.hedef > 0)) return null;
    const ger = H.gerceklesen != null ? H.gerceklesen : oku('exb-siparisler', []).filter(o => o.kul === ben.kul && o.durum !== 'iptal' && new Date(o.tarih).getFullYear() === yil).reduce((a, o) => a + (o.net != null ? o.net : o.toplam || 0), 0);
    const B = (H.basamak || []).slice().sort((a, b) => a.oran - b.oran), oran = ger / H.hedef * 100;
    const kaz = B.filter(b => oran >= b.oran).pop(), sonraki = B.find(b => oran < b.oran);
    return { yil, hedef: H.hedef, ger, oran, B, kaz, sonraki, prim: kaz ? ger * kaz.prim / 100 : 0 };
  }
  function hedefKart() {
    const h = hedefBilgi(); if (!h) return '';
    const ust = Math.max(120, ...h.B.map(b => b.oran)) * 1.2, x = v => Math.min(100, v / ust * 100);
    const kalanGun = Math.ceil((new Date(h.yil + 1, 0, 1) - new Date()) / 864e5);
    return `<div class="hd-kart" id="hdKart"><div class="hd-ust"><div><h3>${h.yil} hedefim ve primim</h3><div class="kucuk">Sevk edilen ve onaylanan siparişleriniz (net, iptaller hariç) · yıl sonuna ${kalanGun} gün</div></div>
      <div style="text-align:right"><b class="b">${para(Math.round(h.ger))}</b> <span class="kucuk">/ ${para(h.hedef)} · %${Math.round(h.oran)}</span></div></div>
      <div class="hd-cubuk"><i style="width:${x(h.oran)}%"></i>${h.B.map((b, i) => `<span class="${h.oran >= b.oran ? 'ok' : ''} ${i % 2 ? 'alt' : ''}" style="left:${x(b.oran)}%">%${b.oran} → %${b.prim} prim</span>`).join('')}</div>
      <div class="hd-not">${h.kaz ? `Şu an <b>%${h.kaz.prim} prim</b> basamağındasınız: tahmini prim <b>${para(Math.round(h.prim))}</b>. ` : 'Henüz prim basamağına ulaşmadınız. '}${h.sonraki ? `Bir sonraki basamak (%${h.sonraki.prim} prim) için <b>${para(Math.max(0, Math.ceil(h.hedef * h.sonraki.oran / 100 - h.ger)))}</b> daha sipariş gerekiyor.` : 'En üst basamaktasınız, tebrikler!'}</div></div>`;
  }
  const _cariH = cariSayfa;
  cariSayfa = function () { _cariH(); const k = hedefKart(); if (k && !$('#hdKart')) { const h = $('#s-cari h2'); h && h.nextElementSibling ? h.nextElementSibling.insertAdjacentHTML('afterend', k) : $('#s-cari').insertAdjacentHTML('afterbegin', k); } };

  // ================= 11. teslimat adres defteri =================
  const aKey = () => 'exb-adres-' + ben.kul, aOku = () => oku(aKey(), []) || [], aYaz = L => yaz(aKey(), L);
  const adresMetin = a => [a.ad + (a.kisi ? ' · ' + a.kisi : '') + (a.tel ? ' · ' + a.tel : ''), a.adres, a.sehir].filter(Boolean).join('\n');
  function adresler(sonra) {
    const p = pencere('', 'ad-p'); let duz = null;
    const ciz = () => { const L = aOku(), a = duz ? L.find(x => x.id === duz) || {} : {};
      p.querySelector('.pencere').innerHTML = `<button class="kapat" aria-label="Kapat">×</button><h3 style="margin:0">Teslimat adreslerim</h3><div class="kucuk">Şantiye, otel veya depo adreslerinizi kaydedin; sepette tek tıkla seçin.</div>
        <div class="ad-l">${L.length ? L.map(x => `<div class="ad-k"><div><b>${esc(x.ad)}${x.varsayilan ? ' <span class="pr-etiket">Varsayılan</span>' : ''}</b><div class="kucuk">${esc(adresMetin(x).split('\n').slice(1).join('\n'))}</div>${x.kisi || x.tel ? `<div class="kucuk">${esc([x.kisi, x.tel].filter(Boolean).join(' · '))}</div>` : ''}</div>
          <div class="d">${x.varsayilan ? '' : `<button data-av="${x.id}">Varsayılan yap</button>`}<button data-ad="${x.id}">Düzenle</button><button data-as="${x.id}">Sil</button></div></div>`).join('') : '<div class="kucuk">Henüz kayıtlı adres yok.</div>'}</div>
        <h4 style="margin:14px 0 8px">${duz ? 'Adresi düzenle' : 'Yeni adres'}</h4>
        <div class="ad-f"><div><label>Adres adı</label><input id="aAd" placeholder="Örn. Otel Mavi Koy şantiye" value="${esc(a.ad || '')}"></div><div><label>Şehir / ilçe</label><input id="aSeh" value="${esc(a.sehir || '')}"></div>
          <div><label>Teslim alacak kişi</label><input id="aKis" value="${esc(a.kisi || '')}"></div><div><label>Telefon</label><input id="aTel" value="${esc(a.tel || '')}"></div>
          <div class="g"><label>Açık adres</label><textarea id="aAdr" rows="2">${esc(a.adres || '')}</textarea></div></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">${duz ? '<button class="btn cizgi" id="aVaz">Vazgeç</button>' : ''}<button class="btn marka" id="aKay">${duz ? 'Kaydet' : 'Adresi ekle'}</button></div>`;
      p.querySelector('.kapat').onclick = () => { p.remove(); sonra && sonra(); };
      const v = id => p.querySelector(id).value.trim();
      p.querySelector('#aKay').onclick = () => { if (!v('#aAd') || !v('#aAdr')) return toast('Adres adını ve açık adresi yazın.'); const L = aOku(), y = { ad: v('#aAd'), sehir: v('#aSeh'), kisi: v('#aKis'), tel: v('#aTel'), adres: v('#aAdr') };
        if (duz) Object.assign(L.find(x => x.id === duz), y); else L.push({ id: 'a' + Date.now().toString(36), ...y, varsayilan: !L.length }); aYaz(L); toast(duz ? 'Adres güncellendi.' : 'Adres eklendi.'); duz = null; ciz(); };
      if (p.querySelector('#aVaz')) p.querySelector('#aVaz').onclick = () => { duz = null; ciz(); };
      p.querySelectorAll('[data-ad]').forEach(b => b.onclick = () => { duz = b.dataset.ad; ciz(); });
      p.querySelectorAll('[data-av]').forEach(b => b.onclick = () => { aYaz(aOku().map(x => ({ ...x, varsayilan: x.id === b.dataset.av }))); ciz(); });
      p.querySelectorAll('[data-as]').forEach(b => b.onclick = () => { if (!b.dataset.emin) { b.dataset.emin = 1; b.textContent = 'Silinsin mi?'; return; } let L = aOku().filter(x => x.id !== b.dataset.as); if (L.length && !L.some(x => x.varsayilan)) L[0].varsayilan = true; aYaz(L); ciz(); });
    };
    ciz(); p.onclick = e => { if (e.target === p) { p.remove(); sonra && sonra(); } };
  }
  const _sepetA = $('#hSepet').onclick;
  $('#hSepet').onclick = () => {
    _sepetA(); const c = $$('.perde').pop(); if (!c) return; let mesgul = false;
    const ekle = () => { if (mesgul) return; const t = c.querySelector('#sAdres'); if (!t || c.querySelector('.ad-sat')) return; mesgul = true;
      const L = aOku(), v = L.find(x => x.varsayilan) || L[0];
      t.insertAdjacentHTML('beforebegin', `<div class="ad-sat"><select id="sAdSec"><option value="">${L.length ? 'Kayıtlı adres seçin…' : 'Kayıtlı adres yok'}</option>${L.map(x => `<option value="${x.id}">${esc(x.ad)}</option>`).join('')}</select><button type="button" id="sAdYon">Adreslerim</button></div>`);
      if (v && (!t.value.trim() || t.value.trim() === (ben.sehir || '').trim())) { t.value = adresMetin(v); c.querySelector('#sAdSec').value = v.id; }
      c.querySelector('#sAdSec').onchange = e => { const a = aOku().find(x => x.id === e.target.value); if (a) t.value = adresMetin(a); };
      c.querySelector('#sAdYon').onclick = () => adresler(() => { const s = c.querySelector('.ad-sat'); if (s) s.remove(); ekle(); });
      mesgul = false; };
    ekle(); new MutationObserver(ekle).observe(c, { childList: true, subtree: true });
  };
  // cari sayfasında adres defteri kısayolu
  const _cariA = cariSayfa;
  cariSayfa = function () { _cariA(); if ($('#adKisa')) return; const n = aOku().length; $('#s-cari').insertAdjacentHTML('beforeend', `<div class="hd-kart" id="adKisa"><div class="hd-ust"><div><h3>Teslimat adreslerim</h3><div class="kucuk">${n ? n + ' kayıtlı adres' : 'Henüz kayıtlı adres yok'} · sepette tek tıkla seçilir</div></div><button class="btn cizgi" id="adAc">Adresleri yönet</button></div></div>`); $('#adAc').onclick = () => adresler(() => git('cari')); };

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
      ${kats.map(k => `<h2>${esc(t(k))}</h2>${L.filter(u => u.kategori === k).map(u => `<div class="u"><div class="g" style="${u.gorsel ? `background-image:url(${u.gorsel})` : ''}"></div><div><h3>${esc(u.ad)}</h3><p class="a">${esc(t(u.aciklama || ''))}</p>
        ${u.teknik ? `${(u.teknik.tablolar || []).map(tb => `<table><tr>${tb.basliklar.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${tb.satirlar.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`).join('')}` : ''}
        ${A.fiyat && u.secenek.length ? `<div class="f">${u.secenek.filter(s => !/Aksesuar/.test(s.sinif)).map(s => `<div><span>${esc(t(s.ad))}</span><b>${satis(s.fiyat, A)}</b></div>`).join('')}</div>` : ''}</div></div>`).join('')}`).join('')}
      <footer>${esc(A.firma)} · ${esc(A.iletisim)}</footer><script>setTimeout(()=>print(),700)<\/script></body></html>`);
    w.document.close();
  }

  if (window.dilEkle) window.dilEkle({
    'Müşteri kataloğu': 'Customer catalogue', 'Kendi logonuz ve satış fiyatınızla katalog': 'Catalogue with your logo and resale prices', 'Kendi logonuz ve kendi satış fiyatınızla katalog hazırlayın. EXIT bayi fiyatı katalogda görünmez.': 'Create a catalogue with your own logo and resale prices. EXIT dealer prices are not shown.',
    'Firma adı': 'Company name', 'Logo': 'Logo', 'Logo yükle': 'Upload logo', 'Değiştir': 'Change', 'Kaldır': 'Remove', 'İletişim satırı': 'Contact line', 'Fiyatları göster': 'Show prices', 'KDV dahil (%20)': 'Incl. VAT (20%)', 'Kâr payı (%)': 'Markup (%)', 'Yuvarlama': 'Rounding', 'Yok': 'None',
    'Para birimi': 'Currency', 'Kur (1 USD = ?)': 'Rate (1 USD = ?)', 'Hangi ürünler?': 'Which products?', 'Katalogdaki mevcut filtre': 'Current catalogue filter', 'Tüm ürünler': 'All products', 'Favorilerim': 'My favourites', 'Vazgeç': 'Cancel', 'Kataloğu oluştur': 'Create catalogue', 'Kuru yazın.': 'Enter the exchange rate.',
    'Teslimat adreslerim': 'My delivery addresses', 'Şantiye, otel veya depo adreslerinizi kaydedin; sepette tek tıkla seçin.': 'Save site, hotel or warehouse addresses and pick them in the cart with one click.', 'Henüz kayıtlı adres yok.': 'No saved addresses yet.', 'Henüz kayıtlı adres yok': 'No saved addresses yet',
    'Varsayılan': 'Default', 'Varsayılan yap': 'Make default', 'Düzenle': 'Edit', 'Sil': 'Delete', 'Silinsin mi?': 'Delete?', 'Yeni adres': 'New address', 'Adresi düzenle': 'Edit address', 'Adres adı': 'Address name', 'Örn. Otel Mavi Koy şantiye': 'E.g. Hotel Mavi Koy site', 'Şehir / ilçe': 'City / district', 'Teslim alacak kişi': 'Recipient', 'Telefon': 'Phone', 'Açık adres': 'Full address',
    'Kaydet': 'Save', 'Adresi ekle': 'Add address', 'Adres eklendi.': 'Address added.', 'Adres güncellendi.': 'Address updated.', 'Adres adını ve açık adresi yazın.': 'Enter the address name and full address.', 'Kayıtlı adres seçin…': 'Choose a saved address…', 'Kayıtlı adres yok': 'No saved address', 'Adreslerim': 'My addresses', 'Adresleri yönet': 'Manage addresses',
    'Henüz prim basamağına ulaşmadınız.': 'You have not reached a bonus tier yet.', 'En üst basamaktasınız, tebrikler!': 'You are on the top tier, congratulations!', 'hedef': 'target'
  }, [
    [/^(\d+) hedefim ve primim$/, (m, y) => `My ${y} target and bonus`], [/^Sevk edilen ve onaylanan siparişleriniz \(net, iptaller hariç\) · yıl sonuna (\d+) gün$/, (m, n) => `Your approved and shipped orders (net, excl. cancellations) · ${n} days to year end`],
    [/^%(\d+) → %([\d.,]+) prim$/, (m, a, b) => `${a}% → ${b}% bonus`], [/^(\d+) kayıtlı adres · sepette tek tıkla seçilir$/, (m, n) => `${n} saved address(es) · pick in the cart with one click`], [/^Henüz kayıtlı adres yok · sepette tek tıkla seçilir$/, () => 'No saved addresses yet · pick in the cart with one click'],
    [/^Örnek: (.+) · bayi fiyatı (.+) → katalogda (.+)$/, (m, a, b, c) => `Example: ${a} · dealer price ${b} → catalogue ${c}`]
  ]);
})();
