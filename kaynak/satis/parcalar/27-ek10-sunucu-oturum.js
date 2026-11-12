// ek10 (Faz 1a/1b): Sunucuya bağlıyken satış girişi, çıkış, şifre değiştirme ve (yönetici) şifre sıfırlama.
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
  // Şifremi değiştir (sol menü, Çıkış'ın üstünde)
  if (!$('#sifreBtn')) $('#cikis').insertAdjacentHTML('beforebegin', '<button class="m" id="sifreBtn" style="margin-top:8px">Şifremi değiştir</button>');
  $('#sifreBtn').onclick = () => window.EXIT_SIFRE_DEGISTIR(false);

  // Yönetici: "Temsilciler ve işlem kaydı" ekranına şifre sıfırlama kartı
  const S6 = window.S6;
  if (S6 && S6.kullanicilar6) {
    const _k6 = S6.kullanicilar6;
    S6.kullanicilar6 = function () {
      const sonuc = _k6.apply(this, arguments);
      if (!window.EXIT_OTURUM || EXIT_OTURUM.rol !== 'yonetici') return sonuc;
      const SK = oku('exs-kullanicilar', {}) || {}, BK = oku('exb-kullanicilar', {}) || {};
      const L = [...Object.values(SK).filter(u => u && u.kul && u.kul !== EXIT_OTURUM.kul).map(u => ['satis', u.kul, (u.ad || u.kul) + ' · satış']),
        ...Object.values(BK).filter(u => u && u.kul).sort((a, b) => (a.firma || a.kul).localeCompare(b.firma || b.kul, 'tr')).map(u => ['bayi', u.kul, (u.firma || u.kul) + ' · bayi (' + u.kul + ')'])];
      $('#icerik').insertAdjacentHTML('beforeend', `<div class="kart" id="ssKart" style="margin-top:16px"><h3>Şifre sıfırlama</h3>
        <div class="alt">Şifresini unutan bayi veya temsilci için geçici şifre üretin. Kullanıcının açık oturumları kapanır; bu şifreyle girince kendi şifresini belirlemek zorundadır.</div>
        ${L.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select class="s6-in" id="ssKim">${L.map(([t, k, a]) => `<option value="${t}|${esc(k)}">${esc(a)}</option>`).join('')}</select><button class="btn" id="ssBtn">Geçici şifre üret</button></div><div id="ssSonuc" style="margin-top:10px"></div>` : '<p class="kucuk">Kullanıcı yok.</p>'}</div>`);
      const b = $('#ssBtn'); if (b) b.onclick = async () => {
        const [tur, kul] = $('#ssKim').value.split('|'); b.disabled = true;
        const r = await EXIT_API('api/sifre-sifirla', { tur, kul }).catch(() => ({ hata: 'Sunucuya ulaşılamadı.' })); b.disabled = false;
        $('#ssSonuc').innerHTML = r.ok ? `<div>Geçici şifre: <b id="ssGecici" style="font-family:ui-monospace,monospace;font-size:16px;letter-spacing:.5px">${esc(r.gecici)}</b></div><div class="kucuk">Şifreyi kullanıcıya telefonla veya güvenli bir kanaldan iletin; bir daha gösterilmez.</div>`
          : `<span style="color:#b91c1c">${esc(r.hata || 'Şifre sıfırlanamadı.')}</span>`;
      };
      return sonuc;
    };
  }

  // Sunucu fiyat denetiminde düzeltilen siparişte uyarı göster
  const _sa = siparisAc;
  siparisAc = function (no) {
    const sonuc = _sa.apply(this, arguments);
    const o = (oku('exb-siparisler', []) || []).find(x => x.no === no), p = [...document.querySelectorAll('.perde .pencere h2')].pop();
    if (o && o.fiyatKontrol && p && !p.parentNode.querySelector('.fk-uyari')) p.insertAdjacentHTML('afterend', `<div class="fk-uyari" style="margin:10px 0;padding:10px 12px;border-radius:10px;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;font-size:13px"><b>Fiyat düzeltildi:</b> Bayinin gönderdiği birim fiyat güncel bayi fiyatının altındaydı; sunucu güncel fiyatı yazdı. ${o.fiyatKontrol.duzeltme.map(d => `${esc(d.ad)} ${esc(d.secenek || '')}: ${d.gelen} → ${d.beklenen == null ? 'teklif' : d.beklenen} $`).join(' · ')}</div>`);
    return sonuc;
  };

  $('#cikis').onclick = async () => {
    await EXIT_API('api/cikis').catch(() => {});
    try { sessionStorage.removeItem('exs-oturum'); } catch (x) {}
    if (window.EXIT_YEREL_TEMIZLE) EXIT_YEREL_TEMIZLE();
    location.reload();
  };
})();
