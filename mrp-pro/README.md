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

## ERP entegrasyonu

MRP Pro, kendi ERP'nizin bir modülü olarak çalışabilir (`mode: 'erp'`): kullanıcılar, yetkiler ve
ana veri ERP'den gelir; tüm işlemler REST API ile ERP'ye senkronlanır; ERP portalına iframe ile gömülür.
Sözleşme, veritabanı şeması, gömme SDK'sı ve çalışan örnek ERP sunucusu için:
**[integration/README.md](integration/README.md)**

```bash
node mrp-pro/integration/mock-erp/server.mjs   # → http://localhost:8787
```

## Modüller

| Grup | Ekran | İçerik |
|---|---|---|
| Genel | Gösterge Paneli | KPI'lar (stok değeri, kapasite tepe doluluk, kur), planlı salım grafiği, stok sağlığı, MRP istisnaları |
| Mühendislik | Ürün Ağacı | Çok seviyeli ürün ağacı, rota, maliyet kırılımı (malzeme / işçilik / genel gider / döviz payı), kayıtlı maliyetle sapma, yeni ürün |
| | Malzeme Kartları | Para birimi, tedarik süresi, emniyet stoğu, parti politikası; tedarikçi teklifleri, fiyat geçmişi, lotlar |
| | **Maliyet & Kur** | Güncel kuru tek tıkla çekme veya elle girme, **kur değişiminin maliyet etkisi önizlemesi**, kur geçmişi, tablodan satır içi fiyat düzenleme, toplu % fiyat güncelleme, genel gider / işçilik / standart parti ayarları |
| Planlama | **Satış Siparişleri** | **ERP'de açılan müşteri siparişleri otomatik gelir** ve sevk bekleyen miktar MRP'ye talep olarak girer; satır bazında karşılama (stoktan / iş emriyle / geç / planlanmadı), MRP'ye yansımamış sipariş uyarısı, planlamaya bildirim |
| | MRP Çalıştırma | Ana Üretim Planı (tahmin, stok hedefi), çok seviyeli MRP, planlı sipariş önerileri, istisnalar, zaman fazlı tablo, pegging |
| | **Kapasite Planlama** | İş merkezleri (kapasite, verimlilik, saat ücreti), rota bazlı haftalık yük ısı haritası, aşırı yük tespiti; **sonlu kapasite çizelgesi**: iş emirleri sipariş termin önceliğiyle iş merkezlerine yerleştirilir, gerçekçi bitiş, termine yetişmeyen sipariş, darboğaz, acil işaretleme, tarihleri iş emirlerine uygulama |
| | İş Emirleri | **Bağlı satış siparişi / müşteri**, malzeme uygunluğu, operasyon süreleri, Gantt, tamamlamada FIFO lot sarfı + mamul girişi |
| Satın Alma | Talepler | Onay limiti, müdür onayına yönlendirme, yorumlar |
| | Siparişler (PO) | **Teklif karşılaştırma**, fiyat listesinden otomatik fiyat (dövizli → TL), **talebi en uygun tedarikçilere bölme**, lot/lokasyonlu kısmi mal kabul, PDF |
| | Tedarikçiler | Fiyat listesi yönetimi, **teslimat verisinden otomatik performans puanı** (zamanında teslim + kalite) |
| Depo | Stok Durumu | **Çoklu lokasyon** (Merkez / Fabrika / Fasoncu / Kalite-Karantina), transfer, gerekçeli sayım, **fason sevk ve dönüş**, **lot izlenebilirliği**, **barkod okutma** |
| | Stok Hareketleri | Lot ve lokasyon bilgili hareket defteri (mal kabul, sarf, transfer, sayım, **iade**, **hurda**) |
| Kalite | **Kalite Kontrol** | **Giriş muayenesi** (malzeme türüne göre kontrol listesi), **karantina**, kabul / tedarikçiye iade / hurda kararı, **uygunsuzluk raporu (PDF)**, tedarikçi bazında kabul oranı ve **PPM**, muayene kuralları |
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

