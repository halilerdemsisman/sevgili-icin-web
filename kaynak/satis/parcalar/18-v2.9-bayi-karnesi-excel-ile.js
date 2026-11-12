
(function () {
// ===== ortak: Excel (.xlsx) / CSV okuma, stok-termin hesabı =====
const trNorm = s => String(s ?? '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
async function zipAc(buf) {
  const dv = new DataView(buf); let e = buf.byteLength - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const F = {};
  for (let i = 0; i < n; i++) {
    const met = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    F[new TextDecoder().decode(new Uint8Array(buf, p + 46, nl))] = { met, csz, off }; p += 46 + nl + xl + cl;
  }
  return async ad => {
    const f = F[ad]; if (!f) return null;
    const d = new Uint8Array(buf, f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), f.csz);
    if (f.met === 0) return new TextDecoder().decode(d);
    return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  };
}
async function xlsxOku(buf) {
  const z = await zipAc(buf), P = s => new DOMParser().parseFromString(s, 'application/xml');
  const ssx = await z('xl/sharedStrings.xml'), SS = ssx ? [...P(ssx).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  let yol = 'xl/worksheets/sheet1.xml';
  try { const wb = P(await z('xl/workbook.xml')), rid = wb.getElementsByTagName('sheet')[0].getAttribute('r:id'), rel = P(await z('xl/_rels/workbook.xml.rels'));
    const r = [...rel.getElementsByTagName('Relationship')].find(x => x.getAttribute('Id') === rid); if (r) { const t = r.getAttribute('Target'); yol = t.startsWith('/') ? t.slice(1) : 'xl/' + t; } } catch (e) {}
  const sx = await z(yol); if (!sx) throw new Error('sayfa');
  const R = [];
  [...P(sx).getElementsByTagName('row')].forEach(row => {
    const satir = [];
    [...row.getElementsByTagName('c')].forEach((c, i) => {
      const ref = c.getAttribute('r') || '', h = (ref.match(/^[A-Z]+/) || [''])[0];
      const col = h ? [...h].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1 : i;
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0];
      let val = t === 's' ? SS[+(v && v.textContent)] : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : v ? v.textContent : '';
      satir[col] = val ?? '';
    });
    const rn = +row.getAttribute('r') || R.length + 1; R[rn - 1] = [...satir].map(x => x ?? '');
  });
  return [...R].map(x => x || []);
}
function csvOku(txt) {
  txt = txt.replace(/^﻿/, ''); const ilk = txt.split(/\r?\n/)[0] || '';
  const ayr = [';', '\t', ','].sort((a, b) => ilk.split(b).length - ilk.split(a).length)[0];
  const R = []; let s = [], h = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { h += '"'; i++; } else q = false; } else h += c; }
    else if (c === '"') q = true; else if (c === ayr) { s.push(h); h = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; s.push(h); R.push(s); s = []; h = ''; }
    else h += c;
  }
  if (h !== '' || s.length) { s.push(h); R.push(s); }
  return R;
}
async function dosyaSatirlar(f) {
  const buf = await f.arrayBuffer(), b = new Uint8Array(buf, 0, 2);
  if (b[0] === 0x50 && b[1] === 0x4b) return xlsxOku(buf);
  let t = new TextDecoder('utf-8').decode(buf); if (t.includes('�')) t = new TextDecoder('windows-1254').decode(buf);
  return csvOku(t);
}
function csvIndir(ad, R) {
  const csv = '﻿' + R.map(r => r.map(v => { v = String(v ?? ''); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = ad; a.click();
}
function dosyaSec(kabul, cb) { const i = document.createElement('input'); i.type = 'file'; i.accept = kabul; i.onchange = () => i.files[0] && cb(i.files[0]); i.click(); }

// Stok ve termin: satış panelinin yayınladığı özet (exb-stok) üzerinden tahmini teslim günü
const renkAdi = s => String(s || '').replace(/\s*\(.*\)\s*$/, '').trim();
function terminTahmin(D, ad, kategori, sec, renk, adet) {
  if (!D) return null;
  const u = (D.u || {})[ad], hz = D.hazirlik ?? 3, kg = D.kuyrukGun || 0, vs = (D.kat || {})[kategori] ?? 21;
  adet = adet || 1; renk = renkAdi(renk);
  const lvl = o => o ? (renk && o.r ? (o.r[renk] ?? 0) : o.s) : undefined;
  let serbest = null;
  if (u) { const s = sec && u.sec ? u.sec[sec] : null; serbest = (s ? lvl(s) : lvl(u)) ?? 0; }
  if (serbest != null && serbest >= adet) return { stok: true, serbest, gun: hz };
  const ur = u && u.uretim;
  if (ur && ur.bitis && ur.adet >= adet - (serbest || 0)) return { stok: false, serbest: serbest || 0, gun: Math.max(hz, Math.ceil((Date.parse(ur.bitis) - Date.now()) / 864e5) + hz), mrp: true };
  return { stok: false, serbest: serbest || 0, gun: ((u && u.g) ?? vs) + kg + hz, tahmini: !u };
}
const gunSonra = g => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + g); return d.toISOString().slice(0, 10); };

  const IK = { karne: '<path d="M4 4h16v16H4z"/><path d="M8 16v-4M12 16V8M16 16v-6"/>', hat: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' };
  const dug = (s, ik, ad) => `<button class="m" data-s="${s}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[ik]}</svg>${ad} <span class="say gizli"></span></button>`;
  const nb = $('aside button.m[data-s=numuneler]') || $('aside button.m[data-s=siparisler]'), mb = $('aside button.m[data-s=musteriler]');
  if (nb && !$('aside button.m[data-s=hatirlatmalar]')) nb.insertAdjacentHTML('afterend', dug('hatirlatmalar', 'hat', 'Hatırlatmalar'));
  if (mb && !$('aside button.m[data-s=karne]')) mb.insertAdjacentHTML('afterend', dug('karne', 'karne', 'Bayi karnesi'));
  const firmaAd = k => (MUS[k] || {}).firma || k;
  const bugunS = () => new Date().toISOString().slice(0, 10);
  const gunFark = t => Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / GUN);
  function pencere(html, gen) { const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) p.remove(); }; p.innerHTML = `<div class="pencere" style="${gen ? '' : 'max-width:620px'}"><button class="kapat">×</button>${html}</div>`; document.body.appendChild(p); p.querySelector('.kapat').onclick = () => p.remove(); return p; }

  // ================= 15. bayi karnesi =================
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

  // ================= 16. Excel ile toplu fiyat güncelleme =================
  const sayi = v => { if (typeof v === 'number') return v; let s = String(v ?? '').replace(/[$\s]/g, '').replace(/usd/i, ''); if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return +s; if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) || /,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, ''); const n = parseFloat(s); return isFinite(n) ? n : null; };
  async function fiyatExcel(f) {
    let R; try { R = await dosyaSatirlar(f); } catch (e) { return toast('Dosya okunamadı. Excel (.xlsx) veya CSV yükleyin.'); }
    const bi = R.findIndex(r => r.some(c => ['ürün', 'urun', 'ürün adı', 'product'].includes(trNorm(c)))); if (bi < 0) return toast('Başlık satırı bulunamadı: “Ürün” sütunu olmalı.');
    const B = R[bi].map(trNorm), sut = L => { for (const a of L) { const i = B.indexOf(a); if (i >= 0) return i; } return -1; };
    const iU = sut(['ürün', 'urun', 'ürün adı', 'product']), iS = sut(['seçenek', 'secenek', 'option', 'ölçü']), iF = sut(['yeni $', 'yeni fiyat', 'yeni fiyat $', 'güncel $', 'fiyat', 'fiyat $', 'fiyat (usd)', 'price']);
    if (iF < 0) return toast('Fiyat sütunu bulunamadı: “Güncel $”, “Yeni $” veya “Fiyat” olmalı.');
    const D = [], H = []; let ayni = 0, bos = 0;
    R.slice(bi + 1).forEach((r, j) => {
      const sat = bi + j + 2, ua = String(r[iU] ?? '').trim(); if (!ua && !r.some(c => String(c ?? '').trim())) return;
      const u = VERI.urunler.find(x => trNorm(x.ad) === trNorm(ua)); if (!u) return H.push([sat, ua || '(boş)', 'Ürün bulunamadı']);
      const sa = iS >= 0 ? String(r[iS] ?? '').trim() : '', s = sa ? u.secenek.find(x => trNorm(x.ad) === trNorm(sa)) : u.secenek.length === 1 ? u.secenek[0] : null;
      if (!s) return H.push([sat, ua + (sa ? ' · ' + sa : ''), sa ? 'Seçenek bulunamadı' : 'Seçenek sütunu boş']);
      const ham = r[iF]; if (String(ham ?? '').trim() === '') { bos++; return; }
      const v = sayi(ham); if (v == null || v < 0) return H.push([sat, u.ad + ' · ' + s.ad, 'Fiyat okunamadı: ' + ham]);
      const y = Math.round(v * 100) / 100, e = fiyatAl(u, s); if (e === y) { ayni++; return; }
      if (D.some(d => d.u === u && d.s === s)) return H.push([sat, u.ad + ' · ' + s.ad, 'Aynı satır dosyada tekrar ediyor']);
      D.push({ u, s, e, y, o: e ? (y - e) / e * 100 : null });
    });
    const p = pencere('', true), uy = D.filter(d => d.o != null && Math.abs(d.o) > 30).length;
    p.querySelector('.pencere').insertAdjacentHTML('beforeend', `<h2 style="margin:0">Excel'den fiyat güncelleme</h2><div class="kucuk">${esc(f.name)} · onaylamadan önce değişiklikleri kontrol edin. Uygulamadan önce mevcut fiyat listesi sürüm olarak saklanır; Fiyat geçmişi’nden geri dönebilirsiniz.</div>
      <div class="fx-ozet"><div><b>${D.length}</b>fiyat değişecek</div><div><b>${ayni}</b>aynı kaldı</div><div><b>${bos}</b>boş (atlandı)</div><div><b style="color:${H.length ? 'var(--kotu)' : 'inherit'}">${H.length}</b>eşleşmeyen satır</div>${uy ? `<div style="border-color:#f59e0b"><b style="color:#b45309">${uy}</b>%30'dan fazla değişen</div>` : ''}</div>
      ${D.length ? `<div class="fx-kay"><table class="tablo"><tr><th>Ürün</th><th>Seçenek</th><th class="sag-hiza">Mevcut</th><th class="sag-hiza">Yeni</th><th class="sag-hiza">Fark</th></tr>
        ${D.map(d => `<tr class="${d.o != null && Math.abs(d.o) > 30 ? 'fx-uy' : ''}"><td><b>${esc(d.u.ad)}</b><div class="kucuk">${esc(d.u.kategori)}</div></td><td>${esc(d.s.ad)}</td><td class="sag-hiza">${d.e == null ? 'teklif' : usd(d.e)}</td><td class="sag-hiza"><b>${usd(d.y)}</b></td>
          <td class="sag-hiza ${d.o > 0 ? 'fx-art' : 'fx-az'}">${d.o == null ? 'yeni' : (d.o > 0 ? '+' : '') + yuzde(d.o)}</td></tr>`).join('')}</table></div>` : '<div class="bos">Değişecek fiyat yok.</div>'}
      ${H.length ? `<details style="margin-top:10px"><summary class="kucuk" style="cursor:pointer">Eşleşmeyen ${H.length} satırı göster</summary><table class="tablo"><tr><th>Satır</th><th>Değer</th><th>Neden</th></tr>${H.map(h => `<tr><td>${h[0]}</td><td>${esc(h[1])}</td><td class="kucuk">${esc(h[2])}</td></tr>`).join('')}</table></details>` : ''}
      <div class="alan" style="margin-top:12px"><label>Değişiklik notu (fiyat geçmişinde görünür)</label><input id="fxNot" value="Excel: ${esc(f.name)}"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn cizgi" id="fxVaz">Vazgeç</button><button class="btn marka" id="fxUyg" ${D.length ? '' : 'disabled'}>${D.length} fiyatı uygula</button></div>`);
    p.querySelector('#fxVaz').onclick = () => p.remove();
    p.querySelector('#fxUyg').onclick = () => {
      surumKaydet('Excel yüklemesi öncesi · ' + f.name, true);
      D.forEach(d => { FIYAT[d.u.ad] = FIYAT[d.u.ad] || {}; if (d.y === d.s.fiyat) delete FIYAT[d.u.ad][d.s.ad]; else FIYAT[d.u.ad][d.s.ad] = d.y; if (!Object.keys(FIYAT[d.u.ad]).length) delete FIYAT[d.u.ad]; });
      window._fNot = p.querySelector('#fxNot').value.trim() || 'Excel ile toplu güncelleme'; urunYaz(); p.remove(); toast(`${D.length} fiyat güncellendi; bayi portalına yansıdı.`); urunler();
    };
  }
  function sablonIndir() {
    const R = [['Ürün', 'Kategori', 'Seçenek', 'Ürün tipi', 'Liste $', 'Güncel $', 'Yeni $']];
    VERI.urunler.forEach(u => u.secenek.forEach(s => R.push([u.ad, u.kategori, s.ad, s.sinif, s.fiyat ?? '', fiyatAl(u, s) ?? '', ''])));
    csvIndir('exit_fiyat_guncelleme_sablonu.csv', R);
  }
  const _urunlerX = urunler;
  urunler = function () {
    _urunlerX(); const u = $('#ustSag'); if (!u || $('#fxYukle')) return;
    u.insertAdjacentHTML('afterbegin', `<button class="btn cizgi" id="fxSablon" title="Yeni $ sütununu doldurup geri yükleyin">Fiyat şablonu</button> <button class="btn marka" id="fxYukle">Excel'den fiyat yükle</button> `);
    $('#fxSablon').onclick = sablonIndir;
    $('#fxYukle').onclick = () => dosyaSec('.xlsx,.csv,.txt', fiyatExcel);
  };

  // ================= 18. hatırlatmalar =================
  let HT = oku('exs-hatirlatma', []);
  const htYaz = () => yaz('exs-hatirlatma', HT);
  const BH = () => oku('exb-hatirlat', []);
  function bayiyeHatirlat(kul, tur, metin) { const M = BH(); M.push({ id: 'm' + Date.now().toString(36), kul, tur, metin, zaman: Date.now(), kim: kimAd(), okundu: false }); yaz('exb-hatirlat', M); }
  function otomatik() {
    const A = [], now = Date.now(), bg = bugunS(), gz = oku('exs-hat-gizli', {}) || {}, ekle = x => { if (gz[x.k] !== bg) A.push(x); };
    Object.values(SIP).filter(o => o.durum === 'yeni' && now - o.tarih > GUN).sort((a, b) => a.tarih - b.tarih).forEach(o => ekle({ k: 'sy-' + o.no, renk: 'kirmizi', metin: `${o.no} · ${o.firma}: ${Math.floor((now - o.tarih) / GUN)} gündür yanıt bekliyor`, alt: usd(tutarlar(o).net) + ' · ' + tarih(o.tarih), sip: o.no }));
    Object.values(SIP).filter(o => o.termin && ['onay', 'uretim'].includes(o.durum)).forEach(o => { const g = gunFark(o.termin); if (g <= 3) ekle({ k: 'tr-' + o.no + o.termin, renk: g < 0 ? 'kirmizi' : 'sari', metin: `${o.no} · ${o.firma}: termin ${g < 0 ? -g + ' gün geçti' : g === 0 ? 'bugün' : g + ' gün sonra'}`, alt: 'Termin ' + tarih(o.termin) + ' · ' + DURUM[o.durum][0], sip: o.no }); });
    Object.values(MUS).forEach(m => { const c = cariOzet(m.kul); if (c.gecmis > 0.5) { const son = BH().filter(x => x.kul === m.kul && x.tur === 'odeme').sort((a, b) => b.zaman - a.zaman)[0];
      ekle({ k: 'vg-' + m.kul, renk: 'kirmizi', metin: `${m.firma || m.kul}: vadesi geçmiş ${usd(c.gecmis)} (${c.gecikmeGun} gün)`, alt: son ? 'Bayiye son hatırlatma ' + tarih(son.zaman) + (son.okundu ? ' · okundu' : ' · okunmadı') : 'Bayiye henüz hatırlatma gönderilmedi', kul: m.kul, odeme: c.gecmis }); } });
    Object.values(MUS).forEach(m => { const S = Object.values(SIP).filter(o => o.kul === m.kul && o.durum !== 'iptal'); if (!S.length) return; const g = Math.floor((now - Math.max(...S.map(o => o.tarih))) / GUN); if (g >= SESSIZ_GUN) ekle({ k: 'ss-' + m.kul, renk: 'mavi', metin: `${m.firma || m.kul}: ${g} gündür sipariş yok`, alt: 'Arayıp görüşme notu ekleyin', kul: m.kul }); });
    const od = oku('exb-odeme', []).filter(o => o.durum === 'bekliyor').length, nm = oku('exb-numune', []).filter(o => o.durum === 'yeni').length;
    if (od) ekle({ k: 'od', renk: 'sari', metin: `${od} ödeme bildirimi kontrol bekliyor`, git: 'odemeler' });
    if (nm) ekle({ k: 'nm', renk: 'sari', metin: `${nm} numune talebi bekliyor`, git: 'numuneler' });
    (typeof KMP !== 'undefined' ? KMP : []).filter(k => kmpDurum(k)[0] === 'Yayında' && k.bit).forEach(k => { const g = gunFark(k.bit); if (g >= 0 && g <= 3) ekle({ k: 'km-' + k.ad + k.bit, renk: 'yesil', metin: `“${k.ad}” kampanyası ${g === 0 ? 'bugün' : g + ' gün sonra'} bitiyor`, alt: 'Uzatmak isterseniz Kampanyalar’dan düzenleyin', git: 'kampanyalar' }); });
    return A;
  }
  const vadesi = () => HT.filter(h => !h.bitti && h.tarih <= bugunS());
  function htRozet() { const n = vadesi().length + otomatik().filter(x => x.renk === 'kirmizi').length, r = $('aside button.m[data-s=hatirlatmalar] .say'); if (r) { r.textContent = n; r.classList.toggle('gizli', !n); } return n; }
  function hatirlatmalar() {
    $('#baslik').textContent = 'Hatırlatmalar'; HT = oku('exs-hatirlatma', []);
    const A = otomatik(), bg = bugunS(), G = HT.filter(h => !h.bitti && h.tarih < bg), B = HT.filter(h => !h.bitti && h.tarih === bg), Y = HT.filter(h => !h.bitti && h.tarih > bg).sort((a, b) => a.tarih.localeCompare(b.tarih)), T = HT.filter(h => h.bitti).sort((a, b) => b.bitti - a.bitti).slice(0, 10);
    const MS = Object.values(MUS).sort((a, b) => (a.firma || a.kul).localeCompare(b.firma || b.kul, 'tr'));
    const kendi = (h, renk) => `<div class="ht ${renk}"><span class="n"></span><div class="m"><b>${esc(h.metin)}</b><small>${tarih(h.tarih)}${h.tarih < bg ? ' · ' + -gunFark(h.tarih) + ' gün gecikti' : ''}${h.kul ? ' · ' + esc(firmaAd(h.kul)) : ''}${h.no ? ' · ' + esc(h.no) : ''} · ${esc(h.kim || '')}</small></div>
      <div class="a">${h.no && SIP[h.no] ? `<button class="btn cizgi" data-hsp="${esc(h.no)}">Sipariş</button>` : ''}${h.kul ? `<button class="btn cizgi" data-hkr="${esc(h.kul)}">Kart</button>` : ''}<button class="btn marka" data-hb="${h.id}">Tamamlandı</button><button class="btn cizgi" data-he="${h.id}" data-g="1">Yarın</button><button class="btn cizgi" data-he="${h.id}" data-g="7">+1 hafta</button><button class="btn cizgi" data-hs="${h.id}">Sil</button></div></div>`;
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Gecikmiş</span><b style="color:${G.length ? 'var(--kotu)' : 'inherit'}">${G.length}</b><small>tarihi geçen hatırlatma</small></div><div><span>Bugün</span><b>${B.length}</b><small>yapılacak</small></div><div><span>Yaklaşan</span><b>${Y.length}</b><small>planlanan</small></div><div><span>Otomatik uyarı</span><b>${A.length}</b><small>${A.filter(x => x.renk === 'kirmizi').length} acil</small></div></div>
      <div class="kart"><h3>Yeni hatırlatma</h3><div class="ht-form"><div class="alan" style="margin:0"><label>Ne yapılacak?</label><input id="htMet" placeholder="Örn. Akdeniz Bahçe'yi teklif için ara"></div>
        <div class="alan" style="margin:0"><label>Tarih</label><input id="htTar" type="date" value="${bg}"></div>
        <div class="alan" style="margin:0"><label>Bayi (isteğe bağlı)</label><select id="htKul"><option value="">—</option>${MS.map(m => `<option value="${esc(m.kul)}">${esc(m.firma || m.kul)}</option>`).join('')}</select></div>
        <div class="alan" style="margin:0"><label>Sipariş no (isteğe bağlı)</label><input id="htNo" placeholder="EXG-2026-0001" list="htSipL"><datalist id="htSipL">${sipList().slice(0, 50).map(o => `<option value="${o.no}">${esc(o.firma)}</option>`).join('')}</datalist></div>
        <button class="btn marka" id="htEkle">Ekle</button></div></div>
      <div class="kart"><h3>Bugün ve gecikmiş (${G.length + B.length})</h3>${G.length + B.length ? G.map(h => kendi(h, 'kirmizi')).join('') + B.map(h => kendi(h, 'sari')).join('') : '<div class="kucuk">Bugün için hatırlatma yok.</div>'}</div>
      <div class="kart"><h3>Otomatik uyarılar (${A.length})</h3><div class="alt">Sistem bunları siparişlerden, cari hesaplardan, bayi bildirimlerinden ve kampanyalardan çıkarır. Sorun çözülünce kendiliğinden kaybolur; “Bugün gizle” ile gün boyu saklayabilirsiniz.</div>
        ${A.length ? A.map((x, i) => `<div class="ht ${x.renk}"><span class="n"></span><div class="m"><b>${esc(x.metin)}</b>${x.alt ? `<small>${esc(x.alt)}</small>` : ''}</div><div class="a">
          ${x.sip ? `<button class="btn marka" data-asp="${i}">Siparişi aç</button>` : ''}${x.odeme ? `<button class="btn marka" data-abh="${i}">Bayiye hatırlat</button>` : ''}${x.kul ? `<button class="btn cizgi" data-akr="${i}">Müşteri kartı</button>` : ''}${x.git ? `<button class="btn marka" data-agt="${i}">Git</button>` : ''}
          <button class="btn cizgi" data-ahs="${i}">Bana hatırlat</button><button class="btn cizgi" data-agz="${i}">Bugün gizle</button></div></div>`).join('') : '<div class="kucuk">Şu an otomatik uyarı yok.</div>'}</div>
      <div class="kart"><h3>Yaklaşan (${Y.length})</h3>${Y.length ? Y.map(h => kendi(h, '')).join('') : '<div class="kucuk">Planlanmış hatırlatma yok.</div>'}</div>
      ${T.length ? `<div class="kart"><h3>Son tamamlananlar</h3>${T.map(h => `<div class="ht yesil"><span class="n"></span><div class="m" style="opacity:.7"><s>${esc(h.metin)}</s><small>${tarih(h.tarih)} · ${new Date(h.bitti).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })} tamamlandı</small></div></div>`).join('')}</div>` : ''}`;
    const yenile = () => { htRozet(); hatirlatmalar(); };
    $('#htEkle').onclick = () => { const m = $('#htMet').value.trim(); if (!m) return toast('Ne yapılacağını yazın.'); HT.push({ id: 'h' + Date.now().toString(36), metin: m, tarih: $('#htTar').value || bg, kul: $('#htKul').value, no: $('#htNo').value.trim(), kim: kimAd(), zaman: Date.now() }); htYaz(); toast('Hatırlatma eklendi.'); yenile(); };
    const bul = id => HT.find(h => h.id === id);
    $$('[data-hb]').forEach(b => b.onclick = () => { bul(b.dataset.hb).bitti = Date.now(); htYaz(); yenile(); });
    $$('[data-he]').forEach(b => b.onclick = () => { const d = new Date(); d.setDate(d.getDate() + +b.dataset.g); bul(b.dataset.he).tarih = d.toISOString().slice(0, 10); htYaz(); toast('Ertelendi: ' + tarih(d)); yenile(); });
    $$('[data-hs]').forEach(b => b.onclick = () => { if (!b.dataset.emin) { b.dataset.emin = 1; b.textContent = 'Silinsin mi?'; return; } HT = HT.filter(h => h.id !== b.dataset.hs); htYaz(); yenile(); });
    $$('[data-hsp]').forEach(b => b.onclick = () => siparisAc(b.dataset.hsp));
    $$('[data-hkr]').forEach(b => b.onclick = () => musteriKarti(b.dataset.hkr));
    $$('[data-asp]').forEach(b => b.onclick = () => siparisAc(A[+b.dataset.asp].sip));
    $$('[data-akr]').forEach(b => b.onclick = () => musteriKarti(A[+b.dataset.akr].kul));
    $$('[data-agt]').forEach(b => b.onclick = () => git(A[+b.dataset.agt].git));
    $$('[data-agz]').forEach(b => b.onclick = () => { const Gz = oku('exs-hat-gizli', {}) || {}; Gz[A[+b.dataset.agz].k] = bg; yaz('exs-hat-gizli', Gz); yenile(); });
    $$('[data-ahs]').forEach(b => b.onclick = () => { const x = A[+b.dataset.ahs], d = new Date(); d.setDate(d.getDate() + 1); HT.push({ id: 'h' + Date.now().toString(36), metin: x.metin, tarih: d.toISOString().slice(0, 10), kul: x.kul || (x.sip && SIP[x.sip] ? SIP[x.sip].kul : ''), no: x.sip || '', kim: kimAd(), zaman: Date.now() }); htYaz(); toast('Yarın için hatırlatma eklendi.'); yenile(); });
    $$('[data-abh]').forEach(b => b.onclick = () => { const x = A[+b.dataset.abh];
      const p = pencere(`<h2 style="margin:0 0 4px">Bayiye ödeme hatırlatması</h2><div class="kucuk" style="margin-bottom:12px">${esc(firmaAd(x.kul))} bu mesajı portalda Hatırlatmalar bölümünde görür.</div>
        <div class="alan"><label>Mesaj</label><textarea id="bhMet" rows="4">Sayın ${esc(firmaAd(x.kul))}, cari hesabınızda vadesi geçmiş ${usd(x.odeme)} bakiye bulunuyor. Ödemenizi yaptıysanız portaldaki Cari hesabım ekranından dekontla bildirebilirsiniz. Teşekkürler, EXIT Garden</textarea></div>
        <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn cizgi" id="bhVaz">Vazgeç</button><button class="btn marka" id="bhGon">Gönder</button></div>`);
      p.querySelector('#bhVaz').onclick = () => p.remove();
      p.querySelector('#bhGon').onclick = () => { const m = p.querySelector('#bhMet').value.trim(); if (!m) return; bayiyeHatirlat(x.kul, 'odeme', m); (CRM[x.kul] = CRM[x.kul] || []).push({ tarih: Date.now(), tur: 'Portal', yazi: 'Ödeme hatırlatması gönderildi', kim: kimAd() }); yaz('exs-crm', CRM); p.remove(); toast('Hatırlatma bayi portalına gönderildi.'); yenile(); }; });
  }

  // gezinme ve rozetler
  const SAY = { karne: ['Bayi karnesi', karne], hatirlatmalar: ['Hatırlatmalar', hatirlatmalar] };
  const _gitH = git;
  git = function (s) { const S = SAY[s]; if (S) { try { $('#yol').textContent = 'Satış Yönetimi  /  ' + S[0]; } catch (e) {} aktif = s; $$('aside button.m[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = ''; S[1](); window.scrollTo(0, 0); } else _gitH(s); htRozet(); };
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
  let ilk = true;
  const _acH = ac;
  ac = function () { _acH(); setTimeout(() => { if (!ilk) return; ilk = false; const n = vadesi().length; if (n) toast(`Bugün ${n} hatırlatmanız var.`); }, 3200); };
  setInterval(() => { if (ben) htRozet(); }, 30000);
})();
