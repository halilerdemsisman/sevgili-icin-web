# MRP Pro — Malzeme İhtiyaç Planlama

Tarayıcıda çalışan, kurulum gerektirmeyen bir MRP (Material Requirements Planning) uygulaması.
`index.html` dosyasını açmanız yeterlidir (veya klasörde `python3 -m http.server` ile sunun).

## Modüller

| Grup | Ekran | İçerik |
|---|---|---|
| Genel | Gösterge Paneli | KPI'lar, planlı salım grafiği, stok sağlığı, MRP istisnaları, son hareketler |
| Mühendislik | Ürün Ağacı | 1.582 mamul, **çok seviyeli** ürün ağacı (mamul → yarı mamul → hammadde), standart maliyet hesabı, kayıtlı maliyetle fark analizi, yeni ürün/reçete tanımı |
| | Malzeme Kartları | Tedarik tipi, tedarik süresi, emniyet stoğu, parti politikası (L4L / sabit parti / minimum sipariş) |
| Planlama | MRP Çalıştırma | Ana Üretim Planı (MPS), MRP motoru, planlı sipariş önerileri, istisna mesajları, haftalık zaman fazlı tablo ve pegging |
| | İş Emirleri | MRP önerisinden veya manuel iş emri, malzeme uygunluk kontrolü, Gantt takvimi, tamamlamada otomatik sarf + mamul girişi |
| Satın Alma | Talepler | MRP önerilerinden talep, tutar bazlı onay limiti, müdür onayına yönlendirme, yorumlar, geçmiş |
| | Siparişler (PO) | Tedarikçi önerisi (kategori uyumu + puan), iskonto/KDV, kısmi mal kabul, kalite reddi, PDF sipariş formu |
| | Tedarikçiler | Kart, kategori, puan, sipariş geçmişi, aktif/pasif |
| Depo | Stok Durumu / Hareketler | Eldeki, emniyet, siparişteki miktar, stok değeri, gerekçeli sayım düzeltme, hareket defteri |
| Sistem | Raporlar / Denetim | CSV, Excel (çok sayfalı), PDF yönetim özeti, JSON yedek, denetim kaydı |

## MRP motoru (`assets/js/mrp-engine.js`)

1. Brüt ihtiyaç = Ana Üretim Planı + açık iş emirlerinin bileşen ihtiyaçları
2. Düşük seviye kodu (LLC) ile ağaç seviye seviye işlenir — bir kalem, tüm üst kalemleri işlendikten sonra netleştirilir
3. Netleştirme: `eldeki − emniyet stoğu + planlı girişler (açık PO, açık talep, açık iş emri)`
4. Net ihtiyaç parti politikasına göre yuvarlanır, tedarik süresi kadar geriye kaydırılarak **salım tarihi** bulunur
5. Üretilen kalemlerin planlı siparişleri alt seviyeye patlatılır
6. İstisnalar: geçmiş salım tarihi, karşılanamayan talep, geciken PO, ihtiyaçtan sonra gelen girişler, fiyatı tanımsız kalem

Öneriler talebe / iş emrine dönüştürüldükten sonra MRP otomatik yeniden çalışır; dönüştürülen miktarlar
planlı giriş sayıldığı için aynı öneri tekrar üretilmez.

## Demo hesaplar

| Rol | Kullanıcı | Şifre | Not |
|---|---|---|---|
| Yönetici | `admin` | `1234` | Tüm yetkiler, veri sıfırlama |
| Üretim Planlama | `planlama` | `plan123` | MRP, iş emri, talep oluşturma |
| Satın Alma Uzmanı | `satinalma` | `satin123` | Onay limiti 10.000 ₺ |
| Satın Alma Müdürü | `satinalma_muduru` | `mudur123` | Onay limiti 500.000 ₺, denetim kaydı |

> **Önemli:** Bu bir istemci tarafı demodur. Kimlik doğrulama tarayıcıda yapılır ve veriler
> `localStorage`'da tutulur. Gerçek kullanımda kimlik doğrulama, yetkilendirme ve veri saklama
> bir sunucu/veritabanı katmanına taşınmalıdır.

## Dosya yapısı

```
mrp-pro/
├── index.html
├── assets/css/app.css
└── assets/js/
    ├── utils.js        # biçimlendirme, tarih, güvenli HTML, toast/modal
    ├── data.js         # ürünler, reçete şablonları, malzeme kartı varsayılanları
    ├── store.js        # kalıcı durum, belge numaralandırma, bildirim, denetim
    ├── auth.js         # roller ve yetkiler
    ├── model.js        # ürün ağacı, maliyet, stok işlemleri
    ├── mrp-engine.js   # MRP hesaplaması
    ├── app.js          # kabuk, yönlendirme, olay delegasyonu
    └── views/          # ekranlar
```

## Önceki sürüme göre düzeltilen hatalar

- Reçete şablonlarındaki `b` alanı satır **tutarı** olduğu hâlde `katsayı × b` ile ikinci kez çarpılıyordu
  (ör. LARA masada iroko 4.323 ₺ yerine 242 ₺ hesaplanıyordu). Birim fiyat artık `b / k` olarak türetiliyor.
- Mal kabulde yapılan stok güncellemesi kalıcı değildi; sayfa yenilenince kayboluyordu.
- Kısmi teslimattan sonra kalan miktar teslim alınamıyordu; reddedilen teslimat yine de stoğa ekleniyordu.
- PO / tedarikçi numaraları kayıt sayısından üretildiği için çakışabiliyordu.
- Kullanıcı girdileri (yorum, not, ürün adı) `innerHTML` ile kaçışsız basılıyordu (XSS).
- Stok tablosu `<tbody>` içine ikinci bir `<table>` yazıyordu.
- `toISOString()` kullanımı Türkiye saatinde gece yarısına yakın tarihleri bir gün kaydırıyordu.
- PDF'lerde Türkçe karakterler bozuluyordu.
- Ctrl+R tarayıcı yenilemesi engelleniyordu; grafiklerde uydurma trend verisi gösteriliyordu.
