// Faz 3: satış masaüstü uygulaması ile tarayıcıda ortak eklemeler.
//   • Durum çubuğu (A3): sunucu bağlantı rozeti menünün altındaki sabit çubuğa taşınır, menüdeki düğmelerin üstüne binmez.
//   • Hızlı arama: Ctrl+K ile sipariş no, firma, bayi kullanıcı adı ya da yetkili adına göre arama; Enter ile açılır.
// Yalnız masaüstü uygulamasında (window.exitMasaustu, Electron önyüklemesi):
//   • Bekleyen işler (yeni sipariş talebi, değişiklik/iptal talebi, ödeme bildirimi, iade, numune, özel teklif):
//     sayısı görev çubuğunda gösterilir, yeni gelen her iş için sistem bildirimi çıkar; bildirime tıklayınca ilgili kayıt açılır.
//   • Ctrl+1..9 menüdeki sayfalara geçer; sipariş penceresinde "Ayrı pencerede aç".
//   • Adres ?ac=siparis:EXG-2026-0012 | musteri:kul | git:odemeler ile açılan pencere o kaydı gösterir.
(function () {
  const M = window.exitMasaustu;
  if (M) document.documentElement.classList.add('masaustu');

  // ---------- durum çubuğu ----------
  const cubuk = () => { const a = document.getElementById('menu'); if (!a) return null; let c = a.querySelector('.durum-cubugu'); if (!c) { c = document.createElement('div'); c.className = 'durum-cubugu'; a.appendChild(c); } return c; };
  // giriş ekranında (menü gizliyken) rozet sayfanın köşesinde kalır; giriş yapılınca çubuğa taşınır
  const rozetTasi = () => { const u = document.getElementById('uyg'), r = document.getElementById('sunucuDurum'); if (!r || !u || u.classList.contains('gizli')) return;
    const c = cubuk(); if (!c || r.parentNode === c) return; c.prepend(r); r.removeAttribute('style'); };
  new MutationObserver(rozetTasi).observe(document.body, { childList: true });
  if (document.getElementById('uyg')) new MutationObserver(rozetTasi).observe(document.getElementById('uyg'), { attributes: true, attributeFilter: ['class'] });
  rozetTasi();
  // tarayıcıda: sunucuda masaüstü uygulaması yüklüyse indirme bağlantısı
  if (!M && window.EXIT_SUNUCU) fetch('masaustu/guncelleme/latest.yml', { method: 'HEAD', cache: 'no-store' }).then(r => { const c = cubuk(); if (r.ok && c && !c.querySelector('.ds-indir')) c.insertAdjacentHTML('beforeend', '<a class="ds-indir" href="/masaustu/indir" title="Windows için EXIT Satış uygulamasını indir">Masaüstü uygulaması</a>'); }).catch(() => {});
  if (M) M.bilgi().then(b => { const c = cubuk(); if (c && !c.querySelector('.ds-surum')) c.insertAdjacentHTML('beforeend', `<span class="ds-surum">Masaüstü ${String(b.surum).replace(/[^\w.-]/g, '')}</span>`); }).catch(() => {});

  // ---------- hedef açma (bildirim, ayrı pencere, hızlı arama) ----------
  function ac(hedef) {
    const m = String(hedef || '').match(/^(siparis|musteri|git):(.+)$/); if (!m || !ben) return false;
    const [, tur, id] = m;
    if (tur === 'siparis') {
      if (!SIP[id] && typeof birlestir === 'function') { try { birlestir(); } catch (e) {} }
      git('siparisler'); if (!SIP[id]) { toast(id + ' bulunamadı.'); return true; }
      $$('.perde').forEach(p => p.remove()); siparisAc(id); return true;
    }
    if (tur === 'musteri') { git('musteriler'); if (MUS[id] && typeof musteriKarti === 'function') { $$('.perde').forEach(p => p.remove()); musteriKarti(id); } return true; }
    if ($(`aside button.m[data-s="${id.replace(/[^\w-]/g, '')}"]`)) { $$('.perde').forEach(p => p.remove()); git(id); }
    return true;
  }
  window.EXIT_AC = ac;
  // ?ac=… : giriş yapılınca bir kez
  const ilk = new URLSearchParams(location.search).get('ac');
  if (ilk) { const t = setInterval(() => { if (ben && !$('#uyg').classList.contains('gizli')) { clearInterval(t); setTimeout(() => ac(ilk), 50); } }, 200); }

  // ---------- hızlı arama ----------
  const kucuk = s => String(s || '').toLocaleLowerCase('tr');
  function aramaAc() {
    if (!ben || $('#haPerde')) return;
    const p = document.createElement('div'); p.id = 'haPerde'; p.className = 'ha-perde';
    p.innerHTML = `<div class="ha-kutu" role="dialog" aria-label="Hızlı arama"><input id="haGir" placeholder="Sipariş no, firma, bayi veya yetkili ara…" autocomplete="off" spellcheck="false"><div class="ha-liste" id="haListe" role="listbox"></div><div class="ha-ipucu">↑ ↓ seç · Enter aç · Esc kapat</div></div>`;
    document.body.appendChild(p);
    const gir = p.querySelector('#haGir'), liste = p.querySelector('#haListe'); let S = [], sec = 0;
    const kapat = () => p.remove();
    const ciz = () => {
      const q = kucuk(gir.value).trim();
      const sip = Object.values(SIP).filter(o => !q || kucuk(o.no + ' ' + o.firma + ' ' + o.ad + ' ' + o.kul).includes(q)).sort((a, b) => (b.tarih || 0) - (a.tarih || 0)).slice(0, q ? 8 : 5)
        .map(o => ({ hedef: 'siparis:' + o.no, ust: o.no, alt: `${o.firma || o.kul} · ${(DURUM[o.durum] || [o.durum])[0]} · ${tarih(o.tarih)}` }));
      const mus = Object.values(MUS).filter(m => q && kucuk(m.kul + ' ' + m.firma + ' ' + m.ad + ' ' + (m.sehir || '')).includes(q)).slice(0, 6)
        .map(m => ({ hedef: 'musteri:' + m.kul, ust: m.firma || m.kul, alt: `Bayi · ${m.kul}${m.sehir ? ' · ' + m.sehir : ''}` }));
      S = [...sip, ...mus]; sec = Math.min(sec, Math.max(0, S.length - 1));
      liste.innerHTML = S.length ? S.map((x, i) => `<div class="ha-sonuc${i === sec ? ' on' : ''}" role="option" data-i="${i}"><b>${esc(x.ust)}</b><span>${esc(x.alt)}</span></div>`).join('') : '<div class="ha-bos">Sonuç yok</div>';
      liste.querySelectorAll('[data-i]').forEach(d => { d.onclick = () => { kapat(); ac(S[+d.dataset.i].hedef); }; });
    };
    gir.oninput = () => { sec = 0; ciz(); };
    gir.onkeydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); kapat(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sec = Math.min(S.length - 1, sec + 1); ciz(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sec = Math.max(0, sec - 1); ciz(); }
      else if (e.key === 'Enter') { e.preventDefault(); const x = S[sec]; if (x) { kapat(); ac(x.hedef); } }
    };
    p.onclick = e => { if (e.target === p) kapat(); };
    ciz(); gir.focus();
  }
  window.EXIT_HIZLI_ARA = aramaAc;
  const menuyeGit = i => { if (!ben) return; const b = $$('aside button.m[data-s]').filter(x => x.offsetParent !== null)[i - 1]; if (b) { $$('.perde').forEach(p => p.remove()); b.click(); } };
  // Kısayolları önce sayfa işler (preventDefault): masaüstünde menüdeki aynı kısayol ancak sayfa işlemezse çalışır;
  // menüden fareyle seçilince aşağıdaki kisayol dinleyicisi devreye girer. Ctrl+1..9 tarayıcıda sekme değiştirir; yalnız masaüstünde.
  addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    if (e.key.toLowerCase() === 'k') { e.preventDefault(); aramaAc(); }
    else if (M && /^[1-9]$/.test(e.key)) { e.preventDefault(); menuyeGit(+e.key); }
  });
  if (!M) return;

  // ---------- masaüstü: menü kısayolları ----------
  M.kisayol((k, i) => { if (k === 'ara') aramaAc(); else if (k === 'git') menuyeGit(i); });
  M.acildiginda(h => ac(h));

  // ---------- masaüstü: sipariş penceresinde "Ayrı pencerede aç" ----------
  const NO = /^[A-Z]+-\d{4}-\d+/;
  const ayriDugme = p => { const h = p.querySelector('.pencere > h2'); if (!h || p.querySelector('.ayri-pencere')) return; const no = (h.textContent.match(NO) || [])[0]; if (!no || !SIP[no]) return;
    h.insertAdjacentHTML('afterend', `<button class="btn cizgi ayri-pencere" type="button" title="Bu siparişi ayrı bir pencerede açar">Ayrı pencerede aç</button>`);
    p.querySelector('.ayri-pencere').onclick = () => { M.pencere('siparis:' + no); p.remove(); }; };
  new MutationObserver(L => L.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('perde')) { ayriDugme(n); new MutationObserver(() => ayriDugme(n)).observe(n, { childList: true, subtree: true }); } })))
    .observe(document.body, { childList: true });

  // ---------- masaüstü: bekleyen işler, sayaç ve bildirimler ----------
  const L = k => { const x = oku(k, []); return Array.isArray(x) ? x : []; };
  const tutar = n => typeof usd === 'function' ? usd(n || 0) : (n || 0) + ' $';
  function isler() {
    const I = [];
    L('exb-siparisler').forEach(o => {
      if (o.durum === 'yeni') I.push({ k: 'sip:' + o.no, baslik: 'Yeni sipariş talebi', metin: `${o.no} · ${o.firma || o.kul} · ${tutar(o.toplam)}${o.teklif ? ' + teklif' : ''}`, hedef: 'siparis:' + o.no });
      if (o.talep && o.talep.durum === 'bekliyor') I.push({ k: 'tlp:' + o.no + ':' + o.talep.id, baslik: o.talep.tur === 'iptal' ? 'İptal talebi' : 'Değişiklik talebi', metin: `${o.no} · ${o.firma || o.kul}${o.talep.not ? ' · ' + o.talep.not : ''}`, hedef: 'git:talepler' });
    });
    L('exb-odeme').forEach(o => { if (o.durum === 'bekliyor') I.push({ k: 'odm:' + o.no, baslik: o.online ? 'Online ödeme bildirimi' : 'Ödeme bildirimi', metin: `${o.no} · ${o.firma || o.kul} · ${tutar(o.tutar)}`, hedef: 'git:odemeler' }); });
    L('exb-iade').forEach(o => { if (o.durum === 'yeni') I.push({ k: 'iad:' + o.id, baslik: 'İade / şikâyet', metin: `${o.no || ''} · ${o.firma || o.kul} · ${o.tur || ''}`, hedef: 'git:iadeler' }); });
    L('exb-numune').forEach(o => { if (o.durum === 'yeni') I.push({ k: 'nmn:' + o.no, baslik: 'Numune talebi', metin: `${o.no} · ${o.firma || o.kul}`, hedef: 'git:numuneler' }); });
    L('exb-teklif').forEach(o => { if (o.durum === 'bekliyor') I.push({ k: 'otk:' + o.no, baslik: 'Özel teklif talebi', metin: `${o.no} · ${o.firma || o.kul} · ${o.takim || ''} takım`, hedef: 'git:teklifler' }); });
    return I;
  }
  let gorulen = null;
  function denetle() {
    if (!ben) { gorulen = null; M.rozet(0); return; }
    const I = isler(); M.rozet(I.length);
    // açılışta bekleyenler için bildirim çıkmaz; yalnız sonradan gelenler
    if (!gorulen) { gorulen = new Set(I.map(x => x.k)); return; }
    const yeni = I.filter(x => !gorulen.has(x.k)); I.forEach(x => gorulen.add(x.k));
    if (yeni.length > 3) M.bildir({ baslik: `${yeni.length} yeni iş`, metin: yeni.slice(0, 3).map(x => x.baslik + ': ' + x.metin.split(' · ')[0]).join(' · ') + '…', hedef: yeni[0].hedef });
    else yeni.forEach(x => M.bildir(x));
  }
  let z = null; const sirala = () => { clearTimeout(z); z = setTimeout(denetle, 300); };
  addEventListener('exit-degisti', sirala);
  setInterval(denetle, 5000); setTimeout(denetle, 800);

  // ---------- masaüstü: bağlantı yokken gösterilecek son görülen listeler (Faz 3b) ----------
  // Uygulama bunu bilgisayarda şifreli saklar; sunucuya ulaşılamazsa bağlantı hatası sayfası salt okunur gösterir.
  // Temsilci yalnız kendi bayilerini görür (SIP/MUS zaten süzülmüş). Çıkışta silinir.
  if (M.anlik) {
    const net = o => { try { return Math.round(tutarlar(o).net * 100) / 100; } catch (e) { return o.toplam || 0; } };
    const durumAd = d => (typeof DURUM === 'object' && DURUM[d] ? DURUM[d][0] : d) || '';
    function anlik() {
      if (!ben || !window.EXIT_OTURUM) return;
      try {
        // satış listesine henüz alınmamış (portaldan yeni gelen) siparişler ve bayiler de dahil
        const S = { ...Object.fromEntries(L('exb-siparisler').filter(o => o && o.no).map(o => [o.no, o])), ...Object.fromEntries(Object.values(SIP).filter(o => o && o.no).map(o => [o.no, o])) };
        const BK = oku('exb-kullanicilar', {}) || {}, MS = { ...Object.fromEntries(Object.values(BK).filter(u => u && u.kul && u.rol === 'musteri').map(u => [u.kul, u])) };
        Object.values(MUS).forEach(m => { if (m && m.kul) MS[m.kul] = { ...(MS[m.kul] || {}), ...m }; });
        const siparisler = Object.values(S).sort((a, b) => (b.tarih || 0) - (a.tarih || 0)).slice(0, 3000)
          .map(o => ({ no: o.no, firma: o.firma || (MS[o.kul] || {}).firma || o.kul, tarih: o.tarih || null, durum: durumAd(o.durum), adet: (o.kalemler || []).reduce((a, k) => a + (+k.adet || 0), 0), tutar: net(o), termin: o.termin || '' }));
        const bayiler = Object.values(MS).map(m => { let c = {}; try { c = cariOzet(m.kul); } catch (e) {}
          return { firma: m.firma || m.kul, ad: m.ad || '', tel: m.tel || '', mail: m.mail || '', sehir: m.sehir || '', bakiye: Math.round((c.bakiye || 0) * 100) / 100, gecmis: Math.round((c.gecmis || 0) * 100) / 100 }; })
          .sort((a, b) => String(a.firma).localeCompare(String(b.firma), 'tr'));
        M.anlik({ kul: ben.kul, ad: typeof kimAd === 'function' ? kimAd() : ben.kul, zaman: Date.now(), siparisler, bayiler, isler: isler().map(x => ({ baslik: x.baslik, metin: x.metin })) });
      } catch (e) { console.warn('son görülen veriler hazırlanamadı', e); }
    }
    let za = null; addEventListener('exit-degisti', () => { clearTimeout(za); za = setTimeout(anlik, 3000); });
    setInterval(anlik, 60000); setTimeout(anlik, 1500);
    const c = $('#cikis'); if (c) c.addEventListener('click', () => M.anlik(null), true);
  }
})();
