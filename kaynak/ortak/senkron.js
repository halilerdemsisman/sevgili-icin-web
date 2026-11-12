// Ortak sunucu senkronu: sayfa http(s) üzerinden sunucudan açılınca veriler sunucuda tutulur ve tüm cihazlarda ortak olur.
(function () {
  if (!/^https?:$/.test(location.protocol)) return;
  const YEREL = /^(exb-dil|exb-oturum|exs-oturum|exs-ai-anahtar|exit-tema|exb-kars)$/;
  const ORTAK = k => /^ex[bs]-/.test(k) && !YEREL.test(k);
  const S = Storage.prototype, setI = S.setItem, remI = S.removeItem, getI = S.getItem;
  let son = 0, yuklu = false;
  try {
    const x = new XMLHttpRequest(); x.open('GET', 'api/veri', false); x.send();
    if (x.status === 200) { const j = JSON.parse(x.responseText); son = j.zaman || 0; yuklu = true;
      const yerel = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ORTAK(k)) yerel.push(k); }
      if (!j.zaman) { const ilk = yerel.map(k => [k, getI.call(localStorage, k)]); if (ilk.length) { const y = new XMLHttpRequest(); y.open('POST', 'api/veri', false); y.setRequestHeader('Content-Type', 'application/json'); y.send(JSON.stringify({ degisen: ilk })); son = JSON.parse(y.responseText).zaman; } }
      else yerel.forEach(k => { if (!(k in j.veri)) remI.call(localStorage, k); });
      Object.entries(j.veri).forEach(([k, v]) => setI.call(localStorage, k, v)); }
  } catch (e) {}
  window.EXIT_SUNUCU = yuklu;
  if (!yuklu) return;
  const kuyruk = new Map(); let zam = null;
  const gonder = () => { zam = null; const L = [...kuyruk]; kuyruk.clear();
    fetch('api/veri', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ degisen: L }) })
      .then(r => r.json()).then(j => { (j.birlesen || []).forEach(([k, v]) => { if (getI.call(localStorage, k) !== v) setI.call(localStorage, k, v); }); })
      .catch(() => { L.forEach(([k, v]) => kuyruk.has(k) || kuyruk.set(k, v)); zam = zam || setTimeout(gonder, 4000); durum(false); }); };
  const sira = (k, v) => { kuyruk.set(k, v); clearTimeout(zam); zam = setTimeout(gonder, 250); };
  S.setItem = function (k, v) { setI.call(this, k, v); if (this === localStorage && ORTAK(k)) sira(k, String(v)); };
  S.removeItem = function (k) { remI.call(this, k); if (this === localStorage && ORTAK(k)) sira(k, null); };
  const cek = () => fetch('api/degisen?son=' + son, { cache: 'no-store' }).then(r => r.json()).then(j => { son = j.zaman; durum(true);
    j.degisen.forEach(([k, v]) => { if (kuyruk.has(k)) return; v == null ? remI.call(localStorage, k) : getI.call(localStorage, k) !== v && setI.call(localStorage, k, v); }); }).catch(() => durum(false));
  setInterval(cek, 4000);
  addEventListener('beforeunload', () => { if (kuyruk.size) navigator.sendBeacon('api/veri', new Blob([JSON.stringify({ degisen: [...kuyruk] })], { type: 'application/json' })); });
  let rozet; function durum(ok) { if (!document.body) return; if (!rozet) { rozet = document.createElement('div'); rozet.id = 'sunucuDurum'; rozet.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;font:600 11px Inter,Segoe UI,sans-serif;padding:5px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:none'; document.body.appendChild(rozet); }
    rozet.textContent = ok ? '● Sunucuya bağlı' : '● Sunucu bağlantısı yok, değişiklikler bekletiliyor'; rozet.style.background = ok ? '#ecfdf5' : '#fef2f2'; rozet.style.color = ok ? '#047857' : '#b91c1c'; rozet.style.opacity = ok ? '.75' : '1'; }
})();
