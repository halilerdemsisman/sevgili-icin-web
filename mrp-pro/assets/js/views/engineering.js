/* ==========================================================================
   MRP Pro — Mühendislik: Ürün Ağacı (BOM) ve Malzeme Kartları
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model, D = MRP.data;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;

    // =====================================================================
    // ÜRÜN AĞACI
    // =====================================================================
    const bomState = { cat: 'Masalar', q: '', sort: 'kod', page: 1, size: 50, onlyReal: false };

    MRP.views.bom = {
        title: 'Ürün Ağacı',
        subtitle: 'Mamul reçeteleri, çok seviyeli ürün ağacı ve standart maliyet',
        render() {
            const all = M.products();
            const tabs = D.CATEGORIES.map((c) => [c, c, all.filter((p) => p.kategori === c).length]);
            let list = all.filter((p) => p.kategori === bomState.cat && (!bomState.onlyReal || !p.synthetic));
            const q = bomState.q.toLocaleLowerCase('tr');
            if (q) list = list.filter((p) => p.kod.toLocaleLowerCase('tr').includes(q) || p.ad.toLocaleLowerCase('tr').includes(q));
            const sorters = {
                kod: (a, b) => a.kod.localeCompare(b.kod, 'tr'),
                'cost-desc': (a, b) => b.toplam - a.toplam,
                'cost-asc': (a, b) => a.toplam - b.toplam,
                'var-desc': (a, b) => Math.abs(variance(b)) - Math.abs(variance(a))
            };
            list.sort(sorters[bomState.sort]);
            const pages = Math.max(1, Math.ceil(list.length / bomState.size));
            bomState.page = Math.min(bomState.page, pages);
            const pageItems = list.slice((bomState.page - 1) * bomState.size, bomState.page * bomState.size);

            const rows = pageItems.map((p) => {
                const bomCost = M.materialCost(p.kod);
                const v = variance(p);
                return `<tr class="${p.custom ? 'r-new' : ''}">
                    <td>${H.productLink(p.kod)} ${p.custom ? '<span class="badge badge-green plain">ÖZEL</span>' : ''}</td>
                    <td class="strong">${esc(p.ad)}</td>
                    <td class="num">${M.bom(p.kod).length}</td>
                    <td class="num">${U.num(p.toplam)}</td>
                    <td class="num">${U.num(bomCost)}</td>
                    <td class="num ${Math.abs(v) > 25 ? 'tp-neg' : ''}">${p.toplam ? (v > 0 ? '+' : '') + U.num(v, 1) + '%' : '–'}</td>
                    <td class="num strong">${U.num(M.unitCost(p.kod))}</td>
                    <td class="num">${U.qty(M.onHand(p.kod))}</td>
                    <td><div class="row-actions">
                        <button class="btn btn-secondary btn-sm" data-act="productDetail" data-id="${esc(p.kod)}">${MRP.icon('tree', 'sm')} Ağaç</button>
                        ${p.custom && MRP.auth.can('editProduct') ? `<button class="btn btn-ghost btn-sm" data-act="deleteProduct" data-id="${esc(p.kod)}" title="Sil">${MRP.icon('trash', 'sm')}</button>` : ''}
                    </div></td></tr>`;
            }).join('');

            return `
                ${H.tabs(tabs, bomState.cat, 'bomCat')}
                <div class="toolbar">
                    <input class="input" placeholder="Kod veya ad ile ara…" value="${esc(bomState.q)}" data-input="bomSearch" id="bomSearch">
                    <select class="input" data-change="bomSort">
                        ${[['kod', 'Koda göre'], ['cost-desc', 'Maliyet (yüksek → düşük)'], ['cost-asc', 'Maliyet (düşük → yüksek)'], ['var-desc', 'Maliyet farkı (büyük → küçük)']]
                            .map(([v, l]) => `<option value="${v}" ${bomState.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                    <label class="check-chip"><input type="checkbox" data-change="bomReal" ${bomState.onlyReal ? 'checked' : ''}> Yalnızca ana ürünler</label>
                    <span class="spacer"></span>
                    ${MRP.auth.can('editProduct') ? `<button class="btn btn-primary" data-act="addProduct">${MRP.icon('plus')} Yeni Ürün</button>` : ''}
                </div>
                <section class="card">
                    <div class="table-wrap"><table>
                        <thead><tr><th>Mamul Kodu</th><th>Mamul Adı</th><th class="num">Bileşen</th><th class="num">Kayıtlı Maliyet ₺</th>
                            <th class="num">BOM Malzeme ₺</th><th class="num">Fark</th><th class="num">Standart Maliyet ₺</th><th class="num">Stok</th><th></th></tr></thead>
                        <tbody>${rows || `<tr><td colspan="9">${H.empty('Ürün bulunamadı', 'Arama ölçütlerini değiştirin.')}</td></tr>`}</tbody>
                    </table></div>
                    ${H.pager(list.length, bomState.page, bomState.size, 'bomPage')}
                </section>
                <p class="muted" style="font-size:.78em;margin-top:10px;">BOM malzeme maliyeti, malzeme kartlarındaki fiyatlarla (dövizliler güncel kurla) çok seviyeli hesaplanır ve ERP'deki kayıtlı maliyetle karşılaştırılır. Standart maliyet = (malzeme + işçilik) × (1 + genel gider %${S().costing.overheadPct}).</p>`;
        },
        after() {
            const el = document.getElementById('bomSearch');
            if (el && bomState.q) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }
    };

    function variance(p) {
        if (!p.toplam) return 0;
        return (M.materialCost(p.kod) - p.toplam) / p.toplam * 100;
    }

    const rerenderSearch = U.debounce(() => app().render(), 250);
    Object.assign(MRP.actions, {
        bomCat: (c) => { bomState.cat = c; bomState.page = 1; bomState.q = ''; app().render(); },
        bomSearch: (v) => { bomState.q = v; bomState.page = 1; rerenderSearch(); },
        bomSort: (v) => { bomState.sort = v; app().render(); },
        bomReal: (_, el) => { bomState.onlyReal = el.checked; bomState.page = 1; app().render(); },
        bomPage: (p) => { bomState.page = +p; app().render(); },
        productDetail: (kod) => openProduct(kod),
        itemDetail: (kod) => openItem(kod),
        addProduct: () => openAddProduct(),
        deleteProduct: (kod) => deleteProduct(kod),
        editItem: (kod) => openEditItem(kod),
        treeToggle: (path, el) => {
            const modal = el.closest('.modal');
            const collapsed = el.dataset.collapsed === '1';
            el.dataset.collapsed = collapsed ? '0' : '1';
            el.innerHTML = MRP.icon(collapsed ? 'chevronDown' : 'chevronRight', 'sm');
            modal.querySelectorAll('tr[data-path]').forEach((tr) => {
                if (tr.dataset.path.startsWith(path + '/')) tr.hidden = !collapsed;
            });
        }
    });

    /** Satır maliyeti için kalemin TL birim değeri: üretilenlerde malzeme+işçilik (genel gider en üstte bir kez eklenir) */
    const lineUnit = (kod) => { if (!M.hasBom(kod)) return M.priceTRY(kod); const c = M.costParts(kod); return c.material + c.labor; };

    /** Çok seviyeli ağacı düz satır listesine çevirir */
    function explode(kod, mult = 1, level = 1, path = '0', out = [], guard = new Set()) {
        if (guard.has(kod) || level > 10) return out;
        guard.add(kod);
        M.bom(kod).forEach((l, i) => {
            const it = M.item(l.kod) || { kod: l.kod, ad: '(tanımsız kalem)', tur: '-', unit: '', price: 0, currency: 'TRY', procurement: 'buy' };
            const p = `${path}/${i}`;
            const hasKids = M.hasBom(l.kod);
            const unitCost = lineUnit(l.kod);
            out.push({ it, k: l.k, total: l.k * mult, level, path: p, hasKids, unitCost, cost: l.k * mult * unitCost });
            if (hasKids) explode(l.kod, mult * l.k, level + 1, p, out, guard);
        });
        guard.delete(kod);
        return out;
    }

    function routingTable(kod, qty = 1) {
        const ops = M.routing(kod);
        if (!ops.length) return '<p class="muted" style="font-size:.85em;">Rota tanımlı değil.</p>';
        return `<div class="table-wrap"><table><thead><tr><th>#</th><th>İş merkezi</th><th class="num">Hazırlık (dk)</th><th class="num">Birim süre (dk)</th><th class="num">Saat ücreti</th><th class="num">Birim işçilik ₺</th></tr></thead><tbody>
            ${ops.map((op, i) => { const wc = M.workCenter(op.wc) || { ad: '?', rate: 0, efficiency: 100 }; const lot = Math.max(1, S().costing.stdLot);
                return `<tr><td class="num">${(i + 1) * 10}</td><td class="strong">${esc(wc.ad)} <span class="muted mono">${esc(op.wc)}</span></td><td class="num">${U.num(op.setup, 0)}</td><td class="num">${U.num(op.run, 1)}</td>
                    <td class="num">${U.cur(wc.rate)}</td><td class="num">${U.num(M.opMinutes(op, lot) / lot * wc.rate / 60)}</td></tr>`; }).join('')}
            <tr class="total"><td colspan="5" class="text-right">Bu seviyenin birim işçiliği (std. parti ${S().costing.stdLot})</td><td class="num">${U.num(M.ownLabor(kod))}</td></tr>
            </tbody></table></div>`;
    }

    function openProduct(kod) {
        const p = M.product(kod);
        if (!p) return;
        const rows = explode(kod);
        const unitCost = M.unitCost(kod);
        const parts = M.costParts(kod);
        const mat = parts.material;
        const v = p.toplam ? (mat - p.toplam) / p.toplam * 100 : 0;
        const breakdown = Object.entries(M.costBreakdown(kod)).sort((a, b) => b[1] - a[1]);
        const exposure = Object.entries(M.currencyExposure(kod)).filter(([c]) => c !== 'TRY');
        const lvl1 = U.sum(rows.filter((r) => r.level === 1), (r) => r.cost);
        const body = `
            <div class="grid grid-3" style="margin-bottom:16px;">
                <dl class="dl card card-body">
                    <dt>Mamul kodu</dt><dd class="mono">${esc(p.kod)}</dd>
                    <dt>Kategori</dt><dd>${H.catTag(p.kategori)}</dd>
                    <dt>Bileşen (1. seviye)</dt><dd>${M.bom(kod).length}</dd>
                    <dt>Toplam satır</dt><dd>${rows.length}</dd>
                    <dt>Mamul stoğu</dt><dd>${U.qty(M.onHand(kod), 'ad')}</dd>
                    <dt>Üretim süresi</dt><dd>${M.item(kod).leadTime} gün</dd>
                </dl>
                <dl class="dl card card-body">
                    <dt>Malzeme</dt><dd>${U.cur(mat)}</dd>
                    <dt>İşçilik</dt><dd>${U.cur(parts.labor)}</dd>
                    <dt>Genel gider (%${S().costing.overheadPct})</dt><dd>${U.cur((mat + parts.labor) * M.overheadPct())}</dd>
                    <dt class="grand">Standart maliyet</dt><dd style="color:var(--accent);font-size:1.1em;">${U.cur(unitCost)}</dd>
                    <dt>Kayıtlı (ERP) maliyet</dt><dd>${U.cur(p.toplam)}</dd>
                    <dt>Malzeme sapması</dt><dd class="${Math.abs(v) > 15 ? 'tp-neg' : ''}">${p.toplam ? (v > 0 ? '+' : '') + U.num(v, 1) + '%' : '–'}</dd>
                </dl>
                <dl class="dl card card-body">
                    ${breakdown.map(([t, val]) => `<dt>${esc(t)}</dt><dd>${U.num(val)} <span class="muted">(${unitCost ? U.num(val / unitCost * 100, 1) : 0}%)</span></dd>`).join('')}
                    ${exposure.length ? `<dt style="margin-top:6px;">Dövize bağlı pay</dt><dd style="margin-top:6px;">${exposure.map(([c, val]) => `${c} ${U.num(val / unitCost * 100, 0)}%`).join(' · ')}</dd>` : ''}
                </dl>
            </div>
            ${rows.length ? `<div class="table-wrap" style="max-height:400px;"><table>
                <thead><tr><th>Seviye / Kod</th><th>Bileşen</th><th>Tür</th><th class="num">Katsayı</th><th class="num">1 Mamul İçin</th>
                    <th class="num">Birim Fiyat</th><th class="num">Birim ₺</th><th class="num">Tutar ₺</th><th>Stok</th></tr></thead>
                <tbody>${rows.map((r) => `<tr data-path="${r.path}" ${r.hasKids ? 'class="r-warn"' : ''}>
                    <td class="nowrap" style="padding-left:${12 + (r.level - 1) * 22}px;">
                        ${r.hasKids ? `<button class="tree-toggle" data-act="treeToggle" data-id="${r.path}" data-collapsed="0">${MRP.icon('chevronDown', 'sm')}</button>` : '<span style="display:inline-block;width:20px;"></span>'}
                        <span class="lvl">.${r.level}</span>${H.itemLink(r.it.kod)}</td>
                    <td class="strong">${esc(r.it.ad)}</td>
                    <td><span class="badge badge-gray plain">${esc(r.it.tur)}</span></td>
                    <td class="num">${U.num(r.k, 4)}</td>
                    <td class="num">${esc(U.qty(r.total, r.it.unit))}</td>
                    <td class="num">${r.hasKids ? '<span class="muted">alt reçete</span>' : esc(M.fmtMoney(r.it.price || 0, r.it.currency))}</td>
                    <td class="num">${U.num(r.unitCost)}</td>
                    <td class="num strong">${U.num(r.cost)}</td>
                    <td>${H.stockBadge(M.stockStatus(r.it.kod))}</td></tr>`).join('')}
                    <tr class="total"><td colspan="7" class="text-right">Bileşenler toplamı (alt seviye işçiliği dahil)</td><td class="num">${U.num(lvl1)}</td><td></td></tr>
                    <tr class="total"><td colspan="7" class="text-right">+ Montaj seviyesi işçiliği</td><td class="num">${U.num(M.ownLabor(kod))}</td><td></td></tr>
                    <tr class="total"><td colspan="7" class="text-right">+ Genel gider %${S().costing.overheadPct}</td><td class="num">${U.num(unitCost - lvl1 - M.ownLabor(kod))}</td><td></td></tr>
                    <tr class="total"><td colspan="7" class="text-right">Standart birim maliyet</td><td class="num" style="color:var(--accent);">${U.num(unitCost)}</td><td></td></tr>
                </tbody></table></div>` : H.empty('Reçete tanımlı değil', 'Bu ürün için bileşen girilmemiş.')}
            <h3 style="font-size:.9em;margin:16px 0 8px;">Üretim rotası</h3>${routingTable(kod)}
            <p class="muted" style="font-size:.76em;margin-top:8px;">Fiyatlar güncel kurla TL'ye çevrilir (${Object.entries(S().fx.rates).map(([c, r]) => `${c} ${U.num(r, 4)}`).join(' · ')}).</p>`;
        const buttons = [{ label: 'Kapat' }];
        if (MRP.auth.can('editCost')) buttons.push({ label: 'Kayıtlı Maliyet', icon: 'edit', onClick: () => { setTimeout(() => editRecordedCost(kod)); } });
        if (MRP.auth.can('manageCapacity')) buttons.push({ label: 'Rotayı Düzenle', icon: 'gauge', onClick: () => { setTimeout(() => editRouting(kod)); } });
        if (MRP.auth.can('runMRP')) buttons.push({ label: 'Ana Plana Ekle', cls: 'btn-primary', icon: 'plus', onClick: () => { MRP.actions.addDemand(kod); } });
        UI.modal({ title: `${p.kod} — ${p.ad}`, size: 'xl', body, buttons });
    }

    function editRecordedCost(kod) {
        if (!H.guard('editCost')) return;
        const p = M.product(kod);
        UI.modal({
            title: `Kayıtlı Maliyet — ${kod}`, size: 'sm',
            body: `<p class="muted" style="font-size:.85em;margin-bottom:12px;">ERP'deki referans maliyet. BOM malzeme maliyeti şu an <b>${U.cur(M.materialCost(kod))}</b>.</p>
                <div class="form-grid"><div class="field full"><label>Kayıtlı maliyet (₺)</label><input id="rcCost" type="number" min="0" step="0.01" value="${p.toplam}"></div></div>`,
            buttons: [{ label: 'Vazgeç' }, { label: 'BOM malzemesini kullan', onClick: (ctx) => { ctx.$('#rcCost').value = U.round(M.materialCost(kod), 2); return false; } }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const v = U.toNum(ctx.$('#rcCost').value, NaN);
                    if (!(v >= 0)) { UI.toast('Geçersiz maliyet', '', 'warn'); return false; }
                    if (p.custom) S().customProducts.find((x) => x.kod === kod).toplam = v;
                    else S().productOverrides[kod] = { ...(S().productOverrides[kod] || {}), toplam: v };
                    MRP.store.audit('Kayıtlı maliyet güncellendi', `${kod}: ${U.num(p.toplam)} → ${U.num(v)}`);
                    app().commit();
                    UI.toast('Kayıtlı maliyet güncellendi', kod, 'success');
                }
            }]
        });
    }

    function editRouting(kod) {
        if (!H.guard('manageCapacity')) return;
        const ops = M.routing(kod).map((o) => ({ ...o }));
        const wcOpts = (sel) => M.workCenters().map((w) => `<option value="${esc(w.id)}" ${w.id === sel ? 'selected' : ''}>${esc(w.ad)}</option>`).join('');
        const row = (o) => `<tr><td><select class="input input-sm rt-wc">${wcOpts(o.wc)}</select></td>
            <td><input class="input input-sm rt-setup" type="number" min="0" step="1" value="${o.setup}" style="text-align:right;"></td>
            <td><input class="input input-sm rt-run" type="number" min="0" step="0.1" value="${o.run}" style="text-align:right;"></td>
            <td><button class="btn btn-ghost btn-sm rt-del" type="button">${MRP.icon('x', 'sm')}</button></td></tr>`;
        const ctx = UI.modal({
            title: `Rota — ${kod}`, size: 'md',
            body: `<p class="muted" style="font-size:.85em;margin-bottom:10px;">Operasyonlar sırayla yapılır. Süreler dakika cinsindendir; kapasite yükü ve işçilik maliyeti bu rotadan hesaplanır.</p>
                <div class="table-wrap"><table><thead><tr><th>İş merkezi</th><th class="num">Hazırlık dk</th><th class="num">Birim dk</th><th></th></tr></thead><tbody id="rtRows">${ops.map(row).join('')}</tbody></table></div>
                <button class="btn btn-secondary btn-sm" id="rtAdd" type="button" style="margin-top:8px;">${MRP.icon('plus', 'sm')} Operasyon ekle</button>`,
            buttons: [{ label: 'Vazgeç' }, { label: 'Varsayılana dön', onClick: () => { delete S().routings[kod]; MRP.store.audit('Rota varsayılana döndü', kod); app().commit(); } }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (c) => {
                    const list = c.$$('#rtRows tr').map((tr) => ({ wc: tr.querySelector('.rt-wc').value, setup: Math.max(0, U.toNum(tr.querySelector('.rt-setup').value)), run: Math.max(0, U.toNum(tr.querySelector('.rt-run').value)) }));
                    S().routings[kod] = list;
                    MRP.store.audit('Rota güncellendi', `${kod}: ${list.map((o) => `${o.wc} ${o.setup}+${o.run}`).join(', ')}`);
                    app().commit();
                    UI.toast('Rota kaydedildi', kod, 'success');
                }
            }]
        });
        ctx.$('#rtAdd').addEventListener('click', () => ctx.$('#rtRows').insertAdjacentHTML('beforeend', row({ wc: M.workCenters()[0].id, setup: 10, run: 5 })));
        ctx.$('#rtRows').addEventListener('click', (e) => { if (e.target.closest('.rt-del')) e.target.closest('tr').remove(); });
    }

    function openItem(kod) {
        if (M.isProduct(kod)) return openProduct(kod);
        const it = M.item(kod);
        if (!it) return UI.toast('Kalem bulunamadı', kod, 'warn');
        const wu = M.whereUsed(kod);
        const moves = S().movements.filter((m) => m.kod === kod).slice(-10).reverse();
        const offers = M.offers(kod);
        const hist = M.priceHistory(kod).slice(-10).reverse();
        const lots = M.lots(kod);
        const stocked = it.procurement !== 'service';
        const body = `
            <div class="grid grid-2" style="margin-bottom:16px;">
                <dl class="dl card card-body">
                    <dt>Tür</dt><dd>${esc(it.tur)}</dd>
                    <dt>Tedarik tipi</dt><dd>${esc(M.PROCUREMENT[it.procurement])}</dd>
                    <dt>Birim</dt><dd>${esc(it.unit)}</dd>
                    ${it.procurement === 'make'
                        ? `<dt>Standart maliyet</dt><dd>${U.cur(lineUnit(kod), 2)}</dd>`
                        : `<dt>Birim fiyat</dt><dd>${esc(M.fmtMoney(it.price, it.currency))}${it.currency !== 'TRY' ? ` <span class="muted">= ${U.cur(M.priceTRY(kod), 2)}</span>` : ''}</dd>`}
                    <dt>Tedarik süresi</dt><dd>${it.leadTime} gün</dd>
                    <dt>Parti politikası</dt><dd>${esc(M.LOT_POLICIES[it.lotPolicy])}${it.lotSize ? ` · ${esc(U.qty(it.lotSize, it.unit))}` : ''}</dd>
                </dl>
                <dl class="dl card card-body">
                    <dt>Eldeki stok</dt><dd>${stocked ? esc(U.qty(M.onHand(kod), it.unit)) : '–'}</dd>
                    ${stocked ? Object.keys(M.LOCATIONS).map((l) => `<dt>· ${esc(M.LOCATIONS[l].ad)}</dt><dd>${esc(U.qty(M.onHand(kod, l), it.unit))}</dd>`).join('') : ''}
                    <dt>Emniyet stoğu</dt><dd>${esc(U.qty(it.safetyStock, it.unit))}</dd>
                    <dt>Siparişte (açık PO)</dt><dd>${esc(U.qty(M.onOrder(kod), it.unit))}</dd>
                    <dt>Durum</dt><dd>${H.stockBadge(M.stockStatus(kod))}</dd>
                    <dt>Kullanıldığı mamul</dt><dd>${wu.products.toLocaleString('tr-TR')}${wu.parents.length ? ` · üst: ${wu.parents.map((p) => esc(p)).join(', ')}` : ''}</dd>
                </dl>
            </div>
            ${M.hasBom(kod) ? `<h3 style="font-size:.9em;margin-bottom:8px;">Alt reçete</h3><div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>Kod</th><th>Bileşen</th><th class="num">Katsayı</th><th class="num">Tutar ₺</th></tr></thead><tbody>
                ${M.bom(kod).map((l) => { const c = M.item(l.kod); return `<tr><td>${H.itemLink(l.kod)}</td><td>${esc(c ? c.ad : '?')}</td><td class="num">${esc(U.qty(l.k, c && c.unit))}</td><td class="num">${U.num(l.k * lineUnit(l.kod))}</td></tr>`; }).join('')}
                </tbody></table></div><h3 style="font-size:.9em;margin-bottom:8px;">Rota</h3><div style="margin-bottom:16px;">${routingTable(kod)}</div>` : ''}
            ${it.procurement !== 'make' ? `<div class="grid grid-2" style="margin-bottom:16px;">
                <div><h3 style="font-size:.9em;margin-bottom:8px;">Tedarikçi teklifleri</h3>${offers.length ? `<div class="table-wrap"><table><thead><tr><th>Tedarikçi</th><th class="num">Fiyat</th><th class="num">₺</th><th class="num">LT</th><th class="num">Puan</th></tr></thead><tbody>
                    ${offers.map((o, i) => `<tr class="${i === 0 ? 'r-new' : ''}"><td>${esc(o.supplier.ad)}</td><td class="num">${esc(M.fmtMoney(o.price, o.currency))}</td><td class="num strong">${U.num(o.priceTRY, 2)}</td><td class="num">${o.leadTime} g</td><td class="num">${U.num(M.supplierScore(o.supplier), 1)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="font-size:.85em;">Fiyat listesinde teklif yok.</p>'}</div>
                <div><h3 style="font-size:.9em;margin-bottom:8px;">Fiyat geçmişi (siparişler)</h3>${hist.length ? `<div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Sipariş</th><th>Tedarikçi</th><th class="num">₺/birim</th></tr></thead><tbody>
                    ${hist.map((h) => `<tr><td>${esc(U.date(h.at))}</td><td class="mono">${esc(h.po)}</td><td>${esc(h.supplier)}</td><td class="num">${U.num(h.price, 2)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="font-size:.85em;">Henüz sipariş yok.</p>'}</div>
            </div>` : ''}
            ${stocked && lots.length ? `<h3 style="font-size:.9em;margin-bottom:8px;">Lotlar (FIFO sırası)</h3><div class="table-wrap" style="margin-bottom:16px;max-height:200px;"><table><thead><tr><th>Lot</th><th>Lokasyon</th><th>Giriş</th><th>Kaynak</th><th class="num">Miktar</th></tr></thead><tbody>
                ${lots.map((l) => `<tr><td><button class="link mono" data-act="lotTrace" data-id="${esc(l.lot)}">${esc(l.lot)}</button></td><td>${esc(M.LOCATIONS[l.loc] ? M.LOCATIONS[l.loc].ad : l.loc)}</td><td>${esc(U.date(l.at))}</td><td>${esc([l.supplier, l.ref].filter(Boolean).join(' · '))}</td><td class="num">${esc(U.qty(l.qty, it.unit))}</td></tr>`).join('')}</tbody></table></div>` : ''}
            <h3 style="font-size:.9em;margin-bottom:8px;">Son hareketler</h3>
            ${moves.length ? `<div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Tür</th><th>Lokasyon</th><th>Referans</th><th class="num">Miktar</th><th class="num">Bakiye</th></tr></thead><tbody>
                ${moves.map((m) => `<tr><td class="nowrap">${esc(U.dateTime(m.at))}</td><td><span class="badge ${M.MOVE_TYPES[m.type].badge}">${esc(M.MOVE_TYPES[m.type].label)}</span></td><td>${esc(m.loc || '')}${m.toLoc ? ' → ' + esc(m.toLoc) : ''}</td><td class="mono">${esc(m.ref)}</td>
                    <td class="num ${m.qty < 0 ? 'tp-neg' : 'tp-pos'}">${m.qty > 0 ? '+' : ''}${esc(U.qty(m.qty))}</td><td class="num">${esc(U.qty(m.balance))}</td></tr>`).join('')}</tbody></table></div>`
                : '<p class="muted">Bu kalem için hareket kaydı yok.</p>'}`;
        const buttons = [{ label: 'Kapat' }];
        if (it.procurement === 'make' && MRP.auth.can('manageCapacity')) buttons.push({ label: 'Rotayı Düzenle', icon: 'gauge', onClick: () => { setTimeout(() => editRouting(kod)); } });
        if (MRP.auth.can('editItem') || MRP.auth.can('editCost')) buttons.push({ label: 'Kartı Düzenle', cls: 'btn-primary', icon: 'edit', onClick: () => { setTimeout(() => openEditItem(kod)); } });
        UI.modal({ title: `${it.kod} — ${it.ad}`, size: 'lg', body, buttons });
    }

    function openEditItem(kod) {
        if (!MRP.auth.can('editItem') && !MRP.auth.can('editCost')) return H.guard('editItem');
        const it = M.item(kod);
        const isCustom = !!S().customItems[kod];
        const canParams = MRP.auth.can('editItem');
        const canPrice = MRP.auth.can('editCost') || canParams;
        const ro = (ok) => (ok ? '' : 'readonly');
        UI.modal({
            title: `Malzeme Kartı — ${it.kod}`, size: 'md',
            body: `<div class="form-grid">
                <div class="field full"><label>Malzeme adı</label><input id="eiAd" value="${esc(it.ad)}" ${ro(isCustom && canParams)}></div>
                <div class="field"><label>Birim fiyat (/ ${esc(it.unit)})</label><input id="eiPrice" type="number" min="0" step="0.0001" value="${it.price}" ${ro(canPrice && it.procurement !== 'make')}>
                    ${it.procurement === 'make' ? '<span class="hint">Üretilen kalemin maliyeti alt reçete + rotadan hesaplanır.</span>' : '<span class="hint" id="eiTry"></span>'}</div>
                <div class="field"><label>Para birimi</label><select id="eiCur" ${canPrice && it.procurement !== 'make' ? '' : 'disabled'}>${Object.keys(MRP.data.CURRENCIES).map((c) => `<option ${c === it.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
                <div class="field"><label>Tedarik süresi (gün)</label><input id="eiLead" type="number" min="0" step="1" value="${it.leadTime}" ${ro(canParams)}></div>
                <div class="field"><label>Emniyet stoğu (${esc(it.unit)})</label><input id="eiSS" type="number" min="0" step="any" value="${it.safetyStock}" ${ro(canParams && it.procurement !== 'service')}></div>
                <div class="field"><label>Parti politikası</label><select id="eiLot" ${canParams ? '' : 'disabled'}>${Object.entries(M.LOT_POLICIES).map(([k, v]) => `<option value="${k}" ${it.lotPolicy === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
                <div class="field"><label>Parti / min. miktar</label><input id="eiLotSize" type="number" min="0" step="any" value="${it.lotSize}" ${ro(canParams)}><span class="hint">L4L için kullanılmaz.</span></div>
            </div>`,
            onOpen: (ctx) => {
                const upd = () => { const h = ctx.$('#eiTry'); if (h) h.textContent = `= ${U.cur(U.toNum(ctx.$('#eiPrice').value) * M.fxRate(ctx.$('#eiCur').value), 2)} (güncel kur)`; };
                ctx.$('#eiPrice').addEventListener('input', upd); ctx.$('#eiCur').addEventListener('change', upd); upd();
            },
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const ch = {
                        price: Math.max(0, U.toNum(ctx.$('#eiPrice').value)),
                        currency: ctx.$('#eiCur').value,
                        leadTime: Math.max(0, Math.round(U.toNum(ctx.$('#eiLead').value))),
                        safetyStock: Math.max(0, U.toNum(ctx.$('#eiSS').value)),
                        lotPolicy: ctx.$('#eiLot').value,
                        lotSize: Math.max(0, U.toNum(ctx.$('#eiLotSize').value))
                    };
                    if (ch.lotPolicy !== 'L4L' && !ch.lotSize) { UI.toast('Parti miktarı gerekli', 'Seçilen politika için parti/min. miktar girin.', 'warn'); return false; }
                    if (!canParams) { delete ch.leadTime; delete ch.safetyStock; delete ch.lotPolicy; delete ch.lotSize; }
                    if (it.procurement === 'make') { delete ch.price; delete ch.currency; }
                    if (isCustom) Object.assign(S().customItems[kod], ch, canParams ? { ad: ctx.$('#eiAd').value.trim() || it.ad } : {});
                    else S().itemOverrides[kod] = { ...(S().itemOverrides[kod] || {}), ...ch };
                    MRP.store.audit('Malzeme kartı güncellendi', `${kod}: ${Object.entries(ch).map(([k, v]) => `${k}=${v}`).join(', ')}`);
                    app().commit();
                    UI.toast('Malzeme kartı kaydedildi', kod, 'success');
                }
            }]
        });
    }

    // ---------------- Yeni ürün ----------------
    function openAddProduct() {
        if (!H.guard('editProduct')) return;
        const itemOpts = M.items().map((i) => `<option value="${esc(i.kod)}">${esc(i.ad)}</option>`).join('');
        const ctx = UI.modal({
            title: 'Yeni Ürün ve Reçete', size: 'lg',
            body: `
            <div class="form-section"><h3>Temel bilgiler</h3><div class="form-grid">
                <div class="field"><label>Mamul kodu <span class="req">*</span></label><input id="npKod" placeholder="BG.YENI.001" autocomplete="off"></div>
                <div class="field"><label>Kategori <span class="req">*</span></label><select id="npCat">${D.CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join('')}</select></div>
                <div class="field full"><label>Mamul adı <span class="req">*</span></label><input id="npAd" placeholder="LARA MASA 100*200*H75 ANTRASİT" autocomplete="off"></div>
            </div></div>
            <div class="form-section"><h3>Reçete (1. seviye bileşenler)</h3>
                <div class="toolbar" style="margin-bottom:8px;"><button class="btn btn-secondary btn-sm" type="button" id="npTpl">${MRP.icon('layers', 'sm')} Kategori şablonunu yükle</button>
                    <span class="muted" style="font-size:.8em;">Mevcut kodlar listeden seçilebilir; yeni kod girilirse yeni malzeme kartı açılır.</span></div>
                <datalist id="npItems">${itemOpts}</datalist>
                <div class="table-wrap" style="max-height:320px;"><table><thead><tr><th style="width:150px;">Kod</th><th>Ad</th><th style="width:160px;">Tür</th><th style="width:100px;" class="num">Katsayı</th><th style="width:120px;" class="num">Birim fiyat ₺</th><th style="width:40px;"></th></tr></thead>
                <tbody id="npRows"></tbody></table></div>
                <button class="btn btn-secondary btn-sm" type="button" id="npAddRow" style="margin-top:8px;">${MRP.icon('plus', 'sm')} Satır ekle</button>
            </div>
            <div class="totals"><dl class="dl"><dt>Bileşen sayısı</dt><dd id="npCount">0</dd><dt class="grand">Tahmini birim maliyet</dt><dd class="grand" id="npCost">0,00 ₺</dd></dl></div>`,
            buttons: [{ label: 'Vazgeç' }, { label: 'Ürünü Kaydet', cls: 'btn-success', icon: 'check', onClick: (c) => saveProduct(c) }]
        });
        const tbody = ctx.$('#npRows');
        const typeOpts = D.ITEM_TYPES.filter((t) => t !== 'Yarı Mamül İskelet').map((t) => `<option>${esc(t)}</option>`).join('');
        const addRow = (kod = '', k = 1) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><input class="input input-sm np-kod" list="npItems" value="${esc(kod)}" placeholder="HM.XXX"></td>
                <td><input class="input input-sm np-ad"></td>
                <td><select class="input input-sm np-tur">${typeOpts}</select></td>
                <td><input class="input input-sm np-k" type="number" min="0" step="any" value="${k}" style="text-align:right;"></td>
                <td><input class="input input-sm np-price" type="number" min="0" step="any" value="0" style="text-align:right;"></td>
                <td><button class="btn btn-ghost btn-sm np-del" type="button" title="Sil">${MRP.icon('x', 'sm')}</button></td>`;
            tbody.appendChild(tr);
            sync(tr);
        };
        const sync = (tr) => {
            const kod = tr.querySelector('.np-kod').value.trim();
            const it = kod ? M.item(kod) : null;
            const known = !!it && !it.isProduct;
            ['.np-ad', '.np-tur', '.np-price'].forEach((s) => { tr.querySelector(s).disabled = known; });
            if (known) {
                tr.querySelector('.np-ad').value = it.ad;
                if ([...tr.querySelector('.np-tur').options].some((o) => o.value === it.tur)) tr.querySelector('.np-tur').value = it.tur;
                tr.querySelector('.np-price').value = U.round(lineUnit(kod), 4);
            }
            recalc();
        };
        const recalc = () => {
            let n = 0, cost = 0;
            U.$$('tr', tbody).forEach((tr) => {
                const kod = tr.querySelector('.np-kod').value.trim();
                if (!kod) return;
                n++;
                cost += U.toNum(tr.querySelector('.np-k').value) * U.toNum(tr.querySelector('.np-price').value);
            });
            ctx.$('#npCount').textContent = n;
            ctx.$('#npCost').textContent = U.cur(cost);
        };
        tbody.addEventListener('input', (e) => { const tr = e.target.closest('tr'); if (e.target.classList.contains('np-kod')) sync(tr); else recalc(); });
        tbody.addEventListener('click', (e) => { if (e.target.closest('.np-del')) { e.target.closest('tr').remove(); recalc(); } });
        ctx.$('#npAddRow').addEventListener('click', () => addRow());
        ctx.$('#npTpl').addEventListener('click', () => {
            tbody.innerHTML = '';
            (D.BOM_TEMPLATES[ctx.$('#npCat').value] || []).forEach(([kod, , , k]) => addRow(kod, k));
        });
        addRow();
    }

    function saveProduct(ctx) {
        const kod = ctx.$('#npKod').value.trim().toUpperCase();
        const ad = ctx.$('#npAd').value.trim();
        const kategori = ctx.$('#npCat').value;
        if (!kod || !ad) { UI.toast('Eksik bilgi', 'Mamul kodu ve adı zorunludur.', 'warn'); return false; }
        if (!/^[A-ZÇĞİÖŞÜ0-9._-]+$/.test(kod)) { UI.toast('Geçersiz kod', 'Kod yalnızca harf, rakam, nokta, tire ve alt çizgi içerebilir.', 'warn'); return false; }
        if (M.product(kod) || M.items().some((i) => i.kod === kod)) { UI.toast('Kod kullanımda', `${kod} zaten tanımlı.`, 'error'); return false; }

        const lines = [];
        const newItems = {};
        for (const tr of ctx.$$('#npRows tr')) {
            const c = tr.querySelector('.np-kod').value.trim().toUpperCase();
            if (!c) continue;
            const k = U.toNum(tr.querySelector('.np-k').value);
            if (k <= 0) { UI.toast('Geçersiz katsayı', `${c} için katsayı sıfırdan büyük olmalı.`, 'warn'); return false; }
            if (c === kod) { UI.toast('Döngüsel reçete', 'Ürün kendi bileşeni olamaz.', 'warn'); return false; }
            if (lines.some((l) => l.kod === c)) { UI.toast('Tekrarlanan bileşen', c, 'warn'); return false; }
            if (!M.item(c)) {
                const adC = tr.querySelector('.np-ad').value.trim();
                if (!adC) { UI.toast('Bileşen adı gerekli', `${c} yeni bir kalem; adını girin.`, 'warn'); return false; }
                const tur = tr.querySelector('.np-tur').value;
                newItems[c] = {
                    kod: c, ad: adC, tur, unit: D.UNIT_BY_TYPE[tur] || 'ad', price: U.toNum(tr.querySelector('.np-price').value), currency: 'TRY',
                    procurement: tur === 'Fason İşçilik' ? 'service' : 'buy', leadTime: 7, safetyStock: 0, lotPolicy: 'L4L', lotSize: 0
                };
            }
            lines.push({ kod: c, k });
        }
        if (!lines.length) { UI.toast('Reçete boş', 'En az bir bileşen ekleyin.', 'warn'); return false; }

        Object.assign(S().customItems, newItems);
        S().customBoms[kod] = lines;
        S().customProducts.push({ kod, ad, kategori, bilesen: lines.length, fason: 0, hammadde: 0, iroko: 0, toplam: 0, createdAt: new Date().toISOString() });
        M.invalidate();
        const br = M.costBreakdown(kod);
        const p = S().customProducts[S().customProducts.length - 1];
        p.toplam = U.round(M.materialCost(kod), 2);
        p.fason = U.round(br['Fason İşçilik'] || 0, 2);
        p.iroko = U.round(br['İroko Kereste'] || 0, 2);
        p.hammadde = U.round(p.toplam - p.fason, 2);
        MRP.store.audit('Ürün eklendi', `${kod} — ${ad} (${lines.length} bileşen, ${Object.keys(newItems).length} yeni kalem)`);
        MRP.store.notify('product', 'Yeni ürün tanımlandı', `${kod} — ${ad}`, ['admin', 'planlama'], 'bom');
        bomState.cat = kategori; bomState.q = kod; bomState.page = 1;
        app().commit();
        UI.toast('Ürün kaydedildi', `${kod} · ${U.cur(p.toplam)}`, 'success');
    }

    async function deleteProduct(kod) {
        if (!H.guard('editProduct')) return;
        const st = S();
        if (st.mps.some((d) => d.kod === kod) || st.workOrders.some((w) => w.kod === kod && (w.status === 'planned' || w.status === 'released'))) {
            return UI.toast('Silinemez', 'Ürün ana planda veya açık bir iş emrinde kullanılıyor.', 'error');
        }
        if (!(await UI.confirm(`${kod} ürünü ve reçetesi silinecek. Emin misiniz?`, { title: 'Ürünü sil', okLabel: 'Sil', danger: true }))) return;
        st.customProducts = st.customProducts.filter((p) => p.kod !== kod);
        delete st.customBoms[kod];
        MRP.store.audit('Ürün silindi', kod);
        app().commit();
        UI.toast('Ürün silindi', kod, 'info');
    }

    // =====================================================================
    // MALZEME KARTLARI
    // =====================================================================
    const itemState = { tab: 'all', q: '' };

    MRP.views.items = {
        title: 'Malzeme Kartları',
        subtitle: 'Tedarik süresi, emniyet stoğu ve parti büyüklüğü gibi planlama parametreleri',
        render() {
            const all = M.items();
            const tabs = [['all', 'Tümü', all.length], ['buy', 'Satın Alma', all.filter((i) => i.procurement === 'buy').length],
                ['make', 'Yarı Mamul', all.filter((i) => i.procurement === 'make').length], ['service', 'Fason / Hizmet', all.filter((i) => i.procurement === 'service').length]];
            let list = itemState.tab === 'all' ? all : all.filter((i) => i.procurement === itemState.tab);
            const q = itemState.q.toLocaleLowerCase('tr');
            if (q) list = list.filter((i) => i.kod.toLocaleLowerCase('tr').includes(q) || i.ad.toLocaleLowerCase('tr').includes(q) || i.tur.toLocaleLowerCase('tr').includes(q));
            const canEdit = MRP.auth.can('editItem') || MRP.auth.can('editCost');
            return `${H.tabs(tabs, itemState.tab, 'itemTab')}
                <div class="toolbar"><input class="input" id="itemSearch" placeholder="Kod, ad veya tür ile ara…" value="${esc(itemState.q)}" data-input="itemSearch"></div>
                <section class="card"><div class="table-wrap"><table>
                    <thead><tr><th>Kod</th><th>Malzeme</th><th>Tür</th><th>Tedarik</th><th class="num">Birim Maliyet</th><th class="num">LT (gün)</th>
                        <th class="num">Emniyet Stoğu</th><th>Parti Politikası</th><th class="num">Stok</th><th>Durum</th><th></th></tr></thead>
                    <tbody>${list.map((i) => `<tr class="${S().customItems[i.kod] ? 'r-new' : ''}">
                        <td>${H.itemLink(i.kod)}</td><td class="strong">${esc(i.ad)}</td><td><span class="badge badge-gray plain">${esc(i.tur)}</span></td>
                        <td>${esc(M.PROCUREMENT[i.procurement])}</td>
                        <td class="num">${i.procurement === 'make' ? U.cur(lineUnit(i.kod)) : esc(M.fmtMoney(i.price, i.currency))} <span class="muted">/${esc(i.unit)}</span></td>
                        <td class="num">${i.leadTime}</td>
                        <td class="num">${i.procurement === 'service' ? '–' : esc(U.qty(i.safetyStock, i.unit))}</td>
                        <td>${esc(i.lotPolicy)}${i.lotSize ? ` · ${esc(U.qty(i.lotSize, i.unit))}` : ''}</td>
                        <td class="num">${i.procurement === 'service' ? '–' : esc(U.qty(M.onHand(i.kod), i.unit))}</td>
                        <td>${H.stockBadge(M.stockStatus(i.kod))}</td>
                        <td>${canEdit ? `<button class="btn btn-ghost btn-sm" data-act="editItem" data-id="${esc(i.kod)}" title="Düzenle">${MRP.icon('edit', 'sm')}</button>` : ''}</td>
                    </tr>`).join('') || `<tr><td colspan="11">${H.empty('Kayıt yok')}</td></tr>`}</tbody>
                </table></div></section>`;
        },
        after() {
            const el = document.getElementById('itemSearch');
            if (el && itemState.q) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }
    };
    const rerenderItems = U.debounce(() => app().render(), 250);
    Object.assign(MRP.actions, {
        itemTab: (t) => { itemState.tab = t; app().render(); },
        itemSearch: (v) => { itemState.q = v; rerenderItems(); }
    });
})(window.MRP);
