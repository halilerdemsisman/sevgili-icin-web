// EXIT Garden bayi portalı ve satış paneli için ortak sunucu. Ek paket gerektirmez: node sunucu.js
//
// Faz 1a: Uygulamalar veriyi eskisi gibi anahtar–değer olarak eşitler; sunucu artık
//   • giriş/oturum ister (HttpOnly çerez), şifreleri scrypt ile saklar,
//   • her kullanıcıya yalnız görmesi gereken veriyi gönderir, yalnız izinli değişiklikleri kabul eder,
//   • sipariş/ödeme/teklif numaralarını kendisi verir, çakışanı yeniden numaralandırır,
//   • dekont ve fotoğrafları diske çıkarıp yetki kontrolüyle sunar,
//   • girişleri ve yazmaları işlem kaydına yazar.
//
// Ayarlar (ortam değişkenleri):
//   PORT=8080                 dinlenecek port
//   HOST=                     dinlenecek adres; önünde Caddy/Nginx varken 127.0.0.1 verin (port dışarıdan erişilemesin)
//   EXIT_YONETICI_SIFRE=...   açılışta "satis" yönetici hesabının şifresini ayarlar (en az 8 karakter)
//   OTURUM_GUN=7              hareketsiz oturumun kapanma süresi (gün)
//   KAYIT_ACIK=1              bayilerin kendi kendine kayıt olabilmesi (0: kapalı)
//   GUVENILIR_VEKIL=0         1: önünde Caddy/Nginx var; istemci IP'si ve https bilgisi X-Forwarded-* başlıklarından okunur
//   HTTPS=0                   1: çerezler yalnız https ile gönderilir (vekil yoksa ve doğrudan https sunuluyorsa)
//   MRP_IZINLI_IP=            MRP'ye girişsiz erişebilecek IP'ler, virgülle (ör. şirketin sabit IP'si "85.1.2.3"; "85.1.2." ile başlayanlar)
//                             Bunlar dışında MRP'ye yalnız satış paneline giriş yapmış kullanıcılar ve yerel ağ erişir.
//   MRP_HERKESE_ACIK=0        1: MRP herkese açık (önerilmez)
//   VERI_KLASORU=<bu klasör>  veri.sqlite (eski: veri.json), dosyalar/, yedek/, kayitlar/ klasörü
//   DEPO=sqlite               json: veriyi veri.json'da tut (SQLite'ı olmayan eski Node sürümleri için)
//   ANTHROPIC_API_KEY=        "Claude ile derin analiz" için API anahtarı (ya da yönetici Ayarlar ekranından girer)
//   AI_SAATLIK=30             kullanıcı başına saatlik yapay zekâ isteği sınırı
//
// Komutlar: node sunucu.js --yonetici-sifre YENI_SIFRE [--kullanici satis]   şifreyi ayarlar ve çıkar
//           node sunucu.js --disa-aktar cikti.json                          veriyi eski biçimde (veri.json) dışa aktarır
//           node sunucu.js --yedek KLASOR                                   çalışırken tutarlı yedek: veri.sqlite + veri.json
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { depoAc, HANE } = require('./lib/depo');
const { Limitler } = require('./lib/limit');
const { restKur } = require('./lib/rest');
const { Kurallar, KISISEL } = require('./lib/kurallar');
const { Dosyalar, dosyaAlanlariniTemizle } = require('./lib/dosya');
const { Fiyatlar } = require('./lib/fiyat');
const K = require('./lib/kimlik');

const ENV = process.env;
const PORT = +ENV.PORT || 8080;
const KOK = path.join(__dirname, '..');
const zlib = require('zlib');
const VERI_KLASORU = ENV.VERI_KLASORU ? path.resolve(ENV.VERI_KLASORU) : __dirname;
const VEKIL = ENV.GUVENILIR_VEKIL === '1';
const KAYIT_ACIK = ENV.KAYIT_ACIK !== '0';
const SURUM = '2b-1';

const depo = depoAc(VERI_KLASORU);
const oturumlar = new K.Oturumlar(path.join(VERI_KLASORU, 'oturumlar.json'), +ENV.OTURUM_GUN || 7);
const dosyalar = new Dosyalar(path.join(VERI_KLASORU, 'dosyalar'), depo.D.dosya);
// Sipariş fiyat denetimi için katalog: pakette sunucu/katalog.json (derleme üretir), geliştirmede katalog/urunler.json
const KATALOG = [path.join(__dirname, 'katalog.json'), path.join(KOK, 'katalog', 'urunler.json')].find(f => fs.existsSync(f));
const fiyatlar = KATALOG ? new Fiyatlar(KATALOG, k => depo.al(k)) : null;
const limitler = new Limitler(k => depo.al(k));
const kurallar = new Kurallar({ ham: k => depo.al(k), yeniNo: (on, yil, hane) => depo.yeniNo(on, yil, hane), fiyatlar, limitler });
const deneme = new K.DenemeSiniri();
const SAHTE_OZET = K.sifreOzetle('kullanici-yok');
const kayitSiniri = new K.DenemeSiniri({ kisi: 1e9, ip: 10 });

// ---------- işlem kaydı ----------
const KAYIT_KLASORU = path.join(VERI_KLASORU, 'kayitlar'); fs.mkdirSync(KAYIT_KLASORU, { recursive: true });
function islem(olay, ot, detay, ip) {
  const s = JSON.stringify({ t: new Date().toISOString(), olay, kim: ot ? `${ot.tur}:${ot.kul}` : '-', ip: ip || '', detay: detay || '' });
  fs.appendFile(path.join(KAYIT_KLASORU, `islem-${new Date().toISOString().slice(0, 7)}.jsonl`), s + '\n', () => {});
}

