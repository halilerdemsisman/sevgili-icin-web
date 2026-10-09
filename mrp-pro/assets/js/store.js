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
                { id: 'MPS-1', kod: 'BG.212.A', qty: 40, dueDate: U.iso(U.addDays(today, 18)), note: 'Otel projesi' },
                { id: 'MPS-2', kod: 'BG.06.A', qty: 120, dueDate: U.iso(U.addDays(today, 14)), note: 'Bayi siparişi' },
                { id: 'MPS-3', kod: 'BG.100.A', qty: 60, dueDate: U.iso(U.addDays(today, 28)), note: 'Sezon stoğu' }
            ],
            lastRun: null,
            requests: [],
            pos: [],
            workOrders: [],
            subcontracts: [],
            suppliers: JSON.parse(JSON.stringify(MRP.data.SUPPLIERS)),
            priceList: MRP.data.buildPriceList(items),
            workCenters: JSON.parse(JSON.stringify(MRP.data.WORK_CENTERS)),
            fx: { rates: { ...MRP.data.DEFAULT_FX }, updatedAt: null, source: 'Varsayılan (demo)', history: [] },
            costing: { overheadPct: 10, includeLabor: true, stdLot: 20 },
            notifications: [],
            audit: [],
            seq: {}
        };
    }

    /** v2 → v3: sayısal stok → lot kaydı, yeni alanlar varsayılanlarla eklenir */
    function migrateV2(old) {
        const fresh = defaultState();
        const st = Object.assign(fresh, old, { version: VERSION });
        st.lots = stockToLots(old.stock || {}, 'DEVİR');
        delete st.stock;
        st.movements = (old.movements || []).map((m) => ({ loc: 'MERKEZ', lots: [], ...m }));
        // v2'de tüm fiyatlar TL idi; elle değiştirilmiş fiyatlar TL olarak korunur
        Object.values(st.itemOverrides || {}).forEach((o) => { if (o.price != null && !o.currency) o.currency = 'TRY'; });
        st.pos = (old.pos || []).map((p) => ({ ...p, lines: p.lines.map((l) => ({ currency: 'TRY', fxRate: 1, ...l })) }));
        return st;
    }

    let state = null;

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.version === VERSION) { state = Object.assign(defaultState(), parsed); return state; }
            }
            const rawV2 = localStorage.getItem(KEY_V2);
            if (rawV2) {
                const parsed = JSON.parse(rawV2);
                if (parsed && parsed.version === 2) {
                    state = migrateV2(parsed);
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

    function save() {
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
        state = obj.version === 2 ? migrateV2(obj) : Object.assign(defaultState(), obj);
        save();
    }

    /** Belge numarası: PREFIX-YIL-0001 (silmeye/yeniden saymaya dayanıklı sıra) */
    function nextNo(prefix) {
        const year = new Date().getFullYear();
        const key = `${prefix}-${year}`;
        state.seq[key] = (state.seq[key] || 0) + 1;
        return `${key}-${String(state.seq[key]).padStart(4, '0')}`;
    }

    function audit(action, detail) {
        const u = MRP.auth.current();
        state.audit.push({ at: new Date().toISOString(), user: u ? u.name : 'sistem', role: u ? u.roleName : '', action, detail });
    }

    function notify(type, title, message, roles, link) {
        state.notifications.unshift({
            id: U.uid('n'), type, title, message, roles: roles || ['admin'], link: link || null,
            readBy: [], at: new Date().toISOString()
        });
    }

    function reset() {
        localStorage.removeItem(KEY);
        state = defaultState();
        save();
    }

    MRP.store = {
        load, save, nextNo, audit, notify, reset, restore,
        get state() { return state; }
    };
})(window.MRP);
