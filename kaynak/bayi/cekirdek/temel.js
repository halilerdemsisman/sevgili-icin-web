// Çekirdek: katalog verisi, ekler (EK), renk ve kumaş seçenekleri, yardımcılar, kayıt ekleme/güncelleme, bildirim (toast).
// Bayi portalının bütün çekirdek ve ekran dosyaları aynı pakette tek betik olarak çalışır (araclar/derle.mjs, paket: cekirdek).
const VERI = /*@katalog*/null;
// Ekler (Faz 2b-2). Ekranlara sonradan eklenen özellikler (favoriler, projeler, karşılaştırma, online ödeme…)
// kendi parçalarında EK.<ad> olarak tanımlıdır. Ekran fonksiyonu (git, katalog, urunAc…) bunları kendi
// içinde, yazılı sırayla çağırır; böylece bir ekranda neyin hangi sırayla çalıştığı tek yerde görünür.
// Çağrılar ?.() ile yapılır: web/ dosyalarındaki ekler tek dosyalık sürümde yoktur, oturum açılışı da
// (girisYap) diğer parçalar yüklenmeden önce çalışabilir. Tanımsız ek kalmadığını
// `node araclar/sarmalama.mjs` denetler.
const EK = {};
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
// Kayıt ekleme ve güncelleme (Faz 2b). Sunucuya bağlıyken REST ile: numara, sahip ve fiyat sunucuda belirlenir,
// yanıt beklenir, hata bayiye gösterilir (bağlantı yoksa kayıt gönderilmez, yerelde de oluşmaz).
// Sunucusuz (dosyadan açılan) sürümde kayıt yerelde oluşturulur. İkisi de Promise döner; hata Error.message'dadır.
const KAYIT_TUR = { siparisler: ['exb-siparisler', 'no', 'EXG'], odemeler: ['exb-odeme', 'no', 'OB'], iadeler: ['exb-iade', 'id', 'IAD'], numuneler: ['exb-numune', 'no', 'NMN'], teklifler: ['exb-teklif', 'no', 'OT'], hatirlatmalar: ['exb-hatirlat', 'id', ''] };
const restKayit = r => { const { ok, http, cevrimdisi, uyari, hata, kayit, alanlar, ...x } = r; return x; };
function yerelNo(on, L) { const y = new Date().getFullYear(), m = L.map(x => +(String(x.no || '').match(new RegExp('^' + on + '-' + y + '-(\\d+)$')) || [])[1] || 0); return on + '-' + y + '-' + String(Math.max(0, ...m) + 1).padStart(({ OB: 3, NMN: 3 })[on] || 4, '0'); } // hane sayısı sunucudakiyle aynı
async function kayitEkle(tur, x, on) {
  const [k, a, on0] = KAYIT_TUR[tur];
  if (window.EXIT_REST) {
    const r = await EXIT_REST('POST', tur, { ...x, on: on || on0 });
    if (!r.ok) throw new Error(r.hata || 'Kaydedilemedi.');
    const y = restKayit(r); EXIT_KAYIT_ISLE(k, y, a); return y;
  }
  const L = oku(k, []) || [], y = { ...x, no: yerelNo(on || on0, L), kul: ben.kul, firma: ben.firma, ad: ben.ad };
  if (tur !== 'siparisler' && !y.zaman) y.zaman = Date.now();
  if (a === 'id' && !y.id) y.id = tur.slice(0, 2) + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  L.push(y);
  try { localStorage.setItem(k, JSON.stringify(L)); } catch (e) { throw new Error('Kaydedilemedi: tarayıcı alanı dolu. Dosya eklediyseniz daha küçük bir dosya deneyin.'); }
  return y;
}
async function kayitGuncelle(tur, no, alanlar) {
  const [k, a] = KAYIT_TUR[tur];
  if (window.EXIT_REST) {
    const r = await EXIT_REST('PATCH', tur + '/' + encodeURIComponent(no), alanlar);
    if (r.kayit) EXIT_KAYIT_ISLE(k, r.kayit, a);
    if (!r.ok) throw new Error(r.hata || 'Değişiklik kaydedilemedi.');
    const y = restKayit(r); EXIT_KAYIT_ISLE(k, y, a); return y;
  }
  const L = oku(k, []) || [], o = L.find(x => x && x[a] === no); if (!o) throw new Error('Kayıt bulunamadı.');
  Object.assign(o, alanlar); yaz(k, L); return o;
}
// Gönder düğmesi: istek sürerken ikinci tıklamayı engeller
async function bekleyerek(b, f) {
  if (!b || b.disabled) return; const m = b.textContent; b.disabled = true; b.textContent = 'Gönderiliyor…';
  try { return await f(); } catch (e) { toast(e.message || String(e)); } finally { if (b.isConnected) { b.disabled = false; b.textContent = m; } }
}

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
