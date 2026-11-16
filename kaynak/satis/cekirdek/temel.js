// Çekirdek: yardımcılar, katalog verisi, sipariş durumları.
// Ekler (Faz 3b-2). Sonradan eklenen özellikler (ödeme bildirimleri, karne, limit, işlem kaydı…) kendi
// parçalarında EK.<ad> olarak tanımlıdır; ekran fonksiyonu (git, ac, durumYaz, siparisAc…) bunları kendi içinde,
// yazılı sırayla çağırır. Ek parçaların menü sayfaları EK.sayfalar'dadır. Tanımsız ek kalmadığını
// `node araclar/sarmalama.mjs` denetler.
const EK = { sayfalar: {} };

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
