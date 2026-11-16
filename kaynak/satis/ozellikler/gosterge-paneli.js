// Gösterge paneli (v3.1).
(function () {
  menuEkle('panel', 'Gösterge paneli', '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>', 'siparisler', true);
  S6.panel = function () {
    $('#baslik').textContent = 'Gösterge paneli';
    const O = Object.values(SIP).filter(o => o.durum !== 'iptal'), ay = d => { const x = new Date(d); return x.getFullYear() * 12 + x.getMonth(); }, bu = ay(Date.now());
    const A = []; for (let i = 11; i >= 0; i--) { const k = bu - i; A.push({ k, ad: new Date(Math.floor(k / 12), k % 12, 1).toLocaleDateString('tr-TR', { month: 'short' }), net: 0, n: 0 }); }
    O.forEach(o => { const a = A.find(x => x.k === ay(o.tarih)); if (a) { a.net += tutarlar(o).net; a.n++; } });
    const buA = A[11], gecA = A[10], gyil = O.filter(o => ay(o.tarih) === bu - 12).reduce((a, o) => a + tutarlar(o).net, 0), mx = Math.max(1, ...A.map(a => a.net));
    const deg = (a, b) => b ? (a - b) / b * 100 : null, dg = v => v == null ? '<span class="kucuk">—</span>' : `<span class="${v >= 0 ? 'art' : 'azl'}">${v >= 0 ? '▲' : '▼'} ${yuzde(Math.abs(v))}</span>`;
    const son3 = o => ay(o.tarih) > bu - 3, onc3 = o => ay(o.tarih) <= bu - 3 && ay(o.tarih) > bu - 6;
    const B = {}; O.forEach(o => { const b = B[o.kul] = B[o.kul] || { kul: o.kul, s: 0, o: 0 }; if (son3(o)) b.s += tutarlar(o).net; else if (onc3(o)) b.o += tutarlar(o).net; });
    const BL = Object.values(B).filter(b => b.s || b.o).sort((a, b) => b.s - a.s).slice(0, 8);
    const U = {}; O.filter(o => ay(o.tarih) > bu - 12).forEach(o => { const t = tutarlar(o), f = t.brut ? t.net / t.brut : 1; o.kalemler.forEach(x => { const u = U[x.ad] = U[x.ad] || { ad: x.ad, adet: 0, net: 0 }; u.adet += x.adet; u.net += (x.birim || 0) * x.adet * f; }); });
    const UL = Object.values(U).sort((a, b) => b.net - a.net).slice(0, 8), umx = Math.max(1, ...UL.map(u => u.net));
    const yeni = O.filter(o => o.durum === 'yeni').length, iaA = EK.iadeListesi().filter(x => !['red', 'cozuldu'].includes(x.durum)).length;
    const R = Object.values(MUS).filter(m => m && m.kul).map(m => ({ m, ...riskHesap(m.kul) })), asim = R.filter(r => r.limit && r.risk > r.limit), gec = R.filter(r => r.gecmis > 0.5);
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Bu ay net satış</span><b>${usd(buA.net)}</b><small>${dg(deg(buA.net, gecA.net))} geçen aya göre</small></div><div><span>Son 12 ay</span><b>${usd(A.reduce((a, x) => a + x.net, 0))}</b><small>${A.reduce((a, x) => a + x.n, 0)} sipariş</small></div><div><span>Geçen yılın aynı ayı</span><b>${usd(gyil)}</b><small>${dg(deg(buA.net, gyil))}</small></div><div><span>Bekleyen iş</span><b>${yeni}</b><small>yeni sipariş · ${iaA} açık iade</small></div></div>
      <div class="gp-izg"><div class="kart"><h3>Aylık net satış (son 12 ay)</h3><div class="gp-bar">${A.map((a, i) => `<div class="${i === 11 ? 'bu' : ''}" data-t="${a.ad}: ${usd(a.net)} · ${a.n} sipariş"><i style="height:${a.net / mx * 100}%"></i></div>`).join('')}</div><div class="gp-et">${A.map(a => `<span>${a.ad}</span>`).join('')}</div></div>
        <div class="kart"><h3>Dikkat</h3>${[[asim.length, 'bayi kredi limitini aşmış', 'limit'], [gec.length, 'bayinin vadesi geçmiş borcu var', 'limit'], [iaA, 'açık iade / şikâyet', 'iadeler'], [yeni, 'sipariş onay bekliyor', 'siparisler']].map(([n, t, s]) => `<div class="gp-l" style="cursor:pointer" data-gp="${s}"><span><b>${n}</b> ${t}</span><span class="kucuk">›</span></div>`).join('')}</div></div>
      <div class="gp-izg" style="grid-template-columns:1fr 1fr"><div class="kart"><h3>Bayiler: son 3 ay ve büyüme</h3><div class="alt">Önceki 3 aya göre</div>${BL.map(b => `<div class="gp-l"><span>${esc((MUS[b.kul] || {}).firma || b.kul)}</span><span>${usd(b.s)} ${dg(deg(b.s, b.o))}</span></div>`).join('') || '<span class="kucuk">Veri yok.</span>'}</div>
        <div class="kart"><h3>En çok satan ürünler (12 ay)</h3>${UL.map(u => `<div class="gp-l"><span style="flex:1">${esc(u.ad)}<div style="height:5px;border-radius:3px;background:var(--cizgi2,#f1f5f9);margin-top:4px"><div style="height:100%;width:${u.net / umx * 100}%;background:var(--seri,#d97706);border-radius:3px"></div></div></span><span style="text-align:right">${usd(u.net)}<div class="kucuk">${u.adet} adet</div></span></div>`).join('') || '<span class="kucuk">Veri yok.</span>'}</div></div>`;
    $$('[data-gp]').forEach(d => d.onclick = () => git(d.dataset.gp));
  };
})();
