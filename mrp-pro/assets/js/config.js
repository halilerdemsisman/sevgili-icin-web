/* ==========================================================================
   MRP Pro — Çalışma yapılandırması
   --------------------------------------------------------------------------
   İki çalışma modu vardır:
     • standalone : Veriler tarayıcıda (localStorage) tutulur, demo kullanıcılar.
     • erp        : Ana veri, kullanıcılar ve yetkiler ERP'den gelir; tüm
                    değişiklikler ERP'nin REST API'sine senkronlanır.

   Yapılandırma öncelik sırası:
     1. index.html'den önce tanımlanan  window.MRP_CONFIG = { ... }
     2. URL parametreleri (?mode=erp&embed=1 …) — güvenlik için API adresi
        URL'den yalnızca aynı origin altında değiştirilebilir.

   Örnek (ERP'nin sunduğu sayfada, uygulama betiklerinden önce):
     window.MRP_CONFIG = { mode: 'erp', apiBase: '/api', embed: true,
                           parentOrigin: 'https://erp.firma.com' };
   ========================================================================== */
window.MRP = window.MRP || {};

(function (MRP) {
    'use strict';

    const defaults = {
        mode: 'standalone',      // 'standalone' | 'erp'
        apiBase: '/api',         // ERP REST API kök adresi
        pollInterval: 30000,     // ERP'den değişiklik çekme aralığı (ms); 0 = kapalı
        syncDelay: 600,          // değişikliklerin toplanıp gönderilmesi için bekleme (ms)
        embed: false,            // true: başka bir sayfaya iframe ile gömülü çalışır
        parentOrigin: null,      // gömülü modda mesaj kabul edilecek üst sayfa origin'i
        hideNav: false,          // gömülü modda sol menüyü gizle (ERP kendi menüsünü kullanır)
        token: null,             // ERP'nin önceden verdiği oturum anahtarı (SSO)
        clientName: 'MRP Pro Web'
    };

    const cfg = Object.assign({}, defaults, window.MRP_CONFIG || {});
    let params;
    try { params = new URLSearchParams(location.search); } catch (e) { params = new URLSearchParams(); }

    if (params.get('mode') === 'erp' || params.get('mode') === 'standalone') cfg.mode = params.get('mode');
    if (params.has('embed')) cfg.embed = params.get('embed') !== '0';
    if (params.has('hideNav')) cfg.hideNav = params.get('hideNav') !== '0';
    if (params.has('poll')) cfg.pollInterval = Math.max(0, parseInt(params.get('poll'), 10) || 0);

    // API adresi URL'den değiştirilebilir ama yalnızca aynı origin altında
    // (aksi hâlde bir bağlantıyla kullanıcı parolası yabancı sunucuya gönderilebilir).
    const apiParam = params.get('api');
    if (apiParam) {
        try {
            const u = new URL(apiParam, location.href);
            if (u.origin === location.origin) cfg.apiBase = u.pathname.replace(/\/$/, '');
            else console.warn('MRP Pro: farklı origin\'e ait api parametresi yok sayıldı:', apiParam);
        } catch (e) { /* geçersiz adres yok sayılır */ }
    }
    // parentOrigin URL'den yalnızca MRP_CONFIG izin veriyorsa alınır
    if (params.get('parentOrigin') && Array.isArray(cfg.allowedParentOrigins) && cfg.allowedParentOrigins.includes(params.get('parentOrigin'))) {
        cfg.parentOrigin = params.get('parentOrigin');
    }

    cfg.erp = cfg.mode === 'erp';
    cfg.apiBase = String(cfg.apiBase).replace(/\/$/, '');
    MRP.config = Object.freeze(cfg);
})(window.MRP);
