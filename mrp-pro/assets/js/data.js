/* ==========================================================================
   MRP Pro — Ana veriler (ürünler, reçete şablonları, malzeme kartı varsayılanları)
   ========================================================================== */
(function (MRP) {
    'use strict';

    const CATEGORIES = ['Masalar', 'Sandalyeler', 'Şezlonglar', 'Sehpalar', 'Koltuk ve Berjerler', 'Bank ve Puflar', 'Köşe ve Oturma Grupları', 'Yedek Parça ve Diğer'];

    const CATEGORY_STYLE = {
        'Masalar': { color: '#3b82f6', lead: 6 },
        'Sandalyeler': { color: '#10b981', lead: 4 },
        'Şezlonglar': { color: '#ec4899', lead: 4 },
        'Sehpalar': { color: '#f59e0b', lead: 5 },
        'Koltuk ve Berjerler': { color: '#8b5cf6', lead: 6 },
        'Bank ve Puflar': { color: '#06b6d4', lead: 4 },
        'Köşe ve Oturma Grupları': { color: '#f97316', lead: 8 },
        'Yedek Parça ve Diğer': { color: '#64748b', lead: 3 }
    };

    // Kayıtlı mamül maliyetleri (ERP'den alınan referans değerler)
    const BASE_PRODUCTS = [
        ['BG.150.A', 'LOFT MASA 100*200*H75 COMPACT ANTRASİT', 'Masalar', 18, 1.86, 5890.72, 169.86, 5748.64],
        ['BG.150.B', 'LOFT MASA 100*200*H75 COMPACT BEYAZ', 'Masalar', 18, 1.86, 5889.09, 169.86, 5747.01],
        ['BG.150.C', 'LOFT MASA 100*200*H75 COMPACT CAPPUCINO', 'Masalar', 18, 1.86, 5883.73, 169.86, 5741.65],
        ['BG.150.S.A', 'LOFT MASA 100*200*H75 SINTERIZE ANTRASİT', 'Masalar', 17, 1.86, 15549.93, 169.86, 15721.79],
        ['BG.152.A', 'LOFT MASA 100*220*H75 COMPACT ANTRASİT', 'Masalar', 18, 1.86, 6239.60, 169.86, 6251.33],
        ['BG.160.1.A', 'ALYA COMPACT MASA 70*70*H75 ANTRASİT', 'Masalar', 18, 396.27, 1739.33, 0, 2135.60],
        ['BG.160.1.B', 'ALYA COMPACT MASA 70*70*H75 BEYAZ', 'Masalar', 18, 396.27, 1736.62, 0, 2132.89],
        ['BG.160.1.C', 'ALYA COMPACT MASA 70*70*H75 CAPPUCINO', 'Masalar', 18, 396.27, 1727.69, 0, 2123.96],
        ['BG.160.2.A', 'ALYA MASA 80*80*H75 ANTRASİT', 'Masalar', 23, 396.27, 1993.99, 1389.80, 2390.26],
        ['BG.184.A', 'RONDA Q80 YUVARLAK MASA H75 ANTRASİT', 'Masalar', 16, 1151.86, 1474.00, 1235.38, 2625.86],
        ['BG.185.A', 'RONDA Q120 YUVARLAK MASA H75 ANTRASİT', 'Masalar', 16, 1726.86, 1951.27, 1544.23, 3678.13],
        ['BG.186.A', 'RONDA Q150 YUVARLAK MASA H75 ANTRASİT', 'Masalar', 16, 2616.86, 3361.80, 2779.61, 5978.66],
        ['BG.200.A', 'LARA MASA 110*200*H75 ANTRASİT', 'Masalar', 18, 116.86, 5387.26, 4709.89, 5504.12],
        ['BG.210.A', 'LARA MASA 100*100*H75 ANTRASİT', 'Masalar', 21, 866.86, 2554.07, 2084.70, 3420.93],
        ['BG.212.A', 'LARA MASA 100*200*H75 ANTRASİT', 'Masalar', 21, 1530.86, 5233.87, 4323.83, 6764.73],
        ['BG.214.A', 'LARA MASA 100*240*H75 ANTRASİT', 'Masalar', 18, 1566.86, 6136.95, 5404.79, 7703.81],
        ['BG.220.A', 'LARA MASA 110*220*H75 ANTRASİT', 'Masalar', 18, 1694.86, 5898.03, 5173.15, 7592.89],
        ['BG.240.A', 'LARA MASA 110*240*H75 ANTRASİT', 'Masalar', 18, 1988.86, 6494.82, 5713.63, 8483.68],
        ['BG.263.A', 'BISTRO BAR MASA 60*130*H110 ANTRASİT', 'Masalar', 17, 1316.86, 2394.18, 1621.44, 3711.04],
        ['BG.266.A', 'BISTRO BAR MASA 60*60*H110 ANTRASİT', 'Masalar', 17, 530.86, 982.76, 772.11, 1513.62],
        ['BG.277.A', 'LARA MASA 70*70*H75 ANTRASİT', 'Masalar', 20, 806.86, 1356.22, 1080.96, 2163.08],
        ['BG.282.A', 'LARA MASA 80*120*H75 ANTRASİT', 'Masalar', 20, 116.86, 2419.47, 1930.28, 2536.33],
        ['BG.284.A', 'LARA MASA 80*140*H75 ANTRASİT', 'Masalar', 19, 1073.86, 3023.49, 2470.76, 4097.35],
        ['BG.284.WOOD', 'AHŞAP MASA 80*140*H75', 'Masalar', 6, 0, 6516.12, 5790.84, 6516.12],
        ['BG.288.A', 'LARA MASA 80*80*H75 ANTRASİT', 'Masalar', 20, 677.86, 1692.28, 1389.80, 2370.14],
        ['BG.288.WOOD', 'AHŞAP MASA 80*80*H75', 'Masalar', 6, 0, 4353.03, 3860.56, 4353.03],
        ['BG.294.A', 'LARA MASA 90*140*H75 ANTRASİT', 'Masalar', 20, 1073.86, 3863.03, 3088.45, 4936.89],
        ['BG.296.A', 'LARA MASA 90*160*H75 ANTRASİT', 'Masalar', 19, 1280.86, 3779.03, 3088.45, 5059.89],
        ['BG.312.A', 'ENZO MASA 100*208*H75 ANTRASİT', 'Masalar', 21, 1487.86, 5344.76, 4401.04, 6832.62],
        ['BG.317.C.A', 'ENZO CONCEPT MASA 107*215*H75 ANTRASİT', 'Masalar', 19, 2676.86, 5687.22, 4787.10, 8364.08],
        ['BG.318.C.A', 'ENZO CONCEPT MASA 107*275*H75 ANTRASİT', 'Masalar', 18, 3176.86, 7187.92, 6022.48, 10364.78],
        ['BG.319.C.A', 'ENZO CONCEPT MASA 107*335*H75 ANTRASİT', 'Masalar', 18, 3576.86, 9121.83, 7721.13, 12698.69],
        ['BG.322.A', 'ENZO MASA 110*228*H75 ANTRASİT', 'Masalar', 18, 1566.86, 6008.93, 5250.37, 7575.79],
        ['BG.350.A', 'QUBIC MASA 100*100*H75 ANTRASİT', 'Masalar', 20, 116.86, 3845.63, 3320.08, 3962.49],
        ['BG.352.A', 'QUBIC MASA 100*200*H75 ANTRASİT', 'Masalar', 20, 3616.86, 6419.80, 5404.79, 10036.66],
        ['BG.353.A', 'QUBIC MASA 100*300*H75 ANTRASİT', 'Masalar', 17, 116.86, 10610.45, 9651.41, 10727.31],
        ['BG.612.A', 'VERONA MASA 100*200*H75 ANTRASİT', 'Masalar', 20, 1283.86, 4318.13, 3474.51, 5601.99],
        ['BG.625.A', 'VERONA MASA 100*250*H75 ANTRASİT', 'Masalar', 19, 116.86, 51394.83, 50187.32, 51511.69],
        ['BG.684.A', 'VERONA MASA 80*140*H75 ANTRASİT', 'Masalar', 19, 1807.86, 2591.81, 1930.28, 4399.67],
        ['BG.696.A', 'VERONA MASA 90*160*H75 ANTRASİT', 'Masalar', 20, 2444.86, 3201.00, 2470.76, 5645.86],
        ['BG.698.A', 'VERONA MASA 90*180*H75 ANTRASİT', 'Masalar', 20, 2716.86, 3705.19, 2934.03, 6422.05],
        ['BG.800.A', 'DONNA MASA Q120 ANTRASİT', 'Masalar', 16, 1726.86, 4072.30, 3474.51, 5799.16],
        ['BGÖ.011', 'DÖKÜM AYAKLI MASA COMPACT TABLALI', 'Masalar', 3, 0, 3010.43, 0, 3010.43],
        ['BG.06.A', 'NEXT IROCO SANDALYE KOLLU ANTRASİT', 'Sandalyeler', 21, 491.86, 477.81, 347.45, 969.67],
        ['BG.07.A', 'NEXT IROCO SANDALYE KOLSUZ ANTRASİT', 'Sandalyeler', 18, 461.86, 409.67, 293.40, 871.53],
        ['BG.08.A', 'NEXT IROCO RATTAN SANDALYE KOLLU ANTRASİT', 'Sandalyeler', 16, 101.86, 134.62, 61.77, 236.48],
        ['BG.09.A', 'GOLD SANDALYE ANTRASİT', 'Sandalyeler', 21, 101.86, 229.20, 115.82, 331.06],
        ['BG.10.A', 'NEXT FİLELİ SANDALYE ANTRASİT', 'Sandalyeler', 21, 131.35, 229.92, 33.97, 361.27],
        ['BG.1007.A', 'NONA SANDALYE AHŞAP AYAKLI SIRT FİLE MİNDERLİ ANT.', 'Sandalyeler', 30, 229.36, 2051.24, 1235.38, 2280.60],
        ['BG.1008.A', 'NONA SANDALYE ÖRGÜLÜ AHŞAP AYAKLI MİNDERLİ ANT.', 'Sandalyeler', 27, 879.36, 2313.95, 1235.38, 3193.31],
        ['BG.12.A', 'NEXT PEDLİ SANDALYE ANTRASİT', 'Sandalyeler', 22, 178.60, 287.84, 33.97, 466.44],
        ['BG.15.A', 'ARTEMİS SANDALYE ÖRGÜLÜ MİNDERLİ ANTRASİT', 'Sandalyeler', 17, 522.50, 532.29, 0, 1054.79],
        ['BG.20.A', 'POSEIDON FİLELİ SANDALYE ANTRASİT', 'Sandalyeler', 21, 321.35, 236.69, 61.77, 558.04],
        ['BG.22.A', 'POSEIDON PEDLİ SANDALYE ANTRASİT', 'Sandalyeler', 22, 368.60, 294.60, 61.77, 663.20],
        ['BG.28.A', 'POSEIDON AHŞAPLI SANDALYE ANTRASİT', 'Sandalyeler', 20, 122.50, 1047.25, 772.11, 1169.75],
        ['BG.30.A', 'PETRA SANDALYE KOLSUZ ANTRASİT', 'Sandalyeler', 15, 422.50, 251.42, 0, 673.92],
        ['BG.31.A', 'PETRA SANDALYE KOLLU ANTRASİT', 'Sandalyeler', 16, 422.50, 263.72, 0, 686.22],
        ['BG.35.A', 'PETRA SANDALYE AHŞAPLI KOLSUZ ANTRASİT', 'Sandalyeler', 21, 424.36, 1026.13, 772.11, 1450.49],
        ['BG.50.A', 'HECTOR SANDALYE TEKLİ ANTRASİT', 'Sandalyeler', 23, 414.36, 1019.21, 0, 1433.57],
        ['BG.70.A', 'ZEUS SANDALYE FİLELİ ANTRASİT', 'Sandalyeler', 22, 101.35, 248.72, 61.77, 350.07],
        ['BG.80.A', 'PELE SANDALYE ÖRGÜLÜ MİNDERLİ ANTRASİT', 'Sandalyeler', 20, 564.36, 691.35, 0, 1255.71],
        ['BG.85.A', 'REİNA SANDALYE ANTRASİT', 'Sandalyeler', 22, 214.36, 939.37, 463.27, 1153.73],
        ['BG.308.A', 'ENZO SANDALYE MİNDERLİ ANTRASİT', 'Sandalyeler', 22, 333.16, 1426.01, 143.61, 1759.17],
        ['YM.186', 'SANDALYE FİLESİ', 'Sandalyeler', 2, 0, 59.16, 0, 59.16],
        ['BG.100.A', 'ARMADA ŞEZLONG KOLSUZ FİLELİ ANTRASİT', 'Şezlonglar', 20, 377.86, 367.99, 0, 745.85],
        ['BG.101.A', 'ARMADA ŞEZLONG KOLLU FİLELİ ANTRASİT', 'Şezlonglar', 23, 477.86, 401.99, 0, 879.85],
        ['BG.110.A', 'ARMADA ŞEZLONG KOLSUZ PEDLİ ANTRASİT', 'Şezlonglar', 20, 251.86, 558.55, 0, 810.41],
        ['BG.115.A', 'AQUA ŞEZLONG FİLELİ ANTRASİT', 'Şezlonglar', 22, 1595.86, 2903.04, 2316.34, 4498.90],
        ['BG.120.A', 'PASCAL ŞEZLONG FİLELİ TEKERLEKLİ ANTRASİT', 'Şezlonglar', 27, 327.86, 676.48, 24.71, 1004.34],
        ['BG.125.A', 'LOÇKA ŞEZLONG FİLELİ ANTRASİT', 'Şezlonglar', 19, 377.86, 357.37, 0, 735.23],
        ['BG.130.1.A', 'HOUSTON KOLLU FİLELİ ŞEZLONG ANTRASİT', 'Şezlonglar', 25, 227.86, 449.92, 0, 677.78],
        ['BG.140.A', 'DAISY ŞEZLONG FİLELİ ANTRASİT', 'Şezlonglar', 21, 1.86, 430.91, 0, 432.77],
        ['BG.145.A', 'PERLA ŞEZLONG MİNDERLİ ANTRASİT', 'Şezlonglar', 20, 250, 1931.93, 0, 2181.93],
        ['BG.149.A', 'ŞEZLONG GÖLGELİK ANTRASİT', 'Şezlonglar', 5, 0, 69.71, 0, 69.71],
        ['BG.1106.A', 'ADA BERJER SEHPA 60*120*H60 ANTRASİT', 'Sehpalar', 18, 116.86, 1653.19, 1389.80, 1770.05],
        ['BG.1156.A', 'COMFİ BERJER SEHPA 60*100*H60 ANTRASİT', 'Sehpalar', 18, 737.86, 1644.96, 1389.80, 2382.82],
        ['BG.1201.A', 'HELEN ORTA SEHPA ANTRASİT', 'Sehpalar', 15, 1.86, 1379.28, 1196.77, 1381.14],
        ['BG.170.A', 'DİKO SEHPA 60*120*H40 ANTRASİT', 'Sehpalar', 18, 622.86, 1802.53, 1544.23, 2425.39],
        ['BG.180.A', 'BRACT Q50 YUVARLAK SEHPA H65 ANTRASİT', 'Sehpalar', 16, 616.86, 921.34, 772.11, 1538.20],
        ['BG.191.A', 'DC SEHPA 42*42*H42 ANTRASİT', 'Sehpalar', 15, 316.86, 363.67, 270.24, 680.53],
        ['BG.195.A', 'FERRO ORTA SEHPA Q70 ANTRASİT', 'Sehpalar', 13, 0, 1306.74, 1080.96, 1306.74],
        ['BG.260.SH.A', 'LARA SEHPA 60*120*H65 ANTRASİT', 'Sehpalar', 19, 737.86, 17497.81, 16986.48, 18235.67],
        ['BG.307.A', 'ENZO SEHPA 80*148*H65 ANTRASİT', 'Sehpalar', 20, 944.86, 2651.27, 2316.34, 3596.13],
        ['BG.336.A', 'ATHENA SEHPA 80*140*H65 ANTRASİT', 'Sehpalar', 20, 1073.86, 3167.49, 2470.76, 4241.35],
        ['BG.365.A', 'JUPITER SEHPA Q50*H50 COMPACT ANTRASİT', 'Sehpalar', 10, 1.86, 696.64, 0, 698.50],
        ['BG.99.A', 'PANDORA YAN SEHPA ANTRASİT', 'Sehpalar', 9, 250, 389.73, 0, 639.73],
        ['BG.1101.A', 'ADA BERJER FİLELİ TEKLİ OTURUM ANTRASİT', 'Koltuk ve Berjerler', 14, 115, 340.77, 0, 649.11],
        ['BG.1102.A', 'ADA BERJER FİLELİ İKİLİ OTURUM ANTRASİT', 'Koltuk ve Berjerler', 15, 230, 529.23, 0, 1145.91],
        ['BG.1103.A', 'ADA BERJER PEDLİ TEKLİ OTURUM ANTRASİT', 'Koltuk ve Berjerler', 15, 115, 755.90, 0, 1064.24],
        ['BG.1150.A', 'COMFİ BERJER FİLELİ TEKLİ OTURUM ANTRASİT', 'Koltuk ve Berjerler', 24, 316.86, 535.19, 154.42, 1045.39],
        ['BG.1151.A', 'COMFİ BERJER PEDLİ TEKLİ OTURUM ANTRASİT', 'Koltuk ve Berjerler', 25, 316.86, 659.76, 154.42, 1169.96],
        ['BG.90.01.A', 'PANDORA KONİK AYAKLI TEKLİ KOLTUK 58*58*H46 ANT.', 'Koltuk ve Berjerler', 39, 708.73, 2683.43, 0, 3394.21],
        ['BG.92.01.A', 'PANDORA KONİK AYAKLI İKİLİ KOLTUK 118*58*H46 ANT.', 'Koltuk ve Berjerler', 41, 1025.64, 4643.19, 0, 5674.99],
        ['BG.194.A', 'PUF ANTRASİT', 'Bank ve Puflar', 8, 115, 284.60, 0, 399.60],
        ['BG.199.A', 'DOGO BANK 45*125*H45 ANTRASİT', 'Bank ve Puflar', 16, 1201.86, 1782.07, 1544.23, 2983.93],
        ['BG.205.A', 'LARA BANK 45*125*H45 ANTRASİT', 'Bank ve Puflar', 16, 1.86, 1762.15, 1544.23, 1764.01],
        ['BG.1205.A', 'HELEN KÖŞE TAKIM 5 OTURUM ANTRASİT', 'Köşe ve Oturma Grupları', 20, 1311.86, 5678.15, 0, 6990.01],
        ['BG.1206.A', 'HELEN KÖŞE TAKIM 6 OTURUM ANTRASİT', 'Köşe ve Oturma Grupları', 20, 1821.86, 6813.24, 0, 8635.10],
        ['BG.99.13.2.A', 'PANDORA SIRT DAYAMA + KÖŞE SIRT MİNDERİ', 'Köşe ve Oturma Grupları', 16, 110, 526.06, 0, 637.09],
        ['BG.24.A', 'POSEIDON FİLELİ BAR TABURE ANTRASİT', 'Yedek Parça ve Diğer', 21, 161.35, 329.35, 61.77, 490.70],
        ['BG.26.A', 'POSEIDON PEDLİ BAR TABURE ANTRASİT', 'Yedek Parça ve Diğer', 22, 208.60, 387.74, 61.77, 596.34],
        ['BG.301.A', 'ENZO TEKLİ OTURUM ANTRASİT', 'Yedek Parça ve Diğer', 35, 1303.14, 1745.68, 386.06, 3048.82],
        ['BG.331.A', 'ATHENA TEKLİ OTURUM ANTRASİT', 'Yedek Parça ve Diğer', 23, 575, 1840.02, 393.78, 2415.02],
        ['BG.400.A', 'DAYBED MİNDERLİ ANTRASİT', 'Yedek Parça ve Diğer', 22, 30, 7679.55, 0, 7709.55],
        ['BG.501.A', 'NİRVANA TEKLİ OTURUM ANTRASİT', 'Yedek Parça ve Diğer', 34, 1196.86, 3372.08, 1853.07, 4568.94],
        ['BG.61.A', 'TİM TEKLİ OTURUM ANTRASİT', 'Yedek Parça ve Diğer', 20, 164.36, 999.54, 61.77, 1163.90],
        ['BG.701.A', 'BIANCA TEKLİ OTURUM ANTRASİT', 'Yedek Parça ve Diğer', 24, 571.86, 1436.99, 131.26, 2008.85],
        ['BG.96.A', 'PANDORA KOL (TEKLİ) ANTRASİT', 'Yedek Parça ve Diğer', 6, 30, 131.82, 0, 161.82],
        ['BG.99.15.A', 'PANDORA BAĞLANTI APARATI ANTRASİT', 'Yedek Parça ve Diğer', 7, 56.5, 7.58, 0, 64.08],
        ['BGM.006', 'PELE OTURAK MİNDERİ KILIFI', 'Yedek Parça ve Diğer', 9, 105, 242.55, 0, 348.58]
    ].map(([kod, ad, kategori, bilesen, fason, hammadde, iroko, toplam]) => ({ kod, ad, kategori, bilesen, fason, hammadde, iroko, toplam }));

    const TOTAL_PRODUCTS = 1582;

    /** Ürün listesi: gerçek ürünler + toplam ürün sayısına ulaşmak için türetilmiş varyantlar */
    function buildProducts() {
        const products = BASE_PRODUCTS.map((p) => ({ ...p, synthetic: false }));
        const colors = ['ANTRASİT', 'BEYAZ', 'CAPPUCINO', 'GRANİT', 'KREM', 'SİYAH', 'SERAMİK', 'GRİ', 'MAVİ', 'BEJ'];
        let i = 1;
        while (products.length < TOTAL_PRODUCTS) {
            const base = BASE_PRODUCTS[i % BASE_PRODUCTS.length];
            const color = colors[i % colors.length];
            const v = (i % 7) * 0.07 + 0.85;
            products.push({
                kod: `${base.kod}.V${String(i).padStart(4, '0')}`,
                ad: `${base.ad.split(' ').slice(0, 3).join(' ')} ${color} V${(i % 5) + 1}`,
                kategori: base.kategori,
                bilesen: base.bilesen,
                fason: +(base.fason * v).toFixed(2),
                hammadde: +(base.hammadde * v).toFixed(2),
                iroko: +(base.iroko * v).toFixed(2),
                toplam: +(base.toplam * v).toFixed(2),
                synthetic: true
            });
            i++;
        }
        return products;
    }

    /*
     * Reçete şablonları. Kaynak ERP verisinde "b" alanı satır TUTARIDIR (katsayı × birim fiyat).
     * Malzeme kartı birim fiyatı, kalemin ilk geçtiği şablondan b / k olarak türetilir
 * (ör. IROKO 4323,83 / 0,056 = 77.211 ₺/m³). Reçete maliyeti = katsayı × kart fiyatı.
     */
    const BOM_TEMPLATES = {
        'Masalar': [
            ['FS.228', 'FASON POLİSAJ BEDELİ LARA MASA', 'Fason İşçilik', 1, 115],
            ['FS.289', 'FASON LAZER MARKALAMA 40*13 MM', 'Fason İşçilik', 1, 1.86],
            ['HM.002', 'SELÜLOZİK TİNER', 'Boya / Kimyasal', 0.05, 64.47],
            ['HM.006', 'BALONLU NAYLON', 'Ambalaj', 1, 55],
            ['HM.008', 'METİLEN KLORİD', 'Boya / Kimyasal', 0.05, 2.30],
            ['HM.018', 'NPE FOAM U-50 200 CM', 'Ambalaj', 1, 7.57],
            ['HM.019', 'TEX7016 PE-MAT (ANTRASİT)', 'Boya / Kimyasal', 0.15, 33.90],
            ['HM.030', 'SUNTA VİDASI 3,5X20', 'Bağlantı', 20, 4.60],
            ['HM.043', 'M6X20 RYSB VİDA', 'Bağlantı', 12, 13.80],
            ['HM.044', 'IROKO KERESTE', 'İroko Kereste', 0.056, 4323.83],
            ['HM.112', 'MAT VERNİK', 'Boya / Kimyasal', 0.0306, 152.14],
            ['HM.128', '40*60 MM MASA AYAK TAPASI', 'Bağlantı', 4, 14.87],
            ['HM.139', 'KOLİ 1 NOLU ALT', 'Ambalaj', 2, 192],
            ['HM.161', '2,4*8 POP PERÇİN', 'Bağlantı', 2, 1.36],
            ['HM.162', 'ALÜMİNYUM SAÇ LAZER KESİM', 'Yüzey Malzemesi', 1, 5.5],
            ['YM.058', 'LARA MASA ARA KAYIT 188 CM', 'Yarı Mamül İskelet', 2, 0],
            ['YM.059', 'LARA MASA AYAĞI 100 CM', 'Yarı Mamül İskelet', 2, 0]
        ],
        'Sandalyeler': [
            ['FS.197', 'FASON NEXT İRECO AHŞAP İMALATI', 'Fason İşçilik', 1, 390],
            ['FS.231', 'FASON POLİSAJ BEDELİ NEXT IRECO', 'Fason İşçilik', 1, 70],
            ['FS.289', 'FASON LAZER MARKALAMA 40*13 MM', 'Fason İşçilik', 1, 1.86],
            ['HM.002', 'SELÜLOZİK TİNER', 'Boya / Kimyasal', 0.0155, 30.30],
            ['HM.006', 'BALONLU NAYLON', 'Ambalaj', 0.35, 19.25],
            ['HM.008', 'METİLEN KLORİD', 'Boya / Kimyasal', 0.05, 2.30],
            ['HM.015', 'KORUYUCU FİLE KILIF', 'Döşeme / Kumaş', 0.024, 2.88],
            ['HM.019', 'TEX7016 PE-MAT (ANTRASİT)', 'Boya / Kimyasal', 0.13, 29.38],
            ['HM.030', 'SUNTA VİDASI 3,5X20', 'Bağlantı', 14, 3.22],
            ['HM.044', 'IROKO KERESTE', 'İroko Kereste', 0.0045, 347.45],
            ['HM.070', 'SUNTA VİDASI 3,5X30', 'Bağlantı', 6, 1.68],
            ['HM.081', 'NPE FOAM U-30 200 CM', 'Ambalaj', 0.75, 3.71],
            ['HM.161', '2,4*8 POP PERÇİN', 'Bağlantı', 2, 1.36],
            ['HM.162', 'ALÜMİNYUM SAÇ LAZER KESİM', 'Yüzey Malzemesi', 1, 5.5],
            ['YM.001', 'NEXT İRECO SANDALYE İSKELETİ KOLLU', 'Yarı Mamül İskelet', 1, 0]
        ],
        'Şezlonglar': [
            ['FS.054', 'FASON BOYAMA SANDALYE POSEIDON', 'Fason İşçilik', 1, 160],
            ['FS.098', 'FASON KESİM DİKİM NEXT FİLELİ', 'Fason İşçilik', 1, 33.75],
            ['FS.237', 'FASON POLİSAJ BEDELİ POSEIDON', 'Fason İşçilik', 1, 62.50],
            ['HM.006', 'BALONLU NAYLON', 'Ambalaj', 0.4, 22],
            ['HM.007', 'SUNTA VİDASI 3,5X16', 'Bağlantı', 6, 1.32],
            ['HM.008', 'METİLEN KLORİD', 'Boya / Kimyasal', 0.06, 2.76],
            ['HM.015', 'KORUYUCU FİLE KILIF', 'Döşeme / Kumaş', 0.048, 5.76],
            ['HM.016', 'M6 FLANŞLI PERÇİN SOMUN', 'Bağlantı', 4, 5.70],
            ['HM.020', 'Q5,6 mm PE FİTİL', 'Diğer Hammadde', 2, 12.40],
            ['HM.044', 'IROKO KERESTE', 'İroko Kereste', 0.0008, 61.77],
            ['HM.068', 'FİLE TEXTİLENE PVC DARK GREY', 'Döşeme / Kumaş', 0.5, 46.14],
            ['HM.071', 'NEXT ÜST ÇITA PLASTİĞİ', 'Diğer Hammadde', 1, 38.50],
            ['HM.072', 'POSEIDON AYAK TAPASI', 'Bağlantı', 4, 17.60],
            ['YM.094', 'POSEIDON SANDALYE İSKELETİ', 'Yarı Mamül İskelet', 1, 0]
        ],
        'Sehpalar': [
            ['FS.228', 'FASON POLİSAJ BEDELİ LARA MASA', 'Fason İşçilik', 1, 115],
            ['FS.289', 'FASON LAZER MARKALAMA 40*13 MM', 'Fason İşçilik', 1, 1.86],
            ['HM.002', 'SELÜLOZİK TİNER', 'Boya / Kimyasal', 0.033, 64.47],
            ['HM.006', 'BALONLU NAYLON', 'Ambalaj', 0.68, 37.40],
            ['HM.008', 'METİLEN KLORİD', 'Boya / Kimyasal', 0.05, 2.30],
            ['HM.018', 'NPE FOAM U-50 200 CM', 'Ambalaj', 1, 7.57],
            ['HM.019', 'TEX7016 PE-MAT (ANTRASİT)', 'Boya / Kimyasal', 0.10, 22.60],
            ['HM.030', 'SUNTA VİDASI 3,5X20', 'Bağlantı', 12, 2.76],
            ['HM.043', 'M6X20 RYSB VİDA', 'Bağlantı', 12, 13.80],
            ['HM.044', 'IROKO KERESTE', 'İroko Kereste', 0.027, 2084.70],
            ['HM.112', 'MAT VERNİK', 'Boya / Kimyasal', 0.0143, 71.21],
            ['HM.128', '40*60 MM MASA AYAK TAPASI', 'Bağlantı', 4, 14.87],
            ['HM.161', '2,4*8 POP PERÇİN', 'Bağlantı', 2, 1.36],
            ['HM.162', 'ALÜMİNYUM SAÇ LAZER KESİM', 'Yüzey Malzemesi', 1, 5.50],
            ['YM.057', 'LARA MASA ARA KAYIT 88 CM', 'Yarı Mamül İskelet', 2, 0],
            ['YM.059', 'LARA MASA AYAĞI 100 CM', 'Yarı Mamül İskelet', 2, 0]
        ],
        'Koltuk ve Berjerler': [
            ['FS.087', 'FASON HECTOR TEKLİ OTURAK MİNDER KILIFI', 'Fason İşçilik', 1, 0],
            ['FS.222', 'FASON POLİSAJ BEDELİ HECTOR', 'Fason İşçilik', 1, 62.50],
            ['HM.004', '28 DS SÜNGER', 'Döşeme / Kumaş', 0.037, 235.51],
            ['HM.006', 'BALONLU NAYLON', 'Ambalaj', 0.5, 27.50],
            ['HM.008', 'METİLEN KLORİD', 'Boya / Kimyasal', 0.05, 2.30],
            ['HM.010', 'VATKA ELYAF', 'Döşeme / Kumaş', 0.16, 21.56],
            ['HM.015', 'KORUYUCU FİLE KILIF', 'Döşeme / Kumaş', 0.048, 5.76],
            ['HM.019', 'TEX7016 PE-MAT (ANTRASİT)', 'Boya / Kimyasal', 0.09, 20.34],
            ['HM.024', 'BONCUK SİLİKON', 'Döşeme / Kumaş', 0.6, 58.998],
            ['HM.035', '4,2X16 YSB M.UCLU VİDA', 'Bağlantı', 6, 4.58],
            ['HM.081', 'NPE FOAM U-30 200 CM', 'Ambalaj', 2, 9.90],
            ['HM.155', 'DÖŞEMELİK KUMAŞ', 'Döşeme / Kumaş', 1.4, 578.14],
            ['HM.161', '2,4*8 POP PERÇİN', 'Bağlantı', 2, 1.36],
            ['HM.162', 'ALÜMİNYUM SAÇ LAZER KESİM', 'Yüzey Malzemesi', 1, 5.50],
            ['YM.011', 'HECTOR SANDALYE TEKLİ İSKELET', 'Yarı Mamül İskelet', 1, 0]
        ],
        'Bank ve Puflar': [
            ['FS.206', 'FASON PETRA SANDALYE DÖŞEME İŞLEMİ', 'Fason İşçilik', 1, 360],
            ['FS.236', 'FASON POLİSAJ BEDELİ PETRA', 'Fason İşçilik', 1, 62.50],
            ['HM.006', 'BALONLU NAYLON', 'Ambalaj', 0.35, 19.25],
            ['HM.014', 'W KESİTLİ FİTİL', 'Diğer Hammadde', 3.6, 53.31],
            ['HM.019', 'TEX7016 PE-MAT (ANTRASİT)', 'Boya / Kimyasal', 0.15, 33.90],
            ['HM.068', 'FİLE TEXTİLENE PVC DARK GREY', 'Döşeme / Kumaş', 0.65, 59.99],
            ['HM.081', 'NPE FOAM U-30 200 CM', 'Ambalaj', 0.5, 2.48],
            ['YM.006', 'PETRA SANDALYE KOLSUZ İSKELET', 'Yarı Mamül İskelet', 1, 0]
        ],
        'Köşe ve Oturma Grupları': [
            ['FS.289', 'FASON LAZER MARKALAMA 40*13 MM', 'Fason İşçilik', 1, 1.86],
            ['FS.291', 'FASON POLİSAJ BEDELİ PELE', 'Fason İşçilik', 1, 62.50],
            ['FS.318', 'FASON PELE SANDALYE ÖRME İŞLEMİ', 'Fason İşçilik', 1, 500],
            ['HM.004', '28 DS SÜNGER', 'Döşeme / Kumaş', 0.007, 42.96],
            ['HM.006', 'BALONLU NAYLON', 'Ambalaj', 0.57, 31.35],
            ['HM.012', 'FERMUAR', 'Diğer Hammadde', 0.45, 1.58],
            ['HM.014', 'W KESİTLİ FİTİL', 'Diğer Hammadde', 1.7, 25.17],
            ['HM.019', 'TEX7016 PE-MAT (ANTRASİT)', 'Boya / Kimyasal', 0.1, 22.60],
            ['HM.068', 'FİLE TEXTİLENE PVC DARK GREY', 'Döşeme / Kumaş', 0.25, 23.07],
            ['HM.081', 'NPE FOAM U-30 200 CM', 'Ambalaj', 3, 14.85],
            ['HM.155', 'DÖŞEMELİK KUMAŞ', 'Döşeme / Kumaş', 0.55, 227.13],
            ['HM.161', '2,4*8 POP PERÇİN', 'Bağlantı', 2, 1.36],
            ['HM.162', 'ALÜMİNYUM SAÇ LAZER KESİM', 'Yüzey Malzemesi', 1, 5.50]
        ],
        'Yedek Parça ve Diğer': [
            ['FS.001', 'FASON 35X2 PROFİL KESME KONİKLEME', 'Fason İşçilik', 4, 50],
            ['FS.222', 'FASON POLİSAJ BEDELİ HECTOR', 'Fason İşçilik', 1, 62.50],
            ['HM.004', '28 DS SÜNGER', 'Döşeme / Kumaş', 0.037, 235.51],
            ['HM.006', 'BALONLU NAYLON', 'Ambalaj', 0.5, 27.50],
            ['HM.019', 'TEX7016 PE-MAT (ANTRASİT)', 'Boya / Kimyasal', 0.09, 20.34],
            ['HM.024', 'BONCUK SİLİKON', 'Döşeme / Kumaş', 0.6, 58.998],
            ['HM.044', 'IROKO KERESTE', 'İroko Kereste', 0.0019, 143.61],
            ['HM.081', 'NPE FOAM U-30 200 CM', 'Ambalaj', 2, 9.90],
            ['HM.155', 'DÖŞEMELİK KUMAŞ', 'Döşeme / Kumaş', 2.2, 908.51],
            ['HM.161', '2,4*8 POP PERÇİN', 'Bağlantı', 2, 1.36],
            ['HM.162', 'ALÜMİNYUM SAÇ LAZER KESİM', 'Yüzey Malzemesi', 1, 5.50],
            ['YM.030', 'ENZO SANDALYE İSKELETİ', 'Yarı Mamül İskelet', 1, 0]
        ]
    };

    /** Yarı mamul (iskelet) reçeteleri — çok seviyeli ürün ağacı için 2. seviye */
    const RAW_EXTRA = {
        'HM.P40': ['ALÜMİNYUM PROFİL 40*40*2 MM', 'Profil', 'm', 145],
        'HM.P24': ['ALÜMİNYUM PROFİL 20*40*2 MM', 'Profil', 'm', 98],
        'HM.P35': ['ALÜMİNYUM BORU Q35*2 MM', 'Profil', 'm', 120],
        'HM.KT':  ['ALÜMİNYUM KAYNAK TELİ ER5356', 'Diğer Hammadde', 'kg', 410],
        'FS.KYN': ['FASON KAYNAK İŞÇİLİĞİ', 'Fason İşçilik', 'ad', 85],
        'FS.EBY': ['FASON ELEKTROSTATİK TOZ BOYA', 'Fason İşçilik', 'ad', 70]
    };
    const SUB_BOMS = {
        'YM.058': [['HM.P24', 1.9], ['HM.KT', 0.02], ['FS.KYN', 0.5], ['FS.EBY', 0.4]],
        'YM.059': [['HM.P40', 1.6], ['HM.KT', 0.03], ['FS.KYN', 1], ['FS.EBY', 0.6]],
        'YM.057': [['HM.P24', 0.9], ['HM.KT', 0.015], ['FS.KYN', 0.4], ['FS.EBY', 0.3]],
        'YM.001': [['HM.P35', 4.2], ['HM.KT', 0.05], ['FS.KYN', 1.5], ['FS.EBY', 1]],
        'YM.094': [['HM.P35', 3.8], ['HM.KT', 0.045], ['FS.KYN', 1.4], ['FS.EBY', 1]],
        'YM.011': [['HM.P35', 4.0], ['HM.P24', 0.6], ['HM.KT', 0.05], ['FS.KYN', 1.5], ['FS.EBY', 1]],
        'YM.006': [['HM.P35', 3.6], ['HM.KT', 0.04], ['FS.KYN', 1.3], ['FS.EBY', 0.9]],
        'YM.030': [['HM.P35', 4.4], ['HM.P24', 0.8], ['HM.KT', 0.06], ['FS.KYN', 1.6], ['FS.EBY', 1.1]]
    };

    const UNIT_BY_TYPE = {
        'İroko Kereste': 'm³', 'Boya / Kimyasal': 'kg', 'Döşeme / Kumaş': 'm', 'Profil': 'm',
        'Ambalaj': 'ad', 'Bağlantı': 'ad', 'Yüzey Malzemesi': 'ad', 'Diğer Hammadde': 'ad',
        'Yarı Mamül İskelet': 'ad', 'Fason İşçilik': 'ad'
    };
    const LEAD_BY_TYPE = {
        'İroko Kereste': 21, 'Profil': 14, 'Boya / Kimyasal': 7, 'Döşeme / Kumaş': 10, 'Ambalaj': 5,
        'Bağlantı': 7, 'Yüzey Malzemesi': 5, 'Diğer Hammadde': 7, 'Yarı Mamül İskelet': 3, 'Fason İşçilik': 2
    };
    const ITEM_TYPES = Object.keys(UNIT_BY_TYPE);

    /** Malzeme kartlarının varsayılan değerleri (tedarik tipi, süre, emniyet stoğu, parti politikası) */
    function buildItemMaster() {
        const items = {};
        const add = (kod, ad, tur, price, unitOverride) => {
            if (items[kod]) return;
            const unit = unitOverride || UNIT_BY_TYPE[tur] || 'ad';
            const h = MRP.U.hash(kod);
            const procurement = tur === 'Yarı Mamül İskelet' ? 'make' : tur === 'Fason İşçilik' ? 'service' : 'buy';
            let lotPolicy = 'L4L', lotSize = 0;
            if (tur === 'Bağlantı') { lotPolicy = 'FOQ'; lotSize = 500; }
            else if (tur === 'Ambalaj') { lotPolicy = 'FOQ'; lotSize = 50; }
            else if (tur === 'Profil') { lotPolicy = 'MIN'; lotSize = 60; }
            else if (tur === 'İroko Kereste') { lotPolicy = 'MIN'; lotSize = 0.5; }
            let safety;
            if (unit === 'm³') safety = 0.8;
            else if (unit === 'kg') safety = 10 + (h % 20);
            else if (unit === 'm') safety = 40 + (h % 60);
            else safety = procurement === 'make' ? 20 : 40 + (h % 120);
            if (procurement === 'service') safety = 0;
            const currency = CURRENCY_BY_TYPE[tur] || 'TRY';
            const fx = currency === 'TRY' ? 1 : DEFAULT_FX[currency];
            items[kod] = {
                kod, ad, tur, unit, price: MRP.U.round(price / fx, 4), currency, procurement,
                leadTime: LEAD_BY_TYPE[tur] ?? 7, safetyStock: safety, lotPolicy, lotSize
            };
        };
        Object.values(BOM_TEMPLATES).forEach((lines) => lines.forEach(([kod, ad, tur, k, b]) => add(kod, ad, tur, k > 0 ? b / k : 0)));
        Object.entries(RAW_EXTRA).forEach(([kod, [ad, tur, unit, price]]) => add(kod, ad, tur, price, unit));
        return items;
    }

    // ---------------- Döviz ----------------
    const CURRENCIES = { TRY: { symbol: '₺', name: 'Türk Lirası' }, USD: { symbol: '$', name: 'ABD Doları' }, EUR: { symbol: '€', name: 'Euro' }, GBP: { symbol: '£', name: 'İngiliz Sterlini' } };
    /** Demo başlangıç kurları — Maliyet & Kur ekranından güncellenir */
    const DEFAULT_FX = { USD: 41.80, EUR: 48.60, GBP: 55.90 };
    /** İthal kalemlerin varsayılan fiyatlandırma para birimi */
    const CURRENCY_BY_TYPE = { 'İroko Kereste': 'USD', 'Profil': 'EUR' };

    // ---------------- Lokasyonlar ----------------
    const LOCATIONS = {
        MERKEZ: { ad: 'Merkez Depo', consume: true },
        FABRIKA: { ad: 'Fabrika / Üretim Hattı', consume: true },
        FASON: { ad: 'Fasoncuda', consume: false }
    };

    // ---------------- İş merkezleri ve rotalar ----------------
    /** capacity: günlük dakika, rate: saatlik maliyet (₺) */
    const WORK_CENTERS = [
        { id: 'KES', ad: 'Kesim', capacity: 960, days: 5, efficiency: 90, rate: 650 },
        { id: 'KAY', ad: 'Kaynak', capacity: 1440, days: 5, efficiency: 85, rate: 720 },
        { id: 'POL', ad: 'Polisaj / Ahşap İşleme', capacity: 960, days: 5, efficiency: 85, rate: 600 },
        { id: 'DOS', ad: 'Döşeme', capacity: 960, days: 5, efficiency: 85, rate: 620 },
        { id: 'MON', ad: 'Montaj', capacity: 1440, days: 5, efficiency: 90, rate: 560 },
        { id: 'PAK', ad: 'Paketleme', capacity: 960, days: 5, efficiency: 95, rate: 480 }
    ];
    /** Kategori bazında varsayılan rota: [iş merkezi, hazırlık dk, birim süre dk] */
    const DEFAULT_ROUTINGS = {
        'Masalar': [['KES', 20, 10], ['POL', 15, 18], ['MON', 10, 20], ['PAK', 5, 8]],
        'Sandalyeler': [['POL', 15, 8], ['MON', 10, 10], ['PAK', 5, 4]],
        'Şezlonglar': [['DOS', 10, 15], ['MON', 10, 12], ['PAK', 5, 6]],
        'Sehpalar': [['KES', 15, 8], ['POL', 15, 12], ['MON', 10, 14], ['PAK', 5, 6]],
        'Koltuk ve Berjerler': [['DOS', 15, 35], ['MON', 10, 18], ['PAK', 5, 8]],
        'Bank ve Puflar': [['KES', 10, 6], ['DOS', 10, 20], ['MON', 10, 12], ['PAK', 5, 6]],
        'Köşe ve Oturma Grupları': [['DOS', 20, 60], ['MON', 15, 45], ['PAK', 10, 20]],
        'Yedek Parça ve Diğer': [['MON', 5, 10], ['PAK', 3, 4]],
        '_YM': [['KES', 15, 6], ['KAY', 15, 12]]
    };

    /** Başlangıç stok seviyeleri (deterministik) — bazı kalemler bilerek kritik bırakılır */
    function buildInitialStock(items) {
        const stock = {};
        let forcedCrit = 0;
        Object.values(items).forEach((it) => {
            if (it.procurement === 'service') return;
            const h = MRP.U.hash(it.kod + '#s');
            let qty;
            if (it.unit === 'm³') qty = 0.4 + (h % 40) / 10;
            else if (it.unit === 'kg') qty = 5 + (h % 140);
            else if (it.unit === 'm') qty = 30 + (h % 600);
            else qty = it.procurement === 'make' ? h % 60 : 60 + (h % 1600);
            if (it.procurement === 'buy' && h % 5 === 0 && forcedCrit < 6) { qty = it.safetyStock * 0.3; forcedCrit++; }
            stock[it.kod] = MRP.U.round(it.unit === 'ad' ? Math.floor(qty) : qty, 3);
        });
        return stock;
    }

    const SUPPLIERS = [
        { id: 'TED-001', ad: 'Anadolu Kereste A.Ş.', yetkili: 'Mehmet Yılmaz', tel: '0212 555 0101', email: 'info@anadolukereste.com', adres: 'İstanbul', kategoriler: ['İroko Kereste', 'Yarı Mamül İskelet'], vade: 30, puan: 4.7, aktif: true, vergiNo: '1234567890' },
        { id: 'TED-002', ad: 'Ege Metal Sanayi Ltd.', yetkili: 'Ayşe Kaya', tel: '0232 444 0202', email: 'satis@egemetal.com', adres: 'İzmir', kategoriler: ['Bağlantı', 'Yüzey Malzemesi', 'Profil'], vade: 45, puan: 4.3, aktif: true, vergiNo: '2345678901' },
        { id: 'TED-003', ad: 'Marmara Boya Kimya A.Ş.', yetkili: 'Hasan Şahin', tel: '0216 333 0303', email: 'info@marmaraboya.com', adres: 'Kocaeli', kategoriler: ['Boya / Kimyasal'], vade: 60, puan: 4.5, aktif: true, vergiNo: '3456789012' },
        { id: 'TED-004', ad: 'Akdeniz Ambalaj San.', yetkili: 'Fatma Öz', tel: '0242 222 0404', email: 'siparis@akdenizambalaj.com', adres: 'Antalya', kategoriler: ['Ambalaj'], vade: 30, puan: 4.1, aktif: true, vergiNo: '4567890123' },
        { id: 'TED-005', ad: 'Bursa Döşeme Kumaş', yetkili: 'Ali Vural', tel: '0224 111 0505', email: 'info@bursadoseme.com', adres: 'Bursa', kategoriler: ['Döşeme / Kumaş'], vade: 45, puan: 4.6, aktif: true, vergiNo: '5678901234' },
        { id: 'TED-006', ad: 'Konya Fason İşçilik', yetkili: 'Osman Yıldız', tel: '0332 666 0606', email: 'fason@konyafason.com', adres: 'Konya', kategoriler: ['Fason İşçilik'], vade: 30, puan: 3.9, aktif: true, vergiNo: '6789012345' },
        { id: 'TED-007', ad: 'Ankara Vida Bağlantı', yetkili: 'Sevgi Ak', tel: '0312 777 0707', email: 'satis@ankaravida.com', adres: 'Ankara', kategoriler: ['Bağlantı', 'Diğer Hammadde'], vade: 30, puan: 4.4, aktif: true, vergiNo: '7890123456' }
    ];

    /** Tedarikçi fiyat listesi: her satın alma kalemi için kategori uyumlu 1–3 tedarikçi teklifi */
    function buildPriceList(items) {
        const list = [];
        Object.values(items).forEach((it) => {
            if (it.procurement === 'make') return;
            SUPPLIERS.filter((s) => s.kategoriler.includes(it.tur)).slice(0, 3).forEach((s, i) => {
                const h = MRP.U.hash(it.kod + s.id);
                list.push({
                    supplierId: s.id, kod: it.kod, currency: it.currency,
                    price: MRP.U.round(it.price * (0.93 + (h % 15) / 100 + i * 0.02), 4),
                    leadTime: Math.max(1, it.leadTime + (h % 5) - 2), moq: 0, updatedAt: new Date().toISOString()
                });
            });
        });
        return list;
    }

    MRP.data = {
        CATEGORIES, CATEGORY_STYLE, BASE_PRODUCTS, BOM_TEMPLATES, SUB_BOMS, ITEM_TYPES, UNIT_BY_TYPE,
        buildProducts, buildItemMaster, buildInitialStock, buildPriceList, SUPPLIERS,
        CURRENCIES, DEFAULT_FX, CURRENCY_BY_TYPE, LOCATIONS, WORK_CENTERS, DEFAULT_ROUTINGS
    };
})(window.MRP);
