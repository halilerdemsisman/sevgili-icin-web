// Satış paneli özelliklerinin ortak yardımcıları (3b-2). Önceden her parçada ayrı kopyaları vardı
// (pencere 4, firma adı 3, menü düğmesi 4, para ve sayı biçimi 3 kopya). Genel adlardır; özellik dosyaları kullanır.
// Ek sayfalar: ad → çizen fonksiyon. git() önce buraya bakar; başlık menüdeki yazıdır.
const S6 = window.S6 = {};
EK.sayfa6 = s => typeof S6[s] === 'function' ? [null, S6[s]] : null;
// pencere (perde): dışına tıklayınca ya da × ile kapanır. stil: pencerenin style özniteliği (ör. 'max-width:560px')
function pencereAc(html, stil) { const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) p.remove(); }; p.innerHTML = `<div class="pencere" style="${stil}"><button class="kapat">×</button>${html}</div>`; document.body.appendChild(p); p.querySelector('.kapat').onclick = () => p.remove(); return p; }
const tarihSaat = t => new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
const firmaAd = k => (MUS[k] || {}).firma || k;
const bugunISO = () => new Date().toISOString().slice(0, 10);
const gunFarki = t => Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / GUN);
const ikonSvg = d => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
// menüye düğme: yer düğmesinin ardına (once: önüne); yer yoksa menünün sonuna
function menuEkle(s, ad, d, yer, once) { if ($(`aside button.m[data-s=${s}]`)) return; const r = $(`aside button.m[data-s=${yer}]`); const h = `<button class="m" data-s="${s}">${ikonSvg(d)}${ad} <span class="say gizli"></span></button>`; if (r) r.insertAdjacentHTML(once ? 'beforebegin' : 'afterend', h); else $('#menu').insertAdjacentHTML('beforeend', h); }
const sayiTR = v => parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
const usd2 = n => (Math.round((n || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
function csvTablo(ad, R) { const t = '﻿' + R.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' })); a.download = ad; a.click(); }
function islemYaz(olay, detay) { try { islemKaydi(olay, detay); } catch (e) {} }
