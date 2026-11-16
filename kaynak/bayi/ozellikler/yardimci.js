// Özelliklerin ortak yardımcıları (önceden her parçada ayrı kopyası vardı).
// pencereAc: kapatma düğmeli pencere (perde); ikon: 18 px çizgi simge; usd2: 2 haneli $ tutar; sayiTR: "1.234,5" → 1234.5
const pencereAc = (html, sinif) => {
  const p = document.createElement('div'); p.className = 'perde ' + (sinif || 'form-p'); p.onclick = e => { if (e.target === p) p.remove(); };
  p.innerHTML = `<div class="pencere" style="position:relative"><button class="kapat" aria-label="Kapat">×</button>${html}</div>`; document.body.appendChild(p);
  p.querySelector('.kapat').onclick = () => p.remove(); return p;
};
const ikon = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const usd2 = n => (Math.round((n || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
const sayiTR = v => parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')) || 0;
const bugun = () => new Date().toISOString().slice(0, 10);
const gunFark = t => Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
const urunBul = id => VERI.urunler.find(u => u.id === id);
// bilgi penceresi (toplu sipariş sonucu, tekrar sipariş uyarısı)
function bilgiPenceresi(bas, html) {
  const p = document.createElement('div'); p.className = 'perde toplu-sonuc'; p.onclick = e => { if (e.target === p) p.remove(); };
  p.innerHTML = `<div class="pencere" style="position:relative"><button class="kapat" aria-label="Kapat">×</button><h3 style="margin:0 0 8px">${esc(bas)}</h3>${html}<div style="text-align:right;margin-top:16px"><button class="btn marka">Tamam</button></div></div>`;
  document.body.appendChild(p); p.querySelector('.kapat').onclick = p.querySelector('.btn.marka').onclick = () => p.remove();
}
