// EXIT Satış masaüstü uygulaması (Faz 3): ana süreç.
//
// Uygulama satış panelini şirket sunucusundan yükler (<sunucu>/satis). Ekranlar sunucuyla birlikte güncellenir;
// bu kabuk yalnız masaüstüne özel işleri yapar:
//   • kendi penceresi, Başlat menüsü/görev çubuğu simgesi, bildirim alanı (tepsi), açılışta başlama
//   • sistem bildirimleri (yeni sipariş, ödeme bildirimi, talep…) ve görev çubuğunda bekleyen iş sayısı
//   • bir siparişi ayrı pencerede açma, klavye kısayolları (Ctrl+K, Ctrl+1..9, F5)
//   • dışa aktarılan dosyaların seçilen klasöre kaydı, PDF olarak kaydetme, yazdırma
//   • kendini güncelleme (sunucunun /masaustu/guncelleme/ klasöründen)
// Güvenlik: sayfa Node'a erişemez (contextIsolation + sandbox); yalnız sunucunun kendi adresinde gezinilir,
// dış bağlantılar varsayılan tarayıcıda açılır; kamera, konum gibi izinler kapalıdır.
//
// Ayarlar: <kullanıcı verisi>/ayarlar.json  { sunucu, tepsi, sonKlasor, pencere }
// Ortam: EXIT_SUNUCU_ADRESI (kurulumda adres sorulmaz), EXIT_VERI_KLASORU (ayar/çerez klasörü; testler için)
'use strict';
const { app, BrowserWindow, Menu, Tray, Notification, ipcMain, shell, dialog, session, nativeImage, net, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

if (process.env.EXIT_VERI_KLASORU) app.setPath('userData', path.resolve(process.env.EXIT_VERI_KLASORU));
const TEST = process.env.EXIT_TEST === '1';
const BOLUM = 'persist:exit';
const SAYFALAR = path.join(__dirname, 'sayfalar');
const SIMGE = path.join(__dirname, 'simge', 'simge.png');
const UYG_KIMLIGI = 'com.exitgarden.satis';

// ---------- ayarlar ----------
const AYAR_DOSYASI = () => path.join(app.getPath('userData'), 'ayarlar.json');
let ayar = { sunucu: '', tepsi: process.platform === 'win32', sonKlasor: '', pencere: null };
function ayarOku() { try { ayar = { ...ayar, ...JSON.parse(fs.readFileSync(AYAR_DOSYASI(), 'utf8')) }; } catch (e) {} if (process.env.EXIT_SUNUCU_ADRESI) ayar.sunucu = adresDuzelt(process.env.EXIT_SUNUCU_ADRESI) || ayar.sunucu; }
function ayarYaz() { try { fs.mkdirSync(path.dirname(AYAR_DOSYASI()), { recursive: true }); fs.writeFileSync(AYAR_DOSYASI(), JSON.stringify(ayar, null, 2)); } catch (e) { console.error('ayar yazılamadı', e); } }

// Sunucu adresi: https zorunlu; yalnız yerel ağ adreslerinde (deneme, şirket içi sunucu) http kabul edilir.
const YEREL_AG = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[::1\])$/;
function adresDuzelt(a) {
  let u; try { u = new URL(/^https?:\/\//i.test(String(a).trim()) ? String(a).trim() : 'https://' + String(a).trim()); } catch (e) { return null; }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && YEREL_AG.test(u.hostname))) return null;
  if (u.username || u.password) return null;
  return u.origin;
}
const sunucudanMi = url => { try { return !!ayar.sunucu && new URL(url).origin === ayar.sunucu; } catch (e) { return false; } };
const yerelSayfaMi = url => { try { const u = new URL(url); return u.protocol === 'file:' && path.normalize(decodeURIComponent(u.pathname)).startsWith(path.normalize(SAYFALAR)); } catch (e) { return false; } };

// ---------- pencereler ----------
let anaPen = null, tepsi = null, cikiyor = false, rozetSayi = 0;
const pencereler = new Set();
const webTercihleri = { preload: path.join(__dirname, 'onyukle.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, webviewTag: false, partition: BOLUM, spellcheck: false };

function pencereOlustur({ ana = false } = {}) {
  const p = ana && ayar.pencere ? ayar.pencere : {};
  const w = new BrowserWindow({
    width: p.width || 1440, height: p.height || 900, x: p.x, y: p.y, minWidth: 1280, minHeight: 720,
    show: false, title: 'EXIT Satış', icon: SIMGE, backgroundColor: '#0b1f3a', autoHideMenuBar: false, webPreferences: webTercihleri,
  });
  pencereler.add(w);
  w.once('ready-to-show', () => { if (ana && p.buyuk) w.maximize(); w.show(); });
  w.on('closed', () => pencereler.delete(w));
  w.webContents.on('did-fail-load', (e, kod, aciklama, url, anaCerceve) => {
    if (!anaCerceve || kod === -3 /* iptal */ || yerelSayfaMi(url)) return;
    w.loadFile(path.join(SAYFALAR, 'hata.html'), { query: { adres: ayar.sunucu, hata: aciklama || String(kod), yol: (() => { try { return new URL(url).pathname + new URL(url).search; } catch (x) { return '/satis'; } })() } });
  });
  w.webContents.on('render-process-gone', (e, d) => { if (d.reason !== 'clean-exit' && !w.isDestroyed()) w.reload(); });
  w.on('page-title-updated', e => { e.preventDefault(); baslikYaz(w); });
  if (ana) {
    const sakla = () => { if (w.isDestroyed()) return; ayar.pencere = { ...(w.isMaximized() ? ayar.pencere || {} : w.getBounds()), buyuk: w.isMaximized() }; ayarYaz(); };
    w.on('close', e => { sakla(); if (!cikiyor && ayar.tepsi && tepsi) { e.preventDefault(); w.hide(); } });
    w.on('focus', () => w.flashFrame(false));
  }
  return w;
}
function baslikYaz(w) { if (!w.isDestroyed()) w.setTitle(rozetSayi ? `EXIT Satış (${rozetSayi})` : 'EXIT Satış'); }

function yukle(w, yol = '/satis') {
  if (!ayar.sunucu) return w.loadFile(path.join(SAYFALAR, 'kurulum.html'));
  return w.loadURL(ayar.sunucu + yol).catch(() => {}); // hata sayfası did-fail-load'da
}
function anaPencereyiGoster() {
  if (!anaPen || anaPen.isDestroyed()) { anaPen = pencereOlustur({ ana: true }); yukle(anaPen); return anaPen; }
  if (anaPen.isMinimized()) anaPen.restore();
  anaPen.show(); anaPen.focus(); return anaPen;
}
// Ayrı pencere: satış paneli aynı oturumla açılır, hedef (ör. "siparis:EXG-2026-0012") açılışta gösterilir
function ayriPencere(hedef) {
  const w = pencereOlustur();
  yukle(w, '/satis' + (hedef ? '?ac=' + encodeURIComponent(hedef) : ''));
  return w;
}

// ---------- gezinme ve izin kısıtları (bütün web içerikleri için) ----------
function disariAc(url) {
  try { const u = new URL(url); if (!['https:', 'mailto:', 'tel:'].includes(u.protocol)) return;
    if (TEST) return testKaydi.disari.push(u.href); shell.openExternal(u.href); } catch (e) {}
}
app.on('web-contents-created', (e, wc) => {
  const gezinme = (ev, url) => { if (sunucudanMi(url) || yerelSayfaMi(url)) return; ev.preventDefault(); disariAc(url); };
  wc.on('will-navigate', gezinme);
  wc.on('will-redirect', gezinme);
  wc.on('will-attach-webview', ev => ev.preventDefault());
  wc.setWindowOpenHandler(({ url }) => {
    // teklif yazdırma: boş pencereye belge yazılıp yazdırılır (Node'suz, önyüklemesiz)
    if (url === 'about:blank' || url === '') return { action: 'allow', overrideBrowserWindowOptions: { width: 900, height: 1000, icon: SIMGE, autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, partition: BOLUM } } };
    if (sunucudanMi(url)) {
      const u = new URL(url);
      if (u.pathname === '/satis') { ayriPencere(u.searchParams.get('ac') || ''); return { action: 'deny' }; }
      // dekont, iade fotoğrafı gibi dosyalar: aynı oturumla ayrı pencerede
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1000, height: 800, icon: SIMGE, autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, partition: BOLUM } } };
    }
    disariAc(url); return { action: 'deny' };
  });
});

