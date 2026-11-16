// Ürün penceresinde renk önizleme (v2.8 çizim, ek8 parça parça çizim, ek9 gerçek fotoğrafın boyanması).
// Motor ortak modülde (kaynak/ortak/renk-onizleme.js); burada yalnız bayi kataloğuyla kurulur ve ürün
// penceresindeki kutu çizilir: başlık, (renk maskesi olan üründe) boyanmış fotoğraf, parçaların çizimi.
(function () {
  const R = window.RENK_ONIZLEME;
  R.kur({ urunler: () => VERI.urunler, kumas: VERI.kumas || {}, maskeler: /*@maskeler*/null,
    foto: u => u.gorselB || (u.gorsel && u.gorsel.startsWith('data:') ? u.gorsel : null) });

  EK.urunRenkOnizleme = function (p, u) {
    const s = a => (p.querySelector(`.renk.on[data-a=${a}]`) || {}).dataset?.k || '';
    // seçili seçenek, pencerenin özet satırından ("Seçenek  Athena 3+1+1+sehpa")
    const secenek = oz => { const m = oz.innerText.match(/Seçenek\s*[\t\n ]\s*([^\n\t]+)/); return m ? m[1].trim() : (u.secenek[0] || {}).ad || ''; };
    let mesgul = false, fotoSon = '', fotoSira = 0;
    async function foto(k, isk, fl, km) {
      const v = [isk, fl, km].join('|'); let kt = k.querySelector('.r-foto');
      if (kt && fotoSon === v) return; fotoSon = v; const my = ++fotoSira;
      if (!kt) { kt = document.createElement('div'); kt.className = 'r-foto'; kt.innerHTML = '<canvas></canvas><span class="n"></span>'; const b = k.querySelector('.b'); b ? b.after(kt) : k.prepend(kt); }
      try {
        if (!await R.fotoBoya(kt.querySelector('canvas'), u.id, { iskelet: isk, file: fl, kumas: km }, () => my === fotoSira)) return;
        kt.querySelector('.n').textContent = isk || fl || km ? 'Gerçek ürün fotoğrafı · seçtiğiniz renklerle' : 'Renk seçtikçe fotoğraf güncellenir';
      } catch (e) { kt.remove(); }
    }
    const yenile = () => {
      if (mesgul) return; const oz = p.querySelector('.p-foto .ozet'); if (!oz) return;
      mesgul = true;
      try {
        let k = p.querySelector('.r-onizle');
        if (!k) { oz.insertAdjacentHTML('afterend', '<div class="r-onizle"></div>'); k = p.querySelector('.r-onizle'); }
        const sec = secenek(oz), isk = s('iskelet'), fl = s('file'), km = s('kumas'), ft = s('fitil'), v = [isk, fl, km, ft, sec].join('|');
        if (k.dataset.v !== v) {
          const P = R.parcalar(u, sec);
          k.innerHTML = `<div class="b">Renk önizleme<span>${P.length > 1 ? P.length + ' parça · ' : ''}${isk ? 'seçtiğiniz renklerle' : 'renk seçtikçe güncellenir'}</span></div>${R.izgara(u, sec, isk, fl, km, ft)}`;
          k.dataset.v = v;
        }
        if (R.fotoVar(u.id)) foto(k, isk, fl, km);
      } finally { mesgul = false; }
    };
    yenile(); new MutationObserver(yenile).observe(p, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  };
})();
