// Ekran: fiyat geçmişi ve sürümleri.
// ---------- 11. fiyat geçmişi
let FGEC = oku('exs-fiyat-gecmis', []), FSUR = oku('exs-fiyat-surum', []);
const fgYaz = () => { yaz('exs-fiyat-gecmis', FGEC.slice(-2000)); yaz('exs-fiyat-surum', FSUR.slice(-30)); };
function surumKaydet(ad, oto) { FSUR.push({ ad, zaman: Date.now(), kim: kimAd(), fiyat: JSON.parse(JSON.stringify(FIYAT)), gizli: GIZLI.slice(), oto: !!oto }); fgYaz(); }
// FIYAT/GIZLI her yazıldığında farkı kaydet
let _fOnce = JSON.stringify(FIYAT), _gOnce = JSON.stringify(GIZLI);
// fiyat/görünürlük değişikliği: önce fiyat geçmişine yazılır, sonra yayınlanır
function urunYaz(aciklama) {
  const eF = JSON.parse(_fOnce), eG = JSON.parse(_gOnce), z = Date.now(), kim = kimAd();
  VERI.urunler.forEach(u => u.secenek.forEach(s => { const a = (eF[u.ad] || {})[s.ad], b = (FIYAT[u.ad] || {})[s.ad], fa = a !== undefined ? a : s.fiyat, fb = b !== undefined ? b : s.fiyat; if (fa !== fb) FGEC.push({ z, kim, urun: u.ad, sec: s.ad, eski: fa, yeni: fb, not: aciklama || window._fNot || '' }); }));
  GIZLI.filter(a => !eG.includes(a)).forEach(a => FGEC.push({ z, kim, urun: a, sec: '', tip: 'gizle', not: 'Portalda gizlendi' }));
  eG.filter(a => !GIZLI.includes(a)).forEach(a => FGEC.push({ z, kim, urun: a, sec: '', tip: 'goster', not: 'Portalda gösterildi' }));
  _fOnce = JSON.stringify(FIYAT); _gOnce = JSON.stringify(GIZLI); window._fNot = ''; fgYaz(); fiyatYayinla();
}
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
// ürünler: fiyat geçmişi, yetki, toplu işlemden önce otomatik sürüm
function urunlerYonetim() {
  $('#ustSag').insertAdjacentHTML('afterbegin', '<button class="btn cizgi" id="uGec">Fiyat geçmişi</button>'); $('#uGec').onclick = fiyatGecmisi;
  if (!yonetici()) { $$('.u-fiyat input,#tOran,#tArt,#tAzl,#tSif,[data-gz],#tGiz,#tGos').forEach(x => x.disabled = true); $('#icerik').insertAdjacentHTML('afterbegin', '<div class="onay-b bilgi" style="margin-bottom:12px">Fiyat ve görünürlük değişikliklerini yalnız yöneticiler yapabilir.</div>'); }
  // toplu işlemlerden önce otomatik sürüm + açıklama
  ['tArt', 'tAzl', 'tSif'].forEach(id => { const b = $('#' + id); if (!b) return; const f = b.onclick; b.onclick = () => { if (!SEC.size) return f(); surumKaydet('Toplu değişiklik öncesi', true); window._fNot = 'Toplu: ' + b.textContent + ($('#tOran').value ? ' %' + $('#tOran').value : ''); f(); }; });
}
