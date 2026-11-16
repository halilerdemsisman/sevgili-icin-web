// Siparişlerim: sık aldıklarım (tek tıkla sepete).
(function () {
  const benim = () => oku('exb-siparisler', []).filter(o => ben && o.kul === ben.kul);

  // ================= 3. Sık aldıklarım =================
  function sikAlinan() {
    const C = {}; benim().filter(o => o.durum !== 'iptal').forEach(o => o.kalemler.forEach(x => { const k = x.ad + '|' + (x.secenek || ''); const c = C[k] = C[k] || { x, sip: 0, adet: 0, son: 0 }; c.sip++; c.adet += x.adet; if (o.tarih > c.son) { c.son = o.tarih; c.x = x; } }));
    return Object.values(C).sort((a, b) => b.sip - a.sip || b.adet - a.adet).slice(0, 8);
  }
  function sikEkle(c, adet) {
    const x = c.x, u = VERI.urunler.find(y => y.id === x.id) || VERI.urunler.find(y => y.ad === x.ad); if (!u) return toast(x.ad + ' artık katalogda yok.');
    const sc = x.secenek ? u.secenek.find(y => y.ad === x.secenek) : null; if (x.secenek && !sc) return toast('Bu seçenek artık satılmıyor.');
    const s = sepet(); s.push({ ...x, adet, id: u.id, ad: u.ad, kategori: u.kategori, birim: sc ? sc.fiyat : null, liste: sc ? sc.liste : null, kampanya: u.kmp ? u.kmp.ad + ' (%' + u.kmp.oran + ')' : '' }); sepetKaydet(s); toast(`${u.ad} × ${adet} sepete eklendi.`);
  }
  EK.siparislerSikAlinan = function () {
    const L = sikAlinan(); if (!L.length) return; const h = $('#s-siparisler h2'); if (!h || $('#saBlok')) return;
    (h.nextElementSibling || h).insertAdjacentHTML('afterend', `<div id="saBlok"><h3 style="margin:14px 0 0;font-size:15px;color:inherit">Sık aldıklarım</h3><div class="sa-izgara">${L.map((c, i) => { const u = VERI.urunler.find(y => y.id === c.x.id) || VERI.urunler.find(y => y.ad === c.x.ad), sc = u && c.x.secenek ? u.secenek.find(y => y.ad === c.x.secenek) : null, f = sc ? sc.fiyat : null;
      return `<div class="sa-k"><b>${esc(c.x.ad)}</b><span class="kucuk">${esc(c.x.secenek || '')}</span><span class="kucuk">${c.sip} siparişte · toplam ${c.adet} adet${f != null ? ' · ' + para(f) : ''}</span><div class="sa-alt"><input type="number" min="1" value="${Math.max(1, Math.round(c.adet / c.sip))}" data-saa="${i}" aria-label="Adet"><button class="btn marka" data-sa="${i}" style="padding:7px 12px;font-size:12.5px" ${u ? '' : 'disabled title="Katalogda yok"'}>Sepete ekle</button></div></div>`; }).join('')}</div></div>`);
    $$('[data-sa]').forEach(b => b.onclick = () => sikEkle(L[+b.dataset.sa], Math.max(1, parseInt($(`[data-saa="${b.dataset.sa}"]`).value) || 1)));
  };
})();
