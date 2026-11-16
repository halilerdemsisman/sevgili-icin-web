// Ürün penceresi: hangi ürüne hangi renk seçimi gerekir, seçenek/renk/adet seçimi, 360° görüntüleyici.
// ---------- hangi ürüne hangi renk seçimi
function ihtiyac(u, s) {
  const t = ((s && s.ad) || '').toLocaleLowerCase('tr'), k = u.kategori;
  const pedli = /ped|minder/.test(t) || /minder/i.test(u.ad);
  const kumas = k === 'Oturma Grupları' || k === 'Aile Paketleri' || pedli;
  const file = /file/.test(t) || (['Sandalyeler', 'Bar Sandalyeleri', 'Şezlonglar'].includes(k) && !pedli);
  return { iskelet: true, file, kumas, fitil: kumas };
}

// ---------- ürün penceresi
function urunAc(id) {
  const u = VERI.urunler.find(x => x.id === id);
  const S = { sec: u.secenek[0] || null, iskelet: null, file: null, kumas: null, fitil: null, adet: 1, not: '' };
  const perde = document.createElement('div'); perde.className = 'perde';
  perde.onclick = e => { if (e.target === perde) perde.remove(); };
  document.body.appendChild(perde);
  const renkGrup = (ad, liste, alan, no, alt) => `<div class="adim"><h4 aria-level="3"><i>${no}</i>${ad}<em>${S[alan] ? esc(liste.find(x => x.kod === S[alan]).ad + (S[alan] !== liste.find(x => x.kod === S[alan]).ad ? ' · ' + S[alan] : '')) : alt}</em></h4>
    <div class="renkler">${liste.map(r => `<button class="renk ${S[alan] === r.kod ? 'on' : ''}" data-a="${alan}" data-k="${esc(r.kod)}"><div class="ornek" style="background:${r.ornek}"></div><b>${esc(r.ad)}</b>${r.ad !== r.kod ? `<small>${esc(r.kod)}</small>` : ''}</button>`).join('')}</div></div>`;
  function ciz() {
    const ih = ihtiyac(u, S.sec);
    ['file', 'kumas', 'fitil'].forEach(a => { if (!ih[a]) S[a] = null; });
    let no = 1; const eksik = [];
    if (u.secenek.length && !S.sec) eksik.push('seçenek');
    if (!S.iskelet) eksik.push('iskelet rengi'); if (ih.file && !S.file) eksik.push('file rengi'); if (ih.kumas && !S.kumas) eksik.push('kumaş'); if (ih.fitil && !S.fitil) eksik.push('fitil rengi');
    const birim = S.sec ? S.sec.fiyat : null;
    const isk = ISKELET.find(x => x.kod === S.iskelet), fl = FILE.find(x => x.kod === S.file);
    perde.innerHTML = `<div class="pencere" style="position:relative"><button class="kapat" aria-label="Kapat">×</button>
      <div class="p-foto"><div class="buyuk" title="360° görünüm için tıklayın" style="cursor:zoom-in;position:relative;${u.gorsel ? `background-image:url(${u.gorselB || u.gorsel})` : 'background:var(--yuzey2)'}">${u.gorsel ? '<span class="r360">360°</span>' : ''}</div>
        <div class="ozet"><div><span>Ürün</span><b>${esc(u.ad)}</b></div><div><span>Seçenek</span><b>${S.sec ? esc(S.sec.ad) : '—'}</b></div>
        <div><span>İskelet</span><b>${isk ? esc(isk.ad + ' · ' + isk.kod) : '—'}</b></div>
        ${ih.file ? `<div><span>File</span><b>${fl ? esc(fl.ad + ' · ' + fl.kod) : '—'}</b></div>` : ''}
        ${ih.kumas ? `<div><span>Kumaş</span><b>${S.kumas || '—'}</b></div><div><span>Fitil</span><b>${S.fitil || '—'}</b></div>` : ''}
        <div><span>Adet</span><b>${S.adet}</b></div></div>
        <p class="kucuk">Renkler ekranda temsilidir; kesin ton için kartelaya bakınız.</p></div>
      <div class="p-bilgi"><span class="kucuk">${esc(u.kategori)}</span><h2>${esc(u.ad)}</h2>${u.kmp ? `<div class="kmp-bant"><b>%${u.kmp.oran} kampanya</b> · ${esc(u.kmp.ad)}${u.kmp.bit ? ` · ${tarih(u.kmp.bit)} tarihine kadar geçerli` : ''}</div>` : ''}<p class="aciklama">${esc(u.aciklama || '')}</p>${teknikHtml(u)}
        ${u.secenek.length ? `<div class="adim"><h4 aria-level="3"><i>${no++}</i>Seçenek / ölçü</h4><div class="secenekler">${u.secenek.map((s, i) => `<button class="cip ${S.sec === s ? 'on' : ''}" data-i="${i}"><small>${esc(s.sinif)}</small><b>${esc(s.ad)}</b> · ${u.kmp && s.liste != null ? `<s class="eski">${para(s.liste)}</s> ` : ''}${para(s.fiyat)}</button>`).join('')}</div></div>`
          : '<div class="uyari">Bu ürünün fiyatı listede yok. Seçimlerinizle birlikte fiyat teklifi isteyebilirsiniz.</div>'}
        ${renkGrup('İskelet rengi', ISKELET, 'iskelet', no++, 'Seçiniz')}
        ${ih.file ? renkGrup('File rengi', FILE, 'file', no++, 'Seçiniz') : ''}
        ${ih.kumas ? renkGrup('Kumaş', KUMAS, 'kumas', no++, 'Seçiniz') : ''}
        ${ih.fitil ? renkGrup('Fitil rengi', KUMAS, 'fitil', no++, 'Seçiniz') : ''}
        <div class="adim"><h4 aria-level="3"><i>${no++}</i>Adet ve not</h4><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div class="adet"><button data-ad="-1">−</button><input id="pAdet" aria-label="Adet" value="${S.adet}" inputmode="numeric"><button data-ad="1">+</button></div>
          <input id="pNot" placeholder="Not (isteğe bağlı)" value="${esc(S.not)}" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid var(--cizgi);border-radius:10px"></div></div>
        <div class="p-alt"><div class="tutar">${birim == null ? 'Teklif' : para(birim * S.adet)}<small>${birim == null ? 'fiyat sonradan bildirilir' : S.adet + ' × ' + para(birim)}</small></div>
          <button class="btn marka" id="pEkle" ${eksik.length ? 'disabled' : ''} title="${eksik.length ? 'Eksik: ' + eksik.join(', ') : ''}">${birim == null ? 'Teklif sepetine ekle' : 'Sepete ekle'}</button></div>
        ${eksik.length ? `<p class="kucuk" style="text-align:right;margin:6px 0 0">Eksik seçim: ${eksik.join(', ')}</p>` : ''}
      </div></div>`;
    perde.querySelector('.kapat').onclick = () => perde.remove();
    if (u.gorsel) perde.querySelector('.buyuk').onclick = () => goruntule360(u);
    perde.querySelectorAll('.cip').forEach(b => b.onclick = () => { S.sec = u.secenek[+b.dataset.i]; ciz(); });
    perde.querySelectorAll('.renk').forEach(b => b.onclick = () => { S[b.dataset.a] = b.dataset.k; ciz(); });
    perde.querySelectorAll('[data-ad]').forEach(b => b.onclick = () => { S.adet = Math.max(1, S.adet + +b.dataset.ad); ciz(); });
    perde.querySelector('#pAdet').onchange = e => { S.adet = Math.max(1, parseInt(e.target.value) || 1); ciz(); };
    perde.querySelector('#pNot').oninput = e => S.not = e.target.value;
    perde.querySelector('#pEkle').onclick = () => {
      const s = sepet(); s.push({ id: u.id, ad: u.ad, kategori: u.kategori, secenek: S.sec ? S.sec.ad : '', sinif: S.sec ? S.sec.sinif : '', birim: birim, liste: S.sec ? S.sec.liste : null, kampanya: u.kmp ? u.kmp.ad + ' (%' + u.kmp.oran + ')' : '', adet: S.adet,
        iskelet: isk ? isk.ad + ' (' + isk.kod + ')' : '', file: fl ? fl.ad + ' (' + fl.kod + ')' : '', kumas: S.kumas || '', fitil: S.fitil || '', not: S.not });
      sepetKaydet(s); perde.remove(); toast(u.ad + ' sepete eklendi.');
    };
  }
  ciz();
  const esc_ = e => { if (e.key === 'Escape') { perde.remove(); document.removeEventListener('keydown', esc_); } }; document.addEventListener('keydown', esc_);
  // ekler pencereye kendi düğmelerini/önizlemelerini ekler; pencere yeniden çizildikçe (MutationObserver) yenilerler
  EK.urunFavoriStok?.(perde, u); EK.urunRenkOnizleme?.(perde, u); EK.urunNumune?.(perde, u); EK.urunKarsilastir?.(perde, u);
  EK.urunOzelTeklif?.(perde, u); EK.urunAdres?.(perde, u);
}

