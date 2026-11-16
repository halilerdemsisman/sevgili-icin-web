// Çekirdek: döviz kuru (USD bazlı, otomatik güncel).
// ---------- kur (USD bazlı, otomatik güncel)
async function kurGuncelle(sessiz) {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json(); if (j.result !== 'success') throw new Error('yanıt');
    KUR = { TRY: j.rates.TRY, EUR: j.rates.EUR, zaman: Date.now(), kaynak: 'open.er-api.com (' + new Date(j.time_last_update_unix * 1000).toLocaleDateString('tr-TR') + ')' };
    yaz('exs-kur', KUR); kurCiz(); if (!sessiz) toast('Kur güncellendi: 1 $ = ' + KUR.TRY.toFixed(4) + ' ₺');
  } catch (e) { kurCiz(true); if (!sessiz) toast('Kur alınamadı (internet bağlantısını kontrol edin). Son bilinen kur kullanılıyor.'); }
}
function kurCiz(hata) {
  $('#kurKutu').innerHTML = KUR.TRY ? `<div style="display:flex;justify-content:space-between"><span>USD/TRY</span><b>${KUR.TRY.toFixed(4)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-top:4px"><span>USD/EUR</span><b>${KUR.EUR.toFixed(4)}</b></div>
    <div style="margin-top:8px;color:#94a3b8">${hata ? '⚠ Güncellenemedi · ' : ''}${KUR.elle ? 'Elle girildi · ' : ''}${new Date(KUR.zaman).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</div>
    <button class="btn kucuk cizgi" id="kurYenile" style="margin-top:8px;width:100%;background:#111827;color:#fff;border-color:#374151">Kuru yenile</button>`
    : `<span>Kur bilgisi yok.</span><button class="btn kucuk" id="kurYenile" style="margin-top:8px;width:100%">Kuru getir</button>`;
  $('#kurYenile').onclick = () => kurGuncelle();
}
const tlYap = n => KUR.TRY ? tl(n * KUR.TRY) : '—';
