'use strict';
// EXIT Garden · Windows deneme paketi başlatıcısı. BASLAT.bat çağırır; Node pakettedir (node\node.exe).
// Sunucuyu bu klasörden çalıştırır: veri "veri\" klasöründe, masaüstü uygulamasının kurulum dosyası "masaustu\"
// klasöründe. İlk açılışta satış yöneticisi şifresini sorar. Sunucu açılınca satış panelini tarayıcıda açar.
// Ortam: PORT (varsayılan 8080).
const fs = require('fs'), path = require('path'), net = require('net'), readline = require('readline');
const { spawn, spawnSync } = require('child_process');

const KOK = __dirname;
const SUNUCU = path.join(KOK, 'uygulama', 'sunucu', 'sunucu.js');
const VERI = path.join(KOK, 'veri'), MASAUSTU = path.join(KOK, 'masaustu');
const PORT = process.env.PORT || '8080';
const ISARET = path.join(VERI, '.yonetici-sifresi-ayarlandi');
const ortam = { ...process.env, VERI_KLASORU: VERI, MASAUSTU_KLASORU: MASAUSTU, PORT };
const NODE = [process.execPath, '--disable-warning=ExperimentalWarning'];

if (!fs.existsSync(SUNUCU)) { console.error('Paket eksik: ' + SUNUCU + ' bulunamadı. Zip dosyasını bütünüyle açın.'); process.exit(1); }
fs.mkdirSync(VERI, { recursive: true });

// Konsol değilse (girdi yönlendirilmişse) satırlar tek bir okuyucudan sırayla alınır.
let satir = null;
function satirOku() {
  if (!satir) {
    const rl = readline.createInterface({ input: process.stdin }), hazir = [], bekleyen = []; let bitti = false;
    rl.on('line', l => bekleyen.length ? bekleyen.shift()(l) : hazir.push(l));
    rl.on('close', () => { bitti = true; while (bekleyen.length) bekleyen.shift()(null); });
    satir = () => new Promise(ok => hazir.length ? ok(hazir.shift()) : bitti ? ok(null) : bekleyen.push(ok));
  }
  return satir().then(l => { if (l === null) { console.error('\n Girdi bitti; şifre belirlenemedi.'); process.exit(1); } return l; });
}
function sifreSor(soru) {
  return new Promise(ok => {
    process.stdout.write(soru);
    const g = process.stdin;
    if (!g.isTTY) { satirOku().then(l => { process.stdout.write('\n'); ok(l); }); return; }
    let s = '';
    g.setRawMode(true); g.setEncoding('utf8'); g.resume();
    const f = d => {
      for (const c of d) {
        if (c === '\r' || c === '\n') { g.setRawMode(false); g.pause(); g.off('data', f); process.stdout.write('\n'); return ok(s); }
        if (c === '\u0003') process.exit(1);
        if (c === '\b' || c === '\u007f') { if (s) { s = s.slice(0, -1); process.stdout.write('\b \b'); } continue; }
        if (c >= ' ') { s += c; process.stdout.write('*'); }
      }
    };
    g.on('data', f);
  });
}

async function ilkKurulum() {
  console.log('\n EXIT Garden · ilk kurulum\n ---------------------------');
  console.log(' Satış paneline "satis" kullanıcı adıyla girilir. Bu hesabın şifresini belirleyin (en az 8 karakter).\n');
  for (;;) {
    const a = await sifreSor(' Şifre        : ');
    if (a.length < 8) { console.log(' Şifre en az 8 karakter olmalı.\n'); continue; }
    const b = await sifreSor(' Şifre (tekrar): ');
    if (a !== b) { console.log(' Şifreler aynı değil.\n'); continue; }
    const r = spawnSync(NODE[0], [...NODE.slice(1), SUNUCU, '--yonetici-sifre', a], { env: ortam, encoding: 'utf8' });
    if (r.status !== 0) { console.log(' Şifre ayarlanamadı: ' + (r.stderr || r.stdout).trim() + '\n'); continue; }
    fs.writeFileSync(ISARET, new Date().toISOString());
    console.log(' Şifre ayarlandı.\n');
    return;
  }
}

const portDolu = () => new Promise(ok => { const s = net.connect(+PORT, '127.0.0.1'); s.once('connect', () => { s.destroy(); ok(true); }); s.once('error', () => ok(false)); });
const tarayici = url => { if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref(); };

(async () => {
  if (!fs.existsSync(ISARET)) await ilkKurulum();
  const yerel = `http://localhost:${PORT}`;
  if (await portDolu()) {
    console.log(`\n ${PORT} portu kullanılıyor: sunucu büyük olasılıkla zaten açık (başka bir pencerede). Satış paneli tarayıcıda açılıyor.`);
    console.log(' Başka bir program kullanıyorsa bu pencereyi kapatın ve BASLAT.bat yerine şunu çalıştırın:  set PORT=8090 & BASLAT.bat\n');
    tarayici(yerel + '/satis');
    return;
  }
  const kurulum = fs.existsSync(MASAUSTU) && fs.readdirSync(MASAUSTU).some(f => /\.exe$/i.test(f));
  const s = spawn(NODE[0], [...NODE.slice(1), SUNUCU], { env: ortam, stdio: ['ignore', 'pipe', 'inherit'] });
  let acildi = false;
  s.stdout.setEncoding('utf8');
  s.stdout.on('data', d => {
    process.stdout.write(d);
    if (!acildi && /çalışıyor/.test(d)) {
      acildi = true;
      console.log([
        '',
        ' ================================================================',
        '  Sunucu çalışıyor. Bu pencere açık kaldıkça sistem kullanılabilir.',
        '  Kapatmak için pencereyi kapatın (veya Ctrl+C).',
        '',
        `  Satış paneli : ${yerel}/satis    (kullanıcı: satis)`,
        `  Bayi sitesi  : ${yerel}/          (bayiler "Kayıt ol" ile hesap açar)`,
        kurulum ? `  Masaüstü uyg.: ${yerel}/masaustu/indir  → kurun; ilk açılışta adres: ${yerel}` : '  Masaüstü uygulaması: pakette kurulum dosyası yok (masaustu\\ klasörü boş).',
        '  Aynı ağdaki diğer bilgisayarlar yukarıdaki "Ağdan" adresini kullanır.',
        '  (Windows Güvenlik Duvarı sorarsa "Özel ağlar" için izin verin.)',
        ' ================================================================',
        '',
      ].join('\n'));
      tarayici(yerel + '/satis');
    }
  });
  const kapat = () => { try { s.kill(); } catch (e) {} };
  process.on('SIGINT', kapat); process.on('SIGTERM', kapat);
  s.on('exit', k => { console.log('\n Sunucu kapandı' + (k ? ' (çıkış kodu ' + k + ')' : '') + '.'); process.exit(k || 0); });
})();
