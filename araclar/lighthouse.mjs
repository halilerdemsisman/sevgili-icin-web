// Faz 2c · Bayi web sitesinin Lighthouse ölçümü (telefon: Lighthouse'un varsayılan yavaş 4G ve 4 kat yavaş işlemci benzetimi).
// Geçici bir sunucu boş veriyle açılır, bir bayi kaydedilir ve sayfalar girişli olarak ölçülür (giriş sayfası girişsiz).
// Her sayfa N kez ölçülür, ortanca puan yazılır. Hedef: telefonda performans ≥ 85.
//
// Lighthouse pakete eklenmedi (büyük); ölçümden önce bir kez kurun:
//   npm i --no-save lighthouse@12.6.1 chrome-launcher@1.2.3
//   node araclar/derle.mjs && node araclar/lighthouse.mjs [tekrar=3] [sayfa,sayfa…]
// Chrome yolu: CHROME_YOLU (verilmezse Playwright'ın Chromium'u).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let lighthouse, cl;
try { lighthouse = (await import('lighthouse')).default; cl = await import('chrome-launcher'); }
catch (e) { console.error('Lighthouse kurulu değil. Önce: npm i --no-save lighthouse@12.6.1 chrome-launcher@1.2.3'); process.exit(1); }
const { chromium } = require('playwright');
const yard = require('../testler/yardimci.js');

const N = +process.argv[2] || 3;
const s = await yard.sunucuBaslat();
const c = await s.kayit('lhbayi');
const SAYFALAR = { giris: ['/', null], katalog: ['/katalog', c], urun: ['/urun/21-neo', c], siparisler: ['/siparisler', c], cari: ['/cari', c], belgeler: ['/belgeler', c] };
const sec = (process.argv[3] || Object.keys(SAYFALAR).join(',')).split(',');
const chrome = await cl.launch({ chromePath: process.env.CHROME_YOLU || chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const ortanca = L => [...L].sort((a, b) => a - b)[Math.floor(L.length / 2)];
const KAT = ['performance', 'accessibility', 'best-practices', 'seo'], OLC = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift'];
let hedefAlti = 0;
console.log('sayfa'.padEnd(11), 'perf  erişil.  iyi uyg.  seo   ·  FCP / LCP (sn), TBT (ms), CLS  (ortanca, ' + N + ' ölçüm)');
try {
  for (const ad of sec) {
    const [yol, cerez] = SAYFALAR[ad], R = [];
    for (let i = 0; i < N; i++) {
      const { lhr } = await lighthouse(s.url + yol, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: KAT, extraHeaders: cerez ? { Cookie: cerez } : undefined });
      R.push(lhr);
    }
    const p = Object.fromEntries(KAT.map(k => [k, ortanca(R.map(L => Math.round(L.categories[k].score * 100)))]));
    const o = OLC.map(k => ortanca(R.map(L => L.audits[k].numericValue)));
    if (p.performance < 85) hedefAlti++;
    console.log(ad.padEnd(11), String(p.performance).padEnd(5), String(p.accessibility).padEnd(9), String(p['best-practices']).padEnd(9), String(p.seo).padEnd(5),
      ` ·  ${(o[0] / 1000).toFixed(1)} / ${(o[1] / 1000).toFixed(1)}, ${Math.round(o[2])}, ${o[3].toFixed(3)}`);
  }
} finally { await chrome.kill(); s.kapat(); }
if (hedefAlti) { console.log(`\n${hedefAlti} sayfa hedefin (85) altında.`); process.exitCode = 1; }
