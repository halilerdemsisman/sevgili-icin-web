/* ==========================================================================
   MRP Pro — Veri Aktarımı: Excel (XLSX/XLS) ve CSV içe aktarma
   Şablon indir → doldur → yükle → önizleme/doğrulama → içe aktar
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model, D = MRP.data;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;

    // ---------------- Ayrıştırma yardımcıları ----------------
    const TR = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i̇': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };
    const norm = (s) => String(s ?? '').toLocaleLowerCase('tr').replace(/[çğıöşü]/g, (c) => TR[c]).replace(/[^a-z0-9]/g, '');
    const str = (v) => String(v ?? '').trim();
    /** "1.234,56" / "1234.56" / 1234.56 → sayı; boş → null */
    function num(v) {
        if (v === null || v === undefined || v === '') return null;
        if (typeof v === 'number') return isFinite(v) ? v : NaN;
        let s = String(v).trim().replace(/\s|₺|TL/gi, '');
        if (!s) return null;
        if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
        else if (s.includes(',')) s = s.replace(',', '.');
        const n = parseFloat(s);
        return isFinite(n) ? n : NaN;
    }
    /** Excel seri tarihi, gg.aa.yyyy, gg/aa/yyyy veya yyyy-aa-gg → "yyyy-aa-gg" */
    function date(v) {
        if (v === null || v === undefined || v === '') return null;
        if (typeof v === 'number') {
            const d = new Date(Math.round((v - 25569) * 86400000));
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        }
        if (v instanceof Date) return U.iso(v);
        const s = String(v).trim();
        let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
        m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
        if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        return undefined;
    }
    const PROC = { satinalma: 'buy', satin: 'buy', buy: 'buy', alim: 'buy', uretim: 'make', make: 'make', yarimamul: 'make', fason: 'service', hizmet: 'service', service: 'service' };
    const LOTP = { l4l: 'L4L', lotforlot: 'L4L', ihtiyackadar: 'L4L', foq: 'FOQ', sabit: 'FOQ', sabitparti: 'FOQ', min: 'MIN', minimum: 'MIN', minimumsiparis: 'MIN' };
    const LOCS = { merkez: 'MERKEZ', merkezdepo: 'MERKEZ', depo: 'MERKEZ', fabrika: 'FABRIKA', uretim: 'FABRIKA', uretimhatti: 'FABRIKA', fason: 'FASON', fasoncu: 'FASON', fasoncuda: 'FASON' };

    function parseCSV(text) {
        const first = text.split(/\r?\n/)[0] || '';
        const delim = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
        const rows = [];
        let row = [], cell = '', q = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (q) {
                if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
            } else if (c === '"') q = true;
            else if (c === delim) { row.push(cell); cell = ''; }
            else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
            else cell += c;
        }
        if (cell || row.length) { row.push(cell); rows.push(row); }
        const head = (rows.shift() || []).map((h) => h.replace(/^﻿/, ''));
        return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
    }

    async function readFile(file) {
        const ext = file.name.toLowerCase().split('.').pop();
        if (ext === 'csv' || ext === 'txt') return parseCSV(await file.text());
        if (typeof XLSX === 'undefined') throw new Error('Excel okuyucu yüklenemedi (internet gerekli). Dosyayı CSV olarak kaydedip yükleyebilirsiniz.');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
    }

    /** Dosya başlıklarını tanımlı alanlara eşler (Türkçe karakter/büyük-küçük harf duyarsız, eş anlamlılar) */
    function mapHeaders(rows, cols) {
        const heads = rows.length ? Object.keys(rows[0]) : [];
        const map = {};
        cols.forEach((c) => {
            const names = [c.label, c.key, ...(c.aliases || [])].map(norm);
            const h = heads.find((x) => names.includes(norm(x)));
            if (h) map[c.key] = h;
        });
        return map;
    }

    // ---------------- Aktarım tipleri ----------------
    const TYPES = {
        items: {
            label: 'Malzeme Kartları', perm: 'editItem',
            desc: 'Yeni malzeme ekler veya mevcut kartın fiyat, para birimi, tedarik süresi, emniyet stoğu ve parti bilgisini günceller. Boş bırakılan alanlar değişmez.',
            cols: [
                { key: 'kod', label: 'Kod', req: true, aliases: ['malzeme kodu', 'stok kodu', 'malzemekod'] },
                { key: 'ad', label: 'Ad', aliases: ['malzeme adi', 'adi', 'aciklama', 'stok adi'] },
                { key: 'tur', label: 'Tür', aliases: ['tur', 'grup', 'malzeme turu'] },
                { key: 'unit', label: 'Birim', aliases: ['olcu birimi', 'br'] },
                { key: 'price', label: 'Birim Fiyat', aliases: ['fiyat', 'birim maliyet'] },
                { key: 'currency', label: 'Para Birimi', aliases: ['doviz', 'kur', 'pb'] },
                { key: 'procurement', label: 'Tedarik Tipi', aliases: ['tedarik'] },
                { key: 'leadTime', label: 'Tedarik Süresi (gün)', aliases: ['tedarik suresi', 'lt', 'temin suresi'] },
                { key: 'safetyStock', label: 'Emniyet Stoğu', aliases: ['emniyet', 'min stok', 'minimum stok'] },
                { key: 'lotPolicy', label: 'Parti Politikası', aliases: ['parti', 'lot politikasi'] },
                { key: 'lotSize', label: 'Parti Miktarı', aliases: ['parti miktari', 'moq', 'min siparis'] }
            ],
            sample: () => M.items().map((i) => ({ 'Kod': i.kod, 'Ad': i.ad, 'Tür': i.tur, 'Birim': i.unit, 'Birim Fiyat': i.price, 'Para Birimi': i.currency, 'Tedarik Tipi': M.PROCUREMENT[i.procurement], 'Tedarik Süresi (gün)': i.leadTime, 'Emniyet Stoğu': i.safetyStock, 'Parti Politikası': i.lotPolicy, 'Parti Miktarı': i.lotSize }))
        },
        products: {
            label: 'Ürünler (Mamul)', perm: 'editProduct',
            desc: 'Yeni mamul ekler veya mevcut mamulün adını, kategorisini ve kayıtlı (ERP) maliyetini günceller. Reçeteler ayrıca "Reçeteler" ile yüklenir.',
            cols: [
                { key: 'kod', label: 'Mamul Kodu', req: true, aliases: ['kod', 'urun kodu', 'mamul'] },
                { key: 'ad', label: 'Mamul Adı', aliases: ['ad', 'urun adi', 'adi'] },
                { key: 'kategori', label: 'Kategori', aliases: ['grup', 'urun grubu'] },
                { key: 'toplam', label: 'Kayıtlı Maliyet', aliases: ['maliyet', 'toplam maliyet', 'birim maliyet'] }
            ],
            sample: () => [{ 'Mamul Kodu': 'BG.ORNEK.001', 'Mamul Adı': 'ÖRNEK MASA 80*80*H75 ANTRASİT', 'Kategori': 'Masalar', 'Kayıtlı Maliyet': 2500 }]
        },
        bom: {
            label: 'Reçeteler (BOM)', perm: 'editProduct',
            desc: 'Her satır bir reçete satırıdır. Dosyada geçen her mamulün reçetesi dosyadaki satırlarla TAMAMEN değiştirilir. Bileşenler önceden tanımlı olmalıdır.',
            cols: [
                { key: 'parent', label: 'Mamul Kodu', req: true, aliases: ['ust kod', 'urun kodu', 'mamul'] },
                { key: 'kod', label: 'Bileşen Kodu', req: true, aliases: ['bilesen', 'alt kod', 'malzeme kodu', 'stok kodu'] },
                { key: 'k', label: 'Katsayı', req: true, aliases: ['miktar', 'kullanim miktari', 'katsayi'] }
            ],
            sample: () => M.bom('BG.212.A').map((l) => ({ 'Mamul Kodu': 'BG.212.A', 'Bileşen Kodu': l.kod, 'Katsayı': l.k }))
        },
        stock: {
            label: 'Stok Sayımı', perm: 'adjustStock',
            desc: 'Sayılan miktarı girin; sistem stoğu ile fark "Sayım Düzeltme" hareketi olarak işlenir. Lokasyon boşsa Merkez Depo kabul edilir.',
            cols: [
                { key: 'kod', label: 'Kod', req: true, aliases: ['malzeme kodu', 'stok kodu'] },
                { key: 'qty', label: 'Sayılan Miktar', req: true, aliases: ['miktar', 'sayim', 'stok'] },
                { key: 'loc', label: 'Lokasyon', aliases: ['depo', 'yer'] },
                { key: 'lot', label: 'Lot No', aliases: ['lot', 'parti no', 'parti'] }
            ],
            sample: () => M.items().filter((i) => i.procurement !== 'service').slice(0, 10).map((i) => ({ 'Kod': i.kod, 'Sayılan Miktar': M.onHand(i.kod, 'MERKEZ'), 'Lokasyon': 'Merkez Depo', 'Lot No': '' }))
        },
        mps: {
            label: 'Ana Üretim Planı', perm: 'runMRP',
            desc: 'Müşteri siparişleri veya tahminler. "Mevcut planı değiştir" seçilirse ana plan dosyadaki taleplerle yenilenir.',
            cols: [
                { key: 'kod', label: 'Mamul Kodu', req: true, aliases: ['kod', 'urun kodu', 'mamul'] },
                { key: 'qty', label: 'Miktar', req: true, aliases: ['adet', 'siparis miktari'] },
                { key: 'dueDate', label: 'Termin', req: true, aliases: ['termin tarihi', 'teslim tarihi', 'tarih'] },
                { key: 'note', label: 'Açıklama', aliases: ['not', 'musteri', 'siparis no'] }
            ],
            sample: () => S().mps.map((d) => ({ 'Mamul Kodu': d.kod, 'Miktar': d.qty, 'Termin': U.date(U.parseDate(d.dueDate)), 'Açıklama': d.note }))
        },
        pricelist: {
            label: 'Tedarikçi Fiyat Listesi', perm: 'manageSuppliers',
            desc: 'Tedarikçi tekliflerini ekler/günceller. Tedarikçi kodu (TED-001) veya firma adı kullanılabilir.',
            cols: [
                { key: 'supplier', label: 'Tedarikçi', req: true, aliases: ['tedarikci kodu', 'firma', 'firma adi'] },
                { key: 'kod', label: 'Malzeme Kodu', req: true, aliases: ['kod', 'stok kodu'] },
                { key: 'price', label: 'Fiyat', req: true, aliases: ['birim fiyat'] },
                { key: 'currency', label: 'Para Birimi', aliases: ['doviz', 'pb'] },
                { key: 'leadTime', label: 'Teslim Süresi (gün)', aliases: ['teslim suresi', 'lt'] },
                { key: 'moq', label: 'Min. Sipariş', aliases: ['moq', 'minimum siparis'] }
            ],
            sample: () => S().priceList.slice(0, 30).map((o) => ({ 'Tedarikçi': o.supplierId, 'Malzeme Kodu': o.kod, 'Fiyat': o.price, 'Para Birimi': o.currency, 'Teslim Süresi (gün)': o.leadTime, 'Min. Sipariş': o.moq }))
        }
    };

    // ---------------- Doğrulama: satırları işlemlere çevirir ----------------
    function validate(type, raw, opts) {
        const def = TYPES[type];
        const map = mapHeaders(raw, def.cols);
        const missing = def.cols.filter((c) => c.req && !map[c.key]).map((c) => c.label);
        if (missing.length) return { fatal: `Zorunlu sütun(lar) bulunamadı: ${missing.join(', ')}`, map };
        const rows = raw.map((r) => Object.fromEntries(Object.entries(map).map(([k, h]) => [k, r[h]])));
        const ops = [], errors = [], warnings = [];
        const err = (i, m) => errors.push({ row: i + 2, msg: m });
        const warn = (i, m) => warnings.push({ row: i + 2, msg: m });

        if (type === 'items') rows.forEach((r, i) => {
            const kod = str(r.kod).toUpperCase();
            if (!kod) return err(i, 'Kod boş');
            const ex = M.rawItem(kod);
            if (M.isProduct(kod)) return err(i, `${kod} bir mamul kodu — Ürünler aktarımını kullanın`);
            const ch = {};
            if (str(r.ad)) ch.ad = str(r.ad);
            if (str(r.tur)) { ch.tur = str(r.tur); if (!D.ITEM_TYPES.includes(ch.tur)) warn(i, `Bilinmeyen tür "${ch.tur}" — yeni tür olarak kaydedilecek`); }
            if (str(r.unit)) ch.unit = str(r.unit);
            const p = num(r.price); if (p !== null) { if (isNaN(p) || p < 0) return err(i, 'Geçersiz fiyat'); ch.price = p; }
            if (str(r.currency)) { ch.currency = str(r.currency).toUpperCase().replace('TL', 'TRY'); if (!D.CURRENCIES[ch.currency]) return err(i, `Geçersiz para birimi: ${r.currency}`); }
            if (str(r.procurement)) { ch.procurement = PROC[norm(r.procurement)]; if (!ch.procurement) return err(i, `Geçersiz tedarik tipi: ${r.procurement}`); }
            for (const k of ['leadTime', 'safetyStock', 'lotSize']) { const n = num(r[k]); if (n !== null) { if (isNaN(n) || n < 0) return err(i, `Geçersiz sayı: ${k}`); ch[k] = k === 'leadTime' ? Math.round(n) : n; } }
            if (str(r.lotPolicy)) { ch.lotPolicy = LOTP[norm(r.lotPolicy)] || str(r.lotPolicy).toUpperCase(); if (!M.LOT_POLICIES[ch.lotPolicy]) return err(i, `Geçersiz parti politikası: ${r.lotPolicy}`); }
            if (!ex && !ch.ad) return err(i, `${kod} yeni bir kalem — Ad zorunlu`);
            if (!Object.keys(ch).length) return warn(i, `${kod}: değişiklik yok`);
            ops.push({ kod, ch, isNew: !ex, label: `${kod} ${ex ? 'güncellenecek' : 'eklenecek'}` });
        });

        if (type === 'products') rows.forEach((r, i) => {
            const kod = str(r.kod).toUpperCase();
            if (!kod) return err(i, 'Mamul kodu boş');
            if (M.rawItem(kod)) return err(i, `${kod} bir malzeme kodu`);
            const ex = M.product(kod);
            const ch = {};
            if (str(r.ad)) ch.ad = str(r.ad);
            if (str(r.kategori)) { const c = D.CATEGORIES.find((x) => norm(x) === norm(r.kategori)); if (!c) return err(i, `Bilinmeyen kategori: ${r.kategori}`); ch.kategori = c; }
            const t = num(r.toplam); if (t !== null) { if (isNaN(t) || t < 0) return err(i, 'Geçersiz maliyet'); ch.toplam = t; }
            if (!ex && (!ch.ad || !ch.kategori)) return err(i, `${kod} yeni mamul — Ad ve Kategori zorunlu`);
            ops.push({ kod, ch, isNew: !ex, custom: ex && ex.custom, label: `${kod} ${ex ? 'güncellenecek' : 'eklenecek'}` });
        });

        if (type === 'bom') {
            const groups = {};
            rows.forEach((r, i) => {
                const parent = str(r.parent).toUpperCase(), kod = str(r.kod).toUpperCase(), k = num(r.k);
                if (!parent || !kod) return err(i, 'Mamul veya bileşen kodu boş');
                const pIt = M.item(parent);
                if (!pIt || (pIt.procurement !== 'make' && !pIt.isProduct)) return err(i, `${parent} mamul veya yarı mamul değil`);
                if (!M.item(kod)) return err(i, `Bileşen tanımsız: ${kod} (önce Malzeme Kartları ile ekleyin)`);
                if (kod === parent) return err(i, 'Kalem kendi bileşeni olamaz');
                if (k === null || isNaN(k) || k <= 0) return err(i, 'Katsayı sıfırdan büyük olmalı');
                const g = groups[parent] = groups[parent] || [];
                const dup = g.find((l) => l.kod === kod);
                if (dup) { dup.k += k; warn(i, `${parent} / ${kod} tekrar ediyor — katsayılar toplandı`); } else g.push({ kod, k });
            });
            // Döngü kontrolü (yeni reçetelerle birlikte)
            const bomOf = (k) => groups[k] || M.bom(k);
            const cyc = (k, seen) => { if (seen.has(k)) return true; seen.add(k); const r = bomOf(k).some((l) => cyc(l.kod, seen)); seen.delete(k); return r; };
            Object.entries(groups).forEach(([parent, lines]) => {
                if (cyc(parent, new Set())) errors.push({ row: '-', msg: `${parent}: döngüsel reçete oluşuyor` });
                else ops.push({ parent, lines, label: `${parent}: ${lines.length} satırlık reçete (${M.bom(parent).length} → ${lines.length})` });
            });
        }

        if (type === 'stock') rows.forEach((r, i) => {
            const kod = str(r.kod).toUpperCase();
            const it = M.item(kod);
            if (!it) return err(i, `Tanımsız kod: ${kod}`);
            if (it.procurement === 'service') return err(i, `${kod} stoksuz (fason/hizmet) kalem`);
            const qty = num(r.qty);
            if (qty === null || isNaN(qty) || qty < 0) return err(i, 'Geçersiz sayılan miktar');
            const loc = str(r.loc) ? (LOCS[norm(r.loc)] || (M.LOCATIONS[str(r.loc).toUpperCase()] ? str(r.loc).toUpperCase() : null)) : 'MERKEZ';
            if (!loc) return err(i, `Bilinmeyen lokasyon: ${r.loc}`);
            const cur = M.onHand(kod, loc);
            const diff = U.round(qty - cur, 4);
            if (Math.abs(diff) < 1e-9) return;
            ops.push({ kod, loc, diff, lot: str(r.lot), label: `${kod} @ ${M.LOCATIONS[loc].ad}: ${U.qty(cur)} → ${U.qty(qty)} (${diff > 0 ? '+' : ''}${U.qty(diff)})` });
        });

        if (type === 'mps') rows.forEach((r, i) => {
            const kod = str(r.kod).toUpperCase();
            if (!M.product(kod)) return err(i, `Tanımsız mamul: ${kod}`);
            const qty = num(r.qty);
            if (qty === null || isNaN(qty) || qty <= 0) return err(i, 'Geçersiz miktar');
            const dueDate = date(r.dueDate);
            if (!dueDate) return err(i, `Geçersiz termin: ${r.dueDate}`);
            if (dueDate < U.iso(U.today())) warn(i, `${kod}: termin geçmiş (${dueDate})`);
            ops.push({ kod, qty: Math.round(qty), dueDate, note: str(r.note), label: `${kod} × ${Math.round(qty)} — ${U.date(U.parseDate(dueDate))}` });
        });

        if (type === 'pricelist') rows.forEach((r, i) => {
            const s = str(r.supplier);
            const sup = S().suppliers.find((x) => x.id.toUpperCase() === s.toUpperCase() || norm(x.ad) === norm(s));
            if (!sup) return err(i, `Tanımsız tedarikçi: ${s}`);
            const kod = str(r.kod).toUpperCase();
            const it = M.rawItem(kod);
            if (!it) return err(i, `Tanımsız malzeme: ${kod}`);
            const price = num(r.price);
            if (price === null || isNaN(price) || price <= 0) return err(i, 'Geçersiz fiyat');
            const currency = str(r.currency) ? str(r.currency).toUpperCase().replace('TL', 'TRY') : it.currency;
            if (!D.CURRENCIES[currency]) return err(i, `Geçersiz para birimi: ${r.currency}`);
            const lt = num(r.leadTime), moq = num(r.moq);
            ops.push({ supplierId: sup.id, kod, price, currency, leadTime: lt && lt > 0 ? Math.round(lt) : it.leadTime, moq: moq && moq > 0 ? moq : 0,
                label: `${sup.ad} · ${kod}: ${M.fmtMoney(price, currency)}${M.offer(sup.id, kod) ? ' (güncelleme)' : ''}` });
        });

        return { ops, errors, warnings, map, total: raw.length, opts };
    }

    // ---------------- Uygulama ----------------
    function apply(type, res) {
        const st = S();
        const ops = res.ops;
        if (type === 'items') ops.forEach((o) => {
            if (o.isNew) {
                const tur = o.ch.tur || 'Diğer Hammadde';
                st.customItems[o.kod] = { kod: o.kod, ad: o.ch.ad, tur, unit: D.UNIT_BY_TYPE[tur] || 'ad', price: 0, currency: 'TRY', procurement: tur === 'Fason İşçilik' ? 'service' : 'buy', leadTime: 7, safetyStock: 0, lotPolicy: 'L4L', lotSize: 0, ...o.ch };
            } else if (st.customItems[o.kod]) Object.assign(st.customItems[o.kod], o.ch);
            else st.itemOverrides[o.kod] = { ...(st.itemOverrides[o.kod] || {}), ...o.ch };
        });
        if (type === 'products') ops.forEach((o) => {
            if (o.isNew) st.customProducts.push({ kod: o.kod, ad: o.ch.ad, kategori: o.ch.kategori, bilesen: 0, fason: 0, hammadde: o.ch.toplam || 0, iroko: 0, toplam: o.ch.toplam || 0, createdAt: new Date().toISOString() });
            else if (o.custom) Object.assign(st.customProducts.find((p) => p.kod === o.kod), o.ch);
            else st.productOverrides[o.kod] = { ...(st.productOverrides[o.kod] || {}), ...o.ch };
        });
        if (type === 'bom') ops.forEach((o) => {
            st.customBoms[o.parent] = o.lines;
            const cp = st.customProducts.find((p) => p.kod === o.parent);
            if (cp) cp.bilesen = o.lines.length;
        });
        if (type === 'stock') ops.forEach((o) => M.move({ kod: o.kod, qty: o.diff, type: 'ADJ', loc: o.loc, lot: o.diff > 0 ? (o.lot || 'SAYIM-' + U.iso(new Date())) : '', ref: 'EXCEL-SAYIM', note: 'Excel ile sayım aktarımı' }));
        if (type === 'mps') {
            if (res.opts.replace) st.mps = [];
            ops.forEach((o) => st.mps.push({ id: MRP.store.nextNo('MPS'), kod: o.kod, qty: o.qty, dueDate: o.dueDate, note: o.note || 'Excel aktarımı' }));
        }
        if (type === 'pricelist') ops.forEach((o) => {
            const ex = M.offer(o.supplierId, o.kod);
            const rec = { supplierId: o.supplierId, kod: o.kod, price: o.price, currency: o.currency, leadTime: o.leadTime, moq: o.moq, updatedAt: new Date().toISOString() };
            if (ex) Object.assign(ex, rec); else st.priceList.push(rec);
        });
        MRP.store.audit(`Excel aktarımı: ${TYPES[type].label}`, `${iState.fileName} — ${ops.length} işlem, ${res.errors.length} hatalı satır atlandı`);
    }

    // ---------------- Şablon ----------------
    function template(type) {
        const def = TYPES[type];
        let rows = def.sample();
        if (!rows.length) rows = [Object.fromEntries(def.cols.map((c) => [c.label, '']))];
        const name = `MRP_Sablon_${def.label.replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]+/g, '_')}`;
        if (typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(rows, { header: def.cols.map((c) => c.label) });
            ws['!cols'] = def.cols.map((c) => ({ wch: Math.max(14, c.label.length + 4) }));
            XLSX.utils.book_append_sheet(wb, ws, 'Veri');
            const info = [['Sütun', 'Zorunlu', 'Açıklama'], ...def.cols.map((c) => [c.label, c.req ? 'Evet' : '', c.key === 'currency' ? 'TRY / USD / EUR / GBP' : c.key === 'procurement' ? 'Satın Alma / Üretim / Fason' : c.key === 'lotPolicy' ? 'L4L / FOQ / MIN' : c.key === 'loc' ? 'Merkez Depo / Fabrika / Fasoncu' : c.key === 'kategori' ? D.CATEGORIES.join(', ') : c.key === 'tur' ? D.ITEM_TYPES.join(', ') : ''])];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Açıklama');
            XLSX.writeFile(wb, name + '.xlsx');
        } else {
            const headers = def.cols.map((c) => c.label);
            U.download(new Blob([U.toCSV(headers, rows.map((r) => headers.map((h) => r[h] ?? '')))], { type: 'text/csv;charset=utf-8' }), name + '.csv');
        }
    }

    // ---------------- Görünüm ----------------
    const iState = { type: 'items', fileName: '', result: null, replace: false };

    MRP.views.import = {
        title: 'Veri Aktarımı',
        subtitle: 'Excel veya CSV ile malzeme, ürün, reçete, stok, ana plan ve fiyat listesi yükleyin',
        render() {
            const def = TYPES[iState.type];
            const allowed = MRP.auth.can(def.perm);
            const tabs = Object.entries(TYPES).filter(([, t]) => MRP.auth.can(t.perm)).map(([k, t]) => [k, t.label, null]);
            if (!tabs.length) return H.empty('Yetkiniz olan aktarım tipi yok');
            if (!allowed) { iState.type = tabs[0][0]; return this.render(); }
            let html = H.tabs(tabs, iState.type, 'impType');
            html += `<div class="grid grid-2">
                ${H.card(`1. Şablonu indirin — ${def.label}`, '', `<div class="card-body"><p style="font-size:.88em;margin-bottom:12px;">${esc(def.desc)}</p>
                    <div class="table-wrap"><table><thead><tr><th>Sütun</th><th>Zorunlu</th><th>Alternatif başlıklar</th></tr></thead><tbody>
                    ${def.cols.map((c) => `<tr><td class="strong">${esc(c.label)}</td><td>${c.req ? '<span class="badge badge-red plain">Zorunlu</span>' : ''}</td><td class="muted" style="font-size:.85em;">${esc((c.aliases || []).join(', '))}</td></tr>`).join('')}</tbody></table></div>
                    <button class="btn btn-secondary" data-act="impTemplate" style="margin-top:12px;">${MRP.icon('download')} Şablonu indir${iState.type === 'items' || iState.type === 'pricelist' || iState.type === 'mps' ? ' (mevcut verilerle)' : ''}</button></div>`)}
                ${H.card('2. Dosyayı yükleyin', '.xlsx, .xls veya .csv (; veya , ayraçlı)', `<div class="card-body">
                    <label class="btn btn-primary" style="cursor:pointer;">${MRP.icon('download')} Dosya seç<input type="file" id="impFile" accept=".xlsx,.xls,.csv,.txt" hidden data-change="impFile"></label>
                    ${iState.type === 'mps' ? `<label class="check-chip" style="margin-left:8px;"><input type="checkbox" data-change="impReplace" ${iState.replace ? 'checked' : ''}> Mevcut planı değiştir</label>` : ''}
                    <p class="muted" style="font-size:.8em;margin-top:12px;">İlk sayfa okunur. Sütun başlıkları Türkçe karakter ve büyük/küçük harf duyarsız eşleştirilir; ERP çıktınızdaki başlıklar alternatiflerden biriyse doğrudan yükleyebilirsiniz. Sayılar 1.234,56 veya 1234.56 biçiminde olabilir.</p>
                    ${iState.fileName ? `<p style="margin-top:10px;font-size:.88em;">Yüklenen: <b>${esc(iState.fileName)}</b></p>` : ''}
                </div>`)}
            </div>`;

            const r = iState.result;
            if (r) {
                html += '<div style="height:16px;"></div>';
                if (r.fatal) html += H.banner('red', 'alert', 'Dosya okunamadı', r.fatal);
                else {
                    html += `<div class="kpis">${H.kpi('Okunan satır', r.total, iState.fileName, 'blue')}${H.kpi('Uygulanacak işlem', r.ops.length, '', 'green')}
                        ${H.kpi('Hatalı satır', r.errors.length, r.errors.length ? 'Atlanacak' : 'Yok', r.errors.length ? 'red' : 'green')}${H.kpi('Uyarı', r.warnings.length, '', r.warnings.length ? 'violet' : '')}</div>`;
                    html += H.card('3. Önizleme ve onay', `Eşleşen sütunlar: ${Object.entries(r.map).map(([k, h]) => `${h}`).join(', ')}`, `
                        ${r.errors.length ? `<div class="card-body" style="padding-bottom:0;"><h3 style="font-size:.88em;color:var(--red);margin-bottom:6px;">Hatalar</h3></div><div class="table-wrap" style="max-height:200px;"><table><thead><tr><th>Satır</th><th>Hata</th></tr></thead><tbody>
                            ${r.errors.slice(0, 100).map((e) => `<tr class="r-crit"><td class="num">${e.row}</td><td>${esc(e.msg)}</td></tr>`).join('')}</tbody></table></div>` : ''}
                        ${r.warnings.length ? `<div class="card-body" style="padding-bottom:0;"><h3 style="font-size:.88em;color:var(--amber);margin-bottom:6px;">Uyarılar</h3></div><div class="table-wrap" style="max-height:160px;"><table><tbody>
                            ${r.warnings.slice(0, 100).map((e) => `<tr class="r-warn"><td class="num" style="width:70px;">${e.row}</td><td>${esc(e.msg)}</td></tr>`).join('')}</tbody></table></div>` : ''}
                        <div class="card-body" style="padding-bottom:0;"><h3 style="font-size:.88em;margin-bottom:6px;">Yapılacak işlemler (ilk 200)</h3></div>
                        <div class="table-wrap" style="max-height:300px;"><table><tbody>${r.ops.slice(0, 200).map((o, i) => `<tr><td class="num" style="width:50px;">${i + 1}</td><td>${esc(o.label)}</td></tr>`).join('') || `<tr><td>${H.empty('Uygulanacak işlem yok')}</td></tr>`}</tbody></table></div>`,
                        `<div style="display:flex;gap:8px;"><button class="btn btn-ghost" data-act="impCancel">Vazgeç</button><button class="btn btn-success" data-act="impApply" ${r.ops.length ? '' : 'disabled'}>${MRP.icon('check')} ${r.ops.length} işlemi içe aktar</button></div>`);
                }
            }

            if (MRP.auth.can('resetData')) {
                html += '<div style="height:16px;"></div>' + H.card('Yedekten geri yükle', 'Raporlar ekranından alınan JSON yedeği', `<div class="card-body"><label class="btn btn-secondary" style="cursor:pointer;">${MRP.icon('refresh')} Yedek dosyası seç (.json)<input type="file" accept=".json" hidden data-change="impRestore"></label>
                    <span class="muted" style="font-size:.8em;margin-left:8px;">Mevcut tüm veriler yedektekilerle değiştirilir.</span></div>`);
            }
            return html;
        }
    };

    Object.assign(MRP.actions, {
        impType: (t) => { iState.type = t; iState.result = null; iState.fileName = ''; app().render(); },
        impTemplate: () => template(iState.type),
        impReplace: (_, el) => { iState.replace = el.checked; if (iState.result && !iState.result.fatal) iState.result.opts = { replace: el.checked }; },
        impFile: async (_, el) => {
            const f = el.files && el.files[0];
            if (!f) return;
            iState.fileName = f.name;
            try {
                const rows = await readFile(f);
                if (!rows.length) throw new Error('Dosyada veri satırı yok.');
                iState.result = validate(iState.type, rows, { replace: iState.replace });
            } catch (e) {
                iState.result = { fatal: e.message };
            }
            app().render();
        },
        impCancel: () => { iState.result = null; iState.fileName = ''; app().render(); },
        impApply: async () => {
            const def = TYPES[iState.type];
            if (!H.guard(def.perm)) return;
            const r = iState.result;
            const extra = iState.type === 'mps' && r.opts.replace ? ' Mevcut ana plan silinecek.' : '';
            if (!(await UI.confirm(`${r.ops.length} işlem uygulanacak${r.errors.length ? `, ${r.errors.length} hatalı satır atlanacak` : ''}.${extra}`, { title: `${def.label} — içe aktar`, okLabel: 'İçe aktar' }))) return;
            apply(iState.type, r);
            const n = r.ops.length;
            iState.result = null; iState.fileName = '';
            app().commit();
            UI.toast('Aktarım tamamlandı', `${def.label}: ${n} işlem`, 'success');
        },
        impRestore: async (_, el) => {
            const f = el.files && el.files[0];
            if (!f || !H.guard('resetData')) return;
            if (!(await UI.confirm(`Tüm veriler "${f.name}" yedeğindekilerle değiştirilecek.`, { title: 'Yedekten geri yükle', okLabel: 'Geri yükle', danger: true }))) return;
            try {
                MRP.store.restore(JSON.parse(await f.text()));
                MRP.model.init();
                MRP.store.audit('Yedekten geri yüklendi', f.name);
                MRP.store.save();
                app().render();
                UI.toast('Yedek geri yüklendi', f.name, 'success');
            } catch (e) { UI.toast('Yedek okunamadı', e.message, 'error'); }
        }
    });
    MRP.importer = { validate, parseCSV, num, date };
})(window.MRP);
