// Sepet çekmecesi ve sipariş gönderme.
// ---------- sepet
const sepet = () => oku('exb-sepet-' + ben.kul, []);
function sepetKaydet(s) { yaz('exb-sepet-' + ben.kul, s); sepetSay(); EK.hatirlatmaRozeti?.(); }
function sepetSay() { const n = sepet().reduce((a, x) => a + x.adet, 0); $('#sepetSay').textContent = n; $('#sepetSay').classList.toggle('gizli', !n); }
const detay = x => [x.secenek, x.iskelet && 'İskelet: ' + x.iskelet, x.file && 'File: ' + x.file, x.kumas && 'Kumaş: ' + x.kumas, x.fitil && 'Fitil: ' + x.fitil, x.not && 'Not: ' + x.not].filter(Boolean).map(esc).join('<br>');
$('#hSepet').onclick = () => {
  const c = document.createElement('div'); c.className = 'perde'; c.style.padding = 0; c.onclick = e => { if (e.target === c) c.remove(); };
  document.body.appendChild(c);
  function ciz() {
    const s = sepet(), top = s.reduce((a, x) => a + (x.birim || 0) * x.adet, 0), teklif = s.some(x => x.birim == null);
    c.innerHTML = `<div class="cekmece"><div class="c-ust"><h3>Sepet (${s.length})</h3><button>×</button></div>
      <div class="c-liste">${s.map((x, i) => { const u = VERI.urunler.find(y => y.id === x.id); return `<div class="s-kalem"><div class="f" style="${u && u.gorsel ? `background-image:url(${u.gorsel})` : ''}"></div>
        <div><b>${esc(x.ad)}</b><div class="d">${detay(x)}</div>
        <div class="adet" style="margin-top:6px"><button data-i="${i}" data-d="-1" style="height:28px;width:28px">−</button><input value="${x.adet}" data-i="${i}" style="height:28px;width:40px"><button data-i="${i}" data-d="1" style="height:28px;width:28px">+</button></div></div>
        <div class="sag">${x.birim == null ? 'Teklif' : para(x.birim * x.adet)}<button data-sil="${i}">Kaldır</button></div></div>`; }).join('') || '<div class="bos-durum">Sepetiniz boş.</div>'}</div>
      ${s.length ? `<div class="c-alt"><div class="top"><span>Toplam</span><span>${para(top)}${teklif ? ' +' : ''}</span></div>
        ${teklif ? '<p class="kucuk">Fiyatı olmayan kalemler için teklif hazırlanacak.</p>' : ''}
        <div class="alan"><label>Teslimat adresi / not</label><textarea id="sAdres" rows="2" placeholder="Teslimat adresi, istenen tarih vb.">${esc(ben.sehir || '')}</textarea></div>
        <button class="btn marka tam" id="sGonder">Sipariş talebini gönder</button>
        <p class="kucuk" style="text-align:center">Fiyatlar USD, KDV hariçtir. Talebiniz satış ekibinin onayıyla kesinleşir.</p></div>` : ''}</div>`;
    c.querySelector('.c-ust button').onclick = () => c.remove();
    c.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const s = sepet(); s[b.dataset.i].adet = Math.max(1, s[b.dataset.i].adet + +b.dataset.d); sepetKaydet(s); ciz(); });
    c.querySelectorAll('.c-liste input').forEach(i => i.onchange = () => { const s = sepet(); s[i.dataset.i].adet = Math.max(1, parseInt(i.value) || 1); sepetKaydet(s); ciz(); });
    c.querySelectorAll('[data-sil]').forEach(b => b.onclick = () => { const s = sepet(); s.splice(+b.dataset.sil, 1); sepetKaydet(s); ciz(); });
    const g = c.querySelector('#sGonder'); if (g) g.onclick = () => bekleyerek(g, async () => {
      const o = await kayitEkle('siparisler', { tarih: Date.now(), kalemler: sepet(), toplam: top, teklif, adres: c.querySelector('#sAdres').value.trim(), durum: 'yeni', kaynak: 'web' });
      sepetKaydet([]); c.remove();
      // fiyatı sunucu belirler: sepette beklerken kampanya bittiyse veya fiyat değiştiyse bayi görsün
      toast('Sipariş talebiniz alındı: ' + o.no + (Math.abs((o.toplam || 0) - top) > 0.01 ? ' · Güncel fiyatlarla toplam ' + para(o.toplam) : ''));
      siparisDosyasi(o); git('siparisler');
    });
  }
  ciz();
};

// Yeni siparişe proje ve tahmini teslim eklenir. Sunucusuz kullanımda sipariş, satış ekibinin uygulamasına
// aktarılabilen bir dosya olarak da indirilir; sunucuya bağlıyken dosya inmez, sipariş doğrudan satış ekibine gider.
function siparisDosyasi(o) {
  EK.siparisProje?.(o); EK.siparisTahminiTeslim?.(o);
  if (window.EXIT_SUNUCU) return;
  const veri = { tur: 'exit-bayi-siparis', surum: 1, musteri: { kul: ben.kul, firma: ben.firma, ad: ben.ad, tel: ben.tel, mail: ben.mail, sehir: ben.sehir, vergi: ben.vergi }, siparis: o };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(veri, null, 1)], { type: 'application/json' })); a.download = o.no + '.json'; a.click();
}
