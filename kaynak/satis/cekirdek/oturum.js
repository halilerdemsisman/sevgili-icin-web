// Çekirdek: giriş, oturum açılışı (ac), yeni sipariş sayacı.
// ---------- oturum
let KUL = oku('exs-kullanicilar', null), ben = null;
$('#fGiris').onsubmit = async e => {
  e.preventDefault(); const k = $('#gKul').value.trim().toLowerCase(), sf = $('#gSif').value;
  if (!KUL || typeof KUL !== 'object') KUL = {};
  if (!Object.values(KUL).some(x => x && x.sifre)) KUL = { satis: { kul: 'satis', ad: 'Satış Yöneticisi', sifre: await ozet('1234') } };
  const u = KUL[k], h = await ozet(sf);
  if (!u || (u.sifre !== h && u.sifre !== eskiOzet(sf))) return $('#gHata').textContent = 'Kullanıcı adı veya şifre hatalı.';
  if (u.sifre !== h) u.sifre = h; yaz('exs-kullanicilar', KUL);
  $('#gHata').textContent = ''; ben = u; try { sessionStorage.setItem('exs-oturum', k); } catch (e) {}
  try { ac(); } catch (err) { console.error(err); $('#giris').classList.add('gizli'); $('#uyg').classList.remove('gizli'); try { git('siparisler'); } catch (e2) {} }
};
$('#cikis').onclick = () => { try { sessionStorage.removeItem('exs-oturum'); } catch (e) {} location.reload(); };
function ac() {
  EK.acOnce?.(); // temsilci yalnız kendi bayilerini görür
  $('#giris').classList.add('gizli'); $('#uyg').classList.remove('gizli');
  const y = birlestir(); if (y) toast(y + ' yeni sipariş portaldan alındı.');
  kurCiz(); kurGuncelle(true); setInterval(() => kurGuncelle(true), 30 * 60 * 1000);
  setInterval(() => { if (birlestir()) { yeniSay(); if (aktif === 'siparisler') git('siparisler'); toast('Yeni sipariş geldi.'); } }, 20000);
  try { const ad = ben.ad || ben.kul || 'Satış'; $('#kim').innerHTML = `<div class="av">${ad.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR')}</div><div><b>${ad}</b><span>Satış ekibi · ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>`; } catch (e) {}
  yeniSay(); git('siparisler');
  onaySay(); try { $('#kim span').textContent = ROL_AD[rolu(ben)] + ' · ' + new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {}
  EK.acHatirlatma?.(); EK.acSonra?.(); EK.masaustuIsler?.();
}
function yeniSay() { const n = Object.values(SIP).filter(o => o.durum === 'yeni').length; $('#sYeni').textContent = n; $('#sYeni').classList.toggle('gizli', !n); }