// ---------- kullanıcılar ----------
const kullanicilar = tur => { try { return JSON.parse(depo.al(tur === 'bayi' ? 'exb-kullanicilar' : 'exs-kullanicilar') || '{}') || {}; } catch (e) { return {}; } };
const kullaniciKaydet = (tur, L) => { const z = depo.yeniZaman(); depo.koy(tur === 'bayi' ? 'exb-kullanicilar' : 'exs-kullanicilar', JSON.stringify(L), z); depo.zamanla(z); depo.kaydet(); };
const rolu = u => u.rol || (u.kul === 'satis' ? 'yonetici' : 'temsilci');

function yoneticiSifresi(sifre, kul = 'satis') {
  if (String(sifre).length < 8) throw new Error('Yönetici şifresi en az 8 karakter olmalı.');
  const L = kullanicilar('satis');
  L[kul] = { ...(L[kul] || { kul, ad: 'Satış Yöneticisi' }), kul, rol: (L[kul] && L[kul].rol) || 'yonetici', sifre: K.sifreOzetle(sifre) };
  kullaniciKaydet('satis', L); oturumlar.kullaniciyiKapat('satis', kul);
}

// komut satırı: şifre ayarla ve çık
const ai = process.argv.indexOf('--yonetici-sifre');
if (ai > 0) {
  const ki = process.argv.indexOf('--kullanici'), kul = ki > 0 ? process.argv[ki + 1] : 'satis';
  try { yoneticiSifresi(process.argv[ai + 1] || '', kul); depo.hemenKaydet(); console.log(`"${kul}" kullanıcısının şifresi ayarlandı.`); process.exit(0); }
  catch (e) { console.error(e.message); process.exit(1); }
}
const di = process.argv.indexOf('--disa-aktar');
if (di > 0) { const h = path.resolve(process.argv[di + 1] || 'veri-disa.json'); depo.disaAktar(h); console.log('Dışa aktarıldı:', h); process.exit(0); }
// tutarlı yedek (sunucu çalışırken de): <klasör>/veri.sqlite (VACUUM INTO) + <klasör>/veri.json (eski biçim)
const yi = process.argv.indexOf('--yedek');
if (yi > 0) {
  const h = path.resolve(process.argv[yi + 1] || '.'); fs.mkdirSync(h, { recursive: true });
  if (depo.tur === 'sqlite') depo.db.exec(`VACUUM INTO '${path.join(h, 'veri.sqlite').replace(/'/g, "''")}'`);
  depo.disaAktar(path.join(h, 'veri.json')); console.log('Yedek:', h); process.exit(0);
}
if (ENV.EXIT_YONETICI_SIFRE) yoneticiSifresi(ENV.EXIT_YONETICI_SIFRE);

// ---------- sunucuda saklanan gizli ayarlar (yapay zekâ anahtarı) ----------
const GIZLI = path.join(VERI_KLASORU, 'gizli.json');
const gizliOku = () => { try { return JSON.parse(fs.readFileSync(GIZLI, 'utf8')); } catch (e) { return {}; } };
const gizliYaz = o => { fs.writeFileSync(GIZLI + '.tmp', JSON.stringify(o), { mode: 0o600 }); fs.renameSync(GIZLI + '.tmp', GIZLI); };
const aiAnahtari = () => ENV.ANTHROPIC_API_KEY || gizliOku().aiAnahtar || '';
const AI_TABAN = ENV.ANTHROPIC_TABAN_URL || 'https://api.anthropic.com';
const AI_MODELLER = ['claude-opus-5-5'];
const AI_ALANLAR = ['model', 'max_tokens', 'system', 'messages', 'output_config', 'fallbacks', 'thinking'];
const aiSayac = new Map(); // kullanıcı → [zamanlar]

// ---------- anlık bildirim (Server-Sent Events) ----------
// Her yazma turunda bağlı istemcilere yalnız "değişti" sinyali gider (veri içermez); istemci kendi
// görebileceği değişiklikleri /api/degisen ile çeker.
const olayIstemcileri = new Set();
depo.dinleyiciler.push(z => { for (const c of olayIstemcileri) c.write(`data: ${z}\n\n`); });
setInterval(() => { for (const c of olayIstemcileri) c.write(': nabiz\n\n'); }, 25000).unref();

// ---------- dosyalar: gömülü data URI'leri diske çıkar ----------
function dosyaCikar(k, obj) {
  const s = kurallar.dosyaSahibi(k);
  if (s.sozluk && obj && typeof obj === 'object') return Object.entries(obj).reduce((n, [kul, v]) => n + dosyalar.cikar(v, kul), 0);
  return dosyalar.cikar(obj, s.tek);
}
// açılışta: eski sürümden kalan gömülü dosyaları taşı (bir kez; sonra bulunacak bir şey kalmaz)
(function goc() {
  const z = depo.yeniZaman(); let n = 0;
  for (const k of depo.anahtarlar()) {
    const v = depo.al(k); if (typeof v !== 'string' || !v.includes('data:')) continue;
    let o; try { o = JSON.parse(v); } catch (e) { continue; }
    const c = dosyaCikar(k, o); if (c) { depo.koy(k, JSON.stringify(o), z); n += c; }
  }
  if (n) { depo.zamanla(z); depo.hemenKaydet(); console.log(`Göç: ${n} gömülü dosya dosyalar/ klasörüne taşındı.`); }
})();
depo.yedekAl(dosyalar.klasor); setInterval(() => depo.yedekAl(dosyalar.klasor), 3600e3).unref();

