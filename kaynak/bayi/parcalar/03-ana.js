
const VERI = /*@katalog*/null;
const ISKELET = [
  {kod:'Granit',ad:'Granit',ornek:'radial-gradient(circle at 20% 30%,#9a9a96 1px,transparent 1.5px) 0 0/6px 6px,radial-gradient(circle at 70% 60%,#4b4b48 1px,transparent 1.5px) 0 0/7px 7px,#76766f'},
  {kod:'Seramik',ad:'Seramik',ornek:'radial-gradient(circle at 30% 40%,#bdb5a5 1px,transparent 1.6px) 0 0/8px 8px,#d9d3c6'},
  {kod:'RAL 1013',ad:'Krem',ornek:'#EAE6CA'},
  {kod:'RAL 9016',ad:'Beyaz',ornek:'#F6F6F2'},
  {kod:'RAL 7006',ad:'Cappuccino',ornek:'#75695C'},
  {kod:'RAL 7016',ad:'Antrasit',ornek:'#383E42'},
  {kod:'RAL 9005',ad:'Siyah',ornek:'#0E0E10'}];
const FILE = [
  {kod:'Terra 01',ad:'Beyaz',ornek:'repeating-linear-gradient(45deg,#f4f4f0 0 2px,#dcdcd6 2px 3px)'},
  {kod:'Terra 05',ad:'Siyah',ornek:'repeating-linear-gradient(45deg,#1c1c1c 0 2px,#3a3a3a 2px 3px)'},
  {kod:'Terra 02',ad:'Krem',ornek:'repeating-linear-gradient(45deg,#e8dec8 0 2px,#cfc3a8 2px 3px)'},
  {kod:'Terra 03',ad:'Cappuccino',ornek:'repeating-linear-gradient(45deg,#8c7b66 0 2px,#6d5f4e 2px 3px)'},
  {kod:'Terra 04',ad:'Antrasit',ornek:'repeating-linear-gradient(45deg,#41464a 0 2px,#2c3033 2px 3px)'},
  {kod:'Crome',ad:'Krom',ornek:'linear-gradient(135deg,#8e9499,#eef1f4 40%,#9aa1a7 60%,#e2e6ea)'}];
const KUMAS = ['BG03','BG06','BG09','BG07','BG14','BG16'].map(k => ({kod:k, ad:k, ornek:`url(${VERI.kumas[k]})`}));
const KATSIRA = ['Oturma Grupları','Sandalyeler','Bar Sandalyeleri','Masalar','Bar Masaları','Sehpalar','Banklar','Şezlonglar','Aile Paketleri'];

// ---------- yardımcılar
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const para = n => n == null ? '—' : n.toLocaleString('tr-TR') + ' $';
const oku = (k, v) => { try { const x = localStorage.getItem(k); return x ? JSON.parse(x) : v; } catch (e) { return v; } };
const yaz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Kayıt yapılamadı: tarayıcı depolaması kapalı.'); } };

// exitgarden.com HD görselleri: internet varsa sitedeki büyük görsel yüklenir, yoksa gömülü görsel kalır
(function hdGorsel() {
  if (window.EXIT_WEB) return; // web sitesinde katalogun kendi WebP görselleri kullanılır (61 büyük JPEG indirilmez)
  let bekleyen = 0, yenile = null;
  VERI.urunler.forEach(u => {
    if (!u.site) return; const url = 'https://www.exitgarden.com/pic/product/' + u.site + '.jpg';
    const im = new Image(); bekleyen++;
    im.onload = () => { if (im.naturalWidth >= 600) { u.gorsel = url; clearTimeout(yenile); yenile = setTimeout(() => { try { if (ben) katalog(); } catch (e) {} }, 400); } };
    im.src = url;
  });
})();
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function sha256hex(str){const b=new TextEncoder().encode(str),K=[],H=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];let n=2,c=0;while(c<64){let p=1;for(let d=2;d*d<=n;d++)if(n%d===0){p=0;break}if(p){K[c++]=(Math.pow(n,1/3)%1)*4294967296|0}n++}
const l=b.length,m=new Uint8Array(((l+9+63)>>6)<<6);m.set(b);m[l]=128;const bl=l*8;m[m.length-4]=bl>>>24;m[m.length-3]=bl>>>16&255;m[m.length-2]=bl>>>8&255;m[m.length-1]=bl&255;const w=new Array(64),r=(x,y)=>x>>>y|x<<(32-y);
for(let i=0;i<m.length;i+=64){for(let t=0;t<16;t++)w[t]=m[i+4*t]<<24|m[i+4*t+1]<<16|m[i+4*t+2]<<8|m[i+4*t+3];for(let t=16;t<64;t++){const s0=r(w[t-15],7)^r(w[t-15],18)^w[t-15]>>>3,s1=r(w[t-2],17)^r(w[t-2],19)^w[t-2]>>>10;w[t]=w[t-16]+s0+w[t-7]+s1|0}
let[a,b2,c2,d,e,f,g,h]=H;for(let t=0;t<64;t++){const t1=h+(r(e,6)^r(e,11)^r(e,25))+(e&f^~e&g)+K[t]+w[t]|0,t2=(r(a,2)^r(a,13)^r(a,22))+(a&b2^a&c2^b2&c2)|0;h=g;g=f;f=e;e=d+t1|0;d=c2;c2=b2;b2=a;a=t1+t2|0}
H[0]=H[0]+a|0;H[1]=H[1]+b2|0;H[2]=H[2]+c2|0;H[3]=H[3]+d|0;H[4]=H[4]+e|0;H[5]=H[5]+f|0;H[6]=H[6]+g|0;H[7]=H[7]+h|0}return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('')}
async function ozet(s) { return sha256hex('exitbayi:' + s); }
const eskiOzet = s => { let h = 5381; for (const c of 'exitbayi:' + s) h = (h * 33 ^ c.charCodeAt(0)) >>> 0; return 'h' + h.toString(16); };

