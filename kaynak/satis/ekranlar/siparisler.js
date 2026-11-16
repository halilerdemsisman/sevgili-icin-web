// Ekran: siparişler (dosyadan içe aktarma, liste, filtre, sipariş penceresi, teklif yazdırma, CSV).
// ---------- dosyadan sipariş içe aktar
$('#dosya').onchange = async e => {
  let n = 0, h = 0;
  for (const f of e.target.files) {
    try { const j = JSON.parse(await f.text()); const L = j.tur === 'exit-bayi-siparis' ? [j] : (j.siparisler || []);
      L.forEach(x => { const o = x.siparis; if (!o || !o.no || !Array.isArray(o.kalemler)) throw 0; if (!SIP[o.no]) { SIP[o.no] = { ...o, kaynak: 'dosya' }; n++; } if (x.musteri) MUS[x.musteri.kul] = { ...(MUS[x.musteri.kul] || {}), ...x.musteri }; });
    } catch (er) { h++; }
  }
  yaz('exs-siparisler', SIP); yaz('exs-musteriler', MUS); e.target.value = '';
  toast(`${n} sipariş içe aktarıldı${h ? ', ' + h + ' dosya okunamadı' : ''}.`); yeniSay(); git('siparisler');
};

// ---------- siparişler
const SF = { ara: '', durum: '', mus: '' };