// ---------- 360° görüntüleyici
// Ürünün çok açılı fotoğrafları (u.acilar: 24-36 kare) varsa gerçek 360° döner; yoksa tek fotoğrafla 3B döner tabla gösterilir.
function goruntule360(u) {
  const kareler = u.acilar && u.acilar.length > 1 ? u.acilar : null;
  const v = document.createElement('div'); v.className = 'v360';
  v.innerHTML = `<div class="v-ust"><b>${esc(u.ad)}</b><span class="kucuk">${kareler ? 'Sürükleyerek döndürün' : 'Sürükleyerek döndürün · tekerlekle yakınlaştırın'}</span><button class="v-kapat" aria-label="Kapat">×</button></div>
    <div class="v-sahne"><div class="v-tabla"><div class="v-urun"><div class="v-yuz on" style="background-image:url(${u.gorselB || u.gorsel})"></div><div class="v-yuz arka" style="background-image:url(${u.gorselB || u.gorsel})"></div></div><div class="v-golge"></div></div></div>
    <div class="v-alt"><button class="btn cizgi" data-v="sol">⟲</button><input type="range" min="0" max="359" value="0" class="v-aci"><button class="btn cizgi" data-v="sag">⟳</button><button class="btn marka" data-v="oto">Otomatik döndür</button></div>`;
  document.body.appendChild(v);
  const urun = v.querySelector('.v-urun'), on = v.querySelector('.v-yuz.on'), aralik = v.querySelector('.v-aci');
  let aci = 0, zoom = 1, oto = true, son = performance.now(), x0 = null, a0 = 0;
  function ciz() {
    aci = ((aci % 360) + 360) % 360; aralik.value = Math.round(aci);
    if (kareler) { on.style.backgroundImage = `url(${kareler[Math.round(aci / 360 * kareler.length) % kareler.length]})`; urun.style.transform = `scale(${zoom})`; }
    else urun.style.transform = `scale(${zoom}) rotateY(${aci}deg)`;
  }
  function dongu(t) { if (!v.isConnected) return; if (oto) aci += (t - son) * 0.045; son = t; ciz(); requestAnimationFrame(dongu); }
  requestAnimationFrame(dongu);
  const sahne = v.querySelector('.v-sahne');
  sahne.addEventListener('pointerdown', e => { x0 = e.clientX; a0 = aci; oto = false; sahne.setPointerCapture(e.pointerId); });
  sahne.addEventListener('pointermove', e => { if (x0 !== null) { aci = a0 + (e.clientX - x0) * 0.6; } });
  sahne.addEventListener('pointerup', () => x0 = null);
  sahne.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.min(2.2, Math.max(0.7, zoom - e.deltaY * 0.001)); }, { passive: false });
  aralik.oninput = () => { oto = false; aci = +aralik.value; };
  v.querySelector('[data-v=sol]').onclick = () => { oto = false; aci -= 45; };
  v.querySelector('[data-v=sag]').onclick = () => { oto = false; aci += 45; };
  v.querySelector('[data-v=oto]').onclick = () => { oto = !oto; };
  const kapat = () => { v.remove(); document.removeEventListener('keydown', tus); };
  const tus = e => { if (e.key === 'Escape') kapat(); if (e.key === 'ArrowLeft') { oto = false; aci -= 15; } if (e.key === 'ArrowRight') { oto = false; aci += 15; } };
  document.addEventListener('keydown', tus); v.querySelector('.v-kapat').onclick = kapat;
}
