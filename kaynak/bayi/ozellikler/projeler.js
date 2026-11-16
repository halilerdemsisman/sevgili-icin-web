// Proje sepetleri: her müşteri/iş için ayrı sepet; sepete aç, projeye kaydet, siparişe proje adı.
(function () {
  const pencere = pencereAc;
  const zaman = t => new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  const sepetTop = L => L.reduce((a, x) => a + (x.birim || 0) * x.adet, 0);

  // ================= 4. proje sepetleri =================
  const prOku = () => (ben && oku('exb-proje-' + ben.kul, [])) || [];
  const prYaz = L => yaz('exb-proje-' + ben.kul, L);
  const aktifPr = () => { try { return sessionStorage.getItem('exb-aktif-proje') || ''; } catch (e) { return ''; } };
  const aktifPrAyarla = id => { try { id ? sessionStorage.setItem('exb-aktif-proje', id) : sessionStorage.removeItem('exb-aktif-proje'); } catch (e) {} };
  const hs = $('#hSepet');
  if (hs && !$('[data-git=projeler]')) hs.insertAdjacentHTML('beforebegin', `<button class="h-btn" data-git="projeler"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><span class="y">Projeler</span></button>`);
  if (!$('#s-projeler')) $('#s-cari').insertAdjacentHTML('afterend', '<section id="s-projeler" class="sayfa gizli"></section>');
  EK.projeler = () => projeler();
  function projeler() {
    const L = prOku().slice().sort((a, b) => b.guncel - a.guncel), ak = aktifPr();
    $('#s-projeler').innerHTML = `<h2>Proje sepetleri</h2><p class="kucuk">Her müşteriniz veya işiniz için ayrı sepet hazırlayın. Hazır olduğunda sepete aktarıp sipariş verin; sipariş hangi projeden verildiyse Siparişlerim'de o adla görünür.</p>
      <div class="pr-yeni"><input id="prYeniAd" placeholder="Yeni proje adı, örn. Otel Mavi Koy havuz başı"><button class="btn marka" id="prYeni">Proje oluştur</button>${sepet().length ? '<button class="btn cizgi" id="prSepettenYeni">Mevcut sepetten oluştur</button>' : ''}</div>
      ${L.length ? `<div class="pr-izgara">${L.map(p => `<div class="pr-kart" data-pr="${p.id}"><div class="ust"><div><h3>${esc(p.ad)}</h3><div class="kucuk">Güncelleme: ${zaman(p.guncel)}</div></div>${ak === p.id ? '<span class="pr-etiket">Sepette açık</span>' : ''}</div>
          <div class="bilgi"><span><b>${p.kalemler.length}</b> kalem</span><span><b>${p.kalemler.reduce((a, x) => a + x.adet, 0)}</b> adet</span><span><b>${para(sepetTop(p.kalemler))}</b>${p.kalemler.some(x => x.birim == null) ? ' +' : ''}</span>${(p.siparisler || []).length ? `<span>Sipariş: <b>${esc(p.siparisler.join(', '))}</b></span>` : ''}</div>
          ${p.kalemler.length ? `<details><summary>Kalemleri göster</summary>${p.kalemler.map(x => `<div><b>${x.adet} × ${esc(x.ad)}</b><div class="kucuk">${detay(x)}</div></div>`).join('')}</details>` : '<div class="kucuk">Henüz kalem yok. Sepete ürün ekleyip “Projeye kaydet” ile bu projeye aktarın.</div>'}
          <div class="dg"><button class="btn marka" data-pa="ac">Sepette aç</button><button class="btn cizgi" data-pa="kaydet">Sepeti buraya kaydet</button><button class="btn cizgi" data-pa="kopya">Kopyala</button><button class="btn cizgi" data-pa="sil">Sil</button></div></div>`).join('')}</div>`
        : '<div class="bos-durum">Henüz projeniz yok. Yukarıdan bir proje oluşturun.</div>'}`;
    const yeni = kalemler => { const ad = $('#prYeniAd').value.trim(); if (!ad) { $('#prYeniAd').focus(); return toast('Proje adı yazın.'); } const L = prOku(); L.push({ id: 'p' + Date.now().toString(36), ad, kalemler, tarih: Date.now(), guncel: Date.now(), siparisler: [] }); prYaz(L); toast('“' + ad + '” projesi oluşturuldu.'); projeler(); };
    $('#prYeni').onclick = () => yeni([]); if ($('#prSepettenYeni')) $('#prSepettenYeni').onclick = () => yeni(sepet());
    $('#prYeniAd').onkeydown = e => { if (e.key === 'Enter') yeni([]); };
    $$('#s-projeler [data-pa]').forEach(b => b.onclick = () => {
      const id = b.closest('[data-pr]').dataset.pr, L = prOku(), p = L.find(x => x.id === id); if (!p) return;
      if (b.dataset.pa === 'ac') { sepetKaydet(JSON.parse(JSON.stringify(p.kalemler))); aktifPrAyarla(id); toast('“' + p.ad + '” sepette açıldı.'); projeler(); $('#hSepet').click(); }
      if (b.dataset.pa === 'kaydet') { p.kalemler = sepet(); p.guncel = Date.now(); prYaz(L); toast('Sepet “' + p.ad + '” projesine kaydedildi.'); projeler(); }
      if (b.dataset.pa === 'kopya') { L.push({ ...JSON.parse(JSON.stringify(p)), id: 'p' + Date.now().toString(36), ad: p.ad + ' (kopya)', tarih: Date.now(), guncel: Date.now(), siparisler: [] }); prYaz(L); projeler(); }
      if (b.dataset.pa === 'sil') { if (!b.dataset.emin) { b.dataset.emin = 1; b.textContent = 'Silinsin mi?'; b.classList.add('marka'); return; } prYaz(L.filter(x => x.id !== id)); if (aktifPr() === id) aktifPrAyarla(''); toast('Proje silindi.'); projeler(); }
    });
  }
  // sepet çekmecesine proje çubuğu
  const _sepetAcP = $('#hSepet').onclick;
  $('#hSepet').onclick = () => {
    _sepetAcP(); const c = $$('.perde').pop(); if (!c || !c.querySelector('.cekmece')) return;
    let m = false;
    const ekle = () => {
      if (m || c.querySelector('.c-proje')) return; const ust = c.querySelector('.c-toplu') || c.querySelector('.c-ust'); if (!ust || !sepet().length && !prOku().length) return; m = true;
      try {
        const L = prOku(), ak = aktifPr(), akp = L.find(x => x.id === ak);
        ust.insertAdjacentHTML('afterend', `<div class="c-proje"><b>${akp ? 'Proje: ' + esc(akp.ad) : 'Projeye kaydet'}</b><select id="cpSec" aria-label="Proje"><option value="">Yeni proje…</option>${L.map(p => `<option value="${p.id}" ${p.id === ak ? 'selected' : ''}>${esc(p.ad)}</option>`).join('')}</select>
          <input type="text" id="cpAd" placeholder="Proje adı" ${akp ? 'style="display:none"' : ''}><button class="btn cizgi" id="cpKay">Projeye kaydet</button>
          <label><input type="checkbox" id="cpBos"> Kaydettikten sonra sepeti boşalt</label></div>`);
        const sec = c.querySelector('#cpSec'), ad = c.querySelector('#cpAd');
        sec.onchange = () => { ad.style.display = sec.value ? 'none' : ''; };
        c.querySelector('#cpKay').onclick = () => {
          const s = sepet(); if (!s.length) return toast('Sepet boş.');
          const L = prOku(); let p = L.find(x => x.id === sec.value);
          if (!p) { const a = ad.value.trim(); if (!a) { ad.focus(); return toast('Proje adı yazın.'); } p = { id: 'p' + Date.now().toString(36), ad: a, tarih: Date.now(), siparisler: [] }; L.push(p); }
          p.kalemler = s; p.guncel = Date.now(); prYaz(L); aktifPrAyarla(p.id); toast('Sepet “' + p.ad + '” projesine kaydedildi.');
          if (c.querySelector('#cpBos').checked) { sepetKaydet([]); aktifPrAyarla(''); }
          c.remove(); $('#hSepet').click();
        };
      } finally { m = false; }
    };
    ekle(); new MutationObserver(ekle).observe(c, { childList: true, subtree: true });
  };
  // sipariş verilince projeyi işaretle
  EK.siparisProje = function (o) {
    const ak = aktifPr(), L = prOku(), p = L.find(x => x.id === ak);
    if (p && !o.proje) { o.proje = p.ad; p.siparisler = [...(p.siparisler || []), o.no]; p.guncel = Date.now(); prYaz(L); aktifPrAyarla('');
      kayitGuncelle('siparisler', o.no, { proje: p.ad }).catch(e => console.warn('proje kaydedilemedi:', e.message)); }
  };
  EK.siparisKartiProje = function (o, h) { if (o.proje) h = h.replace(`<b>${o.no}</b>`, `<b>${o.no}</b> <span class="pr-etiket">${esc(o.proje)}</span>`); return h; };

  // gezinme
    $$('[data-git]').forEach(b => b.onclick = () => git(b.dataset.git));
  const _cikP = $('#hCikis').onclick; $('#hCikis').onclick = () => { aktifPrAyarla(''); _cikP && _cikP(); };
})();