// ===== kampanya / sezon indirimi (satış panelinden tanımlanır) =====
let KMP = [];
const benKul = () => { try { return ben ? ben.kul : ''; } catch (e) { return ''; } };
const bugunStr = () => new Date().toISOString().slice(0, 10);
const kmpGecerli = k => k.aktif !== false && (!k.bas || k.bas <= bugunStr()) && (!k.bit || k.bit >= bugunStr());
function kmpBul(u) { let en = null; KMP.filter(kmpGecerli).filter(k => !(k.bayiler || []).length || (benKul() && k.bayiler.includes(benKul()))).forEach(k => { const uy = k.kapsam === 'tumu' || (k.kapsam === 'kategori' && (k.hedef || []).includes(u.kategori)) || (k.kapsam === 'urun' && (k.hedef || []).includes(u.ad)); if (uy && (!en || k.oran > en.oran)) en = k; }); return en; }
function kampanyaUygula() {
  KMP = oku('exb-kampanya', []) || []; const FY = oku('exb-fiyat', {}) || {}, GZ = oku('exb-gizli', []) || [];
  if (!VERI._tum) VERI._tum = VERI.urunler.slice(); VERI.urunler = VERI._tum.filter(u => !GZ.includes(u.ad));
  VERI.urunler.forEach(u => { const k = kmpBul(u); u.kmp = k ? { ad: k.ad, oran: k.oran, bit: k.bit } : null;
    u.secenek.forEach(s => { if (s.orj === undefined) s.orj = s.fiyat; const f = (FY[u.ad] || {})[s.ad]; s.liste = f != null && f !== '' ? +f : s.orj; s.fiyat = s.liste == null ? null : k ? Math.round(s.liste * (1 - k.oran / 100)) : s.liste; }); });
}
const kmpImza = () => JSON.stringify([oku('exb-kampanya', []), oku('exb-fiyat', {}), oku('exb-gizli', []), benKul()]);
let _kmpSon = '';
function kampanyaKontrol() { const i = kmpImza(); if (i === _kmpSon) return; const ilk = !_kmpSon; _kmpSon = i; kampanyaUygula(); if (!ilk && benKul()) { try { if (!$('#s-katalog').classList.contains('gizli')) katalog(); } catch (e) {} toast('Fiyatlar ve kampanyalar güncellendi.'); } }
kampanyaKontrol(); setInterval(kampanyaKontrol, 15000);
const listeDusuk = u => { const f = u.secenek.filter(s => !/Aksesuar/.test(s.sinif)).map(s => s.liste).filter(x => x != null); return f.length ? Math.min(...f) : null; };
const enDusuk = u => { const f = u.secenek.filter(s => !/Aksesuar/.test(s.sinif)).map(s => s.fiyat).filter(x => x != null); return f.length ? Math.min(...f) : null; };

// ---------- kullanıcılar
let KUL = oku('exb-kullanicilar', null), ben = null;
async function kurulum() {
  if (!KUL) { KUL = {}; yaz('exb-kullanicilar', KUL); }
}
$$('.sekme button').forEach(b => b.onclick = () => { $$('.sekme button').forEach(x => x.classList.toggle('on', x === b)); $('#fGiris').classList.toggle('gizli', b.dataset.s !== 'giris'); $('#fKayit').classList.toggle('gizli', b.dataset.s !== 'kayit'); });
$('#fGiris').onsubmit = async e => {
  e.preventDefault(); const k = $('#gKul').value.trim().toLowerCase(), u = KUL[k];
  if (!u || u.sifre !== await ozet($('#gSif').value)) { $('#gHata').textContent = 'Kullanıcı adı veya şifre hatalı.'; return; }
  if (u.rol !== 'musteri') { $('#gHata').textContent = 'Bu uygulama yalnız müşteri hesapları içindir.'; return; }
  if (u.durum === 'pasif') { $('#gHata').textContent = 'Hesabınız pasif. EXIT Garden satış ekibiyle iletişime geçin.'; return; }
  $('#gHata').textContent = ''; girisYap(u);
};
$('#fKayit').onsubmit = async e => {
  e.preventDefault(); const k = $('#kKul').value.trim().toLowerCase(), s = $('#kSif').value;
  if (!/^[a-z0-9._-]{3,}$/.test(k)) return $('#kHata').textContent = 'Kullanıcı adı en az 3 karakter olmalı (harf, rakam, . _ -).';
  if (KUL[k]) return $('#kHata').textContent = 'Bu kullanıcı adı alınmış.';
  if (s.length < 6) return $('#kHata').textContent = 'Şifre en az 6 karakter olmalı.';
  KUL[k] = { kul:k, firma:$('#kFirma').value.trim(), ad:$('#kAd').value.trim(), tel:$('#kTel').value.trim(), mail:$('#kMail').value.trim(), sehir:$('#kSehir').value.trim(), vergi:$('#kVergi').value.trim(), rol:'musteri', durum:'aktif', sifre: await ozet(s), tarih: Date.now() };
  yaz('exb-kullanicilar', KUL); toast('Kaydınız oluşturuldu, hoş geldiniz.'); girisYap(KUL[k]);
};
function girisYap(u) {
  ben = u; try { sessionStorage.setItem('exb-oturum', u.kul); } catch (e) {}
  $('#giris').classList.add('gizli'); $('#uyg').classList.remove('gizli');
  $('#hKim').textContent = u.firma || u.ad; try { $('#hAv').textContent = String(u.firma || u.ad || '?').trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR'); } catch (e) {}
  try { $('#bTarih').textContent = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }); } catch (e) {}
  sepetSay(); git('katalog');
}
$('#hCikis').onclick = () => { try { sessionStorage.removeItem('exb-oturum'); } catch (e) {} ben = null; $('#uyg').classList.add('gizli'); $('#giris').classList.remove('gizli'); $('#gSif').value = ''; $('.sekme button[data-s=giris]').click(); };

// ---------- gezinme
function git(s) {
  ['katalog','siparisler'].forEach(x => $('#s-' + x).classList.toggle('gizli', x !== s));
  if (s === 'katalog') katalog(); if (s === 'siparisler') siparislerim();
  window.scrollTo(0, 0);
}
$$('[data-git]').forEach(b => b.onclick = () => git(b.dataset.git));