function oturumKur() {
  const ses = session.fromPartition(BOLUM);
  ses.setPermissionRequestHandler((wc, izin, cb) => cb(izin === 'clipboard-sanitized-write'));
  ses.setPermissionCheckHandler((wc, izin) => izin === 'clipboard-sanitized-write');
  // dışa aktarılan dosyalar (Excel/CSV, rapor): son kullanılan klasör önerilir
  ses.on('will-download', (e, item) => {
    const ad = item.getFilename();
    if (TEST && process.env.EXIT_TEST_INDIR) item.setSavePath(path.join(process.env.EXIT_TEST_INDIR, ad));
    else item.setSaveDialogOptions({ title: 'Dosyayı kaydet', defaultPath: path.join(ayar.sonKlasor || app.getPath('downloads'), ad) });
    item.once('done', (ev, durum) => {
      if (durum !== 'completed') return;
      const yer = item.getSavePath(); ayar.sonKlasor = path.dirname(yer); ayarYaz();
      bildir({ baslik: 'Dosya kaydedildi', metin: path.basename(yer), dosya: yer });
    });
  });
  return ses;
}

// ---------- bildirim, rozet, tepsi ----------
const testKaydi = { bildirimler: [], rozet: 0, pdf: [], disari: [], tiklamalar: [] };
// testler (EXIT_TEST=1) electronApp.evaluate ile okur; tikla(i): i. bildirime tıklanmış gibi davranır
global.__exitTest = testKaydi;
testKaydi.tikla = i => testKaydi.tiklamalar[i] && testKaydi.tiklamalar[i]();
testKaydi.pencereSayisi = () => BrowserWindow.getAllWindows().length;

