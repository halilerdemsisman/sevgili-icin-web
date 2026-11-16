/* Faz 3b: çok kullanıcılı satış ekibi
 * 1) Canlı veri: ekranlar veriyi açılışta belleğe alır (SIP, CARI, MUS…). Başka bir kullanıcının değişikliği sunucudan
 *    gelince bellekteki kopya yerinde güncellenir ve açık sayfa (yazı yazılmıyorsa, pencere açık değilse) yenilenir.
 *    Önceden başka temsilcinin onayladığı sipariş, sayfa yenilenene kadar eski durumda görünüyordu.
 * 2) Karar ekranlarında çifte karar engeli: kosullu() ile yazılan karar, kayıt hâlâ bekliyorsa kaydedilir; başka bir
 *    kullanıcı bu arada karar verdiyse hiçbir şey yazılmaz ve kullanıcıya söylenir (sunucu: koşullu yazma).
 */
// Sunucusuz (dosyadan açılan) kullanımda koşul denetlenmez, değişiklik doğrudan yazılır
window.kosullu = (kosul, f) => window.EXIT_KOSULLU ? window.EXIT_KOSULLU(kosul, f) : (f(), Promise.resolve({ ok: true }));
(function () {
  if (!window.EXIT_SUNUCU) return;
  // bellekteki kopyalar: tek veri modülündeki tablo (cekirdek/veri.js, DEPO); sözlük yerinde, liste baştan güncellenir
  const BAG = Object.fromEntries(DEPO.map(([k]) => [k, () => depoGuncelle(k)]));
  // bayi kayıtları ekranlarda her çizimde yeniden okunur; yalnız sayfa yenilenir
  const YENILE = /^exb-(siparisler|odeme|numune|teklif|iade|hatirlat)$|^exs-(islem)$/;
  let zam = null, bekleyen = false;
  const guvenli = () => { const a = document.activeElement; return !document.querySelector('.perde, #haPerde, #exSifPerde') && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !(getSelection && String(getSelection()).length); };
  function yenile() {
    zam = null; if (!bekleyen) return;
    if (!guvenli() || !aktif || !$('#uyg') || $('#uyg').classList.contains('gizli')) { zam = setTimeout(yenile, 2000); return; }
    bekleyen = false; const x = scrollX, y = scrollY, ic = $('#icerik'), iy = ic ? ic.scrollTop : 0;
    try { git(aktif); } catch (e) { return; }
    scrollTo(x, y); if (ic) ic.scrollTop = iy;
  }
  addEventListener('exit-degisti', e => {
    let d = false;
    for (const k of e.detail || []) {
      if (BAG[k]) { try { d = BAG[k]() || d; } catch (x) { /* ekran henüz yüklenmedi */ } }
      else if (YENILE.test(k)) d = true;
    }
    // oturum henüz açılmadıysa (açılışta REST'ten gelen listeler) yenilenecek sayfa yok: ac() güncel veriyle çizer
    const acik = $('#uyg') && !$('#uyg').classList.contains('gizli');
    if (d && acik) { bekleyen = true; clearTimeout(zam); zam = setTimeout(yenile, 300); }
  });
})();
