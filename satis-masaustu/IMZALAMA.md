# EXIT Satış · kod imzalama (Faz 3b-2)

Kurulum dosyası ve program şu an **imzasız**. Bunun etkisi:

- Kurulum dosyası tarayıcıdan indirilip açılınca Windows SmartScreen "Windows kişisel bilgisayarınızı korudu" der. Kullanıcı "Ek bilgi › Yine de çalıştır" ile geçer. Bu uyarı her bilgisayarda yalnız ilk kurulumda bir kez çıkar.
- Otomatik güncellemeler bu uyarıyı göstermez. Uygulama yeni sürümü kendisi indirir, sha512 özetini `latest.yml` ile karşılaştırır ve sessiz kurar (bkz. `araclar/windows-dene.mjs` güncelleme turu).
- Şirketin güvenlik yazılımı ya da grup ilkesi imzasız programları engelliyorsa kurulum hiç yapılamaz. Pilottan önce BT'ye sorun.

## Planın değişmesi gereken yeri

Rapordaki ilk plan, sertifika dosyasını (`.pfx`) GitHub'a gizli olarak (`WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`) koymaktı. **Bu artık mümkün değil.** Haziran 2023'ten beri kod imzalama sertifikalarının (OV dahil) özel anahtarı donanımda tutulmak zorunda: ya bir USB anahtarda (token) ya da sertifika kuruluşunun bulut donanımında (HSM). Sertifika kuruluşları anahtarı dosya olarak vermiyor.

İkinci bir değişiklik: 2024'ten beri EV sertifika da SmartScreen'de hemen güven kazanmıyor. EV ile OV aynı muamele görüyor. Bu yüzden pahalı EV sertifikaya gerek yok. Yeni bir sertifikayla imzalanan dosya için de uyarı, yeterince kurulum yapılıp itibar oluşana kadar bir süre çıkabilir.

## Seçenekler

| | Nasıl imzalanır | GitHub Actions'ta otomatik | Not |
|---|---|---|---|
| **A. İmzasız devam** | — | — | Uyarı yalnız ilk kurulumda. Sınırlı sayıda kurulum yapılan iç ekip için kabul edilebilir; pilot bununla yapılabilir |
| **B. OV sertifika, bulut imzalama** (ör. SSL.com eSigner, DigiCert KeyLocker) | Kuruluşun bulut HSM'i, API anahtarıyla | Evet | **Önerilen.** Şirket adına (BG Group) kuruluş doğrulaması gerekir: ticaret sicili, telefonla doğrulama, birkaç iş günü. Bulut imzalama sertifikaya ek bir abonelik olarak satılır; fiyatı satın almadan önce kuruluştan alın |
| C. OV sertifika, USB anahtar | Anahtarın takılı olduğu bir Windows bilgisayarda | Hayır | Her sürüm o bilgisayarda paketlenir. İmza paketleme sırasında atılmalıdır: sonradan atılan imza `latest.yml`'deki özeti bozar ve güncelleme reddedilir |
| D. Azure Artifact Signing (eski adı Trusted Signing) | Microsoft'un bulut hizmeti | Evet (`win.azureSignOptions`) | En ucuz yol. Ancak yalnız ABD, Kanada, AB ve Birleşik Krallık'ta kurulu şirketlere açık; Türkiye'deki şirket için ancak AB'de bir tüzel kişilik varsa |

Önerim: Pilotu **A** ile yapın. Ekibin tamamına geçmeden önce **B**'yi alın.

## B seçildiğinde yapılacaklar

1. Sertifikayı alın. Kuruluş doğrulamasında şirketin resmî unvanı kullanılır; Windows imzada bu adı gösterir.
2. Kuruluşun imzalama aracının bilgilerini (kullanıcı, API anahtarı, sertifika kimliği) GitHub'da depo gizlisi olarak tanımlayın: Settings › Secrets and variables › Actions. Bu bilgileri sohbete ya da depoya yazmayın.
3. `package.json` › `build.win` içine imzalama kancası (`signtoolOptions.sign`, kuruluşun aracını çağıran ~20 satırlık betik) ve `publisherName` eklenir. `publisherName` tanımlanınca uygulama, yalnız aynı yayıncının imzaladığı güncellemeleri kurar.
4. "Masaüstü paketi" iş akışını elle çalıştırın. "İmza denetimi" adımında `Valid` ve şirket adı görünmelidir. Aynı iş akışındaki Windows denemesi imzalı paketle de geçmelidir.

İmzasız sürümden imzalı sürüme geçiş otomatik güncellemeyle olur; kullanıcıların yeniden kurması gerekmez.

## Şu an yapılandırmada olan

- `package.json` imzalamayı kapatmıyor. Önceden `signExecutable: false` vardı; bu, sertifika tanımlansa bile imzalamayı kapatıyordu ve kaldırıldı. Sertifika yoksa electron-builder imzasız paketler.
- İş akışı (`.github/workflows/masaustu.yml`) paketledikten sonra kurulum dosyasının imza durumunu yazar.
- Kurulumun kendisi, bildirimler, güncelleme turu ve kaldırma her değişiklikte Windows makinesinde deneniyor (`windows-dene` işi). Sonuç işin özetinde, ekran görüntüleri "Artifacts" bölümünde.
