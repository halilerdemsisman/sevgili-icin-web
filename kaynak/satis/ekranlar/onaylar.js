// Ekran: onay bekleyenler.
// ---------- 9. onay akışı
// Onay kuralı v2.7'de kaldırıldı (sadeleştirme): hiçbir sipariş yönetici onayına takılmaz. Kural ayarı (ONAY) ve
// eski kayıtlar için "Onay bekleyenler" ekranı korunur.
function onayGerekli() { return []; }
const onayBekleyen = () => Object.values(SIP).filter(o => o.onay && o.onay.durum === 'bekliyor');
function onaySay() { const n = onayBekleyen().length, b = $('aside button.m[data-s=onaylar]'); if (!b) return; let r = b.querySelector('.say'); if (!r) { b.insertAdjacentHTML('beforeend', '<span class="say gizli"></span>'); r = b.querySelector('.say'); } r.textContent = n; r.classList.toggle('gizli', !n); }
const onayImza = o => { const t = tutarlar(o); return Math.round(t.net) + '|' + Math.round(t.oran * 10); };
function onaylar() {
  $('#baslik').textContent = 'Onay bekleyenler';
  const L = onayBekleyen(), G = Object.values(SIP).filter(o => o.onay && o.onay.durum !== 'bekliyor' && !o.onay.otomatik).sort((a, b) => (b.onay.karar || 0) - (a.onay.karar || 0)).slice(0, 20);
  $('#icerik').innerHTML = `<div class="kart"><h3>Onay kuralı</h3><div class="alt">Toplam iskontosu <b>${yuzde(ONAY.iskonto)}</b> üstünde veya net tutarı <b>${usd(ONAY.tutar)}</b> üstünde olan sipariş, temsilci onaylamak istediğinde yönetici onayına düşer. Yönetici onaylayınca sipariş istenen duruma geçer. ${yonetici() ? 'Kuralı Ayarlar’dan değiştirebilirsiniz.' : ''}</div></div>
    <div class="kart"><h3>Bekleyen talepler (${L.length})</h3>${L.length ? `<table class="tablo"><tr><th>Sipariş</th><th>Müşteri</th><th class="sag-hiza">Net</th><th class="sag-hiza">İskonto</th><th>Neden</th><th>İsteyen</th><th></th></tr>
      ${L.map(o => { const t = tutarlar(o); return `<tr><td><b class="tik" data-ac="${o.no}" style="cursor:pointer">${o.no}</b><div class="kucuk">${tarih(o.tarih)}</div></td><td>${esc(o.firma)}</td><td class="sag-hiza"><b>${usd(t.net)}</b></td><td class="sag-hiza">${yuzde(t.oran)}</td><td class="kucuk">${esc(o.onay.neden.join(', '))}</td><td class="kucuk">${esc(o.onay.isteyen)}<br>${new Date(o.onay.zaman).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td style="white-space:nowrap">${yonetici() ? `<button class="btn marka" data-on="${o.no}">Onayla</button> <button class="btn cizgi" data-red="${o.no}">Reddet</button>` : '<span class="kucuk">Yönetici bekleniyor</span>'}</td></tr>`; }).join('')}</table>` : '<div class="kucuk">Onay bekleyen sipariş yok.</div>'}</div>
    ${G.length ? `<div class="kart"><h3>Son kararlar</h3><table class="tablo"><tr><th>Sipariş</th><th>Karar</th><th>Karar veren</th><th>Not</th></tr>${G.map(o => `<tr><td>${o.no}</td><td><span class="durum ${o.onay.durum === 'onaylandi' ? 'd-onay' : 'd-iptal'}">${o.onay.durum === 'onaylandi' ? 'Onaylandı' : 'Reddedildi'}</span></td><td class="kucuk">${esc(o.onay.kim || '')} · ${o.onay.karar ? new Date(o.onay.karar).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</td><td class="kucuk">${esc(o.onay.not || '')}</td></tr>`).join('')}</table></div>` : ''}`;
  $$('[data-ac]').forEach(b => b.onclick = () => siparisAc(b.dataset.ac));
  $$('[data-on]').forEach(b => b.onclick = () => { const o = SIP[b.dataset.on]; const hd = o.onay.hedefDurum || 'onay'; o.onay = { ...o.onay, durum: 'onaylandi', kim: kimAd(), karar: Date.now(), imza: onayImza(o) }; yaz('exs-siparisler', SIP); durumYaz(o.no, hd); toast(o.no + ' onaylandı.'); onaylar(); });
  $$('[data-red]').forEach(b => b.onclick = () => { const o = SIP[b.dataset.red]; const n = prompt('Ret nedeni (temsilci görür):', '') || ''; o.onay = { ...o.onay, durum: 'reddedildi', kim: kimAd(), karar: Date.now(), not: n }; yaz('exs-siparisler', SIP); onaySay(); toast(o.no + ' reddedildi.'); onaylar(); });
}
// sipariş penceresinde onay durumu
// sipariş penceresi: yönetici onayı bandı
function siparisOnayBandi(p, o) {
  const ekle = () => { if (p.querySelector('#pOnay')) return; const h = p.querySelector('h2'); if (!h) return; const N = onayGerekli(o);
    let m = ''; if (o.onay && o.onay.durum === 'bekliyor') m = `<div class="onay-b bekliyor">Yönetici onayı bekleniyor (${esc(o.onay.neden.join(', '))}) · isteyen ${esc(o.onay.isteyen)}</div>`;
    else if (o.onay && o.onay.durum === 'reddedildi') m = `<div class="onay-b red">Yönetici reddetti${o.onay.not ? ': ' + esc(o.onay.not) : ''} · ${esc(o.onay.kim)}</div>`;
    else if (o.onay && o.onay.durum === 'onaylandi') m = `<div class="onay-b ok">Yönetici onayı: ${esc(o.onay.kim)}${o.onay.imza !== onayImza(o) ? ' · iskonto/tutar değiştiği için yeniden onay gerekir' : ''}</div>`;
    else if (N.length) m = `<div class="onay-b bilgi">Onay kuralına takılıyor: ${esc(N.join(', '))}. ${yonetici() ? 'Yönetici olarak doğrudan onaylayabilirsiniz.' : 'Durumu ilerlettiğinizde yönetici onayına gider.'}</div>`;
    if (m) h.insertAdjacentHTML('afterend', `<div id="pOnay">${m}</div>`); };
  ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
}
