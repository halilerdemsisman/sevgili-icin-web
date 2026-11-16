// Bayi karnesi (v2.9).
(function () {
  const IK = { karne: '<path d="M4 4h16v16H4z"/><path d="M8 16v-4M12 16V8M16 16v-6"/>', hat: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' };
  const dug = (s, ik, ad) => `<button class="m" data-s="${s}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[ik]}</svg>${ad} <span class="say gizli"></span></button>`;
  const mb = $('aside button.m[data-s=musteriler]');
  if (mb && !$('aside button.m[data-s=karne]')) mb.insertAdjacentHTML('afterend', dug('karne', 'karne', 'Bayi karnesi'));
  function karneHesap() {
    const now = Date.now(), y1 = now - 365 * GUN, y2 = now - 730 * GUN, L = Object.values(SIP).filter(o => o.durum !== 'iptal');
    const K = Object.values(MUS).filter(m => m && m.kul).map(m => {
      const S = L.filter(o => o.kul === m.kul), net = o => tutarlar(o).net;
      const c12 = S.filter(o => o.tarih >= y1).reduce((a, o) => a + net(o), 0), p12 = S.filter(o => o.tarih >= y2 && o.tarih < y1).reduce((a, o) => a + net(o), 0);
      const n12 = S.filter(o => o.tarih >= y1).length, son = S.length ? Math.max(...S.map(o => o.tarih)) : 0, c = cariOzet(m.kul);
      return { kul: m.kul, firma: m.firma || m.kul, sehir: m.sehir || '', S, c12, p12, n12, top: S.reduce((a, o) => a + net(o), 0), son, gun: son ? Math.max(0, Math.floor((now - son) / GUN)) : null, c, buyume: p12 > 0 ? (c12 - p12) / p12 : null };
    });
    const mx = Math.max(1, ...K.map(k => k.c12));
    K.forEach(k => {
      const P = {};
      P.ciro = 25 * Math.sqrt(k.c12 / mx);
      P.buyume = k.p12 > 0 ? Math.max(0, Math.min(25, 12.5 + k.buyume * 25)) : k.c12 > 0 ? 18 : 0;
      P.tazelik = k.gun == null ? 0 : k.gun <= 30 ? 25 : k.gun <= 60 ? 20 : k.gun <= 90 ? 14 : k.gun <= 180 ? 7 : 0;
      P.odeme = k.c.borc <= 0.5 ? 20 : k.c.gecmis <= 0.5 ? 25 : Math.max(0, 25 * (1 - k.c.gecmis / Math.max(k.c.bakiye, 1))) * (k.c.gecikmeGun > 60 ? 0.5 : 1);
      k.P = P; k.puan = Math.round(P.ciro + P.buyume + P.tazelik + P.odeme); k.harf = k.puan >= 80 ? 'A' : k.puan >= 60 ? 'B' : k.puan >= 40 ? 'C' : 'D';
    });
    return K.sort((a, b) => b.puan - a.puan || b.c12 - a.c12);
  }
  const KF = { sec: '', ara: '' };
  function aylikGrafik(S) {
    const ay = [], d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    for (let i = 11; i >= 0; i--) { const b = new Date(d.getFullYear(), d.getMonth() - i, 1), s = new Date(d.getFullYear(), d.getMonth() - i + 1, 1); ay.push({ ad: b.toLocaleDateString('tr-TR', { month: 'short' }), yil: b.getFullYear(), v: S.filter(o => o.tarih >= +b && o.tarih < +s).reduce((a, o) => a + tutarlar(o).net, 0) }); }
    const W = 620, H = 200, sol = 8, alt = 24, ust = 22, bw = (W - sol * 2) / 12, mx = Math.max(1, ...ay.map(a => a.v)), iMax = ay.findIndex(a => a.v === mx);
    const y = v => H - alt - (H - alt - ust) * v / mx;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Son 12 ay net sipariş tutarı">
      <line x1="${sol}" x2="${W - sol}" y1="${H - alt}" y2="${H - alt}" stroke="var(--cizgi)" stroke-width="1"/>
      ${ay.map((a, i) => { const x = sol + i * bw + bw * 0.22, w = bw * 0.56, yy = y(a.v), h = H - alt - yy, r = Math.min(4, h, w / 2);
        return `<g>${a.v > 0 ? `<path class="bar" d="M${x},${H - alt} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + w - r} Q${x + w},${yy} ${x + w},${yy + r} V${H - alt} Z" fill="var(--seri,#d97706)"><title>${a.ad} ${a.yil}: ${usd(a.v)}</title></path>` : ''}
          <rect x="${sol + i * bw}" y="${ust}" width="${bw}" height="${H - alt - ust}" fill="transparent"><title>${a.ad} ${a.yil}: ${usd(a.v)}</title></rect>
          <text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--soluk)">${a.ad}</text>
          ${(i === iMax || i === 11) && a.v > 0 ? `<text x="${x + w / 2}" y="${yy - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--yazi2)">${usd(a.v)}</text>` : ''}</g>`; }).join('')}</svg>`;
  }
  function karne() {
    $('#baslik').textContent = 'Bayi karnesi';
    const K = karneHesap(), q = KF.ara.toLocaleLowerCase('tr'), L = K.filter(k => !q || (k.firma + ' ' + k.sehir + ' ' + k.kul).toLocaleLowerCase('tr').includes(q));
    if (!KF.sec || !K.find(k => k.kul === KF.sec)) KF.sec = (K[0] || {}).kul || '';
    const k = K.find(x => x.kul === KF.sec), sira = K.indexOf(k) + 1;
    $('#ustSag').innerHTML = `<button class="btn cizgi" id="knCsv">Excel'e aktar</button> <button class="btn cizgi" id="knYaz">Karneyi yazdır</button>`;
    const say = h => ({ A: K.filter(x => x.harf === 'A').length, B: K.filter(x => x.harf === 'B').length, C: K.filter(x => x.harf === 'C').length, D: K.filter(x => x.harf === 'D').length })[h];
    let detay = '<div class="kart"><div class="bos">Henüz bayi yok.</div></div>';
    if (k) {
      const kat = {}; k.S.forEach(o => { const t = tutarlar(o), f = t.brut ? t.net / t.brut : 1; o.kalemler.forEach(x => { const c = kalemKat(x); kat[c] = (kat[c] || 0) + (x.birim || 0) * x.adet * f; }); });
      const KT = Object.entries(kat).sort((a, b) => b[1] - a[1]).slice(0, 6), ktMax = Math.max(1, ...KT.map(x => x[1]));
      const ur = {}; k.S.forEach(o => o.kalemler.forEach(x => { ur[x.ad] = (ur[x.ad] || 0) + x.adet; })); const UR = Object.entries(ur).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const OD = oku('exb-odeme', []).filter(o => o.kul === k.kul), not = (CRM[k.kul] || []).length, temas = Math.max(0, ...(CRM[k.kul] || []).map(n => n.tarih));
      const bil = (ad, v, aciklama) => `<div><span>${ad}<b>${Math.round(v)} / 25</b></span><i><em style="width:${v / 25 * 100}%"></em></i><small>${aciklama}</small></div>`;
      detay = `<div class="kart" id="knDetay"><div class="kn-ust"><span class="kn-harf buyuk ${k.harf}">${k.harf}</span><div><h2>${esc(k.firma)}</h2><div class="kucuk">${esc(k.sehir || '—')} · ${K.length} bayi içinde ${sira}. sırada · iskonto ${yuzde(musIsk(k.kul))}</div></div>
          <div class="puan" style="margin-left:auto;text-align:right">Karne puanı<br><b>${k.puan}</b> / 100</div><button class="btn cizgi kn-gizle" data-kart="${esc(k.kul)}">Müşteri kartı</button></div>
        <div class="kn-bil">${bil('Ciro', k.P.ciro, `Son 12 ay ${usd(k.c12)} · en yüksek bayiye göre`)}
          ${bil('Büyüme', k.P.buyume, k.buyume == null ? (k.c12 > 0 ? 'Önceki yıl siparişi yok (yeni bayi)' : 'Son 2 yılda sipariş yok') : `Önceki 12 aya göre ${k.buyume >= 0 ? '+' : ''}${yuzde(k.buyume * 100)}`)}
          ${bil('Sipariş düzeni', k.P.tazelik, k.gun == null ? 'Hiç sipariş yok' : `Son sipariş ${k.gun ? k.gun + ' gün önce' : 'bugün'} · 12 ayda ${k.n12} sipariş`)}
          ${bil('Ödeme düzeni', k.P.odeme, k.c.borc <= 0.5 ? 'Henüz fatura yok' : k.c.gecmis > 0.5 ? `Vadesi geçmiş ${usd(k.c.gecmis)} (${k.c.gecikmeGun} gün)` : 'Vadesi geçmiş borç yok')}</div>
        <div class="kpi"><div><span>Son 12 ay net</span><b>${usd(k.c12)}</b><small>önceki 12 ay ${usd(k.p12)}</small></div><div><span>Ortalama sipariş</span><b>${usd(k.n12 ? k.c12 / k.n12 : 0)}</b><small>${k.n12} sipariş (12 ay)</small></div>
          <div><span>Cari bakiye</span><b>${usd(k.c.bakiye)}</b><small>vade ${k.c.vade} gün</small></div><div><span>Ödeme bildirimi</span><b>${OD.length}</b><small>${usd(OD.filter(o => o.durum === 'onaylandi').reduce((a, o) => a + o.tutar, 0))} işlendi</small></div>
          <div><span>Görüşme</span><b>${not}</b><small>${temas ? 'son temas ' + tarih(temas) : 'kayıt yok'}</small></div></div>
        <div class="kn-iki"><div class="kn-graf"><h3 style="margin:0 0 6px;font-size:14px">Son 12 ay net sipariş</h3>${aylikGrafik(k.S)}</div>
          <div><h3 style="margin:0 0 6px;font-size:14px">Kategori dağılımı</h3><div class="kn-kat">${KT.length ? KT.map(([c, v]) => `<div><span>${esc(c)}</span><i style="width:${Math.max(2, v / ktMax * 100)}%"></i><b>${usd(v)}</b></div>`).join('') : '<div class="kucuk">Sipariş yok.</div>'}</div>
            ${UR.length ? `<h3 style="margin:14px 0 6px;font-size:14px">En çok alınan ürünler</h3><div class="kucuk">${UR.map(([a, n]) => `${esc(a)} <b>${n}</b>`).join(' · ')}</div>` : ''}</div></div></div>`;
    }
    $('#icerik').innerHTML = `<div class="kpi kn-gizle"><div><span>A sınıfı</span><b>${say('A')}</b><small>80 puan ve üstü</small></div><div><span>B sınıfı</span><b>${say('B')}</b><small>60–79</small></div><div><span>C sınıfı</span><b>${say('C')}</b><small>40–59</small></div><div><span>D sınıfı</span><b>${say('D')}</b><small>40 altı, ilgi bekliyor</small></div></div>
      ${detay}
      <div class="kart kn-gizle"><h3>Tüm bayiler</h3><div class="alt">Puan; ciro, büyüme, sipariş düzeni ve ödeme düzeninden (her biri 25) hesaplanır. Bir satıra tıklayınca karnesi yukarıda açılır.</div>
        <div class="filtreler"><input id="knAra" placeholder="Bayi veya şehir ara" value="${esc(KF.ara)}"></div>
        <table class="tablo kn-tb"><tr><th>#</th><th>Bayi</th><th class="sag-hiza">Puan</th><th class="sag-hiza">Son 12 ay</th><th class="sag-hiza">Büyüme</th><th class="sag-hiza">Sipariş</th><th>Son sipariş</th><th class="sag-hiza">Vadesi geçmiş</th></tr>
          ${L.map(x => `<tr class="tik ${x.kul === KF.sec ? 'sec' : ''}" data-kn="${esc(x.kul)}"><td>${K.indexOf(x) + 1}</td><td><b>${esc(x.firma)}</b><div class="kucuk">${esc(x.sehir)}</div></td><td class="sag-hiza"><span class="kn-harf ${x.harf}" style="width:24px;height:24px;font-size:12px;vertical-align:middle">${x.harf}</span> <b>${x.puan}</b></td>
            <td class="sag-hiza">${usd(x.c12)}</td><td class="sag-hiza">${x.buyume == null ? '—' : `<span style="color:${x.buyume >= 0 ? 'var(--iyi)' : 'var(--kotu)'}">${x.buyume >= 0 ? '+' : ''}${yuzde(x.buyume * 100)}</span>`}</td><td class="sag-hiza">${x.n12}</td>
            <td>${x.gun == null ? '<span class="kucuk">Yok</span>' : x.gun ? x.gun + ' gün önce' : 'Bugün'}</td><td class="sag-hiza" style="color:${x.c.gecmis > 0.5 ? 'var(--kotu)' : 'inherit'}">${x.c.gecmis > 0.5 ? usd(x.c.gecmis) : '—'}</td></tr>`).join('') || '<tr><td colspan="8" class="kucuk">Bayi bulunamadı.</td></tr>'}</table></div>`;
    $$('[data-kn]').forEach(r => r.onclick = () => { KF.sec = r.dataset.kn; karne(); const d = $('#knDetay'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $$('#icerik [data-kart]').forEach(b => b.onclick = () => musteriKarti(b.dataset.kart));
    $('#knAra').oninput = e => { KF.ara = e.target.value; clearTimeout(window._kna); window._kna = setTimeout(() => { karne(); const i = $('#knAra'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
    $('#knYaz').onclick = () => window.print();
    $('#knCsv').onclick = () => csvIndir('exit_bayi_karnesi.csv', [['Sıra', 'Bayi', 'Şehir', 'Sınıf', 'Puan', 'Ciro puanı', 'Büyüme puanı', 'Sipariş düzeni puanı', 'Ödeme puanı', 'Son 12 ay net $', 'Önceki 12 ay net $', 'Büyüme %', 'Sipariş (12 ay)', 'Son sipariş (gün)', 'Cari bakiye $', 'Vadesi geçmiş $']]
      .concat(K.map((x, i) => [i + 1, x.firma, x.sehir, x.harf, x.puan, Math.round(x.P.ciro), Math.round(x.P.buyume), Math.round(x.P.tazelik), Math.round(x.P.odeme), Math.round(x.c12), Math.round(x.p12), x.buyume == null ? '' : Math.round(x.buyume * 1000) / 10, x.n12, x.gun ?? '', Math.round(x.c.bakiye), Math.round(x.c.gecmis)])));
  }
  EK.sayfalar.karne = ['Bayi karnesi', karne];
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
})();
