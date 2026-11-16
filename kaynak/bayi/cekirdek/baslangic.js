// Başlangıç: giriş ekranının vitrin ve istatistikleri; (web sitesinde iş verisi gelince) kayıtlı oturumu aç.
// Paketin sonundadır; ekranların hepsi tanımlıdır.
// ---------- başlangıç
// Kayıtlı oturum varken (oturum-erken.js: html.oturum-aciliyor) giriş ekranı gizli başlar; oturum açılınca ya da
// açılamazsa görünür olur. Önceden girişli bayi sayfayı açınca bir an giriş formunu görüyordu (Faz 2c).
// DOMContentLoaded beklemesi burada, ilk satırda kurulur: web sitesinde betikler defer ile yüklenir ve çalışırken
// readyState zaten 'interactive' olur (olay henüz gelmemiştir).
const belgeHazir = new Promise(r => document.readyState === 'complete' ? r() : addEventListener('DOMContentLoaded', r, { once: true }));
(async () => {
  try { await baslat(); } finally { document.documentElement.classList.remove('oturum-aciliyor'); }
})();
async function baslat() {
  await kurulum();
  const v = VERI.urunler.filter(u => u.gorsel); const sec = ['Enzo Oturma Grupları', 'Aqua', 'Verona', 'Nirvana', 'Hera', 'Perla İkili'];
  $('#vitrin').innerHTML = sec.map(a => v.find(u => u.ad === a) || v[0]).map((u, i) => `<div style="background-image:url(${u.gorsel});animation-delay:${i * 90}ms" title="${esc(u.ad)}"></div>`).join('');
  // Oturum, bütün özellik dosyaları yüklendikten sonra açılır: ilk çizimde eklerin hepsi (favori, duyuru bandı,
  // karşılaştırma…) bulunur. Önceden tek dosyalık sürümde oturum özelliklerden önce açılıyor, web sitesinde de verinin
  // ne zaman geldiğine göre önce ya da sonra açılabiliyordu (ilk çizimde ekler eksik kalabiliyordu).
  await belgeHazir;
  let o = null; try { o = sessionStorage.getItem('exb-oturum'); } catch (e) {}
  if (o && KUL[o]) girisYap(KUL[o]);
}

try { const ks = new Set(VERI.urunler.map(u => u.kategori)); $('#gIstat').innerHTML = `<div><b>${VERI.urunler.length}</b><span>ürün modeli</span></div><div><b>${ks.size}</b><span>kategori</span></div><div><b>${ISKELET.length}</b><span>iskelet rengi</span></div><div><b>${Object.keys(VERI.kumas || {}).length || 6}</b><span>kumaş rengi</span></div>`; } catch (e) {}
