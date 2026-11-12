// Katalog fotoğraflarından web sitesi için WebP dosyaları üretir (Faz 2):
//   katalog/webp/<ad>-k.webp   küçük resim (420 px genişlik): katalog ızgarası, sepet, karşılaştırma
//   katalog/webp/<ad>.webp     tam boy (kaynak genişliği, en çok 1200 px): ürün penceresi, renk önizleme
//
// Çıktı repoya eklenir; böylece `npm run derle` için görüntü aracı gerekmez. Yalnız fotoğraf
// eklendiğinde/değiştiğinde çalıştırın (değişmeyenler atlanır):
//   node araclar/webp.mjs
// Gerekli: ImageMagick (`magick` veya `convert` komutu; libwebp destekli).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GIRDI = path.join(KOK, 'katalog', 'gorsel'), CIKTI = path.join(KOK, 'katalog', 'webp');
const arac = ['magick', 'convert'].find(k => spawnSync(k, ['-version']).status === 0);
if (!arac) { console.error('ImageMagick bulunamadı (magick/convert).'); process.exit(1); }

fs.mkdirSync(CIKTI, { recursive: true });
let uretilen = 0, atlanan = 0;
for (const f of fs.readdirSync(GIRDI)) {
  if (!/\.(jpe?g|png)$/i.test(f)) continue;
  const ad = f.replace(/\.[^.]+$/, ''), kaynak = path.join(GIRDI, f), zaman = fs.statSync(kaynak).mtimeMs;
  for (const [ek, ayar] of [['-k', ['-resize', '420x>', '-quality', '74']], ['', ['-resize', '1200x>', '-quality', '82']]]) {
    const hedef = path.join(CIKTI, ad + ek + '.webp');
    if (fs.existsSync(hedef) && fs.statSync(hedef).mtimeMs >= zaman) { atlanan++; continue; }
    const r = spawnSync(arac, [kaynak, '-strip', ...ayar, '-define', 'webp:method=6', hedef]);
    if (r.status !== 0) { console.error(f + ': ' + r.stderr); process.exit(1); }
    uretilen++;
  }
}
const boyut = fs.readdirSync(CIKTI).reduce((a, f) => a + fs.statSync(path.join(CIKTI, f)).size, 0);
console.log(`katalog/webp: ${uretilen} üretildi, ${atlanan} güncel · toplam ${(boyut / 1024).toFixed(0)} KB`);