1. Brüt ihtiyaç = açık satış siparişlerinin sevk bekleyen miktarı + Ana Üretim Planı (tahmin / stok hedefi) + açık iş emirlerinin bileşen ihtiyaçları
2. Düşük seviye kodu (LLC) ile ağaç seviye seviye işlenir
3. Netleştirme: `eldeki (tüm lokasyonlar) − emniyet stoğu + planlı girişler (açık PO, açık talep, açık iş emri)`
4. Net ihtiyaç parti politikasına göre yuvarlanır, tedarik süresi kadar geriye kaydırılarak salım tarihi bulunur
5. Üretilen kalemlerin planlı siparişleri alt seviyeye patlatılır
6. Fason hizmetler: teslim alınan hizmet bakiyesi netleştirilir, iş emri tamamlanınca düşülür
7. İstisnalar: geçmiş salım tarihi, karşılanamayan talep, geciken PO, ihtiyaçtan sonra gelen girişler, fiyatı tanımsız kalem

## Excel ile veri aktarımı

Veri Aktarımı ekranında her tip için şablon indirilebilir (malzeme kartları, ana plan ve fiyat listesi şablonları mevcut verilerle dolu gelir). Sütun başlıkları Türkçe karakter ve büyük/küçük harf duyarsız eşleşir; ERP çıktısındaki yaygın başlıklar (ör. "Stok Kodu", "Malzeme Adı", "Termin Tarihi") tanınır. Sayılar `1.234,56` veya `1234.56`, tarihler `gg.aa.yyyy`, `yyyy-aa-gg` ya da Excel tarih hücresi olabilir. Hatalı satırlar listelenir ve atlanır.

## Sonlu kapasite çizelgesi

**Kapasite Planlama → Sonlu Çizelge**, açık iş emirlerini iş merkezlerinin günlük kapasitesine yerleştirir:

- **Sıra:** acil işaretli (⚑) → termin (bağlı satış siparişinin en erken termini; bağlı değilse iş emri bitişi) → serbest bırakılmış → iş emri no
- Operasyonlar rota sırasıyla yerleşir; bir operasyon önceki bitmeden başlamaz, iş merkezinin o günkü kalan dakikasını kullanır
  (verimlilik dahil süre, iş merkezinin haftalık çalışma günleri). Serbest bırakılmış iş emri bugünden, planlanan iş emri
  planlı başlangıcından (malzeme hazırlığı) önce başlamaz
- Çıktı: iş emri bazında gerçekçi başlangıç/bitiş, termine göre gecikme, etkilenen sipariş satırları, darboğaz iş merkezi
  ve operasyonları iş merkezine göre renkli Gantt
- **Tarihleri iş emirlerine uygula** çizelgeyi iş emirlerine yazar (geçmişe kaydedilir); sipariş ekranındaki karşılama tarihi
  güncellenir, termine yetişmeyen siparişler için planlamaya bildirim gider

## Satış siparişi akışı (ERP → MRP)

1. Sipariş **ERP'de açılır** (müşteri, satırlar: mamul, miktar, termin). ERP kaydı `salesOrders` koleksiyonuna yazar.
2. MRP Pro birkaç saniye içinde siparişi çeker; **Satış Siparişleri** ekranında "Yeni" olarak görünür,
   planlama ve üretime bildirim gider, gösterge panelinde ve MRP ekranında "MRP'ye yansımadı" uyarısı çıkar.
3. **MRP'yi çalıştırın:** her satırın sevk bekleyen miktarı (miktar − sevk edilen) bağımsız talep olur; ana plana
   ayrıca girilmez. Ana plan yalnızca sipariş dışı talepler (tahmin, stok hedefi) içindir.
