// Ekran: ürün ve fiyat yönetimi (bayi portalını yönetir).
// ===== ürün ve fiyat yönetimi (bayi portalını yönetir) =====
// fiyat ve görünürlüğü kaydeder, bayi portalına yayınlar (değişikliği geçmişe yazan: urunYaz)
const fiyatYayinla = () => { yaz('exs-fiyat', FIYAT); yaz('exb-fiyat', FIYAT); yaz('exs-gizli', GIZLI); yaz('exb-gizli', GIZLI); };
fiyatYayinla();
const fiyatAl = (u, s) => { const f = (FIYAT[u.ad] || {})[s.ad]; return f != null && f !== '' ? +f : s.fiyat; };
const aktifKmp = u => KMP.filter(k => kmpDurum(k)[0] === 'Yayında' && (k.kapsam === 'tumu' || (k.hedef || []).includes(k.kapsam === 'kategori' ? u.kategori : u.ad))).sort((a, b) => b.oran - a.oran);
const PF = { ara: '', kat: '', sinif: '', durum: '' }, SEC = new Set();
function urunListe() {
  return VERI.urunler.filter(u => (!PF.kat || u.kategori === PF.kat) && (!PF.sinif || u.secenek.some(s => s.sinif === PF.sinif))
    && (!PF.ara || (u.ad + ' ' + u.kategori).toLocaleLowerCase('tr').includes(PF.ara.toLocaleLowerCase('tr')))
    && (PF.durum !== 'kmp' || aktifKmp(u).length) && (PF.durum !== 'gizli' || GIZLI.includes(u.ad)) && (PF.durum !== 'degisen' || Object.keys(FIYAT[u.ad] || {}).length) && (PF.durum !== 'yayinda' || !GIZLI.includes(u.ad)));
}
function urunler() {
  $('#baslik').textContent = 'Ürünler ve fiyatlar';
  const L = urunListe(), degisen = Object.keys(FIYAT).filter(k => Object.keys(FIYAT[k]).length).length;
  $('#ustSag').innerHTML = `<button class="btn cizgi" id="uCsv">Fiyat listesini Excel'e aktar</button>`;
  $('#icerik').innerHTML = `<div class="kpi"><div><span>Ürün</span><b>${VERI.urunler.length}</b><small>${VERI.urunler.length - GIZLI.length} portalda görünür</small></div><div><span>Fiyatı değiştirilen</span><b>${degisen}</b><small>liste fiyatından farklı</small></div><div><span>Kampanyalı ürün</span><b>${VERI.urunler.filter(u => aktifKmp(u).length).length}</b><small>${KMP.filter(k => kmpDurum(k)[0] === 'Yayında').length} kampanya yayında</small></div><div><span>Gizli ürün</span><b>${GIZLI.length}</b><small>bayi görmez</small></div></div>
    <div class="kart"><div class="filtreler"><input id="uAra" placeholder="Ürün ara" value="${esc(PF.ara)}">${katSinifSec(PF, 'uKat', 'uSin')}
      <select id="uDur"><option value="">Tüm ürünler</option>${[['yayinda', 'Portalda görünenler'], ['kmp', 'Kampanyalı'], ['degisen', 'Fiyatı değiştirilen'], ['gizli', 'Gizli']].map(([k, a]) => `<option value="${k}" ${PF.durum === k ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
    <div class="toplu ${SEC.size ? 'on' : ''}"><label><input type="checkbox" id="uHepsi" ${L.length && L.every(u => SEC.has(u.ad)) ? 'checked' : ''}> <b>${SEC.size}</b> ürün seçili</label>
      <span class="ayir"></span><span>Fiyat:</span><input id="tOran" inputmode="decimal" placeholder="%" style="width:64px"><button class="btn cizgi" id="tArt">Artır</button><button class="btn cizgi" id="tAzl">Azalt</button><button class="btn cizgi" id="tSif">Liste fiyatına dön</button>
      <span class="ayir"></span><button class="btn marka" id="tKmp">Seçilenlerle kampanya oluştur</button><button class="btn cizgi" id="tGiz">Portalda gizle</button><button class="btn cizgi" id="tGos">Portalda göster</button>${SEC.size ? '<button class="btn cizgi" id="tTem">Seçimi temizle</button>' : ''}</div>
    ${L.length ? `<table class="tablo urun-tb"><tr><th></th><th>Ürün</th><th>Seçenekler ve fiyat (USD)</th><th>Kampanya</th><th>Portal</th></tr>
      ${L.map(u => { const K = aktifKmp(u), gz = GIZLI.includes(u.ad); return `<tr class="${gz ? 'gizli-satir' : ''}"><td><input type="checkbox" data-sec="${esc(u.ad)}" ${SEC.has(u.ad) ? 'checked' : ''}></td>
        <td><div class="u-bas">${u.gorsel ? `<i style="background-image:url(${u.gorsel})"></i>` : '<i></i>'}<div><b>${esc(u.ad)}</b><div class="kucuk">${esc(u.kategori)}</div></div></div></td>
        <td><div class="u-fiyat">${u.secenek.map(s => { const f = fiyatAl(u, s), d = f !== s.fiyat; return `<label class="${d ? 'degisti' : ''}" title="${esc(s.sinif)}"><span>${esc(s.ad)}</span><input data-u="${esc(u.ad)}" data-s="${esc(s.ad)}" value="${f ?? ''}" placeholder="teklif" inputmode="decimal">${d ? `<small>liste ${s.fiyat ?? '—'}${K[0] && f != null ? ` · kampanyalı ${Math.round(f * (1 - K[0].oran / 100))}` : ''}</small>` : K[0] && f != null ? `<small>kampanyalı ${Math.round(f * (1 - K[0].oran / 100))}</small>` : ''}</label>`; }).join('') || '<span class="kucuk">Fiyat yok</span>'}</div></td>
        <td>${K.length ? K.map(k => `<span class="uy uy-kotu">%${k.oran} ${esc(k.ad)}</span>`).join(' ') : '<span class="kucuk">—</span>'}</td>
        <td><button class="anah ${gz ? '' : 'on'}" data-gz="${esc(u.ad)}" title="${gz ? 'Gizli: bayi görmez' : 'Bayi portalında görünür'}"><i></i></button></td></tr>`; }).join('')}</table>` : '<div class="bos">Bu filtreye uyan ürün yok.</div>'}</div>`;
  const yenile = () => urunler();
  $('#uAra').oninput = e => { PF.ara = e.target.value; clearTimeout(window._ua); window._ua = setTimeout(() => { yenile(); const i = $('#uAra'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
  $('#uKat').onchange = e => { PF.kat = e.target.value; PF.sinif = ''; yenile(); };
  $('#uSin').onchange = e => { PF.sinif = e.target.value; yenile(); };
  $('#uDur').onchange = e => { PF.durum = e.target.value; yenile(); };
  $$('[data-sec]').forEach(c => c.onchange = () => { c.checked ? SEC.add(c.dataset.sec) : SEC.delete(c.dataset.sec); yenile(); });
  $('#uHepsi').onchange = e => { L.forEach(u => e.target.checked ? SEC.add(u.ad) : SEC.delete(u.ad)); yenile(); };
  $$('[data-gz]').forEach(b => b.onclick = () => { const a = b.dataset.gz; GIZLI = GIZLI.includes(a) ? GIZLI.filter(x => x !== a) : [...GIZLI, a]; urunYaz(); toast(GIZLI.includes(a) ? a + ' portalda gizlendi.' : a + ' portalda görünüyor.'); yenile(); });
  $$('.u-fiyat input').forEach(i => i.onchange = () => { const u = VERI.urunler.find(x => x.ad === i.dataset.u), s = u.secenek.find(x => x.ad === i.dataset.s), v = i.value.trim() === '' ? null : parseFloat(i.value.replace(/\./g, '').replace(',', '.'));
    if (i.value.trim() !== '' && !(v >= 0)) return toast('Geçerli bir fiyat girin.');
    FIYAT[u.ad] = FIYAT[u.ad] || {}; if (v === s.fiyat) delete FIYAT[u.ad][s.ad]; else FIYAT[u.ad][s.ad] = v; if (!Object.keys(FIYAT[u.ad]).length) delete FIYAT[u.ad];
    urunYaz(); toast(`${u.ad} · ${s.ad}: ${v == null ? 'teklif' : usd(v)}`); yenile(); });
  const secili = () => { if (!SEC.size) { toast('Önce ürün seçin.'); return null; } return VERI.urunler.filter(u => SEC.has(u.ad)); };
  const toplu = yon => { const S = secili(); if (!S) return; const o = parseFloat(($('#tOran').value || '').replace(',', '.')); if (!(o > 0 && o < 100)) return toast('Oranı girin, örn. 5.');
    S.forEach(u => u.secenek.forEach(s => { const f = fiyatAl(u, s); if (f == null) return; const y = Math.round(f * (1 + yon * o / 100)); FIYAT[u.ad] = FIYAT[u.ad] || {}; if (y === s.fiyat) delete FIYAT[u.ad][s.ad]; else FIYAT[u.ad][s.ad] = y; }));
    urunYaz(); toast(`${S.length} ürünün fiyatı %${o} ${yon > 0 ? 'artırıldı' : 'azaltıldı'}.`); yenile(); };
  $('#tArt').onclick = () => toplu(1); $('#tAzl').onclick = () => toplu(-1);
  $('#tSif').onclick = () => { const S = secili(); if (!S) return; S.forEach(u => delete FIYAT[u.ad]); urunYaz(); toast('Seçilen ürünler liste fiyatına döndü.'); yenile(); };
  $('#tGiz').onclick = () => { const S = secili(); if (!S) return; GIZLI = [...new Set([...GIZLI, ...S.map(u => u.ad)])]; urunYaz(); toast(S.length + ' ürün portalda gizlendi.'); yenile(); };
  $('#tGos').onclick = () => { const S = secili(); if (!S) return; GIZLI = GIZLI.filter(a => !SEC.has(a)); urunYaz(); toast(S.length + ' ürün portalda görünüyor.'); yenile(); };
  if ($('#tTem')) $('#tTem').onclick = () => { SEC.clear(); yenile(); };
  $('#tKmp').onclick = () => { const S = secili(); if (!S) return; kmpForm(null, { kapsam: 'urun', hedef: S.map(u => u.ad) }); };
  $('#uCsv').onclick = () => { const R = [['Ürün', 'Kategori', 'Seçenek', 'Ürün tipi', 'Liste $', 'Güncel $', 'Kampanya', 'Kampanyalı $', 'Portal']]; VERI.urunler.forEach(u => { const K = aktifKmp(u)[0]; u.secenek.forEach(s => { const f = fiyatAl(u, s); R.push([u.ad, u.kategori, s.ad, s.sinif, s.fiyat ?? '', f ?? '', K ? K.ad + ' %' + K.oran : '', K && f != null ? Math.round(f * (1 - K.oran / 100)) : '', GIZLI.includes(u.ad) ? 'gizli' : 'görünür']); }); });
    const csv = '﻿' + R.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'exit_fiyat_listesi.csv'; a.click(); };
  urunlerYonetim();
  EK.urunlerExcel?.();
}
// kampanya formu: ön seçim + bayi hedefleme
// kampanya listesinde bayi kapsamı
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
