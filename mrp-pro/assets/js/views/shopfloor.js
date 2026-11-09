/* ==========================================================================
   MRP Pro — Atölye Takibi: operasyon bazında üretim bildirimi
   --------------------------------------------------------------------------
   Serbest bırakılan iş emrinin rotası operasyonlara açılır (wo.ops).
   Operatör her operasyonu başlatır, duruş (sebebiyle) bildirir, sağlam ve
   fire miktarını girer, bitirir. Bir operasyonun girdisi önceki operasyonun
   sağlam çıktısıdır. Kayıtlardan iş merkezi bazında kullanılabilirlik,
   performans, kalite ve OEE hesaplanır.
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;
    const me = () => MRP.auth.current();

    const DOWN_REASONS = ['Arıza', 'Malzeme bekleme', 'Ayar / kalıp değişimi', 'Kalite bekleme', 'Personel / mola', 'Planlı bakım', 'Diğer'];
    const SCRAP_REASONS = ['Ölçü hatası', 'Malzeme hatası', 'Yüzey / boya hatası', 'Kaynak hatası', 'Montaj hatası', 'Hasar', 'Diğer'];
    const OP_STATUS = { waiting: ['badge-blue', 'Bekliyor'], running: ['badge-green', 'Çalışıyor'], paused: ['badge-red', 'Duruşta'], done: ['badge-gray', 'Bitti'] };
    const sfState = { tab: 'board', wc: '', days: 30 };
    const EPS = 1e-9;

    const nowIso = () => new Date().toISOString();
    const minsBetween = (a, b) => Math.max(0, (new Date(b) - new Date(a)) / 60000);
    const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} sa ${Math.round(m % 60)} dk` : `${Math.round(m)} dk`);
    const findWO = (no) => S().workOrders.find((w) => w.no === no);
    const wcName = (id) => (M.workCenter(id) || { ad: id }).ad;

    // ---------------- Model ----------------
    /** İş emrinin operasyonlarını rotadan oluşturur (bir kez; rota sonradan değişse de emir sabit kalır) */
    function ensureOps(w) {
        if (Array.isArray(w.ops) && w.ops.length) return w.ops;
        w.ops = M.routing(w.kod).map((op, i) => ({
            seq: (i + 1) * 10, wc: op.wc, setup: op.setup, run: op.run, status: 'waiting',
            good: 0, scrap: 0, runMin: 0, downMin: 0, startedAt: null, endedAt: null, cur: null, logs: []
        }));
        return w.ops;
    }
    /** Operasyona giren miktar: ilk operasyonda emir miktarı, sonrakilerde önceki operasyonun sağlam çıktısı */
    const inputQty = (w, i) => (i === 0 ? w.qty : w.ops[i - 1].good);
    const remaining = (w, i) => U.round(inputQty(w, i) - w.ops[i].good - w.ops[i].scrap, 4);
    const blockedReason = (w, i) => {
        if (w.status !== 'released') return 'İş emri serbest bırakılmadı';
        if (i > 0 && w.ops[i - 1].good <= EPS) return `Önceki operasyon (${w.ops[i - 1].seq} ${wcName(w.ops[i - 1].wc)}) çıktı vermedi`;
        return '';
    };
    const opName = (w, i) => `${w.no} · ${w.ops[i].seq} ${wcName(w.ops[i].wc)}`;

    /** Açık çalışma/duruş parçasını kapatır; çalışma süresi elle düzeltilebilir */
    function closeSegment(op, overrideMin) {
        const c = op.cur;
        if (!c) return;
        const end = nowIso();
        const min = U.round(overrideMin != null ? overrideMin : minsBetween(c.start, end), 2);
        if (c.kind === 'run') { op.runMin = U.round(op.runMin + min, 2); op.logs.push({ type: 'run', start: c.start, end, min, operator: c.operator }); }
        else { op.downMin = U.round(op.downMin + min, 2); op.logs.push({ type: 'down', start: c.start, end, min, reason: c.reason, operator: c.operator, note: c.note || '' }); }
        op.cur = null;
    }
    function addQty(op, good, scrap, scrapReason, operator, note) {
        if (good <= EPS && scrap <= EPS) return;
        op.good = U.round(op.good + good, 4);
        op.scrap = U.round(op.scrap + scrap, 4);
        op.logs.push({ type: 'qty', at: nowIso(), good, scrap, scrapReason: scrap > EPS ? scrapReason : '', operator, note: note || '' });
    }
    const curMin = (op) => (op.cur ? minsBetween(op.cur.start, nowIso()) : 0);
    const stdMin = (op, qty) => op.setup + op.run * qty;

    function activeCount() {
        let n = 0;
        S().workOrders.forEach((w) => { if (w.status === 'released' && w.ops) w.ops.forEach((o) => { if (o.status === 'running' || o.status === 'paused') n++; }); });
        return n;
    }
    /** İş emri listesi için kısa durum */
    function woProgress(w) {
        if (!w.ops || !w.ops.length) return null;
        const i = w.ops.findIndex((o) => o.status !== 'done');
        const last = w.ops[w.ops.length - 1];
        if (i < 0) return { text: `Hazır · ${U.qty(last.good)} sağlam`, badge: 'badge-green', ready: true };
        const o = w.ops[i];
        const st = o.status === 'waiting' && w.ops.some((x) => x.status !== 'waiting') ? ['badge-blue', 'Sırada'] : OP_STATUS[o.status];
        return { text: `${o.seq} ${wcName(o.wc)} · ${st[1]}`, badge: st[0], ready: false };
    }

    // ---------------- İşlemler ----------------
    function guardOp(no, i) {
        if (!H.guard('reportProduction')) return null;
        const w = findWO(no);
        if (!w || !w.ops || !w.ops[i]) return null;
        return { w, op: w.ops[i] };
    }
    const operatorField = () => `<div class="field"><label>Operatör</label><input id="sfOperator" value="${esc(me().name)}" autocomplete="off"></div>`;
    const operatorOf = (ctx) => ctx.$('#sfOperator').value.trim() || me().name;

    function start(id) {
        const [no, si] = id.split('|'); const i = +si;
        const g = guardOp(no, i); if (!g) return;
        const { w, op } = g;
        const why = blockedReason(w, i);
        if (why) return UI.toast('Başlatılamaz', why, 'warn');
        if (op.status !== 'waiting') return;
        UI.modal({
            title: `Operasyonu başlat — ${opName(w, i)}`, size: 'sm',
            body: `<p style="margin-bottom:12px;">${esc(w.ad)}<br><span class="muted">Girdi: ${esc(U.qty(inputQty(w, i), 'ad'))} · standart süre ${esc(fmtMin(stdMin(op, inputQty(w, i))))}</span></p><div class="form-grid">${operatorField()}</div>`,
            buttons: [{ label: 'Vazgeç' }, { label: 'Başlat', cls: 'btn-success', icon: 'play', onClick: (ctx) => {
                op.status = 'running';
                op.startedAt = op.startedAt || nowIso();
                op.cur = { kind: 'run', start: nowIso(), operator: operatorOf(ctx) };
                MRP.store.audit('Operasyon başlatıldı', `${opName(w, i)} · ${op.cur.operator}`);
                app().commit();
                UI.toast('Operasyon başladı', opName(w, i), 'success');
            } }]
        });
    }

    function pause(id) {
        const [no, si] = id.split('|'); const i = +si;
        const g = guardOp(no, i); if (!g) return;
        const { w, op } = g;
        if (op.status !== 'running') return;
        UI.modal({
            title: `Duruş bildir — ${opName(w, i)}`, size: 'sm',
            body: `<div class="form-grid">
                <div class="field full"><label>Duruş sebebi <span class="req">*</span></label><select id="sfReason"><option value="">Seçin…</option>${DOWN_REASONS.map((r) => `<option>${esc(r)}</option>`).join('')}</select></div>
                <div class="field full"><label>Açıklama</label><input id="sfNote" placeholder="Örn. testere zinciri koptu" autocomplete="off"></div>
                ${operatorField()}</div>`,
            buttons: [{ label: 'Vazgeç' }, { label: 'Duruşu Başlat', cls: 'btn-danger', icon: 'pause', onClick: (ctx) => {
                const reason = ctx.$('#sfReason').value;
                if (!reason) { UI.toast('Duruş sebebi seçin', '', 'warn'); return false; }
                closeSegment(op);
                op.status = 'paused';
                op.cur = { kind: 'down', start: nowIso(), reason, note: ctx.$('#sfNote').value.trim(), operator: operatorOf(ctx) };
                MRP.store.audit('Duruş', `${opName(w, i)} · ${reason}`);
                if (reason === 'Arıza' || reason === 'Malzeme bekleme') MRP.store.notify('wo', `Atölye duruşu — ${reason}`, `${opName(w, i)} · ${w.ad}${op.cur.note ? ' · ' + op.cur.note : ''}`, ['perm:manageWO'], 'shopfloor');
                app().commit();
                UI.toast('Duruş başladı', reason, 'warn');
            } }]
        });
    }

    function resume(id) {
        const [no, si] = id.split('|'); const i = +si;
        const g = guardOp(no, i); if (!g) return;
        const { w, op } = g;
        if (op.status !== 'paused') return;
        const reason = op.cur ? op.cur.reason : '';
        closeSegment(op);
        op.status = 'running';
        op.cur = { kind: 'run', start: nowIso(), operator: me().name };
        MRP.store.audit('Duruş bitti', `${opName(w, i)} · ${reason}`);
        app().commit();
        UI.toast('Çalışmaya devam', opName(w, i), 'success');
    }

    /** Miktar bildirimi (finish=true ise operasyonu da bitirir) */
    function report(id, finish) {
        const [no, si] = id.split('|'); const i = +si;
        const g = guardOp(no, i); if (!g) return;
        const { w, op } = g;
        if (op.status !== 'running' && op.status !== 'paused') return;
        const rem = remaining(w, i);
        const segMin = op.cur && op.cur.kind === 'run' ? curMin(op) : 0;
        const isLast = i === w.ops.length - 1;
        UI.modal({
            title: `${finish ? 'Operasyonu bitir' : 'Üretim bildir'} — ${opName(w, i)}`, size: 'md',
            body: `<dl class="dl card card-body" style="margin-bottom:14px;grid-template-columns:auto 1fr auto 1fr;">
                    <dt>Girdi</dt><dd>${esc(U.qty(inputQty(w, i), 'ad'))}</dd><dt>Bildirilen</dt><dd>${esc(U.qty(op.good, 'ad'))} sağlam · ${esc(U.qty(op.scrap, 'ad'))} fire</dd>
                    <dt>Kalan</dt><dd class="strong">${esc(U.qty(rem, 'ad'))}</dd><dt>Çalışma</dt><dd>${esc(fmtMin(op.runMin + segMin))}${op.downMin ? ` · duruş ${esc(fmtMin(op.downMin + (op.cur && op.cur.kind === 'down' ? curMin(op) : 0)))}` : ''}</dd></dl>
                <div class="form-grid">
                    <div class="field"><label>Sağlam (ad)</label><input id="sfGood" type="number" min="0" step="1" value="${finish ? Math.max(0, Math.floor(rem)) : 0}"></div>
                    <div class="field"><label>Fire (ad)</label><input id="sfScrap" type="number" min="0" step="1" value="0"></div>
                    <div class="field"><label>Fire sebebi</label><select id="sfScrapReason"><option value="">–</option>${SCRAP_REASONS.map((r) => `<option>${esc(r)}</option>`).join('')}</select></div>
                    ${operatorField()}
                    ${finish && op.cur && op.cur.kind === 'run' ? `<div class="field"><label>Bu çalışma süresi (dk)</label><input id="sfMin" type="number" min="0" step="1" value="${Math.round(segMin)}"><span class="hint">Saat kaydı unutulduysa düzeltin.</span></div>` : ''}
                    <div class="field full"><label>Not</label><input id="sfNote" autocomplete="off"></div>
                </div>
                ${finish && isLast ? '<p class="hint" style="margin-top:10px;">Son operasyon: bittiğinde iş emri "tamamlanmaya hazır" olur; üretim şefi tamamlayınca sağlam miktar stoğa girer.</p>' : ''}`,
            buttons: [{ label: 'Vazgeç' }, { label: finish ? 'Bitir' : 'Kaydet', cls: finish ? 'btn-success' : 'btn-primary', icon: finish ? 'check' : 'plus', onClick: (ctx) => {
                const good = Math.max(0, Math.round(U.toNum(ctx.$('#sfGood').value)));
                const scrap = Math.max(0, Math.round(U.toNum(ctx.$('#sfScrap').value)));
                const scrapReason = ctx.$('#sfScrapReason').value;
                if (good + scrap > rem + EPS) { UI.toast('Miktar fazla', `Bu operasyonda kalan girdi ${U.qty(rem, 'ad')}.`, 'warn'); return false; }
                if (scrap > 0 && !scrapReason) { UI.toast('Fire sebebi seçin', '', 'warn'); return false; }
                if (!finish && good + scrap <= 0) { UI.toast('Miktar girin', 'Sağlam veya fire miktarı girin.', 'warn'); return false; }
                const operator = operatorOf(ctx);
                addQty(op, good, scrap, scrapReason, operator, ctx.$('#sfNote').value.trim());
                if (finish) {
                    const ov = ctx.$('#sfMin') ? Math.max(0, U.toNum(ctx.$('#sfMin').value)) : null;
                    closeSegment(op, ov);
                    op.status = 'done';
                    op.endedAt = nowIso();
                    if (op.good + op.scrap < inputQty(w, i) - EPS) op.shortClosed = U.round(inputQty(w, i) - op.good - op.scrap, 4);
                }
                MRP.store.audit(finish ? 'Operasyon bitti' : 'Üretim bildirimi', `${opName(w, i)}: +${good} sağlam${scrap ? `, +${scrap} fire (${scrapReason})` : ''} · ${operator}`);
                if (finish && isLast) MRP.store.notify('wo', 'İş emri tamamlanmaya hazır', `${w.no} · ${w.ad}: ${U.qty(op.good, 'ad')} sağlam`, ['perm:manageWO'], 'workorders');
                app().commit();
                UI.toast(finish ? 'Operasyon bitti' : 'Bildirim kaydedildi', `${opName(w, i)} · ${good} sağlam${scrap ? ` · ${scrap} fire` : ''}`, scrap ? 'warn' : 'success');
            } }]
        });
    }

    // ---------------- Analiz ----------------
    function stats(days) {
        const since = new Date(Date.now() - days * 864e5).toISOString();
        const rows = new Map(M.workCenters().map((wc) => [wc.id, { wc, run: 0, down: 0, good: 0, scrap: 0, std: 0, ops: 0, downBy: {}, scrapBy: {} }]));
        const get = (id) => { if (!rows.has(id)) rows.set(id, { wc: { id, ad: id, capacity: 0, days: 5 }, run: 0, down: 0, good: 0, scrap: 0, std: 0, ops: 0, downBy: {}, scrapBy: {} }); return rows.get(id); };
        S().workOrders.forEach((w) => (w.ops || []).forEach((op) => {
            const r = get(op.wc);
            let touched = false;
            op.logs.forEach((l) => {
                const t = l.end || l.at;
                if (t < since) return;
                touched = true;
                if (l.type === 'run') r.run += l.min;
                else if (l.type === 'down') { r.down += l.min; r.downBy[l.reason] = (r.downBy[l.reason] || 0) + l.min; }
                else if (l.type === 'qty') {
                    r.good += l.good; r.scrap += l.scrap; r.std += op.run * (l.good + l.scrap);
                    if (l.scrap) r.scrapBy[l.scrapReason || 'Diğer'] = (r.scrapBy[l.scrapReason || 'Diğer'] || 0) + l.scrap;
                }
            });
            if (touched) { r.ops++; if (op.startedAt && op.startedAt >= since) r.std += op.setup; }
        }));
        const calc = (r) => {
            const avail = r.run + r.down > 0 ? r.run / (r.run + r.down) : null;
            const perf = r.run > 0 ? r.std / r.run : null;          // %100 üstü: standarttan hızlı (OEE'de %100 ile sınırlanır)
            const qual = r.good + r.scrap > 0 ? r.good / (r.good + r.scrap) : null;
            const capMin = (r.wc.capacity || 0) * (r.wc.days || 5) / 7 * days;
            return { ...r, avail, perf, qual, oee: avail != null && perf != null && qual != null ? avail * Math.min(1, perf) * qual : null, util: capMin ? (r.run + r.down) / capMin : null };
        };
        const list = [...rows.values()].map(calc);
        const tot = calc(list.reduce((a, r) => {
            a.run += r.run; a.down += r.down; a.good += r.good; a.scrap += r.scrap; a.std += r.std; a.ops += r.ops; a.wc.capacity += (r.wc.capacity || 0) * (r.wc.days || 5) / 5;
            Object.entries(r.downBy).forEach(([k, v]) => { a.downBy[k] = (a.downBy[k] || 0) + v; });
            Object.entries(r.scrapBy).forEach(([k, v]) => { a.scrapBy[k] = (a.scrapBy[k] || 0) + v; });
            return a;
        }, { wc: { id: 'ALL', ad: 'Toplam', capacity: 0, days: 5 }, run: 0, down: 0, good: 0, scrap: 0, std: 0, ops: 0, downBy: {}, scrapBy: {} }));
        return { list, tot };
    }
    const pct = (v) => (v == null ? '–' : `%${U.num(v * 100, 1)}`);
    const pctBar = (v, good = 0.85) => (v == null ? '<span class="muted">–</span>'
        : `<span class="oee-bar"><span style="width:${Math.min(100, v * 100)}%;background:${v >= good ? 'var(--green)' : v >= good - 0.25 ? 'var(--amber)' : 'var(--red)'};"></span></span>${pct(v)}`);

    // ---------------- Görünüm ----------------
    MRP.views.shopfloor = {
        title: 'Atölye Takibi',
        subtitle: 'Operasyon başlat / bitir, üretim ve fire bildirimi, duruşlar, verimlilik ve OEE',
        render() {
            const released = S().workOrders.filter((w) => w.status === 'released');
            released.forEach(ensureOpsSilently);
            const ops = [];
            released.forEach((w) => w.ops.forEach((op, i) => { if (op.status !== 'done') ops.push({ w, op, i }); }));
            const today = U.iso(U.today());
            let goodToday = 0, scrapToday = 0, downNow = 0;
            // Bugün üretilen = son operasyonun sağlam çıktısı (bitmiş ürün); fire tüm operasyonlardan
            S().workOrders.forEach((w) => (w.ops || []).forEach((op, i, arr) => op.logs.forEach((l) => {
                if (l.type !== 'qty' || l.at.slice(0, 10) !== today) return;
                if (i === arr.length - 1) goodToday += l.good;
                scrapToday += l.scrap;
            })));
            ops.forEach((x) => { if (x.op.status === 'paused') downNow++; });
            const st30 = stats(30).tot;
            const planned = S().workOrders.filter((w) => w.status === 'planned').length;

            let html = `<div class="kpis">
                ${H.kpi('Çalışan Operasyon', ops.filter((x) => x.op.status === 'running').length, `${released.length} serbest iş emri`, 'green')}
                ${H.kpi('Duruşta', downNow, downNow ? 'Sebep ve süre kayıt altında' : 'Duruş yok', downNow ? 'red' : 'green')}
                ${H.kpi('Bugün Biten Ürün', U.num(goodToday, 0), `Son operasyondan sağlam · ${U.num(scrapToday, 0)} fire (tüm operasyonlar)`, 'blue')}
                ${H.kpi('OEE (30 gün)', pct(st30.oee), `K ${pct(st30.avail)} · P ${pct(st30.perf)} · Kal ${pct(st30.qual)}`, st30.oee == null ? '' : st30.oee >= 0.65 ? 'green' : st30.oee >= 0.45 ? 'amber' : 'red')}
            </div>`;
            html += H.tabs([['board', 'İş merkezi panosu', ops.length], ['report', 'Verimlilik & OEE', null], ['log', 'Atölye kayıtları', null]], sfState.tab, 'sfTab');
            if (sfState.tab === 'report') return html + renderReport();
            if (sfState.tab === 'log') return html + renderLog();
            if (planned && MRP.auth.canView('workorders')) html += H.banner('blue', 'info', `${planned} iş emri serbest bırakılmayı bekliyor`, 'Atölyede yalnızca serbest bırakılan iş emirlerinin operasyonları görünür.', '<button class="btn btn-secondary btn-sm" data-act="go" data-id="workorders">İş emirleri</button>');
            return html + renderBoard(ops);
        },
        after() {
            clearInterval(MRP.views.shopfloor._timer);
            const tick = () => {
                const els = U.$$('.sf-timer[data-since]');
                if (!els.length) return clearInterval(MRP.views.shopfloor._timer);
                els.forEach((el) => { el.textContent = fmtMin(+el.dataset.base + minsBetween(el.dataset.since, nowIso())); });
            };
            MRP.views.shopfloor._timer = setInterval(tick, 20000);
        }
    };
    /** Eski (rotası açılmamış) serbest emirler için operasyonları kalıcı yapmadan oluşturur */
    function ensureOpsSilently(w) { if (!w.ops || !w.ops.length) ensureOps(w); }

    function renderBoard(ops) {
        const can = MRP.auth.can('reportProduction');
        const ord = { running: 0, paused: 1, waiting: 2 };
        const wcs = M.workCenters().filter((wc) => !sfState.wc || wc.id === sfState.wc);
        const filter = `<div class="toolbar"><select class="input" data-change="sfWc" style="max-width:240px;"><option value="">Tüm iş merkezleri</option>${M.workCenters().map((wc) => `<option value="${esc(wc.id)}" ${sfState.wc === wc.id ? 'selected' : ''}>${esc(wc.ad)}</option>`).join('')}</select>
            <span class="muted" style="font-size:.8em;">Süreler canlı güncellenir. Bir operasyonun girdisi önceki operasyonun sağlam çıktısıdır.</span></div>`;
        if (!ops.length) return filter + H.card('Atölyede açık operasyon yok', '', H.empty('Serbest bırakılmış iş emri yok', 'İş Emirleri ekranından bir emri serbest bıraktığınızda operasyonları burada görünür.'));
        return filter + `<div class="sf-board">${wcs.map((wc) => {
            const list = ops.filter((x) => x.op.wc === wc.id).sort((a, b) => ord[a.op.status] - ord[b.op.status] || a.w.start.localeCompare(b.w.start) || a.op.seq - b.op.seq);
            const running = list.filter((x) => x.op.status === 'running').length;
            return `<div class="sf-col"><div class="sf-col-head"><b>${esc(wc.ad)}</b><span class="muted mono">${esc(wc.id)}</span>${running ? `<span class="badge badge-green">${running} çalışıyor</span>` : ''}</div>
                <div class="sf-col-body">${list.map((x) => card(x, can)).join('') || '<p class="muted" style="font-size:.82em;padding:4px;">Bekleyen operasyon yok</p>'}</div></div>`;
        }).join('')}</div>`;
    }

    function card({ w, op, i }, can) {
        const inQty = inputQty(w, i);
        const why = op.status === 'waiting' ? blockedReason(w, i) : '';
        const id = `${w.no}|${i}`;
        const base = op.runMin;
        const runNow = op.cur && op.cur.kind === 'run';
        const st = OP_STATUS[op.status];
        const gw = inQty > 0 ? op.good / inQty * 100 : 0, sw = inQty > 0 ? op.scrap / inQty * 100 : 0;
        let acts = '';
        if (can) {
            if (op.status === 'waiting') acts = `<button class="btn btn-success btn-sm" data-act="sfStart" data-id="${esc(id)}" ${why ? `disabled title="${esc(why)}"` : ''}>${MRP.icon('play', 'sm')} Başlat</button>`;
            if (op.status === 'running') acts = `<button class="btn btn-secondary btn-sm" data-act="sfReport" data-id="${esc(id)}">${MRP.icon('plus', 'sm')} Bildir</button>
                <button class="btn btn-danger btn-sm" data-act="sfPause" data-id="${esc(id)}">${MRP.icon('pause', 'sm')} Duruş</button>
                <button class="btn btn-success btn-sm" data-act="sfFinish" data-id="${esc(id)}">${MRP.icon('stop', 'sm')} Bitir</button>`;
            if (op.status === 'paused') acts = `<button class="btn btn-success btn-sm" data-act="sfResume" data-id="${esc(id)}">${MRP.icon('play', 'sm')} Devam</button>
                <button class="btn btn-secondary btn-sm" data-act="sfFinish" data-id="${esc(id)}">${MRP.icon('stop', 'sm')} Bitir</button>`;
        }
        return `<div class="sf-card ${op.status} ${why ? 'blocked' : ''}">
            <div class="t"><span><button class="link mono" data-act="woDetail" data-id="${esc(w.no)}">${esc(w.no)}</button> · Op ${op.seq}</span><span class="badge ${st[0]}">${st[1]}</span></div>
            <div class="n">${esc(w.ad)}</div>
            <div class="sf-prog"><span style="width:${gw}%;background:var(--green);"></span><span style="width:${sw}%;background:var(--red);"></span></div>
            <div class="meta"><span>Girdi <b>${esc(U.qty(inQty, 'ad'))}</b></span><span>Sağlam <b>${esc(U.qty(op.good))}</b></span>${op.scrap ? `<span style="color:var(--red);">Fire <b>${esc(U.qty(op.scrap))}</b></span>` : ''}
                <span>Std ${esc(fmtMin(stdMin(op, inQty)))}</span>
                <span>${MRP.icon('clock', 'sm')} <span class="sf-timer" ${runNow ? `data-since="${esc(op.cur.start)}" data-base="${base}"` : ''}>${esc(fmtMin(base + (runNow ? curMin(op) : 0)))}</span></span>
                ${op.status === 'paused' && op.cur ? `<span style="color:var(--red);">Duruş: ${esc(op.cur.reason)} · <span class="sf-timer" data-since="${esc(op.cur.start)}" data-base="0">${esc(fmtMin(curMin(op)))}</span></span>` : ''}
                ${op.cur ? `<span>${esc(op.cur.operator)}</span>` : ''}</div>
            ${why ? `<div class="meta">${esc(why)}</div>` : ''}
            ${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
    }

    function renderReport() {
        const { list, tot } = stats(sfState.days);
        const rows = list.filter((r) => r.run + r.down + r.good + r.scrap > 0);
        const period = `<div class="toolbar"><select class="input" data-change="sfDays" style="max-width:200px;">${[7, 30, 90].map((d) => `<option value="${d}" ${sfState.days === d ? 'selected' : ''}>Son ${d} gün</option>`).join('')}</select>
            <span class="muted" style="font-size:.8em;">OEE = Kullanılabilirlik × Performans × Kalite · Kullanılabilirlik = çalışma / (çalışma + duruş) · Performans = standart süre / gerçek çalışma · Kalite = sağlam / (sağlam + fire)</span></div>`;
        if (!rows.length) return period + H.card('Henüz atölye kaydı yok', '', H.empty('Bu dönemde bildirim yok', 'Operasyonlar başlatılıp bitirildikçe verimlilik burada hesaplanır.'));
        const tr = (r, strong) => `<tr class="${strong ? 'total' : ''}"><td class="strong">${esc(r.wc.ad)}</td><td class="num">${r.ops}</td><td class="num">${esc(fmtMin(r.run))}</td><td class="num">${esc(fmtMin(r.down))}</td>
            <td class="num">${U.num(r.good, 0)}</td><td class="num ${r.scrap ? 'tp-neg' : ''}">${U.num(r.scrap, 0)}</td><td class="num">${esc(fmtMin(r.std))}</td>
            <td>${pctBar(r.avail, 0.9)}</td><td>${pctBar(r.perf, 0.9)}</td><td>${pctBar(r.qual, 0.98)}</td><td class="strong">${pctBar(r.oee, 0.65)}</td><td class="num">${pct(r.util)}</td></tr>`;
        const reasons = (obj, unit) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num strong">${unit === 'min' ? esc(fmtMin(v)) : U.num(v, 0)}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">Kayıt yok</td></tr>';
        return period + H.card('İş merkezi verimliliği', `Son ${sfState.days} gün · operasyon kayıtlarından`, `<div class="table-wrap"><table>
            <thead><tr><th>İş merkezi</th><th class="num">Operasyon</th><th class="num">Çalışma</th><th class="num">Duruş</th><th class="num">Sağlam</th><th class="num">Fire</th><th class="num">Standart süre</th><th>Kullanılabilirlik</th><th>Performans</th><th>Kalite</th><th>OEE</th><th class="num">Kapasite kullanımı</th></tr></thead>
            <tbody>${rows.map((r) => tr(r)).join('')}${tr(tot, true)}</tbody></table></div>`)
            + `<div class="grid grid-2" style="margin-top:16px;">
                ${H.card('Duruş sebepleri', 'Toplam süre', `<div class="table-wrap"><table><thead><tr><th>Sebep</th><th class="num">Süre</th></tr></thead><tbody>${reasons(tot.downBy, 'min')}</tbody></table></div>`)}
                ${H.card('Fire sebepleri', 'Adet', `<div class="table-wrap"><table><thead><tr><th>Sebep</th><th class="num">Adet</th></tr></thead><tbody>${reasons(tot.scrapBy)}</tbody></table></div>`)}</div>`;
    }

    function renderLog() {
        const rows = [];
        S().workOrders.forEach((w) => (w.ops || []).forEach((op) => op.logs.forEach((l) => rows.push({ w, op, l, t: l.end || l.at }))));
        rows.sort((a, b) => b.t.localeCompare(a.t));
        const TYPE = { run: ['badge-green', 'Çalışma'], down: ['badge-red', 'Duruş'], qty: ['badge-blue', 'Bildirim'] };
        return `<section class="card"><div class="table-wrap"><table><thead><tr><th>Zaman</th><th>İş merkezi</th><th>İş emri / Op</th><th>Ürün</th><th>Tür</th><th class="num">Süre</th><th class="num">Sağlam</th><th class="num">Fire</th><th>Sebep / not</th><th>Operatör</th></tr></thead><tbody>
            ${rows.slice(0, 300).map(({ w, op, l, t }) => `<tr><td class="nowrap">${esc(U.dateTime(t))}</td><td>${esc(wcName(op.wc))}</td><td class="mono">${esc(w.no)} · ${op.seq}</td><td>${esc(w.ad)}</td>
                <td>${H.badge(TYPE, l.type)}</td><td class="num">${l.min != null ? esc(fmtMin(l.min)) : ''}</td><td class="num">${l.type === 'qty' ? U.num(l.good, 0) : ''}</td>
                <td class="num ${l.scrap ? 'tp-neg' : ''}">${l.type === 'qty' && l.scrap ? U.num(l.scrap, 0) : ''}</td><td>${esc([l.reason || l.scrapReason, l.note].filter(Boolean).join(' · '))}</td><td>${esc(l.operator || '')}</td></tr>`).join('')
            || `<tr><td colspan="10">${H.empty('Kayıt yok', 'Operasyon bildirimleri burada listelenir.')}</td></tr>`}</tbody></table></div></section>
            ${rows.length > 300 ? `<p class="muted" style="font-size:.78em;margin-top:8px;">Son 300 kayıt gösteriliyor (toplam ${rows.length}).</p>` : ''}`;
    }

    MRP.shopfloor = { ensureOps, activeCount, woProgress, OP_STATUS, fmtMin, stats };

    Object.assign(MRP.actions, {
        sfTab: (t) => { sfState.tab = t; app().render(); },
        sfWc: (v) => { sfState.wc = v; app().render(); },
        sfDays: (v) => { sfState.days = +v || 30; app().render(); },
        sfStart: (id) => start(id),
        sfPause: (id) => pause(id),
        sfResume: (id) => resume(id),
        sfReport: (id) => report(id, false),
        sfFinish: (id) => report(id, true)
    });
})(window.MRP);
