
(function () {
  const mb = $('aside button.m[data-s=karne]') || $('aside button.m[data-s=musteriler]');
  if (mb && !$('aside button.m[data-s=bayihedef]')) mb.insertAdjacentHTML('afterend', `<button class="m" data-s="bayihedef"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>Bayi hedef ve prim <span class="say gizli"></span></button>`);
  const VARS = [{ oran: 80, prim: 1 }, { oran: 100, prim: 2 }, { oran: 120, prim: 3 }];
  let BH = oku('exs-bayi-hedef', {});  // { kul: { yil: { hedef, basamak } } }, ortak basamak: BH._basamak[yil]
  const BF = { yil: new Date().getFullYear() };
  const basamak = y => ((BH._basamak || {})[y] || VARS).slice().sort((a, b) => a.oran - b.oran);
  const gercek = (kul, y) => Object.values(SIP).filter(o => o.kul === kul && o.durum !== 'iptal' && o.durum !== 'yeni' && new Date(o.tarih).getFullYear() === y).reduce((a, o) => a + tutarlar(o).net, 0);
  function yayinla() {
    const P = {}; Object.keys(BH).filter(k => k !== '_basamak').forEach(kul => { P[kul] = {}; Object.keys(BH[kul]).forEach(y => { const h = BH[kul][y]; if (h && h.hedef > 0) P[kul][y] = { hedef: h.hedef, basamak: h.basamak || basamak(+y), gerceklesen: Math.round(gercek(kul, +y) * 100) / 100, guncel: Date.now() }; }); });
    yaz('exs-bayi-hedef', BH); yaz('exb-bayi-hedef', P);
  }
  const hesap = (kul, y) => { const h = (BH[kul] || {})[y], g = gercek(kul, y); if (!h || !(h.hedef > 0)) return { h: null, g }; const B = h.basamak || basamak(y), o = g / h.hedef * 100, k = B.filter(b => o >= b.oran).pop(), s = B.find(b => o < b.oran); return { h, g, o, k, s, prim: k ? g * k.prim / 100 : 0, B }; };
  function bayihedef() {
    $('#baslik').textContent = 'Bayi hedef ve prim'; const y = BF.yil, B = basamak(y);
    const M = Object.values(MUS).filter(m => m && m.kul).sort((a, b) => (a.firma || a.kul).localeCompare(b.firma || b.kul, 'tr')), R = M.map(m => ({ m, ...hesap(m.kul, y) }));
    const top = R.filter(r => r.h), th = top.reduce((a, r) => a + r.h.hedef, 0), tg = top.reduce((a, r) => a + r.g, 0), tp = top.reduce((a, r) => a + r.prim, 0);
    $('#ustSag').innerHTML = `<select id="bhYil" class="btn cizgi">${[y - 1, y, y + 1].filter((v, i, a) => a.indexOf(v) === i).map(v => `<option ${v === y ? 'selected' : ''}>${v}</option>`).join('')}</select> <button class="btn cizgi" id="bhCsv">Excel'e aktar</button>`;
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Hedefi olan bayi</span><b>${top.length}</b><small>${M.length} bayiden</small></div><div><span>Toplam hedef</span><b>${usd(th)}</b><small>${y}</small></div><div><span>Gerçekleşen</span><b>${usd(tg)}</b><small>${th ? yuzde(tg / th * 100) : '—'} · onaylanan ve sonrası, net</small></div><div><span>Tahmini prim</span><b>${usd(tp)}</b><small>bugünkü basamaklara göre</small></div></div>
      <div class="kart"><h3>Prim basamakları (${y})</h3><div class="alt">Bayi, yıllık hedefinin belirtilen yüzdesine ulaşınca gerçekleşen net cironun o oranında prim kazanır. Bayi ilerlemesini portalda Cari hesabım ekranında görür.</div>
        <div class="bh-bas">${B.map((b, i) => `<div>Hedefin %<input data-bo="${i}" value="${b.oran}" inputmode="numeric"> → %<input data-bp="${i}" value="${b.prim}" inputmode="decimal"> prim<button class="x" data-bx="${i}" title="Sil">×</button></div>`).join('')}<button class="btn cizgi" id="bhEkle">+ Basamak</button><button class="btn marka" id="bhBasKay">Basamakları kaydet</button></div></div>
      <div class="kart"><h3>Bayi hedefleri</h3><div class="alt">Yıllık hedefi yazıp Enter'a basın veya alandan çıkın; anında bayi portalına yansır. Boş bırakılan bayinin hedefi yoktur.</div>
        <table class="tablo bh-tb"><tr><th>Bayi</th><th class="sag-hiza">Yıllık hedef $</th><th class="sag-hiza">Gerçekleşen</th><th>İlerleme</th><th>Basamak</th><th class="sag-hiza">Tahmini prim</th><th>Sonraki basamağa</th></tr>
        ${R.map(r => `<tr><td><b>${esc(r.m.firma || r.m.kul)}</b><div class="kucuk">${esc(r.m.sehir || '')}</div></td><td class="sag-hiza"><input data-bh="${esc(r.m.kul)}" value="${r.h ? r.h.hedef : ''}" inputmode="numeric" placeholder="—"></td><td class="sag-hiza">${usd(r.g)}</td>
          <td>${r.h ? `<div class="bh-c"><i style="width:${Math.min(100, r.o)}%"></i></div><span class="kucuk">${yuzde(r.o)}</span>` : '<span class="kucuk">Hedef yok</span>'}</td><td>${r.k ? `<span class="uy uy-bilgi">%${r.k.prim} prim</span>` : '<span class="kucuk">—</span>'}</td>
          <td class="sag-hiza">${r.h ? usd(r.prim) : '—'}</td><td class="kucuk">${r.h ? (r.s ? usd(Math.max(0, r.h.hedef * r.s.oran / 100 - r.g)) + ` → %${r.s.prim}` : 'En üst basamak') : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="kucuk">Bayi yok.</td></tr>'}</table></div>`;
    $('#bhYil').onchange = e => { BF.yil = +e.target.value; bayihedef(); };
    $$('[data-bh]').forEach(i => { i.onchange = () => { const k = i.dataset.bh, v = parseFloat(i.value.replace(/\./g, '').replace(',', '.')); BH[k] = BH[k] || {}; if (v > 0) BH[k][y] = { ...(BH[k][y] || {}), hedef: Math.round(v) }; else delete BH[k][y]; yayinla(); toast(`${(MUS[k] || {}).firma || k}: ${v > 0 ? usd(v) + ' hedef kaydedildi' : 'hedef kaldırıldı'}`); bayihedef(); }; i.onkeydown = e => { if (e.key === 'Enter') i.blur(); }; });
    const basOku = () => $$('[data-bo]').map((i, j) => ({ oran: parseFloat(i.value) || 0, prim: parseFloat(String($(`[data-bp="${j}"]`).value).replace(',', '.')) || 0 })).filter(b => b.oran > 0);
    $('#bhEkle').onclick = () => { const L = basOku(); L.push({ oran: (L.length ? L[L.length - 1].oran : 80) + 20, prim: (L.length ? L[L.length - 1].prim : 0) + 1 }); BH._basamak = BH._basamak || {}; BH._basamak[y] = L; bayihedef(); };
    $$('[data-bx]').forEach(b => b.onclick = () => { const L = basOku(); L.splice(+b.dataset.bx, 1); BH._basamak = BH._basamak || {}; BH._basamak[y] = L; bayihedef(); });
    $('#bhBasKay').onclick = () => { const L = basOku(); BH._basamak = BH._basamak || {}; BH._basamak[y] = L; Object.keys(BH).filter(k => k !== '_basamak').forEach(k => { if (BH[k][y]) BH[k][y].basamak = L; }); yayinla(); toast('Prim basamakları kaydedildi.'); bayihedef(); };
    $('#bhCsv').onclick = () => { const R2 = [['Bayi', 'Şehir', 'Yıl', 'Hedef $', 'Gerçekleşen $', 'İlerleme %', 'Prim %', 'Tahmini prim $']].concat(R.filter(r => r.h).map(r => [r.m.firma || r.m.kul, r.m.sehir || '', y, r.h.hedef, Math.round(r.g), Math.round(r.o * 10) / 10, r.k ? r.k.prim : 0, Math.round(r.prim)]));
      const csv = '﻿' + R2.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'exit_bayi_hedef_prim_' + y + '.csv'; a.click(); };
  }
  const _gitBH = git;
  git = function (s) { if (s === 'bayihedef') { try { $('#yol').textContent = 'Satış Yönetimi  /  Bayi hedef ve prim'; } catch (e) {} aktif = s; $$('aside button.m[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = ''; bayihedef(); window.scrollTo(0, 0); } else _gitBH(s); };
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
  // gerçekleşen tutar sipariş durumu değiştikçe portala yansısın
  const _durumBH = durumYaz; durumYaz = function (no, d) { _durumBH(no, d); try { yayinla(); } catch (e) {} };
  setTimeout(() => { try { yayinla(); } catch (e) {} }, 1500);
})();
