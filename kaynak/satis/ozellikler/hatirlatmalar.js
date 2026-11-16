// Hatırlatmalar (v2.9): satış ekibinin kendi hatırlatmaları ve otomatik uyarılar; bayiye hatırlatma.
(function () {
  const IK = { karne: '<path d="M4 4h16v16H4z"/><path d="M8 16v-4M12 16V8M16 16v-6"/>', hat: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' };
  const dug = (s, ik, ad) => `<button class="m" data-s="${s}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[ik]}</svg>${ad} <span class="say gizli"></span></button>`;
  const nb = $('aside button.m[data-s=numuneler]') || $('aside button.m[data-s=siparisler]');
  if (nb && !$('aside button.m[data-s=hatirlatmalar]')) nb.insertAdjacentHTML('afterend', dug('hatirlatmalar', 'hat', 'Hatırlatmalar'));
  const pencere = (html, gen) => pencereAc(html, gen ? '' : 'max-width:620px');
  const htYaz = () => yaz('exs-hatirlatma', HT);
  const bayiHat = () => oku('exb-hatirlat', []);
  function bayiyeHatirlat(kul, tur, metin) { const M = bayiHat(); M.push({ id: 'm' + Date.now().toString(36), kul, tur, metin, zaman: Date.now(), kim: kimAd(), okundu: false }); yaz('exb-hatirlat', M); }
  function otomatik() {
    const A = [], now = Date.now(), bg = bugunISO(), gz = oku('exs-hat-gizli', {}) || {}, ekle = x => { if (gz[x.k] !== bg) A.push(x); };
    Object.values(SIP).filter(o => o.durum === 'yeni' && now - o.tarih > GUN).sort((a, b) => a.tarih - b.tarih).forEach(o => ekle({ k: 'sy-' + o.no, renk: 'kirmizi', metin: `${o.no} · ${o.firma}: ${Math.floor((now - o.tarih) / GUN)} gündür yanıt bekliyor`, alt: usd(tutarlar(o).net) + ' · ' + tarih(o.tarih), sip: o.no }));
    Object.values(SIP).filter(o => o.termin && ['onay', 'uretim'].includes(o.durum)).forEach(o => { const g = gunFarki(o.termin); if (g <= 3) ekle({ k: 'tr-' + o.no + o.termin, renk: g < 0 ? 'kirmizi' : 'sari', metin: `${o.no} · ${o.firma}: termin ${g < 0 ? -g + ' gün geçti' : g === 0 ? 'bugün' : g + ' gün sonra'}`, alt: 'Termin ' + tarih(o.termin) + ' · ' + DURUM[o.durum][0], sip: o.no }); });
    Object.values(MUS).forEach(m => { const c = cariOzet(m.kul); if (c.gecmis > 0.5) { const son = bayiHat().filter(x => x.kul === m.kul && x.tur === 'odeme').sort((a, b) => b.zaman - a.zaman)[0];
      ekle({ k: 'vg-' + m.kul, renk: 'kirmizi', metin: `${m.firma || m.kul}: vadesi geçmiş ${usd(c.gecmis)} (${c.gecikmeGun} gün)`, alt: son ? 'Bayiye son hatırlatma ' + tarih(son.zaman) + (son.okundu ? ' · okundu' : ' · okunmadı') : 'Bayiye henüz hatırlatma gönderilmedi', kul: m.kul, odeme: c.gecmis }); } });
    Object.values(MUS).forEach(m => { const S = Object.values(SIP).filter(o => o.kul === m.kul && o.durum !== 'iptal'); if (!S.length) return; const g = Math.floor((now - Math.max(...S.map(o => o.tarih))) / GUN); if (g >= SESSIZ_GUN) ekle({ k: 'ss-' + m.kul, renk: 'mavi', metin: `${m.firma || m.kul}: ${g} gündür sipariş yok`, alt: 'Arayıp görüşme notu ekleyin', kul: m.kul }); });
    const od = oku('exb-odeme', []).filter(o => o.durum === 'bekliyor').length, nm = oku('exb-numune', []).filter(o => o.durum === 'yeni').length;
    if (od) ekle({ k: 'od', renk: 'sari', metin: `${od} ödeme bildirimi kontrol bekliyor`, git: 'odemeler' });
    if (nm) ekle({ k: 'nm', renk: 'sari', metin: `${nm} numune talebi bekliyor`, git: 'numuneler' });
    (typeof KMP !== 'undefined' ? KMP : []).filter(k => kmpDurum(k)[0] === 'Yayında' && k.bit).forEach(k => { const g = gunFarki(k.bit); if (g >= 0 && g <= 3) ekle({ k: 'km-' + k.ad + k.bit, renk: 'yesil', metin: `“${k.ad}” kampanyası ${g === 0 ? 'bugün' : g + ' gün sonra'} bitiyor`, alt: 'Uzatmak isterseniz Kampanyalar’dan düzenleyin', git: 'kampanyalar' }); });
    return A;
  }
  const vadesi = () => HT.filter(h => !h.bitti && h.tarih <= bugunISO());
  function htRozet() { const n = vadesi().length + otomatik().filter(x => x.renk === 'kirmizi').length, r = $('aside button.m[data-s=hatirlatmalar] .say'); if (r) { r.textContent = n; r.classList.toggle('gizli', !n); } return n; }
  function hatirlatmalar() {
    $('#baslik').textContent = 'Hatırlatmalar'; HT = oku('exs-hatirlatma', []);
    const A = otomatik(), bg = bugunISO(), G = HT.filter(h => !h.bitti && h.tarih < bg), B = HT.filter(h => !h.bitti && h.tarih === bg), Y = HT.filter(h => !h.bitti && h.tarih > bg).sort((a, b) => a.tarih.localeCompare(b.tarih)), T = HT.filter(h => h.bitti).sort((a, b) => b.bitti - a.bitti).slice(0, 10);
    const MS = Object.values(MUS).sort((a, b) => (a.firma || a.kul).localeCompare(b.firma || b.kul, 'tr'));
    const kendi = (h, renk) => `<div class="ht ${renk}"><span class="n"></span><div class="m"><b>${esc(h.metin)}</b><small>${tarih(h.tarih)}${h.tarih < bg ? ' · ' + -gunFarki(h.tarih) + ' gün gecikti' : ''}${h.kul ? ' · ' + esc(firmaAd(h.kul)) : ''}${h.no ? ' · ' + esc(h.no) : ''} · ${esc(h.kim || '')}</small></div>
      <div class="a">${h.no && SIP[h.no] ? `<button class="btn cizgi" data-hsp="${esc(h.no)}">Sipariş</button>` : ''}${h.kul ? `<button class="btn cizgi" data-hkr="${esc(h.kul)}">Kart</button>` : ''}<button class="btn marka" data-hb="${h.id}">Tamamlandı</button><button class="btn cizgi" data-he="${h.id}" data-g="1">Yarın</button><button class="btn cizgi" data-he="${h.id}" data-g="7">+1 hafta</button><button class="btn cizgi" data-hs="${h.id}">Sil</button></div></div>`;
    $('#icerik').innerHTML = `<div class="kpi"><div><span>Gecikmiş</span><b style="color:${G.length ? 'var(--kotu)' : 'inherit'}">${G.length}</b><small>tarihi geçen hatırlatma</small></div><div><span>Bugün</span><b>${B.length}</b><small>yapılacak</small></div><div><span>Yaklaşan</span><b>${Y.length}</b><small>planlanan</small></div><div><span>Otomatik uyarı</span><b>${A.length}</b><small>${A.filter(x => x.renk === 'kirmizi').length} acil</small></div></div>
      <div class="kart"><h3>Yeni hatırlatma</h3><div class="ht-form"><div class="alan" style="margin:0"><label>Ne yapılacak?</label><input id="htMet" placeholder="Örn. Akdeniz Bahçe'yi teklif için ara"></div>
        <div class="alan" style="margin:0"><label>Tarih</label><input id="htTar" type="date" value="${bg}"></div>
        <div class="alan" style="margin:0"><label>Bayi (isteğe bağlı)</label><select id="htKul"><option value="">—</option>${MS.map(m => `<option value="${esc(m.kul)}">${esc(m.firma || m.kul)}</option>`).join('')}</select></div>
        <div class="alan" style="margin:0"><label>Sipariş no (isteğe bağlı)</label><input id="htNo" placeholder="EXG-2026-0001" list="htSipL"><datalist id="htSipL">${sipList().slice(0, 50).map(o => `<option value="${o.no}">${esc(o.firma)}</option>`).join('')}</datalist></div>
        <button class="btn marka" id="htEkle">Ekle</button></div></div>
      <div class="kart"><h3>Bugün ve gecikmiş (${G.length + B.length})</h3>${G.length + B.length ? G.map(h => kendi(h, 'kirmizi')).join('') + B.map(h => kendi(h, 'sari')).join('') : '<div class="kucuk">Bugün için hatırlatma yok.</div>'}</div>
      <div class="kart"><h3>Otomatik uyarılar (${A.length})</h3><div class="alt">Sistem bunları siparişlerden, cari hesaplardan, bayi bildirimlerinden ve kampanyalardan çıkarır. Sorun çözülünce kendiliğinden kaybolur; “Bugün gizle” ile gün boyu saklayabilirsiniz.</div>
        ${A.length ? A.map((x, i) => `<div class="ht ${x.renk}"><span class="n"></span><div class="m"><b>${esc(x.metin)}</b>${x.alt ? `<small>${esc(x.alt)}</small>` : ''}</div><div class="a">
          ${x.sip ? `<button class="btn marka" data-asp="${i}">Siparişi aç</button>` : ''}${x.odeme ? `<button class="btn marka" data-abh="${i}">Bayiye hatırlat</button>` : ''}${x.kul ? `<button class="btn cizgi" data-akr="${i}">Müşteri kartı</button>` : ''}${x.git ? `<button class="btn marka" data-agt="${i}">Git</button>` : ''}
          <button class="btn cizgi" data-ahs="${i}">Bana hatırlat</button><button class="btn cizgi" data-agz="${i}">Bugün gizle</button></div></div>`).join('') : '<div class="kucuk">Şu an otomatik uyarı yok.</div>'}</div>
      <div class="kart"><h3>Yaklaşan (${Y.length})</h3>${Y.length ? Y.map(h => kendi(h, '')).join('') : '<div class="kucuk">Planlanmış hatırlatma yok.</div>'}</div>
      ${T.length ? `<div class="kart"><h3>Son tamamlananlar</h3>${T.map(h => `<div class="ht yesil"><span class="n"></span><div class="m" style="opacity:.7"><s>${esc(h.metin)}</s><small>${tarih(h.tarih)} · ${new Date(h.bitti).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })} tamamlandı</small></div></div>`).join('')}</div>` : ''}`;
    const yenile = () => { htRozet(); hatirlatmalar(); };
    $('#htEkle').onclick = () => { const m = $('#htMet').value.trim(); if (!m) return toast('Ne yapılacağını yazın.'); HT.push({ id: 'h' + Date.now().toString(36), metin: m, tarih: $('#htTar').value || bg, kul: $('#htKul').value, no: $('#htNo').value.trim(), kim: kimAd(), zaman: Date.now() }); htYaz(); toast('Hatırlatma eklendi.'); yenile(); };
    const bul = id => HT.find(h => h.id === id);
    $$('[data-hb]').forEach(b => b.onclick = () => { bul(b.dataset.hb).bitti = Date.now(); htYaz(); yenile(); });
    $$('[data-he]').forEach(b => b.onclick = () => { const d = new Date(); d.setDate(d.getDate() + +b.dataset.g); bul(b.dataset.he).tarih = d.toISOString().slice(0, 10); htYaz(); toast('Ertelendi: ' + tarih(d)); yenile(); });
    $$('[data-hs]').forEach(b => b.onclick = () => { if (!b.dataset.emin) { b.dataset.emin = 1; b.textContent = 'Silinsin mi?'; return; } HT = HT.filter(h => h.id !== b.dataset.hs); htYaz(); yenile(); });
    $$('[data-hsp]').forEach(b => b.onclick = () => siparisAc(b.dataset.hsp));
    $$('[data-hkr]').forEach(b => b.onclick = () => musteriKarti(b.dataset.hkr));
    $$('[data-asp]').forEach(b => b.onclick = () => siparisAc(A[+b.dataset.asp].sip));
    $$('[data-akr]').forEach(b => b.onclick = () => musteriKarti(A[+b.dataset.akr].kul));
    $$('[data-agt]').forEach(b => b.onclick = () => git(A[+b.dataset.agt].git));
    $$('[data-agz]').forEach(b => b.onclick = () => { const Gz = oku('exs-hat-gizli', {}) || {}; Gz[A[+b.dataset.agz].k] = bg; yaz('exs-hat-gizli', Gz); yenile(); });
    $$('[data-ahs]').forEach(b => b.onclick = () => { const x = A[+b.dataset.ahs], d = new Date(); d.setDate(d.getDate() + 1); HT.push({ id: 'h' + Date.now().toString(36), metin: x.metin, tarih: d.toISOString().slice(0, 10), kul: x.kul || (x.sip && SIP[x.sip] ? SIP[x.sip].kul : ''), no: x.sip || '', kim: kimAd(), zaman: Date.now() }); htYaz(); toast('Yarın için hatırlatma eklendi.'); yenile(); });
    $$('[data-abh]').forEach(b => b.onclick = () => { const x = A[+b.dataset.abh];
      const p = pencere(`<h2 style="margin:0 0 4px">Bayiye ödeme hatırlatması</h2><div class="kucuk" style="margin-bottom:12px">${esc(firmaAd(x.kul))} bu mesajı portalda Hatırlatmalar bölümünde görür.</div>
        <div class="alan"><label>Mesaj</label><textarea id="bhMet" rows="4">Sayın ${esc(firmaAd(x.kul))}, cari hesabınızda vadesi geçmiş ${usd(x.odeme)} bakiye bulunuyor. Ödemenizi yaptıysanız portaldaki Cari hesabım ekranından dekontla bildirebilirsiniz. Teşekkürler, EXIT Garden</textarea></div>
        <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn cizgi" id="bhVaz">Vazgeç</button><button class="btn marka" id="bhGon">Gönder</button></div>`);
      p.querySelector('#bhVaz').onclick = () => p.remove();
      p.querySelector('#bhGon').onclick = () => { const m = p.querySelector('#bhMet').value.trim(); if (!m) return; bayiyeHatirlat(x.kul, 'odeme', m); (CRM[x.kul] = CRM[x.kul] || []).push({ tarih: Date.now(), tur: 'Portal', yazi: 'Ödeme hatırlatması gönderildi', kim: kimAd() }); yaz('exs-crm', CRM); p.remove(); toast('Hatırlatma bayi portalına gönderildi.'); yenile(); }; });
  }
  EK.sayfalar.hatirlatmalar = ['Hatırlatmalar', hatirlatmalar]; EK.hatirlatmaRozeti = () => htRozet();
  // başka bir ekran (ziyaret kaydı) hatırlatma ekleyince liste ve rozet güncellensin (önceden yalnız sayfa açılınca)
  EK.hatirlatmaYenile = () => { HT = oku('exs-hatirlatma', []); htRozet(); };
  $$('aside button.m[data-s]').forEach(b => b.onclick = () => git(b.dataset.s));
  let ilk = true;
  EK.acHatirlatma = function () { setTimeout(() => { if (!ilk) return; ilk = false; const n = vadesi().length; if (n) toast(`Bugün ${n} hatırlatmanız var.`); }, 3200); };
  setInterval(() => { if (ben) htRozet(); }, 30000);
})();
