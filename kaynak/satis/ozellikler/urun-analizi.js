// Ürün ve renk analizi, stok planı (v3.2).
(function () {
  menuEkle('urunanaliz', 'Ürün ve renk analizi', '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 6"/>', 'analiz');
  const temiz = s => String(s || '').replace(/\s*\(.*\)\s*$/, '').trim();
  let aUrun = '', aGun = 180, aKap = 2;
  function kalemler() { const sin = Date.now() - aGun * 864e5, L = [];
    Object.values(SIP).forEach(o => { if (!o || o.durum === 'iptal' || !(o.tarih >= sin)) return; (o.kalemler || []).forEach(k => L.push({ ...k, kul: o.kul, tarih: o.tarih })); }); return L; }
  const dagilim = (L, f) => { const m = {}; L.forEach(k => { const v = f(k); if (v) m[v] = (m[v] || 0) + (k.adet || 0); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const barlar = (D, top) => { const mx = Math.max(1, ...D.map(x => x[1])); return D.map(([a, n]) => `<div class="a8-bar"><span title="${esc(a)}">${esc(a)}</span><i style="width:${Math.max(1, n / mx * 100) * .6}%"></i><em>${n} adet · %${Math.round(n / top * 100)}</em></div>`).join('') || '<div class="kucuk">Veri yok</div>'; };
  S6.urunanaliz = function () {
    $('#baslik').textContent = 'Ürün ve renk analizi';
    const L = kalemler(), U = dagilim(L, k => k.ad);
    if (aUrun && !U.some(x => x[0] === aUrun)) aUrun = '';
    $('#ustSag').innerHTML = `<select class="btn cizgi" id="aU"><option value="">Tüm ürünler</option>${U.map(([a, n]) => `<option ${a === aUrun ? 'selected' : ''} value="${esc(a)}">${esc(a)} (${n})</option>`).join('')}</select> <select class="btn cizgi" id="aG">${[[90, 'Son 3 ay'], [180, 'Son 6 ay'], [365, 'Son 12 ay']].map(([g, a]) => `<option value="${g}" ${g === aGun ? 'selected' : ''}>${a}</option>`).join('')}</select>`;
    $('#aU').onchange = e => { aUrun = e.target.value; S6.urunanaliz(); }; $('#aG').onchange = e => { aGun = +e.target.value; S6.urunanaliz(); };
    const K = aUrun ? L.filter(k => k.ad === aUrun) : L, top = K.reduce((a, k) => a + (k.adet || 0), 0), ay = aGun / 30.4;
    // stok planı: ürün + seçenek + iskelet (+ file/kumaş) kombinasyonu
    const kb = {}; K.forEach(k => { const key = [k.ad, k.secenek, temiz(k.iskelet), temiz(k.file) || temiz(k.kumas)].join('|'); const r = kb[key] = kb[key] || { ad: k.ad, sec: k.secenek, isk: temiz(k.iskelet), ren: temiz(k.file) || (k.kumas ? 'Kumaş ' + temiz(k.kumas) : ''), adet: 0, son90: 0, bayi: new Set() }; r.adet += k.adet || 0; if (k.tarih >= Date.now() - 90 * 864e5) r.son90 += k.adet || 0; r.bayi.add(k.kul); });
    const P = Object.values(kb).map(r => { const aylik = r.adet / ay, trend = r.son90 / 3 > aylik * 1.2 ? '↑' : r.son90 / 3 < aylik * .8 ? '↓' : '→'; return { ...r, aylik, trend, oneri: Math.ceil(Math.max(aylik, r.son90 / 3) * aKap) }; }).sort((a, b) => b.adet - a.adet);
    const enIsk = dagilim(K, k => temiz(k.iskelet))[0];
    $('#icerik').innerHTML = `<div class="a8-ozet"><div>Satılan adet<b>${top.toLocaleString('tr-TR')}</b><span class="kucuk">${aUrun ? esc(aUrun) : 'tüm ürünler'}</span></div><div>Aylık ortalama<b>${Math.round(top / ay).toLocaleString('tr-TR')}</b></div><div>En çok tercih edilen iskelet<b>${enIsk ? esc(enIsk[0]) : '—'}</b>${enIsk ? `<span class="kucuk">%${Math.round(enIsk[1] / top * 100)} pay</span>` : ''}</div><div>Kombinasyon sayısı<b>${P.length}</b></div></div>
      <div class="a8-iki">${aUrun ? '' : `<div class="kart"><h3>En çok satan ürünler</h3>${barlar(U.slice(0, 12), top)}</div>`}
        <div class="kart"><h3>İskelet rengi tercihi</h3>${barlar(dagilim(K, k => temiz(k.iskelet)), top)}</div>
        <div class="kart"><h3>File / kumaş tercihi</h3>${barlar(dagilim(K, k => temiz(k.file) || (k.kumas ? 'Kumaş ' + temiz(k.kumas) : '')), top)}</div>
        <div class="kart"><h3>Seçenek</h3>${barlar(dagilim(K, k => k.secenek), top)}</div></div>
      <div class="kart"><h3>Stok planı önerisi</h3><div class="alt">Her ürün-renk kombinasyonu için aylık satış hızına göre önerilen hazır stok. Son 3 ayda hızlanan kombinasyonlarda son 3 ayın ortalaması kullanılır. Kapsama süresi: <input class="s6-in" id="aKap" value="${aKap}" style="width:50px"> ay</div>
      <table class="tablo"><tr><th>Ürün</th><th>Seçenek</th><th>İskelet</th><th>File / kumaş</th><th class="sag-hiza">Satılan</th><th class="sag-hiza">Aylık ort.</th><th>Eğilim</th><th class="sag-hiza">Bayi</th><th class="sag-hiza">Önerilen stok</th></tr>
      ${P.slice(0, 60).map(r => `<tr><td><b>${esc(r.ad)}</b></td><td>${esc(r.sec || '—')}</td><td>${esc(r.isk || '—')}</td><td>${esc(r.ren || '—')}</td><td class="sag-hiza">${r.adet}</td><td class="sag-hiza">${r.aylik.toFixed(1).replace('.', ',')}</td><td style="text-align:center;color:${r.trend === '↑' ? '#16a34a' : r.trend === '↓' ? '#b91c1c' : 'inherit'}">${r.trend}</td><td class="sag-hiza">${r.bayi.size}</td><td class="sag-hiza"><b>${r.oneri}</b></td></tr>`).join('') || '<tr><td colspan="9" class="kucuk">Bu dönemde sipariş yok.</td></tr>'}</table>
      <button class="btn cizgi" id="aXls" style="margin-top:10px">Stok planını Excel'e (CSV) indir</button></div>`;
    $('#aKap').onchange = e => { const v = sayiTR(e.target.value); if (v > 0) aKap = v; S6.urunanaliz(); };
    $('#aXls').onclick = () => { const s = '﻿Ürün;Seçenek;İskelet;File/Kumaş;Satılan;Aylık ort.;Eğilim;Önerilen stok\n' + P.map(r => [r.ad, r.sec, r.isk, r.ren, r.adet, r.aylik.toFixed(1).replace('.', ','), r.trend, r.oneri].map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(';')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'text/csv' })); a.download = 'stok_plani_' + bugun() + '.csv'; a.click(); };
  };
})();
