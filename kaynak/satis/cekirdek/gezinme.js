// Çekirdek: menü sayfaları ve sayfa geçişi (git).
let aktif = '';
// Menü sayfaları: ad -> [başlık (null: menüdeki yazı), çizen]. Ek parçaların sayfaları önce aranır (aynı ad
// varsa ekinki geçerli): ek6 sayfaları (EK.sayfa6), sonra EK.sayfalar. Her geçişten sonra menü sayaçları yenilenir.
const SAYFALAR = {
  siparisler: [null, () => siparisler()], musteriler: [null, () => musteriler()], analiz: [null, () => analiz()], ai: [null, () => ai()], ayarlar: [null, () => ayarlar()],
  raporlar: ['Raporlar', () => raporlar()], kampanyalar: ['Kampanyalar', () => kampanyalar()], urunler: ['Ürünler ve fiyatlar', () => urunler()],
  onaylar: ['Onay bekleyenler', () => onaylar()], hedefler: ['Hedefler', () => hedefler()],
};
function git(s) {
  const S = EK.sayfa6?.(s) || EK.sayfalar[s] || SAYFALAR[s]; if (!S) return;
  try { const b = $(`aside button.m[data-s=${s}]`); $('#yol').textContent = 'Satış Yönetimi  /  ' + (S[0] || (b ? [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : '')); } catch (e) {}
  aktif = s; $$('aside button.m[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); $('#menu').classList.remove('acik'); $('#ustSag').innerHTML = '';
  S[1](); window.scrollTo(0, 0);
  onaySay(); EK.rozetler?.(); EK.hatirlatmaRozeti?.();
}
$$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
$('#mMenu').onclick = () => $('#menu').classList.add('acik');
