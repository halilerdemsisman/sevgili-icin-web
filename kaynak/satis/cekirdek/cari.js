// Çekirdek: cari hesap, fatura, sipariş takibi (v2.1).
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
  EK.faturaIslem?.(o);
  cariYaz();
}
// Siparişin müşterinin göreceği alanlarını aynı tarayıcıdaki bayi portalına yansıt
function portalaYansit(o) {
  const P = oku('exb-siparisler', null); if (!P) return; const x = P.find(y => y.no === o.no); if (!x) return;
  Object.assign(x, { durum: o.durum, termin: o.termin || '', kargo: o.kargo || '', takip: o.takip || '', gecmis: o.gecmis || [], net: Math.round(tutarlar(o).net * 100) / 100, satisNot: o.satisNot || '' });
  yaz('exb-siparisler', P);
}
// sipariş penceresine takip alanları
// sipariş penceresi: takip bilgisi (termin, kargo, takip no, bayiye not)
function siparisTakip(p, o) {
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
}
