// Oturum: şifre özeti (sunucusuz sürüm), kullanıcılar, giriş/kayıt formları, oturum açılışı (girisYap).
// Sunucuya bağlıyken giriş/kayıt/çıkış ozellikler/sunucu-oturum.js ile sunucudan yapılır.
function sha256hex(str){const b=new TextEncoder().encode(str),K=[],H=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];let n=2,c=0;while(c<64){let p=1;for(let d=2;d*d<=n;d++)if(n%d===0){p=0;break}if(p){K[c++]=(Math.pow(n,1/3)%1)*4294967296|0}n++}
const l=b.length,m=new Uint8Array(((l+9+63)>>6)<<6);m.set(b);m[l]=128;const bl=l*8;m[m.length-4]=bl>>>24;m[m.length-3]=bl>>>16&255;m[m.length-2]=bl>>>8&255;m[m.length-1]=bl&255;const w=new Array(64),r=(x,y)=>x>>>y|x<<(32-y);
for(let i=0;i<m.length;i+=64){for(let t=0;t<16;t++)w[t]=m[i+4*t]<<24|m[i+4*t+1]<<16|m[i+4*t+2]<<8|m[i+4*t+3];for(let t=16;t<64;t++){const s0=r(w[t-15],7)^r(w[t-15],18)^w[t-15]>>>3,s1=r(w[t-2],17)^r(w[t-2],19)^w[t-2]>>>10;w[t]=w[t-16]+s0+w[t-7]+s1|0}
let[a,b2,c2,d,e,f,g,h]=H;for(let t=0;t<64;t++){const t1=h+(r(e,6)^r(e,11)^r(e,25))+(e&f^~e&g)+K[t]+w[t]|0,t2=(r(a,2)^r(a,13)^r(a,22))+(a&b2^a&c2^b2&c2)|0;h=g;g=f;f=e;e=d+t1|0;d=c2;c2=b2;b2=a;a=t1+t2|0}
H[0]=H[0]+a|0;H[1]=H[1]+b2|0;H[2]=H[2]+c2|0;H[3]=H[3]+d|0;H[4]=H[4]+e|0;H[5]=H[5]+f|0;H[6]=H[6]+g|0;H[7]=H[7]+h|0}return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('')}
async function ozet(s) { return sha256hex('exitbayi:' + s); }
const eskiOzet = s => { let h = 5381; for (const c of 'exitbayi:' + s) h = (h * 33 ^ c.charCodeAt(0)) >>> 0; return 'h' + h.toString(16); };

// ---------- kullanıcılar
let KUL = oku('exb-kullanicilar', null), ben = null;
async function kurulum() {
  // web sitesi: iş verisi (profil dahil) REST'ten gelir; ilk yükleme bitmeden oturum açılmaz
  if (window.EXIT_VERI) { await EXIT_VERI.hazir; KUL = oku('exb-kullanicilar', null); }
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
  _kmpSon = ''; kampanyaKontrol();
  ben = u; try { sessionStorage.setItem('exb-oturum', u.kul); } catch (e) {}
  $('#giris').classList.add('gizli'); $('#uyg').classList.remove('gizli');
  $('#hKim').textContent = u.firma || u.ad; try { $('#hAv').textContent = String(u.firma || u.ad || '?').trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR'); } catch (e) {}
  try { $('#bTarih').textContent = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }); } catch (e) {}
  sepetSay(); git('katalog');
  setTimeout(bildirimKontrol, 800);
  EK.girisKarsilama?.(); EK.girisDuyuru?.(); EK.girisHatirlatma?.(); EK.girisAdres?.();
}
$('#hCikis').onclick = () => { try { sessionStorage.removeItem('exb-oturum'); } catch (e) {} ben = null; $('#uyg').classList.add('gizli'); $('#giris').classList.remove('gizli'); $('#gSif').value = ''; $('.sekme button[data-s=giris]').click(); };