// ---------- MRP (değişmedi; yalnız yerel ağdan erişim) ----------
const MRPV = path.join(VERI_KLASORU, 'mrp_veri.json'); let M = { app: 'MRP', keys: {} };
try { M = JSON.parse(fs.readFileSync(MRPV, 'utf8')); } catch (e) {}
let mrpZam = null; const mrpKaydet = () => { clearTimeout(mrpZam); mrpZam = setTimeout(() => { fs.writeFileSync(MRPV + '.tmp', JSON.stringify(M)); fs.renameSync(MRPV + '.tmp', MRPV); }, 300); };
const mrpYedek = () => { const g = new Date().toISOString().slice(0, 10), f = path.join(depo.yedekKlasoru, 'mrp-' + g + '.json'); if (!fs.existsSync(f) && Object.keys(M.keys).length) fs.writeFileSync(f, JSON.stringify(M)); fs.readdirSync(depo.yedekKlasoru).filter(x => x.startsWith('mrp-')).sort().slice(0, -30).forEach(x => fs.unlinkSync(path.join(depo.yedekKlasoru, x))); };
mrpYedek(); setInterval(mrpYedek, 3600e3).unref();

// ---------- HTTP yardımcıları ----------
const istemciIp = q => (VEKIL && q.headers['x-forwarded-for'] ? String(q.headers['x-forwarded-for']).split(',')[0].trim() : q.socket.remoteAddress || '').replace(/^::ffff:/, '');
const ozelAg = ip => /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(ip) || ip === '::1' || /^f[cd][0-9a-f]{2}:/i.test(ip) || /^fe80:/i.test(ip);
const httpsMi = q => ENV.HTTPS === '1' || (VEKIL && q.headers['x-forwarded-proto'] === 'https');
const cerezler = q => Object.fromEntries(String(q.headers.cookie || '').split(';').map(x => x.trim().split('=')).filter(x => x[0]).map(([a, ...b]) => [a, decodeURIComponent(b.join('='))]));
const CEREZ = { bayi: 'exit_b', satis: 'exit_s' };
const cerezYaz = (q, tur, deger) => `${CEREZ[tur]}=${deger ? encodeURIComponent(deger) : ''}; Path=/; HttpOnly; SameSite=Lax${httpsMi(q) ? '; Secure' : ''}; Max-Age=${deger ? (+ENV.OTURUM_GUN || 7) * 86400 : 0}`;
const GUVENLIK = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' };
const js = (r, o, c = 200, b = {}) => { r.writeHead(c, { ...GUVENLIK, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...b }); r.end(JSON.stringify(o)); };
const govde = (q, sinir) => new Promise((ok, red) => { let b = '', n = 0; q.on('data', c => { n += c.length; if (n > sinir) { red(new Error('çok büyük')); q.destroy(); } else b += c; }); q.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { red(e); } }); q.on('error', red); });
// Başka siteden gelen yazma isteklerini engelle (CSRF)
const kaynakUygun = q => { const o = q.headers.origin; if (!o) return true; try { return new URL(o).host === q.headers.host; } catch (e) { return false; } };
const uygulama = (q, u) => (q.headers['x-exit-uyg'] || u.searchParams.get('uyg')) === 'satis' ? 'satis' : 'bayi';
function oturum(q, tur) {
  const o = oturumlar.bul(cerezler(q)[CEREZ[tur]]); if (!o || o.tur !== tur) return null;
  return { ...o }; // istek boyunca kullanılan kopya (kapsam önbelleği bunun üzerinde)
}
const oturumOzeti = o => o ? { kul: o.kul, tur: o.tur, rol: o.rol, ad: o.ad || '', ...(o.sifreDegistir ? { sifreDegistir: true } : {}) } : null;
// Geçici şifreyle girmiş kullanıcı, şifresini değiştirene kadar veri göremez ve yazamaz
const tamOturum = o => o && !o.sifreDegistir ? o : null;
const geciciSifre = () => { const H = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(require('crypto').randomBytes(10), b => H[b % H.length]).join(''); };
function oturumYenile(q, tur, kul, uk, ip) {
  oturumlar.kullaniciyiKapat(tur, kul);
  const ot = { kul, tur, rol: tur === 'satis' ? rolu(uk) : 'bayi', ad: uk.firma || uk.ad || kul, ip };
  if (uk.sifreDegistir) ot.sifreDegistir = true;
  return { ot, cerez: cerezYaz(q, tur, oturumlar.ac(ot)) };
}
const mrpIzinli = (q, ip) => ENV.MRP_HERKESE_ACIK === '1' || ozelAg(ip) || !!oturum(q, 'satis')
  || String(ENV.MRP_IZINLI_IP || '').split(',').map(x => x.trim()).filter(Boolean).some(e => ip === e || (e.endsWith('.') && ip.startsWith(e)));

const YEREL = /^(exb-dil|exb-oturum|exs-oturum|exs-ai-anahtar|exit-tema|exb-kars)$/;
function gorunurVeri(ot) {
  const veri = {}; if (!ot) return veri;
  for (const k of depo.anahtarlar()) { const v = kurallar.oku(k, depo.al(k), ot); if (v !== undefined) veri[k] = v; }
  return veri;
}

