// Faz 0 · Tek seferlik ayıklama: eski/ içindeki tek dosyalık HTML'leri
//   kaynak/  (şablon + ayrı CSS/JS parçaları, iki uygulamada ortak olanlar kaynak/ortak/)
//   katalog/ (urunler.json, ürün fotoğrafları, kumaşlar, renk maskeleri)
//   sunucu/  (mevcut sunucu)
// klasörlerine ayırır. Sonra `node araclar/derle.mjs --dogrula` ile orijinalin byte byte
// aynısının yeniden üretildiği kontrol edilir.
//
// Kullanım: node araclar/ayikla.mjs [--zorla]
// Not: kaynak/ veya katalog/ doluysa --zorla verilmeden çalışmaz (elle yapılan değişiklikler ezilmesin).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pyJson, KATALOG_ISARET, MASKE_ISARET } from './ortak.mjs';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ESKI = path.join(KOK, 'eski');
const KAYNAK = path.join(KOK, 'kaynak');
const KATALOG = path.join(KOK, 'katalog');
const SUNUCU = path.join(KOK, 'sunucu');

if (!process.argv.includes('--zorla') && [KAYNAK, KATALOG].some(d => fs.existsSync(d) && fs.readdirSync(d).length)) {
  console.error('kaynak/ veya katalog/ dolu. Üzerine yazmak için: node araclar/ayikla.mjs --zorla');
  process.exit(1);
}

const yaz = (p, icerik) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, icerik); };
const goreli = p => path.relative(KAYNAK, p).split(path.sep).join('/');

const BLOK = /<(script|style)([^>]*)>([\s\S]*?)<\/\1>/g;
const bloklar = s => { const a = []; let m; BLOK.lastIndex = 0; while ((m = BLOK.exec(s))) a.push({ tur: m[1], bas: m.index + m[0].indexOf('>') + 1, icerik: m[3] }); return a; };

const UYG = [
  { ad: 'bayi', dosya: 'exit_bayi_siparis.html', moduller: 'bayi_ek' },
  { ad: 'satis', dosya: 'exit_satis_paneli.html', moduller: 'satis_ek' },
];
for (const u of UYG) { u.html = fs.readFileSync(path.join(ESKI, u.dosya), 'utf8'); u.bloklar = bloklar(u.html); }

// İki uygulamada birebir aynı bloklar → kaynak/ortak/ (adları bayi portalındaki sıraya göre)
const ORTAK_AD = {
  0: 'senkron.js', 1: 'tema-erken.js', 5: 'giris-ikonlari.js', 6: 'v2.4-sade-giris.css', 7: 'v2.5-tema.css',
  8: 'v2.5-tema.js', 9: 'giris-logolar.css', 10: 'v2.6-logo-animasyonu.css', 11: 'v2.6-logo-animasyonu.js',
};
const ortak = new Map(); // içerik → dosya yolu
const [bayi, satis] = UYG;
bayi.bloklar.forEach((b, i) => {
  if (!satis.bloklar.some(x => x.icerik === b.icerik)) return;
  const ad = ORTAK_AD[i] || `ortak-${i}.${b.tur === 'style' ? 'css' : 'js'}`;
  ortak.set(b.icerik, path.join(KAYNAK, 'ortak', ad));
});

// Ek modül dosyalarıyla eşleştirme (adlandırma için)
const modulMetni = fs.readdirSync(path.join(ESKI, 'moduller')).map(f => [f.replace('.html', ''), fs.readFileSync(path.join(ESKI, 'moduller', f), 'utf8')]);
const slug = s => s.toLocaleLowerCase('tr').replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
  .replace(/\.(?!\d)|(?<!\d)\./g, '-').replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 5).join('-');

// Katalog (VERI) ve renk maskeleri (MASKE)
const dec = (s, ad) => { const i = s.indexOf(`const ${ad} = `); if (i < 0) return null; const j = i + `const ${ad} = `.length; return { j, ...jsonSonu(s, j) }; };
function jsonSonu(s, j) { // j'den başlayan JSON nesnesinin sonunu bulur (string içindeki parantezleri atlar)
  let d = 0, str = false;
  for (let k = j; k < s.length; k++) {
    const c = s[k];
    if (str) { if (c === '\\') k++; else if (c === '"') str = false; continue; }
    if (c === '"') str = true; else if (c === '{') d++; else if (c === '}' && --d === 0) return { e: k + 1, deger: JSON.parse(s.slice(j, k + 1)) };
  }
  throw new Error('JSON sonu bulunamadı');
}
const DATA = /^data:(image\/(jpeg|png|webp));base64,(.+)$/;
const UZANTI = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const dataDosya = (deger, hedef) => { const m = deger.match(DATA); if (!m) throw new Error('beklenmeyen görsel: ' + deger.slice(0, 40)); const p = `${hedef}.${UZANTI[m[1]]}`; yaz(path.join(KATALOG, p), Buffer.from(m[3], 'base64')); return p; };

