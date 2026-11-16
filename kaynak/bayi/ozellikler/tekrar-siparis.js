// Siparişlerim: geçmiş siparişi tek tıkla sepete yeniden ekleme (güncel fiyatlarla).
(function () {
  function tekrarSiparis(no) {
    const o = oku('exb-siparisler', []).find(x => x.no === no); if (!o) return;
    const s = sepet(), eksik = []; let degisen = 0, eklenen = 0;
    o.kalemler.forEach(x => {
      const u = VERI.urunler.find(y => y.id === x.id) || VERI.urunler.find(y => y.ad === x.ad);
      if (!u) return eksik.push(x.ad + ' (artık katalogda yok)');
      const sc = x.secenek ? u.secenek.find(y => y.ad === x.secenek) : null;
      if (x.secenek && !sc) return eksik.push(x.ad + ' · ' + x.secenek + ' (seçenek kaldırılmış)');
      const birim = sc ? sc.fiyat : null; if (birim !== x.birim) degisen++;
      s.push({ ...x, id: u.id, ad: u.ad, kategori: u.kategori, birim, liste: sc ? sc.liste : null, kampanya: u.kmp ? u.kmp.ad + ' (%' + u.kmp.oran + ')' : '' }); eklenen++;
    });
    sepetKaydet(s);
    if (eksik.length) bilgiPenceresi('Tekrar sipariş', `<p>${eklenen} kalem sepete eklendi. Şu kalemler eklenemedi:</p><ul>${eksik.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`);
    else toast(eklenen + ' kalem sepete eklendi' + (degisen ? '; fiyatlar güncel listeye göre yenilendi.' : '.'));
    if (eklenen) $('#hSepet').click();
  }
  EK.siparislerTekrar = function () {
    $$('#s-siparisler .sk [data-dosya]').forEach(b => { if (b.nextElementSibling && b.nextElementSibling.classList.contains('sk-tekrar')) return;
      b.insertAdjacentHTML('afterend', `<button class="btn marka sk-tekrar" style="padding:6px 10px;font-size:12px" data-tekrar="${esc(b.dataset.dosya)}">Tekrar sipariş ver</button>`); });
    $$('[data-tekrar]').forEach(b => b.onclick = () => tekrarSiparis(b.dataset.tekrar));
  };
})();
