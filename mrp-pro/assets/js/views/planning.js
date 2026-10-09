/* ==========================================================================
   MRP Pro — Planlama: Ana Üretim Planı, MRP çalıştırma, İş Emirleri
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;

    // =====================================================================
    // MRP
    // =====================================================================
    const mrpState = { tab: 'planned', type: 'all', selected: new Set(), q: '' };

    function runMRP(silent = false) {
        const t0 = performance.now();
        const result = MRP.engine.run();
        S().lastRun = result;
        mrpState.selected.clear();
        MRP.store.audit('MRP çalıştırıldı', `${result.planned.length} öneri, ${result.summary.critical} kritik istisna`);
        app().commit();
        if (!silent) UI.toast('MRP tamamlandı', `${result.planned.length} planlı sipariş önerisi · ${Math.round(performance.now() - t0)} ms`, 'success');
    }

    MRP.views.mrp = {
        title: 'MRP Çalıştırma',
        subtitle: 'Ana üretim planı → çok seviyeli ihtiyaç patlatma → net ihtiyaç → planlı sipariş önerileri',
        render() {
            const st = S();
            const canRun = MRP.auth.can('runMRP');
            const run = st.lastRun;

            const mps = st.mps.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            let html = H.card('Ana Üretim Planı (MPS)', 'Bağımsız talepler: müşteri siparişleri, tahminler, stok hedefleri', `
                <div class="table-wrap"><table>
                    <thead><tr><th>No</th><th>Mamul</th><th>Ad</th><th class="num">Miktar</th><th>Termin</th><th>Açıklama</th><th></th></tr></thead>
                    <tbody>${mps.map((d) => {
                        const p = M.product(d.kod);
                        const late = d.dueDate < U.iso(U.today());
                        return `<tr class="${late ? 'r-crit' : ''}"><td class="mono">${esc(d.id)}</td><td>${H.productLink(d.kod)}</td><td class="strong">${esc(p ? p.ad : '(silinmiş ürün)')}</td>
                            <td class="num">${esc(U.qty(d.qty, 'ad'))}</td><td class="nowrap">${esc(U.date(U.parseDate(d.dueDate)))} ${late ? '<span class="badge badge-red">Geçmiş</span>' : ''}</td>
                            <td>${esc(d.note || '')}</td>
                            <td>${canRun ? `<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="editDemand" data-id="${esc(d.id)}" title="Düzenle">${MRP.icon('edit', 'sm')}</button>
                                <button class="btn btn-ghost btn-sm" data-act="deleteDemand" data-id="${esc(d.id)}" title="Sil">${MRP.icon('trash', 'sm')}</button></div>` : ''}</td></tr>`;
                    }).join('') || `<tr><td colspan="7">${H.empty('Ana plan boş', 'Talep ekleyerek başlayın.')}</td></tr>`}</tbody>
                </table></div>`,
                canRun ? `<div style="display:flex;gap:8px;"><button class="btn btn-secondary" data-act="addDemand">${MRP.icon('plus')} Talep Ekle</button>
                    <button class="btn btn-primary" data-act="runMRP">${MRP.icon('play')} MRP'yi Çalıştır</button></div>` : '');

            html += '<div style="height:16px;"></div>';

            if (!run) {
                return html + H.banner('blue', 'info', 'Henüz MRP sonucu yok', canRun ? 'Ana planı gözden geçirip "MRP\'yi Çalıştır" butonuna basın.' : 'Planlama birimi MRP çalıştırdığında sonuçlar burada görünür.');
            }

            const s = run.summary;
            html += `<div class="kpis">
                ${H.kpi('Son Çalıştırma', U.dateTime(run.runAt), run.runBy, 'blue')}
                ${H.kpi('Planlanan Kalem', s.items, `${s.demands} bağımsız talep`, 'cyan')}
                ${H.kpi('Satın Alma Önerisi', s.purchaseCount, U.cur(s.purchaseValue), 'violet')}
                ${H.kpi('Üretim Önerisi', s.productionCount, 'Mamul + yarı mamul', 'green')}
                ${H.kpi('Geç Salım', s.late, 'Tedarik süresi yetersiz', s.late ? 'red' : 'green')}
                ${H.kpi('İstisna Mesajı', run.exceptions.length, `${s.critical} kritik`, s.critical ? 'red' : '')}
            </div>`;

            html += H.tabs([['planned', 'Planlı Siparişler', run.planned.length], ['exceptions', 'İstisna Mesajları', run.exceptions.length], ['records', 'Kalem Bazında Netleştirme', Object.keys(run.records).length]], mrpState.tab, 'mrpTab');

            if (mrpState.tab === 'planned') html += renderPlanned(run);
            else if (mrpState.tab === 'exceptions') html += renderExceptions(run);
            else html += renderRecords(run);
            return html;
        }
    };

    function renderPlanned(run) {
        let list = run.planned;
        if (mrpState.type !== 'all') list = list.filter((p) => p.type === mrpState.type);
        const q = mrpState.q.toLocaleLowerCase('tr');
        if (q) list = list.filter((p) => p.kod.toLocaleLowerCase('tr').includes(q) || p.ad.toLocaleLowerCase('tr').includes(q));
        list = list.slice().sort((a, b) => a.release.localeCompare(b.release));
        const canReq = MRP.auth.can('createRequest');
        const canWO = MRP.auth.can('manageWO');
        const selectable = (p) => (p.type === 'purchase' ? canReq : canWO);
        const sel = mrpState.selected;
        const nSelP = run.planned.filter((p) => sel.has(p.id) && p.type === 'purchase').length;
        const nSelW = run.planned.filter((p) => sel.has(p.id) && p.type === 'production').length;
        return `<div class="toolbar">
                <select class="input" data-change="mrpType">${[['all', 'Tüm öneriler'], ['purchase', 'Satın alma'], ['production', 'Üretim']].map(([v, l]) => `<option value="${v}" ${mrpState.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
                <input class="input" id="mrpSearch" placeholder="Kod veya ad…" value="${esc(mrpState.q)}" data-input="mrpSearch">
                <span class="spacer"></span>
                ${canReq ? `<button class="btn btn-violet" data-act="plannedToRequest" ${nSelP ? '' : 'disabled'}>${MRP.icon('cart')} Satın Alma Talebi Oluştur (${nSelP})</button>` : ''}
                ${canWO ? `<button class="btn btn-primary" data-act="plannedToWO" ${nSelW ? '' : 'disabled'}>${MRP.icon('factory')} İş Emri Oluştur (${nSelW})</button>` : ''}
            </div>
            <section class="card"><div class="table-wrap"><table>
                <thead><tr><th style="width:34px;">${canReq || canWO ? `<input type="checkbox" data-change="mrpSelAll" title="Tümünü seç" ${list.length && list.every((p) => !selectable(p) || sel.has(p.id)) ? 'checked' : ''}>` : ''}</th>
                    <th>Öneri</th><th>Kod</th><th>Kalem</th><th>Tip</th><th class="num">Net İhtiyaç</th><th class="num">Sipariş Miktarı</th>
                    <th>Salım</th><th>İhtiyaç</th><th class="num">LT</th><th class="num">Tutar ₺</th><th>Neden</th></tr></thead>
                <tbody>${list.map((p) => `<tr class="${p.late ? 'r-crit' : ''}">
                    <td>${selectable(p) ? `<input type="checkbox" data-change="mrpSel" data-id="${esc(p.id)}" ${sel.has(p.id) ? 'checked' : ''}>` : ''}</td>
                    <td class="mono">${esc(p.id)}</td><td>${H.anyLink(p.kod)}</td><td class="strong">${esc(p.ad)}</td>
                    <td>${p.type === 'production' ? '<span class="badge badge-blue">Üretim</span>' : p.service ? '<span class="badge badge-cyan">Fason</span>' : '<span class="badge badge-violet">Satın alma</span>'}</td>
                    <td class="num">${esc(U.qty(p.shortage, p.unit))}</td>
                    <td class="num strong">${esc(U.qty(p.qty, p.unit))}</td>
                    <td class="nowrap">${esc(U.date(U.parseDate(p.release)))} ${p.late ? '<span class="badge badge-red">Gecikmiş</span>' : ''}</td>
                    <td class="nowrap">${esc(U.date(U.parseDate(p.due)))}</td>
                    <td class="num">${p.leadTime}</td>
                    <td class="num">${U.num(p.qty * (p.type === 'production' ? M.unitCost(p.kod) : p.price))}</td>
                    <td class="muted">${esc(p.reason)}</td></tr>`).join('') || `<tr><td colspan="12">${H.empty('Öneri yok', 'Tüm ihtiyaçlar mevcut stok ve planlı girişlerle karşılanıyor.')}</td></tr>`}</tbody>
            </table></div></section>`;
    }

    function renderExceptions(run) {
        if (!run.exceptions.length) return H.banner('green', 'check', 'İstisna yok', 'Plan uygulanabilir görünüyor.');
        const label = { critical: 'Kritik', warn: 'Uyarı', info: 'Bilgi' };
        return `<section class="card">${run.exceptions.map((e) => `<div class="exc"><span class="sev ${e.sev}"></span>
            <div style="flex:1;"><b>${esc(label[e.sev])}</b> · ${H.anyLink(e.kod)} <span class="muted">${esc((M.item(e.kod) || {}).ad || '')}</span><div>${esc(e.msg)}</div></div></div>`).join('')}</section>`;
    }

    function renderRecords(run) {
        const recs = Object.values(run.records).sort((a, b) => a.level - b.level || a.kod.localeCompare(b.kod));
        return `<section class="card"><div class="table-wrap"><table>
            <thead><tr><th class="num">LLC</th><th>Kod</th><th>Kalem</th><th class="num">Eldeki</th><th class="num">Emniyet</th><th class="num">Brüt İhtiyaç</th>
                <th class="num">Planlı Giriş</th><th class="num">Planlı Sipariş</th><th class="num">Dönem Sonu</th><th></th></tr></thead>
            <tbody>${recs.map((r) => {
                const it = M.item(r.kod) || { ad: '?', unit: '' };
                return `<tr><td class="num">${r.level}</td><td>${H.anyLink(r.kod)}</td><td class="strong">${esc(it.ad)}</td>
                    <td class="num">${esc(U.qty(r.onHand, it.unit))}</td><td class="num">${esc(U.qty(r.ss, it.unit))}</td>
                    <td class="num">${esc(U.qty(U.sum(r.gross, (x) => x.qty), it.unit))}</td>
                    <td class="num">${esc(U.qty(U.sum(r.receipts, (x) => x.qty), it.unit))}</td>
                    <td class="num strong">${esc(U.qty(U.sum(r.planned, (x) => x.qty), it.unit))}</td>
                    <td class="num">${esc(U.qty(r.projectedEnd, it.unit))}</td>
                    <td><button class="btn btn-secondary btn-sm" data-act="timePhased" data-id="${esc(r.kod)}">Zaman fazlı</button></td></tr>`;
            }).join('')}</tbody></table></div></section>`;
    }

    function openTimePhased(kod) {
        const run = S().lastRun;
        const rec = run && run.records[kod];
        if (!rec) return;
        const it = M.item(kod);
        const tp = MRP.engine.timePhased(rec);
        const fmt = (v) => (Math.abs(v) < 1e-9 ? '<span class="muted">·</span>' : esc(U.qty(v)));
        const body = `<dl class="dl card card-body" style="margin-bottom:14px;grid-template-columns:repeat(4,auto 1fr);">
                <dt>Eldeki</dt><dd>${esc(U.qty(rec.onHand, it.unit))}</dd><dt>Emniyet stoğu</dt><dd>${esc(U.qty(rec.ss, it.unit))}</dd>
                <dt>Tedarik süresi</dt><dd>${it.leadTime} gün</dd><dt>Parti</dt><dd>${esc(it.lotPolicy)}${it.lotSize ? ' · ' + esc(U.qty(it.lotSize, it.unit)) : ''}</dd></dl>
            <div class="table-wrap"><table class="tp-table"><thead><tr><th>Kayıt</th>${tp.cols.map((c) => `<th>${esc(c.label)}${c.sub ? `<br><span style="font-weight:500;text-transform:none;">${esc(c.sub)}</span>` : ''}</th>`).join('')}</tr></thead>
            <tbody>${tp.rows.map((r) => `<tr><td class="strong">${esc(r.label)}</td>${r.values.map((v) => `<td class="${r.projected ? (v < rec.ss - 1e-9 ? 'tp-neg' : '') : r.release && v > 0 ? 'tp-pos' : ''}">${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
            <h3 style="font-size:.9em;margin:16px 0 8px;">İhtiyaç kaynakları (pegging)</h3>
            <div class="table-wrap" style="max-height:240px;"><table><thead><tr><th>Tarih</th><th>Kaynak</th><th class="num">Miktar</th></tr></thead><tbody>
            ${rec.gross.map((g) => `<tr><td>${esc(U.date(U.parseDate(g.date)))}</td><td class="mono">${esc(g.src)}</td><td class="num">${esc(U.qty(g.qty, it.unit))}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Brüt ihtiyaç yok (emniyet stoğu tamamlama).</td></tr>'}
            </tbody></table></div>
            <p class="muted" style="font-size:.78em;margin-top:10px;">Öngörülen stok, emniyet stoğunun altına düştüğünde kırmızı gösterilir. Planlı sipariş girişleri bunu dengeler.</p>`;
        UI.modal({ title: `Zaman Fazlı MRP — ${kod} ${it.ad}`, size: 'xl', body, buttons: [{ label: 'Kapat' }] });
    }

    function demandModal(d) {
        if (!H.guard('runMRP')) return;
        const isNew = !d.id;
        UI.modal({
            title: isNew ? 'Ana Plana Talep Ekle' : `Talebi Düzenle — ${d.id}`, size: 'md',
            body: `<datalist id="dmProducts">${M.products().map((p) => `<option value="${esc(p.kod)}">${esc(p.ad)}</option>`).join('')}</datalist>
                <div class="form-grid">
                <div class="field full"><label>Mamul kodu <span class="req">*</span></label><input id="dmKod" list="dmProducts" value="${esc(d.kod || '')}" autocomplete="off"><span class="hint" id="dmName"></span></div>
                <div class="field"><label>Miktar (adet) <span class="req">*</span></label><input id="dmQty" type="number" min="1" step="1" value="${d.qty || 10}"></div>
                <div class="field"><label>Termin tarihi <span class="req">*</span></label><input id="dmDate" type="date" value="${esc(d.dueDate || U.iso(U.addDays(U.today(), 21)))}"></div>
                <div class="field full"><label>Açıklama</label><input id="dmNote" value="${esc(d.note || '')}" placeholder="Müşteri siparişi, tahmin, stok hedefi…"></div>
            </div>`,
            onOpen: (ctx) => {
                const upd = () => { const p = M.product(ctx.$('#dmKod').value.trim()); ctx.$('#dmName').textContent = p ? p.ad : 'Listeden bir mamul seçin'; };
                ctx.$('#dmKod').addEventListener('input', upd); upd();
            },
            buttons: [{ label: 'Vazgeç' }, {
                label: isNew ? 'Ekle' : 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const kod = ctx.$('#dmKod').value.trim();
                    const qty = Math.round(U.toNum(ctx.$('#dmQty').value));
                    const dueDate = ctx.$('#dmDate').value;
                    if (!M.product(kod)) { UI.toast('Geçersiz mamul', 'Listeden geçerli bir mamul kodu seçin.', 'warn'); return false; }
                    if (qty <= 0) { UI.toast('Geçersiz miktar', '', 'warn'); return false; }
                    if (!dueDate) { UI.toast('Termin tarihi gerekli', '', 'warn'); return false; }
                    const note = ctx.$('#dmNote').value.trim();
                    if (isNew) {
                        const id = MRP.store.nextNo('MPS');
                        S().mps.push({ id, kod, qty, dueDate, note });
                        MRP.store.audit('Ana plana talep eklendi', `${id}: ${kod} × ${qty}, termin ${dueDate}`);
                    } else {
                        Object.assign(S().mps.find((x) => x.id === d.id), { kod, qty, dueDate, note });
                        MRP.store.audit('Ana plan talebi güncellendi', `${d.id}: ${kod} × ${qty}, termin ${dueDate}`);
                    }
                    if (app().currentView() !== 'mrp') location.hash = '#/mrp';
                    app().commit();
                    UI.toast('Ana plan güncellendi', 'Sonuçları görmek için MRP\'yi yeniden çalıştırın.', 'info');
                }
            }]
        });
    }

    function plannedToRequest() {
        if (!H.guard('createRequest')) return;
        const run = S().lastRun;
        const sel = run.planned.filter((p) => mrpState.selected.has(p.id) && p.type === 'purchase');
        if (!sel.length) return;
        UI.modal({
            title: 'Satın Alma Talebi Oluştur', size: 'lg',
            body: `${H.banner('blue', 'cart', `${sel.length} kalem satın alma birimine iletilecek`, 'Öncelik ve notu belirleyip gönderin. Talep onaylandıktan sonra siparişe dönüştürülür.')}
                <div class="form-grid">
                    <div class="field"><label>Öncelik</label><select id="rqPri">${Object.entries(H.PRIORITY).map(([k, v]) => `<option value="${k}" ${k === (sel.some((p) => p.late) ? 'urgent' : 'normal') ? 'selected' : ''}>${v[1]}</option>`).join('')}</select></div>
                    <div class="field full"><label>Not</label><textarea id="rqNote" placeholder="Satın alma için ek bilgi…"></textarea></div>
                </div>
                <div class="table-wrap" style="margin-top:14px;max-height:300px;"><table><thead><tr><th>Kod</th><th>Kalem</th><th class="num">Miktar</th><th>İhtiyaç</th><th class="num">Tutar ₺</th></tr></thead><tbody>
                ${sel.map((p) => `<tr><td class="mono">${esc(p.kod)}</td><td>${esc(p.ad)}</td><td class="num">${esc(U.qty(p.qty, p.unit))}</td><td>${esc(U.date(U.parseDate(p.due)))}</td><td class="num">${U.num(p.value)}</td></tr>`).join('')}
                <tr class="total"><td colspan="4" class="text-right">Tahmini toplam</td><td class="num">${U.num(U.sum(sel, (p) => p.value))}</td></tr></tbody></table></div>`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Talebi Gönder', cls: 'btn-violet', icon: 'check', onClick: (ctx) => {
                    const u = MRP.auth.current();
                    const lines = sel.map((p) => ({ kod: p.kod, ad: p.ad, tur: p.tur, unit: p.unit, qty: p.qty, price: p.price, total: p.value, needDate: p.due, planId: p.id }));
                    const req = {
                        no: MRP.store.nextNo('STT'), status: 'pending', priority: ctx.$('#rqPri').value, note: ctx.$('#rqNote').value.trim(),
                        lines, total: U.sum(lines, (l) => l.total), deadline: lines.map((l) => l.needDate).sort()[0],
                        createdBy: u.username, createdByName: u.name, createdAt: new Date().toISOString(), source: 'MRP',
                        history: [{ action: 'Oluşturuldu', by: u.name, at: new Date().toISOString() }], comments: []
                    };
                    S().requests.unshift(req);
                    MRP.store.audit('Satın alma talebi oluşturuldu', `${req.no}: ${lines.length} kalem, ${U.cur(req.total)}`);
                    MRP.store.notify('request', 'Yeni satın alma talebi', `${req.no} · ${lines.length} kalem · ${U.cur(req.total)} (${u.name})`, ['satinalma', 'satinalma_muduru', 'admin'], 'requests');
                    runMRP(true);
                    UI.toast('Talep gönderildi', `${req.no} satın alma birimine iletildi.`, 'success');
                }
            }]
        });
    }

    async function plannedToWO() {
        if (!H.guard('manageWO')) return;
        const run = S().lastRun;
        const sel = run.planned.filter((p) => mrpState.selected.has(p.id) && p.type === 'production');
        if (!sel.length) return;
        if (!(await UI.confirm(`${sel.length} üretim önerisi "Planlandı" durumunda iş emrine dönüştürülecek.`, { title: 'İş emri oluştur', okLabel: 'Oluştur' }))) return;
        const u = MRP.auth.current();
        const today = U.iso(U.today());
        sel.forEach((p) => {
            const wo = {
                no: MRP.store.nextNo('IE'), kod: p.kod, ad: p.ad, qty: p.qty,
                start: p.release < today ? today : p.release, end: p.due < today ? today : p.due,
                status: 'planned', source: p.id, createdBy: u.name, createdAt: new Date().toISOString(),
                history: [{ action: 'Oluşturuldu (MRP)', by: u.name, at: new Date().toISOString() }]
            };
            S().workOrders.push(wo);
        });
        MRP.store.audit('İş emirleri oluşturuldu', `${sel.length} adet (MRP önerisinden)`);
        runMRP(true);
        UI.toast('İş emirleri oluşturuldu', `${sel.length} iş emri planlandı.`, 'success');
    }

    const rerenderMrp = U.debounce(() => app().render(), 250);
    Object.assign(MRP.actions, {
        runMRP: () => { if (H.guard('runMRP')) runMRP(); },
        mrpTab: (t) => { mrpState.tab = t; app().render(); },
        mrpType: (v) => { mrpState.type = v; app().render(); },
        mrpSearch: (v) => { mrpState.q = v; rerenderMrp(); },
        mrpSel: (_, el) => { if (el.checked) mrpState.selected.add(el.dataset.id); else mrpState.selected.delete(el.dataset.id); app().render(); },
        mrpSelAll: (_, el) => {
            const run = S().lastRun;
            run.planned.filter((p) => (mrpState.type === 'all' || p.type === mrpState.type) && MRP.auth.can(p.type === 'purchase' ? 'createRequest' : 'manageWO'))
                .forEach((p) => (el.checked ? mrpState.selected.add(p.id) : mrpState.selected.delete(p.id)));
            app().render();
        },
        timePhased: (kod) => openTimePhased(kod),
        addDemand: (kod) => demandModal({ kod: typeof kod === 'string' ? kod : '' }),
        editDemand: (id) => demandModal(S().mps.find((d) => d.id === id)),
        deleteDemand: async (id) => {
            if (!H.guard('runMRP')) return;
            if (!(await UI.confirm(`${id} ana plandan silinecek.`, { title: 'Talebi sil', okLabel: 'Sil', danger: true }))) return;
            S().mps = S().mps.filter((d) => d.id !== id);
            MRP.store.audit('Ana plan talebi silindi', id);
            app().commit();
        },
        plannedToRequest, plannedToWO
    });
    MRP.planning = { runMRP };

    // =====================================================================
    // İŞ EMİRLERİ
    // =====================================================================
    const woState = { tab: 'open' };

    /** İş emrinin malzeme durumu (stoklu kalemler için) */
    function woAvailability(wo) {
        return M.bom(wo.kod).map((l) => {
            const it = M.item(l.kod) || { ad: '?', unit: '', procurement: 'buy' };
            const need = l.k * wo.qty;
            const stocked = it.procurement !== 'service';
            const have = stocked ? M.onHand(l.kod) : need;
            return { kod: l.kod, it, need, have, short: stocked ? Math.max(0, need - have) : 0, stocked };
        });
    }

    MRP.views.workorders = {
        title: 'İş Emirleri',
        subtitle: 'Üretim emirleri, malzeme uygunluğu, sarf ve mamul girişi',
        render() {
            const all = S().workOrders;
            const by = (s) => all.filter((w) => s.includes(w.status));
            const tabs = [['open', 'Açık', by(['planned', 'released']).length], ['completed', 'Tamamlanan', by(['completed']).length], ['cancelled', 'İptal', by(['cancelled']).length], ['all', 'Tümü', all.length]];
            const list = (woState.tab === 'open' ? by(['planned', 'released']) : woState.tab === 'all' ? all : by([woState.tab]))
                .slice().sort((a, b) => a.start.localeCompare(b.start));
            const can = MRP.auth.can('manageWO');
            let html = `${H.tabs(tabs, woState.tab, 'woTab')}
                <div class="toolbar"><span class="spacer"></span>${can ? `<button class="btn btn-primary" data-act="newWO">${MRP.icon('plus')} Yeni İş Emri</button>` : ''}</div>`;
            const open = by(['planned', 'released']);
            if (open.length) html += H.card('Üretim takvimi', 'Açık iş emirleri — kırmızı çizgi bugünü gösterir', `<div class="card-body" style="overflow-x:auto;">${gantt(open)}</div>`) + '<div style="height:16px;"></div>';
            html += `<section class="card"><div class="table-wrap"><table>
                <thead><tr><th>İş Emri</th><th>Mamul</th><th>Ad</th><th class="num">Miktar</th><th>Başlangıç</th><th>Bitiş</th><th>Durum</th><th>Malzeme</th><th></th></tr></thead>
                <tbody>${list.map((w) => {
                    const isOpen = w.status === 'planned' || w.status === 'released';
                    const av = isOpen ? woAvailability(w) : [];
                    const shorts = av.filter((a) => a.short > 0).length;
                    return `<tr class="${isOpen && w.end < U.iso(U.today()) ? 'r-crit' : ''}">
                        <td><button class="link mono" data-act="woDetail" data-id="${esc(w.no)}">${esc(w.no)}</button></td>
                        <td>${H.anyLink(w.kod)}</td><td class="strong">${esc(w.ad)}</td><td class="num">${esc(U.qty(w.qty, 'ad'))}</td>
                        <td class="nowrap">${esc(U.date(U.parseDate(w.start)))}</td><td class="nowrap">${esc(U.date(U.parseDate(w.end)))}</td>
                        <td>${H.badge(H.WO_STATUS, w.status)}</td>
                        <td>${isOpen ? (shorts ? `<span class="badge badge-red">${shorts} eksik</span>` : '<span class="badge badge-green">Hazır</span>') : '–'}</td>
                        <td><div class="row-actions">${can && w.status === 'planned' ? `<button class="btn btn-secondary btn-sm" data-act="woRelease" data-id="${esc(w.no)}">Serbest Bırak</button>` : ''}
                            ${can && w.status === 'released' ? `<button class="btn btn-success btn-sm" data-act="woComplete" data-id="${esc(w.no)}">Tamamla</button>` : ''}
                            ${can && isOpen ? `<button class="btn btn-ghost btn-sm" data-act="woCancel" data-id="${esc(w.no)}" title="İptal">${MRP.icon('x', 'sm')}</button>` : ''}</div></td></tr>`;
                }).join('') || `<tr><td colspan="9">${H.empty('İş emri yok', 'MRP önerilerinden veya "Yeni İş Emri" ile oluşturabilirsiniz.')}</td></tr>`}</tbody>
            </table></div></section>`;
            return html;
        }
    };

    function gantt(list) {
        const today = U.iso(U.today());
        const min = [today, ...list.map((w) => w.start)].sort()[0];
        const max = [U.iso(U.addDays(U.today(), 7)), ...list.map((w) => w.end)].sort().pop();
        const total = Math.max(1, U.diffDays(max, min) + 1);
        const pct = (d) => (U.diffDays(d, min) / total) * 100;
        const color = { planned: '#64748b', released: '#3b82f6' };
        return `<div class="gantt">
            <div class="gantt-head"><div>İş emri</div><div>${esc(U.date(U.parseDate(min)))} → ${esc(U.date(U.parseDate(max)))} (${total} gün)</div><div class="text-right">Tarih</div></div>
            ${list.map((w) => {
                const left = pct(w.start);
                const width = Math.max(1.5, ((U.diffDays(w.end, w.start) + 1) / total) * 100);
                return `<div class="gantt-row"><div class="gantt-label" title="${esc(w.ad)}">${esc(w.ad)}<small>${esc(w.no)} · ${esc(U.qty(w.qty, 'ad'))}</small></div>
                    <div class="gantt-track"><span class="gantt-today" style="left:${pct(today)}%;"></span>
                        <div class="gantt-bar" style="left:${left}%;width:${width}%;background:${w.end < today ? '#ef4444' : color[w.status]};" title="${esc(w.no)}">${esc(H.WO_STATUS[w.status][1])}</div></div>
                    <div class="muted mono text-right" style="font-size:.78em;">${esc(U.date(U.parseDate(w.start)).slice(0, 5))} → ${esc(U.date(U.parseDate(w.end)).slice(0, 5))}</div></div>`;
            }).join('')}
            <div style="display:flex;gap:16px;margin-top:10px;font-size:.78em;color:var(--text-3);">
                <span><span class="badge badge-gray">Planlandı</span></span><span><span class="badge badge-blue">Serbest</span></span><span><span class="badge badge-red">Gecikmiş</span></span></div>
        </div>`;
    }

    const findWO = (no) => S().workOrders.find((w) => w.no === no);
    const woLog = (w, action) => { w.history = w.history || []; w.history.push({ action, by: MRP.auth.current().name, at: new Date().toISOString() }); };

    function openWODetail(no) {
        const w = findWO(no);
        if (!w) return;
        const av = woAvailability(w);
        const isOpen = w.status === 'planned' || w.status === 'released';
        UI.modal({
            title: `${w.no} — ${w.ad}`, size: 'lg',
            body: `<dl class="dl card card-body" style="margin-bottom:14px;grid-template-columns:repeat(4,auto 1fr);">
                    <dt>Durum</dt><dd>${H.badge(H.WO_STATUS, w.status)}</dd><dt>Miktar</dt><dd>${esc(U.qty(w.qty, 'ad'))}</dd>
                    <dt>Başlangıç</dt><dd>${esc(U.date(U.parseDate(w.start)))}</dd><dt>Bitiş</dt><dd>${esc(U.date(U.parseDate(w.end)))}</dd>
                    <dt>Kaynak</dt><dd>${esc(w.source || 'Manuel')}</dd><dt>Oluşturan</dt><dd>${esc(w.createdBy)}</dd></dl>
                <div class="table-wrap" style="max-height:340px;"><table><thead><tr><th>Kod</th><th>Bileşen</th><th class="num">İhtiyaç</th><th class="num">Eldeki</th><th class="num">Eksik</th></tr></thead><tbody>
                ${av.map((a) => `<tr class="${isOpen && a.short > 0 ? 'r-crit' : ''}"><td>${H.itemLink(a.kod)}</td><td>${esc(a.it.ad)}</td><td class="num">${esc(U.qty(a.need, a.it.unit))}</td>
                    <td class="num">${a.stocked ? esc(U.qty(a.have, a.it.unit)) : '<span class="muted">fason</span>'}</td><td class="num ${a.short > 0 ? 'tp-neg' : ''}">${a.short > 0 ? esc(U.qty(a.short, a.it.unit)) : '–'}</td></tr>`).join('')}
                </tbody></table></div>
                <h3 style="font-size:.9em;margin:16px 0 8px;">Geçmiş</h3>
                <div class="timeline">${(w.history || []).map((h) => `<div class="ev"><b>${esc(h.action)}</b><span class="d">${esc(h.by)} · ${esc(U.dateTime(h.at))}</span></div>`).join('')}</div>`,
            buttons: [{ label: 'Kapat' }]
        });
    }

    function newWO() {
        if (!H.guard('manageWO')) return;
        UI.modal({
            title: 'Yeni İş Emri', size: 'md',
            body: `<datalist id="woProducts">${M.products().map((p) => `<option value="${esc(p.kod)}">${esc(p.ad)}</option>`).join('')}${M.items().filter((i) => i.procurement === 'make').map((i) => `<option value="${esc(i.kod)}">${esc(i.ad)}</option>`).join('')}</datalist>
                <div class="form-grid">
                    <div class="field full"><label>Mamul / yarı mamul <span class="req">*</span></label><input id="woKod" list="woProducts" autocomplete="off"></div>
                    <div class="field"><label>Miktar <span class="req">*</span></label><input id="woQty" type="number" min="1" step="1" value="10"></div>
                    <div class="field"><label>Başlangıç</label><input id="woStart" type="date" value="${U.iso(U.today())}"></div>
                    <div class="field"><label>Bitiş</label><input id="woEnd" type="date" value="${U.iso(U.addDays(U.today(), 5))}"></div>
                </div>`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Oluştur', cls: 'btn-primary', onClick: (ctx) => {
                    const kod = ctx.$('#woKod').value.trim();
                    const it = M.item(kod);
                    const qty = Math.round(U.toNum(ctx.$('#woQty').value));
                    const start = ctx.$('#woStart').value, end = ctx.$('#woEnd').value;
                    if (!it || it.procurement !== 'make') { UI.toast('Geçersiz kalem', 'Üretilebilir bir mamul veya yarı mamul seçin.', 'warn'); return false; }
                    if (qty <= 0 || !start || !end || end < start) { UI.toast('Geçersiz değer', 'Miktar ve tarihleri kontrol edin.', 'warn'); return false; }
                    const u = MRP.auth.current();
                    const wo = { no: MRP.store.nextNo('IE'), kod, ad: it.ad, qty, start, end, status: 'planned', source: '', createdBy: u.name, createdAt: new Date().toISOString(), history: [] };
                    woLog(wo, 'Oluşturuldu');
                    S().workOrders.push(wo);
                    MRP.store.audit('İş emri oluşturuldu', `${wo.no}: ${kod} × ${qty}`);
                    app().commit();
                    UI.toast('İş emri oluşturuldu', wo.no, 'success');
                }
            }]
        });
    }

    async function completeWO(no) {
        if (!H.guard('manageWO')) return;
        const w = findWO(no);
        const av = woAvailability(w);
        const shorts = av.filter((a) => a.short > 0);
        if (shorts.length) {
            return UI.modal({
                title: 'Malzeme eksik — iş emri tamamlanamaz', size: 'md',
                body: `${H.banner('red', 'alert', `${shorts.length} bileşende stok yetersiz`, 'Mal kabul veya stok düzeltmesi sonrası tekrar deneyin.')}
                    <div class="table-wrap"><table><thead><tr><th>Kod</th><th class="num">İhtiyaç</th><th class="num">Eldeki</th><th class="num">Eksik</th></tr></thead><tbody>
                    ${shorts.map((a) => `<tr><td class="mono">${esc(a.kod)}</td><td class="num">${esc(U.qty(a.need, a.it.unit))}</td><td class="num">${esc(U.qty(a.have, a.it.unit))}</td><td class="num tp-neg">${esc(U.qty(a.short, a.it.unit))}</td></tr>`).join('')}
                    </tbody></table></div>`,
                buttons: [{ label: 'Kapat' }]
            });
        }
        if (!(await UI.confirm(`${w.no}: ${av.filter((a) => a.stocked).length} bileşen stoktan düşülecek ve ${U.qty(w.qty, 'ad')} ${w.kod} stoğa girecek.`, { title: 'İş emrini tamamla', okLabel: 'Tamamla' }))) return;
        av.filter((a) => a.stocked).forEach((a) => M.move({ kod: a.kod, qty: -a.need, type: 'GI', ref: w.no }));
        M.move({ kod: w.kod, qty: w.qty, type: 'FG', ref: w.no });
        w.status = 'completed';
        w.completedAt = new Date().toISOString();
        woLog(w, 'Tamamlandı — sarf ve mamul girişi yapıldı');
        MRP.store.audit('İş emri tamamlandı', `${w.no}: ${w.kod} × ${w.qty}`);
        MRP.store.notify('wo', 'İş emri tamamlandı', `${w.no} · ${w.ad} × ${w.qty}`, ['admin', 'planlama'], 'workorders');
        app().commit();
        UI.toast('İş emri tamamlandı', 'Stoklar güncellendi.', 'success');
    }

    Object.assign(MRP.actions, {
        woTab: (t) => { woState.tab = t; app().render(); },
        woDetail: (no) => openWODetail(no),
        newWO,
        woRelease: (no) => {
            if (!H.guard('manageWO')) return;
            const w = findWO(no);
            const shorts = woAvailability(w).filter((a) => a.short > 0).length;
            w.status = 'released';
            woLog(w, 'Serbest bırakıldı');
            MRP.store.audit('İş emri serbest bırakıldı', w.no);
            app().commit();
            UI.toast('İş emri serbest bırakıldı', shorts ? `Uyarı: ${shorts} bileşende eksik var.` : w.no, shorts ? 'warn' : 'success');
        },
        woComplete: (no) => completeWO(no),
        woCancel: async (no) => {
            if (!H.guard('manageWO')) return;
            if (!(await UI.confirm(`${no} iptal edilecek.`, { title: 'İş emrini iptal et', okLabel: 'İptal Et', danger: true }))) return;
            const w = findWO(no);
            w.status = 'cancelled';
            woLog(w, 'İptal edildi');
            MRP.store.audit('İş emri iptal edildi', no);
            app().commit();
        }
    });
})(window.MRP);
