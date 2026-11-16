// Faz 3b-2: Windows'ta kurulum ve güncelleme denemesi (pilottan önce, GitHub Actions'ın Windows makinesinde).
// Pilot rehberindeki (satis-masaustu/PILOT.md) makineyle yapılan adımların otomatikleştirilebilenleri:
//   1. Kurulum dosyası sessiz kurulur (/S); program klasörü, Başlat menüsü ve masaüstü kısayolu, dosya sürümü.
//   2. İlk açılışta sunucu adresi kurulum sayfasına yazılır ve kaydedilir. Kurulan uygulama gerçek bir test
//      sunucusuna bağlanır: giriş, durum çubuğunda sürüm, bayi siparişi →
//      Windows bildirimi ve görev çubuğu sayacı (2 sn kabul ölçütü), bildirime tıklayınca sipariş açılır,
//      son görülen veriler DPAPI ile şifreli, sunucuya ulaşılamazsa salt okunur görünüm ve "Yeniden dene".
//   3. Güncelleme turu: sunucunun /masaustu/guncelleme/ klasörüne yeni sürüm konur; kurulu eski sürüm onu bulur,
//      indirir (sha512), kapanıp yeni sürümü kurar; yeniden açılışta yeni sürüm çalışır ve yeniden güncelleme aramaz.
//   4. Kaldırma (/S): program klasörü ve kısayollar silinir.
// Ekran görüntüleri (bildirim, görev çubuğu) ve özet çıktı klasörüne yazılır; iş akışı bunları yükler.
// Kullanım (Windows):  node araclar/windows-dene.mjs <eski sürüm klasörü> <yeni sürüm klasörü> [çıktı klasörü]
//   klasörler electron-builder çıktısıdır (EXIT-Satis-Kurulum-<sürüm>.exe, .blockmap, latest.yml).
//   Önce: node araclar/derle.mjs (test sunucusu dist/'ten açılır).
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { sunucuBaslat, YONETICI_SIFRE } = require(path.join(KOK, 'testler', 'yardimci.js'));
const { _electron } = require('playwright');

if (process.platform !== 'win32') { console.error('Bu deneme Windows içindir (GitHub Actions: windows-latest).'); process.exit(2); }
const [ESKI, YENI, CIKTI = path.join(KOK, 'cikti-dene')] = process.argv.slice(2).map(p => p && path.resolve(p));
if (!ESKI || !YENI) { console.error('kullanım: node araclar/windows-dene.mjs <eski sürüm klasörü> <yeni sürüm klasörü> [çıktı]'); process.exit(2); }
fs.mkdirSync(CIKTI, { recursive: true });

const bekle = ms => new Promise(r => setTimeout(r, ms));
async function kosul(f, sure, ad) { const b = Date.now() + sure; let son; while (Date.now() < b) { try { son = await f(); } catch (e) { son = null; } if (son) return son; await bekle(250); } throw new Error(ad + ' sağlanmadı (' + Math.round(sure / 1000) + ' sn)'); }
const surumOku = k => { const y = fs.readFileSync(path.join(k, 'latest.yml'), 'utf8'); return { surum: y.match(/^version:\s*(.+)$/m)[1].trim(), dosya: y.match(/^path:\s*(.+)$/m)[1].trim() }; };
const ps = (komut, env = {}) => execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8; ' + komut], { env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const dosyaSurumu = exe => ps('(Get-Item -LiteralPath $env:P).VersionInfo.ProductVersion', { P: exe });
function ekranGoruntusu(ad) {
  const yer = path.join(CIKTI, ad + '.png');
  try { ps('Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $m=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($m); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $m.Save($env:Y)', { Y: yer }); return ad + '.png'; }
  catch (e) { return 'alınamadı: ' + e.message.split('\n')[0]; }
}
const calisan = exe => { try { return +ps('@(Get-Process | Where-Object { $_.Path -eq $env:P }).Count', { P: exe }); } catch (e) { return 0; } };
async function surecleriKapat(exe) { try { ps('Get-Process | Where-Object { $_.Path -eq $env:P } | Stop-Process -Force', { P: exe }); } catch (e) {} await kosul(() => !calisan(exe), 15000, 'uygulamanın kapanması').catch(() => {}); }

