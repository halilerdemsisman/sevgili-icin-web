/* Faz 2 · adres (URL) tabanlı sayfa geçişi (A4). Yalnız web sitesine girer.
   Her sayfanın kendi adresi var; geri/ileri tuşu, yer imi ve bağlantı paylaşımı çalışır:
     /katalog  /katalog/<kategori>  /urun/<id>-<ad>  /sepet
     /siparisler  /siparisler/<sipariş no>  /cari  /belgeler  /odeme  /ozel-teklif  /projeler
   Mevcut sayfa geçişi (git) ve ürün penceresi (urunAc) sarılarak adres güncellenir. Sunucu bu
   adreslerin hepsine aynı index.html'i döner (sunucu.js: SITE_ADRESI). */
(function () {
  if (!window.EXIT_WEB || !/^https?:$/.test(location.protocol) || !history.pushState) return;
  const YOL = { katalog: '/katalog', siparisler: '/siparisler', cari: '/cari', belgeler: '/belgeler', odeme: '/odeme', teklifler: '/ozel-teklif', projeler: '/projeler' };
  const SAYFA = Object.fromEntries(Object.entries(YOL).map(([s, y]) => [y, s]));
  const BASLIK = { katalog: 'Katalog', siparisler: 'Siparişlerim', cari: 'Cari hesabım', belgeler: 'Belgeler', odeme: 'Ödeme bildirimi', teklifler: 'Özel teklif', projeler: 'Projeler' };
  const kisa = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const kategoriler = () => [...new Set(VERI.urunler.map(u => u.kategori))];

  let sessiz = 0;          // adresten gelen gezinmede yeni geçmiş kaydı açma
  let sayfa = 'katalog';   // açık sayfa
  const adresYaz = (yol, durum, degistir) => {
    if (sessiz) return;
    if (location.pathname === yol && !durum) return;
    history[degistir ? 'replaceState' : 'pushState'](durum || { s: sayfa }, '', yol);
  };
  const baslikYaz = ek => { document.title = (ek ? ek + ' · ' : '') + 'EXIT Garden Bayi'; };

  // ---- sayfa geçişi
  const _git = git;
  git = function (s) {
    const r = _git.apply(this, arguments);
    if (YOL[s]) {
      sayfa = s;
      const yol = s === 'katalog' && F.kat ? YOL.katalog + '/' + kisa(F.kat) : YOL[s];
      adresYaz(yol);
      baslikYaz(BASLIK[s]);
    }
    return r;
  };
  // katalogda kategori değişince adres de değişsin (geçmişe yeni kayıt açmadan)
  const _katalog = katalog;
  katalog = function () {
    const r = _katalog.apply(this, arguments);
    if (sayfa === 'katalog' && !sessiz && /^\/katalog(\/|$)/.test(location.pathname)) {
      const yol = YOL.katalog + (F.kat ? '/' + kisa(F.kat) : '');
      if (location.pathname !== yol) history.replaceState({ s: 'katalog' }, '', yol);
      baslikYaz(F.kat || BASLIK.katalog);
    }
    return r;
  };

  // ---- ürün penceresi: /urun/21-neo; pencere kapanınca önceki adrese dönülür
  const _urunAc = urunAc;
  urunAc = function (id) {
    const once = new Set($$('.perde'));
    const r = _urunAc.apply(this, arguments);
    const u = VERI.urunler.find(x => x.id === id), p = $$('.perde').find(x => !once.has(x));
    if (u && p) {
      p.dataset.adres = 'urun';
      if (!sessiz) history.pushState({ s: sayfa, urun: id }, '', '/urun/' + id + '-' + kisa(u.ad));
      baslikYaz(u.ad);
    }
    return r;
  };
  // sepet penceresi: /sepet
  const hs = $('#hSepet');
  if (hs) hs.addEventListener('click', () => setTimeout(() => {
    const p = $$('.perde').pop(); if (!p || p.dataset.adres) return;
    p.dataset.adres = 'sepet';
    if (!sessiz && location.pathname !== '/sepet') history.pushState({ s: sayfa, sepet: 1 }, '', '/sepet');
    baslikYaz('Sepet');
  }, 0));
  // adresli pencere kullanıcı tarafından kapatılınca (×, dışına tıklama, sepete ekleme) geçmişte bir geri git
  let geriBekleniyor = false;
  new MutationObserver(K => {
    if (sessiz) return;
    for (const k of K) for (const n of k.removedNodes) {
      if (n.nodeType === 1 && n.classList.contains('perde') && n.dataset.adres && history.state && (history.state.urun || history.state.sepet)) {
        // aynı anda başka bir adresli pencere açıldıysa (sepetten ürüne geçiş gibi) geri gitme
        if ($$('.perde').some(x => x.dataset.adres)) continue;
        geriBekleniyor = true; history.back(); return;
      }
    }
  }).observe(document.body, { childList: true });

  // ---- adresi aç (ilk yükleme, geri/ileri)
  function adresiAc(yol, degistir) {
    if (!ben) return;
    sessiz++;
    try {
      // açık pencereleri kapat (geri tuşu ürün penceresini kapatır)
      $$('.perde').forEach(p => { p.dataset.adres = ''; p.remove(); });
      if (window.EXIT_MENU) EXIT_MENU.kapat();
      let m;
      if ((m = yol.match(/^\/urun\/(\d+)/))) {
        const id = +m[1];
        git((history.state && history.state.s) || sayfa);
        if (VERI.urunler.some(u => u.id === id)) urunAc(id); else { git('katalog'); toast('Ürün bulunamadı.'); }
      } else if (yol === '/sepet') {
        git((history.state && history.state.s) || sayfa); const h = $('#hSepet'); h && h.click();
      } else if ((m = yol.match(/^\/katalog\/([^/]+)$/))) {
        const k = kategoriler().find(x => kisa(x) === m[1]);
        F.kat = k || ''; F.sinif.clear(); git('katalog');
      } else if ((m = yol.match(/^\/siparisler\/([^/]+)$/))) {
        git('siparisler'); siparisGoster(decodeURIComponent(m[1]));
      } else if (SAYFA[yol]) {
        if (yol === '/katalog' && F.kat) { F.kat = ''; F.sinif.clear(); }
        git(SAYFA[yol]);
      } else {
        git('katalog'); yol = YOL.katalog;
      }
    } finally { sessiz--; }
    // ilk açılışta adres tam karşılığına çevrilir (ör. / → /katalog); geçmişe kayıt eklenmez
    if (degistir) {
      const durum = { s: sayfa };
      if (/^\/urun\//.test(yol)) { durum.urun = +yol.split('/')[2].split('-')[0]; }
      if (yol === '/sepet') durum.sepet = 1;
      const hedef = /^\/(urun|sepet|siparisler\/)/.test(yol) ? location.pathname : sayfa === 'katalog' ? YOL.katalog + (F.kat ? '/' + kisa(F.kat) : '') : YOL[sayfa];
      history.replaceState(durum, '', hedef + location.search);
      // ürün/sepet bağlantısıyla açıldıysa kapatınca dönülecek bir önceki kayıt olsun
      if (durum.urun || durum.sepet) { history.replaceState({ s: sayfa }, '', sayfa === 'katalog' ? YOL.katalog : YOL[sayfa]); history.pushState(durum, '', hedef); }
    }
  }
  // /siparisler/EXG-2026-0001: sipariş kartını bul, görünür yap ve vurgula
  function siparisGoster(no, deneme = 0) {
    const kart = $$('#s-siparisler .sk, #s-siparisler tr').find(e => { const b = e.querySelector('b'); return b && b.textContent.trim() === no; });
    if (!kart) { if (deneme < 10) return setTimeout(() => siparisGoster(no, deneme + 1), 150); return toast(no + ' bulunamadı.'); }
    kart.classList.add('adres-vurgu'); kart.scrollIntoView({ block: 'center' });
    setTimeout(() => kart.classList.remove('adres-vurgu'), 2600);
    baslikYaz(no);
  }

  addEventListener('popstate', () => {
    if (geriBekleniyor) { geriBekleniyor = false; const s = history.state && history.state.s; if (s && s !== sayfa) adresiAc(location.pathname); else baslikYaz(BASLIK[sayfa]); return; }
    adresiAc(location.pathname);
  });

  // ---- girişten sonra istenen adrese git (giriş ekranından önce açılan bağlantı kaybolmasın)
  const _girisYap = girisYap;
  girisYap = function () { const r = _girisYap.apply(this, arguments); adresiAc(location.pathname, true); return r; };
  if (ben) adresiAc(location.pathname, true);

  // sipariş kartı vurgusu
  const st = document.createElement('style');
  st.textContent = '.adres-vurgu{outline:3px solid var(--marka);outline-offset:3px;border-radius:12px;transition:outline-color .6s}';
  document.head.append(st);
})();
