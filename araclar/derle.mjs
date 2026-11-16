// Kaynaktan çalışan paketi üretir (kayıp build.py'nin yerini alır).
//
//   kaynak/<uyg>/sablon.html  içindeki {{dahil yol}} işaretleri kaynak/yol dosyasının içeriğiyle,
//   kodlardaki /*@katalog*/null  katalog/urunler.json ile (görseller data URI olarak gömülür),
//   kodlardaki /*@maskeler*/null katalog/maskeler.json ile, /*@json yol*/null kaynak/yol JSON dosyasıyla değiştirilir.
//
// Çıktı (dist/) sunucu ile birlikte doğrudan çalıştırılabilir:
//   dist/web/                    bayi web sitesi (Faz 2): küçük index.html + içerik özetli js/ css/ dosyaları,
//                                WebP görseller, renk maskeleri, PWA (manifest, sw.js otomatik sürümlü)
//   dist/exit_bayi_siparis.html  tek dosyalık bayi portalı (sunucusuz, çift tıklayarak kullanım için)
//   dist/exit_satis_paneli.html  satış paneli
//   dist/sunucu/, dist/dagitim/, dist/araclar/veri_incele.mjs
//
// Şablonda {{web yol}} işaretli satırlar yalnız web sitesine girer; tek dosyalık sürümden çıkarılır.
//
// Paketler (Faz 2b-2): şablonda <!-- paket: ad --> satırından hemen sonra art arda gelen <script>{{dahil …}}</script>
// (ya da <style>) satırları iki sürümde de tek betikte birleşir; web sitesinde tek dosya olur (js/ad.<özet>.js).
//   • Kod dosyalara bölünse de tek betikte çalışır: fonksiyon bildirimleri paket içinde birbirini görür
//     (ör. ekran dosyaları; bölünmeden önce tek dosyaydı).
//   • Yalnız iç içe fonksiyondan oluşan dosyalar (en solda const/let/function yok) try/catch ile sarılır: birinin
//     açılış hatası paketteki diğer özellikleri durdurmaz (önceden her parça ayrı <script> idi).
//
// Kullanım:
//   node araclar/derle.mjs               derler
//   node araclar/derle.mjs --dogrula     derler ve HTML'leri eski/ ile byte byte karşılaştırır
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { pyJson, KATALOG_ISARET, MASKE_ISARET } from './ortak.mjs';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KAYNAK = path.join(KOK, 'kaynak'), KATALOG = path.join(KOK, 'katalog'), DIST = path.join(KOK, 'dist');
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const dataUri = p => {
  const ext = p.split('.').pop().toLowerCase();
  if (!MIME[ext]) throw new Error('Desteklenmeyen görsel türü: ' + p);
  return `data:${MIME[ext]};base64,` + fs.readFileSync(path.join(KATALOG, p)).toString('base64');
};

// web: görseller dosya olarak (dist/web/gorsel, /maske); tek dosya: data URI olarak gömülür
const webGorsel = p => {
  const ad = path.basename(p).replace(/\.[^.]+$/, ''), w = path.join(KATALOG, 'webp', ad);
  return fs.existsSync(w + '-k.webp') && fs.existsSync(w + '.webp')
    ? { k: { kaynak: w + '-k.webp', yol: `gorsel/${ad}-k.webp` }, b: { kaynak: w + '.webp', yol: `gorsel/${ad}.webp` } }
    : { k: { kaynak: path.join(KATALOG, p), yol: 'gorsel/' + path.basename(p) }, b: null }; // WebP yoksa (node araclar/webp.mjs) özgün dosya
};
const WEB_DOSYALARI = new Map(); // dist/web içindeki yol -> kaynak dosya
function katalogJs(web) {
  const V = JSON.parse(fs.readFileSync(path.join(KATALOG, 'urunler.json'), 'utf8'));
  V.urunler.forEach(u => {
    if (!u.gorsel) return;
    if (!web) { u.gorsel = dataUri(u.gorsel); return; }
    const g = webGorsel(u.gorsel);
    WEB_DOSYALARI.set(g.k.yol, g.k.kaynak); u.gorsel = '/' + g.k.yol;
    if (g.b) { WEB_DOSYALARI.set(g.b.yol, g.b.kaynak); u.gorselB = '/' + g.b.yol; }
  });
  Object.keys(V.kumas).forEach(k => { V.kumas[k] = dataUri(V.kumas[k]); }); // 6 küçük doku (28 KB): gömülü kalır
  return pyJson(V);
}
function maskeJs(web) {
  // [id, dosya] dizisi; sıra korunarak nesneye çevrilir
  const L = JSON.parse(fs.readFileSync(path.join(KATALOG, 'maskeler.json'), 'utf8'));
  return '{' + L.map(([id, p]) => {
    if (web) WEB_DOSYALARI.set(p, path.join(KATALOG, p));
    return JSON.stringify(String(id)) + ': ' + JSON.stringify(web ? '/' + p : dataUri(p));
  }).join(', ') + '}';
}

