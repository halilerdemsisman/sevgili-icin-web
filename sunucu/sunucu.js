// EXIT Garden bayi portalı ve satış paneli için ortak sunucu. Ek paket gerektirmez: node sunucu.js
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.env.PORT || 8080, KOK = path.join(__dirname, '..'), VERI = path.join(__dirname, 'veri.json'), YEDEK = path.join(__dirname, 'yedek');
let D = { zaman: 0, veri: {}, degisim: {} };
try { D = JSON.parse(fs.readFileSync(VERI, 'utf8')); } catch (e) {}
if (!fs.existsSync(YEDEK)) fs.mkdirSync(YEDEK);
let kayitZam = null; const kaydet = () => { clearTimeout(kayitZam); kayitZam = setTimeout(() => { fs.writeFileSync(VERI + '.tmp', JSON.stringify(D)); fs.renameSync(VERI + '.tmp', VERI); }, 300); };
// günlük yedek, son 30 gün
const yedekAl = () => { const g = new Date().toISOString().slice(0, 10), f = path.join(YEDEK, 'veri-' + g + '.json'); if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify(D)); fs.readdirSync(YEDEK).sort().slice(0, -30).forEach(x => fs.unlinkSync(path.join(YEDEK, x))); };
// MRP ortak verisi: anahtar bazında en yeni kayıt kazanır
const MRPV = path.join(__dirname, 'mrp_veri.json'); let M = { app: 'MRP', keys: {} };
try { M = JSON.parse(fs.readFileSync(MRPV, 'utf8')); } catch (e) {}
let mrpZam = null; const mrpKaydet = () => { clearTimeout(mrpZam); mrpZam = setTimeout(() => { fs.writeFileSync(MRPV + '.tmp', JSON.stringify(M)); fs.renameSync(MRPV + '.tmp', MRPV); }, 300); };
const mrpYedek = () => { const g = new Date().toISOString().slice(0, 10), f = path.join(YEDEK, 'mrp-' + g + '.json'); if (!fs.existsSync(f) && Object.keys(M.keys).length) fs.writeFileSync(f, JSON.stringify(M)); fs.readdirSync(YEDEK).filter(x => x.startsWith('mrp-')).sort().slice(0, -30).forEach(x => fs.unlinkSync(path.join(YEDEK, x))); };
mrpYedek(); setInterval(mrpYedek, 3600e3);
yedekAl(); setInterval(yedekAl, 3600e3);
// aynı anda yazan bayilerin kayıtları kaybolmasın: bu listeler kayıt numarasına göre birleştirilir
const BIRLESTIR = { 'exb-siparisler': 'no', 'exb-odeme': 'no', 'exb-numune': 'no', 'exb-hatirlat': 'id', 'exb-iade': 'id', 'exb-teklif': 'no' };
function birlestir(k, eski, yeni) {
  const a = BIRLESTIR[k]; if (!a || eski == null || yeni == null) return yeni;
  try { const E = JSON.parse(eski), Y = JSON.parse(yeni); if (!Array.isArray(E) || !Array.isArray(Y)) return yeni;
    const var_ = new Set(Y.map(x => x && x[a])); const R = Y.concat(E.filter(x => x && !var_.has(x[a]))); return JSON.stringify(R); } catch (e) { return yeni; }
}
const TIP = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css' };
http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x'), p = u.pathname.replace(/^\/mrp\/api\//, '/api/'); let p2 = null;
  const js = (o, c = 200) => { r.writeHead(c, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); r.end(JSON.stringify(o)); };
  if (p === '/api/mrp/durum') return js({ ok: true });
  if (p === '/api/mrp' && q.method === 'GET') return js(M);
  if (p === '/api/mrp' && q.method === 'POST') { let b = ''; q.on('data', c => { b += c; if (b.length > 200e6) q.destroy(); }); q.on('end', () => {
    try { const d = JSON.parse(b); if (d.app !== 'MRP' || !d.keys) throw 0;
      Object.entries(d.keys).forEach(([k, e]) => { if (!/^mrp-/.test(k) || !e) return; const o = M.keys[k]; if (!o || (e.ts || 0) >= (o.ts || 0)) M.keys[k] = e; });
      Object.assign(M, { surum: d.surum, updated: new Date().toISOString(), by: d.by }); mrpKaydet(); js({ ok: true }); } catch (e) { js({ hata: 'geçersiz istek' }, 400); } }); return; }
  if (p === '/mrp' || p === '/mrp/') { p2 = 'mrp.html'; }
  if (p === '/api/veri' && q.method === 'GET') return js({ zaman: D.zaman, veri: D.veri });
  if (p === '/api/degisen') { const s = +u.searchParams.get('son') || 0; return js({ zaman: D.zaman, degisen: Object.entries(D.degisim).filter(([, z]) => z > s).map(([k]) => [k, k in D.veri ? D.veri[k] : null]) }); }
  if (p === '/api/veri' && q.method === 'POST') { let b = ''; q.on('data', c => { b += c; if (b.length > 50e6) q.destroy(); }); q.on('end', () => {
    try { const { degisen } = JSON.parse(b), birlesen = []; let z = Math.max(Date.now(), D.zaman + 1);
      degisen.forEach(([k, v]) => { if (!/^ex[bs]-/.test(k)) return; if (v == null) delete D.veri[k]; else { const m = birlestir(k, D.veri[k], v); D.veri[k] = m; if (m !== v) birlesen.push([k, m]); } D.degisim[k] = z; });
      D.zaman = z; kaydet(); js({ ok: true, zaman: z, birlesen }); } catch (e) { js({ hata: 'geçersiz istek' }, 400); } }); return; }
  const f = p2 || (u.pathname === '/satis' || u.pathname === '/satis/' ? 'exit_satis_paneli.html' : 'telefon/' + (decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html'));
  const tam = path.join(KOK, f); if (!tam.startsWith(KOK) || /sunucu[\\/]/.test(f)) { r.writeHead(403); return r.end(); }
  fs.readFile(tam, (e, d) => { if (e) { r.writeHead(404); return r.end('Bulunamadı'); } r.writeHead(200, { 'Content-Type': TIP[path.extname(tam)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); r.end(d); });
}).listen(PORT, () => {
  const ag = Object.values(require('os').networkInterfaces()).flat().filter(x => x && x.family === 'IPv4' && !x.internal).map(x => x.address);
  console.log('EXIT Garden sunucusu çalışıyor.\n  Bayi portalı : http://localhost:' + PORT + '/\n  Satış paneli : http://localhost:' + PORT + '/satis\n  MRP          : http://localhost:' + PORT + '/mrp' + ag.map(a => '\n  Ağdan       : http://' + a + ':' + PORT + '/  ,  /satis  ve  /mrp').join('') + '\n  Veri dosyası : ' + VERI);
});
