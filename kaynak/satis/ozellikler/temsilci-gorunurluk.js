// Temsilci görünürlüğü (temsilci yalnız atandığı bayileri görür) ve işlem kaydı; sipariş ilerletilirken kredi limiti (v3.1).
(function () {
  const pencere = (html, gen) => pencereAc(html, gen ? 'max-width:760px' : 'max-width:560px');
  const ISL = () => oku('exs-islem', []) || [];
  function islem(olay, detay) { const L = ISL(); L.push({ t: Date.now(), kim: ben ? ben.kul : '-', ad: kimAd ? kimAd() : '', olay, detay: detay || '' }); if (L.length > 3000) L.splice(0, L.length - 3000); yaz('exs-islem', L); }
  window.islemKaydi = islem;
  const temsilciMi = () => ben && !yonetici();
  const HAM = {}, atamaVar = () => Object.values(HAM.MUS || MUS).some(m => m && m.temsilci);
  const gorur = kul => { if (!temsilciMi() || !atamaVar()) return true; const m = MUS[kul]; return !!(m && m.temsilci === ben.kul); };
  function suzgec(obj, kulAl) {
    return new Proxy(obj, {
      ownKeys: t => Reflect.ownKeys(t).filter(k => typeof k !== 'string' || !t[k] || gorur(kulAl(t[k], k))),
      getOwnPropertyDescriptor: (t, k) => { const d = Reflect.getOwnPropertyDescriptor(t, k); if (d && typeof k === 'string' && t[k] && !gorur(kulAl(t[k], k))) return undefined; return d; },
      get: (t, k, r) => k === 'toJSON' ? () => t : Reflect.get(t, k)
    });
  }
  EK.acOnce = function () { if (temsilciMi()) { HAM.MUS = MUS; SIP = suzgec(SIP, o => o.kul); MUS = suzgec(MUS, (m, k) => k); } };
  EK.acSonra = function () {
    islem('Giriş', ROL_AD[rolu(ben)] || '');
    if (temsilciMi()) ['kullanicilar6'].forEach(s => { const b = $(`aside button.m[data-s=${s}]`); b && b.remove(); });
    setTimeout(() => EK.iadeRozet(), 500);
  };
  if (ben && temsilciMi()) { HAM.MUS = MUS; SIP = suzgec(SIP, o => o.kul); MUS = suzgec(MUS, (m, k) => k); }
  // sipariş ilerletilirken kredi limiti; false: durum yazılmaz
  EK.durumLimit = function (no, d) {
    const o = SIP[no], ileri = ['onay', 'uretim', 'sevk'].includes(d) && o && !['onay', 'uretim', 'sevk'].includes(o.durum);
    if (ileri && o && !o.limitOnay) { const r = riskHesap(o.kul); const yeniRisk = r.risk + (['yeni'].includes(o.durum) ? tutarlar(o).net : 0);
      if (r.limit > 0 && yeniRisk > r.limit) {
        if (!yonetici()) { toast(`${(MUS[o.kul] || {}).firma || o.kul}: kredi limiti aşılıyor (${usd(yeniRisk)} / ${usd(r.limit)}). Bu siparişi yönetici onaylamalı.`); islem('Limit engeli', `${no} · ${usd(yeniRisk)} / ${usd(r.limit)}`); try { git(aktif); } catch (e) {} return false; }
        const p = pencere(`<h3>Kredi limiti aşılıyor</h3><p>${esc((MUS[o.kul] || {}).firma || o.kul)} için risk <b>${usd(yeniRisk)}</b> olacak; limit <b>${usd(r.limit)}</b>. Vadesi geçmiş: <b>${usd(r.gecmis)}</b>.</p><p class="kucuk">Onaylarsanız sipariş limit aşımı onayıyla işleme alınır ve işlem kaydına yazılır.</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn cizgi" id="lmVaz">Vazgeç</button><button class="btn marka" id="lmOk">Limiti aşarak onayla</button></div>`);
        p.querySelector('#lmVaz').onclick = () => { p.remove(); try { git(aktif); } catch (e) {} };
        p.querySelector('#lmOk').onclick = () => { o.limitOnay = { kim: kimAd(), zaman: Date.now(), risk: yeniRisk, limit: r.limit }; islem('Limit aşımı onayı', `${no} · ${usd(yeniRisk)} / ${usd(r.limit)}`); p.remove(); durumYaz(no, d); };
        return false;
      } }
    return true;
  };
  EK.durumIslem = (no, eski, d) => islem('Sipariş durumu', `${no}: ${eski} → ${d}`);
  EK.faturaIslem = o => islem('Fatura kesildi', `FT-${o.no} · ${usd(tutarlar(o).net)}`); // faturaKes yalnız yeni fatura kesince çağırır
  EK.gorur = gorur; EK.atamaVar = atamaVar; EK.islemListesi = ISL;
})();
