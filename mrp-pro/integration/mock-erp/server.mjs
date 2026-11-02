#!/usr/bin/env node
/* ==========================================================================
   Örnek ERP sunucusu — MRP Pro entegrasyon sözleşmesinin referans uygulaması
   --------------------------------------------------------------------------
   Amaç: Kendi ERP'nizin MRP Pro'ya sunması gereken uç noktaları çalışan bir
   örnekle göstermek ve entegrasyonu uçtan uca test etmek. Üretim için değil:
   veriyi tek bir JSON dosyasında tutar.

   Çalıştırma (Node.js 18+, bağımlılık yok):
       node mrp-pro/integration/mock-erp/server.mjs            # http://localhost:8787
       PORT=9000 node mrp-pro/integration/mock-erp/server.mjs
       RESET=1 node mrp-pro/integration/mock-erp/server.mjs    # veriyi sıfırla

   Açılan adresler:
       /mrp-pro/index.html?mode=erp              MRP Pro (ERP modunda)
       /mrp-pro/integration/host-demo.html       Örnek ERP portalı (MRP Pro gömülü)
       /api/...                                  Entegrasyon API'si (openapi.yaml)
   ========================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { seedCollections, seedUsers } from './seed.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const STATIC_ROOT = path.resolve(here, '../../..');            // depo kökü
const DATA_FILE = process.env.DATA_FILE || path.join(here, 'data', 'db.json');
const PORT = Number(process.env.PORT || 8787);
const TOKEN_TTL_MS = 8 * 3600 * 1000;
const MAX_LOG = 20000;
const API_VERSION = '1.0';

// ---------------------------------------------------------------------------
// Koleksiyon tanımları: anahtar alanı ve yazma yetkisi (any-of)
// ---------------------------------------------------------------------------
const COLLECTIONS = {
    items:            { key: (r) => r.kod,                     perms: ['editItem', 'editCost', 'editProduct'] },
    products:         { key: (r) => r.kod,                     perms: ['editProduct', 'editCost'] },
    boms:             { key: (r) => r.parent,                  perms: ['editProduct'] },
    routings:         { key: (r) => r.kod,                     perms: ['manageCapacity'] },
    workCenters:      { key: (r) => r.id,                      perms: ['manageCapacity', 'editCost'] },
    suppliers:        { key: (r) => r.id,                      perms: ['manageSuppliers'] },
    priceList:        { key: (r) => `${r.supplierId}|${r.kod}`, perms: ['manageSuppliers', 'editCost'] },
    lots:             { key: (r) => r.id,                      perms: ['adjustStock', 'receiveGoods', 'manageWO', 'transferStock'] },
    movements:        { key: (r) => r.id,                      perms: ['adjustStock', 'receiveGoods', 'manageWO', 'transferStock'], appendOnly: true },
    demands:          { key: (r) => r.id,                      perms: ['runMRP'] },
    purchaseRequests: { key: (r) => r.no,                      perms: ['createRequest', 'approveRequest', 'createPO', 'receiveGoods'] },
    purchaseOrders:   { key: (r) => r.no,                      perms: ['createPO', 'receiveGoods'] },
    workOrders:       { key: (r) => r.no,                      perms: ['manageWO', 'runMRP'] },
    subcontracts:     { key: (r) => r.no,                      perms: ['transferStock'] },
    notifications:    { key: (r) => r.id,                      perms: ['*'] },
    auditLog:         { key: (r) => r.id,                      perms: ['*'], appendOnly: true },
    settings:         { key: () => 'main',                     perms: ['editCost', 'manageUsers'] },
    mrpRun:           { key: () => 'last',                     perms: ['runMRP', 'createRequest', 'manageWO'] }
};

/**
 * ERP iş kuralları — reddedilen değişiklik istemciye gerekçe ve ERP'deki
 * güncel kayıtla döner, istemci kendi kopyasını düzeltir.
 * Kendi ERP'nizde muhasebe, onay, stok kuralları burada uygulanır.
 */
