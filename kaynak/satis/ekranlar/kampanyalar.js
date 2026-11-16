// Ekran: kampanya ve sezon indirimleri.
// ===== kampanya ve sezon indirimleri =====
const kmpYaz = () => { yaz('exs-kampanya', KMP); yaz('exb-kampanya', KMP); };
yaz('exb-kampanya', KMP);
const bugun = () => new Date().toISOString().slice(0, 10);
const kmpDurum = k => k.aktif === false ? ['Durduruldu', 'd-iptal'] : k.bas && k.bas > bugun() ? ['Planlandı', 'd-yeni'] : k.bit && k.bit < bugun() ? ['Sona erdi', 'd-iptal'] : ['Yayında', 'd-onay'];
function kmpPerf(k) {
  const L = Object.values(SIP).filter(o => o.durum !== 'iptal').flatMap(o => o.kalemler.filter(x => x.kampanya && x.kampanya.startsWith(k.ad + ' (')).map(x => ({ o, x })));
  return { adet: L.reduce((a, y) => a + y.x.adet, 0), ciro: L.reduce((a, y) => a + (y.x.birim || 0) * y.x.adet, 0), indirim: L.reduce((a, y) => a + ((y.x.liste || y.x.birim || 0) - (y.x.birim || 0)) * y.x.adet, 0), siparis: new Set(L.map(y => y.o.no)).size };
}
function kampanyalar() {
  $('#baslik').textContent = 'Kampanyalar';
  $('#ustSag').innerHTML = '<button class="btn marka" id="kYeni">Yeni kampanya</button>';
  $('#kYeni').onclick = () => kmpForm();
  $('#icerik').innerHTML = `<div class="kart"><h3>Kampanya ve sezon indirimleri</h3><div class="alt">Yayındaki kampanyalar bayi portalında eski ve yeni fiyatla, “%… indirim” etiketiyle görünür. Aynı ürüne birden çok kampanya denk gelirse en yüksek oran uygulanır. Kampanya indirimi, firma iskontosundan önce birim fiyata uygulanır.</div>
    ${KMP.length ? `<table class="tablo"><tr><th>Kampanya</th><th>Kapsam</th><th class="sag-hiza">İndirim</th><th>Tarih</th><th>Durum</th><th class="sag-hiza">Satış</th><th></th></tr>
    ${KMP.map((k, i) => { const d = kmpDurum(k), p = kmpPerf(k); return `<tr><td><b>${esc(k.ad)}</b>${k.not ? `<div class="kucuk">${esc(k.not)}</div>` : ''}</td><td class="kucuk">${k.kapsam === 'tumu' ? 'Tüm ürünler' : (k.kapsam === 'kategori' ? 'Kategori: ' : 'Ürün: ') + esc((k.hedef || []).join(', '))}</td>
      <td class="sag-hiza"><b>%${k.oran}</b></td><td class="kucuk">${k.bas ? tarih(k.bas) : 'hemen'} – ${k.bit ? tarih(k.bit) : 'süresiz'}</td><td><span class="durum ${d[1]}">${d[0]}</span></td>
      <td class="sag-hiza">${p.siparis ? `${p.siparis} sipariş · ${p.adet} ad.<div class="kucuk">${usd(p.ciro)} · indirim ${usd(p.indirim)}</div>` : '<span class="kucuk">henüz yok</span>'}</td>
      <td style="white-space:nowrap"><button class="btn cizgi" data-kd="${i}">Düzenle</button> <button class="btn cizgi" data-ka="${i}">${k.aktif === false ? 'Başlat' : 'Durdur'}</button> <button class="btn cizgi" data-ks="${i}">Sil</button></td></tr>`; }).join('')}</table>`
    : '<div class="bos">Henüz kampanya yok. “Yeni kampanya” ile örneğin “Sezon öncesi şezlong kampanyası, %10, 1–30 Kasım” tanımlayabilirsiniz.</div>'}</div>`;
  $$('[data-kd]').forEach(b => b.onclick = () => kmpForm(+b.dataset.kd));
  $$('[data-ka]').forEach(b => b.onclick = () => { const k = KMP[+b.dataset.ka]; k.aktif = k.aktif === false; kmpYaz(); toast(k.aktif ? 'Kampanya başlatıldı.' : 'Kampanya durduruldu.'); kampanyalar(); });
  $$('[data-ks]').forEach(b => b.onclick = () => { if (!confirm('Kampanya silinsin mi?')) return; KMP.splice(+b.dataset.ks, 1); kmpYaz(); kampanyalar(); });
  { // kampanyanın geçerli olduğu bayiler
  $$('#icerik table.tablo tr').slice(1).forEach((r, i) => { const k = KMP[i]; if (!k) return; r.children[1].insertAdjacentHTML('beforeend', `<div class="kucuk"><b>${(k.bayiler || []).length ? 'Bayiler: ' + esc(k.bayiler.map(b => (MUS[b] || {}).firma || b).join(', ')) : 'Tüm bayiler'}</b></div>`); }); 
  }
}
function kmpForm(i, on) {
  const k = i == null ? { ad: '', oran: 10, kapsam: 'kategori', hedef: [], bayiler: [], bas: bugun(), bit: '', aktif: true, not: '' } : { ...KMP[i], hedef: [...(KMP[i].hedef || [])], bayiler: [...(KMP[i].bayiler || [])] };
  let bayiSec = k.bayiler.length > 0;
  const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) p.remove(); }; document.body.appendChild(p);
  function ciz() {
    const sec = k.kapsam === 'kategori' ? KAT_L : k.kapsam === 'urun' ? VERI.urunler.map(u => u.ad).sort((a, b) => a.localeCompare(b, 'tr')) : [];
    const ornek = VERI.urunler.filter(u => k.kapsam === 'tumu' || (k.hedef || []).includes(k.kapsam === 'kategori' ? u.kategori : u.ad)).slice(0, 4);
    p.innerHTML = `<div class="pencere" style="max-width:720px"><button class="kapat">×</button><h2 style="margin:0 0 14px">${i == null ? 'Yeni kampanya' : 'Kampanyayı düzenle'}</h2>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px"><div class="alan"><label>Kampanya adı (bayi bunu görür)</label><input id="kAd" value="${esc(k.ad)}" placeholder="ör. Sezon öncesi şezlong kampanyası"></div>
        <div class="alan"><label>İndirim %</label><input id="kOran" inputmode="decimal" value="${k.oran}"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="alan"><label>Başlangıç</label><input id="kBas" type="date" value="${k.bas || ''}"></div><div class="alan"><label>Bitiş (boş = süresiz)</label><input id="kBit" type="date" value="${k.bit || ''}"></div></div>
      <div class="alan"><label>Kapsam</label><div class="sk-sec">${[['tumu', 'Tüm ürünler'], ['kategori', 'Kategori seç'], ['urun', 'Ürün seç']].map(([v, a]) => `<label><input type="radio" name="kKap" value="${v}" ${k.kapsam === v ? 'checked' : ''}> ${a}</label>`).join('')}</div></div>
      ${sec.length ? `<div class="hedefler">${sec.map(h => `<label class="${k.hedef.includes(h) ? 'on' : ''}"><input type="checkbox" value="${esc(h)}" ${k.hedef.includes(h) ? 'checked' : ''}> ${esc(h)}</label>`).join('')}</div>` : ''}
      <div class="alan"><label>Hangi bayiler görsün?</label><div class="sk-sec"><label><input type="radio" name="kBy" value="tum" ${bayiSec ? '' : 'checked'}> Tüm bayiler</label><label><input type="radio" name="kBy" value="sec" ${bayiSec ? 'checked' : ''}> Seçili bayiler</label></div></div>
      ${bayiSec ? `<div class="hedefler bayiler">${Object.values(MUS).sort((a, b) => (a.firma || '').localeCompare(b.firma || '', 'tr')).map(m => `<label class="${k.bayiler.includes(m.kul) ? 'on' : ''}"><input type="checkbox" value="${esc(m.kul)}" ${k.bayiler.includes(m.kul) ? 'checked' : ''}> ${esc(m.firma || m.kul)}</label>`).join('') || '<span class="kucuk">Kayıtlı bayi yok.</span>'}</div>` : ''}
      <div class="alan"><label>İç not (bayi görmez)</label><input id="kNot" value="${esc(k.not || '')}" placeholder="ör. stok eritme, fuar sonrası"></div>
      ${ornek.length ? `<div class="kucuk" style="margin:4px 0 14px">Örnek fiyat: ${ornek.map(u => { const s = u.secenek.find(x => x.fiyat != null); if (!s) return ''; const f = typeof fiyatAl === 'function' ? fiyatAl(u, s) : s.fiyat; return f == null ? '' : `${esc(u.ad)} ${usd(f)} → <b>${usd(Math.round(f * (1 - (+k.oran || 0) / 100)))}</b>`; }).filter(Boolean).join(' · ')}</div>` : ''}
      <div class="hata" id="kHata" style="color:var(--kotu);font-size:13px;margin-bottom:8px"></div>
      <button class="btn marka" id="kKay">${i == null ? 'Kampanyayı yayınla' : 'Kaydet'}</button></div>`;
    p.querySelector('.kapat').onclick = () => p.remove();
    const oku_ = () => { k.ad = p.querySelector('#kAd').value.trim(); k.oran = Math.min(90, Math.max(0, parseFloat(p.querySelector('#kOran').value.replace(',', '.')) || 0)); k.bas = p.querySelector('#kBas').value; k.bit = p.querySelector('#kBit').value; k.not = p.querySelector('#kNot').value.trim(); };
    p.querySelectorAll('[name=kKap]').forEach(x => x.onchange = () => { oku_(); k.kapsam = x.value; k.hedef = []; ciz(); });
    p.querySelectorAll('[name=kBy]').forEach(x => x.onchange = () => { oku_(); bayiSec = x.value === 'sec'; if (!bayiSec) k.bayiler = []; ciz(); });
    p.querySelectorAll('.bayiler input').forEach(x => x.onchange = () => { oku_(); k.bayiler = x.checked ? [...k.bayiler, x.value] : k.bayiler.filter(h => h !== x.value); ciz(); });
    p.querySelectorAll('.hedefler:not(.bayiler) input').forEach(x => x.onchange = () => { oku_(); k.hedef = x.checked ? [...k.hedef, x.value] : k.hedef.filter(h => h !== x.value); ciz(); });
    p.querySelector('#kOran').oninput = () => { clearTimeout(window._ko); window._ko = setTimeout(() => { oku_(); ciz(); const i2 = p.querySelector('#kOran'); i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); }, 500); };
    p.querySelector('#kKay').onclick = () => { oku_(); const h = !k.ad ? 'Kampanya adı girin.' : !(k.oran > 0) ? 'İndirim oranı girin.' : k.kapsam !== 'tumu' && !k.hedef.length ? 'En az bir kategori veya ürün seçin.' : k.bit && k.bas && k.bit < k.bas ? 'Bitiş tarihi başlangıçtan önce olamaz.' : bayiSec && !k.bayiler.length ? 'En az bir bayi seçin veya “Tüm bayiler”i işaretleyin.' : '';
      if (h) { p.querySelector('#kHata').textContent = h; return; } if (i == null) KMP.push(k); else KMP[i] = k; kmpYaz(); p.remove(); toast('Kampanya kaydedildi; bayi portalında görünüyor.'); kampanyalar(); };
  }
  ciz();
  { // ürünler ekranından seçilenlerle açıldıysa kapsam ve hedefler işaretlenir
  const p = $$('.perde').pop(); if (!p) return;
  if (on && i == null) { const r = p.querySelector(`[name=kKap][value=${on.kapsam}]`); if (r) { r.checked = true; r.dispatchEvent(new Event('change')); }
    on.hedef.forEach(h => { const c = [...p.querySelectorAll('.hedefler input')].find(x => x.value === h); if (c && !c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } }); }
  }
}
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
