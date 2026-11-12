/* Faz 2 · yeni menü düzeni (A1). Yalnız web sitesine girer.
   - Bilgisayar: üst çubukta 5 ana öğe (Katalog, Siparişlerim, Cari hesabım, Belgeler, Özel teklif),
     sağda bildirim, sepet ve firma adı. Firma adına tıklayınca kullanıcı menüsü açılır: Projeler,
     Hatırlatmalar, Ödeme bildirimi, dil, tema, şifre, çıkış.
   - Telefon/tablet (≤ 900 px): altta sabit sekme çubuğu (Katalog, Siparişler, Sepet, Cari, Daha fazla);
     "Daha fazla" aynı menüyü alttan açılan bir panel olarak gösterir.
   Mevcut düğmeler yeniden yazılmaz, yalnız yerleri değişir: olayları ve rozetleri (sayaçları) aynen çalışır. */
(function () {
  if (!window.EXIT_WEB) return;
  const sag = $('.h-sag'), firma = $('.h-firma'); if (!sag || !firma) return;
  const svg = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${d}</svg>`;
  const IK = {
    katalog: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    siparisler: '<path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01"/>',
    cari: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    sepet: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
    fazla: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    belgeler: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    teklifler: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><circle cx="17" cy="14" r="1.5"/>',
    odeme: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h3"/>',
    sifre: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    ok: '<path d="m6 9 6 6 6-6"/>',
  };
  const btn = (cls, ic, ad, git) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; if (git) b.dataset.git = git; b.innerHTML = svg(IK[ic]) + `<span class="y">${ad}</span>`; return b; };

  // ---- kullanıcı menüsü (bilgisayarda açılır liste, telefonda alttan panel)
  const menu = document.createElement('div'); menu.id = 'hMenu'; menu.className = 'h-menu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
  const baslik = document.createElement('div'); baslik.className = 'hm-baslik'; menu.append(baslik);
  const mobilGrup = document.createElement('div'); mobilGrup.className = 'hm-grup yalniz-mobil';
  mobilGrup.append(btn('h-btn', 'belgeler', 'Belgeler', 'belgeler'), btn('h-btn', 'teklifler', 'Özel teklif', 'teklifler'));
  const grup = document.createElement('div'); grup.className = 'hm-grup';
  const ayar = document.createElement('div'); ayar.className = 'hm-grup';
  menu.append(mobilGrup, grup, ayar);
  const tasi = (sec, hedef) => { const e = typeof sec === 'string' ? sag.querySelector(sec) : sec; if (e) hedef.append(e); return e; };
  tasi('[data-git=projeler]', grup); tasi('#hHat', grup);
  grup.append(btn('h-btn', 'odeme', 'Ödeme bildirimi', 'odeme'));
  tasi('.dil-btn', ayar); tasi('.tema-btn', ayar);
  const sifre = btn('h-btn', 'sifre', 'Şifremi değiştir'); sifre.onclick = () => { kapat(); window.EXIT_SIFRE_DEGISTIR && EXIT_SIFRE_DEGISTIR(false); };
  ayar.append(sifre); tasi('#hCikis', ayar);
  // eklenen git düğmeleri
  menu.querySelectorAll('[data-git]').forEach(b => { if (!b.onclick) b.onclick = () => { kapat(); git(b.dataset.git); }; else { const e = b.onclick; b.onclick = ev => { kapat(); e.call(b, ev); }; } });
  menu.querySelectorAll('#hHat, .dil-btn').forEach(b => b.addEventListener('click', () => kapat()));

  // firma adı: menüyü açar (önceden şifre değiştirmeyi açıyordu; o artık menüde)
  firma.setAttribute('role', 'button'); firma.tabIndex = 0; firma.title = 'Hesap menüsü'; firma.setAttribute('aria-haspopup', 'menu'); firma.setAttribute('aria-expanded', 'false');
  firma.insertAdjacentHTML('beforeend', `<span class="hm-ok">${svg(IK.ok)}</span>`);
  const sar = document.createElement('div'); sar.className = 'hm-sar'; firma.replaceWith(sar); sar.append(firma, menu);
  // sağdaki sıralama: ana öğeler, bildirim, sepet, hesap
  const sira = ['[data-git=katalog]', '[data-git=siparisler]', '[data-git=cari]', '[data-git=belgeler]', '[data-git=teklifler]', '#hBildirim', '#hSepet'];
  const sirala = () => { sira.forEach(s => { const e = sag.querySelector(':scope > ' + s); if (e) sag.append(e); }); sag.append(sar); };
  sirala();
  sag.querySelectorAll(':scope > [data-git=belgeler], :scope > [data-git=teklifler]').forEach(e => e.classList.add('yalniz-masa'));

  const perde = document.createElement('div'); perde.className = 'hm-perde'; perde.hidden = true; document.body.append(perde);
  function ac() {
    baslik.innerHTML = `<b>${esc(ben ? ben.firma || ben.ad || '' : '')}</b><span>${esc(ben ? ben.kul : '')}</span>`;
    menu.hidden = false; perde.hidden = false; firma.setAttribute('aria-expanded', 'true'); document.body.classList.add('hm-acik');
    const ilk = menu.querySelector('button'); ilk && ilk.focus({ preventScroll: true });
  }
  function kapat() { menu.hidden = true; perde.hidden = true; firma.setAttribute('aria-expanded', 'false'); document.body.classList.remove('hm-acik'); }
  window.EXIT_MENU = { ac, kapat };
  const degistir = () => (menu.hidden ? ac() : kapat());
  firma.onclick = e => { e.stopPropagation(); degistir(); };
  firma.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); degistir(); } };
  perde.onclick = kapat;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { kapat(); firma.focus(); } });
  document.addEventListener('click', e => { if (!menu.hidden && !sar.contains(e.target) && !alt.contains(e.target)) kapat(); });

  // ---- telefon: alt sekme çubuğu
  const alt = document.createElement('nav'); alt.className = 'alt-sekme'; alt.setAttribute('aria-label', 'Ana menü');
  const aK = btn('as-btn', 'katalog', 'Katalog', 'katalog'), aS = btn('as-btn', 'siparisler', 'Siparişler', 'siparisler'),
    aSp = btn('as-btn', 'sepet', 'Sepet'), aC = btn('as-btn', 'cari', 'Cari', 'cari'), aF = btn('as-btn', 'fazla', 'Daha fazla');
  [aK, aS, aC].forEach(b => b.onclick = () => { kapat(); git(b.dataset.git); });
  aSp.onclick = () => { kapat(); const h = $('#hSepet'); h && h.click(); };
  aF.onclick = e => { e.stopPropagation(); degistir(); };
  alt.append(aK, aS, aSp, aC, aF); document.body.append(alt);
  // rozetler (sipariş ve sepet sayısı) üst çubuktakilerle aynı kalsın
  const rozetKopya = (kaynak, hedef) => {
    const yaz = () => { const k = $(kaynak); let r = hedef.querySelector('.rozet'); if (!r) { r = document.createElement('span'); r.className = 'rozet'; hedef.append(r); }
      const n = k ? k.textContent.trim() : ''; r.textContent = n; r.classList.toggle('gizli', !k || k.classList.contains('gizli') || !n || n === '0'); };
    yaz(); new MutationObserver(yaz).observe(sag, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  };
  rozetKopya('[data-git=siparisler] .rozet', aS); rozetKopya('#hSepet .rozet', aSp);
  // menüdeki bir öğede bekleyen iş varsa (ör. hatırlatma) hesap düğmesinde nokta
  const nokta = () => { const v = [...menu.querySelectorAll('.rozet')].some(r => !r.classList.contains('gizli') && r.textContent.trim() && r.textContent.trim() !== '0'); sar.classList.toggle('hm-nokta', v); aF.classList.toggle('hm-nokta', v); };
  nokta(); new MutationObserver(nokta).observe(menu, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });

  // sonradan eklenen üst çubuk düğmeleri (eklentiler #hSepet'in önüne ekler) sıraya girsin
  new MutationObserver(() => { if (sag.lastElementChild !== sar) sirala(); }).observe(sag, { childList: true });

  if (window.dilEkle) window.dilEkle({ 'Daha fazla': 'More', 'Siparişler': 'Orders', 'Cari': 'Account', 'Ödeme bildirimi': 'Payment notice', 'Şifremi değiştir': 'Change password', 'Hesap menüsü': 'Account menu', 'Ana menü': 'Main menu' });
})();

/* alt bilgideki "Bayi" sütunu: düz yazı yerine çalışan bağlantılar */
(function () {
  if (!window.EXIT_WEB) return;
  const H = { 'Katalog': ['/katalog', 'katalog'], 'Siparişlerim': ['/siparisler', 'siparisler'], 'Cari hesabım': ['/cari', 'cari'] };
  $$('.altbilgi h4').filter(h => h.textContent.trim() === 'Bayi').forEach(h => [...h.parentElement.querySelectorAll('p')].forEach(p => {
    const ad = p.textContent.trim(), a = document.createElement('a'); a.className = 'ab-git'; a.textContent = ad;
    if (H[ad]) { a.href = H[ad][0]; a.onclick = e => { e.preventDefault(); git(H[ad][1]); }; }
    else if (ad === 'Sepet') { a.href = '/sepet'; a.onclick = e => { e.preventDefault(); const s = $('#hSepet'); s && s.click(); }; }
    else return;
    p.textContent = ''; p.append(a);
  }));
})();
