/* ==========================================================================
   MRP Pro — Gösterge Paneli
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;

    const openPOValue = () => U.sum(S().pos.filter((p) => p.status === 'open' || p.status === 'partial'),
        (p) => U.sum(p.lines, (l) => Math.max(0, l.qty - (l.received || 0)) * l.price * (1 - l.disc / 100) * (1 + l.vat / 100)));

    MRP.views.dashboard = {
        title: 'Gösterge Paneli',
        subtitle: 'Planlama, satın alma ve stok durumunun özeti',
        render() {
            const st = S();
            const items = M.items().filter((i) => i.procurement !== 'service');
            const crit = items.filter((i) => M.stockStatus(i.kod) === 'critical');
            const warn = items.filter((i) => M.stockStatus(i.kod) === 'warn');
            const run = st.lastRun;
            const activeWO = st.workOrders.filter((w) => w.status === 'planned' || w.status === 'released').length;
            const pendingReq = st.requests.filter((r) => r.status === 'pending');

            let html = '';
            if (!run) {
                html += H.banner('blue', 'info', 'MRP henüz çalıştırılmadı', 'Ana üretim planına göre malzeme ihtiyaçlarını hesaplamak için MRP\'yi çalıştırın.',
                    MRP.auth.canView('mrp') ? '<button class="btn btn-primary btn-sm" data-act="go" data-id="mrp">MRP\'ye git</button>' : '');
            } else if (run.summary.critical > 0) {
                html += H.banner('red', 'alert', `${run.summary.critical} kritik MRP istisnası`, `Son çalıştırma: ${U.dateTime(run.runAt)} — gecikmiş salım veya karşılanamayan talepler var.`,
                    MRP.auth.canView('mrp') ? '<button class="btn btn-danger btn-sm" data-act="go" data-id="mrp">İncele</button>' : '');
            }
            if (crit.length) {
                html += H.banner('amber', 'warehouse', `${crit.length} malzeme emniyet stoğunun yarısının altında`, crit.slice(0, 6).map((i) => i.kod).join(', ') + (crit.length > 6 ? '…' : ''),
                    MRP.auth.canView('stock') ? '<button class="btn btn-secondary btn-sm" data-act="go" data-id="stock">Stok durumu</button>' : '');
            }

            html += `<div class="kpis">
                ${H.kpi('Mamul', M.products().length.toLocaleString('tr-TR'), `${st.customProducts.length} özel ürün`, 'blue')}
                ${H.kpi('Malzeme Kartı', M.items().length, `${items.length} stoklu kalem`, 'cyan')}
                ${H.kpi('Stok Değeri', U.compactCur(M.stockValue()), 'Standart maliyetle', '')}
                ${H.kpi('Kritik / Düşük Stok', `${crit.length} / ${warn.length}`, 'Emniyet stoğuna göre', crit.length ? 'red' : 'green')}
                ${H.kpi('Onay Bekleyen Talep', pendingReq.length, U.cur(U.sum(pendingReq, (r) => r.total)), 'violet')}
                ${H.kpi('Açık Sipariş Bakiyesi', U.compactCur(openPOValue()), `${st.pos.filter((p) => p.status === 'open' || p.status === 'partial').length} PO (KDV dahil)`, 'blue')}
                ${H.kpi('Aktif İş Emri', activeWO, `${st.workOrders.filter((w) => w.status === 'completed').length} tamamlandı`, 'green')}
                ${H.kpi('MRP Önerisi', run ? run.planned.length : '–', run ? `${run.summary.late} geç salım` : 'Çalıştırılmadı', run && run.summary.late ? 'red' : '')}
            </div>`;

            html += `<div class="grid grid-2">
                ${H.card('Planlı sipariş salımları', 'Son MRP çalıştırmasına göre önümüzdeki 8 hafta (₺)', '<div class="card-body"><div class="chart-box"><canvas id="chRelease"></canvas></div></div>')}
                ${H.card('Stok sağlığı', 'Stoklu malzemelerin emniyet stoğuna göre durumu', '<div class="card-body"><div class="chart-box"><canvas id="chHealth"></canvas></div></div>')}
                ${H.card('Kategori bazında ürün maliyeti', 'Kayıtlı birim maliyetlerin toplamı', '<div class="card-body"><div class="chart-box"><canvas id="chCat"></canvas></div></div>')}
                ${H.card('Tedarikçi bazında açık sipariş', 'Teslim bekleyen tutar (₺)', '<div class="card-body"><div class="chart-box"><canvas id="chSup"></canvas></div></div>')}
            </div>`;

            const exc = run ? run.exceptions.slice(0, 8) : [];
            const moves = st.movements.slice(-8).reverse();
            html += `<div class="grid grid-2" style="margin-top:16px;">
                ${H.card('MRP istisna mesajları', run ? `${run.exceptions.length} mesaj` : '', exc.length
                    ? exc.map((e) => `<div class="exc"><span class="sev ${e.sev}"></span><div>${H.anyLink(e.kod)} — ${esc(e.msg)}</div></div>`).join('')
                    : H.empty('İstisna yok', run ? 'Plan sorunsuz görünüyor.' : 'MRP çalıştırıldığında burada listelenir.'))}
                ${H.card('Son stok hareketleri', '', moves.length ? `<div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Kod</th><th>Tür</th><th class="num">Miktar</th></tr></thead><tbody>
                    ${moves.map((m) => `<tr><td class="nowrap">${esc(U.dateTime(m.at))}</td><td>${H.anyLink(m.kod)}</td><td><span class="badge ${M.MOVE_TYPES[m.type].badge}">${esc(M.MOVE_TYPES[m.type].label)}</span></td>
                        <td class="num ${m.qty < 0 ? 'tp-neg' : 'tp-pos'}">${m.qty > 0 ? '+' : ''}${esc(U.qty(m.qty))}</td></tr>`).join('')}</tbody></table></div>`
                    : H.empty('Henüz hareket yok', 'Mal kabul, üretim ve sayım işlemleri burada görünür.'))}
            </div>`;
            return html;
        },
        after() {
            const st = S();
            const t = H.chartTheme();
            const items = M.items().filter((i) => i.procurement !== 'service');
            const counts = { ok: 0, warn: 0, critical: 0 };
            items.forEach((i) => { counts[M.stockStatus(i.kod)]++; });
            H.chart('chHealth', {
                type: 'doughnut',
                data: { labels: ['Normal', 'Düşük', 'Kritik'], datasets: [{ data: [counts.ok, counts.warn, counts.critical], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderColor: t.surface, borderWidth: 2 }] },
                options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'right' } } }
            });

            const byCat = MRP.data.CATEGORIES.map((c) => U.sum(M.products().filter((p) => p.kategori === c), (p) => p.toplam));
            H.chart('chCat', {
                type: 'bar',
                data: { labels: MRP.data.CATEGORIES, datasets: [{ data: byCat, backgroundColor: MRP.data.CATEGORIES.map((c) => MRP.data.CATEGORY_STYLE[c].color), borderRadius: 6 }] },
                options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => U.cur(c.raw) } } },
                    scales: { x: { grid: { color: t.grid }, ticks: { callback: (v) => U.compactCur(v) } }, y: { grid: { display: false } } } }
            });

            const start = U.weekStart(U.today());
            const weeks = [...Array(8)].map((_, i) => U.addDays(start, i * 7));
            const run = st.lastRun;
            const inWeek = (p, w) => { const d = U.parseDate(p.release); return d >= (w === 0 ? new Date(0) : weeks[w]) && d < U.addDays(weeks[w], 7); };
            const val = (type) => weeks.map((_, w) => run ? U.sum(run.planned.filter((p) => p.type === type && inWeek(p, w)), (p) => p.qty * (type === 'production' ? M.unitCost(p.kod) : p.price)) : 0);
            H.chart('chRelease', {
                type: 'bar',
                data: { labels: weeks.map((w, i) => (i === 0 ? 'Bu hafta*' : `H${U.isoWeek(w)}`)), datasets: [
                    { label: 'Satın alma', data: val('purchase'), backgroundColor: '#8b5cf6', borderRadius: 4 },
                    { label: 'Üretim', data: val('production'), backgroundColor: '#3b82f6', borderRadius: 4 }
                ] },
                options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${U.cur(c.raw)}` } } },
                    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: t.grid }, ticks: { callback: (v) => U.compactCur(v) } } } }
            });

            const sup = {};
            st.pos.filter((p) => p.status === 'open' || p.status === 'partial').forEach((p) => {
                sup[p.supplierName] = (sup[p.supplierName] || 0) + U.sum(p.lines, (l) => Math.max(0, l.qty - (l.received || 0)) * l.price * (1 - l.disc / 100));
            });
            const entries = Object.entries(sup).sort((a, b) => b[1] - a[1]);
            H.chart('chSup', {
                type: 'bar',
                data: { labels: entries.length ? entries.map((e) => e[0]) : ['Açık sipariş yok'], datasets: [{ data: entries.length ? entries.map((e) => e[1]) : [0], backgroundColor: '#10b981', borderRadius: 6 }] },
                options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => U.cur(c.raw) } } },
                    scales: { x: { beginAtZero: true, grid: { color: t.grid }, ticks: { callback: (v) => U.compactCur(v) } }, y: { grid: { display: false } } } }
            });
        }
    };
})(window.MRP);
