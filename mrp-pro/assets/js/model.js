/* ==========================================================================
   MRP Pro — İş modeli: ürünler, malzeme kartları, ürün ağacı, maliyet, stok
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U;
    const D = MRP.data;
    const S = () => MRP.store.state;

    let staticProducts = [];
    let baseItems = {};
    let cache = {};

    const MOVE_TYPES = {
        GR: { label: 'Mal Kabul', badge: 'badge-green' },
        GI: { label: 'Üretime Sarf', badge: 'badge-amber' },
        FG: { label: 'Üretimden Giriş', badge: 'badge-blue' },
        ADJ: { label: 'Sayım Düzeltme', badge: 'badge-violet' }
    };
    const PROCUREMENT = { buy: 'Satın Alma', make: 'Üretim', service: 'Fason / Hizmet' };
    const LOT_POLICIES = { L4L: 'Lot-for-Lot (ihtiyaç kadar)', FOQ: 'Sabit Parti (katları)', MIN: 'Minimum Sipariş' };

    const M = { MOVE_TYPES, PROCUREMENT, LOT_POLICIES };

    M.init = () => {
        staticProducts = D.buildProducts();
        baseItems = D.buildItemMaster();
        M.invalidate();
    };
    M.invalidate = () => { cache = {}; };

    // ---------------- Ürünler ----------------
    M.products = () => {
        if (!cache.products) {
            cache.products = [...staticProducts, ...S().customProducts.map((p) => ({ ...p, custom: true }))];
            cache.productIndex = new Map(cache.products.map((p) => [p.kod, p]));
        }
        return cache.products;
    };
    M.product = (kod) => { M.products(); return cache.productIndex.get(kod) || null; };
    M.isProduct = (kod) => !!M.product(kod);

    // ---------------- Malzeme kartları ----------------
    M.items = () => {
        if (!cache.items) {
            const all = { ...baseItems, ...S().customItems };
            cache.items = Object.values(all).map((it) => ({ ...it, ...(S().itemOverrides[it.kod] || {}) }))
                .sort((a, b) => a.kod.localeCompare(b.kod));
            cache.itemIndex = new Map(cache.items.map((i) => [i.kod, i]));
        }
        return cache.items;
    };
    /** Malzeme veya mamul için birleşik kart (mamuller "üretim" tipinde sanal karttır) */
    M.item = (kod) => {
        M.items();
        const it = cache.itemIndex.get(kod);
        if (it) return it;
        const p = M.product(kod);
        if (!p) return null;
        return {
            kod, ad: p.ad, tur: 'Mamul', unit: 'ad', procurement: 'make', isProduct: true,
            price: M.unitCost(kod), leadTime: (D.CATEGORY_STYLE[p.kategori] || {}).lead || 5,
            safetyStock: 0, lotPolicy: 'L4L', lotSize: 0, kategori: p.kategori
        };
    };

    // ---------------- Ürün ağacı ----------------
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

    /** Standart maliyet (alt seviyelerden yukarı doğru toplanır) */
    M.unitCost = (kod, depth = 0) => {
        cache.cost = cache.cost || {};
        if (cache.cost[kod] != null) return cache.cost[kod];
        if (depth > 20) return 0; // döngü koruması
        const lines = M.bom(kod);
        let cost;
        if (lines.length) cost = U.sum(lines, (l) => l.k * M.unitCost(l.kod, depth + 1));
        else {
            M.items();
            const it = cache.itemIndex.get(kod);
            const p = it ? null : M.product(kod);
            cost = it ? it.price : (p ? p.toplam : 0);
        }
        cache.cost[kod] = cost;
        return cost;
    };

    /** Maliyetin malzeme türüne göre dağılımı (çok seviyeli) */
    M.costBreakdown = (kod, mult = 1, acc = {}, depth = 0) => {
        if (depth > 20) return acc;
        M.bom(kod).forEach((l) => {
            const child = M.item(l.kod);
            if (!child) return;
            if (M.hasBom(l.kod) && !child.isProduct) M.costBreakdown(l.kod, mult * l.k, acc, depth + 1);
            else acc[child.tur] = (acc[child.tur] || 0) + mult * l.k * (child.price || 0);
        });
        return acc;
    };

    /** Kalemin kullanıldığı ürünler (kategori bazında sayım) */
    M.whereUsed = (kod) => {
        const res = { products: 0, byCategory: {}, parents: [] };
        Object.entries(D.SUB_BOMS).forEach(([ym, lines]) => { if (lines.some(([c]) => c === kod)) res.parents.push(ym); });
        Object.entries(S().customBoms).forEach(([p, lines]) => { if (lines.some((l) => l.kod === kod) && !res.parents.includes(p)) res.parents.push(p); });
        const direct = new Set([kod, ...res.parents]);
        M.products().forEach((p) => {
            if (M.bom(p.kod).some((l) => direct.has(l.kod))) {
                res.products++;
                res.byCategory[p.kategori] = (res.byCategory[p.kategori] || 0) + 1;
            }
        });
        return res;
    };

    // ---------------- Stok ----------------
    M.onHand = (kod) => S().stock[kod] || 0;

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

    /**
     * Stok hareketi kaydeder ve bakiyeyi günceller.
     * @param {{kod:string, qty:number, type:'GR'|'GI'|'FG'|'ADJ', ref?:string, note?:string}} m  qty işaretlidir (+giriş / −çıkış)
     */
    M.move = ({ kod, qty, type, ref = '', note = '' }) => {
        const st = S().stock;
        const it = M.item(kod);
        const precise = it && it.unit !== 'ad' ? 3 : 0;
        st[kod] = U.round((st[kod] || 0) + qty, precise || 3);
        const u = MRP.auth.current();
        S().movements.push({
            id: MRP.store.nextNo('HRK'), at: new Date().toISOString(), kod, type, qty, balance: st[kod],
            ref, note, user: u ? u.name : 'sistem', value: qty * (it ? it.price || 0 : 0)
        });
    };

    M.stockValue = () => U.sum(Object.entries(S().stock), ([kod, q]) => {
        const it = M.item(kod);
        return it ? Math.max(0, q) * (it.price || 0) : 0;
    });

    /** Talep/PO satırları için öncelikli tedarikçi önerisi */
    M.suggestSuppliers = (types) => S().suppliers
        .filter((s) => s.aktif)
        .map((s) => ({ s, match: types.filter((t) => s.kategoriler.includes(t)).length }))
        .sort((a, b) => b.match - a.match || b.s.puan - a.s.puan);

    MRP.model = M;
})(window.MRP);