let katalogYazildi = false;
for (const u of UYG) {
  let sablon = '', son = 0, sira = 0, oncekiAd = 'ana';
  for (const b of u.bloklar) {
    sablon += u.html.slice(son, b.bas);
    son = b.bas + b.icerik.length;
    let icerik = b.icerik;
    const ext = b.tur === 'style' ? 'css' : 'js';
    let hedef = ortak.get(icerik);
    if (!hedef) {
      // katalog ve maskeleri çıkar
      const v = dec(icerik, 'VERI');
      if (v) {
        if (!katalogYazildi) {
          const V = v.deger;
          V.urunler.forEach(x => { if (x.gorsel) x.gorsel = dataDosya(x.gorsel, `gorsel/${x.id}`); });
          Object.keys(V.kumas).forEach(k => { V.kumas[k] = dataDosya(V.kumas[k], `kumas/${k}`); });
          yaz(path.join(KATALOG, 'urunler.json'), JSON.stringify(V, null, 2) + '\n');
          katalogYazildi = true;
        }
        icerik = icerik.slice(0, v.j) + KATALOG_ISARET + icerik.slice(v.e);
      }
      const m = dec(icerik, 'MASKE');
      if (m) {
        // Sıra korunmalı (JSON.parse sayısal anahtarları sıralar), bu yüzden [id, dosya] dizisi olarak saklanır
        const sirali = [...icerik.slice(m.j, m.e).matchAll(/"(\d+)": "(data:[^"]+)"/g)].map(([, id, d]) => [id, dataDosya(d, `maske/${id}`)]);
        yaz(path.join(KATALOG, 'maskeler.json'), JSON.stringify(sirali, null, 2) + '\n');
        icerik = icerik.slice(0, m.j) + MASKE_ISARET + icerik.slice(m.e);
      }
      if (b.icerik.length < 400) { sablon += icerik; sira++; continue; } // küçük bloklar şablonda kalır
      const mod = modulMetni.find(([ad, t]) => ad.startsWith(u.moduller) && t.includes(b.icerik.trim().slice(0, 300)));
      const yorum = (icerik.match(/^\s*(?:\/\*+\s*=*\s*([^*\n]+)|\/\/\s*=*\s*([^\n]+))/) || []).slice(1).find(Boolean);
      // Yorumsuz blok, hemen önceki bloğun (genellikle aynı sürümün CSS'i) adını alır
      const ad = mod ? mod[0].replace(u.moduller, 'ek') : v ? 'ana' : yorum ? slug(yorum.replace(/=+/g, '')) : oncekiAd;
      oncekiAd = ad;
      hedef = path.join(KAYNAK, u.ad, 'parcalar', `${String(sira).padStart(2, '0')}-${ad}.${ext}`);
    }
    yaz(hedef, icerik);
    sablon += `{{dahil ${goreli(hedef)}}}`;
    sira++;
  }
  sablon += u.html.slice(son);
  yaz(path.join(KAYNAK, u.ad, 'sablon.html'), sablon);
  console.log(`${u.ad}: ${u.bloklar.length} blok, şablon ${(sablon.length / 1024).toFixed(0)} KB`);
}

// Telefon (PWA) dosyaları: index.html derlemede bayi portalından üretilir
// PWA dosyaları (Faz 2'de kaynak/web/ altına taşındı; sw.js derlemede şablondan üretilir)
for (const f of fs.readdirSync(path.join(ESKI, 'telefon'))) if (!['index.html', 'sw.js'].includes(f)) yaz(path.join(KAYNAK, 'web', 'statik', f), fs.readFileSync(path.join(ESKI, 'telefon', f)));
for (const f of fs.readdirSync(path.join(ESKI, 'sunucu'))) yaz(path.join(SUNUCU, f), fs.readFileSync(path.join(ESKI, 'sunucu', f)));
console.log('ortak blok:', ortak.size, '· katalog/ ve kaynak/ yazıldı.');
