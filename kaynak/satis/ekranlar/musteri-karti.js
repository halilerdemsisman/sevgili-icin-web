// Ekran: müşteri kartı (CRM + cari).
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
  { // temsilci ataması ve bölge
  const p = $$('.perde').pop(); if (!p) return;
  const ekle = () => { if (p.querySelector('#mTem')) return; const h = p.querySelector('h2'); if (!h) return; const m = MUS[kul] || {};
    h.insertAdjacentHTML('afterend', `<div id="mTem" class="kucuk" style="margin:4px 0">Temsilci: <select id="mTemS" ${yonetici() ? '' : 'disabled'} style="padding:4px 6px;border:1px solid var(--cizgi);border-radius:6px"><option value="">— atanmadı —</option>${Object.values(KUL).map(u => `<option value="${esc(u.kul)}" ${m.temsilci === u.kul ? 'selected' : ''}>${esc(u.ad || u.kul)}</option>`).join('')}</select> · Bölge: <b>${bolgeBul(m.sehir)}</b></div>`);
    p.querySelector('#mTemS').onchange = e => { MUS[kul] = { ...(MUS[kul] || { kul }), temsilci: e.target.value }; yaz('exs-musteriler', MUS); toast('Temsilci atandı.'); }; };
  ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
  }
}
