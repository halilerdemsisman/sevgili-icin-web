# EXIT Garden: Bayi Web Sitesi ve Satış Masaüstü Uygulaması
## Analiz ve Faz Planı

Hazırlanma: 12 Kasım 2026 · Son güncelleme: 13 Kasım 2026 (Faz 0, 1a, 1b-1, 1b-2, 2a, 2b-1 ve 3a tamamlandı)
Girdi: `Bayi_Satis_Kod.zip` (iki HTML uygulama, sunucu, PWA, modüller, ekran görüntüleri) ve `BAYI_SATIS_RAPOR.md`.

Hedef:
- **Bayi uygulaması:** İnternetten erişilen bir **web sitesi** (ör. `https://bayi.exitgarden.com`). Bilgisayarda, tablette ve telefonda çalışır; telefona kurulabilir (PWA).
- **Satış uygulaması:** Satış ekibinin bilgisayarına kurulan bir **masaüstü uygulaması** (Windows kurulum dosyası, kendi penceresi ve simgesi, otomatik güncelleme).
- İkisi de **aynı şirket sunucusuna (API)** bağlanır. Veri tarayıcıda değil, sunucudaki veritabanında tutulur.

---

## 1. Yönetici özeti

Mevcut iki uygulama işlevsel olarak zengin: katalog, renk önizleme, sipariş, değişiklik/iptal, cari, ödeme, özel teklif, iade, analiz, yapay zekâ. Bu işlevler korunacak.

Ancak bugünkü yapı **bayileri internete açmak için güvenli değil**. Uygulamanın tamamı tarayıcıda çalışıyor, sunucu yalnızca anahtar-değer deposu:

