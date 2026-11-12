
(function () {
  const K = 'exit-tema', H = document.documentElement, $1 = s => document.querySelector(s);
  const svg = p => '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const AY = svg('<path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.6 6.6 0 0 0 10.7 10.7z"/>');
  const GUNES = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>');
  const CIKIS = svg('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>');
  const koyu = () => H.getAttribute('data-tema') === 'koyu';
  const ciz = () => document.querySelectorAll('.tema-btn').forEach(b => { b.innerHTML = koyu() ? GUNES : AY; b.title = koyu() ? 'Aydınlık moda geç' : 'Karanlık moda geç'; b.setAttribute('aria-label', b.title); });
  window.temaDegistir = function () {
    H.classList.add('tema-gecis');
    if (koyu()) H.removeAttribute('data-tema'); else H.setAttribute('data-tema', 'koyu');
    try { localStorage.setItem(K, koyu() ? 'koyu' : 'acik'); } catch (e) {}
    ciz(); setTimeout(() => H.classList.remove('tema-gecis'), 400);
  };
  const dugme = cls => { const b = document.createElement('button'); b.type = 'button'; b.className = 'tema-btn ' + cls; b.onclick = window.temaDegistir; return b; };
  // giriş ekranı
  const g = $1('#giris'); if (g && !g.querySelector('.tema-btn')) g.appendChild(dugme('g-tema'));
  // satış paneli: üst şeritte tema + oturumu kapat, alttaki çıkış düzgün
  const kim = $1('#kim'), alt = $1('#cikis');
  if (kim && !$1('#ustCikis')) {
    const t = dugme('ust-ikon'); kim.insertAdjacentElement('afterend', t);
    const c = document.createElement('button'); c.type = 'button'; c.id = 'ustCikis'; c.className = 'ust-cikis'; c.title = 'Oturumu kapat';
    c.innerHTML = CIKIS + '<span>Oturumu kapat</span>'; c.onclick = () => alt && alt.click();
    t.insertAdjacentElement('afterend', c);
    if (alt) alt.innerHTML = CIKIS + 'Oturumu kapat';
  }
  // bayi portalı: başlıkta tema düğmesi
  const hc = $1('#hCikis');
  if (hc && !$1('header .tema-btn')) { const f = $1('.h-firma'); (f || hc).insertAdjacentElement('beforebegin', dugme('h-btn')); }
  ciz();
  // bayi portalı: kategori şeridi başlığın hemen altında sabit kalsın
  const hd = $1('#uyg>header');
  if (hd) {
    const ayarla = () => { const h = hd.offsetHeight; if (h) H.style.setProperty('--hdrH', h + 'px'); };
    ayarla(); try { new ResizeObserver(ayarla).observe(hd); } catch (e) {} addEventListener('resize', ayarla);
  }
})();
