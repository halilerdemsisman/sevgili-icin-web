/* ==========================================================================
   MRP Pro — Yardımcı fonksiyonlar ve UI bileşenleri (toast, modal, ikon)
   ========================================================================== */
window.MRP = window.MRP || {};

(function (MRP) {
    'use strict';

    const U = {};

    // ---------- Güvenlik ----------
    const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC_MAP[c]);

    // ---------- Sayı / para ----------
    U.num = (n, d = 2) => (n == null || isNaN(n))
        ? '–'
        : Number(n).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
    U.cur = (n, d = 2) => U.num(n, d) + ' ₺';
    U.compactCur = (n) => {
        const a = Math.abs(n);
        if (a >= 1e6) return U.num(n / 1e6, 2) + ' M₺';
        if (a >= 1e3) return U.num(n / 1e3, 1) + ' B₺';
        return U.num(n, 0) + ' ₺';
    };
    /** Miktarı birime göre biçimlendirir: adet → tam sayı, diğerleri → en fazla 3 ondalık */
    U.qty = (n, unit) => {
        if (n == null || isNaN(n)) return '–';
        const isInt = unit === 'ad' || Number.isInteger(+(+n).toFixed(6));
        const s = Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: isInt ? 0 : 3 });
        return unit ? `${s} ${unit}` : s;
    };
    U.round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
    U.toNum = (v, fallback = 0) => {
        const n = parseFloat(String(v).replace(',', '.'));
        return isFinite(n) ? n : fallback;
    };

    // ---------- Tarih (yerel saat — toISOString() UTC kayması yaşamaz) ----------
    U.today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    U.iso = (d) => {
        const x = new Date(d);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    };
    U.parseDate = (s) => (s instanceof Date ? new Date(s) : new Date(String(s).slice(0, 10) + 'T00:00:00'));
    U.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    U.diffDays = (a, b) => Math.round((U.parseDate(a) - U.parseDate(b)) / 86400000);
    U.date = (d) => d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
    U.dateTime = (d) => d ? new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';
    U.timeAgo = (d) => {
        const s = (Date.now() - new Date(d).getTime()) / 1000;
        if (s < 60) return 'az önce';
        if (s < 3600) return Math.floor(s / 60) + ' dk önce';
        if (s < 86400) return Math.floor(s / 3600) + ' sa önce';
        if (s < 604800) return Math.floor(s / 86400) + ' gün önce';
        return U.date(d);
    };
    /** Pazartesi başlangıçlı hafta başı */
    U.weekStart = (d) => {
        const x = U.parseDate(d); const wd = (x.getDay() + 6) % 7;
        return U.addDays(x, -wd);
    };
    U.isoWeek = (d) => {
        const x = U.parseDate(d);
        x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
        const w1 = new Date(x.getFullYear(), 0, 4);
        return 1 + Math.round(((x - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
    };

    // ---------- Diğer ----------
    U.hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); };
    U.uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    U.debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    U.sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (+f(x) || 0), 0);
    U.groupBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});
    U.$ = (sel, root = document) => root.querySelector(sel);
    U.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    /** jsPDF'in standart fontları Türkçe karakterleri desteklemez → ASCII'ye çevir */
    const TR_MAP = { 'ş': 's', 'Ş': 'S', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I', 'ç': 'c', 'Ç': 'C', 'ö': 'o', 'Ö': 'O', 'ü': 'u', 'Ü': 'U', '₺': 'TL', '³': '3', '²': '2' };
    U.pdfText = (s) => String(s ?? '').replace(/[şŞğĞıİçÇöÖüÜ₺³²]/g, (c) => TR_MAP[c]);

    U.download = (blob, name) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    U.toCSV = (headers, rows) => {
        const cell = (v) => {
            const s = String(v ?? '');
            return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(';')).join('\n');
    };

    MRP.U = U;

    // ======================================================================
    // İKONLAR (basit, bağımlılıksız SVG seti)
    // ======================================================================
    const ICONS = {
        dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
        tree: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/>',
        box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
        calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2"/>',
        factory: '<path d="M2 21V10l6 4V10l6 4V6l8 4v11z"/><path d="M6 17h2M11 17h2M16 17h2"/>',
        cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.2a2 2 0 002 1.6h8.6a2 2 0 002-1.5L22 7H6"/>',
        doc: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
        truck: '<rect x="1" y="5" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
        warehouse: '<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8M7 17h10"/>',
        swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
        chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>',
        shield: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
        bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
        logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
        menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        play: '<path d="M6 4l14 8-14 8z"/>',
        download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
        refresh: '<path d="M21 12a9 9 0 01-15.5 6.2L3 16M3 12a9 9 0 0115.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
        x: '<path d="M18 6L6 18M6 6l12 12"/>',
        check: '<path d="M20 6L9 17l-5-5"/>',
        alert: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
        chevronRight: '<path d="M9 18l6-6-6-6"/>',
        chevronDown: '<path d="M6 9l6 6 6-6"/>',
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
        trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>',
        print: '<path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
        users: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2M16 3.1a4 4 0 010 7.8M22 21v-2a4 4 0 00-3-3.9"/>',
        coin: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9a3 3 0 00-2.8-1.5c-1.7 0-3 1-3 2.3 0 3 6 1.5 6 4.5 0 1.3-1.3 2.3-3 2.3a3 3 0 01-2.8-1.6M12 5.5v2M12 16.6v2"/>',
        gauge: '<path d="M12 14l4-4"/><path d="M3.3 17a10 10 0 1117.4 0"/><circle cx="12" cy="14" r="1.5"/>',
        pie: '<path d="M21.2 15.9A10 10 0 118 2.8"/><path d="M22 12A10 10 0 0012 2v10z"/>',
        upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
        barcode: '<path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14"/>',
        layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>'
    };
    MRP.icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

    // ======================================================================
    // UI: Toast, Modal, Onay, Metin girişi
    // ======================================================================
    const UI = {};

    UI.toast = (title, message = '', type = 'info', duration = 3800) => {
        const host = document.getElementById('toasts');
        if (!host) return;
        const ic = { success: 'check', error: 'x', warn: 'alert', info: 'info' }[type] || 'info';
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.setAttribute('role', 'status');
        el.innerHTML = `${MRP.icon(ic)}<div><b>${U.esc(title)}</b>${message ? `<span>${U.esc(message)}</span>` : ''}</div>
            <button class="x" aria-label="Kapat">${MRP.icon('x', 'sm')}</button>`;
        const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
        el.querySelector('.x').addEventListener('click', close);
        host.appendChild(el);
        setTimeout(close, duration);
    };

    /**
     * Genel modal.
     * @param {object} o  { title, body, size, buttons:[{label, cls, onClick(ctx) → false ise kapanmaz}], onOpen(ctx), onClose }
     */
    UI.modal = (o) => {
        const root = document.getElementById('modalRoot');
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal ${o.size || ''}" role="dialog" aria-modal="true">
                <div class="modal-head"><h2>${U.esc(o.title)}</h2>
                    <button class="btn btn-ghost btn-icon" data-close aria-label="Kapat">${MRP.icon('x')}</button></div>
                <div class="modal-body">${o.body || ''}</div>
                ${o.buttons && o.buttons.length ? '<div class="modal-foot"></div>' : ''}
            </div>`;
        const ctx = {
            el: overlay,
            body: overlay.querySelector('.modal-body'),
            $: (s) => overlay.querySelector(s),
            $$: (s) => [...overlay.querySelectorAll(s)],
            close: () => {
                overlay.remove();
                document.removeEventListener('keydown', onKey);
                if (o.onClose) o.onClose();
            }
        };
        const onKey = (e) => { if (e.key === 'Escape' && root.lastElementChild === overlay) ctx.close(); };
        document.addEventListener('keydown', onKey);
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) ctx.close(); });
        overlay.querySelector('[data-close]').addEventListener('click', ctx.close);
        const foot = overlay.querySelector('.modal-foot');
        (o.buttons || []).forEach((b) => {
            const btn = document.createElement('button');
            btn.className = `btn ${b.cls || 'btn-secondary'}`;
            btn.innerHTML = (b.icon ? MRP.icon(b.icon) : '') + U.esc(b.label);
            btn.addEventListener('click', async () => {
                if (!b.onClick) return ctx.close();
                btn.disabled = true;
                try {
                    const r = await b.onClick(ctx);
                    if (r !== false) ctx.close();
                } finally { btn.disabled = false; }
            });
            foot.appendChild(btn);
        });
        root.appendChild(overlay);
        if (o.onOpen) o.onOpen(ctx);
        const first = overlay.querySelector('input:not([readonly]), select, textarea');
        if (first) setTimeout(() => first.focus(), 30);
        return ctx;
    };

    UI.confirm = (message, { title = 'Onay', okLabel = 'Onayla', danger = false } = {}) => new Promise((resolve) => {
        let result = false;
        UI.modal({
            title, size: 'sm',
            body: `<p>${U.esc(message)}</p>`,
            onClose: () => resolve(result),
            buttons: [
                { label: 'Vazgeç' },
                { label: okLabel, cls: danger ? 'btn-danger' : 'btn-primary', onClick: () => { result = true; } }
            ]
        });
    });

    UI.promptText = ({ title, label, placeholder = '', required = false, multiline = true, okLabel = 'Kaydet' }) => new Promise((resolve) => {
        let result = null;
        UI.modal({
            title, size: 'sm',
            body: `<div class="field"><label>${U.esc(label)}${required ? ' <span class="req">*</span>' : ''}</label>
                ${multiline ? `<textarea id="pt" placeholder="${U.esc(placeholder)}"></textarea>` : `<input id="pt" placeholder="${U.esc(placeholder)}">`}</div>`,
            onClose: () => resolve(result),
            buttons: [
                { label: 'Vazgeç' },
                {
                    label: okLabel, cls: 'btn-primary', onClick: (ctx) => {
                        const v = ctx.$('#pt').value.trim();
                        if (required && !v) { UI.toast('Bu alan zorunludur', '', 'warn'); return false; }
                        result = v;
                    }
                }
            ]
        });
    });

    MRP.UI = UI;
})(window.MRP);