4. Önerilen iş emirlerini ve satın alma taleplerini oluşturun. **İş emri siparişe bağlanır:** MRP önerisinden açılan
   iş emri, aynı mamulde başka kaynakla karşılanmayan sipariş satırlarına termin sırasıyla otomatik bağlanır; sipariş
   detayındaki **İş emri aç** düğmesi satırın karşılanmayan miktarı için, bitişi termine ayarlı ve bağlı bir iş emri
   açar; bağlantılar iş emri detayından (**Sipariş bağlantısı**) elle düzenlenebilir. İş emri listesinde müşteri,
   siparişte bağlı iş emirleri görünür; bağlı iş emri tamamlanınca ürettiği mamul o siparişe ayrılır ve "sevke hazır"
   bildirimi gider.
   Sipariş ekranındaki **Karşılama** sütunu her satırın nereden karşılandığını gösterir: eldeki mamul stoğu, iş emri
   (bitiş tarihi) — termin sonrası bitiyorsa **Geç** — ya da **Planlanmadı**. Önce bağlı iş emirleri, sonra stok ve
   bağlanmamış iş emri miktarı (`*` ile işaretli) termin sırasıyla dağıtılır.
5. Miktar / termin değişikliği, kısmi sevkiyat, iptal ve kapanış **ERP'de** yapılır ve aynı yolla MRP'ye gelir;
   sevk edilen miktar talepten düşer, iptal edilen sipariş talep olmaktan çıkar. MRP Pro siparişi değiştiremez.

ERP bağlantısı olmadan (bağımsız mod) sipariş bu ekrandan elle girilebilir ve kapatılabilir.

## Kalite kontrol akışı

1. **Muayene kuralı:** Malzeme kartında "Giriş kalite muayenesi gerekli" işaretlidir (varsayılan: İroko kereste, profil,
   kumaş, boya/kimyasal, yüzey malzemesi). Tür bazında toplu değişiklik **Kalite Kontrol → Muayene kuralları**'ndadır.
2. **Mal kabul (depo):** Muayeneli kalem seçilen depoya değil **Kalite / Karantina** lokasyonuna lot olarak girer ve
   bir muayene kaydı (`GKK-yıl-no`) açılır; kalite bölümüne bildirim gider. Karantinadaki stok MRP'de eldeki stok
   sayılır ama **üretime sarf edilemez**, elle transfer veya sayım yapılamaz.
3. **Muayene (kalite):** Kontrol listesi (ambalaj, miktar, ölçü, görsel, belge + türe özel: nem, budak, kaplama…),
   kabul edilen miktar ve hedef lokasyon; reddedilen miktar için sebep ve karar:
   - **Kabul** → lot karantinadan depoya aktarılır
   - **Tedarikçiye iade** → stoktan düşülür, siparişin teslim alınan miktarı azalır; sipariş (ve kapanmış talep)
     yeniden açılır, MRP eksik miktarı açık sipariş olarak görür
   - **Hurda** → stoktan düşülür, sipariş teslim alınmış sayılır
4. **Raporlama:** Ret içeren muayeneler için tedarikçiye gönderilecek **uygunsuzluk raporu (PDF)**; tedarikçi bazında
   kabul oranı, PPM ve ret değeri. Kabul oranı tedarikçi puanının kalite bileşenine yansır.

## Bölümler, roller ve demo hesaplar

Her bölüm kendi rolüyle girer, **kendi açılış ekranında** başlar ve yalnızca işine yarayan ekranları görür.
Ekranı görmek salt okunurdur; değiştirmek için rolün o işleme yetkisi olmalıdır.

