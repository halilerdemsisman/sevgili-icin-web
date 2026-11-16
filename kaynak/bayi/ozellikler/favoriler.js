// Favoriler (katalogda kalp, Favorilerim sekmesi ve süzgeci) ile katalog/ürün penceresinde stok rozeti ve tahmini teslim.
(function () {
  const KALP = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const favler = () => (ben && oku('exb-fav-' + ben.kul, [])) || [];
  const favAyarla = (id, on) => { const L = favler().filter(x => x !== id); if (on) L.push(id); yaz('exb-fav-' + ben.kul, L); };
  const stokD = stokOzeti;

  // ---------- favoriler: filtre
  F.fav = false;
  EK.favoriUygun = u => !(F.fav && !favler().includes(u.id));

  // ---------- katalog: kalp, favori sekmesi, stok rozeti
  EK.katalogFavori = function () {
    const FV = favler(), D = stokD();
    const nav = $('#katNav');
    if (nav) {
      nav.insertAdjacentHTML('beforeend', `<button class="fav-nav ${F.fav ? 'on' : ''}" data-fav-nav>${KALP}Favorilerim<span class="n" style="opacity:.7">${FV.length ? ' (' + FV.length + ')' : ''}</span></button>`);
      if (F.fav) nav.querySelectorAll('button[data-k]').forEach(b => b.classList.remove('on'));
      nav.querySelector('[data-fav-nav]').onclick = () => { F.fav = !F.fav; if (F.fav) { F.kat = ''; F.sinif.clear(); } katalog(); };
    }
    const g = $('#fKmp'); if (g && !$('#fFav')) {
      g.closest('label').insertAdjacentHTML('afterend', `<label class="f-sec"><input type="checkbox" id="fFav" ${F.fav ? 'checked' : ''}> Yalnız favorilerim<span class="n">${FV.length}</span></label>`);
      $('#fFav').onchange = e => { F.fav = e.target.checked; katalog(); };
    }
    const t = $('#fTemizle'); if (t) { const o = t.onclick; t.onclick = () => { F.fav = false; o && o(); }; }
    if (F.fav) { $('#baslik').textContent = 'Favorilerim'; const e = $('#etiketler'); e.insertAdjacentHTML('afterbegin', `<span class="etiket">Favorilerim<button data-fav-sil>×</button></span>`); e.querySelector('[data-fav-sil]').onclick = () => { F.fav = false; katalog(); }; }
    if (F.fav && !FV.length) $('#izgara').innerHTML = '<div class="bos-durum">Henüz favori ürününüz yok. Ürün kartındaki kalp simgesine dokunarak ekleyebilirsiniz.</div>';
    $$('#izgara .kart').forEach(k => {
      const id = +k.dataset.id, u = VERI.urunler.find(x => x.id === id); if (!u) return;
      const f = k.querySelector('.foto');
      if (f) { f.insertAdjacentHTML('beforeend', `<button class="fav-btn ${FV.includes(id) ? 'on' : ''}" title="Favorilere ekle / çıkar" aria-label="Favori">${KALP}</button>`);
        f.querySelector('.fav-btn').onclick = e => { e.stopPropagation(); const on = !favler().includes(id); favAyarla(id, on); toast(on ? u.ad + ' favorilere eklendi.' : u.ad + ' favorilerden çıkarıldı.'); if (F.fav && !on) katalog(); else { e.currentTarget.classList.toggle('on', on); const n = nav && nav.querySelector('[data-fav-nav] .n'); if (n) { const c = favler().length; n.textContent = c ? ' (' + c + ')' : ''; } } }; }
      if (D) { const z = terminTahmin(D, u.ad, u.kategori, '', '', 1), gv = k.querySelector('.govde .fiyat');
        if (z && gv) gv.insertAdjacentHTML('afterend', z.stok ? `<span class="k-stok var"><i></i>Stokta</span>` : `<span class="k-stok"><i></i>~${z.gun} gün</span>`); }
    });
  };

  // ---------- ürün penceresi: kalp + tahmini teslim
  EK.urunFavoriStok = function (p, u) {
    const id = u.id;
    let mesgul = false;
    const ekle = () => {
      if (mesgul) return; mesgul = true;
      try {
        const h = p.querySelector('.p-bilgi h2');
        if (h && !h.querySelector('.fav-btn')) { const on = favler().includes(id); h.insertAdjacentHTML('beforeend', `<button class="fav-btn p-fav ${on ? 'on' : ''}" title="Favorilere ekle / çıkar" aria-label="Favori">${KALP}</button>`);
          h.querySelector('.fav-btn').onclick = e => { const y = !favler().includes(id); favAyarla(id, y); e.currentTarget.classList.toggle('on', y); toast(y ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.'); }; }
        const D = stokD(), alt = p.querySelector('.p-alt');
        if (D && alt && !p.querySelector('.stk-satir')) {
          const ci = p.querySelector('.cip.on'), sec = ci ? (u.secenek[+ci.dataset.i] || {}).ad : (u.secenek[0] || {}).ad;
          const ik = p.querySelector('.renk.on[data-a=iskelet]'), isk = ik ? (ISKELET.find(x => x.kod === ik.dataset.k) || {}).ad : '';
          const adet = Math.max(1, parseInt((p.querySelector('#pAdet') || {}).value) || 1), z = terminTahmin(D, u.ad, u.kategori, sec, isk, adet);
          if (z) alt.insertAdjacentHTML('beforebegin', `<div class="stk-satir">${z.stok ? '<span class="k-stok var"><i></i>Stokta</span>' : '<span class="k-stok"><i></i>Üretilecek</span>'}<span>Tahmini teslim: <b>${tarih(gunSonra(z.gun))}</b> (~${z.gun} gün)</span>${!isk ? '<span class="kucuk">İskelet rengini seçince kesinleşir.</span>' : ''}</div>`);
        }
      } finally { mesgul = false; }
    };
    ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
  };
})();
