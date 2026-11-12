
(function () {
  const RENK9 = { Granit: '#76766f', Seramik: '#d9d3c6', 'RAL 1013': '#EAE6CA', 'RAL 9016': '#F6F6F2', 'RAL 7006': '#75695C', 'RAL 7016': '#383E42', 'RAL 9005': '#0E0E10' };
  const FILE9 = { 'Terra 01': ['#f4f4f0', '#d6d6cf'], 'Terra 05': ['#1c1c1c', '#3d3d3d'], 'Terra 02': ['#e8dec8', '#c9bc9f'], 'Terra 03': ['#8c7b66', '#6a5c4b'], 'Terra 04': ['#41464a', '#2a2e31'], 'Crome': ['#d8dde1', '#8e959b'] };
  const MASKE = /*@maskeler*/null, ASIL = {};
  // renk önizleme aynı kökenli fotoğraf ister (tuval); web sitesinde tam boy WebP, dosya sürümünde gömülü görsel
  VERI.urunler.forEach(u => { if (MASKE[u.id] && u.gorsel && (u.gorselB || u.gorsel.startsWith('data:'))) ASIL[u.id] = u.gorselB || u.gorsel; });
  const yukle = s => new Promise((r, h) => { const i = new Image(); i.onload = () => r(i); i.onerror = h; i.src = s; });
  const piksel = (im, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h); };
  // sRGB <-> Lab
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116, lin = v => (v /= 255) <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4), gam = v => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - .055);
  function lab(r, g, b) { r = lin(r); g = lin(g); b = lin(b); const X = f((r * .4124 + g * .3576 + b * .1805) / .95047), Y = f(r * .2126 + g * .7152 + b * .0722), Z = f((r * .0193 + g * .1192 + b * .9505) / 1.08883); return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]; }
  function rgb(L, a, b) { const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200, i = t => t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27); const X = i(fx) * .95047, Y = i(fy), Z = i(fz) * 1.08883;
    return [X * 3.2406 - Y * 1.5372 - Z * .4986, -X * .9689 + Y * 1.8758 + Z * .0415, X * .0557 - Y * .204 + Z * 1.057].map(v => Math.max(0, Math.min(255, gam(Math.max(0, v))))); }
  const hex = h => lab(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
  const ortRenk = {};
  async function kumasRenk(k) { if (k in ortRenk) return ortRenk[k]; ortRenk[k] = null; try { const s = VERI.kumas && VERI.kumas[k]; if (s) { const d = piksel(await yukle(s), 24, 24).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4, x = v => Math.round(v / n).toString(16).padStart(2, '0'); ortRenk[k] = '#' + x(r) + x(g) + x(b); } } catch (e) {} return ortRenk[k]; }
  const ONB = {};
  async function hazirla(id) { if (ONB[id]) return ONB[id]; const fo = await yukle(ASIL[id]), w = fo.naturalWidth, h = fo.naturalHeight, mk = piksel(await yukle(MASKE[id]), w, h).data, d = piksel(fo, w, h);
    const L = new Float32Array(w * h), A = new Float32Array(w * h), B = new Float32Array(w * h), lb = new Uint8Array(w * h), med = {};
    for (let p = 0; p < w * h; p++) { const v = mk[p * 4]; lb[p] = v < 40 ? 0 : v < 128 ? 1 : v < 212 ? 2 : 3; if (lb[p] === 1 || lb[p] === 2) { const q = lab(d.data[p * 4], d.data[p * 4 + 1], d.data[p * 4 + 2]); L[p] = q[0]; A[p] = q[1]; B[p] = q[2]; (med[lb[p]] = med[lb[p]] || []).push(q[0]); } }
    for (const k in med) { const s = med[k].sort((a, b) => a - b); med[k] = s[s.length >> 1]; }
    return ONB[id] = { w, h, d, L, lb, med }; }
  async function ciz(cv, id, fr, fb) { const o = await hazirla(id), out = new ImageData(new Uint8ClampedArray(o.d.data), o.w, o.h), hd = { 1: fr && hex(fr), 2: fb && hex(fb) };
    for (let p = 0; p < o.w * o.h; p++) { const k = o.lb[p], t = hd[k]; if (!t) continue; const c = rgb(Math.max(0, Math.min(100, t[0] + (o.L[p] - o.med[k]) * .85)), t[1], t[2]); out.data[p * 4] = c[0]; out.data[p * 4 + 1] = c[1]; out.data[p * 4 + 2] = c[2]; }
    cv.width = o.w; cv.height = o.h; cv.getContext('2d').putImageData(out, 0, 0); }
  const _ua9 = urunAc;
  urunAc = function (id) {
    _ua9.apply(this, arguments); if (!ASIL[id]) return; const p = $$('.perde').pop(); if (!p) return;
    const s = a => (p.querySelector(`.renk.on[data-a=${a}]`) || {}).dataset?.k || '';
    let son = '', sira = 0;
    const yenile = async () => { const k = p.querySelector('.r-onizle'); if (!k) return; const isk = s('iskelet'), fl = s('file'), km = s('kumas'), v = [isk, fl, km].join('|');
      let kt = k.querySelector('.r-foto'); if (kt && son === v) return; son = v; const my = ++sira;
      if (!kt) { kt = document.createElement('div'); kt.className = 'r-foto'; kt.innerHTML = '<canvas></canvas><span class="n"></span>'; const b = k.querySelector('.b'); b ? b.after(kt) : k.prepend(kt); }
      const fr = RENK9[isk] || null, fb = fl && FILE9[fl] ? FILE9[fl][0] : (km ? await kumasRenk(km) : null);
      if (my !== sira) return;
      try { await ciz(kt.querySelector('canvas'), id, fr, fb); kt.querySelector('.n').textContent = isk || fl || km ? 'Gerçek ürün fotoğrafı · seçtiğiniz renklerle' : 'Renk seçtikçe fotoğraf güncellenir'; } catch (e) { kt.remove(); } };
    yenile(); new MutationObserver(() => yenile()).observe(p, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  };
})();
