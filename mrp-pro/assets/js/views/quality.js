/* ==========================================================================
   MRP Pro — Kalite Kontrol: giriş muayenesi, karantina kararı
   (kabul / tedarikçiye iade / hurda), uygunsuzluk raporu, tedarikçi kalitesi
   --------------------------------------------------------------------------
   Akış: muayeneye tabi kalem mal kabulde Kalite / Karantina (KALITE)
   lokasyonuna lot olarak girer ve bir muayene kaydı (GKK-…) açılır.
   Kalite kararı:
     - kabul  → lot KALITE'den hedef lokasyona transfer (TRF)
     - iade   → lot KALITE'den düşülür (RTV); sipariş satırının teslim alınan
                miktarı azaltılır, sipariş yeniden teslimat bekler (MRP görür)
     - hurda  → lot KALITE'den düşülür (SCR); sipariş teslim alınmış sayılır
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model, D = MRP.data;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;
    const me = () => MRP.auth.current();
    const P = () => MRP.purchasing;

    const qState = { tab: 'pending', q: '' };
    const DECISION = { return: ['badge-red', 'Tedarikçiye iade'], scrap: ['badge-gray', 'Hurda / fire'] };
    const CHECK_RES = { ok: 'Uygun', nok: 'Uygun değil', na: 'Uygulanmadı' };
    const DAY = 864e5;

    const list = () => S().inspections || [];
    const find = (no) => list().find((x) => x.no === no);
    const ageDays = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
    const checksFor = (x) => D.QC_CHECKS.filter((c) => !c.types || c.types.includes(x.tur || (M.item(x.kod) || {}).tur));
    /** Lotun karantinada kalan miktarı */
    const lotQty = (x) => U.round(U.sum(M.lots(x.kod, 'KALITE', x.lot), (l) => l.qty), 4);
    const resultBadge = (x) => {
        if (x.status === 'pending') return '<span class="badge badge-amber">Muayene bekliyor</span>';
        const r = x.result;
        if (r.rejected <= 0) return '<span class="badge badge-green">Kabul</span>';
        if (r.accepted <= 0) return '<span class="badge badge-red">Ret</span>';
        return '<span class="badge badge-violet">Kısmi kabul</span>';
    };

    MRP.views.quality = {
        title: 'Kalite Kontrol',
        subtitle: 'Giriş muayenesi, karantina kararı, uygunsuzluk ve tedarikçi kalitesi',
        render() {
            const all = list();
            const pending = all.filter((x) => x.status === 'pending').sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
            const since = Date.now() - 90 * DAY;
            const recent = all.filter((x) => x.status === 'done' && new Date(x.result.at).getTime() >= since);
            const acceptPct = recent.length ? U.sum(recent, (x) => x.result.accepted / x.qty) / recent.length : null;
            const rejectedLots = recent.filter((x) => x.result.rejected > 0);
            const quarantineValue = U.sum(pending, (x) => x.qty * M.priceTRY(x.kod));
            const oldest = pending.length ? ageDays(pending[0].receivedAt) : 0;
            const suppliers = supplierRows();

            let html = `<div class="kpis">
                ${H.kpi('Muayene Bekleyen', pending.length, pending.length ? `${U.compactCur(quarantineValue)} karantinada · en eski ${oldest} gün` : 'Karantina boş', pending.length ? (oldest >= 3 ? 'red' : 'amber') : 'green')}
                ${H.kpi('Kabul Oranı', acceptPct == null ? '–' : `%${U.num(acceptPct * 100, 1)}`, `Son 90 gün · ${recent.length} parti`, acceptPct == null ? '' : acceptPct >= 0.98 ? 'green' : acceptPct >= 0.9 ? 'amber' : 'red')}
                ${H.kpi('Reddedilen Parti', rejectedLots.length, 'Son 90 gün (kısmi dahil)', rejectedLots.length ? 'violet' : 'green')}
                ${H.kpi('Ret Değeri', U.compactCur(U.sum(rejectedLots, (x) => x.result.rejected * M.priceTRY(x.kod))), 'İade + hurda · güncel fiyatla', 'blue')}
            </div>`;
            html += H.tabs([['pending', 'Muayene bekleyen', pending.length], ['done', 'Muayene geçmişi', all.length - pending.length], ['suppliers', 'Tedarikçi kalitesi', suppliers.length], ['rules', 'Muayene kuralları', null]], qState.tab, 'qcTab');

            if (qState.tab === 'pending') return html + renderPending(pending);
            if (qState.tab === 'done') return html + renderDone(all.filter((x) => x.status === 'done'));
            if (qState.tab === 'suppliers') return html + renderSuppliers(suppliers);
            return html + renderRules();
        },
        after() {
            const el = document.getElementById('qcSearch');
            if (el && qState.q) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }
    };

    function renderPending(pending) {
        const can = MRP.auth.can('inspectQuality');
        if (!pending.length) return H.card('Muayene bekleyen parti yok', '', H.empty('Karantina boş', 'Muayeneye tabi kalemler mal kabulde buraya düşer.'));
        return `<section class="card"><div class="table-wrap"><table><thead><tr><th>Muayene</th><th>Kabul</th><th>Bekleme</th><th>Tedarikçi</th><th>Sipariş / İrsaliye</th><th>Kalem</th><th>Lot</th><th class="num">Miktar</th><th class="num">Değer ₺</th><th></th></tr></thead><tbody>
            ${pending.map((x) => {
                const d = ageDays(x.receivedAt);
                return `<tr class="${d >= 3 ? 'r-crit' : d >= 2 ? 'r-warn' : ''}"><td class="mono strong">${esc(x.no)}</td><td>${esc(U.dateTime(x.receivedAt))}</td>
                    <td><span class="badge ${d >= 3 ? 'badge-red' : d >= 2 ? 'badge-amber' : 'badge-gray'}">${d} gün</span></td>
                    <td>${esc(x.supplierName)}</td><td class="mono">${esc(x.poNo)}<br><span class="muted">${esc(x.waybill)}</span></td>
                    <td>${H.itemLink(x.kod)}<br><span class="muted">${esc(x.ad)}</span></td><td class="mono">${esc(x.lot)}</td>
                    <td class="num strong">${esc(U.qty(x.qty, x.unit))}</td><td class="num">${U.num(x.qty * M.priceTRY(x.kod))}</td>
                    <td>${can ? `<button class="btn btn-primary btn-sm" data-act="qcInspect" data-id="${esc(x.no)}">${MRP.icon('qc', 'sm')} Muayene et</button>` : '<span class="muted">Kalite yetkisi gerekir</span>'}</td></tr>`;
            }).join('')}</tbody></table></div></section>
            <p class="muted" style="font-size:.78em;margin-top:10px;">Karantinadaki stok MRP'de eldeki stok sayılır ancak üretime sarf edilemez ve elle transfer edilemez. 2 günden uzun bekleyen partiler sarı, 3 günü geçenler kırmızı işaretlenir.</p>`;
    }

    function renderDone(done) {
        const q = qState.q.toLocaleLowerCase('tr');
        const rows = done.filter((x) => !q || [x.no, x.kod, x.ad, x.supplierName, x.poNo, x.lot, x.waybill].some((v) => String(v || '').toLocaleLowerCase('tr').includes(q)))
            .sort((a, b) => b.result.at.localeCompare(a.result.at));
        return `<div class="toolbar"><input class="input" id="qcSearch" placeholder="Muayene no, kalem, tedarikçi, lot…" value="${esc(qState.q)}" data-input="qcSearch"></div>
            <section class="card"><div class="table-wrap"><table><thead><tr><th>Muayene</th><th>Karar tarihi</th><th>Tedarikçi</th><th>Kalem</th><th>Lot</th><th class="num">Miktar</th><th class="num">Kabul</th><th class="num">Ret</th><th>Sonuç</th><th>Ret kararı</th><th>Muayene eden</th><th></th></tr></thead><tbody>
            ${rows.map((x) => `<tr><td class="mono strong">${esc(x.no)}</td><td>${esc(U.dateTime(x.result.at))}</td><td>${esc(x.supplierName)}</td>
                <td>${H.itemLink(x.kod)}<br><span class="muted">${esc(x.ad)}</span></td><td class="mono">${esc(x.lot)}</td>
                <td class="num">${esc(U.qty(x.qty, x.unit))}</td><td class="num">${esc(U.qty(x.result.accepted))}</td>
                <td class="num ${x.result.rejected > 0 ? 'tp-neg' : ''}">${esc(U.qty(x.result.rejected))}</td><td>${resultBadge(x)}</td>
                <td>${x.result.rejected > 0 ? H.badge(DECISION, x.result.decision) : '<span class="muted">–</span>'}</td><td>${esc(x.result.by)}</td>
                <td><button class="btn btn-ghost btn-sm" data-act="qcDetail" data-id="${esc(x.no)}">Detay</button></td></tr>`).join('')
            || `<tr><td colspan="12">${H.empty('Kayıt yok', q ? 'Aramayla eşleşen muayene yok.' : 'Tamamlanan muayeneler burada listelenir.')}</td></tr>`}</tbody></table></div></section>`;
    }

    function supplierRows() {
        const ids = new Set(list().map((x) => x.supplierId));
        S().pos.forEach((p) => { if ((p.receipts || []).some((r) => r.quality === 'rejected')) ids.add(p.supplierId); });
        return [...ids].map((id) => ({ s: S().suppliers.find((x) => x.id === id) || { id, ad: id }, q: M.supplierQuality(id), pending: list().filter((x) => x.supplierId === id && x.status === 'pending').length }))
            .sort((a, b) => b.q.ppm - a.q.ppm || b.q.doorRejects - a.q.doorRejects);
    }

    function renderSuppliers(rows) {
        if (!rows.length) return H.card('Tedarikçi kalitesi', '', H.empty('Henüz muayene verisi yok', 'Muayeneler tamamlandıkça tedarikçi bazında kabul oranı ve PPM hesaplanır.'));
        return `<section class="card"><div class="table-wrap"><table><thead><tr><th>Tedarikçi</th><th class="num">Muayene edilen parti</th><th class="num">Tam kabul</th><th class="num">Ret / kısmi</th><th class="num">Kapıda ret</th><th class="num">Bekleyen</th><th class="num">Kabul oranı</th><th class="num">PPM</th><th class="num">Ret değeri ₺</th><th class="num">Tedarikçi puanı</th></tr></thead><tbody>
            ${rows.map(({ s, q, pending }) => `<tr><td class="strong">${esc(s.ad)}</td><td class="num">${q.lots}</td><td class="num">${q.full}</td>
                <td class="num ${q.partial ? 'tp-neg' : ''}">${q.partial}</td><td class="num ${q.doorRejects ? 'tp-neg' : ''}">${q.doorRejects}</td><td class="num">${pending || '·'}</td>
                <td class="num">${q.acceptPct == null ? '–' : `%${U.num(q.acceptPct * 100, 1)}`}</td>
                <td class="num"><span class="badge ${q.ppm > 50000 ? 'badge-red' : q.ppm > 10000 ? 'badge-amber' : 'badge-green'}">${q.ppm.toLocaleString('tr-TR')}</span></td>
                <td class="num">${U.num(q.rejectedValue)}</td><td class="num strong">${s.kategoriler ? U.num(M.supplierScore(s), 1) : '–'}</td></tr>`).join('')}</tbody></table></div></section>
            <p class="muted" style="font-size:.78em;margin-top:10px;">PPM: muayene edilen partilerde ortalama ret oranı × 1.000.000. Kabul oranı tedarikçi puanının %40'lık kalite bileşenine yansır (zamanında teslim %60); puan, teklif karşılaştırma ve tedarikçi önerisinde kullanılır.</p>`;
    }

    function renderRules() {
        const canEdit = MRP.auth.can('editItem') || MRP.auth.can('inspectQuality');
        const buy = M.items().filter((i) => i.procurement === 'buy');
        const byType = {};
        buy.forEach((i) => { (byType[i.tur] = byType[i.tur] || { tur: i.tur, total: 0, inspect: 0 }).total++; if (i.inspect) byType[i.tur].inspect++; });
        return H.card('Malzeme türüne göre muayene kapsamı', 'Kalem bazında değiştirmek için malzeme kartında "Giriş kalite muayenesi gerekli" seçeneğini kullanın', `<div class="table-wrap"><table>
            <thead><tr><th>Malzeme türü</th><th class="num">Kalem</th><th class="num">Muayeneli</th><th>Kontrol listesi</th><th></th></tr></thead><tbody>
            ${Object.values(byType).sort((a, b) => a.tur.localeCompare(b.tur, 'tr')).map((t) => `<tr><td class="strong">${esc(t.tur)}</td><td class="num">${t.total}</td>
                <td class="num">${t.inspect === t.total ? `<span class="badge badge-amber">Tümü (${t.inspect})</span>` : t.inspect ? `<span class="badge badge-violet">${t.inspect}</span>` : '<span class="badge badge-gray">Yok</span>'}</td>
                <td style="font-size:.85em;">${esc(D.QC_CHECKS.filter((c) => !c.types || c.types.includes(t.tur)).map((c) => c.label).join(' · '))}</td>
                <td>${canEdit ? `<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="qcTypeRule" data-id="${esc(t.tur)}|1" ${t.inspect === t.total ? 'disabled' : ''}>Tümünü muayeneye al</button>
                    <button class="btn btn-ghost btn-sm" data-act="qcTypeRule" data-id="${esc(t.tur)}|0" ${t.inspect ? '' : 'disabled'}>Muayeneden çıkar</button></div>` : ''}</td></tr>`).join('')}</tbody></table></div>`);
    }

    /** Bir türdeki tüm satın alınan kalemlerin muayene kuralını değiştirir */
    async function setTypeRule(id) {
        if (!MRP.auth.can('editItem') && !H.guard('inspectQuality')) return;
        const [tur, on] = id.split('|');
        const flag = on === '1';
        const items = M.items().filter((i) => i.procurement === 'buy' && i.tur === tur && !!i.inspect !== flag);
        if (!items.length) return;
        if (!(await UI.confirm(`${tur} türündeki ${items.length} kalem ${flag ? 'giriş muayenesine alınacak' : 'giriş muayenesinden çıkarılacak'}. Bekleyen muayeneler etkilenmez.`, { title: 'Muayene kuralı', okLabel: 'Uygula' }))) return;
        items.forEach((i) => {
            if (S().customItems[i.kod]) S().customItems[i.kod].inspect = flag;
            else S().itemOverrides[i.kod] = { ...(S().itemOverrides[i.kod] || {}), inspect: flag };
        });
        MRP.store.audit('Muayene kuralı değişti', `${tur}: ${items.length} kalem → ${flag ? 'muayeneli' : 'muayenesiz'}`);
        app().commit();
        UI.toast('Muayene kuralı güncellendi', `${tur} · ${items.length} kalem`, 'success');
    }

    // ---------------- Muayene formu ----------------
    function inspect(no) {
        if (!H.guard('inspectQuality')) return;
        const x = find(no);
        if (!x || x.status !== 'pending') return;
        const checks = checksFor(x);
        const locOpts = M.CONSUME_LOCS.map((k) => `<option value="${k}" ${k === x.targetLoc ? 'selected' : ''}>${esc(M.LOCATIONS[k].ad)}</option>`).join('');
        UI.modal({
            title: `Giriş Muayenesi — ${x.no}`, size: 'lg',
            body: `<dl class="dl card card-body" style="margin-bottom:14px;grid-template-columns:repeat(4,auto 1fr);">
                    <dt>Kalem</dt><dd><b class="mono">${esc(x.kod)}</b> ${esc(x.ad)}</dd><dt>Miktar</dt><dd class="strong">${esc(U.qty(x.qty, x.unit))}</dd>
                    <dt>Tedarikçi</dt><dd>${esc(x.supplierName)}</dd><dt>Lot</dt><dd class="mono">${esc(x.lot)}</dd>
                    <dt>Sipariş</dt><dd class="mono">${esc(x.poNo)}</dd><dt>İrsaliye</dt><dd>${esc(x.waybill)}</dd>
                    <dt>Mal kabul</dt><dd>${esc(U.dateTime(x.receivedAt))} · ${esc(x.receivedBy)}</dd><dt>Bekleme</dt><dd>${ageDays(x.receivedAt)} gün</dd></dl>
                <div class="form-section"><h3>Kontrol listesi</h3><div class="qc-checks">
                    ${checks.map((c) => `<span>${esc(c.label)}</span><span class="seg">
                        <label class="ok"><input type="radio" name="qc_${c.id}" value="ok" checked>Uygun</label>
                        <label class="nok"><input type="radio" name="qc_${c.id}" value="nok">Uygun değil</label>
                        <label><input type="radio" name="qc_${c.id}" value="na">—</label></span>`).join('')}
                </div><p class="hint" id="qcHint" style="margin-top:8px;"></p></div>
                <div class="form-section"><h3>Karar</h3><div class="form-grid">
                    <div class="field"><label>Kabul edilen (${esc(x.unit)}) <span class="req">*</span></label><input id="qcAcc" type="number" min="0" max="${x.qty}" step="any" value="${x.qty}"></div>
                    <div class="field"><label>Reddedilen (${esc(x.unit)})</label><input id="qcRej" readonly value="0"></div>
                    <div class="field"><label>Kabul edilen → lokasyon</label><select id="qcLoc">${locOpts}</select></div>
                    <div class="field"><label>Reddedilen için karar</label><select id="qcDec" disabled><option value="return">Tedarikçiye iade (sipariş yeniden açılır)</option><option value="scrap">Hurda / fire (stoktan düşülür)</option></select></div>
                    <div class="field"><label>Ret sebebi</label><select id="qcReason" disabled><option value="">Seçin…</option>${D.QC_REASONS.map((r) => `<option>${esc(r)}</option>`).join('')}</select></div>
                    <div class="field full"><label>Not / bulgu</label><textarea id="qcNote" placeholder="Ölçüm değerleri, kusur açıklaması, şartlı kabul gerekçesi…"></textarea></div>
                </div></div>`,
            onOpen: (ctx) => {
                const upd = () => {
                    const acc = Math.min(x.qty, Math.max(0, U.toNum(ctx.$('#qcAcc').value)));
                    const rej = U.round(x.qty - acc, 4);
                    ctx.$('#qcRej').value = U.qty(rej, x.unit);
                    ctx.$('#qcDec').disabled = rej <= 0;
                    ctx.$('#qcReason').disabled = rej <= 0;
                    const fails = ctx.$$('.qc-checks input[value="nok"]:checked').length;
                    ctx.$('#qcHint').textContent = fails ? `${fails} kontrol uygun değil — ${rej > 0 ? 'ret sebebi seçin.' : 'tamamı kabul edilecekse şartlı kabul gerekçesini nota yazın.'}` : 'Tüm kontroller uygunsa kabul miktarı tam miktar bırakılabilir.';
                };
                ctx.$('#qcAcc').addEventListener('input', upd);
                ctx.$$('.qc-checks input').forEach((i) => i.addEventListener('change', upd));
                upd();
            },
            buttons: [{ label: 'Vazgeç' }, { label: 'Tamamını reddet', cls: 'btn-secondary', onClick: (ctx) => { ctx.$('#qcAcc').value = 0; ctx.$('#qcAcc').dispatchEvent(new Event('input')); return false; } },
                { label: 'Kararı Kaydet', cls: 'btn-success', icon: 'check', onClick: (ctx) => submit(ctx, x, checks) }]
        });
    }

    function submit(ctx, x, checks) {
        const accRaw = U.toNum(ctx.$('#qcAcc').value, NaN);
        if (!(accRaw >= 0) || accRaw > x.qty + 1e-9) { UI.toast('Geçersiz kabul miktarı', `0 ile ${U.qty(x.qty, x.unit)} arasında olmalı.`, 'warn'); return false; }
        const accepted = U.round(accRaw, 4);
        const rejected = U.round(x.qty - accepted, 4);
        const res = Object.fromEntries(checks.map((c) => [c.id, (ctx.$(`input[name="qc_${c.id}"]:checked`) || {}).value || 'na']));
        const fails = Object.values(res).filter((v) => v === 'nok').length;
        const decision = rejected > 0 ? ctx.$('#qcDec').value : null;
        const reason = rejected > 0 ? ctx.$('#qcReason').value : '';
        const note = ctx.$('#qcNote').value.trim();
        const targetLoc = ctx.$('#qcLoc').value;
        if (rejected > 0 && !reason) { UI.toast('Ret sebebi seçin', 'Reddedilen miktar için sebep zorunludur.', 'warn'); return false; }
        if (fails && rejected <= 0 && !note) { UI.toast('Şartlı kabul gerekçesi', 'Uygun olmayan kontrol varken tamamı kabul ediliyorsa nota gerekçe yazın.', 'warn'); return false; }
        if (lotQty(x) + 1e-9 < x.qty) { UI.toast('Karantina stoğu değişmiş', `Lot ${x.lot} için karantinada ${U.qty(lotQty(x), x.unit)} var; kayıt ERP/başka kullanıcı tarafından değiştirilmiş olabilir.`, 'error', 6000); return false; }

        if (accepted > 0) M.move({ kod: x.kod, qty: accepted, type: 'TRF', loc: 'KALITE', toLoc: targetLoc, onlyLot: x.lot, ref: x.no, note: `Kalite kabul · ${x.poNo}` });
        if (rejected > 0) {
            M.move({ kod: x.kod, qty: -rejected, type: decision === 'return' ? 'RTV' : 'SCR', loc: 'KALITE', onlyLot: x.lot, ref: x.no, supplier: x.supplierName,
                note: `${decision === 'return' ? 'Tedarikçiye iade' : 'Hurda'} · ${reason}${note ? ' — ' + note : ''}` });
            if (decision === 'return') reopenForReplacement(x, rejected, reason);
        }
        x.status = 'done';
        x.result = { accepted, rejected, decision, reason, checks: res, note, targetLoc, by: me().name, at: new Date().toISOString() };

        const label = rejected <= 0 ? 'kabul' : accepted <= 0 ? 'ret' : 'kısmi kabul';
        MRP.store.audit('Giriş muayenesi', `${x.no} · ${x.kod} lot ${x.lot}: ${label} (kabul ${U.qty(accepted)}, ret ${U.qty(rejected)}${decision ? ', ' + DECISION[decision][1] : ''})`);
        if (rejected > 0) {
            MRP.store.notify('quality', `Kalite reddi — ${DECISION[decision][1]}`, `${x.no} · ${x.supplierName} · ${x.kod}: ${U.qty(rejected, x.unit)} (${reason})`,
                ['perm:createPO', 'perm:runMRP', 'perm:receiveGoods'], 'quality');
        } else {
            MRP.store.notify('quality', 'Muayene tamamlandı — kabul', `${x.no} · ${x.kod} ${U.qty(accepted, x.unit)} → ${M.LOCATIONS[targetLoc].ad}`, ['perm:receiveGoods', 'perm:manageWO'], 'stock');
        }
        app().commit();
        UI.toast(`Muayene kaydedildi — ${label}`, rejected > 0 ? `${U.qty(rejected, x.unit)} ${DECISION[decision][1].toLocaleLowerCase('tr')}` : `${U.qty(accepted, x.unit)} stoğa alındı`, rejected > 0 ? 'warn' : 'success');
    }

    /** İade: siparişin teslim alınan miktarı düşer, sipariş ve talep yeniden teslimat bekler */
    function reopenForReplacement(x, qty, reason) {
        const p = P().findPO(x.poNo);
        if (!p || p.status === 'cancelled') return;
        const line = p.lines.find((l) => l.kod === x.kod && (l.received || 0) >= qty - 1e-9) || p.lines.find((l) => l.kod === x.kod);
        if (!line) return;
        line.received = U.round(Math.max(0, (line.received || 0) - qty), 4);
        line.returned = U.round((line.returned || 0) + qty, 4);
        if (p.status === 'received') p.status = 'partial';
        P().log(p, 'Kalite iadesi', `${x.no} · ${x.kod} ${U.qty(qty, x.unit)} (${reason}) — yeniden teslimat bekleniyor`);
        const r = P().findReq(p.requestNo);
        if (r && r.status === 'closed') { r.status = 'ordered'; P().log(r, 'Yeniden açıldı', `${p.no}: kalite iadesi`); }
    }

    // ---------------- Detay ve uygunsuzluk raporu ----------------
    function detail(no) {
        const x = find(no);
        if (!x || x.status !== 'done') return;
        const r = x.result;
        const checks = checksFor(x);
        const buttons = [{ label: 'Kapat' }];
        if (r.rejected > 0) buttons.unshift({ label: 'Uygunsuzluk Raporu (PDF)', cls: 'btn-secondary', icon: 'download', onClick: () => { printNCR(x); return false; } });
        UI.modal({
            title: `${x.no} — ${x.kod}`, size: 'lg', buttons,
            body: `<div class="grid grid-2" style="margin-bottom:14px;">
                <dl class="dl card card-body"><dt>Kalem</dt><dd>${esc(x.ad)}</dd><dt>Tedarikçi</dt><dd>${esc(x.supplierName)}</dd><dt>Sipariş / İrsaliye</dt><dd class="mono">${esc(x.poNo)} / ${esc(x.waybill)}</dd>
                    <dt>Lot</dt><dd class="mono">${esc(x.lot)}</dd><dt>Mal kabul</dt><dd>${esc(U.dateTime(x.receivedAt))} · ${esc(x.receivedBy)}</dd></dl>
                <dl class="dl card card-body"><dt>Sonuç</dt><dd>${resultBadge(x)}</dd><dt>Muayene edilen</dt><dd>${esc(U.qty(x.qty, x.unit))}</dd>
                    <dt>Kabul</dt><dd>${esc(U.qty(r.accepted, x.unit))}${r.accepted > 0 ? ` → ${esc(M.LOCATIONS[r.targetLoc] ? M.LOCATIONS[r.targetLoc].ad : r.targetLoc)}` : ''}</dd>
                    <dt>Ret</dt><dd>${r.rejected > 0 ? `${esc(U.qty(r.rejected, x.unit))} · ${H.badge(DECISION, r.decision)} · ${esc(r.reason)}` : '–'}</dd>
                    <dt>Muayene eden</dt><dd>${esc(r.by)} · ${esc(U.dateTime(r.at))}</dd></dl></div>
                <div class="table-wrap"><table><thead><tr><th>Kontrol</th><th>Sonuç</th></tr></thead><tbody>
                    ${checks.map((c) => { const v = r.checks[c.id] || 'na'; return `<tr><td>${esc(c.label)}</td><td><span class="badge ${v === 'ok' ? 'badge-green' : v === 'nok' ? 'badge-red' : 'badge-gray'}">${CHECK_RES[v]}</span></td></tr>`; }).join('')}
                </tbody></table></div>
                ${r.note ? `<p style="margin-top:12px;"><b>Not:</b> ${esc(r.note)}</p>` : ''}`
        });
    }

    function printNCR(x) {
        if (!window.jspdf) return UI.toast('PDF kütüphanesi yüklenemedi', 'İnternet bağlantınızı kontrol edin.', 'error');
        const T = U.pdfText, r = x.result;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        doc.setFillColor(17, 23, 41); doc.rect(0, 0, pw, 28, 'F');
        doc.setTextColor(239, 68, 68); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
        doc.text(T('UYGUNSUZLUK RAPORU'), 14, 13);
        doc.setTextColor(230, 233, 242); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`${x.no}  |  ${T(U.date(r.at))}${S().branding && S().branding.company ? '  |  ' + T(S().branding.company) : ''}`, 14, 21);
        doc.setTextColor(23, 32, 51); doc.setFontSize(9.5);
        const info = [['Tedarikçi', x.supplierName], ['Sipariş / İrsaliye', `${x.poNo} / ${x.waybill}`], ['Malzeme', `${x.kod} - ${x.ad}`], ['Lot', x.lot],
            ['Teslim alınan', U.qty(x.qty, x.unit)], ['Kabul edilen', U.qty(r.accepted, x.unit)], ['Reddedilen', U.qty(r.rejected, x.unit)],
            ['Ret sebebi', r.reason], ['Karar', DECISION[r.decision][1]], ['Muayene eden', `${r.by} - ${U.dateTime(r.at)}`]];
        info.forEach(([k, v], i) => { doc.setFont('helvetica', 'bold'); doc.text(T(k) + ':', 14, 38 + i * 6); doc.setFont('helvetica', 'normal'); doc.text(T(String(v)).slice(0, 90), 52, 38 + i * 6); });
        doc.autoTable({
            startY: 102,
            head: [['Kontrol', 'Sonuç'].map(T)],
            body: checksFor(x).map((c) => [T(c.label), T(CHECK_RES[r.checks[c.id] || 'na'])]),
            theme: 'grid', headStyles: { fillColor: [17, 23, 41], textColor: [239, 68, 68], fontSize: 8.5 }, bodyStyles: { fontSize: 8.5 },
            margin: { left: 14, right: 14 },
            didParseCell: (d) => { if (d.section === 'body' && d.column.index === 1 && d.cell.raw === T('Uygun değil')) d.cell.styles.textColor = [200, 30, 30]; }
        });
        let y = doc.lastAutoTable.finalY + 8;
        if (r.note) { doc.setFont('helvetica', 'bold'); doc.text(T('Bulgu / not:'), 14, y); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(T(r.note), pw - 28), 14, y + 6); y += 18; }
        doc.setFontSize(9);
        doc.text(T(r.decision === 'return' ? 'Reddedilen miktarın iadesi ve aynı miktarın yeniden teslimi talep edilmektedir. Düzeltici faaliyet bildiriminiz rica olunur.'
            : 'Reddedilen miktar hurdaya ayrılmıştır. Düzeltici faaliyet bildiriminiz rica olunur.'), 14, y + 4, { maxWidth: pw - 28 });
        const sy = Math.max(y + 30, 240);
        doc.line(14, sy, 80, sy); doc.line(pw - 80, sy, pw - 14, sy);
        doc.text(T('Kalite Kontrol'), 14, sy + 5); doc.text(T('Tedarikçi onayı'), pw - 80, sy + 5);
        doc.save(`${x.no}_uygunsuzluk.pdf`);
        MRP.store.audit('Uygunsuzluk raporu yazdırıldı', x.no);
    }

    const rerender = U.debounce(() => app().render(), 250);
    Object.assign(MRP.actions, {
        qcTab: (id) => { qState.tab = id; app().render(); },
        qcSearch: (v) => { qState.q = v; rerender(); },
        qcInspect: (id) => inspect(id),
        qcDetail: (id) => detail(id),
        qcTypeRule: (id) => setTypeRule(id)
    });
})(window.MRP);
