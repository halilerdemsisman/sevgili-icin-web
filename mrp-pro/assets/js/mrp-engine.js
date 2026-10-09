/* ==========================================================================
   MRP Pro — MRP Motoru
   --------------------------------------------------------------------------
   Klasik MRP mantığı:
     1. Bağımsız talep (Ana Üretim Planı) + açık iş emirlerinin bileşen ihtiyaçları
        → brüt ihtiyaçlar
     2. Düşük seviye kodu (LLC) ile ürün ağacı seviye seviye işlenir
     3. Her kalem için:  eldeki stok − emniyet stoğu + planlı girişler (açık PO,
        açık talepler, açık iş emirleri) ile brüt ihtiyaçlar netleştirilir
     4. Net ihtiyaç parti büyüklüğü politikasına göre yuvarlanır
        (L4L / Sabit parti / Minimum sipariş)
     5. Tedarik süresi kadar geriye kaydırılarak sipariş salım tarihi bulunur
     6. Üretilen kalemlerin planlı siparişleri alt seviyeye patlatılır
   Tüm tarihler "YYYY-MM-DD" metni olarak tutulur (saat dilimi kayması olmaz).
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U;
    const M = MRP.model;
    const S = () => MRP.store.state;

    const OPEN_WO = ['planned', 'released'];
    const EPS = 1e-9;
    const addDaysIso = (iso, n) => U.iso(U.addDays(U.parseDate(iso), n));
    const maxIso = (a, b) => (a > b ? a : b);

    function applyLotSize(it, shortage) {
        let q = shortage;
        if (it.lotPolicy === 'FOQ' && it.lotSize > 0) q = Math.ceil(shortage / it.lotSize - EPS) * it.lotSize;
        else if (it.lotPolicy === 'MIN' && it.lotSize > 0) q = Math.max(shortage, it.lotSize);
        return it.unit === 'ad' ? Math.ceil(q - EPS) : Math.ceil(q * 1000 - 1e-6) / 1000;
    }

    /** Aynı güne düşen brüt ihtiyaçları tek satırda toplar (kaynaklar korunur) */
    function mergeByDate(list) {
        const byDate = new Map();
        list.forEach((g) => {
            const x = byDate.get(g.date);
            if (x) { x.qty += g.qty; if (!x.srcs.includes(g.src)) x.srcs.push(g.src); if (g.kind === 'MPS') x.kind = 'MPS'; }
            else byDate.set(g.date, { date: g.date, qty: g.qty, kind: g.kind, srcs: [g.src] });
        });
        return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
            .map((x) => ({ ...x, src: x.srcs.length > 2 ? `${x.srcs.slice(0, 2).join(', ')} +${x.srcs.length - 2}` : x.srcs.join(', ') }));
    }

    /**
     * @param {{extraDemands?: Array<{id,kod,qty,dueDate}>}} [opts]  Senaryo analizi için kalıcı olmayan ek talepler
     */
    function run(opts = {}) {
        const st = S();
        const today = U.iso(U.today());
        const gross = new Map();
        const receipts = new Map();
        const push = (map, kod, entry) => { if (entry.qty <= EPS) return; if (!map.has(kod)) map.set(kod, []); map.get(kod).push(entry); };

        // 1) Bağımsız talep
        [...st.mps, ...(opts.extraDemands || [])].forEach((d) => {
            if (M.product(d.kod)) push(gross, d.kod, { date: d.dueDate, qty: +d.qty, src: d.id, kind: 'MPS' });
        });

        // 2) Açık iş emirleri: mamul için planlı giriş, bileşenler için bağımlı talep
        const openWOs = st.workOrders.filter((w) => OPEN_WO.includes(w.status));
        openWOs.forEach((w) => {
            push(receipts, w.kod, { date: w.end, qty: w.qty, src: w.no, kind: 'WO' });
            M.bom(w.kod).forEach((l) => push(gross, l.kod, { date: maxIso(w.start, today), qty: l.k * w.qty, src: w.no, kind: 'WO' }));
        });

        // 3) Açık satın alma siparişleri ve henüz siparişe dönmemiş talepler → planlı giriş
        st.pos.filter((p) => p.status === 'open' || p.status === 'partial').forEach((p) => p.lines.forEach((l) => {
            push(receipts, l.kod, { date: p.deliveryDate, qty: l.qty - (l.received || 0), src: p.no, kind: 'PO' });
        }));
        st.requests.filter((r) => r.status === 'pending' || r.status === 'approved').forEach((r) => r.lines.forEach((l) => {
            push(receipts, l.kod, { date: l.needDate || r.deadline || today, qty: l.qty, src: r.no, kind: 'REQ' });
        }));

        // 4) Düşük seviye kodları
        const llc = new Map();
        const visit = (kod, lvl, path) => {
            if (path.has(kod)) return; // döngüsel reçete koruması
            if ((llc.get(kod) ?? -1) >= lvl) return;
            llc.set(kod, lvl);
            path.add(kod);
            M.bom(kod).forEach((l) => visit(l.kod, lvl + 1, path));
            path.delete(kod);
        };
        [...gross.keys(), ...receipts.keys()].forEach((k) => visit(k, 0, new Set()));
        // Talebi olmayan kalemler de (emniyet stoğu tamamlama için) ağaçlarıyla birlikte seviyelendirilir;
        // böylece bir yarı mamul her zaman kendi bileşenlerinden önce işlenir.
        M.items().forEach((it) => { if (!llc.has(it.kod)) visit(it.kod, 0, new Set()); });
        const order = [...llc.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);

        // 5) Netleştirme
        const records = {};
        const planned = [];
        const exceptions = [];
        let seq = 0;

        order.forEach((kod) => {
            const it = M.item(kod);
            if (!it) return;
            const isService = it.procurement === 'service';
            const reqs = mergeByDate(gross.get(kod) || []);
            const recs = (receipts.get(kod) || []).sort((a, b) => a.date.localeCompare(b.date));
            // Fason/hizmet: teslim alınmış ama henüz üretimde kullanılmamış hizmet bakiyesi netleştirilir
            const onHand = M.onHand(kod);
            const ss = isService ? 0 : (it.safetyStock || 0);
            if (!reqs.length && !recs.length && onHand >= ss) return;

            const rec = { kod, level: llc.get(kod), onHand, ss, gross: reqs, receipts: recs, planned: [] };
            let proj = onHand - ss;
            let ri = 0;

            recs.forEach((r) => {
                if (r.kind === 'PO' && r.date < today) {
                    exceptions.push({ sev: 'warn', kod, msg: `${r.src} teslimatı ${U.diffDays(today, r.date)} gün gecikmiş (${U.qty(r.qty, it.unit)}).` });
                }
            });

            const plan = (needDate, shortage, reason) => {
                const qty = applyLotSize(it, shortage);
                const due = maxIso(needDate, today);
                const release = addDaysIso(due, -(it.leadTime || 0));
                const unitPrice = it.procurement === 'make' ? M.unitCost(kod) : M.priceTRY(kod);
                const po = {
                    id: `PL-${String(++seq).padStart(4, '0')}`, kod, ad: it.ad, unit: it.unit, tur: it.tur,
                    type: it.procurement === 'make' ? 'production' : 'purchase', service: isService,
                    qty, shortage: U.round(shortage, 3), needDate, due, release, leadTime: it.leadTime || 0,
                    price: unitPrice, currency: it.currency || 'TRY', origPrice: it.price || 0,
                    value: qty * unitPrice, reason, late: release < today
                };
                planned.push(po);
                rec.planned.push(po);
                if (po.late) {
                    exceptions.push({ sev: 'critical', kod, msg: `${po.id}: salım tarihi ${U.diffDays(today, release)} gün geçmiş — tedarik hızlandırılmalı veya talep ertelenmeli.` });
                } else if (U.diffDays(release, today) <= 3) {
                    exceptions.push({ sev: 'warn', kod, msg: `${po.id}: ${U.date(U.parseDate(release))} tarihine kadar salınmalı.` });
                }
                if (needDate < today) {
                    exceptions.push({ sev: 'critical', kod, msg: `İhtiyaç tarihi geçmiş (${U.date(U.parseDate(needDate))}) — karşılanamayan talep.` });
                }
                if (po.type === 'production') {
                    M.bom(kod).forEach((l) => push(gross, l.kod, { date: maxIso(release, today), qty: l.k * qty, src: po.id, kind: 'PLN' }));
                }
                if (!isService && po.type === 'purchase' && !po.price) {
                    exceptions.push({ sev: 'info', kod, msg: 'Birim fiyat tanımsız — malzeme kartını güncelleyin.' });
                }
                return qty;
            };

            reqs.forEach((r) => {
                while (ri < recs.length && recs[ri].date <= r.date) proj += recs[ri++].qty;
                if (proj < r.qty - EPS) {
                    const later = recs.slice(ri).filter((x) => x.kind === 'PO' || x.kind === 'REQ');
                    if (later.length) {
                        exceptions.push({ sev: 'warn', kod, msg: `${later[0].src} ihtiyaçtan sonra geliyor (${U.date(U.parseDate(later[0].date))}); öne çekilirse ek sipariş gerekmeyebilir.` });
                    }
                    proj += plan(r.date, r.qty - proj, r.kind === 'MPS' ? `Ana plan ${r.src}` : `Bağımlı talep ${r.src}`);
                }
                proj -= r.qty;
            });
            while (ri < recs.length) proj += recs[ri++].qty;
            if (proj < -EPS) proj += plan(addDaysIso(today, it.leadTime || 0), -proj, 'Emniyet stoğu tamamlama');

            rec.projectedEnd = U.round(proj + ss, 3);
            records[kod] = rec;
        });

        // Bağımlı talep sonradan eklenen kalemler için brüt listeleri güncel tut
        Object.values(records).forEach((r) => { r.gross = (gross.get(r.kod) || []).slice().sort((a, b) => a.date.localeCompare(b.date)); });

        const sevOrder = { critical: 0, warn: 1, info: 2 };
        exceptions.sort((a, b) => sevOrder[a.sev] - sevOrder[b.sev]);

        const purchase = planned.filter((p) => p.type === 'purchase');
        const production = planned.filter((p) => p.type === 'production');
        return {
            runAt: new Date().toISOString(),
            runBy: MRP.auth.current() ? MRP.auth.current().name : '',
            today,
            planned, records, exceptions,
            summary: {
                demands: st.mps.length + (opts.extraDemands || []).length,
                items: Object.keys(records).length,
                purchaseCount: purchase.length,
                purchaseValue: U.sum(purchase, (p) => p.value),
                productionCount: production.length,
                late: planned.filter((p) => p.late).length,
                critical: exceptions.filter((e) => e.sev === 'critical').length
            }
        };
    }

    /** Haftalık zaman fazlı tablo (12 hafta + geçmiş vade kovası) */
    function timePhased(rec, weeks = 12) {
        const start = U.weekStart(U.today());
        const cols = [{ label: 'Geçmiş', from: '0000-00-00', to: addDaysIso(U.iso(start), -1) }];
        for (let i = 0; i < weeks; i++) {
            const from = U.iso(U.addDays(start, i * 7));
            cols.push({ label: `H${U.isoWeek(from)}`, sub: U.date(U.parseDate(from)).slice(0, 5), from, to: addDaysIso(from, 6) });
        }
        cols.push({ label: 'Sonra', from: addDaysIso(U.iso(start), weeks * 7), to: '9999-12-31' });
        const bucket = (list, dateKey) => cols.map((c) => U.sum(list.filter((x) => x[dateKey] >= c.from && x[dateKey] <= c.to), (x) => x.qty));
        const g = bucket(rec.gross, 'date');
        const sr = bucket(rec.receipts, 'date');
        const pr = bucket(rec.planned, 'due');
        const rel = bucket(rec.planned, 'release');
        let proj = rec.onHand;
        const pa = cols.map((_, i) => (proj = proj + sr[i] + pr[i] - g[i]));
        return { cols, rows: [
            { label: 'Brüt ihtiyaç', values: g },
            { label: 'Planlı girişler (PO/Talep/İE)', values: sr },
            { label: 'Planlı sipariş girişi', values: pr },
            { label: 'Öngörülen eldeki stok', values: pa, projected: true },
            { label: 'Planlı sipariş salımı', values: rel, release: true }
        ] };
    }

    MRP.engine = { run, timePhased, applyLotSize };
})(window.MRP);
