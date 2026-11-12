
(function () {
  const S6 = {};
  const pencere = (html, gen) => { const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) p.remove(); }; p.innerHTML = `<div class="pencere" style="${gen ? 'max-width:760px' : 'max-width:560px'}"><button class="kapat">×</button>${html}</div>`; document.body.appendChild(p); p.querySelector('.kapat').onclick = () => p.remove(); return p; };
  const ico = d => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ekleMenu = (s, ad, d, yer, once) => { if ($(`aside button.m[data-s=${s}]`)) return; const r = $(`aside button.m[data-s=${yer}]`); const h = `<button class="m" data-s="${s}">${ico(d)}${ad} <span class="say gizli"></span></button>`; if (r) r.insertAdjacentHTML(once ? 'beforebegin' : 'afterend', h); else $('#menu').insertAdjacentHTML('beforeend', h); };
  const sayi = v => parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  const p2 = n => (Math.round((n || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

  // ================= 14. Temsilci görünürlüğü ve işlem kaydı =================
  const ISL = () => oku('exs-islem', []) || [];
  function islem(olay, detay) { const L = ISL(); L.push({ t: Date.now(), kim: ben ? ben.kul : '-', ad: kimAd ? kimAd() : '', olay, detay: detay || '' }); if (L.length > 3000) L.splice(0, L.length - 3000); yaz('exs-islem', L); }
  window.islemKaydi = islem;
  const temsilciMi = () => ben && !yonetici();
  const HAM = {}, atamaVar = () => Object.values(HAM.MUS || MUS).some(m => m && m.temsilci);
  const gorur = kul => { if (!temsilciMi() || !atamaVar()) return true; const m = MUS[kul]; return !!(m && m.temsilci === ben.kul); };
  function suzgec(obj, kulAl) {
    return new Proxy(obj, {
      ownKeys: t => Reflect.ownKeys(t).filter(k => typeof k !== 'string' || !t[k] || gorur(kulAl(t[k], k))),
      getOwnPropertyDescriptor: (t, k) => { const d = Reflect.getOwnPropertyDescriptor(t, k); if (d && typeof k === 'string' && t[k] && !gorur(kulAl(t[k], k))) return undefined; return d; },
      get: (t, k, r) => k === 'toJSON' ? () => t : Reflect.get(t, k)
    });
  }
  const _ac = ac;
  ac = function () {
    if (temsilciMi()) { HAM.MUS = MUS; SIP = suzgec(SIP, o => o.kul); MUS = suzgec(MUS, (m, k) => k); }
    _ac.apply(this, arguments);
    islem('Giriş', ROL_AD[rolu(ben)] || '');
    if (temsilciMi()) ['kullanicilar6'].forEach(s => { const b = $(`aside button.m[data-s=${s}]`); b && b.remove(); });
    setTimeout(iadeRozet, 500);
  };
  if (ben && temsilciMi()) { HAM.MUS = MUS; SIP = suzgec(SIP, o => o.kul); MUS = suzgec(MUS, (m, k) => k); }
  const _dy = durumYaz;
  durumYaz = function (no, d) {
    const o = SIP[no], ileri = ['onay', 'uretim', 'sevk'].includes(d) && o && !['onay', 'uretim', 'sevk'].includes(o.durum);
    if (ileri && o && !o.limitOnay) { const r = riskHesap(o.kul); const yeniRisk = r.risk + (['yeni'].includes(o.durum) ? tutarlar(o).net : 0);
      if (r.limit > 0 && yeniRisk > r.limit) {
        if (!yonetici()) { toast(`${(MUS[o.kul] || {}).firma || o.kul}: kredi limiti aşılıyor (${usd(yeniRisk)} / ${usd(r.limit)}). Bu siparişi yönetici onaylamalı.`); islem('Limit engeli', `${no} · ${usd(yeniRisk)} / ${usd(r.limit)}`); try { git(aktif); } catch (e) {} return; }
        const p = pencere(`<h3>Kredi limiti aşılıyor</h3><p>${esc((MUS[o.kul] || {}).firma || o.kul)} için risk <b>${usd(yeniRisk)}</b> olacak; limit <b>${usd(r.limit)}</b>. Vadesi geçmiş: <b>${usd(r.gecmis)}</b>.</p><p class="kucuk">Onaylarsanız sipariş limit aşımı onayıyla işleme alınır ve işlem kaydına yazılır.</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn cizgi" id="lmVaz">Vazgeç</button><button class="btn marka" id="lmOk">Limiti aşarak onayla</button></div>`);
        p.querySelector('#lmVaz').onclick = () => { p.remove(); try { git(aktif); } catch (e) {} };
        p.querySelector('#lmOk').onclick = () => { o.limitOnay = { kim: kimAd(), zaman: Date.now(), risk: yeniRisk, limit: r.limit }; islem('Limit aşımı onayı', `${no} · ${usd(yeniRisk)} / ${usd(r.limit)}`); p.remove(); durumYaz(no, d); };
        return;
      } }
    const eski = o ? o.durum : ''; _dy.apply(this, arguments); if (o && eski !== d) islem('Sipariş durumu', `${no}: ${eski} → ${d}`);
  };
  const _fk = faturaKes; faturaKes = function (o) { const n = (CARI[o.kul] || { hareket: [] }).hareket.length; _fk.apply(this, arguments); if ((CARI[o.kul] || { hareket: [] }).hareket.length > n) islem('Fatura kesildi', `FT-${o.no} · ${usd(tutarlar(o).net)}`); };

  // ================= 9. Kredi limiti ve risk =================
  function riskHesap(kul) {
    const c = CARI[kul] || { hareket: [], vade: VADE_VARS }, z = cariOzet(kul), fat = new Set(c.hareket.filter(h => h.tip === 'fatura').map(h => h.sip));
    const acik = Object.values(SIP).filter(o => o.kul === kul && !['iptal', 'yeni'].includes(o.durum) && !fat.has(o.no)).reduce((a, o) => a + tutarlar(o).net, 0);
    const risk = z.bakiye + acik, limit = +c.limit || 0; return { limit, bakiye: z.bakiye, acik, risk, kul: limit ? limit - risk : null, gecmis: z.gecmis, gecikme: z.gecikmeGun, oran: limit ? risk / limit * 100 : 0 };
  }
  window.riskHesap = riskHesap;
  S6.limit = function () {
    $('#baslik').textContent = 'Kredi limiti ve risk';
    const R = Object.values(MUS).filter(m => m && m.kul).map(m => ({ m, ...riskHesap(m.kul) })).sort((a, b) => b.oran - a.oran || b.risk - a.risk);
    const asim = R.filter(r => r.limit && r.risk > r.limit), gec = R.filter(r => r.gecmis > 0.5);
    $('#ustSag').innerHTML = `<button class="btn cizgi" id="lmCsv">Excel'e aktar</button>`;
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Limit tanımlı bayi</span><b>${R.filter(r => r.limit).length}</b><small>${R.length} bayiden</small></div><div><span>Limiti aşan</span><b>${asim.length}</b><small>${usd(asim.reduce((a, r) => a + r.risk - r.limit, 0))} aşım</small></div><div><span>Vadesi geçmiş alacak</span><b>${usd(gec.reduce((a, r) => a + r.gecmis, 0))}</b><small>${gec.length} bayi</small></div><div><span>Toplam risk</span><b>${usd(R.reduce((a, r) => a + r.risk, 0))}</b><small>bakiye + faturalanmamış açık sipariş</small></div></div>
      <div class="kart"><h3>Bayi limitleri</h3><div class="alt">Risk = cari bakiye + onaylanmış ama faturası kesilmemiş siparişler. Limiti aşacak bir sipariş onaylanmak istendiğinde temsilci engellenir, yönetici ise gerekçeli onay verebilir. Bayi limitini ve kullanılabilir tutarı Cari hesabım ekranında görür.</div>
      <table class="tablo"><tr><th>Bayi</th><th class="sag-hiza">Limit $</th><th class="sag-hiza">Bakiye</th><th class="sag-hiza">Açık sipariş</th><th class="sag-hiza">Risk</th><th>Doluluk</th><th class="sag-hiza">Kullanılabilir</th><th class="sag-hiza">Vadesi geçmiş</th></tr>
      ${R.map(r => `<tr class="${r.limit && r.risk > r.limit ? 'lm-asim' : ''}"><td><b>${esc(r.m.firma || r.m.kul)}</b><div class="kucuk">${esc(r.m.sehir || '')}</div></td><td class="sag-hiza"><input class="s6-in" style="width:110px;text-align:right" data-lm="${esc(r.m.kul)}" value="${r.limit || ''}" placeholder="limit yok" ${yonetici() ? '' : 'disabled title="Yalnız yönetici değiştirebilir"'}></td>
        <td class="sag-hiza">${usd(r.bakiye)}</td><td class="sag-hiza">${usd(r.acik)}</td><td class="sag-hiza"><b>${usd(r.risk)}</b></td><td>${r.limit ? `<div class="bh-c" style="height:8px;border-radius:4px;background:var(--cizgi2,#f1f5f9);min-width:90px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, r.oran)}%;background:${r.oran >= 100 ? '#dc2626' : r.oran > 80 ? '#d97706' : '#16a34a'}"></i></div><span class="kucuk">${yuzde(r.oran)}</span>` : '<span class="kucuk">—</span>'}</td>
        <td class="sag-hiza">${r.limit ? `<span class="${r.kul < 0 ? 'azl' : 'art'}">${usd(r.kul)}</span>` : '—'}</td><td class="sag-hiza">${r.gecmis > 0.5 ? `<span class="azl">${usd(r.gecmis)}</span><div class="kucuk">${r.gecikme} gün</div>` : '—'}</td></tr>`).join('') || '<tr><td colspan="8" class="kucuk">Bayi yok.</td></tr>'}</table></div>`;
    $$('[data-lm]').forEach(i => { i.onkeydown = e => { if (e.key === 'Enter') i.blur(); }; i.onchange = () => { const k = i.dataset.lm, v = sayi(i.value), c = cariHesap(k), eski = c.limit; if (v > 0) c.limit = Math.round(v); else delete c.limit; cariYaz(); islem('Kredi limiti', `${(MUS[k] || {}).firma || k}: ${eski ? usd(eski) : 'yok'} → ${v > 0 ? usd(v) : 'yok'}`); toast('Limit kaydedildi.'); S6.limit(); }; });
    $('#lmCsv').onclick = () => csv('exit_kredi_risk.csv', [['Bayi', 'Limit', 'Bakiye', 'Açık sipariş', 'Risk', 'Doluluk %', 'Kullanılabilir', 'Vadesi geçmiş', 'Gecikme gün']].concat(R.map(r => [r.m.firma || r.m.kul, r.limit, Math.round(r.bakiye), Math.round(r.acik), Math.round(r.risk), Math.round(r.oran), r.limit ? Math.round(r.kul) : '', Math.round(r.gecmis), r.gecikme])));
  };
  function csv(ad, R) { const t = '﻿' + R.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' })); a.download = ad; a.click(); }

  // ================= 10. Fiyat grupları =================
  let GR = oku('exs-fiyat-grup', []);
  const grYaz = () => yaz('exs-fiyat-grup', GR);
  function grupUygula(g) { Object.values(MUS).forEach(m => { if (m && m.grup === g.id) { ISK[m.kul] = { ...(ISK[m.kul] || {}), oran: g.iskonto, grup: g.id }; } }); yaz('exs-iskonto', ISK); }
  S6.gruplar = function () {
    $('#baslik').textContent = 'Fiyat grupları';
    const M = Object.values(MUS).filter(m => m && m.kul).sort((a, b) => (a.firma || a.kul).localeCompare(b.firma || b.kul, 'tr'));
    $('#icerik').innerHTML = `<div class="izgara2"><div class="kart"><h3>Gruplar</h3><div class="alt">Her grubun iskontosu, gruptaki tüm bayilerin siparişlerine otomatik uygulanır. Grubun iskontosunu değiştirdiğinizde üyelerin hepsi güncellenir. Ürün liste fiyatlarını toplu güncellemek için Ürünler ve fiyatlar › Excel'den yükle kullanılır.</div>
      <table class="tablo"><tr><th>Grup</th><th class="sag-hiza">İskonto %</th><th class="sag-hiza">Bayi</th><th></th></tr>${GR.map(g => `<tr><td><input class="s6-in" data-gad="${g.id}" value="${esc(g.ad)}"></td><td class="sag-hiza"><input class="s6-in" style="width:70px;text-align:right" data-gis="${g.id}" value="${g.iskonto}"></td><td class="sag-hiza">${M.filter(m => m.grup === g.id).length}</td><td class="sag-hiza"><button class="btn kucuk cizgi" data-gsil="${g.id}">Sil</button></td></tr>`).join('') || '<tr><td colspan="4" class="kucuk">Henüz grup yok. Örnek: A grubu %12, B grubu %8, Proje %15.</td></tr>'}</table>
      <div style="display:flex;gap:8px;margin-top:10px"><input class="s6-in" id="gYAd" placeholder="Grup adı" style="flex:1"><input class="s6-in" id="gYIs" placeholder="%" style="width:70px"><button class="btn" id="gYEk">Ekle</button></div></div>
      <div class="kart"><h3>Bayi atamaları</h3><div class="alt">Grubu olmayan bayide müşteriye özel iskonto (Müşteriler ve cari) geçerlidir.</div>
      <table class="tablo"><tr><th>Bayi</th><th>Grup</th><th class="sag-hiza">Geçerli iskonto</th></tr>${M.map(m => `<tr><td><b>${esc(m.firma || m.kul)}</b></td><td><select class="s6-in" data-gm="${esc(m.kul)}"><option value="">— Grup yok —</option>${GR.map(g => `<option value="${g.id}" ${m.grup === g.id ? 'selected' : ''}>${esc(g.ad)} (%${g.iskonto})</option>`).join('')}</select></td><td class="sag-hiza">${yuzde(musIsk(m.kul))}</td></tr>`).join('')}</table></div></div>`;
    $('#gYEk').onclick = () => { const ad = $('#gYAd').value.trim(), is = sayi($('#gYIs').value); if (!ad || !(is >= 0 && is < 100)) return toast('Grup adı ve 0–99 arası iskonto girin.'); GR.push({ id: 'g' + Date.now().toString(36), ad, iskonto: is }); grYaz(); islem('Fiyat grubu eklendi', `${ad} %${is}`); S6.gruplar(); };
    $$('[data-gad]').forEach(i => i.onchange = () => { const g = GR.find(x => x.id === i.dataset.gad); g.ad = i.value.trim() || g.ad; grYaz(); S6.gruplar(); });
    $$('[data-gis]').forEach(i => i.onchange = () => { const g = GR.find(x => x.id === i.dataset.gis), v = sayi(i.value); if (!(v >= 0 && v < 100)) return toast('0–99 arası girin.'); const e = g.iskonto; g.iskonto = v; grYaz(); grupUygula(g); islem('Grup iskontosu', `${g.ad}: %${e} → %${v}`); toast(`${g.ad} üyelerine %${v} uygulandı.`); S6.gruplar(); });
    $$('[data-gsil]').forEach(b => b.onclick = () => { const g = GR.find(x => x.id === b.dataset.gsil); Object.values(MUS).forEach(m => { if (m && m.grup === g.id) { delete m.grup; if (ISK[m.kul] && ISK[m.kul].grup === g.id) delete ISK[m.kul].grup; } }); GR = GR.filter(x => x !== g); grYaz(); yaz('exs-musteriler', MUS); yaz('exs-iskonto', ISK); islem('Fiyat grubu silindi', g.ad); S6.gruplar(); });
    $$('[data-gm]').forEach(s => s.onchange = () => { const m = MUS[s.dataset.gm], g = GR.find(x => x.id === s.value); if (g) { m.grup = g.id; ISK[m.kul] = { ...(ISK[m.kul] || {}), oran: g.iskonto, grup: g.id }; } else { delete m.grup; if (ISK[m.kul]) delete ISK[m.kul].grup; } yaz('exs-musteriler', MUS); yaz('exs-iskonto', ISK); islem('Bayi grubu', `${m.firma || m.kul} → ${g ? g.ad : 'grupsuz'}`); S6.gruplar(); });
  };

  // ================= 7. İade ve şikâyetler =================
  const IAD = { yeni: ['Yeni', 'ia-yeni'], inceleme: ['İnceleniyor', 'ia-inceleme'], onay: ['Onaylandı', 'ia-onay'], red: ['Reddedildi', 'ia-red'], cozuldu: ['Çözüldü', 'ia-cozuldu'] };
  const iadeL = () => (oku('exb-iade', []) || []).filter(x => gorur(x.kul));
  function iadeRozet() { const n = iadeL().filter(x => x.durum === 'yeni').length, b = $('aside button.m[data-s=iadeler] .say'); if (b) { b.textContent = n; b.classList.toggle('gizli', !n); } }
  setInterval(iadeRozet, 5000);
  S6.iadeF = S6.iadeF || 'acik';
  S6.iadeler = function () {
    $('#baslik').textContent = 'İade ve şikâyetler';
    const A = iadeL().sort((a, b) => b.zaman - a.zaman), L = A.filter(x => S6.iadeF === 'hepsi' || (S6.iadeF === 'acik' ? !['red', 'cozuldu'].includes(x.durum) : ['red', 'cozuldu'].includes(x.durum)));
    $('#ustSag').innerHTML = `<select class="btn cizgi" id="iaF"><option value="acik" ${S6.iadeF === 'acik' ? 'selected' : ''}>Açık kayıtlar</option><option value="kapali" ${S6.iadeF === 'kapali' ? 'selected' : ''}>Kapananlar</option><option value="hepsi" ${S6.iadeF === 'hepsi' ? 'selected' : ''}>Tümü</option></select>`;
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Yeni</span><b>${A.filter(x => x.durum === 'yeni').length}</b><small>yanıt bekliyor</small></div><div><span>İnceleniyor</span><b>${A.filter(x => x.durum === 'inceleme').length}</b></div><div><span>Bu ay</span><b>${A.filter(x => new Date(x.zaman).getMonth() === new Date().getMonth() && new Date(x.zaman).getFullYear() === new Date().getFullYear()).length}</b></div><div><span>En sık konu</span><b style="font-size:16px">${(() => { const c = {}; A.forEach(x => c[x.tur] = (c[x.tur] || 0) + 1); const t = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return t ? esc(t[0]) : '—'; })()}</b></div></div>
      <div class="kart"><table class="tablo"><tr><th>No</th><th>Bayi</th><th>Sipariş / ürün</th><th>Konu</th><th>Durum</th><th></th></tr>${L.map(x => `<tr><td><b>${esc(x.no)}</b><div class="kucuk">${tarih(x.zaman)}</div></td><td>${esc(x.firma || x.kul)}</td><td>${esc(x.sip)}<div class="kucuk">${esc(x.urun || '')} · ${x.adet} adet</div></td><td>${esc(x.tur)}<div class="kucuk">${esc((x.aciklama || '').slice(0, 70))}</div></td><td><span class="ia-d ${IAD[x.durum][1]}">${IAD[x.durum][0]}</span></td><td class="sag-hiza"><button class="btn kucuk" data-ia="${x.id}">Aç</button></td></tr>`).join('') || '<tr><td colspan="6" class="kucuk">Kayıt yok.</td></tr>'}</table></div>`;
    $('#iaF').onchange = e => { S6.iadeF = e.target.value; S6.iadeler(); };
    $$('[data-ia]').forEach(b => b.onclick = () => iadeAc(b.dataset.ia));
  };
  function iadeAc(id) {
    const T = oku('exb-iade', []) || [], x = T.find(y => y.id === id); if (!x) return;
    const p = pencere(`<h2 style="margin:0">${esc(x.no)} · ${esc(x.tur)}</h2><div class="kucuk">${esc(x.firma || x.kul)} · ${tarih(x.zaman)} · Sipariş ${esc(x.sip)}</div>
      <p><b>Ürün:</b> ${esc(x.urun || '')} · ${x.adet} adet</p><p style="white-space:pre-wrap">${esc(x.aciklama)}</p>
      ${(x.foto || []).length ? `<div class="ia-foto">${x.foto.map(f => `<img src="${f}" data-buyut>`).join('')}</div>` : '<p class="kucuk">Fotoğraf eklenmemiş.</p>'}
      <div class="s6-form" style="margin-top:12px"><div><label>Durum</label><select class="s6-in" id="iaD">${Object.entries(IAD).map(([k, v]) => `<option value="${k}" ${x.durum === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div></div>
      <div style="margin-top:10px"><label class="kucuk"><b>Bayiye yanıt</b></label><textarea class="s6-in" id="iaY" rows="3" style="width:100%;box-sizing:border-box">${esc(x.yanit || '')}</textarea></div>
      <div class="kucuk" style="margin-top:8px">${(x.gecmis || []).map(g => `${new Date(g.zaman).toLocaleString('tr-TR')} · ${esc(IAD[g.durum] ? IAD[g.durum][0] : g.durum)} · ${esc(g.kim || '')}`).join('<br>')}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn cizgi" id="iaMus">Müşteri kartı</button><button class="btn marka" id="iaK">Kaydet ve bayiye bildir</button></div>`, true);
    p.querySelectorAll('[data-buyut]').forEach(i => i.onclick = () => { const w = window.open(''); w && w.document.write(`<img src="${i.src}" style="max-width:100%">`); });
    p.querySelector('#iaMus').onclick = () => { p.remove(); musteriKarti(x.kul); };
    p.querySelector('#iaK').onclick = () => { const T2 = oku('exb-iade', []) || [], y = T2.find(z => z.id === id), d = p.querySelector('#iaD').value, yt = p.querySelector('#iaY').value.trim();
      if (y.durum !== d) (y.gecmis = y.gecmis || []).push({ zaman: Date.now(), durum: d, kim: kimAd() }); y.durum = d; y.yanit = yt; y.guncel = Date.now(); yaz('exb-iade', T2);
      (CRM[y.kul] = CRM[y.kul] || []).push({ tarih: Date.now(), tur: 'İade/şikâyet', yazi: `${y.no}: ${IAD[d][0]}${yt ? ' · ' + yt : ''}`, kim: kimAd() }); yaz('exs-crm', CRM);
      islem('İade/şikâyet', `${y.no} → ${IAD[d][0]}`); p.remove(); toast('Kaydedildi; bayi portalında görünür.'); iadeRozet(); S6.iadeler(); };
  }

  // ================= 11. Ziyaret ve görüşmeler =================
  S6.ziyaret = function () {
    $('#baslik').textContent = 'Ziyaret ve görüşmeler';
    const M = Object.values(MUS).filter(m => m && m.kul).sort((a, b) => (a.firma || a.kul).localeCompare(b.firma || b.kul, 'tr'));
    const N = []; Object.keys(CRM).forEach(k => { if (MUS[k] !== undefined || gorur(k)) (CRM[k] || []).forEach(n => N.push({ ...n, kul: k })); }); N.sort((a, b) => b.tarih - a.tarih);
    const ZF = S6.zf || (S6.zf = { kim: '', kul: '' }), L = N.filter(n => (!ZF.kul || n.kul === ZF.kul) && (!ZF.kim || n.kim === ZF.kim));
    const bg = new Date().toISOString().slice(0, 10), HT2 = oku('exs-hatirlatma', []).filter(h => !h.bitti && h.ziyaret && gorur(h.kul)).sort((a, b) => a.tarih.localeCompare(b.tarih));
    const temasYok = M.filter(m => { const t = Math.max(0, ...(CRM[m.kul] || []).map(n => n.tarih)); return !t || Date.now() - t > 30 * GUN; });
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Bu ay görüşme</span><b>${N.filter(n => new Date(n.tarih).getMonth() === new Date().getMonth() && new Date(n.tarih).getFullYear() === new Date().getFullYear()).length}</b></div><div><span>Planlı görüşme</span><b>${HT2.length}</b><small>${HT2.filter(h => h.tarih < bg).length} gecikmiş</small></div><div><span>30 gündür temas yok</span><b>${temasYok.length}</b><small>bayi</small></div></div>
      <div class="kart"><h3>Yeni kayıt</h3><div class="s6-form"><div><label>Bayi</label><select class="s6-in" id="zBayi">${M.map(m => `<option value="${esc(m.kul)}">${esc(m.firma || m.kul)}</option>`).join('')}</select></div>
        <div><label>Tür</label><select class="s6-in" id="zTur"><option>Ziyaret</option><option>Telefon</option><option>E-posta</option><option>Toplantı</option><option>Showroom</option></select></div>
        <div><label>Tarih</label><input class="s6-in" type="date" id="zTar" value="${bg}"></div><div><label>Sonraki görüşme</label><input class="s6-in" type="date" id="zSon"></div></div>
        <textarea class="s6-in" id="zNot" rows="3" style="width:100%;box-sizing:border-box;margin-top:10px" placeholder="Görüşme notu: konuşulanlar, talepler, teklif, rakip bilgisi…"></textarea><button class="btn marka" id="zKay" style="margin-top:8px">Kaydet</button></div>
      ${HT2.length ? `<div class="kart"><h3>Planlı görüşmeler</h3><table class="tablo">${HT2.map(h => `<tr><td style="white-space:nowrap" class="${h.tarih < bg ? 'azl' : ''}">${tarih(new Date(h.tarih))}</td><td><b>${esc((MUS[h.kul] || {}).firma || h.kul)}</b></td><td>${esc(h.metin)}</td><td class="kucuk">${esc(h.kim || '')}</td><td class="sag-hiza"><button class="btn kucuk cizgi" data-zb="${h.id}">Yapıldı</button></td></tr>`).join('')}</table></div>` : ''}
      <div class="kart"><h3>Görüşme geçmişi</h3><div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap"><select class="s6-in" id="zfK"><option value="">Tüm bayiler</option>${M.map(m => `<option value="${esc(m.kul)}" ${ZF.kul === m.kul ? 'selected' : ''}>${esc(m.firma || m.kul)}</option>`).join('')}</select><select class="s6-in" id="zfP"><option value="">Tüm personel</option>${[...new Set(N.map(n => n.kim))].map(k => `<option ${ZF.kim === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
      <table class="tablo">${L.slice(0, 200).map(n => `<tr><td style="white-space:nowrap">${tarih(n.tarih)}</td><td><b>${esc((MUS[n.kul] || {}).firma || n.kul)}</b></td><td><span class="uy uy-bilgi">${esc(n.tur || 'Not')}</span></td><td>${esc(n.yazi)}</td><td class="kucuk">${esc(n.kim || '')}</td></tr>`).join('') || '<tr><td class="kucuk">Kayıt yok.</td></tr>'}</table></div>
      ${temasYok.length ? `<div class="kart"><h3>Uzun süredir temas kurulmayan bayiler</h3><div>${temasYok.map(m => `<span class="uy uy-uyari" style="margin:0 6px 6px 0;display:inline-block">${esc(m.firma || m.kul)}</span>`).join('')}</div></div>` : ''}`;
    $('#zKay').onclick = () => { const kul = $('#zBayi').value, y = $('#zNot').value.trim(); if (!kul || !y) return toast('Bayi ve not gerekli.');
      const t = new Date($('#zTar').value || bg); t.setHours(12); (CRM[kul] = CRM[kul] || []).push({ tarih: t.getTime(), tur: $('#zTur').value, yazi: y, kim: kimAd() }); yaz('exs-crm', CRM);
      const s = $('#zSon').value; if (s) { const H = oku('exs-hatirlatma', []); H.push({ id: 'h' + Date.now().toString(36), metin: `${$('#zTur').value} sonrası görüşme: ${y.slice(0, 80)}`, tarih: s, kul, no: '', kim: kimAd(), zaman: Date.now(), ziyaret: true }); yaz('exs-hatirlatma', H); try { HT = H; } catch (e) {} }
      islem('Görüşme kaydı', `${(MUS[kul] || {}).firma || kul} · ${$('#zTur').value}`); toast(s ? 'Kaydedildi; sonraki görüşme hatırlatmalara eklendi.' : 'Kaydedildi.'); S6.ziyaret(); };
    $$('[data-zb]').forEach(b => b.onclick = () => { const H = oku('exs-hatirlatma', []), h = H.find(x => x.id === b.dataset.zb); if (h) h.bitti = Date.now(); yaz('exs-hatirlatma', H); try { HT = H; } catch (e) {} S6.ziyaret(); });
    $('#zfK').onchange = e => { ZF.kul = e.target.value; S6.ziyaret(); }; $('#zfP').onchange = e => { ZF.kim = e.target.value; S6.ziyaret(); };
  };

  // ================= 8. Gösterge paneli =================
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
    const yeni = O.filter(o => o.durum === 'yeni').length, iaA = iadeL().filter(x => !['red', 'cozuldu'].includes(x.durum)).length;
    const R = Object.values(MUS).filter(m => m && m.kul).map(m => ({ m, ...riskHesap(m.kul) })), asim = R.filter(r => r.limit && r.risk > r.limit), gec = R.filter(r => r.gecmis > 0.5);
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Bu ay net satış</span><b>${usd(buA.net)}</b><small>${dg(deg(buA.net, gecA.net))} geçen aya göre</small></div><div><span>Son 12 ay</span><b>${usd(A.reduce((a, x) => a + x.net, 0))}</b><small>${A.reduce((a, x) => a + x.n, 0)} sipariş</small></div><div><span>Geçen yılın aynı ayı</span><b>${usd(gyil)}</b><small>${dg(deg(buA.net, gyil))}</small></div><div><span>Bekleyen iş</span><b>${yeni}</b><small>yeni sipariş · ${iaA} açık iade</small></div></div>
      <div class="gp-izg"><div class="kart"><h3>Aylık net satış (son 12 ay)</h3><div class="gp-bar">${A.map((a, i) => `<div class="${i === 11 ? 'bu' : ''}" data-t="${a.ad}: ${usd(a.net)} · ${a.n} sipariş"><i style="height:${a.net / mx * 100}%"></i></div>`).join('')}</div><div class="gp-et">${A.map(a => `<span>${a.ad}</span>`).join('')}</div></div>
        <div class="kart"><h3>Dikkat</h3>${[[asim.length, 'bayi kredi limitini aşmış', 'limit'], [gec.length, 'bayinin vadesi geçmiş borcu var', 'limit'], [iaA, 'açık iade / şikâyet', 'iadeler'], [yeni, 'sipariş onay bekliyor', 'siparisler']].map(([n, t, s]) => `<div class="gp-l" style="cursor:pointer" data-gp="${s}"><span><b>${n}</b> ${t}</span><span class="kucuk">›</span></div>`).join('')}</div></div>
      <div class="gp-izg" style="grid-template-columns:1fr 1fr"><div class="kart"><h3>Bayiler: son 3 ay ve büyüme</h3><div class="alt">Önceki 3 aya göre</div>${BL.map(b => `<div class="gp-l"><span>${esc((MUS[b.kul] || {}).firma || b.kul)}</span><span>${usd(b.s)} ${dg(deg(b.s, b.o))}</span></div>`).join('') || '<span class="kucuk">Veri yok.</span>'}</div>
        <div class="kart"><h3>En çok satan ürünler (12 ay)</h3>${UL.map(u => `<div class="gp-l"><span style="flex:1">${esc(u.ad)}<div style="height:5px;border-radius:3px;background:var(--cizgi2,#f1f5f9);margin-top:4px"><div style="height:100%;width:${u.net / umx * 100}%;background:var(--seri,#d97706);border-radius:3px"></div></div></span><span style="text-align:right">${usd(u.net)}<div class="kucuk">${u.adet} adet</div></span></div>`).join('') || '<span class="kucuk">Veri yok.</span>'}</div></div>`;
    $$('[data-gp]').forEach(d => d.onclick = () => git(d.dataset.gp));
  };

  // ================= 14. Kullanıcılar, temsilci atama ve işlem kaydı =================
  S6.kullanicilar6 = function () {
    $('#baslik').textContent = 'Temsilciler ve işlem kaydı';
    if (!yonetici()) { $('#icerik').innerHTML = '<div class="kart">Bu ekran yalnız yöneticiler içindir.</div>'; return; }
    const U = Object.values(KUL).filter(u => u && u.kul), T = U.filter(u => rolu(u) === 'temsilci'), M = Object.values(MUS).filter(m => m && m.kul).sort((a, b) => (a.firma || a.kul).localeCompare(b.firma || b.kul, 'tr'));
    const IF = S6.if || (S6.if = { kim: '', q: '' }), IL = ISL().slice().reverse().filter(x => (!IF.kim || x.kim === IF.kim) && (!IF.q || (x.olay + ' ' + x.detay).toLocaleLowerCase('tr').includes(IF.q.toLocaleLowerCase('tr'))));
    $('#icerik').innerHTML = `<div class="izgara2"><div class="kart"><h3>Kullanıcı rolleri</h3><div class="alt">Yönetici her şeyi görür. Satış temsilcisi yalnız kendisine atanmış bayilerin sipariş, müşteri, iade ve görüşmelerini görür; limit aşan siparişi onaylayamaz. Yeni kullanıcı Ayarlar ekranından eklenir.</div>
      <table class="tablo">${U.map(u => `<tr><td><b>${esc(u.ad || u.kul)}</b><div class="kucuk">${esc(u.kul)}</div></td><td><select class="s6-in" data-rol="${esc(u.kul)}" ${u.kul === ben.kul ? 'disabled title="Kendi rolünüzü değiştiremezsiniz"' : ''}><option value="yonetici" ${rolu(u) === 'yonetici' ? 'selected' : ''}>Yönetici</option><option value="temsilci" ${rolu(u) === 'temsilci' ? 'selected' : ''}>Satış temsilcisi</option></select></td><td class="sag-hiza kucuk">${M.filter(m => m.temsilci === u.kul).length} bayi</td></tr>`).join('')}</table></div>
      <div class="kart"><h3>Bayi – temsilci ataması</h3><div class="alt">${atamaVar() ? 'Atanmamış bayileri yalnız yöneticiler görür.' : 'Henüz atama yok; atama yapılana kadar temsilciler tüm bayileri görür.'}</div>
      <div style="max-height:380px;overflow:auto"><table class="tablo">${M.map(m => `<tr><td>${esc(m.firma || m.kul)}</td><td><select class="s6-in" data-tm="${esc(m.kul)}"><option value="">— Atanmamış —</option>${T.map(u => `<option value="${esc(u.kul)}" ${m.temsilci === u.kul ? 'selected' : ''}>${esc(u.ad || u.kul)}</option>`).join('')}</select></td></tr>`).join('')}</table></div>${T.length ? '' : '<p class="kucuk">Atama için önce bir kullanıcıyı “Satış temsilcisi” yapın.</p>'}</div></div>
      <div class="kart"><h3>İşlem kaydı</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><select class="s6-in" id="ifK"><option value="">Tüm kullanıcılar</option>${U.map(u => `<option value="${esc(u.kul)}" ${IF.kim === u.kul ? 'selected' : ''}>${esc(u.ad || u.kul)}</option>`).join('')}</select><input class="s6-in" id="ifQ" placeholder="Ara…" value="${esc(IF.q)}"><button class="btn cizgi" id="ifCsv">Excel'e aktar</button><span class="kucuk" style="align-self:center">${IL.length} kayıt</span></div>
      <div style="max-height:460px;overflow:auto"><table class="tablo"><tr><th>Zaman</th><th>Kullanıcı</th><th>İşlem</th><th>Ayrıntı</th></tr>${IL.slice(0, 400).map(x => `<tr><td style="white-space:nowrap" class="kucuk">${new Date(x.t).toLocaleString('tr-TR')}</td><td>${esc((KUL[x.kim] || {}).ad || x.kim)}</td><td><b>${esc(x.olay)}</b></td><td class="kucuk">${esc(x.detay)}</td></tr>`).join('') || '<tr><td class="kucuk" colspan="4">Kayıt yok.</td></tr>'}</table></div></div>`;
    $$('[data-rol]').forEach(s => s.onchange = () => { const u = KUL[s.dataset.rol]; u.rol = s.value; yaz('exs-kullanicilar', KUL); islem('Rol değişti', `${u.kul} → ${ROL_AD[s.value]}`); S6.kullanicilar6(); });
    $$('[data-tm]').forEach(s => s.onchange = () => { const m = MUS[s.dataset.tm]; if (s.value) m.temsilci = s.value; else delete m.temsilci; yaz('exs-musteriler', MUS); islem('Temsilci ataması', `${m.firma || m.kul} → ${s.value || 'atanmamış'}`); S6.kullanicilar6(); });
    $('#ifK').onchange = e => { IF.kim = e.target.value; S6.kullanicilar6(); }; $('#ifQ').onchange = e => { IF.q = e.target.value; S6.kullanicilar6(); };
    $('#ifCsv').onclick = () => csv('exit_islem_kaydi.csv', [['Zaman', 'Kullanıcı', 'İşlem', 'Ayrıntı']].concat(IL.map(x => [new Date(x.t).toLocaleString('tr-TR'), (KUL[x.kim] || {}).ad || x.kim, x.olay, x.detay])));
  };

  // ================= menü ve gezinme =================
  ekleMenu('panel', 'Gösterge paneli', '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>', 'siparisler', true);
  ekleMenu('iadeler', 'İade ve şikâyetler', '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', 'siparisler');
  ekleMenu('limit', 'Kredi limiti ve risk', '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M12 8v5M12 16h.01"/>', 'musteriler');
  ekleMenu('gruplar', 'Fiyat grupları', '<path d="M3 7h18M3 12h18M3 17h10"/>', 'limit');
  ekleMenu('ziyaret', 'Ziyaret ve görüşmeler', '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', 'gruplar');
  ekleMenu('kullanicilar6', 'Temsilciler ve işlem kaydı', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', 'ayarlar', true);
  const _git6 = git;
  git = function (s) {
    if (S6[s]) { const b = $(`aside button.m[data-s=${s}]`); try { $('#yol').textContent = 'Satış Yönetimi  /  ' + (b ? [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : ''); } catch (e) {}
      aktif = s; $$('aside button.m[data-s]').forEach(x => x.classList.toggle('on', x.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = ''; S6[s](); window.scrollTo(0, 0); }
    else _git6(s);
  };
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
  window.S6 = S6;
})();
