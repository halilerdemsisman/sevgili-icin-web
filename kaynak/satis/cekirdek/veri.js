// Çekirdek: satış verisi (siparişler, müşteriler, iskonto…) ve portaldan gelen siparişlerin birleştirilmesi.
// ---------- tek veri modülü (Faz 3b-2 adım 3)
// Ekranların bellekte tuttuğu satış verisi yalnız burada tanımlıdır: her satır bir anahtar, onu tutan değişken ve
// anahtar yokken başlangıç değeri. Ekranlar değişkeni okur, kaydederken yaz(anahtar, değişken) çağırır. Başka bir
// kullanıcının değişikliği sunucudan gelince ozellikler/canli.js bu tabloyla bellekteki kopyayı yerinde günceller.
// Yeni bir kalıcı veri: tabloya bir satır ve aşağıya bir değişken. Bayi kayıtları (exb-siparisler, exb-odeme,
// exb-numune…) bellekte tutulmaz; ekranlar her çizimde oku() ile okur, canli.js yalnız sayfayı yeniler.
// Sunucudan açılınca bu anahtarların hiçbiri tarayıcının kalıcı alanına yazılmaz (ortak/senkron.js, BELLEK).
const DEPO = [
  //  anahtar               değişken      başlangıç         değişince (başkasının değişikliği)
  ['exs-siparisler',     () => SIP,   {}],
  ['exs-musteriler',     () => MUS,   {}],
  ['exs-iskonto',        () => ISK,   {}],
  ['exs-kur',            () => KUR,   { TRY: null, EUR: null, zaman: null, kaynak: '' }],
  ['exs-cari',           () => CARI,  {}],
  ['exs-crm',            () => CRM,   {}],
  ['exs-fiyat',          () => FIYAT, {},                () => { _fOnce = JSON.stringify(FIYAT); }], // fiyat geçmişi başkasının değişikliğini kendi değişikliği saymasın
  ['exs-gizli',          () => GIZLI, [],                () => { _gOnce = JSON.stringify(GIZLI); }],
  ['exs-kampanya',       () => KMP,   []],
  ['exs-onay-ayar',      () => ONAY,  { iskonto: 15, tutar: 25000 }],
  ['exs-fiyat-gecmis',   () => FGEC,  []],
  ['exs-fiyat-surum',    () => FSUR,  []],
  ['exs-bildirim',       () => BLD,   []],
  ['exs-hedef',          () => HDF,   {}],  // { 'YYYY-MM': { temsilci: {kul: tutar}, bolge: {ad: tutar} } }
  ['exs-hatirlatma',     () => HT,    []],
  ['exs-duyuru',         () => DY,    () => oku('exb-duyuru', []) || []], // önceki sürüm duyuruları yalnız bayi anahtarında tutuyordu
  ['exs-fiyat-grup',     () => GR,    []],
  ['exs-bayi-hedef',     () => BH,    {}],  // { kul: { yil: { hedef, basamak } } }, ortak basamak: BH._basamak[yil]
];
const depoSatir = k => DEPO.find(x => x[0] === k);
const depoBos = k => { const b = depoSatir(k)[2]; return typeof b === 'function' ? b() : structuredClone(b); };
const depoIlk = k => oku(k, null) ?? depoBos(k);
let SIP = depoIlk('exs-siparisler'), MUS = depoIlk('exs-musteriler'), ISK = depoIlk('exs-iskonto'), KUR = depoIlk('exs-kur'),
  CARI = depoIlk('exs-cari'), CRM = depoIlk('exs-crm'), FIYAT = depoIlk('exs-fiyat'), GIZLI = depoIlk('exs-gizli'),
  KMP = depoIlk('exs-kampanya'), ONAY = depoIlk('exs-onay-ayar'), FGEC = depoIlk('exs-fiyat-gecmis'), FSUR = depoIlk('exs-fiyat-surum'),
  BLD = depoIlk('exs-bildirim'), HDF = depoIlk('exs-hedef'), HT = depoIlk('exs-hatirlatma'), DY = depoIlk('exs-duyuru'),
  GR = depoIlk('exs-fiyat-grup'), BH = depoIlk('exs-bayi-hedef');