const _katalog = {}, _maske = {}; // tembel: iki uygulama aynı katalogu kullanır
function parcaOku(uyg, yol, web) {
  const tam = path.join(KAYNAK, yol);
  if (!fs.existsSync(tam)) throw new Error(`${uyg}/sablon.html: dosya yok: ${yol}`);
  let icerik = fs.readFileSync(tam, 'utf8');
  if (icerik.includes(KATALOG_ISARET)) icerik = icerik.split(KATALOG_ISARET).join(_katalog[!!web] ??= katalogJs(web));
  if (icerik.includes(MASKE_ISARET)) icerik = icerik.split(MASKE_ISARET).join(_maske[!!web] ??= maskeJs(web));
  // /*@json yol*/null → kaynak/yol JSON dosyası (ör. çeviriler: bayi/dil/en.json)
  icerik = icerik.replace(/\/\*@json ([^*]+)\*\/null/g, (_, j) => JSON.stringify(JSON.parse(fs.readFileSync(path.join(KAYNAK, j.trim()), 'utf8'))));
  return icerik;
}
// <!-- paket: ad --> + art arda dahil satırları → {{paket ad yol1,yol2,…}}
function paketIsaretle(sablon) {
  return sablon.replace(/<!-- paket: ([\w-]+) -->\n((?:<(?:script|style)>\{\{dahil [^}]+\}\}<\/(?:script|style)>\n)+)/g, (m, ad, satirlar) => {
    const L = [...satirlar.matchAll(/^<(script|style)>\{\{dahil ([^}]+)\}\}/gm)];
    if (new Set(L.map(x => x[1])).size > 1) throw new Error(`paket ${ad}: script ve style aynı pakette olamaz`);
    return `<${L[0][1]}>{{paket ${ad} ${L.map(x => x[2]).join(',')}}}</${L[0][1]}>\n`;
  });
}
function paketOku(uyg, yollar, web, tur) {
  if (tur === 'style') return yollar.map(y => `/* ---- ${y} ---- */\n` + parcaOku(uyg, y, web)).join('\n');
  return yollar.map(y => {
    const c = parcaOku(uyg, y, web), sarilir = !/^(const|let|var|function|async function|class)\b/m.test(c);
    return `/* ---- ${y} ---- */\n` + (sarilir ? `try {\n${c}\n} catch (e) { console.error(${JSON.stringify(y)}, e); }` : c);
  }).join('\n;\n');
}
const paketDoldur = (uyg, html, web, dosya) => html.replace(/<(script|style)>\{\{paket ([\w-]+) ([^}]+)\}\}<\/\1>/g, (_, tur, ad, yollar) => {
  const icerik = paketOku(uyg, yollar.split(','), web, tur);
  if (!dosya) return `<${tur}>${icerik}</${tur}>`;
  return tur === 'script' ? `<script src="${dosya(ad + '.js', icerik)}"></script>` : `<link rel="stylesheet" href="${dosya(ad + '.css', icerik)}">`;
});
function sablonuDoldur(uyg) {
  const sablon = paketIsaretle(fs.readFileSync(path.join(KAYNAK, uyg, 'sablon.html'), 'utf8')
    .replace(/^.*\{\{web [^}]+\}\}.*\n/gm, ''));
  return paketDoldur(uyg, sablon, false).replace(/\{\{dahil ([^}]+)\}\}/g, (_, yol) => parcaOku(uyg, yol, false));
}

