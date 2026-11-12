
(function () {
  // logolar sayfa tamamen yüklenince parça parça gelir; giriş ekranında 8 saniyede bir tekrarlar
  const oyna = l => { l.classList.remove('lg-oyna'); void l.offsetWidth; l.classList.add('lg-oyna'); };
  const gorunen = k => [...document.querySelectorAll(k + ' .logolar')].filter(l => l.offsetParent !== null);
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