function bildir({ baslik, metin, hedef, dosya }) {
  baslik = String(baslik || 'EXIT Satış').slice(0, 120); metin = String(metin || '').slice(0, 300);
  const tikla = () => {
    if (dosya) return TEST || shell.showItemInFolder(dosya);
    const w = anaPencereyiGoster(); if (hedef) w.webContents.send('ac', String(hedef));
  };
  if (TEST) { testKaydi.bildirimler.push({ baslik, metin, hedef: hedef || null }); testKaydi.tiklamalar.push(tikla); return; }
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: baslik, body: metin, icon: SIMGE, silent: false });
  n.on('click', tikla);
  n.show();
  if (anaPen && !anaPen.isDestroyed() && !anaPen.isFocused()) anaPen.flashFrame(true);
}

// Görev çubuğu sayacı: macOS/Linux'ta uygulama rozeti, Windows'ta simgenin üstünde kırmızı daire
function rozetResmi(n) {
  const B = 32, buf = Buffer.alloc(B * B * 4); // BGRA
  const yaz = (x, y, r, g, b, a = 255) => { if (x < 0 || y < 0 || x >= B || y >= B) return; const i = (y * B + x) * 4; buf[i] = b; buf[i + 1] = g; buf[i + 2] = r; buf[i + 3] = a; };
  for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) { const d = Math.hypot(x - 15.5, y - 15.5); if (d <= 15.5) { const a = Math.round(255 * Math.min(1, 15.5 - d + 0.5)); yaz(x, y, 220, 38, 38, a); } }
  // 3x5 rakam yazısı, 3 kat büyütülmüş
  const R = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111', '+': '000010111010000' };
  const m = n > 9 ? '9+' : String(n), o = 3, gen = m.length * 3 * o + (m.length - 1) * o, x0 = Math.round((B - gen) / 2), y0 = Math.round((B - 5 * o) / 2);
  [...m].forEach((c, k) => { const s = R[c]; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (s[j * 3 + i] === '1') for (let dy = 0; dy < o; dy++) for (let dx = 0; dx < o; dx++) yaz(x0 + k * 4 * o + i * o + dx, y0 + j * o + dy, 255, 255, 255); });
  return nativeImage.createFromBitmap(buf, { width: B, height: B });
}
function rozet(n) {
  n = Math.max(0, Math.min(9999, n | 0)); if (n === rozetSayi) return; rozetSayi = n; testKaydi.rozet = n;
  try { app.setBadgeCount(n); } catch (e) {}
  for (const w of pencereler) { baslikYaz(w); if (process.platform === 'win32') w.setOverlayIcon(n ? rozetResmi(n) : null, n ? `${n} bekleyen iş` : ''); }
  if (tepsi) tepsi.setToolTip(n ? `EXIT Satış · ${n} bekleyen iş` : 'EXIT Satış');
}
function tepsiKur() {
  if (tepsi || TEST) return;
  try {
    tepsi = new Tray(nativeImage.createFromPath(SIMGE).resize({ width: 16, height: 16 }));
    tepsi.setToolTip('EXIT Satış');
    tepsi.setContextMenu(Menu.buildFromTemplate([{ label: "EXIT Satış'ı aç", click: anaPencereyiGoster }, { type: 'separator' }, { label: 'Çıkış', click: () => { cikiyor = true; app.quit(); } }]));
    tepsi.on('click', anaPencereyiGoster);
  } catch (e) { tepsi = null; }
}