// ---------- katalog ve filtreler
const F = { kat:'', sinif:new Set(), min:'', max:'', ara:'', sira:'ad', fiyatli:false, kmp:false };
function uygun(u, haric) {
  if (haric !== 'kat' && F.kat && u.kategori !== F.kat) return false;
  if (haric !== 'sinif' && F.sinif.size && !u.secenek.some(s => F.sinif.has(s.sinif))) return false;
  const d = enDusuk(u);
  if (F.min !== '' && (d == null || Math.max(...u.secenek.map(s => s.fiyat || 0)) < +F.min)) return false;
  if (F.max !== '' && (d == null || d > +F.max)) return false;
  if (F.fiyatli && d == null) return false;
  if (F.kmp && !u.kmp) return false;
  if (F.ara) { const q = F.ara.toLocaleLowerCase('tr'); if (!(u.ad + ' ' + u.kategori + ' ' + u.secenek.map(s => s.ad + ' ' + s.sinif).join(' ')).toLocaleLowerCase('tr').includes(q)) return false; }
  return true;
}
function ustFiltre() {
  const katlar = [...new Set(VERI.urunler.map(u => u.kategori))];
  const tipler = [...new Set(VERI.urunler.filter(u => uygun(u, 'sinif')).flatMap(u => u.secenek.map(s => s.sinif)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const tek = F.sinif.size === 1 ? [...F.sinif][0] : '';
  $('#ustKat').innerHTML = `<option value="">Tüm kategoriler</option>` + katlar.map(k => `<option ${F.kat === k ? 'selected' : ''}>${esc(k)}</option>`).join('');
  $('#ustSin').innerHTML = `<option value="">${F.sinif.size > 1 ? F.sinif.size + ' ürün tipi seçili' : 'Tüm ürün tipleri'}</option>` + tipler.map(k => `<option ${tek === k ? 'selected' : ''}>${esc(k)}</option>`).join('');
}
$('#ustKat').onchange = e => { F.kat = e.target.value; F.sinif.clear(); katalog(); };
$('#ustSin').onchange = e => { F.sinif.clear(); if (e.target.value) F.sinif.add(e.target.value); katalog(); };
function katalog() {
  ustFiltre();
  const katlar = KATSIRA.filter(k => VERI.urunler.some(u => u.kategori === k));
  $('#katNav').innerHTML = `<button data-k="" class="${F.kat ? '' : 'on'}">Tümü</button>` + katlar.map(k => `<button data-k="${esc(k)}" class="${F.kat === k ? 'on' : ''}">${esc(k)}</button>`).join('');
  $$('#katNav button').forEach(b => b.onclick = () => { F.kat = b.dataset.k; F.sinif.clear(); katalog(); });
  // filtre paneli
  const siniflar = {}; VERI.urunler.filter(u => uygun(u, 'sinif')).forEach(u => new Set(u.secenek.map(s => s.sinif)).forEach(s => { if (s !== '—') siniflar[s] = (siniflar[s] || 0) + 1; }));
  const katSay = {}; VERI.urunler.filter(u => uygun(u, 'kat')).forEach(u => katSay[u.kategori] = (katSay[u.kategori] || 0) + 1);
  $('#filtre').innerHTML = `
    <div class="f-grup"><h4>Kategori</h4>${katlar.map(k => `<label class="f-sec"><input type="radio" name="fk" value="${esc(k)}" ${F.kat === k ? 'checked' : ''}> ${esc(k)}<span class="n">${katSay[k] || 0}</span></label>`).join('')}
      <label class="f-sec"><input type="radio" name="fk" value="" ${F.kat ? '' : 'checked'}> Tümü</label></div>
    <div class="f-grup"><h4>Ürün tipi</h4>${Object.keys(siniflar).sort((a,b)=>a.localeCompare(b,'tr')).map(s => `<label class="f-sec"><input type="checkbox" value="${esc(s)}" ${F.sinif.has(s) ? 'checked' : ''}> ${esc(s)}<span class="n">${siniflar[s]}</span></label>`).join('') || '<span class="kucuk">—</span>'}</div>
    <div class="f-grup"><h4>Fiyat (USD)</h4><div class="ikili"><input class="fi" id="fMin" placeholder="En az" value="${F.min}" inputmode="numeric" style="padding:8px;border:1px solid var(--cizgi);border-radius:8px;width:100%"><input id="fMax" placeholder="En çok" value="${F.max}" inputmode="numeric" style="padding:8px;border:1px solid var(--cizgi);border-radius:8px;width:100%"></div>
      <label class="f-sec" style="margin-top:8px"><input type="checkbox" id="fFiyatli" ${F.fiyatli ? 'checked' : ''}> Yalnız fiyatı olanlar</label><label class="f-sec"><input type="checkbox" id="fKmp" ${F.kmp ? 'checked' : ''}> Yalnız kampanyalı ürünler</label></div>
    <div class="f-grup"><button class="btn cizgi tam" id="fTemizle">Filtreleri temizle</button></div>`;
  $$('#filtre input[name=fk]').forEach(i => i.onchange = () => { F.kat = i.value; F.sinif.clear(); katalog(); });
  $$('#filtre input[type=checkbox][value]').forEach(i => i.onchange = () => { i.checked ? F.sinif.add(i.value) : F.sinif.delete(i.value); katalog(); });
  $('#fMin').onchange = e => { F.min = e.target.value.replace(/\D/g, ''); katalog(); };
  $('#fMax').onchange = e => { F.max = e.target.value.replace(/\D/g, ''); katalog(); };
  $('#fFiyatli').onchange = e => { F.fiyatli = e.target.checked; katalog(); };
  $('#fKmp').onchange = e => { F.kmp = e.target.checked; katalog(); };
  $('#fTemizle').onclick = () => { Object.assign(F, { kat:'', min:'', max:'', ara:'', fiyatli:false, kmp:false }); F.sinif.clear(); $('#ara').value = ''; katalog(); };
  // etiketler
  const et = []; if (F.kat) et.push(['kat', F.kat]); F.sinif.forEach(s => et.push(['sinif', s])); if (F.min) et.push(['min', 'En az ' + F.min + ' $']); if (F.max) et.push(['max', 'En çok ' + F.max + ' $']); if (F.ara) et.push(['ara', '“' + F.ara + '”']);
  $('#etiketler').innerHTML = et.map(([t, v], i) => `<span class="etiket">${esc(v)}<button data-i="${i}">×</button></span>`).join('');
  $$('#etiketler button').forEach(b => b.onclick = () => { const [t, v] = et[+b.dataset.i]; if (t === 'sinif') F.sinif.delete(v); else if (t === 'ara') { F.ara = ''; $('#ara').value = ''; } else F[t] = ''; katalog(); });
  // liste
  let L = VERI.urunler.filter(u => uygun(u));
  const fy = u => enDusuk(u) ?? 1e9;
  L.sort(F.sira === 'artan' ? (a, b) => fy(a) - fy(b) : F.sira === 'azalan' ? (a, b) => (enDusuk(b) ?? -1) - (enDusuk(a) ?? -1) : (a, b) => a.ad.localeCompare(b.ad, 'tr'));
  const AK = KMP.filter(kmpGecerli); let bant = $('#kmpBant'); if (!bant) { $('#etiketler').insertAdjacentHTML('beforebegin', '<div id="kmpBant"></div>'); bant = $('#kmpBant'); }
  bant.innerHTML = AK.length ? `<div class="kmp-ust"><div><b>Kampanyalar</b>${AK.map(k => `<span>${esc(k.ad)}: <b>%${k.oran}</b> ${k.kapsam === 'tumu' ? 'tüm ürünlerde' : esc((k.hedef || []).slice(0, 3).join(', ')) + ((k.hedef || []).length > 3 ? '…' : '')}${k.bit ? ' · ' + tarih(k.bit) + '\'e kadar' : ''}</span>`).join('')}</div><button class="btn cizgi" id="kmpGoster">${F.kmp ? 'Tüm ürünler' : 'Kampanyalı ürünleri göster'}</button></div>` : '';
  if ($('#kmpGoster')) $('#kmpGoster').onclick = () => { F.kmp = !F.kmp; katalog(); };
  $('#baslik').textContent = F.kmp ? 'Kampanyalı ürünler' : F.kat || 'Tüm ürünler'; $('#say').textContent = L.length + ' ürün';
  $('#izgara').innerHTML = L.map((u, i) => { const d = enDusuk(u); return `<div class="kart" data-id="${u.id}" style="animation:gYuz .5s ${Math.min(i, 12) * 30}ms backwards">
      <div class="foto ${u.gorsel ? '' : 'bos'}" style="${u.gorsel ? `background-image:url(${u.gorsel})` : ''}">${u.gorsel ? '' : 'Görsel yok'}<span class="k-kat">${esc(u.kategori)}</span>${u.kmp ? `<span class="k-kmp">%${u.kmp.oran} indirim</span>` : ''}</div>
      <div class="govde"><b>${esc(u.ad)}</b><span class="sec">${u.secenek.length ? u.secenek.length + ' seçenek' : 'Fiyat için bize ulaşın'}</span>
      <div class="fiyat">${d == null ? '<small>Fiyat sorunuz</small>' : (u.secenek.length > 1 ? '<small>başlayan </small>' : '') + (u.kmp ? `<s class="eski">${para(listeDusuk(u))}</s> <span class="yeni">${para(d)}</span>` : para(d))}</div>${u.kmp ? `<div class="kmp-ad">${esc(u.kmp.ad)}${u.kmp.bit ? ' · ' + tarih(u.kmp.bit) + '\'e kadar' : ''}</div>` : ''}</div></div>`; }).join('') || '<div class="bos-durum">Bu filtrelere uyan ürün yok.</div>';
  $$('#izgara .kart').forEach(k => k.onclick = () => urunAc(+k.dataset.id));
  $('#filtre').classList.remove('acik');
}
$('#ara').oninput = e => { F.ara = e.target.value.trim(); if ($('#s-katalog').classList.contains('gizli')) git('katalog'); else katalog(); };
$('#katPdf').onclick = () => katalogIndir();
$('#sirala').onchange = e => { F.sira = e.target.value; katalog(); };
$('#mFiltre').onclick = () => $('#filtre').classList.add('acik');

// ---------- hangi ürüne hangi renk seçimi
function ihtiyac(u, s) {
  const t = ((s && s.ad) || '').toLocaleLowerCase('tr'), k = u.kategori;
  const pedli = /ped|minder/.test(t) || /minder/i.test(u.ad);
  const kumas = k === 'Oturma Grupları' || k === 'Aile Paketleri' || pedli;
  const file = /file/.test(t) || (['Sandalyeler', 'Bar Sandalyeleri', 'Şezlonglar'].includes(k) && !pedli);
  return { iskelet: true, file, kumas, fitil: kumas };
}

// ---------- ürün penceresi
function urunAc(id) {
  const u = VERI.urunler.find(x => x.id === id);
  const S = { sec: u.secenek[0] || null, iskelet: null, file: null, kumas: null, fitil: null, adet: 1, not: '' };
  const perde = document.createElement('div'); perde.className = 'perde';
  perde.onclick = e => { if (e.target === perde) perde.remove(); };
  document.body.appendChild(perde);
  const renkGrup = (ad, liste, alan, no, alt) => `<div class="adim"><h4><i>${no}</i>${ad}<em>${S[alan] ? esc(liste.find(x => x.kod === S[alan]).ad + (S[alan] !== liste.find(x => x.kod === S[alan]).ad ? ' · ' + S[alan] : '')) : alt}</em></h4>
    <div class="renkler">${liste.map(r => `<button class="renk ${S[alan] === r.kod ? 'on' : ''}" data-a="${alan}" data-k="${esc(r.kod)}"><div class="ornek" style="background:${r.ornek}"></div><b>${esc(r.ad)}</b>${r.ad !== r.kod ? `<small>${esc(r.kod)}</small>` : ''}</button>`).join('')}</div></div>`;
  function ciz() {
    const ih = ihtiyac(u, S.sec);
    ['file', 'kumas', 'fitil'].forEach(a => { if (!ih[a]) S[a] = null; });
    let no = 1; const eksik = [];
    if (u.secenek.length && !S.sec) eksik.push('seçenek');
    if (!S.iskelet) eksik.push('iskelet rengi'); if (ih.file && !S.file) eksik.push('file rengi'); if (ih.kumas && !S.kumas) eksik.push('kumaş'); if (ih.fitil && !S.fitil) eksik.push('fitil rengi');
    const birim = S.sec ? S.sec.fiyat : null;
    const isk = ISKELET.find(x => x.kod === S.iskelet), fl = FILE.find(x => x.kod === S.file);
    perde.innerHTML = `<div class="pencere" style="position:relative"><button class="kapat" aria-label="Kapat">×</button>
      <div class="p-foto"><div class="buyuk" title="360° görünüm için tıklayın" style="cursor:zoom-in;position:relative;${u.gorsel ? `background-image:url(${u.gorselB || u.gorsel})` : 'background:var(--yuzey2)'}">${u.gorsel ? '<span class="r360">360°</span>' : ''}</div>
        <div class="ozet"><div><span>Ürün</span><b>${esc(u.ad)}</b></div><div><span>Seçenek</span><b>${S.sec ? esc(S.sec.ad) : '—'}</b></div>
        <div><span>İskelet</span><b>${isk ? esc(isk.ad + ' · ' + isk.kod) : '—'}</b></div>
        ${ih.file ? `<div><span>File</span><b>${fl ? esc(fl.ad + ' · ' + fl.kod) : '—'}</b></div>` : ''}
        ${ih.kumas ? `<div><span>Kumaş</span><b>${S.kumas || '—'}</b></div><div><span>Fitil</span><b>${S.fitil || '—'}</b></div>` : ''}
        <div><span>Adet</span><b>${S.adet}</b></div></div>
        <p class="kucuk">Renkler ekranda temsilidir; kesin ton için kartelaya bakınız.</p></div>
      <div class="p-bilgi"><span class="kucuk">${esc(u.kategori)}</span><h2>${esc(u.ad)}</h2>${u.kmp ? `<div class="kmp-bant"><b>%${u.kmp.oran} kampanya</b> · ${esc(u.kmp.ad)}${u.kmp.bit ? ` · ${tarih(u.kmp.bit)} tarihine kadar geçerli` : ''}</div>` : ''}<p class="aciklama">${esc(u.aciklama || '')}</p>${teknikHtml(u)}
        ${u.secenek.length ? `<div class="adim"><h4><i>${no++}</i>Seçenek / ölçü</h4><div class="secenekler">${u.secenek.map((s, i) => `<button class="cip ${S.sec === s ? 'on' : ''}" data-i="${i}"><small>${esc(s.sinif)}</small><b>${esc(s.ad)}</b> · ${u.kmp && s.liste != null ? `<s class="eski">${para(s.liste)}</s> ` : ''}${para(s.fiyat)}</button>`).join('')}</div></div>`
          : '<div class="uyari">Bu ürünün fiyatı listede yok. Seçimlerinizle birlikte fiyat teklifi isteyebilirsiniz.</div>'}
        ${renkGrup('İskelet rengi', ISKELET, 'iskelet', no++, 'Seçiniz')}
        ${ih.file ? renkGrup('File rengi', FILE, 'file', no++, 'Seçiniz') : ''}
        ${ih.kumas ? renkGrup('Kumaş', KUMAS, 'kumas', no++, 'Seçiniz') : ''}
        ${ih.fitil ? renkGrup('Fitil rengi', KUMAS, 'fitil', no++, 'Seçiniz') : ''}
        <div class="adim"><h4><i>${no++}</i>Adet ve not</h4><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div class="adet"><button data-ad="-1">−</button><input id="pAdet" value="${S.adet}" inputmode="numeric"><button data-ad="1">+</button></div>
          <input id="pNot" placeholder="Not (isteğe bağlı)" value="${esc(S.not)}" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid var(--cizgi);border-radius:10px"></div></div>
        <div class="p-alt"><div class="tutar">${birim == null ? 'Teklif' : para(birim * S.adet)}<small>${birim == null ? 'fiyat sonradan bildirilir' : S.adet + ' × ' + para(birim)}</small></div>
          <button class="btn marka" id="pEkle" ${eksik.length ? 'disabled' : ''} title="${eksik.length ? 'Eksik: ' + eksik.join(', ') : ''}">${birim == null ? 'Teklif sepetine ekle' : 'Sepete ekle'}</button></div>
        ${eksik.length ? `<p class="kucuk" style="text-align:right;margin:6px 0 0">Eksik seçim: ${eksik.join(', ')}</p>` : ''}
      </div></div>`;
    perde.querySelector('.kapat').onclick = () => perde.remove();
    if (u.gorsel) perde.querySelector('.buyuk').onclick = () => goruntule360(u);
    perde.querySelectorAll('.cip').forEach(b => b.onclick = () => { S.sec = u.secenek[+b.dataset.i]; ciz(); });
    perde.querySelectorAll('.renk').forEach(b => b.onclick = () => { S[b.dataset.a] = b.dataset.k; ciz(); });
    perde.querySelectorAll('[data-ad]').forEach(b => b.onclick = () => { S.adet = Math.max(1, S.adet + +b.dataset.ad); ciz(); });
    perde.querySelector('#pAdet').onchange = e => { S.adet = Math.max(1, parseInt(e.target.value) || 1); ciz(); };
    perde.querySelector('#pNot').oninput = e => S.not = e.target.value;
    perde.querySelector('#pEkle').onclick = () => {
      const s = sepet(); s.push({ id: u.id, ad: u.ad, kategori: u.kategori, secenek: S.sec ? S.sec.ad : '', sinif: S.sec ? S.sec.sinif : '', birim: birim, liste: S.sec ? S.sec.liste : null, kampanya: u.kmp ? u.kmp.ad + ' (%' + u.kmp.oran + ')' : '', adet: S.adet,
        iskelet: isk ? isk.ad + ' (' + isk.kod + ')' : '', file: fl ? fl.ad + ' (' + fl.kod + ')' : '', kumas: S.kumas || '', fitil: S.fitil || '', not: S.not });
      sepetKaydet(s); perde.remove(); toast(u.ad + ' sepete eklendi.');
    };
  }
  ciz();
  const esc_ = e => { if (e.key === 'Escape') { perde.remove(); document.removeEventListener('keydown', esc_); } }; document.addEventListener('keydown', esc_);
}

// ---------- 360° görüntüleyici
// Ürünün çok açılı fotoğrafları (u.acilar: 24-36 kare) varsa gerçek 360° döner; yoksa tek fotoğrafla 3B döner tabla gösterilir.
function goruntule360(u) {
  const kareler = u.acilar && u.acilar.length > 1 ? u.acilar : null;
  const v = document.createElement('div'); v.className = 'v360';
  v.innerHTML = `<div class="v-ust"><b>${esc(u.ad)}</b><span class="kucuk">${kareler ? 'Sürükleyerek döndürün' : 'Sürükleyerek döndürün · tekerlekle yakınlaştırın'}</span><button class="v-kapat" aria-label="Kapat">×</button></div>
    <div class="v-sahne"><div class="v-tabla"><div class="v-urun"><div class="v-yuz on" style="background-image:url(${u.gorselB || u.gorsel})"></div><div class="v-yuz arka" style="background-image:url(${u.gorselB || u.gorsel})"></div></div><div class="v-golge"></div></div></div>
    <div class="v-alt"><button class="btn cizgi" data-v="sol">⟲</button><input type="range" min="0" max="359" value="0" class="v-aci"><button class="btn cizgi" data-v="sag">⟳</button><button class="btn marka" data-v="oto">Otomatik döndür</button></div>`;
  document.body.appendChild(v);
  const urun = v.querySelector('.v-urun'), on = v.querySelector('.v-yuz.on'), aralik = v.querySelector('.v-aci');
  let aci = 0, zoom = 1, oto = true, son = performance.now(), x0 = null, a0 = 0;
  function ciz() {
    aci = ((aci % 360) + 360) % 360; aralik.value = Math.round(aci);
    if (kareler) { on.style.backgroundImage = `url(${kareler[Math.round(aci / 360 * kareler.length) % kareler.length]})`; urun.style.transform = `scale(${zoom})`; }
    else urun.style.transform = `scale(${zoom}) rotateY(${aci}deg)`;
  }
  function dongu(t) { if (!v.isConnected) return; if (oto) aci += (t - son) * 0.045; son = t; ciz(); requestAnimationFrame(dongu); }
  requestAnimationFrame(dongu);
  const sahne = v.querySelector('.v-sahne');
  sahne.addEventListener('pointerdown', e => { x0 = e.clientX; a0 = aci; oto = false; sahne.setPointerCapture(e.pointerId); });
  sahne.addEventListener('pointermove', e => { if (x0 !== null) { aci = a0 + (e.clientX - x0) * 0.6; } });
  sahne.addEventListener('pointerup', () => x0 = null);
  sahne.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.min(2.2, Math.max(0.7, zoom - e.deltaY * 0.001)); }, { passive: false });
  aralik.oninput = () => { oto = false; aci = +aralik.value; };
  v.querySelector('[data-v=sol]').onclick = () => { oto = false; aci -= 45; };
  v.querySelector('[data-v=sag]').onclick = () => { oto = false; aci += 45; };
  v.querySelector('[data-v=oto]').onclick = () => { oto = !oto; };
  const kapat = () => { v.remove(); document.removeEventListener('keydown', tus); };
  const tus = e => { if (e.key === 'Escape') kapat(); if (e.key === 'ArrowLeft') { oto = false; aci -= 15; } if (e.key === 'ArrowRight') { oto = false; aci += 15; } };
  document.addEventListener('keydown', tus); v.querySelector('.v-kapat').onclick = kapat;
}

// ---------- sepet
const sepet = () => oku('exb-sepet-' + ben.kul, []);
function sepetKaydet(s) { yaz('exb-sepet-' + ben.kul, s); sepetSay(); }
function sepetSay() { const n = sepet().reduce((a, x) => a + x.adet, 0); $('#sepetSay').textContent = n; $('#sepetSay').classList.toggle('gizli', !n); }
const detay = x => [x.secenek, x.iskelet && 'İskelet: ' + x.iskelet, x.file && 'File: ' + x.file, x.kumas && 'Kumaş: ' + x.kumas, x.fitil && 'Fitil: ' + x.fitil, x.not && 'Not: ' + x.not].filter(Boolean).map(esc).join('<br>');
$('#hSepet').onclick = () => {
  const c = document.createElement('div'); c.className = 'perde'; c.style.padding = 0; c.onclick = e => { if (e.target === c) c.remove(); };
  document.body.appendChild(c);
  function ciz() {
    const s = sepet(), top = s.reduce((a, x) => a + (x.birim || 0) * x.adet, 0), teklif = s.some(x => x.birim == null);
    c.innerHTML = `<div class="cekmece"><div class="c-ust"><h3>Sepet (${s.length})</h3><button>×</button></div>
      <div class="c-liste">${s.map((x, i) => { const u = VERI.urunler.find(y => y.id === x.id); return `<div class="s-kalem"><div class="f" style="${u && u.gorsel ? `background-image:url(${u.gorsel})` : ''}"></div>
        <div><b>${esc(x.ad)}</b><div class="d">${detay(x)}</div>
        <div class="adet" style="margin-top:6px"><button data-i="${i}" data-d="-1" style="height:28px;width:28px">−</button><input value="${x.adet}" data-i="${i}" style="height:28px;width:40px"><button data-i="${i}" data-d="1" style="height:28px;width:28px">+</button></div></div>
        <div class="sag">${x.birim == null ? 'Teklif' : para(x.birim * x.adet)}<button data-sil="${i}">Kaldır</button></div></div>`; }).join('') || '<div class="bos-durum">Sepetiniz boş.</div>'}</div>
      ${s.length ? `<div class="c-alt"><div class="top"><span>Toplam</span><span>${para(top)}${teklif ? ' +' : ''}</span></div>
        ${teklif ? '<p class="kucuk">Fiyatı olmayan kalemler için teklif hazırlanacak.</p>' : ''}
        <div class="alan"><label>Teslimat adresi / not</label><textarea id="sAdres" rows="2" placeholder="Teslimat adresi, istenen tarih vb.">${esc(ben.sehir || '')}</textarea></div>
        <button class="btn marka tam" id="sGonder">Sipariş talebini gönder</button>
        <p class="kucuk" style="text-align:center">Fiyatlar USD, KDV hariçtir. Talebiniz satış ekibinin onayıyla kesinleşir.</p></div>` : ''}</div>`;
    c.querySelector('.c-ust button').onclick = () => c.remove();
    c.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const s = sepet(); s[b.dataset.i].adet = Math.max(1, s[b.dataset.i].adet + +b.dataset.d); sepetKaydet(s); ciz(); });
    c.querySelectorAll('.c-liste input').forEach(i => i.onchange = () => { const s = sepet(); s[i.dataset.i].adet = Math.max(1, parseInt(i.value) || 1); sepetKaydet(s); ciz(); });
    c.querySelectorAll('[data-sil]').forEach(b => b.onclick = () => { const s = sepet(); s.splice(+b.dataset.sil, 1); sepetKaydet(s); ciz(); });
    const g = c.querySelector('#sGonder'); if (g) g.onclick = () => {
      const S = oku('exb-siparisler', []), yil = new Date().getFullYear(), no = (window.sunucuNo && sunucuNo('EXG')) || 'EXG-' + yil + '-' + String(S.filter(x => x.no.includes('-' + yil + '-')).length + 1).padStart(4, '0');
      S.push({ no, kul: ben.kul, firma: ben.firma, ad: ben.ad, tarih: Date.now(), kalemler: sepet(), toplam: top, teklif, adres: c.querySelector('#sAdres').value.trim(), durum: 'yeni' });
      yaz('exb-siparisler', S); sepetKaydet([]); c.remove(); toast('Sipariş talebiniz alındı: ' + no);
      siparisDosyasi(S[S.length - 1]); git('siparisler');
    };
  }
  ciz();
};

