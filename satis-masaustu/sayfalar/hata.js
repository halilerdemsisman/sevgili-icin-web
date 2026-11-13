'use strict';
const $ = id => document.getElementById(id), M = window.exitMasaustu, q = new URLSearchParams(location.search);
$('adres').textContent = q.get('adres') || '—'; $('hata').textContent = q.get('hata') || '—';
const dene = () => M.yenidenDene(q.get('yol') || '/satis');
$('dene').onclick = dene;
$('degistir').onclick = () => { location.href = 'kurulum.html?degistir=1'; };
addEventListener('online', dene);
setInterval(() => { if (navigator.onLine) dene(); }, 15000);