1. Sunucu API'sinde **kimlik doğrulama yok**. `GET /api/veri` adresini çağıran herkes tüm bayilerin siparişlerini, cari hesaplarını, dekontlarını ve kullanıcı şifre özetlerini alıyor. `POST /api/veri` ile herkes her şeyi değiştirebiliyor.
2. Giriş ve yetki kontrolü tarayıcıda yapılıyor. "Temsilci yalnız kendi bayilerini görür" kuralı da yalnızca ekranda uygulanıyor; veri yine de temsilcinin tarayıcısına iniyor.
3. Aynı anda iki bayi sipariş verirse **aynı sipariş numarası** üretiliyor ve sunucu numaraya göre birleştirdiği için **siparişlerden biri kayboluyor** (ayrıntı: 3.2; Faz 0'da testle doğrulandı).
4. Dekontlar ve iade fotoğrafları ortak `localStorage` anahtarlarına gömülü. Ortak veri tarayıcı kotasını (Chromium'da ölçülen ~8 milyon karakter) aşınca sayfa "Sunucuya bağlı" görünmeye devam eder ama **verinin bir kısmı tarayıcıya sessizce yüklenmez** (Faz 0'da testle doğrulandı). Her bayi tüm bayilerin dekontlarını indirir.

Bu nedenle plan, ekranları baştan yazmak yerine **önce sunucuyu gerçek bir API + veritabanı + giriş sistemine dönüştürmek**, sonra iki uygulamayı bu API'ye taşımak üzerine kurulu. Mevcut arayüz tasarımı, ekran akışları ve iş kuralları büyük ölçüde yeniden kullanılır.

| Faz | Konu | Sonuç |
|---|---|---|
| 0 | Hazırlık ve kaynak düzeni | Kod repoda, görseller dosya, katalog JSON, mevcut davranışın test kaydı |
| 1a | Güvenli geçiş sunucusu (giriş, yetki, numara, dosyalar) — mevcut ekranlarla | Veriler korunuyor; sipariş no sunucuda; dosyalar diskte; internete açılabilir |
| 1b-1 | Canlıya geçiş (VPS) | Sunucuda fiyat denetimi, şifre değiştirme/sıfırlama, VPS kurulum ve taşınma paketi |
| 1b-2 | Veritabanı ve REST API | SQLite, kredi limiti sunucuda, anlık bildirim, yapay zekâ anahtarı sunucuda, REST v1; Faz 2–3'ün temeli |
| 2a | Bayi web sitesi: temel | Ayrı dosyalar + WebP, sayfa adresleri, yeni menü ve telefon düzeni, XSS denetimi |
| 2b-1 | Bayi web sitesi: veri | Kayıtlar REST ile (numara, fiyat sunucuda, sonuç beklenir), iş verisi tarayıcıda saklanmaz, çevrimdışı sipariş engeli |
| 2b-2 | Bayi web sitesi: ekranlar | Ekranlar modüllere bölünür, sarmalama zincirleri birleşir, renk önizleme ortak modülde, TR/EN dosyaları |
| 2c | Bayi web sitesi: yayın | Erişilebilirlik ve Lighthouse denetimi, alan adıyla pilot bayiler |
| 3a | Satış masaüstü uygulaması | Electron uygulaması, Windows kurulumu, otomatik güncelleme, bildirim/sayaç/ayrı pencere/kısayollar |
| 3b-1 | Satış: çok kullanıcılı çalışma ve pilot hazırlığı | Kayıt düzeyinde yazma (V3), çifte karar engeli, canlı veri, çevrimdışı salt okunur görünüm, güncelleme turunun denenmesi, pilot rehberi |
| 3b-2 | Satış masaüstü: pilot ve ekranlar | Kod imzalama, Windows'ta pilot, satış ekranlarının modüllere bölünmesi (2b-2 ile aynı yaklaşım) |
| 4 | Entegrasyonlar | Online ödeme doğrulama, MRP/ERP aktarımı, e-posta/SMS bildirimleri |
| 5 | Canlıya geçiş ve işletme | Veri göçü, yedek, izleme, KVKK, eğitim |

Faz 1, 2a, 2b-1, 3a ve 3b-1 tamamlandı; Faz 2b-2 ve 3b-2 paralel yürüyebilir.

**Durum:** Faz 0 ✅ · Faz 1a ✅ · Faz 1b-1 ✅ · Faz 1b-2 ✅ · Faz 2a ✅ · Faz 2b-1 ✅ · Faz 3a ✅ · Faz 3b-1 ✅ (bkz. bölüm 5) · **canlıya alma:** canlı verinin VPS'e taşınması (`dagitim/TASINMA.md`; alan adı, VPS ve MRP kararları bekleniyor) · **sıradaki:** Windows pilotu (`satis-masaustu/PILOT.md`; kod imzalama sertifikası kararı bekleniyor) ve ekranların modüllere bölünmesi (2b-2 + 3b-2).

**Verilen kararlar (12 Kasım 2026):**
- Sunucu VPS'te olacak.
- Mevcut `veri.json` canlı kullanımda; taşınacak.
- Bayiler hesaplarını kendileri açacak.

Faz 1a ile rapordaki kritik sorunların (🔴) tamamı kapatıldı ve testlerle doğrulandı. Sistem, önüne HTTPS konarak bayilere internetten açılabilir durumdadır (kurulum: `sunucu/KURULUM.md`).

---

## 2. Mevcut durum analizi

### 2.1 Paket

| Parça | Boyut | Not |
|---|---|---|
| `exit_bayi_siparis.html` | 3,2 MB | 87 gömülü görsel (data URI). Görseller çıkınca kod ~380 KB, ~3.000 satır, ~110 fonksiyon |
| `exit_satis_paneli.html` | 3,1 MB | 67 gömülü görsel. Kod ~350 KB, ~2.400 satır, ~85 fonksiyon |
| `telefon/index.html` | 3,2 MB | `exit_bayi_siparis.html` ile **byte byte aynı** (doğrulandı) |
| `moduller/` | 130 KB | ek6–ek11; HTML'lerin içinde zaten var |
| `sunucu/sunucu.js` | 5,7 KB | Node.js, paketsiz. Veri `veri.json`, saatlik kontrol ile günlük yedek (30 gün) |
| Ürün verisi (`const VERI`) | 2,8 MB | 73 ürün, 158 seçenek, 6 kumaş; 9 kategori (22 sandalye, 12 şezlong, 11 oturma grubu, 11 masa, …). Fotoğraflar JSON içinde base64 |

Ek: rapor dosyası ile zip içindeki `RAPOR.md` aynı.

### 2.2 Güçlü yanlar (korunacak)
- İş akışları olgun: sipariş durum adımları, değişiklik/iptal talebi, iskontolu net tutar, ödeme bekleniyor → ödendi, kredi limiti kontrolü, özel teklif → sepete ekleme, iade, numune, hatırlatma, bayi hedef/prim.
- Görsel tasarım tutarlı ve kurumsal (koyu lacivert + sarı vurgu, açık/koyu tema).
- Renk önizleme (fotoğraf üzerinde Lab uzayında maskeli boyama) rakiplerden ayırt edici bir özellik.
- TR/EN dil desteği bayi tarafında var.
- Sunucu çevrimdışı kuyruk ve günlük yedek gibi pratik önlemler içeriyor.

### 2.3 Mimari özet (bugün)

```
Tarayıcı (bayi veya satış)                     sunucu.js
┌───────────────────────────┐   GET api/veri   ┌──────────────────┐
│ Tüm iş kuralları + ekran   │ ───────────────▶ │ veri.json        │
│ localStorage (exb-/exs-)   │ ◀─────────────── │ {anahtar: metin} │
│ setItem yakalanır ────────────── POST ──────▶ │ birleştir / son  │
│ 4 sn'de bir degisen ◀──────────── GET ─────── │ yazan kazanır    │
└───────────────────────────┘                   └──────────────────┘
```

Sunucu verinin anlamını bilmiyor; her anahtar bütün halinde (ör. tüm siparişler listesi) gidip geliyor.

---

## 3. Tespit edilen sorunlar

Önem: 🔴 kritik (internete açılmadan çözülmeli), 🟠 yüksek, 🟡 orta.

### 3.1 Güvenlik
| # | Önem | Sorun | Kanıt | Durum |
|---|---|---|---|---|
| G1 | 🔴 | API'de kimlik doğrulama yok; tüm veri herkese açık ve herkes yazabilir | `sunucu.js`: `/api/veri` GET/POST, `/api/degisen` kontrolsüz | ✅ 1a |
| G2 | 🔴 | Bayi ve satış kullanıcılarının şifre özetleri (`exb-kullanicilar`, `exs-kullanicilar`) her istemciye iniyor | ortak anahtarlar senkronda | ✅ 1a |
| G3 | 🔴 | Şifre özeti tuzsuz SHA-256 (`'exitbayi:' + şifre`). Sızarsa sözlük saldırısıyla kolayca çözülür | `ozet()`, bkz. bölüm 8 | ✅ 1a (scrypt; eski özetler ilk girişte yükseltilir) |
| G4 | 🔴 | Yetki (temsilci/bayi ayrımı, onay yetkisi) yalnız arayüzde. Tarayıcı konsolundan her şey değiştirilebilir | `ben` nesnesi istemcide | ✅ 1a (sunucu süzer ve denetler) |
| G5 | 🟠 | Varsayılan yönetici `satis / 1234`; giriş ekranında yazıyor | `satis/sablon.html:83`; testle doğrulandı (G5) | ✅ 1a |
| G6 | 🟠 | Claude API anahtarı tarayıcıda saklanıp doğrudan tarayıcıdan çağrılıyor | `satis/parcalar/03-ana.js:299` | ✅ 1b-2 (anahtar sunucuda; istek sunucu üzerinden, model/alan/çıkış/saatlik sınırlı) |
| G7 | 🟠 | Sunucu HTTP; oturum yönetimi, hız sınırı, kilitleme, işlem kaydının sunucuda tutulması yok | | ✅ 1a + 1b-1 (oturum, deneme sınırı, işlem kaydı, güvenlik başlıkları; VPS paketinde Caddy ile HTTPS, HSTS, güvenlik duvarı) |
| G8 | 🟡 | HTML'in büyük kısmı `innerHTML` ile kuruluyor (bayi 48, satış 67 yer). `esc()` yardımcı fonksiyonu var; bayilerin girdiği metinlerin (firma adı, not, açıklama) her yerde kaçışlandığı denetlenmeli (XSS riski) | | ✅ 2a (zararlı bayi testiyle denetlendi: 40 alanın hiçbiri çalışmadı; dosya alanlarına `javascript:` yazılabiliyordu, sunucuda kapatıldı; web sitesi ve satış paneline içerik güvenliği başlığı) |

### 3.2 Veri bütünlüğü
| # | Önem | Sorun | Durum |
|---|---|---|---|
| V1 | 🔴 | **Sipariş numarası çakışması.** Numara tarayıcıda `o yılki sipariş sayısı + 1` ile üretiliyor (`kaynak/bayi/parcalar/03-ana.js:294`). İki bayi 4 saniyelik senkron aralığında sipariş verirse ikisi de aynı numarayı alır. Sunucu `exb-siparisler`'i `no`'ya göre birleştirirken aynı no'lu kayıtta yeni geleni tutar; **ilk sipariş sessizce silinir**. Faz 0 testinde iki bayi aynı anda sipariş verdi, sunucuda tek sipariş kaldı. Aynı numaralandırma deseni iade (`IAD-`), online ödeme (`OL-`) ve teklif (`OT-`) numaralarında da var. | ✅ 1a (numara sunucudan; çakışan yeniden numaralanır) |
| V2 | 🔴 | **Dosyalar localStorage'da.** Dekont (PDF ≤1,5 MB veya küçültülmüş fotoğraf), iade fotoğrafları, logo base64 olarak ortak anahtarlara yazılıyor. Her istemci tüm ortak veriyi `localStorage`'a yazar; Chromium'da ölçülen sınır ~8 milyon karakter. Sınır aşılınca senkron katmanındaki yükleme döngüsü ilk hatada durur: rozet "Sunucuya bağlı" der, ama o anahtar ve **sonrasındaki anahtarlar tarayıcıda yoktur** (Faz 0 testinde `exb-odeme` ve `exs-cari` yüklenmedi). Eksik veriyle çalışan kullanıcı birleştirme dışındaki bir anahtarı (ör. cari) güncellerse sunucudaki tam veriyi ezer. | ✅ 1a (dosyalar diske; tarayıcıya yalnız kendi verisi; eksik yükleme algılanır) · 2b-1: bayi sitesinde iş verisi tarayıcıya hiç yazılmaz |
| V3 | 🟠 | Birleştirme listesi dışındaki anahtarlarda (cari, kampanya, fiyat, müşteri, hedef…) son yazan kazanır; iki satışçı aynı anda düzenlerse biri kaybolur. | ✅ 1a: kullanıcı sözlükleri ve temsilci yazmaları birleştirilir · 2b-1: bayinin bütün kayıt yazmaları REST'te · 3b-1: bütün anahtarlarda kayıt düzeyinde yazma (yama), karar ekranlarında koşullu yazma; aynı kaydı iki kişi değiştirirse sonra yazanınki kalır |
| V4 | 🟠 | Fiyat/iskonto/kredi limiti hesapları istemcide. Sunucu, bayinin gönderdiği tutara güveniyor. | ✅ 1b-1 + 1b-2 (birim fiyat denetimi; kredi limiti sunucuda; REST siparişinde fiyatı sunucu belirler) |
| V5 | 🟡 | Her açılışta ve her değişiklikte tüm veri gidip geliyor; sipariş sayısı arttıkça yavaşlar (ilk yükleme senkron XHR ile sayfayı kilitliyor). | ✅ 1a + 1b-2 (herkes yalnız kendi verisini indirir; 4 sn'lik yoklama yerine anlık bildirim) |

### 3.3 Kod ve bakım
| # | Önem | Sorun | Durum |
|---|---|---|---|
| K1 | 🟠 | Tek dosya, kaynak üretici (`build.py`) kayıp. Görseller kodun içinde; her düzenlemede 3 MB'lık dosya açılıyor, git farkları okunamıyor. | ✅ 0 |
| K2 | 🟠 | "ek" modülleri global fonksiyonları sarmalayarak ekleniyor: bayi portalında 11 fonksiyon 34 kez (`urunAc` 6, `cariSayfa` 5, `git` 4), satış panelinde 14 fonksiyon 31 kez (`git` 8, `durumYaz` 5) sarılmış. Sıra bağımlı, hatası zor bulunur. Tam liste: `docs/SARMALAMA_HARITASI.md`. | ⏳ 2–3 |
| K3 | 🟡 | `telefon/index.html` elle kopyalanıyor; unutulursa telefon sürümü geride kalır. | ✅ 0 (derleme üretir) |
| K4 | 🟡 | Otomatik test yok. | ✅ 0 → 3b-1 (129 test) |

### 3.4 Arayüz (ekran görüntülerinden)
| # | Önem | Sorun | Durum |
|---|---|---|---|
| A1 | 🟡 | Bayi üst menüsü 1440 px'de bile taşıyor: 11 öğe + arama + kullanıcı; kullanıcı adı kesiliyor ("Deniz Ba…"), "Cari hesabım" ve "Özel teklif" iki satıra kırılıyor. Telefonda daha da sıkışık. | ✅ 2a (5 ana öğe + hesap menüsü; telefonda alt sekme çubuğu) |
| A2 | 🟡 | Siparişlerim sayfasında "Sık aldıklarım" başlığı koyu başlık bandının üstüne biniyor, okunmuyor. | ✅ 2a |
| A3 | 🟡 | Satış panelinde "Sunucuya bağlı" rozeti sol menünün son öğesinin ("Ürünler ve fiyatlar") üzerine biniyor. | ✅ 3a (menünün altında sabit durum çubuğu; menü ekrana sığmazsa kendi içinde kayar, Çıkış düğmesi artık 900 px yükseklikte de erişilebilir) |
| A4 | 🟡 | Sayfalar URL'ye bağlı değil (`git('katalog')`); geri tuşu, yer imi, link paylaşımı (ör. bir siparişe link) çalışmıyor. Web sitesi için gerekli. | ✅ 2a (web sitesinde) |

---

## 4. Hedef mimari

```
               İnternet (HTTPS)                         Şirket içi / VPS
┌──────────────────────────┐                 ┌───────────────────────────────────┐
│ Bayi web sitesi          │                 │ EXIT API (Node.js)                │
│ bayi.exitgarden.com      │ ──REST/JSON──▶  │  • Giriş, oturum, rol & yetki     │
│ (tarayıcı + PWA)         │                 │  • İş kuralları: fiyat, iskonto,  │
└──────────────────────────┘                 │    limit, numaralandırma, durum   │
┌──────────────────────────┐                 │  • Dosya yükleme (dekont, foto)   │
│ Satış masaüstü (Windows) │ ──REST/JSON──▶  │  • Anlık bildirim (SSE)           │
│ Electron kabuğu          │ ◀──anlık olay── │  • İşlem kaydı (audit)            │
└──────────────────────────┘                 │  • Claude API vekili (anahtar     │
                                             │    sunucuda)                      │
                                             ├───────────────────────────────────┤
                                             │ Veritabanı: SQLite → PostgreSQL   │
                                             │ Dosyalar: /dosyalar (dekont, foto)│
                                             │ Görseller: /gorsel (katalog)      │
                                             └───────────────────────────────────┘
                                                        │ Faz 4
                                                        ▼
                                              MRP · ERP · Ödeme kuruluşu
```

### 4.1 Sunucu (API)
- **Dil/ortam:** Node.js LTS (ekip zaten kullanıyor). Az ve bilinen bağımlılıklar: HTTP katmanı (Fastify veya Express), veritabanı sürücüsü, şifre özeti (argon2/bcrypt), dosya yükleme.
- **Veritabanı:** Başlangıçta **SQLite** (tek dosya, kurulum yok, şirket sunucusu için yeterli). Bayi sayısı ve eşzamanlı kullanım büyürse aynı şemayla PostgreSQL'e geçilir.
- **Tablolar (ilk taslak):** `kullanici` (bayi/temsilci/yönetici, rol), `bayi` (firma, iskonto, fiyat grubu, temsilci, kredi limiti, ödeme linki), `urun`, `urun_secenek`, `fiyat`, `kampanya`, `siparis`, `siparis_kalem`, `siparis_gecmis`, `degisiklik_talebi`, `cari_hareket`, `odeme`, `teklif`, `iade`, `numune`, `hatirlatma`, `duyuru`, `crm_gorusme`, `hedef`, `dosya`, `islem_kaydi`, `sayac` (numaralandırma).
- **Kurallar sunucuda:** Sipariş tutarı sunucu fiyat listesinden yeniden hesaplanır; iskonto, kredi limiti, durum geçişleri (yeni → onay → üretim → sevk) sunucuda doğrulanır. Numara tek bir sayaçtan, işlem içinde verilir.
- **Yetki:** Bayi yalnız kendi kayıtlarını görür; temsilci yalnız atandığı bayileri; yönetici hepsini. Her uç noktada sunucu tarafında kontrol.
- **Giriş:** scrypt şifre özeti (Node'un kendi kütüphanesi; ek paket yok — Faz 1a'da uygulandı), HttpOnly + Secure çerez ile oturum (bayi web), masaüstü için kısa ömürlü erişim + yenileme token'ı. Hatalı giriş sınırı (1a), şifre sıfırlama (e-posta, 1b), ilk girişte şifre değiştirme zorunluluğu (1b).
- **Anlık güncelleme:** 4 sn'lik yoklama yerine Server-Sent Events: "yeni sipariş", "ödeme bildirimi", "sipariş durumu değişti".
- **Dosyalar:** Dekont, iade fotoğrafı, logo diskte; veritabanında yalnız yolu. Sadece yetkili kullanıcı indirebilir.

### 4.2 Bayi web sitesi
- **Teknoloji:** Mevcut vanilla JS korunur, ES modüllerine bölünür, derleme için **Vite** (tek komutla küçültülmüş dosyalar üretir; framework zorunlu değil). Ekranlar dosya dosya ayrılır: `katalog/`, `urun/`, `sepet/`, `siparisler/`, `cari/`, `belgeler/`, `teklif/`, `projeler/`, `hesap/`.
- **Adresler:** `/katalog`, `/katalog/sandalyeler`, `/urun/21-neo`, `/sepet`, `/siparisler`, `/siparisler/EXG-2026-0001`, `/cari`, `/belgeler`, `/ozel-teklif`. Geri tuşu ve link paylaşımı çalışır.
- **Responsive düzen:**
  - Masaüstü: üst çubukta ana 5 öğe (Katalog, Siparişlerim, Cari, Belgeler, Özel teklif) + sağda arama, bildirim, sepet, kullanıcı menüsü (Projeler, Adresler, Dil, Tema, Çıkış bu menüye).
  - Tablet/telefon: alt sekme çubuğu (Katalog, Siparişler, Sepet, Cari, Daha fazla) ve hamburger menü.
- **Görseller:** Katalog fotoğrafları ayrı WebP dosyaları, farklı boyutlarda (küçük resim / büyük), tembel yükleme. İlk açılış 3,2 MB'tan ~300 KB'a iner.
- **PWA:** Manifest ve service worker korunur; derleme sırasında otomatik sürüm numarası (elle `telefon/` kopyalama biter).
- **Çevrimdışı:** Katalog ve fiyatlar önbellekten görüntülenir; sipariş gönderme bağlantı gerektirir (sessiz kuyruk yerine açık uyarı).
- **TR/EN** korunur; çeviriler ayrı dosyalara (`tr.json`, `en.json`) taşınır.
- **Herkese açık sayfa (isteğe bağlı):** Giriş öncesi bayilik başvuru formu ve kurumsal tanıtım.

### 4.3 Satış masaüstü uygulaması
- **Önerilen teknoloji: Electron.** Gerekçe: mevcut kod HTML/JS; ekip Node.js kullanıyor; Windows kurulum dosyası (`.exe`, NSIS) ve otomatik güncelleme (`electron-updater`) hazır. Ekranlar yeniden yazılmadan masaüstüne taşınır.
  - Alternatif **Tauri**: kurulum ~10 MB (Electron ~90 MB) ama Rust araç zinciri gerektirir. Ekipte Rust yoksa Electron daha az risklidir.
  - Ara çözüm olarak satış paneli Edge/Chrome'dan "uygulama olarak yükle" (PWA) ile de masaüstüne kurulabilir; Faz 3 tamamlanana kadar kullanılabilir.
- **Masaüstüne özel özellikler:**
  - Kendi penceresi, Başlat menüsü ve görev çubuğu simgesi, açılışta otomatik başlama (isteğe bağlı).
  - Sistem bildirimleri: yeni sipariş, ödeme bildirimi, değişiklik talebi. Görev çubuğu simgesinde bekleyen onay sayısı.
  - Bir siparişi/bayiyi **ayrı pencerede** açma (iki ekranla çalışma).
  - Klavye kısayolları: `Ctrl+K` hızlı arama (bayi, sipariş no), `Ctrl+1..9` menü, `F5` yenile.
  - Excel (`.xlsx`) ve PDF dışa aktarımı doğrudan seçilen klasöre; yazıcıya doğrudan çıktı.
  - Yerel önbellek: listeler çevrimdışıyken salt okunur görüntülenir.
  - Claude yapay zekâ özelliği sunucu üzerinden çağrılır; anahtar bilgisayarlarda tutulmaz.
- **Düzen:** Mevcut sol menü + içerik yapısı korunur; menü daraltılabilir, sunucu durum rozeti menünün altında sabit bir durum çubuğuna taşınır (A3 çözülür). Minimum pencere 1280×720.
- **Dağıtım:** Kod imzalama sertifikası (Windows SmartScreen uyarısı çıkmaması için), güncellemeler şirket sunucusundan veya GitHub Releases'ten.

### 4.4 Ortak kod ve repo düzeni

Faz 0 sonunda repo (✅ = var, ⏳ = ilgili fazda eklenecek):

```
uretim_planlama/
├── kaynak/            ✅ Bugünkü uygulamaların kaynağı: bayi/ ve satis/ (sablon.html + parcalar/),
│                         ortak/ (iki uygulamada aynı 9 blok), web/ (Faz 2a: yalnız web sitesine giren
│                         düzen, adres ve service worker dosyaları + PWA dosyaları)
├── katalog/           ✅ urunler.json, gorsel/, webp/ (2a), kumas/, maske/ + maskeler.json
├── sunucu/            ✅ Faz 1a güvenli sunucu (sunucu.js + lib/: kimlik, kurallar, depo, dosya)
│                         + lib/fiyat (1b-1) + lib/limit, lib/rest, SQLite depo (1b-2)
├── dagitim/           ✅ Faz 1b-1: VPS kurulumu (kur.sh, systemd, Caddy, yedek, güncelleme) ve TASINMA.md
├── araclar/           ✅ derle, ayikla, sarmalama haritası, veri_incele
├── testler/           ✅ Playwright uçtan uca testleri (node:test)
├── eski/              ✅ Orijinal paket (başvuru için, değiştirilmez)
├── docs/              ✅ Raporlar
├── bayi-web/          ⏳ Faz 2b-2: modüllere bölünmüş bayi ekranları (dist/web'in yerini alır)
├── satis-masaustu/    ✅ Faz 3a: Electron uygulaması (satış panelini sunucudan yükler) · 3b-1: çevrimdışı görünüm, PILOT.md; ⏳ 3b-2: satış ekranları modüllere
└── ortak/             ⏳ Faz 1–2: fiyat/iskonto hesabı, biçimler, durum adları, renk önizleme
                          motoru, API istemcisi, çeviriler (kaynak/ortak/ buraya taşınır)
```

Fiyat ve iskonto hesabı `ortak/` içinde tek yerde yazılır; hem sunucu hem arayüz aynı fonksiyonu kullanır.

---

## 5. Faz planı

Süreler tek geliştirici için kaba tahmindir.

### Faz 0: Hazırlık ve kaynak düzeni ✅ tamamlandı
Amaç: Davranışı değiştirmeden çalışılabilir bir kaynak elde etmek.
1. Orijinal paket `eski/` altına konur (değiştirilmez).
2. Ayıklama betiği: `VERI` → `katalog/urunler.json`; data URI görseller → `katalog/gorsel/` (orijinal JPEG, kayıpsız; WebP dönüşümü Faz 2'de); kumaşlar ve renk maskeleri → `katalog/kumas/`, `katalog/maske/`.
3. Her iki HTML'deki CSS ve JS blokları sırasıyla ayrı dosyalara çıkarılır; ek modüllerin sarmalama zincirleri belgelenir (hangi fonksiyon kaç kez, hangi sırayla sarılmış).
4. **Davranış kaydı:** Playwright ile mevcut sürüm üzerinde ana akışlar test olarak yazılır (kayıt, giriş, sepete ekle, sipariş, satış onayı, ödeme bildirimi, ödeme onayı, özel teklif, değişiklik talebi). Bu testler sonraki fazlarda "hiçbir şeyi bozmadık" kontrolüdür.
5. Mevcut `veri.json` (varsa) için yedek ve okuma betiği.

Teslim: Repo yapısı, ayıklanmış katalog, test paketi, sarmalama haritası.
Kabul: Testler orijinal HTML'lerde geçiyor.

**Faz 0 sonuçları**

| Çıktı | Durum |
|---|---|
| Orijinal paket | `eski/` |
| Kaynak | `kaynak/bayi` (25 parça), `kaynak/satis` (17 parça), `kaynak/ortak` (iki uygulamada birebir aynı 9 blok: senkron, tema, giriş, logo animasyonu). Görseller çıkınca HTML şablonları 19 KB ve 14 KB |
| Katalog | `katalog/urunler.json` (73 ürün), 61 fotoğraf, 6 kumaş, 20 renk maskesi |
| Derleme | `npm run derle` → `dist/`. `npm run dogrula` ile **üç HTML de (bayi, satış, telefon) orijinalle byte byte aynı** üretildi; kayıp `build.py`'nin yerini aldı |
| Sarmalama haritası | `docs/SARMALAMA_HARITASI.md` (otomatik üretilir) |
| Davranış testleri | `testler/uctan-uca.test.js`: 13 test (kayıt → sipariş → onay → değişiklik → ödeme linki → ödeme → tahsilat → özel teklif). Hem `dist/` hem `eski/` üzerinde geçiyor |
| Bilinen sorun testleri | `testler/bilinen-sorunlar.test.js`: G1 (2 test), G4, G5, V1, V2. Hepsi bugün başarısız (todo); Faz 1'in kabul ölçütü |
| Veri inceleme | `araclar/veri_incele.mjs`: canlı `veri.json`'ı yedekler, özetler (sayılar, mükerrer numara, kota doluluğu, varsayılan şifre) |

Faz 0'da yapılan ölçümle düzeltilen bilgi: Tarayıcı kotası ilk tahmindeki ~5 MB değil, Chromium'da ~8 milyon karakter. Kota aşılınca kayıt reddedilmiyor; daha kötüsü, veri sessizce eksik yükleniyor (V2).

### Faz 1a: Güvenli geçiş sunucusu ✅ tamamlandı
Amaç: Ekranlar yeniden yazılmadan (Faz 2–3 beklenmeden) kritik güvenlik ve veri sorunlarını kapatmak, sistemi internete açılabilir hâle getirmek.

Neden ikiye bölündü: Mevcut uygulamalar veriyi anahtar–değer olarak eşitliyor. Sunucu bu anahtarların anlamını öğrenip her isteği oturuma göre süzdüğünde, uygulamalarda küçük değişikliklerle (giriş ekranı, numara alma) aynı güvenlik düzeyine ulaşılabildi. Böylece veritabanı ve REST API'nin (1b) haftaları beklenmeden bayiler güvenle sisteme alınabilir.

| Yapılan | Ayrıntı |
|---|---|
| Giriş ve oturum | `/api/giris`, `/api/kayit`, `/api/cikis`; HttpOnly + SameSite çerez; bayi ve satış oturumları ayrı; 7 gün hareketsizlikte kapanır |
| Şifreler | scrypt (tuzlu). Eski tarayıcı özetleri (sha256, djb2) ilk girişte doğrulanıp yükseltilir; tarayıcıya özet gitmez (`••••`) |
| Varsayılan şifre | `satis / 1234` kapalı; giriş ekranındaki ipucu gizlendi; yönetici şifresi `node sunucu.js --yonetici-sifre` ile belirlenir |
| Okuma kuralları | Bayi: kendi siparişi, ödemesi, teklifi, iadesi, numunesi, carisi, kullanıcı kaydı, kişisel anahtarları + hedefli kampanya/duyurular. Temsilci: atandığı bayiler. Yönetici: tümü |
| Yazma kuralları | Bayi yalnız kendi kayıtlarını, yalnız izinli alanlarla değiştirir (ör. "yeni" siparişte kalem/iptal; onaylıda yalnız talep). Satış alanları (net, iskonto, durum…) bayiden kabul edilmez. Temsilci yazarken kapsam dışı kayıtlar korunur. Kullanıcı listeleri silinmez, birleştirilir |
| Numaralandırma | `/api/numara`; uygulamalar numarayı sunucudan alır (EXG, IAD, OL, OT, OB, NMN). Çakışan numarayla gelen yeni kayıt sunucuda yeniden numaralandırılır |
| Dosyalar | Dekont/fotoğraf/logo `dosyalar/` klasörüne çıkarılır, kayıtta `api/dosya/<kimlik>` adresi kalır; sahibi ve satış görür. Eski veri.json'daki gömülü dosyalar açılışta taşınır |
| Senkron katmanı | Oturumsuz veri inmez/gitmez; tarayıcı alanına sığmayan anahtar "eksik" işaretlenir ve o anahtarın değişikliği gönderilmez (sunucudaki tam veri ezilmez); çıkışta yerel kopyalar silinir |
| Koruma | Hatalı giriş sınırı (5/15 dk), kayıt sınırı, CSRF (Origin) kontrolü, güvenlik başlıkları, sunucu klasörüne erişim engeli, MRP yalnız yerel ağdan |
| İşlem kaydı | `kayitlar/islem-YYYY-AA.jsonl`: giriş, hatalı giriş, engelleme, kayıt, yazma, reddedilen yazma |
| Yedek | Günlük veri yedeği + dosyalar kopyası; kapanışta bekleyen yazmalar diske aktarılır |
| Belgeler | `sunucu/KURULUM.md` (ilk kurulum, geçiş, ayarlar, Caddy ile HTTPS, yedek) |
| Testler | 41 test: uçtan uca akış (13), bilinen sorunlar (6; `todo` kaldırıldı), sunucu kuralları (20), geçiş (2) |

Faz 1a'da bilinçli olarak yapılmayanlar (1b'ye kaldı; fiyat denetimi ve şifre işlemleri 1b-1'de yapıldı): Sunucuda fiyat/iskonto/kredi limiti doğrulaması (V4; bayi tutarı hâlâ istemcide hesaplanıyor, satış onayında görülüyor), temsilci onay limitinin sunucuda zorlanması, diğer sözlük anahtarlarında eşzamanlı yazma birleştirmesi (V3), Claude API vekili (G6), şifre sıfırlama ve şifre değiştirme ekranı.

### Faz 1b-1: Canlıya geçiş (VPS) ✅ tamamlandı
Neden öne alındı: Sistem canlı veriyle internete (VPS) çıkacak ve bayiler kendi hesaplarını açacak. Bu durumda herkesin hesap açıp sipariş verebilmesi, tarayıcıda hesaplanan fiyata güvenmeyi riskli kılıyor. Ayrıca VPS'te "şirket ağı" olmadığı için MRP erişiminin yeniden düzenlenmesi gerekti.

| Yapılan | Ayrıntı |
|---|---|
| Sipariş fiyat denetimi (V4) | `sunucu/lib/fiyat.js`: katalog fiyatı + satışın fiyat güncellemesi + bayiye geçerli en yüksek kampanya + onaylı özel teklif (yalnız teklif no'su ve sahibiyle). Bayinin birim fiyatı bunun altındaysa yükseltilir, toplam yeniden hesaplanır, siparişe `fiyatKontrol` yazılır, satış panelinde sipariş penceresinde turuncu uyarı çıkar, işlem kaydına düşer. Eşit/yüksek fiyata dokunulmaz (sepette bekleyen eski kampanya fiyatı gibi durumlarda gereksiz müdahale olmasın). Katalogda olmayan ürün fiyatsız (teklif) kaleme çevrilir |
| Şifre değiştirme | `/api/sifre`; bayi firma adına tıklayarak, satış sol menüden; diğer cihazlardaki oturumlar kapanır |
| Şifre sıfırlama | Yönetici "Temsilciler ve işlem kaydı" ekranından geçici şifre üretir (`/api/sifre-sifirla`); kullanıcı yeni şifre belirleyene kadar veri göremez/yazamaz (kapatılamaz pencere) |
| Yeni bayi kaydı bildirimi | Kendi kendine kayıt açık kaldı (karar); her kayıt satışın işlem kaydına "Yeni bayi kaydı" olarak düşer |
| MRP erişimi | Yerel ağ, `MRP_IZINLI_IP` (şirketin sabit IP'si) veya satış paneline giriş yapmış kullanıcı. Diğerlerine "önce satış paneline giriş yapın" sayfası |
| Sunucu adresi | `HOST=127.0.0.1`: Caddy arkasında port dışarıdan erişilemez (X-Forwarded-For taklidi engellenir) |
| VPS paketi (`dagitim/`) | `kur.sh` (Ubuntu: Node 22, Caddy, güvenlik duvarı, `exit` kullanıcısı, `/opt/exit` + `/var/lib/exit`, systemd, günlük yedek), `exit.service` (sıkılaştırılmış), `Caddyfile.ornek` (HTTPS, HSTS, sıkıştırma), `ortam.ornek`, `yedek.sh` (14 gün, isteğe bağlı uzak kopya), `guncelle.sh` |
| Taşınma rehberi | `dagitim/TASINMA.md`: hazırlık, deneme açılışı, veri kopyalama, `veri_incele` ile karşılaştırma, yönetici şifresi, kontrol listesi, duyuru metni, geri dönüş planı |
| Testler | 56 test (önceki 41 + fiyat denetimi 6, şifre 4, tarayıcıda şifre sıfırlama ve fiyat uyarısı 4, VPS düzeni 1) |

Test edilemeyenler: `kur.sh` gerçek bir Ubuntu VPS'te çalıştırılmadı (bu ortamda sözdizimi denetlendi, yedek betiği çalıştırıldı, systemd birimi doğrulandı). İlk kurulumda adımların çıktısı izlenmelidir.

### Faz 1b-2: Veritabanı ve REST API ✅ tamamlandı

| Yapılan | Ayrıntı |
|---|---|
| SQLite veri deposu | `sunucu/lib/depo.js`: Node'un yerleşik `node:sqlite` modülü (ek paket yok). Her değişiklik anında ve atomik yazılır (WAL); önceki 300 ms'lik kayıp penceresi kalmadı. Kayıt listeleri (sipariş, ödeme, teklif, iade, numune, mesaj) `kayit` tablosunda satır satır, bayiye göre indeksli. Eski `veri.json` ilk açılışta içe alınır (mükerrer numaralı eski siparişler de korunur). Günlük yedek: `.sqlite` + `.json`. `--yedek` (çalışırken tutarlı yedek) ve `--disa-aktar` (eski biçim) komutları. Node 22.5 altı: otomatik JSON |
| Kredi limiti sunucuda | `sunucu/lib/limit.js`: satış panelindeki risk hesabının aynısı. Temsilci limiti aşan siparişi ileri duruma geçiremez (iki sipariş anahtarında da) ve `limitOnay` yazamaz; yönetici onaylayabilir |
| Anlık bildirim | `/api/olaylar` (SSE): her yazmada sinyal; istemci hemen çeker. Bağlantı açıkken yoklama 30 sn'ye iner (sunucu yükü azalır); bayi siparişi satışa 1 sn'nin altında düşer |
| Yapay zekâ | Claude API anahtarı sunucuda (`gizli.json` veya `ANTHROPIC_API_KEY`); yönetici Ayarlar'dan girer. İstek sunucu üzerinden: yalnız `claude-opus-5-5`, izinli alanlar, en fazla 16000 çıkış, kullanıcı başına saatlik sınır, işlem kaydında token kullanımı. Tarayıcılarda kalmış eski anahtarlar silinir |
| Satış kullanıcıları | Ayarlar'dan ekleme (geçici şifre) ve silme sunucu üzerinden. Faz 1a'dan kalan iki açık kapandı: silinen kullanıcı geri gelmiyor; şifre artık senkronla (tarayıcıda üretilen özetle) değiştirilemiyor |
| REST API v1 | `sunucu/lib/rest.js`, belge `docs/API.md`: `ben`, `katalog` (bayiye özel fiyat), `siparisler` (listeleme/sayfalama/tek), `POST siparisler` (fiyat ve numara sunucuda), `cari`. Eşitleme ucuyla aynı veri ve kurallar |
| Testler | 75 test; hem SQLite hem JSON depoyla geçiyor |

Faz 2–3'e kalanlar:
- Kendi kendine şifre sıfırlama (e-posta; SMTP sağlayıcısı kararı).
- REST'in yazma uçlarının geri kalanı (ödeme bildirimi, iade, teklif, satış onayları). Bunlar yeni ekranlarla birlikte tasarlanacak.
- Diğer sözlük anahtarlarında eşzamanlı yazma (V3): yeni ekranlar REST'e geçtikçe ortadan kalkar.

### Faz 2: Bayi web sitesi (≈4–5 hafta)
Üç alt faza bölündü. 2a, ekranlar yeniden yazılmadan web sitesinin temelini kurar: bayiler hemen hızlı, adresli ve telefona uygun bir site kullanır, sonraki ekran çalışması (2b) bu temelin üstünde parça parça yapılır.

#### Faz 2a: Web sitesinin temeli ✅ tamamlandı

| Yapılan | Ayrıntı |
|---|---|
| Web derlemesi | `npm run derle` artık `dist/web/` üretir: 19 KB `index.html` + içerik özetli (`ana.47989c853c.js` gibi) 23 JS ve 16 CSS dosyası. Sunucu bunları bir yıl önbellekli, gzip'li ve ETag'li verir; değişmeyen dosya yeniden inmez. Tek dosyalık `exit_bayi_siparis.html` sunucusuz kullanım için üretilmeye devam eder |
| Görseller | `araclar/webp.mjs` 61 fotoğraftan iki boy WebP üretir (`katalog/webp/`, repoda): küçük resim 420 px (toplam 218 KB; JPEG'ler 2,1 MB idi) ve tam boy (ürün penceresi, renk önizleme, PDF katalog). Renk maskeleri ayrı dosya. Web sitesinde exitgarden.com'dan 61 büyük JPEG indirilmesi kapatıldı |
| Ölçüm (yavaş 4G, telefon) | Katalog ilk açılışta **1,2 sn**'de görünür (eski tek dosya: 10,8 sn). İlk açılış verisi: kod 143 KB (gzip) + küçük resimler. Kabul ölçütü (4G'de 3 sn altı) karşılandı |
| Sayfa adresleri (A4) | `/katalog`, `/katalog/<kategori>`, `/urun/21-neo`, `/sepet`, `/siparisler`, `/siparisler/EXG-2026-0001`, `/cari`, `/belgeler`, `/odeme`, `/ozel-teklif`, `/projeler`. Geri/ileri tuşu ürün penceresini de kapatır/açar; sayfa yenilenince aynı yerde kalınır; oturumsuz açılan bağlantı girişten sonra açılır. Sekme başlığı sayfaya göre değişir |
| Yeni menü (A1) | Bilgisayar: 5 ana öğe (Katalog, Siparişlerim, Cari hesabım, Belgeler, Özel teklif) + bildirim + sepet + firma adı. Firma adı hesap menüsünü açar: Projeler, Hatırlatmalar, Ödeme bildirimi, dil, tema, şifre, çıkış. 1280 ve 1440 px'de tek satır, firma adı kesilmiyor. Klavye ile açılır/kapanır (Enter, Esc) |
| Telefon düzeni | ≤ 900 px: alt sekme çubuğu (Katalog, Siparişler, Sepet, Cari, Daha fazla; sipariş ve sepet sayaçlı); "Daha fazla" alttan açılan menü. 375 px'de 7 sayfanın hiçbirinde yatay kaydırma yok. Cari sayfasında başlığa binen düğmeler ve taşan alt bilgi düzeltildi |
| A2 | "Sık aldıklarım" başlığı her zeminde okunur (iki sürümde de) |
| PWA | `sw.js` derlemede sürümlenir (dosya listesi + özet); yeni sürüm bir sonraki açılışta kendiliğinden gelir. Bağlantı yokken site önbellekten açılır. Kişisel veri (`/api`), satış ve MRP hiçbir zaman önbelleğe alınmaz (eski service worker veri yanıtlarını da saklıyordu) |
| XSS denetimi (G8) | `testler/xss.test.js`: kötü niyetli bir bayi profilindeki, siparişindeki, ödemesindeki, teklifindeki, iadesindeki, numunesindeki her metne zararlı kod yazar; satış panelinin bütün sayfaları, sipariş ve müşteri pencereleri ile bayi sitesinin bütün sayfaları açılır. Satış panelinde 40 alan ekrana düz metin olarak basıldı, hiçbiri çalışmadı. Bulunan tek açık: dekont/iade fotoğrafı/logo alanlarına `javascript:` adresi yazılabiliyordu; sunucu artık bu alanlarda yalnız dosya adresi veya resim/PDF kabul ediyor |
| İçerik güvenliği (CSP) | Web sitesi ve satış paneli yalnız kendi sunucusuyla konuşabilir (satış: + döviz kuru servisi). Gözden kaçmış bir XSS olsa bile veri başka siteye gönderilemez |
| Testler | 89 test (önceki 75 + web sitesi 11 + XSS 3); SQLite ve JSON depoyla geçiyor |

Değişmeyenler: Satış paneli, MRP ve tek dosyalık bayi portalı aynı çalışır. Bayi ekranlarının içi (katalog, sepet, sipariş, cari…) ve veriyi eşitleme katmanı aynıdır; bunlar 2b'de değişecek.

#### Faz 2b-1: Veri REST'ten, tarayıcıda iş verisi yok ✅ tamamlandı
Neden ikiye bölündü: Kabul ölçütünün asıl kısmı (bayi tarayıcısında iş verisi kalmaması, kayıtların REST ile yazılması) ekranlar yeniden yazılmadan sağlanabildi. Bütün kayıt yazmaları iki fonksiyondan geçecek biçimde toplandı; ekranların modüllere bölünmesi (2b-2) artık veri katmanına dokunmadan yapılabilir.

| Yapılan | Ayrıntı |
|---|---|
| REST yazma uçları | `POST /api/v1/odemeler`, `iadeler`, `numuneler`, `teklifler`; `PATCH /api/v1/siparisler/:no` (düzenleme, iptal, değişiklik/iptal talebi, proje, tahmini teslim) ve `PATCH /api/v1/teklifler/:no` (sepete eklendi). Numara, sahip, zaman ve ilk durum sunucuda; yazma eşitleme ucuyla aynı kurallardan geçer (izinli alanlar, dosyalar diske, fiyat denetimi, işlem kaydı). Kurala takılan değişiklik artık sessizce yok sayılmaz: `409` ve sunucudaki son hâl döner (ör. "Sipariş bu arada satış ekibince işleme alındı"). Liste uçları (`GET`). Belge: `docs/API.md` |
| Ekranlar REST'e | Sipariş, sipariş düzenleme/iptal/talep, ödeme bildirimi (havale ve online ödeme linki), iade/şikâyet, numune ve özel teklif talebi `kayitEkle` / `kayitGuncelle` üzerinden yazılır. Gönder düğmesi istek bitene kadar kilitlenir (çift kayıt olmaz); hata bayiye gösterilir. Dört ayrı yerdeki tarayıcıda numara üretme kodu ve eşzamanlı (sayfayı donduran) numara isteği kalktı |
| Sipariş fiyatı | Sepetten giden siparişin fiyatını sunucu belirler; sepette beklerken fiyat değiştiyse bayi "Güncel fiyatlarla toplam …" uyarısını görür. Tarayıcıda düşürülmüş fiyat yine işaretlenir ve satış "Fiyat düzeltildi" uyarısını görür |
| Tarayıcıda iş verisi yok | Bayi sitesinde sipariş, cari, ödeme, dekont, sepet, proje gibi veriler `localStorage`'a yazılmaz; yalnız sayfa açıkken bellekte durur. Önceki sürümden kalan kopyalar ilk açılışta silinir. Tarayıcıda yalnız dil, tema ve karşılaştırma listesi kalır. Böylece V2 (tarayıcı kotası) bayi sitesinde tamamen ortadan kalktı; ortak bilgisayarda çıkış yapmadan kapatılan sekme veri bırakmaz |
| Kişisel durum | Sepet, favoriler, projeler, adresler, hatırlatmalar zaten sunucudaydı (bayiye özel anahtarlar); artık yalnız sunucuda. Başka cihazda giriş yapan bayi aynı sepeti görür |
| Çevrimdışı | Bağlantı yokken sipariş ve diğer kayıtlar gönderilmez, açık uyarı çıkar, sepet korunur. Site sunucuya hiç ulaşamazsa giriş ve kayıt kapalı açılır (yerelde hesap ve sipariş oluşamaz), bağlantı gelince kendiliğinden yenilenir |
| Güvenlik | CSRF denetimi `PATCH`/`PUT`/`DELETE` isteklerini de kapsar. Aynı anda gelen iki değişiklik birbirini ezmez |
| Tek dosyalık portal | Sunucusuz kullanımda kayıtlar yine yerelde oluşur (aynı iki fonksiyonun yerel kolu; testle doğrulandı) |
| Testler | 102 test (önceki 89 + `testler/rest-yazma.test.js` 13); SQLite ve JSON depoyla geçiyor. Faz 0'ın uçtan uca akışı (kayıt → sipariş → onay → değişiklik talebi → ödeme → teklif) yeni yazma yoluyla geçiyor |

Bilinçli olarak bırakılanlar: Okumalar hâlâ eşitleme ucuyla (`/api/veri` + anlık bildirim) gelir; sepet, favori, proje gibi kişisel anahtarlar ve satış mesajlarının "okundu" işareti de eşitleme ucuyla yazılır. Bunlar tek bayinin kendi anahtarları olduğu için eşzamanlı yazma (V3) sorunu yaratmaz. Okumaların REST'e geçmesi ekranlar modüllere bölünürken (2b-2) sayfa sayfa yapılacak.

#### Faz 2b-2: Ekranlar (≈2 hafta)
1. Ekranlar modüllere bölünür, sarmalama zincirleri (K2: `urunAc` 7, `git` 5, `cariSayfa` 5 kat) tek fonksiyonda birleşir. 2a'nın `adres.js` ve `duzen.js` dosyaları sayfa geçişinin asıl parçası olur.
2. Okumalar sayfa sayfa REST'e geçer (katalog fiyatları, siparişler, cari); eşitleme ucu bayi sitesinde yalnız kişisel anahtarlar için kalır.
3. Renk önizleme motoru `ortak/` modülüne taşınır.
4. TR/EN çevirileri `tr.json` / `en.json` dosyalarına.

Kabul: Faz 0 testlerinin bayi kısmı modüllere bölünmüş ekranlarda geçiyor; sarmalama haritasında bayi tarafında sarılan fonksiyon kalmıyor.

#### Faz 2c: Yayın (≈1 hafta)
1. Erişilebilirlik ve Lighthouse denetimi (hedef: telefonda performans ≥ 85).
2. Alan adı + HTTPS ile yayın (`bayi.exitgarden.com`), önce 2–3 pilot bayi.

### Faz 3: Satış masaüstü uygulaması
Teknoloji kararı beklenmeden önerilen **Electron** ile ilerlendi (bkz. 4.3; Tauri'ye geçiş gerekirse ana süreç ~300 satırdır, satış paneline eklenen kod ikisinde de aynı kalır).

Tasarım kararı: Uygulama ekranları paketlemez, satış panelini sunucudan yükler. Böylece ekranlar ve API her zaman aynı sürümdedir ve satış ekranlarındaki her düzeltme bir sunucu güncellemesiyle bütün bilgisayarlara ulaşır. Uygulamanın kendisi (kabuk) yalnız masaüstü özellikleri değiştiğinde güncellenir.

#### Faz 3a: Masaüstü uygulaması ✅ tamamlandı

| Yapılan | Ayrıntı |
|---|---|
| Uygulama (`satis-masaustu/`) | Electron 44. İlk açılışta sunucu adresi sorulur ve sunucunun gerçekten EXIT sunucusu olduğu denetlenir; sonra hatırlanır. Pencere boyutu/yeri hatırlanır, en küçük 1280×720. Tek kopya çalışır (ikinci açılış var olan pencereyi öne getirir). Sunucuya ulaşılamazsa bağlantı hatası sayfası, bağlantı gelince kendiliğinden açılır |
| Bildirimler | Yeni sipariş talebi, değişiklik/iptal talebi, ödeme bildirimi, iade, numune, özel teklif: sistem bildirimi. Bildirime tıklayınca kayıt açılır. Anlık bildirim (SSE) sayesinde ölçülen gecikme **0,5 sn** (kabul ölçütü 2 sn). Temsilci yalnız kendi bayilerinin işlerini görür (sunucu süzer) |
| Görev çubuğu | Bekleyen iş sayısı simgenin üstünde kırmızı sayaç ve pencere başlığında; pencere kapatılınca bildirim alanında çalışmaya devam (kapatılabilir); "Bilgisayar açılınca başlat" |
| Ayrı pencere, kısayollar | Sipariş penceresinde "Ayrı pencerede aç", Ctrl+N yeni pencere; Ctrl+K hızlı arama (tarayıcıda da), Ctrl+1..9 menü sayfaları, F5, Ctrl+P, Ctrl+Shift+S (PDF) |
| Dışa aktarım ve yazdırma | Excel/CSV ve rapor dosyaları "Kaydet" penceresiyle son kullanılan klasöre; görünen sayfa PDF olarak kaydedilir; yazdırma |
| Güvenlik | Sayfa Node'a ve Electron'a erişemez (contextIsolation, sandbox), yalnız dar bir arayüz görür. Yalnız sunucunun adresinde gezinilir, dış bağlantılar varsayılan tarayıcıda açılır. Sunucu adresini yalnız uygulamanın kendi sayfası değiştirebilir. https zorunlu (yerel ağ hariç). Kamera, konum gibi izinler kapalı |
| Otomatik güncelleme | electron-updater, sunucunun `/masaustu/guncelleme/` klasöründen (yeni sunucu yolu; parça parça indirme için Range desteği). `/masaustu/indir` son kurulum dosyasına yönlendirir; satış panelinde indirme bağlantısı |
| Windows kurulum dosyası | NSIS (kurulum klasörü seçilebilir, masaüstü ve Başlat menüsü kısayolu), ~120 MB. Bu ortamda Wine ile üretildi; GitHub Actions'ta Windows makinesinde üreten iş akışı eklendi (`.github/workflows/masaustu.yml`) |
| Satış paneli (tarayıcı da) | A3 çözüldü: bağlantı rozeti menünün altındaki sabit durum çubuğunda; menü ekrana sığmazsa kendi içinde kayar (900 px yükseklikte Çıkış düğmesi ekran dışında kalıyordu). Ctrl+K hızlı arama. `/satis?ac=siparis:EXG-…` ile kayıt doğrudan açılır |
| Testler | 116 test (önceki 102 + `testler/masaustu.test.js` 14): Electron uygulaması Playwright ile gerçek test sunucusuna bağlanarak sürülür (adres sorma, yalıtım, gezinme kısıtı, bildirim ve gecikme, sayaç, bildirimden kayıt açma, ayrı pencere, kısayollar, dosya ve PDF kaydı, bağlantı hatası); tarayıcıda durum çubuğu ve hızlı arama; sunucunun güncelleme dosyalarını vermesi. Paketlenmiş uygulamanın (asar) açıldığı ayrıca denetlendi |

Doğrulanamayanlar (Windows makinesi gerekir; 3b'de pilotla):
- Kurulum dosyasının Windows'ta kurulması.
- Bildirimlerin ve görev çubuğu sayacının Windows'taki görünümü.
- Otomatik güncellemenin baştan sona çalışması: sunucuya yeni sürüm koyma, indirme, yeniden başlatınca kurulma.

Bu ortamda yalnız sunucu tarafı (güncelleme dosyalarının ve parçalarının verilmesi) test edildi.

#### Faz 3b-1: Çok kullanıcılı satış ekibi ve pilot hazırlığı ✅ tamamlandı
Neden ikiye bölündü: Plandaki "satış ekranlarını REST'e geçirme" işinin asıl amacı, birden çok satış kullanıcısının birbirinin işini ezmemesiydi (V3). İnceleme iki sorun gösterdi:
- Satış paneli her yazmada anahtarın tamamını (bütün siparişler, bütün cari) gönderiyordu.
- Ekranlar veriyi açılışta bir kez belleğe alıyordu. Başka kullanıcının değişikliği sayfa yenilenene kadar görünmüyordu. Sonraki yazmada da geri alınıyordu: bir temsilci sabah açtığı sayfadan öğleden sonra bir siparişi onaylarsa, arada başkasının yaptığı bütün değişiklikler siliniyordu.

Bu sorunlar ekranlar yeniden yazılmadan, eşitleme katmanında ve sunucuda çözüldü. Ekranların modüllere bölünmesi (3b-2) bayi tarafındaki 2b-2 ile aynı yaklaşımla birlikte yapılacak. Kod imzalama ve Windows pilotu sertifika ve makine gerektiriyor.

| Yapılan | Ayrıntı |
|---|---|
| Kayıt düzeyinde yazma | Eşitleme katmanı yalnız değişen kayıtları gönderir (sözlük girdisi, kimlikli liste kaydı, sona eklenen işlem kaydı satırı). Fark, ekranın son okuduğu/yazdığı değere göre çıkarılır. Böylece eski bir kopyadan yazan ekran başkasının değişikliğini geri almaz. Sunucu yamayı kullanıcının görünümüne uygular ve aynı kurallardan geçirir (`sunucu/lib/yama.js`). İki kullanıcı aynı anda farklı siparişleri değiştirirse ikisi de kalır. Sunucunun işlem kaydına eklediği "Yeni bayi kaydı" satırı da artık satışın yazmasıyla silinmez. Bayi sitesinin kişisel anahtarları da aynı yoldan yazılır |
| Çifte karar engeli | Ödeme bildirimini tahsilat olarak işleme/reddetme, değişiklik talebi kararı ve özel teklif kararı **koşullu** yazılır: kayıt hâlâ bekliyorsa. İki kişi aynı ödemeye aynı anda basarsa tahsilat cariye bir kez düşer. Diğerine "… bu arada … tarafından işlendi" denir, ekranı ve bellekteki carisi sunucudaki hâle döner. Bağlantı yoksa karar kaydedilmez ve bu söylenir (önceden yerelde kalıp kaybolabiliyordu) |
| Canlı veri | Başka kullanıcının değişikliği açık satış ekranına sayfa yenilenmeden gelir. Bellekteki siparişler, müşteriler, cari, kampanya, fiyat… yerinde güncellenir. Açık sayfa yazı yazılmıyorsa ve pencere açık değilse yenilenir, kaydırma konumu korunur. Fiyat geçmişi başkasının fiyat değişikliğini kendi değişikliği saymaz |
| Çevrimdışı salt okunur | Masaüstü uygulaması son görülen bekleyen işleri, siparişleri (durum, tutar, termin) ve bayileri (yetkili, telefon, e-posta, bakiye) bilgisayarda şifreli saklar (Windows: DPAPI). Sunucuya ulaşılamazsa bağlantı hatası sayfasında aramayla, "Salt okunur" etiketiyle gösterilir. Çıkış yapılınca silinir. Yalnız uygulamanın kendi sayfası okuyabilir. Temsilci yalnız kendi bayilerini görür |
| Güncelleme turu denendi | Linux'ta AppImage ile baştan sona: 1.0.0 sürümü sunucudaki 1.0.1'i buldu, indirdi (sha512 doğrulamasıyla), kendi yerine kurdu, yeniden açılışta 1.0.1 çalıştı ve yeniden güncelleme aramadı. Sunucu, `latest.yml` ve `electron-updater` zinciri böylece doğrulandı. Windows'ta yalnız kurulum biçimi (NSIS) farklı |
| Pilot rehberi | `satis-masaustu/PILOT.md`: hazırlık, kurulum günü, bir haftalık deneme listesi (bildirim, sayaç, bildirim alanı, kısayollar, iki kişiyle eşzamanlı karar, internet kesilince son görülen veriler), güncelleme turu, sorun giderme |
| Testler | 129 test (önceki 116 + `testler/eszamanli.test.js` 11 + masaüstü 2); SQLite ve JSON depoyla geçiyor |

#### Faz 3b-2: Pilot ve satış ekranları (≈2 hafta, 2b-2 ile birlikte)
1. Kod imzalama sertifikası (SmartScreen uyarısı kalksın); GitHub'a `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` gizlileri.
2. Pilot (`satis-masaustu/PILOT.md`): satış yöneticisi + 1 temsilci, Windows'ta kurulum ve bir güncelleme turu; sonra tüm ekip.
3. Satış ekranları modüllere bölünür; 17 parçadaki sarmalama zincirleri (`git` 8 kat) birleşir. Bellekteki kopyalar yerine her ekran veriyi tek bir veri modülünden okur. Okumalar sayfa sayfa REST'e geçer.

Kabul (Faz 3 geneli):
- Faz 0 testlerinin satış kısmı geçiyor ✅.
- Yeni bayi siparişi 2 sn içinde masaüstü bildirimi olarak düşüyor ✅ (0,5 sn).
- Yeni sürüm yayınlandığında uygulama kendini güncelliyor (✅ Linux'ta baştan sona denendi; ⏳ Windows'ta pilotta).

### Faz 4: Entegrasyonlar (≈3–6 hafta, seçilen sağlayıcıya göre)
1. **Online ödeme:** iyzico veya PayTR ile ödeme sayfası + sunucuya geri bildirim (callback). Ödeme doğrulanınca otomatik "Ödeme alındı" ve cari hareketi; satışın manuel onayı yalnız havale/EFT için kalır.
2. **MRP/ERP:** Onaylanan siparişin MRP'ye aktarılması, stok yeterlilik ve hat kapasitesine göre termin önerisi; ürün/renk analizindeki stok planı önerisinin CSV yerine doğrudan MRP'ye gönderilmesi.
3. **Bildirimler:** E-posta (ve isteğe bağlı SMS/WhatsApp) — sipariş onayı, sevk, ödeme hatırlatması.
4. **Belgeler:** E-fatura/e-irsaliye sisteminden fatura ve irsaliye PDF'lerinin otomatik çekilmesi.

### Faz 5: Canlıya geçiş ve işletme (≈1–2 hafta, Faz 2–3 ile iç içe)
1. Son veri göçü ve eski sistemin salt okunur hale getirilmesi.
2. Yedekleme: günlük veritabanı + dosya yedeği, haftalık sunucu dışına kopya; geri yükleme denemesi.
3. İzleme: sunucu çalışma durumu, hata kayıtları, disk doluluğu uyarısı.
4. KVKK: aydınlatma metni, açık rıza kaydı (kayıt formunda var), veri saklama süresi, kişisel veri erişim kaydı.
5. Kullanıcı kılavuzları (bayi ve satış) ve kısa eğitim videoları.

### Sürekli iş (fazlardan bağımsız)
- Renk önizleme maskelerinin kalan ürünler için çıkarılması (masalar, barlar, şezlonglar, takımlar: 36–38, 40–50, 52–57, 59, 61–65, 67–73; setler 4–9, 11, 12) ve fotoğrafı olmayan 12 ürünün (1, 2, 3, 10, 13, 18, 33, 39, 51, 58, 60, 66) çekimi. Maskeler `katalog/maske/` altında dosya olduğu için Faz 0'dan sonra kod değişikliği gerekmeden eklenebilir.

---

## 6. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Göç sırasında mevcut veri kaybı | Yüksek | Faz 0'da yedek + göç betiği deneme ortamında birkaç kez çalıştırılır; göç sonrası sayım karşılaştırması |
| Eski ve yeni sistemin aynı anda kullanılması | Orta | Geçiş günü tanımlanır; eski sistem o gün salt okunur yapılır |
| Ekran davranışında farkedilmeyen değişiklik | Orta | Faz 0 Playwright testleri her fazda çalıştırılır |
| Kod imzalama sertifikası gecikmesi | Düşük | Sertifika Faz 1 sırasında sipariş edilir; o zamana kadar PWA kurulumu |
| Ödeme kuruluşu sözleşme süresi | Orta | Faz 4 başvurusu Faz 1'de başlatılır |
| Tek geliştiriciye bağımlılık | Orta | Belgeler `docs/` altında, testler ve repo düzeni ile devredilebilir |

---

## 7. Kararlar

**Verilenler (12 Kasım 2026):**

| Konu | Karar | Sonucu |
|---|---|---|
| Sunucu yeri | VPS | `dagitim/` paketi ve `TASINMA.md` hazırlandı; MRP erişimi yeniden düzenlendi |
| Mevcut canlı veri | `veri.json` kullanımda | Taşınma ve göç yolu test edildi (eski özetler, gömülü dosyalar, yönetici şifresi) |
| Bayi hesapları | Bayiler kendisi açar | Kayıt açık; sunucuda fiyat denetimi eklendi; kayıtlar satışın işlem kaydına düşer |

**Bekleyenler:**
1. **Alan adı:** `bayi.exitgarden.com` uygun mu? (DNS A kaydı taşınma öncesinde açılmalı.)
2. **VPS sağlayıcısı ve konumu:** Türkiye'de barındırma önerilir (KVKK).
3. **Şirketin sabit dış IP'si** var mı? (MRP'ye girişsiz erişim için `MRP_IZINLI_IP`.)
4. **MRP kullanıcıları:** Planlama ve depo çalışanları için satış panelinde kullanıcı açılacak mı, yoksa IP izni mi kullanılacak?
5. **Masaüstü teknolojisi:** Electron (öneri) mi, Tauri mi?
6. **Veritabanı:** SQLite ile başlama önerisi uygun mu? Beklenen bayi sayısı ve günlük sipariş adedi nedir?
7. **E-posta (SMTP) sağlayıcısı:** Kendi kendine şifre sıfırlama ve bildirimler için (Faz 1b-2/4).
8. **Ödeme kuruluşu:** iyzico, PayTR veya bankanın sanal POS'u?
9. **ERP:** Şirketin kullandığı ERP hangisi (Logo, Netsis, Mikro, SAP…)? MRP ile hangi alanlar aktarılacak?
10. **Satış ekibinin işletim sistemi:** Tamamı Windows mu? (macOS varsa ek kurulum dosyası gerekir.)

---

## 8. Ek: Kod içinde başvuru noktaları

Yollar `kaynak/` klasörüne göredir.

| Konu | Yer |
|---|---|
| Senkron katmanı (iki uygulamada aynı) | `ortak/senkron.js` |
| Şifre özeti `ozet()` | `bayi/parcalar/03-ana.js:44`, `satis/parcalar/03-ana.js:18` |
| Oturum (`sessionStorage`) | `bayi/parcalar/03-ana.js:88`, `satis/parcalar/03-ana.js:77` |
| Sipariş no üretimi | `bayi/parcalar/03-ana.js:294` |
| Ödeme bildirimi / dekont | `bayi/parcalar/18-v2.8-proje-sepetleri-renk-onizleme.js:156–174` |
| İade no üretimi ve fotoğraf küçültme | `bayi/parcalar/25-ek6.js:112–129` |
| Teklif/online ödeme no (ek10) | `bayi/parcalar/33-ek10.js:5` |
| Varsayılan `satis/1234` | `satis/sablon.html:83`, `satis/parcalar/03-ana.js:73` ve `:386` |
| Claude API çağrısı | `satis/parcalar/03-ana.js:299` |
| Örnek veri | `satis/parcalar/03-ana.js:363` |
| Fonksiyon sarmalamaları | `docs/SARMALAMA_HARITASI.md` |
