// Çekirdek: satış verisi (siparişler, müşteriler, iskonto…) ve portaldan gelen siparişlerin birleştirilmesi.
// ---------- veri katmanı
// Siparişler: müşteri uygulaması aynı tarayıcıdaysa doğrudan okunur; değilse müşterinin indirdiği sipariş dosyaları içe aktarılır.
let SIP = oku('exs-siparisler', {}), MUS = oku('exs-musteriler', {}), ISK = oku('exs-iskonto', {}), KUR = oku('exs-kur', { TRY: null, EUR: null, zaman: null, kaynak: '' });
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
