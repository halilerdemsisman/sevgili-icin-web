/* ==========================================================================
   MRP Pro — Depo: Stok durumu, sayım düzeltme, stok hareketleri
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;

    const stockState = { tab: 'all', q: '' };

    MRP.views.stock = {
        title: 'Stok Durumu',
        subtitle: 'Eldeki stok, emniyet stoğu, açık sipariş ve stok değeri',
        render() {
            const stocked = M.items().filter((i) => i.procurement !== 'service');
            const status = (i) => M.stockStatus(i.kod);
            const fg = M.products().filter((p) => M.onHand(p.kod) !== 0);
            const tabs = [['all', 'Tüm malzemeler', stocked.length], ['critical', 'Kritik', stocked.filter((i) => status(i) === 'critical').length],
                ['warn', 'Düşük', stocked.filter((i) => status(i) === 'warn').length], ['ok', 'Normal', stocked.filter((i) => status(i) === 'ok').length], ['fg', 'Mamul stoğu', fg.length]];
            const q = stockState.q.toLocaleLowerCase('tr');
            const match = (x) => !q || x.kod.toLocaleLowerCase('tr').includes(q) || x.ad.toLocaleLowerCase('tr').includes(q);
            const canAdj = MRP.auth.can('adjustStock');

            let html = `<div class="kpis">
                ${H.kpi('Stok Değeri', U.compactCur(M.stockValue()), 'Standart maliyetle', '')}
                ${H.kpi('Stoklu Kalem', stocked.length, `${fg.length} mamul stokta`, 'blue')}
                ${H.kpi('Kritik', tabs[1][2], 'Emniyet stoğunun %50 altı', tabs[1][2] ? 'red' : 'green')}
                ${H.kpi('Düşük', tabs[2][2], 'Emniyet stoğunun altı', tabs[2][2] ? 'violet' : 'green')}
            </div>${H.tabs(tabs, stockState.tab, 'stockTab')}
            <div class="toolbar"><input class="input" id="stockSearch" placeholder="Kod veya ad ile ara…" value="${esc(stockState.q)}" data-input="stockSearch"></div>`;

            if (stockState.tab === 'fg') {
                const list = fg.filter(match);
                return html + `<section class="card"><div class="table-wrap"><table><thead><tr><th>Mamul</th><th>Ad</th><th>Kategori</th><th class="num">Stok</th><th class="num">Birim Maliyet</th><th class="num">Değer ₺</th><th></th></tr></thead><tbody>
                    ${list.map((p) => `<tr><td>${H.productLink(p.kod)}</td><td class="strong">${esc(p.ad)}</td><td>${H.catTag(p.kategori)}</td><td class="num">${esc(U.qty(M.onHand(p.kod), 'ad'))}</td>
                        <td class="num">${U.num(M.unitCost(p.kod))}</td><td class="num">${U.num(M.onHand(p.kod) * M.unitCost(p.kod))}</td>
                        <td>${canAdj ? `<button class="btn btn-ghost btn-sm" data-act="stockAdjust" data-id="${esc(p.kod)}">Düzelt</button>` : ''}</td></tr>`).join('')
                    || `<tr><td colspan="7">${H.empty('Mamul stoğu yok', 'Tamamlanan iş emirleri mamul stoğu oluşturur.')}</td></tr>`}</tbody></table></div></section>`;
            }

            const ord = { critical: 0, warn: 1, ok: 2, na: 3 };
            const list = stocked.filter((i) => (stockState.tab === 'all' || status(i) === stockState.tab) && match(i))
                .sort((a, b) => ord[status(a)] - ord[status(b)] || a.kod.localeCompare(b.kod));
            html += `<section class="card"><div class="table-wrap"><table>
                <thead><tr><th>Kod</th><th>Malzeme</th><th>Tür</th><th class="num">Eldeki</th><th class="num">Emniyet</th><th class="num">Siparişte</th>
                    <th>Doluluk</th><th>Durum</th><th class="num">Değer ₺</th><th></th></tr></thead>
                <tbody>${list.map((i) => {
                    const s = status(i);
                    const oh = M.onHand(i.kod);
                    const fill = i.safetyStock > 0 ? Math.min(100, oh / (i.safetyStock * 2) * 100) : 100;
                    const color = s === 'critical' ? 'var(--red)' : s === 'warn' ? 'var(--amber)' : 'var(--green)';
                    return `<tr class="${s === 'critical' ? 'r-crit' : s === 'warn' ? 'r-warn' : ''}">
                        <td>${H.itemLink(i.kod)}</td><td class="strong">${esc(i.ad)}</td><td><span class="badge badge-gray plain">${esc(i.tur)}</span></td>
                        <td class="num strong">${esc(U.qty(oh, i.unit))}</td><td class="num">${esc(U.qty(i.safetyStock, i.unit))}</td>
                        <td class="num">${esc(U.qty(M.onOrder(i.kod), i.unit))}</td>
                        <td><span class="bar"><span style="width:${Math.max(0, fill)}%;background:${color};"></span></span></td>
                        <td>${H.stockBadge(s)}</td><td class="num">${U.num(Math.max(0, oh) * M.unitCost(i.kod))}</td>
                        <td>${canAdj ? `<button class="btn btn-ghost btn-sm" data-act="stockAdjust" data-id="${esc(i.kod)}">Düzelt</button>` : ''}</td></tr>`;
                }).join('') || `<tr><td colspan="10">${H.empty('Kayıt yok')}</td></tr>`}</tbody></table></div></section>
                <p class="muted" style="font-size:.78em;margin-top:10px;">Eksik malzemeler için sipariş, MRP çalıştırıldığında emniyet stoğu tamamlama önerisi olarak otomatik oluşturulur.</p>`;
            return html;
        },
        after() {
            const el = document.getElementById('stockSearch');
            if (el && stockState.q) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }
    };

    function adjust(kod) {
        if (!H.guard('adjustStock')) return;
        const it = M.item(kod);
        const cur = M.onHand(kod);
        UI.modal({
            title: `Sayım Düzeltme — ${kod}`, size: 'sm',
            body: `<p style="margin-bottom:14px;">${esc(it.ad)}</p>
                <div class="form-grid">
                    <div class="field"><label>Sistem stoğu</label><input value="${esc(U.qty(cur, it.unit))}" readonly></div>
                    <div class="field"><label>Sayılan miktar (${esc(it.unit)}) <span class="req">*</span></label><input id="adjQty" type="number" min="0" step="any" value="${cur}"></div>
                    <div class="field full"><label>Gerekçe <span class="req">*</span></label><input id="adjNote" placeholder="Yıl sonu sayımı, fire, hasar…"></div>
                </div><p class="hint" id="adjDiff" style="margin-top:10px;font-size:.84em;"></p>`,
            onOpen: (ctx) => {
                const upd = () => { const d = U.toNum(ctx.$('#adjQty').value) - cur; ctx.$('#adjDiff').textContent = `Fark: ${d > 0 ? '+' : ''}${U.qty(d, it.unit)} · ${U.cur(d * M.unitCost(kod))}`; };
                ctx.$('#adjQty').addEventListener('input', upd); upd();
            },
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const v = U.toNum(ctx.$('#adjQty').value, NaN);
                    const note = ctx.$('#adjNote').value.trim();
                    if (!isFinite(v) || v < 0) { UI.toast('Geçersiz miktar', '', 'warn'); return false; }
                    if (!note) { UI.toast('Gerekçe zorunlu', 'Denetim için düzeltme gerekçesi girin.', 'warn'); return false; }
                    const d = U.round(v - cur, 3);
                    if (!d) return;
                    M.move({ kod, qty: d, type: 'ADJ', ref: 'SAYIM', note });
                    MRP.store.audit('Stok düzeltme', `${kod}: ${U.qty(cur)} → ${U.qty(v)} (${note})`);
                    app().commit();
                    UI.toast('Stok güncellendi', `${kod}: ${U.qty(v, it.unit)}`, 'success');
                }
            }]
        });
    }

    const rerender = U.debounce(() => app().render(), 250);
    Object.assign(MRP.actions, {
        stockTab: (t) => { stockState.tab = t; app().render(); },
        stockSearch: (v) => { stockState.q = v; rerender(); },
        stockAdjust: (kod) => adjust(kod)
    });

    // =====================================================================
    // STOK HAREKETLERİ
    // =====================================================================
    const mvState = { type: 'all', q: '', page: 1, size: 100 };

    MRP.views.movements = {
        title: 'Stok Hareketleri',
        subtitle: 'Mal kabul, üretime sarf, üretimden giriş ve sayım düzeltmeleri',
        render() {
            const q = mvState.q.toLocaleLowerCase('tr');
            let list = S().movements.slice().reverse();
            if (mvState.type !== 'all') list = list.filter((m) => m.type === mvState.type);
            if (q) list = list.filter((m) => m.kod.toLocaleLowerCase('tr').includes(q) || (m.ref || '').toLocaleLowerCase('tr').includes(q) || ((M.item(m.kod) || {}).ad || '').toLocaleLowerCase('tr').includes(q));
            const pages = Math.max(1, Math.ceil(list.length / mvState.size));
            mvState.page = Math.min(mvState.page, pages);
            const page = list.slice((mvState.page - 1) * mvState.size, mvState.page * mvState.size);
            return `<div class="toolbar">
                    <select class="input" data-change="mvType"><option value="all">Tüm hareketler</option>${Object.entries(M.MOVE_TYPES).map(([k, v]) => `<option value="${k}" ${mvState.type === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>
                    <input class="input" id="mvSearch" placeholder="Kod, ad veya belge no…" value="${esc(mvState.q)}" data-input="mvSearch">
                </div>
                <section class="card"><div class="table-wrap"><table>
                    <thead><tr><th>Hareket No</th><th>Tarih</th><th>Kod</th><th>Kalem</th><th>Tür</th><th class="num">Miktar</th><th class="num">Bakiye</th><th class="num">Değer ₺</th><th>Belge</th><th>Kullanıcı</th><th>Açıklama</th></tr></thead>
                    <tbody>${page.map((m) => {
                        const it = M.item(m.kod) || { ad: '?', unit: '' };
                        return `<tr><td class="mono">${esc(m.id)}</td><td class="nowrap">${esc(U.dateTime(m.at))}</td><td>${H.anyLink(m.kod)}</td><td>${esc(it.ad)}</td>
                            <td><span class="badge ${M.MOVE_TYPES[m.type].badge}">${esc(M.MOVE_TYPES[m.type].label)}</span></td>
                            <td class="num ${m.qty < 0 ? 'tp-neg' : 'tp-pos'}">${m.qty > 0 ? '+' : ''}${esc(U.qty(m.qty, it.unit))}</td>
                            <td class="num">${esc(U.qty(m.balance))}</td><td class="num">${U.num(m.value)}</td>
                            <td class="mono">${esc(m.ref)}</td><td>${esc(m.user)}</td><td class="muted">${esc(m.note)}</td></tr>`;
                    }).join('') || `<tr><td colspan="11">${H.empty('Hareket bulunamadı')}</td></tr>`}</tbody>
                </table></div>${H.pager(list.length, mvState.page, mvState.size, 'mvPage')}</section>`;
        },
        after() {
            const el = document.getElementById('mvSearch');
            if (el && mvState.q) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }
    };
    const rerenderMv = U.debounce(() => app().render(), 250);
    Object.assign(MRP.actions, {
        mvType: (v) => { mvState.type = v; mvState.page = 1; app().render(); },
        mvSearch: (v) => { mvState.q = v; mvState.page = 1; rerenderMv(); },
        mvPage: (p) => { mvState.page = +p; app().render(); }
    });
})(window.MRP);