// ---------- kategori / ürün tipi filtresi
const KAT_L = [...new Set(VERI.urunler.map(u => u.kategori))];
const SINIF_L = [...new Set(VERI.urunler.flatMap(u => u.secenek.map(x => x.sinif)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
const kalemKat = x => x.kategori || KATEGORI[x.ad] || 'Diğer';
const kalemUyar = (x, f) => (!f.kat || kalemKat(x) === f.kat) && (!f.sinif || x.sinif === f.sinif);
const AF = { kat: '', sinif: '' };
function katSinifSec(f, idK, idS) {
  const siniflar = f.kat ? SINIF_L.filter(c => VERI.urunler.some(u => u.kategori === f.kat && u.secenek.some(x => x.sinif === c))) : SINIF_L;
  return `<select id="${idK}"><option value="">Tüm kategoriler</option>${KAT_L.map(k => `<option ${f.kat === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
    <select id="${idS}"><option value="">Tüm ürün tipleri</option>${siniflar.map(k => `<option ${f.sinif === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>`;
}
function siparisler() {
  $('#baslik').textContent = 'Siparişler';
  $('#ustSag').innerHTML = `<button class="btn cizgi" id="iceAl">Sipariş dosyası içe aktar</button><button class="btn cizgi" id="csv">Excel'e aktar</button>`;
  $('#iceAl').onclick = () => $('#dosya').click(); $('#csv').onclick = csvAktar;
  const L = sipList().filter(o => (!SF.kat && !SF.sinif || o.kalemler.some(x => kalemUyar(x, SF))) && (!SF.durum || o.durum === SF.durum) && (!SF.mus || o.kul === SF.mus) && (!SF.ara || (o.no + ' ' + o.firma + ' ' + o.kalemler.map(x => x.ad).join(' ')).toLocaleLowerCase('tr').includes(SF.ara.toLocaleLowerCase('tr'))));
  const T = sipList().filter(o => o.durum !== 'iptal').map(tutarlar);
  $('#icerik').innerHTML = `<div class="kpi">
      <div><span>Yeni talep</span><b>${Object.values(SIP).filter(o => o.durum === 'yeni').length}</b><small>onay bekliyor</small></div>
      <div><span>Toplam net satış</span><b>${usd(T.reduce((a, t) => a + t.net, 0))}</b><small>${tlYap(T.reduce((a, t) => a + t.net, 0))}</small></div>
      <div><span>Verilen iskonto</span><b>${usd(T.reduce((a, t) => a + t.iskTutar, 0))}</b><small>ortalama ${yuzde(T.length ? T.reduce((a, t) => a + t.oran, 0) / T.length : 0)}</small></div>
      <div><span>Sipariş sayısı</span><b>${Object.keys(SIP).length}</b><small>${Object.keys(MUS).length} müşteri</small></div></div>
    <div class="kart"><div class="filtreler"><input id="sAra" placeholder="No, firma veya ürün ara" value="${esc(SF.ara)}">
      ${katSinifSec(SF, 'sKat', 'sSin')}
      <select id="sDur"><option value="">Tüm durumlar</option>${Object.entries(DURUM).map(([k, v]) => `<option value="${k}" ${SF.durum === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <select id="sMus"><option value="">Tüm müşteriler</option>${Object.values(MUS).sort((a, b) => (a.firma || '').localeCompare(b.firma || '', 'tr')).map(m => `<option value="${esc(m.kul)}" ${SF.mus === m.kul ? 'selected' : ''}>${esc(m.firma)}</option>`).join('')}</select></div>
    ${L.length ? `<table class="tablo"><tr><th>No</th><th>Tarih</th><th>Müşteri</th><th>Kalem</th><th class="sag-hiza">Brüt</th><th class="sag-hiza">İskonto</th><th class="sag-hiza">Net</th><th class="sag-hiza">Net (₺)</th><th>Durum</th></tr>
      ${L.map(o => { const t = tutarlar(o); return `<tr class="tik" data-no="${o.no}"><td><b>${o.no}</b>${o.ornek ? ' <span class="rozet">örnek</span>' : ''}</td><td>${tarih(o.tarih)}</td><td>${esc(o.firma)}<div class="kucuk">${esc(o.ad)}</div></td>
        <td>${o.kalemler.reduce((a, x) => a + x.adet, 0)} adet<div class="kucuk">${esc(o.kalemler.slice(0, 2).map(x => x.ad).join(', '))}${o.kalemler.length > 2 ? '…' : ''}</div></td>
        <td class="sag-hiza">${usd(t.brut)}</td><td class="sag-hiza">${t.oran ? yuzde(t.oran) : '—'}</td><td class="sag-hiza"><b>${usd(t.net)}</b></td><td class="sag-hiza">${tlYap(t.net)}</td>
        <td><span class="durum ${DURUM[o.durum][1]}">${DURUM[o.durum][0]}</span></td></tr>`; }).join('')}</table>`
      : `<div class="bos">Sipariş yok. Müşteri portalından gelen siparişler burada görünür; başka bilgisayardan gelen sipariş dosyalarını <b>Sipariş dosyası içe aktar</b> ile ekleyin.${Object.keys(SIP).length ? '' : '<br><br>Paneli denemek için Ayarlar\'dan örnek veri oluşturabilirsiniz.'}</div>`}</div>`;
  $('#sAra').oninput = e => { SF.ara = e.target.value; clearTimeout(window._sa); window._sa = setTimeout(() => { siparisler(); const i = $('#sAra'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $('#sDur').onchange = e => { SF.durum = e.target.value; siparisler(); };
  $('#sKat').onchange = e => { SF.kat = e.target.value; SF.sinif = ''; siparisler(); };
  $('#sSin').onchange = e => { SF.sinif = e.target.value; siparisler(); };
  $('#sMus').onchange = e => { SF.mus = e.target.value; siparisler(); };
  $$('tr[data-no]').forEach(r => r.onclick = () => siparisAc(r.dataset.no));
}
function siparisAc(no) {
  const o = SIP[no]; const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) p.remove(); }; document.body.appendChild(p);
  function ciz() {
    const t = tutarlar(o), m = MUS[o.kul] || {};
    p.innerHTML = `<div class="pencere"><button class="kapat">×</button><h2 style="margin:0">${o.no} <span class="durum ${DURUM[o.durum][1]}">${DURUM[o.durum][0]}</span></h2>
      <div class="kucuk">${tarih(o.tarih)} · ${esc(o.firma)} · ${esc(o.ad)}${m.tel ? ' · ' + esc(m.tel) : ''}${m.mail ? ' · ' + esc(m.mail) : ''}</div>
      ${o.adres ? `<div class="kucuk" style="margin-top:4px">Adres / not: ${esc(o.adres)}</div>` : ''}
      <table class="tablo" style="margin-top:14px"><tr><th>Ürün</th><th>Seçimler</th><th class="sag-hiza">Adet</th><th class="sag-hiza">Birim</th><th class="sag-hiza">Tutar</th></tr>
      ${o.kalemler.map(x => `<tr><td><b>${esc(x.ad)}</b><div class="kucuk">${esc(x.kategori || '')}</div></td><td class="kucuk" style="color:var(--yazi2)">${[x.secenek, x.iskelet && 'İskelet: ' + x.iskelet, x.file && 'File: ' + x.file, x.kumas && 'Kumaş: ' + x.kumas, x.fitil && 'Fitil: ' + x.fitil, x.not && 'Not: ' + x.not, x.kampanya && 'Kampanya: ' + x.kampanya + (x.liste ? ' · liste ' + usd(x.liste) : '')].filter(Boolean).map(esc).join('<br>')}</td>
        <td class="sag-hiza">${x.adet}</td><td class="sag-hiza">${x.birim == null ? '<span class="rozet">Teklif</span>' : usd(x.birim)}</td><td class="sag-hiza">${x.birim == null ? '—' : usd(x.birim * x.adet)}</td></tr>`).join('')}</table>
      <div class="hesap"><div><span>Brüt</span><b>${usd(t.brut)}</b></div><div><span>İskonto (${yuzde(t.oran)})</span><b>−${usd(t.iskTutar)}</b></div><div><span>Net (USD)</span><b>${usd(t.net)}</b></div><div><span>Net (TL / EUR)</span><b>${tlYap(t.net)}</b><span>${KUR.EUR ? eur(t.net * KUR.EUR) : ''}</span></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:end">
        <div class="alan"><label>Müşteri iskontosu %</label><input id="pM" inputmode="decimal" value="${t.m}"><span class="kucuk">Varsayılan: firma iskontosu ${yuzde(musIsk(o.kul))}</span></div>
        <div class="alan"><label>Bu siparişe ek iskonto %</label><input id="pE" inputmode="decimal" value="${t.e}"></div>
        <div class="alan"><label>Durum</label><select id="pD">${Object.entries(DURUM).map(([k, v]) => `<option value="${k}" ${o.durum === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
        <div class="alan"><button class="btn marka tam" id="pK">Kaydet</button></div></div>
      ${o.kalemler.some(x => x.birim == null) ? '<p class="kucuk">Fiyatı olmayan kalemler “Teklif” olarak geldi; tutara dahil değildir.</p>' : ''}
      <button class="btn cizgi" id="pTeklif">Fiyat teklifi yazdır</button></div>`;
    p.querySelector('.kapat').onclick = () => p.remove();
    const say = v => Math.min(100, Math.max(0, parseFloat(String(v).replace(',', '.')) || 0));
    p.querySelector('#pK').onclick = () => { o.musIskonto = say(p.querySelector('#pM').value); o.ekIskonto = say(p.querySelector('#pE').value); yaz('exs-siparisler', SIP); durumYaz(o.no, p.querySelector('#pD').value); yeniSay(); toast('Sipariş güncellendi.'); ciz(); siparisler(); };
    p.querySelector('#pTeklif').onclick = () => teklifYazdir(o);
  }
  ciz();
  siparisTakip(p, o); siparisOnayBandi(p, o); siparisBildirBandi(p, o);
  EK.siparisFiyatUyarisi?.(no);
}
function teklifYazdir(o) {
  const t = tutarlar(o), w = window.open('', '_blank'); if (!w) return toast('Açılır pencere engellendi.');
  w.document.write(`<html><head><meta charset="utf-8"><title>${o.no} Teklif</title><style>body{font-family:Inter,Segoe UI,sans-serif;padding:32px;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left;font-size:13px}.r{text-align:right}.logo-ink{fill:#1f2937}.logo-ink-soft{fill:#475569}svg{height:40px;width:auto}.lg{display:flex;gap:14px;align-items:center}.logo-sep{width:1px;height:36px;background:#ccc}</style></head><body>
    <div class="lg">${document.querySelector('#giris .logolar').innerHTML}</div><h2>Fiyat Teklifi · ${o.no}</h2><div>${esc(o.firma)} · ${esc(o.ad)} · ${tarih(Date.now())}</div>
    <table><tr><th>Ürün</th><th>Seçimler</th><th class="r">Adet</th><th class="r">Birim</th><th class="r">Tutar</th></tr>${o.kalemler.map(x => `<tr><td>${esc(x.ad)}</td><td>${[x.secenek, x.iskelet, x.file, x.kumas && 'Kumaş ' + x.kumas, x.fitil && 'Fitil ' + x.fitil].filter(Boolean).map(esc).join(' · ')}</td><td class="r">${x.adet}</td><td class="r">${x.birim == null ? 'Teklif' : usd(x.birim)}</td><td class="r">${x.birim == null ? '' : usd(x.birim * x.adet)}</td></tr>`).join('')}
    <tr><td colspan="4" class="r">Brüt</td><td class="r">${usd(t.brut)}</td></tr><tr><td colspan="4" class="r">İskonto ${yuzde(t.oran)}</td><td class="r">−${usd(t.iskTutar)}</td></tr><tr><th colspan="4" class="r">Net (KDV hariç)</th><th class="r">${usd(t.net)}</th></tr>
    ${KUR.TRY ? `<tr><td colspan="4" class="r">TL karşılığı (1 $ = ${KUR.TRY.toFixed(4)} ₺)</td><td class="r">${tl(t.net * KUR.TRY)}</td></tr>` : ''}</table>
    <p style="font-size:12px;color:#666">Fiyatlar USD ve KDV hariçtir. TL karşılığı bilgi amaçlıdır; fatura tarihindeki kur geçerlidir.</p><script>print()<\/script></body></html>`);
  w.document.close();
}
function csvAktar() {
  const R = [['Sipariş No', 'Tarih', 'Firma', 'Yetkili', 'Ürün', 'Kategori', 'Seçenek', 'İskelet', 'File', 'Kumaş', 'Fitil', 'Adet', 'Birim $', 'Brüt $', 'İskonto %', 'Net $', 'Net ₺', 'Durum']];
  sipList().forEach(o => { const t = tutarlar(o); o.kalemler.forEach(x => { const b = (x.birim || 0) * x.adet, n = b * (1 - t.oran / 100); R.push([o.no, tarih(o.tarih), o.firma, o.ad, x.ad, x.kategori, x.secenek, x.iskelet, x.file, x.kumas, x.fitil, x.adet, x.birim ?? '', b, t.oran.toFixed(1), n.toFixed(2), KUR.TRY ? (n * KUR.TRY).toFixed(2) : '', DURUM[o.durum][0]]); }); });
  const csv = '﻿' + R.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'exit_satislar.csv'; a.click();
}
