/* ==========================================================================
   Örnek ERP — başlangıç verisi
   MRP Pro'nun kendi demo verisinden (assets/js/data.js) ERP koleksiyonlarını
   sözleşmedeki biçimde üretir. Gerçek ERP'de bu veriler ERP veritabanından
   gelir; biçim için integration/openapi.yaml'a bakın.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const jsDir = path.resolve(here, '../../assets/js');

/** Tarayıcı betiklerini (utils.js, data.js) Node içinde yalıtılmış çalıştırır */
function loadAppData() {
    const ctx = { window: {}, console, URLSearchParams, location: { search: '', href: 'http://localhost/', origin: 'http://localhost' } };
    vm.createContext(ctx);
    for (const f of ['utils.js', 'data.js']) vm.runInContext(fs.readFileSync(path.join(jsDir, f), 'utf8'), ctx, { filename: f });
    return ctx.window.MRP;
}

export function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
    return `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
}

/**
 * ERP'deki kullanıcılar: rol tanımları MRP Pro'nun varsayılan bölüm rolleriyle
 * aynıdır (assets/js/auth.js → DEFAULT_ROLES). approveLimit null = sınırsız.
 */
function loadRoles() {
    const ctx = { window: {}, console, URLSearchParams, location: { search: '', href: 'http://localhost/', origin: 'http://localhost' }, TextEncoder };
    vm.createContext(ctx);
    for (const f of ['utils.js', 'auth.js']) vm.runInContext(fs.readFileSync(path.join(jsDir, f), 'utf8'), ctx, { filename: f });
    return ctx.window.MRP.auth.DEFAULT_ROLES;
}

export function seedUsers() {
    const roles = Object.fromEntries(loadRoles().map((r) => [r.id, r]));
    return [
        ['admin', '1234', 'Sistem Yöneticisi', 'admin'],
        ['yonetim', 'yon123', 'Kemal Aydın', 'yonetim'],
        ['planlama', 'plan123', 'Ahmet Yılmaz', 'planlama'],
        ['uretim', 'uret123', 'Hüseyin Çelik', 'uretim'],
        ['satinalma', 'satin123', 'Zeynep Kaya', 'satinalma'],
        ['satinalma_muduru', 'mudur123', 'Murat Demir', 'satinalma_muduru'],
        ['depo', 'depo123', 'Emre Koç', 'depo'],
        ['maliyet', 'mal123', 'Elif Şahin', 'maliyet']
    ].map(([username, password, name, roleId]) => {
        const r = roles[roleId];
        const permissions = { ...r.can, approveLimit: r.approveLimit };
        delete permissions.resetData;                       // ERP modunda veri sıfırlama yok
        return { username, name, role: r.id, roleName: r.name, home: r.home, views: r.views.filter((v) => v !== 'users' || roleId === 'admin'), permissions, passwordHash: hashPassword(password) };
    });
}

/** Sözleşmedeki koleksiyonlar: { koleksiyon: { anahtar: kayıt } } */
export function seedCollections() {
    const MRP = loadAppData();
    const D = MRP.data;
    const items = D.buildItemMaster();
    const now = new Date().toISOString();
    const iso = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
    const c = {};

    c.items = items;
    c.products = Object.fromEntries(D.BASE_PRODUCTS.map((p) => [p.kod, { ...p }]));

    c.boms = {};
    D.BASE_PRODUCTS.forEach((p) => { c.boms[p.kod] = { parent: p.kod, lines: (D.BOM_TEMPLATES[p.kategori] || []).map(([kod, , , k]) => ({ kod, k })) }; });
    Object.entries(D.SUB_BOMS).forEach(([ym, lines]) => { c.boms[ym] = { parent: ym, lines: lines.map(([kod, k]) => ({ kod, k })) }; });

    c.routings = {};
    const ops = (tpl) => (tpl || []).map(([wc, setup, run]) => ({ wc, setup, run }));
    D.BASE_PRODUCTS.forEach((p) => { c.routings[p.kod] = { kod: p.kod, operations: ops(D.DEFAULT_ROUTINGS[p.kategori]) }; });
    Object.values(items).filter((i) => i.procurement === 'make').forEach((i) => { c.routings[i.kod] = { kod: i.kod, operations: ops(D.DEFAULT_ROUTINGS._YM) }; });

    c.workCenters = Object.fromEntries(D.WORK_CENTERS.map((w) => [w.id, { ...w }]));
    c.suppliers = Object.fromEntries(D.SUPPLIERS.map((s) => [s.id, { ...s }]));
    c.priceList = Object.fromEntries(D.buildPriceList(items).map((o) => [`${o.supplierId}|${o.kod}`, o]));

    c.lots = {};
    Object.entries(D.buildInitialStock(items)).filter(([, q]) => q > 0).forEach(([kod, qty], i) => {
        const id = `lot_erp_${i + 1}`;
        c.lots[id] = { id, lot: 'DEVİR', kod, loc: 'MERKEZ', qty, at: now, ref: 'ERP-DEVİR', supplier: '' };
    });

    c.demands = {
        'SIP-1001': { id: 'SIP-1001', kod: 'BG.212.A', qty: 40, dueDate: iso(18), note: 'Otel projesi (ERP satış siparişi)' },
        'SIP-1002': { id: 'SIP-1002', kod: 'BG.06.A', qty: 120, dueDate: iso(14), note: 'Bayi siparişi (ERP satış siparişi)' },
        'SIP-1003': { id: 'SIP-1003', kod: 'BG.100.A', qty: 60, dueDate: iso(28), note: 'Sezon stoğu' }
    };
    c.settings = { main: { fx: { rates: { ...D.DEFAULT_FX }, updatedAt: null, source: 'ERP', history: [] }, costing: { overheadPct: 10, includeLabor: true, stdLot: 20 } } };
    for (const k of ['movements', 'purchaseRequests', 'purchaseOrders', 'workOrders', 'subcontracts', 'notifications', 'auditLog', 'mrpRun']) c[k] = {};
    return c;
}
