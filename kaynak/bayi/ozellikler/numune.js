// Numune ve katalog talebi: form, ürün penceresinde ve katalogda düğme, Siparişlerim'de taleplerim.
(function () {
  const pencere = pencereAc;

  // ================= 8. numune ve katalog talebi =================
  const NTUR = ['Kumaş kartelası', 'İskelet renk kartelası', 'File numunesi', 'Kumaş numunesi', 'Ürün numunesi', 'Basılı katalog'];
  const NDZ = { yeni: 'Alındı', hazirlaniyor: 'Hazırlanıyor', gonderildi: 'Gönderildi', iptal: 'İptal' };
  // ürün penceresinde "Bu ürün için numune iste" (açıklamanın altında; pencere yeniden çizilince yeniden eklenir)
  EK.urunNumune = function (p, u) {
    const ekle = () => { const bi = p.querySelector('.p-bilgi .aciklama'); if (!bi || p.querySelector('[data-numune-urun]')) return;
      bi.insertAdjacentHTML('afterend', `<button class="btn cizgi" data-numune-urun style="padding:6px 10px;font-size:12px;margin:2px 0 8px">Bu ürün için numune iste</button>`); p.querySelector('[data-numune-urun]').onclick = () => numuneForm(u.ad); };
    ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
  };
  // katalog araç çubuğunda "Numune / katalog iste"
  EK.katalogNumune = function () {
    const kp = $('#katPdf'); if (kp && !$('#numuneBtn')) { kp.insertAdjacentHTML('afterend', '<button class="btn cizgi" id="numuneBtn" style="padding:8px 12px;font-size:13px">Numune / katalog iste</button>'); $('#numuneBtn').onclick = () => numuneForm(''); }
  };
  function numuneForm(urun) {
    const p = pencere(`<h3>Numune / katalog talebi</h3><p class="kucuk">Talebiniz satış ekibine iletilir; gönderildiğinde kargo bilgisi Siparişlerim sayfasında görünür.</p>
      <div class="alan"><label>Ne istiyorsunuz?</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${NTUR.map((t, i) => `<label class="f-sec" style="font-size:13px"><input type="checkbox" value="${t}" ${(!urun && i === 0) || (urun && t === 'Ürün numunesi') ? 'checked' : ''}> ${t}</label>`).join('')}</div></div>
      <div class="ikili"><div class="alan"><label>İlgili ürün</label><select id="nmUrun"><option value="">—</option>${VERI.urunler.map(u => `<option ${u.ad === urun ? 'selected' : ''}>${esc(u.ad)}</option>`).join('')}</select></div><div class="alan"><label>Adet</label><input id="nmAdet" inputmode="numeric" value="1"></div></div>
      <div class="alan"><label>Renk / kumaş kodu (isteğe bağlı)</label><input id="nmKod" placeholder="Örn. BG09, RAL 7016, Terra 05"></div>
      <div class="alan"><label>Gönderim adresi</label><textarea id="nmAdr" rows="2">${esc([ben.firma, ben.sehir].filter(Boolean).join(', '))}</textarea></div>
      <div class="alan"><label>Not</label><input id="nmNot"></div><div class="hata" id="nmHata"></div>
      <div class="alt-d"><button class="btn cizgi" id="nmVaz">Vazgeç</button><button class="btn marka" id="nmGon">Talebi gönder</button></div>`);
    p.querySelector('#nmVaz').onclick = () => p.remove();
    const gon = p.querySelector('#nmGon');
    gon.onclick = () => {
      const tur = [...p.querySelectorAll('input[type=checkbox]:checked')].map(x => x.value); if (!tur.length) return p.querySelector('#nmHata').textContent = 'En az bir tür seçin.';
      const adr = p.querySelector('#nmAdr').value.trim(); if (!adr) return p.querySelector('#nmHata').textContent = 'Gönderim adresini yazın.';
      bekleyerek(gon, async () => {
        let x; try { x = await kayitEkle('numuneler', { tel: ben.tel, tur, urun: p.querySelector('#nmUrun').value, adet: Math.max(1, parseInt(p.querySelector('#nmAdet').value) || 1), kod: p.querySelector('#nmKod').value.trim(), adres: adr, not: p.querySelector('#nmNot').value.trim(), durum: 'yeni' }); }
        catch (e) { return p.querySelector('#nmHata').textContent = e.message; }
        p.remove(); toast('Numune talebiniz alındı: ' + x.no);
        if (!$('#s-siparisler').classList.contains('gizli')) siparislerim();
      });
    };
  }
  EK.siparislerNumune = function () {
    if (!ben) return;
    const L = oku('exb-numune', []).filter(o => o.kul === ben.kul).sort((a, b) => b.zaman - a.zaman), s = $('#s-siparisler');
    s.insertAdjacentHTML('beforeend', `<div class="kart-b" style="margin-top:18px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3 style="margin:0">Numune ve katalog talepleri</h3><button class="btn cizgi" id="nmYeni" style="padding:6px 10px;font-size:12px">Yeni talep</button></div>
      ${L.length ? `<table class="tl-tablo" style="margin-top:10px"><tr><th>No</th><th>Tarih</th><th>Talep</th><th>Durum</th><th>Kargo</th></tr>${L.map(o => `<tr><td><b>${esc(o.no)}</b></td><td>${tarih(o.zaman)}</td><td>${esc(o.tur.join(', '))}${o.urun ? `<div class="kucuk">${esc(o.urun)}${o.kod ? ' · ' + esc(o.kod) : ''} · ${o.adet} adet</div>` : ''}</td><td><span class="dz ${o.durum}">${NDZ[o.durum]}</span></td><td class="kucuk">${esc([o.kargo, o.takip].filter(Boolean).join(' · ') || '—')}</td></tr>`).join('')}</table>` : '<p class="kucuk">Henüz talebiniz yok. Kumaş kartelası, renk kartelası, numune veya basılı katalog isteyebilirsiniz.</p>'}</div>`);
    $('#nmYeni').onclick = () => numuneForm('');
  };
})();