const sonuc = [];
let hataVar = false;
async function adim(ad, f) {
  const t0 = Date.now();
  try { const a = await f(); sonuc.push({ ad, ok: true, ayrinti: a || '', sure: Date.now() - t0 }); console.log('✔', ad, a ? '— ' + a : ''); }
  catch (e) { hataVar = true; sonuc.push({ ad, ok: false, ayrinti: e.message, sure: Date.now() - t0 }); console.log('✘', ad, '—', e.stack || e.message); }
}

const eski = surumOku(ESKI), yeni = surumOku(YENI);
// kısa (8.3) adlı geçici klasör yerine uzun ad: süreç yolları karşılaştırılır
const TABAN = path.join(fs.realpathSync.native(process.env.RUNNER_TEMP || os.tmpdir()), 'exit-dene');
const HEDEF = path.join(TABAN, 'Program');          // kurulum klasörü (/D=, boşluksuz olmalı)
const VERI = path.join(TABAN, 'veri');              // uygulama verisi (EXIT_VERI_KLASORU)
const GUNCELLEME = path.join(TABAN, 'guncelleme');  // sunucunun /masaustu/guncelleme/ klasörü
fs.rmSync(TABAN, { recursive: true, force: true });
fs.mkdirSync(VERI, { recursive: true }); fs.mkdirSync(GUNCELLEME, { recursive: true });
const MASAUSTU = path.join(os.homedir(), 'Desktop'), BASLAT = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
const kisayol = k => fs.existsSync(k) ? fs.readdirSync(k).filter(f => /^EXIT Sat.*\.lnk$/i.test(f)) : [];
let EXE = null, s = null, no = null;

// Uygulama sunucuya bir TCP aktarıcısı üzerinden bağlanır: "sunucuya ulaşılamıyor" adımında yalnız aktarıcı
// kapatılır; adres aynı kalır (son görülen veriler yalnız aynı sunucu adresi için gösterilir) ve sunucu,
// güncelleme turu için verisi ve oturumuyla çalışmaya devam eder.
const aktarici = { port: 0, sunucu: null, baglar: new Set() };
async function aktariciAc() {
  aktarici.sunucu = net.createServer(c => {
    const u = net.connect(s.port, '127.0.0.1');
    const bitir = () => { c.destroy(); u.destroy(); aktarici.baglar.delete(c); aktarici.baglar.delete(u); };
    aktarici.baglar.add(c).add(u);
    c.on('error', bitir).on('close', bitir); u.on('error', bitir).on('close', bitir);
    c.pipe(u).pipe(c);
  });
  await new Promise((ok, red) => { aktarici.sunucu.once('error', red); aktarici.sunucu.listen(aktarici.port, '127.0.0.1', ok); });
  aktarici.port = aktarici.sunucu.address().port;
}
const aktariciKapat = () => new Promise(ok => { aktarici.sunucu.close(() => ok()); for (const b of aktarici.baglar) b.destroy(); });
const ADRES = () => `http://127.0.0.1:${aktarici.port}`;

