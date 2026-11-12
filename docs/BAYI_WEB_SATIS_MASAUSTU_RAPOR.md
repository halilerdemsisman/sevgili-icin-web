# EXIT Garden: Bayi Web Sitesi ve Satış Masaüstü Uygulaması
## Analiz ve Faz Planı

Hazırlanma: 12 Kasım 2026
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
3. Aynı anda iki bayi sipariş verirse **aynı sipariş numarası** üretilebiliyor ve sunucu numaraya göre birleştirdiği için **siparişlerden biri kayboluyor** (ayrıntı: 3.2).
4. Dekontlar ve iade fotoğrafları ortak `localStorage` anahtarlarına gömülü. Tarayıcı kotası (~5 MB) birkaç düzine dekonttan sonra dolar ve **kayıtlar yazılamaz hale gelir**. Her bayi tüm bayilerin dekontlarını indirir.

Bu nedenle plan, ekranları baştan yazmak yerine **önce sunucuyu gerçek bir API + veritabanı + giriş sistemine dönüştürmek**, sonra iki uygulamayı bu API'ye taşımak üzerine kurulu. Mevcut arayüz tasarımı, ekran akışları ve iş kuralları büyük ölçüde yeniden kullanılır.

| Faz | Konu | Sonuç |
|---|---|---|
| 0 | Hazırlık ve kaynak düzeni | Kod repoda, görseller dosya, katalog JSON, mevcut davranışın test kaydı |
| 1 | Güvenli sunucu (API, veritabanı, giriş, yetki) | Veriler korunuyor; sipariş no sunucuda; dosyalar diskte |
| 2 | Bayi web sitesi | `bayi.exitgarden.com`, responsive, PWA, API'ye bağlı |
| 3 | Satış masaüstü uygulaması | Windows kurulumu, otomatik güncelleme, masaüstü özellikleri |
| 4 | Entegrasyonlar | Online ödeme doğrulama, MRP/ERP aktarımı, e-posta/SMS bildirimleri |
| 5 | Canlıya geçiş ve işletme | Veri göçü, yedek, izleme, KVKK, eğitim |

Faz 2 ve Faz 3, Faz 1 tamamlandıktan sonra paralel yürüyebilir.

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
| # | Önem | Sorun | Kanıt |
|---|---|---|---|
| G1 | 🔴 | API'de kimlik doğrulama yok; tüm veri herkese açık ve herkes yazabilir | `sunucu.js`: `/api/veri` GET/POST, `/api/degisen` kontrolsüz |
| G2 | 🔴 | Bayi ve satış kullanıcılarının şifre özetleri (`exb-kullanicilar`, `exs-kullanicilar`) her istemciye iniyor | ortak anahtarlar senkronda |
| G3 | 🔴 | Şifre özeti tuzsuz SHA-256 (`'exitbayi:' + şifre`). Sızarsa sözlük saldırısıyla kolayca çözülür | `ozet()` bayi satır ~499, satış ~327 |
| G4 | 🔴 | Yetki (temsilci/bayi ayrımı, onay yetkisi) yalnız arayüzde. Tarayıcı konsolundan her şey değiştirilebilir | `ben` nesnesi istemcide |
| G5 | 🟠 | Varsayılan yönetici `satis / 1234`; giriş ekranında yazıyor | satış satır ~257, ~382 |
| G6 | 🟠 | Claude API anahtarı tarayıcıda saklanıp doğrudan tarayıcıdan çağrılıyor | satış satır ~608 |
| G7 | 🟠 | Sunucu HTTP; oturum yönetimi, hız sınırı, kilitleme, işlem kaydının sunucuda tutulması yok | |
| G8 | 🟡 | HTML'in büyük kısmı `innerHTML` ile kuruluyor (bayi 48, satış 67 yer). `esc()` yardımcı fonksiyonu var; bayilerin girdiği metinlerin (firma adı, not, açıklama) her yerde kaçışlandığı denetlenmeli (XSS riski) | |

