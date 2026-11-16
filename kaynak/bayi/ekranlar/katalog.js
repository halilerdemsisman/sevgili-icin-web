// Katalog ekranı: filtreler, sıralama, ürün kartları ve eklerin katalog adımları.
// ---------- katalog ve filtreler
const F = { kat:'', sinif:new Set(), min:'', max:'', ara:'', sira:'ad', fiyatli:false, kmp:false };
function uygun(u, haric) {
  if (EK.favoriUygun && !EK.favoriUygun(u)) return false;
  if (haric !== 'kat' && F.kat && u.kategori !== F.kat) return false;
  if (haric !== 'sinif' && F.sinif.size && !u.secenek.some(s => F.sinif.has(s.sinif))) return false;
  const d = enDusuk(u);
  if (F.min !== '' && (d == null || Math.max(...u.secenek.map(s => s.fiyat || 0)) < +F.min)) return false;
  if (F.max !== '' && (d == null || d > +F.max)) return false;
  if (F.fiyatli && d == null) return false;
  if (F.kmp && !u.kmp) return false;
  if (F.ara) { const q = F.ara.toLocaleLowerCase('tr'); if (!(u.ad + ' ' + u.kategori + ' ' + u.secenek.map(s => s.ad + ' ' + s.sinif).join(' ')).toLocaleLowerCase('tr').includes(q)) return false; }
  return true;
}
function ustFiltre() {
  const katlar = [...new Set(VERI.urunler.map(u => u.kategori))];
  const tipler = [...new Set(VERI.urunler.filter(u => uygun(u, 'sinif')).flatMap(u => u.secenek.map(s => s.sinif)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const tek = F.sinif.size === 1 ? [...F.sinif][0] : '';
  $('#ustKat').innerHTML = `<option value="">Tüm kategoriler</option>` + katlar.map(k => `<option ${F.kat === k ? 'selected' : ''}>${esc(k)}</option>`).join('');
  $('#ustSin').innerHTML = `<option value="">${F.sinif.size > 1 ? F.sinif.size + ' ürün tipi seçili' : 'Tüm ürün tipleri'}</option>` + tipler.map(k => `<option ${tek === k ? 'selected' : ''}>${esc(k)}</option>`).join('');
}
$('#ustKat').onchange = e => { F.kat = e.target.value; F.sinif.clear(); katalog(); };
$('#ustSin').onchange = e => { F.sinif.clear(); if (e.target.value) F.sinif.add(e.target.value); katalog(); };
function katalog() {
  ustFiltre();
  const katlar = KATSIRA.filter(k => VERI.urunler.some(u => u.kategori === k));
  $('#katNav').innerHTML = `<button data-k="" class="${F.kat ? '' : 'on'}">Tümü</button>` + katlar.map(k => `<button data-k="${esc(k)}" class="${F.kat === k ? 'on' : ''}">${esc(k)}</button>`).join('');
  $$('#katNav button').forEach(b => b.onclick = () => { F.kat = b.dataset.k; F.sinif.clear(); katalog(); });
  // filtre paneli
  const siniflar = {}; VERI.urunler.filter(u => uygun(u, 'sinif')).forEach(u => new Set(u.secenek.map(s => s.sinif)).forEach(s => { if (s !== '—') siniflar[s] = (siniflar[s] || 0) + 1; }));
  const katSay = {}; VERI.urunler.filter(u => uygun(u, 'kat')).forEach(u => katSay[u.kategori] = (katSay[u.kategori] || 0) + 1);
  $('#filtre').innerHTML = `
    <div class="f-grup"><h4>Kategori</h4>${katlar.map(k => `<label class="f-sec"><input type="radio" name="fk" value="${esc(k)}" ${F.kat === k ? 'checked' : ''}> ${esc(k)}<span class="n">${katSay[k] || 0}</span></label>`).join('')}
      <label class="f-sec"><input type="radio" name="fk" value="" ${F.kat ? '' : 'checked'}> Tümü</label></div>
    <div class="f-grup"><h4>Ürün tipi</h4>${Object.keys(siniflar).sort((a,b)=>a.localeCompare(b,'tr')).map(s => `<label class="f-sec"><input type="checkbox" value="${esc(s)}" ${F.sinif.has(s) ? 'checked' : ''}> ${esc(s)}<span class="n">${siniflar[s]}</span></label>`).join('') || '<span class="kucuk">—</span>'}</div>
    <div class="f-grup"><h4>Fiyat (USD)</h4><div class="ikili"><input class="fi" id="fMin" placeholder="En az" value="${F.min}" inputmode="numeric" style="padding:8px;border:1px solid var(--cizgi);border-radius:8px;width:100%"><input id="fMax" placeholder="En çok" value="${F.max}" inputmode="numeric" style="padding:8px;border:1px solid var(--cizgi);border-radius:8px;width:100%"></div>
      <label class="f-sec" style="margin-top:8px"><input type="checkbox" id="fFiyatli" ${F.fiyatli ? 'checked' : ''}> Yalnız fiyatı olanlar</label><label class="f-sec"><input type="checkbox" id="fKmp" ${F.kmp ? 'checked' : ''}> Yalnız kampanyalı ürünler</label></div>
    <div class="f-grup"><button class="btn cizgi tam" id="fTemizle">Filtreleri temizle</button></div>`;
  $$('#filtre input[name=fk]').forEach(i => i.onchange = () => { F.kat = i.value; F.sinif.clear(); katalog(); });
  $$('#filtre input[type=checkbox][value]').forEach(i => i.onchange = () => { i.checked ? F.sinif.add(i.value) : F.sinif.delete(i.value); katalog(); });
  $('#fMin').onchange = e => { F.min = e.target.value.replace(/\D/g, ''); katalog(); };
  $('#fMax').onchange = e => { F.max = e.target.value.replace(/\D/g, ''); katalog(); };
  $('#fFiyatli').onchange = e => { F.fiyatli = e.target.checked; katalog(); };
  $('#fKmp').onchange = e => { F.kmp = e.target.checked; katalog(); };
  $('#fTemizle').onclick = () => { Object.assign(F, { kat:'', min:'', max:'', ara:'', fiyatli:false, kmp:false }); F.sinif.clear(); $('#ara').value = ''; katalog(); };
  // etiketler
  const et = []; if (F.kat) et.push(['kat', F.kat]); F.sinif.forEach(s => et.push(['sinif', s])); if (F.min) et.push(['min', 'En az ' + F.min + ' $']); if (F.max) et.push(['max', 'En çok ' + F.max + ' $']); if (F.ara) et.push(['ara', '“' + F.ara + '”']);
  $('#etiketler').innerHTML = et.map(([t, v], i) => `<span class="etiket">${esc(v)}<button data-i="${i}">×</button></span>`).join('');
  $$('#etiketler button').forEach(b => b.onclick = () => { const [t, v] = et[+b.dataset.i]; if (t === 'sinif') F.sinif.delete(v); else if (t === 'ara') { F.ara = ''; $('#ara').value = ''; } else F[t] = ''; katalog(); });
  // liste
  let L = VERI.urunler.filter(u => uygun(u));
  const fy = u => enDusuk(u) ?? 1e9;
  L.sort(F.sira === 'artan' ? (a, b) => fy(a) - fy(b) : F.sira === 'azalan' ? (a, b) => (enDusuk(b) ?? -1) - (enDusuk(a) ?? -1) : (a, b) => a.ad.localeCompare(b.ad, 'tr'));
  const AK = KMP.filter(kmpGecerli); let bant = $('#kmpBant'); if (!bant) { $('#etiketler').insertAdjacentHTML('beforebegin', '<div id="kmpBant"></div>'); bant = $('#kmpBant'); }
  bant.innerHTML = AK.length ? `<div class="kmp-ust"><div><b>Kampanyalar</b>${AK.map(k => `<span>${esc(k.ad)}: <b>%${k.oran}</b> ${k.kapsam === 'tumu' ? 'tüm ürünlerde' : esc((k.hedef || []).slice(0, 3).join(', ')) + ((k.hedef || []).length > 3 ? '…' : '')}${k.bit ? ' · ' + tarih(k.bit) + '\'e kadar' : ''}</span>`).join('')}</div><button class="btn cizgi" id="kmpGoster">${F.kmp ? 'Tüm ürünler' : 'Kampanyalı ürünleri göster'}</button></div>` : '';
  if ($('#kmpGoster')) $('#kmpGoster').onclick = () => { F.kmp = !F.kmp; katalog(); };
  $('#baslik').textContent = F.kmp ? 'Kampanyalı ürünler' : F.kat || 'Tüm ürünler'; $('#say').textContent = L.length + ' ürün';
  $('#izgara').innerHTML = L.map((u, i) => { const d = enDusuk(u); return `<div class="kart" data-id="${u.id}" style="animation:gYuz .5s ${Math.min(i, 12) * 30}ms backwards">
      <div class="foto ${u.gorsel ? '' : 'bos'}" style="${u.gorsel ? `background-image:url(${u.gorsel})` : ''}">${u.gorsel ? '' : 'Görsel yok'}<span class="k-kat">${esc(u.kategori)}</span>${u.kmp ? `<span class="k-kmp">%${u.kmp.oran} indirim</span>` : ''}</div>
      <div class="govde"><b>${esc(u.ad)}</b><span class="sec">${u.secenek.length ? u.secenek.length + ' seçenek' : 'Fiyat için bize ulaşın'}</span>
      <div class="fiyat">${d == null ? '<small>Fiyat sorunuz</small>' : (u.secenek.length > 1 ? '<small>başlayan </small>' : '') + (u.kmp ? `<s class="eski">${para(listeDusuk(u))}</s> <span class="yeni">${para(d)}</span>` : para(d))}</div>${u.kmp ? `<div class="kmp-ad">${esc(u.kmp.ad)}${u.kmp.bit ? ' · ' + tarih(u.kmp.bit) + '\'e kadar' : ''}</div>` : ''}</div></div>`; }).join('') || '<div class="bos-durum">Bu filtrelere uyan ürün yok.</div>';
  $$('#izgara .kart').forEach(k => k.onclick = () => urunAc(+k.dataset.id));
  $('#filtre').classList.remove('acik');
  EK.katalogFavori?.(); EK.katalogDuyuru?.(); EK.katalogNumune?.(); EK.katalogKarsilastirma?.(); EK.katalogAdres?.();
}
$('#ara').oninput = e => { F.ara = e.target.value.trim(); if ($('#s-katalog').classList.contains('gizli')) git('katalog'); else katalog(); };
$('#katPdf').onclick = () => katalogIndir();
$('#sirala').onchange = e => { F.sira = e.target.value; katalog(); };
$('#mFiltre').onclick = () => $('#filtre').classList.add('acik');
