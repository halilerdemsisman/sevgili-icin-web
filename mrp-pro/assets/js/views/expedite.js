/* ==========================================================================
   MRP Pro — Tedarikçi Teslim Takibi (sipariş onayı, hatırlatma, gecikme etkisi)
   --------------------------------------------------------------------------
   • Sipariş teyidi: tedarikçinin onayladığı teslim tarihi (p.ack). MRP planlı
     girişte bu tarihi kullanır; istenen tarihten sonraysa planlamaya bildirim.
   • Takip kaydı: telefon / e-posta / ziyaret notu, yeni söz verilen tarih,
     bir sonraki takip günü (p.followups, p.nextFollowUp)
   • Hatırlatma e-postası: duruma göre (teyit isteği / gecikme / yaklaşan
     teslim) hazır metin; kullanıcının kendi e-posta uygulamasında açılır
   • Etki: siparişteki kalemi bekleyen iş emirleri ve bağlı müşteri siparişleri
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;
    const me = () => MRP.auth.current();

    const ACK_DAYS = 2;            // bu kadar gün içinde teyit gelmezse takip listesine düşer
    const CHANNELS = { phone: 'Telefon', email: 'E-posta', visit: 'Ziyaret', other: 'Diğer' };
    const xState = { tab: 'action', q: '' };
    const OPEN = ['open', 'partial'];
    const todayIso = () => U.iso(U.today());
    const dfmt = (iso) => (iso ? U.date(U.parseDate(iso)) : '–');
    const log = (p, action, note) => { p.history = p.history || []; p.history.push({ action, by: me().name, at: new Date().toISOString(), note: note || '' }); };
    const findPO = (no) => S().pos.find((p) => p.no === no);

    /** Siparişin takip durumu */
    function classify(p) {
        const today = todayIso();
        const exp = M.poExpected(p);
        const impact = M.poImpact(p);
        const ageDays = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 864e5);
        const c = {
            p, exp, impact,
            late: exp < today,
            lateDays: Math.max(0, U.diffDays(today, exp)),
            unconfirmed: !p.ack,
            ackOverdue: !p.ack && ageDays >= ACK_DAYS,
            slipped: !!(p.ack && p.ack.date > p.deliveryDate),
            slipDays: p.ack ? Math.max(0, U.diffDays(p.ack.date, p.deliveryDate)) : 0,
            risk: !!(impact.needDate && (exp < today ? today : exp) > impact.needDate),   // gecikmişse en erken bugün gelir
            followDue: !!(p.nextFollowUp && p.nextFollowUp <= today),
            week: exp >= today && U.diffDays(exp, today) <= 7,
            lastContact: (p.followups || []).slice(-1)[0] || null
        };
        c.action = c.late || c.ackOverdue || c.risk || c.followDue;
        return c;
    }
    const openPOs = () => S().pos.filter((p) => OPEN.includes(p.status));
    const actionCount = () => openPOs().filter((p) => classify(p).action).length;

    function statusBadges(c) {
        const b = [];
        if (c.late) b.push(`<span class="badge badge-red">${c.lateDays} gün gecikti</span>`);
        if (c.risk) b.push('<span class="badge badge-red">Üretimi etkiliyor</span>');
        if (c.ackOverdue) b.push('<span class="badge badge-amber">Teyit bekleniyor</span>');
        else if (c.unconfirmed) b.push('<span class="badge badge-gray">Teyitsiz</span>');
        if (c.slipped) b.push(`<span class="badge badge-violet">Tedarikçi +${c.slipDays}g kaydırdı</span>`);
        if (c.followDue) b.push('<span class="badge badge-blue">Takip günü</span>');
        if (!b.length) b.push(c.week ? '<span class="badge badge-cyan">Bu hafta</span>' : '<span class="badge badge-green">Yolunda</span>');
        return b.join(' ');
    }

    MRP.views.expedite = {
        title: 'Teslim Takibi',
        subtitle: 'Tedarikçi sipariş teyidi, gecikmeler, hatırlatma ve üretime etkisi',
        render() {
            const all = openPOs().map(classify);
            const act = all.filter((c) => c.action);
            const late = all.filter((c) => c.late);
            const lateVal = U.sum(late, (c) => U.sum(M.poOpenLines(c.p), (l) => l.open * l.price * (1 - (l.disc || 0) / 100)));
            const perf = M.supplierDelivery();

            let html = `<div class="kpis">
                ${H.kpi('Açık Sipariş', all.length, `${all.filter((c) => c.week).length} tanesi bu hafta gelecek`, 'blue')}
                ${H.kpi('Geciken', late.length, late.length ? `${U.compactCur(lateVal)} teslim bekliyor` : 'Gecikme yok', late.length ? 'red' : 'green')}
                ${H.kpi('Teyit Bekleyen', all.filter((c) => c.unconfirmed).length, `${all.filter((c) => c.ackOverdue).length} tanesi ${ACK_DAYS}+ gündür`, all.some((c) => c.ackOverdue) ? 'amber' : 'green')}
                ${H.kpi('Üretimi Etkileyen', all.filter((c) => c.risk).length, 'Beklenen teslim > iş emri başlangıcı', all.some((c) => c.risk) ? 'red' : 'green')}
                ${H.kpi('Zamanında Teslim', perf.onTimeReq == null ? '–' : `%${U.num(perf.onTimeReq * 100, 0)}`, perf.onTimeAck == null ? `${perf.received} teslimat` : `Teyitli tarihe göre %${U.num(perf.onTimeAck * 100, 0)}`, perf.onTimeReq == null ? '' : perf.onTimeReq >= 0.9 ? 'green' : 'violet')}
            </div>`;
            const risky = all.filter((c) => c.risk && c.impact.sos.length);
            if (risky.length) html += H.banner('red', 'alert', `${risky.length} geciken / geç gelecek satın alma siparişi müşteri siparişini etkiliyor`,
                risky.slice(0, 3).map((c) => `${c.p.no} (${c.p.supplierName}) → ${c.impact.sos.map((x) => x.customer).join(', ')}`).join(' · '));

            html += H.tabs([['action', 'Takip Gereken', act.length], ['week', 'Bu Hafta Gelecek', all.filter((c) => c.week).length], ['all', 'Tüm Açık', all.length], ['perf', 'Tedarikçi Performansı']], xState.tab, 'exTab');
            if (xState.tab === 'perf') return html + renderPerf();

            let list = xState.tab === 'action' ? act : xState.tab === 'week' ? all.filter((c) => c.week) : all;
            const q = xState.q.trim().toLocaleLowerCase('tr');
            if (q) list = list.filter((c) => [c.p.no, c.p.supplierName, ...c.p.lines.map((l) => l.kod), ...c.p.lines.map((l) => l.ad)].some((v) => String(v || '').toLocaleLowerCase('tr').includes(q)));
            const rank = (c) => (c.risk ? 0 : c.late ? 1 : c.ackOverdue ? 2 : c.followDue ? 3 : 4);
            list = list.slice().sort((a, b) => rank(a) - rank(b) || a.exp.localeCompare(b.exp));
            const can = MRP.auth.can('createPO');

            html += `<div class="toolbar"><input class="input" id="exSearch" placeholder="Sipariş, tedarikçi veya kalem…" value="${esc(xState.q)}" data-input="exSearch">
                <span class="spacer"></span><span class="muted" style="font-size:.82em;">MRP planlı girişte teyit edilen tarihi kullanır. ${ACK_DAYS} gün içinde teyit gelmeyen sipariş takip listesine düşer.</span></div>
                <section class="card"><div class="table-wrap"><table>
                <thead><tr><th>Sipariş</th><th>Tedarikçi</th><th>Bekleyen kalemler</th><th>İstenen</th><th>Teyitli / beklenen</th><th>Durum</th><th>Etkisi</th><th>Son temas</th><th></th></tr></thead>
                <tbody>${list.map((c) => {
                    const p = c.p;
                    const lines = M.poOpenLines(p);
                    const sup = S().suppliers.find((s) => s.id === p.supplierId) || {};
                    return `<tr class="${c.risk || c.late ? 'r-crit' : ''}">
                        <td class="nowrap"><button class="link mono" data-act="poDetail" data-id="${esc(p.no)}">${esc(p.no)}</button><div class="muted" style="font-size:11px;">${esc(dfmt(p.createdAt.slice(0, 10)))}</div></td>
                        <td><span class="strong">${esc(p.supplierName)}</span><div class="muted" style="font-size:12px;">${esc(sup.yetkili || p.supplierContact || '')}${sup.tel ? ` · ${esc(sup.tel)}` : ''}</div></td>
                        <td>${lines.slice(0, 2).map((l) => `<div><span class="mono">${esc(l.kod)}</span> <span class="muted">${esc(U.qty(l.open, l.unit))}</span></div>`).join('')}${lines.length > 2 ? `<span class="muted">+${lines.length - 2} kalem</span>` : ''}</td>
                        <td class="nowrap">${esc(dfmt(p.deliveryDate))}</td>
                        <td class="nowrap">${p.ack ? `<b>${esc(dfmt(p.ack.date))}</b>${p.ack.ref ? `<div class="muted mono" style="font-size:11px;">${esc(p.ack.ref)}</div>` : ''}` : '<span class="muted">teyit yok</span>'}</td>
                        <td>${statusBadges(c)}</td>
                        <td>${c.impact.wos.length ? `<div>${c.impact.wos.slice(0, 2).map(({ w }) => `<button class="link mono" data-act="woDetail" data-id="${esc(w.no)}">${esc(w.no)}</button>`).join(', ')}${c.impact.wos.length > 2 ? ` +${c.impact.wos.length - 2}` : ''}</div>
                            <div class="muted" style="font-size:12px;">ihtiyaç ${esc(dfmt(c.impact.needDate))}${c.impact.sos.length ? ` · ${esc(c.impact.sos.map((x) => x.customer).join(', '))}` : ''}</div>` : '<span class="muted">–</span>'}</td>
                        <td>${c.lastContact ? `<div>${esc(CHANNELS[c.lastContact.channel] || '')} · ${esc(dfmt(c.lastContact.at.slice(0, 10)))}</div><div class="muted" style="font-size:12px;" title="${esc(c.lastContact.note)}">${esc(c.lastContact.note.slice(0, 40))}</div>` : '<span class="muted">–</span>'}
                            ${p.nextFollowUp ? `<div class="muted" style="font-size:11px;">sonraki: ${esc(dfmt(p.nextFollowUp))}</div>` : ''}</td>
                        <td><div class="row-actions" style="flex-wrap:wrap;">${can ? `
                            <button class="btn btn-secondary btn-sm" data-act="exAck" data-id="${esc(p.no)}">Teyit</button>
                            <button class="btn btn-secondary btn-sm" data-act="exRemind" data-id="${esc(p.no)}">Hatırlat</button>
                            <button class="btn btn-ghost btn-sm" data-act="exFollow" data-id="${esc(p.no)}" title="Görüşme notu">${MRP.icon('edit', 'sm')}</button>` : ''}</div></td></tr>`;
                }).join('') || `<tr><td colspan="9">${H.empty(xState.tab === 'action' ? 'Takip gereken sipariş yok' : 'Sipariş yok', xState.tab === 'action' ? 'Tüm açık siparişler teyitli ve zamanında görünüyor.' : '')}</td></tr>`}</tbody>
            </table></div></section>`;
            return html;
        },
        after() {
            const el = U.$('#exSearch');
            if (el && xState.focus) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); xState.focus = false; }
        }
    };

    function renderPerf() {
        const pct = (v) => (v == null ? '<span class="muted">–</span>' : `<span class="badge ${v >= 0.9 ? 'badge-green' : v >= 0.75 ? 'badge-amber' : 'badge-red'}">%${U.num(v * 100, 0)}</span>`);
        const rows = S().suppliers.map((s) => ({ s, d: M.supplierDelivery(s.id), open: openPOs().filter((p) => p.supplierId === s.id).map(classify) })).filter((r) => r.d.orders);
        return `<section class="card"><div class="table-wrap"><table>
            <thead><tr><th>Tedarikçi</th><th class="num">Sipariş</th><th class="num">Teslim alınan</th><th>Zamanında (istenen)</th><th>Zamanında (teyitli)</th><th class="num">Ort. gecikme</th><th>Teyit oranı</th><th class="num">Ort. teyit süresi</th><th class="num">Açık / geciken</th></tr></thead>
            <tbody>${rows.map(({ s, d, open }) => `<tr><td class="strong">${esc(s.ad)}</td><td class="num">${d.orders}</td><td class="num">${d.received}</td>
                <td>${pct(d.onTimeReq)}</td><td>${pct(d.onTimeAck)}</td><td class="num">${d.avgDelay == null ? '–' : `${U.num(d.avgDelay, 1)} gün`}</td>
                <td>${pct(d.ackRate)}</td><td class="num">${d.ackDays == null ? '–' : `${U.num(d.ackDays, 1)} gün`}</td>
                <td class="num">${open.length} / <span class="${open.some((c) => c.late) ? 'tp-neg' : ''}">${open.filter((c) => c.late).length}</span></td></tr>`).join('')
                || `<tr><td colspan="9">${H.empty('Veri yok', 'Satın alma siparişleri oluştukça burada görünür.')}</td></tr>`}</tbody>
        </table></div></section>
        <p class="muted" style="font-size:12px;margin-top:8px;">Zamanında: ilk kabul edilen teslimatın tarihi istenen / teyit edilen tarihe göre. Teyit süresi: sipariş oluşturulmasından teyit kaydına kadar geçen gün.</p>`;
    }

    // ---------------- İşlemler ----------------
    /** Teyit veya yeni söz verilen tarih kaydı; gerekirse planlamaya bildirim */
    function setAck(p, date, ref, note, source) {
        const prev = p.ack ? p.ack.date : null;
        p.ack = { status: date > p.deliveryDate ? 'changed' : 'confirmed', date, ref: ref != null ? ref : (p.ack && p.ack.ref) || '', note: note || '', at: (p.ack && p.ack.at) || new Date().toISOString(), updatedAt: new Date().toISOString(), by: me().name };
        log(p, prev ? 'Teslim tarihi güncellendi' : 'Tedarikçi teyidi', `${prev ? `${dfmt(prev)} → ` : ''}${dfmt(date)}${source ? ` (${source})` : ''}${ref ? ` · ${ref}` : ''}`);
        MRP.store.audit('Satın alma teslim teyidi', `${p.no}: ${dfmt(date)} (istenen ${dfmt(p.deliveryDate)})`);
        const c = classify(p);
        if (date > p.deliveryDate || c.risk) {
            MRP.store.notify('po', c.risk ? 'Tedarik gecikmesi üretimi etkiliyor' : 'Tedarikçi teslim tarihini kaydırdı',
                `${p.no} · ${p.supplierName}: ${dfmt(date)} (istenen ${dfmt(p.deliveryDate)})${c.impact.wos.length ? ` — ${c.impact.wos.map(({ w }) => w.no).join(', ')}` : ''}${c.impact.sos.length ? ` · ${c.impact.sos.map((x) => x.customer).join(', ')}` : ''}`,
                ['perm:runMRP', 'perm:manageWO', 'perm:createPO'], 'expedite');
        }
    }

    function ackModal(no) {
        if (!H.guard('createPO')) return;
        const p = findPO(no);
        UI.modal({
            title: `Tedarikçi teyidi — ${p.no}`, size: 'md',
            body: `<p class="muted" style="margin-top:0;">${esc(p.supplierName)} · istenen teslim <b>${esc(dfmt(p.deliveryDate))}</b></p>
                <div class="form-grid">
                    <div class="field"><label>Teyit edilen teslim tarihi <span class="req">*</span></label><input id="akDate" type="date" value="${esc((p.ack && p.ack.date) || p.deliveryDate)}"></div>
                    <div class="field"><label>Tedarikçi sipariş / teyit no</label><input id="akRef" value="${esc((p.ack && p.ack.ref) || '')}"></div>
                    <div class="field full"><label>Not</label><input id="akNote" value="${esc((p.ack && p.ack.note) || '')}" placeholder="Ör. kısmi sevk, nakliye bilgisi…"></div>
                </div>
                <div id="akWarn"></div>`,
            onOpen: (ctx) => {
                const upd = () => { const d = ctx.$('#akDate').value; ctx.$('#akWarn').innerHTML = d && d > p.deliveryDate ? H.banner('amber', 'alert', `İstenenden ${U.diffDays(d, p.deliveryDate)} gün sonra`, 'Kaydedince MRP bu tarihi kullanır; etkilenen iş emri varsa planlamaya bildirim gider.') : ''; };
                ctx.$('#akDate').addEventListener('input', upd); upd();
            },
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Teyidi kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const date = ctx.$('#akDate').value;
                    if (!date) { UI.toast('Tarih gerekli', '', 'warn'); return false; }
                    setAck(p, date, ctx.$('#akRef').value.trim(), ctx.$('#akNote').value.trim());
                    app().commit();
                    UI.toast('Teyit kaydedildi', `${p.no} · ${dfmt(date)}`, 'success');
                }
            }]
        });
    }

    function followModal(no) {
        if (!H.guard('createPO')) return;
        const p = findPO(no);
        UI.modal({
            title: `Görüşme notu — ${p.no}`, size: 'md',
            body: `<p class="muted" style="margin-top:0;">${esc(p.supplierName)} · beklenen ${esc(dfmt(M.poExpected(p)))}</p>
                <div class="form-grid">
                    <div class="field"><label>Kanal</label><select id="fuCh">${Object.entries(CHANNELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
                    <div class="field"><label>Sonraki takip</label><input id="fuNext" type="date" value="${esc(U.iso(U.addDays(U.today(), 2)))}"></div>
                    <div class="field full"><label>Görüşme notu <span class="req">*</span></label><textarea id="fuNote" rows="3" placeholder="Ör. Yükleme cuma, irsaliye pazartesi gelecek"></textarea></div>
                    <div class="field"><label>Tedarikçinin verdiği yeni tarih</label><input id="fuDate" type="date"><span class="hint">Girilirse teyitli tarih güncellenir</span></div>
                </div>
                ${(p.followups || []).length ? `<h3 style="font-size:.9em;margin:14px 0 8px;">Önceki görüşmeler</h3><div class="timeline">${p.followups.slice().reverse().map((f) => `<div class="ev"><div><b>${esc(CHANNELS[f.channel] || f.channel)}</b> — ${esc(f.note)}${f.promised ? ` <span class="badge badge-violet">söz: ${esc(dfmt(f.promised))}</span>` : ''}<div class="d">${esc(f.by)} · ${esc(U.dateTime(f.at))}</div></div></div>`).join('')}</div>` : ''}`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const note = ctx.$('#fuNote').value.trim();
                    if (!note) { UI.toast('Not gerekli', '', 'warn'); return false; }
                    addFollowup(p, ctx.$('#fuCh').value, note, ctx.$('#fuDate').value || null, ctx.$('#fuNext').value || null);
                    app().commit();
                    UI.toast('Görüşme kaydedildi', p.no, 'success');
                }
            }]
        });
    }

    function addFollowup(p, channel, note, promised, next) {
        (p.followups = p.followups || []).push({ id: U.uid('fu'), at: new Date().toISOString(), by: me().name, channel, note, promised, next });
        p.nextFollowUp = next;
        log(p, `Tedarikçi takibi (${CHANNELS[channel] || channel})`, note);
        if (promised) setAck(p, promised, null, note, 'görüşme');
    }

    /** Duruma göre hatırlatma e-postası */
    function reminderText(p) {
        const c = classify(p);
        const company = (S().branding && S().branding.company) || 'Firmamız';
        const sup = S().suppliers.find((s) => s.id === p.supplierId) || {};
        const lines = M.poOpenLines(p).map((l) => `  - ${l.kod} ${l.ad}: ${U.qty(l.open, l.unit)}`).join('\n');
        let subject, intro;
        if (c.late) {
            subject = `${p.no} — teslim tarihi geçti (${dfmt(c.exp)})`;
            intro = `${dfmt(c.exp)} tarihinde teslim edilmesi gereken ${p.no} numaralı siparişimizin aşağıdaki kalemleri henüz ulaşmadı. Üretim planımızı etkilediği için en geç teslim tarihini ve sevkiyat bilgisini bugün bildirmenizi rica ederiz.`;
        } else if (c.unconfirmed) {
            subject = `${p.no} — sipariş teyidi`;
            intro = `${dfmt(p.createdAt.slice(0, 10))} tarihli ${p.no} numaralı siparişimiz için teyidinizi henüz alamadık. Siparişi ve ${dfmt(p.deliveryDate)} teslim tarihini teyit etmenizi rica ederiz.`;
        } else {
            subject = `${p.no} — teslimat hatırlatması (${dfmt(c.exp)})`;
            intro = `${p.no} numaralı siparişimizin ${dfmt(c.exp)} tarihinde teslim edileceğini teyit etmiştiniz. Sevkiyat planında bir değişiklik olursa bilgi vermenizi rica ederiz.`;
        }
        const body = `Sayın ${sup.yetkili || p.supplierContact || 'Yetkili'},\n\n${intro}\n\nTeslim bekleyen kalemler:\n${lines}\n\nTeşekkürler,\n${me().name}\n${company}`;
        return { to: sup.email || '', subject, body };
    }

    function remindModal(no) {
        if (!H.guard('createPO')) return;
        const p = findPO(no);
        const r = reminderText(p);
        const href = `mailto:${encodeURIComponent(r.to)}?subject=${encodeURIComponent(r.subject)}&body=${encodeURIComponent(r.body)}`;
        UI.modal({
            title: `Hatırlatma — ${p.no}`, size: 'lg',
            body: `<div class="form-grid">
                    <div class="field"><label>Alıcı</label><input id="rmTo" value="${esc(r.to)}" readonly></div>
                    <div class="field"><label>Konu</label><input id="rmSubj" value="${esc(r.subject)}"></div>
                    <div class="field full"><label>Metin</label><textarea id="rmBody" rows="12" style="font-family:inherit;">${esc(r.body)}</textarea></div>
                </div>
                <p class="muted" style="font-size:12px;">E-posta MRP Pro'dan gönderilmez; kendi e-posta uygulamanızda açılır. Gönderdikten sonra "Gönderildi" ile takip kaydına ekleyin.</p>
                <div style="display:flex;gap:8px;"><a class="btn btn-secondary" id="rmMail" href="${esc(href)}">${MRP.icon('download', 'sm')} E-posta uygulamasında aç</a>
                    <button type="button" class="btn btn-secondary" id="rmCopy">Metni kopyala</button></div>`,
            onOpen: (ctx) => {
                const sync = () => { ctx.$('#rmMail').href = `mailto:${encodeURIComponent(r.to)}?subject=${encodeURIComponent(ctx.$('#rmSubj').value)}&body=${encodeURIComponent(ctx.$('#rmBody').value)}`; };
                ctx.$('#rmSubj').addEventListener('input', sync); ctx.$('#rmBody').addEventListener('input', sync);
                ctx.$('#rmCopy').addEventListener('click', () => {
                    const txt = `${ctx.$('#rmSubj').value}\n\n${ctx.$('#rmBody').value}`;
                    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => UI.toast('Kopyalandı', '', 'success'), () => { ctx.$('#rmBody').select(); document.execCommand('copy'); UI.toast('Kopyalandı', '', 'success'); });
                });
            },
            buttons: [{ label: 'Kapat' }, {
                label: 'Gönderildi — takibe ekle', cls: 'btn-primary', onClick: (ctx) => {
                    addFollowup(p, 'email', `Hatırlatma gönderildi: ${ctx.$('#rmSubj').value}`, null, U.iso(U.addDays(U.today(), ACK_DAYS)));
                    app().commit();
                    UI.toast('Takip kaydı eklendi', `Sonraki takip ${dfmt(p.nextFollowUp)}`, 'success');
                }
            }]
        });
    }

    let searchTimer = null;
    Object.assign(MRP.actions, {
        exTab: (t) => { xState.tab = t; app().render(); },
        exSearch: (v) => { xState.q = v; clearTimeout(searchTimer); searchTimer = setTimeout(() => { xState.focus = true; app().render(); }, 200); },
        exAck: (no) => ackModal(no),
        exFollow: (no) => followModal(no),
        exRemind: (no) => remindModal(no)
    });

    MRP.expedite = { classify, actionCount, ACK_DAYS };
})(window.MRP);
