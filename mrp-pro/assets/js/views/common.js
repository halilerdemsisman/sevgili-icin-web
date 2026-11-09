/* ==========================================================================
   MRP Pro — Görünümler için ortak HTML yardımcıları
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U;
    const esc = U.esc;

    const H = {};

    H.kpi = (label, value, sub = '', cls = '') =>
        `<div class="kpi ${cls}"><div class="l">${esc(label)}</div><div class="v">${esc(value)}</div><div class="s">${esc(sub)}</div></div>`;

    H.banner = (type, icon, title, text = '', actionHtml = '') =>
        `<div class="banner ${type}"><div class="ic">${MRP.icon(icon)}</div><div class="tx"><h4>${esc(title)}</h4>${text ? `<p>${esc(text)}</p>` : ''}</div>${actionHtml}</div>`;

    H.empty = (title, text = '') => `<div class="empty"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}</div>`;

    H.card = (title, sub, body, actions = '') =>
        `<section class="card"><div class="card-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${actions}</div>${body}</section>`;

    const STOCK = {
        critical: ['badge-red', 'Kritik'], warn: ['badge-amber', 'Düşük'], ok: ['badge-green', 'Normal'], na: ['badge-gray', 'Stoksuz']
    };
    H.stockBadge = (s) => `<span class="badge ${STOCK[s][0]}">${STOCK[s][1]}</span>`;

    H.REQ_STATUS = {
        pending: ['badge-violet', 'Onay Bekliyor'], approved: ['badge-green', 'Onaylandı'], rejected: ['badge-red', 'Reddedildi'],
        ordered: ['badge-amber', 'Siparişe Döndü'], closed: ['badge-cyan', 'Kapandı']
    };
    H.PO_STATUS = {
        open: ['badge-amber', 'Açık'], partial: ['badge-blue', 'Kısmi Teslim'], received: ['badge-green', 'Teslim Alındı'], cancelled: ['badge-gray', 'İptal']
    };
    H.WO_STATUS = {
        planned: ['badge-gray', 'Planlandı'], released: ['badge-blue', 'Serbest'], completed: ['badge-green', 'Tamamlandı'], cancelled: ['badge-red', 'İptal']
    };
    H.PRIORITY = { low: ['badge-gray', 'Düşük'], normal: ['badge-blue', 'Normal'], high: ['badge-amber', 'Yüksek'], urgent: ['badge-red', 'Acil'] };
    H.badge = (map, key) => { const b = map[key] || ['badge-gray', key]; return `<span class="badge ${b[0]}">${esc(b[1])}</span>`; };

    H.catTag = (cat) => {
        const c = (MRP.data.CATEGORY_STYLE[cat] || {}).color || '#64748b';
        return `<span class="badge plain" style="background:${c}22;color:${c};">${esc(cat)}</span>`;
    };

    H.itemLink = (kod) => `<button class="link mono" data-act="itemDetail" data-id="${esc(kod)}">${esc(kod)}</button>`;
    H.productLink = (kod) => `<button class="link mono" data-act="productDetail" data-id="${esc(kod)}">${esc(kod)}</button>`;
    H.anyLink = (kod) => (MRP.model.isProduct(kod) ? H.productLink(kod) : H.itemLink(kod));

    /** Sayfalama çubuğu */
    H.pager = (total, page, size, act) => {
        const pages = Math.max(1, Math.ceil(total / size));
        const from = total ? (page - 1) * size + 1 : 0;
        const to = Math.min(total, page * size);
        return `<div class="pager"><span>${from}–${to} / ${total.toLocaleString('tr-TR')} kayıt</span>
            <span style="display:flex;gap:6px;align-items:center;">
                <button class="btn btn-secondary btn-sm" data-act="${act}" data-id="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹ Önceki</button>
                <span>${page} / ${pages}</span>
                <button class="btn btn-secondary btn-sm" data-act="${act}" data-id="${page + 1}" ${page >= pages ? 'disabled' : ''}>Sonraki ›</button>
            </span></div>`;
    };

    H.tabs = (items, active, act) => `<div class="tabs">${items.map(([id, label, n]) =>
        `<button class="tab ${id === active ? 'active' : ''}" data-act="${act}" data-id="${esc(id)}">${esc(label)}${n != null ? ` <span class="n">${n}</span>` : ''}</button>`).join('')}</div>`;

    H.chartTheme = () => {
        const light = document.body.classList.contains('light');
        return {
            text: light ? '#3d4a63' : '#b4bcd0',
            grid: light ? 'rgba(15,23,42,.07)' : 'rgba(255,255,255,.07)',
            surface: light ? '#ffffff' : '#111729'
        };
    };
    H.chart = (id, config) => {
        if (typeof Chart === 'undefined') return;
        const el = document.getElementById(id);
        if (!el) return;
        const t = H.chartTheme();
        Chart.defaults.color = t.text;
        Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
        MRP.charts[id] = new Chart(el, config);
    };

    /** Yetki kontrolü — yoksa uyarı verip false döner */
    H.guard = (action) => {
        if (MRP.auth.can(action)) return true;
        MRP.UI.toast('Yetkiniz yok', 'Bu işlem için rolünüzün yetkisi bulunmuyor.', 'error');
        return false;
    };

    MRP.H = H;
})(window.MRP);
