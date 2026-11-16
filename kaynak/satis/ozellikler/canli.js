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
  const J = JSON.stringify, nesne = x => x && typeof x === 'object' && !Array.isArray(x);
  const ham = x => x && typeof x.toJSON === 'function' ? x.toJSON() : x; // temsilci süzgeci (Proxy) → asıl nesne
  // Değişen girdiler yerinde güncellenir: açık pencerelerin tuttuğu nesne başvuruları geçerli kalır
  function sozluk(hedef, yeni) {
    const t = ham(hedef); if (!nesne(t) || !nesne(yeni)) return false; let d = false;
    for (const a of Object.keys(t)) if (!(a in yeni)) { delete t[a]; d = true; }
    for (const [a, v] of Object.entries(yeni)) {
      const e = t[a]; if (J(e) === J(v)) continue; d = true;
      if (nesne(e) && nesne(v)) { for (const b of Object.keys(e)) if (!(b in v)) delete e[b]; Object.assign(e, v); } else t[a] = v;
    }
    return d;
  }
  const liste = (hedef, yeni) => { if (!Array.isArray(hedef) || !Array.isArray(yeni) || J(hedef) === J(yeni)) return false; hedef.splice(0, hedef.length, ...yeni); return true; };
  // bellekteki kopyalar: tek veri modülündeki tablo (cekirdek/veri.js, DEPO); sözlük yerinde, liste baştan güncellenir
  const BAG = Object.fromEntries(DEPO.map(([k, al, , sonra]) => [k, () => {
    const h = al(), y = oku(k, null) ?? depoBos(k), d = Array.isArray(ham(h)) ? liste(ham(h), y) : sozluk(h, y);
    if (d && sonra) sonra(); return d;
  }]));
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
    if (d) { bekleyen = true; clearTimeout(zam); zam = setTimeout(yenile, 300); }
  });
})();
