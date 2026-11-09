/* ==========================================================================
   MRP Pro — Gömme SDK'sı (ERP portalı tarafında kullanılır)
   --------------------------------------------------------------------------
   Kullanım:
     <div id="mrp" style="height:80vh"></div>
     <script src="/mrp-pro/integration/embed-sdk.js"></script>
     <script>
       const mrp = MRPPro.embed('#mrp', {
         src: '/mrp-pro/index.html',     // MRP Pro adresi
         mode: 'erp',                    // ERP API'sine bağlan
         getToken: async () => erpSession.token,   // ERP oturum anahtarı (SSO)
         view: 'mrp',                    // açılış ekranı
         theme: 'light',
         hideNav: false                  // true: MRP menüsünü gizle, ERP menüsünden yönet
       });
       mrp.on('ready', (m) => console.log('hazır', m.user));
       mrp.on('sync',  (m) => console.log('veri değişti', m.changes));
       mrp.navigate('stock');
     </script>

   MRP Pro farklı bir origin'de yayınlanıyorsa, MRP Pro sayfasında
   window.MRP_CONFIG.parentOrigin = '<ERP portalı origin>' tanımlanmalıdır.
   ========================================================================== */
(function (global) {
    'use strict';

    function embed(container, opts) {
        opts = opts || {};
        const host = typeof container === 'string' ? document.querySelector(container) : container;
        if (!host) throw new Error('MRPPro.embed: kapsayıcı bulunamadı');

        const url = new URL(opts.src || '/mrp-pro/index.html', location.href);
        url.searchParams.set('embed', '1');
        if (opts.mode) url.searchParams.set('mode', opts.mode);
        if (opts.hideNav) url.searchParams.set('hideNav', '1');
        if (opts.pollInterval != null) url.searchParams.set('poll', String(opts.pollInterval));
        if (opts.view) url.hash = '#/' + opts.view;
        const origin = url.origin;

        const iframe = document.createElement('iframe');
        iframe.src = url.href;
        iframe.title = opts.title || 'MRP Pro';
        iframe.allow = 'camera';                       // barkod okuma için
        iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;' + (opts.style || '');
        host.appendChild(iframe);

        const listeners = {};
        const fire = (type, msg) => (listeners[type] || []).concat(listeners['*'] || []).forEach((fn) => { try { fn(msg); } catch (e) { console.error(e); } });
        const send = (type, data) => { if (iframe.contentWindow) iframe.contentWindow.postMessage(Object.assign({ target: 'mrp-pro', type }, data || {}), origin); };
        const token = async (refresh) => (opts.getToken ? opts.getToken(!!refresh) : opts.token);

        async function onMessage(e) {
            if (e.source !== iframe.contentWindow || e.origin !== origin) return;
            const m = e.data;
            if (!m || m.source !== 'mrp-pro') return;
            if (m.type === 'loaded') send('init', { token: await token(false), theme: opts.theme, view: opts.view, hideNav: opts.hideNav });
            if (m.type === 'auth-expired' && opts.getToken) {
                const t = await token(true);
                if (t) send('token', { token: t });
            }
            fire(m.type, m);
        }
        window.addEventListener('message', onMessage);

        return {
            iframe,
            /** Olay dinle: 'ready' | 'route' | 'sync' | 'auth-expired' | 'error' | '*' */
            on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); return this; },
            navigate(view) { send('navigate', { view }); },
            setTheme(theme) { send('theme', { theme }); },
            refresh() { send('refresh'); },
            setToken(t) { send('token', { token: t }); },
            logout() { send('logout'); },
            destroy() { window.removeEventListener('message', onMessage); iframe.remove(); }
        };
    }

    global.MRPPro = { embed, version: '1.0' };
})(window);
