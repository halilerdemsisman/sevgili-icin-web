// Uçtan uca testler için yardımcılar: paketi (dist/ veya eski/) geçici bir klasöre kopyalayıp
// sunucuyu orada boş veriyle başlatır; API çağrıları için oturum yardımcıları sağlar.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const KOK = path.join(__dirname, '..');
// TEST_PAKET=eski verilirse orijinal paket, verilmezse dist/ (derlenmiş) test edilir
const PAKET = process.env.TEST_PAKET === 'eski' ? path.join(KOK, 'eski') : path.join(KOK, 'dist');
const ESKI_PAKET = process.env.TEST_PAKET === 'eski';
const YONETICI_SIFRE = 'Test-Yonetici-2026';

const bosPort = () => new Promise((ok, red) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); s.on('error', red); });
const kopyala = (k, h) => { fs.mkdirSync(h, { recursive: true }); for (const f of fs.readdirSync(k)) { if (/^(veri|mrp_veri|oturumlar|gizli)\.json$|^veri\.sqlite|^(yedek|dosyalar|kayitlar)$/.test(f)) continue; const a = path.join(k, f), b = path.join(h, f); fs.statSync(a).isDirectory() ? kopyala(a, b) : fs.copyFileSync(a, b); } };

/**
 * @param {object} [s]
 * @param {object} [s.veri]  başlangıç veri.json içeriği ({veri:{anahtar: metin}})
 * @param {object} [s.ortam] ek ortam değişkenleri
 */
async function sunucuBaslat({ veri, ortam } = {}) {
  if (!fs.existsSync(path.join(PAKET, 'exit_satis_paneli.html'))) throw new Error(`${PAKET} yok. Önce: node araclar/derle.mjs`);
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'exit-test-'));
  for (const f of ['exit_bayi_siparis.html', 'exit_satis_paneli.html']) fs.copyFileSync(path.join(PAKET, f), path.join(klasor, f));
  for (const d of ['web', 'telefon', 'sunucu']) if (fs.existsSync(path.join(PAKET, d))) kopyala(path.join(PAKET, d), path.join(klasor, d));
  if (veri) fs.writeFileSync(path.join(klasor, 'sunucu', 'veri.json'), JSON.stringify({ zaman: 1, degisim: {}, ...veri }));
  const port = await bosPort();
  const surec = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(klasor, 'sunucu', 'sunucu.js')], { env: { ...process.env, PORT: String(port), EXIT_YONETICI_SIFRE: YONETICI_SIFRE, VERI_HEMEN_KAYDET: '1', ...ortam }, stdio: ['ignore', 'pipe', 'pipe'] });
  let cikti = '';
  await new Promise((ok, red) => {
    const z = setTimeout(() => red(new Error('sunucu açılmadı:\n' + cikti)), 10000);
    surec.stdout.on('data', d => { cikti += d; if (/çalışıyor/.test(d)) { clearTimeout(z); ok(); } });
    surec.stderr.on('data', d => { cikti += d; });
    surec.on('exit', c => red(new Error('sunucu kapandı: ' + c + '\n' + cikti)));
  });
  const url = `http://127.0.0.1:${port}`;
  const s = {
    url, klasor, port,
    // sunucunun verisi (veri.sqlite; DEPO=json ile veri.json). veriKlasoru: VERI_KLASORU verildiyse o klasör
    veri(veriKlasoru = path.join(klasor, 'sunucu')) {
      const { veriOku } = require(path.join(klasor, 'sunucu', 'lib', 'depo.js'));
      const sq = path.join(veriKlasoru, 'veri.sqlite');
      return veriOku(fs.existsSync(sq) ? sq : path.join(veriKlasoru, 'veri.json'));
    },
    /** API çağrısı. secenek: { cerez, uyg: 'bayi'|'satis', basliklar } */
    async api(yol, govde, secenek = {}) {
      const h = { 'X-Exit-Uyg': secenek.uyg || 'satis', ...(secenek.basliklar || {}) };
      const cerez = secenek.cerez === undefined ? s.yoneticiCerez : secenek.cerez;
      if (cerez) h.Cookie = cerez;
      if (govde !== undefined) h['Content-Type'] = 'application/json';
      const r = await fetch(url + yol, govde !== undefined ? { method: 'POST', headers: h, body: JSON.stringify(govde) } : { headers: h });
      const metin = await r.text(); let json = null; try { json = JSON.parse(metin); } catch (e) {}
      return { durum: r.status, json, metin, basliklar: r.headers };
    },
    /** Giriş yapar, çerezi ("exit_x=…") döner */
    async giris(tur, kul, sifre) {
      const r = await s.api('/api/giris', { tur, kul, sifre }, { cerez: null, uyg: tur });
      if (r.durum !== 200) throw new Error(`giriş başarısız (${r.durum}): ${r.metin}`);
      return r.basliklar.get('set-cookie').split(';')[0];
    },
    async kayit(kul, sifre = 'Sifre123') {
      const r = await s.api('/api/kayit', { kul, sifre, firma: kul + ' Ltd.', ad: kul, tel: '05550000000', mail: kul + '@ornek.com', kvkk: true }, { cerez: null, uyg: 'bayi' });
      if (r.durum !== 201) throw new Error(`kayıt başarısız (${r.durum}): ${r.metin}`);
      return r.basliklar.get('set-cookie').split(';')[0];
    },
    yoneticiCerez: null,
    kapat() { surec.kill(); fs.rmSync(klasor, { recursive: true, force: true }); },
  };
  if (!ESKI_PAKET) s.yoneticiCerez = await s.giris('satis', 'satis', YONETICI_SIFRE);
  return s;
}

// Sayfa hatalarını toplar; test sonunda boş olması beklenir
function hataTopla(sayfa) {
  const L = [];
  sayfa.on('pageerror', e => L.push(e.message));
  sayfa.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|net::|Failed to load resource/.test(m.text())) L.push(m.text()); });
  return L;
}

module.exports = { sunucuBaslat, hataTopla, KOK, PAKET, ESKI_PAKET, YONETICI_SIFRE };
