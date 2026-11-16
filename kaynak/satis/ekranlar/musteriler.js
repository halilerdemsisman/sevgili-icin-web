// Ekran: müşteriler ve iskonto.
// ---------- müşteriler ve iskonto
function musteriler() {
  $('#baslik').textContent = 'Müşteriler ve iskonto';
  const L = Object.values(MUS).map(m => { const S = Object.values(SIP).filter(o => o.kul === m.kul && o.durum !== 'iptal'); return { ...m, adet: S.length, net: S.reduce((a, o) => a + tutarlar(o).net, 0), son: Math.max(0, ...S.map(o => o.tarih)) }; }).sort((a, b) => b.net - a.net);
  $('#icerik').innerHTML = `<div class="kart"><h3>Firma / kişi bazında iskonto</h3><div class="alt">Buraya girilen oran, o müşterinin bütün siparişlerine varsayılan olarak uygulanır. Siparişe özel ek iskonto sipariş penceresinden verilir.</div>
    ${L.length ? `<table class="tablo"><tr><th>Müşteri</th><th>İletişim</th><th class="sag-hiza">Sipariş</th><th class="sag-hiza">Net satış</th><th>Son sipariş</th><th>İskonto %</th><th>Not</th></tr>
    ${L.map(m => `<tr><td><b>${esc(m.firma)}</b><div class="kucuk">${esc(m.ad)} · ${esc(m.kul)}</div></td><td class="kucuk" style="color:var(--yazi2)">${esc(m.tel || '')}<br>${esc(m.mail || '')}${m.sehir ? ' · ' + esc(m.sehir) : ''}</td>
      <td class="sag-hiza">${m.adet}</td><td class="sag-hiza"><b>${usd(m.net)}</b><div class="kucuk">${tlYap(m.net)}</div></td><td>${m.son ? tarih(m.son) : '—'}</td>
      <td><input data-isk="${esc(m.kul)}" value="${musIsk(m.kul) || ''}" placeholder="0" inputmode="decimal" style="width:70px;padding:7px;border:1px solid var(--cizgi);border-radius:8px"></td>
      <td><input data-not="${esc(m.kul)}" value="${esc((ISK[m.kul] || {}).not || '')}" placeholder="ör. bayi, proje" style="width:140px;padding:7px;border:1px solid var(--cizgi);border-radius:8px"></td></tr>`).join('')}</table>` : '<div class="bos">Henüz müşteri yok.</div>'}</div>`;
  const kaydet = kul => { const o = $(`[data-isk="${CSS.escape(kul)}"]`).value, n = $(`[data-not="${CSS.escape(kul)}"]`).value; const v = Math.min(100, Math.max(0, parseFloat(o.replace(',', '.')) || 0)); ISK[kul] = { oran: v, not: n }; yaz('exs-iskonto', ISK); toast('İskonto kaydedildi: ' + yuzde(v)); };
  $$('[data-isk]').forEach(i => i.onchange = () => kaydet(i.dataset.isk)); $$('[data-not]').forEach(i => i.onchange = () => kaydet(i.dataset.not));
  { // cari bakiye, uyarı ve müşteri kartı sütunları
  $('#baslik').textContent = 'Müşteriler, iskonto ve cari';
  const tb = $('#icerik table.tablo'); if (!tb) return;
  tb.querySelector('tr').insertAdjacentHTML('beforeend', '<th>Cari / uyarı</th><th></th>');
  [...tb.querySelectorAll('tr')].slice(1).forEach(r => { const kul = r.querySelector('[data-isk]').dataset.isk, c = cariOzet(kul);
    r.insertAdjacentHTML('beforeend', `<td><b>${usd(c.bakiye)}</b><div>${uyariRozet(musUyari(MUS[kul] || { kul }))}</div></td><td><button class="btn cizgi" data-kart="${esc(kul)}">Müşteri kartı</button></td>`); });
  $$('[data-kart]').forEach(b => b.onclick = () => musteriKarti(b.dataset.kart));
  }
}
