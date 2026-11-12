
const VERI = /*@katalog*/null;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oku = (k, v) => { try { const x = localStorage.getItem(k); return x ? JSON.parse(x) : v; } catch (e) { return v; } };
const yaz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Kayıt yapılamadı: tarayıcı depolaması kapalı.'); } };
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }
const usd = n => (Math.round(n || 0) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' $';
const tl = n => (Math.round(n || 0) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺';
const eur = n => (Math.round(n || 0) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' €';
const yuzde = n => '%' + (Math.round(n * 10) / 10).toLocaleString('tr-TR');
const tarih = t => new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
function sha256hex(str){const b=new TextEncoder().encode(str),K=[],H=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];let n=2,c=0;while(c<64){let p=1;for(let d=2;d*d<=n;d++)if(n%d===0){p=0;break}if(p){K[c++]=(Math.pow(n,1/3)%1)*4294967296|0}n++}
const l=b.length,m=new Uint8Array(((l+9+63)>>6)<<6);m.set(b);m[l]=128;const bl=l*8;m[m.length-4]=bl>>>24;m[m.length-3]=bl>>>16&255;m[m.length-2]=bl>>>8&255;m[m.length-1]=bl&255;const w=new Array(64),r=(x,y)=>x>>>y|x<<(32-y);
for(let i=0;i<m.length;i+=64){for(let t=0;t<16;t++)w[t]=m[i+4*t]<<24|m[i+4*t+1]<<16|m[i+4*t+2]<<8|m[i+4*t+3];for(let t=16;t<64;t++){const s0=r(w[t-15],7)^r(w[t-15],18)^w[t-15]>>>3,s1=r(w[t-2],17)^r(w[t-2],19)^w[t-2]>>>10;w[t]=w[t-16]+s0+w[t-7]+s1|0}
let[a,b2,c2,d,e,f,g,h]=H;for(let t=0;t<64;t++){const t1=h+(r(e,6)^r(e,11)^r(e,25))+(e&f^~e&g)+K[t]+w[t]|0,t2=(r(a,2)^r(a,13)^r(a,22))+(a&b2^a&c2^b2&c2)|0;h=g;g=f;f=e;e=d+t1|0;d=c2;c2=b2;b2=a;a=t1+t2|0}
H[0]=H[0]+a|0;H[1]=H[1]+b2|0;H[2]=H[2]+c2|0;H[3]=H[3]+d|0;H[4]=H[4]+e|0;H[5]=H[5]+f|0;H[6]=H[6]+g|0;H[7]=H[7]+h|0}return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('')}
async function ozet(s) { return sha256hex('exitsatis:' + s); }
const eskiOzet = s => { let h = 5381; for (const c of 'exitsatis:' + s) h = (h * 33 ^ c.charCodeAt(0)) >>> 0; return 'h' + h.toString(16); };
const DURUM = { yeni: ['Yeni talep', 'd-yeni'], onay: ['Onaylandı', 'd-onay'], uretim: ['Üretimde', 'd-uretim'], sevk: ['Sevk edildi', 'd-sevk'], iptal: ['İptal', 'd-iptal'] };
const KATEGORI = Object.fromEntries(VERI.urunler.map(u => [u.ad, u.kategori]));

// ---------- veri katmanı
// Siparişler: müşteri uygulaması aynı tarayıcıdaysa doğrudan okunur; değilse müşterinin indirdiği sipariş dosyaları içe aktarılır.
let SIP = oku('exs-siparisler', {}), MUS = oku('exs-musteriler', {}), ISK = oku('exs-iskonto', {}), KUR = oku('exs-kur', { TRY: null, EUR: null, zaman: null, kaynak: '' });
function birlestir() {
  let yeni = 0;
  oku('exb-siparisler', []).forEach(o => { if (!SIP[o.no]) { SIP[o.no] = { ...o, kaynak: 'portal' }; yeni++; } else if (SIP[o.no].kaynak === 'portal' && !SIP[o.no].satisDurum) SIP[o.no].durum = SIP[o.no].durum; });
  Object.values(oku('exb-kullanicilar', {})).filter(u => u.rol === 'musteri').forEach(u => { MUS[u.kul] = { ...(MUS[u.kul] || {}), kul: u.kul, firma: u.firma, ad: u.ad, tel: u.tel, mail: u.mail, sehir: u.sehir, vergi: u.vergi, tarih: u.tarih }; });
  Object.values(SIP).forEach(o => { if (!MUS[o.kul]) MUS[o.kul] = { kul: o.kul, firma: o.firma, ad: o.ad, tarih: o.tarih }; });
  yaz('exs-siparisler', SIP); yaz('exs-musteriler', MUS); return yeni;
}
function durumYaz(no, d) {
  SIP[no].durum = d; SIP[no].satisDurum = true; yaz('exs-siparisler', SIP);
  // aynı tarayıcıdaki müşteri portalına da yansıt
  const P = oku('exb-siparisler', null); if (P) { const x = P.find(o => o.no === no); if (x) { x.durum = d; yaz('exb-siparisler', P); } }
}
// İskonto: müşteri (firma) iskontosu + siparişe özel ek iskonto, art arda uygulanır.
const musIsk = kul => (ISK[kul] && +ISK[kul].oran) || 0;
function tutarlar(o) {
  const brut = o.kalemler.reduce((a, x) => a + (x.birim || 0) * x.adet, 0);
  const m = o.musIskonto != null ? o.musIskonto : musIsk(o.kul), e = +o.ekIskonto || 0;
  const net = brut * (1 - m / 100) * (1 - e / 100);
  return { brut, m, e, net, iskTutar: brut - net, oran: brut ? (1 - net / brut) * 100 : 0 };
}
const sipList = () => Object.values(SIP).sort((a, b) => b.tarih - a.tarih);

// ---------- kur (USD bazlı, otomatik güncel)
async function kurGuncelle(sessiz) {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json(); if (j.result !== 'success') throw new Error('yanıt');
    KUR = { TRY: j.rates.TRY, EUR: j.rates.EUR, zaman: Date.now(), kaynak: 'open.er-api.com (' + new Date(j.time_last_update_unix * 1000).toLocaleDateString('tr-TR') + ')' };
    yaz('exs-kur', KUR); kurCiz(); if (!sessiz) toast('Kur güncellendi: 1 $ = ' + KUR.TRY.toFixed(4) + ' ₺');
  } catch (e) { kurCiz(true); if (!sessiz) toast('Kur alınamadı (internet bağlantısını kontrol edin). Son bilinen kur kullanılıyor.'); }
}
function kurCiz(hata) {
  $('#kurKutu').innerHTML = KUR.TRY ? `<div style="display:flex;justify-content:space-between"><span>USD/TRY</span><b>${KUR.TRY.toFixed(4)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-top:4px"><span>USD/EUR</span><b>${KUR.EUR.toFixed(4)}</b></div>
    <div style="margin-top:8px;color:#94a3b8">${hata ? '⚠ Güncellenemedi · ' : ''}${KUR.elle ? 'Elle girildi · ' : ''}${new Date(KUR.zaman).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</div>
    <button class="btn kucuk cizgi" id="kurYenile" style="margin-top:8px;width:100%;background:#111827;color:#fff;border-color:#374151">Kuru yenile</button>`
    : `<span>Kur bilgisi yok.</span><button class="btn kucuk" id="kurYenile" style="margin-top:8px;width:100%">Kuru getir</button>`;
  $('#kurYenile').onclick = () => kurGuncelle();
}
const tlYap = n => KUR.TRY ? tl(n * KUR.TRY) : '—';

// ---------- oturum
let KUL = oku('exs-kullanicilar', null), ben = null;
$('#fGiris').onsubmit = async e => {
  e.preventDefault(); const k = $('#gKul').value.trim().toLowerCase(), sf = $('#gSif').value;
  if (!KUL || typeof KUL !== 'object') KUL = {};
  if (!Object.values(KUL).some(x => x && x.sifre)) KUL = { satis: { kul: 'satis', ad: 'Satış Yöneticisi', sifre: await ozet('1234') } };
  const u = KUL[k], h = await ozet(sf);
  if (!u || (u.sifre !== h && u.sifre !== eskiOzet(sf))) return $('#gHata').textContent = 'Kullanıcı adı veya şifre hatalı.';
  if (u.sifre !== h) u.sifre = h; yaz('exs-kullanicilar', KUL);
  $('#gHata').textContent = ''; ben = u; try { sessionStorage.setItem('exs-oturum', k); } catch (e) {}
  try { ac(); } catch (err) { console.error(err); $('#giris').classList.add('gizli'); $('#uyg').classList.remove('gizli'); try { git('siparisler'); } catch (e2) {} }
};
$('#cikis').onclick = () => { try { sessionStorage.removeItem('exs-oturum'); } catch (e) {} location.reload(); };
function ac() {
  $('#giris').classList.add('gizli'); $('#uyg').classList.remove('gizli');
  const y = birlestir(); if (y) toast(y + ' yeni sipariş portaldan alındı.');
  kurCiz(); kurGuncelle(true); setInterval(() => kurGuncelle(true), 30 * 60 * 1000);
  setInterval(() => { if (birlestir()) { yeniSay(); if (aktif === 'siparisler') git('siparisler'); toast('Yeni sipariş geldi.'); } }, 20000);
  try { const ad = ben.ad || ben.kul || 'Satış'; $('#kim').innerHTML = `<div class="av">${ad.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR')}</div><div><b>${ad}</b><span>Satış ekibi · ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>`; } catch (e) {}
  yeniSay(); git('siparisler');
}
function yeniSay() { const n = Object.values(SIP).filter(o => o.durum === 'yeni').length; $('#sYeni').textContent = n; $('#sYeni').classList.toggle('gizli', !n); }
let aktif = '';
function git(s) {
  try { const b = $(`aside button.m[data-s=${s}]`); $('#yol').textContent = 'Satış Yönetimi  /  ' + (b ? [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : ''); } catch (e) {}
  aktif = s; $$('aside button.m[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = '';
  ({ siparisler, musteriler, analiz, ai, ayarlar })[s](); window.scrollTo(0, 0);
}
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
$('#mMenu').onclick = () => $('#menu').classList.add('acik');

// ---------- dosyadan sipariş içe aktar
$('#dosya').onchange = async e => {
  let n = 0, h = 0;
  for (const f of e.target.files) {
    try { const j = JSON.parse(await f.text()); const L = j.tur === 'exit-bayi-siparis' ? [j] : (j.siparisler || []);
      L.forEach(x => { const o = x.siparis; if (!o || !o.no || !Array.isArray(o.kalemler)) throw 0; if (!SIP[o.no]) { SIP[o.no] = { ...o, kaynak: 'dosya' }; n++; } if (x.musteri) MUS[x.musteri.kul] = { ...(MUS[x.musteri.kul] || {}), ...x.musteri }; });
    } catch (er) { h++; }
  }
  yaz('exs-siparisler', SIP); yaz('exs-musteriler', MUS); e.target.value = '';
  toast(`${n} sipariş içe aktarıldı${h ? ', ' + h + ' dosya okunamadı' : ''}.`); yeniSay(); git('siparisler');
};

// ---------- siparişler
const SF = { ara: '', durum: '', mus: '' };

// ---------- kategori / ürün tipi filtresi
const KAT_L = [...new Set(VERI.urunler.map(u => u.kategori))];
const SINIF_L = [...new Set(VERI.urunler.flatMap(u => u.secenek.map(x => x.sinif)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
const kalemKat = x => x.kategori || KATEGORI[x.ad] || 'Diğer';
const kalemUyar = (x, f) => (!f.kat || kalemKat(x) === f.kat) && (!f.sinif || x.sinif === f.sinif);
const AF = { kat: '', sinif: '' };
function katSinifSec(f, idK, idS) {
  const siniflar = f.kat ? SINIF_L.filter(c => VERI.urunler.some(u => u.kategori === f.kat && u.secenek.some(x => x.sinif === c))) : SINIF_L;
  return `<select id="${idK}"><option value="">Tüm kategoriler</option>${KAT_L.map(k => `<option ${f.kat === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
    <select id="${idS}"><option value="">Tüm ürün tipleri</option>${siniflar.map(k => `<option ${f.sinif === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>`;
}
function siparisler() {
  $('#baslik').textContent = 'Siparişler';
  $('#ustSag').innerHTML = `<button class="btn cizgi" id="iceAl">Sipariş dosyası içe aktar</button><button class="btn cizgi" id="csv">Excel'e aktar</button>`;
  $('#iceAl').onclick = () => $('#dosya').click(); $('#csv').onclick = csvAktar;
  const L = sipList().filter(o => (!SF.kat && !SF.sinif || o.kalemler.some(x => kalemUyar(x, SF))) && (!SF.durum || o.durum === SF.durum) && (!SF.mus || o.kul === SF.mus) && (!SF.ara || (o.no + ' ' + o.firma + ' ' + o.kalemler.map(x => x.ad).join(' ')).toLocaleLowerCase('tr').includes(SF.ara.toLocaleLowerCase('tr'))));
  const T = sipList().filter(o => o.durum !== 'iptal').map(tutarlar);
  $('#icerik').innerHTML = `<div class="kpi">
      <div><span>Yeni talep</span><b>${Object.values(SIP).filter(o => o.durum === 'yeni').length}</b><small>onay bekliyor</small></div>
      <div><span>Toplam net satış</span><b>${usd(T.reduce((a, t) => a + t.net, 0))}</b><small>${tlYap(T.reduce((a, t) => a + t.net, 0))}</small></div>
      <div><span>Verilen iskonto</span><b>${usd(T.reduce((a, t) => a + t.iskTutar, 0))}</b><small>ortalama ${yuzde(T.length ? T.reduce((a, t) => a + t.oran, 0) / T.length : 0)}</small></div>
      <div><span>Sipariş sayısı</span><b>${Object.keys(SIP).length}</b><small>${Object.keys(MUS).length} müşteri</small></div></div>
    <div class="kart"><div class="filtreler"><input id="sAra" placeholder="No, firma veya ürün ara" value="${esc(SF.ara)}">
      ${katSinifSec(SF, 'sKat', 'sSin')}
      <select id="sDur"><option value="">Tüm durumlar</option>${Object.entries(DURUM).map(([k, v]) => `<option value="${k}" ${SF.durum === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <select id="sMus"><option value="">Tüm müşteriler</option>${Object.values(MUS).sort((a, b) => (a.firma || '').localeCompare(b.firma || '', 'tr')).map(m => `<option value="${esc(m.kul)}" ${SF.mus === m.kul ? 'selected' : ''}>${esc(m.firma)}</option>`).join('')}</select></div>
    ${L.length ? `<table class="tablo"><tr><th>No</th><th>Tarih</th><th>Müşteri</th><th>Kalem</th><th class="sag-hiza">Brüt</th><th class="sag-hiza">İskonto</th><th class="sag-hiza">Net</th><th class="sag-hiza">Net (₺)</th><th>Durum</th></tr>
      ${L.map(o => { const t = tutarlar(o); return `<tr class="tik" data-no="${o.no}"><td><b>${o.no}</b>${o.ornek ? ' <span class="rozet">örnek</span>' : ''}</td><td>${tarih(o.tarih)}</td><td>${esc(o.firma)}<div class="kucuk">${esc(o.ad)}</div></td>
        <td>${o.kalemler.reduce((a, x) => a + x.adet, 0)} adet<div class="kucuk">${esc(o.kalemler.slice(0, 2).map(x => x.ad).join(', '))}${o.kalemler.length > 2 ? '…' : ''}</div></td>
        <td class="sag-hiza">${usd(t.brut)}</td><td class="sag-hiza">${t.oran ? yuzde(t.oran) : '—'}</td><td class="sag-hiza"><b>${usd(t.net)}</b></td><td class="sag-hiza">${tlYap(t.net)}</td>
        <td><span class="durum ${DURUM[o.durum][1]}">${DURUM[o.durum][0]}</span></td></tr>`; }).join('')}</table>`
      : `<div class="bos">Sipariş yok. Müşteri portalından gelen siparişler burada görünür; başka bilgisayardan gelen sipariş dosyalarını <b>Sipariş dosyası içe aktar</b> ile ekleyin.${Object.keys(SIP).length ? '' : '<br><br>Paneli denemek için Ayarlar\'dan örnek veri oluşturabilirsiniz.'}</div>`}</div>`;
  $('#sAra').oninput = e => { SF.ara = e.target.value; clearTimeout(window._sa); window._sa = setTimeout(() => { siparisler(); const i = $('#sAra'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $('#sDur').onchange = e => { SF.durum = e.target.value; siparisler(); };
  $('#sKat').onchange = e => { SF.kat = e.target.value; SF.sinif = ''; siparisler(); };
  $('#sSin').onchange = e => { SF.sinif = e.target.value; siparisler(); };
  $('#sMus').onchange = e => { SF.mus = e.target.value; siparisler(); };
  $$('tr[data-no]').forEach(r => r.onclick = () => siparisAc(r.dataset.no));
}
function siparisAc(no) {
  const o = SIP[no]; const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) p.remove(); }; document.body.appendChild(p);
  function ciz() {
    const t = tutarlar(o), m = MUS[o.kul] || {};
    p.innerHTML = `<div class="pencere"><button class="kapat">×</button><h2 style="margin:0">${o.no} <span class="durum ${DURUM[o.durum][1]}">${DURUM[o.durum][0]}</span></h2>
      <div class="kucuk">${tarih(o.tarih)} · ${esc(o.firma)} · ${esc(o.ad)}${m.tel ? ' · ' + esc(m.tel) : ''}${m.mail ? ' · ' + esc(m.mail) : ''}</div>
      ${o.adres ? `<div class="kucuk" style="margin-top:4px">Adres / not: ${esc(o.adres)}</div>` : ''}
      <table class="tablo" style="margin-top:14px"><tr><th>Ürün</th><th>Seçimler</th><th class="sag-hiza">Adet</th><th class="sag-hiza">Birim</th><th class="sag-hiza">Tutar</th></tr>
      ${o.kalemler.map(x => `<tr><td><b>${esc(x.ad)}</b><div class="kucuk">${esc(x.kategori || '')}</div></td><td class="kucuk" style="color:var(--yazi2)">${[x.secenek, x.iskelet && 'İskelet: ' + x.iskelet, x.file && 'File: ' + x.file, x.kumas && 'Kumaş: ' + x.kumas, x.fitil && 'Fitil: ' + x.fitil, x.not && 'Not: ' + x.not, x.kampanya && 'Kampanya: ' + x.kampanya + (x.liste ? ' · liste ' + usd(x.liste) : '')].filter(Boolean).map(esc).join('<br>')}</td>
        <td class="sag-hiza">${x.adet}</td><td class="sag-hiza">${x.birim == null ? '<span class="rozet">Teklif</span>' : usd(x.birim)}</td><td class="sag-hiza">${x.birim == null ? '—' : usd(x.birim * x.adet)}</td></tr>`).join('')}</table>
      <div class="hesap"><div><span>Brüt</span><b>${usd(t.brut)}</b></div><div><span>İskonto (${yuzde(t.oran)})</span><b>−${usd(t.iskTutar)}</b></div><div><span>Net (USD)</span><b>${usd(t.net)}</b></div><div><span>Net (TL / EUR)</span><b>${tlYap(t.net)}</b><span>${KUR.EUR ? eur(t.net * KUR.EUR) : ''}</span></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:end">
        <div class="alan"><label>Müşteri iskontosu %</label><input id="pM" inputmode="decimal" value="${t.m}"><span class="kucuk">Varsayılan: firma iskontosu ${yuzde(musIsk(o.kul))}</span></div>
        <div class="alan"><label>Bu siparişe ek iskonto %</label><input id="pE" inputmode="decimal" value="${t.e}"></div>
        <div class="alan"><label>Durum</label><select id="pD">${Object.entries(DURUM).map(([k, v]) => `<option value="${k}" ${o.durum === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
        <div class="alan"><button class="btn marka tam" id="pK">Kaydet</button></div></div>
      ${o.kalemler.some(x => x.birim == null) ? '<p class="kucuk">Fiyatı olmayan kalemler “Teklif” olarak geldi; tutara dahil değildir.</p>' : ''}
      <button class="btn cizgi" id="pTeklif">Fiyat teklifi yazdır</button></div>`;
    p.querySelector('.kapat').onclick = () => p.remove();
    const say = v => Math.min(100, Math.max(0, parseFloat(String(v).replace(',', '.')) || 0));
    p.querySelector('#pK').onclick = () => { o.musIskonto = say(p.querySelector('#pM').value); o.ekIskonto = say(p.querySelector('#pE').value); yaz('exs-siparisler', SIP); durumYaz(o.no, p.querySelector('#pD').value); yeniSay(); toast('Sipariş güncellendi.'); ciz(); siparisler(); };
    p.querySelector('#pTeklif').onclick = () => teklifYazdir(o);
  }
  ciz();
}
function teklifYazdir(o) {
  const t = tutarlar(o), w = window.open('', '_blank'); if (!w) return toast('Açılır pencere engellendi.');
  w.document.write(`<html><head><meta charset="utf-8"><title>${o.no} Teklif</title><style>body{font-family:Inter,Segoe UI,sans-serif;padding:32px;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left;font-size:13px}.r{text-align:right}.logo-ink{fill:#1f2937}.logo-ink-soft{fill:#475569}svg{height:40px;width:auto}.lg{display:flex;gap:14px;align-items:center}.logo-sep{width:1px;height:36px;background:#ccc}</style></head><body>
    <div class="lg">${document.querySelector('#giris .logolar').innerHTML}</div><h2>Fiyat Teklifi · ${o.no}</h2><div>${esc(o.firma)} · ${esc(o.ad)} · ${tarih(Date.now())}</div>
    <table><tr><th>Ürün</th><th>Seçimler</th><th class="r">Adet</th><th class="r">Birim</th><th class="r">Tutar</th></tr>${o.kalemler.map(x => `<tr><td>${esc(x.ad)}</td><td>${[x.secenek, x.iskelet, x.file, x.kumas && 'Kumaş ' + x.kumas, x.fitil && 'Fitil ' + x.fitil].filter(Boolean).map(esc).join(' · ')}</td><td class="r">${x.adet}</td><td class="r">${x.birim == null ? 'Teklif' : usd(x.birim)}</td><td class="r">${x.birim == null ? '' : usd(x.birim * x.adet)}</td></tr>`).join('')}
    <tr><td colspan="4" class="r">Brüt</td><td class="r">${usd(t.brut)}</td></tr><tr><td colspan="4" class="r">İskonto ${yuzde(t.oran)}</td><td class="r">−${usd(t.iskTutar)}</td></tr><tr><th colspan="4" class="r">Net (KDV hariç)</th><th class="r">${usd(t.net)}</th></tr>
    ${KUR.TRY ? `<tr><td colspan="4" class="r">TL karşılığı (1 $ = ${KUR.TRY.toFixed(4)} ₺)</td><td class="r">${tl(t.net * KUR.TRY)}</td></tr>` : ''}</table>
    <p style="font-size:12px;color:#666">Fiyatlar USD ve KDV hariçtir. TL karşılığı bilgi amaçlıdır; fatura tarihindeki kur geçerlidir.</p><script>print()<\/script></body></html>`);
  w.document.close();
}
function csvAktar() {
  const R = [['Sipariş No', 'Tarih', 'Firma', 'Yetkili', 'Ürün', 'Kategori', 'Seçenek', 'İskelet', 'File', 'Kumaş', 'Fitil', 'Adet', 'Birim $', 'Brüt $', 'İskonto %', 'Net $', 'Net ₺', 'Durum']];
  sipList().forEach(o => { const t = tutarlar(o); o.kalemler.forEach(x => { const b = (x.birim || 0) * x.adet, n = b * (1 - t.oran / 100); R.push([o.no, tarih(o.tarih), o.firma, o.ad, x.ad, x.kategori, x.secenek, x.iskelet, x.file, x.kumas, x.fitil, x.adet, x.birim ?? '', b, t.oran.toFixed(1), n.toFixed(2), KUR.TRY ? (n * KUR.TRY).toFixed(2) : '', DURUM[o.durum][0]]); }); });
  const csv = '﻿' + R.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'exit_satislar.csv'; a.click();
}

// ---------- müşteriler ve iskonto
function musteriler() {
  $('#baslik').textContent = 'Müşteriler ve iskonto';
  const L = Object.values(MUS).map(m => { const S = Object.values(SIP).filter(o => o.kul === m.kul && o.durum !== 'iptal'); return { ...m, adet: S.length, net: S.reduce((a, o) => a + tutarlar(o).net, 0), son: Math.max(0, ...S.map(o => o.tarih)) }; }).sort((a, b) => b.net - a.net);
  $('#icerik').innerHTML = `<div class="kart"><h3>Firma / kişi bazında iskonto</h3><div class="alt">Buraya girilen oran, o müşterinin bütün siparişlerine varsayılan olarak uygulanır. Siparişe özel ek iskonto sipariş penceresinden verilir.</div>
    ${L.length ? `<table class="tablo"><tr><th>Müşteri</th><th>İletişim</th><th class="sag-hiza">Sipariş</th><th class="sag-hiza">Net satış</th><th>Son sipariş</th><th>İskonto %</th><th>Not</th></tr>
    ${L.map(m => `<tr><td><b>${esc(m.firma)}</b><div class="kucuk">${esc(m.ad)} · ${esc(m.kul)}</div></td><td class="kucuk" style="color:var(--yazi2)">${esc(m.tel || '')}<br>${esc(m.mail || '')}${m.sehir ? ' · ' + esc(m.sehir) : ''}</td>
      <td class="sag-hiza">${m.adet}</td><td class="sag-hiza"><b>${usd(m.net)}</b><div class="kucuk">${tlYap(m.net)}</div></td><td>${m.son ? tarih(m.son) : '—'}</td>
      <td><input data-isk="${esc(m.kul)}" value="${musIsk(m.kul) || ''}" placeholder="0" inputmode="decimal" style="width:70px;padding:7px;border:1px solid var(--cizgi);border-radius:8px"></td>
      <td><input data-not="${esc(m.kul)}" value="${esc((ISK[m.kul] || {}).not || '')}" placeholder="ör. bayi, proje" style="width:140px;padding:7px;border:1px solid var(--cizgi);border-radius:8px"></td></tr>`).join('')}</table>` : '<div class="bos">Henüz müşteri yok.</div>'}</div>`;
  const kaydet = kul => { const o = $(`[data-isk="${CSS.escape(kul)}"]`).value, n = $(`[data-not="${CSS.escape(kul)}"]`).value; const v = Math.min(100, Math.max(0, parseFloat(o.replace(',', '.')) || 0)); ISK[kul] = { oran: v, not: n }; yaz('exs-iskonto', ISK); toast('İskonto kaydedildi: ' + yuzde(v)); };
  $$('[data-isk]').forEach(i => i.onchange = () => kaydet(i.dataset.isk)); $$('[data-not]').forEach(i => i.onchange = () => kaydet(i.dataset.not));
}

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

// ---------- yapay zekâ: SWOT ve öneriler
// Yerel motor her zaman çalışır (verilerden kural tabanlı çıkarım). Ayarlar'a Claude API anahtarı girilirse aynı veriler Claude'a gönderilip daha derin yorum alınır.
function yerelSwot(s) {
  const G = [], Z = [], F = [], T = [], O = [];
  const k1 = s.kat[0], u1 = s.urun[0], i1 = s.isk[0];
  if (k1) G.push(`${k1[0]} en güçlü kategori: net satışın ${yuzde(k1[1] / (s.net || 1) * 100)}'i.`);
  if (u1) G.push(`${u1[0]} en çok satan ürün (${u1[1]} adet).`);
  if (s.buyume != null && s.buyume > 5) G.push(`Son 3 ayda satışlar önceki döneme göre ${yuzde(s.buyume)} arttı.`);
  if (s.ortSepet > 3000) G.push(`Ortalama sipariş büyüklüğü yüksek (${usd(s.ortSepet)}); müşteriler set halinde alıyor.`);
  if (s.iskOran < 8 && s.siparis) G.push(`İskonto disiplini iyi: ortalama ${yuzde(s.iskOran)}.`);
  if (s.ilk3Pay > 50) Z.push(`Satışın ${yuzde(s.ilk3Pay)}'i ilk 3 müşteriden geliyor; müşteri yoğunlaşması riski var.`);
  if (s.iskOran >= 12) Z.push(`Ortalama iskonto yüksek (${yuzde(s.iskOran)}); kârlılığı aşındırıyor.`);
  if (s.buyume != null && s.buyume < -5) Z.push(`Son 3 ayda satışlar ${yuzde(Math.abs(s.buyume))} düştü.`);
  if (s.bekleyen > 3) Z.push(`${s.bekleyen} sipariş talebi onay bekliyor; yanıt süresi müşteri memnuniyetini etkiler.`);
  if (s.toplamSip && s.iptal / s.toplamSip > .1) Z.push(`İptal oranı ${yuzde(s.iptal / s.toplamSip * 100)}.`);
  if (s.satilmayan.length > 10) Z.push(`${s.satilmayan.length} ürün hiç satılmadı (ör. ${s.satilmayan.slice(0, 3).join(', ')}).`);
  const zayifKat = s.kat.length > 2 ? s.kat[s.kat.length - 1] : null;
  if (zayifKat) F.push(`${zayifKat[0]} kategorisi az satıyor; oturma grubu ve masa siparişlerine çapraz satışla büyütülebilir.`);
  if (s.teklifKalem) F.push(`${s.teklifKalem} kalem fiyatsız “teklif” olarak geldi; bu ürünlere liste fiyatı eklemek satışı hızlandırır.`);
  if (i1) F.push(`${i1[0]} iskelet rengi en çok tercih edilen renk; stok ve boya planlaması buna göre önceden yapılabilir.`);
  F.push('Sezon öncesi (şubat–nisan) bayilere erken sipariş iskontosu verilerek üretim yükü yayılabilir.');
  if (s.aktifMus < s.musteri) F.push(`${s.musteri - s.aktifMus} kayıtlı müşteri henüz sipariş vermedi; aranarak aktive edilebilir.`);
  T.push('Dış mekân mobilyası sezonluk bir ürün; kış aylarında talep düşer.');
  if (KUR.TRY) T.push(`Fiyatlar USD; kur ${KUR.TRY.toFixed(2)} ₺ seviyesinde, kur artışı TL ile alan müşterinin talebini kısabilir.`);
  T.push('Hammadde (alüminyum, kumaş) fiyatlarındaki artış liste fiyatlarının güncellenmesini gerektirebilir.');
  if (s.ilk3Pay > 50) O.push(['Müşteri tabanını genişletin', `İlk 3 müşterinin payı ${yuzde(s.ilk3Pay)}. Sipariş vermeyen kayıtlı müşterilere ve yeni bölgelere odaklanın.`]);
  if (s.iskOran >= 10) O.push(['İskonto politikasını standartlaştırın', 'Ciroya bağlı kademeli iskonto (ör. 10.000 $ üzeri %5, 25.000 $ üzeri %8) tanımlayıp siparişe özel ek iskontoyu sınırlayın.']);
  if (k1 && zayifKat) O.push(['Set ve çapraz satış önerin', `${k1[0]} alan müşterilere ${zayifKat[0]} ile paket fiyat sunun; aile paketleri bunun için hazır.`]);
  if (s.bekleyen) O.push(['Talepleri hızlı onaylayın', `${s.bekleyen} talep bekliyor. 24 saat içinde dönüş hedefi koyun.`]);
  if (i1) O.push(['Popüler renklerde stoklu üretim', `${i1[0]} iskelet ve en çok seçilen kumaşlarla hızlı teslim stoku tutun.`]);
  if (s.satilmayan.length) O.push(['Satmayan ürünleri gözden geçirin', `Hiç satılmayan ${s.satilmayan.length} ürün için kampanya, fotoğraf ve açıklama iyileştirmesi ya da katalogdan çıkarma değerlendirin.`]);
  O.push(['Kur riskini yönetin', 'Teklif geçerlilik süresi (ör. 7 gün) yazın ve TL ödemelerde fatura günü kurunu esas alın.']);
  return { G, Z, F, T, O };
}
async function claudeSwot(s) {
  const anahtar = oku('exs-ai-anahtar', '');
  const ozetVeri = { donem: 'son 12 ay', net_satis_usd: Math.round(s.net), siparis: s.siparis, ortalama_sepet_usd: Math.round(s.ortSepet), ortalama_iskonto_yuzde: +s.iskOran.toFixed(1),
    son3ay_vs_onceki3ay_yuzde: s.buyume == null ? null : +s.buyume.toFixed(1), aylik_net: s.aylar.map(a => [a.ad + ' ' + a.yil, Math.round(a.net)]),
    kategori: s.kat.map(([k, v]) => [k, Math.round(v)]), en_iyi_musteriler_payi_ilk3_yuzde: +s.ilk3Pay.toFixed(1), urun_adet: s.urun.slice(0, 15), urun_tipi_adet: s.sinif,
    iskelet_rengi: s.isk, kumas: s.kum, file: s.fil, bekleyen_talep: s.bekleyen, iptal: s.iptal, kayitli_musteri: s.musteri, aktif_musteri: s.aktifMus, hic_satilmayan_urun_sayisi: s.satilmayan.length, usd_try: KUR.TRY };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': anahtar, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    body: JSON.stringify({ model: 'claude-opus-5-5', max_tokens: 16000, fallbacks: 'default', output_config: { effort: 'medium' },
      system: 'Bir dış mekân mobilya üreticisinin (EXIT Garden, Türkiye) satış müdürüne danışmanlık yapıyorsun. Bayilere USD fiyatla satış yapılıyor. Verilen satış özetine dayanarak Türkçe, somut ve verilere atıf yapan bir SWOT analizi ve uygulanabilir öneriler üret. Veride olmayan şeyi kesin bilgi gibi yazma. Yanıtı yalnızca şu JSON biçiminde ver: {"guclu":[...],"zayif":[...],"firsat":[...],"tehdit":[...],"oneriler":[{"baslik":"...","aciklama":"..."}]}',
      messages: [{ role: 'user', content: 'Satış verisi özeti:\n' + JSON.stringify(ozetVeri) }] })
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
  if (j.stop_reason === 'refusal') throw new Error('Model bu isteği yanıtlamadı.');
  const metin = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const m = metin.match(/\{[\s\S]*\}/); if (!m) throw new Error('Yanıt okunamadı.');
  const x = JSON.parse(m[0]);
  return { G: x.guclu || [], Z: x.zayif || [], F: x.firsat || [], T: x.tehdit || [], O: (x.oneriler || []).map(o => [o.baslik, o.aciklama]) };
}
function swotCiz(r, kaynak) {
  const li = L => L.map(x => `<li>${esc(x)}</li>`).join('') || '<li>—</li>';
  return `<div class="ai-durum" style="margin-bottom:10px"><span class="nokta on"></span>${esc(kaynak)} · ${new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</div>
    <div class="swot"><div class="s-g"><h4><i>S</i>Güçlü yönler</h4><ul>${li(r.G)}</ul></div><div class="s-z"><h4><i>W</i>Zayıf yönler</h4><ul>${li(r.Z)}</ul></div>
      <div class="s-f"><h4><i>O</i>Fırsatlar</h4><ul>${li(r.F)}</ul></div><div class="s-t"><h4><i>T</i>Tehditler</h4><ul>${li(r.T)}</ul></div></div>
    <div class="kart" style="margin-top:16px"><h3>Öneriler</h3><div class="alt">Öncelik sırasıyla</div>${r.O.map(([b, a], i) => `<div class="oneri"><span class="no">${i + 1}</span><div><b>${esc(b)}</b><span class="kucuk" style="color:var(--yazi2)">${esc(a)}</span></div></div>`).join('')}</div>`;
}
function ai() {
  $('#baslik').textContent = 'Yapay zekâ: SWOT ve öneriler';
  const s = istatistik(), anahtar = oku('exs-ai-anahtar', '');
  $('#ustSag').innerHTML = `<button class="btn marka" id="aiBtn" ${anahtar ? '' : 'title="Ayarlar\'dan Claude API anahtarı girin"'}>Claude ile derin analiz</button>`;
  $('#icerik').innerHTML = (s.siparis ? '' : '<div class="kart kucuk">Henüz sipariş verisi yok; analiz verisiz yapılırsa genel kalır. Ayarlar\'dan örnek veri oluşturabilirsiniz.</div>') + `<div id="swot">${swotCiz(yerelSwot(s), 'Yerel analiz motoru (satış verilerinden otomatik)')}</div>`;
  const kayitli = oku('exs-ai-son', null); if (kayitli) $('#swot').insertAdjacentHTML('afterbegin', '<div class="kucuk" style="margin-bottom:8px">Son Claude analizi aşağıda; yenilemek için düğmeye basın.</div>' + swotCiz(kayitli.r, 'Claude analizi (' + kayitli.zaman + ')') + '<hr style="margin:24px 0;border:0;border-top:1px solid var(--cizgi)">');
  $('#aiBtn').onclick = async () => {
    if (!anahtar) { toast('Önce Ayarlar\'dan Claude API anahtarı girin.'); return git('ayarlar'); }
    const b = $('#aiBtn'); b.disabled = true; b.textContent = 'Claude analiz ediyor…';
    try { const r = await claudeSwot(s); yaz('exs-ai-son', { r, zaman: new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) }); $('#swot').innerHTML = swotCiz(r, 'Claude analizi'); }
    catch (e) { toast('Claude analizi yapılamadı: ' + e.message); }
    b.disabled = false; b.textContent = 'Claude ile derin analiz';
  };
}

// ---------- ayarlar
function ayarlar() {
  $('#baslik').textContent = 'Ayarlar';
  $('#icerik').innerHTML = `<div class="izgara2">
    <div class="kart"><h3>Kur</h3><div class="alt">Kur her açılışta ve 30 dakikada bir internetten otomatik güncellenir. İnternet yoksa elle girebilirsiniz.</div>
      <div style="display:flex;gap:8px;align-items:end"><div class="alan" style="flex:1"><label>1 USD = ? TL</label><input id="aTry" inputmode="decimal" value="${KUR.TRY ? KUR.TRY.toFixed(4) : ''}"></div><div class="alan" style="flex:1"><label>1 USD = ? EUR</label><input id="aEur" inputmode="decimal" value="${KUR.EUR ? KUR.EUR.toFixed(4) : ''}"></div></div>
      <button class="btn cizgi" id="aKurElle">Elle kaydet</button> <button class="btn" id="aKurOto">İnternetten güncelle</button><p class="kucuk">Kaynak: ${esc(KUR.kaynak || '—')}</p></div>
    <div class="kart"><h3>Claude API anahtarı</h3><div class="alt">“Claude ile derin analiz” için gerekir. Anahtar yalnız bu bilgisayarda saklanır; analizde sadece toplu satış özeti (müşteri iletişim bilgisi olmadan) gönderilir.</div>
      <div class="alan"><label>API anahtarı</label><input id="aKey" type="password" placeholder="sk-ant-…" value="${esc(oku('exs-ai-anahtar', ''))}"></div><button class="btn" id="aKeyK">Kaydet</button> <button class="btn cizgi" id="aKeyS">Sil</button></div>
    <div class="kart"><h3>Satış ekibi kullanıcıları</h3><div class="alt">Panele giriş yapabilecek kişiler</div>
      <table class="tablo">${Object.values(KUL).map(u => `<tr><td><b>${esc(u.kul)}</b><div class="kucuk">${esc(u.ad)}</div></td><td class="sag-hiza">${u.kul !== ben.kul ? `<button class="btn kucuk cizgi" data-sil="${esc(u.kul)}">Sil</button>` : '<span class="kucuk">siz</span>'}</td></tr>`).join('')}</table>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;margin-top:12px"><div class="alan"><label>Kullanıcı</label><input id="yKul"></div><div class="alan"><label>Ad soyad</label><input id="yAd"></div><div class="alan"><label>Şifre</label><input id="ySif" type="password"></div><div class="alan"><button class="btn" id="yEkle">Ekle</button></div></div>
      <div style="display:flex;gap:8px;align-items:end;margin-top:6px"><div class="alan" style="flex:1"><label>Kendi yeni şifreniz</label><input id="kSif" type="password"></div><div class="alan"><button class="btn cizgi" id="kSifK">Şifremi değiştir</button></div></div></div>
    <div class="kart"><h3>Veri</h3><div class="alt">Paneli denemek için 12 aya yayılmış örnek siparişler oluşturabilirsiniz; örnekler “örnek” etiketiyle görünür ve tek tuşla silinir.</div>
      <button class="btn cizgi" id="ornekOl">Örnek veri oluştur</button> <button class="btn cizgi" id="ornekSil">Örnek veriyi sil</button>
      <p class="kucuk">Gerçek siparişler: ${Object.values(SIP).filter(o => !o.ornek).length} · Örnek: ${Object.values(SIP).filter(o => o.ornek).length}</p></div></div>`;
  const sayi = v => parseFloat(String(v).replace(',', '.'));
  $('#aKurElle').onclick = () => { const t = sayi($('#aTry').value), e = sayi($('#aEur').value); if (!(t > 0)) return toast('Geçerli bir TL kuru girin.'); KUR = { TRY: t, EUR: e > 0 ? e : KUR.EUR, zaman: Date.now(), kaynak: 'Elle giriş', elle: true }; yaz('exs-kur', KUR); kurCiz(); toast('Kur kaydedildi.'); };
  $('#aKurOto').onclick = () => kurGuncelle().then(ayarlar);
  $('#aKeyK').onclick = () => { yaz('exs-ai-anahtar', $('#aKey').value.trim()); toast('Anahtar kaydedildi.'); };
  $('#aKeyS').onclick = () => { try { localStorage.removeItem('exs-ai-anahtar'); } catch (e) {} ayarlar(); toast('Anahtar silindi.'); };
  $('#yEkle').onclick = async () => { const k = $('#yKul').value.trim().toLowerCase(); if (!/^[a-z0-9._-]{3,}$/.test(k) || $('#ySif').value.length < 6) return toast('Kullanıcı adı en az 3, şifre en az 6 karakter olmalı.'); if (KUL[k]) return toast('Bu kullanıcı var.'); KUL[k] = { kul: k, ad: $('#yAd').value.trim(), sifre: await ozet($('#ySif').value) }; yaz('exs-kullanicilar', KUL); ayarlar(); toast('Kullanıcı eklendi.'); };
  $$('[data-sil]').forEach(b => b.onclick = () => { delete KUL[b.dataset.sil]; yaz('exs-kullanicilar', KUL); ayarlar(); });
  $('#kSifK').onclick = async () => { if ($('#kSif').value.length < 6) return toast('Şifre en az 6 karakter olmalı.'); KUL[ben.kul].sifre = await ozet($('#kSif').value); yaz('exs-kullanicilar', KUL); toast('Şifreniz değişti.'); $('#kSif').value = ''; };
  $('#ornekOl').onclick = () => { ornekVeri(); ayarlar(); toast('Örnek veri oluşturuldu.'); };
  $('#ornekSil').onclick = () => { Object.keys(CARI).forEach(k => { if (k.startsWith('ornek-')) delete CARI[k]; }); cariYaz(); Object.keys(CRM).forEach(k => { if (k.startsWith('ornek-')) delete CRM[k]; }); yaz('exs-crm', CRM); Object.keys(SIP).forEach(k => { if (SIP[k].ornek) delete SIP[k]; }); Object.keys(MUS).forEach(k => { if (MUS[k].ornek) delete MUS[k]; }); yaz('exs-siparisler', SIP); yaz('exs-musteriler', MUS); yeniSay(); ayarlar(); toast('Örnek veri silindi.'); };
}
function ornekVeri() {
  let t = 7; const r = () => (t = (t * 9301 + 49297) % 233280) / 233280;
  const firmalar = [['ornek-ege', 'Ege Bahçe Mobilya', 'İzmir', 8], ['ornek-akdeniz', 'Akdeniz Otel Tedarik', 'Antalya', 12], ['ornek-bosfor', 'Boğaz Peyzaj', 'İstanbul', 5], ['ornek-kapadokya', 'Kapadokya Butik', 'Nevşehir', 0], ['ornek-bodrum', 'Bodrum Marina Dekor', 'Muğla', 10], ['ornek-ankara', 'Başkent Proje', 'Ankara', 3]];
  firmalar.forEach(([k, f, s, i]) => { MUS[k] = { kul: k, firma: f, ad: 'Örnek Yetkili', sehir: s, tel: '0 (5xx) xxx xx xx', ornek: true, tarih: Date.now() }; if (i && !ISK[k]) ISK[k] = { oran: i, not: 'örnek' }; });
  const fiyatli = VERI.urunler.filter(u => u.secenek.some(s => s.fiyat)); const ISKL = ['Antrasit (RAL 7016)', 'Beyaz (RAL 9016)', 'Cappuccino (RAL 7006)', 'Siyah (RAL 9005)', 'Krem (RAL 1013)', 'Granit (Granit)'], KUM = ['BG03', 'BG06', 'BG09', 'BG07', 'BG14', 'BG16'];
  const simdi = new Date(); let sira = 1;
  for (let i = 0; i < 70; i++) {
    const ay = Math.floor(r() * 12), mev = [0.4, 0.5, 0.9, 1.4, 1.6, 1.5, 1.2, 0.9, 0.7, 0.5, 0.4, 0.4][(simdi.getMonth() - ay + 12) % 12];
    if (r() > mev) continue;
    const d = new Date(simdi.getFullYear(), simdi.getMonth() - ay, 1 + Math.floor(r() * 27)), fm = firmalar[Math.floor(Math.pow(r(), 1.6) * firmalar.length)];
    const kalemler = []; const n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) { const u = fiyatli[Math.floor(r() * fiyatli.length)], s = u.secenek.filter(x => x.fiyat)[Math.floor(r() * u.secenek.filter(x => x.fiyat).length)];
      const kum = /Oturma|Aile/.test(u.kategori) || /ped/i.test(s.ad);
      kalemler.push({ id: u.id, ad: u.ad, kategori: u.kategori, secenek: s.ad, sinif: s.sinif, birim: s.fiyat, adet: /Sandalye/.test(u.kategori) ? 6 + Math.floor(r() * 30) : 1 + Math.floor(r() * 8), iskelet: ISKL[Math.floor(Math.pow(r(), 1.8) * ISKL.length)], file: /file/i.test(s.ad) ? 'Antrasit (Terra 04)' : '', kumas: kum ? KUM[Math.floor(r() * 6)] : '', fitil: kum ? KUM[Math.floor(r() * 6)] : '', not: '' }); }
    const no = 'ORN-' + d.getFullYear() + '-' + String(sira++).padStart(4, '0');
    SIP[no] = { no, kul: fm[0], firma: fm[1], ad: 'Örnek Yetkili', tarih: d.getTime(), kalemler, toplam: kalemler.reduce((a, x) => a + x.birim * x.adet, 0), adres: fm[2], durum: ay > 1 ? (r() < .08 ? 'iptal' : 'sevk') : ['yeni', 'onay', 'uretim'][Math.floor(r() * 3)], ekIskonto: r() < .2 ? 3 : 0, ornek: true, kaynak: 'ornek' };
  }
  yaz('exs-siparisler', SIP); yaz('exs-musteriler', MUS); yaz('exs-iskonto', ISK); yeniSay();
}

// ---------- başlangıç
(async () => {
  if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r));
  if (!KUL) { KUL = { satis: { kul: 'satis', ad: 'Satış Yöneticisi', sifre: await ozet('1234') } }; yaz('exs-kullanicilar', KUL); }
  let o = null; try { o = sessionStorage.getItem('exs-oturum'); } catch (e) {}
  if (o && KUL[o]) { ben = KUL[o]; try { ac(); } catch (err) { console.error(err); $('#giris').classList.add('gizli'); $('#uyg').classList.remove('gizli'); } }
})();

// ===== v2.1: sipariş takibi, cari hesap, müşteri kartı, satış tahmini, raporlar =====
let CARI = oku('exs-cari', {}), CRM = oku('exs-crm', {});
const GUN = 864e5, VADE_VARS = 60;
const cariYaz = () => { yaz('exs-cari', CARI); yaz('exb-cari', CARI); };
const cariHesap = kul => (CARI[kul] = CARI[kul] || { vade: VADE_VARS, hareket: [] });
// Bakiye ve vadesi geçmiş tutar: ödemeler en eski faturadan başlayarak kapatılır.
function cariOzet(kul) {
  const c = CARI[kul] || { vade: VADE_VARS, hareket: [] }, F = c.hareket.filter(h => h.tip === 'fatura').sort((a, b) => a.tarih - b.tarih);
  const borc = F.reduce((a, h) => a + h.tutar, 0), odeme = c.hareket.filter(h => h.tip === 'odeme').reduce((a, h) => a + h.tutar, 0);
  let kalan = odeme, gecmis = 0, enEski = null; const simdi = Date.now();
  F.forEach(f => { const ac = Math.max(0, f.tutar - kalan); kalan = Math.max(0, kalan - f.tutar); if (ac > 0.5 && f.vade < simdi) { gecmis += ac; if (!enEski) enEski = f.vade; } });
  return { borc, odeme, bakiye: borc - odeme, gecmis, gecikmeGun: enEski ? Math.floor((simdi - enEski) / GUN) : 0, vade: c.vade };
}
function faturaKes(o) {
  const c = cariHesap(o.kul); if (c.hareket.some(h => h.tip === 'fatura' && h.sip === o.no)) return;
  const t = Date.now(); c.hareket.push({ tip: 'fatura', no: 'FT-' + o.no, sip: o.no, tarih: t, vade: t + (c.vade || VADE_VARS) * GUN, tutar: Math.round(tutarlar(o).net * 100) / 100, aciklama: o.no + ' sevkiyatı' });
  cariYaz();
}
// Siparişin müşterinin göreceği alanlarını aynı tarayıcıdaki bayi portalına yansıt
function portalaYansit(o) {
  const P = oku('exb-siparisler', null); if (!P) return; const x = P.find(y => y.no === o.no); if (!x) return;
  Object.assign(x, { durum: o.durum, termin: o.termin || '', kargo: o.kargo || '', takip: o.takip || '', gecmis: o.gecmis || [], net: Math.round(tutarlar(o).net * 100) / 100, satisNot: o.satisNot || '' });
  yaz('exb-siparisler', P);
}
const _durumYaz = durumYaz;
durumYaz = function (no, d) {
  const o = SIP[no]; o.gecmis = o.gecmis || [{ durum: 'yeni', zaman: o.tarih }];
  if (o.durum !== d || !o.gecmis.length) o.gecmis.push({ durum: d, zaman: Date.now() });
  _durumYaz(no, d); if (d === 'sevk') faturaKes(o); yaz('exs-siparisler', SIP); portalaYansit(o);
};
// sipariş penceresine takip alanları
const _siparisAc = siparisAc;
siparisAc = function (no) {
  _siparisAc(no); const p = $$('.perde').pop(), o = SIP[no]; if (!p) return;
  const ekle = () => {
    if (p.querySelector('#pTakip')) return; const k = p.querySelector('#pTeklif'); if (!k) return;
    k.insertAdjacentHTML('beforebegin', `<div id="pTakip" class="kart" style="margin:14px 0;background:var(--yuzey2)"><h3>Sipariş takibi</h3><div class="alt">Bu bilgiler bayinin “Siparişlerim” ekranında görünür.</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
      <div class="alan"><label>Tahmini teslim (termin)</label><input id="tTer" type="date" value="${esc(o.termin || '')}"></div>
      <div class="alan"><label>Kargo / nakliye firması</label><input id="tKar" value="${esc(o.kargo || '')}" placeholder="ör. Aras, kendi aracımız"></div>
      <div class="alan"><label>Takip no / irsaliye</label><input id="tTak" value="${esc(o.takip || '')}"></div>
      <div class="alan"><label>Bayiye not</label><input id="tNot" value="${esc(o.satisNot || '')}"></div></div>
      <button class="btn cizgi" id="tKay">Takip bilgisini kaydet</button>
      ${(o.gecmis || []).length ? `<div class="kucuk" style="margin-top:10px">${o.gecmis.map(g => `${DURUM[g.durum] ? DURUM[g.durum][0] : g.durum}: ${new Date(g.zaman).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}`).join(' · ')}</div>` : ''}</div>`);
    p.querySelector('#tKay').onclick = () => { o.termin = p.querySelector('#tTer').value; o.kargo = p.querySelector('#tKar').value.trim(); o.takip = p.querySelector('#tTak').value.trim(); o.satisNot = p.querySelector('#tNot').value.trim(); yaz('exs-siparisler', SIP); portalaYansit(o); toast('Takip bilgisi kaydedildi.'); };
  };
  ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
};

// ---------- müşteri kartı (CRM + cari)
const SESSIZ_GUN = 60;
function musUyari(m) {
  const S = Object.values(SIP).filter(o => o.kul === m.kul && o.durum !== 'iptal'), son = Math.max(0, ...S.map(o => o.tarih)), c = cariOzet(m.kul), U = [];
  if (c.gecmis > 0.5) U.push(['kotu', `Vadesi geçmiş ${usd(c.gecmis)} (${c.gecikmeGun} gün)`]);
  if (son && Date.now() - son > SESSIZ_GUN * GUN) U.push(['uyari', `${Math.floor((Date.now() - son) / GUN)} gündür sipariş yok`]);
  if (!son) U.push(['uyari', 'Hiç sipariş vermedi']);
  const T = (CRM[m.kul] || []).map(n => n.tarih); const temas = Math.max(0, ...T);
  if (!temas || Date.now() - temas > 30 * GUN) U.push(['bilgi', temas ? `Son temas ${Math.floor((Date.now() - temas) / GUN)} gün önce` : 'Görüşme kaydı yok']);
  return U;
}
const uyariRozet = U => U.map(([t, m]) => `<span class="uy uy-${t}">${esc(m)}</span>`).join(' ');
function musteriKarti(kul) {
  const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) { p.remove(); git(aktif); } }; document.body.appendChild(p);
  function ciz() {
    const m = MUS[kul] || { kul }, S = sipList().filter(o => o.kul === kul), N = S.filter(o => o.durum !== 'iptal'), c = cariOzet(kul), ch = cariHesap(kul), notlar = (CRM[kul] || []).slice().sort((a, b) => b.tarih - a.tarih);
    const H = ch.hareket.slice().sort((a, b) => a.tarih - b.tarih); let b = 0;
    p.innerHTML = `<div class="pencere"><button class="kapat">×</button>
      <h2 style="margin:0">${esc(m.firma || kul)}</h2><div class="kucuk">${esc(m.ad || '')}${m.tel ? ' · ' + esc(m.tel) : ''}${m.mail ? ' · ' + esc(m.mail) : ''}${m.sehir ? ' · ' + esc(m.sehir) : ''}${m.vergi ? ' · VN ' + esc(m.vergi) : ''}</div>
      <div style="margin:10px 0">${uyariRozet(musUyari(m))}</div>
      <div class="kpi"><div><span>Sipariş</span><b>${N.length}</b><small>net ${usd(N.reduce((a, o) => a + tutarlar(o).net, 0))}</small></div>
        <div><span>Son sipariş</span><b style="font-size:17px">${N.length ? tarih(Math.max(...N.map(o => o.tarih))) : '—'}</b><small>iskonto ${yuzde(musIsk(kul))}</small></div>
        <div><span>Cari bakiye</span><b>${usd(c.bakiye)}</b><small>${tlYap(c.bakiye)}</small></div>
        <div><span>Vadesi geçmiş</span><b style="color:${c.gecmis > 0.5 ? 'var(--kotu)' : 'inherit'}">${usd(c.gecmis)}</b><small>vade ${c.vade} gün</small></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="mk-izgara">
        <div class="kart"><h3>Görüşme notları</h3><div class="alt">Telefon, ziyaret, e-posta; son temas tarihi buradan izlenir.</div>
          <div style="display:flex;gap:8px;margin-bottom:8px"><select id="nTur" style="padding:8px;border:1px solid var(--cizgi);border-radius:8px"><option>Telefon</option><option>Ziyaret</option><option>E-posta</option><option>Toplantı</option></select>
          <input id="nYazi" placeholder="Görüşme notu" style="flex:1;padding:8px;border:1px solid var(--cizgi);border-radius:8px"><button class="btn marka" id="nEkle">Ekle</button></div>
          ${notlar.length ? notlar.map(n => `<div class="not-satir"><b>${esc(n.tur)}</b> · <span class="kucuk">${new Date(n.tarih).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })} · ${esc(n.kim || '')}</span><div>${esc(n.yazi)}</div></div>`).join('') : '<div class="kucuk">Henüz not yok.</div>'}</div>
        <div class="kart"><h3>Cari hesap</h3><div class="alt">Sevk edilen siparişler otomatik faturalanır. Tahsilatları buradan girin.</div>
          <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap"><input id="oTut" inputmode="decimal" placeholder="Tahsilat $" style="width:110px;padding:8px;border:1px solid var(--cizgi);border-radius:8px">
          <input id="oAc" placeholder="Açıklama (havale, çek…)" style="flex:1;min-width:120px;padding:8px;border:1px solid var(--cizgi);border-radius:8px"><button class="btn marka" id="oEkle">Tahsilat ekle</button></div>
          <div class="kucuk" style="margin-bottom:8px">Vade (gün): <input id="cVade" value="${ch.vade}" inputmode="numeric" style="width:60px;padding:5px;border:1px solid var(--cizgi);border-radius:6px"> · yeni faturalara uygulanır</div>
          ${H.length ? `<table class="tablo"><tr><th>Tarih</th><th>Belge</th><th class="sag-hiza">Borç</th><th class="sag-hiza">Alacak</th><th class="sag-hiza">Bakiye</th></tr>${H.map(h => { b += h.tip === 'fatura' ? h.tutar : -h.tutar; return `<tr><td>${tarih(h.tarih)}</td><td>${esc(h.no || h.aciklama || '')}${h.tip === 'fatura' ? `<div class="kucuk">vade ${tarih(h.vade)}</div>` : `<div class="kucuk">${esc(h.aciklama || '')}</div>`}</td><td class="sag-hiza">${h.tip === 'fatura' ? usd(h.tutar) : ''}</td><td class="sag-hiza">${h.tip === 'odeme' ? usd(h.tutar) : ''}</td><td class="sag-hiza"><b>${usd(b)}</b></td></tr>`; }).join('')}</table>` : '<div class="kucuk">Hareket yok. Sipariş “Sevk edildi” olunca fatura otomatik oluşur.</div>'}</div></div>
      <div class="kart"><h3>Siparişleri</h3>${S.length ? `<table class="tablo"><tr><th>No</th><th>Tarih</th><th class="sag-hiza">Net</th><th>Durum</th></tr>${S.map(o => `<tr class="tik" data-no="${o.no}"><td><b>${o.no}</b></td><td>${tarih(o.tarih)}</td><td class="sag-hiza">${usd(tutarlar(o).net)}</td><td><span class="durum ${DURUM[o.durum][1]}">${DURUM[o.durum][0]}</span></td></tr>`).join('')}</table>` : '<div class="kucuk">Sipariş yok.</div>'}</div></div>`;
    p.querySelector('.kapat').onclick = () => { p.remove(); git(aktif); };
    p.querySelector('#nEkle').onclick = () => { const y = p.querySelector('#nYazi').value.trim(); if (!y) return; (CRM[kul] = CRM[kul] || []).push({ tarih: Date.now(), tur: p.querySelector('#nTur').value, yazi: y, kim: ben.ad || ben.kul }); yaz('exs-crm', CRM); ciz(); };
    p.querySelector('#oEkle').onclick = () => { const v = parseFloat(p.querySelector('#oTut').value.replace(/\./g, '').replace(',', '.')); if (!(v > 0)) return toast('Tutar girin.'); cariHesap(kul).hareket.push({ tip: 'odeme', no: 'TH-' + Date.now().toString(36).toUpperCase(), tarih: Date.now(), tutar: v, aciklama: p.querySelector('#oAc').value.trim() || 'Tahsilat' }); cariYaz(); toast('Tahsilat kaydedildi.'); ciz(); };
    p.querySelector('#cVade').onchange = e => { cariHesap(kul).vade = Math.max(0, parseInt(e.target.value) || 0); cariYaz(); toast('Vade güncellendi.'); };
    p.querySelectorAll('tr.tik').forEach(r => r.onclick = () => siparisAc(r.dataset.no));
  }
  ciz();
}
const _musteriler = musteriler;
musteriler = function () {
  _musteriler(); $('#baslik').textContent = 'Müşteriler, iskonto ve cari';
  const tb = $('#icerik table.tablo'); if (!tb) return;
  tb.querySelector('tr').insertAdjacentHTML('beforeend', '<th>Cari / uyarı</th><th></th>');
  [...tb.querySelectorAll('tr')].slice(1).forEach(r => { const kul = r.querySelector('[data-isk]').dataset.isk, c = cariOzet(kul);
    r.insertAdjacentHTML('beforeend', `<td><b>${usd(c.bakiye)}</b><div>${uyariRozet(musUyari(MUS[kul] || { kul }))}</div></td><td><button class="btn cizgi" data-kart="${esc(kul)}">Müşteri kartı</button></td>`); });
  $$('[data-kart]').forEach(b => b.onclick = () => musteriKarti(b.dataset.kart));
};

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
const _ai = ai;
ai = function () {
  _ai(); $('#baslik').textContent = 'Yapay zekâ: tahmin ve SWOT'; const s = istatistik(); if (!s.siparis) return; const T = tahmin(s), O = urunOnerileri(), max = Math.max(1, ...T.map(t => t.ust), ...s.aylar.slice(-6).map(a => a.net));
  $('#icerik').insertAdjacentHTML('afterbegin', `<div class="kart"><h3>Satış tahmini: gelecek 3 ay</h3><div class="alt">Son 12 ayın eğilimi ve son 3 ayın ortalamasıyla hesaplanır. Aralık, geçmiş dalgalanmaya göre olası alt ve üst değerdir.</div>
    <div class="tahmin">${s.aylar.slice(-6).map(a => `<div class="tc"><span class="tv">${usd(a.net)}</span><i style="height:${a.net / max * 140}px"></i><span>${a.ad}</span></div>`).join('')}
    ${T.map(t => `<div class="tc tah"><span class="tv">${usd(t.t)}</span><i style="height:${t.t / max * 140}px"><em style="bottom:${t.alt / max * 140}px;height:${(t.ust - t.alt) / max * 140}px"></em></i><span>${t.ad.split(' ')[0].slice(0, 3)}</span></div>`).join('')}</div>
    <div class="kucuk">Tahmin toplamı: <b>${usd(T.reduce((a, t) => a + t.t, 0))}</b> (${usd(T.reduce((a, t) => a + t.alt, 0))} – ${usd(T.reduce((a, t) => a + t.ust, 0))}) · ${tlYap(T.reduce((a, t) => a + t.t, 0))}</div></div>
    ${O.length ? `<div class="kart"><h3>Bayiye ürün önerileri</h3><div class="alt">Benzer ürünleri alan bayilerin satın alımlarına göre; o bayinin henüz almadığı ürünler.</div><table class="tablo"><tr><th>Bayi</th><th>Önerilen ürünler</th></tr>${O.map(o => `<tr><td><b>${esc(o.firma)}</b></td><td>${o.L.map(esc).join(', ')}</td></tr>`).join('')}</table></div>` : ''}`);
};

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
const _git = git;
git = function (s) { if (s === 'raporlar') { try { $('#yol').textContent = 'Satış Yönetimi  /  Raporlar'; } catch (e) {} aktif = s; $$('aside button.m[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = ''; raporlar(); window.scrollTo(0, 0); } else _git(s); };
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
// haftanın ilk açılışında rapor hatırlatması
(function () { const hafta = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toDateString(); })(); if (oku('exs-rapor-hafta', '') !== hafta) { setTimeout(() => { if (ben) { toast('Geçen haftanın satış raporu hazır: Raporlar › Geçen hafta.'); yaz('exs-rapor-hafta', hafta); } }, 2500); } })();
// örnek veri: sevk edilen siparişlere fatura, bir kısmına tahsilat, birkaç görüşme notu
const _ornekVeri = ornekVeri;
ornekVeri = function () {
  _ornekVeri(); let tohum = 7; const r = () => (tohum = (tohum * 9301 + 49297) % 233280) / 233280;
  Object.values(SIP).filter(o => o.ornek).sort((a, b) => a.tarih - b.tarih).forEach(o => {
    o.gecmis = [{ durum: 'yeni', zaman: o.tarih }]; if (o.durum !== 'yeni') o.gecmis.push({ durum: o.durum, zaman: o.tarih + 3 * GUN });
    if (o.durum === 'onay' || o.durum === 'uretim') o.termin = new Date(Date.now() + (10 + Math.floor(r() * 30)) * GUN).toISOString().slice(0, 10);
    if (o.durum !== 'sevk') return; o.kargo = 'Kendi aracımız'; o.takip = 'IRS-' + o.no.slice(-4);
    const c = cariHesap(o.kul), t = o.tarih + 5 * GUN, n = Math.round(tutarlar(o).net * 100) / 100;
    if (!c.hareket.some(h => h.sip === o.no)) { c.hareket.push({ tip: 'fatura', no: 'FT-' + o.no, sip: o.no, tarih: t, vade: t + c.vade * GUN, tutar: n, aciklama: o.no + ' sevkiyatı', ornek: true });
      if (r() < (o.kul === 'ornek-bodrum' ? .3 : .85)) c.hareket.push({ tip: 'odeme', no: 'TH-' + o.no.slice(-4), tarih: t + (40 + r() * 40) * GUN, tutar: n, aciklama: 'Havale', ornek: true }); }
  });
  Object.values(CARI).forEach(c => c.hareket = c.hareket.filter(h => h.tip !== 'odeme' || h.tarih < Date.now()));
  ['ornek-ege', 'ornek-akdeniz', 'ornek-bosfor'].forEach((k, i) => { CRM[k] = CRM[k] || []; if (!CRM[k].length) CRM[k].push({ tarih: Date.now() - (5 + i * 20) * GUN, tur: ['Telefon', 'Ziyaret', 'E-posta'][i], yazi: ['Yeni sezon kataloğu iletildi.', 'Showroom ziyareti, teras projesi konuşuldu.', 'Fiyat listesi gönderildi.'][i], kim: 'Örnek', ornek: true }); });
  yaz('exs-siparisler', SIP); cariYaz(); yaz('exs-crm', CRM);
};

// ===== kampanya ve sezon indirimleri =====
let KMP = oku('exs-kampanya', []);
const kmpYaz = () => { yaz('exs-kampanya', KMP); yaz('exb-kampanya', KMP); };
yaz('exb-kampanya', KMP);
const bugun = () => new Date().toISOString().slice(0, 10);
const kmpDurum = k => k.aktif === false ? ['Durduruldu', 'd-iptal'] : k.bas && k.bas > bugun() ? ['Planlandı', 'd-yeni'] : k.bit && k.bit < bugun() ? ['Sona erdi', 'd-iptal'] : ['Yayında', 'd-onay'];
function kmpPerf(k) {
  const L = Object.values(SIP).filter(o => o.durum !== 'iptal').flatMap(o => o.kalemler.filter(x => x.kampanya && x.kampanya.startsWith(k.ad + ' (')).map(x => ({ o, x })));
  return { adet: L.reduce((a, y) => a + y.x.adet, 0), ciro: L.reduce((a, y) => a + (y.x.birim || 0) * y.x.adet, 0), indirim: L.reduce((a, y) => a + ((y.x.liste || y.x.birim || 0) - (y.x.birim || 0)) * y.x.adet, 0), siparis: new Set(L.map(y => y.o.no)).size };
}
function kampanyalar() {
  $('#baslik').textContent = 'Kampanyalar';
  $('#ustSag').innerHTML = '<button class="btn marka" id="kYeni">Yeni kampanya</button>';
  $('#kYeni').onclick = () => kmpForm();
  $('#icerik').innerHTML = `<div class="kart"><h3>Kampanya ve sezon indirimleri</h3><div class="alt">Yayındaki kampanyalar bayi portalında eski ve yeni fiyatla, “%… indirim” etiketiyle görünür. Aynı ürüne birden çok kampanya denk gelirse en yüksek oran uygulanır. Kampanya indirimi, firma iskontosundan önce birim fiyata uygulanır.</div>
    ${KMP.length ? `<table class="tablo"><tr><th>Kampanya</th><th>Kapsam</th><th class="sag-hiza">İndirim</th><th>Tarih</th><th>Durum</th><th class="sag-hiza">Satış</th><th></th></tr>
    ${KMP.map((k, i) => { const d = kmpDurum(k), p = kmpPerf(k); return `<tr><td><b>${esc(k.ad)}</b>${k.not ? `<div class="kucuk">${esc(k.not)}</div>` : ''}</td><td class="kucuk">${k.kapsam === 'tumu' ? 'Tüm ürünler' : (k.kapsam === 'kategori' ? 'Kategori: ' : 'Ürün: ') + esc((k.hedef || []).join(', '))}</td>
      <td class="sag-hiza"><b>%${k.oran}</b></td><td class="kucuk">${k.bas ? tarih(k.bas) : 'hemen'} – ${k.bit ? tarih(k.bit) : 'süresiz'}</td><td><span class="durum ${d[1]}">${d[0]}</span></td>
      <td class="sag-hiza">${p.siparis ? `${p.siparis} sipariş · ${p.adet} ad.<div class="kucuk">${usd(p.ciro)} · indirim ${usd(p.indirim)}</div>` : '<span class="kucuk">henüz yok</span>'}</td>
      <td style="white-space:nowrap"><button class="btn cizgi" data-kd="${i}">Düzenle</button> <button class="btn cizgi" data-ka="${i}">${k.aktif === false ? 'Başlat' : 'Durdur'}</button> <button class="btn cizgi" data-ks="${i}">Sil</button></td></tr>`; }).join('')}</table>`
    : '<div class="bos">Henüz kampanya yok. “Yeni kampanya” ile örneğin “Sezon öncesi şezlong kampanyası, %10, 1–30 Kasım” tanımlayabilirsiniz.</div>'}</div>`;
  $$('[data-kd]').forEach(b => b.onclick = () => kmpForm(+b.dataset.kd));
  $$('[data-ka]').forEach(b => b.onclick = () => { const k = KMP[+b.dataset.ka]; k.aktif = k.aktif === false; kmpYaz(); toast(k.aktif ? 'Kampanya başlatıldı.' : 'Kampanya durduruldu.'); kampanyalar(); });
  $$('[data-ks]').forEach(b => b.onclick = () => { if (!confirm('Kampanya silinsin mi?')) return; KMP.splice(+b.dataset.ks, 1); kmpYaz(); kampanyalar(); });
}
function kmpForm(i) {
  const k = i == null ? { ad: '', oran: 10, kapsam: 'kategori', hedef: [], bayiler: [], bas: bugun(), bit: '', aktif: true, not: '' } : { ...KMP[i], hedef: [...(KMP[i].hedef || [])], bayiler: [...(KMP[i].bayiler || [])] };
  let bayiSec = k.bayiler.length > 0;
  const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) p.remove(); }; document.body.appendChild(p);
  function ciz() {
    const sec = k.kapsam === 'kategori' ? KAT_L : k.kapsam === 'urun' ? VERI.urunler.map(u => u.ad).sort((a, b) => a.localeCompare(b, 'tr')) : [];
    const ornek = VERI.urunler.filter(u => k.kapsam === 'tumu' || (k.hedef || []).includes(k.kapsam === 'kategori' ? u.kategori : u.ad)).slice(0, 4);
    p.innerHTML = `<div class="pencere" style="max-width:720px"><button class="kapat">×</button><h2 style="margin:0 0 14px">${i == null ? 'Yeni kampanya' : 'Kampanyayı düzenle'}</h2>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px"><div class="alan"><label>Kampanya adı (bayi bunu görür)</label><input id="kAd" value="${esc(k.ad)}" placeholder="ör. Sezon öncesi şezlong kampanyası"></div>
        <div class="alan"><label>İndirim %</label><input id="kOran" inputmode="decimal" value="${k.oran}"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="alan"><label>Başlangıç</label><input id="kBas" type="date" value="${k.bas || ''}"></div><div class="alan"><label>Bitiş (boş = süresiz)</label><input id="kBit" type="date" value="${k.bit || ''}"></div></div>
      <div class="alan"><label>Kapsam</label><div class="sk-sec">${[['tumu', 'Tüm ürünler'], ['kategori', 'Kategori seç'], ['urun', 'Ürün seç']].map(([v, a]) => `<label><input type="radio" name="kKap" value="${v}" ${k.kapsam === v ? 'checked' : ''}> ${a}</label>`).join('')}</div></div>
      ${sec.length ? `<div class="hedefler">${sec.map(h => `<label class="${k.hedef.includes(h) ? 'on' : ''}"><input type="checkbox" value="${esc(h)}" ${k.hedef.includes(h) ? 'checked' : ''}> ${esc(h)}</label>`).join('')}</div>` : ''}
      <div class="alan"><label>Hangi bayiler görsün?</label><div class="sk-sec"><label><input type="radio" name="kBy" value="tum" ${bayiSec ? '' : 'checked'}> Tüm bayiler</label><label><input type="radio" name="kBy" value="sec" ${bayiSec ? 'checked' : ''}> Seçili bayiler</label></div></div>
      ${bayiSec ? `<div class="hedefler bayiler">${Object.values(MUS).sort((a, b) => (a.firma || '').localeCompare(b.firma || '', 'tr')).map(m => `<label class="${k.bayiler.includes(m.kul) ? 'on' : ''}"><input type="checkbox" value="${esc(m.kul)}" ${k.bayiler.includes(m.kul) ? 'checked' : ''}> ${esc(m.firma || m.kul)}</label>`).join('') || '<span class="kucuk">Kayıtlı bayi yok.</span>'}</div>` : ''}
      <div class="alan"><label>İç not (bayi görmez)</label><input id="kNot" value="${esc(k.not || '')}" placeholder="ör. stok eritme, fuar sonrası"></div>
      ${ornek.length ? `<div class="kucuk" style="margin:4px 0 14px">Örnek fiyat: ${ornek.map(u => { const s = u.secenek.find(x => x.fiyat != null); if (!s) return ''; const f = typeof fiyatAl === 'function' ? fiyatAl(u, s) : s.fiyat; return f == null ? '' : `${esc(u.ad)} ${usd(f)} → <b>${usd(Math.round(f * (1 - (+k.oran || 0) / 100)))}</b>`; }).filter(Boolean).join(' · ')}</div>` : ''}
      <div class="hata" id="kHata" style="color:var(--kotu);font-size:13px;margin-bottom:8px"></div>
      <button class="btn marka" id="kKay">${i == null ? 'Kampanyayı yayınla' : 'Kaydet'}</button></div>`;
    p.querySelector('.kapat').onclick = () => p.remove();
    const oku_ = () => { k.ad = p.querySelector('#kAd').value.trim(); k.oran = Math.min(90, Math.max(0, parseFloat(p.querySelector('#kOran').value.replace(',', '.')) || 0)); k.bas = p.querySelector('#kBas').value; k.bit = p.querySelector('#kBit').value; k.not = p.querySelector('#kNot').value.trim(); };
    p.querySelectorAll('[name=kKap]').forEach(x => x.onchange = () => { oku_(); k.kapsam = x.value; k.hedef = []; ciz(); });
    p.querySelectorAll('[name=kBy]').forEach(x => x.onchange = () => { oku_(); bayiSec = x.value === 'sec'; if (!bayiSec) k.bayiler = []; ciz(); });
    p.querySelectorAll('.bayiler input').forEach(x => x.onchange = () => { oku_(); k.bayiler = x.checked ? [...k.bayiler, x.value] : k.bayiler.filter(h => h !== x.value); ciz(); });
    p.querySelectorAll('.hedefler:not(.bayiler) input').forEach(x => x.onchange = () => { oku_(); k.hedef = x.checked ? [...k.hedef, x.value] : k.hedef.filter(h => h !== x.value); ciz(); });
    p.querySelector('#kOran').oninput = () => { clearTimeout(window._ko); window._ko = setTimeout(() => { oku_(); ciz(); const i2 = p.querySelector('#kOran'); i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); }, 500); };
    p.querySelector('#kKay').onclick = () => { oku_(); const h = !k.ad ? 'Kampanya adı girin.' : !(k.oran > 0) ? 'İndirim oranı girin.' : k.kapsam !== 'tumu' && !k.hedef.length ? 'En az bir kategori veya ürün seçin.' : k.bit && k.bas && k.bit < k.bas ? 'Bitiş tarihi başlangıçtan önce olamaz.' : bayiSec && !k.bayiler.length ? 'En az bir bayi seçin veya “Tüm bayiler”i işaretleyin.' : '';
      if (h) { p.querySelector('#kHata').textContent = h; return; } if (i == null) KMP.push(k); else KMP[i] = k; kmpYaz(); p.remove(); toast('Kampanya kaydedildi; bayi portalında görünüyor.'); kampanyalar(); };
  }
  ciz();
}
const _git2 = git;
git = function (s) { if (s === 'kampanyalar') { try { $('#yol').textContent = 'Satış Yönetimi  /  Kampanyalar'; } catch (e) {} aktif = s; $$('aside button.m[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = ''; kampanyalar(); window.scrollTo(0, 0); } else _git2(s); };
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));

// ===== ürün ve fiyat yönetimi (bayi portalını yönetir) =====
let FIYAT = oku('exs-fiyat', {}), GIZLI = oku('exs-gizli', []);
let urunYaz = () => { yaz('exs-fiyat', FIYAT); yaz('exb-fiyat', FIYAT); yaz('exs-gizli', GIZLI); yaz('exb-gizli', GIZLI); };
urunYaz();
const fiyatAl = (u, s) => { const f = (FIYAT[u.ad] || {})[s.ad]; return f != null && f !== '' ? +f : s.fiyat; };
const aktifKmp = u => KMP.filter(k => kmpDurum(k)[0] === 'Yayında' && (k.kapsam === 'tumu' || (k.hedef || []).includes(k.kapsam === 'kategori' ? u.kategori : u.ad))).sort((a, b) => b.oran - a.oran);
const PF = { ara: '', kat: '', sinif: '', durum: '' }, SEC = new Set();
function urunListe() {
  return VERI.urunler.filter(u => (!PF.kat || u.kategori === PF.kat) && (!PF.sinif || u.secenek.some(s => s.sinif === PF.sinif))
    && (!PF.ara || (u.ad + ' ' + u.kategori).toLocaleLowerCase('tr').includes(PF.ara.toLocaleLowerCase('tr')))
    && (PF.durum !== 'kmp' || aktifKmp(u).length) && (PF.durum !== 'gizli' || GIZLI.includes(u.ad)) && (PF.durum !== 'degisen' || Object.keys(FIYAT[u.ad] || {}).length) && (PF.durum !== 'yayinda' || !GIZLI.includes(u.ad)));
}
function urunler() {
  $('#baslik').textContent = 'Ürünler ve fiyatlar';
  const L = urunListe(), degisen = Object.keys(FIYAT).filter(k => Object.keys(FIYAT[k]).length).length;
  $('#ustSag').innerHTML = `<button class="btn cizgi" id="uCsv">Fiyat listesini Excel'e aktar</button>`;
  $('#icerik').innerHTML = `<div class="kpi"><div><span>Ürün</span><b>${VERI.urunler.length}</b><small>${VERI.urunler.length - GIZLI.length} portalda görünür</small></div><div><span>Fiyatı değiştirilen</span><b>${degisen}</b><small>liste fiyatından farklı</small></div><div><span>Kampanyalı ürün</span><b>${VERI.urunler.filter(u => aktifKmp(u).length).length}</b><small>${KMP.filter(k => kmpDurum(k)[0] === 'Yayında').length} kampanya yayında</small></div><div><span>Gizli ürün</span><b>${GIZLI.length}</b><small>bayi görmez</small></div></div>
    <div class="kart"><div class="filtreler"><input id="uAra" placeholder="Ürün ara" value="${esc(PF.ara)}">${katSinifSec(PF, 'uKat', 'uSin')}
      <select id="uDur"><option value="">Tüm ürünler</option>${[['yayinda', 'Portalda görünenler'], ['kmp', 'Kampanyalı'], ['degisen', 'Fiyatı değiştirilen'], ['gizli', 'Gizli']].map(([k, a]) => `<option value="${k}" ${PF.durum === k ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
    <div class="toplu ${SEC.size ? 'on' : ''}"><label><input type="checkbox" id="uHepsi" ${L.length && L.every(u => SEC.has(u.ad)) ? 'checked' : ''}> <b>${SEC.size}</b> ürün seçili</label>
      <span class="ayir"></span><span>Fiyat:</span><input id="tOran" inputmode="decimal" placeholder="%" style="width:64px"><button class="btn cizgi" id="tArt">Artır</button><button class="btn cizgi" id="tAzl">Azalt</button><button class="btn cizgi" id="tSif">Liste fiyatına dön</button>
      <span class="ayir"></span><button class="btn marka" id="tKmp">Seçilenlerle kampanya oluştur</button><button class="btn cizgi" id="tGiz">Portalda gizle</button><button class="btn cizgi" id="tGos">Portalda göster</button>${SEC.size ? '<button class="btn cizgi" id="tTem">Seçimi temizle</button>' : ''}</div>
    ${L.length ? `<table class="tablo urun-tb"><tr><th></th><th>Ürün</th><th>Seçenekler ve fiyat (USD)</th><th>Kampanya</th><th>Portal</th></tr>
      ${L.map(u => { const K = aktifKmp(u), gz = GIZLI.includes(u.ad); return `<tr class="${gz ? 'gizli-satir' : ''}"><td><input type="checkbox" data-sec="${esc(u.ad)}" ${SEC.has(u.ad) ? 'checked' : ''}></td>
        <td><div class="u-bas">${u.gorsel ? `<i style="background-image:url(${u.gorsel})"></i>` : '<i></i>'}<div><b>${esc(u.ad)}</b><div class="kucuk">${esc(u.kategori)}</div></div></div></td>
        <td><div class="u-fiyat">${u.secenek.map(s => { const f = fiyatAl(u, s), d = f !== s.fiyat; return `<label class="${d ? 'degisti' : ''}" title="${esc(s.sinif)}"><span>${esc(s.ad)}</span><input data-u="${esc(u.ad)}" data-s="${esc(s.ad)}" value="${f ?? ''}" placeholder="teklif" inputmode="decimal">${d ? `<small>liste ${s.fiyat ?? '—'}${K[0] && f != null ? ` · kampanyalı ${Math.round(f * (1 - K[0].oran / 100))}` : ''}</small>` : K[0] && f != null ? `<small>kampanyalı ${Math.round(f * (1 - K[0].oran / 100))}</small>` : ''}</label>`; }).join('') || '<span class="kucuk">Fiyat yok</span>'}</div></td>
        <td>${K.length ? K.map(k => `<span class="uy uy-kotu">%${k.oran} ${esc(k.ad)}</span>`).join(' ') : '<span class="kucuk">—</span>'}</td>
        <td><button class="anah ${gz ? '' : 'on'}" data-gz="${esc(u.ad)}" title="${gz ? 'Gizli: bayi görmez' : 'Bayi portalında görünür'}"><i></i></button></td></tr>`; }).join('')}</table>` : '<div class="bos">Bu filtreye uyan ürün yok.</div>'}</div>`;
  const yenile = () => urunler();
  $('#uAra').oninput = e => { PF.ara = e.target.value; clearTimeout(window._ua); window._ua = setTimeout(() => { yenile(); const i = $('#uAra'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
  $('#uKat').onchange = e => { PF.kat = e.target.value; PF.sinif = ''; yenile(); };
  $('#uSin').onchange = e => { PF.sinif = e.target.value; yenile(); };
  $('#uDur').onchange = e => { PF.durum = e.target.value; yenile(); };
  $$('[data-sec]').forEach(c => c.onchange = () => { c.checked ? SEC.add(c.dataset.sec) : SEC.delete(c.dataset.sec); yenile(); });
  $('#uHepsi').onchange = e => { L.forEach(u => e.target.checked ? SEC.add(u.ad) : SEC.delete(u.ad)); yenile(); };
  $$('[data-gz]').forEach(b => b.onclick = () => { const a = b.dataset.gz; GIZLI = GIZLI.includes(a) ? GIZLI.filter(x => x !== a) : [...GIZLI, a]; urunYaz(); toast(GIZLI.includes(a) ? a + ' portalda gizlendi.' : a + ' portalda görünüyor.'); yenile(); });
  $$('.u-fiyat input').forEach(i => i.onchange = () => { const u = VERI.urunler.find(x => x.ad === i.dataset.u), s = u.secenek.find(x => x.ad === i.dataset.s), v = i.value.trim() === '' ? null : parseFloat(i.value.replace(/\./g, '').replace(',', '.'));
    if (i.value.trim() !== '' && !(v >= 0)) return toast('Geçerli bir fiyat girin.');
    FIYAT[u.ad] = FIYAT[u.ad] || {}; if (v === s.fiyat) delete FIYAT[u.ad][s.ad]; else FIYAT[u.ad][s.ad] = v; if (!Object.keys(FIYAT[u.ad]).length) delete FIYAT[u.ad];
    urunYaz(); toast(`${u.ad} · ${s.ad}: ${v == null ? 'teklif' : usd(v)}`); yenile(); });
  const secili = () => { if (!SEC.size) { toast('Önce ürün seçin.'); return null; } return VERI.urunler.filter(u => SEC.has(u.ad)); };
  const toplu = yon => { const S = secili(); if (!S) return; const o = parseFloat(($('#tOran').value || '').replace(',', '.')); if (!(o > 0 && o < 100)) return toast('Oranı girin, örn. 5.');
    S.forEach(u => u.secenek.forEach(s => { const f = fiyatAl(u, s); if (f == null) return; const y = Math.round(f * (1 + yon * o / 100)); FIYAT[u.ad] = FIYAT[u.ad] || {}; if (y === s.fiyat) delete FIYAT[u.ad][s.ad]; else FIYAT[u.ad][s.ad] = y; }));
    urunYaz(); toast(`${S.length} ürünün fiyatı %${o} ${yon > 0 ? 'artırıldı' : 'azaltıldı'}.`); yenile(); };
  $('#tArt').onclick = () => toplu(1); $('#tAzl').onclick = () => toplu(-1);
  $('#tSif').onclick = () => { const S = secili(); if (!S) return; S.forEach(u => delete FIYAT[u.ad]); urunYaz(); toast('Seçilen ürünler liste fiyatına döndü.'); yenile(); };
  $('#tGiz').onclick = () => { const S = secili(); if (!S) return; GIZLI = [...new Set([...GIZLI, ...S.map(u => u.ad)])]; urunYaz(); toast(S.length + ' ürün portalda gizlendi.'); yenile(); };
  $('#tGos').onclick = () => { const S = secili(); if (!S) return; GIZLI = GIZLI.filter(a => !SEC.has(a)); urunYaz(); toast(S.length + ' ürün portalda görünüyor.'); yenile(); };
  if ($('#tTem')) $('#tTem').onclick = () => { SEC.clear(); yenile(); };
  $('#tKmp').onclick = () => { const S = secili(); if (!S) return; kmpForm(null, { kapsam: 'urun', hedef: S.map(u => u.ad) }); };
  $('#uCsv').onclick = () => { const R = [['Ürün', 'Kategori', 'Seçenek', 'Ürün tipi', 'Liste $', 'Güncel $', 'Kampanya', 'Kampanyalı $', 'Portal']]; VERI.urunler.forEach(u => { const K = aktifKmp(u)[0]; u.secenek.forEach(s => { const f = fiyatAl(u, s); R.push([u.ad, u.kategori, s.ad, s.sinif, s.fiyat ?? '', f ?? '', K ? K.ad + ' %' + K.oran : '', K && f != null ? Math.round(f * (1 - K.oran / 100)) : '', GIZLI.includes(u.ad) ? 'gizli' : 'görünür']); }); });
    const csv = '﻿' + R.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'exit_fiyat_listesi.csv'; a.click(); };
}
// kampanya formu: ön seçim + bayi hedefleme
const _kmpForm = kmpForm;
kmpForm = function (i, on) {
  _kmpForm(i); const p = $$('.perde').pop(); if (!p) return;
  if (on && i == null) { const r = p.querySelector(`[name=kKap][value=${on.kapsam}]`); if (r) { r.checked = true; r.dispatchEvent(new Event('change')); }
    on.hedef.forEach(h => { const c = [...p.querySelectorAll('.hedefler input')].find(x => x.value === h); if (c && !c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } }); }
};
// kampanya listesinde bayi kapsamı
const _kampanyalar = kampanyalar;
kampanyalar = function () { _kampanyalar(); $$('#icerik table.tablo tr').slice(1).forEach((r, i) => { const k = KMP[i]; if (!k) return; r.children[1].insertAdjacentHTML('beforeend', `<div class="kucuk"><b>${(k.bayiler || []).length ? 'Bayiler: ' + esc(k.bayiler.map(b => (MUS[b] || {}).firma || b).join(', ')) : 'Tüm bayiler'}</b></div>`); }); };
const _git3 = git;
git = function (s) { if (s === 'urunler') { try { $('#yol').textContent = 'Satış Yönetimi  /  Ürünler ve fiyatlar'; } catch (e) {} aktif = s; $$('aside button.m[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = ''; urunler(); window.scrollTo(0, 0); } else _git3(s); };
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));

// ===== v2.2: roller, onay akışı, fiyat geçmişi, bayiye bildirim, hedef takibi =====
const rolu = u => u ? (u.rol || (u.kul === 'satis' ? 'yonetici' : 'temsilci')) : 'temsilci';
const yonetici = () => rolu(ben) === 'yonetici';
const ROL_AD = { yonetici: 'Yönetici', temsilci: 'Satış temsilcisi' };
const kimAd = () => (ben && (ben.ad || ben.kul)) || '';

// ---------- 9. onay akışı
let ONAY = oku('exs-onay-ayar', { iskonto: 15, tutar: 25000 });
function onayGerekli(o) { const t = tutarlar(o), N = []; if (t.oran > ONAY.iskonto) N.push(`iskonto ${yuzde(t.oran)} > ${yuzde(ONAY.iskonto)}`); if (t.net > ONAY.tutar) N.push(`tutar ${usd(t.net)} > ${usd(ONAY.tutar)}`); return N; }
const onayBekleyen = () => Object.values(SIP).filter(o => o.onay && o.onay.durum === 'bekliyor');
function onaySay() { const n = onayBekleyen().length, b = $('aside button.m[data-s=onaylar]'); if (!b) return; let r = b.querySelector('.say'); if (!r) { b.insertAdjacentHTML('beforeend', '<span class="say gizli"></span>'); r = b.querySelector('.say'); } r.textContent = n; r.classList.toggle('gizli', !n); }
const _durumYaz2 = durumYaz;
durumYaz = function (no, d) {
  const o = SIP[no], N = onayGerekli(o), ileri = ['onay', 'uretim', 'sevk'].includes(d);
  if (ileri && N.length && !(o.onay && o.onay.durum === 'onaylandi' && o.onay.imza === onayImza(o))) {
    if (yonetici()) { o.onay = { durum: 'onaylandi', neden: N, kim: kimAd(), zaman: Date.now(), imza: onayImza(o), otomatik: true }; }
    else { o.onay = { durum: 'bekliyor', neden: N, isteyen: kimAd(), zaman: Date.now(), hedefDurum: d }; yaz('exs-siparisler', SIP); onaySay(); toast('Bu sipariş yönetici onayı gerektiriyor: ' + N.join(', ') + '. Onaya gönderildi.'); return; }
  }
  _durumYaz2(no, d); onaySay();
};
const onayImza = o => { const t = tutarlar(o); return Math.round(t.net) + '|' + Math.round(t.oran * 10); };
function onaylar() {
  $('#baslik').textContent = 'Onay bekleyenler';
  const L = onayBekleyen(), G = Object.values(SIP).filter(o => o.onay && o.onay.durum !== 'bekliyor' && !o.onay.otomatik).sort((a, b) => (b.onay.karar || 0) - (a.onay.karar || 0)).slice(0, 20);
  $('#icerik').innerHTML = `<div class="kart"><h3>Onay kuralı</h3><div class="alt">Toplam iskontosu <b>${yuzde(ONAY.iskonto)}</b> üstünde veya net tutarı <b>${usd(ONAY.tutar)}</b> üstünde olan sipariş, temsilci onaylamak istediğinde yönetici onayına düşer. Yönetici onaylayınca sipariş istenen duruma geçer. ${yonetici() ? 'Kuralı Ayarlar’dan değiştirebilirsiniz.' : ''}</div></div>
    <div class="kart"><h3>Bekleyen talepler (${L.length})</h3>${L.length ? `<table class="tablo"><tr><th>Sipariş</th><th>Müşteri</th><th class="sag-hiza">Net</th><th class="sag-hiza">İskonto</th><th>Neden</th><th>İsteyen</th><th></th></tr>
      ${L.map(o => { const t = tutarlar(o); return `<tr><td><b class="tik" data-ac="${o.no}" style="cursor:pointer">${o.no}</b><div class="kucuk">${tarih(o.tarih)}</div></td><td>${esc(o.firma)}</td><td class="sag-hiza"><b>${usd(t.net)}</b></td><td class="sag-hiza">${yuzde(t.oran)}</td><td class="kucuk">${esc(o.onay.neden.join(', '))}</td><td class="kucuk">${esc(o.onay.isteyen)}<br>${new Date(o.onay.zaman).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td style="white-space:nowrap">${yonetici() ? `<button class="btn marka" data-on="${o.no}">Onayla</button> <button class="btn cizgi" data-red="${o.no}">Reddet</button>` : '<span class="kucuk">Yönetici bekleniyor</span>'}</td></tr>`; }).join('')}</table>` : '<div class="kucuk">Onay bekleyen sipariş yok.</div>'}</div>
    ${G.length ? `<div class="kart"><h3>Son kararlar</h3><table class="tablo"><tr><th>Sipariş</th><th>Karar</th><th>Karar veren</th><th>Not</th></tr>${G.map(o => `<tr><td>${o.no}</td><td><span class="durum ${o.onay.durum === 'onaylandi' ? 'd-onay' : 'd-iptal'}">${o.onay.durum === 'onaylandi' ? 'Onaylandı' : 'Reddedildi'}</span></td><td class="kucuk">${esc(o.onay.kim || '')} · ${o.onay.karar ? new Date(o.onay.karar).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</td><td class="kucuk">${esc(o.onay.not || '')}</td></tr>`).join('')}</table></div>` : ''}`;
  $$('[data-ac]').forEach(b => b.onclick = () => siparisAc(b.dataset.ac));
  $$('[data-on]').forEach(b => b.onclick = () => { const o = SIP[b.dataset.on]; const hd = o.onay.hedefDurum || 'onay'; o.onay = { ...o.onay, durum: 'onaylandi', kim: kimAd(), karar: Date.now(), imza: onayImza(o) }; yaz('exs-siparisler', SIP); durumYaz(o.no, hd); toast(o.no + ' onaylandı.'); onaylar(); });
  $$('[data-red]').forEach(b => b.onclick = () => { const o = SIP[b.dataset.red]; const n = prompt('Ret nedeni (temsilci görür):', '') || ''; o.onay = { ...o.onay, durum: 'reddedildi', kim: kimAd(), karar: Date.now(), not: n }; yaz('exs-siparisler', SIP); onaySay(); toast(o.no + ' reddedildi.'); onaylar(); });
}
// sipariş penceresinde onay durumu
const _siparisAc2 = siparisAc;
siparisAc = function (no) {
  _siparisAc2(no); const p = $$('.perde').pop(), o = SIP[no]; if (!p) return;
  const ekle = () => { if (p.querySelector('#pOnay')) return; const h = p.querySelector('h2'); if (!h) return; const N = onayGerekli(o);
    let m = ''; if (o.onay && o.onay.durum === 'bekliyor') m = `<div class="onay-b bekliyor">Yönetici onayı bekleniyor (${esc(o.onay.neden.join(', '))}) · isteyen ${esc(o.onay.isteyen)}</div>`;
    else if (o.onay && o.onay.durum === 'reddedildi') m = `<div class="onay-b red">Yönetici reddetti${o.onay.not ? ': ' + esc(o.onay.not) : ''} · ${esc(o.onay.kim)}</div>`;
    else if (o.onay && o.onay.durum === 'onaylandi') m = `<div class="onay-b ok">Yönetici onayı: ${esc(o.onay.kim)}${o.onay.imza !== onayImza(o) ? ' · iskonto/tutar değiştiği için yeniden onay gerekir' : ''}</div>`;
    else if (N.length) m = `<div class="onay-b bilgi">Onay kuralına takılıyor: ${esc(N.join(', '))}. ${yonetici() ? 'Yönetici olarak doğrudan onaylayabilirsiniz.' : 'Durumu ilerlettiğinizde yönetici onayına gider.'}</div>`;
    if (m) h.insertAdjacentHTML('afterend', `<div id="pOnay">${m}</div>`); };
  ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
};

// ---------- 11. fiyat geçmişi
let FGEC = oku('exs-fiyat-gecmis', []), FSUR = oku('exs-fiyat-surum', []);
const fgYaz = () => { yaz('exs-fiyat-gecmis', FGEC.slice(-2000)); yaz('exs-fiyat-surum', FSUR.slice(-30)); };
function surumKaydet(ad, oto) { FSUR.push({ ad, zaman: Date.now(), kim: kimAd(), fiyat: JSON.parse(JSON.stringify(FIYAT)), gizli: GIZLI.slice(), oto: !!oto }); fgYaz(); }
// FIYAT/GIZLI her yazıldığında farkı kaydet
let _fOnce = JSON.stringify(FIYAT), _gOnce = JSON.stringify(GIZLI);
const _urunYaz = urunYaz;
urunYaz = function (aciklama) {
  const eF = JSON.parse(_fOnce), eG = JSON.parse(_gOnce), z = Date.now(), kim = kimAd();
  VERI.urunler.forEach(u => u.secenek.forEach(s => { const a = (eF[u.ad] || {})[s.ad], b = (FIYAT[u.ad] || {})[s.ad], fa = a !== undefined ? a : s.fiyat, fb = b !== undefined ? b : s.fiyat; if (fa !== fb) FGEC.push({ z, kim, urun: u.ad, sec: s.ad, eski: fa, yeni: fb, not: aciklama || window._fNot || '' }); }));
  GIZLI.filter(a => !eG.includes(a)).forEach(a => FGEC.push({ z, kim, urun: a, sec: '', tip: 'gizle', not: 'Portalda gizlendi' }));
  eG.filter(a => !GIZLI.includes(a)).forEach(a => FGEC.push({ z, kim, urun: a, sec: '', tip: 'goster', not: 'Portalda gösterildi' }));
  _fOnce = JSON.stringify(FIYAT); _gOnce = JSON.stringify(GIZLI); window._fNot = ''; fgYaz(); _urunYaz();
};
function fiyatGecmisi() {
  const p = document.createElement('div'); p.className = 'perde'; p.onclick = e => { if (e.target === p) p.remove(); }; document.body.appendChild(p);
  const ciz = () => { const L = FGEC.slice().reverse().slice(0, 300);
    p.innerHTML = `<div class="pencere"><button class="kapat">×</button><h2 style="margin:0 0 4px">Fiyat geçmişi</h2><div class="kucuk" style="margin-bottom:14px">Her fiyat değişikliği kim, ne zaman, eski ve yeni fiyatla kaydedilir. Toplu değişikliklerden önce fiyat listesinin bir sürümü otomatik saklanır; istediğiniz sürüme geri dönebilirsiniz.</div>
      <div class="kart"><h3>Fiyat listesi sürümleri</h3><div style="display:flex;gap:8px;margin-bottom:10px"><input id="sAd" placeholder="Sürüm adı, örn. 2026 Kasım listesi" style="flex:1;padding:8px;border:1px solid var(--cizgi);border-radius:8px"><button class="btn marka" id="sKay">Şu anki listeyi kaydet</button></div>
        ${FSUR.length ? `<table class="tablo"><tr><th>Sürüm</th><th>Tarih</th><th>Kaydeden</th><th class="sag-hiza">Değişik fiyat</th><th></th></tr>${FSUR.map((s, i) => [s, i]).reverse().map(([s, i]) => `<tr><td><b>${esc(s.ad)}</b>${s.oto ? ' <span class="rozet">otomatik</span>' : ''}</td><td>${new Date(s.zaman).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${esc(s.kim)}</td><td class="sag-hiza">${Object.values(s.fiyat).reduce((a, x) => a + Object.keys(x).length, 0)}</td><td>${yonetici() ? `<button class="btn cizgi" data-don="${i}">Bu sürüme dön</button>` : ''}</td></tr>`).join('')}</table>` : '<div class="kucuk">Henüz sürüm yok.</div>'}</div>
      <div class="kart"><h3>Değişiklik kaydı</h3>${L.length ? `<table class="tablo"><tr><th>Tarih</th><th>Kim</th><th>Ürün</th><th>Seçenek</th><th class="sag-hiza">Eski</th><th class="sag-hiza">Yeni</th><th class="sag-hiza">Fark</th><th>Not</th></tr>${L.map(g => `<tr><td class="kucuk">${new Date(g.z).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</td><td class="kucuk">${esc(g.kim)}</td><td><b>${esc(g.urun)}</b></td><td>${esc(g.sec)}</td>
        <td class="sag-hiza">${g.tip ? '' : g.eski == null ? 'teklif' : usd(g.eski)}</td><td class="sag-hiza">${g.tip ? '' : g.yeni == null ? 'teklif' : '<b>' + usd(g.yeni) + '</b>'}</td><td class="sag-hiza">${g.eski && g.yeni ? `<span style="color:${g.yeni > g.eski ? 'var(--kotu)' : 'var(--iyi)'}">${g.yeni > g.eski ? '+' : ''}${yuzde((g.yeni - g.eski) / g.eski * 100)}</span>` : ''}</td><td class="kucuk">${esc(g.not || '')}</td></tr>`).join('')}</table>` : '<div class="kucuk">Henüz fiyat değişikliği yok.</div>'}</div></div>`;
    p.querySelector('.kapat').onclick = () => { p.remove(); if (aktif === 'urunler') urunler(); };
    p.querySelector('#sKay').onclick = () => { const a = p.querySelector('#sAd').value.trim() || 'Sürüm ' + new Date().toLocaleDateString('tr-TR'); surumKaydet(a); toast('Fiyat listesi sürümü kaydedildi.'); ciz(); };
    p.querySelectorAll('[data-don]').forEach(b => b.onclick = () => { const s = FSUR[+b.dataset.don]; if (!confirm(`“${s.ad}” sürümüne dönülsün mü? Şu anki liste önce otomatik kaydedilir.`)) return; surumKaydet('Geri dönüş öncesi', true); FIYAT = JSON.parse(JSON.stringify(s.fiyat)); GIZLI = s.gizli.slice(); window._fNot = '“' + s.ad + '” sürümüne dönüldü'; urunYaz(); toast('Fiyat listesi geri yüklendi.'); ciz(); });
  };
  ciz();
}
const _urunler2 = urunler;
urunler = function () {
  _urunler2();
  $('#ustSag').insertAdjacentHTML('afterbegin', '<button class="btn cizgi" id="uGec">Fiyat geçmişi</button>'); $('#uGec').onclick = fiyatGecmisi;
  if (!yonetici()) { $$('.u-fiyat input,#tOran,#tArt,#tAzl,#tSif,[data-gz],#tGiz,#tGos').forEach(x => x.disabled = true); $('#icerik').insertAdjacentHTML('afterbegin', '<div class="onay-b bilgi" style="margin-bottom:12px">Fiyat ve görünürlük değişikliklerini yalnız yöneticiler yapabilir.</div>'); }
  // toplu işlemlerden önce otomatik sürüm + açıklama
  ['tArt', 'tAzl', 'tSif'].forEach(id => { const b = $('#' + id); if (!b) return; const f = b.onclick; b.onclick = () => { if (!SEC.size) return f(); surumKaydet('Toplu değişiklik öncesi', true); window._fNot = 'Toplu: ' + b.textContent + ($('#tOran').value ? ' %' + $('#tOran').value : ''); f(); }; });
};

// ---------- 12. bayiye bildirim (WhatsApp / e-posta)
let BLD = oku('exs-bildirim', []);
function bildirimMetni(o) {
  const d = DURUM[o.durum][0], t = tutarlar(o);
  return [`Sayın ${o.ad || o.firma},`, ``, `${o.no} numaralı siparişinizin durumu: *${d}*.`, o.termin ? `Tahmini teslim: ${tarih(o.termin)}` : '', o.kargo ? `Nakliye: ${o.kargo}${o.takip ? ' · Takip no: ' + o.takip : ''}` : '', o.satisNot ? `Not: ${o.satisNot}` : '', `Sipariş tutarı: ${usd(t.net)}`, ``, `Bayi portalındaki “Siparişlerim” ekranından ayrıntıları görebilirsiniz.`, ``, `EXIT Garden Satış Ekibi`].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}
const telTemiz = t => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '9' + d; else if (d.length === 10) d = '90' + d; return d; };
function bildirimGonder(o, kanal) {
  const m = MUS[o.kul] || {}, metin = bildirimMetni(o);
  if (kanal === 'wa') { const tel = telTemiz(m.tel); if (tel.length < 11) return toast('Müşterinin geçerli telefonu yok.'); window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(metin), '_blank'); }
  else { if (!m.mail) return toast('Müşterinin e-posta adresi yok.'); location.href = 'mailto:' + encodeURIComponent(m.mail) + '?subject=' + encodeURIComponent(`EXIT Garden · ${o.no} sipariş durumu: ${DURUM[o.durum][0]}`) + '&body=' + encodeURIComponent(metin.replace(/\*/g, '')); }
  BLD.push({ no: o.no, kul: o.kul, kanal, durum: o.durum, zaman: Date.now(), kim: kimAd() }); yaz('exs-bildirim', BLD.slice(-1000)); o.sonBildirim = o.durum; yaz('exs-siparisler', SIP);
}
const _siparisAc3 = siparisAc;
siparisAc = function (no) {
  _siparisAc3(no); const p = $$('.perde').pop(), o = SIP[no]; if (!p) return;
  const ekle = () => { if (p.querySelector('#pBild')) return; const k = p.querySelector('#pTeklif'); if (!k) return; const m = MUS[o.kul] || {}, son = BLD.filter(b => b.no === o.no).pop(), bekl = o.sonBildirim !== o.durum && o.durum !== 'yeni';
    k.insertAdjacentHTML('afterend', `<div id="pBild" class="bild ${bekl ? 'bekl' : ''}"><div><b>Bayiye bildir</b><div class="kucuk">${bekl ? 'Durum değişti; bayiye henüz bildirilmedi.' : son ? `Son bildirim: ${son.kanal === 'wa' ? 'WhatsApp' : 'E-posta'} · ${new Date(son.zaman).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })} · ${esc(son.kim)}` : 'Hazır mesaj sipariş durumu, termin ve nakliye bilgisini içerir.'}</div></div>
      <button class="btn wa" id="bWa" ${m.tel ? '' : 'disabled title="Telefon yok"'}>WhatsApp</button><button class="btn cizgi" id="bMail" ${m.mail ? '' : 'disabled title="E-posta yok"'}>E-posta</button></div>`);
    p.querySelector('#bWa').onclick = () => { bildirimGonder(o, 'wa'); p.querySelector('#pBild').remove(); ekle(); };
    p.querySelector('#bMail').onclick = () => { bildirimGonder(o, 'mail'); p.querySelector('#pBild').remove(); ekle(); }; };
  ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
};

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
const _musteriKarti = musteriKarti;
musteriKarti = function (kul) {
  _musteriKarti(kul); const p = $$('.perde').pop(); if (!p) return;
  const ekle = () => { if (p.querySelector('#mTem')) return; const h = p.querySelector('h2'); if (!h) return; const m = MUS[kul] || {};
    h.insertAdjacentHTML('afterend', `<div id="mTem" class="kucuk" style="margin:4px 0">Temsilci: <select id="mTemS" ${yonetici() ? '' : 'disabled'} style="padding:4px 6px;border:1px solid var(--cizgi);border-radius:6px"><option value="">— atanmadı —</option>${Object.values(KUL).map(u => `<option value="${esc(u.kul)}" ${m.temsilci === u.kul ? 'selected' : ''}>${esc(u.ad || u.kul)}</option>`).join('')}</select> · Bölge: <b>${bolgeBul(m.sehir)}</b></div>`);
    p.querySelector('#mTemS').onchange = e => { MUS[kul] = { ...(MUS[kul] || { kul }), temsilci: e.target.value }; yaz('exs-musteriler', MUS); toast('Temsilci atandı.'); }; };
  ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
};

// ---------- ayarlar: roller ve onay kuralı
const _ayarlar2 = ayarlar;
ayarlar = function () {
  _ayarlar2();
  $$('[data-sil]').forEach(b => { if (!yonetici()) b.disabled = true; });
  const tb = $$('#icerik .kart').find(k => k.textContent.includes('Satış ekibi kullanıcıları'));
  if (tb) tb.querySelectorAll('table tr').forEach(r => { const kul = (r.querySelector('td b') || {}).textContent; if (!kul || !KUL[kul]) return; r.children[0].insertAdjacentHTML('beforeend', yonetici() && kul !== ben.kul ? ` <select data-rol="${esc(kul)}" style="padding:3px 6px;border:1px solid var(--cizgi);border-radius:6px;font-size:12px">${Object.entries(ROL_AD).map(([k, a]) => `<option value="${k}" ${rolu(KUL[kul]) === k ? 'selected' : ''}>${a}</option>`).join('')}</select>` : ` <span class="rozet">${ROL_AD[rolu(KUL[kul])]}</span>`); });
  $$('[data-rol]').forEach(s => s.onchange = () => { KUL[s.dataset.rol].rol = s.value; yaz('exs-kullanicilar', KUL); toast('Rol güncellendi.'); });
  $('#icerik .izgara2').insertAdjacentHTML('afterbegin', `<div class="kart"><h3>Onay kuralı</h3><div class="alt">Bu sınırları aşan siparişleri temsilci ilerletmek istediğinde yönetici onayı gerekir. Yöneticiler kendi işlemlerinde doğrudan onaylar.</div>
    <div style="display:flex;gap:8px;align-items:end"><div class="alan" style="flex:1"><label>Toplam iskonto % üstü</label><input id="oIsk" value="${ONAY.iskonto}" inputmode="decimal" ${yonetici() ? '' : 'disabled'}></div><div class="alan" style="flex:1"><label>Net tutar $ üstü</label><input id="oTut" value="${ONAY.tutar}" inputmode="numeric" ${yonetici() ? '' : 'disabled'}></div>
    ${yonetici() ? '<div class="alan"><button class="btn marka" id="oKay">Kaydet</button></div>' : ''}</div></div>`);
  if ($('#oKay')) $('#oKay').onclick = () => { ONAY = { iskonto: Math.max(0, parseFloat($('#oIsk').value.replace(',', '.')) || 0), tutar: Math.max(0, parseFloat($('#oTut').value.replace(/\./g, '')) || 0) }; yaz('exs-onay-ayar', ONAY); toast('Onay kuralı kaydedildi.'); };
};
// yeni kullanıcıya rol ataması: varsayılan temsilci (rolu() bunu çözer)

// ---------- menü
const _git4 = git;
git = function (s) { const S = { onaylar: ['Onay bekleyenler', onaylar], hedefler: ['Hedefler', hedefler] }[s]; if (S) { try { $('#yol').textContent = 'Satış Yönetimi  /  ' + S[0]; } catch (e) {} aktif = s; $$('aside button.m[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = ''; S[1](); window.scrollTo(0, 0); } else _git4(s); onaySay(); };
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
const _ac2 = ac; ac = function () { _ac2(); onaySay(); try { $('#kim span').textContent = ROL_AD[rolu(ben)] + ' · ' + new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {} };