// Sipariş, satış ekibinin uygulamasına aktarılabilen bir dosya olarak da indirilir (sunucu kurulana kadar).
function siparisDosyasi(o) {
  const veri = { tur: 'exit-bayi-siparis', surum: 1, musteri: { kul: ben.kul, firma: ben.firma, ad: ben.ad, tel: ben.tel, mail: ben.mail, sehir: ben.sehir, vergi: ben.vergi }, siparis: o };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(veri, null, 1)], { type: 'application/json' })); a.download = o.no + '.json'; a.click();
}

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
function siparislerim() {
  const L = oku('exb-siparisler', []).filter(o => o.kul === ben.kul);
  setTimeout(() => $$('[data-dosya]').forEach(b => b.onclick = () => siparisDosyasi(L.find(o => o.no === b.dataset.dosya))), 0);
  $('#s-siparisler').innerHTML = `<h2>Siparişlerim</h2><p class="kucuk">Her sipariş talebi, satış ekibine iletilmek üzere ayrıca dosya olarak indirilir. İsterseniz aşağıdan tekrar indirebilirsiniz.</p>` + (L.length ? siparisTablo(L, false) : '<div class="bos-durum">Henüz sipariş talebiniz yok. <br><br><button class="btn marka" onclick="git(\'katalog\')">Kataloğa git</button></div>');
}

