/* Renk önizleme motoru (ortak modül, Faz 2b-2). Uygulamaya bağlı değildir: katalog verisi kur() ile verilir.
   Bayi portalında ürün penceresi ve set oluşturucu kullanır; satış paneli de aynı motoru kullanabilir.
     RENK_ONIZLEME.kur({ urunler: () => [...], kumas: {kod: resim}, maskeler: {id: maske}, foto: u => fotoğraf adresi | null })
     .svg(kategori, iskelet, file, kumas, fitil)          tek parçanın seçilen renklerle çizimi (SVG metni)
     .parcalar(urun, secenekAdi) → [{tip, adet, ad}]      seçenek adından parçalar ("Athena 3+1+1+sehpa + 6 Hera")
     .izgara(urun, secenekAdi, iskelet, file, kumas, fitil) bütün parçaların çizimi (HTML)
     .fotoVar(id)                                         ürünün renk maskesi ve aynı kökenli fotoğrafı var mı
     .fotoBoya(tuval, id, {iskelet, file, kumas}, gecerli?) → Promise   gerçek fotoğrafı seçilen renklere boyar (Lab renk uzayı)
   Renk kodları: iskelet RAL/ad (RENK), file Terra kodu (FILE: [zemin, çizgi]), kumaş ve fitil kumaş kodu (görseli). */
