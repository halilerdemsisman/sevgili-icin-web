/* ==========================================================================
   MRP Pro — ERP bağlantı katmanı (yalnızca mode: 'erp')
   --------------------------------------------------------------------------
   Sözleşme: mrp-pro/integration/openapi.yaml

   • Oturum   : POST /auth/login, GET /auth/me, POST /auth/logout (Bearer token)
   • İlk yükleme: GET /mrp/snapshot → tüm koleksiyonlar + değişiklik imleci
   • Gönderme : POST /mrp/sync  → yerel değişiklik seti (upsert/delete)
   • Çekme    : GET  /mrp/changes?since=<imleç> → başka istemcilerin/ERP'nin değişiklikleri
   • Numaralar: POST /mrp/sequences → belge numarası blokları (PO, İE, …)

   Değişiklik tespiti, her kaydın ERP'ye en son gönderilen JSON'u ("gölge")
   ile karşılaştırılarak yapılır; gönderilemeyen değişiklik kaybolmaz, bağlantı
   gelince otomatik gönderilir. Uygulama durumu çevrimdışı dayanıklılık için
   tarayıcıda önbelleklenir (oturum kapatılınca silinir).
   ========================================================================== */
(function (MRP) {
    'use strict';
    const C = MRP.config;
    const U = MRP.U;
    const S = () => MRP.store.state;

    const TOKEN_KEY = 'mrppro.erp.token';
    const CLIENT_KEY = 'mrppro.erp.client';
    const CACHE_KEY = 'mrppro.erp.cache.' + C.apiBase;
    const SEQ_PREFIXES = ['STT', 'PO', 'IE', 'HRK', 'LOT', 'MPS', 'FSV', 'TED', 'GKK'];
    const SEQ_BLOCK = 50;

    // ======================================================================
    // Koleksiyon sözleşmesi: ERP koleksiyonu ↔ uygulama durumu
    // ======================================================================
    const COLLECTIONS = {
        items:            { kind: 'map', path: 'customItems' },                       // anahtar: kod
        products:         { kind: 'array', path: 'customProducts', key: 'kod' },
        boms:             { kind: 'raw', path: 'customBoms', keyName: 'parent', field: 'lines' },
        routings:         { kind: 'raw', path: 'routings', keyName: 'kod', field: 'operations' },
        workCenters:      { kind: 'array', path: 'workCenters', key: 'id' },
        suppliers:        { kind: 'array', path: 'suppliers', key: 'id' },
        priceList:        { kind: 'array', path: 'priceList', keyFn: (r) => `${r.supplierId}|${r.kod}` },
        lots:             { kind: 'array', path: 'lots', key: 'id' },
        movements:        { kind: 'array', path: 'movements', key: 'id' },
        demands:          { kind: 'array', path: 'mps', key: 'id' },
        purchaseRequests: { kind: 'array', path: 'requests', key: 'no' },
        purchaseOrders:   { kind: 'array', path: 'pos', key: 'no' },
        workOrders:       { kind: 'array', path: 'workOrders', key: 'no' },
        subcontracts:     { kind: 'array', path: 'subcontracts', key: 'no' },
        inspections:      { kind: 'array', path: 'inspections', key: 'no' },
        notifications:    { kind: 'array', path: 'notifications', key: 'id' },
        auditLog:         { kind: 'array', path: 'audit', key: 'id' },
        settings:         { kind: 'settings' },                                       // anahtar: 'main'
        mrpRun:           { kind: 'single', path: 'lastRun', keyVal: 'last' }
    };

    const keyOf = (def, r) => (def.keyFn ? def.keyFn(r) : r[def.key]);

    /** Uygulama durumundan { koleksiyon: Map(anahtar → kayıt) } üretir */
    function records(st) {
        const out = {};
        Object.entries(COLLECTIONS).forEach(([name, def]) => {
            const m = new Map();
            if (def.kind === 'array') (st[def.path] || []).forEach((r) => m.set(String(keyOf(def, r)), r));
            else if (def.kind === 'map') Object.entries(st[def.path] || {}).forEach(([k, r]) => m.set(k, r));
            else if (def.kind === 'raw') Object.entries(st[def.path] || {}).forEach(([k, v]) => m.set(k, { [def.keyName]: k, [def.field]: v }));
            else if (def.kind === 'settings') m.set('main', { fx: st.fx, costing: st.costing, branding: st.branding });
            else if (def.kind === 'single' && st[def.path]) m.set(def.keyVal, st[def.path]);
            out[name] = m;
        });
        return out;
    }

    /** Tek bir kaydı uygulama durumuna yazar (data null → siler) */
    function applyRecord(st, name, key, data) {
        const def = COLLECTIONS[name];
        if (!def) return;
        if (def.kind === 'array') {
            const arr = st[def.path] = st[def.path] || [];
            const i = arr.findIndex((r) => String(keyOf(def, r)) === key);
            if (data == null) { if (i >= 0) arr.splice(i, 1); } else if (i >= 0) arr[i] = data; else arr.push(data);
        } else if (def.kind === 'map') {
            const o = st[def.path] = st[def.path] || {};
            if (data == null) delete o[key]; else o[key] = data;
        } else if (def.kind === 'raw') {
            const o = st[def.path] = st[def.path] || {};
            if (data == null) delete o[key]; else o[key] = data[def.field] || [];
        } else if (def.kind === 'settings') {
            if (data && data.fx) st.fx = { history: [], ...data.fx };
            if (data && data.costing) st.costing = data.costing;
            if (data && data.branding) st.branding = data.branding;
        } else if (def.kind === 'single') {
            st[def.path] = data || null;
        }
    }

    // ======================================================================
    // Durum
    // ======================================================================
    let token = null;
    let user = null;
    let cursor = 0;
    let shadow = {};           // { koleksiyon: Map(anahtar → JSON) }
    let clientId = null;
    let syncing = null;
    let syncTimer = null;
    let pollTimer = null;
    let retryDelay = 5000;
    let cacheTimer = null;
    const status = { state: 'idle', pending: 0, lastSync: null, error: null };
    const listeners = new Set();

    function setStatus(patch) {
        Object.assign(status, patch);
        listeners.forEach((fn) => { try { fn({ ...status }); } catch (e) { /* yoksay */ } });
    }

    class ApiError extends Error {
        constructor(status, message, body) { super(message); this.status = status; this.body = body; }
    }

    function getClientId() {
        try {
            let id = localStorage.getItem(CLIENT_KEY);
            if (!id) { id = 'web-' + U.uid('c').slice(2); localStorage.setItem(CLIENT_KEY, id); }
            return id;
        } catch (e) { return 'web-' + U.uid('c').slice(2); }
    }

    async function api(method, path, body) {
        let res;
        try {
            res = await fetch(C.apiBase + path, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Id': clientId,
                    'X-Client-Name': C.clientName,
                    ...(token ? { Authorization: 'Bearer ' + token } : {})
                },
                body: body !== undefined ? JSON.stringify(body) : undefined
            });
        } catch (e) {
            throw new ApiError(0, 'ERP sunucusuna ulaşılamıyor');
        }
        let data = null;
        if (res.status !== 204) { try { data = await res.json(); } catch (e) { data = null; } }
        if (res.status === 401 && path !== '/auth/login') onAuthExpired();
        if (!res.ok) throw new ApiError(res.status, (data && (data.message || data.error)) || res.statusText, data);
        return data;
    }

    function onAuthExpired() {
        token = null;
        try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* yoksay */ }
        stopPolling();
        setStatus({ state: 'auth', error: 'Oturum süresi doldu' });
        if (MRP.embed) MRP.embed.emit('auth-expired', {});
        if (!C.embed) MRP.UI.toast('Oturum süresi doldu', 'Lütfen yeniden giriş yapın; bekleyen değişiklikler saklanıyor.', 'warn', 8000);
    }

    /** ERP kullanıcı nesnesini uygulamanın beklediği biçime getirir */
    function normalizeUser(u) {
        const can = { ...(u.permissions || u.can || {}) };
        if (can.approveLimit == null) can.approveLimit = can.approveRequest ? Infinity : 0;
        return {
            username: u.username, name: u.name || u.username, role: u.role || 'user', roleName: u.roleName || u.role || '',
            avatar: u.avatar || (u.name || u.username).split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase(),
            views: u.views || [], home: u.home || (u.views || [])[0], can
        };
    }

    // ======================================================================
    // Oturum
    // ======================================================================
    async function login(username, password) {
        const r = await api('POST', '/auth/login', { username, password, client: C.clientName });
        token = r.token;
        try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) { /* yoksay */ }
        user = normalizeUser(r.user);
        return user;
    }

    /** Kayıtlı veya üst uygulamanın verdiği token ile oturumu doğrular */
    async function restoreSession() {
        clientId = clientId || getClientId();
        if (!token) { try { token = sessionStorage.getItem(TOKEN_KEY) || C.token; } catch (e) { token = C.token; } }
        if (!token) return null;
        try {
            user = normalizeUser(await api('GET', '/auth/me'));
            try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) { /* yoksay */ }
            return user;
        } catch (e) {
            if (e.status === 401) return null;
            throw e;
        }
    }

    function setToken(t) { token = t || null; }

    async function logout() {
        try { await syncNow(); } catch (e) { /* çevrimdışı */ }
        try { await api('POST', '/auth/logout'); } catch (e) { /* yoksay */ }
        stopPolling();
        token = null; user = null;
        try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(CACHE_KEY); } catch (e) { /* yoksay */ }
    }

    // ======================================================================
    // Önbellek (çevrimdışı dayanıklılık)
    // ======================================================================
    function serializeShadow() {
        const o = {};
        Object.entries(shadow).forEach(([k, m]) => { o[k] = [...m.entries()]; });
        return o;
    }
    function persist() {
        clearTimeout(cacheTimer);
        cacheTimer = setTimeout(() => {
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ v: 1, user: user && user.username, cursor, state: S(), shadow: serializeShadow(), at: new Date().toISOString() }));
            } catch (e) { /* kota dolu: önbelleksiz devam */ }
        }, 300);
    }
    function readCache() {
        try {
            const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if (!c || c.v !== 1 || !user || c.user !== user.username) return null;
            return c;
        } catch (e) { return null; }
    }

    // ======================================================================
    // Veri yükleme
    // ======================================================================
    function shadowFromState() {
        shadow = {};
        const recs = records(S());
        Object.entries(recs).forEach(([name, m]) => {
            shadow[name] = new Map();
            m.forEach((r, k) => shadow[name].set(k, JSON.stringify(r)));
        });
    }

    async function loadSnapshot() {
        const snap = await api('GET', '/mrp/snapshot');
        const st = MRP.store.emptyState();
        Object.entries(snap.collections || {}).forEach(([name, list]) => {
            const def = COLLECTIONS[name];
            if (!def) return;
            (list || []).forEach((r) => {
                const key = def.kind === 'array' ? String(keyOf(def, r)) : def.kind === 'map' ? r.kod : def.kind === 'raw' ? r[def.keyName] : def.kind === 'settings' ? 'main' : def.keyVal;
                applyRecord(st, name, key, r);
            });
        });
        MRP.store.setState(st);
        cursor = snap.cursor || 0;
        shadowFromState();
        persist();
    }

    /** Oturum açıldıktan sonra: önbellek + bekleyenleri gönder + yenileri çek, yoksa tam yükleme */
    async function loadData() {
        const cache = readCache();
        if (cache) {
            MRP.store.setState(Object.assign(MRP.store.emptyState(), cache.state));
            cursor = cache.cursor || 0;
            shadow = {};
            Object.entries(cache.shadow || {}).forEach(([k, entries]) => { shadow[k] = new Map(entries); });
            try {
                await syncNow();
                await pullNow({ silent: true });
            } catch (e) {
                if (e.status === 410) await loadSnapshot();
                else if (e.status !== 0) throw e;
                else setStatus({ state: 'offline', error: e.message });
            }
        } else {
            await loadSnapshot();
        }
        await ensureSequences().catch(() => { /* çevrimdışı: geçici numara kullanılır */ });
        startPolling();
        if (status.state !== 'offline') setStatus({ state: 'synced', pending: diff().length });
    }

    // ======================================================================
    // Gönderme (değişiklik seti)
    // ======================================================================
    function diff() {
        const cur = records(S());
        const changes = [];
        Object.entries(cur).forEach(([name, m]) => {
            const sh = shadow[name] || new Map();
            m.forEach((rec, key) => {
                const json = JSON.stringify(rec);
                if (sh.get(key) !== json) changes.push({ collection: name, op: 'upsert', key, data: rec, json });
            });
            sh.forEach((_, key) => { if (!m.has(key)) changes.push({ collection: name, op: 'delete', key }); });
        });
        return changes;
    }

    function scheduleSync() {
        if (!user) return;
        persist();
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => { syncNow().catch(() => { /* durum çubuğunda gösterilir */ }); }, C.syncDelay);
        setStatus({ state: status.state === 'offline' ? 'offline' : 'pending', pending: diff().length });
    }

    async function syncNow() {
        if (syncing) return syncing;
        if (!token) return null;
        const changes = diff();
        if (!changes.length) { setStatus({ state: 'synced', pending: 0, lastSync: new Date().toISOString(), error: null }); return null; }
        setStatus({ state: 'syncing', pending: changes.length });
        syncing = (async () => {
            try {
                const res = await api('POST', '/mrp/sync', {
                    clientId, baseCursor: cursor,
                    changes: changes.map(({ collection, op, key, data }) => ({ collection, op, key, data }))
                });
                const rejected = new Map((res.rejected || []).map((r) => [`${r.collection}|${r.key}`, r]));
                let touched = false;
                changes.forEach((c) => {
                    const sh = shadow[c.collection] = shadow[c.collection] || new Map();
                    const rj = rejected.get(`${c.collection}|${c.key}`);
                    if (rj) {
                        applyRecord(S(), c.collection, c.key, rj.current ?? null);
                        if (rj.current == null) sh.delete(c.key); else sh.set(c.key, JSON.stringify(rj.current));
                        touched = true;
                    } else if (c.op === 'delete') sh.delete(c.key);
                    else sh.set(c.key, c.json);
                });
                if (rejected.size) {
                    const first = [...rejected.values()][0];
                    MRP.UI.toast(`ERP ${rejected.size} değişikliği reddetti`, `${first.collection}/${first.key}: ${first.reason}`, 'warn', 8000);
                }
                if (touched) { MRP.model.invalidate(); MRP.app.render(); }
                if (MRP.embed) {
                    const sent = changes.filter((c) => !rejected.has(`${c.collection}|${c.key}`));
                    MRP.embed.emit('sync', { direction: 'out', changes: sent.map(({ collection, op, key }) => ({ collection, op, key })), rejected: [...rejected.values()].map(({ collection, key, reason }) => ({ collection, key, reason })) });
                }
                retryDelay = 5000;
                persist();
                setStatus({ state: 'synced', pending: diff().length, lastSync: new Date().toISOString(), error: null });
                return res;
            } catch (e) {
                if (e.status === 0) {
                    setStatus({ state: 'offline', error: e.message });
                    clearTimeout(syncTimer);
                    syncTimer = setTimeout(() => { syncNow().catch(() => {}); }, retryDelay);
                    retryDelay = Math.min(60000, retryDelay * 2);
                } else if (e.status !== 401) {
                    setStatus({ state: 'error', error: e.message });
                }
                throw e;
            } finally {
                syncing = null;
            }
        })();
        return syncing;
    }

    // ======================================================================
    // Çekme (ERP ve diğer kullanıcıların değişiklikleri)
    // ======================================================================
    async function pullNow({ silent = false } = {}) {
        if (!token) return 0;
        const res = await api('GET', `/mrp/changes?since=${cursor}`);
        const list = res.changes || [];
        list.forEach((c) => {
            applyRecord(S(), c.collection, String(c.key), c.op === 'delete' ? null : c.data);
            const sh = shadow[c.collection] = shadow[c.collection] || new Map();
            if (c.op === 'delete') sh.delete(String(c.key)); else sh.set(String(c.key), JSON.stringify(c.data));
        });
        cursor = res.cursor ?? cursor;
        if (list.length) {
            MRP.model.invalidate();
            persist();
            if (MRP.app && MRP.app.currentView()) MRP.app.render();
            if (!silent) MRP.UI.toast('ERP\'den güncelleme', `${list.length} kayıt güncellendi`, 'info', 3000);
            if (MRP.embed) MRP.embed.emit('sync', { direction: 'in', changes: list.map(({ collection, op, key }) => ({ collection, op, key })) });
        }
        return list.length;
    }

    async function tick() {
        try {
            await syncNow();
            await pullNow();
            if (status.state !== 'synced') setStatus({ state: 'synced', error: null });
        } catch (e) {
            if (e.status === 410) { await loadSnapshot(); MRP.model.invalidate(); MRP.app.render(); }
        }
    }
    function startPolling() {
        stopPolling();
        if (C.pollInterval > 0) pollTimer = setInterval(tick, C.pollInterval);
    }
    function stopPolling() { clearInterval(pollTimer); pollTimer = null; }

    // ======================================================================
    // Belge numaraları (ERP'den blok hâlinde)
    // ======================================================================
    async function ensureSequences(prefixes = SEQ_PREFIXES) {
        const st = S();
        st.seqBlocks = st.seqBlocks || {};
        const year = new Date().getFullYear();
        const need = prefixes.filter((p) => { const b = st.seqBlocks[`${p}-${year}`]; return !b || b.end - b.next < 10; });
        if (!need.length) return;
        const res = await api('POST', '/mrp/sequences', { prefixes: need, year, count: SEQ_BLOCK });
        Object.entries(res.blocks || {}).forEach(([key, b]) => { st.seqBlocks[key] = { next: b.from, end: b.to }; });
        persist();
    }

    MRP.backend = {
        COLLECTIONS, records, applyRecord, ApiError,
        login, logout, restoreSession, setToken, loadData, loadSnapshot,
        syncNow, pullNow, scheduleSync, persist, ensureSequences,
        pendingCount: () => (user ? diff().length : 0),
        status: () => ({ ...status }),
        onStatus: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
        user: () => user
    };
})(window.MRP);
