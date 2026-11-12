// Kaynaktan çalışan paketi üretir (kayıp build.py'nin yerini alır).
//
//   kaynak/<uyg>/sablon.html  içindeki {{dahil yol}} işaretleri kaynak/yol dosyasının içeriğiyle,
//   kodlardaki /*@katalog*/null  katalog/urunler.json ile (görseller data URI olarak gömülür),
//   kodlardaki /*@maskeler*/null katalog/maskeler.json ile değiştirilir.
//
// Çıktı (dist/), orijinal paketle aynı düzendedir ve sunucu doğrudan buradan çalıştırılabilir:
//   dist/exit_bayi_siparis.html, dist/exit_satis_paneli.html, dist/telefon/ (index.html = bayi), dist/sunucu/
//
// Kullanım:
//   node araclar/derle.mjs               derler
//   node araclar/derle.mjs --dogrula     derler ve HTML'leri eski/ ile byte byte karşılaştırır
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pyJson, KATALOG_ISARET, MASKE_ISARET } from './ortak.mjs';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KAYNAK = path.join(KOK, 'kaynak'), KATALOG = path.join(KOK, 'katalog'), DIST = path.join(KOK, 'dist');
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const dataUri = p => {
  const ext = p.split('.').pop().toLowerCase();
  if (!MIME[ext]) throw new Error('Desteklenmeyen görsel türü: ' + p);
  return `data:${MIME[ext]};base64,` + fs.readFileSync(path.join(KATALOG, p)).toString('base64');
};

function katalogJs() {
  const V = JSON.parse(fs.readFileSync(path.join(KATALOG, 'urunler.json'), 'utf8'));
  V.urunler.forEach(u => { if (u.gorsel) u.gorsel = dataUri(u.gorsel); });
  Object.keys(V.kumas).forEach(k => { V.kumas[k] = dataUri(V.kumas[k]); });
  return pyJson(V);
}
function maskeJs() {
  // [id, dosya] dizisi; sıra korunarak nesneye çevrilir
  const L = JSON.parse(fs.readFileSync(path.join(KATALOG, 'maskeler.json'), 'utf8'));
  return '{' + L.map(([id, p]) => JSON.stringify(String(id)) + ': ' + JSON.stringify(dataUri(p))).join(', ') + '}';
}

let _katalog, _maske; // tembel: iki uygulama aynı katalogu kullanır
function sablonuDoldur(uyg) {
  const sablon = fs.readFileSync(path.join(KAYNAK, uyg, 'sablon.html'), 'utf8');
  return sablon.replace(/\{\{dahil ([^}]+)\}\}/g, (_, yol) => {
    const tam = path.join(KAYNAK, yol);
    if (!fs.existsSync(tam)) throw new Error(`${uyg}/sablon.html: dosya yok: ${yol}`);
    let icerik = fs.readFileSync(tam, 'utf8');
    if (icerik.includes(KATALOG_ISARET)) icerik = icerik.split(KATALOG_ISARET).join(_katalog ??= katalogJs());
    if (icerik.includes(MASKE_ISARET)) icerik = icerik.split(MASKE_ISARET).join(_maske ??= maskeJs());
    return icerik;
  });
}

const yaz = (p, d) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, d); };
const kopyala = (kaynak, hedef, atla = () => false) => {
  for (const f of fs.readdirSync(kaynak)) if (!atla(f)) yaz(path.join(hedef, f), fs.readFileSync(path.join(kaynak, f)));
};

fs.rmSync(DIST, { recursive: true, force: true });
const bayi = sablonuDoldur('bayi'), satis = sablonuDoldur('satis');
yaz(path.join(DIST, 'exit_bayi_siparis.html'), bayi);
yaz(path.join(DIST, 'exit_satis_paneli.html'), satis);
kopyala(path.join(KAYNAK, 'telefon'), path.join(DIST, 'telefon'));
yaz(path.join(DIST, 'telefon', 'index.html'), bayi);
// sunucu: kod ve belgeler; çalışma verisi (veri.json, oturumlar, dosyalar, yedek, işlem kayıtları) pakete girmez
const SUNUCU_VERISI = /^(veri|mrp_veri|oturumlar)\.json$|^(yedek|dosyalar|kayitlar|node_modules)$|\.tmp$/;
(function sunucuKopyala(kaynak, hedef) {
  for (const f of fs.readdirSync(kaynak)) {
    if (SUNUCU_VERISI.test(f)) continue;
    const k = path.join(kaynak, f);
    if (fs.statSync(k).isDirectory()) sunucuKopyala(k, path.join(hedef, f)); else yaz(path.join(hedef, f), fs.readFileSync(k));
  }
})(path.join(KOK, 'sunucu'), path.join(DIST, 'sunucu'));

const kb = s => (Buffer.byteLength(s) / 1024 / 1024).toFixed(2) + ' MB';
console.log(`dist/ hazır · bayi ${kb(bayi)} · satış ${kb(satis)}`);

if (process.argv.includes('--dogrula')) {
  let hata = 0;
  for (const [dist, eski] of [['exit_bayi_siparis.html', 'exit_bayi_siparis.html'], ['exit_satis_paneli.html', 'exit_satis_paneli.html'], ['telefon/index.html', 'telefon/index.html']]) {
    const a = fs.readFileSync(path.join(DIST, dist)), b = fs.readFileSync(path.join(KOK, 'eski', eski));
    if (a.equals(b)) { console.log('  ✓ aynı:', dist); continue; }
    hata++;
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    console.log(`  ✗ FARKLI: ${dist} (ilk fark ${i}. byte)\n    derlenen: ${JSON.stringify(a.subarray(i, i + 80).toString())}\n    orijinal: ${JSON.stringify(b.subarray(i, i + 80).toString())}`);
  }
  process.exit(hata ? 1 : 0);
}