### 3.2 Veri bütünlüğü
| # | Önem | Sorun |
|---|---|---|
| V1 | 🔴 | **Sipariş numarası çakışması.** Numara tarayıcıda `o yılki sipariş sayısı + 1` ile üretiliyor (bayi satır ~749). İki bayi 4 saniyelik senkron aralığında sipariş verirse ikisi de `EXG-2026-0042` alır. Sunucu `exb-siparisler`'i `no`'ya göre birleştirirken aynı no'lu kayıtta yeni geleni tutar; **ilk sipariş sessizce silinir**. Aynı sorun iade (`IAD-`) ve teklif numaralarında da var. |
| V2 | 🔴 | **Dosyalar localStorage'da.** Dekont (PDF ≤1,5 MB veya küçültülmüş fotoğraf), iade fotoğrafları, logo base64 olarak ortak anahtarlara yazılıyor. Tarayıcı kotası (~5 MB) dolunca kayıt atılamıyor; kod bunu "dosya çok büyük" diye gösteriyor (bayi satır ~1908). Sistem büyüdükçe tüm kullanıcılar etkilenir. |
| V3 | 🟠 | Birleştirme listesi dışındaki anahtarlarda (cari, kampanya, fiyat, müşteri, hedef…) son yazan kazanır; iki satışçı aynı anda düzenlerse biri kaybolur. |
| V4 | 🟠 | Fiyat/iskonto/kredi limiti hesapları istemcide. Sunucu, bayinin gönderdiği tutara güveniyor. |
| V5 | 🟡 | Her açılışta ve her değişiklikte tüm veri gidip geliyor; sipariş sayısı arttıkça yavaşlar (ilk yükleme senkron XHR ile sayfayı kilitliyor). |

### 3.3 Kod ve bakım
| # | Önem | Sorun |
|---|---|---|
| K1 | 🟠 | Tek dosya, kaynak üretici (`build.py`) kayıp. Görseller kodun içinde; her düzenlemede 3 MB'lık dosya açılıyor, git farkları okunamıyor. |
| K2 | 🟠 | "ek" modülleri global fonksiyonları sarmalayarak ekleniyor: bayi `git` 5 kez, satış `git` 8 kez ve `durumYaz` 5 kez üst üste sarılmış; ~65 `const _eski = …` zinciri. Sıra bağımlı, hatası zor bulunur. |
| K3 | 🟡 | `telefon/index.html` elle kopyalanıyor; unutulursa telefon sürümü geride kalır. |
| K4 | 🟡 | Otomatik test yok. |

### 3.4 Arayüz (ekran görüntülerinden)
| # | Önem | Sorun |
|---|---|---|
| A1 | 🟡 | Bayi üst menüsü 1440 px'de bile taşıyor: 11 öğe + arama + kullanıcı; kullanıcı adı kesiliyor ("Deniz Ba…"), "Cari hesabım" ve "Özel teklif" iki satıra kırılıyor. Telefonda daha da sıkışık. |
| A2 | 🟡 | Siparişlerim sayfasında "Sık aldıklarım" başlığı koyu başlık bandının üstüne biniyor, okunmuyor. |
| A3 | 🟡 | Satış panelinde "Sunucuya bağlı" rozeti sol menünün son öğesinin ("Ürünler ve fiyatlar") üzerine biniyor. |
| A4 | 🟡 | Sayfalar URL'ye bağlı değil (`git('katalog')`); geri tuşu, yer imi, link paylaşımı (ör. bir siparişe link) çalışmıyor. Web sitesi için gerekli. |

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
- **Giriş:** Argon2/bcrypt şifre özeti, HttpOnly + Secure çerez ile oturum (bayi web), masaüstü için kısa ömürlü erişim + yenileme token'ı. Hatalı giriş sınırı, şifre sıfırlama (e-posta), ilk girişte şifre değiştirme zorunluluğu.
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

```
uretim_planlama/
├── sunucu/            API, veritabanı şeması, göç betikleri
├── bayi-web/          Bayi web sitesi (Vite)
├── satis-masaustu/    Electron kabuğu + satış ekranları
├── ortak/             Fiyat/iskonto hesabı, para/tarih biçimleri, durum adları,
│                      renk önizleme motoru, API istemcisi, çeviriler
├── katalog/           urunler.json, gorsel/, maske/, kumas/
├── eski/              Orijinal HTML'ler (başvuru için, değiştirilmez)
├── testler/           Playwright uçtan uca testleri
└── docs/              Raporlar ve kurulum belgeleri
```

Fiyat ve iskonto hesabı `ortak/` içinde tek yerde yazılır; hem sunucu hem arayüz aynı fonksiyonu kullanır.

---

## 5. Faz planı

Süreler tek geliştirici için kaba tahmindir; Faz 0 sonunda netleştirilecektir.

### Faz 0: Hazırlık ve kaynak düzeni (≈1 hafta)
Amaç: Davranışı değiştirmeden çalışılabilir bir kaynak elde etmek.
1. Orijinal paket `eski/` altına konur (değiştirilmez).
2. Ayıklama betiği: `VERI` → `katalog/urunler.json`; data URI görseller → `katalog/gorsel/*.webp`; kumaşlar ve renk maskeleri → `katalog/kumas/`, `katalog/maske/`.
3. Her iki HTML'deki CSS ve JS blokları sırasıyla ayrı dosyalara çıkarılır; ek modüllerin sarmalama zincirleri belgelenir (hangi fonksiyon kaç kez, hangi sırayla sarılmış).
4. **Davranış kaydı:** Playwright ile mevcut sürüm üzerinde ana akışlar test olarak yazılır (kayıt, giriş, sepete ekle, sipariş, satış onayı, ödeme bildirimi, ödeme onayı, özel teklif, değişiklik talebi). Bu testler sonraki fazlarda "hiçbir şeyi bozmadık" kontrolüdür.
5. Mevcut `veri.json` (varsa) için yedek ve okuma betiği.

