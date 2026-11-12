
// ===== ortak: Excel (.xlsx) / CSV okuma, stok-termin hesabı =====
const trNorm = s => String(s ?? '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
async function zipAc(buf) {
  const dv = new DataView(buf); let e = buf.byteLength - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const F = {};
  for (let i = 0; i < n; i++) {
    const met = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    F[new TextDecoder().decode(new Uint8Array(buf, p + 46, nl))] = { met, csz, off }; p += 46 + nl + xl + cl;
  }
  return async ad => {
    const f = F[ad]; if (!f) return null;
    const d = new Uint8Array(buf, f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), f.csz);
    if (f.met === 0) return new TextDecoder().decode(d);
    return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  };
}
async function xlsxOku(buf) {
  const z = await zipAc(buf), P = s => new DOMParser().parseFromString(s, 'application/xml');
  const ssx = await z('xl/sharedStrings.xml'), SS = ssx ? [...P(ssx).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  let yol = 'xl/worksheets/sheet1.xml';
  try { const wb = P(await z('xl/workbook.xml')), rid = wb.getElementsByTagName('sheet')[0].getAttribute('r:id'), rel = P(await z('xl/_rels/workbook.xml.rels'));
    const r = [...rel.getElementsByTagName('Relationship')].find(x => x.getAttribute('Id') === rid); if (r) { const t = r.getAttribute('Target'); yol = t.startsWith('/') ? t.slice(1) : 'xl/' + t; } } catch (e) {}
  const sx = await z(yol); if (!sx) throw new Error('sayfa');
  const R = [];
  [...P(sx).getElementsByTagName('row')].forEach(row => {
    const satir = [];
    [...row.getElementsByTagName('c')].forEach((c, i) => {
      const ref = c.getAttribute('r') || '', h = (ref.match(/^[A-Z]+/) || [''])[0];
      const col = h ? [...h].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1 : i;
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0];
      let val = t === 's' ? SS[+(v && v.textContent)] : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : v ? v.textContent : '';
      satir[col] = val ?? '';
    });
    const rn = +row.getAttribute('r') || R.length + 1; R[rn - 1] = [...satir].map(x => x ?? '');
  });
  return [...R].map(x => x || []);
}
function csvOku(txt) {
  txt = txt.replace(/^﻿/, ''); const ilk = txt.split(/\r?\n/)[0] || '';
  const ayr = [';', '\t', ','].sort((a, b) => ilk.split(b).length - ilk.split(a).length)[0];
  const R = []; let s = [], h = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { h += '"'; i++; } else q = false; } else h += c; }
    else if (c === '"') q = true; else if (c === ayr) { s.push(h); h = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; s.push(h); R.push(s); s = []; h = ''; }
    else h += c;
  }
  if (h !== '' || s.length) { s.push(h); R.push(s); }
  return R;
}
async function dosyaSatirlar(f) {
  const buf = await f.arrayBuffer(), b = new Uint8Array(buf, 0, 2);
  if (b[0] === 0x50 && b[1] === 0x4b) return xlsxOku(buf);
  let t = new TextDecoder('utf-8').decode(buf); if (t.includes('�')) t = new TextDecoder('windows-1254').decode(buf);
  return csvOku(t);
}
function csvIndir(ad, R) {
  const csv = '﻿' + R.map(r => r.map(v => { v = String(v ?? ''); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = ad; a.click();
}
function dosyaSec(kabul, cb) { const i = document.createElement('input'); i.type = 'file'; i.accept = kabul; i.onchange = () => i.files[0] && cb(i.files[0]); i.click(); }

// Stok ve termin: satış panelinin yayınladığı özet (exb-stok) üzerinden tahmini teslim günü
const renkAdi = s => String(s || '').replace(/\s*\(.*\)\s*$/, '').trim();
function terminTahmin(D, ad, kategori, sec, renk, adet) {
  if (!D) return null;
  const u = (D.u || {})[ad], hz = D.hazirlik ?? 3, kg = D.kuyrukGun || 0, vs = (D.kat || {})[kategori] ?? 21;
  adet = adet || 1; renk = renkAdi(renk);
  const lvl = o => o ? (renk && o.r ? (o.r[renk] ?? 0) : o.s) : undefined;
  let serbest = null;
  if (u) { const s = sec && u.sec ? u.sec[sec] : null; serbest = (s ? lvl(s) : lvl(u)) ?? 0; }
  if (serbest != null && serbest >= adet) return { stok: true, serbest, gun: hz };
  const ur = u && u.uretim;
  if (ur && ur.bitis && ur.adet >= adet - (serbest || 0)) return { stok: false, serbest: serbest || 0, gun: Math.max(hz, Math.ceil((Date.parse(ur.bitis) - Date.now()) / 864e5) + hz), mrp: true };
  return { stok: false, serbest: serbest || 0, gun: ((u && u.g) ?? vs) + kg + hz, tahmini: !u };
}
const gunSonra = g => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + g); return d.toISOString().slice(0, 10); };

(function () {
  const KALP = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const favler = () => (ben && oku('exb-fav-' + ben.kul, [])) || [];
  const favAyarla = (id, on) => { const L = favler().filter(x => x !== id); if (on) L.push(id); yaz('exb-fav-' + ben.kul, L); };
  const stokD = () => oku('exb-stok', null);
  window.terminTahmin = terminTahmin;

  // ---------- favoriler: filtre
  F.fav = false;
  const _uygun = uygun;
  uygun = function (u, haric) { if (F.fav && !favler().includes(u.id)) return false; return _uygun(u, haric); };

  // ---------- katalog: kalp, favori sekmesi, stok rozeti
  const _katalog = katalog;
  katalog = function () {
    _katalog();
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
  const _urunAc = urunAc;
  urunAc = function (id) {
    _urunAc(id); const p = $$('.perde').pop(), u = VERI.urunler.find(x => x.id === id); if (!p || !u) return;
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

  // ---------- tekrar sipariş
  function tekrarSiparis(no) {
    const o = oku('exb-siparisler', []).find(x => x.no === no); if (!o) return;
    const s = sepet(), eksik = []; let degisen = 0, eklenen = 0;
    o.kalemler.forEach(x => {
      const u = VERI.urunler.find(y => y.id === x.id) || VERI.urunler.find(y => y.ad === x.ad);
      if (!u) return eksik.push(x.ad + ' (artık katalogda yok)');
      const sc = x.secenek ? u.secenek.find(y => y.ad === x.secenek) : null;
      if (x.secenek && !sc) return eksik.push(x.ad + ' · ' + x.secenek + ' (seçenek kaldırılmış)');
      const birim = sc ? sc.fiyat : null; if (birim !== x.birim) degisen++;
      s.push({ ...x, id: u.id, ad: u.ad, kategori: u.kategori, birim, liste: sc ? sc.liste : null, kampanya: u.kmp ? u.kmp.ad + ' (%' + u.kmp.oran + ')' : '' }); eklenen++;
    });
    sepetKaydet(s);
    if (eksik.length) bilgiPenceresi('Tekrar sipariş', `<p>${eklenen} kalem sepete eklendi. Şu kalemler eklenemedi:</p><ul>${eksik.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`);
    else toast(eklenen + ' kalem sepete eklendi' + (degisen ? '; fiyatlar güncel listeye göre yenilendi.' : '.'));
    if (eklenen) $('#hSepet').click();
  }
  function bilgiPenceresi(bas, html) {
    const p = document.createElement('div'); p.className = 'perde toplu-sonuc'; p.onclick = e => { if (e.target === p) p.remove(); };
    p.innerHTML = `<div class="pencere" style="position:relative"><button class="kapat" aria-label="Kapat">×</button><h3 style="margin:0 0 8px">${esc(bas)}</h3>${html}<div style="text-align:right;margin-top:16px"><button class="btn marka">Tamam</button></div></div>`;
    document.body.appendChild(p); p.querySelector('.kapat').onclick = p.querySelector('.btn.marka').onclick = () => p.remove();
  }
  const _siparislerim = siparislerim;
  siparislerim = function () {
    _siparislerim();
    $$('#s-siparisler .sk [data-dosya]').forEach(b => { if (b.nextElementSibling && b.nextElementSibling.classList.contains('sk-tekrar')) return;
      b.insertAdjacentHTML('afterend', `<button class="btn marka sk-tekrar" style="padding:6px 10px;font-size:12px" data-tekrar="${esc(b.dataset.dosya)}">Tekrar sipariş ver</button>`); });
    $$('[data-tekrar]').forEach(b => b.onclick = () => tekrarSiparis(b.dataset.tekrar));
  };
  const _siparisKarti = siparisKarti;
  siparisKarti = function (o) {
    let h = _siparisKarti(o);
    if (!o.termin && o.tahminiTeslim && !['sevk', 'iptal'].includes(o.durum)) h = h.replace('<b class="soluk">Onaydan sonra bildirilecek</b>', `<b class="soluk">~${tarih(o.tahminiTeslim)} · ön tahmin</b>`);
    return h;
  };

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
  const _siparisDosyasi = siparisDosyasi;
  siparisDosyasi = function (o) {
    if (window._sepetTermin && !o.tahminiTeslim) {
      o.tahminiTeslim = window._sepetTermin; window._sepetTermin = null;
      const S = oku('exb-siparisler', []), x = S.find(y => y.no === o.no); if (x) { x.tahminiTeslim = o.tahminiTeslim; yaz('exb-siparisler', S); }
    }
    return _siparisDosyasi(o);
  };
  // stok bilgisi değişince katalog yenilensin
  let _stkSon = JSON.stringify(stokD());
  setInterval(() => { const y = JSON.stringify(stokD()); if (y !== _stkSon) { _stkSon = y; try { if (ben && !$('#s-katalog').classList.contains('gizli')) katalog(); } catch (e) {} } }, 15000);
})();
