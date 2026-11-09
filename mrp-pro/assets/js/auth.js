/* ==========================================================================
   MRP Pro — Bölüm rolleri, kullanıcılar ve yetkiler
   --------------------------------------------------------------------------
   Her bölümün (planlama, üretim, satın alma, depo, maliyet, yönetim) bir rolü
   vardır. Rol; görebileceği ekranları (views), yapabileceği işlemleri (can) ve
   açılış ekranını (home) belirler. Bağımsız modda roller ve kullanıcılar
   "Kullanıcılar & Roller" ekranından yönetilir; ERP modunda ERP'den gelir.
   NOT: Bağımsız mod istemci tarafındadır; gerçek kullanımda kimlik doğrulama
   ERP sunucusunda yapılmalıdır (bkz. integration/README.md).
   ========================================================================== */
(function (MRP) {
    'use strict';

    /** Ekranlar (menü sırasıyla) */
    const VIEWS = {
        dashboard: 'Gösterge Paneli', bom: 'Ürün Ağacı', items: 'Malzeme Kartları', costing: 'Maliyet & Kur',
        sales: 'Satış Siparişleri', mrp: 'MRP Çalıştırma', capacity: 'Kapasite Planlama', workorders: 'İş Emirleri',
        requests: 'Satın Alma Talepleri', po: 'Satın Alma Siparişleri', suppliers: 'Tedarikçiler',
        stock: 'Stok Durumu', movements: 'Stok Hareketleri', quality: 'Kalite Kontrol',
        analysis: 'Analizler', import: 'Veri Aktarımı', reports: 'Raporlar', audit: 'Denetim Kaydı', users: 'Kullanıcılar & Roller'
    };

    /** İşlem yetkileri — ekran görmek salt okunur erişimdir; değiştirmek bu yetkileri ister */
    const PERMISSIONS = {
        editProduct:     ['Mühendislik', 'Ürün ve reçete tanımlama / değiştirme'],
        editItem:        ['Mühendislik', 'Malzeme kartı planlama parametreleri (LT, emniyet stoğu, parti)'],
        editCost:        ['Maliyet', 'Fiyat, döviz kuru, genel gider ve saat ücretleri'],
        runMRP:          ['Planlama', 'Ana üretim planı ve MRP çalıştırma (bağımsız modda satış siparişi girişi)'],
        manageCapacity:  ['Planlama', 'İş merkezleri ve üretim rotaları'],
        createRequest:   ['Planlama', 'MRP önerisinden satın alma talebi oluşturma'],
        manageWO:        ['Üretim', 'İş emri oluşturma, serbest bırakma, tamamlama'],
        approveRequest:  ['Satın Alma', 'Satın alma talebi onaylama / reddetme (limit dahilinde)'],
        createPO:        ['Satın Alma', 'Satın alma siparişi oluşturma / iptal'],
        manageSuppliers: ['Satın Alma', 'Tedarikçi kartları ve fiyat listeleri'],
        receiveGoods:    ['Depo', 'Mal kabul (irsaliye, lot, kalite)'],
        adjustStock:     ['Depo', 'Sayım düzeltme ve Excel ile sayım aktarımı'],
        transferStock:   ['Depo', 'Lokasyon transferi ve fason sevk / dönüş'],
        inspectQuality:  ['Kalite', 'Giriş muayenesi ve karantina kararı (kabul / iade / hurda)'],
        manageUsers:     ['Sistem', 'Kullanıcı, rol ve firma ayarları'],
        resetData:       ['Sistem', 'Demo verilerini sıfırlama, yedekten geri yükleme']
    };

    const ALL_VIEWS = Object.keys(VIEWS);
    const ALL = Object.fromEntries(Object.keys(PERMISSIONS).map((k) => [k, true]));
    const NONE = Object.fromEntries(Object.keys(PERMISSIONS).map((k) => [k, false]));

    /**
     * Varsayılan bölüm rolleri. approveLimit: ₺, null = sınırsız.
     * Ekran listesi "işine yarayan" kapsamı verir; yazma yetkileri bölümün sorumluluğuyla sınırlıdır.
     */
    const DEFAULT_ROLES = [
        { id: 'admin', name: 'Sistem Yöneticisi', home: 'dashboard', views: ALL_VIEWS, can: { ...ALL }, approveLimit: null },
        { id: 'yonetim', name: 'Genel Müdür', home: 'dashboard',
            views: ['dashboard', 'bom', 'items', 'costing', 'sales', 'mrp', 'capacity', 'workorders', 'requests', 'po', 'suppliers', 'stock', 'movements', 'quality', 'analysis', 'reports', 'audit'],
            can: { ...NONE, approveRequest: true }, approveLimit: null },
        { id: 'planlama', name: 'Üretim Planlama', home: 'mrp',
            views: ['dashboard', 'bom', 'items', 'costing', 'sales', 'mrp', 'capacity', 'workorders', 'requests', 'po', 'stock', 'movements', 'analysis', 'import', 'reports'],
            can: { ...NONE, editProduct: true, editItem: true, runMRP: true, manageCapacity: true, createRequest: true, manageWO: true }, approveLimit: 0 },
        { id: 'uretim', name: 'Üretim Şefi', home: 'workorders',
            views: ['dashboard', 'bom', 'items', 'sales', 'capacity', 'workorders', 'stock', 'movements', 'reports'],
            can: { ...NONE, manageWO: true, transferStock: true }, approveLimit: 0 },
        { id: 'satinalma', name: 'Satın Alma Uzmanı', home: 'requests',
            views: ['dashboard', 'items', 'costing', 'mrp', 'requests', 'po', 'suppliers', 'stock', 'quality', 'analysis', 'import', 'reports'],
            can: { ...NONE, approveRequest: true, createPO: true, manageSuppliers: true }, approveLimit: 10000 },
        { id: 'satinalma_muduru', name: 'Satın Alma Müdürü', home: 'requests',
            views: ['dashboard', 'items', 'costing', 'mrp', 'capacity', 'requests', 'po', 'suppliers', 'stock', 'movements', 'quality', 'analysis', 'import', 'reports', 'audit'],
            can: { ...NONE, approveRequest: true, createPO: true, manageSuppliers: true, editCost: true }, approveLimit: 500000 },
        { id: 'depo', name: 'Depo Sorumlusu', home: 'stock',
            views: ['dashboard', 'items', 'workorders', 'po', 'stock', 'movements', 'quality', 'import', 'reports'],
            can: { ...NONE, receiveGoods: true, adjustStock: true, transferStock: true }, approveLimit: 0 },
        { id: 'kalite', name: 'Kalite Kontrol', home: 'quality',
            views: ['dashboard', 'items', 'po', 'suppliers', 'stock', 'movements', 'quality', 'reports'],
            can: { ...NONE, inspectQuality: true }, approveLimit: 0 },
        { id: 'maliyet', name: 'Maliyet / Muhasebe', home: 'costing',
            views: ['dashboard', 'bom', 'items', 'costing', 'capacity', 'po', 'suppliers', 'stock', 'movements', 'analysis', 'import', 'reports', 'audit'],
            can: { ...NONE, editCost: true }, approveLimit: 0 }
    ];

    const pw = (username, password) => MRP.U.sha256(`mrppro:${username}:${password}`);

    /** Varsayılan kullanıcılar (demo) — parolalar yalnızca özet olarak saklanır */
    const DEMO_USERS = [
        ['admin', '1234', 'Sistem Yöneticisi', 'admin'],
        ['yonetim', 'yon123', 'Kemal Aydın', 'yonetim'],
        ['planlama', 'plan123', 'Ahmet Yılmaz', 'planlama'],
        ['uretim', 'uret123', 'Hüseyin Çelik', 'uretim'],
        ['satinalma', 'satin123', 'Zeynep Kaya', 'satinalma'],
        ['satinalma_muduru', 'mudur123', 'Murat Demir', 'satinalma_muduru'],
        ['depo', 'depo123', 'Emre Koç', 'depo'],
        ['kalite', 'kal123', 'Selin Arslan', 'kalite'],
        ['maliyet', 'mal123', 'Elif Şahin', 'maliyet']
    ];
    function defaultUsers() {
        return DEMO_USERS.map(([username, password, name, role]) => ({ username, name, role, active: true, passwordHash: pw(username, password), demoPassword: password }));
    }
    function defaultRoles() { return JSON.parse(JSON.stringify(DEFAULT_ROLES)); }

    const initials = (name) => String(name).split(/\s+/).filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toLocaleUpperCase('tr');

    let current = null;
    const SESSION_KEY = 'mrppro.session';
    const S = () => MRP.store.state;

    /** Kullanıcı kaydı + rol → oturumdaki kullanıcı nesnesi */
    function build(userRec) {
        const role = (S().roles || []).find((r) => r.id === userRec.role);
        if (!role) return null;
        const can = { ...NONE, ...role.can };
        can.approveLimit = role.approveLimit == null ? Infinity : Number(role.approveLimit) || 0;
        const views = role.views.filter((v) => VIEWS[v]);
        return {
            username: userRec.username, name: userRec.name, role: role.id, roleName: role.name, avatar: initials(userRec.name),
            home: views.includes(role.home) ? role.home : views[0], views, can
        };
    }

    const auth = {
        VIEWS, PERMISSIONS, DEFAULT_ROLES, defaultRoles, defaultUsers, hashPassword: pw, initials,
        current: () => current,
        /** Bağımsız mod girişi */
        login(username, password) {
            const u = (S().users || []).find((x) => x.username === username && x.active !== false);
            if (!u || u.passwordHash !== pw(username, password)) return false;
            const built = build(u);
            if (!built) return false;
            current = built;
            try { sessionStorage.setItem(SESSION_KEY, username); } catch (e) { /* yoksay */ }
            return true;
        },
        restore() {
            try {
                const name = sessionStorage.getItem(SESSION_KEY);
                const u = name && (S().users || []).find((x) => x.username === name && x.active !== false);
                if (u) { current = build(u); return !!current; }
            } catch (e) { /* yoksay */ }
            return false;
        },
        /** Rol/kullanıcı değişikliğinden sonra oturumdaki yetkileri tazeler */
        refresh() {
            if (!current || MRP.config.erp) return;
            const u = (S().users || []).find((x) => x.username === current.username);
            current = u && u.active !== false ? build(u) : null;
        },
        logout() {
            current = null;
            try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* yoksay */ }
        },
        /** ERP modunda kullanıcı ve yetkiler ERP'den gelir (bkz. backend.js) */
        setUser(u) { current = u; },
        /** Bir kullanıcının rol kimliği (bildirim hedefleme için) */
        roleOf(username) {
            const u = (S().users || []).find((x) => x.username === username);
            return u ? u.role : null;
        },
        canView: (v) => !!current && current.views.includes(v),
        can: (a) => !!current && !!current.can[a]
    };

    MRP.auth = auth;
})(window.MRP);
