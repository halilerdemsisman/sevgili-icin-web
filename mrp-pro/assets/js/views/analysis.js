/* ==========================================================================
   MRP Pro — Analizler: maliyet sapması, ABC, stok devir hızı / ölü stok,
   kur riski ve senaryo (what-if) analizi
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model, D = MRP.data;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;

    const aState = { tab: 'variance', threshold: 15, cat: 'all', abcBasis: 'demand', scenario: [], scenarioResult: null };

    MRP.views.analysis = {
        title: 'Analizler',
        subtitle: 'Maliyet sapması, ABC sınıflandırma, stok devir hızı, kur riski ve senaryo analizi',
        render() {
            const tabs = [['variance', 'Maliyet Sapması'], ['abc', 'ABC Analizi'], ['turnover', 'Stok Devir / Ölü Stok'], ['fx', 'Kur Riski'], ['scenario', 'Senaryo (What-if)']];
            let html = H.tabs(tabs.map(([a, b]) => [a, b, null]), aState.tab, 'anTab');
            if (aState.tab === 'variance') html += variance();
            else if (aState.tab === 'abc') html += abc();
            else if (aState.tab === 'turnover') html += turnover();
            else if (aState.tab === 'fx') html += fxRisk();
            else html += scenario();
            return html;
        }
    };

    // ---------------- Maliyet sapması ----------------
    function variance() {
        const rows = M.products().filter((p) => !p.synthetic && p.toplam > 0 && (aState.cat === 'all' || p.kategori === aState.cat))
            .map((p) => { const mat = M.materialCost(p.kod); return { p, mat, pct: (mat - p.toplam) / p.toplam * 100, std: M.unitCost(p.kod) }; })
            .filter((r) => Math.abs(r.pct) >= aState.threshold)
            .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
        return `<div class="toolbar">
                <select class="input" data-change="anCat"><option value="all">Tüm kategoriler</option>${D.CATEGORIES.map((c) => `<option ${aState.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
                <label class="muted" style="font-size:.85em;">Eşik %</label><input class="input" type="number" min="0" step="1" value="${aState.threshold}" style="width:90px;min-width:0;" data-change="anThr">
            </div>
            ${H.banner('blue', 'info', `${rows.length} ana üründe malzeme maliyeti kayıtlı maliyetten %${aState.threshold}+ sapıyor`, 'Kayıtlı maliyet ERP referansıdır (malzeme + fason). Büyük sapmalar eksik/hatalı reçete satırı, güncellenmemiş fiyat veya kur değişimini gösterir.')}
            <section class="card"><div class="table-wrap"><table><thead><tr><th>Kod</th><th>Ürün</th><th>Kategori</th><th class="num">Kayıtlı ₺</th><th class="num">BOM malzeme ₺</th><th class="num">Sapma</th><th class="num">Standart maliyet ₺</th></tr></thead><tbody>
            ${rows.map((r) => `<tr><td>${H.productLink(r.p.kod)}</td><td class="strong">${esc(r.p.ad)}</td><td>${H.catTag(r.p.kategori)}</td><td class="num">${U.num(r.p.toplam)}</td><td class="num">${U.num(r.mat)}</td>
                <td class="num ${r.pct > 0 ? 'tp-neg' : 'tp-pos'}">${r.pct > 0 ? '+' : ''}${U.num(r.pct, 1)}%</td><td class="num">${U.num(r.std)}</td></tr>`).join('') || `<tr><td colspan="7">${H.empty('Eşiği aşan sapma yok')}</td></tr>`}
            </tbody></table></div></section>`;
    }

    // ---------------- ABC ----------------
    function consumption(days) {
        const from = U.addDays(U.today(), -days).toISOString();
        const map = {};
        S().movements.filter((m) => m.type === 'GI' && m.at >= from).forEach((m) => { map[m.kod] = (map[m.kod] || 0) - m.qty; });
        return map;
    }
    function abcRows(basis) {
        const run = S().lastRun;
        const cons = consumption(90);
        const items = M.items().filter((i) => i.procurement !== 'service');
        const val = (i) => {
            const p = i.procurement === 'make' ? M.unitCost(i.kod) : M.priceTRY(i.kod);
            if (basis === 'stock') return Math.max(0, M.onHand(i.kod)) * p;
            if (basis === 'consumption') return (cons[i.kod] || 0) * p;
            const rec = run && run.records[i.kod];
            return rec ? U.sum(rec.gross, (g) => g.qty) * p : 0;
        };
        const rows = items.map((i) => ({ i, v: val(i) })).filter((r) => r.v > 0).sort((a, b) => b.v - a.v);
        const total = U.sum(rows, (r) => r.v);
        let cum = 0;
        rows.forEach((r) => { cum += r.v; r.cumPct = total ? cum / total : 0; r.cls = r.cumPct <= 0.8 || r === rows[0] ? 'A' : r.cumPct <= 0.95 ? 'B' : 'C'; });
        return { rows, total };
    }
    function abc() {
        const { rows, total } = abcRows(aState.abcBasis);
        const by = (c) => rows.filter((r) => r.cls === c);
        const basisLabel = { demand: 'MRP brüt ihtiyaç değeri', stock: 'Stok değeri', consumption: 'Son 90 gün sarf değeri' };
        const noData = aState.abcBasis === 'demand' && !S().lastRun;
        return `<div class="toolbar"><select class="input" data-change="anAbc">${Object.entries(basisLabel).map(([k, v]) => `<option value="${k}" ${aState.abcBasis === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
            ${noData ? H.banner('amber', 'alert', 'MRP sonucu yok', 'Bu ölçüt için önce MRP çalıştırın veya başka ölçüt seçin.') : ''}
            <div class="kpis">${['A', 'B', 'C'].map((c, i) => H.kpi(`${c} sınıfı`, `${by(c).length} kalem`, `${U.compactCur(U.sum(by(c), (r) => r.v))} · %${total ? U.num(U.sum(by(c), (r) => r.v) / total * 100, 1) : 0}`, ['red', 'violet', 'green'][i])).join('')}
                ${H.kpi('Toplam', U.compactCur(total), basisLabel[aState.abcBasis], 'blue')}</div>
            <p class="muted" style="font-size:.8em;margin-bottom:10px;">A: değerin ilk %80'i — sıkı takip, sık sayım, çoklu tedarikçi · B: sonraki %15 · C: son %5 — basit kontrol, toplu sipariş.</p>
            <section class="card"><div class="table-wrap"><table><thead><tr><th>Sınıf</th><th>Kod</th><th>Malzeme</th><th>Tür</th><th class="num">Değer ₺</th><th class="num">Kümülatif</th></tr></thead><tbody>
            ${rows.map((r) => `<tr><td><span class="badge ${r.cls === 'A' ? 'badge-red' : r.cls === 'B' ? 'badge-violet' : 'badge-green'} plain">${r.cls}</span></td><td>${H.itemLink(r.i.kod)}</td><td class="strong">${esc(r.i.ad)}</td>
                <td><span class="badge badge-gray plain">${esc(r.i.tur)}</span></td><td class="num">${U.num(r.v)}</td><td class="num">%${U.num(r.cumPct * 100, 1)}</td></tr>`).join('') || `<tr><td colspan="6">${H.empty('Veri yok')}</td></tr>`}
            </tbody></table></div></section>`;
    }

    // ---------------- Stok devir / ölü stok ----------------
    function turnover() {
        const run = S().lastRun;
        const cons = consumption(90);
        const horizon = 84;
        const rows = M.items().filter((i) => i.procurement !== 'service').map((i) => {
            const oh = M.onHand(i.kod);
            const used90 = cons[i.kod] || 0;
            const rec = run && run.records[i.kod];
            const planned = rec ? U.sum(rec.gross.filter((g) => U.diffDays(g.date, U.today()) <= horizon), (g) => g.qty) : 0;
            const daily = used90 > 0 ? used90 / 90 : planned / horizon;
            const p = i.procurement === 'make' ? M.unitCost(i.kod) : M.priceTRY(i.kod);
            return { i, oh, used90, planned, daily, cover: daily > 0 ? oh / daily : (oh > 0 ? Infinity : 0), turns: oh > 0 && daily > 0 ? daily * 365 / oh : 0, value: Math.max(0, oh) * p };
        }).filter((r) => r.oh > 0);
        const dead = rows.filter((r) => r.daily === 0);
        const excess = rows.filter((r) => r.cover !== Infinity && r.cover > 180);
        rows.sort((a, b) => (b.cover === Infinity ? 1e9 : b.cover) - (a.cover === Infinity ? 1e9 : a.cover));
        return `<div class="kpis">
                ${H.kpi('Hareketsiz Stok', `${dead.length} kalem`, U.compactCur(U.sum(dead, (r) => r.value)), dead.length ? 'red' : 'green')}
                ${H.kpi('Fazla Stok (>180 gün)', `${excess.length} kalem`, U.compactCur(U.sum(excess, (r) => r.value)), excess.length ? 'violet' : 'green')}
                ${H.kpi('Stoklu Kalem', rows.length, U.compactCur(U.sum(rows, (r) => r.value)), 'blue')}
            </div>
            <p class="muted" style="font-size:.8em;margin-bottom:10px;">Günlük kullanım: son 90 gün sarf; sarf yoksa MRP'deki önümüzdeki 12 haftanın brüt ihtiyacı. Kullanımı olmayan stok "hareketsiz" sayılır.</p>
            <section class="card"><div class="table-wrap"><table><thead><tr><th>Kod</th><th>Malzeme</th><th class="num">Eldeki</th><th class="num">90 gün sarf</th><th class="num">Günlük kullanım</th><th class="num">Yeterlilik (gün)</th><th class="num">Yıllık devir</th><th class="num">Değer ₺</th><th>Durum</th></tr></thead><tbody>
            ${rows.map((r) => `<tr><td>${H.itemLink(r.i.kod)}</td><td class="strong">${esc(r.i.ad)}</td><td class="num">${esc(U.qty(r.oh, r.i.unit))}</td><td class="num">${esc(U.qty(r.used90))}</td>
                <td class="num">${U.num(r.daily, 2)}</td><td class="num">${r.cover === Infinity ? '∞' : U.num(r.cover, 0)}</td><td class="num">${r.turns ? U.num(r.turns, 1) : '–'}</td><td class="num">${U.num(r.value)}</td>
                <td>${r.daily === 0 ? '<span class="badge badge-red">Hareketsiz</span>' : r.cover > 180 ? '<span class="badge badge-violet">Fazla</span>' : r.cover < 14 ? '<span class="badge badge-amber">Az</span>' : '<span class="badge badge-green">Dengeli</span>'}</td></tr>`).join('')}
            </tbody></table></div></section>`;
    }

    // ---------------- Kur riski ----------------
    function fxRisk() {
        const rows = M.products().filter((p) => !p.synthetic).map((p) => {
            const ex = M.currencyExposure(p.kod);
            const mat = U.sum(Object.values(ex));
            const foreign = mat - (ex.TRY || 0);
            return { p, ex, mat, foreign, share: mat ? foreign / mat : 0, cost: M.unitCost(p.kod) };
        }).filter((r) => r.foreign > 0).sort((a, b) => b.share - a.share);
        const curs = Object.keys(D.CURRENCIES).filter((c) => c !== 'TRY');
        return `${H.banner('blue', 'info', 'Kur riski', 'Ürün maliyetinin dövize bağlı payı. %10 kur artışının birim maliyete etkisi = dövizli pay × %10.')}
            <section class="card"><div class="table-wrap"><table><thead><tr><th>Kod</th><th>Ürün</th>${curs.map((c) => `<th class="num">${c} payı ₺</th>`).join('')}<th class="num">Dövizli pay</th><th class="num">%10 kur etkisi</th></tr></thead><tbody>
            ${rows.map((r) => `<tr><td>${H.productLink(r.p.kod)}</td><td class="strong">${esc(r.p.ad)}</td>${curs.map((c) => `<td class="num">${r.ex[c] ? U.num(r.ex[c]) : '–'}</td>`).join('')}
                <td class="num"><span class="bar"><span style="width:${r.share * 100}%;background:var(--violet);"></span></span> %${U.num(r.share * 100, 0)}</td>
                <td class="num tp-neg">+${U.cur(r.foreign * 0.1 * (1 + M.overheadPct()))}</td></tr>`).join('') || `<tr><td colspan="${4 + curs.length}">${H.empty('Dövizli malzeme içeren ürün yok')}</td></tr>`}
            </tbody></table></div></section>`;
    }

    // ---------------- Senaryo ----------------
    function scenario() {
        const canRun = MRP.auth.can('runMRP') || MRP.auth.canView('mrp');
        const res = aState.scenarioResult;
        let html = H.card('Senaryo talepleri', 'Ana plan değişmeden, eklenen taleplerin malzeme ve kapasiteye etkisini simüle edin', `
            <div class="card-body">
                <datalist id="scProducts">${M.products().filter((p) => !p.synthetic || aState.scenario.some((s) => s.kod === p.kod)).map((p) => `<option value="${esc(p.kod)}">${esc(p.ad)}</option>`).join('')}</datalist>
                <div class="form-grid" style="grid-template-columns:2fr 1fr 1fr auto;align-items:end;">
                    <div class="field"><label>Mamul</label><input id="scKod" list="scProducts" autocomplete="off" placeholder="Kod yazın…"></div>
                    <div class="field"><label>Miktar</label><input id="scQty" type="number" min="1" step="1" value="100"></div>
                    <div class="field"><label>Termin</label><input id="scDate" type="date" value="${U.iso(U.addDays(U.today(), 21))}"></div>
                    <button class="btn btn-secondary" data-act="scAdd">${MRP.icon('plus')} Ekle</button>
                </div>
                ${aState.scenario.length ? `<div class="table-wrap" style="margin-top:14px;"><table><thead><tr><th>Mamul</th><th>Ad</th><th class="num">Miktar</th><th>Termin</th><th></th></tr></thead><tbody>
                    ${aState.scenario.map((s, i) => `<tr><td class="mono">${esc(s.kod)}</td><td>${esc((M.product(s.kod) || {}).ad || '')}</td><td class="num">${s.qty}</td><td>${esc(U.date(U.parseDate(s.dueDate)))}</td>
                        <td><button class="btn btn-ghost btn-sm" data-act="scDel" data-id="${i}">${MRP.icon('x', 'sm')}</button></td></tr>`).join('')}</tbody></table></div>` : ''}
                <div style="display:flex;gap:8px;margin-top:14px;"><button class="btn btn-primary" data-act="scRun" ${aState.scenario.length && canRun ? '' : 'disabled'}>${MRP.icon('play')} Senaryoyu çalıştır</button>
                    ${aState.scenario.length ? `<button class="btn btn-ghost" data-act="scClear">Temizle</button>` : ''}</div>
            </div>`);
        if (!res) return html;

        const b = res.base.summary, s = res.scen.summary;
        const delta = (x, y, money) => { const d = y - x; return `${money ? U.compactCur(y) : y} <span class="${d > 0 ? 'tp-neg' : d < 0 ? 'tp-pos' : 'muted'}" style="font-size:.8em;">(${d > 0 ? '+' : ''}${money ? U.compactCur(d) : d})</span>`; };
        html += `<div style="height:16px;"></div><div class="kpis">
            <div class="kpi violet"><div class="l">Satın alma önerisi</div><div class="v" style="font-size:1.15em;">${delta(b.purchaseCount, s.purchaseCount)}</div><div class="s">${delta(b.purchaseValue, s.purchaseValue, true)}</div></div>
            <div class="kpi blue"><div class="l">Üretim önerisi</div><div class="v" style="font-size:1.15em;">${delta(b.productionCount, s.productionCount)}</div><div class="s">Mamul + yarı mamul</div></div>
            <div class="kpi ${s.late > b.late ? 'red' : 'green'}"><div class="l">Geç salım</div><div class="v" style="font-size:1.15em;">${delta(b.late, s.late)}</div><div class="s">Tedarik süresi yetmeyen</div></div>
            <div class="kpi ${res.capScen.over > res.capBase.over ? 'red' : 'green'}"><div class="l">Kapasite aşımı</div><div class="v" style="font-size:1.15em;">${delta(res.capBase.over, res.capScen.over)}</div><div class="s">Tepe doluluk %${U.num(res.capScen.peak * 100, 0)}</div></div>
        </div>`;
        const verdict = s.late > b.late || res.capScen.over > res.capBase.over
            ? H.banner('red', 'alert', 'Senaryo mevcut tedarik süreleri/kapasite ile karşılanamıyor', 'Termin ötelenmeli, kritik malzemeler hızlandırılmalı veya kapasite artırılmalı. Aşağıda geç kalan kalemler listelenmiştir.')
            : H.banner('green', 'check', 'Senaryo uygulanabilir görünüyor', 'Ek talepler mevcut tedarik süreleri ve kapasite ile karşılanabilir.');
        html += verdict;
        html += H.card('Ek ihtiyaç doğan kalemler', 'Senaryo ile temel plan arasındaki planlı sipariş farkı', `<div class="table-wrap"><table><thead><tr><th>Kod</th><th>Kalem</th><th>Tip</th><th class="num">Ek miktar</th><th class="num">Ek tutar ₺</th><th>En erken salım</th><th>Durum</th></tr></thead><tbody>
            ${res.diff.map((d) => `<tr class="${d.late ? 'r-crit' : ''}"><td>${H.anyLink(d.kod)}</td><td class="strong">${esc(d.ad)}</td><td>${d.type === 'production' ? '<span class="badge badge-blue">Üretim</span>' : '<span class="badge badge-violet">Satın alma</span>'}</td>
                <td class="num">${esc(U.qty(d.qty, d.unit))}</td><td class="num">${U.num(d.value)}</td><td>${esc(U.date(U.parseDate(d.release)))}</td><td>${d.late ? '<span class="badge badge-red">Gecikir</span>' : '<span class="badge badge-green">Zamanında</span>'}</td></tr>`).join('')
                || `<tr><td colspan="7">${H.empty('Ek ihtiyaç yok', 'Mevcut stok ve planlı girişler yeterli.')}</td></tr>`}</tbody></table></div>`,
            `<button class="btn btn-secondary btn-sm" data-act="scApply" ${MRP.auth.can('runMRP') ? '' : 'disabled'}>Senaryoyu ana plana ekle</button>`);
        return html;
    }

    function runScenario() {
        const extra = aState.scenario.map((s, i) => ({ ...s, id: `SEN-${i + 1}` }));
        const base = MRP.engine.run();
        const scen = MRP.engine.run({ extraDemands: extra });
        const sumBy = (planned) => { const m = {}; planned.forEach((p) => { const e = m[p.kod] || (m[p.kod] = { qty: 0, value: 0, release: p.release, late: false, p }); e.qty += p.qty; e.value += p.value; if (p.release < e.release) e.release = p.release; e.late = e.late || p.late; }); return m; };
        const bm = sumBy(base.planned), sm = sumBy(scen.planned);
        const diff = Object.entries(sm).map(([kod, e]) => {
            const b0 = bm[kod] || { qty: 0, value: 0 };
            return { kod, ad: e.p.ad, unit: e.p.unit, type: e.p.type, qty: U.round(e.qty - b0.qty, 3), value: e.value - b0.value, release: e.release, late: e.late && !(bm[kod] && bm[kod].late) };
        }).filter((d) => d.qty > 1e-9).sort((a, b) => (b.late - a.late) || b.value - a.value);
        aState.scenarioResult = {
            base, scen, diff,
            capBase: MRP.capacity.summary(MRP.capacity.compute({ planned: base.planned })),
            capScen: MRP.capacity.summary(MRP.capacity.compute({ planned: scen.planned }))
        };
        app().render();
    }

    Object.assign(MRP.actions, {
        anTab: (t) => { aState.tab = t; app().render(); },
        anCat: (v) => { aState.cat = v; app().render(); },
        anThr: (v) => { aState.threshold = Math.max(0, U.toNum(v, 15)); app().render(); },
        anAbc: (v) => { aState.abcBasis = v; app().render(); },
        scAdd: () => {
            const kod = document.getElementById('scKod').value.trim();
            const qty = Math.round(U.toNum(document.getElementById('scQty').value));
            const dueDate = document.getElementById('scDate').value;
            if (!M.product(kod)) return UI.toast('Geçersiz mamul', 'Listeden bir mamul kodu seçin.', 'warn');
            if (qty <= 0 || !dueDate) return UI.toast('Miktar ve termin gerekli', '', 'warn');
            aState.scenario.push({ kod, qty, dueDate });
            aState.scenarioResult = null;
            app().render();
        },
        scDel: (i) => { aState.scenario.splice(+i, 1); aState.scenarioResult = null; app().render(); },
        scClear: () => { aState.scenario = []; aState.scenarioResult = null; app().render(); },
        scRun: () => runScenario(),
        scApply: async () => {
            if (!H.guard('runMRP')) return;
            if (!(await UI.confirm(`${aState.scenario.length} senaryo talebi ana üretim planına eklenecek.`, { title: 'Ana plana ekle', okLabel: 'Ekle' }))) return;
            aState.scenario.forEach((s) => S().mps.push({ id: MRP.store.nextNo('MPS'), ...s, note: 'Senaryodan eklendi' }));
            MRP.store.audit('Senaryo ana plana eklendi', aState.scenario.map((s) => `${s.kod}×${s.qty}`).join(', '));
            aState.scenario = []; aState.scenarioResult = null;
            location.hash = '#/mrp';
            app().commit();
            UI.toast('Ana plan güncellendi', 'MRP\'yi yeniden çalıştırın.', 'info');
        }
    });
})(window.MRP);
