/* ==========================================================================
   MRP Pro — Kapasite Planlama (CRP): iş merkezleri, rota bazlı haftalık yük
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;

    // =====================================================================
    // Hesaplama
    // =====================================================================
    /** start–end arası iş günleri (Pzt–Cum); hiç yoksa başlangıç günü */
    function workDays(startIso, endIso) {
        const out = [];
        let d = U.parseDate(startIso);
        const end = U.parseDate(endIso < startIso ? startIso : endIso);
        while (d <= end && out.length < 400) {
            const wd = d.getDay();
            if (wd >= 1 && wd <= 5) out.push(new Date(d));
            d = U.addDays(d, 1);
        }
        return out.length ? out : [U.parseDate(startIso)];
    }

    /** Yükü oluşturan emirler: açık iş emirleri + (isteğe bağlı) MRP planlı üretim önerileri */
    function loadOrders(includePlanned, planned) {
        const orders = S().workOrders.filter((w) => w.status === 'planned' || w.status === 'released')
            .map((w) => ({ ref: w.no, kod: w.kod, ad: w.ad, qty: w.qty, start: w.start, end: w.end, kind: 'İş emri' }));
        const src = planned || (includePlanned && S().lastRun ? S().lastRun.planned : []);
        src.filter((p) => p.type === 'production').forEach((p) => orders.push({ ref: p.id, kod: p.kod, ad: p.ad, qty: p.qty, start: p.release, end: p.due, kind: 'MRP önerisi' }));
        return orders;
    }

    /**
     * Haftalık yük matrisi.
     * @returns {{weeks:{label,from}[], rows:{wc, capWeek, load:number[], orders:object[][]}[]}}
     */
    function compute({ includePlanned = true, planned = null, weeks = 8 } = {}) {
        const start = U.weekStart(U.today());
        const today = U.iso(U.today());
        const wks = [...Array(weeks)].map((_, i) => { const f = U.addDays(start, i * 7); return { from: U.iso(f), label: `H${U.isoWeek(f)}`, sub: U.date(f).slice(0, 5) }; });
        const rows = M.workCenters().map((wc) => ({ wc, capWeek: wc.capacity * wc.days, load: Array(weeks).fill(0), orders: [...Array(weeks)].map(() => []) }));
        const byWc = new Map(rows.map((r) => [r.wc.id, r]));
        loadOrders(includePlanned, planned).forEach((o) => {
            const days = workDays(o.start < today ? today : o.start, o.end < today ? today : o.end);
            M.routing(o.kod).forEach((op) => {
                const row = byWc.get(op.wc);
                if (!row) return;
                const perDay = M.opMinutes(op, o.qty) / days.length;
                days.forEach((d) => {
                    const i = Math.max(0, Math.floor(U.diffDays(d, start) / 7));
                    if (i >= weeks) return;
                    row.load[i] += perDay;
                    const ex = row.orders[i].find((x) => x.ref === o.ref);
                    if (ex) ex.min += perDay; else row.orders[i].push({ ...o, min: perDay });
                });
            });
        });
        return { weeks: wks, rows };
    }

    function summary(cap) {
        let peak = 0, over = 0, total = 0;
        cap.rows.forEach((r) => r.load.forEach((l) => {
            const pct = r.capWeek ? l / r.capWeek : 0;
            peak = Math.max(peak, pct); total += l;
            if (pct > 1) over++;
        }));
        return { peak, over, totalHours: total / 60 };
    }
    // =====================================================================
    // Sonlu kapasite çizelgeleme (ileriye doğru, günlük kova)
    // ---------------------------------------------------------------------
    // Öncelik: acil işaretli → termin (bağlı satış siparişinin en erken
    // termini, yoksa iş emri bitişi) → serbest bırakılmış → iş emri no.
    // Her iş emrinin operasyonları rota sırasıyla, iş merkezinin o güne kalan
    // dakikasından yer alır; bir operasyon önceki operasyonun bittiği gün
    // başlayabilir. Serbest bırakılmış iş emri bugünden, planlanan iş emri
    // planlı başlangıcından (malzeme hazırlığı) önce başlamaz.
    // =====================================================================
    const HORIZON = 365;
    const EPS = 1e-6;
    const isWorkday = (date, wc) => ((date.getDay() + 6) % 7) < (wc.days || 5);

    /** İş emrinin öncelik termini: bağlı açık sipariş satırlarının en erkeni, yoksa bitiş */
    function dueOf(w) {
        let due = null;
        const sos = [];
        (w.soRefs || []).forEach((r) => {
            const x = M.soLine(r.key);
            if (!x || !['open', 'partial'].includes(x.so.status)) return;
            const d = x.line.dueDate || x.so.dueDate;
            sos.push({ key: r.key, customer: x.so.customer, due: d });
            if (!due || d < due) due = d;
        });
        return { due: due || w.end, soDue: due, sos };
    }

    function schedule() {
        const today = U.today();
        const todayIso = U.iso(today);
        const dates = [...Array(HORIZON)].map((_, i) => U.addDays(today, i));
        const isoAt = (i) => U.iso(dates[Math.min(i, HORIZON - 1)]);
        const free = new Map(M.workCenters().map((wc) => [wc.id, dates.map((d) => (isWorkday(d, wc) ? +wc.capacity || 0 : 0))]));
        const used = new Map(M.workCenters().map((wc) => [wc.id, Array(HORIZON).fill(0)]));

        const orders = S().workOrders.filter((w) => w.status === 'planned' || w.status === 'released').map((w) => ({ w, ...dueOf(w) }));
        orders.sort((a, b) => (a.w.priority === 'urgent' ? 0 : 1) - (b.w.priority === 'urgent' ? 0 : 1)
            || a.due.localeCompare(b.due)
            || (a.w.status === 'released' ? 0 : 1) - (b.w.status === 'released' ? 0 : 1)
            || a.w.no.localeCompare(b.w.no));

        orders.forEach((o, rank) => {
            const w = o.w;
            o.rank = rank + 1;
            const earliest = w.status === 'released' ? 0 : Math.max(0, U.diffDays(w.start, todayIso));
            let day = Math.min(earliest, HORIZON - 1);
            let startDay = null;
            o.ops = [];
            o.overflow = false;
            M.routing(w.kod).forEach((op, i) => {
                const f = free.get(op.wc);
                if (!f) { o.ops.push({ seq: (i + 1) * 10, wc: op.wc, missing: true, min: 0 }); return; }
                let need = M.opMinutes(op, w.qty);
                const min = need;
                let d = day, first = null;
                while (need > EPS && d < HORIZON) {
                    if (f[d] > EPS) {
                        const take = Math.min(need, f[d]);
                        f[d] -= take; need -= take;
                        used.get(op.wc)[d] += take;
                        if (first == null) first = d;
                    }
                    if (need > EPS) d++;
                }
                if (need > EPS) { o.overflow = true; d = HORIZON - 1; }
                if (first == null) first = d;
                if (startDay == null) startDay = first;
                o.ops.push({ seq: (i + 1) * 10, wc: op.wc, min, startDay: first, endDay: d, start: isoAt(first), end: isoAt(d) });
                day = d;
            });
            if (startDay == null) startDay = day;
            o.startDay = startDay; o.endDay = day;
            o.start = isoAt(startDay); o.end = isoAt(day);
            o.lateDays = Math.max(0, U.diffDays(o.end, o.due));
            o.late = o.lateDays > 0 || o.overflow;
            o.shift = U.diffDays(o.end, w.end);
        });
        return { orders, used, dates, horizon: HORIZON };
    }

    MRP.capacity = { compute, summary, schedule, dueOf };

    // =====================================================================
    // Görünüm
    // =====================================================================
    const capState = { includePlanned: true, tab: 'load' };
    const heat = (pct) => (pct > 1 ? 'var(--red)' : pct > 0.85 ? 'var(--amber)' : pct > 0 ? 'var(--green)' : 'transparent');

    MRP.views.capacity = {
        title: 'Kapasite Planlama',
        subtitle: 'İş merkezi bazında haftalık yük ve sonlu kapasite çizelgesi — termin önceliğiyle gerçekçi bitiş tarihleri',
        render() {
            const tabs = H.tabs([['load', 'Yük (ısı haritası)'], ['schedule', 'Sonlu Çizelge', S().workOrders.filter((w) => w.status === 'planned' || w.status === 'released').length]], capState.tab, 'capTab');
            if (capState.tab === 'schedule') return tabs + renderSchedule();
            const cap = compute({ includePlanned: capState.includePlanned });
            const sm = summary(cap);
            const can = MRP.auth.can('manageCapacity');
            let html = tabs + `<div class="kpis">
                ${H.kpi('En Yüksek Doluluk', `%${U.num(sm.peak * 100, 0)}`, 'İş merkezi × hafta', sm.peak > 1 ? 'red' : sm.peak > 0.85 ? 'violet' : 'green')}
                ${H.kpi('Aşırı Yüklü Hücre', sm.over, 'Kapasitenin üzerinde', sm.over ? 'red' : 'green')}
                ${H.kpi('Toplam Yük', `${U.num(sm.totalHours, 0)} sa`, '8 hafta', 'blue')}
                ${H.kpi('İş Merkezi', M.workCenters().length, `${U.num(U.sum(S().workCenters, (w) => w.capacity * w.days) / 60, 0)} sa/hafta kapasite`, 'cyan')}
            </div>
            <div class="toolbar"><label class="check-chip"><input type="checkbox" data-change="capPlanned" ${capState.includePlanned ? 'checked' : ''}> MRP üretim önerilerini dahil et</label>
                <span class="muted" style="font-size:.8em;">${S().lastRun ? `Son MRP: ${esc(U.dateTime(S().lastRun.runAt))}` : 'MRP henüz çalıştırılmadı — yalnızca iş emirleri'}</span></div>`;
            if (sm.over) html += H.banner('red', 'alert', `${sm.over} haftada kapasite aşımı var`, 'İş emirlerini öne/arkaya kaydırın, vardiya ekleyin veya fasona yönlendirin. Hücreye tıklayarak yükü oluşturan emirleri görebilirsiniz.');

            html += H.card('Haftalık yük ısı haritası', 'Doluluk % ve saat · yeşil < %85 · sarı %85–100 · kırmızı > %100', `<div class="table-wrap"><table>
                <thead><tr><th>İş merkezi</th><th class="num">Kapasite/hf</th>${cap.weeks.map((w) => `<th class="num">${esc(w.label)}<br><span style="font-weight:500;text-transform:none;">${esc(w.sub)}</span></th>`).join('')}</tr></thead>
                <tbody>${cap.rows.map((r) => `<tr><td class="strong">${esc(r.wc.ad)} <span class="muted mono">${esc(r.wc.id)}</span></td><td class="num">${U.num(r.capWeek / 60, 0)} sa</td>
                    ${r.load.map((l, i) => {
                        const pct = r.capWeek ? l / r.capWeek : 0;
                        return `<td class="num" style="background:color-mix(in srgb, ${heat(pct)} ${Math.min(45, 12 + pct * 30)}%, transparent);cursor:${l ? 'pointer' : 'default'};" ${l ? `data-act="capCell" data-id="${esc(r.wc.id)}|${i}"` : ''}>
                            ${l ? `<b>%${U.num(pct * 100, 0)}</b><br><span class="muted" style="font-size:.85em;">${U.num(l / 60, 1)} sa</span>` : '<span class="muted">·</span>'}</td>`;
                    }).join('')}</tr>`).join('')}</tbody></table></div>`);

            html += '<div style="height:16px;"></div>' + H.card('İş merkezleri', 'Kapasite, verimlilik ve saatlik maliyet (işçilik maliyetine yansır)', `<div class="table-wrap"><table>
                <thead><tr><th>Kod</th><th>Ad</th><th class="num">Günlük kapasite</th><th class="num">Gün/hafta</th><th class="num">Verimlilik</th><th class="num">Saat ücreti</th><th></th></tr></thead>
                <tbody>${M.workCenters().map((w) => `<tr><td class="mono">${esc(w.id)}</td><td class="strong">${esc(w.ad)}</td><td class="num">${U.num(w.capacity, 0)} dk (${U.num(w.capacity / 60, 1)} sa)</td>
                    <td class="num">${w.days}</td><td class="num">%${w.efficiency}</td><td class="num">${U.cur(w.rate)}</td>
                    <td>${can || MRP.auth.can('editCost') ? `<button class="btn btn-ghost btn-sm" data-act="wcEdit" data-id="${esc(w.id)}" title="Düzenle">${MRP.icon('edit', 'sm')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`,
                can ? `<button class="btn btn-secondary btn-sm" data-act="wcEdit">${MRP.icon('plus', 'sm')} İş merkezi ekle</button>` : '');
            return html;
        }
    };

    // ---------------- Sonlu çizelge görünümü ----------------
    const WC_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    const wcColor = (id) => WC_COLORS[Math.max(0, M.workCenters().findIndex((w) => w.id === id)) % WC_COLORS.length];
    const dshort = (iso) => U.date(U.parseDate(iso)).slice(0, 5);

    function renderSchedule() {
        const sc = schedule();
        const list = sc.orders;
        const canWO = MRP.auth.can('manageWO');
        if (!list.length) return H.empty('Açık iş emri yok', 'MRP önerilerinden iş emri oluşturduğunuzda burada kapasiteye göre sıralanır.');
        const late = list.filter((o) => o.late);
        const soLate = new Set(late.flatMap((o) => o.sos.filter((x) => o.end > x.due).map((x) => x.key)));
        const changed = list.filter((o) => o.start !== o.w.start || o.end !== o.w.end);
        const lastEnd = list.reduce((m, o) => (o.end > m ? o.end : m), U.iso(U.today()));
        const win = Math.max(5, Math.max(...list.map((o) => o.endDay)) + 1);   // bugün → son bitiş
        const util = M.workCenters().map((wc) => {
            const u = sc.used.get(wc.id).slice(0, win);
            const capSum = sc.dates.slice(0, win).reduce((a, d) => a + (isWorkday(d, wc) ? +wc.capacity : 0), 0);
            return { wc, pct: capSum ? U.sum(u, (x) => x) / capSum : 0 };
        }).sort((a, b) => b.pct - a.pct);

        let html = `<div class="kpis">
            ${H.kpi('Çizelgelenen İş Emri', list.length, `Son bitiş ${U.date(U.parseDate(lastEnd))}`, 'blue')}
            ${H.kpi('Termine Yetişmeyen', late.length, late.length ? `toplam ${U.sum(late, (o) => o.lateDays)} gün gecikme` : 'Tüm iş emirleri zamanında', late.length ? 'red' : 'green')}
            ${H.kpi('Etkilenen Sipariş Satırı', soLate.size, 'Kapasite nedeniyle geç kalacak', soLate.size ? 'red' : 'green')}
            ${H.kpi('Darboğaz', util[0] ? util[0].wc.ad : '–', util[0] ? `son bitişe kadar doluluk %${U.num(util[0].pct * 100, 0)}` : '', util[0] && util[0].pct > 0.85 ? 'violet' : 'cyan')}
            ${H.kpi('Tarihi Değişecek', changed.length, 'Çizelge ↔ iş emri tarihleri', changed.length ? 'violet' : 'green')}
        </div>`;
        if (late.length) html += H.banner('red', 'alert', `${late.length} iş emri kapasite nedeniyle termine yetişmiyor`, `${late.slice(0, 4).map((o) => `${o.w.no} (${o.lateDays} gün${o.sos[0] ? ` · ${o.sos[0].customer}` : ''})`).join(', ')}${late.length > 4 ? '…' : ''} — acil işaretleyin, vardiya/kapasite ekleyin veya müşteriyle termini konuşun.`);
        html += `<div class="toolbar"><span class="muted" style="font-size:.82em;">Sıra: acil → termin (bağlı siparişin) → serbest bırakılmış. Planlanan iş emri planlı başlangıcından önce başlamaz (malzeme hazırlığı).</span><span class="spacer"></span>
            ${canWO && changed.length ? `<button class="btn btn-primary" data-act="schedApply">${MRP.icon('check')} Tarihleri iş emirlerine uygula (${changed.length})</button>` : ''}</div>`;

        // Gantt: satır = iş emri, parçalar = operasyonlar (iş merkezine göre renkli), dikey çizgi = termin
        const span = Math.min(sc.horizon, Math.max(14, Math.max(...list.map((o) => o.endDay), ...list.map((o) => Math.max(0, U.diffDays(o.due, U.iso(U.today()))))) + 2));
        const pct = (d) => (Math.min(d, span) / span) * 100;
        html += H.card('Çizelge', `Bugünden itibaren ${span} gün · renk = iş merkezi · kesikli çizgi = termin`, `<div class="card-body" style="overflow-x:auto;"><div class="gantt">
            <div class="gantt-head"><div>İş emri (öncelik sırası)</div><div>${esc(U.date(U.today()))} → ${esc(U.date(U.addDays(U.today(), span)))}</div><div class="text-right">Çizelge / termin</div></div>
            ${list.map((o) => {
                const dueDay = U.diffDays(o.due, U.iso(U.today()));
                return `<div class="gantt-row"><div class="gantt-label" title="${esc(o.w.ad)}">${o.w.priority === 'urgent' ? '⚑ ' : ''}${esc(o.w.ad)}<small>${o.rank}. ${esc(o.w.no)} · ${esc(U.qty(o.w.qty, 'ad'))}${o.sos[0] ? ` · ${esc(o.sos[0].customer)}` : ''}</small></div>
                    <div class="gantt-track">${dueDay >= 0 && dueDay <= span ? `<span style="position:absolute;top:-4px;bottom:-4px;left:${pct(dueDay + 1)}%;border-left:2px dashed ${o.late ? 'var(--red)' : 'var(--text-3)'};z-index:2;" title="Termin ${esc(U.date(U.parseDate(o.due)))}"></span>` : ''}
                        ${o.ops.filter((op) => !op.missing).map((op) => `<div class="gantt-bar" style="left:${pct(op.startDay)}%;width:${Math.max(0.8, pct(op.endDay + 1) - pct(op.startDay))}%;background:${wcColor(op.wc)};" title="${esc(op.wc)} · ${esc(U.date(U.parseDate(op.start)))} → ${esc(U.date(U.parseDate(op.end)))} · ${U.num(op.min / 60, 1)} sa">${esc(op.wc)}</div>`).join('')}</div>
                    <div class="mono text-right" style="font-size:.78em;">${esc(dshort(o.end))} / ${esc(dshort(o.due))} ${o.late ? `<span class="badge badge-red">+${o.overflow ? '∞' : o.lateDays}g</span>` : '<span class="badge badge-green">ok</span>'}</div></div>`;
            }).join('')}
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:.78em;">${M.workCenters().map((wc) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${wcColor(wc.id)};"></span> ${esc(wc.ad)}</span>`).join('')}</div>
        </div></div>`);

        html += '<div style="height:16px;"></div>' + `<section class="card"><div class="table-wrap"><table>
            <thead><tr><th class="num">Sıra</th><th>İş emri</th><th>Mamul</th><th class="num">Miktar</th><th>Satış siparişi</th><th>Termin</th><th>Mevcut plan</th><th>Çizelge</th><th>Durum</th><th></th></tr></thead>
            <tbody>${list.map((o) => `<tr class="${o.late ? 'r-crit' : ''}">
                <td class="num">${o.rank}</td>
                <td class="nowrap"><button class="link mono" data-act="woDetail" data-id="${esc(o.w.no)}">${esc(o.w.no)}</button> ${H.badge(H.WO_STATUS, o.w.status)}</td>
                <td>${H.anyLink(o.w.kod)}<div class="muted" style="font-size:12px;">${esc(o.w.ad)}</div></td>
                <td class="num">${esc(U.qty(o.w.qty, 'ad'))}</td>
                <td>${o.sos.length ? o.sos.map((x) => `<div><span class="mono">${esc(x.key)}</span> <span class="muted">${esc(x.customer)}</span></div>`).join('') : '<span class="muted">Stok için</span>'}</td>
                <td class="nowrap">${esc(U.date(U.parseDate(o.due)))}${o.soDue ? '' : ' <span class="muted" style="font-size:11px;">(İE bitişi)</span>'}</td>
                <td class="nowrap muted">${esc(dshort(o.w.start))} → ${esc(dshort(o.w.end))}</td>
                <td class="nowrap strong">${esc(dshort(o.start))} → ${esc(dshort(o.end))}${o.shift ? ` <span class="muted" style="font-size:11px;">(${o.shift > 0 ? '+' : ''}${o.shift}g)</span>` : ''}</td>
                <td>${o.overflow ? '<span class="badge badge-red">Ufuk dışı</span>' : o.late ? `<span class="badge badge-red">${o.lateDays} gün geç</span>` : '<span class="badge badge-green">Zamanında</span>'}${o.ops.some((x) => x.missing) ? ' <span class="badge badge-amber">Tanımsız iş merkezi</span>' : ''}${o.ops.length ? '' : ' <span class="badge badge-amber">Rota yok</span>'}</td>
                <td>${canWO ? `<button class="btn btn-ghost btn-sm" data-act="schedUrgent" data-id="${esc(o.w.no)}" title="${o.w.priority === 'urgent' ? 'Acil işaretini kaldır' : 'Acil — sıranın başına al'}">${o.w.priority === 'urgent' ? '⚑ Acil' : '⚐'}</button>` : ''}</td></tr>`).join('')}</tbody>
        </table></div></section>`;
        return html;
    }

    async function applySchedule() {
        if (!H.guard('manageWO')) return;
        const sc = schedule();
        const ch = sc.orders.filter((o) => o.start !== o.w.start || o.end !== o.w.end);
        if (!ch.length) return;
        if (!(await UI.confirm(`${ch.length} iş emrinin başlangıç / bitiş tarihi kapasiteye göre güncellenecek. Bağlı siparişlerin karşılama tarihleri de buna göre değişir.`, { title: 'Çizelgeyi uygula', okLabel: 'Uygula' }))) return;
        const u = MRP.auth.current();
        ch.forEach((o) => {
            const w = o.w;
            (w.history = w.history || []).push({ action: `Çizelge: ${U.date(U.parseDate(w.start))}–${U.date(U.parseDate(w.end))} → ${U.date(U.parseDate(o.start))}–${U.date(U.parseDate(o.end))}`, by: u.name, at: new Date().toISOString() });
            if (w.status === 'planned') w.start = o.start;
            w.end = o.end;
            w.scheduledAt = new Date().toISOString();
        });
        MRP.store.audit('Sonlu çizelge uygulandı', `${ch.length} iş emri; ${sc.orders.filter((o) => o.late).length} termine yetişmiyor`);
        const lateSO = sc.orders.filter((o) => o.late && o.sos.length);
        if (lateSO.length) MRP.store.notify('wo', 'Kapasite: termine yetişmeyen sipariş', lateSO.slice(0, 3).map((o) => `${o.sos[0].key} (${o.sos[0].customer}) +${o.lateDays}g`).join(', '), ['perm:runMRP', 'perm:manageWO'], 'capacity');
        app().commit();
        UI.toast('Çizelge uygulandı', `${ch.length} iş emri güncellendi.`, 'success');
    }

    function cellDetail(id) {
        const [wcId, i] = id.split('|');
        const cap = compute({ includePlanned: capState.includePlanned });
        const row = cap.rows.find((r) => r.wc.id === wcId);
        const list = row.orders[+i].slice().sort((a, b) => b.min - a.min);
        UI.modal({
            title: `${row.wc.ad} — ${cap.weeks[+i].label} yükü`, size: 'lg',
            body: `<p class="muted" style="margin-bottom:12px;">Kapasite ${U.num(row.capWeek / 60, 1)} sa · Yük ${U.num(row.load[+i] / 60, 1)} sa (%${U.num(row.load[+i] / row.capWeek * 100, 0)})</p>
                <div class="table-wrap"><table><thead><tr><th>Emir</th><th>Tür</th><th>Kalem</th><th class="num">Miktar</th><th>Başlangıç</th><th>Bitiş</th><th class="num">Bu haftaki yük</th></tr></thead><tbody>
                ${list.map((o) => `<tr><td class="mono">${esc(o.ref)}</td><td>${esc(o.kind)}</td><td>${H.anyLink(o.kod)} ${esc(o.ad)}</td><td class="num">${esc(U.qty(o.qty, 'ad'))}</td>
                    <td>${esc(U.date(U.parseDate(o.start)))}</td><td>${esc(U.date(U.parseDate(o.end)))}</td><td class="num strong">${U.num(o.min / 60, 1)} sa</td></tr>`).join('')}</tbody></table></div>`,
            buttons: [{ label: 'Kapat' }]
        });
    }

    function editWc(id) {
        if (!MRP.auth.can('manageCapacity') && !MRP.auth.can('editCost')) return H.guard('manageCapacity');
        const isNew = !id;
        const w = isNew ? { id: '', ad: '', capacity: 480, days: 5, efficiency: 90, rate: 500 } : M.workCenter(id);
        const capOnly = !MRP.auth.can('manageCapacity');
        UI.modal({
            title: isNew ? 'Yeni İş Merkezi' : `İş Merkezi — ${w.id}`, size: 'md',
            body: `<div class="form-grid">
                <div class="field"><label>Kod <span class="req">*</span></label><input id="wcId" value="${esc(w.id)}" ${isNew ? '' : 'readonly'} maxlength="6"></div>
                <div class="field"><label>Ad <span class="req">*</span></label><input id="wcAd" value="${esc(w.ad)}" ${capOnly ? 'readonly' : ''}></div>
                <div class="field"><label>Günlük kapasite (dk)</label><input id="wcCap" type="number" min="1" step="1" value="${w.capacity}" ${capOnly ? 'readonly' : ''}><span class="hint">Örn. 2 kişi × 8 saat = 960 dk</span></div>
                <div class="field"><label>Çalışma günü / hafta</label><input id="wcDays" type="number" min="1" max="7" step="1" value="${w.days}" ${capOnly ? 'readonly' : ''}></div>
                <div class="field"><label>Verimlilik (%)</label><input id="wcEff" type="number" min="10" max="150" step="1" value="${w.efficiency}" ${capOnly ? 'readonly' : ''}></div>
                <div class="field"><label>Saat ücreti (₺)</label><input id="wcRate" type="number" min="0" step="0.01" value="${w.rate}"><span class="hint">İşçilik + makine; ürün maliyetine yansır.</span></div>
            </div>`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const data = {
                        id: ctx.$('#wcId').value.trim().toUpperCase(), ad: ctx.$('#wcAd').value.trim(),
                        capacity: Math.max(1, Math.round(U.toNum(ctx.$('#wcCap').value, 480))), days: Math.min(7, Math.max(1, Math.round(U.toNum(ctx.$('#wcDays').value, 5)))),
                        efficiency: Math.min(150, Math.max(10, Math.round(U.toNum(ctx.$('#wcEff').value, 90)))), rate: Math.max(0, U.toNum(ctx.$('#wcRate').value))
                    };
                    if (!data.id || !data.ad) { UI.toast('Kod ve ad zorunlu', '', 'warn'); return false; }
                    if (isNew) {
                        if (M.workCenter(data.id)) { UI.toast('Kod kullanımda', data.id, 'warn'); return false; }
                        S().workCenters.push(data);
                    } else Object.assign(w, data);
                    MRP.store.audit(isNew ? 'İş merkezi eklendi' : 'İş merkezi güncellendi', `${data.id}: ${data.capacity} dk/gün × ${data.days}, %${data.efficiency}, ${data.rate} ₺/sa`);
                    app().commit();
                    UI.toast('İş merkezi kaydedildi', data.id, 'success');
                }
            }]
        });
    }

    Object.assign(MRP.actions, {
        capPlanned: (_, el) => { capState.includePlanned = el.checked; app().render(); },
        capCell: (id) => cellDetail(id),
        capTab: (t) => { capState.tab = t; app().render(); },
        schedApply: () => applySchedule(),
        schedUrgent: (no) => {
            if (!H.guard('manageWO')) return;
            const w = S().workOrders.find((x) => x.no === no);
            w.priority = w.priority === 'urgent' ? 'normal' : 'urgent';
            (w.history = w.history || []).push({ action: w.priority === 'urgent' ? 'Acil işaretlendi' : 'Acil işareti kaldırıldı', by: MRP.auth.current().name, at: new Date().toISOString() });
            app().commit();
        },
        wcEdit: (id) => editWc(id)
    });
})(window.MRP);
