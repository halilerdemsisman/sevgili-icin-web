
(function () {
  // logolar sayfa tamamen yüklenince parça parça gelir; giriş ekranında 8 saniyede bir tekrarlar
  // animasyon yeniden başlatılırken sayfa yerleşimi zorla hesaplatılmaz (offsetWidth/offsetParent): katalog açıkken
  // telefonda yarım saniyelik bir duraklama yapıyordu (Faz 2c). Sınıf iki kare sonra yeniden eklenir.
  const oyna = l => { l.classList.remove('lg-oyna'); requestAnimationFrame(() => requestAnimationFrame(() => l.classList.add('lg-oyna'))); };
  const gorunen = k => [...document.querySelectorAll(k + ' .logolar')].filter(l => l.checkVisibility ? l.checkVisibility() : l.offsetParent !== null);
  const basla = () => {
    gorunen('#giris').forEach(oyna);
    setInterval(() => { const g = document.getElementById('giris'); if (g && !g.classList.contains('gizli')) gorunen('#giris').forEach(oyna); }, 8000);
    const uyg = document.getElementById('uyg');
    if (uyg) {
      if (!uyg.classList.contains('gizli')) gorunen('#uyg').forEach(oyna);
      new MutationObserver(() => { if (!uyg.classList.contains('gizli')) setTimeout(() => gorunen('#uyg').forEach(oyna), 50); }).observe(uyg, { attributes: true, attributeFilter: ['class'] });
    }
  };
  if (document.readyState === 'complete') setTimeout(basla, 150); else addEventListener('load', () => setTimeout(basla, 150));
})();
