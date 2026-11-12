// ek10 (Faz 1a): Sunucuya bağlıyken satış girişi ve çıkışı sunucu üzerinden yapılır.
// Varsayılan "satis / 1234" hesabı sunucuda kullanılamaz; yönetici şifresi sunucuda belirlenir
// (node sunucu.js --yonetici-sifre …). Temsilci kısıtı artık sunucuda uygulanır: temsilcinin
// tarayıcısına yalnız atandığı bayilerin verisi gelir.
(function () {
  if (!window.EXIT_SUNUCU) return;
  const not = document.querySelector('#giris .g-not'); if (not) not.style.display = 'none';
  $('#fGiris').onsubmit = async e => {
    e.preventDefault(); const b = e.target.querySelector('button.marka'); if (b) b.disabled = true; $('#gHata').textContent = '';
    const r = await EXIT_API('api/giris', { tur: 'satis', kul: $('#gKul').value.trim().toLowerCase(), sifre: $('#gSif').value }).catch(() => ({ hata: 'Sunucuya ulaşılamadı.' }));
    if (!r.ok) { if (b) b.disabled = false; $('#gHata').textContent = r.hata || 'Giriş yapılamadı.'; return; }
    location.reload();
  };
  $('#cikis').onclick = async () => {
    await EXIT_API('api/cikis').catch(() => {});
    try { sessionStorage.removeItem('exs-oturum'); } catch (x) {}
    if (window.EXIT_YEREL_TEMIZLE) EXIT_YEREL_TEMIZLE();
    location.reload();
  };
})();
