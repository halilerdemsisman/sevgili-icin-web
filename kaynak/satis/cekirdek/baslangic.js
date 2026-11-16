// Başlangıç: paketin sonundadır; kayıtlı oturum belge okunduktan sonra açılır (bütün ekranlar tanımlıdır).
// ---------- başlangıç
(async () => {
  if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r));
  if (!KUL) { KUL = { satis: { kul: 'satis', ad: 'Satış Yöneticisi', sifre: await ozet('1234') } }; yaz('exs-kullanicilar', KUL); }
  let o = null; try { o = sessionStorage.getItem('exs-oturum'); } catch (e) {}
  if (o && KUL[o]) { ben = KUL[o]; try { ac(); } catch (err) { console.error(err); $('#giris').classList.add('gizli'); $('#uyg').classList.remove('gizli'); } }
})();
// ---------- menü
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
