
(function () {
  // Çeviriler kaynak/bayi/dil/en.json dosyasındadır (derlemede gömülür). Türkçe metin anahtardır; burada yalnız
  // çeviri motoru ve kurallı (çoğul, tarih, liste) çeviriler bulunur.
  const EN = /*@json bayi/dil/en.json*/null;
  const { ay: AY, gun: GUN, renk: RENK, kategori: KAT, eksik: EKSIK } = EN;
  const SOZ = Object.assign({}, KAT, RENK, EN.metin);
  const liste = s => s.split(', ').map(x => EKSIK[x] || x).join(', ');
  const renk = s => s.replace(/^(\S+)(?=\s*(\(|·|$))/, m => RENK[m] || m);
  const tarihUzun = s => s.replace(/(\d{1,2}) (\S+) (\d{4})(?: (\S+))?/, (m, d, a, y, g) => AY[a] ? (g && GUN[g] ? GUN[g] + ', ' : '') + d + ' ' + AY[a] + ' ' + y : m);
  // dilbilgisi: çevirisi kurala bağlı desenler (en.json'da {kod: ad} ile anılır)
  const KOD = {
    urunSayisi: (m, n) => n + (n === '1' ? ' product' : ' products'),
    secenekSayisi: (m, n) => n + (n === '1' ? ' option' : ' options'),
    tarih: m => tarihUzun(m),
    adetKalem: (m, t, a, k) => `${t} · ${a} pcs · ${k} ${k === '1' ? 'line' : 'lines'}`,
    eksikSecim: (m, l) => 'Missing selection: ' + liste(l),
    eksik: (m, l) => 'Missing: ' + liste(l),
    eksikRenk: (m, l) => 'Missing or invalid colour: ' + liste(l),
    sepeteEklendi: (m, a) => /^\d+ kalem$/.test(a) ? a.replace(' kalem', ' items') + ' added to cart.' : a + ' added to cart.',
    alanAdi: (m, e, v) => ({ 'İskelet': 'Frame', 'File': 'Mesh', 'Kumaş': 'Fabric', 'Fitil': 'Piping', 'Not': 'Note', 'Adres/not': 'Address/note' }[e]) + ': ' + (e === 'İskelet' || e === 'File' ? renk(v) : v),
    renkAdi: (m, r, k) => RENK[r] + ' · ' + k,
    kadar: (m, o, t) => (o ? cevirParca(o) : '') + 'until ' + t,
    gecerli: (m, o, t) => (o ? cevirParca(o) : '') + 'valid until ' + t,
    secenekListesi: (m, n, l) => `Available in ${n} options: ${kelime(kelime(l, SECK), SEC)}.`,
    olculer: (m, l) => `Dimensions: ${kelime(l, SEC).replace(/Ø/g, 'Ø')} (cm).`,
    tabla: (m, l) => `Top options: ${l.replace('Sinterize', 'Sintered')}.`,
    duyuruSayisi: (m, a, n) => (a === 'Duyurular' ? 'Announcements' : 'All announcements') + ' (' + n + ')',
    duyuruTuru: (m, a, t) => ({ 'Duyuru': 'Notice', 'Yeni ürün': 'New product', 'Fiyat': 'Price', 'Kampanya': 'Promotion' }[a]) + ' · ' + t,
    setEksik: (m, a) => 'Missing: ' + a.replace('iskelet rengi', 'frame colour').replace('file rengi', 'mesh colour').replace('kumaş', 'fabric').replace('fitil rengi', 'piping colour').replace('ürün', 'product'),
    setParca: (m, n, r) => `${n} pieces · USD excl. VAT${r ? ' · a quote will be prepared for items without a price' : ''}`,
  };
  const desen = L => L.map(([k, b, t]) => [new RegExp(k, b), typeof t === 'string' ? t : KOD[t.kod]]);
  const DESEN = desen(EN.desen);
  const PARCA = EN.parca.map(([k, b, t]) => [new RegExp(k, b), t]);
  const cevirParca = s => PARCA.reduce((a, [r, t]) => a.replace(r, t), s);

  // ürün verisinden: seçenekler, açıklamalar, teknik bilgiler
  const SEC = EN.secenek, SECK = EN.secenekKucuk, TEK = EN.teknik, ACK = desen(EN.aciklama);
  const kelime = (s, L) => L.reduce((a, [t, e]) => a.replace(new RegExp('(?<![\\p{L}])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'gu'), e), s);
  const tekCevir = s => kelime(s.replace(/(\d+)'(?:li|lı|lü|lu) paket/g, 'pack of $1').replace(/%\s?(\d+)/g, '$1%'), TEK);
  const ackCevir = s => s.split(/(?<=\.)\s+/).map(c => { for (const [r, t] of ACK) if (r.test(c)) return c.replace(r, t); return c; }).join(' ');
  try {
    VERI.urunler.forEach(u => {
      u.secenek.forEach(s => { if (s.ad && !SOZ[s.ad]) SOZ[s.ad] = kelime(s.ad, SEC); if (s.sinif && !SOZ[s.sinif]) SOZ[s.sinif] = kelime(s.sinif, SEC); });
      if (u.aciklama) SOZ[u.aciklama] = ackCevir(u.aciklama);
      const t = u.teknik; if (t) { (t.malzeme || []).forEach(m => SOZ[m] = tekCevir(m)); (t.tablolar || []).forEach(tb => { tb.basliklar.forEach(h => h && (SOZ[h] = tekCevir(h))); tb.satirlar.forEach(r => r.forEach(c => { if (/[A-ZÇĞİÖŞÜ]{3}/.test(c)) SOZ[c] = tekCevir(c); })); }); }
    });
  } catch (e) {}

  // özelliklerin sözlükleri (yükleme sırasıyla; sonra gelenin deseni öne geçer) ve web sitesine özel metinler
  function dilEkle(o, d) { Object.assign(SOZ, o || {}); if (d) DESEN.unshift(...d); }
  EN.ekler.forEach(e => dilEkle(e.metin, desen(e.desen)));
  if (window.EXIT_WEB) dilEkle(EN.web.metin);

  function cevir(s) {
    const t = s.trim(); if (!t || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(t)) return null;
    let r = SOZ[t];
    if (r == null) for (const [re, f] of DESEN) if (re.test(t)) { r = t.replace(re, f); break; }
    if (r == null) { const p = cevirParca(t); if (p !== t) r = p; }
    if (r == null || r === t) return null;
    return s.replace(t, () => r);
  }
  let DIL = 'tr'; try { DIL = localStorage.getItem('exb-dil') === 'en' ? 'en' : 'tr'; } catch (e) {}
  const ORJ = new WeakMap(), ATR = ['placeholder', 'title', 'aria-label'];
  function dugum(n) {
    const kayit = ORJ.get(n);
    if (kayit && n.nodeValue === kayit.e) return;            // zaten çevrildi
    const o = n.nodeValue, e = cevir(o);
    if (e == null) { if (kayit) ORJ.delete(n); return; }
    const pa = n.parentNode; if (pa && pa.nodeName === 'OPTION' && !pa.hasAttribute('value')) pa.setAttribute('value', o.trim());
    ORJ.set(n, { o, e }); n.nodeValue = e;
  }
  function oge(el) {
    let k = ORJ.get(el); if (!k) { k = {}; ORJ.set(el, k); }
    ATR.forEach(a => { const v = el.getAttribute(a); if (v == null) return; if (k[a] && v === k[a].e) return; const e = cevir(v); if (e != null) { k[a] = { o: v, e }; el.setAttribute(a, e); } else delete k[a]; });
  }
  function agac(kok) {
    if (!kok) return; if (kok.nodeType === 3) return dugum(kok);
    if (kok.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(kok.nodeName)) return;
    const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT, { acceptNode: n => /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) ? 2 : 1 }); let n; while ((n = w.nextNode())) dugum(n);
    if (kok.hasAttribute && ATR.some(a => kok.hasAttribute(a))) oge(kok);
    kok.querySelectorAll('[placeholder],[title],[aria-label]').forEach(oge);
  }
  function geriAl(kok) {
    const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const k = ORJ.get(n); if (k && n.nodeValue === k.e) n.nodeValue = k.o; ORJ.delete(n); }
    kok.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => { const k = ORJ.get(el); if (!k) return; ATR.forEach(a => { if (k[a] && el.getAttribute(a) === k[a].e) el.setAttribute(a, k[a].o); }); ORJ.delete(el); });
  }
  const BASLIK = document.title;
  const gozlem = new MutationObserver(L => {
    if (DIL !== 'en') return;
    L.forEach(m => { if (m.type === 'characterData') dugum(m.target); else if (m.type === 'attributes') oge(m.target); else m.addedNodes.forEach(agac); });
  });
  gozlem.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATR });
  const KURE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>';
  function dugmeCiz() { document.querySelectorAll('.dil-btn').forEach(b => { b.innerHTML = KURE + '<span>' + (DIL === 'en' ? 'EN' : 'TR') + '</span>'; b.title = DIL === 'en' ? 'Türkçe’ye geç' : 'Switch to English'; b.setAttribute('aria-label', b.title); }); }
  function uygula() {
    document.documentElement.lang = DIL; document.title = DIL === 'en' ? 'EXIT Garden · Dealer Orders' : BASLIK;
    if (DIL === 'en') agac(document.body); else geriAl(document.body);
    dugmeCiz();
  }
  window.dilDegistir = d => { DIL = d || (DIL === 'en' ? 'tr' : 'en'); try { localStorage.setItem('exb-dil', DIL); } catch (e) {} gozlem.takeRecords(); uygula(); gozlem.takeRecords(); };
  window.cevirEN = s => DIL === 'en' ? (cevir(s) ?? s) : s;
  window.dilEkle = dilEkle;
  window.dilAktif = () => DIL;
  const dugme = cls => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dil-btn ' + cls; b.onclick = () => window.dilDegistir(); return b; };
  const g = document.getElementById('giris'); if (g && !g.querySelector('.dil-btn')) g.appendChild(dugme('g-dil'));
  const tb = document.querySelector('header .tema-btn'); if (tb && !document.querySelector('header .dil-btn')) tb.insertAdjacentElement('beforebegin', dugme('h-btn'));
  dugmeCiz(); if (DIL === 'en') uygula();
  // yazdırılabilir katalog da seçili dilde açılsın
  EK.katalogIndirDil = function (w) {
    if (w && DIL === 'en') try { agac(w.document.body); w.document.title = 'EXIT Garden Catalogue ' + new Date().getFullYear(); } catch (e) {}
  };
})();