// Bellekteki kopyayı anahtarın son hâline getirir: sözlük yerinde (açık pencerelerin tuttuğu nesne başvuruları geçerli
// kalır), liste baştan. Değiştiyse satırın "değişince" işi çalışır. Başkasının değişikliği (ozellikler/canli.js) ve
// açılışta sunucudan gelen veri (depoTazele) bunu kullanır.
const _ham = x => x && typeof x.toJSON === 'function' ? x.toJSON() : x; // temsilci süzgeci (Proxy) → asıl nesne
const _nesne = x => x && typeof x === 'object' && !Array.isArray(x), _J = JSON.stringify;
function depoGuncelle(k) {
  const [, al, , sonra] = depoSatir(k), h = _ham(al()), y = oku(k, null) ?? depoBos(k);
  let d = false;
  if (Array.isArray(h)) { if (Array.isArray(y) && _J(h) !== _J(y)) { h.splice(0, h.length, ...y); d = true; } }
  else if (_nesne(h) && _nesne(y)) {
    for (const a of Object.keys(h)) if (!(a in y)) { delete h[a]; d = true; }
    for (const [a, v] of Object.entries(y)) {
      const e = h[a]; if (_J(e) === _J(v)) continue; d = true;
      if (_nesne(e) && _nesne(v)) { for (const b of Object.keys(e)) if (!(b in v)) delete e[b]; Object.assign(e, v); } else h[a] = v;
    }
  }
  if (d && sonra) sonra();
  return d;
}
// Sunucudan açılınca veri sayfa açıldıktan sonra gelir (ortak/senkron.js EXIT_HAZIR, kayıt listeleri ortak/rest-veri.js):
// veriYukle() gelmesini bekler, bellekteki kopyaları tazeler ve veriye bağlı açılış işlerini (veriHazir) çalıştırır.
// Sunucusuz (dosyadan açılan) sürümde veri baştan yerelde olduğu için işler hemen çalışır.
const _hazirIsler = [];
const veriHazir = f => { if (window.EXIT_HAZIR) _hazirIsler.push(f); else f(); };
async function veriYukle() {
  if (!window.EXIT_HAZIR) return;
  await EXIT_HAZIR; if (window.EXIT_VERI) await EXIT_VERI.hazir;
  DEPO.forEach(([k]) => depoGuncelle(k));
  _hazirIsler.splice(0).forEach(f => { try { f(); } catch (e) { console.error(e); } });
}

// Siparişler: müşteri uygulaması aynı tarayıcıdaysa doğrudan okunur; değilse müşterinin indirdiği sipariş dosyaları içe aktarılır.
function birlestir() {
  let yeni = 0;
  oku('exb-siparisler', []).forEach(o => { if (!SIP[o.no]) { SIP[o.no] = { ...o, kaynak: 'portal' }; yeni++; } else if (SIP[o.no].kaynak === 'portal' && !SIP[o.no].satisDurum) SIP[o.no].durum = SIP[o.no].durum; });
  Object.values(oku('exb-kullanicilar', {})).filter(u => u.rol === 'musteri').forEach(u => { MUS[u.kul] = { ...(MUS[u.kul] || {}), kul: u.kul, firma: u.firma, ad: u.ad, tel: u.tel, mail: u.mail, sehir: u.sehir, vergi: u.vergi, tarih: u.tarih }; });
  Object.values(SIP).forEach(o => { if (!MUS[o.kul]) MUS[o.kul] = { kul: o.kul, firma: o.firma, ad: o.ad, tarih: o.tarih }; });
  yaz('exs-siparisler', SIP); yaz('exs-musteriler', MUS); return yeni;
}
// Sipariş durumunu değiştirir. Sıra: kredi limiti (EK.durumLimit: aşılıyorsa temsilci durur, yöneticiye onay
// penceresi) -> onay kuralı -> durum ve geçmiş -> sevkte fatura -> bayi portalına yansıtma -> ekler.
function durumYaz(no, d) {
  if (EK.durumLimit && !EK.durumLimit(no, d)) return;
  const o = SIP[no], eski = o ? o.durum : '';
  const N = onayGerekli(o), ileri = ['onay', 'uretim', 'sevk'].includes(d);
  if (ileri && N.length && !(o.onay && o.onay.durum === 'onaylandi' && o.onay.imza === onayImza(o))) {
    if (yonetici()) { o.onay = { durum: 'onaylandi', neden: N, kim: kimAd(), zaman: Date.now(), imza: onayImza(o), otomatik: true }; }
    else { o.onay = { durum: 'bekliyor', neden: N, isteyen: kimAd(), zaman: Date.now(), hedefDurum: d }; yaz('exs-siparisler', SIP); onaySay(); toast('Bu sipariş yönetici onayı gerektiriyor: ' + N.join(', ') + '. Onaya gönderildi.'); return; }
  }
  o.gecmis = o.gecmis || [{ durum: 'yeni', zaman: o.tarih }];
  if (o.durum !== d || !o.gecmis.length) o.gecmis.push({ durum: d, zaman: Date.now() });
  o.durum = d; o.satisDurum = true;
  // aynı tarayıcıdaki müşteri portalına da yansıt
  const P = oku('exb-siparisler', null); if (P) { const x = P.find(y => y.no === no); if (x) { x.durum = d; yaz('exb-siparisler', P); } }
  if (d === 'sevk') faturaKes(o);
  yaz('exs-siparisler', SIP); portalaYansit(o); onaySay();
  EK.durumYayinla?.();
  if (eski !== d) EK.durumIslem?.(no, eski, d);
  EK.durumNet?.(no, d);
}
// İskonto: müşteri (firma) iskontosu + siparişe özel ek iskonto, art arda uygulanır.
const musIsk = kul => (ISK[kul] && +ISK[kul].oran) || 0;
function tutarlar(o) {
  const brut = o.kalemler.reduce((a, x) => a + (x.birim || 0) * x.adet, 0);
  const m = o.musIskonto != null ? o.musIskonto : musIsk(o.kul), e = +o.ekIskonto || 0;
  const net = brut * (1 - m / 100) * (1 - e / 100);
  return { brut, m, e, net, iskTutar: brut - net, oran: brut ? (1 - net / brut) * 100 : 0 };
}
const sipList = () => Object.values(SIP).sort((a, b) => b.tarih - a.tarih);
