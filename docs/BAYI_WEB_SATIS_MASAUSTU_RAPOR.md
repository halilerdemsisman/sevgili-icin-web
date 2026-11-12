# EXIT Garden: Bayi Web Sitesi ve Satış Masaüstü Uygulaması
## Analiz ve Faz Planı

Hazırlanma: 12 Kasım 2026 · Son güncelleme: 12 Kasım 2026 (Faz 0, 1a, 1b-1 ve 1b-2 tamamlandı)
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
| 2 | Bayi web sitesi | `bayi.exitgarden.com`, responsive, PWA, API'ye bağlı |
| 3 | Satış masaüstü uygulaması | Windows kurulumu, otomatik güncelleme, masaüstü özellikleri |
| 4 | Entegrasyonlar | Online ödeme doğrulama, MRP/ERP aktarımı, e-posta/SMS bildirimleri |
| 5 | Canlıya geçiş ve işletme | Veri göçü, yedek, izleme, KVKK, eğitim |

Faz 1 tamamlandı; Faz 2 ve Faz 3 paralel yürüyebilir.

**Durum:** Faz 0 ✅ · Faz 1a ✅ · Faz 1b-1 ✅ · Faz 1b-2 ✅ (bkz. bölüm 5) · **canlıya alma:** canlı verinin VPS'e taşınması (`dagitim/TASINMA.md`; alan adı, VPS ve MRP kararları bekleniyor) · **sıradaki geliştirme:** Faz 2 (bayi web sitesi) ve Faz 3 (satış masaüstü).

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
| G8 | 🟡 | HTML'in büyük kısmı `innerHTML` ile kuruluyor (bayi 48, satış 67 yer). `esc()` yardımcı fonksiyonu var; bayilerin girdiği metinlerin (firma adı, not, açıklama) her yerde kaçışlandığı denetlenmeli (XSS riski) | | ⏳ 2–3 |

