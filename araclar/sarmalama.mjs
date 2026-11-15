// Ekran ve ek haritası (Faz 2b-2 / 3b-2).
//
// Eskiden "ek" parçaları global ekran fonksiyonlarını
//   const _eski = git;  git = function (s) { …; _eski(s); }
// deseniyle üst üste sarıyordu (sıra bağımlı, hatası zor bulunur; rapor K2). Artık her ekran fonksiyonu
// tek yerde tanımlı ve eklerini (EK.<ad>) kendi içinde, yazılı sırayla çağırır. Bu araç:
//   - kalan sarmalamaları bulur (olmamalı),
//   - her ekran fonksiyonunun hangi ekleri hangi sırayla çağırdığını ve eklerin nerede tanımlı olduğunu
//     docs/SARMALAMA_HARITASI.md dosyasına yazar,
//   - çağrılıp hiçbir parçada tanımlanmamış ek olup olmadığını denetler.
//
// Kullanım: node araclar/sarmalama.mjs            haritayı yazar
//           node araclar/sarmalama.mjs --denetle  sarmalama veya tanımsız ek varsa 1 ile çıkar (testlerde)
//           node araclar/sarmalama.mjs --denetle bayi   yalnız bir uygulamayı denetler
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KAYNAK = path.join(KOK, 'kaynak');
const UYG = { bayi: 'Bayi portalı', satis: 'Satış paneli' };
const DENETLE = process.argv.includes('--denetle');
const YALNIZ = process.argv.slice(2).filter(a => UYG[a]); // ör. --denetle bayi

// süslü parantezi kapanan bloğun sonu (dizgi/yorum ayrımı yapmaz; kaynak kodda yeterli)
const blokSonu = (m, j) => { let d = 0; for (let k = j; k < m.length; k++) { if (m[k] === '{') d++; else if (m[k] === '}' && !--d) return k; } return m.length; };

let md = `# Ekran ve ek haritası

Bu dosya \`node araclar/sarmalama.mjs\` ile otomatik üretilir; elle düzenlemeyin.

Her ekran fonksiyonu (\`git\`, \`katalog\`, \`urunAc\`, \`siparisAc\`…) tek yerde tanımlıdır. Sonradan eklenen
özellikler kendi parçalarında \`EK.<ad>\` olarak tanımlanır ve ekran fonksiyonu bunları kendi içinde, aşağıdaki
sırayla çağırır. Eskiden bu ekler fonksiyonu üst üste sarıyordu (\`const _eski = git; git = function …\`):
çalışma sırası parçaların yükleme sırasına bağlıydı ve bir ekranda neyin çalıştığı tek yerden görülemiyordu
(rapor K2: bayi 11 fonksiyon 38 sarma, satış 14 fonksiyon 33 sarma). Faz 2b-2 / 3b-2'de hepsi birleştirildi.

Yeni bir özellik eklerken: parçada \`EK.yeniAd = function (…) { … }\` tanımlayın ve ekran fonksiyonunun
içinde uygun yere \`EK.yeniAd?.(…)\` çağrısını yazın. Ekran fonksiyonunu yeniden atamayın;
\`node araclar/sarmalama.mjs --denetle\` (testlerde çalışır) sarmalamayı ve tanımsız eki hata sayar.
`;

