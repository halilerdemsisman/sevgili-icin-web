// Ekran parçası: bayiye bildirim (WhatsApp / e-posta) siparişin penceresinde.
// ---------- 12. bayiye bildirim (WhatsApp / e-posta)
function bildirimMetni(o) {
  const d = DURUM[o.durum][0], t = tutarlar(o);
  return [`Sayın ${o.ad || o.firma},`, ``, `${o.no} numaralı siparişinizin durumu: *${d}*.`, o.termin ? `Tahmini teslim: ${tarih(o.termin)}` : '', o.kargo ? `Nakliye: ${o.kargo}${o.takip ? ' · Takip no: ' + o.takip : ''}` : '', o.satisNot ? `Not: ${o.satisNot}` : '', `Sipariş tutarı: ${usd(t.net)}`, ``, `Bayi portalındaki “Siparişlerim” ekranından ayrıntıları görebilirsiniz.`, ``, `EXIT Garden Satış Ekibi`].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}
const telTemiz = t => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '9' + d; else if (d.length === 10) d = '90' + d; return d; };
function bildirimGonder(o, kanal) {
  const m = MUS[o.kul] || {}, metin = bildirimMetni(o);
  if (kanal === 'wa') { const tel = telTemiz(m.tel); if (tel.length < 11) return toast('Müşterinin geçerli telefonu yok.'); window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(metin), '_blank'); }
  else { if (!m.mail) return toast('Müşterinin e-posta adresi yok.'); location.href = 'mailto:' + encodeURIComponent(m.mail) + '?subject=' + encodeURIComponent(`EXIT Garden · ${o.no} sipariş durumu: ${DURUM[o.durum][0]}`) + '&body=' + encodeURIComponent(metin.replace(/\*/g, '')); }
  BLD.push({ no: o.no, kul: o.kul, kanal, durum: o.durum, zaman: Date.now(), kim: kimAd() }); yaz('exs-bildirim', BLD.slice(-1000)); o.sonBildirim = o.durum; yaz('exs-siparisler', SIP);
}
// sipariş penceresi: bayiye bildir (WhatsApp / e-posta)
function siparisBildirBandi(p, o) {
  const ekle = () => { if (p.querySelector('#pBild')) return; const k = p.querySelector('#pTeklif'); if (!k) return; const m = MUS[o.kul] || {}, son = BLD.filter(b => b.no === o.no).pop(), bekl = o.sonBildirim !== o.durum && o.durum !== 'yeni';
    k.insertAdjacentHTML('afterend', `<div id="pBild" class="bild ${bekl ? 'bekl' : ''}"><div><b>Bayiye bildir</b><div class="kucuk">${bekl ? 'Durum değişti; bayiye henüz bildirilmedi.' : son ? `Son bildirim: ${son.kanal === 'wa' ? 'WhatsApp' : 'E-posta'} · ${new Date(son.zaman).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })} · ${esc(son.kim)}` : 'Hazır mesaj sipariş durumu, termin ve nakliye bilgisini içerir.'}</div></div>
      <button class="btn wa" id="bWa" ${m.tel ? '' : 'disabled title="Telefon yok"'}>WhatsApp</button><button class="btn cizgi" id="bMail" ${m.mail ? '' : 'disabled title="E-posta yok"'}>E-posta</button></div>`);
    p.querySelector('#bWa').onclick = () => { bildirimGonder(o, 'wa'); p.querySelector('#pBild').remove(); ekle(); };
    p.querySelector('#bMail').onclick = () => { bildirimGonder(o, 'mail'); p.querySelector('#pBild').remove(); ekle(); }; };
  ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true });
}
