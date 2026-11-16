// Ortak sunucu senkronu: sayfa http(s) üzerinden sunucudan açılınca veriler sunucuda tutulur ve tüm cihazlarda ortak olur.
// Faz 1a: Sunucu oturum ister ve her kullanıcıya yalnız kendi görebileceği veriyi gönderir.
//   • Giriş yapılmadan hiçbir veri inmez ve hiçbir değişiklik gönderilmez.
//   • Tarayıcı alanı dolduğu için yüklenemeyen anahtarlar "eksik" sayılır; eksik veriyle sunucudaki tam
//     verinin ezilmemesi için bu anahtarlardaki değişiklikler gönderilmez ve uyarı gösterilir.
//   • Numara (sipariş, ödeme, teklif…) sunucuda verilir (REST kayıt uçları; eski api/numara ucu duruyor).
// Faz 2b (bayi web sitesi, EXIT_WEB): iş verisi tarayıcının kalıcı alanına (localStorage) hiç yazılmaz; sunucudan
//   gelen kopya yalnız bellekte durur ve sekme kapanınca kaybolur. Ekranlar yine localStorage üzerinden okur/yazar,
//   bu katman ilgili anahtarları belleğe yönlendirir. Sunucuya ulaşılamazsa site çevrimdışı modda açılır
//   (EXIT_CEVRIMDISI): giriş ve kayıt kapalı, bağlantı gelince sayfa kendiliğinden yenilenir.
// Faz 2b-2 (adım 2): web sitesi iş verisini REST'ten okur (ortak/rest-veri.js). Bu katman sitede yalnız bayinin kişisel
//   anahtarlarını (sepet, favori, proje, adres, hatırlatma ayarı…) eşitler (?kapsam=kisisel); iş verisi anahtarlarını
//   sunucuya hiç göndermez. /api/degisen yanıtındaki kaynak imzaları 'exit-kaynak' olayıyla veri modülüne iletilir.
// Faz 3b-2 (adım 3): satış paneli de sunucudan açılıp oturum varken iş verisini yalnız bellekte tutar (masaüstü
//   uygulamasının ve tarayıcının diskinde iş verisi kalmaz). Eşitleme ucu satışta değişmedi. Oturum yokken
//   (giriş ekranı) tarayıcıdaki eski veriye dokunulmaz: yöneticinin ilk girişinde sunucuya aktarılır, sonra silinir.
// Faz 3b-2 (adım 4): açılışta eşzamanlı (sayfayı donduran) istek yok. Veri fetch ile gelir; window.EXIT_HAZIR veri
//   ve oturum bilinince çözülür (sunucuya ulaşılamazsa false). Uygulamalar oturumu bundan sonra açar. EXIT_SUNUCU
//   sayfa sunucudan açılınca baştan true'dur (ulaşılamazsa false olur); EXIT_OTURUM ve EXIT_BELLEK hazır olunca kesinleşir.
//   Satış kayıt listelerini (siparişler, ödemeler…) REST'ten okur (ortak/rest-veri.js); eşitleme ucu satışta
//   ?kapsam=rest ile bu listeleri göndermez, değişince kaynak imzalarını gönderir. Yazma yolu değişmedi.
(function () {
  if (!/^https?:$/.test(location.protocol)) return;
  // /satis (sunucu) veya exit_satis_paneli.html (dosya); bayi sitesinin /siparisler gibi adresleri bayidir
  const UYG = /^\/satis(\/|$)|satis_paneli/i.test(location.pathname) ? 'satis' : 'bayi';
  const OTURUM_ANAHTARI = UYG === 'satis' ? 'exs-oturum' : 'exb-oturum';
  const YEREL = /^(exb-dil|exb-oturum|exs-oturum|exs-ai-anahtar|exit-tema|exb-kars)$/;
  const ORTAK = k => /^ex[bs]-/.test(k) && !YEREL.test(k);
  const S = Storage.prototype, setI0 = S.setItem, remI0 = S.removeItem, getI0 = S.getItem;
  // WEB: bayi web sitesi (iş verisi REST'ten, eşitleme yalnız kişisel). BELLEK: iş verisi Map'te (sitede baştan,
  // satışta oturumlu ilk yüklemede açılır).
  const WEB = UYG === 'bayi' && !!window.EXIT_WEB, B = new Map(); let BELLEK = WEB;
  // bayi sitesinde eşitlenen kişisel anahtarlar (sunucu: kurallar.js KISISEL); diğerleri REST'ten gelir
  const KISISEL = /^exb-(hat-gizli|duyuru-okundu|sepet|fav|proje|adres|bildirim|gorulen|mkat|hat)-(.+)$/;
  // eşitleme ucunun kapsamı: sitede yalnız kişisel anahtarlar; satışta REST'ten okunan kayıt listeleri hariç
  const KAPSAM = WEB ? 'kapsam=kisisel' : UYG === 'satis' ? 'kapsam=rest' : '', ek = y => KAPSAM ? y + (y.includes('?') ? '&' : '?') + KAPSAM : y;
  // ham erişim (senkron katmanının kendisi için): iş verisi anahtarları bellek kipinde Map'e gider
  const getI = function (k) { return BELLEK && this === localStorage && ORTAK(k) ? (B.has(k) ? B.get(k) : null) : getI0.call(this, k); };
  const setI = function (k, v) { if (BELLEK && this === localStorage && ORTAK(k)) B.set(k, String(v)); else setI0.call(this, k, v); };
  const remI = function (k) { if (BELLEK && this === localStorage && ORTAK(k)) B.delete(k); else remI0.call(this, k); };
  const diskteki = () => { const L = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ORTAK(k)) L.push(k); } return L; };
  const diskiTemizle = () => { try { diskteki().forEach(k => remI0.call(localStorage, k)); } catch (e) {} };
  const yerelAnahtarlar = () => BELLEK ? [...B.keys()] : diskteki();
  // önceki sürümlerden (veya tek dosyalık portaldan) bu tarayıcıda kalmış iş verisi kopyaları silinir
  if (WEB) diskiTemizle();
  let son = 0, yuklu = false, oturum = null, kapandi = false;
  // yazma tabanı (aşağıda, kayıt düzeyinde yazma): sunucudan son alınan değerler
  const taban = new Map(), tabanJ = new Map();
  const tabanKoy = (k, v) => { if (v == null) taban.delete(k); else taban.set(k, v); tabanJ.delete(k); };
  const eksik = new Set();
  const yukle = j => {
    son = j.zaman || 0; oturum = j.oturum || null;
    // Giriş yapılmamışken yerel veriye dokunulmaz: eski sürümden kalan veri, yönetici girişinde sunucuya
    // aktarılabilsin. Çıkışta yerel kopyalar EXIT_YEREL_TEMIZLE ile silinir.
    if (!oturum) return;
    gorulen.clear(); kuyrukTaban.clear(); // açılış sırasında (veri gelmeden) okunan boş değerler yama tabanı sayılmasın
    // satış: oturum açıldı; eski kopyalar (ilk kurulumda aktarıldıktan sonra) diskten silinir, veri bellekte durur
    if (!BELLEK && UYG === 'satis') { diskiTemizle(); BELLEK = true; }
    const yerel = yerelAnahtarlar();
    // sunucuda olmayan veya bu kullanıcıya gösterilmeyen yerel kopyalar silinir (önceki kullanıcının verisi kalmasın)
    yerel.forEach(k => { if (!(k in j.veri)) remI.call(localStorage, k); });
    for (const [k, v] of Object.entries(j.veri)) {
      try { setI.call(localStorage, k, v); eksik.delete(k); } catch (e) { eksik.add(k); try { remI.call(localStorage, k); } catch (e2) {} }
      tabanKoy(k, v);
    }
  };
  const al = yol => fetch(yol, { cache: 'no-store', headers: { 'X-Exit-Uyg': UYG } }).then(r => { if (r.status !== 200) throw new Error(yol + ': ' + r.status); return r.json(); });
  const isVerisi = j => Object.keys(j.veri).some(k => !/kullanicilar$/.test(k));
  // oturum ipucu (iş verisi değil): yeni sekmede, oturum açıkken giriş formu veri gelene kadar gizli kalır (oturum-erken.js)
  const IPUCU = 'exit-oturum-' + UYG;
  window.EXIT_UYG = UYG; window.EXIT_SUNUCU = true; window.EXIT_OTURUM = null; window.EXIT_BELLEK = BELLEK;
  window.EXIT_HAZIR = (async () => {
    try {
      let j = await al(ek('api/veri'));
      // İlk kurulum: sunucuda iş verisi yokken yönetici girişi yapılırsa, bu tarayıcıda (eski, dosyadan açılan
      // sürümde) biriken veriler sunucuya aktarılır. (Kapsamlı yanıtta REST listeleri yok: tam veriyle denetlenir.)
      if (j.oturum && j.oturum.rol === 'yonetici' && !isVerisi(j)) {
        const tam = KAPSAM ? await al('api/veri') : j;
        const ilk = isVerisi(tam) ? [] : yerelAnahtarlar().filter(k => !(k in tam.veri)).map(k => [k, getI.call(localStorage, k)]);
        if (ilk.length) {
          await fetch('api/veri', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Exit-Uyg': UYG }, body: JSON.stringify({ degisen: ilk }) });
          j = await al(ek('api/veri'));
        }
      }
      yukle(j); yuklu = true;
      // Uygulamanın oturum bilgisi sunucudakiyle aynı olsun (çerez geçerliyse yeni sekmede de giriş açık gelir)
      try { if (oturum) sessionStorage.setItem(OTURUM_ANAHTARI, oturum.kul); else sessionStorage.removeItem(OTURUM_ANAHTARI); } catch (e) {}
      try { if (oturum) setI0.call(localStorage, IPUCU, '1'); else remI0.call(localStorage, IPUCU); } catch (e) {}
    } catch (e) {}
    window.EXIT_SUNUCU = yuklu; window.EXIT_OTURUM = oturum; window.EXIT_BELLEK = BELLEK;
    if (!yuklu) { cevrimdisi(); return false; }
    baglan(); return true;
  })();
  // Sunucuya ulaşılamadı: bağlantı gelince (veya 15 sn'de bir denenerek) sayfa yenilenir. Web sitesi çevrimdışı
  // modda açılır (EXIT_CEVRIMDISI: giriş ve kayıt kapalı); satış panelinde durum çubuğu bağlantı olmadığını söyler.
  function cevrimdisi() {
    if (WEB) window.EXIT_CEVRIMDISI = true; else belgeyle(() => durum(false));
    try { remI0.call(localStorage, IPUCU); } catch (e) {}
    const dene = () => fetch('api/oturum', { cache: 'no-store' }).then(r => { if (r.ok) location.reload(); }).catch(() => {});
    addEventListener('online', dene); setInterval(dene, 15000);
  }
  const belgeyle = f => document.readyState === 'loading' ? addEventListener('DOMContentLoaded', f, { once: true }) : f();

  // Çıkışta: bu tarayıcıdaki ortak veri kopyalarını sil (sunucuya silme isteği gitmez)
  window.EXIT_YEREL_TEMIZLE = () => { yerelAnahtarlar().forEach(k => remI.call(localStorage, k)); diskiTemizle(); try { remI0.call(localStorage, IPUCU); } catch (e) {} };
  // giriş, kayıt ve şifre değişikliğinden sonra sayfa yenilenir: oturum ipucu hemen yazılır, yenilenen sayfa giriş
  // formunu bir an göstermez
  window.EXIT_API = (yol, govde) => fetch(yol, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Exit-Uyg': UYG }, body: JSON.stringify(govde || {}) })
    .then(r => r.json().catch(() => ({})).then(j => {
      if (r.ok && /api\/(giris|kayit|sifre)$/.test(yol)) try { setI0.call(localStorage, IPUCU, '1'); } catch (e) {}
      return { durum: r.status, ...j };
    }));

  // Şifre değiştirme penceresi (iki uygulamada ortak). zorunlu: geçici şifreyle girildi, kapatılamaz.
  window.EXIT_SIFRE_DEGISTIR = zorunlu => {
    if (document.getElementById('exSifPerde')) return;
    const p = document.createElement('div'); p.id = 'exSifPerde';
    p.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    const alan = (id, et, ac) => `<label style="display:block;margin:10px 0 4px;font-weight:600">${et}</label><input id="${id}" type="password" autocomplete="${ac}" required style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font:inherit">`;
    p.innerHTML = `<form style="background:#fff;color:#0f172a;border-radius:14px;padding:22px;width:100%;max-width:380px;font:14px Inter,Segoe UI,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.3)">
      <h3 style="margin:0 0 6px;font-size:18px">${zorunlu ? 'Yeni şifrenizi belirleyin' : 'Şifre değiştir'}</h3>
      ${zorunlu ? '<p style="margin:0;color:#475569">Hesabınıza geçici şifreyle girdiniz. Devam etmek için kendi şifrenizi belirleyin.</p>' : ''}
      ${alan('exSifEski', zorunlu ? 'Geçici şifre' : 'Mevcut şifre', 'current-password')}${alan('exSifYeni', 'Yeni şifre (en az 8 karakter)', 'new-password')}${alan('exSifYeni2', 'Yeni şifre (tekrar)', 'new-password')}
      <div id="exSifHata" style="color:#b91c1c;min-height:18px;margin:8px 0"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" id="exSifIkinci" style="padding:10px 14px;border:1px solid #cbd5e1;background:#fff;border-radius:10px;font:inherit;cursor:pointer">${zorunlu ? 'Çıkış' : 'Vazgeç'}</button>
      <button type="submit" style="padding:10px 16px;border:0;background:#0b1f3a;color:#fff;border-radius:10px;font:600 14px Inter,Segoe UI,sans-serif;cursor:pointer">Kaydet</button></div></form>`;
    document.body.appendChild(p);
    const $1 = id => document.getElementById(id), f = p.querySelector('form');
    $1('exSifEski').focus();
    $1('exSifIkinci').onclick = async () => { if (!zorunlu) return p.remove(); await window.EXIT_API('api/cikis').catch(() => {}); window.EXIT_YEREL_TEMIZLE(); location.reload(); };
    f.onsubmit = async e => {
      e.preventDefault(); const y = $1('exSifYeni').value;
      if (y.length < 8) return $1('exSifHata').textContent = 'Yeni şifre en az 8 karakter olmalı.';
      if (y !== $1('exSifYeni2').value) return $1('exSifHata').textContent = 'Yeni şifreler aynı değil.';
      const r = await window.EXIT_API('api/sifre', { eski: $1('exSifEski').value, yeni: y }).catch(() => ({ hata: 'Sunucuya ulaşılamadı.' }));
      if (!r.ok) return $1('exSifHata').textContent = r.hata || 'Şifre değiştirilemedi.';
      try { sessionStorage.setItem('exit-sifre-degisti', '1'); } catch (x) {}
      location.reload();
    };
  };
  try { if (sessionStorage.getItem('exit-sifre-degisti')) { sessionStorage.removeItem('exit-sifre-degisti'); addEventListener('load', () => setTimeout(() => { if (typeof toast === 'function') toast('Şifreniz değiştirildi.'); }, 300)); } } catch (x) {}

  // Faz 3b: kayıt düzeyinde yazma. Ekranlar anahtarın tamamını yazar (ör. bütün siparişler); sunucuya ise yalnız
  // değişen kayıtlar gider ("yama"). Böylece iki kullanıcı aynı anda farklı kayıtları değiştirdiğinde biri diğerinin
  // değişikliğini ezmez (V3). Taban: sunucudan son alınan değer; yama bu tabana göre çıkarılır.
  //   sözlük → {s:{koy, sil}}   kimlikli liste (no/id) → {l:'no', koy:[…], sil:[…]}   sona ekleme (işlem kaydı) → {e:[…], n}
  const tabanCoz = k => { const t = taban.get(k); if (t == null) return undefined; const c = tabanJ.get(k); if (c && c.s === t) return c.j; let j; try { j = JSON.parse(t); } catch (e) { j = undefined; } tabanJ.set(k, { s: t, j }); return j; };
  const LISTE_A = { 'exb-siparisler': 'no', 'exb-odeme': 'no', 'exb-numune': 'no', 'exb-teklif': 'no', 'exb-hatirlat': 'id', 'exb-iade': 'id' };
  const duz = x => x && typeof x === 'object' && !Array.isArray(x), J = x => JSON.stringify(x);
  const kimlikli = (L, a) => { const g = new Set(); return L.every(x => duz(x) && x[a] != null && !g.has(x[a]) && g.add(x[a])); };
  // Ekranın son okuduğu/yazdığı değer: ekranlar veriyi açılışta belleğe alıp sonra bellekten yazabilir. Yama bu
  // değere göre çıkarılırsa yalnız ekranın kendi değişikliği gider; bu arada başkasının yaptığı değişiklik geri alınmaz.
  const gorulen = new Map(), kuyrukTaban = new Map();
  const tabanBul = k => { const g = kuyrukTaban.has(k) ? kuyrukTaban.get(k) : gorulen.get(k); if (g == null) return tabanCoz(k); try { return JSON.parse(g); } catch (e) { return undefined; } };
  function yamaYap(k, yerel) {
    let t = tabanBul(k);
    let y; try { y = JSON.parse(yerel); } catch (e) { return null; }
    // sunucuda henüz olmayan anahtar (ör. ilk kez yazılan sözlük): iki kullanıcı aynı anda oluşturursa ikisinin girdileri de kalsın
    if (t === undefined && !taban.has(k) && !eksik.has(k)) { if (duz(y)) t = {}; else if (Array.isArray(y) && (LISTE_A[k] || ['no', 'id'].find(a => y.length && kimlikli(y, a)))) t = []; }
    if (t === undefined) return null;
    if (duz(t) && duz(y)) {
      const koy = {}, sil = []; for (const a in y) if (!(a in t) || J(y[a]) !== J(t[a])) koy[a] = y[a]; for (const a in t) if (!(a in y)) sil.push(a);
      return { s: { koy, sil } };
    }
    if (!Array.isArray(t) || !Array.isArray(y)) return null;
    const a = LISTE_A[k] || ['no', 'id'].find(a => (t.length || y.length) && kimlikli(t, a) && kimlikli(y, a));
    if (a && kimlikli(y, a)) {
      const T = new Map(t.filter(duz).map(x => [x[a], J(x)])), Y = new Set(y.map(x => x[a]));
      return { l: a, koy: y.filter(x => T.get(x[a]) !== J(x)), sil: [...T.keys()].filter(i => !Y.has(i)) };
    }
    // sona ekleme: yerel listenin başı tabanın sonuyla aynıysa (baştan kırpılmış olabilir) yalnız yeni öğeler gider
    if (!t.length) return { e: y, n: 0 };
    const tj = t.map(J), yj = y.map(J), son = tj[tj.length - 1];
    for (let i = yj.lastIndexOf(son); i >= 0; i = i > 0 ? yj.lastIndexOf(son, i - 1) : -1) {
      const m = i + 1; if (m > tj.length) continue;
      let ok = true; for (let j = 0; j < m && ok; j++) ok = yj[j] === tj[tj.length - m + j];
      if (ok) { const e = y.slice(m); return { e, n: tj.length + e.length > y.length ? y.length : 0 }; }
    }
    return null;
  }
  const bosYama = Y => Y.s ? !Object.keys(Y.s.koy).length && !Y.s.sil.length : Y.l ? !Y.koy.length && !Y.sil.length : !Y.e.length && !Y.n;
  const paket = L => { const degisen = [], yama = [];
    for (const [k, v] of L) { const Y = v == null ? null : yamaYap(k, v); kuyrukTaban.delete(k); if (!Y) degisen.push([k, v]); else if (!bosYama(Y)) yama.push([k, Y]); }
    return { degisen, yama }; };
  // sunucunun döndürdüğü son hâli yerel kopyaya işler; yalnız gerçekten değişen (başkasının değişikliği karışan) anahtarlar döner
  const birlesenIsle = B => { const D = []; B.forEach((v, k) => { if (kuyruk.has(k)) return; const y = getI.call(localStorage, k);
    if (v == null ? y != null : y !== v) { D.push(k); if (v == null) remI.call(localStorage, k); else setI.call(localStorage, k, v); } tabanKoy(k, v); }); return D; };
  const bildir = K => { if (K.length) setTimeout(() => dispatchEvent(new CustomEvent('exit-degisti', { detail: K })), 0); };
  const kuyruk = new Map(); let zam = null;
  const gonder = () => { zam = null; if (!oturum || !kuyruk.size) return; const L = [...kuyruk]; kuyruk.clear();
    const P = paket(L); if (!P.degisen.length && !P.yama.length) return;
    fetch(ek('api/veri'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Exit-Uyg': UYG }, body: JSON.stringify(P) })
      .then(r => { if (r.status === 401) { oturumKapandi(); return null; } if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => { if (!j) return; const B = new Map(j.birlesen || []);
        // bu arada yeniden değiştirilen anahtara dokunulmaz (taban da eski kalır: sonraki yama doğru çıkar)
        P.degisen.forEach(([k, v]) => { if (!kuyruk.has(k) && !B.has(k)) tabanKoy(k, v); });
        bildir(birlesenIsle(B));
        if ((j.reddedilen || []).length) console.warn('Sunucu bazı değişiklikleri kabul etmedi:', j.reddedilen); })
      .catch(() => { L.forEach(([k, v]) => kuyruk.has(k) || kuyruk.set(k, v)); zam = zam || setTimeout(gonder, 4000); durum(false); }); };
  let islemK = null; // koşullu yazma sırasında yakalanan değişiklikler
  const sira = (k, v) => {
    if (!oturum) return;
    // web sitesi: iş verisi REST ile yazılır (kayitEkle/kayitGuncelle); eşitleme ucuna yalnız kişisel anahtar gider
    if (WEB) { const m = k.match(KISISEL); if (!m || m[2] !== oturum.kul) { console.warn(k + ': iş verisi eşitleme ucuyla gönderilmez (REST ile yazılır).'); return; } }
    if (!kuyrukTaban.has(k)) kuyrukTaban.set(k, gorulen.get(k) ?? taban.get(k) ?? null);
    if (islemK) { islemK.set(k, v); kuyruk.delete(k); return; }
    if (eksik.has(k)) { console.warn(k + ' bu tarayıcıya tam yüklenemediği için değişiklik sunucuya gönderilmedi.'); durum(true); return; }
    kuyruk.set(k, v); clearTimeout(zam); zam = setTimeout(gonder, 250);
  };
  S.setItem = function (k, v) { setI.call(this, k, v); if (this === localStorage && ORTAK(k)) { sira(k, String(v)); gorulen.set(k, String(v)); } };
  S.removeItem = function (k) { remI.call(this, k); if (this === localStorage && ORTAK(k)) { sira(k, null); gorulen.delete(k); } };
  S.getItem = function (k) { const v = getI.call(this, k); if (this === localStorage && ORTAK(k)) { if (v == null) gorulen.delete(k); else gorulen.set(k, v); } return v; };
  // Koşullu yazma (Faz 3b): f() içindeki bütün değişiklikler tek istekte ve yalnız koşullar tutarsa yazılır
  // (ör. ödeme hâlâ "bekliyor"). Koşul tutmazsa yerel kopyalar sunucudaki son hâle döner.
  //   EXIT_KOSULLU([{k:'exb-odeme', a:'no', id, yol:'durum', esit:'bekliyor'}], () => { …yaz(…)… }) → Promise<{ok, hata?}>
  window.EXIT_KOSULLU = (kosul, f) => {
    if (!oturum) return Promise.resolve({ ok: false, hata: 'Oturum kapandı; yeniden giriş yapın.' });
    const M = islemK = new Map();
    try { f(); } finally { islemK = null; }
    const L = [...M]; if (!L.length) return Promise.resolve({ ok: true });
    // geri alınca ekranların bellekteki kopyası da tazelensin (exit-degisti)
    const geriAl = B => { B.forEach(([k, v]) => { if (v == null) remI.call(localStorage, k); else setI.call(localStorage, k, v); tabanKoy(k, v); }); bildir(B.map(x => x[0])); };
    return fetch(ek('api/veri'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Exit-Uyg': UYG }, body: JSON.stringify({ ...paket(L), kosul }) })
      .then(r => r.json().catch(() => ({})).then(j => {
        if (r.status === 401) { oturumKapandi(); return { ok: false, hata: 'Oturum kapandı; yeniden giriş yapın.' }; }
        durum(true);
        if (r.status === 409) { geriAl(j.birlesen || []); return { ok: false, durum: 409, hata: j.hata }; }
        if (!r.ok) { geriAl(L.map(([k]) => [k, taban.get(k) ?? null])); return { ok: false, hata: j.hata || 'Kaydedilemedi (' + r.status + ').' }; }
        const B = new Map(j.birlesen || []);
        L.forEach(([k, v]) => { if (!kuyruk.has(k) && !B.has(k)) tabanKoy(k, v); });
        bildir(birlesenIsle(B));
        return { ok: true, reddedilen: j.reddedilen || [] };
      }), () => { durum(false); geriAl(L.map(([k]) => [k, taban.get(k) ?? null])); return { ok: false, cevrimdisi: true, hata: 'Sunucuya ulaşılamıyor; karar kaydedilmedi. Bağlantıyı kontrol edip yeniden deneyin.' }; });
  };
  // REST ile kaydedilen bir kaydı yerel kopyaya işler (sunucuya yeniden gönderilmez). a: kimlik alanı
  window.EXIT_KAYIT_ISLE = (k, kayit, a = 'no') => {
    const isle = s => { let L; try { L = JSON.parse(s || '[]'); } catch (e) { L = []; } if (!Array.isArray(L)) L = [];
      const i = L.findIndex(x => x && x[a] === kayit[a]); if (i < 0) L.push(kayit); else L[i] = kayit; return JSON.stringify(L); };
    try { setI.call(localStorage, k, isle(getI.call(localStorage, k))); } catch (e) {}
    if (taban.has(k)) tabanKoy(k, isle(taban.get(k))); // sunucuda zaten var: yeniden gönderilmesin
  };
  // REST çağrısı (Faz 2b): {ok, durum, ...gövde}. Bağlantı yoksa {ok:false, cevrimdisi:true}.
  window.EXIT_REST = (yontem, yol, govde) => fetch('api/v1/' + yol, { method: yontem, cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Exit-Uyg': UYG }, body: govde ? JSON.stringify(govde) : undefined })
    .then(r => r.json().catch(() => ({})).then(j => { if (r.status === 401) oturumKapandi(); durum(true); return { ...j, ok: r.ok, http: r.status }; }), // http: yanıt kodu (kaydın kendi 'durum' alanı ezilmesin)
      () => { durum(false); return { ok: false, http: 0, cevrimdisi: true, hata: 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip yeniden deneyin.' }; });
  // REST'ten okunan bir kaynağı belleğe koyar (sunucuya geri gönderilmez); değiştiyse ekranlar 'exit-degisti' ile haber alır
  window.EXIT_BELLEK_KOY = (k, v) => {
    if (kuyruk.has(k)) return false; // gönderilmeyi bekleyen yerel değişiklik ezilmez (sunucunun yanıtı son hâli getirir)
    const y = getI.call(localStorage, k); tabanKoy(k, v);
    if (v == null ? y == null : y === v) return false;
    if (v == null) remI.call(localStorage, k); else setI.call(localStorage, k, v);
    bildir([k]); return true;
  };
  const cek = () => fetch(ek('api/degisen?son=' + son), { cache: 'no-store', headers: { 'X-Exit-Uyg': UYG } }).then(r => r.json()).then(j => {
    son = j.zaman; if (oturum && !j.oturum) return oturumKapandi(); durum(true);
    // ekranlar sunucudan gelen değişikliği dinleyebilir (masaüstü bildirimleri): addEventListener('exit-degisti', e => e.detail)
    const D = [];
    j.degisen.forEach(([k, v]) => { if (kuyruk.has(k)) return; tabanKoy(k, v);
      try { const y = getI.call(localStorage, k); if (v == null ? y != null : y !== v) D.push(k); v == null ? remI.call(localStorage, k) : y !== v && setI.call(localStorage, k, v); eksik.delete(k); } catch (e) { eksik.add(k); try { remI.call(localStorage, k); } catch (e2) {} } });
    bildir(D);
    // değişen REST kaynaklarının imzası (ortak/rest-veri.js yalnız farklı olanı yeniden okur)
    if (j.kaynaklar && j.kaynaklar.length) dispatchEvent(new CustomEvent('exit-kaynak', { detail: j.kaynaklar })); }).catch(() => durum(false));
  // Anlık bildirim (SSE): sunucu her değişiklikte sinyal gönderir, istemci hemen çeker. Bağlantı açıkken
  // yoklama 30 sn'ye iner; bağlantı yoksa 4 sn'lik yoklama sürer.
  // Veri yüklenince başlar (EXIT_HAZIR). Geçici şifreyle girildiyse önce şifre değiştirme penceresi açılır.
  let sseAcik = false, sonCek = 0, sz = null;
  const cekSimdi = () => { sonCek = Date.now(); cek(); };
  function baglan() {
    if (oturum && oturum.sifreDegistir) belgeyle(() => window.EXIT_SIFRE_DEGISTIR(true));
    setInterval(() => { if (!sseAcik || Date.now() - sonCek > 30000) cekSimdi(); }, 4000);
    if (oturum && !oturum.sifreDegistir && window.EventSource) {
      const es = new EventSource('api/olaylar?uyg=' + UYG);
      es.onopen = () => { sseAcik = true; };
      es.onerror = () => { sseAcik = false; };
      es.onmessage = () => { clearTimeout(sz); sz = setTimeout(cekSimdi, 150); };
    }
  }
  addEventListener('beforeunload', () => { if (kuyruk.size && oturum) navigator.sendBeacon(ek('api/veri?uyg=' + UYG), new Blob([JSON.stringify(paket([...kuyruk]))], { type: 'application/json' })); });
  function oturumKapandi() { if (kapandi) return; kapandi = true; oturum = null; kuyruk.clear(); try { sessionStorage.removeItem(OTURUM_ANAHTARI); } catch (e) {} durum(true); }

  let rozet; function durum(ok) {
    if (!document.body) return;
    if (!rozet) { rozet = document.createElement('div'); rozet.id = 'sunucuDurum'; rozet.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;font:600 11px Inter,Segoe UI,sans-serif;padding:5px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:none;max-width:calc(100vw - 24px)'; document.body.appendChild(rozet); }
    const uyari = kapandi ? '● Oturum kapandı; sayfayı yenileyip yeniden giriş yapın' : !ok ? '● Sunucu bağlantısı yok, değişiklikler bekletiliyor' : eksik.size ? '● Bazı veriler bu tarayıcıya yüklenemedi (alan dolu); ilgili değişiklikler gönderilmiyor' : '';
    rozet.textContent = uyari || '● Sunucuya bağlı'; rozet.style.background = uyari ? '#fef2f2' : '#ecfdf5'; rozet.style.color = uyari ? '#b91c1c' : '#047857'; rozet.style.opacity = uyari ? '1' : '.75';
  }
})();
