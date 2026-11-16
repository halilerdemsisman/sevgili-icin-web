// Başlangıç: paketin sonundadır; kayıtlı oturum belge okunduktan sonra açılır (bütün ekranlar tanımlıdır).
// Sunucudan açılınca önce veri beklenir (veriYukle); oturum varken giriş formu bu arada gizlidir (oturum-erken.js).
// ---------- başlangıç
(async () => {
  try {
    await veriYukle(); if (window.EXIT_HAZIR) KUL = oku('exs-kullanicilar', null);
    if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r));
    if (!KUL) { KUL = { satis: { kul: 'satis', ad: 'Satış Yöneticisi', sifre: await ozet('1234') } }; yaz('exs-kullanicilar', KUL); }
    let o = null; try { o = sessionStorage.getItem('exs-oturum'); } catch (e) {}
    if (o && KUL[o]) { ben = KUL[o]; try { ac(); } catch (err) { console.error(err); $('#giris').classList.add('gizli'); $('#uyg').classList.remove('gizli'); } }
  } finally { document.documentElement.classList.remove('oturum-aciliyor'); }
})();
// ---------- menü
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
