'use strict';
const $ = id => document.getElementById(id), M = window.exitMasaustu;
const degistir = new URLSearchParams(location.search).get('degistir') === '1';
M.sunucuAdresi().then(a => { if (a) { $('adres').value = a; if (degistir) $('vazgec').hidden = false; } });
$('vazgec').onclick = () => M.yenidenDene('/satis');
$('f').onsubmit = async e => {
  e.preventDefault(); const b = $('baglan'); b.disabled = true; b.textContent = 'Bağlanıyor…'; $('hata').textContent = '';
  const r = await M.sunucuKaydet($('adres').value).catch(x => ({ ok: false, hata: String(x) }));
  if (!r.ok) { $('hata').textContent = r.hata; b.disabled = false; b.textContent = 'Bağlan'; }
};
