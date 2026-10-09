/* ==========================================================================
   MRP Pro — İş modeli: ürünler, malzeme kartları, ürün ağacı, rotalar,
   döviz/maliyet, lot tabanlı çoklu lokasyon stoğu, fiyat listesi
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U;
    const D = MRP.data;
    const S = () => MRP.store.state;
    const EPS = 1e-9;

    let staticProducts = [];
    let baseItems = {};
    let cache = {};

    const MOVE_TYPES = {
        GR: { label: 'Mal Kabul', badge: 'badge-green' },
        GI: { label: 'Üretime Sarf', badge: 'badge-amber' },
        FG: { label: 'Üretimden Giriş', badge: 'badge-blue' },
        ADJ: { label: 'Sayım Düzeltme', badge: 'badge-violet' },
        TRF: { label: 'Transfer', badge: 'badge-cyan' }
    };
    const PROCUREMENT = { buy: 'Satın Alma', make: 'Üretim', service: 'Fason / Hizmet' };
    const LOT_POLICIES = { L4L: 'Lot-for-Lot (ihtiyaç kadar)', FOQ: 'Sabit Parti (katları)', MIN: 'Minimum Sipariş' };

    const M = { MOVE_TYPES, PROCUREMENT, LOT_POLICIES, LOCATIONS: D.LOCATIONS };

    M.init = () => {
        staticProducts = D.buildProducts();
        baseItems = D.buildItemMaster();
        M.invalidate();
    };
    M.invalidate = () => { cache = {}; };

    // ======================================================================
    // Döviz
    // ======================================================================
    M.fxRate = (cur) => (!cur || cur === 'TRY' ? 1 : (S().fx.rates[cur] || D.DEFAULT_FX[cur] || 1));
    M.toTRY = (amount, cur) => amount * M.fxRate(cur);
    M.fmtMoney = (amount, cur) => (cur && cur !== 'TRY' ? `${U.num(amount, 2)} ${D.CURRENCIES[cur].symbol}` : U.cur(amount));

    // ======================================================================
    // Ürünler
    // ======================================================================
    M.products = () => {
        if (!cache.products) {
            const ov = S().productOverrides;
            cache.products = [
                ...staticProducts.map((p) => (ov[p.kod] ? { ...p, ...ov[p.kod] } : p)),
                ...S().customProducts.map((p) => ({ ...p, custom: true }))
            ];
            cache.productIndex = new Map(cache.products.map((p) => [p.kod, p]));
        }
        return cache.products;
    };
    M.product = (kod) => { M.products(); return cache.productIndex.get(kod) || null; };
    M.isProduct = (kod) => !!M.product(kod);

    // ======================================================================
    // Malzeme kartları
    // ======================================================================
    M.items = () => {
        if (!cache.items) {
            const all = { ...baseItems, ...S().customItems };
            cache.items = Object.values(all)
                .map((it) => ({ currency: 'TRY', ...it, ...(S().itemOverrides[it.kod] || {}) }))
                .sort((a, b) => a.kod.localeCompare(b.kod));
            cache.itemIndex = new Map(cache.items.map((i) => [i.kod, i]));
        }
        return cache.items;
    };
    M.rawItem = (kod) => { M.items(); return cache.itemIndex.get(kod) || null; };
    /** Malzeme veya mamul için birleşik kart (mamuller "üretim" tipinde sanal karttır) */
    M.item = (kod) => {
        const it = M.rawItem(kod);
        if (it) return it;
        const p = M.product(kod);
        if (!p) return null;
        return {
            kod, ad: p.ad, tur: 'Mamul', unit: 'ad', procurement: 'make', isProduct: true, currency: 'TRY',
            price: M.unitCost(kod), leadTime: (D.CATEGORY_STYLE[p.kategori] || {}).lead || 5,
            safetyStock: 0, lotPolicy: 'L4L', lotSize: 0, kategori: p.kategori
        };
    };
    /** Satın alınan kalemin TL birim fiyatı (güncel kurla) */
    M.priceTRY = (kod) => { const it = M.rawItem(kod); return it ? M.toTRY(it.price || 0, it.currency) : 0; };

    // ======================================================================
    // Ürün ağacı ve rotalar
    // ======================================================================
    /** Tek seviyeli reçete satırları [{kod, k}] */
    M.bom = (kod) => {
        const custom = S().customBoms[kod];
        if (custom) return custom;
        if (D.SUB_BOMS[kod]) return D.SUB_BOMS[kod].map(([c, k]) => ({ kod: c, k }));
        const p = M.product(kod);
        if (!p || p.custom) return [];
        const tpl = D.BOM_TEMPLATES[p.kategori] || [];
        return tpl.map(([c, , , k]) => ({ kod: c, k }));
    };
    M.hasBom = (kod) => M.bom(kod).length > 0;

    M.workCenters = () => S().workCenters;
    M.workCenter = (id) => S().workCenters.find((w) => w.id === id) || null;

    /** Operasyon listesi [{wc, setup, run}] — özel rota yoksa kategori varsayılanı */
    M.routing = (kod) => {
        if (S().routings[kod]) return S().routings[kod];
        const p = M.product(kod);
        let tpl = null;
        if (p) tpl = D.DEFAULT_ROUTINGS[p.kategori];
        else { const it = M.rawItem(kod); if (it && it.procurement === 'make') tpl = D.DEFAULT_ROUTINGS._YM; }
        return (tpl || []).map(([wc, setup, run]) => ({ wc, setup, run }));
    };
    /** Bir operasyonun toplam dakikası (verimlilik dahil) */
    M.opMinutes = (op, qty) => {
        const wc = M.workCenter(op.wc);
        const eff = wc ? (wc.efficiency || 100) / 100 : 1;
        return (op.setup + op.run * qty) / eff;
    };

    // ======================================================================
    // Maliyet (TL, güncel kurla) — malzeme + işçilik + genel gider
    // ======================================================================
    /** Kendi rotasının birim işçilik maliyeti (hazırlık standart partiye yayılır) */
    M.ownLabor = (kod) => {
        if (!S().costing.includeLabor) return 0;
        const lot = Math.max(1, S().costing.stdLot || 20);
        return U.sum(M.routing(kod), (op) => {
            const wc = M.workCenter(op.wc);
            return wc ? (M.opMinutes(op, lot) / lot) * (wc.rate || 0) / 60 : 0;
        });
    };

    /** { material, labor } — çok seviyeli toplanmış, genel gider hariç */
    M.costParts = (kod, depth = 0) => {
        cache.parts = cache.parts || {};
        if (cache.parts[kod]) return cache.parts[kod];
        let res;
        const lines = depth > 20 ? [] : M.bom(kod);
        if (lines.length) {
            res = { material: 0, labor: M.ownLabor(kod) };
            lines.forEach((l) => {
                const c = M.hasBom(l.kod) ? M.costParts(l.kod, depth + 1) : { material: M.priceTRY(l.kod), labor: 0 };
                res.material += l.k * c.material;
                res.labor += l.k * c.labor;
            });
        } else {
            const it = M.rawItem(kod);
            const p = it ? null : M.product(kod);
            res = { material: it ? M.priceTRY(kod) : (p ? p.toplam : 0), labor: 0 };
        }
        cache.parts[kod] = res;
        return res;
    };
    M.overheadPct = () => (S().costing.overheadPct || 0) / 100;
    /** Standart birim maliyet (TL): malzeme + işçilik + genel gider */
    M.unitCost = (kod) => {
        const c = M.costParts(kod);
        if (!M.hasBom(kod)) return c.material;
        return (c.material + c.labor) * (1 + M.overheadPct());
    };
    /** Yalnızca malzeme maliyeti (ERP'deki kayıtlı maliyetle karşılaştırma için) */
    M.materialCost = (kod) => M.costParts(kod).material;

    /** Maliyetin malzeme türüne göre dağılımı + işçilik + genel gider (TL) */
    M.costBreakdown = (kod) => {
        const acc = {};
        const walk = (k, mult, depth) => {
            if (depth > 20) return;
            M.bom(k).forEach((l) => {
                const child = M.item(l.kod);
                if (!child) return;
                if (M.hasBom(l.kod) && !child.isProduct) walk(l.kod, mult * l.k, depth + 1);
                else acc[child.tur] = (acc[child.tur] || 0) + mult * l.k * (child.isProduct ? M.unitCost(l.kod) : M.priceTRY(l.kod));
            });
        };
        walk(kod, 1, 0);
        const c = M.costParts(kod);
        if (c.labor) acc['İşçilik'] = c.labor;
        const oh = (c.material + c.labor) * M.overheadPct();
        if (oh) acc['Genel Gider'] = oh;
        return acc;
    };
    /** Döviz bazında malzeme maliyeti dağılımı (TL karşılığı) — kur riski analizi */
    M.currencyExposure = (kod) => {
        const acc = {};
        const walk = (k, mult, depth) => {
            if (depth > 20) return;
            M.bom(k).forEach((l) => {
                if (M.hasBom(l.kod)) return walk(l.kod, mult * l.k, depth + 1);
                const it = M.rawItem(l.kod);
                if (!it) return;
                acc[it.currency] = (acc[it.currency] || 0) + mult * l.k * M.priceTRY(l.kod);
            });
        };
        walk(kod, 1, 0);
        return acc;
    };

    /** Kalemin kullanıldığı ürünler (kategori bazında sayım) */
    M.whereUsed = (kod) => {
        const res = { products: 0, byCategory: {}, parents: [] };
        Object.entries(D.SUB_BOMS).forEach(([ym, lines]) => { if (lines.some(([c]) => c === kod)) res.parents.push(ym); });
        Object.entries(S().customBoms).forEach(([p, lines]) => { if (!M.isProduct(p) && lines.some((l) => l.kod === kod) && !res.parents.includes(p)) res.parents.push(p); });
        const direct = new Set([kod, ...res.parents]);
        M.products().forEach((p) => {
            if (M.bom(p.kod).some((l) => direct.has(l.kod))) {
                res.products++;
                res.byCategory[p.kategori] = (res.byCategory[p.kategori] || 0) + 1;
            }
        });
        return res;
    };

    // ======================================================================
    // Stok (lot kayıtlarından türetilir)
    // ======================================================================
    function stockIndex() {
        if (!cache.stock) {
            cache.stock = new Map();
            S().lots.forEach((l) => {
                let e = cache.stock.get(l.kod);
                if (!e) { e = { total: 0, byLoc: {} }; cache.stock.set(l.kod, e); }
                e.total += l.qty;
                e.byLoc[l.loc] = (e.byLoc[l.loc] || 0) + l.qty;
            });
        }
        return cache.stock;
    }
    /** Eldeki stok; locs verilirse yalnızca o lokasyon(lar) */
    M.onHand = (kod, locs) => {
        const e = stockIndex().get(kod);
        if (!e) return 0;
        if (!locs) return U.round(e.total, 3);
        return U.round(U.sum([].concat(locs), (l) => e.byLoc[l] || 0), 3);
    };
    /** Üretimde kullanılabilir stok (fasoncudaki hariç) */
    M.CONSUME_LOCS = Object.keys(D.LOCATIONS).filter((k) => D.LOCATIONS[k].consume);
    M.available = (kod) => M.onHand(kod, M.CONSUME_LOCS);

    /** FIFO sıralı lotlar */
    M.lots = (kod, loc) => S().lots.filter((l) => l.kod === kod && (!loc || l.loc === loc) && l.qty > EPS)
        .sort((a, b) => a.at.localeCompare(b.at));

    M.stockStatus = (kod) => {
        const it = M.item(kod);
        if (!it || it.procurement === 'service') return 'na';
        const q = M.onHand(kod);
        if (it.safetyStock <= 0) return q < 0 ? 'critical' : 'ok';
        if (q < it.safetyStock * 0.5) return 'critical';
        if (q < it.safetyStock) return 'warn';
        return 'ok';
    };

    /** Açık satın alma siparişlerinde bekleyen miktar */
    M.onOrder = (kod) => U.sum(
        S().pos.filter((p) => p.status === 'open' || p.status === 'partial'),
        (p) => U.sum(p.lines.filter((l) => l.kod === kod), (l) => Math.max(0, l.qty - (l.received || 0)))
    );

    /** FIFO ile lotlardan düşer; düşülen parçaları döndürür */
    function takeFIFO(kod, locs, qty) {
        const taken = [];
        let rem = qty;
        [].concat(locs).forEach((loc) => {
            if (rem <= EPS) return;
            M.lots(kod, loc).forEach((l) => {
                if (rem <= EPS) return;
                const q = Math.min(l.qty, rem);
                l.qty = U.round(l.qty - q, 4);
                rem = U.round(rem - q, 4);
                taken.push({ lot: l.lot, qty: q, at: l.at, supplier: l.supplier, ref: l.ref, loc: l.loc });
            });
        });
        return { taken, missing: rem > EPS ? rem : 0 };
    }

    /**
     * Stok hareketi kaydeder.
     *  - qty > 0 (GR, FG, ADJ+) → loc'a yeni lot açar (lot verilmezse otomatik numara)
     *  - qty < 0 (GI, ADJ−)     → loc listesinden FIFO düşer
     *  - TRF                    → loc(lar)dan toLoc'a FIFO taşır (lot numaraları korunur)
     * @returns {object} hareket kaydı
     */
    M.move = ({ kod, qty, type, loc = 'MERKEZ', toLoc = null, lot = '', ref = '', note = '', supplier = '' }) => {
        const st = S();
        const it = M.item(kod);
        const now = new Date().toISOString();
        let lots = [];
        if (type === 'TRF') {
            const r = takeFIFO(kod, loc, qty);
            r.taken.forEach((t) => st.lots.push({ id: U.uid('lot'), lot: t.lot, kod, loc: toLoc, qty: t.qty, at: t.at, ref: t.ref, supplier: t.supplier }));
            lots = r.taken.map((t) => ({ lot: t.lot, qty: t.qty }));
            qty = U.sum(r.taken, (t) => t.qty);
        } else if (qty > 0) {
            const lotNo = lot || MRP.store.nextNo('LOT');
            st.lots.push({ id: U.uid('lot'), lot: lotNo, kod, loc, qty: U.round(qty, 4), at: now, ref, supplier });
            lots = [{ lot: lotNo, qty }];
        } else if (qty < 0) {
            const r = takeFIFO(kod, loc, -qty);
            lots = r.taken.map((t) => ({ lot: t.lot, qty: -t.qty }));
            if (r.missing) lots.push({ lot: '(eksik)', qty: -r.missing });
            qty = -U.sum(r.taken, (t) => t.qty);
        }
        st.lots = st.lots.filter((l) => l.qty > EPS);
        cache.stock = null;
        const u = MRP.auth.current();
        const m = {
            id: MRP.store.nextNo('HRK'), at: now, kod, type, qty: U.round(qty, 4), balance: M.onHand(kod),
            loc: Array.isArray(loc) ? loc.join('+') : loc, toLoc, lots, ref, note,
            user: u ? u.name : 'sistem', value: Math.abs(qty) * (it ? (it.isProduct ? M.unitCost(kod) : M.priceTRY(kod)) : 0) * (qty < 0 ? -1 : 1)
        };
        st.movements.push(m);
        return m;
    };

    M.stockValue = () => {
        let v = 0;
        stockIndex().forEach((e, kod) => {
            if (e.total <= 0) return;
            const it = M.rawItem(kod);
            if (it && it.procurement === 'service') return; // hizmet bakiyesi stok değeri sayılmaz
            v += e.total * (M.isProduct(kod) ? M.unitCost(kod) : M.priceTRY(kod));
        });
        return v;
    };

    // ======================================================================
    // Tedarikçi fiyat listesi, performans, fiyat geçmişi
    // ======================================================================
    /** Kalem için tedarikçi teklifleri — TL fiyata göre artan */
    M.offers = (kod) => S().priceList.filter((o) => o.kod === kod)
        .map((o) => ({ ...o, priceTRY: M.toTRY(o.price, o.currency), supplier: S().suppliers.find((s) => s.id === o.supplierId) }))
        .filter((o) => o.supplier)
        .sort((a, b) => a.priceTRY - b.priceTRY);
    M.offer = (supplierId, kod) => S().priceList.find((o) => o.supplierId === supplierId && o.kod === kod) || null;

    /** Teslimat kayıtlarından otomatik performans: zamanında teslim ve kalite oranı */
    M.supplierPerformance = (id) => {
        const pos = S().pos.filter((p) => p.supplierId === id && (p.receipts || []).length);
        if (!pos.length) return null;
        let onTime = 0, receipts = 0, rejected = 0;
        pos.forEach((p) => {
            const first = p.receipts.find((r) => r.quality !== 'rejected');
            if (first && first.at.slice(0, 10) <= p.deliveryDate) onTime++;
            p.receipts.forEach((r) => { receipts++; if (r.quality === 'rejected') rejected++; });
        });
        const onTimePct = onTime / pos.length;
        const qualityPct = receipts ? 1 - rejected / receipts : 1;
        return { orders: pos.length, onTimePct, qualityPct, score: U.round(1 + 4 * (0.6 * onTimePct + 0.4 * qualityPct), 1) };
    };
    /** Etkin puan: teslimat verisi varsa otomatik, yoksa elle girilen puan */
    M.supplierScore = (s) => { const p = M.supplierPerformance(s.id); return p ? p.score : s.puan; };

    M.priceHistory = (kod) => {
        const out = [];
        S().pos.forEach((p) => p.lines.filter((l) => l.kod === kod).forEach((l) => out.push({
            at: p.createdAt, po: p.no, supplier: p.supplierName, qty: l.qty, price: l.price,
            origPrice: l.origPrice ?? l.price, currency: l.currency || 'TRY', status: p.status
        })));
        return out.sort((a, b) => a.at.localeCompare(b.at));
    };

    /** Talep/PO satırları için öncelikli tedarikçi önerisi */
    M.suggestSuppliers = (types) => S().suppliers
        .filter((s) => s.aktif)
        .map((s) => ({ s, match: types.filter((t) => s.kategoriler.includes(t)).length }))
        .sort((a, b) => b.match - a.match || M.supplierScore(b.s) - M.supplierScore(a.s));

    MRP.model = M;
})(window.MRP);
