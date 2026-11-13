# EXIT Satış · masaüstü uygulaması (Faz 3)

Pilot ve dağıtım öncesi deneme listesi: [`PILOT.md`](PILOT.md).

Satış ekibinin bilgisayarına kurulan Windows uygulaması (Electron 44). Satış panelini şirket sunucusundan
(`<sunucu>/satis`) yükler; ekranlar sunucuyla birlikte güncellenir. Uygulama yalnız masaüstüne özel işleri yapar.

## Özellikler

| Özellik | Ayrıntı |
|---|---|
| Kendi penceresi | Başlat menüsü ve masaüstü kısayolu, görev çubuğu simgesi; pencere boyutu ve yeri hatırlanır; en küçük pencere 1280×720 |
| Bildirimler | Yeni sipariş talebi, değişiklik/iptal talebi, ödeme bildirimi, iade, numune ve özel teklif talebi sistem bildirimi olarak düşer (anlık bildirimle, ölçülen ~0,5 sn). Bildirime tıklayınca ilgili kayıt açılır. Uygulama açıkken zaten bekleyen işler için bildirim çıkmaz |
| Bekleyen iş sayısı | Görev çubuğu simgesinin üstünde kırmızı sayaç, pencere başlığında "EXIT Satış (3)", bildirim alanı ipucunda |
| Bildirim alanı | Pencere kapatılınca uygulama bildirim alanında çalışmaya devam eder (Pencere menüsünden kapatılabilir); "Bilgisayar açılınca başlat" seçeneği |
| Ayrı pencere | Sipariş penceresinde "Ayrı pencerede aç"; Dosya › Yeni pencere (Ctrl+N). İki ekranla çalışmak için |
| Kısayollar | Ctrl+K hızlı arama (sipariş no, firma, bayi, yetkili), Ctrl+1..9 menüdeki sayfalar, F5 yenile, Ctrl+P yazdır, Ctrl+Shift+S PDF olarak kaydet, Ctrl+artı/eksi yakınlaştır |
| Dosyalar | Excel/CSV ve rapor dışa aktarımlarında "Kaydet" penceresi son kullanılan klasörle açılır; kaydedilince bildirim (tıklayınca klasör açılır). Görünen sayfa PDF olarak kaydedilebilir |
| Güncelleme | Açılışta ve 4 saatte bir sunucunun `/masaustu/guncelleme/` klasörünü denetler; yeni sürüm arka planda iner, "Şimdi yeniden başlat" ya da kapatınca kurulur |
| Bağlantı yoksa | "Sunucuya ulaşılamıyor" sayfası, bağlantı gelince kendiliğinden açılır. Sayfanın altında **son görülen veriler** salt okunur görünür (Faz 3b): bekleyen işler, siparişler (durum, tutar, termin) ve bayiler (yetkili, telefon, e-posta, bakiye), aramayla. Bu özet uygulama açıkken dakikada bir ve her değişiklikte güncellenir. Bilgisayarda işletim sisteminin kullanıcıya özel şifrelemesiyle saklanır (Windows: DPAPI) ve çıkış yapılınca silinir. Temsilci yalnız kendi bayilerini görür |

## Güvenlik

- Sayfa Node.js'e ve Electron'a erişemez (`contextIsolation`, `sandbox`); yalnız `onyukle.js`'deki dar arayüzü (`window.exitMasaustu`) görür.
- Yalnız ayarlanan sunucunun adresinde gezinilir. Başka bir adrese giden bağlantı varsayılan tarayıcıda açılır.
- Sunucu adresini yalnız uygulamanın kendi kurulum sayfası değiştirebilir; satış sayfası değiştiremez.
- Sunucu adresi `https://` olmalıdır; `http://` yalnız yerel ağ adreslerinde kabul edilir.
- Kamera, mikrofon, konum gibi izinler kapalıdır.
- Oturum çerezi uygulamanın kendi profilinde tutulur (7 gün hareketsizlikte kapanır).
- Son görülen veriler dosyası (`son-gorulen.bin`) şifreli saklanır, çıkışta silinir; yalnız uygulamanın kendi bağlantı hatası sayfası okuyabilir (satış sayfası okuyamaz).

## Geliştirme

```bash
cd satis-masaustu
npm install
npm run baslat
```
İlk açılışta sunucu adresi sorulur (yerelde: `http://localhost:8080`). Adres `%APPDATA%\EXIT Satış\ayarlar.json` dosyasında saklanır.
`EXIT_SUNUCU_ADRESI` ortam değişkeni verilirse adres sorulmaz (bilgi işlem toplu kurulumu için).

Testler: kök klasörde `npm test` (`testler/masaustu.test.js`; Electron kurulu değilse atlanır, Linux'ta Xvfb gerekir).

Güncelleme turu elle denemesi (Linux): `npm run paketle-appimage` ile iki sürüm üretin (`-c.extraMetadata.version=1.0.1`). Yeni sürümün `latest-linux.yml` ve `.AppImage` dosyalarını sunucunun güncelleme klasörüne koyun. Eski sürümü `EXIT_TEST=1 EXIT_TEST_GUNCELLE=1 APPIMAGE_EXTRACT_AND_RUN=1` ile çalıştırın. Uygulama yeni sürümü bulur, indirir ve kendi yerine kurar; günlükte "güncelleme: indirildi 1.0.1" görünür. Faz 3b'de bu tur baştan sona denendi.

## Paketleme

Windows kurulum dosyası iki yoldan üretilir:
- **GitHub Actions (önerilen):** Actions › "Masaüstü paketi" › Run workflow, ya da `masaustu-v1.0.1` gibi bir etiket. Çıktı iş akışının "Artifacts" bölümünden indirilir.
- **Yerelde:** `npm run paketle`. Windows'ta doğrudan çalışır. Linux'ta Wine (64 ve 32 bit) gerekir.

Çıktı `cikti/` klasörüne yazılır:
- `EXIT-Satis-Kurulum-<sürüm>.exe` (~120 MB)
- `.blockmap`
- `latest.yml`

**Yeni sürüm yayınlama:**
1. `package.json`'daki `version`'ı artırın.
2. Paketleyin.
3. Üç dosyayı sunucunun güncelleme klasörüne kopyalayın (`sunucu/KURULUM.md` › Masaüstü uygulaması).

Açık olan uygulamalar 4 saat içinde, kapalı olanlar bir sonraki açılışta güncellenir.

**Kod imzalama:** Sertifika alınana kadar kurulum dosyası imzasızdır; Windows SmartScreen "Tanınmayan uygulama" uyarısı verir ("Ek bilgi › Yine de çalıştır"). Sertifika alınınca GitHub'da `WIN_CSC_LINK` (base64 .pfx) ve `WIN_CSC_KEY_PASSWORD` gizlileri tanımlanır; iş akışı imzalı paket üretir.
