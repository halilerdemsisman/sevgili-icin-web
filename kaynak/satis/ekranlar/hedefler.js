// Ekran: hedef takibi.
// ---------- 10. hedef takibi
const BOLGE = { 'Marmara': ['istanbul', 'kocaeli', 'bursa', 'tekirdağ', 'edirne', 'kırklareli', 'sakarya', 'yalova', 'bilecik', 'balıkesir', 'çanakkale'], 'Ege': ['izmir', 'aydın', 'muğla', 'manisa', 'denizli', 'uşak', 'kütahya', 'afyonkarahisar', 'afyon'], 'Akdeniz': ['antalya', 'mersin', 'adana', 'hatay', 'isparta', 'burdur', 'kahramanmaraş', 'osmaniye'], 'İç Anadolu': ['ankara', 'konya', 'kayseri', 'eskişehir', 'sivas', 'nevşehir', 'aksaray', 'niğde', 'kırşehir', 'kırıkkale', 'karaman', 'yozgat', 'çankırı'], 'Karadeniz': ['samsun', 'trabzon', 'ordu', 'rize', 'giresun', 'zonguldak', 'düzce', 'bolu', 'kastamonu', 'sinop', 'amasya', 'tokat', 'çorum', 'artvin', 'bartın', 'karabük', 'gümüşhane', 'bayburt'], 'Doğu Anadolu': ['erzurum', 'van', 'malatya', 'elazığ', 'erzincan', 'kars', 'ağrı', 'iğdır', 'ardahan', 'bingöl', 'muş', 'bitlis', 'tunceli', 'hakkari'], 'Güneydoğu Anadolu': ['gaziantep', 'şanlıurfa', 'diyarbakır', 'mardin', 'batman', 'siirt', 'şırnak', 'adıyaman', 'kilis'] };
const bolgeBul = sehir => { const s = String(sehir || '').toLocaleLowerCase('tr').trim(); for (const [b, L] of Object.entries(BOLGE)) if (L.includes(s)) return b; return s ? 'Yurt dışı / diğer' : 'Belirsiz'; };
let HDF = oku('exs-hedef', {});  // { 'YYYY-MM': { temsilci: {kul: tutar}, bolge: {ad: tutar} } }
const ayAnahtar = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const temsilciOf = kul => (MUS[kul] || {}).temsilci || '';
function hedefler() {
  $('#baslik').textContent = 'Hedefler';
  const HF = window.HF || (window.HF = { ay: ayAnahtar(new Date()) }), [y, a] = HF.ay.split('-').map(Number), bas = new Date(y, a - 1, 1), son = new Date(y, a, 1);
  const H = HDF[HF.ay] = HDF[HF.ay] || { temsilci: {}, bolge: {} };
  const S = Object.values(SIP).filter(o => o.durum !== 'iptal' && o.tarih >= +bas && o.tarih < +son), gun = Math.min(new Date(y, a, 0).getDate(), Math.max(1, Math.ceil((Math.min(Date.now(), +son) - bas) / GUN))), topGun = new Date(y, a, 0).getDate();
  const gT = {}, gB = {}; S.forEach(o => { const n = tutarlar(o).net, t = temsilciOf(o.kul) || '—', b = bolgeBul((MUS[o.kul] || {}).sehir); gT[t] = (gT[t] || 0) + n; gB[b] = (gB[b] || 0) + n; });
  const T = Object.values(KUL).map(u => u.kul), B = [...new Set([...Object.keys(BOLGE), ...Object.keys(gB)])];
  const satir = (ad, hedef, ger, attr) => { const yz = hedef ? ger / hedef * 100 : 0, tah = hedef ? ger / gun * topGun : 0; return `<tr><td><b>${ad}</b></td><td class="sag-hiza">${yonetici() ? `<input ${attr} value="${hedef || ''}" placeholder="hedef $" inputmode="numeric" class="hdf-in">` : usd(hedef)}</td><td class="sag-hiza"><b>${usd(ger)}</b></td>
    <td style="min-width:200px"><div class="hbar"><i style="width:${Math.min(100, yz)}%;background:${yz >= 100 ? 'var(--iyi)' : yz >= gun / topGun * 100 * .9 ? 'var(--seri)' : 'var(--kotu)'}"></i><em style="left:${gun / topGun * 100}%"></em></div><span class="kucuk">${hedef ? yuzde(yz) : '—'}</span></td><td class="sag-hiza kucuk">${hedef ? `ay sonu tahmini ${usd(tah)}<br>${tah >= hedef ? '<span style="color:var(--iyi)">hedefe ulaşır</span>' : `<span style="color:var(--kotu)">${usd(hedef - tah)} eksik kalabilir</span>`}` : ''}</td></tr>`; };
  const tH = T.reduce((x, k) => x + (+H.temsilci[k] || 0), 0), tG = Object.values(gT).reduce((x, v) => x + v, 0);
  $('#ustSag').innerHTML = `<input type="month" id="hAy" value="${HF.ay}" class="btn cizgi">`;
  $('#icerik').innerHTML = `<div class="kpi"><div><span>Toplam hedef</span><b>${usd(tH)}</b><small>${HF.ay}</small></div><div><span>Gerçekleşen</span><b>${usd(tG)}</b><small>${tH ? yuzde(tG / tH * 100) : '—'}</small></div><div><span>Ayın geçen kısmı</span><b>${yuzde(gun / topGun * 100)}</b><small>${gun} / ${topGun} gün</small></div><div><span>Atanmamış müşteri</span><b>${Object.values(MUS).filter(m => !m.temsilci).length}</b><small>Müşteri kartından temsilci atayın</small></div></div>
    <div class="kart"><h3>Temsilci bazında</h3><div class="alt">Gerçekleşen: temsilciye atanmış müşterilerin o aydaki net siparişleri (iptal hariç). Çubuktaki çizgi ayın bugüne kadar geçen kısmıdır; çubuk çizginin gerisindeyse hedefin gerisinde kalınıyor demektir.</div>
      <table class="tablo"><tr><th>Temsilci</th><th class="sag-hiza">Hedef</th><th class="sag-hiza">Gerçekleşen</th><th>İlerleme</th><th class="sag-hiza">Tahmin</th></tr>${T.map(k => satir(esc((KUL[k] || {}).ad || k) + `<div class="kucuk">${ROL_AD[rolu(KUL[k])]}</div>`, +H.temsilci[k] || 0, gT[k] || 0, `data-ht="${esc(k)}"`)).join('')}${gT['—'] ? satir('<span class="kucuk">Temsilcisi olmayan müşteriler</span>', 0, gT['—'], 'disabled') : ''}</table></div>
    <div class="kart"><h3>Bölge bazında</h3><div class="alt">Bölge, müşterinin kayıttaki şehrinden belirlenir.</div>
      <table class="tablo"><tr><th>Bölge</th><th class="sag-hiza">Hedef</th><th class="sag-hiza">Gerçekleşen</th><th>İlerleme</th><th class="sag-hiza">Tahmin</th></tr>${B.map(b => satir(esc(b), +H.bolge[b] || 0, gB[b] || 0, `data-hb="${esc(b)}"`)).join('')}</table></div>`;
  $('#hAy').onchange = e => { HF.ay = e.target.value || ayAnahtar(new Date()); hedefler(); };
  const kaydet = () => { yaz('exs-hedef', HDF); hedefler(); toast('Hedef kaydedildi.'); };
  $$('[data-ht]').forEach(i => i.onchange = () => { H.temsilci[i.dataset.ht] = Math.max(0, parseFloat(i.value.replace(/\./g, '')) || 0); kaydet(); });
  $$('[data-hb]').forEach(i => i.onchange = () => { H.bolge[i.dataset.hb] = Math.max(0, parseFloat(i.value.replace(/\./g, '')) || 0); kaydet(); });
}
// müşteri kartına temsilci atama