function validate(collection, op, key, data, user, db) {
    const def = COLLECTIONS[collection];
    if (!def) return 'Bilinmeyen koleksiyon';
    const p = user.permissions || {};
    if (!def.perms.includes('*') && !def.perms.some((x) => p[x])) return 'Bu işlem için yetkiniz yok';
    if (op === 'delete') {
        if (def.appendOnly) return 'Bu kayıtlar silinemez (değişmez kayıt)';
        if (collection === 'purchaseOrders' && db.collections.purchaseOrders[key]?.receipts?.length) return 'Teslimatı olan sipariş silinemez';
        return null;
    }
    if (op !== 'upsert' || !data || typeof data !== 'object') return 'Geçersiz işlem';
    if (String(def.key(data)) !== String(key)) return 'Kayıt anahtarı uyuşmuyor';
    if (def.appendOnly && db.collections[collection][key] && JSON.stringify(db.collections[collection][key]) !== JSON.stringify(data)) return 'Değişmez kayıt güncellenemez';
    switch (collection) {
        case 'lots': if (!(data.qty >= 0)) return 'Lot miktarı negatif olamaz'; break;
        case 'purchaseOrders':
            if (!Array.isArray(data.lines) || !data.lines.length) return 'Siparişte kalem yok';
            if (data.lines.some((l) => !(l.qty > 0) || !(l.price >= 0))) return 'Sipariş kaleminde geçersiz miktar/fiyat';
            break;
        case 'purchaseRequests':
            if (data.status === 'approved' && p.approveLimit != null && data.total > p.approveLimit && db.collections.purchaseRequests[key]?.status !== 'approved') return `Onay limitiniz (${p.approveLimit} ₺) aşıldı`;
            break;
        case 'items': if (data.price != null && !(data.price >= 0)) return 'Fiyat negatif olamaz'; break;
        case 'demands': if (!(data.qty > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate || '')) return 'Talep miktarı/termini geçersiz'; break;
        default: break;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Veri deposu (JSON dosyası)
// ---------------------------------------------------------------------------
let db;
function loadDb() {
    if (!process.env.RESET && fs.existsSync(DATA_FILE)) {
        db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        return;
    }
    db = { version: API_VERSION, cursor: 0, minCursor: 0, log: [], sequences: {}, users: seedUsers(), collections: seedCollections() };
    saveDbNow();
    console.log('Başlangıç verisi oluşturuldu:', DATA_FILE);
}
let saveTimer = null;
function saveDb() { clearTimeout(saveTimer); saveTimer = setTimeout(saveDbNow, 250); }
function saveDbNow() {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(db));
    fs.renameSync(DATA_FILE + '.tmp', DATA_FILE);
}

/** Değişikliği uygular ve değişiklik günlüğüne yazar (diğer istemciler /changes ile alır) */
function applyChange({ collection, op, key, data }, clientId, username) {
    const coll = db.collections[collection];
    if (op === 'delete') delete coll[key]; else coll[key] = data;
    db.cursor += 1;
    db.log.push({ cursor: db.cursor, collection, op, key, data: op === 'delete' ? null : data, clientId, user: username, at: new Date().toISOString() });
    if (db.log.length > MAX_LOG) { db.log.splice(0, db.log.length - MAX_LOG); db.minCursor = db.log[0].cursor - 1; }
}

// ---------------------------------------------------------------------------
// Oturum
// ---------------------------------------------------------------------------
const tokens = new Map();      // token → { username, exp }
function verifyPassword(pw, stored) {
    const [salt, hash] = stored.split(':');
    const test = crypto.scryptSync(pw, salt, 32);
    return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}
function publicUser(u) { const { passwordHash, ...rest } = u; return rest; }
function authUser(req) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    const t = m && tokens.get(m[1]);
    if (!t || t.exp < Date.now()) return null;
    t.exp = Date.now() + TOKEN_TTL_MS;              // kayan süre
    return db.users.find((u) => u.username === t.username) || null;
}

// ---------------------------------------------------------------------------
// HTTP yardımcıları
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
function send(res, status, body, req) {
    const origin = req && req.headers.origin;
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
    if (origin && ALLOWED_ORIGINS.includes(origin)) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
    res.writeHead(status, headers);
    res.end(status === 204 ? '' : JSON.stringify(body));
}
const err = (res, status, message, req, extra = {}) => send(res, status, { error: message, message, ...extra }, req);
function readBody(req, limit = 20 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let size = 0; const chunks = [];
        req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('Gövde çok büyük')); req.destroy(); } else chunks.push(c); });
        req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(new Error('Geçersiz JSON')); } });
        req.on('error', reject);
    });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.yaml': 'text/yaml; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.sql': 'text/plain; charset=utf-8' };