let hata = 0;
for (const [uyg, baslik] of Object.entries(UYG)) {
  const sablon = fs.readFileSync(path.join(KAYNAK, uyg, 'sablon.html'), 'utf8');
  // {{web yol}}: yalnız web sitesine giren parçalar (Faz 2a)
  const parcalar = [...sablon.matchAll(/\{\{(?:dahil|web) ([^}]+\.js)\}\}/g)].map(m => m[1]);
  const metinler = Object.fromEntries(parcalar.map(p => [p, fs.readFileSync(path.join(KAYNAK, p), 'utf8')]));
  const kisa = p => p.replace(/^.*\//, '');

  // 1) kalan sarmalamalar: const _x = ad;  …  ad = function / ad = (…) =>
  const sarma = [];
  for (const [p, metin] of Object.entries(metinler)) {
    for (const m of metin.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*((?:window\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*;/g)) {
      const [, sakli, ad] = m;
      if (/\.on[a-z]+$/.test(ad)) continue; // DOM olay işleyicisini zincirleme (o = b.onclick; b.onclick = …) ekran fonksiyonu değil
      const yeniden = new RegExp(`(?:^|[\\s;(])(?:window\\.)?${ad.replace(/^window\./, '').replace(/[$.]/g, '\\$&')}\\s*=\\s*(?:async\\s+)?(?:function\\b|\\(|[A-Za-z_$][\\w$]*\\s*=>)`, 'm');
      if (!yeniden.test(metin.slice(m.index + m[0].length))) continue;
      sarma.push(`\`${ad}\` ${kisa(p)}:${metin.slice(0, m.index).split('\n').length} (\`${sakli}\`)`);
    }
  }

  // 2) ek tanımları ve çağrıları
  const tanim = {}, cagri = {};
  for (const [p, metin] of Object.entries(metinler)) {
    for (const m of metin.matchAll(/\bEK\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) tanim[m[1]] = `${kisa(p)}:${metin.slice(0, m.index).split('\n').length}`;
    for (const t of metin.matchAll(/\bconst EK = \{(.*)\};/g)) for (const m of t[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) tanim[m[1]] = `${kisa(p)}:${metin.slice(0, t.index).split('\n').length}`;
    for (const m of metin.matchAll(/\bEK\.([A-Za-z_$][\w$]*)(?![\w$])(?!\s*=(?!=))/g)) (cagri[m[1]] ||= []).push(p);
    // EK_SAYFA gibi tablolarda ad dizgi olarak geçer: { projeler: 'projeler', … }
    for (const t of metin.matchAll(/\bEK_[A-Z]+ = \{([^}]*)\}/g)) for (const m of t[1].matchAll(/:\s*'([\w$]+)'/g)) (cagri[m[1]] ||= []).push(p);
  }
  const tanimsiz = Object.keys(cagri).filter(a => !tanim[a]);
  const kullanilmayan = Object.keys(tanim).filter(a => !cagri[a]);

  // 3) ekran fonksiyonları: gövdesinde EK çağıran, en üst düzeyde tanımlı fonksiyonlar
  const ekran = [];
  for (const [p, metin] of Object.entries(metinler)) {
    for (const m of metin.matchAll(/^\s*(?:(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|(S6\.[A-Za-z_$][\w$]*)\s*=\s*function)\s*\(/gm)) {
      if (!m[1] && !m[2]) continue; m[1] = m[1] || m[2];
      if (/^\s+function/.test(m[0])) continue; // iç içe fonksiyonlar değil, en üst düzey

      const bas = metin.indexOf('{', m.index + m[0].length), son = blokSonu(metin, bas), govde = metin.slice(bas, son);
      const yerler = [...govde.matchAll(/\bEK\.([A-Za-z_$][\w$]*)(?=\?\.\(|\(|\s*&&|\))/g)].map(x => [x.index, x[1]]);
      for (const t of govde.matchAll(/EK\[EK_([A-Z]+)\[/g)) { const tb = metin.match(new RegExp(`\\bEK_${t[1]} = \\{([^}]*)\\}`)); if (tb) yerler.push(...[...tb[1].matchAll(/:\s*'([\w$]+)'/g)].map((x, i) => [t.index + i / 100, x[1]])); }
      const adlar = [...new Set(yerler.sort((x, y) => x[0] - y[0]).map(x => x[1]))];
      if (adlar.length) ekran.push({ ad: m[1], yer: `${kisa(p)}:${metin.slice(0, m.index).split('\n').length}`, adlar });
    }
  }

  md += `\n## ${baslik}\n\nYükleme sırası: ${parcalar.map(p => '`' + kisa(p) + '`').join(' → ')}\n\n`;
  md += `| Ekran fonksiyonu | Tanım | Ekler (çağrılma sırasıyla) |\n|---|---|---|\n`;
  for (const e of ekran) md += `| \`${e.ad}\` | ${e.yer} | ${e.adlar.map(a => `\`${a}\` (${tanim[a] || 'TANIMSIZ'})`).join(' → ')} |\n`;
  md += `\nToplam: ${ekran.length} ekran fonksiyonu, ${Object.keys(tanim).length} ek. Kalan sarmalama: ${sarma.length ? sarma.join(', ') : 'yok'}.\n`;
  if (kullanilmayan.length) md += `\nTanımlı ama ekran fonksiyonu dışında çağrılan ya da hiç çağrılmayan ekler: ${kullanilmayan.map(a => '`' + a + '`').join(', ')}.\n`;

  if (YALNIZ.length && !YALNIZ.includes(uyg)) continue;
  if (sarma.length) { hata++; console.error(`${baslik}: sarmalama kaldı: ${sarma.join(', ')}`); }
  if (tanimsiz.length) { hata++; console.error(`${baslik}: tanımsız ek çağrılıyor: ${tanimsiz.join(', ')}`); }
}

if (DENETLE) process.exit(hata ? 1 : 0);
const hedef = path.join(KOK, 'docs', 'SARMALAMA_HARITASI.md');
fs.mkdirSync(path.dirname(hedef), { recursive: true });
fs.writeFileSync(hedef, md);
console.log('yazıldı:', path.relative(KOK, hedef));