// ---------- başlangıç
(async () => {
  await kurulum();
  const v = VERI.urunler.filter(u => u.gorsel); const sec = ['Enzo Oturma Grupları', 'Aqua', 'Verona', 'Nirvana', 'Hera', 'Perla İkili'];
  $('#vitrin').innerHTML = sec.map(a => v.find(u => u.ad === a) || v[0]).map((u, i) => `<div style="background-image:url(${u.gorsel});animation-delay:${i * 90}ms" title="${esc(u.ad)}"></div>`).join('');
  let o = null; try { o = sessionStorage.getItem('exb-oturum'); } catch (e) {}
  if (o && KUL[o]) girisYap(KUL[o]);
})();

try { const ks = new Set(VERI.urunler.map(u => u.kategori)); $('#gIstat').innerHTML = `<div><b>${VERI.urunler.length}</b><span>ürün modeli</span></div><div><b>${ks.size}</b><span>kategori</span></div><div><b>${ISKELET.length}</b><span>iskelet rengi</span></div><div><b>${Object.keys(VERI.kumas || {}).length || 6}</b><span>kumaş rengi</span></div>`; } catch (e) {}

// ===== v2.1: sipariş takibi + bildirim, cari hesabım =====
const ADIM = [['yeni', 'Talep alındı'], ['onay', 'Onaylandı'], ['uretim', 'Üretimde'], ['sevk', 'Sevk edildi']];
const zamanYaz = t => new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
function siparisKarti(o) {
  const iptal = o.durum === 'iptal', idx = ADIM.findIndex(a => a[0] === o.durum), G = o.gecmis || [{ durum: 'yeni', zaman: o.tarih }];
  const zam = d => { const g = G.filter(x => x.durum === d).pop(); return g ? zamanYaz(g.zaman) : ''; };
  return `<div class="sk"><div class="sk-ust"><div><b>${o.no}</b><div class="kucuk">${tarih(o.tarih)} · ${o.kalemler.reduce((a, x) => a + x.adet, 0)} adet · ${o.kalemler.length} kalem</div></div>
      <div class="sk-tutar">${o.net != null ? `<b>${para(Math.round(o.net))}</b><div class="kucuk">iskontolu net · liste ${para(o.toplam)}</div>` : `<b>${para(o.toplam)}${o.teklif ? ' +' : ''}</b><div class="kucuk">liste fiyatı</div>`}</div>
      <span class="durum ${DURUM[o.durum][1]}">${DURUM[o.durum][0]}</span></div>
    ${iptal ? '<div class="sk-iptal">Bu sipariş iptal edildi. Bilgi için satış temsilcinizle görüşün.</div>' : `<div class="adimlar">${ADIM.map(([k, ad], i) => { const ok = i < idx || (o.durum === 'sevk' && i === idx); return `<div class="adim ${ok ? 'tamam' : i === idx ? 'simdi' : ''}"><i>${ok ? '✓' : i + 1}</i><b>${ad}</b><span>${zam(k)}</span></div>`; }).join('')}</div>`}
    <div class="sk-bilgi">${o.termin ? `<div><span>Tahmini teslim</span><b>${tarih(o.termin)}</b></div>` : `<div><span>Tahmini teslim</span><b class="soluk">${iptal || o.durum === 'sevk' ? '—' : 'Onaydan sonra bildirilecek'}</b></div>`}
      <div><span>Nakliye</span><b>${esc(o.kargo || '—')}</b></div><div><span>Takip / irsaliye no</span><b>${esc(o.takip || '—')}</b></div>${o.satisNot ? `<div class="genis"><span>Satış ekibinin notu</span><b>${esc(o.satisNot)}</b></div>` : ''}</div>
    <details><summary>Kalemleri göster</summary>${o.kalemler.map(x => `<div style="margin:8px 0"><b>${x.adet} × ${esc(x.ad)}</b><div class="kucuk">${detay(x)}</div></div>`).join('')}${o.adres ? `<div class="kucuk">Adres/not: ${esc(o.adres)}</div>` : ''}</details>
    <button class="btn cizgi" style="padding:6px 10px;font-size:12px" data-dosya="${o.no}">Sipariş dosyasını indir</button></div>`;
}
siparislerim = function () {
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
};
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

