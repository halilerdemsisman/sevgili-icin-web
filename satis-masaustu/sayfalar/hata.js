'use strict';
const $ = id => document.getElementById(id), M = window.exitMasaustu, q = new URLSearchParams(location.search);
$('adres').textContent = q.get('adres') || '—'; $('hata').textContent = q.get('hata') || '—';
const dene = () => M.yenidenDene(q.get('yol') || '/satis');
$('dene').onclick = dene;
$('degistir').onclick = () => { location.href = 'kurulum.html?degistir=1'; };
addEventListener('online', dene);
setInterval(() => { if (navigator.onLine) dene(); }, 15000);

// ---------- son görülen veriler (Faz 3b): bağlantı yokken salt okunur ----------
// Veri yalnız textContent ile yazılır (sayfaya kod olarak girmez).
const para = n => (Math.round(n || 0)).toLocaleString('tr-TR') + ' $';
const tarih = t => t ? new Date(t).toLocaleDateString('tr-TR') : '';
const SEKME = {
  isler: { bas: ['İş', 'Ayrıntı'], satir: x => [x.baslik, x.metin] },
  siparisler: { bas: ['Sipariş', 'Bayi', 'Tarih', 'Durum', 'Adet', 'Tutar', 'Termin'], sag: [4, 5], satir: x => [x.no, x.firma, tarih(x.tarih), x.durum, x.adet, para(x.tutar), x.termin ? tarih(x.termin) : ''] },
  bayiler: { bas: ['Bayi', 'Yetkili', 'Telefon', 'E-posta', 'Şehir', 'Bakiye', 'Vadesi geçmiş'], sag: [5, 6], satir: x => [x.firma, x.ad, x.tel, x.mail, x.sehir, para(x.bakiye), x.gecmis ? para(x.gecmis) : ''] },
};
let V = null, sekme = 'isler';
const kucult = s => String(s ?? '').toLocaleLowerCase('tr');
function ciz() {
  const S = SEKME[sekme], a = kucult($('sgAra').value.trim()), L = (V[sekme] || []);
  const E = a ? L.filter(x => S.satir(x).some(h => kucult(h).includes(a))) : L;
  document.querySelectorAll('[data-sekme]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sekme === sekme)));
  const tr = document.createElement('tr');
  S.bas.forEach((h, i) => { const th = document.createElement('th'); th.textContent = h; if ((S.sag || []).includes(i)) th.className = 'sag'; tr.append(th); });
  $('sgBas').replaceChildren(tr);
  $('sgGovde').replaceChildren(...E.slice(0, 300).map(x => { const r = document.createElement('tr'); S.satir(x).forEach((h, i) => { const td = document.createElement('td'); td.textContent = h ?? ''; if ((S.sag || []).includes(i)) td.className = 'sag'; r.append(td); }); return r; }));
  $('sgAlt').textContent = !E.length ? (a ? 'Aramaya uyan kayıt yok.' : 'Kayıt yok.') : E.length > 300 ? `${E.length} kayıttan ilk 300'ü gösteriliyor; aramayı daraltın.` : '';
}
if (M && M.anlikOku) M.anlikOku().then(v => {
  if (!v || !(v.siparisler || v.bayiler)) return;
  V = v; document.body.classList.add('veri-var'); $('sonGorulen').hidden = false;
  $('sgZaman').textContent = `${new Date(v.zaman || v.kaydedildi).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })} itibarıyla · ${v.ad || v.kul || ''}`;
  for (const k of Object.keys(SEKME)) $('sgN-' + k).textContent = (v[k] || []).length;
  if (!(v.isler || []).length) sekme = 'siparisler';
  document.querySelectorAll('[data-sekme]').forEach(b => b.onclick = () => { sekme = b.dataset.sekme; ciz(); });
  $('sgAra').oninput = ciz;
  ciz();
}).catch(() => {});