Teslim: Repo yapısı, ayıklanmış katalog, test paketi, sarmalama haritası.
Kabul: Testler orijinal HTML'lerde geçiyor.

### Faz 1: Güvenli sunucu (≈3–4 hafta)
Amaç: Kritik sorunları (G1–G4, V1, V2, V4) kapatmak.
1. Veritabanı şeması ve göç betiği: `veri.json` → SQLite. Şifreler göçte argon2 ile yeniden özetlenemez (eski özet tuzsuz); kullanıcılar ilk girişte eski özetle doğrulanıp yeni özete geçirilir.
2. Giriş/oturum, roller (bayi, temsilci, yönetici), hatalı giriş sınırı, şifre sıfırlama. `satis/1234` varsayılanı kaldırılır; kurulumda yönetici şifresi belirlenir.
3. REST uç noktaları (ilk dalga): katalog, fiyat, sepet, sipariş (oluştur/listele/detay/değişiklik/iptal), onay, durum, cari, ödeme bildirimi + dekont yükleme, özel teklif, iade, numune, hatırlatma, duyuru, kampanya.
4. Numaralandırma sunucuda (`EXG-`, `IAD-`, `TKL-`…), tek işlem içinde.
5. Fiyat, iskonto, kredi limiti ve durum geçişleri sunucuda doğrulanır.
6. İşlem kaydı (kim, ne zaman, neyi değiştirdi) sunucuda.
7. SSE ile anlık olaylar.
8. HTTPS (Caddy önerilir: sertifikayı otomatik alır), hız sınırı, güvenlik başlıkları, günlük yedek (veritabanı + dosyalar).
9. **Geçiş köprüsü:** Eski HTML'ler bu sürede şirket içinde çalışmaya devam edebilsin diye eski `/api/veri` uçları yalnız şirket ağından ve yönetici girişiyle erişilebilir şekilde kısıtlanır; Faz 2/3 bitince kapatılır.

Teslim: Çalışan API, API belgesi, göç betiği, birim testleri (fiyat/iskonto/limit/numara/yetki).
Kabul: Bir bayi başka bir bayinin hiçbir kaydına erişemiyor (test ile); aynı anda 20 sipariş gönderildiğinde 20 ayrı numara oluşuyor; 100 dekont sonrası sistem sorunsuz.

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

## 7. Karar verilmesi gerekenler

Faz 0 bu kararlar olmadan başlayabilir; Faz 1 öncesinde netleşmeleri gerekir.

1. **Sunucu yeri:** Şirket içi sunucu + port yönlendirme mi, bulut VPS mi? (Öneri: VPS, ör. Türkiye'de barındırma; KVKK açısından da kolay.)
2. **Alan adı:** `bayi.exitgarden.com` uygun mu?
3. **Masaüstü teknolojisi:** Electron (öneri) mi, Tauri mi?
4. **Veritabanı:** SQLite ile başlama önerisi uygun mu? Beklenen bayi sayısı ve günlük sipariş adedi nedir?
5. **Ödeme kuruluşu:** iyzico, PayTR veya bankanın sanal POS'u?
6. **ERP:** Şirketin kullandığı ERP hangisi (Logo, Netsis, Mikro, SAP…)? MRP ile hangi alanlar aktarılacak?
7. **Satış ekibinin işletim sistemi:** Tamamı Windows mu? (macOS varsa ek kurulum dosyası gerekir.)
8. **Mevcut canlı veri:** `veri.json` şu an kullanımda mı, kaç bayi ve sipariş var?

---

## 8. Ek: Kod içinde başvuru noktaları

Satır numaraları, görseller çıkarılmış hâldeki dosyaya göredir (yaklaşık).

| Konu | Bayi | Satış |
|---|---|---|
| Senkron katmanı | 3–35 | 3–35 (aynı) |
| Şifre özeti `ozet()` | ~499 | ~327 |
| Oturum (`sessionStorage`) | ~543, ~785 | ~386, ~696 |
| Sipariş no üretimi | ~749 | — |
| Ödeme bildirimi / dekont | ~1890–1908 | — |
| İade no üretimi | ~2609 | — |
| Teklif/ödeme no (ek10) | ~2860 | — |
| Varsayılan `satis/1234` | — | ~257, ~382, ~695 |
| Claude API çağrısı | — | ~608 |
| Örnek veri | — | ~659–672 |
| `git` sarmalama sayısı | 5 | 8 (+ `durumYaz` 5) |
