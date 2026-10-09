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
            { id: 'items', label: 'Malzeme Kartları', icon: 'layers' }
        ] },
        { group: 'Planlama', items: [
            { id: 'mrp', label: 'MRP Çalıştırma', icon: 'calc', count: () => (MRP.store.state.lastRun ? MRP.store.state.lastRun.summary.critical : 0), alert: true },
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
        { group: 'Sistem', items: [
            { id: 'reports', label: 'Raporlar & Dışa Aktarım', icon: 'chart' },
            { id: 'audit', label: 'Denetim Kaydı', icon: 'shield' }
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
    function showLogin() {
        U.$('#app').hidden = true;
        U.$('#login').hidden = false;
        U.$('#loginUser').focus();
    }
    function doLogin(e) {
        if (e) e.preventDefault();
        const u = U.$('#loginUser').value.trim();
        const p = U.$('#loginPass').value;
        if (A.login(u, p)) {
            U.$('#loginError').classList.remove('show');
            U.$('#loginPass').value = '';
            MRP.store.audit('Oturum açıldı', u);
            MRP.store.save();
            startApp();
        } else {
            const err = U.$('#loginError');
            err.classList.remove('show'); void err.offsetWidth; err.classList.add('show');
            U.$('#loginPass').value = '';
            U.$('#loginPass').focus();
        }
    }
    async function doLogout() {
        if (!(await UI.confirm('Oturumu kapatmak istediğinize emin misiniz?', { title: 'Çıkış', okLabel: 'Çıkış Yap' }))) return;
        MRP.store.audit('Oturum kapatıldı', A.current().username);
        MRP.store.save();
        A.logout();
        location.hash = '';
        showLogin();
    }

    function startApp() {
        const u = A.current();
        U.$('#login').hidden = true;
        U.$('#app').hidden = false;
        U.$('#userAvatar').textContent = u.avatar;
        U.$('#userAvatar').className = 'avatar ' + u.role;
        U.$('#userName').textContent = u.name;
        U.$('#userRole').textContent = u.roleName;
        route();
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
        let id = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'dashboard';
        if (!MRP.views[id] || !A.canView(id)) id = A.current().views[0];
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
        if (v.after) v.after(host);
        renderNav();
        updateNotifBadge();
    }

    /** Veriyi kaydet + model önbelleğini temizle + ekranı yenile */
    function commit() {
        MRP.model.invalidate();
        MRP.store.save();
        render();
    }

    // ---------------- Bildirimler ----------------
    const myNotifs = () => {
        const u = A.current();
        return u ? MRP.store.state.notifications.filter((n) => n.roles.includes(u.role)) : [];
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
        toggleTheme, logout: doLogout,
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
    MRP.app = { render, commit, route, currentView: () => currentView };

    window.addEventListener('hashchange', route);
    window.addEventListener('DOMContentLoaded', () => {
        let theme = 'dark';
        try { theme = localStorage.getItem('mrppro.theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); } catch (e) { /* yoksay */ }
        applyTheme(theme);
        MRP.store.load();
        MRP.model.init();
        U.$('#loginForm').addEventListener('submit', doLogin);
        U.$('#demoAccounts').innerHTML = Object.values(A.USERS).map((u) => `
            <button type="button" class="demo-row" data-act="fillDemo" data-u="${U.esc(u.username)}" data-p="${U.esc(u.password)}">
                <span class="r">${U.esc(u.roleName)}</span><span class="c">${U.esc(u.username)} / ${U.esc(u.password)}</span></button>`).join('');
        if (A.restore()) startApp(); else showLogin();
    });
})(window.MRP);