// ---------- yazma: eşitleme ucu ve REST aynı yolu kullanır ----------
// Kurallar → gömülü dosyaları çıkar → kaydet → (değiştiyse) zaman ilerlet + anlık bildirim → işlem kaydı.
// birlesen: istemcinin yerel kopyasını düzeltmesi için sunucudaki (süzülmüş) son hâl.
function uygula(ot, degisen, ip) {
  const z = depo.yeniZaman(), birlesen = [], reddedilen = [], yazilan = [];
  for (const [k, v] of degisen) {
    if (typeof k !== 'string' || YEREL.test(k) || !/^ex[bs]-/.test(k)) continue;
    const s = kurallar.yaz(k, v == null ? null : String(v), ot);
    if (s.red) { reddedilen.push([k, s.red]); continue; }
    (s.uyari || []).forEach(u => reddedilen.push([k, u]));
    let deger = s.deger;
    if (deger != null && (deger.includes('data:') || /"(dosya|foto|logo)"/.test(deger))) {
      try {
        const o = JSON.parse(deger), c = dosyaCikar(k, o), t = dosyaAlanlariniTemizle(o);
        if (c || t) deger = JSON.stringify(o);
        if (t) reddedilen.push([k, `${t} dosya alanı geçersiz olduğu için silindi`]);
      } catch (e) { /* JSON olmayan düz değer: olduğu gibi */ }
    }
    if (depo.koy(k, deger, z)) yazilan.push(k + (s.not && s.not.length ? ` (${s.not.join(', ')})` : ''));
    if (k === 'exb-kullanicilar') Object.values(kullanicilar('bayi')).forEach(x => x && x.durum === 'pasif' && oturumlar.kullaniciyiKapat('bayi', x.kul));
    const g = kurallar.oku(k, depo.al(k) ?? null, ot);
    if (g !== undefined && g !== (v == null ? null : String(v))) birlesen.push([k, g]);
  }
  if (yazilan.length) { depo.zamanla(z); depo.kaydet(); islem('yazma', ot, yazilan.join('; '), ip); }
  if (reddedilen.length) islem('red', ot, reddedilen.map(x => x.join(': ')).join('; '), ip);
  return { birlesen, reddedilen, yazilan };
}

const rest = restKur({ depo, kurallar, fiyatlar, limitler, js, govde, uygula, islem, kullanicilar, oturum: (q, t) => tamOturum(oturum(q, t)) });

