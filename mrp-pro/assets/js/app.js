/* ==========================================================================
   MRP Pro — Uygulama kabuğu: giriş, yönlendirme (hash router), menü,
   bildirimler, tema ve olay delegasyonu
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, A = MRP.auth;

    MRP.views = MRP.views || {};
    MRP.actions = MRP.actions || {};
    MRP.charts = {};

    const NAV = [
        { group: 'Genel', items: [{ id: 'dashboard', label: 'Gösterge Paneli', icon: 'dashboard' }] },
        { group: 'Mühendislik', items: [
            { id: 'bom', label: 'Ürün Ağacı', icon: 'tree' },
            { id: 'items', label: 'Malzeme Kartları', icon: 'layers' },
            { id: 'costing', label: 'Maliyet & Kur', icon: 'coin' }
        ] },
        { group: 'Planlama', items: [
            { id: 'mrp', label: 'MRP Çalıştırma', icon: 'calc', count: () => (MRP.store.state.lastRun ? MRP.store.state.lastRun.summary.critical : 0), alert: true },
            { id: 'capacity', label: 'Kapasite Planlama', icon: 'gauge' },
            { id: 'workorders', label: 'İş Emirleri', icon: 'factory', count: () => MRP.store.state.workOrders.filter((w) => w.status === 'planned' || w.status === 'released').length }
        ] },
        { group: 'Satın Alma', items: [
            { id: 'requests', label: 'Satın Alma Talepleri', icon: 'cart', count: () => MRP.store.state.requests.filter((r) => r.status === 'pending').length },
            { id: 'po', label: 'Satın Alma Siparişleri', icon: 'truck', count: () => MRP.store.state.pos.filter((p) => p.status === 'open' || p.status === 'partial').length },
            { id: 'suppliers', label: 'Tedarikçiler', icon: 'users' }
        ] },
        { group: 'Depo', items: [
            { id: 'stock', label: 'Stok Durumu', icon: 'warehouse', count: () => MRP.model.items().filter((i) => MRP.model.stockStatus(i.kod) === 'critical').length, alert: true },
            { id: 'movements', label: 'Stok Hareketleri', icon: 'swap' }
        ] },
        { group: 'Analiz & Sistem', items: [
            { id: 'analysis', label: 'Analizler', icon: 'pie' },
            { id: 'import', label: 'Veri Aktarımı (Excel)', icon: 'upload' },
            { id: 'reports', label: 'Raporlar & Dışa Aktarım', icon: 'chart' },
            { id: 'audit', label: 'Denetim Kaydı', icon: 'shield' },
            { id: 'users', label: 'Kullanıcılar & Roller', icon: 'key' }
        ] }
    ];

    let currentView = null;

    // ---------------- Tema ----------------
    function applyTheme(t) {
        document.body.classList.toggle('light', t === 'light');
        U.$$('[data-theme-icon]').forEach((el) => { el.innerHTML = MRP.icon(t === 'light' ? 'moon' : 'sun'); });
    }
    function toggleTheme() {
        const next = document.body.classList.contains('light') ? 'dark' : 'light';
        try { localStorage.setItem('mrppro.theme', next); } catch (e) { /* yoksay */ }
        applyTheme(next);
        if (currentView) render();
    }

    // ---------------- Giriş ----------------
    const C = MRP.config;
    function showLogin() {
        U.$('#boot').hidden = true;
        U.$('#app').hidden = true;
        U.$('#login').hidden = false;
        U.$('#loginUser').focus();
    }
    function showBoot(msg, retry = false) {
        U.$('#login').hidden = true;
        U.$('#app').hidden = true;
        U.$('#boot').hidden = false;
        U.$('#bootMsg').textContent = msg;
        U.$('#bootRetry').hidden = !retry;
    }
    function loginError(msg) {
        const err = U.$('#loginError');
        err.textContent = msg;
        err.classList.remove('show'); void err.offsetWidth; err.classList.add('show');
        U.$('#loginPass').value = '';
        U.$('#loginPass').focus();
    }
    async function doLogin(e) {
        if (e) e.preventDefault();
        const u = U.$('#loginUser').value.trim();
        const p = U.$('#loginPass').value;
        if (C.erp) {
            const btn = U.$('#loginForm button[type=submit]');
            btn.disabled = true;
            try {
                const user = await MRP.backend.login(u, p);
                U.$('#loginError').classList.remove('show');
                U.$('#loginPass').value = '';
                await enterErp(user);
            } catch (err) {
                loginError(err.status === 401 ? 'Kullanıcı adı veya şifre hatalı.' : `ERP'ye bağlanılamadı: ${err.message}`);
            } finally { btn.disabled = false; }
            return;
        }
        if (A.login(u, p)) {
            U.$('#loginError').classList.remove('show');
            U.$('#loginPass').value = '';
            MRP.store.audit('Oturum açıldı', u);
            MRP.store.save();
            startApp();
        } else loginError('Kullanıcı adı veya şifre hatalı.');
    }

    /** ERP oturumu doğrulandıktan sonra veriyi yükler ve uygulamayı açar */
    async function enterErp(user) {
        A.setUser(user);
        showBoot('Veriler ERP\'den yükleniyor…');
        try {
            await MRP.backend.loadData();
        } catch (err) {
            showBoot(`ERP verileri yüklenemedi: ${err.message}`, true);
            MRP.embed.emit('error', { message: err.message });
            return;
        }
        MRP.model.init();
        renderBrand();
        MRP.store.audit('Oturum açıldı', user.username);
        MRP.store.save();
        startApp();
    }

    /** Kayıtlı/üst uygulamadan gelen token ile oturumu sürdürür */
    async function resumeErp() {
        showBoot('ERP\'ye bağlanılıyor…');
        let user = null;
        try { user = await MRP.backend.restoreSession(); } catch (err) { return showBoot(`ERP'ye bağlanılamadı: ${err.message}`, true); }
        if (user) return enterErp(user);
        if (C.embed && MRP.embed.active) { MRP.embed.emit('auth-expired', {}); return showBoot('Üst uygulamadan oturum bekleniyor…'); }
        showLogin();
    }

    async function doLogout(skipConfirm) {
        if (skipConfirm !== true) {
            const pending = C.erp ? MRP.backend.pendingCount() : 0;
            const msg = pending ? `${pending} değişiklik henüz ERP'ye gönderilemedi. Çıkış yapılırsa önce gönderilmeye çalışılacak; başarısız olursa kaybolur. Devam edilsin mi?` : 'Oturumu kapatmak istediğinize emin misiniz?';
            if (!(await UI.confirm(msg, { title: 'Çıkış', okLabel: 'Çıkış Yap', danger: !!pending }))) return;
        }
        MRP.store.audit('Oturum kapatıldı', A.current() ? A.current().username : '');
        if (C.erp) {
            MRP.store.save();
            await MRP.backend.logout();
            A.logout();
            location.hash = '';
            location.reload();
            return;
        }
        MRP.store.save();
        A.logout();
        location.hash = '';
        showLogin();
    }

    function startApp() {
        const u = A.current();
        U.$('#boot').hidden = true;
        U.$('#login').hidden = true;
        U.$('#app').hidden = false;
        U.$('#userAvatar').textContent = u.avatar;
        U.$('#userAvatar').className = 'avatar ' + u.role;
        U.$('#userName').textContent = u.name;
        U.$('#userRole').textContent = u.roleName;
        route();
        MRP.embed.emit('ready', { user: { username: u.username, name: u.name, role: u.role }, view: currentView });
    }

    // ---------------- ERP senkron göstergesi ----------------
    function renderSync(st) {
        const el = U.$('#syncStatus');
        if (!el) return;
        const map = {
            synced: ['ok', 'ERP ile senkron', st.lastSync ? `Son gönderim: ${U.dateTime(st.lastSync)}` : ''],
            pending: ['wait', `${st.pending} değişiklik bekliyor`, 'Kısa süre içinde gönderilecek'],
            syncing: ['wait', 'Gönderiliyor…', `${st.pending} değişiklik`],
            offline: ['bad', 'Çevrimdışı', `${st.pending || ''} değişiklik bağlantı gelince gönderilecek`.trim()],
            error: ['bad', 'Senkron hatası', st.error || ''],
            auth: ['bad', 'Oturum gerekli', 'Yeniden giriş yapın'],
            idle: ['wait', 'ERP', '']
        };
        const [cls, label, title] = map[st.state] || map.idle;
        el.hidden = false;
        el.className = `sync-chip ${cls}`;
        el.title = title + (title ? ' · ' : '') + 'Tıklayın: şimdi senkronla';
        el.querySelector('span').textContent = label;
    }
    async function syncClick() {
        if (!C.erp) return;
        if (MRP.backend.status().state === 'auth') return resumeErp();
        try {
            await MRP.backend.syncNow();
            const n = await MRP.backend.pullNow({ silent: true });
            UI.toast('ERP ile senkronlandı', n ? `${n} kayıt güncellendi` : 'Yeni değişiklik yok', 'success', 2500);
        } catch (err) { UI.toast('Senkronlanamadı', err.message, 'error'); }
    }

    // ---------------- Firma logoları ----------------
    /** Yüklenmiş logolar varsa onları, yoksa varsayılan çizimleri gösterir */
    function renderBrand() {
        const br = (MRP.store.state && MRP.store.state.branding) || MRP.store.storedBranding();
        const logos = (br.logos || []).filter((l) => l && /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(l.src));
        const html = logos.length
            ? logos.map((l) => `<span class="brand-logo"><img src="${U.esc(l.src)}" alt="${U.esc(l.name || 'Logo')}"></span>`).join('')
            : `<svg class="brand-logo" viewBox="0 0 300 100" role="img" aria-label="EXIT"><use href="#logo-exit"/></svg>
               <svg class="brand-logo" viewBox="0 0 300 100" role="img" aria-label="bg group"><use href="#logo-bg"/></svg>`;
        U.$$('[data-brand-logos]').forEach((el) => { el.innerHTML = html; });
        const company = (br.company || '').trim();
        U.$$('[data-brand-company]').forEach((el) => { el.textContent = company || el.dataset.brandCompany; });
    }

    /** Giriş ekranındaki demo hesaplar: yalnızca parolası hâlâ demo parolası olanlar */
    function renderDemoAccounts() {
        const users = (MRP.store.state.users || []).filter((u) => u.active !== false && u.demoPassword && u.passwordHash === A.hashPassword(u.username, u.demoPassword));
        const roles = Object.fromEntries((MRP.store.state.roles || []).map((r) => [r.id, r.name]));
        U.$('#demoAccounts').innerHTML = users.map((u) => `
            <button type="button" class="demo-row" data-act="fillDemo" data-u="${U.esc(u.username)}" data-p="${U.esc(u.demoPassword)}">
                <span class="r">${U.esc(roles[u.role] || u.role)}</span><span class="c">${U.esc(u.username)} / ${U.esc(u.demoPassword)}</span></button>`).join('');
        U.$('#loginDemo').hidden = !users.length;
    }

    // ---------------- Menü ----------------
    function renderNav() {
        U.$('#sbNav').innerHTML = NAV.map((g) => {
            const items = g.items.filter((i) => A.canView(i.id));
            if (!items.length) return '';
            return `<div class="sb-group"><div class="sb-group-title">${U.esc(g.group)}</div>${items.map((i) => {
                const c = i.count ? i.count() : 0;
                return `<a class="sb-link ${currentView === i.id ? 'active' : ''}" href="#/${i.id}">${MRP.icon(i.icon)}<span>${U.esc(i.label)}</span>${c ? `<span class="count ${i.alert ? 'alert' : ''}">${c}</span>` : ''}</a>`;
            }).join('')}</div>`;
        }).join('');
    }

    // ---------------- Yönlendirme ----------------
    function route() {
        if (!A.current()) return showLogin();
        const me = A.current();
        // Her bölüm kendi açılış ekranıyla başlar (rol.home); yetkisiz ekrana gidilirse oraya döner
        let id = (location.hash.replace(/^#\/?/, '').split('?')[0]) || me.home || 'dashboard';
        if (!MRP.views[id] || !A.canView(id)) id = A.canView(me.home) ? me.home : me.views[0];
        currentView = id;
        render();
        closeSidebar();
        window.scrollTo(0, 0);
    }

    /** Aktif görünümü yeniden çizer (veri değişikliklerinden sonra çağrılır) */
    function render() {
        if (!currentView) return;
        Object.values(MRP.charts).forEach((c) => c && c.destroy && c.destroy());
        MRP.charts = {};
        const v = MRP.views[currentView];
        U.$('#pageTitle').textContent = v.title;
        U.$('#pageSub').textContent = v.subtitle || '';
        document.title = `${v.title} · MRP Pro`;
        const host = U.$('#view');
        host.innerHTML = v.render();
        if (host.querySelector('[data-brand-logos]')) renderBrand();
        if (v.after) v.after(host);
        renderNav();
        updateNotifBadge();
    }

    /** Veriyi kaydet + model önbelleğini temizle + ekranı yenile */
    function commit() {
        MRP.model.invalidate();
        MRP.store.save();
        A.refresh();
        if (!A.current()) { location.hash = ''; return showLogin(); }
        renderBrand();
        render();
    }

    // ---------------- Bildirimler ----------------
    /**
     * Bildirim hedefi: rol kimliği, 'perm:<yetki>' (o yetkiye sahip herkes),
     * 'user:<kullanıcı>' veya 'approve:<tutar>' (bu tutarı onaylayabilenler)
     */
    function isForMe(n, u) {
        return (n.roles || []).some((t) => t === u.role || t === '*' || t === `user:${u.username}`
            || (t.startsWith('perm:') && u.can[t.slice(5)])
            || (t.startsWith('approve:') && u.can.approveRequest && u.can.approveLimit >= Number(t.slice(8))));
    }
    const myNotifs = () => {
        const u = A.current();
        return u ? MRP.store.state.notifications.filter((n) => isForMe(n, u)) : [];
    };
    function updateNotifBadge() {
        const u = A.current();
        const unread = myNotifs().filter((n) => !n.readBy.includes(u.username)).length;
        const b = U.$('#notifCount');
        b.hidden = unread === 0;
        b.textContent = unread > 99 ? '99+' : unread;
    }
    function renderNotifPanel() {
        const u = A.current();
        const list = myNotifs();
        U.$('#notifBody').innerHTML = list.length ? list.slice(0, 50).map((n) => `
            <div class="notif-item ${n.readBy.includes(u.username) ? '' : 'unread'}" data-act="openNotif" data-id="${U.esc(n.id)}">
                <div class="t"><span>${U.esc(n.title)}</span><small>${U.esc(U.timeAgo(n.at))}</small></div>
                <div class="m">${U.esc(n.message)}</div>
            </div>`).join('') : '<div class="empty"><h3>Bildirim yok</h3><p>Yeni gelişmeler burada görünecek.</p></div>';
    }
    function togglePopover(id) {
        const el = U.$('#' + id);
        const open = el.hidden;
        U.$$('.popover').forEach((p) => { p.hidden = true; });
        if (open) { el.hidden = false; if (id === 'notifPop') renderNotifPanel(); }
    }

    // ---------------- Sidebar (mobil) ----------------
    function openSidebar() { U.$('#sidebar').classList.add('open'); U.$('#sbBackdrop').classList.add('open'); }
    function closeSidebar() { U.$('#sidebar').classList.remove('open'); U.$('#sbBackdrop').classList.remove('open'); }

    // ---------------- Genel eylemler ----------------
    Object.assign(MRP.actions, {
        toggleTheme, logout: doLogout, syncNow: syncClick, bootRetry: () => resumeErp(),
        openSidebar, closeSidebar,
        toggleNotif: () => togglePopover('notifPop'),
        toggleUserMenu: () => togglePopover('userPop'),
        fillDemo: (_, el) => { U.$('#loginUser').value = el.dataset.u; U.$('#loginPass').value = el.dataset.p; U.$('#loginPass').focus(); },
        openNotif: (id) => {
            const n = MRP.store.state.notifications.find((x) => x.id === id);
            if (!n) return;
            const u = A.current().username;
            if (!n.readBy.includes(u)) n.readBy.push(u);
            MRP.store.save();
            U.$$('.popover').forEach((p) => { p.hidden = true; });
            if (n.link && A.canView(n.link)) location.hash = '#/' + n.link; else updateNotifBadge();
        },
        markAllRead: () => {
            const u = A.current().username;
            myNotifs().forEach((n) => { if (!n.readBy.includes(u)) n.readBy.push(u); });
            MRP.store.save();
            renderNotifPanel(); updateNotifBadge();
        },
        go: (id) => { location.hash = '#/' + id; }
    });

    // Tek olay dinleyici: data-act="eylem" data-id="..."
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el) {
            if (!e.target.closest('.popover')) U.$$('.popover').forEach((p) => { p.hidden = true; });
            return;
        }
        const fn = MRP.actions[el.dataset.act];
        if (!fn) return console.warn('Tanımsız eylem:', el.dataset.act);
        e.preventDefault();
        e.stopPropagation();
        if (!el.closest('.popover')) U.$$('.popover').forEach((p) => { p.hidden = true; });
        fn(el.dataset.id, el, e);
    });
    document.addEventListener('change', (e) => {
        const el = e.target.closest('[data-change]');
        if (el && MRP.actions[el.dataset.change]) MRP.actions[el.dataset.change](el.value, el, e);
    });
    document.addEventListener('input', (e) => {
        const el = e.target.closest('[data-input]');
        if (el && MRP.actions[el.dataset.input]) MRP.actions[el.dataset.input](el.value, el, e);
    });

    // ---------------- Başlangıç ----------------
    function setTheme(t) {
        try { localStorage.setItem('mrppro.theme', t); } catch (e) { /* yoksay */ }
        applyTheme(t);
        if (currentView) render();
    }

    MRP.app = { render, commit, route, setTheme, resumeErp, renderBrand, logout: doLogout, currentView: () => currentView };

    window.addEventListener('hashchange', route);
    window.addEventListener('DOMContentLoaded', async () => {
        let theme = 'dark';
        try { theme = localStorage.getItem('mrppro.theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); } catch (e) { /* yoksay */ }
        applyTheme(theme);
        MRP.store.load();
        MRP.model.init();
        renderBrand();
        U.$('#loginForm').addEventListener('submit', doLogin);

        if (!C.erp) {
            renderDemoAccounts();
        } else {
            U.$('#loginDemo').hidden = true;
            U.$('#loginErpNote').hidden = false;
            MRP.backend.onStatus(renderSync);
        }

        // Gömülü modda üst sayfanın başlangıç mesajını bekle (tema, ekran, oturum anahtarı)
        if (MRP.embed.active) {
            const init = await MRP.embed.init();
            if (init && init.token && C.erp) MRP.backend.setToken(init.token);
        }

        if (!C.erp) { if (A.restore()) startApp(); else showLogin(); return; }
        await resumeErp();
    });
})(window.MRP);
