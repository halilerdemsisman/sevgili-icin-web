
(function () {
  const ACIK = ['yeni', 'onay', 'uretim'];
  const perde = html => { const p = document.createElement('div'); p.className = 'perde form-p'; p.onclick = e => { if (e.target === p) p.remove(); }; p.innerHTML = `<div class="pencere" style="position:relative;max-width:620px"><button class="kapat" aria-label="Kapat">×</button>${html}</div>`; document.body.appendChild(p); p.querySelector('.kapat').onclick = () => p.remove(); return p; };
  const TD = { bekliyor: 'Satış ekibinin onayı bekleniyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
  // f kaydın kopyasını değiştirir; değişen alanlar sunucuya (veya yerel kayda) gönderilir
  function kaydet(no, f) { const o = oku('exb-siparisler', []).find(x => x.no === no); if (!o) return Promise.reject(new Error('Sipariş bulunamadı.'));
    const y = JSON.parse(JSON.stringify(o)); f(y); const d = {}; for (const a of Object.keys(y)) if (JSON.stringify(y[a]) !== JSON.stringify(o[a])) d[a] = y[a];
    return kayitGuncelle('siparisler', no, d); }
  function duzenle(no, iptalMi) {
    const o = oku('exb-siparisler', []).find(x => x.no === no); if (!o || !ACIK.includes(o.durum)) return toast('Bu sipariş artık değiştirilemez.');
    const dogrudan = o.durum === 'yeni';
    if (o.talep && o.talep.durum === 'bekliyor') return toast('Bu sipariş için zaten onay bekleyen bir talebiniz var.');
    const p = perde(`<h3>${iptalMi ? 'Siparişi iptal et' : 'Siparişi düzenle'} · ${esc(o.no)}</h3>
      <p class="kucuk">${dogrudan ? 'Siparişiniz henüz onaylanmadığı için değişiklik hemen uygulanır.' : 'Siparişiniz onaylandı / üretimde olduğu için değişiklik satış ekibine talep olarak gider; onaylanınca uygulanır.'}</p>
      ${iptalMi ? '' : `<div>${o.kalemler.map((x, i) => `<div class="sd-satir" data-sr="${i}"><div><b>${esc(x.ad)}</b><div class="kucuk">${esc(x.secenek || '')}${x.birim != null ? ' · ' + para(x.birim) : ''}</div></div><input type="number" min="0" value="${x.adet}" data-sd="${i}"></div>`).join('')}</div><p class="kucuk">Bir kalemi çıkarmak için adedini 0 yapın. Yeni ürün eklemek için yeni sipariş verin.</p>`}
      <label class="kucuk" style="display:block;margin-top:10px"><b>${iptalMi ? 'İptal nedeni' : 'Açıklama'}</b></label><textarea id="sdNot" rows="2" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--cizgi);border-radius:9px;font:inherit"></textarea>
      <button class="btn marka" id="sdOk" style="margin-top:12px;width:100%">${iptalMi ? (dogrudan ? 'Siparişi iptal et' : 'İptal talebi gönder') : (dogrudan ? 'Değişiklikleri kaydet' : 'Değişiklik talebi gönder')}</button>`);
    p.querySelectorAll('[data-sd]').forEach(i => i.oninput = () => p.querySelector(`[data-sr="${i.dataset.sd}"]`).classList.toggle('sil', !(+i.value > 0)));
    const ok = p.querySelector('#sdOk');
    ok.onclick = () => {
      const not = p.querySelector('#sdNot').value.trim(), simdi = Date.now();
      let K = null;
      if (!iptalMi) { K = o.kalemler.map((x, i) => ({ ...x, adet: Math.max(0, parseInt(p.querySelector(`[data-sd="${i}"]`).value) || 0) })).filter(x => x.adet > 0);
        if (K.every((x, i) => o.kalemler[i] && x.adet === o.kalemler[i].adet) && K.length === o.kalemler.length) return toast('Değişiklik yapmadınız.');
        if (!K.length) return toast('Tüm kalemleri çıkarmak için “Siparişi iptal et”i kullanın.'); }
      if (iptalMi && !dogrudan && !not) return toast('Lütfen iptal nedenini yazın.');
      bekleyerek(ok, () => kaydet(o.no, x => {
        if (dogrudan) {
          if (iptalMi) { x.durum = 'iptal'; (x.gecmis = x.gecmis || [{ durum: 'yeni', zaman: x.tarih }]).push({ durum: 'iptal', zaman: simdi, kim: 'Bayi' }); x.bayiIptal = { zaman: simdi, not }; }
          else { (x.revizyon = x.revizyon || []).push({ zaman: simdi, eski: x.kalemler, not }); x.kalemler = K; x.toplam = K.reduce((a, y) => a + (y.birim || 0) * y.adet, 0); x.teklif = K.some(y => y.birim == null); }
          x.rev = (x.rev || 0) + 1; x.revZaman = simdi;
        } else x.talep = { id: 't' + simdi.toString(36), tur: iptalMi ? 'iptal' : 'duzenle', kalemler: K, not, zaman: simdi, durum: 'bekliyor', durumAnda: x.durum };
      }).then(() => { p.remove(); toast(dogrudan ? (iptalMi ? 'Sipariş iptal edildi.' : 'Sipariş güncellendi.') : 'Talebiniz satış ekibine iletildi.'); siparislerim(); },
        e => { siparislerim(); throw e; }));
    };
  }
  const _sip7 = siparislerim;
  siparislerim = function () {
    _sip7.apply(this, arguments);
    const L = oku('exb-siparisler', []).filter(o => ben && o.kul === ben.kul);
    $$('#s-siparisler [data-dosya]').forEach(b => { const o = L.find(x => x.no === b.dataset.dosya); if (!o || b.nextElementSibling && b.nextElementSibling.classList.contains('sd-btns')) return;
      const t = o.talep;
      if (t) b.insertAdjacentHTML('beforebegin', `<div class="sd-talep ${t.durum === 'reddedildi' ? 'red' : t.durum === 'onaylandi' ? 'ok' : ''}"><b>${t.tur === 'iptal' ? 'İptal talebi' : 'Değişiklik talebi'}:</b> ${TD[t.durum]}${t.yanit ? ' · ' + esc(t.yanit) : ''}</div>`);
      if (o.bayiIptal && o.durum === 'iptal') b.insertAdjacentHTML('beforebegin', `<div class="sd-talep">Bu siparişi siz iptal ettiniz${o.bayiIptal.not ? ': ' + esc(o.bayiIptal.not) : ''}.</div>`);
      if (!ACIK.includes(o.durum) || (t && t.durum === 'bekliyor')) return;
      b.insertAdjacentHTML('afterend', `<span class="sd-btns"><button class="btn cizgi" style="padding:6px 10px;font-size:12px" data-sdd="${esc(o.no)}">${o.durum === 'yeni' ? 'Düzenle' : 'Değişiklik iste'}</button><button class="btn cizgi" style="padding:6px 10px;font-size:12px;color:#b91c1c" data-sdi="${esc(o.no)}">${o.durum === 'yeni' ? 'İptal et' : 'İptal iste'}</button></span>`); });
    $$('[data-sdd]').forEach(b => b.onclick = () => duzenle(b.dataset.sdd, false));
    $$('[data-sdi]').forEach(b => b.onclick = () => duzenle(b.dataset.sdi, true));
  };
})();