// Web sitesi: satır içi <script>/<style> parçaları içerik özetli ayrı dosyalara çıkar (tarayıcı
// önbelleği: değişmeyen dosya yeniden indirilmez). Sıra ve yükleme biçimi (eşzamanlı) aynı kalır.
const ozet = d => crypto.createHash('sha256').update(d).digest('hex').slice(0, 10);
function webDerle(uyg, hedef) {
  const dosyalar = [];
  const dosya = (yol, icerik) => {
    const ad = path.basename(yol).replace(/\.[^.]+$/, '').replace(/^\d+-/, '').replace(/[^a-z0-9.-]+/gi, '-').toLowerCase();
    const uzanti = path.extname(yol), cikti = `${uzanti.slice(1)}/${ad}.${ozet(icerik)}${uzanti}`;
    yaz(path.join(hedef, cikti), icerik); dosyalar.push(cikti); return '/' + cikti;
  };
  let html = paketDoldur(uyg, paketIsaretle(fs.readFileSync(path.join(KAYNAK, uyg, 'sablon.html'), 'utf8')
    .replace(/\{\{web ([^}]+)\}\}/g, '{{dahil $1}}')), true, dosya)
    .replace(/<script>\{\{dahil ([^}]+)\}\}<\/script>/g, (_, yol) => `<script src="${dosya(yol, parcaOku(uyg, yol, true))}"></script>`)
    .replace(/<style>\{\{dahil ([^}]+)\}\}<\/style>/g, (_, yol) => `<link rel="stylesheet" href="${dosya(yol, parcaOku(uyg, yol, true))}">`)
    .replace(/\{\{dahil ([^}]+)\}\}/g, (_, yol) => parcaOku(uyg, yol, true));
  // bütün göreli adresler (api/…, manifest, sw.js) /katalog, /siparisler/… gibi alt adreslerde de köke çözülsün
  html = html.replace('<head>', '<head><base href="/">');
  html = webHizlandir(html, hedef, dosyalar, dosya);
  for (const [yol, kaynak] of WEB_DOSYALARI) { yaz(path.join(hedef, yol), fs.readFileSync(kaynak)); dosyalar.push(yol); }
  for (const f of fs.readdirSync(path.join(KAYNAK, 'web', 'statik'))) { yaz(path.join(hedef, f), fs.readFileSync(path.join(KAYNAK, 'web', 'statik', f))); if (!/\.txt$/.test(f)) dosyalar.push(f); }
  yaz(path.join(hedef, 'index.html'), html);
  // service worker: dosya listesi ve sürüm derlemede yazılır (elle sürüm artırma biter)
  const kabuk = dosyalar.filter(f => !/^(gorsel|maske)\//.test(f));
  const surum = ozet(html + dosyalar.join());
  const sw = fs.readFileSync(path.join(KAYNAK, 'web', 'sw.js'), 'utf8').replace("/*@surum*/''", JSON.stringify(surum)).replace('/*@kabuk*/[]', JSON.stringify(['/', ...kabuk.map(f => '/' + f)]));
  yaz(path.join(hedef, 'sw.js'), sw);
  return { html, dosyalar, surum, boyut: (yol => fs.statSync(path.join(hedef, yol)).size) };
}

// Faz 2c (Lighthouse, telefon): sayfanın ilk çizimini bekleten dosyalar azalır. Tek dosyalık sürüm değişmez.
//   • Stil dosyalarının hepsi belgedeki sırasıyla (kural sırası korunur) tek dosyada birleşir ve başa alınır:
//     gövdenin sonundaki stiller, önündeki betikler çalışmadan sayfanın çizilmesini engelliyordu.
//   • Gövdedeki betikler defer ile yüklenir: belge sırasıyla, belge okunduktan sonra ve DOMContentLoaded'dan önce
//     çalışırlar (gövdenin sonunda oldukları için davranış aynıdır), ama sayfanın çizilmesini bekletmezler.
//     Başlıktaki betikler (senkron, veri) eşzamanlı kalır: oturum ve veri çekimi gövdeden önce bilinmeli.
//   • Başlıktaki 1 KB'tan küçük betikler (erken işaret, tema, oturum işareti) sayfanın içine yazılır (ayrı istek yok).
function webHizlandir(html, hedef, dosyalar) {
  const at = f => { fs.rmSync(path.join(hedef, f)); dosyalar.splice(dosyalar.indexOf(f), 1); };
  const stiller = [...html.matchAll(/<link rel="stylesheet" href="\/(css\/[^"]+)">\n?/g)];
  const birlesik = stiller.map(m => `/* ---- ${m[1].replace(/\.[0-9a-f]{10}\.css$/, '.css')} ---- */\n` + fs.readFileSync(path.join(hedef, m[1]), 'utf8')).join('\n');
  stiller.forEach(m => at(m[1]));
  html = html.replace(/<link rel="stylesheet" href="\/css\/[^"]+">\n?/g, '');
  const cikti = `css/stil.${ozet(birlesik)}.css`; yaz(path.join(hedef, cikti), birlesik); dosyalar.push(cikti);
  let [bas, govde] = html.split('</head>');
  bas = bas.replace(/<script src="\/(js\/[^"]+)"><\/script>/g, (m, f) => {
    const k = fs.readFileSync(path.join(hedef, f), 'utf8');
    if (k.length >= 1024 || /<\/script/i.test(k)) return m;
    at(f); return `<script>${k.trim()}</script>`;
  }) + `<link rel="stylesheet" href="/${cikti}">\n`;
  govde = govde.replace(/<script src="/g, '<script defer src="');
  return bas + '</head>' + govde;
}

