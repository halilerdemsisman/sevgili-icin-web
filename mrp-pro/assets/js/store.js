/* ==========================================================================
   MRP Pro — Kalıcı durum (localStorage), sürüm geçişi, numaralandırma,
   bildirim ve denetim kaydı
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U;
    const KEY_V2 = 'mrppro.v2.state';
    const KEY = 'mrppro.v3.state';
    const VERSION = 3;
    const MAX_MOVEMENTS = 5000;
    const MAX_AUDIT = 1500;
    const MAX_NOTIFS = 150;

    /** Başlangıç stoklarını lot kayıtlarına çevirir (stok = lotların toplamı) */
    function stockToLots(stock, lotNo) {
        const at = new Date().toISOString();
        return Object.entries(stock).filter(([, q]) => q > 0)
            .map(([kod, qty], i) => ({ id: `lot_init_${i}`, lot: lotNo, kod, loc: 'MERKEZ', qty, at, ref: lotNo, supplier: '' }));
    }

    function defaultState() {
        const items = MRP.data.buildItemMaster();
        const today = U.today();
        return {
            version: VERSION,
            createdAt: new Date().toISOString(),
            itemOverrides: {},          // malzeme kartı değişiklikleri (fiyat, para birimi, LT, SS…)
            customItems: {},            // kullanıcı tarafından eklenen malzemeler
            productOverrides: {},       // mevcut ürünlerde ad / kategori / kayıtlı maliyet değişikliği
            customProducts: [],
            customBoms: {},             // { kod: [{kod, k}] }
            routings: {},               // { kod: [{wc, setup, run}] }
            lots: stockToLots(MRP.data.buildInitialStock(items), 'BAŞLANGIÇ'),
            movements: [],
            mps: [
                { id: 'MPS-3', kod: 'BG.100.A', qty: 60, dueDate: U.iso(U.addDays(today, 28)), note: 'Sezon stoğu (tahmin)' }
            ],
            salesOrders: demoSalesOrders(today),
            lastRun: null,
            requests: [],
            pos: [],
            workOrders: [],
            subcontracts: [],
            inspections: [],            // giriş kalite muayeneleri (karantina partileri)
            suppliers: JSON.parse(JSON.stringify(MRP.data.SUPPLIERS)),
            priceList: MRP.data.buildPriceList(items),
            workCenters: JSON.parse(JSON.stringify(MRP.data.WORK_CENTERS)),
            fx: { rates: { ...MRP.data.DEFAULT_FX }, updatedAt: null, source: 'Varsayılan (demo)', history: [] },
            costing: { overheadPct: 10, includeLabor: true, stdLot: 20 },
            notifications: [],
            audit: [],
            seq: { [`SS-${today.getFullYear()}`]: 2 },   // demo siparişler 0001-0002
            roles: MRP.auth.defaultRoles(),
            users: MRP.auth.defaultUsers(),
            branding: defaultBranding(),
            qcSetup: true,
            soSetup: true,
            exSetup: true
        };
    }

    /** Demo: ERP'den gelmiş gibi iki satış siparişi */
    function demoSalesOrders(today) {
        const at = new Date().toISOString();
        const d = (n) => U.iso(U.addDays(today, n));
        const Y = today.getFullYear();
        return [
            { no: `SS-${Y}-0001`, erpRef: 'ERP-SO-48211', customer: 'Kıyı Otelcilik A.Ş.', orderDate: d(-3), status: 'open', note: 'Otel projesi — teras', source: 'erp', receivedAt: at, updatedAt: at,
                lines: [{ line: 1, kod: 'BG.212.A', qty: 40, shipped: 0, dueDate: d(18) }] },
            { no: `SS-${Y}-0002`, erpRef: 'ERP-SO-48230', customer: 'Bodrum Bahçe Bayi', orderDate: d(-1), status: 'open', note: 'Bayi siparişi', source: 'erp', receivedAt: at, updatedAt: at,
                lines: [{ line: 1, kod: 'BG.06.A', qty: 120, shipped: 0, dueDate: d(14) }] }
        ];
    }

    /**
     * Kalite modülü öncesi kayıtlar için tek seferlik yükseltme: Kalite Kontrol rolü
     * ve demo kullanıcısı eklenir, yönetici rolüne yeni yetki ve ekran verilir.
     * Kullanıcının özelleştirdiği diğer rollere yalnızca (salt okunur) Kalite ekranı eklenir.
     */
    function upgrade(st) {
        if (!Array.isArray(st.inspections)) st.inspections = [];
        if (!Array.isArray(st.salesOrders)) st.salesOrders = [];
        if (MRP.config.erp) return st;
        upgradeQC(st);
        upgradeSales(st);
        upgradeExpedite(st);
        dropShopfloor(st);
        return st;
    }
    /** Satış siparişleri ekranı mevcut rollere eklenir */
    function upgradeSales(st) {
        if (st.soSetup) return;
        (st.roles || []).forEach((r) => {
            if (['admin', 'yonetim', 'planlama', 'uretim'].includes(r.id) && !r.views.includes('sales')) r.views.splice(Math.max(0, r.views.indexOf('mrp')), 0, 'sales');
        });
        st.soSetup = true;
    }
    /** Teslim takibi ekranı mevcut rollere eklenir */
    function upgradeExpedite(st) {
        if (st.exSetup) return;
        (st.roles || []).forEach((r) => {
            if (['admin', 'yonetim', 'planlama', 'satinalma', 'satinalma_muduru', 'depo'].includes(r.id) && !r.views.includes('expedite')) r.views.push('expedite');
        });
        st.exSetup = true;
    }
    /** Kaldırılan atölye takibinden kalan rol/ekran/yetki izleri temizlenir */
    function dropShopfloor(st) {
        if (!st.sfSetup) return;
        st.roles = (st.roles || []).filter((r) => r.id !== 'operator');
        st.roles.forEach((r) => { r.views = r.views.filter((v) => v !== 'shopfloor'); if (r.can) delete r.can.reportProduction; });
        st.users = (st.users || []).filter((u) => u.role !== 'operator');
        delete st.sfSetup;
    }
    function upgradeQC(st) {
        if (st.qcSetup) return;
        const defs = MRP.auth.defaultRoles();
        const roles = st.roles || (st.roles = []);
        const admin = roles.find((r) => r.id === 'admin');
        if (admin) { admin.can = { ...admin.can, inspectQuality: true }; if (!admin.views.includes('quality')) admin.views.push('quality'); }
        ['yonetim', 'satinalma', 'satinalma_muduru', 'depo'].forEach((id) => { const r = roles.find((x) => x.id === id); if (r && !r.views.includes('quality')) r.views.push('quality'); });
        if (!roles.some((r) => r.id === 'kalite')) roles.push(defs.find((r) => r.id === 'kalite'));
        const users = st.users || (st.users = []);
        if (!users.some((u) => u.username === 'kalite')) users.push(MRP.auth.defaultUsers().find((u) => u.username === 'kalite'));
        st.qcSetup = true;
    }

    /** Firma adı ve logolar (Kullanıcılar & Roller → Firma Ayarları) */
    function defaultBranding() { return { company: '', logos: [] }; }

    /** v2 → v3: sayısal stok → lot kaydı, yeni alanlar varsayılanlarla eklenir */
    function migrateV2(old) {
        const fresh = defaultState();
        const st = Object.assign(fresh, old, { version: VERSION, salesOrders: old.salesOrders || [] });
        st.lots = stockToLots(old.stock || {}, 'DEVİR');
        delete st.stock;
        st.movements = (old.movements || []).map((m) => ({ loc: 'MERKEZ', lots: [], ...m }));
        // v2'de tüm fiyatlar TL idi; elle değiştirilmiş fiyatlar TL olarak korunur
        Object.values(st.itemOverrides || {}).forEach((o) => { if (o.price != null && !o.currency) o.currency = 'TRY'; });
        st.pos = (old.pos || []).map((p) => ({ ...p, lines: p.lines.map((l) => ({ currency: 'TRY', fxRate: 1, ...l })) }));
        return st;
    }

    /** ERP modu için boş durum: ana veri ve işlemler ERP'den yüklenir */
    function emptyState() {
        return {
            version: VERSION, createdAt: new Date().toISOString(),
            itemOverrides: {}, customItems: {}, productOverrides: {}, customProducts: [], customBoms: {}, routings: {},
            lots: [], movements: [], mps: [], lastRun: null, requests: [], pos: [], workOrders: [], subcontracts: [], inspections: [], salesOrders: [],
            suppliers: [], priceList: [], workCenters: [],
            fx: { rates: { ...MRP.data.DEFAULT_FX }, updatedAt: null, source: 'ERP', history: [] },
            costing: { overheadPct: 10, includeLabor: true, stdLot: 20 },
            notifications: [], audit: [], seq: {}, seqBlocks: {},
            roles: [], users: [], branding: defaultBranding()
        };
    }

    let state = null;

    function load() {
        if (MRP.config.erp) { state = emptyState(); return state; }
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.version === VERSION) {
                    const fresh = defaultState();
                    delete fresh.qcSetup; delete fresh.soSetup; delete fresh.exSetup; delete fresh.salesOrders;   // eski kayıtta yoksa yükseltme çalışsın; demo sipariş eklenmez
                    state = upgrade(Object.assign(fresh, parsed));
                    return state;
                }
            }
            const rawV2 = localStorage.getItem(KEY_V2);
            if (rawV2) {
                const parsed = JSON.parse(rawV2);
                if (parsed && parsed.version === 2) {
                    state = migrateV2(parsed);
                    delete state.qcSetup; delete state.soSetup; delete state.exSetup;
                    upgrade(state);
                    save();
                    localStorage.removeItem(KEY_V2);
                    return state;
                }
            }
        } catch (e) { console.warn('Durum okunamadı, varsayılan veriler kullanılıyor.', e); }
        state = defaultState();
        save();
        return state;
    }

    /** Giriş ekranı (oturum açmadan) için marka bilgisinin ayrı kopyası */
    function mirrorBranding() {
        try { localStorage.setItem('mrppro.branding', JSON.stringify(state.branding || defaultBranding())); } catch (e) { /* kota */ }
    }

    function save() {
        mirrorBranding();
        if (MRP.config.erp) {
            // ERP modunda geçmiş kırpılmaz (silme olarak senkronlanırdı); kalıcılık ve gönderim backend'de
            if (state.notifications.length > MAX_NOTIFS) state.notifications = state.notifications.slice(0, MAX_NOTIFS);
            MRP.backend.scheduleSync();
            return;
        }
        try {
            if (state.movements.length > MAX_MOVEMENTS) state.movements = state.movements.slice(-MAX_MOVEMENTS);
            if (state.audit.length > MAX_AUDIT) state.audit = state.audit.slice(-MAX_AUDIT);
            if (state.notifications.length > MAX_NOTIFS) state.notifications = state.notifications.slice(0, MAX_NOTIFS);
            if (state.fx.history.length > 200) state.fx.history = state.fx.history.slice(-200);
            localStorage.setItem(KEY, JSON.stringify(state));
        } catch (e) {
            console.error(e);
            MRP.UI.toast('Veri kaydedilemedi', 'Tarayıcı depolama alanı dolu veya engelli olabilir.', 'error', 6000);
        }
    }

    /** Yedekten geri yükleme (v2 veya v3 JSON) */
    function restore(obj) {
        if (!obj || (obj.version !== VERSION && obj.version !== 2)) throw new Error('Tanınmayan yedek dosyası');
        const fresh = defaultState();
        delete fresh.qcSetup; delete fresh.soSetup; delete fresh.exSetup; delete fresh.salesOrders;
        state = upgrade(obj.version === 2 ? migrateV2(obj) : Object.assign(fresh, obj));
        save();
    }

    /** Belge numarası: PREFIX-YIL-0001 (silmeye/yeniden saymaya dayanıklı sıra) */
    function nextNo(prefix) {
        const year = new Date().getFullYear();
        const key = `${prefix}-${year}`;
        if (MRP.config.erp) {
            // ERP'nin ayırdığı numara bloğundan; blok bitmek üzereyse arka planda yenisi istenir
            state.seqBlocks = state.seqBlocks || {};
            const b = state.seqBlocks[key];
            if (b && b.next <= b.end) {
                const n = b.next++;
                if (b.end - b.next < 10) MRP.backend.ensureSequences([prefix]).catch(() => {});
                return `${key}-${String(n).padStart(4, '0')}`;
            }
            MRP.backend.ensureSequences([prefix]).catch(() => {});
            // Çevrimdışı geçici numara: istemciye özgü, ERP tarafında yeniden numaralandırılabilir
            state.seq[key + '-T'] = (state.seq[key + '-T'] || 0) + 1;
            return `${key}-T${Date.now().toString(36).slice(-4).toUpperCase()}${state.seq[key + '-T']}`;
        }
        state.seq[key] = (state.seq[key] || 0) + 1;
        return `${key}-${String(state.seq[key]).padStart(4, '0')}`;
    }

    function audit(action, detail) {
        const u = MRP.auth.current();
        state.audit.push({ id: U.uid('aud'), at: new Date().toISOString(), user: u ? u.name : 'sistem', username: u ? u.username : '', role: u ? u.roleName : '', action, detail });
    }

    function notify(type, title, message, roles, link) {
        state.notifications.unshift({
            id: U.uid('n'), type, title, message, roles: roles || ['admin'], link: link || null,
            readBy: [], at: new Date().toISOString()
        });
    }

    /** Demo verisini sıfırlar; kullanıcılar, roller ve firma ayarları korunur */
    function reset() {
        const keep = state ? { roles: state.roles, users: state.users, branding: state.branding } : {};
        localStorage.removeItem(KEY);
        state = Object.assign(defaultState(), keep);
        save();
    }

    function setState(s) { state = s; }
    function storedBranding() {
        try { return JSON.parse(localStorage.getItem('mrppro.branding') || 'null') || defaultBranding(); } catch (e) { return defaultBranding(); }
    }

    MRP.store = {
        load, save, nextNo, audit, notify, reset, restore, emptyState, setState, storedBranding, defaultBranding,
        get state() { return state; }
    };
})(window.MRP);
