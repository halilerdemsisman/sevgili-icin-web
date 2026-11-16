/* REST veri modülü (iki uygulamada ortak). Faz 2b-2 (adım 2): bayi web sitesi · Faz 3b-2 (adım 4): satış paneli.
   İş verisi REST uçlarından okunur (GET /api/v1/…; docs/API.md):
     • bayi web sitesi: bütün iş verisi (siparişler, cari, fiyatlar ve kampanyalar, ödemeler, teklifler, duyurular,
       mesajlar…). Eşitleme ucu (api/veri) sitede yalnız bayinin kişisel anahtarları (sepet, favori, proje…) için kalır.
     • satış paneli: bayilerin oluşturduğu kayıt listeleri (siparişler, ödeme bildirimleri, iadeler, numuneler, özel
       teklifler, satış mesajları), temsilcinin kapsamındaki bayilerinki. Satışın kendi verisi (fiyat, kampanya, cari,
       müşteri kartları…) ve bütün yazmalar eşitleme ucunda kaldı (kayıt düzeyinde yama, koşullu karar).
   Ekranlar veriyi yine oku('exb-…') ile, bellekteki kopyadan okur; bu modül kopyayı REST yanıtından doldurur
   (EXIT_BELLEK_KOY: yama tabanı da olur). Böylece tek dosyalık (sunucusuz) sürüm aynı ekran koduyla çalışır.
   Güncel tutma: her kaynak imzasıyla (ETag) gelir. Sunucuda bir kaynağı etkileyen veri değişince anlık bildirimin
   ardından gelen /api/degisen yanıtı kaynakların yeni imzasını taşır (senkron.js → 'exit-kaynak' olayı); yalnız
   imzası değişen kaynak yeniden okunur.
   EXIT_VERI.hazir: oturum bilinip (EXIT_HAZIR) ilk yükleme bitince çözülür; uygulamalar oturumu bundan sonra açar
   (bayi: cekirdek/oturum.js kurulum, satış: cekirdek/veri.js veriYukle). Oturum yoksa EXIT_VERI kaldırılır. */
(function () {
  if (!window.EXIT_HAZIR || !window.EXIT_BELLEK_KOY) return;
  const UYG = window.EXIT_UYG;
  if (UYG === 'bayi' && !window.EXIT_WEB) return; // tek dosyalık portal sunucudan açılırsa eşitleme ucuyla okur
  const ADET = 200;
  let kul = null, acik = false;
  const getir = async yol => {
    const r = await fetch('api/v1/' + yol, { cache: 'no-store', headers: { 'X-Exit-Uyg': UYG } });
    if (!r.ok) throw new Error(yol + ': ' + r.status);
    return { j: await r.json(), imza: r.headers.get('ETag') };
  };
  // liste kaynakları sayfa sayfa gelir (en yeni önce); ekranlar eskiden yeniye sıralı liste bekler
  const liste = (yol, alan = 'kayitlar') => async () => {
    let L = [], s = 1, imza = null, toplam = 0;
    do { const x = await getir(`${yol}?adet=${ADET}&sayfa=${s}`); imza = imza || x.imza; toplam = x.j.toplam; L = L.concat(x.j[alan] || []); s++; }
    while (L.length < toplam && s < 1000);
    return { imza, v: L.reverse() };
  };
  const tek = (yol, f) => async () => { const x = await getir(yol); return { imza: x.imza, v: f(x.j) }; };
  // kaynak → [bellekteki anahtar (ekranların okuduğu), okuyucu]
  const LISTELER = {
    siparisler: ['exb-siparisler', liste('siparisler', 'siparisler')],
    odemeler: ['exb-odeme', liste('odemeler')],
    iadeler: ['exb-iade', liste('iadeler')],
    numuneler: ['exb-numune', liste('numuneler')],
    teklifler: ['exb-teklif', liste('teklifler')],
    hatirlatmalar: ['exb-hatirlat', liste('hatirlatmalar')],
  };
  const KAYNAK = UYG === 'satis' ? LISTELER : {
    ben: ['exb-kullanicilar', tek('ben', j => ({ [kul]: { ...j, kul } }))],
    katalog: [null, tek('katalog', j => j)],
    ...LISTELER,
    cari: ['exb-cari', tek('cari?hareket=tum', j => j.tanimli ? { [kul]: { vade: j.vade ?? 60, limit: j.limit, hareket: j.hareketler || [] } } : {})],
    duyurular: ['exb-duyuru', tek('duyurular', j => j.duyurular || [])],
    hedef: ['exb-bayi-hedef', tek('hedef', j => j.hedef ? { [kul]: j.hedef } : {})],
    'odeme-linki': ['exb-odeme-link', tek('odeme-linki', j => j.link ? { [kul]: j.link } : {})],
    stok: ['exb-stok', tek('stok', j => j.stok ?? null)],
  };
  const imza = {}, surec = {}, bekleyen = {};
  const V = window.EXIT_VERI = { hazir: null, katalog: null, imza, yenile: ad => oku(ad) };

  async function oku(ad) {
    if (surec[ad]) { bekleyen[ad] = true; return surec[ad]; }
    surec[ad] = (async () => {
      try {
        const [k, f] = KAYNAK[ad], x = await f();
        imza[ad] = x.imza;
        if (k) EXIT_BELLEK_KOY(k, x.v == null ? null : JSON.stringify(x.v));
        else { V.katalog = x.v; if (typeof kampanyaKontrol === 'function') try { kampanyaKontrol(); } catch (e) {} }
      } catch (e) { imza[ad] = null; setTimeout(() => oku(ad), 10000); } // bağlantı yok: sonra yeniden dene
      finally { surec[ad] = null; }
      if (bekleyen[ad]) { bekleyen[ad] = false; return oku(ad); }
    })();
    return surec[ad];
  }
  V.hazir = EXIT_HAZIR.then(() => {
    const O = window.EXIT_OTURUM;
    if (!window.EXIT_SUNUCU || !O || O.tur !== UYG || O.sifreDegistir) { if (window.EXIT_VERI === V) delete window.EXIT_VERI; return; }
    kul = O.kul; acik = true;
    return Promise.all(Object.keys(KAYNAK).map(oku));
  });
  // sunucuda değişen kaynaklar (yeni imza): yalnız farklı olanlar yeniden okunur
  addEventListener('exit-kaynak', e => { if (acik) (e.detail || []).forEach(([ad, i]) => { if (KAYNAK[ad] && (imza[ad] !== i || surec[ad])) oku(ad); }); });
  // kampanyaların geçerliliği güne bağlı: gün değişince fiyatlar yeniden okunur
  if (KAYNAK.katalog) {
    let gun = new Date().toISOString().slice(0, 10);
    setInterval(() => { const g = new Date().toISOString().slice(0, 10); if (acik && g !== gun) { gun = g; oku('katalog'); } }, 60000);
  }
})();