// ---------- API ----------
async function api(q, r, u, p, ip) {
  const tur = uygulama(q, u);
  if (q.method !== 'GET' && q.method !== 'HEAD' && !kaynakUygun(q)) return js(r, { hata: 'kaynak reddedildi' }, 403);

  if (p === '/api/oturum') return js(r, { oturum: oturumOzeti(oturum(q, tur)), surum: SURUM, kayitAcik: KAYIT_ACIK });

  if (p.startsWith('/api/v1/')) return rest(q, r, u, p, ip, tur);

  if (p === '/api/olaylar' && q.method === 'GET') {
    const ot = tamOturum(oturum(q, tur)); if (!ot) return js(r, { hata: 'oturum yok' }, 401);
    if (olayIstemcileri.size >= 1000) return js(r, { hata: 'meşgul' }, 503);
    r.writeHead(200, { ...GUVENLIK, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
    r.write('retry: 5000\n\n'); olayIstemcileri.add(r);
    q.on('close', () => olayIstemcileri.delete(r));
    return;
  }

  // ---- yapay zekâ: Claude isteği sunucu üzerinden (anahtar tarayıcıya gitmez) ----
  if (p === '/api/ai/durum' && q.method === 'GET') {
    const ot = tamOturum(oturum(q, 'satis')); if (!ot) return js(r, { hata: 'oturum yok' }, 401);
    return js(r, { anahtarVar: !!aiAnahtari(), kaynak: ENV.ANTHROPIC_API_KEY ? 'ortam' : gizliOku().aiAnahtar ? 'ayarlar' : null });
  }
  if (p === '/api/ai/anahtar' && q.method === 'POST') {
    const ot = tamOturum(oturum(q, 'satis'));
    if (!ot || ot.rol !== 'yonetici') return js(r, { hata: 'Yalnız satış yöneticisi değiştirebilir.' }, 403);
    let b; try { b = await govde(q, 1e4); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
    const a = String(b.anahtar || '').trim(), G = gizliOku();
    if (a && !/^sk-ant-[\w-]{20,}$/.test(a)) return js(r, { hata: 'Anahtar "sk-ant-" ile başlamalı.' }, 400);
    if (a) G.aiAnahtar = a; else delete G.aiAnahtar;
    gizliYaz(G); islem(a ? 'yapay zekâ anahtarı kaydedildi' : 'yapay zekâ anahtarı silindi', ot, '', ip);
    return js(r, { ok: true, anahtarVar: !!aiAnahtari() });
  }
  if (p === '/api/ai/mesaj' && q.method === 'POST') {
    const ot = tamOturum(oturum(q, 'satis')); if (!ot) return js(r, { hata: 'oturum yok' }, 401);
    const anahtar = aiAnahtari(); if (!anahtar) return js(r, { error: { message: 'Sunucuda Claude API anahtarı tanımlı değil (Ayarlar).' } }, 400);
    const L = (aiSayac.get(ot.kul) || []).filter(t => Date.now() - t < 3600e3);
    if (L.length >= (+ENV.AI_SAATLIK || 30)) return js(r, { error: { message: 'Saatlik yapay zekâ istek sınırı doldu.' } }, 429);
    let b; try { b = await govde(q, 2e6); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
    if (!AI_MODELLER.includes(b.model)) return js(r, { error: { message: 'Bu model kullanılamaz.' } }, 400);
    const istek = Object.fromEntries(AI_ALANLAR.filter(a => a in b).map(a => [a, b[a]]));
    istek.max_tokens = Math.min(16000, Math.max(1, +istek.max_tokens || 4096));
    L.push(Date.now()); aiSayac.set(ot.kul, L);
    try {
      const y = await fetch(AI_TABAN + '/v1/messages', {
        method: 'POST', signal: AbortSignal.timeout(10 * 60e3),
        headers: { 'content-type': 'application/json', 'x-api-key': anahtar, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
        body: JSON.stringify(istek),
      });
      const metin = await y.text();
      let u = ''; try { const j = JSON.parse(metin); if (j.usage) u = `girdi ${j.usage.input_tokens}, çıktı ${j.usage.output_tokens} token`; } catch (e) {}
      islem('yapay zekâ', ot, `${istek.model} · HTTP ${y.status}${u ? ' · ' + u : ''}`, ip);
      r.writeHead(y.status, { ...GUVENLIK, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return r.end(metin);
    } catch (e) {
      islem('yapay zekâ hatası', ot, String(e.message || e), ip);
      return js(r, { error: { message: 'Claude API\'ye ulaşılamadı: ' + (e.name === 'TimeoutError' ? 'zaman aşımı' : e.message) } }, 502);
    }
  }

  // ---- satış kullanıcıları (yönetici): ekle / sil ----
  if ((p === '/api/kullanici-ekle' || p === '/api/kullanici-sil') && q.method === 'POST') {
    const ot = tamOturum(oturum(q, 'satis'));
    if (!ot || ot.rol !== 'yonetici') return js(r, { hata: 'Yalnız satış yöneticisi kullanıcı ekleyip silebilir.' }, 403);
    let b; try { b = await govde(q, 1e4); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
    const kul = String(b.kul || '').trim().toLowerCase(), L = kullanicilar('satis');
    if (p === '/api/kullanici-sil') {
      if (kul === ot.kul) return js(r, { hata: 'Kendinizi silemezsiniz.' }, 400);
      if (!L[kul]) return js(r, { hata: 'Kullanıcı bulunamadı.' }, 404);
      delete L[kul]; kullaniciKaydet('satis', L); oturumlar.kullaniciyiKapat('satis', kul);
      islem('satış kullanıcısı silindi', ot, kul, ip);
      return js(r, { ok: true });
    }
    if (!/^[a-z0-9._-]{3,40}$/.test(kul)) return js(r, { hata: 'Kullanıcı adı en az 3 karakter olmalı (harf, rakam, . _ -).' }, 400);
    if (L[kul]) return js(r, { hata: 'Bu kullanıcı adı var.' }, 409);
    const gecici = geciciSifre();
    L[kul] = { kul, ad: String(b.ad || '').trim().slice(0, 100) || kul, rol: b.rol === 'yonetici' ? 'yonetici' : 'temsilci', sifre: K.sifreOzetle(gecici), sifreDegistir: true };
    kullaniciKaydet('satis', L);
    islem('satış kullanıcısı eklendi', ot, `${kul} (${L[kul].rol})`, ip);
    return js(r, { ok: true, gecici });
  }

  if (p === '/api/veri' && q.method === 'GET') { const ot = oturum(q, tur); return js(r, { zaman: depo.zaman, veri: gorunurVeri(tamOturum(ot)), oturum: oturumOzeti(ot) }); }

  if (p === '/api/degisen') {
    const ot0 = oturum(q, tur), ot = tamOturum(ot0), son = +u.searchParams.get('son') || 0;
    if (!ot) return js(r, { zaman: depo.zaman, degisen: [], oturum: oturumOzeti(ot0) });
    const degisen = [];
    for (const k of depo.degisenler(son)) {
      const ham = depo.al(k);
      if (ham == null) { const m = k.match(KISISEL); if (ot.tur === 'satis' || (m && m[2] === ot.kul) || (!m && !k.startsWith('exs-'))) degisen.push([k, null]); continue; }
      const v = kurallar.oku(k, ham, ot); if (v !== undefined) degisen.push([k, v]);
    }
    return js(r, { zaman: depo.zaman, degisen, oturum: oturumOzeti(ot) });
  }

  if (p === '/api/veri' && q.method === 'POST') {
    const ot = oturum(q, tur); if (!ot) return js(r, { hata: 'Oturum yok veya süresi doldu. Yeniden giriş yapın.' }, 401);
    if (ot.sifreDegistir) return js(r, { hata: 'Önce şifrenizi değiştirin.' }, 403);
    let b; try { b = await govde(q, 60e6); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
    if (!Array.isArray(b.degisen)) return js(r, { hata: 'geçersiz istek' }, 400);
    const { birlesen, reddedilen } = uygula(ot, b.degisen, ip);
    return js(r, { ok: true, zaman: depo.zaman, birlesen, reddedilen });
  }

  if (p === '/api/giris' && q.method === 'POST') {
    let b; try { b = await govde(q, 1e4); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
    const t = b.tur === 'satis' ? 'satis' : 'bayi', kul = String(b.kul || '').trim().toLowerCase(), sifre = String(b.sifre || '');
    const dk = deneme.engelliMi(ip, kul);
    if (dk) { islem('giriş engellendi', null, `${t}:${kul}`, ip); return js(r, { hata: `Çok fazla hatalı deneme. ${dk} dakika sonra tekrar deneyin.` }, 429); }
    const L = kullanicilar(t), uk = L[kul];
    // kullanıcı yoksa da aynı süreyi harca (yanıt süresinden kullanıcı adı tahmin edilmesin)
    const d = uk ? K.sifreDogrula(sifre, uk.sifre, K.ON_EK[t]) : (K.sifreDogrula(sifre, SAHTE_OZET, ''), { ok: false });
    if (!d.ok) { deneme.hata(ip, kul); islem('giriş hatalı', null, `${t}:${kul}`, ip); return js(r, { hata: 'Kullanıcı adı veya şifre hatalı.' }, 401); }
    if (t === 'satis' && uk.sifre === K.VARSAYILAN_SATIS_OZETI) return js(r, { hata: 'Varsayılan şifre (1234) güvenlik nedeniyle kapatıldı. Sunucu yöneticisi yeni şifre belirlemeli: node sunucu.js --yonetici-sifre YENI_SIFRE' }, 403);
    if (t === 'bayi' && uk.rol !== 'musteri') return js(r, { hata: 'Bu uygulama yalnız müşteri hesapları içindir.' }, 403);
    if (uk.durum === 'pasif') return js(r, { hata: 'Hesabınız pasif. EXIT Garden satış ekibiyle iletişime geçin.' }, 403);
    deneme.basari(ip, kul);
    if (d.yukselt) { uk.sifre = K.sifreOzetle(sifre); kullaniciKaydet(t, L); }
    const ot = { kul, tur: t, rol: t === 'satis' ? rolu(uk) : 'bayi', ad: uk.firma || uk.ad || kul, ip };
    if (uk.sifreDegistir) ot.sifreDegistir = true;
    const anahtar = oturumlar.ac(ot);
    islem('giriş', ot, [d.yukselt && 'şifre özeti scrypt\'e yükseltildi', uk.sifreDegistir && 'geçici şifre'].filter(Boolean).join(', '), ip);
    return js(r, { ok: true, oturum: oturumOzeti(ot) }, 200, { 'Set-Cookie': cerezYaz(q, t, anahtar) });
  }

  if (p === '/api/kayit' && q.method === 'POST') {
    if (!KAYIT_ACIK) return js(r, { hata: 'Yeni bayi kaydı kapalı. EXIT Garden satış ekibiyle iletişime geçin.' }, 403);
    if (kayitSiniri.engelliMi(ip, '#')) return js(r, { hata: 'Çok fazla kayıt denemesi. Daha sonra tekrar deneyin.' }, 429);
    let b; try { b = await govde(q, 1e5); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
    kayitSiniri.hata(ip, '#');
    const s = x => String(b[x] || '').trim().slice(0, 200), kul = s('kul').toLowerCase(), sifre = String(b.sifre || '');
    if (!/^[a-z0-9._-]{3,40}$/.test(kul)) return js(r, { hata: 'Kullanıcı adı en az 3 karakter olmalı (harf, rakam, . _ -).' }, 400);
    if (sifre.length < 8) return js(r, { hata: 'Şifre en az 8 karakter olmalı.' }, 400);
    if (!s('firma') || !s('ad') || !s('tel') || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s('mail'))) return js(r, { hata: 'Firma, ad soyad, telefon ve geçerli bir e-posta gerekli.' }, 400);
    if (b.kvkk !== true) return js(r, { hata: 'KVKK aydınlatma metnini onaylayın.' }, 400);
    const L = kullanicilar('bayi');
    if (L[kul]) return js(r, { hata: 'Bu kullanıcı adı alınmış.' }, 409);
    L[kul] = { kul, firma: s('firma'), ad: s('ad'), tel: s('tel'), mail: s('mail'), sehir: s('sehir'), vergi: s('vergi'), rol: 'musteri', durum: 'aktif', sifre: K.sifreOzetle(sifre), tarih: Date.now(), kvkk: Date.now() };
    kullaniciKaydet('bayi', L);
    const ot = { kul, tur: 'bayi', rol: 'bayi', ad: L[kul].firma, ip };
    const anahtar = oturumlar.ac(ot);
    islem('bayi kaydı', ot, L[kul].firma, ip);
    // satış panelindeki "işlem kaydı" ekranında görünsün
    try { const I = JSON.parse(depo.al('exs-islem') || '[]'); I.push({ t: Date.now(), kim: kul, ad: L[kul].firma, olay: 'Yeni bayi kaydı', detay: [L[kul].firma, L[kul].sehir, L[kul].tel].filter(Boolean).join(' · ') }); if (I.length > 3000) I.splice(0, I.length - 3000); const z = depo.yeniZaman(); depo.koy('exs-islem', JSON.stringify(I), z); depo.zamanla(z); depo.kaydet(); } catch (e) {}
    return js(r, { ok: true, oturum: oturumOzeti(ot) }, 201, { 'Set-Cookie': cerezYaz(q, 'bayi', anahtar) });
  }

  if (p === '/api/cikis' && q.method === 'POST') {
    const a = cerezler(q)[CEREZ[tur]], ot = oturumlar.bul(a);
    oturumlar.kapat(a); if (ot) islem('çıkış', ot, '', ip);
    return js(r, { ok: true }, 200, { 'Set-Cookie': cerezYaz(q, tur, '') });
  }

  if (p === '/api/numara' && q.method === 'POST') {
    const ot = tamOturum(oturum(q, tur)); if (!ot) return js(r, { hata: 'oturum yok' }, 401);
    let b; try { b = await govde(q, 1e3); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
    if (!HANE[b.on]) return js(r, { hata: 'bilinmeyen ön ek' }, 400);
    return js(r, { no: depo.yeniNo(b.on) });
  }

  // Kullanıcı kendi şifresini değiştirir (geçici şifreyle girenler için zorunlu)
  if (p === '/api/sifre' && q.method === 'POST') {
    const ot = oturum(q, tur); if (!ot) return js(r, { hata: 'Oturum yok veya süresi doldu.' }, 401);
    let b; try { b = await govde(q, 1e4); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
    const eski = String(b.eski || ''), yeni = String(b.yeni || '');
    if (deneme.engelliMi(ip, ot.kul)) return js(r, { hata: 'Çok fazla hatalı deneme. Daha sonra tekrar deneyin.' }, 429);
    const L = kullanicilar(ot.tur), uk = L[ot.kul]; if (!uk) return js(r, { hata: 'kullanıcı yok' }, 404);
    if (!K.sifreDogrula(eski, uk.sifre, K.ON_EK[ot.tur]).ok) { deneme.hata(ip, ot.kul); return js(r, { hata: 'Mevcut şifre hatalı.' }, 400); }
    if (yeni.length < 8) return js(r, { hata: 'Yeni şifre en az 8 karakter olmalı.' }, 400);
    if (yeni === eski) return js(r, { hata: 'Yeni şifre eskisiyle aynı olamaz.' }, 400);
    uk.sifre = K.sifreOzetle(yeni); delete uk.sifreDegistir; kullaniciKaydet(ot.tur, L);
    const y = oturumYenile(q, ot.tur, ot.kul, uk, ip); // diğer cihazlardaki oturumlar kapanır
    islem('şifre değiştirildi', ot, '', ip);
    return js(r, { ok: true, oturum: oturumOzeti(y.ot) }, 200, { 'Set-Cookie': y.cerez });
  }

  // Satış yöneticisi bir bayinin veya satış kullanıcısının şifresini sıfırlar: geçici şifre üretilir,
  // kullanıcı ilk girişte değiştirmek zorundadır.
  if (p === '/api/sifre-sifirla' && q.method === 'POST') {
    const ot = tamOturum(oturum(q, 'satis'));
    if (!ot || ot.rol !== 'yonetici') return js(r, { hata: 'Yalnız satış yöneticisi şifre sıfırlayabilir.' }, 403);
    let b; try { b = await govde(q, 1e4); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
    const t = b.tur === 'satis' ? 'satis' : 'bayi', kul = String(b.kul || ''), L = kullanicilar(t), uk = L[kul];
    if (!uk) return js(r, { hata: 'Kullanıcı bulunamadı.' }, 404);
    if (t === 'satis' && kul === ot.kul) return js(r, { hata: 'Kendi şifrenizi "Şifremi değiştir" ile değiştirin.' }, 400);
    const gecici = geciciSifre();
    uk.sifre = K.sifreOzetle(gecici); uk.sifreDegistir = true; kullaniciKaydet(t, L);
    oturumlar.kullaniciyiKapat(t, kul);
    islem('şifre sıfırlandı', ot, `${t}:${kul}`, ip);
    return js(r, { ok: true, gecici });
  }

  if (p.startsWith('/api/dosya/') && q.method === 'GET') {
    const ad = p.slice('/api/dosya/'.length);
    const d = dosyalar.oku(ad, oturum(q, 'satis')) || dosyalar.oku(ad, oturum(q, 'bayi'));
    if (!d) return js(r, { hata: 'bulunamadı veya yetki yok' }, 404);
    r.writeHead(200, { ...GUVENLIK, 'Content-Type': d.tip, 'Cache-Control': 'private, max-age=86400', 'Content-Disposition': d.indir ? `attachment; filename="${ad}"` : 'inline', 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" });
    return r.end(d.veri);
  }

  return js(r, { hata: 'bulunamadı' }, 404);
}

// ---------- statik dosyalar ----------
const TIP = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const YASAK = [path.join(KOK, 'sunucu'), VERI_KLASORU];
// Bayi web sitesi (Faz 2): dist/web. Eski paketlerde (web/ yoksa) telefon/ yayınlanır.
const WEB = fs.existsSync(path.join(KOK, 'web', 'index.html')) ? 'web' : 'telefon';
// Sitenin sayfa adresleri: hepsi aynı index.html'i döner, sayfayı tarayıcıdaki kod seçer
const SITE_ADRESI = /^\/(katalog|urun|siparisler|cari|belgeler|odeme|ozel-teklif|projeler|sepet)(\/[^.]*)?$/;
// Web sitesi için içerik güvenliği: yalnız kendi dosyaları; satır içi kodlar mevcut ekranlar için açık
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://www.exitgarden.com; connect-src 'self'; font-src 'self' data:; worker-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'";
// Satış paneli (tek dosya, satır içi kod): dış bağlantı yalnız döviz kuru servisine. Bir XSS olsa bile
// verinin başka bir siteye gönderilmesini (fetch, resim) engeller.
const CSP_SATIS = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://www.exitgarden.com; connect-src 'self' https://open.er-api.com; font-src 'self' data:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'";
const SIKISTIR = /\.(html|js|css|json|webmanifest|svg|txt)$/;
const statikOnbellek = new Map(); // tam yol -> {zaman, veri, gz, etiket}
function statikOku(tam) {
  const st = fs.statSync(tam), o = statikOnbellek.get(tam);
  if (o && o.zaman === st.mtimeMs && o.boy === st.size) return o;
  const veri = fs.readFileSync(tam);
  const y = { zaman: st.mtimeMs, boy: st.size, veri, etiket: '"' + require('crypto').createHash('sha1').update(veri).digest('base64url').slice(0, 16) + '"',
    gz: SIKISTIR.test(tam) && veri.length > 1024 ? zlib.gzipSync(veri, { level: 9 }) : null };
  if (statikOnbellek.size > 500) statikOnbellek.clear();
  statikOnbellek.set(tam, y); return y;
}
function statikGonder(q, r, tam, ekBaslik = {}) {
  let o; try { o = statikOku(tam); } catch (e) { r.writeHead(404, GUVENLIK); return r.end('Bulunamadı'); }
  const goreli = path.relative(KOK, tam).split(path.sep).join('/');
  // içerik özetli adlar (web/js, web/css) hiç değişmez; görseller bir gün; sayfalar her açılışta denetlenir
  const onbellek = /^web\/(js|css)\//.test(goreli) ? 'public, max-age=31536000, immutable' : /^web\/(gorsel|maske)\//.test(goreli) || /^web\/icon-/.test(goreli) ? 'public, max-age=86400' : 'no-cache';
  const B = { ...GUVENLIK, 'Content-Type': TIP[path.extname(tam)] || 'application/octet-stream', 'Cache-Control': onbellek, ETag: o.etiket, Vary: 'Accept-Encoding', ...ekBaslik };
  if (q.headers['if-none-match'] === o.etiket) { r.writeHead(304, B); return r.end(); }
  const gz = o.gz && /\bgzip\b/.test(q.headers['accept-encoding'] || '');
  const veri = gz ? o.gz : o.veri;
  r.writeHead(200, { ...B, 'Content-Length': veri.length, ...(gz ? { 'Content-Encoding': 'gzip' } : {}) });
  r.end(q.method === 'HEAD' ? undefined : veri);
}

// kapanırken bekleyen yazmaları diske aktar
for (const sinyal of ['SIGINT', 'SIGTERM']) process.on(sinyal, () => { try { depo.hemenKaydet(); if (depo.kapat) depo.kapat(); } catch (e) { console.error(e); } process.exit(0); });

http.createServer(async (q, r) => {
  const u = new URL(q.url, 'http://x'), ip = istemciIp(q);
  // /satis/api/... ve /mrp/api/... da kabul edilir (sayfalar göreli "api/..." adresi kullanır)
  const p = u.pathname.replace(/^\/(satis|mrp)\/api\//, '/api/');
  try {
    if (p === '/mrp' || p === '/mrp/' || p.startsWith('/api/mrp')) {
      if (!mrpIzinli(q, ip)) {
        if (!p.startsWith('/api/')) { r.writeHead(403, { ...GUVENLIK, 'Content-Type': 'text/html; charset=utf-8' }); return r.end('<!doctype html><meta charset="utf-8"><title>MRP</title><p style="font:16px sans-serif;margin:40px">MRP için önce <a href="/satis">satış paneline</a> giriş yapın, sonra bu sayfayı yenileyin.</p>'); }
        return js(r, { hata: 'MRP için satış paneline giriş yapın.' }, 403);
      }
      if (p === '/api/mrp/durum') return js(r, { ok: true });
      if (p === '/api/mrp' && q.method === 'GET') return js(r, M);
      if (p === '/api/mrp' && q.method === 'POST') {
        let d; try { d = await govde(q, 200e6); if (d.app !== 'MRP' || !d.keys) throw 0; } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
        Object.entries(d.keys).forEach(([k, e]) => { if (!/^mrp-/.test(k) || !e) return; const o = M.keys[k]; if (!o || (e.ts || 0) >= (o.ts || 0)) M.keys[k] = e; });
        Object.assign(M, { surum: d.surum, updated: new Date().toISOString(), by: d.by }); mrpKaydet(); return js(r, { ok: true });
      }
    }
    if (p.startsWith('/api/')) return await api(q, r, u, p, ip);

    if (q.method !== 'GET' && q.method !== 'HEAD') { r.writeHead(405, GUVENLIK); return r.end(); }
    let f, d; try { d = decodeURIComponent(p); } catch (e) { r.writeHead(400, GUVENLIK); return r.end(); }
    if (p === '/mrp' || p === '/mrp/') f = 'mrp.html';
    else if (p === '/satis' || p === '/satis/') f = 'exit_satis_paneli.html';
    else if (p === '/' || SITE_ADRESI.test(d)) f = WEB + '/index.html';
    else f = WEB + '/' + d.replace(/^\/+/, '');
    const tam = path.resolve(KOK, f);
    if (!tam.startsWith(KOK + path.sep) || YASAK.some(y => tam === y || tam.startsWith(y + path.sep))) { r.writeHead(403, GUVENLIK); return r.end(); }
    statikGonder(q, r, tam, f.startsWith('web/') && /\.html$/.test(f) ? { 'Content-Security-Policy': CSP } : f === 'exit_satis_paneli.html' ? { 'Content-Security-Policy': CSP_SATIS } : {});
  } catch (e) {
    console.error(e); if (!r.headersSent) js(r, { hata: 'sunucu hatası' }, 500); else r.end();
  }
}).listen(PORT, ENV.HOST || undefined, () => {
  const ag = Object.values(os.networkInterfaces()).flat().filter(x => x && x.family === 'IPv4' && !x.internal).map(x => x.address);
  const S = kullanicilar('satis'), gecerli = Object.values(S).some(x => x && x.sifre && x.sifre !== K.VARSAYILAN_SATIS_OZETI);
  console.log('EXIT Garden sunucusu çalışıyor (sürüm ' + SURUM + ').\n  Bayi portalı : http://localhost:' + PORT + '/\n  Satış paneli : http://localhost:' + PORT + '/satis\n  MRP          : http://localhost:' + PORT + '/mrp (yerel ağ, izinli IP veya satış girişi)' + ag.map(a => '\n  Ağdan       : http://' + a + ':' + PORT + '/  ,  /satis  ve  /mrp').join('') + '\n  Veri klasörü : ' + VERI_KLASORU + ' (' + (depo.tur === 'sqlite' ? 'veri.sqlite' : 'veri.json') + ')');
  if (depo.ice) console.log(`\n  Eski veri.json içe alındı: ${depo.ice.anahtar} anahtar. Dosya "${depo.ice.dosya}" adıyla saklandı.`);
  if (!gecerli) console.log('\n  ⚠ Satış paneline giriş yapılabilecek bir hesap yok. Yönetici şifresini belirleyin:\n      node sunucu.js --yonetici-sifre YENI_SIFRE');
  if (VEKIL && !['127.0.0.1', '::1', 'localhost'].includes(ENV.HOST || '')) console.log('\n  ⚠ GUVENILIR_VEKIL=1 iken HOST=127.0.0.1 verin; aksi hâlde port doğrudan erişilirse X-Forwarded-For başlığı taklit edilebilir.');
  if (!VEKIL && ENV.HTTPS !== '1') console.log('\n  Not: Sunucu HTTP. İnternete açmadan önce önüne HTTPS (Caddy/Nginx) koyun ve GUVENILIR_VEKIL=1 verin.');
});
