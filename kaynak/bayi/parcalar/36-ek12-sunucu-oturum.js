// ek12 (Faz 1a): Sunucuya bağlıyken giriş, kayıt ve çıkış sunucu üzerinden yapılır.
// Şifre tarayıcıda karşılaştırılmaz; sunucu doğrular ve HttpOnly çerezle oturum açar. Sayfa yeniden
// yüklenince sunucu yalnız bu bayinin verisini gönderir (senkron katmanı), uygulama oturumu oradan açar.
// Sunucu yoksa (dosyadan açılan sürüm) eski davranış aynen sürer.
(function () {
  if (!window.EXIT_SUNUCU) return;
  const bekle = (form, acik) => { const b = form.querySelector('button[type=submit], button.marka'); if (b) b.disabled = !acik; };
  $('#fGiris').onsubmit = async e => {
    e.preventDefault(); const f = e.target; bekle(f, false); $('#gHata').textContent = '';
    const r = await EXIT_API('api/giris', { tur: 'bayi', kul: $('#gKul').value.trim().toLowerCase(), sifre: $('#gSif').value }).catch(() => ({ hata: 'Sunucuya ulaşılamadı.' }));
    if (!r.ok) { bekle(f, true); $('#gHata').textContent = r.hata || 'Giriş yapılamadı.'; return; }
    location.reload();
  };
  $('#fKayit').onsubmit = async e => {
    e.preventDefault(); const f = e.target, h = $('#kHata'), v = id => $('#' + id).value.trim();
    const k = v('kKul').toLowerCase(), s = $('#kSif').value;
    if (!/^[a-z0-9._-]{3,}$/.test(k)) return h.textContent = 'Kullanıcı adı en az 3 karakter olmalı (harf, rakam, . _ -).';
    if (s.length < 8) return h.textContent = 'Şifre en az 8 karakter olmalı.';
    bekle(f, false); h.textContent = '';
    const r = await EXIT_API('api/kayit', { kul: k, sifre: s, firma: v('kFirma'), ad: v('kAd'), tel: v('kTel'), mail: v('kMail'), sehir: v('kSehir'), vergi: v('kVergi'), kvkk: $('#kKvkk').checked })
      .catch(() => ({ hata: 'Sunucuya ulaşılamadı.' }));
    if (!r.ok) { bekle(f, true); h.textContent = r.hata || 'Kayıt yapılamadı.'; return; }
    try { sessionStorage.setItem('exb-yeni-kayit', '1'); } catch (x) {}
    location.reload();
  };
  $('#hCikis').onclick = async () => {
    await EXIT_API('api/cikis').catch(() => {});
    try { sessionStorage.removeItem('exb-oturum'); } catch (x) {}
    if (window.EXIT_YEREL_TEMIZLE) EXIT_YEREL_TEMIZLE();
    location.reload();
  };
  // Firma adına tıklayınca şifre değiştirme
  const hf = document.querySelector('.h-firma');
  if (hf) { hf.style.cursor = 'pointer'; hf.title = 'Şifre değiştir'; hf.onclick = () => window.EXIT_SIFRE_DEGISTIR(false); }
  try { if (sessionStorage.getItem('exb-yeni-kayit')) { sessionStorage.removeItem('exb-yeni-kayit'); if (ben) toast('Kaydınız oluşturuldu, hoş geldiniz.'); } } catch (x) {}
})();
