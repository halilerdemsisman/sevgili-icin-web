// Ekran: satış tahmini, ürün önerisi ve raporlar.
// ---------- satış tahmini ve ürün önerisi
function tahmin(s) {
  const y = s.aylar.map(a => a.net), n = y.length, xs = y.map((_, i) => i), mx = (n - 1) / 2, my = y.reduce((a, b) => a + b, 0) / n;
  const egim = xs.reduce((a, x, i) => a + (x - mx) * (y[i] - my), 0) / (xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1), kes = my - egim * mx;
  const ort3 = y.slice(-3).reduce((a, b) => a + b, 0) / 3, sapma = Math.sqrt(y.reduce((a, v, i) => a + (v - (kes + egim * i)) ** 2, 0) / Math.max(1, n - 2));
  const simdi = new Date(); return [1, 2, 3].map(k => { const t = Math.max(0, 0.5 * (kes + egim * (n - 1 + k)) + 0.5 * ort3); const d = new Date(simdi.getFullYear(), simdi.getMonth() + k, 1);
    return { ad: d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }), t, alt: Math.max(0, t - sapma), ust: t + sapma }; });
}
function urunOnerileri() {
  const al = {}; Object.values(SIP).filter(o => o.durum !== 'iptal').forEach(o => { al[o.kul] = al[o.kul] || {}; o.kalemler.forEach(x => al[o.kul][x.ad] = (al[o.kul][x.ad] || 0) + x.adet); });
  return Object.keys(al).map(kul => { const ben_ = al[kul], skor = {};
    Object.keys(al).filter(k => k !== kul).forEach(k => { const ort = Object.keys(al[k]).filter(u => ben_[u]).length; if (!ort) return; Object.keys(al[k]).filter(u => !ben_[u]).forEach(u => skor[u] = (skor[u] || 0) + ort); });
    const L = Object.entries(skor).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
    return { kul, firma: (MUS[kul] || {}).firma || kul, L, neden: L.length ? 'Benzer ürünleri alan bayiler bunları da aldı.' : '' }; }).filter(x => x.L.length);
}

