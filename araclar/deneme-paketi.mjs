// Windows deneme paketi: sunucu (dist/), masaüstü uygulamasının kurulum dosyası ve Node tek klasörde.
// Kullanıcı zip'i açıp BASLAT.bat'a çift tıklar (dagitim/windows/BENIOKU.txt). GitHub Actions'ta Windows
// makinesinde üretilir (.github/workflows/masaustu.yml › windows-dene, deneme-paketi).
// Kullanım: node araclar/deneme-paketi.mjs <masaüstü çıktı klasörü> <hedef klasör> [node.exe]
//   önce: node araclar/derle.mjs. node.exe verilmezse bu betiği çalıştıran Node kopyalanır (Windows'ta).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [CIKTI, HEDEF, NODE = process.platform === 'win32' ? process.execPath : null] = process.argv.slice(2).map(p => p && path.resolve(p));
if (!CIKTI || !HEDEF) { console.error('kullanım: node araclar/deneme-paketi.mjs <masaüstü çıktı klasörü> <hedef klasör> [node.exe]'); process.exit(2); }
const DIST = path.join(KOK, 'dist');
if (!fs.existsSync(path.join(DIST, 'sunucu', 'sunucu.js'))) { console.error('dist/ yok. Önce: node araclar/derle.mjs'); process.exit(1); }

fs.rmSync(HEDEF, { recursive: true, force: true });
fs.mkdirSync(path.join(HEDEF, 'masaustu'), { recursive: true });
fs.cpSync(DIST, path.join(HEDEF, 'uygulama'), { recursive: true, filter: k => !k.startsWith(path.join(DIST, 'dagitim')) });
const kurulum = fs.readdirSync(CIKTI).filter(f => /\.(exe|blockmap)$/.test(f) || f === 'latest.yml').filter(f => !/__uninstaller/.test(f));
if (!kurulum.some(f => f.endsWith('.exe')) || !kurulum.includes('latest.yml')) { console.error(CIKTI + ' içinde kurulum dosyası veya latest.yml yok'); process.exit(1); }
for (const f of kurulum) fs.copyFileSync(path.join(CIKTI, f), path.join(HEDEF, 'masaustu', f));
for (const f of ['BASLAT.bat', 'baslat.js', 'BENIOKU.txt']) fs.copyFileSync(path.join(KOK, 'dagitim', 'windows', f), path.join(HEDEF, f));
if (NODE) { fs.mkdirSync(path.join(HEDEF, 'node')); fs.copyFileSync(NODE, path.join(HEDEF, 'node', 'node.exe')); }
const surum = fs.readFileSync(path.join(CIKTI, 'latest.yml'), 'utf8').match(/^version:\s*(.+)$/m)[1].trim();
console.log(`Deneme paketi: ${HEDEF}\n  sunucu + masaüstü ${surum} (${kurulum.join(', ')})${NODE ? ' + node ' + process.version : ' (Node pakette yok)'}`);
