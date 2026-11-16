// Online ödeme: bayiye özel ödeme linki sayfası (/odeme), cari hesabımda ve sipariş kartında ödeme düğmesi.
(function () {
  const usd = n => (Math.round((n || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
  const sayi10 = v => parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  // sayfa iskeleti
  $('#s-cari').insertAdjacentHTML('afterend', '<section id="s-odeme" class="sayfa gizli"></section>');

  // ================= ödeme linki =================
  const link = () => ((oku('exb-odeme-link', {}) || {})[ben.kul] || '').trim();
  function bakiye() { const c = (oku('exb-cari', {}) || {})[ben.kul]; if (!c || !c.hareket) return null; return c.hareket.reduce((a, h) => a + (h.tip === 'fatura' ? h.tutar : h.tip === 'odeme' ? -h.tutar : 0), 0); }
  let odOn = null; window.siparisOde = (no, t) => { odOn = { no, t }; git('odeme'); };
  EK.odemeSayfa = () => odemeSayfa();
  function odemeSayfa() {
    const on = odOn; odOn = null; const L = link(), b = on ? on.t : bakiye(), Od = (oku('exb-odeme', []) || []).filter(o => o.kul === ben.kul && o.online).sort((a, c) => c.zaman - a.zaman).slice(0, 8);
    $('#s-odeme').innerHTML = `<div class="od-sayfa"><div class="of-kart"><div class="kucuk">${esc(ben.firma || ben.ad || ben.kul)} · Bayiye özel ödeme</div><h2 style="margin:6px 0 2px">Online ödeme</h2>
      ${b != null ? `<div class="kucuk">${on ? esc(on.no) + ' siparişi · ödenecek iskontolu net tutar' : 'Güncel cari bakiyeniz'}</div><div class="buyuk">${usd(Math.max(0, b))}</div>` : ''}
      ${L ? `<label>Ödenecek tutar (USD)</label><input id="odTut" inputmode="decimal" value="${b > 0 ? String(Math.round(b * 100) / 100).replace('.', ',') : ''}">
        <label>Açıklama</label><input id="odNot" placeholder="Örn. EXG-2026-0012 siparişi" value="${on ? esc(on.no) + ' siparişi' : ''}">
        <div class="hata" id="odHata"></div>
        <button class="btn marka" id="odGit" style="width:100%;margin-top:14px;padding:14px;font-size:16px">Ödeme ekranına geç</button>
        <p class="kucuk" style="margin-top:10px">Size özel ödeme sayfası yeni sekmede açılır. Ödemeyi tamamladıktan sonra tutar, satış ekibinin onayıyla cari hesabınıza tahsilat olarak işlenir.</p>`
        : '<p style="margin-top:14px">Hesabınıza henüz ödeme linki tanımlanmadı. Satış temsilcinizle iletişime geçin ya da <b>Cari hesabım › Ödeme bildir</b> ile havale bildirimi yapın.</p>'}
      <button class="btn cizgi" id="odGeri" style="margin-top:8px">Cari hesaba dön</button></div>
      ${Od.length ? `<div class="of-kart"><h3 style="margin-top:0">Online ödemelerim</h3><table class="of-tablo"><tr><th>No</th><th>Tarih</th><th style="text-align:right">Tutar</th><th>Durum</th></tr>${Od.map(o => `<tr><td><b>${esc(o.no)}</b></td><td>${tarih(o.tarih)}</td><td style="text-align:right">${usd(o.tutar)}</td><td><span class="dz ${o.durum}">${{ bekliyor: 'Kontrol ediliyor', onaylandi: 'Tahsil edildi', reddedildi: 'Görülmedi' }[o.durum] || o.durum}</span></td></tr>`).join('')}</table></div>` : ''}</div>`;
    $('#odGeri').onclick = () => git('cari');
    const g = $('#odGit'); if (g) g.onclick = () => { const t = sayi10($('#odTut').value); if (!(t > 0)) return $('#odHata').textContent = 'Tutarı yazın.';
      // pencere tıklamayla hemen açılır (açılır pencere engellenmesin); bildirim ardından kaydedilir
      const w = window.open(L, '_blank'); try { if (w) w.opener = null; } catch (e) {}
      bekleyerek(g, async () => {
        try { await kayitEkle('odemeler', { tutar: t, tarih: new Date().toISOString().slice(0, 10), yontem: 'Online ödeme linki', ref: '', not: $('#odNot').value.trim(), dosya: null, durum: 'bekliyor', online: true, siparis: on ? on.no : '' }, 'OL'); }
        catch (e) { toast('Ödeme bildiriminiz kaydedilemedi: ' + e.message + ' Ödemeyi yaptıysanız Cari hesabım › Ödeme bildir ile bildirin.'); }
        toast(w ? 'Ödeme sayfası açıldı. Ödemeniz satış ekibine bildirildi.' : 'Açılır pencere engellendi; ödeme sayfası bu sekmede açılıyor.'); if (!w) location.href = L; else odemeSayfa();
      }); };
  }
  EK.cariOnlineOdeme = function () { const s = $('#s-cari'), ob = $('#obAc'); if (!s || !ob || $('#olAc')) return; ob.insertAdjacentHTML('beforebegin', '<button class="btn" id="olAc" style="float:right;margin-top:-40px;margin-right:130px;background:#16a34a;color:#fff">Online öde</button>'); $('#olAc').onclick = () => git('odeme'); };
})();