// cari hesabım
function cariOzet(c) {
  const F = c.hareket.filter(h => h.tip === 'fatura').sort((a, b) => a.tarih - b.tarih), odeme = c.hareket.filter(h => h.tip === 'odeme').reduce((a, h) => a + h.tutar, 0);
  let kalan = odeme, gecmis = 0, yaklasan = 0; const simdi = Date.now();
  const D = F.map(f => { const ac = Math.max(0, f.tutar - kalan); kalan = Math.max(0, kalan - f.tutar); if (ac > 0.5) { if (f.vade < simdi) gecmis += ac; else if (f.vade < simdi + 30 * 864e5) yaklasan += ac; } return { ...f, acik: ac }; });
  return { borc: F.reduce((a, h) => a + h.tutar, 0), odeme, bakiye: F.reduce((a, h) => a + h.tutar, 0) - odeme, gecmis, yaklasan, D };
}
function cariSayfa() {
  const c = (oku('exb-cari', {}) || {})[ben.kul] || { vade: 60, hareket: [] }, z = cariOzet(c), H = c.hareket.slice().sort((a, b) => a.tarih - b.tarih); let b = 0;
  const p2 = n => (Math.round(n * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
  $('#s-cari').innerHTML = `<h2>Cari hesabım</h2><p class="kucuk">Faturalar sipariş sevk edildiğinde, ödemeler satış ekibi tahsilatı işlediğinde görünür. Ödeme vadeniz: <b>${c.vade} gün</b>.</p>
    <div class="sk-ozet"><div><span>Güncel bakiye</span><b>${p2(z.bakiye)}</b></div><div class="${z.gecmis > 0.5 ? 'kirmizi' : ''}"><span>Vadesi geçmiş</span><b>${p2(z.gecmis)}</b></div><div><span>30 gün içinde vadesi dolacak</span><b>${p2(z.yaklasan)}</b></div><div><span>Toplam ödeme</span><b>${p2(z.odeme)}</b></div></div>
    ${z.D.some(f => f.acik > 0.5) ? `<div class="kart-b"><h3>Ödenmemiş faturalar</h3><table class="tablo"><tr><th>Fatura</th><th>Tarih</th><th>Vade</th><th style="text-align:right">Tutar</th><th style="text-align:right">Kalan</th><th></th></tr>
      ${z.D.filter(f => f.acik > 0.5).map(f => { const g = Math.floor((Date.now() - f.vade) / 864e5); return `<tr><td><b>${esc(f.no)}</b><div class="kucuk">${esc(f.aciklama || '')}</div></td><td>${tarih(f.tarih)}</td><td>${tarih(f.vade)}</td><td style="text-align:right">${p2(f.tutar)}</td><td style="text-align:right"><b>${p2(f.acik)}</b></td><td>${g > 0 ? `<span class="durum d-iptal">${g} gün gecikti</span>` : `<span class="durum d-onay">${-g} gün kaldı</span>`}</td></tr>`; }).join('')}</table></div>` : ''}
    <div class="kart-b"><h3>Hesap hareketleri</h3>${H.length ? `<table class="tablo"><tr><th>Tarih</th><th>Belge</th><th>Açıklama</th><th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th><th style="text-align:right">Bakiye</th></tr>
      ${H.map(h => { b += h.tip === 'fatura' ? h.tutar : -h.tutar; return `<tr><td>${tarih(h.tarih)}</td><td>${esc(h.no)}</td><td class="kucuk">${esc(h.aciklama || '')}</td><td style="text-align:right">${h.tip === 'fatura' ? p2(h.tutar) : ''}</td><td style="text-align:right">${h.tip === 'odeme' ? p2(h.tutar) : ''}</td><td style="text-align:right"><b>${p2(b)}</b></td></tr>`; }).join('')}</table>` : '<div class="kucuk">Henüz hesap hareketi yok.</div>'}</div>
    <p class="kucuk">Tutarlar USD'dir. Hesap ekstresi için satış temsilcinizle iletişime geçebilirsiniz.</p>`;
}
git = function (s) {
  ['katalog', 'siparisler', 'cari'].forEach(x => $('#s-' + x).classList.toggle('gizli', x !== s));
  if (s === 'katalog') katalog(); if (s === 'siparisler') { window._bekleyen = 0; siparislerim(); } if (s === 'cari') cariSayfa();
  $$('[data-git]').forEach(b => b.classList.toggle('aktif', b.dataset.git === s)); window.scrollTo(0, 0);
};
$$('[data-git]').forEach(b => b.onclick = () => git(b.dataset.git));
const _girisYap = girisYap;
girisYap = function (u) { _kmpSon = ''; kampanyaKontrol(); _girisYap(u); setTimeout(bildirimKontrol, 800); };

// ===== teknik bilgiler (exitgarden.com) ve katalog =====
function teknikHtml(u) {
  const t = u.teknik; if (!t) return '';
  return `<details class="teknik" open><summary>Teknik bilgiler</summary>${(t.malzeme || []).length ? `<ul>${t.malzeme.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
    ${(t.tablolar || []).map(tb => `<div class="tk-kay"><table><tr>${tb.basliklar.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${tb.satirlar.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`).join('')}
    <div class="kucuk">Ölçüler cm, ağırlık kg. Kaynak: exitgarden.com</div></details>`;
}
function katalogIndir() {
  const L = VERI.urunler.filter(u => uygun(u)), w = window.open('', '_blank'); if (!w) return toast('Açılır pencere engellendi; tarayıcıda izin verin.');
  const kats = [...new Set(L.map(u => u.kategori))];
  w.document.write(`<html><head><meta charset="utf-8"><title>EXIT Garden Katalog ${new Date().getFullYear()}</title><style>
    body{font-family:Inter,"Segoe UI",sans-serif;color:#0f172a;margin:0}.kapak{height:255mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;padding:60px;background:#0b1f3a;color:#fff;page-break-after:always}
    .kapak h1{font-size:44px;margin:30px 0 8px}.kapak p{color:#cbd5e1}.logo-ink{fill:#e5e7eb}.logo-ink-soft{fill:#cbd5e1}.lg svg{height:48px;width:auto;margin-right:18px}.lg .logo-sep{display:none}
    h2{font-size:22px;border-bottom:3px solid #e8a317;padding-bottom:6px;margin:28px 32px 14px;page-break-before:always}h2:first-of-type{page-break-before:auto}
    .u{display:grid;grid-template-columns:220px 1fr;gap:20px;margin:0 32px 18px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;page-break-inside:avoid}
    .g{aspect-ratio:4/3;background:#fff center/contain no-repeat;border:1px solid #eef0f3;border-radius:6px}h3{margin:0 0 6px;font-size:17px}.a{font-size:12px;color:#475569;line-height:1.5;margin:0 0 8px}
    table{border-collapse:collapse;font-size:11px;margin:6px 0}td,th{border:1px solid #e5e7eb;padding:3px 7px;text-align:left}th{background:#f8fafc}.f{font-size:11.5px}.f b{font-weight:600}
    ul{margin:4px 0;padding-left:16px;font-size:11.5px;color:#334155}@page{margin:12mm}</style></head><body>
    <div class="kapak"><div class="lg">${$('#giris .logolar').innerHTML}</div><h1>Dış Mekân Koleksiyonu ${new Date().getFullYear()}</h1><p>${L.length} ürün · ${kats.join(' · ')}</p><p>Bayi fiyat listesi · USD · ${new Date().toLocaleDateString('tr-TR')}</p></div>
    ${kats.map(k => `<h2>${esc(k)}</h2>${L.filter(u => u.kategori === k).map(u => `<div class="u"><div class="g" style="background-image:url(${u.gorselB || u.gorsel})"></div><div><h3>${esc(u.ad)}</h3><p class="a">${esc(u.aciklama || '')}</p>
      ${u.teknik ? `${(u.teknik.malzeme || []).length ? `<ul>${u.teknik.malzeme.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}${(u.teknik.tablolar || []).map(tb => `<table><tr>${tb.basliklar.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${tb.satirlar.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`).join('')}` : ''}
      <div class="f">${u.secenek.map(s => `${esc(s.ad)}: <b>${para(s.fiyat)}</b>`).join(' · ')}</div></div></div>`).join('')}`).join('')}
    <script>setTimeout(()=>print(),600)<\/script></body></html>`);
  w.document.close();
}