const yaz = (p, d) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, d); };
const kopyala = (kaynak, hedef, atla = () => false) => {
  for (const f of fs.readdirSync(kaynak)) if (!atla(f)) yaz(path.join(hedef, f), fs.readFileSync(path.join(kaynak, f)));
};

fs.rmSync(DIST, { recursive: true, force: true });
const bayi = sablonuDoldur('bayi'), satis = sablonuDoldur('satis');
yaz(path.join(DIST, 'exit_bayi_siparis.html'), bayi);
yaz(path.join(DIST, 'exit_satis_paneli.html'), satis);
const web = webDerle('bayi', path.join(DIST, 'web'));
// sunucu: kod ve belgeler; çalışma verisi (veri.json, oturumlar, dosyalar, yedek, işlem kayıtları) pakete girmez
const SUNUCU_VERISI = /^(veri|mrp_veri|oturumlar|gizli)\.json|^veri\.sqlite|^(yedek|dosyalar|kayitlar|node_modules)$|\.tmp$/;
(function sunucuKopyala(kaynak, hedef) {
  for (const f of fs.readdirSync(kaynak)) {
    if (SUNUCU_VERISI.test(f)) continue;
    const k = path.join(kaynak, f);
    if (fs.statSync(k).isDirectory()) sunucuKopyala(k, path.join(hedef, f)); else yaz(path.join(hedef, f), fs.readFileSync(k));
  }
})(path.join(KOK, 'sunucu'), path.join(DIST, 'sunucu'));

// Canlı veriyi yedekleyip özetleyen araç pakete de girer (sunucuda: node araclar/veri_incele.mjs /var/lib/exit/veri.json)
yaz(path.join(DIST, 'araclar', 'veri_incele.mjs'), fs.readFileSync(path.join(KOK, 'araclar', 'veri_incele.mjs')));
// VPS kurulum dosyaları
if (fs.existsSync(path.join(KOK, 'dagitim'))) kopyala(path.join(KOK, 'dagitim'), path.join(DIST, 'dagitim'));
// Sunucunun fiyat denetimi için görselsiz katalog
{
  const V = JSON.parse(fs.readFileSync(path.join(KATALOG, 'urunler.json'), 'utf8'));
  yaz(path.join(DIST, 'sunucu', 'katalog.json'), JSON.stringify({ urunler: V.urunler.map(u => ({ id: u.id, ad: u.ad, kategori: u.kategori, secenek: u.secenek })) }));
}
const kb = s => (Buffer.byteLength(s) / 1024 / 1024).toFixed(2) + ' MB';
{
  const t = f => web.boyut(f), js = web.dosyalar.filter(f => /^(js|css)\//.test(f)).reduce((a, f) => a + t(f), 0);
  const g = web.dosyalar.filter(f => /^gorsel\/.*-k\./.test(f)).reduce((a, f) => a + t(f), 0);
  console.log(`dist/ hazır · bayi (tek dosya) ${kb(bayi)} · satış ${kb(satis)}\n  web sitesi: index.html ${(Buffer.byteLength(web.html) / 1024).toFixed(0)} KB + js/css ${(js / 1024).toFixed(0)} KB (sıkıştırmasız) · küçük resimler ${(g / 1024).toFixed(0)} KB (tembel) · sürüm ${web.surum}`);
}

if (process.argv.includes('--dogrula')) {
  let hata = 0;
  for (const [dist, eski] of [['exit_bayi_siparis.html', 'exit_bayi_siparis.html'], ['exit_satis_paneli.html', 'exit_satis_paneli.html']]) {
    const a = fs.readFileSync(path.join(DIST, dist)), b = fs.readFileSync(path.join(KOK, 'eski', eski));
    if (a.equals(b)) { console.log('  ✓ aynı:', dist); continue; }
    hata++;
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    console.log(`  ✗ FARKLI: ${dist} (ilk fark ${i}. byte)\n    derlenen: ${JSON.stringify(a.subarray(i, i + 80).toString())}\n    orijinal: ${JSON.stringify(b.subarray(i, i + 80).toString())}`);
  }
  process.exit(hata ? 1 : 0);
}
