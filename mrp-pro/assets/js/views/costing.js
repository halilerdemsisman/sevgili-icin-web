/* ==========================================================================
   MRP Pro — Maliyet & Kur: döviz kurları (canlı/elle), kur etkisi,
   malzeme fiyatlarının düzenlenmesi, toplu fiyat güncelleme, maliyet ayarları
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model, D = MRP.data;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;
    const FOREIGN = Object.keys(D.CURRENCIES).filter((c) => c !== 'TRY');

    // =====================================================================
    // Canlı kur
    // =====================================================================
    /**
     * Güncel kurları çeker (1 birim döviz = x TL). CORS destekleyen iki kaynak sırayla denenir.
     * Not: TCMB'nin today.xml servisi tarayıcıdan doğrudan erişime (CORS) izin vermez.
     */
    async function fetchRates() {
        const sources = [
            {
                name: 'Frankfurter (ECB referans kurları)',
                url: `https://api.frankfurter.app/latest?from=TRY&to=${FOREIGN.join(',')}`,
                parse: (j) => ({ rates: j.rates, date: j.date })
            },
            {
                name: 'ExchangeRate-API (open.er-api.com)',
                url: 'https://open.er-api.com/v6/latest/TRY',
                parse: (j) => ({ rates: j.rates, date: (j.time_last_update_utc || '').slice(5, 16) })
            }
        ];
        const errors = [];
        for (const src of sources) {
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 8000);
                const res = await fetch(src.url, { signal: ctrl.signal });
                clearTimeout(t);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const { rates, date } = src.parse(await res.json());
                const out = {};
                FOREIGN.forEach((c) => { if (rates && rates[c] > 0) out[c] = U.round(1 / rates[c], 4); });
                if (!Object.keys(out).length) throw new Error('kur bulunamadı');
                return { rates: out, source: src.name, date };
            } catch (e) { errors.push(`${src.name}: ${e.message}`); }
        }
        throw new Error(errors.join(' · '));
    }

    /** Yeni kurların ana ürünlerin birim maliyetine etkisi (kalıcı değişiklik yapmadan) */
    function impact(newRates) {
        const products = M.products().filter((p) => !p.synthetic);
        const before = new Map(products.map((p) => [p.kod, M.unitCost(p.kod)]));
        const old = { ...S().fx.rates };
        S().fx.rates = { ...old, ...newRates };
        M.invalidate();
        const rows = products.map((p) => ({ p, before: before.get(p.kod), after: M.unitCost(p.kod) }));
        const stockAfter = M.stockValue();
        S().fx.rates = old;
        M.invalidate();
        const stockBefore = M.stockValue();
        rows.forEach((r) => { r.diff = r.after - r.before; r.pct = r.before ? r.diff / r.before * 100 : 0; });
        rows.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
        return { rows, stockBefore, stockAfter, avgPct: U.sum(rows, (r) => r.pct) / (rows.length || 1) };
    }

    function confirmRates(newRates, source, date) {
        const imp = impact(newRates);
        const cur = S().fx.rates;
        UI.modal({
            title: 'Kur güncellemesi — maliyet etkisi', size: 'lg',
            body: `<div class="table-wrap" style="margin-bottom:14px;"><table><thead><tr><th>Döviz</th><th class="num">Mevcut</th><th class="num">Yeni</th><th class="num">Değişim</th></tr></thead><tbody>
                ${FOREIGN.map((c) => { const a = cur[c], b = newRates[c] ?? a; const d = a ? (b - a) / a * 100 : 0; return `<tr><td class="strong">${c} ${esc(D.CURRENCIES[c].name)}</td><td class="num">${U.num(a, 4)}</td><td class="num strong">${U.num(b, 4)}</td>
                    <td class="num ${d > 0 ? 'tp-neg' : d < 0 ? 'tp-pos' : ''}">${d > 0 ? '+' : ''}${U.num(d, 2)}%</td></tr>`; }).join('')}</tbody></table></div>
                <dl class="dl card card-body" style="margin-bottom:14px;"><dt>Kaynak</dt><dd>${esc(source)}${date ? ` · ${esc(date)}` : ''}</dd>
                    <dt>Stok değeri</dt><dd>${U.cur(imp.stockBefore)} → ${U.cur(imp.stockAfter)}</dd>
                    <dt>Ana ürünlerde ort. maliyet değişimi</dt><dd>${imp.avgPct > 0 ? '+' : ''}${U.num(imp.avgPct, 2)}%</dd></dl>
                <h3 style="font-size:.9em;margin-bottom:8px;">En çok etkilenen ürünler</h3>
                <div class="table-wrap" style="max-height:280px;"><table><thead><tr><th>Kod</th><th>Ürün</th><th class="num">Önce</th><th class="num">Sonra</th><th class="num">Fark</th></tr></thead><tbody>
                ${imp.rows.slice(0, 15).map((r) => `<tr><td class="mono">${esc(r.p.kod)}</td><td>${esc(r.p.ad)}</td><td class="num">${U.num(r.before)}</td><td class="num">${U.num(r.after)}</td>
                    <td class="num ${r.diff > 0 ? 'tp-neg' : r.diff < 0 ? 'tp-pos' : ''}">${r.diff > 0 ? '+' : ''}${U.num(r.pct, 2)}%</td></tr>`).join('')}</tbody></table></div>`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kurları Uygula', cls: 'btn-primary', icon: 'check', onClick: () => {
                    const fx = S().fx;
                    fx.rates = { ...fx.rates, ...newRates };
                    fx.updatedAt = new Date().toISOString();
                    fx.source = source;
                    fx.history.push({ at: fx.updatedAt, rates: { ...fx.rates }, source, by: MRP.auth.current().name });
                    MRP.store.audit('Döviz kurları güncellendi', `${FOREIGN.map((c) => `${c} ${fx.rates[c]}`).join(', ')} (${source})`);
                    app().commit();
                    UI.toast('Kurlar güncellendi', 'Tüm maliyetler yeni kurla hesaplanıyor.', 'success');
                }
            }]
        });
    }

    // =====================================================================
    // Görünüm
    // =====================================================================
    const cState = { type: 'all', cur: 'all', q: '', dirty: {} };

    MRP.views.costing = {
        title: 'Maliyet & Kur',
        subtitle: 'Döviz kurları, malzeme fiyatları ve maliyet parametreleri',
        render() {
            const fx = S().fx;
            const canEdit = MRP.auth.can('editCost');
            const items = M.items().filter((i) => i.procurement !== 'make');
            const stockByCur = {};
            items.forEach((i) => { const q = M.onHand(i.kod); if (q > 0) stockByCur[i.currency] = (stockByCur[i.currency] || 0) + q * M.priceTRY(i.kod); });
            const totalStock = U.sum(Object.values(stockByCur));
            const foreignShare = totalStock ? (totalStock - (stockByCur.TRY || 0)) / totalStock : 0;
            const age = fx.updatedAt ? Math.floor((Date.now() - new Date(fx.updatedAt)) / 86400000) : null;

            let html = '';
            if (age === null) html += H.banner('amber', 'alert', 'Kurlar varsayılan (demo) değerlerde', 'Maliyetlerin doğru hesaplanması için güncel kuru çekin veya elle girin.',
                canEdit ? `<button class="btn btn-primary btn-sm" data-act="fxFetch">${MRP.icon('refresh', 'sm')} Güncel kuru çek</button>` : '');
            else if (age >= 1) html += H.banner('blue', 'info', `Kurlar ${age} gün önce güncellendi`, `${fx.source} · ${U.dateTime(fx.updatedAt)}`,
                canEdit ? `<button class="btn btn-secondary btn-sm" data-act="fxFetch">${MRP.icon('refresh', 'sm')} Güncelle</button>` : '');

            html += `<div class="kpis">
                ${FOREIGN.map((c) => H.kpi(`${c}/TRY`, U.num(fx.rates[c], 4), fx.updatedAt ? U.date(fx.updatedAt) : 'Varsayılan', c === 'USD' ? 'green' : c === 'EUR' ? 'blue' : 'cyan')).join('')}
                ${H.kpi('Dövizli Stok Payı', `%${U.num(foreignShare * 100, 1)}`, U.compactCur(totalStock - (stockByCur.TRY || 0)), 'violet')}
            </div>`;

            // Kur kartı + maliyet ayarları
            html += `<div class="grid grid-2">
                ${H.card('Döviz kurları', `Kaynak: ${fx.source}`, `<div class="card-body">
                    <div class="form-grid">${FOREIGN.map((c) => `<div class="field"><label>1 ${c} (${esc(D.CURRENCIES[c].name)}) = ₺</label>
                        <input type="number" min="0" step="0.0001" id="fx_${c}" value="${fx.rates[c]}" ${canEdit ? '' : 'readonly'}></div>`).join('')}</div>
                    ${canEdit ? `<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
                        <button class="btn btn-primary" data-act="fxFetch">${MRP.icon('refresh')} Güncel kuru çek</button>
                        <button class="btn btn-secondary" data-act="fxManual">Elle girilen kurları uygula</button></div>
                        <p class="muted" style="font-size:.76em;margin-top:10px;">Canlı kur, ECB referans kurlarından (Frankfurter) alınır; erişilemezse ExchangeRate-API denenir. Resmî muhasebe için TCMB döviz satış kurunu elle girebilirsiniz.</p>` : ''}
                </div>`)}
                ${H.card('Maliyet parametreleri', 'Standart maliyet = (malzeme + işçilik) × (1 + genel gider)', `<div class="card-body">
                    <div class="form-grid">
                        <div class="field"><label>Genel gider oranı (%)</label><input type="number" min="0" max="200" step="0.5" id="cOverhead" value="${S().costing.overheadPct}" ${canEdit ? '' : 'readonly'}></div>
                        <div class="field"><label>Standart parti (adet)</label><input type="number" min="1" step="1" id="cStdLot" value="${S().costing.stdLot}" ${canEdit ? '' : 'readonly'}><span class="hint">Hazırlık süreleri bu partiye yayılır.</span></div>
                        <div class="field full"><label class="check-chip" style="text-transform:none;letter-spacing:0;font-size:.95em;justify-content:flex-start;color:var(--text);font-weight:500;"><input type="checkbox" id="cLabor" ${S().costing.includeLabor ? 'checked' : ''} ${canEdit ? '' : 'disabled'}> İşçilik maliyetini dahil et (rota × iş merkezi saat ücreti)</label></div>
                    </div>
                    ${canEdit ? `<button class="btn btn-primary" data-act="costingSave" style="margin-top:12px;">Parametreleri kaydet</button>` : ''}
                    <p class="muted" style="font-size:.76em;margin-top:10px;">İş merkezi saat ücretleri <a href="#/capacity">Kapasite Planlama</a> ekranından düzenlenir.</p>
                </div>`)}
            </div><div style="height:16px;"></div>`;

            // Fiyat tablosu (satır içi düzenleme)
            const types = [...new Set(items.map((i) => i.tur))].sort();
            const q = cState.q.toLocaleLowerCase('tr');
            const list = items.filter((i) => (cState.type === 'all' || i.tur === cState.type) && (cState.cur === 'all' || i.currency === cState.cur)
                && (!q || i.kod.toLocaleLowerCase('tr').includes(q) || i.ad.toLocaleLowerCase('tr').includes(q)));
            const nDirty = Object.keys(cState.dirty).length;
            html += H.card('Malzeme fiyatları', canEdit ? 'Fiyat ve para birimini doğrudan tabloda değiştirip kaydedin' : '', `
                <div class="card-body" style="padding-bottom:0;"><div class="toolbar">
                    <select class="input" data-change="cType"><option value="all">Tüm türler</option>${types.map((t) => `<option ${cState.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
                    <select class="input" data-change="cCur"><option value="all">Tüm para birimleri</option>${Object.keys(D.CURRENCIES).map((c) => `<option ${cState.cur === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
                    <input class="input" id="cSearch" placeholder="Kod veya ad…" value="${esc(cState.q)}" data-input="cSearch">
                    <span class="spacer"></span>
                    ${canEdit ? `<button class="btn btn-secondary" data-act="bulkPrice">Toplu fiyat güncelle</button>
                        <button class="btn btn-primary" data-act="priceSave" ${nDirty ? '' : 'disabled'}>${MRP.icon('check')} Değişiklikleri kaydet (${nDirty})</button>` : ''}
                </div></div>
                <div class="table-wrap"><table><thead><tr><th>Kod</th><th>Malzeme</th><th>Tür</th><th class="num">Birim fiyat</th><th>Para birimi</th><th class="num">TL karşılığı</th><th class="num">En iyi teklif</th><th class="num">Son alış</th></tr></thead>
                <tbody>${list.map((i) => {
                    const d = cState.dirty[i.kod] || {};
                    const price = d.price ?? i.price, cur = d.currency ?? i.currency;
                    const best = M.offers(i.kod)[0];
                    const hist = M.priceHistory(i.kod);
                    const last = hist[hist.length - 1];
                    return `<tr class="${cState.dirty[i.kod] ? 'r-warn' : ''}"><td>${H.itemLink(i.kod)}</td><td class="strong">${esc(i.ad)}</td><td><span class="badge badge-gray plain">${esc(i.tur)}</span></td>
                        <td class="num">${canEdit ? `<input class="input input-sm" type="number" min="0" step="any" value="${U.round(price, 4)}" style="width:120px;text-align:right;" data-change="priceEdit" data-id="${esc(i.kod)}"> <span class="muted">/${esc(i.unit)}</span>` : `${U.num(price, 4)} /${esc(i.unit)}`}</td>
                        <td>${canEdit ? `<select class="input input-sm" data-change="curEdit" data-id="${esc(i.kod)}" style="width:80px;">${Object.keys(D.CURRENCIES).map((c) => `<option ${c === cur ? 'selected' : ''}>${c}</option>`).join('')}</select>` : esc(cur)}</td>
                        <td class="num strong">${U.num(price * M.fxRate(cur), 2)}</td>
                        <td class="num">${best ? `${U.num(best.priceTRY, 2)} <span class="muted" title="${esc(best.supplier.ad)}">${esc(best.supplier.id)}</span>` : '<span class="muted">–</span>'}</td>
                        <td class="num">${last ? `${U.num(last.price, 2)} <span class="muted">${esc(U.date(last.at))}</span>` : '<span class="muted">–</span>'}</td></tr>`;
                }).join('') || `<tr><td colspan="8">${H.empty('Kayıt yok')}</td></tr>`}</tbody></table></div>`);

            // Kur geçmişi
            if (fx.history.length) {
                html += '<div style="height:16px;"></div>' + H.card('Kur geçmişi', '', `<div class="table-wrap" style="max-height:260px;"><table><thead><tr><th>Tarih</th>${FOREIGN.map((c) => `<th class="num">${c}</th>`).join('')}<th>Kaynak</th><th>Kullanıcı</th></tr></thead><tbody>
                    ${fx.history.slice().reverse().map((h) => `<tr><td class="nowrap">${esc(U.dateTime(h.at))}</td>${FOREIGN.map((c) => `<td class="num">${U.num(h.rates[c], 4)}</td>`).join('')}<td>${esc(h.source)}</td><td>${esc(h.by)}</td></tr>`).join('')}
                    </tbody></table></div>`);
            }
            return html;
        },
        after() {
            const el = document.getElementById('cSearch');
            if (el && cState.q) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }
    };

    function bulkPrice() {
        if (!H.guard('editCost')) return;
        const items = M.items().filter((i) => i.procurement !== 'make');
        const types = [...new Set(items.map((i) => i.tur))].sort();
        UI.modal({
            title: 'Toplu Fiyat Güncelleme', size: 'md',
            body: `<div class="form-grid">
                <div class="field"><label>Malzeme türü</label><select id="bpType"><option value="all">Tümü</option>${types.map((t) => `<option>${esc(t)}</option>`).join('')}</select></div>
                <div class="field"><label>Para birimi</label><select id="bpCur"><option value="all">Tümü</option>${Object.keys(D.CURRENCIES).map((c) => `<option>${c}</option>`).join('')}</select></div>
                <div class="field"><label>Değişim (%)</label><input id="bpPct" type="number" step="0.1" value="5"><span class="hint">Zam için pozitif, indirim için negatif.</span></div>
                <div class="field"><label>Fiyat listesine de uygula</label><select id="bpList"><option value="1">Evet — tedarikçi teklifleri de güncellensin</option><option value="0">Hayır</option></select></div>
            </div><p id="bpPrev" class="muted" style="margin-top:12px;font-size:.86em;"></p>`,
            onOpen: (ctx) => {
                const upd = () => {
                    const sel = items.filter((i) => (ctx.$('#bpType').value === 'all' || i.tur === ctx.$('#bpType').value) && (ctx.$('#bpCur').value === 'all' || i.currency === ctx.$('#bpCur').value));
                    ctx.$('#bpPrev').textContent = `${sel.length} malzeme etkilenecek.`;
                };
                ['#bpType', '#bpCur'].forEach((s) => ctx.$(s).addEventListener('change', upd)); upd();
            },
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Uygula', cls: 'btn-primary', onClick: (ctx) => {
                    const pct = U.toNum(ctx.$('#bpPct').value);
                    if (!pct || pct <= -100) { UI.toast('Geçersiz oran', '', 'warn'); return false; }
                    const t = ctx.$('#bpType').value, c = ctx.$('#bpCur').value;
                    const sel = items.filter((i) => (t === 'all' || i.tur === t) && (c === 'all' || i.currency === c));
                    const f = 1 + pct / 100;
                    sel.forEach((i) => setPrice(i.kod, { price: U.round(i.price * f, 4) }));
                    if (ctx.$('#bpList').value === '1') {
                        const set = new Set(sel.map((i) => i.kod));
                        S().priceList.forEach((o) => { if (set.has(o.kod)) { o.price = U.round(o.price * f, 4); o.updatedAt = new Date().toISOString(); } });
                    }
                    MRP.store.audit('Toplu fiyat güncelleme', `${sel.length} malzeme, %${pct} (${t === 'all' ? 'tüm türler' : t}, ${c === 'all' ? 'tüm dövizler' : c})`);
                    app().commit();
                    UI.toast('Fiyatlar güncellendi', `${sel.length} malzeme · %${pct}`, 'success');
                }
            }]
        });
    }

    /** Malzeme fiyat/para birimi değişikliği (özel kalemde doğrudan, standart kalemde override) */
    function setPrice(kod, ch) {
        if (S().customItems[kod]) Object.assign(S().customItems[kod], ch);
        else S().itemOverrides[kod] = { ...(S().itemOverrides[kod] || {}), ...ch };
    }
    MRP.costing = { setPrice, fetchRates };

    const rerender = U.debounce(() => app().render(), 250);
    Object.assign(MRP.actions, {
        fxFetch: async (_, el) => {
            if (!H.guard('editCost')) return;
            if (el) el.disabled = true;
            UI.toast('Kurlar alınıyor…', '', 'info', 2000);
            try {
                const r = await fetchRates();
                confirmRates(r.rates, r.source, r.date);
            } catch (e) {
                UI.toast('Güncel kur alınamadı', 'İnternet bağlantısını kontrol edin veya kurları elle girin.', 'error', 6000);
                console.warn(e);
            } finally { if (el) el.disabled = false; }
        },
        fxManual: () => {
            if (!H.guard('editCost')) return;
            const rates = {};
            for (const c of FOREIGN) {
                const v = U.toNum(document.getElementById('fx_' + c).value);
                if (!(v > 0)) return UI.toast('Geçersiz kur', c, 'warn');
                rates[c] = v;
            }
            confirmRates(rates, 'Elle giriş', U.date(new Date()));
        },
        costingSave: () => {
            if (!H.guard('editCost')) return;
            const c = S().costing;
            c.overheadPct = Math.min(200, Math.max(0, U.toNum(document.getElementById('cOverhead').value, 10)));
            c.stdLot = Math.max(1, Math.round(U.toNum(document.getElementById('cStdLot').value, 20)));
            c.includeLabor = document.getElementById('cLabor').checked;
            MRP.store.audit('Maliyet parametreleri güncellendi', `Genel gider %${c.overheadPct}, std. parti ${c.stdLot}, işçilik ${c.includeLabor ? 'dahil' : 'hariç'}`);
            app().commit();
            UI.toast('Parametreler kaydedildi', '', 'success');
        },
        cType: (v) => { cState.type = v; app().render(); },
        cCur: (v) => { cState.cur = v; app().render(); },
        cSearch: (v) => { cState.q = v; rerender(); },
        priceEdit: (v, el) => { const n = U.toNum(v, NaN); if (!(n >= 0)) return UI.toast('Geçersiz fiyat', '', 'warn'); (cState.dirty[el.dataset.id] = cState.dirty[el.dataset.id] || {}).price = n; app().render(); },
        curEdit: (v, el) => { (cState.dirty[el.dataset.id] = cState.dirty[el.dataset.id] || {}).currency = v; app().render(); },
        priceSave: () => {
            if (!H.guard('editCost')) return;
            const entries = Object.entries(cState.dirty);
            entries.forEach(([kod, ch]) => setPrice(kod, ch));
            MRP.store.audit('Malzeme fiyatları güncellendi', entries.map(([k, ch]) => `${k}: ${ch.price ?? ''} ${ch.currency ?? ''}`.trim()).join('; ').slice(0, 500));
            cState.dirty = {};
            app().commit();
            UI.toast('Fiyatlar kaydedildi', `${entries.length} malzeme`, 'success');
        },
        bulkPrice
    });
})(window.MRP);
