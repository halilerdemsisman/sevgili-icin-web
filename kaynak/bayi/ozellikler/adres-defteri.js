// Teslimat adres defteri: cari hesabımda adresler, sepette tek tıkla seçim.
(function () {
  const pencere = (html, sinif) => pencereAc(html, sinif);

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
      t.insertAdjacentHTML('beforebegin', `<div class="ad-sat"><select id="sAdSec" aria-label="Kayıtlı adres"><option value="">${L.length ? 'Kayıtlı adres seçin…' : 'Kayıtlı adres yok'}</option>${L.map(x => `<option value="${x.id}">${esc(x.ad)}</option>`).join('')}</select><button type="button" id="sAdYon">Adreslerim</button></div>`);
      if (v && (!t.value.trim() || t.value.trim() === (ben.sehir || '').trim())) { t.value = adresMetin(v); c.querySelector('#sAdSec').value = v.id; }
      c.querySelector('#sAdSec').onchange = e => { const a = aOku().find(x => x.id === e.target.value); if (a) t.value = adresMetin(a); };
      c.querySelector('#sAdYon').onclick = () => adresler(() => { const s = c.querySelector('.ad-sat'); if (s) s.remove(); ekle(); });
      mesgul = false; };
    ekle(); new MutationObserver(ekle).observe(c, { childList: true, subtree: true });
  };
  // cari sayfasında adres defteri kısayolu
  EK.cariAdresler = function () { if ($('#adKisa')) return; const n = aOku().length; $('#s-cari').insertAdjacentHTML('beforeend', `<div class="hd-kart" id="adKisa"><div class="hd-ust"><div><h3>Teslimat adreslerim</h3><div class="kucuk">${n ? n + ' kayıtlı adres' : 'Henüz kayıtlı adres yok'} · sepette tek tıkla seçilir</div></div><button class="btn cizgi" id="adAc">Adresleri yönet</button></div></div>`); $('#adAc').onclick = () => adresler(() => git('cari')); };
})();
