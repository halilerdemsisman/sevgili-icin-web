
(function () {
  const sayi = v => parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')) || 0;
  const zaman = t => new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  function pencere(html, sinif) {
    const p = document.createElement('div'); p.className = 'perde ' + (sinif || 'form-p'); p.onclick = e => { if (e.target === p) p.remove(); };
    p.innerHTML = `<div class="pencere" style="position:relative"><button class="kapat" aria-label="Kapat">×</button>${html}</div>`; document.body.appendChild(p);
    p.querySelector('.kapat').onclick = () => p.remove(); return p;
  }
  const sepetTop = L => L.reduce((a, x) => a + (x.birim || 0) * x.adet, 0);

  // ================= 4. proje sepetleri =================
  const prOku = () => (ben && oku('exb-proje-' + ben.kul, [])) || [];
  const prYaz = L => yaz('exb-proje-' + ben.kul, L);
  const aktifPr = () => { try { return sessionStorage.getItem('exb-aktif-proje') || ''; } catch (e) { return ''; } };
  const aktifPrAyarla = id => { try { id ? sessionStorage.setItem('exb-aktif-proje', id) : sessionStorage.removeItem('exb-aktif-proje'); } catch (e) {} };
  const hs = $('#hSepet');
  if (hs && !$('[data-git=projeler]')) hs.insertAdjacentHTML('beforebegin', `<button class="h-btn" data-git="projeler"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><span class="y">Projeler</span></button>`);
  if (!$('#s-projeler')) $('#s-cari').insertAdjacentHTML('afterend', '<section id="s-projeler" class="sayfa gizli"></section>');
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
        ust.insertAdjacentHTML('afterend', `<div class="c-proje"><b>${akp ? 'Proje: ' + esc(akp.ad) : 'Projeye kaydet'}</b><select id="cpSec"><option value="">Yeni proje…</option>${L.map(p => `<option value="${p.id}" ${p.id === ak ? 'selected' : ''}>${esc(p.ad)}</option>`).join('')}</select>
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
  const _sdP = siparisDosyasi;
  siparisDosyasi = function (o) {
    const ak = aktifPr(), L = prOku(), p = L.find(x => x.id === ak);
    if (p && !o.proje) { o.proje = p.ad; p.siparisler = [...(p.siparisler || []), o.no]; p.guncel = Date.now(); prYaz(L); aktifPrAyarla('');
      kayitGuncelle('siparisler', o.no, { proje: p.ad }).catch(e => console.warn('proje kaydedilemedi:', e.message)); }
    return _sdP(o);
  };
  const _skP = siparisKarti;
  siparisKarti = function (o) { let h = _skP(o); if (o.proje) h = h.replace(`<b>${o.no}</b>`, `<b>${o.no}</b> <span class="pr-etiket">${esc(o.proje)}</span>`); return h; };

  // ================= 5. canlı renk önizleme =================
  const RENKHEX = { Granit: '#76766f', Seramik: '#d9d3c6', 'RAL 1013': '#EAE6CA', 'RAL 9016': '#F6F6F2', 'RAL 7006': '#75695C', 'RAL 7016': '#383E42', 'RAL 9005': '#0E0E10' };
  const FILEHEX = { 'Terra 01': ['#f4f4f0', '#d6d6cf'], 'Terra 05': ['#1c1c1c', '#3d3d3d'], 'Terra 02': ['#e8dec8', '#c9bc9f'], 'Terra 03': ['#8c7b66', '#6a5c4b'], 'Terra 04': ['#41464a', '#2a2e31'], 'Crome': ['#d8dde1', '#8e959b'] };
  window.onizleSvg = (...a) => onizleSvg(...a);
  function onizleSvg(kat, isk, fl, km, ft) {
    const fr = RENKHEX[isk] || '#9aa3ad', kumasUrl = km && VERI.kumas[km], fitilUrl = ft && VERI.kumas[ft];
    const dolgu = kumasUrl ? 'url(#pKm)' : fl ? 'url(#pFl)' : '#e2e8f0', fitil = fitilUrl ? 'url(#pFt)' : fr;
    const fh = FILEHEX[fl] || ['#e5e7eb', '#cbd5e1'];
    const defs = `<defs><pattern id="pFl" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${fh[0]}"/><rect width="2" height="6" fill="${fh[1]}"/></pattern>
      ${kumasUrl ? `<pattern id="pKm" width="60" height="60" patternUnits="userSpaceOnUse"><image href="${kumasUrl}" width="60" height="60" preserveAspectRatio="xMidYMid slice"/></pattern>` : ''}
      ${fitilUrl ? `<pattern id="pFt" width="30" height="30" patternUnits="userSpaceOnUse"><image href="${fitilUrl}" width="30" height="30" preserveAspectRatio="xMidYMid slice"/></pattern>` : ''}</defs>`;
    const z = '<ellipse cx="120" cy="150" rx="95" ry="6" fill="rgba(15,23,42,.12)"/>';
    let g;
    if (/Şezlong/.test(kat)) g = `<path d="M30 112 L150 112 L205 62" fill="none" stroke="${dolgu}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 112 L150 112 L205 60" fill="none" stroke="${fr}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M40 112 L36 146 M140 112 L146 146 M60 112 L62 146" stroke="${fr}" stroke-width="5" stroke-linecap="round"/>${km ? `<path d="M30 104 L150 104 L200 58" fill="none" stroke="${fitil}" stroke-width="3"/>` : ''}`;
    else if (/Oturma|Aile|Bank/.test(kat)) g = `<rect x="22" y="58" width="196" height="52" rx="8" fill="${fr}"/><rect x="34" y="40" width="172" height="44" rx="10" fill="${dolgu}" stroke="${fitil}" stroke-width="3"/><rect x="34" y="84" width="84" height="26" rx="8" fill="${dolgu}" stroke="${fitil}" stroke-width="3"/><rect x="122" y="84" width="84" height="26" rx="8" fill="${dolgu}" stroke="${fitil}" stroke-width="3"/>
      <rect x="14" y="66" width="22" height="50" rx="6" fill="${fr}"/><rect x="204" y="66" width="22" height="50" rx="6" fill="${fr}"/><path d="M30 116 V146 M210 116 V146" stroke="${fr}" stroke-width="7" stroke-linecap="round"/>`;
    else if (/Masa|Sehpa/.test(kat)) { const h = /Bar/.test(kat) ? 30 : /Sehpa/.test(kat) ? 92 : 60; g = `<rect x="26" y="${h}" width="188" height="12" rx="3" fill="#a87b55"/><rect x="26" y="${h + 12}" width="188" height="6" fill="${fr}"/><path d="M44 ${h + 18} V146 M196 ${h + 18} V146" stroke="${fr}" stroke-width="8" stroke-linecap="round"/>`; }
    else { const b = /Bar/.test(kat) ? 34 : 0, y = 30 - b / 2, o = 'rgba(15,23,42,.35)';
      g = `<g stroke-linecap="round" stroke-linejoin="round"><rect x="78" y="${y}" width="84" height="${62 - b / 2}" rx="8" fill="${dolgu}" stroke="${o}" stroke-width="7"/><rect x="78" y="${y}" width="84" height="${62 - b / 2}" rx="8" fill="${dolgu}" stroke="${fr}" stroke-width="4"/>
      <path d="M80 ${108 - b} L74 146 M160 ${108 - b} L166 146 M98 ${108 - b} L100 140 M142 ${108 - b} L140 140" stroke="${o}" stroke-width="8"/><path d="M80 ${108 - b} L74 146 M160 ${108 - b} L166 146 M98 ${108 - b} L100 140 M142 ${108 - b} L140 140" stroke="${fr}" stroke-width="5"/>
      <rect x="70" y="${92 - b}" width="100" height="16" rx="6" fill="${dolgu}" stroke="${o}" stroke-width="7"/><rect x="70" y="${92 - b}" width="100" height="16" rx="6" fill="${dolgu}" stroke="${km ? fitil : fr}" stroke-width="4"/>${b ? `<path d="M78 122 H162" stroke="${o}" stroke-width="7"/><path d="M78 122 H162" stroke="${fr}" stroke-width="4"/>` : ''}</g>`; }
    return `<svg viewBox="0 0 240 160" role="img" aria-label="Renk önizleme" style="filter:drop-shadow(0 0 .6px rgba(15,23,42,.55))">${defs}${z}${g}</svg>`;
  }
  const _uaP = urunAc;
  urunAc = function (id) {
    _uaP(id); const p = $$('.perde').pop(), u = VERI.urunler.find(x => x.id === id); if (!p || !u) return;
    let m = false;
    const ciz = () => {
      if (m) return; m = true;
      try {
        const sec = a => (p.querySelector(`.renk.on[data-a=${a}]`) || {}).dataset?.k || '';
        const isk = sec('iskelet'), fl = sec('file'), km = sec('kumas'), ft = sec('fitil'), imza = [isk, fl, km, ft].join('|');
        let k = p.querySelector('.r-onizle');
        if (k && k.dataset.i === imza) return;
        const oz = p.querySelector('.p-foto .ozet'); if (!oz) return;
        const html = `<div class="b">Renk önizleme<span>${isk ? 'temsili çizim' : 'renk seçtikçe güncellenir'}</span></div>${onizleSvg(u.kategori, isk, fl, km, ft)}`;
        if (!k) { oz.insertAdjacentHTML('afterend', `<div class="r-onizle"></div>`); k = p.querySelector('.r-onizle'); }
        k.innerHTML = html; k.dataset.i = imza;
        const bi = p.querySelector('.p-bilgi .aciklama');
        if (bi && !p.querySelector('[data-numune-urun]')) { bi.insertAdjacentHTML('afterend', `<button class="btn cizgi" data-numune-urun style="padding:6px 10px;font-size:12px;margin:2px 0 8px">Bu ürün için numune iste</button>`); p.querySelector('[data-numune-urun]').onclick = () => numuneForm(u.ad); }
      } finally { m = false; }
    };
    ciz(); new MutationObserver(ciz).observe(p, { childList: true, subtree: true });
  };

  // ================= 6. duyurular =================
  const dyOkundu = () => (ben && oku('exb-duyuru-okundu-' + ben.kul, [])) || [];
  const bugun = () => new Date().toISOString().slice(0, 10);
  const dyListe = () => (oku('exb-duyuru', []) || []).filter(d => d.aktif !== false && (!d.bas || d.bas <= bugun()) && (!d.bit || d.bit >= bugun()) && (!(d.bayiler || []).length || (ben && d.bayiler.includes(ben.kul)))).sort((a, b) => b.zaman - a.zaman);
  const DYTUR = { genel: 'Duyuru', urun: 'Yeni ürün', fiyat: 'Fiyat', kampanya: 'Kampanya' };
  const dyKart = (d, x) => `<div class="dy ${d.tur || 'genel'}"><div><span class="t">${DYTUR[d.tur] || 'Duyuru'} · ${tarih(d.zaman)}</span><b>${esc(d.baslik)}</b>${d.metin ? `<p>${esc(d.metin)}</p>` : ''}</div>${x ? `<button class="x" data-dy-ok="${d.id}">Okundu ✓</button>` : ''}</div>`;
  function tumDuyurular() {
    const L = dyListe(); pencere(`<h3>Duyurular</h3><div class="dy-bant" style="margin-top:12px">${L.map(d => dyKart(d, false)).join('') || '<div class="kucuk">Yayında duyuru yok.</div>'}</div>`);
    if (ben) yaz('exb-duyuru-okundu-' + ben.kul, [...new Set([...dyOkundu(), ...L.map(d => d.id)])]); katalog();
  }
  const _kP = katalog;
  katalog = function () {
    _kP(); if (!ben) return;
    const L = dyListe(), ok = dyOkundu(), Y = L.filter(d => !ok.includes(d.id)), ust = $('#s-katalog .ust-satir');
    let b = $('#dyBant'); if (!b && ust) { ust.insertAdjacentHTML('afterend', '<div id="dyBant"></div>'); b = $('#dyBant'); }
    if (b) { b.innerHTML = L.length ? `<div class="dy-bant">${Y.slice(0, 3).map(d => dyKart(d, true)).join('')}<button class="dy-hepsi" id="dyHepsi">${Y.length ? 'Tüm duyurular' : 'Duyurular'} (${L.length})</button></div>` : '';
      $$('[data-dy-ok]').forEach(x => x.onclick = () => { yaz('exb-duyuru-okundu-' + ben.kul, [...dyOkundu(), x.dataset.dyOk]); katalog(); });
      if ($('#dyHepsi')) $('#dyHepsi').onclick = tumDuyurular; }
    const kp = $('#katPdf'); if (kp && !$('#numuneBtn')) { kp.insertAdjacentHTML('afterend', '<button class="btn cizgi" id="numuneBtn" style="padding:8px 12px;font-size:13px">Numune / katalog iste</button>'); $('#numuneBtn').onclick = () => numuneForm(''); }
  };
  const _gyP = girisYap;
  girisYap = function (u) { _gyP(u); setTimeout(() => { const n = dyListe().filter(d => !dyOkundu().includes(d.id)).length; if (n) toast(n + ' yeni duyuru var.'); }, 2900); };
  let _dySon = localStorage.getItem('exb-duyuru');
  setInterval(() => { const y = localStorage.getItem('exb-duyuru'); if (y !== _dySon) { _dySon = y; try { if (ben && !$('#s-katalog').classList.contains('gizli')) katalog(); } catch (e) {} } }, 15000);

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
  const _cariP = cariSayfa;
  cariSayfa = function () {
    _cariP(); const s = $('#s-cari'); if (!s || !ben) return;
    const h = s.querySelector('h2'); if (h && !s.querySelector('#obAc')) { h.insertAdjacentHTML('afterend', '<button class="btn marka" id="obAc" style="float:right;margin-top:-40px">Ödeme bildir</button>'); $('#obAc').onclick = odemeForm; }
    const L = oku('exb-odeme', []).filter(o => o.kul === ben.kul).sort((a, b) => b.zaman - a.zaman);
    const oz = s.querySelector('.sk-ozet');
    if (L.length && oz) oz.insertAdjacentHTML('afterend', `<div class="kart-b"><h3>Ödeme bildirimlerim</h3><table class="tl-tablo"><tr><th>No</th><th>Ödeme tarihi</th><th>Yöntem</th><th style="text-align:right">Tutar</th><th>Durum</th></tr>
      ${L.map(o => `<tr><td><b>${esc(o.no)}</b>${o.not ? `<div class="kucuk">${esc(o.not)}</div>` : ''}</td><td>${tarih(o.tarih)}</td><td>${esc(o.yontem)}</td><td style="text-align:right"><b>${para(o.tutar)}</b></td><td><span class="dz ${o.durum}">${ODZ[o.durum]}</span>${o.redNot ? `<div class="kucuk">${esc(o.redNot)}</div>` : ''}</td></tr>`).join('')}</table></div>`);
  };

  // ================= 8. numune ve katalog talebi =================
  const NTUR = ['Kumaş kartelası', 'İskelet renk kartelası', 'File numunesi', 'Kumaş numunesi', 'Ürün numunesi', 'Basılı katalog'];
  const NDZ = { yeni: 'Alındı', hazirlaniyor: 'Hazırlanıyor', gonderildi: 'Gönderildi', iptal: 'İptal' };
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
  const _spP = siparislerim;
  siparislerim = function () {
    _spP(); if (!ben) return;
    const L = oku('exb-numune', []).filter(o => o.kul === ben.kul).sort((a, b) => b.zaman - a.zaman), s = $('#s-siparisler');
    s.insertAdjacentHTML('beforeend', `<div class="kart-b" style="margin-top:18px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3 style="margin:0">Numune ve katalog talepleri</h3><button class="btn cizgi" id="nmYeni" style="padding:6px 10px;font-size:12px">Yeni talep</button></div>
      ${L.length ? `<table class="tl-tablo" style="margin-top:10px"><tr><th>No</th><th>Tarih</th><th>Talep</th><th>Durum</th><th>Kargo</th></tr>${L.map(o => `<tr><td><b>${esc(o.no)}</b></td><td>${tarih(o.zaman)}</td><td>${esc(o.tur.join(', '))}${o.urun ? `<div class="kucuk">${esc(o.urun)}${o.kod ? ' · ' + esc(o.kod) : ''} · ${o.adet} adet</div>` : ''}</td><td><span class="dz ${o.durum}">${NDZ[o.durum]}</span></td><td class="kucuk">${esc([o.kargo, o.takip].filter(Boolean).join(' · ') || '—')}</td></tr>`).join('')}</table>` : '<p class="kucuk">Henüz talebiniz yok. Kumaş kartelası, renk kartelası, numune veya basılı katalog isteyebilirsiniz.</p>'}</div>`);
    $('#nmYeni').onclick = () => numuneForm('');
  };

  // gezinme
  const _gitP = git;
  git = function (s) {
    if (s === 'projeler') { ['katalog', 'siparisler', 'cari'].forEach(x => $('#s-' + x).classList.add('gizli')); $('#s-projeler').classList.remove('gizli'); projeler(); $$('[data-git]').forEach(b => b.classList.toggle('aktif', b.dataset.git === s)); window.scrollTo(0, 0); }
    else { $('#s-projeler').classList.add('gizli'); _gitP(s); }
  };
  $$('[data-git]').forEach(b => b.onclick = () => git(b.dataset.git));
  const _cikP = $('#hCikis').onclick; $('#hCikis').onclick = () => { aktifPrAyarla(''); _cikP && _cikP(); };

  // İngilizce karşılıklar
  if (window.dilEkle) window.dilEkle({
    'Projeler': 'Projects', 'Proje sepetleri': 'Project baskets', "Her müşteriniz veya işiniz için ayrı sepet hazırlayın. Hazır olduğunda sepete aktarıp sipariş verin; sipariş hangi projeden verildiyse Siparişlerim'de o adla görünür.": 'Prepare a separate basket for each client or job. When ready, open it in the cart and place the order; the order shows the project name in My orders.',
    'Yeni proje adı, örn. Otel Mavi Koy havuz başı': 'New project name, e.g. Hotel Blue Bay poolside', 'Proje oluştur': 'Create project', 'Mevcut sepetten oluştur': 'Create from current cart', 'Sepette açık': 'Open in cart', 'kalem': 'items', 'adet': 'pcs',
    'Henüz kalem yok. Sepete ürün ekleyip “Projeye kaydet” ile bu projeye aktarın.': 'No items yet. Add products to the cart and use “Save to project”.', 'Sepette aç': 'Open in cart', 'Sepeti buraya kaydet': 'Save cart here', 'Kopyala': 'Duplicate', 'Sil': 'Delete', 'Silinsin mi?': 'Delete?',
    'Henüz projeniz yok. Yukarıdan bir proje oluşturun.': 'No projects yet. Create one above.', 'Proje adı yazın.': 'Enter a project name.', 'Proje silindi.': 'Project deleted.', 'Projeye kaydet': 'Save to project', 'Yeni proje…': 'New project…', 'Proje adı': 'Project name',
    'Kaydettikten sonra sepeti boşalt': 'Empty the cart after saving', 'Sepet boş.': 'Cart is empty.', 'Renk önizleme': 'Colour preview', 'temsili çizim': 'illustrative drawing', 'renk seçtikçe güncellenir': 'updates as you choose colours', 'Bu ürün için numune iste': 'Request a sample of this product',
    'Duyurular': 'Announcements', 'Tüm duyurular': 'All announcements', 'Duyuru': 'Notice', 'Yeni ürün': 'New product', 'Fiyat': 'Price', 'Kampanya': 'Promotion', 'Okundu ✓': 'Mark read ✓', 'Yayında duyuru yok.': 'No active announcements.',
    'Ödeme bildir': 'Report a payment', 'Yaptığınız ödemeyi bildirin; satış ekibi dekontu kontrol edip cari hesabınıza işler.': 'Report your payment; the sales team checks the receipt and posts it to your account.', 'Tutar (USD)': 'Amount (USD)', 'Ödeme tarihi': 'Payment date', 'Ödeme yöntemi': 'Payment method',
    'Banka / referans no': 'Bank / reference no.', 'Örn. EXG-2026-0012 siparişi için': 'E.g. for order EXG-2026-0012', 'Dekont (fotoğraf veya PDF)': 'Receipt (photo or PDF)', 'Dosya seç': 'Choose file', 'Seçilmedi': 'None selected', 'Hazırlanıyor…': 'Preparing…', 'Vazgeç': 'Cancel', 'Bildir': 'Submit',
    'Tutarı yazın.': 'Enter the amount.', 'Ödeme bildiriminiz satış ekibine iletildi.': 'Your payment report has been sent to the sales team.', 'Ödeme bildirimlerim': 'My payment reports', 'Yöntem': 'Method', 'Durum': 'Status', 'No': 'No.', 'İnceleniyor': 'Under review', 'Tahsilat işlendi': 'Payment posted', 'Reddedildi': 'Rejected',
    'Havale / EFT': 'Bank transfer', 'Kredi kartı': 'Credit card', 'Çek': 'Cheque', 'Senet': 'Promissory note', 'Nakit': 'Cash',
    'Numune / katalog iste': 'Request samples / catalogue', 'Numune / katalog talebi': 'Sample / catalogue request', 'Talebiniz satış ekibine iletilir; gönderildiğinde kargo bilgisi Siparişlerim sayfasında görünür.': 'Your request goes to the sales team; shipping details appear in My orders once sent.',
    'Ne istiyorsunuz?': 'What do you need?', 'Kumaş kartelası': 'Fabric colour card', 'İskelet renk kartelası': 'Frame colour card', 'File numunesi': 'Mesh sample', 'Kumaş numunesi': 'Fabric sample', 'Ürün numunesi': 'Product sample', 'Basılı katalog': 'Printed catalogue',
    'İlgili ürün': 'Related product', 'Renk / kumaş kodu (isteğe bağlı)': 'Colour / fabric code (optional)', 'Örn. BG09, RAL 7016, Terra 05': 'E.g. BG09, RAL 7016, Terra 05', 'Gönderim adresi': 'Shipping address', 'Not': 'Note', 'Talebi gönder': 'Send request', 'En az bir tür seçin.': 'Select at least one item.', 'Gönderim adresini yazın.': 'Enter the shipping address.',
    'Numune ve katalog talepleri': 'Sample and catalogue requests', 'Yeni talep': 'New request', 'Talep': 'Request', 'Kargo': 'Shipping', 'Alındı': 'Received', 'Hazırlanıyor': 'Preparing', 'Gönderildi': 'Shipped',
    'Henüz talebiniz yok. Kumaş kartelası, renk kartelası, numune veya basılı katalog isteyebilirsiniz.': 'No requests yet. You can ask for fabric or colour cards, samples or a printed catalogue.'
  }, [
    [/^Güncelleme: (.+)$/, (m, t) => 'Updated: ' + t], [/^Proje: (.+)$/, (m, t) => 'Project: ' + t], [/^Sipariş:$/, () => 'Order:'], [/^“(.+)” projesi oluşturuldu\.$/, (m, a) => `Project “${a}” created.`],
    [/^“(.+)” sepette açıldı\.$/, (m, a) => `“${a}” opened in the cart.`], [/^Sepet “(.+)” projesine kaydedildi\.$/, (m, a) => `Cart saved to project “${a}”.`], [/^(\d+) yeni duyuru var\.$/, (m, n) => n + ' new announcement(s).'],
    [/^(Tüm duyurular|Duyurular) \((\d+)\)$/, (m, a, n) => (a === 'Duyurular' ? 'Announcements' : 'All announcements') + ' (' + n + ')'], [/^(Duyuru|Yeni ürün|Fiyat|Kampanya) · (.+)$/, (m, a, t) => ({ 'Duyuru': 'Notice', 'Yeni ürün': 'New product', 'Fiyat': 'Price', 'Kampanya': 'Promotion' }[a]) + ' · ' + t],
    [/^Numune talebiniz alındı: (.+)$/, (m, n) => 'Sample request received: ' + n], [/^(.+) · (\d+) adet$/, (m, a, n) => a + ' · ' + n + ' pcs']
  ]);
})();
