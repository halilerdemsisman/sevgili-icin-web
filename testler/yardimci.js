// Uçtan uca testler için yardımcılar: derlenmiş paketi (dist/) geçici bir klasöre kopyalayıp
// orijinal sunucuyu orada boş veriyle başlatır; bayi ve satış için ayrı tarayıcı bağlamları açar.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const KOK = path.join(__dirname, '..');
// TEST_PAKET=eski verilirse orijinal paket, verilmezse dist/ (derlenmiş) test edilir
const PAKET = process.env.TEST_PAKET === 'eski' ? path.join(KOK, 'eski') : path.join(KOK, 'dist');

const bosPort = () => new Promise((ok, red) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); s.on('error', red); });

async function sunucuBaslat() {
  if (!fs.existsSync(path.join(PAKET, 'exit_satis_paneli.html'))) throw new Error(`${PAKET} yok. Önce: node araclar/derle.mjs`);
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'exit-test-'));
  for (const f of ['exit_bayi_siparis.html', 'exit_satis_paneli.html']) fs.copyFileSync(path.join(PAKET, f), path.join(klasor, f));
  for (const d of ['telefon', 'sunucu']) {
    fs.mkdirSync(path.join(klasor, d));
    for (const f of fs.readdirSync(path.join(PAKET, d))) if (!/^(veri|mrp_veri)\.json$|^yedek$/.test(f)) fs.copyFileSync(path.join(PAKET, d, f), path.join(klasor, d, f));
  }
  const port = await bosPort();
  const surec = spawn(process.execPath, [path.join(klasor, 'sunucu', 'sunucu.js')], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, red) => {
    const z = setTimeout(() => red(new Error('sunucu açılmadı')), 10000);
    surec.stdout.on('data', d => { if (/çalışıyor/.test(d)) { clearTimeout(z); ok(); } });
    surec.on('exit', c => red(new Error('sunucu kapandı: ' + c)));
  });
  const url = `http://127.0.0.1:${port}`;
  return {
    url, klasor,
    veri: () => JSON.parse(fs.readFileSync(path.join(klasor, 'sunucu', 'veri.json'), 'utf8')),
    async api(yol, govde) {
      const r = await fetch(url + yol, govde ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) } : {});
      return { durum: r.status, json: await r.json().catch(() => null) };
    },
    kapat() { surec.kill(); fs.rmSync(klasor, { recursive: true, force: true }); },
  };
}

// Sayfa hatalarını toplar; test sonunda boş olması beklenir
function hataTopla(sayfa) {
  const L = [];
  sayfa.on('pageerror', e => L.push(e.message));
  sayfa.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|net::|Failed to load resource/.test(m.text())) L.push(m.text()); });
  return L;
}

module.exports = { sunucuBaslat, hataTopla, KOK, PAKET };
