// Sarmalama haritası: "ek" parçaları global fonksiyonları
//   const _eski = git;  git = function (s) { …; _eski(s); }
// deseniyle üst üste sarıyor. Bu araç, her uygulama için hangi fonksiyonun nerede tanımlandığını
// ve hangi parçalarda, hangi sırayla sarıldığını çıkarır → docs/SARMALAMA_HARITASI.md
//
// Kullanım: node araclar/sarmalama.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KAYNAK = path.join(KOK, 'kaynak');
const UYG = { bayi: 'Bayi portalı', satis: 'Satış paneli' };

let md = `# Sarmalama haritası

Bu dosya \`node araclar/sarmalama.mjs\` ile otomatik üretilir; elle düzenlemeyin.

Parçalar şablondaki sırayla yüklenir. Bir fonksiyon sarıldığında son yüklenen sarmalayıcı en dışta olur:
çağrı önce en son parçaya girer, o da \`_eski(...)\` ile bir öncekini çağırır. Bu yüzden **parçaların sırası
değiştirilmemeli**; yeni bir sarmalayıcı eklerken zincirin sonuna eklendiği unutulmamalıdır.
Faz 2 ve Faz 3'te bu zincirler tek fonksiyonda birleştirilecek.
`;

for (const [uyg, baslik] of Object.entries(UYG)) {
  const sablon = fs.readFileSync(path.join(KAYNAK, uyg, 'sablon.html'), 'utf8');
  // {{web yol}}: yalnız web sitesine giren parçalar (Faz 2a); onlar da zincirin sonuna eklenir
  const parcalar = [...sablon.matchAll(/\{\{(?:dahil|web) ([^}]+\.js)\}\}/g)].map(m => m[1]);
  const tanim = {}, sarma = {};
  for (const p of parcalar) {
    const satirlar = fs.readFileSync(path.join(KAYNAK, p), 'utf8').split('\n');
    const kisa = p.replace(/^.*\//, '');
    satirlar.forEach((s, i) => {
      for (const m of s.matchAll(/(?:^|[\s;])(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) if (!/^\s{2,}/.test(s) && !(m[1] in tanim)) tanim[m[1]] = `${kisa}:${i + 1}`;
    });
    const metin = satirlar.join('\n');
    for (const m of metin.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g)) {
      const [, sakli, ad] = m;
      // gerçekten üzerine yazılıyor mu? (ad = function / ad = async function / ad = (…) =>)
      const yeniden = new RegExp(`(?:^|[\\s;(])(?:window\\.)?${ad.replace(/\$/g, '\\$')}\\s*=\\s*(?:async\\s+)?(?:function\\b|\\(|[A-Za-z_$][\\w$]*\\s*=>)`, 'm');
      if (!yeniden.test(metin.slice(m.index + m[0].length))) continue;
      const satir = metin.slice(0, m.index).split('\n').length;
      (sarma[ad] ||= []).push(`${kisa}:${satir} (\`${sakli}\`)`);
    }
  }
  const adlar = Object.keys(sarma).sort((a, b) => sarma[b].length - sarma[a].length || a.localeCompare(b, 'tr'));
  md += `\n## ${baslik}\n\nYükleme sırası: ${parcalar.map(p => '`' + p.replace(/^.*\//, '') + '`').join(' → ')}\n\n`;
  md += `| Fonksiyon | Tanım | Sarma sayısı | Sarmalayıcılar (yükleme sırasıyla; sonuncusu en dışta) |\n|---|---|---|---|\n`;
  for (const ad of adlar) md += `| \`${ad}\` | ${tanim[ad] || '—'} | ${sarma[ad].length} | ${sarma[ad].join(' → ')} |\n`;
  md += `\nToplam: ${adlar.length} fonksiyon, ${adlar.reduce((t, a) => t + sarma[a].length, 0)} sarmalama.\n`;
}

const hedef = path.join(KOK, 'docs', 'SARMALAMA_HARITASI.md');
fs.mkdirSync(path.dirname(hedef), { recursive: true });
fs.writeFileSync(hedef, md);
console.log('yazıldı:', path.relative(KOK, hedef));
