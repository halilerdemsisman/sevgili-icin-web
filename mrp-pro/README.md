# MRP Pro — Malzeme İhtiyaç ve Üretim Planlama

Tarayıcıda çalışan, kurulum gerektirmeyen bir MRP / üretim planlama uygulaması.

İki şekilde kullanılabilir:

- **Tek dosya:** [`mrp-pro-tek-dosya.html`](mrp-pro-tek-dosya.html) — tüm CSS ve JavaScript içine gömülüdür;
  dosyayı indirip çift tıklamanız yeterli. Başka dosyaya ihtiyaç duymaz.
- **Modüler kaynak:** `index.html` + `assets/` — geliştirme bunun üzerinde yapılır.

Kaynakta değişiklik yaptıktan sonra tek dosyayı yeniden üretin:

```bash
python3 build-single.py
```

> Grafik, Excel ve PDF kütüphaneleri, yazı tipleri ve canlı döviz kuru internetten yüklenir.
> Bağlantı yoksa uygulama çalışmaya devam eder; yalnızca bu özellikler uyarı verir (CSV içe aktarma ve elle kur girişi çevrimdışı da çalışır).

## Modüller

| Grup | Ekran | İçerik |
|---|---|---|
| Genel | Gösterge Paneli | KPI'lar (stok değeri, kapasite tepe doluluk, kur), planlı salım grafiği, stok sağlığı, MRP istisnaları |
| Mühendislik | Ürün Ağacı | Çok seviyeli ürün ağacı, rota, maliyet kırılımı (malzeme / işçilik / genel gider / döviz payı), kayıtlı maliyetle sapma, yeni ürün |
| | Malzeme Kartları | Para birimi, tedarik süresi, emniyet stoğu, parti politikası; tedarikçi teklifleri, fiyat geçmişi, lotlar |
| | **Maliyet & Kur** | Güncel kuru tek tıkla çekme veya elle girme, **kur değişiminin maliyet etkisi önizlemesi**, kur geçmişi, tablodan satır içi fiyat düzenleme, toplu % fiyat güncelleme, genel gider / işçilik / standart parti ayarları |
| Planlama | MRP Çalıştırma | Ana Üretim Planı, çok seviyeli MRP, planlı sipariş önerileri, istisnalar, zaman fazlı tablo, pegging |
| | **Kapasite Planlama** | İş merkezleri (kapasite, verimlilik, saat ücreti), rota bazlı haftalık yük ısı haritası, aşırı yük tespiti |
| | İş Emirleri | Malzeme uygunluğu, operasyon süreleri, Gantt, tamamlamada FIFO lot sarfı + mamul girişi |
| Satın Alma | Talepler | Onay limiti, müdür onayına yönlendirme, yorumlar |
| | Siparişler (PO) | **Teklif karşılaştırma**, fiyat listesinden otomatik fiyat (dövizli → TL), **talebi en uygun tedarikçilere bölme**, lot/lokasyonlu kısmi mal kabul, PDF |
| | Tedarikçiler | Fiyat listesi yönetimi, **teslimat verisinden otomatik performans puanı** (zamanında teslim + kalite) |
| Depo | Stok Durumu | **Çoklu lokasyon** (Merkez / Fabrika / Fasoncu), transfer, gerekçeli sayım, **fason sevk ve dönüş**, **lot izlenebilirliği**, **barkod okutma** |
| | Stok Hareketleri | Lot ve lokasyon bilgili hareket defteri |
| Analiz & Sistem | **Analizler** | Maliyet sapması, ABC, stok devir hızı / hareketsiz stok, kur riski, **senaryo (what-if)** analizi |
| | **Veri Aktarımı** | Excel/CSV ile malzeme, ürün, reçete, stok sayımı, ana plan ve fiyat listesi; şablon, önizleme, satır bazlı doğrulama; JSON yedekten geri yükleme |
| | Raporlar / Denetim | CSV, çok sayfalı Excel, PDF yönetim özeti, JSON yedek, denetim kaydı |

## Maliyet hesabı

```
Standart maliyet = (Malzeme + İşçilik) × (1 + Genel gider %)
  Malzeme  = Σ katsayı × birim fiyat × güncel kur      (çok seviyeli)
  İşçilik  = Σ rota operasyonu: (hazırlık / std. parti + birim süre) / verimlilik × saat ücreti
```

