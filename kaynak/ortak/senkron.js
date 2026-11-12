// Ortak sunucu senkronu: sayfa http(s) üzerinden sunucudan açılınca veriler sunucuda tutulur ve tüm cihazlarda ortak olur.
// Faz 1a: Sunucu oturum ister ve her kullanıcıya yalnız kendi görebileceği veriyi gönderir.
//   • Giriş yapılmadan hiçbir veri inmez ve hiçbir değişiklik gönderilmez.
//   • Tarayıcı alanı dolduğu için yüklenemeyen anahtarlar "eksik" sayılır; eksik veriyle sunucudaki tam
//     verinin ezilmemesi için bu anahtarlardaki değişiklikler gönderilmez ve uyarı gösterilir.
//   • Numara (sipariş, ödeme, teklif…) sunucudan alınır: window.sunucuNo('EXG') → 'EXG-2026-0042'.
(function () {
  if (!/^https?:$/.test(location.protocol)) return;
  const UYG = /satis/i.test(location.pathname) ? 'satis' : 'bayi';
  const OTURUM_ANAHTARI = UYG === 'satis' ? 'exs-oturum' : 'exb-oturum';
  const YEREL = /^(exb-dil|exb-oturum|exs-oturum|exs-ai-anahtar|exit-tema|exb-kars)$/;
  const ORTAK = k => /^ex[bs]-/.test(k) && !YEREL.test(k);
  const S = Storage.prototype, setI = S.setItem, remI = S.removeItem, getI = S.getItem;
  const istek = (yontem, yol, govde) => { const x = new XMLHttpRequest(); x.open(yontem, yol, false); x.setRequestHeader('X-Exit-Uyg', UYG); if (govde) x.setRequestHeader('Content-Type', 'application/json'); x.send(govde ? JSON.stringify(govde) : null); return x; };
  let son = 0, yuklu = false, oturum = null, kapandi = false;
  const eksik = new Set();
  const yukle = j => {
    son = j.zaman || 0; oturum = j.oturum || null;
    // Giriş yapılmamışken yerel veriye dokunulmaz: eski sürümden kalan veri, yönetici girişinde sunucuya
    // aktarılabilsin. Çıkışta yerel kopyalar EXIT_YEREL_TEMIZLE ile silinir.
    if (!oturum) return;
    const yerel = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ORTAK(k)) yerel.push(k); }
    // sunucuda olmayan veya bu kullanıcıya gösterilmeyen yerel kopyalar silinir (önceki kullanıcının verisi kalmasın)
    yerel.forEach(k => { if (!(k in j.veri)) remI.call(localStorage, k); });
    for (const [k, v] of Object.entries(j.veri)) {
      try { setI.call(localStorage, k, v); eksik.delete(k); } catch (e) { eksik.add(k); try { remI.call(localStorage, k); } catch (e2) {} }
    }
  };
  try {
    const x = istek('GET', 'api/veri');
    if (x.status === 200) {
      const j = JSON.parse(x.responseText); yuklu = true;
      // İlk kurulum: sunucuda iş verisi yokken yönetici girişi yapılırsa, bu tarayıcıda (eski, dosyadan açılan
      // sürümde) biriken veriler sunucuya aktarılır.
      if (j.oturum && j.oturum.rol === 'yonetici' && !Object.keys(j.veri).some(k => !/kullanicilar$/.test(k))) {
        const ilk = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ORTAK(k) && !(k in j.veri)) ilk.push([k, getI.call(localStorage, k)]); }
        if (ilk.length) { istek('POST', 'api/veri', { degisen: ilk }); yukle(JSON.parse(istek('GET', 'api/veri').responseText)); }
        else yukle(j);
      } else yukle(j);
      // Uygulamanın oturum bilgisi sunucudakiyle aynı olsun (çerez geçerliyse yeni sekmede de giriş açık gelir)
      try { if (oturum) sessionStorage.setItem(OTURUM_ANAHTARI, oturum.kul); else sessionStorage.removeItem(OTURUM_ANAHTARI); } catch (e) {}
    }
  } catch (e) {}
  window.EXIT_SUNUCU = yuklu; window.EXIT_OTURUM = oturum; window.EXIT_UYG = UYG;
  if (!yuklu) return;

  // Çıkışta: bu tarayıcıdaki ortak veri kopyalarını sil (sunucuya silme isteği gitmez)
  window.EXIT_YEREL_TEMIZLE = () => { const L = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ORTAK(k)) L.push(k); } L.forEach(k => remI.call(localStorage, k)); };
  window.sunucuNo = on => { if (!oturum) return null; try { const x = istek('POST', 'api/numara', { on }); return x.status === 200 ? JSON.parse(x.responseText).no : null; } catch (e) { return null; } };
  window.EXIT_API = (yol, govde) => fetch(yol, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Exit-Uyg': UYG }, body: JSON.stringify(govde || {}) })
    .then(r => r.json().catch(() => ({})).then(j => ({ durum: r.status, ...j })));

  const kuyruk = new Map(); let zam = null;
  const gonder = () => { zam = null; if (!oturum || !kuyruk.size) return; const L = [...kuyruk]; kuyruk.clear();
    fetch('api/veri', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Exit-Uyg': UYG }, body: JSON.stringify({ degisen: L }) })
      .then(r => { if (r.status === 401) { oturumKapandi(); return null; } if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => { if (!j) return; (j.birlesen || []).forEach(([k, v]) => { if (v == null) remI.call(localStorage, k); else if (getI.call(localStorage, k) !== v) setI.call(localStorage, k, v); });
        if ((j.reddedilen || []).length) console.warn('Sunucu bazı değişiklikleri kabul etmedi:', j.reddedilen); })
      .catch(() => { L.forEach(([k, v]) => kuyruk.has(k) || kuyruk.set(k, v)); zam = zam || setTimeout(gonder, 4000); durum(false); }); };
  const sira = (k, v) => {
    if (!oturum) return;
    if (eksik.has(k)) { console.warn(k + ' bu tarayıcıya tam yüklenemediği için değişiklik sunucuya gönderilmedi.'); durum(true); return; }
    kuyruk.set(k, v); clearTimeout(zam); zam = setTimeout(gonder, 250);
  };
  S.setItem = function (k, v) { setI.call(this, k, v); if (this === localStorage && ORTAK(k)) sira(k, String(v)); };
  S.removeItem = function (k) { remI.call(this, k); if (this === localStorage && ORTAK(k)) sira(k, null); };
  const cek = () => fetch('api/degisen?son=' + son, { cache: 'no-store', headers: { 'X-Exit-Uyg': UYG } }).then(r => r.json()).then(j => {
    son = j.zaman; if (oturum && !j.oturum) return oturumKapandi(); durum(true);
    j.degisen.forEach(([k, v]) => { if (kuyruk.has(k)) return;
      try { v == null ? remI.call(localStorage, k) : getI.call(localStorage, k) !== v && setI.call(localStorage, k, v); eksik.delete(k); } catch (e) { eksik.add(k); try { remI.call(localStorage, k); } catch (e2) {} } }); }).catch(() => durum(false));
  setInterval(cek, 4000);
  addEventListener('beforeunload', () => { if (kuyruk.size && oturum) navigator.sendBeacon('api/veri?uyg=' + UYG, new Blob([JSON.stringify({ degisen: [...kuyruk] })], { type: 'application/json' })); });
  function oturumKapandi() { if (kapandi) return; kapandi = true; oturum = null; kuyruk.clear(); try { sessionStorage.removeItem(OTURUM_ANAHTARI); } catch (e) {} durum(true); }

  let rozet; function durum(ok) {
    if (!document.body) return;
    if (!rozet) { rozet = document.createElement('div'); rozet.id = 'sunucuDurum'; rozet.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;font:600 11px Inter,Segoe UI,sans-serif;padding:5px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:none;max-width:calc(100vw - 24px)'; document.body.appendChild(rozet); }
    const uyari = kapandi ? '● Oturum kapandı; sayfayı yenileyip yeniden giriş yapın' : !ok ? '● Sunucu bağlantısı yok, değişiklikler bekletiliyor' : eksik.size ? '● Bazı veriler bu tarayıcıya yüklenemedi (alan dolu); ilgili değişiklikler gönderilmiyor' : '';
    rozet.textContent = uyari || '● Sunucuya bağlı'; rozet.style.background = uyari ? '#fef2f2' : '#ecfdf5'; rozet.style.color = uyari ? '#b91c1c' : '#047857'; rozet.style.opacity = uyari ? '1' : '.75';
  }
})();
