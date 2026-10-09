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
    MRP.capacity = { compute, summary };

    // =====================================================================
    // Görünüm
    // =====================================================================
    const capState = { includePlanned: true };
    const heat = (pct) => (pct > 1 ? 'var(--red)' : pct > 0.85 ? 'var(--amber)' : pct > 0 ? 'var(--green)' : 'transparent');

    MRP.views.capacity = {
        title: 'Kapasite Planlama',
        subtitle: 'İş merkezi bazında haftalık yük — açık iş emirleri ve MRP üretim önerileri',
        render() {
            const cap = compute({ includePlanned: capState.includePlanned });
            const sm = summary(cap);
            const can = MRP.auth.can('manageCapacity');
            let html = `<div class="kpis">
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
        wcEdit: (id) => editWc(id)
    });
})(window.MRP);
