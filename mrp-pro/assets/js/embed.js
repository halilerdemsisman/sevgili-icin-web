/* ==========================================================================
   MRP Pro — Gömülü çalışma köprüsü (config.embed = true)
   --------------------------------------------------------------------------
   ERP portalı MRP Pro'yu bir iframe içinde açar ve window.postMessage ile
   konuşur. Yalnızca config.parentOrigin'den (varsayılan: aynı origin) gelen
   mesajlar kabul edilir. Üst sayfa tarafı için: integration/embed-sdk.js

   Üst sayfa → MRP Pro   { target: 'mrp-pro', type, ... }
     init      { token?, theme?, view?, hideNav? }   oturum ve başlangıç ayarı
     token     { token }                            süresi dolan oturumu yenile
     navigate  { view }                             ekrana git (ör. 'mrp', 'stock')
     theme     { theme: 'light' | 'dark' }
     refresh   {}                                   ERP'den hemen veri çek
     logout    {}

   MRP Pro → Üst sayfa   { source: 'mrp-pro', type, ... }
     loaded        sayfa yüklendi, 'init' bekleniyor
     ready         { user, view }                  uygulama kullanıma hazır
     route         { view }                        ekran değişti
     sync          { direction: 'in'|'out', changes, rejected? }
     auth-expired  {}                              yeni token gerekiyor
     error         { message }
   ========================================================================== */
(function (MRP) {
    'use strict';
    const C = MRP.config;
    const noop = { init() {}, emit() {}, active: false };
    if (!C.embed || window.parent === window) { MRP.embed = noop; return; }

    const parentOrigin = C.parentOrigin || location.origin;
    let initResolve;
    const initReceived = new Promise((r) => { initResolve = r; });

    function emit(type, payload = {}) {
        try { window.parent.postMessage({ source: 'mrp-pro', type, ...payload }, parentOrigin); } catch (e) { /* yoksay */ }
    }

    function applyUi(o) {
        if (o.theme === 'light' || o.theme === 'dark') MRP.app.setTheme(o.theme);
        if (o.hideNav != null) document.body.classList.toggle('no-nav', !!o.hideNav);
        if (o.view) location.hash = '#/' + String(o.view).replace(/[^a-z]/gi, '');
    }

    async function onMessage(e) {
        if (e.origin !== parentOrigin || e.source !== window.parent) return;
        const m = e.data;
        if (!m || m.target !== 'mrp-pro' || typeof m.type !== 'string') return;
        try {
            switch (m.type) {
                case 'init':
                    applyUi(m);
                    initResolve(m);
                    break;
                case 'token':
                    if (C.erp && m.token) { MRP.backend.setToken(m.token); await MRP.app.resumeErp(); }
                    break;
                case 'navigate': applyUi({ view: m.view }); break;
                case 'theme': applyUi({ theme: m.theme }); break;
                case 'refresh': if (C.erp) { await MRP.backend.syncNow(); await MRP.backend.pullNow(); } break;
                case 'logout': await MRP.app.logout(true); break;
                default: break;
            }
        } catch (err) {
            emit('error', { message: err.message });
        }
    }

    MRP.embed = {
        active: true,
        emit,
        /** Dinlemeyi başlatır; üst sayfanın 'init' mesajını en fazla timeout ms bekler */
        init(timeout = 4000) {
            window.addEventListener('message', onMessage);
            document.body.classList.add('embedded');
            if (C.hideNav) document.body.classList.add('no-nav');
            window.addEventListener('hashchange', () => emit('route', { view: location.hash.replace(/^#\/?/, '') || 'dashboard' }));
            emit('loaded', { version: 3, mode: C.mode });
            return Promise.race([initReceived, new Promise((r) => setTimeout(() => r(null), timeout))]);
        }
    };
})(window.MRP);