| Bölüm (rol) | Kullanıcı | Şifre | Açılış | Yapabildikleri |
|---|---|---|---|---|
| Sistem Yöneticisi | `admin` | `1234` | Gösterge Paneli | Her şey; kullanıcı, rol ve firma ayarları |
| Genel Müdür | `yonetim` | `yon123` | Gösterge Paneli | Tüm ekranları görür, sınırsız talep onayı |
| Üretim Planlama | `planlama` | `plan123` | MRP | Ürün/reçete, malzeme parametreleri, MRP, kapasite, iş emri, satın alma talebi |
| Üretim Şefi | `uretim` | `uret123` | İş Emirleri | İş emri serbest bırakma/tamamlama, hatta malzeme transferi |
| Satın Alma Uzmanı | `satinalma` | `satin123` | Talepler | 10.000 ₺'ye kadar onay, sipariş, tedarikçi ve fiyat listesi |
| Satın Alma Müdürü | `satinalma_muduru` | `mudur123` | Talepler | 500.000 ₺'ye kadar onay, sipariş, tedarikçi, fiyat |
| Depo Sorumlusu | `depo` | `depo123` | Stok Durumu | Mal kabul, sayım, transfer, fason sevk/dönüş, barkod |
| Maliyet / Muhasebe | `maliyet` | `mal123` | Maliyet & Kur | Fiyat, kur, genel gider, saat ücretleri; analizler |
| Kalite Kontrol | `kalite` | `kal123` | Kalite Kontrol | Giriş muayenesi, karantina kararı (kabul / iade / hurda), muayene kuralları |

Roller **Kullanıcılar & Roller** ekranından yönetilir (yönetici):
- **Yetki matrisi:** hangi bölümün hangi ekranı gördüğü (○) veya düzenlediği (●)
- **Roller:** ekranlar, işlem yetkileri, açılış ekranı ve onay limiti; yeni bölüm rolü (ör. Bakım, Sevkiyat)
- **Kullanıcılar:** ekleme, rol atama, parola belirleme (yalnızca SHA-256 özeti saklanır), pasife alma
- **Firma Ayarları:** resmî logo dosyalarını (SVG / PNG / JPG, en fazla 3) ve firma adını yükleme

> Varsayılan bg group logosu şirketin resmî logosudur (bngint.com; `index.html` içinde gömülü PNG).
> EXIT logosu uygulamaya özel SVG çizimidir (bilinçli olarak bu haliyle kullanılır).
> İstenirse **Firma Ayarları**'ndan farklı logolar yüklenebilir; yüklenenler varsayılanların yerine gösterilir.

> **Önemli:** Bağımsız modda kimlik doğrulama tarayıcıda yapılır ve veriler `localStorage`'da tutulur.
> Çok kullanıcılı gerçek kullanım için ERP modunu kullanın: kimlik doğrulama, yetkilendirme ve veri
> saklama ERP sunucusuna geçer (bkz. integration/README.md).
> Önceki sürümün (v2) verileri ilk açılışta otomatik olarak yeni yapıya taşınır.

## Dosya yapısı

```
mrp-pro/
├── mrp-pro-tek-dosya.html   # tek dosya sürümü (build-single.py üretir)
├── build-single.py          # tek dosya derleyici
├── integration/             # ERP sözleşmesi (OpenAPI), SQL şeması, gömme SDK'sı, örnek ERP sunucusu
├── index.html
├── assets/css/app.css
└── assets/js/
    ├── config.js       # çalışma modu (standalone / erp), API adresi, gömme ayarları
    ├── utils.js        # biçimlendirme, tarih, güvenli HTML, toast/modal
    ├── data.js         # ürünler, reçeteler, iş merkezleri, rotalar, kurlar, lokasyonlar
    ├── store.js        # kalıcı durum (v3), v2 geçişi, numaralandırma, bildirim, denetim
    ├── auth.js         # roller ve yetkiler
    ├── model.js        # ürün ağacı, döviz/maliyet, lot tabanlı stok, fiyat listesi, performans
    ├── mrp-engine.js   # MRP hesaplaması
    ├── backend.js      # ERP bağlantısı: oturum, anlık görüntü, değişiklik gönder/çek, numara blokları
    ├── embed.js        # gömülü mod: üst sayfayla postMessage köprüsü
    ├── app.js          # kabuk, yönlendirme, olay delegasyonu
    └── views/          # ekranlar (dashboard, engineering, costing, planning, capacity,
                        #           purchasing, inventory, quality, analysis, import, system, users)
```
