/* ==========================================================================
   MRP Pro — Sistem: Raporlar / dışa aktarım ve denetim kaydı
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, M = MRP.model;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const stamp = () => U.iso(new Date());

    const REPORTS = [
        { id: 'csvProducts', icon: 'doc', title: 'Ürün listesi (CSV)', desc: 'Tüm mamuller; kayıtlı ve BOM maliyetleri. Excel ile açılabilir (noktalı virgül ayraçlı, UTF-8).' },
        { id: 'xlsxFull', icon: 'chart', title: 'Tam rapor (Excel)', desc: 'Ürünler, malzeme kartları, stok, MRP önerileri, talepler, siparişler, iş emirleri, hareketler ve tedarikçiler.' },
        { id: 'xlsxMrp', icon: 'calc', title: 'MRP önerileri (Excel)', desc: 'Son MRP çalıştırmasının planlı siparişleri ve istisna mesajları.' },
        { id: 'pdfSummary', icon: 'print', title: 'Yönetim özeti (PDF)', desc: 'KPI\'lar, kritik stoklar, açık siparişler ve MRP özeti.' }
    ];

    MRP.views.reports = {
        title: 'Raporlar & Dışa Aktarım',
        subtitle: 'Verileri Excel, CSV veya PDF olarak indirin',
        render() {
            let html = `<div class="grid grid-3">${REPORTS.map((r) => `<section class="card card-body" style="display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;gap:10px;align-items:center;">${MRP.icon(r.icon)}<h2 style="font-size:.98em;">${esc(r.title)}</h2></div>
                <p class="muted" style="font-size:.85em;flex:1;">${esc(r.desc)}</p>
                <button class="btn btn-secondary" data-act="${r.id}">${MRP.icon('download')} İndir</button></section>`).join('')}</div>`;
            if (MRP.auth.can('resetData')) {
                html += `<div style="height:20px;"></div>${H.card('Veri yönetimi', 'Yalnızca yönetici', `<div class="card-body" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <p class="muted" style="flex:1;min-width:240px;font-size:.85em;">Tüm hareketler, talepler, siparişler, iş emirleri ve özel ürünler silinir; demo veriler yeniden yüklenir. Bu işlem geri alınamaz.</p>
                    <button class="btn btn-secondary" data-act="backupJson">${MRP.icon('download')} Yedek al (JSON)</button>
                    <button class="btn btn-danger" data-act="resetData">${MRP.icon('refresh')} Demo verilerine sıfırla</button></div>`)}`;
            }
            return html;
        }
    };

    const needXLSX = () => {
        if (typeof XLSX !== 'undefined') return true;
        UI.toast('Excel kütüphanesi yüklenemedi', 'İnternet bağlantınızı kontrol edin.', 'error');
        return false;
    };

    function sheet(wb, name, rows) {
        if (!rows.length) rows = [{ Bilgi: 'Kayıt yok' }];
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map((k) => ({ wch: Math.min(48, Math.max(10, k.length + 2, ...rows.slice(0, 200).map((r) => String(r[k] ?? '').length))) }));
        XLSX.utils.book_append_sheet(wb, ws, name);
    }

    function plannedRows(run) {
        return run ? run.planned.map((p) => ({
            'Öneri': p.id, 'Kod': p.kod, 'Kalem': p.ad, 'Tip': p.type === 'production' ? 'Üretim' : p.service ? 'Fason' : 'Satın alma',
            'Net ihtiyaç': p.shortage, 'Sipariş miktarı': p.qty, 'Birim': p.unit, 'Salım': p.release, 'İhtiyaç': p.due,
            'LT (gün)': p.leadTime, 'Tutar': +(p.qty * (p.type === 'production' ? M.unitCost(p.kod) : p.price)).toFixed(2), 'Gecikmiş': p.late ? 'EVET' : '', 'Neden': p.reason
        })) : [];
    }

    Object.assign(MRP.actions, {
        csvProducts: () => {
            const rows = M.products().map((p) => [p.kod, p.ad, p.kategori, M.bom(p.kod).length, p.fason, p.hammadde, p.iroko, p.toplam, U.round(M.materialCost(p.kod), 2), U.round(M.unitCost(p.kod), 2), M.onHand(p.kod), p.custom ? 'EVET' : 'HAYIR']);
            const csv = U.toCSV(['Mamul Kodu', 'Mamul Adı', 'Kategori', 'Bileşen', 'Fason', 'Hammadde', 'İroko', 'Kayıtlı Maliyet', 'BOM Malzeme', 'Standart Maliyet', 'Stok', 'Özel'], rows);
            U.download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `MRP_Urunler_${stamp()}.csv`);
            UI.toast('CSV indirildi', `${rows.length} ürün`, 'success');
        },
        xlsxFull: () => {
            if (!needXLSX()) return;
            const st = S();
            const wb = XLSX.utils.book_new();
            sheet(wb, 'Ürünler', M.products().map((p) => { const c = M.costParts(p.kod); return { 'Kod': p.kod, 'Ad': p.ad, 'Kategori': p.kategori, 'Kayıtlı Maliyet': p.toplam, 'BOM Malzeme': U.round(c.material, 2), 'İşçilik': U.round(c.labor, 2), 'Standart Maliyet': U.round(M.unitCost(p.kod), 2), 'Stok': M.onHand(p.kod) }; }));
            sheet(wb, 'Malzeme Kartları', M.items().map((i) => ({ 'Kod': i.kod, 'Ad': i.ad, 'Tür': i.tur, 'Birim': i.unit, 'Tedarik': M.PROCUREMENT[i.procurement], 'Fiyat': i.price, 'Para Birimi': i.currency, 'Birim Maliyet ₺': U.round(i.procurement === 'make' ? M.unitCost(i.kod) : M.priceTRY(i.kod), 4), 'LT (gün)': i.leadTime, 'Emniyet Stoğu': i.safetyStock, 'Parti Politikası': i.lotPolicy, 'Parti Miktarı': i.lotSize })));
            sheet(wb, 'Stok', M.items().filter((i) => i.procurement !== 'service').map((i) => ({ 'Kod': i.kod, 'Ad': i.ad, 'Eldeki': M.onHand(i.kod), 'Emniyet': i.safetyStock, 'Siparişte': M.onOrder(i.kod), 'Merkez': M.onHand(i.kod, 'MERKEZ'), 'Fabrika': M.onHand(i.kod, 'FABRIKA'), 'Fason': M.onHand(i.kod, 'FASON'), 'Durum': M.stockStatus(i.kod), 'Değer': U.round(M.onHand(i.kod) * (i.procurement === 'make' ? M.unitCost(i.kod) : M.priceTRY(i.kod)), 2) })));
            sheet(wb, 'MRP Önerileri', plannedRows(st.lastRun));
            sheet(wb, 'Talepler', st.requests.map((r) => ({ 'No': r.no, 'Durum': H.REQ_STATUS[r.status][1], 'Öncelik': H.PRIORITY[r.priority][1], 'Kalem': r.lines.length, 'Tutar': U.round(r.total, 2), 'Talep Eden': r.createdByName, 'Tarih': U.dateTime(r.createdAt), 'Sipariş': r.poNo || '' })));
            sheet(wb, 'Siparişler', st.pos.map((p) => ({ 'No': p.no, 'Tedarikçi': p.supplierName, 'Talep': p.requestNo, 'Teslim': p.deliveryDate, 'Durum': H.PO_STATUS[p.status][1], 'Genel Toplam': U.round(MRP.purchasing.poTotals(p).grand, 2), 'Oluşturan': p.createdBy })));
            sheet(wb, 'İş Emirleri', st.workOrders.map((w) => ({ 'No': w.no, 'Kod': w.kod, 'Ad': w.ad, 'Miktar': w.qty, 'Başlangıç': w.start, 'Bitiş': w.end, 'Durum': H.WO_STATUS[w.status][1] })));
            sheet(wb, 'Hareketler', st.movements.map((m) => ({ 'No': m.id, 'Tarih': U.dateTime(m.at), 'Kod': m.kod, 'Tür': M.MOVE_TYPES[m.type].label, 'Miktar': m.qty, 'Bakiye': m.balance, 'Değer': U.round(m.value, 2), 'Belge': m.ref, 'Kullanıcı': m.user, 'Not': m.note })));
            sheet(wb, 'Lotlar', st.lots.map((l) => ({ 'Lot': l.lot, 'Kod': l.kod, 'Lokasyon': (M.LOCATIONS[l.loc] || {}).ad || l.loc, 'Miktar': l.qty, 'Giriş': U.dateTime(l.at), 'Tedarikçi': l.supplier, 'Belge': l.ref })));
            sheet(wb, 'Fiyat Listesi', st.priceList.map((o) => ({ 'Tedarikçi': o.supplierId, 'Kod': o.kod, 'Fiyat': o.price, 'Para Birimi': o.currency, 'TL': U.round(M.toTRY(o.price, o.currency), 4), 'Teslim (gün)': o.leadTime, 'Min. Sipariş': o.moq })));
            sheet(wb, 'Kurlar', [{ 'Tarih': st.fx.updatedAt ? U.dateTime(st.fx.updatedAt) : 'Varsayılan', 'Kaynak': st.fx.source, ...st.fx.rates }]);
            sheet(wb, 'Tedarikçiler', st.suppliers.map((s) => ({ 'Kod': s.id, 'Firma': s.ad, 'Yetkili': s.yetkili, 'Telefon': s.tel, 'E-posta': s.email, 'Vade': s.vade, 'Puan': s.puan, 'Kategoriler': s.kategoriler.join(', '), 'Aktif': s.aktif ? 'EVET' : 'HAYIR' })));
            XLSX.writeFile(wb, `MRP_Rapor_${stamp()}.xlsx`);
            UI.toast('Excel raporu indirildi', '', 'success');
        },
        xlsxMrp: () => {
            const run = S().lastRun;
            if (!run) return UI.toast('MRP sonucu yok', 'Önce MRP çalıştırılmalı.', 'warn');
            if (!needXLSX()) return;
            const wb = XLSX.utils.book_new();
            sheet(wb, 'Planlı Siparişler', plannedRows(run));
            sheet(wb, 'İstisnalar', run.exceptions.map((e) => ({ 'Önem': { critical: 'Kritik', warn: 'Uyarı', info: 'Bilgi' }[e.sev], 'Kod': e.kod, 'Mesaj': e.msg })));
            sheet(wb, 'Ana Plan', S().mps.map((d) => ({ 'No': d.id, 'Mamul': d.kod, 'Miktar': d.qty, 'Termin': d.dueDate, 'Açıklama': d.note })));
            XLSX.writeFile(wb, `MRP_Oneriler_${stamp()}.xlsx`);
            UI.toast('MRP önerileri indirildi', '', 'success');
        },
        pdfSummary: () => {
            if (!window.jspdf) return UI.toast('PDF kütüphanesi yüklenemedi', 'İnternet bağlantınızı kontrol edin.', 'error');
            const T = U.pdfText;
            const st = S();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
            doc.setFillColor(17, 23, 41); doc.rect(0, 0, pw, 30, 'F');
            doc.setTextColor(245, 158, 11); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('MRP Pro', 14, 14);
            doc.setTextColor(230, 233, 242); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            doc.text(T(`Yönetim Özeti · ${U.dateTime(new Date())} · ${MRP.auth.current().name}`), 14, 22);
            const items = M.items().filter((i) => i.procurement !== 'service');
            const crit = items.filter((i) => M.stockStatus(i.kod) === 'critical');
            const run = st.lastRun;
            const openPOs = st.pos.filter((p) => p.status === 'open' || p.status === 'partial');
            doc.autoTable({
                startY: 38, theme: 'plain', styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
                body: [
                    ['Mamul sayısı', M.products().length.toLocaleString('tr-TR')],
                    ['Malzeme kartı', String(M.items().length)],
                    ['Stok değeri', U.cur(M.stockValue())],
                    ['Döviz kurları', `${Object.entries(st.fx.rates).map(([c, r]) => `${c} ${U.num(r, 4)}`).join(' · ')} (${st.fx.source})`],
                    ['Kritik stok', String(crit.length)],
                    ['Onay bekleyen talep', String(st.requests.filter((r) => r.status === 'pending').length)],
                    ['Açık sipariş', `${openPOs.length} · ${U.cur(U.sum(openPOs, (p) => MRP.purchasing.poTotals(p).grand))}`],
                    ['Aktif iş emri', String(st.workOrders.filter((w) => w.status === 'planned' || w.status === 'released').length)],
                    ['Son MRP', run ? `${U.dateTime(run.runAt)} · ${run.planned.length} öneri · ${run.summary.late} geç salım` : 'Çalıştırılmadı']
                ].map((r) => r.map(T))
            });
            const section = (title, head, body, color) => {
                let y = doc.lastAutoTable.finalY + 10;
                if (y > ph - 40) { doc.addPage(); y = 20; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(23, 32, 51); doc.text(T(title), 14, y);
                doc.autoTable({ startY: y + 3, head: [head.map(T)], body: body.length ? body.map((r) => r.map((c) => T(c))) : [[T('Kayıt yok')]], theme: 'grid',
                    headStyles: { fillColor: color, fontSize: 8 }, bodyStyles: { fontSize: 7.5 }, margin: { left: 14, right: 14 } });
            };
            section('Kritik stoklar', ['Kod', 'Malzeme', 'Eldeki', 'Emniyet', 'Siparişte'],
                crit.map((i) => [i.kod, i.ad.slice(0, 40), U.qty(M.onHand(i.kod), i.unit), U.qty(i.safetyStock, i.unit), U.qty(M.onOrder(i.kod), i.unit)]), [239, 68, 68]);
            section('Açık satın alma siparişleri', ['No', 'Tedarikçi', 'Teslim', 'Tutar', 'Durum'],
                openPOs.map((p) => [p.no, p.supplierName, U.date(U.parseDate(p.deliveryDate)), U.cur(MRP.purchasing.poTotals(p).grand), H.PO_STATUS[p.status][1]]), [16, 185, 129]);
            if (run) section('MRP istisnaları (ilk 25)', ['Önem', 'Kod', 'Mesaj'],
                run.exceptions.slice(0, 25).map((e) => [{ critical: 'Kritik', warn: 'Uyarı', info: 'Bilgi' }[e.sev], e.kod, e.msg]), [245, 158, 11]);
            const n = doc.internal.getNumberOfPages();
            for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(140); doc.text(`Sayfa ${i} / ${n}`, pw - 30, ph - 8); }
            doc.save(`MRP_Yonetim_Ozeti_${stamp()}.pdf`);
            UI.toast('PDF indirildi', '', 'success');
        },
        backupJson: () => {
            U.download(new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' }), `MRP_Yedek_${stamp()}.json`);
        },
        resetData: async () => {
            if (!H.guard('resetData')) return;
            if (!(await UI.confirm('Tüm işlem verileri silinecek ve demo verileri yeniden yüklenecek. Devam edilsin mi?', { title: 'Verileri sıfırla', okLabel: 'Sıfırla', danger: true }))) return;
            MRP.store.reset();
            MRP.model.init();
            MRP.store.audit('Veriler sıfırlandı', '');
            MRP.store.save();
            MRP.app.render();
            UI.toast('Veriler sıfırlandı', 'Demo verileri yüklendi.', 'info');
        }
    });

    // =====================================================================
    // DENETİM KAYDI
    // =====================================================================
    const auState = { q: '' };
    MRP.views.audit = {
        title: 'Denetim Kaydı',
        subtitle: 'Kim, ne zaman, ne yaptı — tüm kritik işlemlerin izi',
        render() {
            const q = auState.q.toLocaleLowerCase('tr');
            const list = S().audit.slice().reverse().filter((a) => !q || `${a.user} ${a.action} ${a.detail}`.toLocaleLowerCase('tr').includes(q)).slice(0, 500);
            return `<div class="toolbar"><input class="input" id="auSearch" placeholder="Kullanıcı, işlem veya detay ara…" value="${esc(auState.q)}" data-input="auSearch"></div>
                <section class="card"><div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Kullanıcı</th><th>Rol</th><th>İşlem</th><th>Detay</th></tr></thead><tbody>
                ${list.map((a) => `<tr><td class="nowrap">${esc(U.dateTime(a.at))}</td><td class="strong">${esc(a.user)}</td><td>${esc(a.role)}</td><td>${esc(a.action)}</td><td class="muted">${esc(a.detail)}</td></tr>`).join('')
                    || `<tr><td colspan="5">${H.empty('Kayıt yok')}</td></tr>`}</tbody></table></div></section>`;
        },
        after() {
            const el = document.getElementById('auSearch');
            if (el && auState.q) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }
    };
    const rerender = U.debounce(() => MRP.app.render(), 250);
    MRP.actions.auSearch = (v) => { auState.q = v; rerender(); };
})(window.MRP);
