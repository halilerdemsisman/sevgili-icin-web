/* Faz 2b-2 (adım 2) · bayi web sitesinin veri modülü. Yalnız web sitesine girer.
   İş verisi (siparişler, cari, fiyatlar ve kampanyalar, ödemeler, teklifler, duyurular, mesajlar…) REST uçlarından
   okunur (GET /api/v1/…; docs/API.md). Eşitleme ucu (api/veri) sitede yalnız bayinin kişisel anahtarları (sepet,
   favori, proje, adres…) için kalır (senkron.js, ?kapsam=kisisel).
   Ekranlar veriyi yine oku('exb-…') ile, bellekteki kopyadan okur; bu modül kopyayı REST yanıtından doldurur.
   Böylece ekranların okuma biçimi tek dosyalık (sunucusuz) sürümle aynı kalır.
   Güncel tutma: her kaynak imzasıyla (ETag) gelir. Sunucuda bir kaynağı etkileyen veri değişince anlık bildirimin
   ardından gelen /api/degisen yanıtı kaynakların yeni imzasını taşır (senkron.js → 'exit-kaynak' olayı); yalnız
   imzası değişen kaynak yeniden okunur.
   EXIT_VERI.hazir: ilk yükleme bitince çözülür (girişten önce beklenir; 03-ana.js kurulum). */
(function () {
  const O = window.EXIT_OTURUM;
  if (!window.EXIT_WEB || !window.EXIT_SUNUCU || !O || O.tur !== 'bayi' || O.sifreDegistir || !window.EXIT_BELLEK_KOY) return;
  const kul = O.kul, ADET = 200;
  const getir = async yol => {
    const r = await fetch('api/v1/' + yol, { cache: 'no-store', headers: { 'X-Exit-Uyg': 'bayi' } });
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
  const KAYNAK = {
    ben: ['exb-kullanicilar', tek('ben', j => ({ [kul]: { ...j, kul } }))],
    katalog: [null, tek('katalog', j => j)],
    siparisler: ['exb-siparisler', liste('siparisler', 'siparisler')],
    odemeler: ['exb-odeme', liste('odemeler')],
    iadeler: ['exb-iade', liste('iadeler')],
    numuneler: ['exb-numune', liste('numuneler')],
    teklifler: ['exb-teklif', liste('teklifler')],
    hatirlatmalar: ['exb-hatirlat', liste('hatirlatmalar')],
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
  V.hazir = Promise.all(Object.keys(KAYNAK).map(oku));
  // sunucuda değişen kaynaklar (yeni imza): yalnız farklı olanlar yeniden okunur
  addEventListener('exit-kaynak', e => (e.detail || []).forEach(([ad, i]) => { if (KAYNAK[ad] && (imza[ad] !== i || surec[ad])) oku(ad); }));
  // kampanyaların geçerliliği güne bağlı: gün değişince fiyatlar yeniden okunur
  let gun = new Date().toISOString().slice(0, 10);
  setInterval(() => { const g = new Date().toISOString().slice(0, 10); if (g !== gun) { gun = g; oku('katalog'); } }, 60000);
})();
