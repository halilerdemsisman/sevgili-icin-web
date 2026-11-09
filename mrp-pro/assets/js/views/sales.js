/* ==========================================================================
   MRP Pro — Satış Siparişleri (ERP'den gelen müşteri siparişleri)
   --------------------------------------------------------------------------
   Akış: sipariş ERP'de açılır → ERP kaydı salesOrders koleksiyonuna yazar →
   MRP Pro birkaç saniye içinde çeker, planlamaya bildirim düşer → sevk
   bekleyen miktar MRP'de bağımsız talep olur (ayrıca ana plana girilmez).
   Sipariş değişikliği / iptali / sevkiyatı ERP'de yapılır; MRP bir sonraki
   çalıştırmada yeni miktarlarla planlar.
   Bağımsız modda (ERP yokken) sipariş bu ekrandan elle girilebilir.
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;
    const erp = () => MRP.config.erp;

    const sState = { tab: 'open', q: '' };
    const OPEN = ['open', 'partial'];
    const list = () => S().salesOrders || [];
    const find = (no) => list().find((o) => o.no === no);
    const canEdit = () => !erp() && MRP.auth.can('runMRP');

    /** Son MRP çalıştırmasından sonra gelen / değişen (kapanan ve iptaller dahil) siparişler */
    const unplanned = () => {
        const run = S().lastRun;
        if (!run) return list().filter((o) => OPEN.includes(o.status));
        return list().filter((o) => (o.updatedAt || o.receivedAt || '') > run.runAt);
    };
    const remaining = (l) => Math.max(0, U.round((+l.qty || 0) - (+l.shipped || 0), 4));
    const lineDue = (o, l) => l.dueDate || o.dueDate;

    function coverBadge(c, due) {
        if (!c) return '<span class="muted">–</span>';
        const d = (iso) => U.date(U.parseDate(iso)).slice(0, 5);
        const seen = new Set();
        const src = c.from.filter((f) => f.src !== 'Stok' && !seen.has(f.src) && seen.add(f.src))
            .map((f) => `<button class="link mono" data-act="woDetail" data-id="${esc(f.src)}" title="${f.linked ? 'Siparişe bağlı iş emri' : 'Bağlı değil — serbest iş emri miktarından'}">${esc(f.src)}</button>${f.linked ? '' : '<sup class="muted" title="Siparişe bağlı değil">*</sup>'}`);
        switch (c.state) {
            case 'stock': return `<span class="badge badge-green">Stoktan karşılanır</span>${c.from.some((f) => f.wo) ? ` <span class="muted">${esc([...new Set(c.from.filter((f) => f.wo).map((f) => f.wo))].join(', '))} üretti</span>` : ''}`;
            case 'wo': return `<span class="badge badge-blue">İş emri · ${esc(d(c.readyDate))}</span> ${src.join(', ')}`;
            case 'late': return `<span class="badge badge-red">Geç · hazır ${esc(d(c.readyDate))}</span> ${src.join(', ')} <span class="muted">· termin ${esc(d(due))}</span>`;
            default: return `<span class="badge badge-amber">Planlanmadı · ${esc(U.qty(c.uncovered, 'ad'))}</span>${c.from.length ? ` <span class="muted">kısmen</span> ${src.join(', ') || 'stok'}` : ''}`;
        }
    }

    MRP.views.sales = {
        title: 'Satış Siparişleri',
        subtitle: 'ERP\'de açılan müşteri siparişleri — sevk bekleyen miktar MRP\'ye otomatik talep olarak girer',
        render() {
            const all = list();
            const cov = M.soCoverage();
            const lines = M.salesLines();
            const today = U.iso(U.today());
            const st = { stock: 0, wo: 0, late: 0, open: 0 };
            lines.forEach((x) => { const c = cov.get(x.key); if (c) st[c.state]++; });
            const overdue = lines.filter((x) => x.dueDate < today);
            const fresh = unplanned();
            const canRun = MRP.auth.can('runMRP');

            let html = '';
            if (fresh.length) {
                html += H.banner('blue', 'info', `${fresh.length} sipariş henüz MRP'ye yansımadı`,
                    `Son MRP çalıştırmasından sonra gelen veya değişen: ${fresh.slice(0, 5).map((o) => `${o.no} (${o.customer})`).join(', ')}${fresh.length > 5 ? '…' : ''}`,
                    canRun ? `<button class="btn btn-primary btn-sm" data-act="soRunMRP">${MRP.icon('play', 'sm')} MRP'yi çalıştır</button>` : '');
            }

            html += `<div class="kpis">
                ${H.kpi('Açık Sipariş', all.filter((o) => OPEN.includes(o.status)).length, `${lines.length} satır · ${U.qty(U.sum(lines, (x) => x.remaining), 'ad')} sevk bekliyor`, 'blue')}
                ${H.kpi('Stoktan / İş Emriyle', `${st.stock} / ${st.wo}`, 'Zamanında karşılanan satır', 'green')}
                ${H.kpi('Termin Riski', st.late, 'İş emri termin sonrasında bitiyor', st.late ? 'red' : 'green')}
                ${H.kpi('Planlanmamış', st.open, st.open ? 'MRP çalıştırıp iş emri açın' : 'Tüm satırlar karşılanıyor', st.open ? 'amber' : 'green')}
                ${H.kpi('Termini Geçmiş', overdue.length, 'Sevk edilmemiş satır', overdue.length ? 'red' : 'green')}
            </div>`;

            const tabs = [['open', 'Açık', all.filter((o) => OPEN.includes(o.status)).length], ['closed', 'Kapanan / İptal', all.filter((o) => !OPEN.includes(o.status)).length], ['all', 'Tümü', all.length]];
            html += H.tabs(tabs, sState.tab, 'soTab');
            html += `<div class="toolbar">
                <input class="input" id="soSearch" placeholder="Sipariş no, müşteri, ERP no veya mamul…" value="${esc(sState.q)}" data-input="soSearch">
                <span class="spacer"></span>
                ${erp() ? '<span class="muted" style="font-size:12px;">Yeni sipariş, değişiklik, iptal ve sevkiyat ERP\'de yapılır; birkaç saniye içinde buraya yansır.</span>' : ''}
                ${canEdit() ? `<button class="btn btn-primary" data-act="soNew">${MRP.icon('plus')} Sipariş Ekle</button>` : ''}
            </div>`;

            let orders = all.filter((o) => (sState.tab === 'all' ? true : sState.tab === 'open' ? OPEN.includes(o.status) : !OPEN.includes(o.status)));
            const q = sState.q.trim().toLocaleLowerCase('tr');
            if (q) orders = orders.filter((o) => [o.no, o.customer, o.erpRef, ...(o.lines || []).map((l) => l.kod), ...(o.lines || []).map((l) => (M.product(l.kod) || {}).ad || '')]
                .some((v) => String(v || '').toLocaleLowerCase('tr').includes(q)));
            orders = orders.slice().sort((a, b) => {
                const da = Math.min(...(a.lines || []).map((l) => +U.parseDate(lineDue(a, l)) || Infinity));
                const db = Math.min(...(b.lines || []).map((l) => +U.parseDate(lineDue(b, l)) || Infinity));
                return OPEN.includes(a.status) === OPEN.includes(b.status) ? da - db : OPEN.includes(a.status) ? -1 : 1;
            });

            const freshSet = new Set(fresh.map((o) => o.no));
            const rows = [];
            orders.forEach((o) => (o.lines || []).forEach((l, i) => {
                const p = M.product(l.kod);
                const due = lineDue(o, l);
                const rem = remaining(l);
                const open = OPEN.includes(o.status) && rem > 0;
                const late = open && due < today;
                rows.push(`<tr class="${late ? 'r-crit' : ''}">
                    <td class="nowrap">${i === 0 ? `<button class="link mono" data-act="soDetail" data-id="${esc(o.no)}">${esc(o.no)}</button>${freshSet.has(o.no) ? ' <span class="badge badge-blue">Yeni</span>' : ''}` : ''}</td>
                    <td>${i === 0 ? `<span class="strong">${esc(o.customer)}</span>${o.erpRef ? `<div class="muted mono">${esc(o.erpRef)}</div>` : ''}` : ''}</td>
                    <td>${p ? H.productLink(l.kod) : `<span class="mono">${esc(l.kod)}</span> <span class="badge badge-red">Tanımsız</span>`}<div class="muted">${esc(p ? p.ad : '')}</div></td>
                    <td class="num">${esc(U.qty(l.qty, 'ad'))}</td>
                    <td class="num">${l.shipped ? esc(U.qty(l.shipped, 'ad')) : '<span class="muted">–</span>'}</td>
                    <td class="num strong">${open ? esc(U.qty(rem, 'ad')) : '<span class="muted">–</span>'}</td>
                    <td class="nowrap">${esc(U.date(U.parseDate(due)))} ${late ? '<span class="badge badge-red">Geçti</span>' : ''}</td>
                    <td>${open ? coverBadge(cov.get(`${o.no}/${l.line}`), due) : '<span class="muted">–</span>'}</td>
                    <td>${i === 0 ? H.badge(M.SO_STATUS, o.status) : ''}</td></tr>`);
            }));
            html += `<section class="card"><div class="table-wrap"><table>
                <thead><tr><th>Sipariş</th><th>Müşteri</th><th>Mamul</th><th class="num">Miktar</th><th class="num">Sevk</th><th class="num">Kalan</th><th>Termin</th><th>Karşılama</th><th>Durum</th></tr></thead>
                <tbody>${rows.join('') || `<tr><td colspan="9">${H.empty('Sipariş yok', erp() ? 'ERP\'de açılan satış siparişleri burada görünür.' : 'ERP bağlantısı yokken siparişi "Sipariş Ekle" ile girebilirsiniz.')}</td></tr>`}</tbody>
            </table></div></section>
            <p class="muted" style="margin-top:8px;font-size:12px;">Karşılama: açık satırlar termin sırasıyla önce eldeki mamul stoğundan, sonra açık iş emirlerinden (bitiş tarihine göre) pay alır. "Planlanmadı" satırlar için MRP'yi çalıştırıp önerilen iş emrini açın.</p>`;
            return html;
        },
        after() {
            const el = U.$('#soSearch');
            if (el && sState.focus) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); sState.focus = false; }
        }
    };

    function detail(no) {
        const o = find(no);
        if (!o) return;
        const cov = M.soCoverage();
        const open = OPEN.includes(o.status);
        UI.modal({
            title: `Satış Siparişi — ${o.no}`, size: 'lg',
            body: `<div class="form-grid">
                <div class="field"><label>Müşteri</label><div class="strong">${esc(o.customer)}</div></div>
                <div class="field"><label>Durum</label><div>${H.badge(M.SO_STATUS, o.status)}</div></div>
                <div class="field"><label>ERP sipariş no</label><div class="mono">${esc(o.erpRef || '–')}</div></div>
                <div class="field"><label>Sipariş tarihi</label><div>${esc(o.orderDate ? U.date(U.parseDate(o.orderDate)) : '–')}</div></div>
                <div class="field"><label>Kaynak</label><div>${o.source === 'erp' ? 'ERP' : 'Elle giriş'} · ${esc(o.receivedAt ? U.dateTime(o.receivedAt) : '')}</div></div>
                <div class="field"><label>Son değişiklik</label><div>${esc(o.updatedAt ? U.dateTime(o.updatedAt) : '–')}</div></div>
                ${o.note ? `<div class="field full"><label>Açıklama</label><div>${esc(o.note)}</div></div>` : ''}
            </div>
            <div class="table-wrap" style="margin-top:12px;"><table>
                <thead><tr><th>#</th><th>Mamul</th><th class="num">Miktar</th><th class="num">Sevk</th><th class="num">Kalan</th><th>Termin</th><th>Karşılama</th><th>Bağlı iş emirleri</th></tr></thead>
                <tbody>${(o.lines || []).map((l) => {
                    const c = open ? cov.get(`${o.no}/${l.line}`) : null;
                    const p = M.product(l.kod);
                    return `<tr><td>${l.line}</td><td><span class="mono">${esc(l.kod)}</span><div class="muted">${esc(p ? p.ad : 'Tanımsız mamul')}</div></td>
                        <td class="num">${esc(U.qty(l.qty, 'ad'))}</td><td class="num">${esc(U.qty(l.shipped || 0, 'ad'))}</td><td class="num strong">${esc(U.qty(remaining(l), 'ad'))}</td>
                        <td class="nowrap">${esc(U.date(U.parseDate(lineDue(o, l))))}</td>
                        <td>${c ? coverBadge(c, lineDue(o, l)) + (c.from.length ? `<div class="muted" style="font-size:12px;">${c.from.map((f) => `${esc(f.src)}: ${esc(U.qty(f.qty, 'ad'))}${f.src !== 'Stok' ? ` (${esc(U.date(U.parseDate(f.date)))})` : ''}`).join(' · ')}</div>` : '') : '<span class="muted">–</span>'}</td>
                        <td>${linkedCell(`${o.no}/${l.line}`, c, l)}</td></tr>`;
                }).join('')}</tbody>
            </table></div>`,
            buttons: [
                ...(canEdit() && open ? [
                    { label: 'İptal et', cls: 'btn-danger', onClick: () => { UI.confirm(`${o.no} (${o.customer}) iptal edilecek; MRP bu talebi artık planlamaz.`, { title: 'Siparişi iptal et', okLabel: 'İptal et', danger: true }).then((y) => { if (y) setStatus(o, 'cancelled'); }); } },
                    { label: 'Sevk edildi — kapat', cls: 'btn-secondary', onClick: () => { setStatus(o, 'closed'); } }
                ] : []),
                { label: 'Kapat', cls: 'btn-primary' }
            ]
        });
    }

    /** Satıra bağlı iş emirleri + karşılanmayan miktar için "İş emri aç" */
    function linkedCell(key, c, l) {
        const links = M.soLinkedWOs(key);
        const html = links.map(({ w, qty }) => `<div class="nowrap"><button class="link mono" data-act="woDetail" data-id="${esc(w.no)}">${esc(w.no)}</button> ${H.badge(H.WO_STATUS, w.status)} <span class="muted">${esc(U.qty(qty, 'ad'))}</span></div>`).join('');
        const make = c && c.uncovered > 0 && MRP.auth.can('manageWO') && (M.item(l.kod) || {}).procurement === 'make';
        return (html || (make ? '' : '<span class="muted">–</span>'))
            + (make ? `<button class="btn btn-secondary btn-sm" data-act="soMakeWO" data-id="${esc(key)}" style="margin-top:4px;">${MRP.icon('factory', 'sm')} İş emri aç (${esc(U.qty(Math.ceil(c.uncovered), 'ad'))})</button>` : '');
    }

    function setStatus(o, status) {
        if (!H.guard('runMRP')) return false;
        o.status = status;
        if (status === 'closed') o.lines.forEach((l) => { l.shipped = l.qty; });
        o.updatedAt = new Date().toISOString();
        MRP.store.audit(status === 'closed' ? 'Satış siparişi kapatıldı' : 'Satış siparişi iptal edildi', `${o.no} (${o.customer})`);
        app().commit();
        UI.toast(status === 'closed' ? 'Sipariş kapatıldı' : 'Sipariş iptal edildi', 'MRP bir sonraki çalıştırmada bu talebi dikkate almaz.', 'info');
    }

    function lineRow(i, l = {}) {
        return `<tr data-line="${i}">
            <td><input class="so-kod" list="soProducts" value="${esc(l.kod || '')}" autocomplete="off" placeholder="Mamul kodu"><div class="muted so-ad" style="font-size:12px;"></div></td>
            <td><input class="so-qty" type="number" min="1" step="1" value="${l.qty || ''}" style="width:90px;"></td>
            <td><input class="so-due" type="date" value="${esc(l.dueDate || U.iso(U.addDays(U.today(), 21)))}"></td>
            <td><button type="button" class="btn btn-ghost btn-sm so-del" title="Satırı sil">${MRP.icon('trash', 'sm')}</button></td></tr>`;
    }

    function newOrder() {
        if (!H.guard('runMRP')) return;
        UI.modal({
            title: 'Satış Siparişi Ekle', size: 'lg',
            body: `<datalist id="soProducts">${M.products().map((p) => `<option value="${esc(p.kod)}">${esc(p.ad)}</option>`).join('')}</datalist>
                <div class="form-grid">
                    <div class="field"><label>Müşteri <span class="req">*</span></label><input id="soCust" autocomplete="off"></div>
                    <div class="field"><label>ERP / müşteri sipariş no</label><input id="soRef" autocomplete="off"></div>
                    <div class="field"><label>Sipariş tarihi</label><input id="soDate" type="date" value="${esc(U.iso(U.today()))}"></div>
                    <div class="field"><label>Açıklama</label><input id="soNote"></div>
                </div>
                <div class="table-wrap" style="margin-top:12px;"><table>
                    <thead><tr><th>Mamul</th><th>Miktar</th><th>Termin</th><th></th></tr></thead>
                    <tbody id="soLines">${lineRow(0)}</tbody>
                </table></div>
                <button type="button" class="btn btn-secondary btn-sm" id="soAddLine" style="margin-top:8px;">${MRP.icon('plus', 'sm')} Satır ekle</button>`,
            onOpen: (ctx) => {
                const body = ctx.$('#soLines');
                let n = 1;
                const bind = () => ctx.$$('#soLines tr').forEach((tr) => {
                    const inp = tr.querySelector('.so-kod');
                    const upd = () => { const p = M.product(inp.value.trim()); tr.querySelector('.so-ad').textContent = p ? p.ad : ''; };
                    inp.oninput = upd; upd();
                    tr.querySelector('.so-del').onclick = () => { if (ctx.$$('#soLines tr').length > 1) tr.remove(); };
                });
                ctx.$('#soAddLine').addEventListener('click', () => { body.insertAdjacentHTML('beforeend', lineRow(n++)); bind(); });
                bind();
                ctx.$('#soCust').focus();
            },
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const customer = ctx.$('#soCust').value.trim();
                    if (!customer) { UI.toast('Müşteri gerekli', '', 'warn'); return false; }
                    const lines = [];
                    for (const tr of ctx.$$('#soLines tr')) {
                        const kod = tr.querySelector('.so-kod').value.trim();
                        const qty = Math.round(U.toNum(tr.querySelector('.so-qty').value));
                        const dueDate = tr.querySelector('.so-due').value;
                        if (!kod && !qty) continue;
                        if (!M.product(kod)) { UI.toast('Geçersiz mamul', `${kod || '(boş)'} — listeden bir mamul seçin.`, 'warn'); return false; }
                        if (!(qty > 0)) { UI.toast('Geçersiz miktar', kod, 'warn'); return false; }
                        if (!dueDate) { UI.toast('Termin gerekli', kod, 'warn'); return false; }
                        lines.push({ line: lines.length + 1, kod, qty, shipped: 0, dueDate });
                    }
                    if (!lines.length) { UI.toast('En az bir satır girin', '', 'warn'); return false; }
                    const at = new Date().toISOString();
                    const o = { no: MRP.store.nextNo('SS'), erpRef: ctx.$('#soRef').value.trim(), customer, orderDate: ctx.$('#soDate').value || U.iso(U.today()),
                        status: 'open', note: ctx.$('#soNote').value.trim(), source: 'manual', receivedAt: at, updatedAt: at, lines };
                    S().salesOrders.unshift(o);
                    MRP.store.audit('Satış siparişi eklendi', `${o.no}: ${customer} · ${lines.map((l) => `${l.kod} × ${l.qty}`).join(', ')}`);
                    MRP.store.notify('sales', 'Yeni satış siparişi', `${o.no} · ${customer} · ${lines.length} satır`, ['perm:runMRP', 'perm:manageWO'], 'sales');
                    app().commit();
                    UI.toast('Sipariş eklendi', 'MRP\'yi çalıştırdığınızda talep olarak planlanır.', 'success');
                }
            }]
        });
    }

    let searchTimer = null;
    Object.assign(MRP.actions, {
        soTab: (id) => { sState.tab = id; app().render(); },
        soSearch: (v) => { sState.q = v; clearTimeout(searchTimer); searchTimer = setTimeout(() => { sState.focus = true; app().render(); }, 200); },
        soDetail: (id) => detail(id),
        soMakeWO: (key, el) => {
            const wo = MRP.planning.woForSalesLine(key);
            if (!wo) return;
            const ov = el.closest('.modal-overlay, .overlay, [class*="overlay"]');
            const x = ov && ov.querySelector('[data-close]');
            if (x) x.click();
            detail(key.split('/')[0]);
        },
        soNew: () => newOrder(),
        soRunMRP: () => { if (MRP.actions.runMRP) MRP.actions.runMRP(); }
    });

    MRP.sales = { newCount: () => unplanned().length, unplanned };
})(window.MRP);
