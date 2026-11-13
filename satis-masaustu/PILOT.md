# EXIT Satış · Windows pilot rehberi (Faz 3b)

Amaç: Uygulamanın satış ekibine dağıtılmadan önce gerçek Windows bilgisayarlarda denenmesi. Katılanlar satış yöneticisi ve bir temsilci. Süre 1–2 hafta: ilk gün kurulum, bir hafta günlük kullanım, sonra bir güncelleme turu.

Bu ortamda denenenler:
- Uygulamanın kendisi (Linux'ta, gerçek sunucuyla, 16 otomatik test).
- Güncelleme turu baştan sona: 1.0.0 sürümü sunucudaki 1.0.1'i buldu, indirdi, kendi yerine kurdu, yeniden açılışta 1.0.1 çalıştı. Linux AppImage ile denendi; Windows'ta aynı yol NSIS kurulum dosyasıyla çalışır.

Yalnız Windows'ta görülebilenler aşağıdaki listededir.

## Hazırlık (bilgi işlem, pilottan önce)

1. Sunucu VPS'te HTTPS ile çalışıyor olmalı (`dagitim/`). Uygulama `https://` olmayan adrese bağlanmaz; yalnız şirket içi ağda `http://` kabul edilir.
2. Kurulum dosyasını üretin. GitHub › Actions › "Masaüstü paketi" › Run workflow (sürüm `package.json`'daki `version`). Çıktı olarak üç dosya gelir: `EXIT-Satis-Kurulum-1.0.0.exe`, `.blockmap`, `latest.yml`.
3. Üç dosyayı sunucuda `/var/lib/exit/masaustu/` klasörüne kopyalayın (`sunucu/KURULUM.md` › 7).
4. Tarayıcıda `https://<alan adı>/masaustu/indir` adresinin kurulum dosyasını indirdiğini denetleyin.
5. Pilot kullanıcılarının satış panelinde hesabı olmalı. Hesap yoksa Ayarlar › Kullanıcılar'dan açılır; geçici şifre verilir.

## Kurulum günü (her pilot bilgisayarda)

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| 1 | Satış panelini tarayıcıda açın, sol alttaki "Masaüstü uygulaması" bağlantısına tıklayın | Kurulum dosyası iner | |
| 2 | Kurulum dosyasını çalıştırın | İmzasızsa "Windows kişisel bilgisayarınızı korudu" uyarısı çıkar. "Ek bilgi › Yine de çalıştır" ile geçin. Kod imzalama sertifikası alınınca bu uyarı çıkmaz | |
| 3 | Kurulum sihirbazını tamamlayın | Masaüstünde ve Başlat menüsünde "EXIT Satış" kısayolu oluşur | |
| 4 | Uygulamayı açın, sunucu adresini yazın (`https://<alan adı>`) | Adres kabul edilir, giriş ekranı açılır | |
| 5 | Giriş yapın | Satış paneli açılır. Sol altta "Sunucuya bağlı" ve "Masaüstü 1.0.0" görünür | |
| 6 | Pencereyi büyütüp küçültün, kapatıp yeniden açın | Boyut ve yer hatırlanır | |

## Günlük kullanım (bir hafta)

Bir bayi hesabıyla (veya gerçek bayilerin siparişleriyle) aşağıdakileri deneyin:

| # | Deneme | Beklenen | Sonuç |
|---|---|---|---|
| 7 | Bayi sipariş versin | En geç 2 sn'de Windows bildirimi: "Yeni sipariş talebi · EXG-… · firma · tutar" | |
| 8 | Bildirime tıklayın | Uygulama öne gelir, sipariş penceresi açılır | |
| 9 | Görev çubuğu simgesine bakın | Bekleyen iş sayısı simgenin üstünde kırmızı sayaç olarak görünür; pencere başlığı "EXIT Satış (n)" | |
| 10 | Pencereyi kapatın (×) | Uygulama bildirim alanında (saatin yanı) çalışmaya devam eder, bildirimler gelmeye devam eder | |
| 11 | Pencere menüsü › "Bilgisayar açılınca başlat" | Bilgisayar yeniden başlatılınca uygulama gizli açılır | |
| 12 | Sipariş penceresinde "Ayrı pencerede aç" | Sipariş ikinci ekrana taşınabilen ayrı pencerede açılır | |
| 13 | Ctrl+K, Ctrl+1..9, F5, Ctrl+P, Ctrl+Shift+S | Hızlı arama, menü sayfaları, yenile, yazdır, PDF olarak kaydet | |
| 14 | Bir raporu Excel/CSV olarak dışa aktarın | "Kaydet" penceresi son kullanılan klasörle açılır; kaydedince bildirim çıkar | |
| 15 | İki kişi aynı ödeme bildirimine aynı anda "Tahsilat olarak işle" desin | Biri işler; diğeri "… bu arada … tarafından işlendi" uyarısını görür. Cariye bir kez düşer | |
| 16 | Biri bir siparişin durumunu değiştirsin | Diğerinin açık ekranında sayfa yenilemeden değişir | |
| 17 | İnterneti kesin, uygulamayı kapatıp açın | "Sunucuya ulaşılamıyor" sayfasının altında son görülen siparişler, bayiler (telefon, bakiye) ve bekleyen işler salt okunur görünür; arama çalışır | |
| 18 | İnterneti açın | Uygulama en geç 15 sn'de kendiliğinden satış paneline döner | |
| 19 | Çıkış yapın, interneti kesip uygulamayı açın | Son görülen veriler görünmez (çıkışta silinir) | |

## Güncelleme turu (pilotun sonunda)

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| 20 | `package.json`'da `version`'ı `1.0.1` yapın, paketleyin, üç dosyayı sunucudaki klasöre kopyalayın (`latest.yml`'nin üzerine yazılır) | `https://<alan adı>/masaustu/guncelleme/latest.yml` içinde `version: 1.0.1` | |
| 21 | Pilot bilgisayarda uygulamayı kapatıp açın (veya Yardım › Güncellemeleri denetle) | Arka planda indirme; "EXIT Satış 1.0.1 indirildi" penceresi | |
| 22 | "Şimdi yeniden başlat" | Uygulama kapanıp açılır; sol altta "Masaüstü 1.0.1" | |
| 23 | Başka bir bilgisayarda "Daha sonra" deyip uygulamayı kapatın, açın | Kapatırken kurulur; açılışta 1.0.1 | |

## Sorun olursa

- **Bildirim gelmiyor:** Windows Ayarlar › Sistem › Bildirimler › "EXIT Satış" açık mı? Odaklanma yardımı (Rahatsız etme) kapalı mı?
- **"Sunucuya ulaşılamıyor" ama internet var:** Şirket güvenlik duvarı veya vekil sunucu `https://<alan adı>` adresini engelliyor olabilir. Önce tarayıcıda aynı adresi deneyin.
- **Güncelleme inmiyor:** Tarayıcıda `https://<alan adı>/masaustu/guncelleme/latest.yml` adresinde yeni sürüm yazıyor mu? Uygulama 4 saatte bir denetler. Hemen denetlemek için Yardım › Güncellemeleri denetle.
- **Kaldırma:** Windows Ayarlar › Uygulamalar › "EXIT Satış" › Kaldır. Ayarlar ve son görülen veriler `%APPDATA%\EXIT Satış` klasöründe kalır; tamamen temizlemek için bu klasörü silin.

Pilot sonunda bu tablo doldurulup geri gönderilir. Sorunsuzsa kurulum dosyası bütün satış ekibine duyurulur (indirme adresi: `https://<alan adı>/masaustu/indir`).
