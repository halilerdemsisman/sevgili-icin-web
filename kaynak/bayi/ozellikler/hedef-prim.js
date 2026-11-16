// Yıllık hedef ve prim basamakları (cari hesabım).
(function () {
  // ================= 21. hedef ve prim =================
  function hedefBilgi() {
    const yil = new Date().getFullYear(), H = ((oku('exb-bayi-hedef', {}) || {})[ben.kul] || {})[yil]; if (!H || !(H.hedef > 0)) return null;
    const ger = H.gerceklesen != null ? H.gerceklesen : oku('exb-siparisler', []).filter(o => o.kul === ben.kul && o.durum !== 'iptal' && new Date(o.tarih).getFullYear() === yil).reduce((a, o) => a + (o.net != null ? o.net : o.toplam || 0), 0);
    const B = (H.basamak || []).slice().sort((a, b) => a.oran - b.oran), oran = ger / H.hedef * 100;
    const kaz = B.filter(b => oran >= b.oran).pop(), sonraki = B.find(b => oran < b.oran);
    return { yil, hedef: H.hedef, ger, oran, B, kaz, sonraki, prim: kaz ? ger * kaz.prim / 100 : 0 };
  }
  function hedefKart() {
    const h = hedefBilgi(); if (!h) return '';
    const ust = Math.max(120, ...h.B.map(b => b.oran)) * 1.2, x = v => Math.min(100, v / ust * 100);
    const kalanGun = Math.ceil((new Date(h.yil + 1, 0, 1) - new Date()) / 864e5);
    return `<div class="hd-kart" id="hdKart"><div class="hd-ust"><div><h3>${h.yil} hedefim ve primim</h3><div class="kucuk">Sevk edilen ve onaylanan siparişleriniz (net, iptaller hariç) · yıl sonuna ${kalanGun} gün</div></div>
      <div style="text-align:right"><b class="b">${para(Math.round(h.ger))}</b> <span class="kucuk">/ ${para(h.hedef)} · %${Math.round(h.oran)}</span></div></div>
      <div class="hd-cubuk"><i style="width:${x(h.oran)}%"></i>${h.B.map((b, i) => `<span class="${h.oran >= b.oran ? 'ok' : ''} ${i % 2 ? 'alt' : ''}" style="left:${x(b.oran)}%">%${b.oran} → %${b.prim} prim</span>`).join('')}</div>
      <div class="hd-not">${h.kaz ? `Şu an <b>%${h.kaz.prim} prim</b> basamağındasınız: tahmini prim <b>${para(Math.round(h.prim))}</b>. ` : 'Henüz prim basamağına ulaşmadınız. '}${h.sonraki ? `Bir sonraki basamak (%${h.sonraki.prim} prim) için <b>${para(Math.max(0, Math.ceil(h.hedef * h.sonraki.oran / 100 - h.ger)))}</b> daha sipariş gerekiyor.` : 'En üst basamaktasınız, tebrikler!'}</div></div>`;
  }
  EK.cariHedef = function () { const k = hedefKart(); if (k && !$('#hdKart')) { const h = $('#s-cari h2'); h && h.nextElementSibling ? h.nextElementSibling.insertAdjacentHTML('afterend', k) : $('#s-cari').insertAdjacentHTML('afterbegin', k); } };
})();
