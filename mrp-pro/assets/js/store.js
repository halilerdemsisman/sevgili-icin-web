/* ==========================================================================
   MRP Pro — Kalıcı durum (localStorage), numaralandırma, bildirim ve denetim kaydı
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U;
    const KEY = 'mrppro.v2.state';
    const MAX_MOVEMENTS = 3000;
    const MAX_AUDIT = 1000;
    const MAX_NOTIFS = 150;

    function defaultState() {
        const items = MRP.data.buildItemMaster();
        const today = U.today();
        return {
            version: 2,
            createdAt: new Date().toISOString(),
            itemOverrides: {},          // malzeme kartı parametre değişiklikleri
            customItems: {},            // kullanıcı tarafından eklenen malzemeler
            customProducts: [],
            customBoms: {},             // { mamulKod: [{kod, k}] }
            stock: MRP.data.buildInitialStock(items),
            movements: [],
            mps: [                      // Ana Üretim Planı (bağımsız talep)
                { id: 'MPS-1', kod: 'BG.212.A', qty: 40, dueDate: U.iso(U.addDays(today, 18)), note: 'Otel projesi' },
                { id: 'MPS-2', kod: 'BG.06.A', qty: 120, dueDate: U.iso(U.addDays(today, 14)), note: 'Bayi siparişi' },
                { id: 'MPS-3', kod: 'BG.100.A', qty: 60, dueDate: U.iso(U.addDays(today, 28)), note: 'Sezon stoğu' }
            ],
            lastRun: null,
            requests: [],
            pos: [],
            workOrders: [],
            suppliers: JSON.parse(JSON.stringify(MRP.data.SUPPLIERS)),
            notifications: [],
            audit: [],
            seq: {}
        };
    }

    let state = null;

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.version === 2) { state = Object.assign(defaultState(), parsed); return state; }
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
            localStorage.setItem(KEY, JSON.stringify(state));
        } catch (e) {
            console.error(e);
            MRP.UI.toast('Veri kaydedilemedi', 'Tarayıcı depolama alanı dolu veya engelli olabilir.', 'error', 6000);
        }
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
        load, save, nextNo, audit, notify, reset,
        get state() { return state; }
    };
})(window.MRP);