### 3.2 Veri bütünlüğü
| # | Önem | Sorun | Durum |
|---|---|---|---|
| V1 | 🔴 | **Sipariş numarası çakışması.** Numara tarayıcıda `o yılki sipariş sayısı + 1` ile üretiliyor (`kaynak/bayi/parcalar/03-ana.js:294`). İki bayi 4 saniyelik senkron aralığında sipariş verirse ikisi de aynı numarayı alır. Sunucu `exb-siparisler`'i `no`'ya göre birleştirirken aynı no'lu kayıtta yeni geleni tutar; **ilk sipariş sessizce silinir**. Faz 0 testinde iki bayi aynı anda sipariş verdi, sunucuda tek sipariş kaldı. Aynı numaralandırma deseni iade (`IAD-`), online ödeme (`OL-`) ve teklif (`OT-`) numaralarında da var. | ✅ 1a (numara sunucudan; çakışan yeniden numaralanır) |
| V2 | 🔴 | **Dosyalar localStorage'da.** Dekont (PDF ≤1,5 MB veya küçültülmüş fotoğraf), iade fotoğrafları, logo base64 olarak ortak anahtarlara yazılıyor. Her istemci tüm ortak veriyi `localStorage`'a yazar; Chromium'da ölçülen sınır ~8 milyon karakter. Sınır aşılınca senkron katmanındaki yükleme döngüsü ilk hatada durur: rozet "Sunucuya bağlı" der, ama o anahtar ve **sonrasındaki anahtarlar tarayıcıda yoktur** (Faz 0 testinde `exb-odeme` ve `exs-cari` yüklenmedi). Eksik veriyle çalışan kullanıcı birleştirme dışındaki bir anahtarı (ör. cari) güncellerse sunucudaki tam veriyi ezer. | ✅ 1a (dosyalar diske; tarayıcıya yalnız kendi verisi; eksik yükleme algılanır) |
| V3 | 🟠 | Birleştirme listesi dışındaki anahtarlarda (cari, kampanya, fiyat, müşteri, hedef…) son yazan kazanır; iki satışçı aynı anda düzenlerse biri kaybolur. | ◐ 1a: kullanıcı sözlükleri ve temsilci yazmaları birleştirilir; diğer sözlük anahtarları Faz 2–3'te REST'e geçişle kalkar |
| V4 | 🟠 | Fiyat/iskonto/kredi limiti hesapları istemcide. Sunucu, bayinin gönderdiği tutara güveniyor. | ✅ 1b-1 + 1b-2 (birim fiyat denetimi; kredi limiti sunucuda; REST siparişinde fiyatı sunucu belirler) |
| V5 | 🟡 | Her açılışta ve her değişiklikte tüm veri gidip geliyor; sipariş sayısı arttıkça yavaşlar (ilk yükleme senkron XHR ile sayfayı kilitliyor). | ✅ 1a + 1b-2 (herkes yalnız kendi verisini indirir; 4 sn'lik yoklama yerine anlık bildirim) |

### 3.3 Kod ve bakım
| # | Önem | Sorun | Durum |
|---|---|---|---|
| K1 | 🟠 | Tek dosya, kaynak üretici (`build.py`) kayıp. Görseller kodun içinde; her düzenlemede 3 MB'lık dosya açılıyor, git farkları okunamıyor. | ✅ 0 |
| K2 | 🟠 | "ek" modülleri global fonksiyonları sarmalayarak ekleniyor: bayi portalında 11 fonksiyon 34 kez (`urunAc` 6, `cariSayfa` 5, `git` 4), satış panelinde 14 fonksiyon 31 kez (`git` 8, `durumYaz` 5) sarılmış. Sıra bağımlı, hatası zor bulunur. Tam liste: `docs/SARMALAMA_HARITASI.md`. | ⏳ 2–3 |
| K3 | 🟡 | `telefon/index.html` elle kopyalanıyor; unutulursa telefon sürümü geride kalır. | ✅ 0 (derleme üretir) |
| K4 | 🟡 | Otomatik test yok. | ✅ 0, 1a (41 test) |

### 3.4 Arayüz (ekran görüntülerinden)
| # | Önem | Sorun | Durum |
|---|---|---|---|
| A1 | 🟡 | Bayi üst menüsü 1440 px'de bile taşıyor: 11 öğe + arama + kullanıcı; kullanıcı adı kesiliyor ("Deniz Ba…"), "Cari hesabım" ve "Özel teklif" iki satıra kırılıyor. Telefonda daha da sıkışık. | ⏳ 2 |
| A2 | 🟡 | Siparişlerim sayfasında "Sık aldıklarım" başlığı koyu başlık bandının üstüne biniyor, okunmuyor. | ⏳ 2 |
| A3 | 🟡 | Satış panelinde "Sunucuya bağlı" rozeti sol menünün son öğesinin ("Ürünler ve fiyatlar") üzerine biniyor. | ⏳ 3 |
| A4 | 🟡 | Sayfalar URL'ye bağlı değil (`git('katalog')`); geri tuşu, yer imi, link paylaşımı (ör. bir siparişe link) çalışmıyor. Web sitesi için gerekli. | ⏳ 2 |

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
│                         ortak/ (iki uygulamada aynı 9 blok), telefon/ (PWA dosyaları)
├── katalog/           ✅ urunler.json, gorsel/, kumas/, maske/ + maskeler.json
├── sunucu/            ✅ Faz 1a güvenli sunucu (sunucu.js + lib/: kimlik, kurallar, depo, dosya)
│                         + lib/fiyat (1b-1) + lib/limit, lib/rest, SQLite depo (1b-2)
├── dagitim/           ✅ Faz 1b-1: VPS kurulumu (kur.sh, systemd, Caddy, yedek, güncelleme) ve TASINMA.md
├── araclar/           ✅ derle, ayikla, sarmalama haritası, veri_incele
├── testler/           ✅ Playwright uçtan uca testleri (node:test)
├── eski/              ✅ Orijinal paket (başvuru için, değiştirilmez)
├── docs/              ✅ Raporlar
├── bayi-web/          ⏳ Faz 2: bayi web sitesi (Vite)
├── satis-masaustu/    ⏳ Faz 3: Electron kabuğu + satış ekranları
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
1. Ekranlar modüllere bölünür, `localStorage` okuma/yazma çağrıları API istemcisiyle değiştirilir (sepet ve tercihler gibi kişisel durumlar da sunucuya).
2. URL tabanlı sayfa geçişi (A4).
3. Yeni üst menü + mobil alt sekme düzeni (A1, A2).
4. Görsel optimizasyonu, tembel yükleme, WebP.
5. Renk önizleme motoru `ortak/` modülüne taşınır; maskeler dosyadan yüklenir.
6. PWA (otomatik sürümleme), TR/EN dosyaları.
7. Erişilebilirlik ve performans kontrolü (Lighthouse hedefi: performans ≥ 85 telefonda).
8. Alan adı + HTTPS ile yayın (`bayi.exitgarden.com`), önce 2–3 pilot bayi.

Kabul: Faz 0 testlerinin bayi kısmı yeni sitede geçiyor; telefonda (375 px) yatay kaydırma yok; ilk açılış 4G'de 3 sn altında.

### Faz 3: Satış masaüstü uygulaması (≈3–4 hafta)
1. Electron projesi; satış ekranları modüllere bölünüp API'ye bağlanır (temsilci kısıtı artık sunucudan gelir).
2. Masaüstü özellikleri: bildirimler, görev çubuğu sayacı, ayrı pencere, kısayollar, Excel/PDF dışa aktarım, yazdırma.
3. Yapay zekâ ekranı sunucu vekiline bağlanır.
4. Windows kurulum dosyası, kod imzalama, otomatik güncelleme.
5. Pilot: satış yöneticisi + 1 temsilci, sonra tüm ekip.

Kabul: Faz 0 testlerinin satış kısmı geçiyor; yeni bayi siparişi 2 sn içinde masaüstü bildirimi olarak düşüyor; yeni sürüm yayınlandığında uygulama kendini güncelliyor.

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
