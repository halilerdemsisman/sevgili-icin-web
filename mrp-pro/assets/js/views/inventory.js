/* ==========================================================================
   MRP Pro — Depo: stok durumu (çoklu lokasyon), sayım, transfer, fason
   sevk/dönüş, lot izlenebilirliği, barkod okutma, stok hareketleri
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;
    const LOCS = () => Object.keys(M.LOCATIONS);
    const locName = (l) => (M.LOCATIONS[l] ? M.LOCATIONS[l].ad : l);
    const valueOf = (kod) => (M.isProduct(kod) || (M.rawItem(kod) || {}).procurement === 'make' ? M.unitCost(kod) : M.priceTRY(kod));

    const stockState = { tab: 'all', q: '', lotQ: '' };

    MRP.views.stock = {
        title: 'Stok Durumu',
        subtitle: 'Lokasyon bazında stok, emniyet stoğu, fason ve lot takibi',
        render() {
            const stocked = M.items().filter((i) => i.procurement !== 'service');
            const status = (i) => M.stockStatus(i.kod);
            const fg = M.products().filter((p) => M.onHand(p.kod) !== 0);
            const openFason = S().subcontracts.filter((x) => x.status === 'open');
            const tabs = [['all', 'Tüm malzemeler', stocked.length], ['critical', 'Kritik', stocked.filter((i) => status(i) === 'critical').length],
                ['warn', 'Düşük', stocked.filter((i) => status(i) === 'warn').length], ['ok', 'Normal', stocked.filter((i) => status(i) === 'ok').length],
                ['fg', 'Mamul stoğu', fg.length], ['fason', 'Fason sevkleri', openFason.length], ['lots', 'Lot izleme', null]];
            const q = stockState.q.toLocaleLowerCase('tr');
            const match = (x) => !q || x.kod.toLocaleLowerCase('tr').includes(q) || x.ad.toLocaleLowerCase('tr').includes(q);
            const canAdj = MRP.auth.can('adjustStock');

            let html = `<div class="kpis">
                ${H.kpi('Stok Değeri', U.compactCur(M.stockValue()), 'Güncel kur ve standart maliyetle', '')}
                ${H.kpi('Stoklu Kalem', stocked.length, `${fg.length} mamul stokta`, 'blue')}
                ${H.kpi('Kritik', tabs[1][2], 'Emniyet stoğunun %50 altı', tabs[1][2] ? 'red' : 'green')}
                ${H.kpi('Düşük', tabs[2][2], 'Emniyet stoğunun altı', tabs[2][2] ? 'violet' : 'green')}
                ${H.kpi('Fasonda', openFason.length, `${U.compactCur(U.sum(stocked, (i) => M.onHand(i.kod, 'FASON') * valueOf(i.kod)))} değerinde malzeme`, 'cyan')}
            </div>${H.tabs(tabs, stockState.tab, 'stockTab')}`;

            if (stockState.tab === 'fason') return html + renderFason();
            if (stockState.tab === 'lots') return html + renderLots();

            html += `<div class="toolbar"><input class="input" id="stockSearch" placeholder="Kod veya ad ile ara…" value="${esc(stockState.q)}" data-input="stockSearch">
                <span class="spacer"></span>
                ${canAdj ? `<button class="btn btn-secondary" data-act="stockTransfer">${MRP.icon('swap')} Transfer</button>
                    <button class="btn btn-primary" data-act="fasonNew">${MRP.icon('truck')} Fasona Sevk</button>` : ''}</div>`;

            if (stockState.tab === 'fg') {
                const list = fg.filter(match);
                return html + `<section class="card"><div class="table-wrap"><table><thead><tr><th>Mamul</th><th>Ad</th><th>Kategori</th><th class="num">Stok</th><th class="num">Birim Maliyet</th><th class="num">Değer ₺</th><th></th></tr></thead><tbody>
                    ${list.map((p) => `<tr><td>${H.productLink(p.kod)}</td><td class="strong">${esc(p.ad)}</td><td>${H.catTag(p.kategori)}</td><td class="num">${esc(U.qty(M.onHand(p.kod), 'ad'))}</td>
                        <td class="num">${U.num(M.unitCost(p.kod))}</td><td class="num">${U.num(M.onHand(p.kod) * M.unitCost(p.kod))}</td>
                        <td>${canAdj ? `<button class="btn btn-ghost btn-sm" data-act="stockAdjust" data-id="${esc(p.kod)}">Sayım</button>` : ''}</td></tr>`).join('')
                    || `<tr><td colspan="7">${H.empty('Mamul stoğu yok', 'Tamamlanan iş emirleri mamul stoğu oluşturur.')}</td></tr>`}</tbody></table></div></section>`;
            }

            const ord = { critical: 0, warn: 1, ok: 2, na: 3 };
            const list = stocked.filter((i) => (stockState.tab === 'all' || status(i) === stockState.tab) && match(i))
                .sort((a, b) => ord[status(a)] - ord[status(b)] || a.kod.localeCompare(b.kod));
            html += `<section class="card"><div class="table-wrap"><table>
                <thead><tr><th>Kod</th><th>Malzeme</th>${LOCS().map((l) => `<th class="num">${esc(locName(l))}</th>`).join('')}<th class="num">Toplam</th><th class="num">Emniyet</th><th class="num">Siparişte</th>
                    <th>Doluluk</th><th>Durum</th><th class="num">Değer ₺</th><th></th></tr></thead>
                <tbody>${list.map((i) => {
                    const s = status(i);
                    const oh = M.onHand(i.kod);
                    const fill = i.safetyStock > 0 ? Math.min(100, oh / (i.safetyStock * 2) * 100) : 100;
                    const color = s === 'critical' ? 'var(--red)' : s === 'warn' ? 'var(--amber)' : 'var(--green)';
                    return `<tr class="${s === 'critical' ? 'r-crit' : s === 'warn' ? 'r-warn' : ''}">
                        <td>${H.itemLink(i.kod)}</td><td class="strong">${esc(i.ad)}</td>
                        ${LOCS().map((l) => { const v = M.onHand(i.kod, l); return `<td class="num ${v ? '' : 'muted'}">${v ? esc(U.qty(v)) : '·'}</td>`; }).join('')}
                        <td class="num strong">${esc(U.qty(oh, i.unit))}</td><td class="num">${esc(U.qty(i.safetyStock))}</td>
                        <td class="num">${esc(U.qty(M.onOrder(i.kod)))}</td>
                        <td><span class="bar"><span style="width:${Math.max(0, fill)}%;background:${color};"></span></span></td>
                        <td>${H.stockBadge(s)}</td><td class="num">${U.num(Math.max(0, oh) * valueOf(i.kod))}</td>
                        <td>${canAdj ? `<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="stockAdjust" data-id="${esc(i.kod)}">Sayım</button><button class="btn btn-ghost btn-sm" data-act="stockTransfer" data-id="${esc(i.kod)}" title="Transfer">${MRP.icon('swap', 'sm')}</button></div>` : ''}</td></tr>`;
                }).join('') || `<tr><td colspan="${9 + LOCS().length}">${H.empty('Kayıt yok')}</td></tr>`}</tbody></table></div></section>
                <p class="muted" style="font-size:.78em;margin-top:10px;">Üretimde sarf, Fabrika ve Merkez Depo stoğundan FIFO ile yapılır; fasoncudaki stok MRP'de eldeki stok sayılır ancak sarf edilemez. Eksikler için öneriler MRP'de emniyet stoğu tamamlama olarak oluşur.</p>`;
            return html;
        },
        after() {
            const el = document.getElementById(stockState.tab === 'lots' ? 'lotSearch' : 'stockSearch');
            const v = stockState.tab === 'lots' ? stockState.lotQ : stockState.q;
            if (el && v) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }
    };

    // ---------------- Sayım düzeltme (lokasyon bazında) ----------------
    function adjust(kod) {
        if (!H.guard('adjustStock')) return;
        const it = M.item(kod);
        UI.modal({
            title: `Sayım Düzeltme — ${kod}`, size: 'sm',
            body: `<p style="margin-bottom:14px;">${esc(it.ad)}</p>
                <div class="form-grid">
                    <div class="field full"><label>Lokasyon</label><select id="adjLoc">${LOCS().map((l) => `<option value="${l}">${esc(locName(l))} — ${esc(U.qty(M.onHand(kod, l), it.unit))}</option>`).join('')}</select></div>
                    <div class="field"><label>Sistem stoğu</label><input id="adjCur" readonly></div>
                    <div class="field"><label>Sayılan (${esc(it.unit)}) <span class="req">*</span></label><input id="adjQty" type="number" min="0" step="any"></div>
                    <div class="field full"><label>Lot no (fazla çıkan miktar için)</label><input id="adjLot" placeholder="Boş = SAYIM-tarih"></div>
                    <div class="field full"><label>Gerekçe <span class="req">*</span></label><input id="adjNote" placeholder="Yıl sonu sayımı, fire, hasar…"></div>
                </div><p class="hint" id="adjDiff" style="margin-top:10px;font-size:.84em;"></p>`,
            onOpen: (ctx) => {
                const cur = () => M.onHand(kod, ctx.$('#adjLoc').value);
                const upd = () => { const d = U.toNum(ctx.$('#adjQty').value) - cur(); ctx.$('#adjDiff').textContent = `Fark: ${d > 0 ? '+' : ''}${U.qty(d, it.unit)} · ${U.cur(d * valueOf(kod))}`; };
                const loc = () => { ctx.$('#adjCur').value = U.qty(cur(), it.unit); ctx.$('#adjQty').value = cur(); upd(); };
                ctx.$('#adjLoc').addEventListener('change', loc); ctx.$('#adjQty').addEventListener('input', upd); loc();
            },
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const loc = ctx.$('#adjLoc').value;
                    const cur = M.onHand(kod, loc);
                    const v = U.toNum(ctx.$('#adjQty').value, NaN);
                    const note = ctx.$('#adjNote').value.trim();
                    if (!isFinite(v) || v < 0) { UI.toast('Geçersiz miktar', '', 'warn'); return false; }
                    if (!note) { UI.toast('Gerekçe zorunlu', 'Denetim için düzeltme gerekçesi girin.', 'warn'); return false; }
                    const d = U.round(v - cur, 4);
                    if (!d) return;
                    M.move({ kod, qty: d, type: 'ADJ', loc, lot: d > 0 ? (ctx.$('#adjLot').value.trim() || `SAYIM-${U.iso(new Date())}`) : '', ref: 'SAYIM', note });
                    MRP.store.audit('Stok düzeltme', `${kod} @ ${loc}: ${U.qty(cur)} → ${U.qty(v)} (${note})`);
                    app().commit();
                    UI.toast('Stok güncellendi', `${kod} @ ${locName(loc)}: ${U.qty(v, it.unit)}`, 'success');
                }
            }]
        });
    }

    // ---------------- Lokasyonlar arası transfer ----------------
    function transfer(kod) {
        if (!H.guard('adjustStock')) return;
        const items = M.items().filter((i) => i.procurement !== 'service' && M.onHand(i.kod) > 0);
        UI.modal({
            title: 'Lokasyonlar Arası Transfer', size: 'md',
            body: `<datalist id="trItems">${items.map((i) => `<option value="${esc(i.kod)}">${esc(i.ad)}</option>`).join('')}</datalist>
                <div class="form-grid">
                    <div class="field full"><label>Malzeme <span class="req">*</span></label><input id="trKod" list="trItems" value="${esc(kod || '')}" autocomplete="off"><span class="hint" id="trInfo"></span></div>
                    <div class="field"><label>Çıkış</label><select id="trFrom">${LOCS().map((l) => `<option value="${l}">${esc(locName(l))}</option>`).join('')}</select></div>
                    <div class="field"><label>Varış</label><select id="trTo">${LOCS().map((l, i) => `<option value="${l}" ${i === 1 ? 'selected' : ''}>${esc(locName(l))}</option>`).join('')}</select></div>
                    <div class="field"><label>Miktar <span class="req">*</span></label><input id="trQty" type="number" min="0" step="any"></div>
                    <div class="field"><label>Açıklama</label><input id="trNote" placeholder="Üretim hattına besleme…"></div>
                </div>`,
            onOpen: (ctx) => {
                const upd = () => {
                    const k = ctx.$('#trKod').value.trim(); const it = M.rawItem(k);
                    ctx.$('#trInfo').textContent = it ? `${it.ad} · ${LOCS().map((l) => `${locName(l)}: ${U.qty(M.onHand(k, l), it.unit)}`).join(' · ')}` : 'Listeden seçin';
                };
                ctx.$('#trKod').addEventListener('input', upd); upd();
            },
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Transfer Et', cls: 'btn-primary', onClick: (ctx) => {
                    const k = ctx.$('#trKod').value.trim(), from = ctx.$('#trFrom').value, to = ctx.$('#trTo').value;
                    const qty = U.toNum(ctx.$('#trQty').value, NaN);
                    if (!M.rawItem(k)) { UI.toast('Geçersiz malzeme', '', 'warn'); return false; }
                    if (from === to) { UI.toast('Çıkış ve varış aynı', '', 'warn'); return false; }
                    if (!(qty > 0)) { UI.toast('Geçersiz miktar', '', 'warn'); return false; }
                    if (qty > M.onHand(k, from) + 1e-9) { UI.toast('Yetersiz stok', `${locName(from)}: ${U.qty(M.onHand(k, from))}`, 'warn'); return false; }
                    M.move({ kod: k, qty, type: 'TRF', loc: from, toLoc: to, ref: 'TRANSFER', note: ctx.$('#trNote').value.trim() });
                    MRP.store.audit('Stok transferi', `${k}: ${U.qty(qty)} ${from} → ${to}`);
                    app().commit();
                    UI.toast('Transfer yapıldı', `${k} · ${U.qty(qty)} → ${locName(to)}`, 'success');
                }
            }]
        });
    }

    // ---------------- Fason sevk / dönüş ----------------
    function renderFason() {
        const list = S().subcontracts.slice().reverse();
        const today = U.iso(U.today());
        return `<div class="toolbar"><span class="spacer"></span>${MRP.auth.can('adjustStock') ? `<button class="btn btn-primary" data-act="fasonNew">${MRP.icon('truck')} Fasona Sevk</button>` : ''}</div>
            <section class="card"><div class="table-wrap"><table><thead><tr><th>Sevk No</th><th>Fasoncu</th><th>Sevk</th><th>Beklenen dönüş</th><th class="num">Kalem</th><th>Dönüş</th><th>Durum</th><th></th></tr></thead><tbody>
            ${list.map((x) => {
                const sent = U.sum(x.lines, (l) => l.qty), back = U.sum(x.lines, (l) => l.returned || 0);
                const late = x.status === 'open' && x.expectedAt < today;
                return `<tr class="${late ? 'r-warn' : ''}"><td class="mono">${esc(x.no)}</td><td class="strong">${esc(x.supplierName)}</td><td>${esc(U.date(x.sentAt))}</td>
                    <td>${esc(U.date(U.parseDate(x.expectedAt)))} ${late ? '<span class="badge badge-red">Gecikti</span>' : ''}</td><td class="num">${x.lines.length}</td>
                    <td><span class="bar"><span style="width:${sent ? back / sent * 100 : 0}%;background:var(--green);"></span></span> <span class="muted">%${U.num(sent ? back / sent * 100 : 0, 0)}</span></td>
                    <td>${x.status === 'open' ? '<span class="badge badge-amber">Fasonda</span>' : '<span class="badge badge-green">Döndü</span>'}</td>
                    <td><div class="row-actions">${x.status === 'open' && MRP.auth.can('adjustStock') ? `<button class="btn btn-success btn-sm" data-act="fasonReturn" data-id="${esc(x.no)}">Dönüş Al</button>` : ''}
                        <button class="btn btn-ghost btn-sm" data-act="fasonDetail" data-id="${esc(x.no)}">Detay</button></div></td></tr>`;
            }).join('') || `<tr><td colspan="8">${H.empty('Fason sevki yok', 'Boya, polisaj vb. için fasoncuya giden malzemeleri buradan takip edin.')}</td></tr>`}
            </tbody></table></div></section>`;
    }

    function fasonNew() {
        if (!H.guard('adjustStock')) return;
        const subs = S().suppliers.filter((s) => s.aktif && s.kategoriler.includes('Fason İşçilik'));
        if (!subs.length) return UI.toast('Fasoncu tanımlı değil', '"Fason İşçilik" kategorili aktif tedarikçi ekleyin.', 'warn');
        const items = M.items().filter((i) => i.procurement !== 'service' && M.available(i.kod) > 0);
        const ctx = UI.modal({
            title: 'Fasona Sevk', size: 'lg',
            body: `<datalist id="fsItems">${items.map((i) => `<option value="${esc(i.kod)}">${esc(i.ad)}</option>`).join('')}</datalist>
                <div class="form-grid">
                    <div class="field"><label>Fasoncu <span class="req">*</span></label><select id="fsSup">${subs.map((s) => `<option value="${esc(s.id)}">${esc(s.ad)}</option>`).join('')}</select></div>
                    <div class="field"><label>Beklenen dönüş</label><input id="fsDate" type="date" value="${U.iso(U.addDays(U.today(), 5))}"></div>
                    <div class="field full"><label>İşlem / not</label><input id="fsNote" placeholder="Elektrostatik boya, polisaj…"></div>
                </div>
                <div class="table-wrap" style="margin-top:14px;"><table><thead><tr><th>Malzeme</th><th class="num">Kullanılabilir</th><th class="num">Sevk miktarı</th><th></th></tr></thead><tbody id="fsRows"></tbody></table></div>
                <button class="btn btn-secondary btn-sm" id="fsAdd" type="button" style="margin-top:8px;">${MRP.icon('plus', 'sm')} Satır ekle</button>`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Sevk Et', cls: 'btn-primary', onClick: (c) => {
                    const lines = [];
                    for (const tr of c.$$('#fsRows tr')) {
                        const kod = tr.querySelector('.fs-kod').value.trim(), qty = U.toNum(tr.querySelector('.fs-qty').value, 0);
                        if (!kod && !qty) continue;
                        const it = M.rawItem(kod);
                        if (!it) { UI.toast('Geçersiz malzeme', kod, 'warn'); return false; }
                        if (!(qty > 0) || qty > M.available(kod) + 1e-9) { UI.toast('Geçersiz/yetersiz miktar', `${kod}: kullanılabilir ${U.qty(M.available(kod))}`, 'warn'); return false; }
                        lines.push({ kod, ad: it.ad, unit: it.unit, qty, returned: 0 });
                    }
                    if (!lines.length) { UI.toast('Satır ekleyin', '', 'warn'); return false; }
                    const sup = S().suppliers.find((s) => s.id === c.$('#fsSup').value);
                    const x = { no: MRP.store.nextNo('FSV'), supplierId: sup.id, supplierName: sup.ad, sentAt: new Date().toISOString(), expectedAt: c.$('#fsDate').value || U.iso(U.addDays(U.today(), 5)),
                        note: c.$('#fsNote').value.trim(), status: 'open', lines, by: MRP.auth.current().name };
                    lines.forEach((l) => M.move({ kod: l.kod, qty: l.qty, type: 'TRF', loc: ['MERKEZ', 'FABRIKA'], toLoc: 'FASON', ref: x.no, note: `Fasona sevk: ${sup.ad}` }));
                    S().subcontracts.push(x);
                    MRP.store.audit('Fasona sevk', `${x.no} · ${sup.ad} · ${lines.length} kalem`);
                    app().commit();
                    UI.toast('Fasona sevk edildi', `${x.no} · ${sup.ad}`, 'success');
                }
            }]
        });
        const add = () => ctx.$('#fsRows').insertAdjacentHTML('beforeend', `<tr><td><input class="input input-sm fs-kod" list="fsItems" autocomplete="off" placeholder="YM.059"></td><td class="num fs-av muted">–</td>
            <td class="num"><input class="input input-sm fs-qty" type="number" min="0" step="any" style="width:110px;text-align:right;"></td><td><button class="btn btn-ghost btn-sm fs-del" type="button">${MRP.icon('x', 'sm')}</button></td></tr>`);
        ctx.$('#fsAdd').addEventListener('click', add);
        ctx.$('#fsRows').addEventListener('input', (e) => { if (e.target.classList.contains('fs-kod')) { const it = M.rawItem(e.target.value.trim()); e.target.closest('tr').querySelector('.fs-av').textContent = it ? U.qty(M.available(it.kod), it.unit) : '–'; } });
        ctx.$('#fsRows').addEventListener('click', (e) => { if (e.target.closest('.fs-del')) e.target.closest('tr').remove(); });
        add();
    }

    function fasonReturn(no) {
        if (!H.guard('adjustStock')) return;
        const x = S().subcontracts.find((s) => s.no === no);
        UI.modal({
            title: `Fasondan Dönüş — ${x.no}`, size: 'lg',
            body: `${H.banner('blue', 'truck', x.supplierName, `Sevk: ${U.date(x.sentAt)} · ${x.note || ''}`)}
                <div class="form-grid"><div class="field"><label>Giriş lokasyonu</label><select id="frLoc"><option value="FABRIKA">Fabrika / Üretim Hattı</option><option value="MERKEZ">Merkez Depo</option></select></div>
                    <div class="field"><label>İrsaliye no</label><input id="frWb"></div></div>
                <div class="table-wrap" style="margin-top:14px;"><table><thead><tr><th>Malzeme</th><th class="num">Sevk</th><th class="num">Dönen</th><th class="num">Bu dönüş</th></tr></thead><tbody>
                ${x.lines.map((l, i) => { const rem = Math.max(0, l.qty - (l.returned || 0)); return `<tr><td>${esc(l.kod)} ${esc(l.ad)}</td><td class="num">${esc(U.qty(l.qty, l.unit))}</td><td class="num">${esc(U.qty(l.returned || 0, l.unit))}</td>
                    <td class="num"><input class="input input-sm fr-qty" data-i="${i}" type="number" min="0" step="any" value="${U.round(Math.min(rem, M.onHand(l.kod, 'FASON')), 4)}" style="width:110px;text-align:right;"></td></tr>`; }).join('')}
                </tbody></table></div>`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Dönüşü Kaydet', cls: 'btn-success', onClick: (ctx) => {
                    const loc = ctx.$('#frLoc').value;
                    const ret = ctx.$$('.fr-qty').map((inp) => ({ l: x.lines[+inp.dataset.i], q: U.toNum(inp.value, 0) })).filter((r) => r.q > 0);
                    if (!ret.length) { UI.toast('Miktar girin', '', 'warn'); return false; }
                    for (const r of ret) if (r.q > M.onHand(r.l.kod, 'FASON') + 1e-9) { UI.toast('Fasonda yeterli stok yok', r.l.kod, 'warn'); return false; }
                    ret.forEach((r) => { M.move({ kod: r.l.kod, qty: r.q, type: 'TRF', loc: 'FASON', toLoc: loc, ref: x.no, note: `Fasondan dönüş${ctx.$('#frWb').value ? ' · İrs. ' + ctx.$('#frWb').value : ''}` }); r.l.returned = U.round((r.l.returned || 0) + r.q, 4); });
                    if (x.lines.every((l) => (l.returned || 0) >= l.qty - 1e-9)) { x.status = 'closed'; x.closedAt = new Date().toISOString(); }
                    MRP.store.audit('Fasondan dönüş', `${x.no}: ${ret.length} kalem${x.status === 'closed' ? ' (kapandı)' : ''}`);
                    app().commit();
                    UI.toast('Dönüş kaydedildi', x.status === 'closed' ? 'Sevk kapandı.' : 'Kısmi dönüş.', 'success');
                }
            }]
        });
    }

    function fasonDetail(no) {
        const x = S().subcontracts.find((s) => s.no === no);
        const moves = S().movements.filter((m) => m.ref === no);
        UI.modal({
            title: `${x.no} — ${x.supplierName}`, size: 'lg',
            body: `<dl class="dl card card-body" style="margin-bottom:14px;"><dt>Sevk</dt><dd>${esc(U.dateTime(x.sentAt))} · ${esc(x.by || '')}</dd><dt>Beklenen dönüş</dt><dd>${esc(U.date(U.parseDate(x.expectedAt)))}</dd><dt>Not</dt><dd>${esc(x.note || '–')}</dd></dl>
                <div class="table-wrap" style="margin-bottom:14px;"><table><thead><tr><th>Malzeme</th><th class="num">Sevk</th><th class="num">Dönen</th><th class="num">Fasonda</th></tr></thead><tbody>
                ${x.lines.map((l) => `<tr><td>${H.itemLink(l.kod)} ${esc(l.ad)}</td><td class="num">${esc(U.qty(l.qty, l.unit))}</td><td class="num">${esc(U.qty(l.returned || 0, l.unit))}</td><td class="num">${esc(U.qty(Math.max(0, l.qty - (l.returned || 0)), l.unit))}</td></tr>`).join('')}</tbody></table></div>
                <h3 style="font-size:.9em;margin-bottom:8px;">Hareketler ve lotlar</h3>
                <div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Kod</th><th>Yön</th><th class="num">Miktar</th><th>Lotlar</th></tr></thead><tbody>
                ${moves.map((m) => `<tr><td>${esc(U.dateTime(m.at))}</td><td class="mono">${esc(m.kod)}</td><td>${esc(m.loc)} → ${esc(m.toLoc)}</td><td class="num">${esc(U.qty(m.qty))}</td><td class="mono" style="font-size:.85em;">${esc((m.lots || []).map((l) => `${l.lot} (${U.qty(Math.abs(l.qty))})`).join(', '))}</td></tr>`).join('')}</tbody></table></div>`,
            buttons: [{ label: 'Kapat' }]
        });
    }

    // ---------------- Lot izlenebilirliği ----------------
    function renderLots() {
        const q = stockState.lotQ.trim().toLocaleLowerCase('tr');
        let html = `<div class="toolbar"><input class="input" id="lotSearch" placeholder="Lot no, malzeme kodu veya tedarikçi…" value="${esc(stockState.lotQ)}" data-input="lotSearch"></div>`;
        const lots = S().lots.filter((l) => !q || l.lot.toLocaleLowerCase('tr').includes(q) || l.kod.toLocaleLowerCase('tr').includes(q) || (l.supplier || '').toLocaleLowerCase('tr').includes(q))
            .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 400);
        html += `<section class="card"><div class="table-wrap"><table><thead><tr><th>Lot</th><th>Kod</th><th>Malzeme</th><th>Lokasyon</th><th>Giriş</th><th>Tedarikçi / kaynak</th><th class="num">Kalan</th></tr></thead><tbody>
            ${lots.map((l) => { const it = M.item(l.kod) || { ad: '?', unit: '' }; return `<tr><td><button class="link mono" data-act="lotTrace" data-id="${esc(l.lot)}">${esc(l.lot)}</button></td><td>${H.anyLink(l.kod)}</td><td>${esc(it.ad)}</td>
                <td>${esc(locName(l.loc))}</td><td>${esc(U.date(l.at))}</td><td>${esc([l.supplier, l.ref].filter(Boolean).join(' · '))}</td><td class="num">${esc(U.qty(l.qty, it.unit))}</td></tr>`; }).join('')
                || `<tr><td colspan="7">${H.empty('Lot bulunamadı')}</td></tr>`}</tbody></table></div></section>
            <p class="muted" style="font-size:.78em;margin-top:10px;">Lot numarasına tıklayarak geriye (hangi tedarikçi/sipariş) ve ileriye (hangi iş emri ve mamul) izleme yapabilirsiniz.</p>`;
        return html;
    }

    function lotTrace(lot) {
        const moves = S().movements.filter((m) => (m.lots || []).some((l) => l.lot === lot)).sort((a, b) => a.at.localeCompare(b.at));
        const remaining = S().lots.filter((l) => l.lot === lot);
        const wos = [...new Set(moves.filter((m) => m.type === 'GI').map((m) => m.ref))];
        const products = wos.map((no) => S().workOrders.find((w) => w.no === no)).filter(Boolean);
        UI.modal({
            title: `Lot İzleme — ${lot}`, size: 'lg',
            body: `<div class="grid grid-2" style="margin-bottom:14px;">
                <dl class="dl card card-body"><dt>Kalan</dt><dd>${remaining.map((l) => `${esc(l.kod)} ${esc(U.qty(l.qty))} @ ${esc(locName(l.loc))}`).join('<br>') || '–'}</dd>
                    <dt>Kaynak</dt><dd>${esc([...new Set(remaining.concat(moves.filter((m) => m.qty > 0 && m.type !== 'TRF')).map((x) => x.supplier || x.ref).filter(Boolean))].join(', ') || '–')}</dd></dl>
                <dl class="dl card card-body"><dt>Kullanıldığı iş emirleri</dt><dd>${products.map((w) => `${esc(w.no)} → ${esc(w.kod)} × ${esc(U.qty(w.qty, 'ad'))}`).join('<br>') || '–'}</dd></dl></div>
                <div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Tür</th><th>Kod</th><th>Lokasyon</th><th>Belge</th><th class="num">Lot miktarı</th></tr></thead><tbody>
                ${moves.map((m) => { const lq = U.sum(m.lots.filter((l) => l.lot === lot), (l) => l.qty); return `<tr><td class="nowrap">${esc(U.dateTime(m.at))}</td><td><span class="badge ${M.MOVE_TYPES[m.type].badge}">${esc(M.MOVE_TYPES[m.type].label)}</span></td>
                    <td class="mono">${esc(m.kod)}</td><td>${esc(m.loc)}${m.toLoc ? ' → ' + esc(m.toLoc) : ''}</td><td class="mono">${esc(m.ref)}</td><td class="num ${m.type === 'TRF' ? '' : lq < 0 ? 'tp-neg' : 'tp-pos'}">${esc(U.qty(lq))}</td></tr>`; }).join('')
                    || '<tr><td colspan="6" class="muted">Bu lot için hareket yok (başlangıç/devir stoğu).</td></tr>'}</tbody></table></div>`,
            buttons: [{ label: 'Kapat' }]
        });
    }

    // ---------------- Barkod / hızlı arama ----------------
    function scanOpen() {
        let stream = null, timer = null;
        const hasCam = 'BarcodeDetector' in window && navigator.mediaDevices;
        const ctx = UI.modal({
            title: 'Barkod Okut / Hızlı Arama', size: 'md',
            body: `<div class="field"><label>Kod (el terminali veya klavye ile okutun, Enter)</label><input id="scIn" autocomplete="off" placeholder="HM.044 · PO-2026-0001 · IE-… · LOT-…"></div>
                ${hasCam ? `<button class="btn btn-secondary btn-sm" id="scCam" type="button" style="margin-top:10px;">Kamera ile okut</button><video id="scVid" playsinline muted style="width:100%;margin-top:10px;border-radius:8px;display:none;"></video>` : '<p class="muted" style="font-size:.78em;margin-top:8px;">Bu tarayıcıda kamera ile barkod okuma desteklenmiyor; USB/Bluetooth barkod okuyucu klavye gibi çalışır.</p>'}
                <div id="scOut" style="margin-top:14px;"></div>`,
            onClose: () => { if (timer) clearInterval(timer); if (stream) stream.getTracks().forEach((t) => t.stop()); },
            buttons: [{ label: 'Kapat' }]
        });
        const show = (code) => {
            code = String(code).trim().toUpperCase();
            const out = ctx.$('#scOut');
            const it = M.item(code);
            const po = S().pos.find((p) => p.no === code), wo = S().workOrders.find((w) => w.no === code);
            const lot = S().lots.find((l) => l.lot.toUpperCase() === code) || S().movements.find((m) => (m.lots || []).some((l) => l.lot.toUpperCase() === code));
            const act = (a, id, label, cls = 'btn-secondary') => `<button class="btn ${cls} btn-sm" data-act="${a}" data-id="${esc(id)}">${esc(label)}</button>`;
            if (it) {
                out.innerHTML = `<div class="card card-body"><b class="mono">${esc(it.kod)}</b> — ${esc(it.ad)}<div class="muted" style="font-size:.85em;margin:6px 0 10px;">Stok: ${LOCS().map((l) => `${esc(locName(l))} ${esc(U.qty(M.onHand(it.kod, l), it.unit))}`).join(' · ')}</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">${act(it.isProduct ? 'productDetail' : 'itemDetail', it.kod, 'Detay')}${MRP.auth.can('adjustStock') && it.procurement !== 'service' ? act('stockAdjust', it.kod, 'Sayım') + act('stockTransfer', it.kod, 'Transfer') : ''}</div></div>`;
            } else if (po) {
                out.innerHTML = `<div class="card card-body"><b class="mono">${esc(po.no)}</b> — ${esc(po.supplierName)} ${H.badge(H.PO_STATUS, po.status)}<div style="display:flex;gap:6px;margin-top:10px;">${act('poDetail', po.no, 'Detay')}${(po.status === 'open' || po.status === 'partial') && MRP.auth.can('receiveGoods') ? act('poReceive', po.no, 'Mal Kabul', 'btn-success') : ''}</div></div>`;
            } else if (wo) {
                out.innerHTML = `<div class="card card-body"><b class="mono">${esc(wo.no)}</b> — ${esc(wo.ad)} × ${esc(U.qty(wo.qty, 'ad'))} ${H.badge(H.WO_STATUS, wo.status)}<div style="margin-top:10px;">${act('woDetail', wo.no, 'Detay')}</div></div>`;
            } else if (lot) {
                const l = lot.lot ? lot.lot : lot.lots.find((x) => x.lot.toUpperCase() === code).lot;
                out.innerHTML = `<div class="card card-body">Lot <b class="mono">${esc(l)}</b><div style="margin-top:10px;">${act('lotTrace', l, 'Lot izleme')}</div></div>`;
            } else out.innerHTML = H.empty('Kayıt bulunamadı', code);
        };
        ctx.$('#scIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') { show(e.target.value); e.target.select(); } });
        if (hasCam) ctx.$('#scCam').addEventListener('click', async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                const v = ctx.$('#scVid'); v.srcObject = stream; v.style.display = 'block'; await v.play();
                const det = new window.BarcodeDetector();
                timer = setInterval(async () => {
                    try {
                        const r = await det.detect(v);
                        if (r.length) { ctx.$('#scIn').value = r[0].rawValue; show(r[0].rawValue); clearInterval(timer); timer = null; stream.getTracks().forEach((t) => t.stop()); v.style.display = 'none'; }
                    } catch (e) { /* kare atla */ }
                }, 400);
            } catch (e) { UI.toast('Kamera açılamadı', 'İzin verilmedi veya kamera yok.', 'error'); }
        });
    }

    const rerender = U.debounce(() => app().render(), 250);
    Object.assign(MRP.actions, {
        stockTab: (t) => { stockState.tab = t; app().render(); },
        stockSearch: (v) => { stockState.q = v; rerender(); },
        lotSearch: (v) => { stockState.lotQ = v; rerender(); },
        stockAdjust: (kod) => adjust(kod),
        stockTransfer: (kod) => transfer(kod),
        fasonNew, fasonReturn: (no) => fasonReturn(no), fasonDetail: (no) => fasonDetail(no),
        lotTrace: (lot) => lotTrace(lot),
        scanOpen
    });

    // =====================================================================
    // STOK HAREKETLERİ
    // =====================================================================
    const mvState = { type: 'all', q: '', page: 1, size: 100 };

    MRP.views.movements = {
        title: 'Stok Hareketleri',
        subtitle: 'Mal kabul, üretime sarf, üretimden giriş, transfer ve sayım düzeltmeleri',
        render() {
            const q = mvState.q.toLocaleLowerCase('tr');
            let list = S().movements.slice().reverse();
            if (mvState.type !== 'all') list = list.filter((m) => m.type === mvState.type);
            if (q) list = list.filter((m) => m.kod.toLocaleLowerCase('tr').includes(q) || (m.ref || '').toLocaleLowerCase('tr').includes(q)
                || ((M.item(m.kod) || {}).ad || '').toLocaleLowerCase('tr').includes(q) || (m.lots || []).some((l) => l.lot.toLocaleLowerCase('tr').includes(q)));
            const pages = Math.max(1, Math.ceil(list.length / mvState.size));
            mvState.page = Math.min(mvState.page, pages);
            const page = list.slice((mvState.page - 1) * mvState.size, mvState.page * mvState.size);
            return `<div class="toolbar">
                    <select class="input" data-change="mvType"><option value="all">Tüm hareketler</option>${Object.entries(M.MOVE_TYPES).map(([k, v]) => `<option value="${k}" ${mvState.type === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>
                    <input class="input" id="mvSearch" placeholder="Kod, ad, belge veya lot no…" value="${esc(mvState.q)}" data-input="mvSearch">
                </div>
                <section class="card"><div class="table-wrap"><table>
                    <thead><tr><th>Hareket No</th><th>Tarih</th><th>Kod</th><th>Kalem</th><th>Tür</th><th>Lokasyon</th><th class="num">Miktar</th><th class="num">Bakiye</th><th class="num">Değer ₺</th><th>Lot</th><th>Belge</th><th>Kullanıcı</th><th>Açıklama</th></tr></thead>
                    <tbody>${page.map((m) => {
                        const it = M.item(m.kod) || { ad: '?', unit: '' };
                        return `<tr><td class="mono">${esc(m.id)}</td><td class="nowrap">${esc(U.dateTime(m.at))}</td><td>${H.anyLink(m.kod)}</td><td>${esc(it.ad)}</td>
                            <td><span class="badge ${M.MOVE_TYPES[m.type].badge}">${esc(M.MOVE_TYPES[m.type].label)}</span></td>
                            <td class="nowrap">${esc(m.loc || '')}${m.toLoc ? ' → ' + esc(m.toLoc) : ''}</td>
                            <td class="num ${m.type === 'TRF' ? '' : m.qty < 0 ? 'tp-neg' : 'tp-pos'}">${m.qty > 0 && m.type !== 'TRF' ? '+' : ''}${esc(U.qty(m.qty, it.unit))}</td>
                            <td class="num">${esc(U.qty(m.balance))}</td><td class="num">${U.num(m.value)}</td>
                            <td style="font-size:.85em;">${(m.lots || []).slice(0, 3).map((l) => `<button class="link mono" data-act="lotTrace" data-id="${esc(l.lot)}">${esc(l.lot)}</button>`).join(', ')}${(m.lots || []).length > 3 ? '…' : ''}</td>
                            <td class="mono">${esc(m.ref)}</td><td>${esc(m.user)}</td><td class="muted">${esc(m.note)}</td></tr>`;
                    }).join('') || `<tr><td colspan="13">${H.empty('Hareket bulunamadı')}</td></tr>`}</tbody>
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