function serveStatic(req, res, pathname) {
    if (pathname === '/') { res.writeHead(302, { Location: '/mrp-pro/integration/host-demo.html' }); return res.end(); }
    const file = path.resolve(STATIC_ROOT, '.' + decodeURIComponent(pathname));
    const rel = path.relative(STATIC_ROOT, file);
    if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some((s) => s.startsWith('.')) || rel.includes(`mock-erp${path.sep}data`)) { res.writeHead(404); return res.end('Bulunamadı'); }
    fs.stat(file, (e, st) => {
        if (e || !st.isFile()) { res.writeHead(404); return res.end('Bulunamadı'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        fs.createReadStream(file).pipe(res);
    });
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
async function handleApi(req, res, url) {
    const route = `${req.method} ${url.pathname.replace(/^\/api/, '')}`;
    if (req.method === 'OPTIONS') { send(res, 204, null, req); return; }
    if (route === 'GET /health') return send(res, 200, { ok: true, version: API_VERSION, cursor: db.cursor }, req);

    if (route === 'POST /auth/login') {
        const { username, password } = await readBody(req);
        const u = db.users.find((x) => x.username === username);
        if (!u || !password || !verifyPassword(String(password), u.passwordHash)) return err(res, 401, 'Kullanıcı adı veya şifre hatalı', req);
        const token = crypto.randomBytes(24).toString('base64url');
        tokens.set(token, { username: u.username, exp: Date.now() + TOKEN_TTL_MS });
        return send(res, 200, { token, expiresIn: TOKEN_TTL_MS / 1000, user: publicUser(u) }, req);
    }

    const user = authUser(req);
    if (!user) return err(res, 401, 'Oturum gerekli', req);
    const clientId = String(req.headers['x-client-id'] || 'unknown').slice(0, 80);

    switch (route) {
        case 'GET /auth/me': return send(res, 200, publicUser(user), req);
        case 'POST /auth/logout': {
            const t = /^Bearer (.+)$/.exec(req.headers.authorization || '')[1];
            tokens.delete(t);
            return send(res, 204, null, req);
        }
        case 'GET /mrp/snapshot': {
            const collections = {};
            Object.keys(COLLECTIONS).forEach((k) => { collections[k] = Object.values(db.collections[k] || {}); });
            return send(res, 200, { version: API_VERSION, cursor: db.cursor, serverTime: new Date().toISOString(), collections }, req);
        }
        case 'GET /mrp/changes': {
            const since = Number(url.searchParams.get('since') || 0);
            if (since < db.minCursor) return err(res, 410, 'Değişiklik günlüğü bu imleçten eski; tam yükleme gerekli', req);
            const changes = db.log.filter((c) => c.cursor > since && c.clientId !== clientId)
                .map(({ cursor, collection, op, key, data, user: by, at }) => ({ cursor, collection, op, key, data, user: by, at }));
            return send(res, 200, { cursor: db.cursor, changes }, req);
        }
        case 'POST /mrp/sync': {
            const body = await readBody(req);
            const changes = Array.isArray(body.changes) ? body.changes : [];
            const rejected = [];
            let applied = 0;
            for (const ch of changes) {
                const reason = validate(ch.collection, ch.op, String(ch.key), ch.data, user, db);
                if (reason) {
                    rejected.push({ collection: ch.collection, key: ch.key, reason, current: db.collections[ch.collection]?.[ch.key] ?? null });
                    continue;
                }
                applyChange({ ...ch, key: String(ch.key) }, clientId, user.username);
                applied++;
            }
            saveDb();
            return send(res, 200, { applied, rejected, cursor: db.cursor }, req);
        }
        case 'POST /mrp/sequences': {
            const { prefixes = [], year = new Date().getFullYear(), count = 50 } = await readBody(req);
            const blocks = {};
            prefixes.filter((p) => /^[A-Z]{1,8}$/.test(p)).forEach((p) => {
                const key = `${p}-${Number(year)}`;
                const from = (db.sequences[key] || 0) + 1;
                db.sequences[key] = from + Math.min(500, Math.max(1, count)) - 1;
                blocks[key] = { from, to: db.sequences[key] };
            });
            saveDb();
            return send(res, 200, { blocks }, req);
        }

        // ---- ERP tarafı örnek işlemler: ERP'de oluşan kaydın MRP'ye akışını gösterir ----
        case 'POST /erp/sales-orders': {
            if (!user.permissions.runMRP && user.role !== 'admin') return err(res, 403, 'Yetki yok', req);
            const b = await readBody(req);
            if (!db.collections.products[b.kod]) return err(res, 422, `Tanımsız mamul: ${b.kod}`, req);
            const id = `SIP-${1000 + db.cursor + 1}`;
            const rec = { id, kod: b.kod, qty: Math.max(1, Math.round(Number(b.qty) || 1)), dueDate: b.dueDate, note: b.note || `ERP satış siparişi (${b.customer || 'müşteri'})` };
            const reason = validate('demands', 'upsert', id, rec, { permissions: { runMRP: true } }, db);
            if (reason) return err(res, 422, reason, req);
            applyChange({ collection: 'demands', op: 'upsert', key: id, data: rec }, 'erp', user.username);
            saveDb();
            return send(res, 201, rec, req);
        }
        default: break;
    }
    const itemMatch = /^PATCH \/erp\/items\/(.+)$/.exec(route);
    if (itemMatch) {
        const kod = decodeURIComponent(itemMatch[1]);
        const cur = db.collections.items[kod];
        if (!cur) return err(res, 404, 'Malzeme bulunamadı', req);
        const b = await readBody(req);
        const next = { ...cur };
        for (const f of ['price', 'currency', 'leadTime', 'safetyStock', 'ad']) if (b[f] !== undefined) next[f] = b[f];
        applyChange({ collection: 'items', op: 'upsert', key: kod, data: next }, 'erp', user.username);
        saveDb();
        return send(res, 200, next, req);
    }
    return err(res, 404, 'Uç nokta bulunamadı', req);
}

loadDb();
http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    try {
        if (url.pathname.startsWith('/api/') || url.pathname === '/api') await handleApi(req, res, url);
        else serveStatic(req, res, url.pathname);
    } catch (e) {
        console.error(e);
        if (!res.headersSent) err(res, 400, e.message, req);
    }
}).listen(PORT, () => {
    console.log(`Örnek ERP: http://localhost:${PORT}`);
    console.log(`  MRP Pro (ERP modu) : http://localhost:${PORT}/mrp-pro/index.html?mode=erp`);
    console.log(`  Örnek ERP portalı  : http://localhost:${PORT}/mrp-pro/integration/host-demo.html`);
});
