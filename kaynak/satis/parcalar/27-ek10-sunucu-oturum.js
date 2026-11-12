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

  // Tarayıcıda kalmış eski Claude API anahtarını sil (anahtar artık sunucuda tutulur)
  try { localStorage.removeItem('exs-ai-anahtar'); } catch (x) {}

  // Ayarlar: Claude API anahtarı ve satış kullanıcıları kartları sunucu üzerinden çalışır
  const _ay = ayarlar;
  ayarlar = function () {
    const sonuc = _ay.apply(this, arguments);
    const yon = window.EXIT_OTURUM && EXIT_OTURUM.rol === 'yonetici';
    const aiKart = $('#aKey') && $('#aKey').closest('.kart');
    if (aiKart) {
      aiKart.innerHTML = `<h3>Claude API anahtarı</h3><div class="alt">“Claude ile derin analiz” için gerekir. Anahtar sunucuda saklanır, tarayıcılara gönderilmez; analizde yalnız toplu satış özeti (müşteri iletişim bilgisi olmadan) gönderilir.</div>
        <div id="aiDurum" class="kucuk">Durum okunuyor…</div>
        ${yon ? `<div class="alan" style="margin-top:8px"><label>Yeni anahtar</label><input id="aiYeni" type="password" placeholder="sk-ant-…" autocomplete="off"></div><button class="btn" id="aiKaydet">Kaydet</button> <button class="btn cizgi" id="aiSil">Sil</button>` : '<p class="kucuk">Anahtarı satış yöneticisi tanımlar.</p>'}`;
      const durum = () => fetch('api/ai/durum', { headers: { 'X-Exit-Uyg': 'satis' } }).then(r => r.json()).then(j => { const d = $('#aiDurum'); if (d) d.innerHTML = j.anahtarVar ? `✓ Anahtar tanımlı${j.kaynak === 'ortam' ? ' (sunucu ayarlarından)' : ''}` : '<span style="color:#b91c1c">Anahtar tanımlı değil</span>'; }).catch(() => {});
      durum();
      if (yon) {
        const gonder = async a => { const r = await EXIT_API('api/ai/anahtar', { anahtar: a }); if (!r.ok) return toast(r.hata || 'Kaydedilemedi.'); $('#aiYeni').value = ''; toast(a ? 'Anahtar sunucuya kaydedildi.' : 'Anahtar silindi.'); durum(); };
        $('#aiKaydet').onclick = () => { const a = $('#aiYeni').value.trim(); if (!a) return toast('Anahtarı yazın.'); gonder(a); };
        $('#aiSil').onclick = () => gonder('');
      }
    }
    const kKart = $('#yEkle') && $('#yEkle').closest('.kart');
    if (kKart) {
      const ciz = () => {
        const K = oku('exs-kullanicilar', {}) || {}, ben = window.EXIT_OTURUM ? EXIT_OTURUM.kul : '';
        const ROL = { yonetici: 'Yönetici', temsilci: 'Temsilci' }, rol = u => u.rol || (u.kul === 'satis' ? 'yonetici' : 'temsilci');
        kKart.innerHTML = `<h3>Satış ekibi kullanıcıları</h3><div class="alt">Panele giriş yapabilecek kişiler. Yeni kullanıcıya geçici şifre verilir; ilk girişte kendi şifresini belirler. Rol ve bayi ataması "Temsilciler ve işlem kaydı" ekranındadır.</div>
          <table class="tablo">${Object.values(K).filter(u => u && u.kul).map(u => `<tr><td><b>${esc(u.kul)}</b><div class="kucuk">${esc(u.ad || '')} · ${ROL[rol(u)]}${u.sifreDegistir ? ' · ilk giriş bekleniyor' : ''}</div></td><td class="sag-hiza">${u.kul === ben ? '<span class="kucuk">siz</span>' : yon ? `<button class="btn kucuk cizgi" data-ksil="${esc(u.kul)}">Sil</button>` : ''}</td></tr>`).join('')}</table>
          ${yon ? `<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;margin-top:12px"><div class="alan"><label>Kullanıcı adı</label><input id="kyKul"></div><div class="alan"><label>Ad soyad</label><input id="kyAd"></div><div class="alan"><label>Rol</label><select id="kyRol"><option value="temsilci">Temsilci</option><option value="yonetici">Yönetici</option></select></div><div class="alan"><button class="btn" id="kyEkle">Ekle</button></div></div><div id="kySonuc" style="margin-top:8px"></div>` : ''}`;
        kKart.querySelectorAll('[data-ksil]').forEach(b => b.onclick = async () => {
          if (b.dataset.onay !== '1') { b.dataset.onay = '1'; b.textContent = 'Emin misiniz?'; return; }
          const r = await EXIT_API('api/kullanici-sil', { kul: b.dataset.ksil }); if (!r.ok) return toast(r.hata || 'Silinemedi.');
          const K2 = oku('exs-kullanicilar', {}) || {}; delete K2[b.dataset.ksil]; try { localStorage.setItem('exs-kullanicilar', JSON.stringify(K2)); } catch (x) {}
          toast('Kullanıcı silindi.'); ciz();
        });
        const e = kKart.querySelector('#kyEkle'); if (e) e.onclick = async () => {
          const kul = $('#kyKul').value.trim().toLowerCase(), r = await EXIT_API('api/kullanici-ekle', { kul, ad: $('#kyAd').value.trim(), rol: $('#kyRol').value });
          if (!r.ok) return $('#kySonuc').innerHTML = `<span style="color:#b91c1c">${esc(r.hata || 'Eklenemedi.')}</span>`;
          const K2 = oku('exs-kullanicilar', {}) || {}; K2[kul] = { kul, ad: $('#kyAd').value.trim() || kul, rol: $('#kyRol').value, sifreDegistir: true }; try { localStorage.setItem('exs-kullanicilar', JSON.stringify(K2)); } catch (x) {}
          ciz();
          $('#kySonuc').innerHTML = `<div>${esc(kul)} için geçici şifre: <b id="kyGecici" style="font-family:ui-monospace,monospace;font-size:16px">${esc(r.gecici)}</b></div><div class="kucuk">Şifreyi kişiye güvenli bir kanaldan iletin; bir daha gösterilmez.</div>`;
        };
      };
      ciz();
    }
    return sonuc;
  };

  $('#cikis').onclick = async () => {
    await EXIT_API('api/cikis').catch(() => {});
    try { sessionStorage.removeItem('exs-oturum'); } catch (x) {}
    if (window.EXIT_YEREL_TEMIZLE) EXIT_YEREL_TEMIZLE();
    location.reload();
  };
})();