// ---------- PDF ----------
async function pdfKaydet(w) {
  if (!w || w.isDestroyed()) return null;
  const ad = (w.webContents.getTitle() || 'EXIT Satış').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.pdf';
  let yer;
  if (TEST && process.env.EXIT_TEST_INDIR) yer = path.join(process.env.EXIT_TEST_INDIR, ad);
  else { const r = await dialog.showSaveDialog(w, { title: 'PDF olarak kaydet', defaultPath: path.join(ayar.sonKlasor || app.getPath('documents'), ad), filters: [{ name: 'PDF', extensions: ['pdf'] }] }); if (r.canceled || !r.filePath) return null; yer = r.filePath; }
  const veri = await w.webContents.printToPDF({ printBackground: true, pageSize: 'A4', landscape: true });
  fs.writeFileSync(yer, veri); ayar.sonKlasor = path.dirname(yer); ayarYaz(); testKaydi.pdf.push(yer);
  bildir({ baslik: 'PDF kaydedildi', metin: path.basename(yer), dosya: yer });
  return yer;
}

// ---------- menü ----------
const odakli = () => BrowserWindow.getFocusedWindow() || anaPen;
const sayfayaGonder = (kanal, ...a) => { const w = odakli(); if (w && !w.isDestroyed()) w.webContents.send(kanal, ...a); };
function menuKur() {
  const giris = () => app.getLoginItemSettings().openAtLogin;
  const sablon = [
    { label: 'Dosya', submenu: [
      { label: 'Yeni pencere', accelerator: 'CmdOrCtrl+N', click: () => ayriPencere('') },
      { type: 'separator' },
      { label: 'PDF olarak kaydet…', accelerator: 'CmdOrCtrl+Shift+S', click: () => pdfKaydet(odakli()) },
      { label: 'Yazdır…', accelerator: 'CmdOrCtrl+P', click: () => { const w = odakli(); if (w) w.webContents.print({ printBackground: true }); } },
      { type: 'separator' },
      { label: 'Sunucu adresi…', click: () => { const w = anaPencereyiGoster(); w.loadFile(path.join(SAYFALAR, 'kurulum.html'), { query: { degistir: '1' } }); } },
      { type: 'separator' },
      { label: 'Çıkış', accelerator: 'CmdOrCtrl+Q', click: () => { cikiyor = true; app.quit(); } },
    ] },
    { label: 'Düzen', submenu: [
      { label: 'Geri al', role: 'undo' }, { label: 'Yinele', role: 'redo' }, { type: 'separator' },
      { label: 'Kes', role: 'cut' }, { label: 'Kopyala', role: 'copy' }, { label: 'Yapıştır', role: 'paste' }, { label: 'Tümünü seç', role: 'selectAll' },
    ] },
    { label: 'Git', submenu: [
      { label: 'Hızlı ara (bayi, sipariş no)', accelerator: 'CmdOrCtrl+K', click: () => sayfayaGonder('kisayol', 'ara') },
      { type: 'separator' },
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ({ label: `Menüdeki ${i}. sayfa`, accelerator: 'CmdOrCtrl+' + i, click: () => sayfayaGonder('kisayol', 'git', i) })),
    ] },
    { label: 'Görünüm', submenu: [
      { label: 'Yenile', accelerator: 'F5', click: () => { const w = odakli(); if (w) w.webContents.reload(); } },
      { label: 'Yenile', accelerator: 'CmdOrCtrl+R', visible: false, click: () => { const w = odakli(); if (w) w.webContents.reload(); } },
      { type: 'separator' },
      { label: 'Yakınlaştır', role: 'zoomIn' }, { label: 'Uzaklaştır', role: 'zoomOut' }, { label: 'Gerçek boyut', role: 'resetZoom' },
      { type: 'separator' }, { label: 'Tam ekran', role: 'togglefullscreen' },
      ...(app.isPackaged ? [] : [{ type: 'separator' }, { label: 'Geliştirici araçları', role: 'toggleDevTools' }]),
    ] },
    { label: 'Pencere', submenu: [
      { label: 'Simge durumuna küçült', role: 'minimize' },
      { type: 'separator' },
      { label: 'Kapatınca bildirim alanında çalışmaya devam et', type: 'checkbox', checked: !!ayar.tepsi, click: m => { ayar.tepsi = m.checked; ayarYaz(); if (m.checked) tepsiKur(); } },
      { label: 'Bilgisayar açılınca başlat', type: 'checkbox', checked: giris(), enabled: app.isPackaged, click: m => app.setLoginItemSettings({ openAtLogin: m.checked, args: ['--gizli'] }) },
    ] },
    { label: 'Yardım', submenu: [
      { label: 'Güncellemeleri denetle', enabled: app.isPackaged, click: () => guncellemeDenetle(true) },
      { label: 'Hakkında', click: () => dialog.showMessageBox(odakli(), { type: 'info', title: 'EXIT Satış', message: 'EXIT Satış ' + app.getVersion(), detail: `Sunucu: ${ayar.sunucu || '—'}\nElectron ${process.versions.electron} · Chromium ${process.versions.chrome}` }) },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(sablon));
}

// ---------- otomatik güncelleme ----------
let guncelleyici = null;
function guncellemeKur() {
  if (!app.isPackaged || !ayar.sunucu || guncelleyici) return;
  try { guncelleyici = require('electron-updater').autoUpdater; } catch (e) { return; }
  guncelleyici.setFeedURL({ provider: 'generic', url: ayar.sunucu + '/masaustu/guncelleme/' });
  guncelleyici.autoDownload = true; guncelleyici.autoInstallOnAppQuit = true;
  guncelleyici.on('error', e => console.warn('güncelleme:', e && e.message));
  guncelleyici.on('update-available', b => console.log('güncelleme: yeni sürüm', b && b.version));
  guncelleyici.on('update-downloaded', async bilgi => {
    console.log('güncelleme: indirildi', bilgi.version);
    // uçtan uca güncelleme denemesi (EXIT_TEST_GUNCELLE=1): "Şimdi yeniden başlat" seçilmiş gibi
    if (TEST && process.env.EXIT_TEST_GUNCELLE === '1') { cikiyor = true; return guncelleyici.quitAndInstall(true, true); }
    const r = await dialog.showMessageBox(anaPen && !anaPen.isDestroyed() ? anaPen : undefined, { type: 'info', buttons: ['Şimdi yeniden başlat', 'Daha sonra'], defaultId: 0, cancelId: 1,
      title: 'Güncelleme hazır', message: `EXIT Satış ${bilgi.version} indirildi.`, detail: 'Uygulama yeniden başlatılınca yeni sürüm kurulur. "Daha sonra" derseniz kapattığınızda kurulur.' });
    if (r.response === 0) { cikiyor = true; guncelleyici.quitAndInstall(); }
  });
  guncellemeDenetle(false);
  setInterval(() => guncellemeDenetle(false), 4 * 3600 * 1000);
}
async function guncellemeDenetle(elle) {
  if (!guncelleyici) { guncellemeKur(); if (!guncelleyici) return; }
  try { const r = await guncelleyici.checkForUpdates(); if (elle && (!r || !r.isUpdateAvailable)) dialog.showMessageBox(odakli(), { type: 'info', message: 'EXIT Satış güncel.', detail: 'Sürüm ' + app.getVersion() }); }
  catch (e) { if (elle) dialog.showMessageBox(odakli(), { type: 'warning', message: 'Güncelleme denetlenemedi.', detail: String(e && e.message || e) }); }
}

// ---------- çevrimdışı salt okunur görünüm (Faz 3b) ----------
// Satış paneli son gördüğü listelerin özetini (siparişler, bayiler ve iletişim, bakiye, bekleyen işler) gönderir;
// sunucuya ulaşılamazsa bağlantı hatası sayfası bunu salt okunur gösterir. Dosya işletim sisteminin kullanıcıya
// özel şifrelemesiyle (Windows: DPAPI) saklanır; satış panelinden çıkış yapılınca silinir. Başka sunucunun özeti
// gösterilmez.
const ANLIK_DOSYASI = () => path.join(app.getPath('userData'), 'son-gorulen.bin');
const sifreli = () => { try { return safeStorage.isEncryptionAvailable(); } catch (e) { return false; } };
let anlikZaman = null;
function anlikYaz(v) {
  clearTimeout(anlikZaman);
  if (v == null) { try { fs.unlinkSync(ANLIK_DOSYASI()); } catch (e) {} return; }
  const metin = JSON.stringify({ ...v, sunucu: ayar.sunucu, kaydedildi: Date.now() });
  if (metin.length > 8e6) return; // olağan dışı büyük: yazma
  anlikZaman = setTimeout(() => {
    try { fs.writeFileSync(ANLIK_DOSYASI(), sifreli() ? Buffer.concat([Buffer.from('E1'), safeStorage.encryptString(metin)]) : Buffer.from('D1' + metin)); }
    catch (e) { console.error('son görülen veriler yazılamadı', e); }
  }, 500);
}
function anlikOku() {
  try {
    const b = fs.readFileSync(ANLIK_DOSYASI()), tur = b.subarray(0, 2).toString();
    const j = JSON.parse(tur === 'E1' ? safeStorage.decryptString(b.subarray(2)) : tur === 'D1' ? b.subarray(2).toString() : 'null');
    return j && j.sunucu === ayar.sunucu ? j : null;
  } catch (e) { return null; }
}

// ---------- sayfalarla iletişim ----------
// Sayfadan gelen istek ya sunucunun kendi adresinden (satış paneli) ya da uygulamanın yerel sayfalarından olmalı.
const kaynak = e => (e.senderFrame && e.senderFrame.url) || '';
const sunucuSayfasi = e => sunucudanMi(kaynak(e));
const yerelSayfa = e => yerelSayfaMi(kaynak(e));
function ipcKur() {
  ipcMain.handle('bilgi', e => ({ surum: app.getVersion(), platform: process.platform, sunucu: ayar.sunucu }));
  ipcMain.on('rozet', (e, n) => { if (sunucuSayfasi(e)) rozet(n); });
  ipcMain.on('bildir', (e, o) => { if (sunucuSayfasi(e) && o && typeof o === 'object') bildir({ baslik: o.baslik, metin: o.metin, hedef: typeof o.hedef === 'string' ? o.hedef.slice(0, 100) : '' }); });
  ipcMain.on('pencere', (e, hedef) => { if (sunucuSayfasi(e)) ayriPencere(String(hedef || '').slice(0, 100)); });
  ipcMain.handle('pdf', e => sunucuSayfasi(e) ? pdfKaydet(BrowserWindow.fromWebContents(e.sender)) : null);
  ipcMain.on('anlik', (e, v) => { if (sunucuSayfasi(e) && (v === null || (v && typeof v === 'object'))) anlikYaz(v); });
  ipcMain.handle('anlik-oku', e => yerelSayfa(e) ? anlikOku() : null);
  // kurulum ve hata sayfaları
  ipcMain.handle('sunucu-adresi', e => yerelSayfa(e) ? ayar.sunucu : null);
  ipcMain.handle('sunucu-kaydet', async (e, a) => {
    if (!yerelSayfa(e)) return { ok: false, hata: 'izin yok' };
    const adres = adresDuzelt(a);
    if (!adres) return { ok: false, hata: 'Adres https:// ile başlamalı (yalnız şirket içi ağda http kullanılabilir).' };
    try {
      const ctl = new AbortController(), z = setTimeout(() => ctl.abort(), 8000);
      const r = await net.fetch(adres + '/api/oturum', { signal: ctl.signal, headers: { 'X-Exit-Uyg': 'satis' } }); clearTimeout(z);
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !('surum' in j)) return { ok: false, hata: 'Bu adreste EXIT sunucusu bulunamadı.' };
    } catch (x) { return { ok: false, hata: 'Sunucuya ulaşılamadı: ' + (x.name === 'AbortError' ? 'zaman aşımı' : x.message) }; }
    ayar.sunucu = adres; ayarYaz(); guncellemeKur();
    const w = BrowserWindow.fromWebContents(e.sender); if (w) yukle(w);
    return { ok: true, adres };
  });
  ipcMain.on('yeniden-dene', (e, yol) => { if (!yerelSayfa(e)) return; const w = BrowserWindow.fromWebContents(e.sender); if (w) yukle(w, /^\/satis(\?|$)/.test(String(yol || '')) ? yol : '/satis'); });
}

// ---------- başlangıç ----------
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => anaPencereyiGoster());
  app.setAppUserModelId(UYG_KIMLIGI);
  app.whenReady().then(() => {
    if (TEST) console.log('EXIT Satış açıldı, sürüm', app.getVersion());
    ayarOku(); oturumKur(); ipcKur(); menuKur();
    if (ayar.tepsi) tepsiKur();
    anaPen = pencereOlustur({ ana: true });
    if (process.argv.includes('--gizli') && ayar.tepsi && tepsi) anaPen.once('ready-to-show', () => anaPen.hide());
    yukle(anaPen);
    guncellemeKur();
  });
  app.on('before-quit', () => { cikiyor = true; });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin' || TEST) app.quit(); });
  app.on('activate', () => anaPencereyiGoster());
}
