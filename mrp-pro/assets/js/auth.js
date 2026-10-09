/* ==========================================================================
   MRP Pro — Kullanıcılar, roller ve yetkiler
   NOT: Bu bir istemci tarafı demo uygulamasıdır. Gerçek kullanımda kimlik
   doğrulama ve yetkilendirme mutlaka sunucu tarafında yapılmalıdır.
   ========================================================================== */
(function (MRP) {
    'use strict';

    const ALL_VIEWS = ['dashboard', 'bom', 'items', 'mrp', 'workorders', 'requests', 'po', 'suppliers', 'stock', 'movements', 'reports', 'audit'];

    const USERS = {
        admin: {
            username: 'admin', password: '1234', name: 'Sistem Yöneticisi', role: 'admin', roleName: 'Yönetici', avatar: 'SY',
            views: ALL_VIEWS,
            can: { editProduct: true, editItem: true, runMRP: true, createRequest: true, approveRequest: true, approveLimit: Infinity, createPO: true, receiveGoods: true, manageSuppliers: true, manageWO: true, adjustStock: true, resetData: true }
        },
        planlama: {
            username: 'planlama', password: 'plan123', name: 'Ahmet Yılmaz', role: 'planlama', roleName: 'Üretim Planlama', avatar: 'AY',
            views: ['dashboard', 'bom', 'items', 'mrp', 'workorders', 'requests', 'stock', 'movements', 'reports'],
            can: { editProduct: true, editItem: true, runMRP: true, createRequest: true, approveRequest: false, approveLimit: 0, createPO: false, receiveGoods: false, manageSuppliers: false, manageWO: true, adjustStock: false, resetData: false }
        },
        satinalma: {
            username: 'satinalma', password: 'satin123', name: 'Zeynep Kaya', role: 'satinalma', roleName: 'Satın Alma Uzmanı', avatar: 'ZK',
            views: ['dashboard', 'bom', 'items', 'requests', 'po', 'suppliers', 'stock', 'movements', 'reports'],
            can: { editProduct: false, editItem: false, runMRP: false, createRequest: false, approveRequest: true, approveLimit: 10000, createPO: true, receiveGoods: true, manageSuppliers: true, manageWO: false, adjustStock: true, resetData: false }
        },
        satinalma_muduru: {
            username: 'satinalma_muduru', password: 'mudur123', name: 'Murat Demir', role: 'satinalma_muduru', roleName: 'Satın Alma Müdürü', avatar: 'MD',
            views: ['dashboard', 'bom', 'items', 'mrp', 'requests', 'po', 'suppliers', 'stock', 'movements', 'reports', 'audit'],
            can: { editProduct: false, editItem: true, runMRP: false, createRequest: false, approveRequest: true, approveLimit: 500000, createPO: true, receiveGoods: true, manageSuppliers: true, manageWO: false, adjustStock: true, resetData: false }
        }
    };

    let current = null;
    const SESSION_KEY = 'mrppro.session';

    const auth = {
        USERS,
        current: () => current,
        login(username, password) {
            const u = USERS[username];
            if (!u || u.password !== password) return false;
            current = u;
            try { sessionStorage.setItem(SESSION_KEY, username); } catch (e) { /* yoksay */ }
            return true;
        },
        restore() {
            try {
                const u = sessionStorage.getItem(SESSION_KEY);
                if (u && USERS[u]) { current = USERS[u]; return true; }
            } catch (e) { /* yoksay */ }
            return false;
        },
        logout() {
            current = null;
            try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* yoksay */ }
        },
        canView: (v) => !!current && current.views.includes(v),
        can: (a) => !!current && !!current.can[a]
    };

    MRP.auth = auth;
})(window.MRP);