// ---------- raporlar
function raporlar() {
  $('#baslik').textContent = 'Raporlar';
  const RF = window.RF || (window.RF = { donem: 'buHafta' });
  const simdi = new Date(), gun = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()), pzt = d => { const g = gun(d); g.setDate(g.getDate() - ((g.getDay() + 6) % 7)); return g; };
  const D = { buHafta: [pzt(simdi), simdi, 'Bu hafta'], gecenHafta: [new Date(pzt(simdi) - 7 * GUN), pzt(simdi), 'Geçen hafta'], buAy: [new Date(simdi.getFullYear(), simdi.getMonth(), 1), simdi, 'Bu ay'], gecenAy: [new Date(simdi.getFullYear(), simdi.getMonth() - 1, 1), new Date(simdi.getFullYear(), simdi.getMonth(), 1), 'Geçen ay'], yil: [new Date(simdi.getFullYear(), 0, 1), simdi, 'Bu yıl'] };
  const [bas, son, ad] = D[RF.donem], S = sipList().filter(o => o.tarih >= +bas && o.tarih < +son + 1), N = S.filter(o => o.durum !== 'iptal');
  const net = N.reduce((a, o) => a + tutarlar(o).net, 0), urun = {}, mus = {}; N.forEach(o => { mus[o.firma] = (mus[o.firma] || 0) + tutarlar(o).net; o.kalemler.forEach(x => urun[x.ad] = (urun[x.ad] || 0) + x.adet); });
  const sir = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const geciken = Object.keys(MUS).map(k => ({ k, f: MUS[k].firma, c: cariOzet(k) })).filter(x => x.c.gecmis > 0.5).sort((a, b) => b.c.gecmis - a.c.gecmis);
  const R = { ad, aralik: `${tarih(bas)} – ${tarih(son)}`, siparis: S.length, iptal: S.length - N.length, net, ort: N.length ? net / N.length : 0, urun: sir(urun), mus: sir(mus), geciken, bekleyen: Object.values(SIP).filter(o => o.durum === 'yeni').length };
  window._rapor = R;
  $('#ustSag').innerHTML = `<select id="rDon" class="btn cizgi">${Object.entries(D).map(([k, v]) => `<option value="${k}" ${RF.donem === k ? 'selected' : ''}>${v[2]}</option>`).join('')}</select><button class="btn cizgi" id="rPdf">Yazdır / PDF</button><button class="btn cizgi" id="rMail">E-posta ile gönder</button><button class="btn marka" id="rCsv">Excel'e aktar</button>`;
  $('#icerik').innerHTML = `<div id="raporAlan"><div class="kart"><h3>${ad} satış raporu</h3><div class="alt">${R.aralik} · hazırlayan ${esc(ben.ad || ben.kul)} · ${new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</div>
    <div class="kpi"><div><span>Sipariş</span><b>${R.siparis}</b><small>${R.iptal} iptal</small></div><div><span>Net satış</span><b>${usd(net)}</b><small>${tlYap(net)}</small></div><div><span>Ortalama sipariş</span><b>${usd(R.ort)}</b></div><div><span>Onay bekleyen</span><b>${R.bekleyen}</b><small>tüm dönemler</small></div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="mk-izgara"><div class="kart"><h3>En çok satan ürünler</h3><div class="alt">Adet</div>${cubuklar(R.urun, v => v + ' ad.')}</div><div class="kart"><h3>Müşteriler</h3><div class="alt">Net, USD</div>${cubuklar(R.mus, usd)}</div></div>
    <div class="kart"><h3>Dönemin siparişleri</h3>${S.length ? `<table class="tablo"><tr><th>No</th><th>Tarih</th><th>Müşteri</th><th class="sag-hiza">Net</th><th>Durum</th></tr>${S.map(o => `<tr><td>${o.no}</td><td>${tarih(o.tarih)}</td><td>${esc(o.firma)}</td><td class="sag-hiza">${usd(tutarlar(o).net)}</td><td>${DURUM[o.durum][0]}</td></tr>`).join('')}</table>` : '<div class="kucuk">Bu dönemde sipariş yok.</div>'}</div>
    <div class="kart"><h3>Vadesi geçmiş alacaklar</h3>${geciken.length ? `<table class="tablo"><tr><th>Müşteri</th><th class="sag-hiza">Vadesi geçmiş</th><th class="sag-hiza">Gecikme</th><th class="sag-hiza">Toplam bakiye</th></tr>${geciken.map(g => `<tr><td>${esc(g.f)}</td><td class="sag-hiza"><b>${usd(g.c.gecmis)}</b></td><td class="sag-hiza">${g.c.gecikmeGun} gün</td><td class="sag-hiza">${usd(g.c.bakiye)}</td></tr>`).join('')}</table>` : '<div class="kucuk">Vadesi geçmiş alacak yok.</div>'}</div></div>`;
  $('#rDon').onchange = e => { RF.donem = e.target.value; raporlar(); };
  $('#rPdf').onclick = () => { const w = window.open('', '_blank'); if (!w) return toast('Açılır pencere engellendi.'); w.document.write(`<html><head><meta charset="utf-8"><title>Satış raporu ${R.aralik}</title><style>${[...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join(''); } catch (e) { return ''; } }).join('')} body{background:#fff;padding:24px}.lg{margin-bottom:16px}</style></head><body><div class="logolar lg acik">${$('#giris .logolar').innerHTML}</div>${$('#raporAlan').innerHTML}<script>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close(); };
  $('#rMail').onclick = () => { const t = [`${R.ad} satış raporu (${R.aralik})`, '', `Sipariş: ${R.siparis} (${R.iptal} iptal)`, `Net satış: ${usd(R.net)} / ${tlYap(R.net)}`, `Ortalama sipariş: ${usd(R.ort)}`, `Onay bekleyen: ${R.bekleyen}`, '', 'En çok satan ürünler:', ...R.urun.slice(0, 5).map(([a, v]) => `- ${a}: ${v} adet`), '', 'Müşteriler:', ...R.mus.slice(0, 5).map(([a, v]) => `- ${a}: ${usd(v)}`), '', 'Vadesi geçmiş alacaklar:', ...(R.geciken.length ? R.geciken.map(g => `- ${g.f}: ${usd(g.c.gecmis)} (${g.c.gecikmeGun} gün)`) : ['- yok']), '', 'EXIT Garden Satış Yönetim Sistemi'].join('\n');
    location.href = 'mailto:?subject=' + encodeURIComponent(`EXIT Garden ${R.ad.toLocaleLowerCase('tr')} satış raporu`) + '&body=' + encodeURIComponent(t); };
  $('#rCsv').onclick = () => { const rows = [['Sipariş No', 'Tarih', 'Müşteri', 'Net $', 'Durum'], ...S.map(o => [o.no, tarih(o.tarih), o.firma, Math.round(tutarlar(o).net), DURUM[o.durum][0]])]; const csv = '﻿' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `satis_raporu_${RF.donem}.csv`; a.click(); };
}
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
// haftanın ilk açılışında rapor hatırlatması
(function () { const hafta = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toDateString(); })(); if (oku('exs-rapor-hafta', '') !== hafta) { setTimeout(() => { if (ben) { toast('Geçen haftanın satış raporu hazır: Raporlar › Geçen hafta.'); yaz('exs-rapor-hafta', hafta); } }, 2500); } })();
// örnek veri: sevk edilen siparişlere fatura, bir kısmına tahsilat, birkaç görüşme notu
