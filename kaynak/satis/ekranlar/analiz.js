// Ekran: analiz.
// ---------- analiz
function istatistik(f) {
  const S = Object.values(SIP).filter(o => o.durum !== 'iptal').map(o => f && (f.kat || f.sinif) ? { ...o, kalemler: o.kalemler.filter(x => kalemUyar(x, f)) } : o).filter(o => o.kalemler.length), simdi = new Date();
  const aylar = []; for (let i = 11; i >= 0; i--) { const d = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1); aylar.push({ k: d.getFullYear() + '-' + d.getMonth(), ad: d.toLocaleDateString('tr-TR', { month: 'short' }), yil: d.getFullYear(), net: 0, adet: 0 }); }
  const kat = {}, urun = {}, mus = {}, isk = {}, kum = {}, fil = {}, sinif = {};
  let brut = 0, net = 0;
  S.forEach(o => {
    const t = tutarlar(o), d = new Date(o.tarih), a = aylar.find(x => x.k === d.getFullYear() + '-' + d.getMonth());
    if (a) { a.net += t.net; a.adet++; } brut += t.brut; net += t.net;
    mus[o.firma] = (mus[o.firma] || 0) + t.net;
    o.kalemler.forEach(x => { const n = (x.birim || 0) * x.adet * (1 - t.oran / 100), k = x.kategori || KATEGORI[x.ad] || 'Diğer';
      kat[k] = (kat[k] || 0) + n; urun[x.ad] = (urun[x.ad] || 0) + x.adet; if (x.sinif) sinif[x.sinif] = (sinif[x.sinif] || 0) + x.adet;
      const ik = (x.iskelet || '').replace(/ \(.*/, ''); if (ik) isk[ik] = (isk[ik] || 0) + x.adet; if (x.kumas) kum[x.kumas] = (kum[x.kumas] || 0) + x.adet; const f = (x.file || '').replace(/ \(.*/, ''); if (f) fil[f] = (fil[f] || 0) + x.adet; });
  });
  const son3 = aylar.slice(-3).reduce((a, x) => a + x.net, 0), onc3 = aylar.slice(-6, -3).reduce((a, x) => a + x.net, 0);
  const sirala = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const musL = sirala(mus);
  return { siparis: S.length, brut, net, iskOran: brut ? (1 - net / brut) * 100 : 0, ortSepet: S.length ? net / S.length : 0, aylar, kat: sirala(kat), urun: sirala(urun), mus: musL, isk: sirala(isk), kum: sirala(kum), fil: sirala(fil), sinif: sirala(sinif),
    buyume: onc3 ? (son3 - onc3) / onc3 * 100 : null, son3, onc3, ilk3Pay: net ? musL.slice(0, 3).reduce((a, x) => a + x[1], 0) / net * 100 : 0,
    bekleyen: Object.values(SIP).filter(o => o.durum === 'yeni').length, iptal: Object.values(SIP).filter(o => o.durum === 'iptal').length, toplamSip: Object.keys(SIP).length,
    teklifKalem: S.reduce((a, o) => a + o.kalemler.filter(x => x.birim == null).length, 0), musteri: Object.keys(MUS).length, aktifMus: musL.length,
    satilmayan: VERI.urunler.filter(u => !urun[u.ad]).map(u => u.ad) };
}
const cubuklar = (L, bicim, n = 8) => { const max = Math.max(1, ...L.map(x => x[1])); return `<div class="cubuklar">${L.slice(0, n).map(([a, v]) => `<div class="cubuk" title="${esc(a)}: ${bicim(v)}"><span class="ad">${esc(a)}</span><span class="iz"><i style="width:${v / max * 100}%"></i></span><span class="d">${bicim(v)}</span></div>`).join('') || '<span class="kucuk">Veri yok.</span>'}</div>`; };
function analiz() {
  $('#baslik').textContent = 'Satış analizi';
  const s = istatistik(AF), max = Math.max(1, ...s.aylar.map(a => a.net));
  $('#icerik').innerHTML = `<div class="kpi">
      <div><span>Net satış (iptal hariç)</span><b>${usd(s.net)}</b><small>${tlYap(s.net)}</small></div>
      <div><span>Sipariş</span><b>${s.siparis}</b><small>ortalama ${usd(s.ortSepet)}</small></div>
      <div><span>Ortalama iskonto</span><b>${yuzde(s.iskOran)}</b><small>${usd(s.brut - s.net)} indirim</small></div>
      <div><span>Son 3 ay / önceki 3 ay</span><b style="color:${s.buyume == null ? 'inherit' : s.buyume >= 0 ? 'var(--iyi)' : 'var(--kotu)'}">${s.buyume == null ? '—' : (s.buyume >= 0 ? '▲ ' : '▼ ') + yuzde(Math.abs(s.buyume))}</b><small>${usd(s.son3)} / ${usd(s.onc3)}</small></div>
      <div><span>Aktif müşteri</span><b>${s.aktifMus}</b><small>ilk 3 müşteri payı ${yuzde(s.ilk3Pay)}</small></div></div>
    <div class="kart"><h3>Aylık net satış (USD)</h3><div class="alt">Son 12 ay · çubuğun üzerine gelince tutar görünür</div>
      <div class="aylik">${s.aylar.map(a => `<div class="s" style="--h:${a.net / max * 170}px"><em>${usd(a.net)} · ${a.adet} sip.</em><i style="height:${a.net / max * 170}px"></i></div>`).join('')}</div>
      <div class="aylar">${s.aylar.map(a => `<span>${a.ad}</span>`).join('')}</div></div>
    <div class="izgara2">
      <div class="kart"><h3>Kategoriye göre net satış</h3><div class="alt">USD</div>${cubuklar(s.kat, usd)}</div>
      <div class="kart"><h3>En iyi müşteriler</h3><div class="alt">Net satış, USD</div>${cubuklar(s.mus, usd)}</div>
      <div class="kart"><h3>En çok satan ürünler</h3><div class="alt">Adet</div>${cubuklar(s.urun, v => v + ' ad.')}</div>
      <div class="kart"><h3>Ürün tipine göre</h3><div class="alt">Adet</div>${cubuklar(s.sinif, v => v + ' ad.')}</div>
      <div class="kart"><h3>İskelet rengi tercihi</h3><div class="alt">Adet</div>${cubuklar(s.isk, v => v + ' ad.')}</div>
      <div class="kart"><h3>Kumaş ve file tercihi</h3><div class="alt">Adet</div>${cubuklar([...s.kum.map(([k, v]) => ['Kumaş ' + k, v]), ...s.fil.map(([k, v]) => ['File ' + k, v])].sort((a, b) => b[1] - a[1]), v => v + ' ad.')}</div>
    </div>`;
  $('#icerik').insertAdjacentHTML('afterbegin', `<div class="kart" style="margin-bottom:16px"><div class="filtreler" style="margin:0">${katSinifSec(AF, 'aKat', 'aSin')}${AF.kat || AF.sinif ? '<button class="btn cizgi" id="aTemiz">Filtreyi temizle</button>' : ''}<span class="kucuk" style="align-self:center">${AF.kat || AF.sinif ? 'Analiz yalnız seçili kategori / ürün tipindeki kalemleri gösteriyor.' : 'Analizi kategori veya ürün tipine göre daraltabilirsiniz.'}</span></div></div>`);
  $('#aKat').onchange = e => { AF.kat = e.target.value; AF.sinif = ''; analiz(); };
  $('#aSin').onchange = e => { AF.sinif = e.target.value; analiz(); };
  if ($('#aTemiz')) $('#aTemiz').onclick = () => { AF.kat = AF.sinif = ''; analiz(); };
}