const ortam = ek => { const e = { ...process.env, EXIT_TEST: '1', EXIT_VERI_KLASORU: VERI, EXIT_TEST_INDIR: path.join(VERI, 'indirilen'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1', ...ek }; delete e.NODE_OPTIONS; return e; };
const ac = (ek = {}) => _electron.launch({ executablePath: EXE, env: ortam({ EXIT_SUNUCU_ADRESI: ADRES(), ...ek }), timeout: 60000 });
const kayit = (app, k) => app.evaluate((e, k) => JSON.parse(JSON.stringify(global.__exitTest[k])), k);

console.log(`EXIT Satış Windows denemesi: ${eski.surum} → ${yeni.surum}\n`);
s = await sunucuBaslat({ ortam: { MASAUSTU_KLASORU: GUNCELLEME } });
await aktariciAc();
// güncelleme klasöründe şimdilik kurulu sürüm: açılışta "güncel" denetimi
for (const f of fs.readdirSync(ESKI)) if (/\.(exe|blockmap|yml)$/.test(f) && !/builder-debug/.test(f)) fs.copyFileSync(path.join(ESKI, f), path.join(GUNCELLEME, f));

await adim(`Kurulum (${eski.dosya}, sessiz)`, async () => {
  const t0 = Date.now();
  const r = spawnSync(path.join(ESKI, eski.dosya), ['/S', '/D=' + HEDEF], { stdio: 'inherit', timeout: 300000 });
  if (r.status !== 0) throw new Error('kurulum çıkış kodu ' + r.status);
  EXE = await kosul(() => { const f = fs.existsSync(HEDEF) && fs.readdirSync(HEDEF).find(f => /^EXIT.*\.exe$/i.test(f) && !/^Uninstall/i.test(f)); return f && path.join(HEDEF, f); }, 60000, 'program dosyası');
  const v = dosyaSurumu(EXE);
  if (!v.startsWith(eski.surum)) throw new Error('dosya sürümü ' + v);
  const mb = (fs.statSync(path.join(ESKI, eski.dosya)).size / 1048576).toFixed(0);
  return `${Math.round((Date.now() - t0) / 1000)} sn, kurulum dosyası ${mb} MB, ${path.basename(EXE)} ${v}`;
});
await adim('Başlat menüsü ve masaüstü kısayolu', async () => {
  const b = kisayol(BASLAT), m = kisayol(MASAUSTU);
  if (!b.length) throw new Error('Başlat menüsünde kısayol yok');
  if (!m.length) throw new Error('masaüstünde kısayol yok');
  return `Başlat: ${b.join(', ')} · Masaüstü: ${m.join(', ')}`;
});

if (EXE) {
  let app = null, w = null;
  // ilk açılış: adres EXIT_SUNUCU_ADRESI ile verilmez, kullanıcı gibi kurulum sayfasına yazılır (ayrı veri klasörü)
  await adim('İlk açılış: sunucu adresi sorulur, yazılan adres kaydedilir', async () => {
    const v = path.join(TABAN, 'veri-ilk');
    const a = await _electron.launch({ executablePath: EXE, env: ortam({ EXIT_VERI_KLASORU: v }), timeout: 60000 });
    try {
      const p = await a.firstWindow();
      await p.locator('#adres').waitFor({ timeout: 30000 });
      const g = ekranGoruntusu('0-ilk-acilis');
      await p.fill('#adres', ADRES()); await p.click('#baglan');
      await p.waitForURL(ADRES() + '/satis', { timeout: 30000 });
      const k = JSON.parse(fs.readFileSync(path.join(v, 'ayarlar.json'), 'utf8')).sunucu;
      if (k !== ADRES()) throw new Error('kaydedilen adres: ' + k);
      return 'kaydedilen adres ' + k + ', satış paneli açıldı · ' + g;
    } finally { await a.close().catch(() => {}); await surecleriKapat(EXE); }
  });
  await adim('Kurulu uygulama açılır, sunucuya bağlanır, giriş yapılır', async () => {
    app = await ac(); w = await app.firstWindow();
    await w.waitForURL(ADRES() + '/satis', { timeout: 30000 }); await w.locator('#gKul').waitFor({ timeout: 30000 });
    await w.fill('#gKul', 'satis'); await w.fill('#gSif', YONETICI_SIFRE); await w.click('#fGiris button.btn.marka');
    await w.locator('#uyg:not(.gizli)').waitFor({ timeout: 30000 });
    const sur = await w.locator('aside .durum-cubugu .ds-surum').textContent();
    if (!sur.includes('Masaüstü ' + eski.surum)) throw new Error('durum çubuğu: ' + sur);
    const p = await app.evaluate(({ app, Notification }) => ({ surum: app.getVersion(), paket: app.isPackaged, bildirim: Notification.isSupported() }));
    if (!p.paket || p.surum !== eski.surum) throw new Error(JSON.stringify(p));
    if (!p.bildirim) throw new Error('Windows bildirimleri desteklenmiyor');
    return `sürüm ${p.surum}, durum çubuğu "${sur.trim()}"`;
  });
  await adim('Bayi siparişi → Windows bildirimi ve görev çubuğu sayacı (2 sn)', async () => {
    if (!w) throw new Error('uygulama açılmadı');
    const cerez = await s.kayit('winbayi'), t0 = Date.now();
    const r = await s.api('/api/v1/siparisler', { kalemler: [{ id: 21, secenek: 'Fileli', adet: 3 }] }, { cerez, uyg: 'bayi' });
    if (r.durum !== 201) throw new Error('sipariş ' + r.durum); no = r.json.no;
    const b = await kosul(async () => (await kayit(app, 'bildirimler')).find(x => x.hedef === 'siparis:' + no), 10000, 'bildirim');
    const sure = Date.now() - t0;
    const rozet = await kosul(() => kayit(app, 'rozet'), 5000, 'sayaç');
    const baslik = await w.evaluate(() => document.title), pb = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle());
    await bekle(800); const g = ekranGoruntusu('1-bildirim-ve-sayac');
    if (sure > 2000) throw new Error('bildirim ' + sure + ' ms (kabul ölçütü 2 sn)');
    if (rozet !== 1) throw new Error('sayaç ' + rozet);
    if (!/\(1\)/.test(pb)) throw new Error('pencere başlığı: ' + pb + ' / ' + baslik);
    return `${b.baslik}: "${b.metin}" ${sure} ms · sayaç ${rozet} · pencere başlığı "${pb}" · görüntü: ${g}`;
  });
  await adim('Bildirime tıklayınca sipariş açılır', async () => {
    const i = (await kayit(app, 'bildirimler')).findIndex(x => x.hedef === 'siparis:' + no);
    await app.evaluate((e, i) => global.__exitTest.tikla(i), i);
    await w.locator('.perde .pencere h2', { hasText: no }).waitFor({ timeout: 10000 });
    return ekranGoruntusu('2-siparis-penceresi');
  });
  await adim('Son görülen veriler Windows şifrelemesiyle (DPAPI) saklanır', async () => {
    const d = path.join(VERI, 'son-gorulen.bin');
    await kosul(() => fs.existsSync(d), 15000, 'son görülen veriler dosyası');
    const b = fs.readFileSync(d);
    if (b.subarray(0, 2).toString() !== 'E1') throw new Error('şifresiz saklandı (' + b.subarray(0, 2) + ')');
    if (b.includes(Buffer.from(no))) throw new Error('sipariş no düz metin');
    return b.length + ' bayt, şifreli';
  });
  await app?.close().catch(() => {}); await surecleriKapat(EXE);
  await adim('Sunucuya ulaşılamazsa son görülen veriler salt okunur', async () => {
    await aktariciKapat();
    const a = await ac();
    try {
      const p = await a.firstWindow();
      await p.locator('h1', { hasText: 'Sunucuya ulaşılamıyor' }).waitFor({ timeout: 30000 });
      await p.locator('#sonGorulen').waitFor({ timeout: 10000 });
      const t = await p.locator('#sgGovde').textContent();
      if (!t.includes(no)) throw new Error('bekleyen işlerde sipariş yok');
      const e = (await p.locator('.sg-etiket').textContent()).trim() + ' · ' + ekranGoruntusu('3-baglanti-yok');
      // bağlantı gelince "Yeniden dene" satış paneline döner
      await aktariciAc(); await p.click('#dene');
      await p.waitForURL(u => String(u).startsWith(ADRES() + '/satis'), { timeout: 30000 });
      return e + ' · "Yeniden dene" ile panele dönüldü';
    } finally { await a.close().catch(() => {}); await surecleriKapat(EXE); if (!aktarici.sunucu.listening) await aktariciAc(); }
  });

  // ---------- güncelleme turu ----------
  await adim(`Güncelleme turu ${eski.surum} → ${yeni.surum}: bulur, indirir, kurar`, async () => {
    for (const f of fs.readdirSync(GUNCELLEME)) fs.rmSync(path.join(GUNCELLEME, f));
    for (const f of fs.readdirSync(YENI)) if (/\.(exe|blockmap|yml)$/.test(f) && !/builder-debug/.test(f)) fs.copyFileSync(path.join(YENI, f), path.join(GUNCELLEME, f));
    const gunluk = fs.openSync(path.join(CIKTI, 'guncelleme-gunlugu.txt'), 'w'), t0 = Date.now();
    // Playwright'sız açılır: uygulama güncellemeyi kurmak için kendini kapatır
    const p = spawn(EXE, [], { env: ortam({ EXIT_SUNUCU_ADRESI: ADRES(), EXIT_TEST_GUNCELLE: '1' }), stdio: ['ignore', gunluk, gunluk], detached: true });
    p.unref();
    await kosul(() => dosyaSurumu(EXE).startsWith(yeni.surum), 240000, 'yeni sürümün kurulması');
    const sure = Math.round((Date.now() - t0) / 1000);
    // kurulum bitince uygulama kendiliğinden yeniden açılır: açıldığı görülür, sonra kapatılır
    const yenidenAcildi = await kosul(() => calisan(EXE) > 0, 90000, 'yeniden açılma').then(() => true, () => false);
    await bekle(4000); await surecleriKapat(EXE);
    const g = fs.readFileSync(path.join(CIKTI, 'guncelleme-gunlugu.txt'), 'utf8');
    if (!/güncelleme: indirildi/.test(g)) throw new Error('günlükte indirme yok:\n' + g);
    if (!yenidenAcildi) throw new Error('kurulumdan sonra uygulama yeniden açılmadı');
    return `${sure} sn, dosya sürümü ${dosyaSurumu(EXE)}, kurulumdan sonra kendiliğinden yeniden açıldı`;
  });
  await adim(`Yeniden açılışta ${yeni.surum} çalışır, yeniden güncelleme aramaz`, async () => {
    const a = await ac(), satir = [];
    a.process().stdout?.on('data', d => satir.push(String(d)));
    try {
      const p = await a.firstWindow();
      const v = await a.evaluate(({ app }) => app.getVersion());
      if (v !== yeni.surum) throw new Error('sürüm ' + v);
      await p.locator('#uyg:not(.gizli)').waitFor({ timeout: 30000 }); // oturum güncellemeden sonra da açık
      const sur = (await p.locator('aside .durum-cubugu .ds-surum').textContent()).trim();
      if (!sur.includes('Masaüstü ' + yeni.surum)) throw new Error('durum çubuğu: ' + sur);
      await bekle(6000);
      if (satir.join('').includes('güncelleme: yeni sürüm')) throw new Error('yeniden güncelleme buldu');
      return `sürüm ${v}, oturum açık, durum çubuğu "${sur}"`;
    } finally { await a.close().catch(() => {}); await surecleriKapat(EXE); }
  });

  // ---------- kaldırma ----------
  await adim('Kaldırma (sessiz): program klasörü ve kısayollar silinir', async () => {
    const k = fs.readdirSync(HEDEF).find(f => /^Uninstall.*\.exe$/i.test(f));
    if (!k) throw new Error('kaldırma programı yok');
    spawnSync(path.join(HEDEF, k), ['/S'], { stdio: 'inherit', timeout: 120000 });
    // NSIS kaldırıcısı kendini geçici klasöre kopyalayıp oradan çalışır: bitmesi beklenir
    await kosul(() => !fs.existsSync(EXE), 120000, 'program dosyasının silinmesi');
    await kosul(() => !kisayol(BASLAT).length && !kisayol(MASAUSTU).length, 30000, 'kısayolların silinmesi');
  });
}
s.kapat();

const ozet = [`## EXIT Satış · Windows denemesi (${eski.surum} → ${yeni.surum})`, '', `${os.version()} · ${os.release()}`, '', '| | Adım | Sonuç | Süre |', '|---|---|---|---|',
  ...sonuc.map(x => `| ${x.ok ? '✅' : '❌'} | ${x.ad} | ${String(x.ayrinti).replace(/\u001b\[\d+m/g, '').replace(/\|/g, '/').replace(/\r?\n/g, ' ')} | ${(x.sure / 1000).toFixed(1)} sn |`), ''].join('\n');
fs.writeFileSync(path.join(CIKTI, 'sonuc.md'), ozet);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, ozet);
console.log('\n' + ozet);
process.exit(hataVar ? 1 : 0);
