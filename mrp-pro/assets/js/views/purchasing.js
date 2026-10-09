/* ==========================================================================
   MRP Pro — Satın Alma: Talepler, Siparişler (PO), Mal Kabul, Tedarikçiler
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;
    const me = () => MRP.auth.current();
    const log = (doc, action, note) => { doc.history = doc.history || []; doc.history.push({ action, by: me().name, at: new Date().toISOString(), note: note || '' }); };

    const findReq = (no) => S().requests.find((r) => r.no === no);
    const findPO = (no) => S().pos.find((p) => p.no === no);

    function poTotals(po) {
        let sub = 0, disc = 0, vat = 0;
        po.lines.forEach((l) => {
            const gross = l.qty * l.price;
            const d = gross * (l.disc || 0) / 100;
            sub += gross; disc += d; vat += (gross - d) * (l.vat || 0) / 100;
        });
        return { sub, disc, vat, grand: sub - disc + vat };
    }
    const poProgress = (po) => {
        const ord = U.sum(po.lines, (l) => l.qty);
        return ord ? Math.min(100, U.sum(po.lines, (l) => Math.min(l.qty, l.received || 0)) / ord * 100) : 0;
    };

    // =====================================================================
    // SATIN ALMA TALEPLERİ
    // =====================================================================
    const reqState = { tab: 'pending' };

    MRP.views.requests = {
        title: 'Satın Alma Talepleri',
        subtitle: 'MRP önerilerinden oluşturulan talepler, onay akışı ve siparişe dönüşüm',
        render() {
            const all = S().requests;
            const cnt = (s) => all.filter((r) => r.status === s).length;
            const tabs = [['pending', 'Onay Bekleyen', cnt('pending')], ['approved', 'Onaylı', cnt('approved')], ['ordered', 'Siparişte', cnt('ordered')],
                ['closed', 'Kapanan', cnt('closed')], ['rejected', 'Reddedilen', cnt('rejected')], ['all', 'Tümü', all.length]];
            const list = reqState.tab === 'all' ? all : all.filter((r) => r.status === reqState.tab);
            const limit = me().can.approveLimit;
            let html = H.tabs(tabs, reqState.tab, 'reqTab');
            if (MRP.auth.can('approveRequest') && isFinite(limit)) {
                html += H.banner('blue', 'info', `Onay limitiniz: ${U.cur(limit)}`, 'Limit üzerindeki talepler Satın Alma Müdürü onayına yönlendirilir.');
            }
            if (!list.length) return html + H.empty('Talep bulunamadı', MRP.auth.can('createRequest') ? 'MRP ekranında satın alma önerilerini seçerek talep oluşturabilirsiniz.' : '');
            html += `<div class="cards">${list.map((r) => {
                const color = { pending: 'var(--violet)', approved: 'var(--green)', ordered: 'var(--amber)', closed: 'var(--cyan)', rejected: 'var(--red)' }[r.status];
                return `<article class="doc-card" style="--doc-c:${color};">
                    <div class="h"><div><b>${esc(r.no)}</b><div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap;">${H.badge(H.REQ_STATUS, r.status)} ${H.badge(H.PRIORITY, r.priority)}
                        ${r.escalated && r.status === 'pending' ? '<span class="badge badge-amber">Müdür onayında</span>' : ''}</div></div>
                        <div class="amount">${U.cur(r.total)}</div></div>
                    <div class="meta">
                        <div><span>Kalem</span>${r.lines.length}</div>
                        <div><span>İlk ihtiyaç</span>${esc(U.date(U.parseDate(r.deadline)))}</div>
                        <div><span>Talep eden</span>${esc(r.createdByName)}</div>
                        <div><span>Tarih</span>${esc(U.dateTime(r.createdAt))}</div>
                        ${r.poNo ? `<div><span>Sipariş</span><span class="mono" style="color:var(--text);display:inline;">${esc(r.poNo)}</span></div>` : ''}
                        ${r.comments && r.comments.length ? `<div><span>Yorum</span>${r.comments.length}</div>` : ''}
                    </div>
                    ${r.rejectionReason ? `<div class="banner red" style="margin:0;padding:8px 12px;"><div class="tx"><p><b>Red sebebi:</b> ${esc(r.rejectionReason)}</p></div></div>` : ''}
                    <div class="acts">
                        <button class="btn btn-secondary btn-sm" data-act="reqDetail" data-id="${esc(r.no)}">Detay</button>
                        ${r.status === 'pending' && MRP.auth.can('approveRequest') ? `<button class="btn btn-success btn-sm" data-act="reqApprove" data-id="${esc(r.no)}">${MRP.icon('check', 'sm')} Onayla</button>
                            <button class="btn btn-danger btn-sm" data-act="reqReject" data-id="${esc(r.no)}">Reddet</button>` : ''}
                        ${r.status === 'approved' && MRP.auth.can('createPO') ? `<button class="btn btn-primary btn-sm" data-act="createPO" data-id="${esc(r.no)}">${MRP.icon('truck', 'sm')} Sipariş Oluştur</button>` : ''}
                    </div></article>`;
            }).join('')}</div>`;
            return html;
        }
    };

    function openReqDetail(no) {
        const r = findReq(no);
        if (!r) return;
        const comments = r.comments || [];
        const buttons = [{ label: 'Kapat' }];
        if (r.status === 'pending' && MRP.auth.can('approveRequest')) {
            buttons.push({ label: 'Reddet', cls: 'btn-danger', onClick: () => { setTimeout(() => rejectReq(no)); } });
            buttons.push({ label: 'Onayla', cls: 'btn-success', icon: 'check', onClick: () => { approveReq(no); } });
        }
        if (r.status === 'approved' && MRP.auth.can('createPO')) buttons.push({ label: 'Sipariş Oluştur', cls: 'btn-primary', icon: 'truck', onClick: () => { setTimeout(() => openCreatePO(no)); } });
        const ctx = UI.modal({
            title: `${r.no} — Satın Alma Talebi`, size: 'xl', buttons,
            body: `<dl class="dl card card-body" style="margin-bottom:14px;grid-template-columns:repeat(4,auto 1fr);">
                    <dt>Durum</dt><dd>${H.badge(H.REQ_STATUS, r.status)}</dd><dt>Öncelik</dt><dd>${H.badge(H.PRIORITY, r.priority)}</dd>
                    <dt>Talep eden</dt><dd>${esc(r.createdByName)}</dd><dt>Kaynak</dt><dd>${esc(r.source || 'Manuel')}</dd>
                    <dt>Toplam</dt><dd style="color:var(--accent);">${U.cur(r.total)}</dd><dt>Sipariş</dt><dd class="mono">${esc(r.poNo || '–')}</dd></dl>
                ${r.note ? H.banner('amber', 'info', 'Not', r.note) : ''}
                <div class="table-wrap" style="max-height:300px;"><table><thead><tr><th>Kod</th><th>Kalem</th><th>Tür</th><th class="num">Miktar</th><th class="num">Birim Fiyat</th><th class="num">Tutar ₺</th><th>İhtiyaç</th></tr></thead><tbody>
                ${r.lines.map((l) => `<tr><td>${H.itemLink(l.kod)}</td><td>${esc(l.ad)}</td><td><span class="badge badge-gray plain">${esc(l.tur)}</span></td><td class="num">${esc(U.qty(l.qty, l.unit))}</td>
                    <td class="num">${U.num(l.price, 4)}</td><td class="num strong">${U.num(l.total)}</td><td>${esc(U.date(U.parseDate(l.needDate)))}</td></tr>`).join('')}
                <tr class="total"><td colspan="5" class="text-right">Toplam</td><td class="num">${U.num(r.total)}</td><td></td></tr></tbody></table></div>
                <div class="grid grid-2" style="margin-top:16px;">
                    <div><h3 style="font-size:.9em;margin-bottom:8px;">Geçmiş</h3><div class="timeline">${(r.history || []).map((h) => `<div class="ev"><div><b>${esc(h.action)}</b>${h.note ? ` — ${esc(h.note)}` : ''}<div class="d">${esc(h.by)} · ${esc(U.dateTime(h.at))}</div></div></div>`).join('')}</div></div>
                    <div><h3 style="font-size:.9em;margin-bottom:8px;">Yorumlar (${comments.length})</h3>
                        <div id="cmList">${comments.map((c) => `<div class="comment"><span class="avatar ${esc(c.role)}">${esc(c.avatar)}</span><div style="flex:1;"><div class="who">${esc(c.by)} <small>${esc(c.roleName)} · ${esc(U.timeAgo(c.at))}</small></div><div class="tx">${esc(c.text)}</div></div></div>`).join('') || '<p class="muted" style="font-size:.85em;">Henüz yorum yok.</p>'}</div>
                        <div style="display:flex;gap:8px;margin-top:10px;"><input class="input" id="cmText" placeholder="Yorum yazın…" maxlength="500"><button class="btn btn-violet" id="cmSend">Gönder</button></div></div>
                </div>`
        });
        const send = () => {
            const text = ctx.$('#cmText').value.trim();
            if (!text) return;
            const u = me();
            r.comments = r.comments || [];
            r.comments.push({ by: u.name, role: u.role, roleName: u.roleName, avatar: u.avatar, text, at: new Date().toISOString() });
            const targets = r.createdBy === u.username ? ['satinalma', 'satinalma_muduru'] : [MRP.auth.USERS[r.createdBy] ? MRP.auth.USERS[r.createdBy].role : 'planlama'];
            MRP.store.notify('comment', `${r.no} için yorum`, `${u.name}: ${text.slice(0, 80)}`, targets, 'requests');
            MRP.store.save();
            ctx.close();
            openReqDetail(no);
        };
        ctx.$('#cmSend').addEventListener('click', send);
        ctx.$('#cmText').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    }

    function approveReq(no) {
        if (!H.guard('approveRequest')) return;
        const r = findReq(no);
        if (!r || r.status !== 'pending') return;
        const limit = me().can.approveLimit;
        if (r.total > limit) {
            if (!r.escalated) {
                r.escalated = true;
                log(r, 'Müdür onayına yönlendirildi', `Tutar ${U.cur(r.total)} > limit ${U.cur(limit)}`);
                MRP.store.notify('request', 'Onayınız gerekiyor', `${r.no} · ${U.cur(r.total)} — ${me().name} limitini aşıyor`, ['satinalma_muduru', 'admin'], 'requests');
                app().commit();
            }
            return UI.toast('Onay limiti aşıldı', `${U.cur(limit)} üzerindeki talep müdür onayına yönlendirildi.`, 'warn', 5500);
        }
        r.status = 'approved';
        r.approvedBy = me().name;
        r.approvedAt = new Date().toISOString();
        log(r, 'Onaylandı');
        MRP.store.audit('Talep onaylandı', `${r.no} (${U.cur(r.total)})`);
        MRP.store.notify('request', 'Talep onaylandı', `${r.no} ${me().name} tarafından onaylandı.`, ['planlama', 'satinalma', 'admin'], 'requests');
        app().commit();
        UI.toast('Talep onaylandı', r.no, 'success');
    }

    async function rejectReq(no) {
        if (!H.guard('approveRequest')) return;
        const r = findReq(no);
        if (!r || r.status !== 'pending') return;
        const reason = await UI.promptText({ title: `${no} — Reddet`, label: 'Red sebebi', required: true, okLabel: 'Reddet' });
        if (reason == null) return;
        r.status = 'rejected';
        r.rejectionReason = reason;
        log(r, 'Reddedildi', reason);
        MRP.store.audit('Talep reddedildi', `${r.no}: ${reason}`);
        MRP.store.notify('request', 'Talep reddedildi', `${r.no}: ${reason}`, ['planlama', 'admin'], 'requests');
        app().commit();
        UI.toast('Talep reddedildi', r.no, 'info');
    }

    // ---------------- PO oluşturma ----------------
    /** Talep satırları için tedarikçi bazında teklif karşılaştırması */
    function compareQuotes(r) {
        const types = [...new Set(r.lines.map((l) => l.tur))];
        return M.suggestSuppliers(types).map(({ s, match }) => {
            let total = 0, priced = 0, maxLt = 0;
            r.lines.forEach((l) => {
                const o = M.offer(s.id, l.kod);
                if (o) { priced++; total += l.qty * M.toTRY(o.price, o.currency); maxLt = Math.max(maxLt, o.leadTime); } else total += l.qty * l.price;
            });
            return { s, match, priced, total, maxLt, score: M.supplierScore(s), perf: M.supplierPerformance(s.id) };
        }).filter((q) => q.priced || q.match).sort((a, b) => b.priced - a.priced || a.total - b.total);
    }

    function openCreatePO(no) {
        if (!H.guard('createPO')) return;
        const r = findReq(no);
        if (!r || r.status !== 'approved') return;
        const quotes = compareQuotes(r);
        const all = M.suggestSuppliers([...new Set(r.lines.map((l) => l.tur))]);
        if (!all.length) return UI.toast('Aktif tedarikçi yok', 'Önce tedarikçi tanımlayın.', 'warn');
        const best = quotes.length ? quotes[0].s.id : all[0].s.id;
        const bestTotal = quotes.length ? Math.min(...quotes.filter((q) => q.priced === quotes[0].priced).map((q) => q.total)) : 0;
        const inp = (cls, v, step, w) => `<input class="input input-sm ${cls}" type="number" min="0" step="${step}" value="${v}" style="width:${w}px;text-align:right;">`;
        const ctx = UI.modal({
            title: `Satın Alma Siparişi — ${r.no}`, size: 'xl',
            body: `${quotes.length ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;"><h3 style="font-size:.9em;">Teklif karşılaştırma</h3>
                    <button class="btn btn-violet btn-sm" id="poSplit" type="button">En uygun tedarikçilere böl (${splitPlan(r).length} sipariş)</button></div>
                <div class="table-wrap" style="margin-bottom:16px;max-height:220px;"><table><thead><tr><th>Tedarikçi</th><th class="num">Fiyatlı kalem</th><th class="num">Tahmini tutar (KDV hariç)</th><th class="num">En uzun teslim</th><th class="num">Puan</th><th>Performans</th><th></th></tr></thead><tbody>
                ${quotes.map((q) => `<tr class="${q.s.id === best ? 'r-new' : ''}"><td class="strong">${esc(q.s.ad)} ${q.s.id === best ? '<span class="badge badge-green plain">Önerilen</span>' : ''}</td>
                    <td class="num">${q.priced}/${r.lines.length}</td><td class="num">${U.cur(q.total)}${q.priced === quotes[0].priced && q.total > bestTotal ? ` <span class="muted">(+%${U.num((q.total / bestTotal - 1) * 100, 1)})</span>` : ''}</td>
                    <td class="num">${q.maxLt ? q.maxLt + ' gün' : '–'}</td><td class="num">${U.num(q.score, 1)}★</td>
                    <td class="muted" style="font-size:.85em;">${q.perf ? `Zamanında %${U.num(q.perf.onTimePct * 100, 0)} · Kalite %${U.num(q.perf.qualityPct * 100, 0)}` : 'Teslimat verisi yok'}</td>
                    <td><button class="btn btn-secondary btn-sm qt-pick" type="button" data-sup="${esc(q.s.id)}">Seç</button></td></tr>`).join('')}</tbody></table></div>` : ''}
                <div class="form-grid">
                    <div class="field"><label>Tedarikçi <span class="req">*</span></label><select id="poSup">${all.map(({ s, match }) =>
                        `<option value="${esc(s.id)}" ${s.id === best ? 'selected' : ''}>${esc(s.ad)} · ${U.num(M.supplierScore(s), 1)}★${match ? ` · ${match} kategori uyumlu` : ''}</option>`).join('')}</select>
                        <span class="hint">Seçilen tedarikçinin fiyat listesindeki fiyatlar satırlara güncel kurla TL olarak yazılır.</span></div>
                    <div class="field"><label>Teslim tarihi <span class="req">*</span></label><input id="poDate" type="date" value="${esc(r.deadline > U.iso(U.today()) ? r.deadline : U.iso(U.addDays(U.today(), 7)))}"></div>
                    <div class="field"><label>Ödeme vadesi</label><select id="poTerm">${[0, 30, 45, 60, 90].map((d) => `<option value="${d}">${d ? d + ' gün' : 'Peşin'}</option>`).join('')}</select></div>
                    <div class="field"><label>Teslim adresi</label><input id="poAddr" value="Merkez Depo — Fabrika"></div>
                </div>
                <div class="table-wrap" style="margin-top:16px;max-height:340px;"><table><thead><tr><th>Kod</th><th>Kalem</th><th class="num">Miktar</th><th class="num">Birim Fiyat ₺</th><th>Kaynak</th><th class="num">İsk. %</th><th class="num">KDV %</th><th class="num">Satır Toplamı</th></tr></thead>
                <tbody id="poLines">${r.lines.map((l, i) => `<tr data-i="${i}"><td class="mono">${esc(l.kod)}</td><td>${esc(l.ad)}</td>
                    <td class="num">${inp('pl-qty', l.qty, 'any', 90)} <span class="muted">${esc(l.unit)}</span></td><td class="num">${inp('pl-price', U.round(l.price, 4), 'any', 110)}</td>
                    <td class="pl-src muted" style="font-size:.8em;"></td>
                    <td class="num">${inp('pl-disc', 0, '0.1', 70)}</td><td class="num">${inp('pl-vat', 20, '1', 64)}</td><td class="num strong pl-total">0</td></tr>`).join('')}</tbody></table></div>
                <div class="totals"><dl class="dl"><dt>Ara toplam</dt><dd id="poSub"></dd><dt>İskonto</dt><dd id="poDisc"></dd><dt>KDV</dt><dd id="poVat"></dd>
                    <dt class="grand">Genel toplam</dt><dd class="grand" id="poGrand"></dd></dl></div>`,
            buttons: [{ label: 'Vazgeç' }, { label: 'Siparişi Oluştur', cls: 'btn-primary', icon: 'check', onClick: (c) => submitPO(c, r) }]
        });
        const readLines = () => ctx.$$('#poLines tr').map((tr) => {
            const l = r.lines[+tr.dataset.i];
            return { kod: l.kod, ad: l.ad, tur: l.tur, unit: l.unit, qty: U.toNum(tr.querySelector('.pl-qty').value), price: U.toNum(tr.querySelector('.pl-price').value),
                currency: tr.dataset.cur || 'TRY', origPrice: tr.dataset.orig ? +tr.dataset.orig : U.toNum(tr.querySelector('.pl-price').value), fxRate: tr.dataset.fx ? +tr.dataset.fx : 1,
                disc: Math.min(100, Math.max(0, U.toNum(tr.querySelector('.pl-disc').value))), vat: Math.max(0, U.toNum(tr.querySelector('.pl-vat').value)), received: 0 };
        });
        const recalc = () => {
            const lines = readLines();
            ctx.$$('#poLines tr').forEach((tr, i) => { const l = lines[i]; tr.querySelector('.pl-total').textContent = U.num(l.qty * l.price * (1 - l.disc / 100) * (1 + l.vat / 100)); });
            const t = poTotals({ lines });
            ctx.$('#poSub').textContent = U.cur(t.sub); ctx.$('#poDisc').textContent = '−' + U.cur(t.disc);
            ctx.$('#poVat').textContent = U.cur(t.vat); ctx.$('#poGrand').textContent = U.cur(t.grand);
        };
        /** Tedarikçi değişince vade ve fiyat listesindeki fiyatları uygula */
        const applySupplier = () => {
            const sid = ctx.$('#poSup').value;
            const s = S().suppliers.find((x) => x.id === sid);
            if (s) ctx.$('#poTerm').value = String([0, 30, 45, 60, 90].includes(s.vade) ? s.vade : 30);
            ctx.$$('#poLines tr').forEach((tr) => {
                const l = r.lines[+tr.dataset.i];
                const o = M.offer(sid, l.kod);
                const src = tr.querySelector('.pl-src');
                if (o) {
                    const fx = M.fxRate(o.currency);
                    tr.querySelector('.pl-price').value = U.round(o.price * fx, 4);
                    tr.dataset.cur = o.currency; tr.dataset.orig = o.price; tr.dataset.fx = fx;
                    src.textContent = `Liste: ${M.fmtMoney(o.price, o.currency)}${o.currency !== 'TRY' ? ` × ${U.num(fx, 4)}` : ''} · ${o.leadTime} g`;
                } else {
                    tr.querySelector('.pl-price').value = U.round(l.price, 4);
                    delete tr.dataset.cur; delete tr.dataset.orig; delete tr.dataset.fx;
                    src.textContent = 'Kart fiyatı (listede yok)';
                }
            });
            recalc();
        };
        ctx.$('#poLines').addEventListener('input', (e) => {
            if (e.target.classList.contains('pl-price')) { const tr = e.target.closest('tr'); delete tr.dataset.cur; delete tr.dataset.orig; delete tr.dataset.fx; tr.querySelector('.pl-src').textContent = 'Elle girildi'; }
            recalc();
        });
        ctx.$('#poSup').addEventListener('change', applySupplier);
        ctx.$$('.qt-pick').forEach((b) => b.addEventListener('click', () => { ctx.$('#poSup').value = b.dataset.sup; applySupplier(); }));
        ctx.readLines = readLines;
        if (ctx.$('#poSplit')) ctx.$('#poSplit').addEventListener('click', () => splitPO(r, ctx));
        applySupplier();
    }

    /** Talep için sipariş oluşturur; bir talep birden çok tedarikçiye bölünebilir */
    function createPO(r, sup, lines, { deliveryDate, paymentTerm, address }) {
        const po = {
            no: MRP.store.nextNo('PO'), requestNo: r.no, supplierId: sup.id, supplierName: sup.ad, supplierContact: sup.yetkili,
            deliveryDate, paymentTerm, address, lines, status: 'open',
            createdBy: me().name, createdAt: new Date().toISOString(), history: [], receipts: []
        };
        log(po, 'Oluşturuldu', `Talep ${r.no}`);
        S().pos.unshift(po);
        r.poNos = [...(r.poNos || (r.poNo ? [r.poNo] : [])), po.no];
        r.poNo = r.poNos.join(', ');
        r.status = 'ordered';
        log(r, 'Siparişe dönüştürüldü', `${po.no} · ${sup.ad}`);
        const t = poTotals(po);
        MRP.store.audit('Satın alma siparişi oluşturuldu', `${po.no} · ${sup.ad} · ${U.cur(t.grand)}`);
        MRP.store.notify('po', 'Sipariş oluşturuldu', `${po.no} · ${sup.ad} · ${U.cur(t.grand)}`, ['planlama', 'satinalma', 'satinalma_muduru', 'admin'], 'po');
        return po;
    }

    /** Talebin durumunu bağlı siparişlerden türetir */
    function syncRequest(r) {
        if (!r) return;
        const pos = (r.poNos || (r.poNo ? [r.poNo] : [])).map(findPO).filter(Boolean);
        r.poNos = pos.filter((p) => p.status !== 'cancelled').map((p) => p.no);
        r.poNo = r.poNos.join(', ') || null;
        if (!r.poNos.length) { r.status = 'approved'; return; }
        const active = pos.filter((p) => p.status !== 'cancelled');
        if (active.every((p) => p.status === 'received') && r.status !== 'closed') { r.status = 'closed'; log(r, 'Kapandı', 'Tüm siparişler teslim alındı'); }
    }

    function submitPO(ctx, r) {
        const sup = S().suppliers.find((s) => s.id === ctx.$('#poSup').value);
        const deliveryDate = ctx.$('#poDate').value;
        const lines = ctx.readLines();
        if (!sup) { UI.toast('Tedarikçi seçin', '', 'warn'); return false; }
        if (!deliveryDate) { UI.toast('Teslim tarihi gerekli', '', 'warn'); return false; }
        if (lines.some((l) => l.qty <= 0)) { UI.toast('Geçersiz miktar', 'Tüm satırlarda miktar sıfırdan büyük olmalı.', 'warn'); return false; }
        const po = createPO(r, sup, lines, { deliveryDate, paymentTerm: +ctx.$('#poTerm').value, address: ctx.$('#poAddr').value.trim() });
        app().commit();
        UI.toast('Sipariş oluşturuldu', `${po.no} · ${sup.ad}`, 'success');
    }

    /** Her kalemi fiyat listesindeki en ucuz aktif tedarikçiye atar; teklifi olmayan kalem kategori uyumlu tedarikçiye gider */
    function splitPlan(r) {
        const groups = new Map();
        r.lines.forEach((l) => {
            const offer = M.offers(l.kod).find((o) => o.supplier.aktif);
            let sup, line;
            if (offer) {
                sup = offer.supplier;
                line = { kod: l.kod, ad: l.ad, tur: l.tur, unit: l.unit, qty: Math.max(l.qty, offer.moq || 0), price: U.round(offer.priceTRY, 4), currency: offer.currency, origPrice: offer.price, fxRate: M.fxRate(offer.currency), disc: 0, vat: 20, received: 0, lt: offer.leadTime };
            } else {
                const m = M.suggestSuppliers([l.tur])[0];
                if (!m) return;
                sup = m.s;
                line = { kod: l.kod, ad: l.ad, tur: l.tur, unit: l.unit, qty: l.qty, price: U.round(l.price, 4), currency: 'TRY', origPrice: l.price, fxRate: 1, disc: 0, vat: 20, received: 0, lt: (M.rawItem(l.kod) || {}).leadTime || 7 };
            }
            if (!groups.has(sup.id)) groups.set(sup.id, { sup, lines: [] });
            groups.get(sup.id).lines.push(line);
        });
        return [...groups.values()];
    }

    function splitPO(r, parentCtx) {
        const plan = splitPlan(r);
        if (!plan.length) return UI.toast('Uygun tedarikçi yok', '', 'warn');
        const today = U.iso(U.today());
        plan.forEach((g) => {
            const lt = Math.max(...g.lines.map((l) => l.lt || 0));
            const earliest = U.iso(U.addDays(U.today(), lt));
            g.deliveryDate = r.deadline && r.deadline > earliest ? r.deadline : earliest;
            g.total = poTotals({ lines: g.lines }).grand;
            g.late = r.deadline && g.deliveryDate > r.deadline && r.deadline >= today;
        });
        UI.modal({
            title: `${r.no} — tedarikçilere böl`, size: 'lg',
            body: `<p class="muted" style="font-size:.86em;margin-bottom:12px;">Her kalem fiyat listesindeki en uygun (TL) aktif tedarikçiye atanır; listede olmayan kalemler kategori uyumlu ve puanı yüksek tedarikçiye kart fiyatıyla gider. Teslim tarihi, tedarikçinin teslim süresine göre hesaplanır.</p>
                <div class="table-wrap"><table><thead><tr><th>Tedarikçi</th><th class="num">Kalem</th><th>Teslim</th><th class="num">Tutar (KDV dahil)</th></tr></thead><tbody>
                ${plan.map((g) => `<tr><td class="strong">${esc(g.sup.ad)}</td><td class="num">${g.lines.length}</td><td>${esc(U.date(U.parseDate(g.deliveryDate)))} ${g.late ? '<span class="badge badge-amber">İhtiyaçtan sonra</span>' : ''}</td><td class="num">${U.cur(g.total)}</td></tr>`).join('')}
                <tr class="total"><td>Toplam</td><td class="num">${U.sum(plan, (g) => g.lines.length)}</td><td></td><td class="num">${U.cur(U.sum(plan, (g) => g.total))}</td></tr></tbody></table></div>`,
            buttons: [{ label: 'Vazgeç' }, {
                label: `${plan.length} sipariş oluştur`, cls: 'btn-primary', icon: 'check', onClick: () => {
                    const nos = plan.map((g) => createPO(r, g.sup, g.lines.map(({ lt, ...l }) => l), { deliveryDate: g.deliveryDate, paymentTerm: g.sup.vade, address: 'Merkez Depo — Fabrika' }).no);
                    if (parentCtx) parentCtx.close();
                    app().commit();
                    UI.toast(`${nos.length} sipariş oluşturuldu`, nos.join(', '), 'success', 6000);
                }
            }]
        });
    }

    Object.assign(MRP.actions, {
        reqTab: (t) => { reqState.tab = t; app().render(); },
        reqDetail: (no) => openReqDetail(no),
        reqApprove: (no) => approveReq(no),
        reqReject: (no) => rejectReq(no),
        createPO: (no) => openCreatePO(no)
    });

    // =====================================================================
    // SATIN ALMA SİPARİŞLERİ
    // =====================================================================
    const poState = { tab: 'active' };

    MRP.views.po = {
        title: 'Satın Alma Siparişleri',
        subtitle: 'Açık siparişler, teslimat takibi ve mal kabul',
        render() {
            const all = S().pos;
            const by = (s) => all.filter((p) => s.includes(p.status));
            const tabs = [['active', 'Açık / Kısmi', by(['open', 'partial']).length], ['received', 'Teslim Alınan', by(['received']).length], ['cancelled', 'İptal', by(['cancelled']).length], ['all', 'Tümü', all.length]];
            const list = poState.tab === 'active' ? by(['open', 'partial']) : poState.tab === 'all' ? all : by([poState.tab]);
            const today = U.iso(U.today());
            const late = by(['open', 'partial']).filter((p) => p.deliveryDate < today);
            let html = H.tabs(tabs, poState.tab, 'poTab');
            if (late.length) html += H.banner('amber', 'truck', `${late.length} siparişin teslim tarihi geçti`, late.map((p) => `${p.no} (${p.supplierName})`).join(', '));
            html += `<section class="card"><div class="table-wrap"><table>
                <thead><tr><th>Sipariş No</th><th>Tedarikçi</th><th>Talep</th><th>Teslim</th><th class="num">Kalem</th><th class="num">Tutar (KDV dahil)</th><th>Teslim Durumu</th><th>Durum</th><th></th></tr></thead>
                <tbody>${list.map((p) => {
                    const t = poTotals(p);
                    const prog = poProgress(p);
                    const isLate = (p.status === 'open' || p.status === 'partial') && p.deliveryDate < today;
                    return `<tr class="${isLate ? 'r-warn' : ''}"><td><button class="link mono" data-act="poDetail" data-id="${esc(p.no)}">${esc(p.no)}</button></td>
                        <td class="strong">${esc(p.supplierName)}</td><td class="mono">${esc(p.requestNo)}</td>
                        <td class="nowrap">${esc(U.date(U.parseDate(p.deliveryDate)))} ${isLate ? '<span class="badge badge-red">Gecikti</span>' : ''}</td>
                        <td class="num">${p.lines.length}</td><td class="num strong">${U.num(t.grand)}</td>
                        <td><span class="bar"><span style="width:${prog}%;background:${prog >= 100 ? 'var(--green)' : 'var(--blue)'};"></span></span> <span class="muted">${U.num(prog, 0)}%</span></td>
                        <td>${H.badge(H.PO_STATUS, p.status)}</td>
                        <td><div class="row-actions">
                            ${(p.status === 'open' || p.status === 'partial') && MRP.auth.can('receiveGoods') ? `<button class="btn btn-success btn-sm" data-act="poReceive" data-id="${esc(p.no)}">Mal Kabul</button>` : ''}
                            <button class="btn btn-ghost btn-sm" data-act="poPdf" data-id="${esc(p.no)}" title="PDF">${MRP.icon('print', 'sm')}</button></div></td></tr>`;
                }).join('') || `<tr><td colspan="9">${H.empty('Sipariş yok', 'Onaylı taleplerden sipariş oluşturulabilir.')}</td></tr>`}</tbody>
            </table></div></section>`;
            return html;
        }
    };

    function openPODetail(no) {
        const p = findPO(no);
        if (!p) return;
        const t = poTotals(p);
        const buttons = [{ label: 'Kapat' }, { label: 'PDF', icon: 'print', onClick: () => { printPO(no); return false; } }];
        if (p.status === 'open' && !(p.receipts || []).length && MRP.auth.can('createPO')) buttons.splice(1, 0, { label: 'Siparişi İptal Et', cls: 'btn-danger', onClick: () => { setTimeout(() => cancelPO(no)); } });
        if ((p.status === 'open' || p.status === 'partial') && MRP.auth.can('receiveGoods')) buttons.push({ label: 'Mal Kabul', cls: 'btn-success', onClick: () => { setTimeout(() => openReceive(no)); } });
        UI.modal({
            title: `${p.no} — ${p.supplierName}`, size: 'xl', buttons,
            body: `<dl class="dl card card-body" style="margin-bottom:14px;grid-template-columns:repeat(4,auto 1fr);">
                    <dt>Durum</dt><dd>${H.badge(H.PO_STATUS, p.status)}</dd><dt>Talep</dt><dd class="mono">${esc(p.requestNo)}</dd>
                    <dt>Teslim tarihi</dt><dd>${esc(U.date(U.parseDate(p.deliveryDate)))}</dd><dt>Vade</dt><dd>${p.paymentTerm ? p.paymentTerm + ' gün' : 'Peşin'}</dd>
                    <dt>Yetkili</dt><dd>${esc(p.supplierContact || '–')}</dd><dt>Adres</dt><dd>${esc(p.address || '–')}</dd></dl>
                <div class="table-wrap" style="max-height:300px;"><table><thead><tr><th>Kod</th><th>Kalem</th><th class="num">Sipariş</th><th class="num">Teslim Alınan</th><th class="num">Kalan</th>
                    <th class="num">Birim Fiyat</th><th class="num">İsk.</th><th class="num">KDV</th><th class="num">Toplam ₺</th></tr></thead><tbody>
                ${p.lines.map((l) => `<tr><td>${H.itemLink(l.kod)}</td><td>${esc(l.ad)}</td><td class="num">${esc(U.qty(l.qty, l.unit))}</td><td class="num">${esc(U.qty(l.received || 0, l.unit))}</td>
                    <td class="num ${l.qty - (l.received || 0) > 0 ? 'tp-neg' : ''}">${esc(U.qty(Math.max(0, l.qty - (l.received || 0)), l.unit))}</td>
                    <td class="num">${U.num(l.price, 4)}</td><td class="num">%${U.num(l.disc, 1)}</td><td class="num">%${U.num(l.vat, 0)}</td>
                    <td class="num strong">${U.num(l.qty * l.price * (1 - l.disc / 100) * (1 + l.vat / 100))}</td></tr>`).join('')}
                </tbody></table></div>
                <div class="totals"><dl class="dl"><dt>Ara toplam</dt><dd>${U.cur(t.sub)}</dd><dt>İskonto</dt><dd>−${U.cur(t.disc)}</dd><dt>KDV</dt><dd>${U.cur(t.vat)}</dd><dt class="grand">Genel toplam</dt><dd class="grand">${U.cur(t.grand)}</dd></dl></div>
                <div class="grid grid-2" style="margin-top:16px;">
                    <div><h3 style="font-size:.9em;margin-bottom:8px;">Mal kabul kayıtları</h3>${(p.receipts || []).length ? `<div class="timeline">${p.receipts.map((rc) => `<div class="ev"><div>
                        <b>İrsaliye ${esc(rc.waybill)}</b> · ${rc.quality === 'rejected' ? '<span class="badge badge-red">Reddedildi</span>' : '<span class="badge badge-green">Kabul</span>'}
                        <div class="d">${esc(rc.by)} · ${esc(U.dateTime(rc.at))} · ${rc.lines.length} kalem${rc.note ? ' · ' + esc(rc.note) : ''}</div></div></div>`).join('')}</div>` : '<p class="muted" style="font-size:.85em;">Henüz teslimat yok.</p>'}</div>
                    <div><h3 style="font-size:.9em;margin-bottom:8px;">Geçmiş</h3><div class="timeline">${(p.history || []).map((h) => `<div class="ev"><div><b>${esc(h.action)}</b>${h.note ? ` — ${esc(h.note)}` : ''}<div class="d">${esc(h.by)} · ${esc(U.dateTime(h.at))}</div></div></div>`).join('')}</div></div>
                </div>`
        });
    }

    async function cancelPO(no) {
        const p = findPO(no);
        if (!(await UI.confirm(`${no} iptal edilecek; talebin başka açık siparişi yoksa talep yeniden "Onaylı" durumuna döner.`, { title: 'Siparişi iptal et', okLabel: 'İptal Et', danger: true }))) return;
        p.status = 'cancelled';
        log(p, 'İptal edildi');
        const r = findReq(p.requestNo);
        if (r) { log(r, 'Sipariş iptal edildi', no); syncRequest(r); }
        MRP.store.audit('Sipariş iptal edildi', no);
        app().commit();
        UI.toast('Sipariş iptal edildi', no, 'info');
    }

    function openReceive(no) {
        if (!H.guard('receiveGoods')) return;
        const p = findPO(no);
        if (!p || !(p.status === 'open' || p.status === 'partial')) return;
        const ctx = UI.modal({
            title: `Mal Kabul — ${p.no}`, size: 'lg',
            body: `${H.banner('green', 'truck', p.supplierName, `Beklenen teslim: ${U.date(U.parseDate(p.deliveryDate))}. Kısmi teslimat desteklenir; kalan miktar sipariş açık kalır.`)}
                <div class="form-grid">
                    <div class="field"><label>İrsaliye no <span class="req">*</span></label><input id="rcWaybill" autocomplete="off"></div>
                    <div class="field"><label>Kalite kontrol</label><select id="rcQuality"><option value="ok">Kabul — stoğa al</option><option value="rejected">Ret — iade (stoğa alınmaz)</option></select></div>
                    <div class="field"><label>Giriş lokasyonu</label><select id="rcLoc">${Object.entries(M.LOCATIONS).filter(([k]) => k !== 'FASON').map(([k, l]) => `<option value="${k}">${esc(l.ad)}</option>`).join('')}</select></div>
                    <div class="field"><label>Lot / parti no</label><input id="rcLot" placeholder="Boş bırakılırsa otomatik" autocomplete="off"><span class="hint">Tedarikçi parti numarası — izlenebilirlik için.</span></div>
                </div>
                <div class="table-wrap" style="margin-top:14px;max-height:320px;"><table><thead><tr><th>Kod</th><th>Kalem</th><th class="num">Sipariş</th><th class="num">Önceki</th><th class="num">Kalan</th><th class="num">Bu Teslimat</th></tr></thead><tbody>
                ${p.lines.map((l, i) => { const rem = Math.max(0, l.qty - (l.received || 0)); return `<tr><td class="mono">${esc(l.kod)}</td><td>${esc(l.ad)}</td>
                    <td class="num">${esc(U.qty(l.qty, l.unit))}</td><td class="num">${esc(U.qty(l.received || 0, l.unit))}</td><td class="num">${esc(U.qty(rem, l.unit))}</td>
                    <td class="num"><input class="input input-sm rc-qty" data-i="${i}" type="number" min="0" step="any" value="${U.round(rem, 3)}" style="width:110px;text-align:right;"></td></tr>`; }).join('')}
                </tbody></table></div>
                <div class="field" style="margin-top:14px;"><label>Not</label><textarea id="rcNote" placeholder="Hasar, eksik koli vb."></textarea></div>`,
            buttons: [{ label: 'Vazgeç' }, { label: 'Mal Kabulü Kaydet', cls: 'btn-success', icon: 'check', onClick: (c) => submitReceive(c, p) }]
        });
        return ctx;
    }

    function submitReceive(ctx, p) {
        const waybill = ctx.$('#rcWaybill').value.trim();
        const quality = ctx.$('#rcQuality').value;
        const note = ctx.$('#rcNote').value.trim();
        const loc = ctx.$('#rcLoc').value;
        const lotBase = ctx.$('#rcLot').value.trim();
        if (!waybill) { UI.toast('İrsaliye no gerekli', '', 'warn'); return false; }
        const lines = ctx.$$('.rc-qty').map((inp) => ({ i: +inp.dataset.i, qty: U.toNum(inp.value) })).filter((x) => x.qty > 0);
        if (!lines.length) { UI.toast('Miktar girilmedi', 'En az bir kalem için teslim miktarı girin.', 'warn'); return false; }
        if (lines.some((x) => x.qty < 0)) { UI.toast('Geçersiz miktar', '', 'warn'); return false; }
        const over = lines.filter((x) => (p.lines[x.i].received || 0) + x.qty > p.lines[x.i].qty * 1.1 + 1e-9);
        if (over.length) { UI.toast('Fazla teslimat', 'Sipariş miktarının %10\'undan fazlası kabul edilemez.', 'warn'); return false; }

        const rc = { waybill, quality, note, at: new Date().toISOString(), by: me().name, lines: lines.map((x) => ({ kod: p.lines[x.i].kod, qty: x.qty })) };
        p.receipts = p.receipts || [];
        p.receipts.push(rc);
        if (quality === 'rejected') {
            log(p, 'Teslimat reddedildi', `İrsaliye ${waybill}${note ? ' — ' + note : ''}`);
            MRP.store.audit('Teslimat reddedildi', `${p.no} / ${waybill}`);
            MRP.store.notify('po', 'Teslimat reddedildi', `${p.no} · ${p.supplierName} · İrsaliye ${waybill}`, ['satinalma', 'satinalma_muduru', 'admin', 'planlama'], 'po');
        } else {
            lines.forEach((x) => {
                const l = p.lines[x.i];
                l.received = U.round((l.received || 0) + x.qty, 3);
                const it = M.item(l.kod);
                if (it) M.move({ kod: l.kod, qty: x.qty, type: 'GR', loc, lot: lotBase || '', ref: p.no, supplier: p.supplierName, note: it.procurement === 'service' ? `Fason hizmet teslimi · İrsaliye ${waybill}` : `İrsaliye ${waybill}` });
            });
            const done = p.lines.every((l) => (l.received || 0) >= l.qty - 1e-9);
            p.status = done ? 'received' : 'partial';
            log(p, done ? 'Tamamı teslim alındı' : 'Kısmi teslim alındı', `İrsaliye ${waybill}`);
            if (done) syncRequest(findReq(p.requestNo));
            MRP.store.audit('Mal kabul', `${p.no} / ${waybill}: ${lines.length} kalem${done ? '' : ' (kısmi)'}`);
            MRP.store.notify('po', 'Mal kabul yapıldı', `${p.no} · ${lines.length} kalem${done ? '' : ' (kısmi)'}`, ['planlama', 'satinalma_muduru', 'admin'], 'po');
        }
        app().commit();
        UI.toast(quality === 'rejected' ? 'Teslimat reddedildi' : 'Mal kabul kaydedildi', quality === 'rejected' ? 'Stok değişmedi.' : 'Stoklar güncellendi.', quality === 'rejected' ? 'warn' : 'success');
    }

    function printPO(no) {
        const p = findPO(no);
        if (!p) return;
        if (!window.jspdf) return UI.toast('PDF kütüphanesi yüklenemedi', 'İnternet bağlantınızı kontrol edin.', 'error');
        const T = U.pdfText;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        doc.setFillColor(17, 23, 41); doc.rect(0, 0, pw, 28, 'F');
        doc.setTextColor(245, 158, 11); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
        doc.text(T('SATIN ALMA SİPARİŞİ'), 14, 13);
        doc.setTextColor(230, 233, 242); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`${p.no}  |  ${T(U.date(p.createdAt))}`, 14, 21);
        doc.setTextColor(23, 32, 51); doc.setFontSize(9.5);
        const info = [['Tedarikçi', p.supplierName], ['Yetkili', p.supplierContact || '-'], ['Teslim tarihi', U.date(U.parseDate(p.deliveryDate))],
            ['Ödeme vadesi', p.paymentTerm ? p.paymentTerm + ' gün' : 'Peşin'], ['Teslim adresi', p.address || '-'], ['Talep referansı', p.requestNo]];
        info.forEach(([k, v], i) => { doc.setFont('helvetica', 'bold'); doc.text(T(k) + ':', 14, 38 + i * 6); doc.setFont('helvetica', 'normal'); doc.text(T(v), 50, 38 + i * 6); });
        doc.autoTable({
            startY: 76,
            head: [['Kod', 'Kalem', 'Miktar', 'Birim', 'Birim Fiyat', 'Isk.%', 'KDV%', 'Toplam'].map(T)],
            body: p.lines.map((l) => [l.kod, T(l.ad).slice(0, 38), U.qty(l.qty), T(l.unit), U.num(l.price, 2), U.num(l.disc, 1), U.num(l.vat, 0), U.num(l.qty * l.price * (1 - l.disc / 100) * (1 + l.vat / 100))]),
            theme: 'grid', headStyles: { fillColor: [17, 23, 41], textColor: [245, 158, 11], fontSize: 8 }, bodyStyles: { fontSize: 7.5 },
            columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
            margin: { left: 14, right: 14 }
        });
        const t = poTotals(p);
        let y = doc.lastAutoTable.finalY + 8;
        [['Ara toplam', t.sub], ['Iskonto', -t.disc], ['KDV', t.vat], ['GENEL TOPLAM', t.grand]].forEach(([k, v], i) => {
            doc.setFont('helvetica', i === 3 ? 'bold' : 'normal');
            doc.text(k, pw - 70, y); doc.text(T(U.cur(v)), pw - 14, y, { align: 'right' }); y += 6;
        });
        doc.setFontSize(7.5); doc.setTextColor(120);
        doc.text(T(`Oluşturan: ${p.createdBy} — MRP Pro`), 14, doc.internal.pageSize.getHeight() - 10);
        doc.save(`${p.no}.pdf`);
    }

    Object.assign(MRP.actions, {
        poTab: (t) => { poState.tab = t; app().render(); },
        poDetail: (no) => openPODetail(no),
        poReceive: (no) => openReceive(no),
        poPdf: (no) => printPO(no)
    });
    MRP.purchasing = { poTotals };

    // =====================================================================
    // TEDARİKÇİLER
    // =====================================================================
    MRP.views.suppliers = {
        title: 'Tedarikçiler',
        subtitle: 'Tedarikçi kartları, tedarik kategorileri ve sipariş geçmişi',
        render() {
            const sup = S().suppliers;
            const active = sup.filter((s) => s.aktif);
            const avg = sup.length ? U.sum(sup, (s) => M.supplierScore(s)) / sup.length : 0;
            let html = `<div class="kpis">${H.kpi('Tedarikçi', sup.length, `${active.length} aktif`, 'green')}
                ${H.kpi('Ortalama Puan', avg.toFixed(2), '5 üzerinden', '')}
                ${H.kpi('Toplam Sipariş', S().pos.filter((p) => p.status !== 'cancelled').length, U.compactCur(U.sum(S().pos.filter((p) => p.status !== 'cancelled'), (p) => poTotals(p).grand)), 'blue')}</div>
                <div class="toolbar"><span class="spacer"></span>${MRP.auth.can('manageSuppliers') ? `<button class="btn btn-primary" data-act="supplierEdit">${MRP.icon('plus')} Yeni Tedarikçi</button>` : ''}</div>`;
            html += `<div class="cards">${sup.map((s) => {
                const pos = S().pos.filter((p) => p.supplierId === s.id && p.status !== 'cancelled');
                const score = M.supplierScore(s);
                const perf = M.supplierPerformance(s.id);
                const stars = '★'.repeat(Math.round(score)) + '☆'.repeat(5 - Math.round(score));
                const nOffers = S().priceList.filter((o) => o.supplierId === s.id).length;
                return `<div class="sup-card ${s.aktif ? '' : 'passive'}" data-act="supplierDetail" data-id="${esc(s.id)}">
                    <h3><span>${esc(s.ad)}</span><span class="stars" title="${U.num(score, 1)}/5 ${perf ? '(teslimat verisinden otomatik)' : '(elle girilen)'}">${stars}</span></h3>
                    <div class="info"><span class="mono muted">${esc(s.id)}${s.aktif ? '' : ' · Pasif'}</span><span>${esc(s.yetkili || '–')} · ${esc(s.tel || '–')}</span><span>${esc(s.email || '–')}</span><span>Vade: ${s.vade} gün · ${nOffers} fiyatlı kalem</span>${perf ? `<span>Zamanında teslim %${U.num(perf.onTimePct * 100, 0)} · Kalite %${U.num(perf.qualityPct * 100, 0)}</span>` : ''}</div>
                    <div class="chips" style="margin-top:10px;gap:5px;">${s.kategoriler.map((k) => `<span class="badge badge-gray plain">${esc(k)}</span>`).join('')}</div>
                    <div class="muted" style="font-size:.8em;margin-top:10px;padding-top:8px;border-top:1px solid var(--border);">${pos.length} sipariş · ${U.cur(U.sum(pos, (p) => poTotals(p).grand))}</div>
                </div>`;
            }).join('')}</div>`;
            return html;
        }
    };

    function openSupplier(id) {
        const s = S().suppliers.find((x) => x.id === id);
        if (!s) return;
        const pos = S().pos.filter((p) => p.supplierId === id);
        const perf = M.supplierPerformance(id);
        const offers = S().priceList.filter((o) => o.supplierId === id).sort((a, b) => a.kod.localeCompare(b.kod));
        const canEdit = MRP.auth.can('manageSuppliers');
        const buttons = [{ label: 'Kapat' }];
        if (canEdit) buttons.push({ label: 'Fiyat Ekle', icon: 'plus', onClick: () => { setTimeout(() => editOffer(id)); } });
        if (MRP.auth.can('manageSuppliers')) {
            buttons.push({ label: s.aktif ? 'Pasife Al' : 'Aktifleştir', onClick: () => {
                s.aktif = !s.aktif; MRP.store.audit('Tedarikçi durumu değişti', `${s.id}: ${s.aktif ? 'aktif' : 'pasif'}`); app().commit();
            } });
            buttons.push({ label: 'Düzenle', cls: 'btn-primary', icon: 'edit', onClick: () => { setTimeout(() => editSupplier(id)); } });
        }
        UI.modal({
            title: s.ad, size: 'lg', buttons,
            body: `<dl class="dl card card-body" style="margin-bottom:14px;grid-template-columns:repeat(4,auto 1fr);">
                <dt>Kod</dt><dd class="mono">${esc(s.id)}</dd><dt>Durum</dt><dd>${s.aktif ? '<span class="badge badge-green">Aktif</span>' : '<span class="badge badge-gray">Pasif</span>'}</dd>
                <dt>Yetkili</dt><dd>${esc(s.yetkili || '–')}</dd><dt>Telefon</dt><dd>${esc(s.tel || '–')}</dd>
                <dt>E-posta</dt><dd>${esc(s.email || '–')}</dd><dt>Vergi no</dt><dd>${esc(s.vergiNo || '–')}</dd>
                <dt>Vade</dt><dd>${s.vade} gün</dd><dt>Puan</dt><dd>${U.num(M.supplierScore(s), 1)} / 5 <span class="muted">${perf ? 'otomatik' : 'elle'}</span></dd>
                ${perf ? `<dt>Zamanında teslim</dt><dd>%${U.num(perf.onTimePct * 100, 0)} (${perf.orders} sipariş)</dd><dt>Kalite (kabul oranı)</dt><dd>%${U.num(perf.qualityPct * 100, 0)}</dd>` : ''}
                <dt>Adres</dt><dd style="grid-column:span 3;text-align:left;">${esc(s.adres || '–')}</dd></dl>
                <div class="chips" style="margin-bottom:14px;">${s.kategoriler.map((k) => `<span class="badge badge-gray plain">${esc(k)}</span>`).join('')}</div>
                <h3 style="font-size:.9em;margin-bottom:8px;">Fiyat listesi (${offers.length})</h3>
                ${offers.length ? `<div class="table-wrap" style="margin-bottom:14px;max-height:260px;"><table><thead><tr><th>Kod</th><th>Malzeme</th><th class="num">Fiyat</th><th class="num">₺ karşılığı</th><th class="num">Teslim</th><th class="num">Min. sipariş</th><th>Güncelleme</th><th></th></tr></thead><tbody>
                    ${offers.map((o) => { const it = M.rawItem(o.kod); const bestO = M.offers(o.kod)[0]; return `<tr><td class="mono">${esc(o.kod)}</td><td>${esc(it ? it.ad : '?')}</td><td class="num">${esc(M.fmtMoney(o.price, o.currency))}</td>
                        <td class="num strong">${U.num(M.toTRY(o.price, o.currency), 2)} ${bestO && bestO.supplierId === id ? '<span class="badge badge-green plain">en iyi</span>' : ''}</td><td class="num">${o.leadTime} g</td><td class="num">${o.moq || '–'}</td><td class="muted">${esc(U.date(o.updatedAt))}</td>
                        <td>${canEdit ? `<button class="btn btn-ghost btn-sm of-edit" data-kod="${esc(o.kod)}" type="button">${MRP.icon('edit', 'sm')}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted" style="margin-bottom:14px;font-size:.85em;">Fiyat listesi boş.</p>'}
                <h3 style="font-size:.9em;margin-bottom:8px;">Siparişler</h3>
                ${pos.length ? `<div class="table-wrap"><table><thead><tr><th>Sipariş</th><th>Tarih</th><th>Teslim</th><th class="num">Tutar ₺</th><th>Durum</th></tr></thead><tbody>
                    ${pos.map((p) => `<tr><td class="mono">${esc(p.no)}</td><td>${esc(U.date(p.createdAt))}</td><td>${esc(U.date(U.parseDate(p.deliveryDate)))}</td><td class="num">${U.num(poTotals(p).grand)}</td><td>${H.badge(H.PO_STATUS, p.status)}</td></tr>`).join('')}
                    </tbody></table></div>` : '<p class="muted">Henüz sipariş yok.</p>'}`,
            onOpen: (ctx) => ctx.$$('.of-edit').forEach((b) => b.addEventListener('click', () => { ctx.close(); editOffer(id, b.dataset.kod); }))
        });
    }

    /** Tedarikçi fiyat listesi satırı ekle/düzenle/sil */
    function editOffer(supplierId, kod) {
        if (!H.guard('manageSuppliers')) return;
        const ex = kod ? M.offer(supplierId, kod) : null;
        const sup = S().suppliers.find((x) => x.id === supplierId);
        const items = M.items().filter((i) => i.procurement !== 'make');
        UI.modal({
            title: `${sup.ad} — ${ex ? 'Fiyatı düzenle' : 'Fiyat ekle'}`, size: 'md',
            body: `<datalist id="ofItems">${items.map((i) => `<option value="${esc(i.kod)}">${esc(i.ad)}</option>`).join('')}</datalist>
                <div class="form-grid">
                <div class="field full"><label>Malzeme kodu <span class="req">*</span></label><input id="ofKod" list="ofItems" value="${esc(kod || '')}" ${ex ? 'readonly' : ''} autocomplete="off"><span class="hint" id="ofName"></span></div>
                <div class="field"><label>Fiyat <span class="req">*</span></label><input id="ofPrice" type="number" min="0" step="any" value="${ex ? ex.price : ''}"></div>
                <div class="field"><label>Para birimi</label><select id="ofCur">${Object.keys(MRP.data.CURRENCIES).map((c) => `<option ${ex && ex.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
                <div class="field"><label>Teslim süresi (gün)</label><input id="ofLt" type="number" min="1" step="1" value="${ex ? ex.leadTime : 7}"></div>
                <div class="field"><label>Min. sipariş</label><input id="ofMoq" type="number" min="0" step="any" value="${ex ? ex.moq : 0}"></div>
            </div>`,
            onOpen: (ctx) => {
                const upd = () => {
                    const it = M.rawItem(ctx.$('#ofKod').value.trim());
                    ctx.$('#ofName').textContent = it ? `${it.ad} · kart fiyatı ${M.fmtMoney(it.price, it.currency)}` : 'Listeden bir malzeme seçin';
                    if (it && !ex) ctx.$('#ofCur').value = it.currency;
                };
                ctx.$('#ofKod').addEventListener('input', upd); upd();
            },
            buttons: [{ label: 'Vazgeç' }, ...(ex ? [{ label: 'Sil', cls: 'btn-danger', onClick: () => {
                S().priceList = S().priceList.filter((o) => o !== ex);
                MRP.store.audit('Fiyat listesi satırı silindi', `${supplierId} / ${kod}`);
                app().commit();
            } }] : []), {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const k = ctx.$('#ofKod').value.trim().toUpperCase();
                    const price = U.toNum(ctx.$('#ofPrice').value, NaN);
                    if (!M.rawItem(k)) { UI.toast('Geçersiz malzeme', '', 'warn'); return false; }
                    if (!(price > 0)) { UI.toast('Geçersiz fiyat', '', 'warn'); return false; }
                    const rec = { supplierId, kod: k, price, currency: ctx.$('#ofCur').value, leadTime: Math.max(1, Math.round(U.toNum(ctx.$('#ofLt').value, 7))), moq: Math.max(0, U.toNum(ctx.$('#ofMoq').value)), updatedAt: new Date().toISOString() };
                    const cur = M.offer(supplierId, k);
                    if (cur) Object.assign(cur, rec); else S().priceList.push(rec);
                    MRP.store.audit('Fiyat listesi güncellendi', `${supplierId} / ${k}: ${price} ${rec.currency}`);
                    app().commit();
                    UI.toast('Fiyat kaydedildi', `${k} · ${M.fmtMoney(price, rec.currency)}`, 'success');
                }
            }]
        });
    }

    function editSupplier(id) {
        if (!H.guard('manageSuppliers')) return;
        const s = id ? S().suppliers.find((x) => x.id === id) : { ad: '', yetkili: '', tel: '', email: '', adres: '', vergiNo: '', kategoriler: [], vade: 30, puan: 4, aktif: true };
        const types = MRP.data.ITEM_TYPES;
        UI.modal({
            title: id ? `Tedarikçi Düzenle — ${s.id}` : 'Yeni Tedarikçi', size: 'lg',
            body: `<div class="form-section"><h3>Firma bilgileri</h3><div class="form-grid">
                    <div class="field full"><label>Firma adı <span class="req">*</span></label><input id="sAd" value="${esc(s.ad)}"></div>
                    <div class="field"><label>Yetkili</label><input id="sYet" value="${esc(s.yetkili)}"></div>
                    <div class="field"><label>Telefon</label><input id="sTel" value="${esc(s.tel)}"></div>
                    <div class="field"><label>E-posta</label><input id="sMail" type="email" value="${esc(s.email)}"></div>
                    <div class="field"><label>Vergi no</label><input id="sVno" value="${esc(s.vergiNo)}" maxlength="11"></div>
                    <div class="field full"><label>Adres</label><textarea id="sAdr">${esc(s.adres)}</textarea></div></div></div>
                <div class="form-section"><h3>Tedarik kategorileri <span class="req">*</span></h3><div class="chips">${types.map((t) => `<label class="check-chip"><input type="checkbox" class="sCat" value="${esc(t)}" ${s.kategoriler.includes(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div></div>
                <div class="form-section"><h3>Ticari</h3><div class="form-grid">
                    <div class="field"><label>Ödeme vadesi (gün)</label><input id="sVade" type="number" min="0" step="1" value="${s.vade}"></div>
                    <div class="field"><label>Performans puanı (1–5)</label><input id="sPuan" type="number" min="1" max="5" step="0.1" value="${s.puan}"></div></div></div>`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kaydet', cls: 'btn-success', icon: 'check', onClick: (ctx) => {
                    const ad = ctx.$('#sAd').value.trim();
                    const cats = ctx.$$('.sCat:checked').map((c) => c.value);
                    const email = ctx.$('#sMail').value.trim();
                    if (!ad) { UI.toast('Firma adı zorunlu', '', 'warn'); return false; }
                    if (!cats.length) { UI.toast('Kategori seçin', 'En az bir tedarik kategorisi gerekli.', 'warn'); return false; }
                    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UI.toast('Geçersiz e-posta', '', 'warn'); return false; }
                    const data = { ad, yetkili: ctx.$('#sYet').value.trim(), tel: ctx.$('#sTel').value.trim(), email, adres: ctx.$('#sAdr').value.trim(),
                        vergiNo: ctx.$('#sVno').value.trim(), kategoriler: cats, vade: Math.max(0, Math.round(U.toNum(ctx.$('#sVade').value, 30))),
                        puan: Math.min(5, Math.max(1, U.toNum(ctx.$('#sPuan').value, 4))) };
                    if (id) {
                        Object.assign(s, data);
                        MRP.store.audit('Tedarikçi güncellendi', `${s.id} — ${ad}`);
                    } else {
                        const nid = MRP.store.nextNo('TED');
                        S().suppliers.push({ id: nid, ...data, aktif: true });
                        MRP.store.audit('Tedarikçi eklendi', `${nid} — ${ad}`);
                        MRP.store.notify('supplier', 'Yeni tedarikçi', `${ad} (${nid})`, ['satinalma', 'satinalma_muduru', 'admin'], 'suppliers');
                    }
                    app().commit();
                    UI.toast('Tedarikçi kaydedildi', ad, 'success');
                }
            }]
        });
    }

    Object.assign(MRP.actions, {
        supplierDetail: (id) => openSupplier(id),
        supplierEdit: (id) => editSupplier(id)
    });
})(window.MRP);