- İthal kalemler kendi para biriminde fiyatlanır (demo: iroko USD, alüminyum profil EUR); kur güncellenince tüm maliyetler, stok değeri ve MRP önerilerinin tutarları otomatik değişir.
- Kur güncellemeden önce ana ürünlerde maliyet etkisi ve stok değeri farkı gösterilir.
- Canlı kur ECB referans kurlarından (Frankfurter) alınır, erişilemezse ExchangeRate-API denenir. TCMB servisi tarayıcıdan doğrudan erişime izin vermediğinden resmî kur elle girilebilir.
- Düzenlenebilen maliyet kalemleri: malzeme fiyatı ve para birimi, toplu % güncelleme, tedarikçi fiyat listesi, iş merkezi saat ücreti ve verimliliği, rota süreleri, genel gider oranı, standart parti, ürünün kayıtlı (ERP) maliyeti.

## MRP motoru (`assets/js/mrp-engine.js`)

1. Brüt ihtiyaç = Ana Üretim Planı + açık iş emirlerinin bileşen ihtiyaçları
2. Düşük seviye kodu (LLC) ile ağaç seviye seviye işlenir
3. Netleştirme: `eldeki (tüm lokasyonlar) − emniyet stoğu + planlı girişler (açık PO, açık talep, açık iş emri)`
4. Net ihtiyaç parti politikasına göre yuvarlanır, tedarik süresi kadar geriye kaydırılarak salım tarihi bulunur
5. Üretilen kalemlerin planlı siparişleri alt seviyeye patlatılır
6. Fason hizmetler: teslim alınan hizmet bakiyesi netleştirilir, iş emri tamamlanınca düşülür
7. İstisnalar: geçmiş salım tarihi, karşılanamayan talep, geciken PO, ihtiyaçtan sonra gelen girişler, fiyatı tanımsız kalem

## Excel ile veri aktarımı

Veri Aktarımı ekranında her tip için şablon indirilebilir (malzeme kartları, ana plan ve fiyat listesi şablonları mevcut verilerle dolu gelir). Sütun başlıkları Türkçe karakter ve büyük/küçük harf duyarsız eşleşir; ERP çıktısındaki yaygın başlıklar (ör. "Stok Kodu", "Malzeme Adı", "Termin Tarihi") tanınır. Sayılar `1.234,56` veya `1234.56`, tarihler `gg.aa.yyyy`, `yyyy-aa-gg` ya da Excel tarih hücresi olabilir. Hatalı satırlar listelenir ve atlanır.

## Demo hesaplar

| Rol | Kullanıcı | Şifre | Not |
|---|---|---|---|
| Yönetici | `admin` | `1234` | Tüm yetkiler, veri sıfırlama / geri yükleme |
| Üretim Planlama | `planlama` | `plan123` | MRP, kapasite, iş emri, maliyet, talep oluşturma |
| Satın Alma Uzmanı | `satinalma` | `satin123` | Onay limiti 10.000 ₺, fiyat listesi, mal kabul |
| Satın Alma Müdürü | `satinalma_muduru` | `mudur123` | Onay limiti 500.000 ₺, maliyet düzenleme, denetim kaydı |

> **Önemli:** Bu bir istemci tarafı uygulamadır. Kimlik doğrulama tarayıcıda yapılır ve veriler
> `localStorage`'da tutulur. Birden fazla kişinin aynı veriyle çalışması için kimlik doğrulama,
> yetkilendirme ve veri saklama bir sunucu/veritabanı katmanına taşınmalıdır.
> Önceki sürümün (v2) verileri ilk açılışta otomatik olarak yeni yapıya taşınır.

## Dosya yapısı

```
mrp-pro/
├── mrp-pro-tek-dosya.html   # tek dosya sürümü (build-single.py üretir)
├── build-single.py          # tek dosya derleyici
├── index.html
├── assets/css/app.css
└── assets/js/
    ├── utils.js        # biçimlendirme, tarih, güvenli HTML, toast/modal
    ├── data.js         # ürünler, reçeteler, iş merkezleri, rotalar, kurlar, lokasyonlar
    ├── store.js        # kalıcı durum (v3), v2 geçişi, numaralandırma, bildirim, denetim
    ├── auth.js         # roller ve yetkiler
    ├── model.js        # ürün ağacı, döviz/maliyet, lot tabanlı stok, fiyat listesi, performans
    ├── mrp-engine.js   # MRP hesaplaması
    ├── app.js          # kabuk, yönlendirme, olay delegasyonu
    └── views/          # ekranlar (dashboard, engineering, costing, planning, capacity,
                        #           purchasing, inventory, analysis, import, system)
```
