// Siparişlerim: sipariş kartı (durum adımları, teslim, nakliye), liste, durum değişikliği bildirimi.
// ---------- siparişlerim
const DURUM = { yeni: ['Yeni talep', 'd-yeni'], onay: ['Onaylandı', 'd-onay'], uretim: ['Üretimde', 'd-uretim'], sevk: ['Sevk edildi', 'd-sevk'], iptal: ['İptal', 'd-iptal'] };
const tarih = t => new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
function siparisTablo(L, yonetici) {
  return `<table class="tablo"><tr><th>No</th><th>Tarih</th>${yonetici ? '<th>Firma</th>' : ''}<th>Kalemler</th><th style="text-align:right">Tutar</th><th>Durum</th></tr>
    ${L.slice().reverse().map(o => `<tr><td><b>${o.no}</b>${yonetici ? '' : `<div><button class="btn cizgi" style="padding:4px 8px;font-size:11px;margin-top:6px" data-dosya="${o.no}">Dosyayı indir</button></div>`}</td><td>${tarih(o.tarih)}</td>${yonetici ? `<td>${esc(o.firma)}<div class="kucuk">${esc(o.ad)}</div></td>` : ''}
      <td>${o.kalemler.map(x => `<div style="margin-bottom:6px"><b>${x.adet} × ${esc(x.ad)}</b><div class="kucuk">${detay(x)}</div></div>`).join('')}${o.adres ? `<div class="kucuk">Adres/not: ${esc(o.adres)}</div>` : ''}</td>
      <td style="text-align:right;white-space:nowrap"><b>${para(o.toplam)}${o.teklif ? ' +' : ''}</b></td>
      <td>${yonetici ? `<select data-no="${o.no}">${Object.entries(DURUM).map(([k, v]) => `<option value="${k}" ${o.durum === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>` : `<span class="durum ${DURUM[o.durum][1]}">${DURUM[o.durum][0]}</span>`}</td></tr>`).join('')}</table>`;
}

// ===== v2.1: sipariş takibi + bildirim, cari hesabım =====
const ADIM = [['yeni', 'Talep alındı'], ['onay', 'Onaylandı'], ['uretim', 'Üretimde'], ['sevk', 'Sevk edildi']];
const zamanYaz = t => new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
function siparisKarti(o) {
  const iptal = o.durum === 'iptal', idx = ADIM.findIndex(a => a[0] === o.durum), G = o.gecmis || [{ durum: 'yeni', zaman: o.tarih }];
  const zam = d => { const g = G.filter(x => x.durum === d).pop(); return g ? zamanYaz(g.zaman) : ''; };
  let h = `<div class="sk"><div class="sk-ust"><div><b>${o.no}</b><div class="kucuk">${tarih(o.tarih)} · ${o.kalemler.reduce((a, x) => a + x.adet, 0)} adet · ${o.kalemler.length} kalem</div></div>
      <div class="sk-tutar">${o.net != null ? `<b>${para(Math.round(o.net))}</b><div class="kucuk">iskontolu net · liste ${para(o.toplam)}</div>` : `<b>${para(o.toplam)}${o.teklif ? ' +' : ''}</b><div class="kucuk">liste fiyatı</div>`}</div>
      <span class="durum ${DURUM[o.durum][1]}">${DURUM[o.durum][0]}</span></div>
    ${iptal ? '<div class="sk-iptal">Bu sipariş iptal edildi. Bilgi için satış temsilcinizle görüşün.</div>' : `<div class="adimlar">${ADIM.map(([k, ad], i) => { const ok = i < idx || (o.durum === 'sevk' && i === idx); return `<div class="adim ${ok ? 'tamam' : i === idx ? 'simdi' : ''}"><i>${ok ? '✓' : i + 1}</i><b>${ad}</b><span>${zam(k)}</span></div>`; }).join('')}</div>`}
    <div class="sk-bilgi">${o.termin ? `<div><span>Tahmini teslim</span><b>${tarih(o.termin)}</b></div>` : `<div><span>Tahmini teslim</span><b class="soluk">${iptal || o.durum === 'sevk' ? '—' : 'Onaydan sonra bildirilecek'}</b></div>`}
      <div><span>Nakliye</span><b>${esc(o.kargo || '—')}</b></div><div><span>Takip / irsaliye no</span><b>${esc(o.takip || '—')}</b></div>${o.satisNot ? `<div class="genis"><span>Satış ekibinin notu</span><b>${esc(o.satisNot)}</b></div>` : ''}</div>
    <details><summary>Kalemleri göster</summary>${o.kalemler.map(x => `<div style="margin:8px 0"><b>${x.adet} × ${esc(x.ad)}</b><div class="kucuk">${detay(x)}</div></div>`).join('')}${o.adres ? `<div class="kucuk">Adres/not: ${esc(o.adres)}</div>` : ''}</details>
    <button class="btn cizgi" style="padding:6px 10px;font-size:12px" data-dosya="${o.no}">Sipariş dosyasını indir</button></div>`;
  if (EK.siparisKartiTahmin) h = EK.siparisKartiTahmin(o, h);
  if (EK.siparisKartiProje) h = EK.siparisKartiProje(o, h);
  if (EK.siparisKartiOdeme) h = EK.siparisKartiOdeme(o, h);
  return h;
}
function siparislerim() {
  const L = oku('exb-siparisler', []).filter(o => o.kul === ben.kul).slice().sort((a, b) => b.tarih - a.tarih);
  gorulduYap(L);
  const ac = L.filter(o => !['sevk', 'iptal'].includes(o.durum));
  $('#s-siparisler').innerHTML = `<h2>Siparişlerim</h2><p class="kucuk">Siparişinizin durumu, tahmini teslim tarihi ve nakliye bilgisi satış ekibi güncelledikçe burada görünür.</p>
    ${L.length ? `<div class="sk-ozet"><div><span>Açık sipariş</span><b>${ac.length}</b></div><div><span>Sevk edilen</span><b>${L.filter(o => o.durum === 'sevk').length}</b></div><div><span>Toplam sipariş</span><b>${L.length}</b></div></div>
      <div class="sk-filtre">${[['', 'Tümü'], ['acik', 'Açık'], ['sevk', 'Sevk edildi'], ['iptal', 'İptal']].map(([k, a]) => `<button data-sf="${k}" class="${(window.SKF || '') === k ? 'on' : ''}">${a}</button>`).join('')}</div>
      ${L.filter(o => !window.SKF || (window.SKF === 'acik' ? ac.includes(o) : o.durum === window.SKF)).map(siparisKarti).join('') || '<div class="bos-durum">Bu filtrede sipariş yok.</div>'}`
      : '<div class="bos-durum">Henüz sipariş talebiniz yok. <br><br><button class="btn marka" onclick="git(\'katalog\')">Kataloğa git</button></div>'}`;
  $$('[data-sf]').forEach(b => b.onclick = () => { window.SKF = b.dataset.sf; siparislerim(); });
  $$('[data-dosya]').forEach(b => b.onclick = () => siparisDosyasi(L.find(o => o.no === b.dataset.dosya)));
  EK.siparislerTekrar?.(); EK.siparislerNumune?.(); EK.siparislerSikAlinan?.(); EK.siparislerTalep?.();
}
// bildirim: durum veya takip bilgisi değişince
const imza = o => [o.durum, o.termin || '', o.kargo || '', o.takip || ''].join('|');
function gorulduYap(L) { const G = {}; L.forEach(o => G[o.no] = imza(o)); yaz('exb-gorulen-' + ben.kul, G); rozetSiparis(0); }
function rozetSiparis(n) { const b = $('[data-git=siparisler]'); let r = b.querySelector('.rozet'); if (!r) { b.insertAdjacentHTML('beforeend', '<span class="rozet gizli"></span>'); r = b.querySelector('.rozet'); } r.textContent = n; r.classList.toggle('gizli', !n); }
function bildirimKontrol() {
  if (!ben) return; const L = oku('exb-siparisler', []).filter(o => o.kul === ben.kul), G = oku('exb-gorulen-' + ben.kul, null);
  if (!G) return gorulduYap(L);
  const D = L.filter(o => G[o.no] !== undefined && G[o.no] !== imza(o));
  if (!$('#s-siparisler').classList.contains('gizli')) { if (D.length) siparislerim(); return; }
  D.forEach(o => { const eski = (G[o.no] || '').split('|')[0]; toast(eski !== o.durum ? `${o.no}: ${DURUM[o.durum][0]}` : `${o.no}: teslim / nakliye bilgisi güncellendi`); G[o.no] = imza(o); o._yeni = 1; });
  if (D.length) { yaz('exb-gorulen-' + ben.kul, G); window._bekleyen = (window._bekleyen || 0) + D.length; rozetSiparis(window._bekleyen); }
}
setInterval(bildirimKontrol, 15000);
