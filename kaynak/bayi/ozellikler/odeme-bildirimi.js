// Ödeme bildirimi (havale/EFT dekontu): cari hesabımda form ve bildirimlerim tablosu.
(function () {
  const pencere = pencereAc;
  const sayi = sayiTR;

  // ================= 7. ödeme bildirimi =================
  const YONTEM = ['Havale / EFT', 'Kredi kartı', 'Çek', 'Senet', 'Nakit'];
  const ODZ = { bekliyor: 'İnceleniyor', onaylandi: 'Tahsilat işlendi', reddedildi: 'Reddedildi' };
  function dosyaHazirla(f) {
    return new Promise((ok, red) => {
      if (f.size > 8 * 1024 * 1024) return red('Dosya 8 MB’tan büyük.');
      const r = new FileReader(); r.onerror = () => red('Dosya okunamadı.');
      if (/^image\//.test(f.type)) { r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok({ ad: f.name, tip: 'image/jpeg', veri: c.toDataURL('image/jpeg', .8) }); }; im.onerror = () => red('Görsel açılamadı.'); im.src = r.result; }; r.readAsDataURL(f); }
      else { if (f.size > 1.5 * 1024 * 1024) return red('PDF en fazla 1,5 MB olabilir; dekontun fotoğrafını da yükleyebilirsiniz.'); r.onload = () => ok({ ad: f.name, tip: f.type || 'application/pdf', veri: r.result }); r.readAsDataURL(f); }
    });
  }
  function odemeForm() {
    let dosya = null;
    const p = pencere(`<h3>Ödeme bildir</h3><p class="kucuk">Yaptığınız ödemeyi bildirin; satış ekibi dekontu kontrol edip cari hesabınıza işler.</p>
      <div class="ikili"><div class="alan"><label>Tutar (USD)</label><input id="obTut" inputmode="decimal" placeholder="0"></div><div class="alan"><label>Ödeme tarihi</label><input id="obTar" type="date" value="${bugun()}"></div></div>
      <div class="ikili"><div class="alan"><label>Ödeme yöntemi</label><select id="obYon">${YONTEM.map(y => `<option>${y}</option>`).join('')}</select></div><div class="alan"><label>Banka / referans no</label><input id="obRef"></div></div>
      <div class="alan"><label>Açıklama</label><input id="obNot" placeholder="Örn. EXG-2026-0012 siparişi için"></div>
      <div class="alan"><label>Dekont (fotoğraf veya PDF)</label><div style="display:flex;gap:8px;align-items:center"><button class="btn cizgi" id="obDos" type="button">Dosya seç</button><span class="kucuk" id="obDosAd">Seçilmedi</span></div></div>
      <div class="hata" id="obHata"></div><div class="alt-d"><button class="btn cizgi" id="obVaz">Vazgeç</button><button class="btn marka" id="obGon">Bildir</button></div>`);
    p.querySelector('#obVaz').onclick = () => p.remove();
    p.querySelector('#obDos').onclick = () => dosyaSec('image/*,application/pdf', async f => { try { p.querySelector('#obDosAd').textContent = 'Hazırlanıyor…'; dosya = await dosyaHazirla(f); p.querySelector('#obDosAd').textContent = f.name; } catch (e) { dosya = null; p.querySelector('#obDosAd').textContent = 'Seçilmedi'; toast(String(e)); } });
    const gon = p.querySelector('#obGon');
    gon.onclick = () => {
      const t = sayi(p.querySelector('#obTut').value); if (!(t > 0)) return p.querySelector('#obHata').textContent = 'Tutarı yazın.';
      bekleyerek(gon, async () => {
        try { await kayitEkle('odemeler', { tutar: t, tarih: p.querySelector('#obTar').value || bugun(), yontem: p.querySelector('#obYon').value, ref: p.querySelector('#obRef').value.trim(), not: p.querySelector('#obNot').value.trim(), dosya, durum: 'bekliyor' }, 'OB'); }
        catch (e) { return p.querySelector('#obHata').textContent = e.message; }
        p.remove(); toast('Ödeme bildiriminiz satış ekibine iletildi.'); cariSayfa();
      });
    };
  }
  EK.cariOdemeBildirimi = function () {
    const s = $('#s-cari'); if (!s || !ben) return;
    const h = s.querySelector('h2'); if (h && !s.querySelector('#obAc')) { h.insertAdjacentHTML('afterend', '<button class="btn marka" id="obAc" style="float:right;margin-top:-40px">Ödeme bildir</button>'); $('#obAc').onclick = odemeForm; }
    const L = oku('exb-odeme', []).filter(o => o.kul === ben.kul).sort((a, b) => b.zaman - a.zaman);
    const oz = s.querySelector('.sk-ozet');
    if (L.length && oz) oz.insertAdjacentHTML('afterend', `<div class="kart-b"><h3>Ödeme bildirimlerim</h3><table class="tl-tablo"><tr><th>No</th><th>Ödeme tarihi</th><th>Yöntem</th><th style="text-align:right">Tutar</th><th>Durum</th></tr>
      ${L.map(o => `<tr><td><b>${esc(o.no)}</b>${o.not ? `<div class="kucuk">${esc(o.not)}</div>` : ''}</td><td>${tarih(o.tarih)}</td><td>${esc(o.yontem)}</td><td style="text-align:right"><b>${para(o.tutar)}</b></td><td><span class="dz ${o.durum}">${ODZ[o.durum]}</span>${o.redNot ? `<div class="kucuk">${esc(o.redNot)}</div>` : ''}</td></tr>`).join('')}</table></div>`);
  };
})();