(function () {
  const O = { urunler: () => [], kumas: {}, maskeler: {} }, ASIL = {};
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- parça çizimi (SVG)
  const RENK = { Granit: '#76766f', Seramik: '#d9d3c6', 'RAL 1013': '#EAE6CA', 'RAL 9016': '#F6F6F2', 'RAL 7006': '#75695C', 'RAL 7016': '#383E42', 'RAL 9005': '#0E0E10' };
  const FILE = { 'Terra 01': ['#f4f4f0', '#d6d6cf'], 'Terra 05': ['#1c1c1c', '#3d3d3d'], 'Terra 02': ['#e8dec8', '#c9bc9f'], 'Terra 03': ['#8c7b66', '#6a5c4b'], 'Terra 04': ['#41464a', '#2a2e31'], 'Crome': ['#d8dde1', '#8e959b'] };
  let sira = 0;
  const koyu = (h, f) => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, k = x => Math.max(0, Math.min(255, Math.round(x * f))); return '#' + [k(r), k(g), k(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };
  // tek parça çizimi: tip = sandalye | bar | koltuk | kanepe2 | kanepe3 | sehpa | masa | barmasa | sezlong | bank
  function parca(tip, isk, fl, km, ft) {
    const id = 'o' + (++sira), fr = RENK[isk] || '#9aa3ad', fr2 = koyu(fr, .78), kUrl = km && O.kumas[km], tUrl = ft && O.kumas[ft], fh = FILE[fl] || null;
    const dol = kUrl ? `url(#${id}k)` : fh ? `url(#${id}f)` : '#e9edf2', fit = tUrl ? `url(#${id}t)` : kUrl ? koyu('#8a8a8a', 1) : fr2, cizgi = 'rgba(15,23,42,.28)';
    const defs = `<defs>${fh ? `<pattern id="${id}f" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="${fh[0]}"/><rect width="1.6" height="5" fill="${fh[1]}"/></pattern>` : ''}
      ${kUrl ? `<pattern id="${id}k" width="70" height="70" patternUnits="userSpaceOnUse"><image href="${kUrl}" width="70" height="70" preserveAspectRatio="xMidYMid slice"/></pattern>` : ''}
      ${tUrl ? `<pattern id="${id}t" width="24" height="24" patternUnits="userSpaceOnUse"><image href="${tUrl}" width="24" height="24" preserveAspectRatio="xMidYMid slice"/></pattern>` : ''}
      <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c79a6c"/><stop offset="1" stop-color="#9c7149"/></linearGradient></defs>`;
    const ayak = (x1, y1, x2, y2, w) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${fr}" stroke-width="${w || 6}" stroke-linecap="round"/>`;
    const golge = (rx) => `<ellipse cx="120" cy="158" rx="${rx}" ry="7" fill="rgba(15,23,42,.10)"/>`;
    const minder = (x, y, w, h, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r || 8}" fill="${dol}" stroke="${km ? fit : cizgi}" stroke-width="${km ? 2.5 : 1}"/>`;
    let g = '';
    if (tip === 'sandalye' || tip === 'bar') {
      const b = tip === 'bar' ? 26 : 0;
      g = golge(55) + `${ayak(84, 96 - b, 78, 156)}${ayak(156, 96 - b, 162, 156)}${ayak(96, 104 - b, 98, 148, 5)}${ayak(144, 104 - b, 142, 148, 5)}${b ? `<path d="M84 128 H156" stroke="${fr2}" stroke-width="4"/>` : ''}
        <path d="M82 ${28 - b} Q120 ${20 - b} 158 ${28 - b} L156 ${92 - b} L84 ${92 - b} Z" fill="${fr}"/><path d="M89 ${34 - b} Q120 ${27 - b} 151 ${34 - b} L149 ${86 - b} L91 ${86 - b} Z" fill="${dol}" stroke="${cizgi}"/>
        <path d="M74 ${96 - b} L166 ${96 - b} L158 ${110 - b} L82 ${110 - b} Z" fill="${fr}"/>${minder(80, 86 - b, 80, 16, 6)}
        <path d="M70 ${66 - b} H96 M144 ${66 - b} H170" stroke="${fr2}" stroke-width="6" stroke-linecap="round"/><path d="M72 ${66 - b} V${98 - b} M168 ${66 - b} V${98 - b}" stroke="${fr}" stroke-width="5" stroke-linecap="round"/>`;
    } else if (tip === 'koltuk' || tip === 'kanepe2' || tip === 'kanepe3') {
      const n = tip === 'koltuk' ? 1 : tip === 'kanepe2' ? 2 : 3, w = n === 1 ? 110 : n === 2 ? 170 : 210, x = 120 - w / 2, sw = (w - 36) / n;
      g = golge(w / 2 + 6) + `<rect x="${x}" y="52" width="${w}" height="70" rx="10" fill="${fr}"/><rect x="${x}" y="60" width="16" height="78" rx="5" fill="${fr2}"/><rect x="${x + w - 16}" y="60" width="16" height="78" rx="5" fill="${fr2}"/>
        ${ayak(x + 10, 136, x + 8, 156, 6)}${ayak(x + w - 10, 136, x + w - 8, 156, 6)}
        ${Array.from({ length: n }, (_, i) => minder(x + 18 + i * sw + 1, 40, sw - 2, 50, 10)).join('')}${Array.from({ length: n }, (_, i) => minder(x + 18 + i * sw + 1, 92, sw - 2, 30, 8)).join('')}`;
    } else if (tip === 'sehpa') {
      g = golge(70) + `<path d="M58 104 L182 104 L196 118 L44 118 Z" fill="url(#${id}a)"/><rect x="44" y="118" width="152" height="8" rx="2" fill="${fr}"/>${ayak(54, 126, 52, 154, 7)}${ayak(186, 126, 188, 154, 7)}${ayak(70, 120, 72, 146, 5)}${ayak(170, 120, 168, 146, 5)}`;
    } else if (tip === 'masa' || tip === 'barmasa') {
      const y = tip === 'barmasa' ? 30 : 64;
      g = golge(92) + `<path d="M44 ${y} L196 ${y} L222 ${y + 18} L18 ${y + 18} Z" fill="url(#${id}a)"/><rect x="18" y="${y + 18}" width="204" height="9" rx="2" fill="${fr}"/>
        ${ayak(30, y + 27, 26, 156, 8)}${ayak(210, y + 27, 214, 156, 8)}${ayak(52, y + 20, 54, 146, 6)}${ayak(188, y + 20, 186, 146, 6)}${tip === 'barmasa' ? `<path d="M30 120 H210" stroke="${fr2}" stroke-width="4"/>` : ''}`;
    } else if (tip === 'sezlong') {
      g = golge(100) + `<path d="M26 118 L156 118 L210 62" fill="none" stroke="${fr}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M30 108 L152 108 L202 58" fill="none" stroke="${dol === '#e9edf2' ? '#e2e8f0' : dol}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>${km ? `<path d="M30 100 L150 100 L196 54" fill="none" stroke="${fit}" stroke-width="2.5"/>` : ''}
        ${ayak(40, 120, 36, 150, 6)}${ayak(146, 120, 152, 150, 6)}<circle cx="36" cy="150" r="7" fill="${fr2}"/><circle cx="36" cy="150" r="3" fill="#cbd5e1"/>${ayak(160, 116, 172, 150, 5)}`;
    } else if (tip === 'bank') {
      g = golge(100) + `<rect x="24" y="44" width="192" height="44" rx="8" fill="${fr}"/>${minder(32, 50, 176, 34, 8)}<rect x="20" y="92" width="200" height="12" rx="4" fill="${fr}"/>${minder(26, 84, 188, 16, 6)}${ayak(30, 104, 28, 156, 7)}${ayak(210, 104, 212, 156, 7)}`;
    }
    return `<svg viewBox="0 0 240 170" role="img" aria-label="${tip}" style="filter:drop-shadow(0 0 .7px rgba(15,23,42,.55))">${defs}${g}</svg>`;
  }
  const katTip = (kat, ad) => { const t = (kat || '') + ' ' + (ad || '');
    if (/Şezlong/i.test(t)) return 'sezlong'; if (/Bar Masa/i.test(kat || '')) return 'barmasa'; if (/Bar Sandalye/i.test(kat || '')) return 'bar'; if (/Bank/i.test(t)) return 'bank';
    if (/Sehpa/i.test(t)) return 'sehpa'; if (/Masa/i.test(t)) return 'masa'; if (/Sandalye/i.test(t)) return 'sandalye'; if (/Oturma|Aile/i.test(kat || '')) return 'kanepe3'; return 'sandalye'; };
  const AD = { sandalye: 'Sandalye', bar: 'Bar sandalyesi', koltuk: 'Tekli koltuk', kanepe2: 'İkili kanepe', kanepe3: 'Üçlü kanepe', sehpa: 'Sehpa', masa: 'Masa', barmasa: 'Bar masası', sezlong: 'Şezlong', bank: 'Bank' };
  // seçenek adından parçaları çıkar: "Athena 3+1+1+sehpa + 6 Hera + Lara masa 90*160"
  function parcalar(u, sec) {
    const P = [], ekle = (tip, adet, ad) => { const x = P.find(p => p.tip === tip && p.ad === ad); if (x) x.adet += adet; else P.push({ tip, adet, ad }); };
    const metin = String(sec || '').trim(), oturma = /Oturma|Aile/i.test(u.kategori);
    (metin ? metin.split(/\s\+\s/) : ['']).forEach(t => { t = t.trim();
      const grup = t.match(/(\d)(?:\s*\+\s*(\d))+(?:\s*\+\s*sehpa)?/i);
      if (grup) { const on = t.replace(grup[0], '').trim(), ad = on && O.urunler().some(x => x.ad.toLocaleLowerCase('tr').startsWith(on.toLocaleLowerCase('tr'))) ? on : u.ad; grup[0].split('+').map(s => s.trim()).forEach(s => { if (/sehpa/i.test(s)) ekle('sehpa', 1, ad); else ekle(s === '1' ? 'koltuk' : s === '2' ? 'kanepe2' : 'kanepe3', 1, ad); }); return; }
      if (oturma && /^Üçlü/i.test(t)) return ekle('kanepe3', 1, u.ad); if (oturma && /^İkili/i.test(t)) return ekle('kanepe2', 1, u.ad); if (oturma && /^Tekli/i.test(t)) return ekle('koltuk', 1, u.ad);
      const m = t.match(/^(\d+)\s+(.+)$/), adet = m ? +m[1] : 1, ad = (m ? m[2] : t).replace(/\s*\d+\s*[*x×]\s*\d+.*$/, '').trim();
      if (!ad || !/[a-zçğıöşü]/i.test(ad) || !/(\s|^)\D/.test(t) || (!m && !/masa|sehpa|sandalye/i.test(t) && P.length === 0 && !/\+/.test(metin))) return;
      const kat = (O.urunler().find(x => x.ad.toLocaleLowerCase('tr') === ad.split(/\s+/)[0].toLocaleLowerCase('tr') || x.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr')) || {}).kategori;
      const ad2 = ad.replace(/\s*(masa|sandalye|sehpa)$/i, ''); ekle(katTip(kat || ad, ad), adet, m || (kat && ad2) || /\smasa/i.test(t) ? ad2 || ad : u.ad); });
    if (!P.length) ekle(katTip(u.kategori, u.ad), 1, u.ad);
    return P;
  }
  function izgara(u, sec, isk, fl, km, ft) {
    const P = parcalar(u, sec);
    return `<div class="on-izg ${P.length === 1 ? 'tek' : ''}">${P.map(p => `<div class="on-p">${parca(p.tip, isk, fl, km, ft)}${P.length > 1 ? `<b>${p.adet > 1 ? p.adet + ' × ' : ''}${esc(AD[p.tip])}</b><span>${esc(p.ad)}</span>` : ''}</div>`).join('')}</div>`;
  }

  // ---------- fotoğrafı boyama (renk maskesi: 0 boya yok, 1 iskelet, 2 file/kumaş, 3 sabit)
  const yukle = s => new Promise((r, h) => { const i = new Image(); i.onload = () => r(i); i.onerror = h; i.src = s; });
  const piksel = (im, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h); };
  // sRGB <-> Lab
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116, lin = v => (v /= 255) <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4), gam = v => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - .055);
  function lab(r, g, b) { r = lin(r); g = lin(g); b = lin(b); const X = f((r * .4124 + g * .3576 + b * .1805) / .95047), Y = f(r * .2126 + g * .7152 + b * .0722), Z = f((r * .0193 + g * .1192 + b * .9505) / 1.08883); return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]; }
  function rgb(L, a, b) { const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200, i = t => t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27); const X = i(fx) * .95047, Y = i(fy), Z = i(fz) * 1.08883;
    return [X * 3.2406 - Y * 1.5372 - Z * .4986, -X * .9689 + Y * 1.8758 + Z * .0415, X * .0557 - Y * .204 + Z * 1.057].map(v => Math.max(0, Math.min(255, gam(Math.max(0, v))))); }
  const hex = h => lab(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
  const ortRenk = {};
  async function kumasRenk(k) { if (k in ortRenk) return ortRenk[k]; ortRenk[k] = null; try { const s = O.kumas[k]; if (s) { const d = piksel(await yukle(s), 24, 24).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4, x = v => Math.round(v / n).toString(16).padStart(2, '0'); ortRenk[k] = '#' + x(r) + x(g) + x(b); } } catch (e) {} return ortRenk[k]; }
  const ONB = {};
  async function hazirla(id) { if (ONB[id]) return ONB[id]; const fo = await yukle(ASIL[id]), w = fo.naturalWidth, h = fo.naturalHeight, mk = piksel(await yukle(O.maskeler[id]), w, h).data, d = piksel(fo, w, h);
    const L = new Float32Array(w * h), A = new Float32Array(w * h), B = new Float32Array(w * h), lb = new Uint8Array(w * h), med = {};
    for (let p = 0; p < w * h; p++) { const v = mk[p * 4]; lb[p] = v < 40 ? 0 : v < 128 ? 1 : v < 212 ? 2 : 3; if (lb[p] === 1 || lb[p] === 2) { const q = lab(d.data[p * 4], d.data[p * 4 + 1], d.data[p * 4 + 2]); L[p] = q[0]; A[p] = q[1]; B[p] = q[2]; (med[lb[p]] = med[lb[p]] || []).push(q[0]); } }
    for (const k in med) { const s = med[k].sort((a, b) => a - b); med[k] = s[s.length >> 1]; }
    return ONB[id] = { w, h, d, L, lb, med }; }
  async function ciz(cv, id, fr, fb) { const o = await hazirla(id), out = new ImageData(new Uint8ClampedArray(o.d.data), o.w, o.h), hd = { 1: fr && hex(fr), 2: fb && hex(fb) };
    for (let p = 0; p < o.w * o.h; p++) { const k = o.lb[p], t = hd[k]; if (!t) continue; const c = rgb(Math.max(0, Math.min(100, t[0] + (o.L[p] - o.med[k]) * .85)), t[1], t[2]); out.data[p * 4] = c[0]; out.data[p * 4 + 1] = c[1]; out.data[p * 4 + 2] = c[2]; }
    cv.width = o.w; cv.height = o.h; cv.getContext('2d').putImageData(out, 0, 0); }

  window.RENK_ONIZLEME = {
    RENK, FILE, AD, katTip, parca, parcalar, izgara,
    kur(o) {
      Object.assign(O, o);
      // tuvale çizilebilmesi için fotoğraf aynı kökenden gelmeli (web: tam boy WebP, dosya sürümü: gömülü görsel)
      for (const u of O.urunler()) { const f = o.foto ? o.foto(u) : null; if (O.maskeler[u.id] && f) ASIL[u.id] = f; }
    },
    svg: (kat, isk, fl, km, ft) => parca(katTip(kat), isk, fl, km, ft),
    fotoVar: id => !!ASIL[id],
    // gecerli(): kumaş rengi hesaplanırken başka bir seçim yapıldıysa (false) eski seçim çizilmez
    async fotoBoya(cv, id, { iskelet, file, kumas } = {}, gecerli = () => true) {
      const fr = RENK[iskelet] || null, fb = file && FILE[file] ? FILE[file][0] : (kumas ? await kumasRenk(kumas) : null);
      if (!gecerli()) return false;
      await ciz(cv, id, fr, fb); return true;
    },
  };
})();
