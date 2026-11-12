# EXIT Garden ortak sunucu kurulumu (sürüm 1b)

> **VPS'e kurulum ve şirket sunucusundan taşınma:** `dagitim/TASINMA.md` (adım adım, hazır betiklerle). Bu belge sunucunun genel ayarlarını anlatır.

Bu sunucu bayi portalını (`/`), satış panelini (`/satis`) ve MRP'yi (`/mrp`) tek yerden yayınlar ve tüm veriyi ortak tutar. Bayi kendi bilgisayarından veya telefonundan sipariş verdiğinde satış ekibi anında görür.

Sürüm 1a ile gelen güvenlik düzeni:
- Giriş sunucuda yapılır, oturum tarayıcıda HttpOnly çerezle tutulur. Şifreler scrypt ile saklanır.
- Her kullanıcıya yalnız görmesi gereken veri gider:
  - Bayi yalnız kendi kayıtlarını görür.
  - Satış temsilcisi yalnız kendisine atanmış bayileri görür.
  - Satış yöneticisi tüm kayıtları görür.
- Sunucu yalnız izinli değişiklikleri kabul eder. Örneğin bayi kendi siparişini onaylayamaz, cari hesabını değiştiremez.
- Sipariş, ödeme ve teklif numaralarını sunucu verir; aynı anda verilen siparişler artık birbirini silmez.
- Dekont ve fotoğraflar `dosyalar/` klasöründe tutulur ve yalnız yetkili kullanıcıya gösterilir.
- Girişler ve tüm değişiklikler `kayitlar/` klasöründeki işlem kaydına yazılır.
- Sipariş fiyatları sunucuda katalogla denetlenir: bayinin yazdığı birim fiyat güncel bayi fiyatının (kampanya ve onaylı özel teklif dahil) altındaysa düzeltilir, satış panelinde uyarı görünür.
- Şifre değiştirme (herkes) ve geçici şifreyle sıfırlama (satış yöneticisi) var.
- MRP'ye yerel ağdan, izinli IP'lerden veya satış paneline giriş yapmış kullanıcılar erişir.
- Kredi limiti sunucuda denetlenir: temsilci limiti aşan siparişi onaylayamaz; yönetici gerekçeyle onaylayabilir.
- Değişiklikler diğer ekranlara anlık bildirimle (SSE) 1 saniyenin altında yansır.
- "Claude ile derin analiz" sunucu üzerinden çalışır. API anahtarı sunucuda tutulur, tarayıcılara gitmez.
- REST API v1 (bayi web sitesi ve masaüstü uygulaması için): `docs/API.md`.

## 1. Gereken

- Sürekli açık bir bilgisayar veya sunucu (Windows, macOS ya da Linux).
- Node.js **22.5 veya üstü** (https://nodejs.org, LTS). Veri, Node'un yerleşik SQLite modülüyle `veri.sqlite` dosyasında tutulur; başka paket gerekmez. Daha eski Node sürümünde sunucu otomatik olarak `veri.json`'a döner (`DEPO=json` ile de seçilebilir).

## 2. İlk kurulum

1. Paketi (`dist/` klasörünün içeriği) sunucuya kopyalayın.
2. **Satış yöneticisi şifresini belirleyin.** Bu adım zorunludur; eski "satis / 1234" girişi güvenlik nedeniyle kapatıldı.
   ```
   cd sunucu
   node sunucu.js --yonetici-sifre "EnAz8KarakterGucluSifre"
   ```
   Kullanıcı adı `satis` olarak kalır. Başka bir yönetici hesabının şifresi için komuta `--kullanici AD` ekleyin.
3. Sunucuyu başlatın:
   - Windows: `sunucu/baslat_windows.bat` dosyasına çift tıklayın.
   - macOS/Linux: `cd sunucu && node sunucu.js`
4. Satış paneline (`http://SUNUCU-IP:8080/satis`) `satis` ve belirlediğiniz şifreyle girin.
5. **Ayarlar** ekranında:
   - **Satış ekibi kullanıcıları:** Temsilci ve yönetici ekleyin. Her yeni kullanıcıya geçici şifre verilir; kişi ilk girişte kendi şifresini belirler. Bayi ataması "Temsilciler ve işlem kaydı" ekranındadır.
   - **Claude API anahtarı:** İsteğe bağlı. Anahtar sunucuda saklanır. Alternatif olarak `ANTHROPIC_API_KEY` ortam değişkeni verilebilir.

Bayiler portalda "Kayıt ol" ile hesap açar (şifre en az 8 karakter). Her yeni kayıt satış panelindeki işlem kaydına düşer. Kendi kendine kaydı kapatmak için: `KAYIT_ACIK=0`.

**Şifreler:** Herkes kendi şifresini değiştirebilir:
- Bayi: üst çubukta firma adına tıklar.
- Satış: sol menüden "Şifremi değiştir".

Şifresini unutan bayi veya temsilci için satış yöneticisi "Temsilciler ve işlem kaydı › Şifre sıfırlama" ekranından geçici şifre üretir. Kullanıcı bu şifreyle girince kendi şifresini belirlemeden devam edemez.

## 3. Eski sürümden geçiş

- **Sunucu zaten kullanılıyorsa** (`sunucu/veri.json` varsa): Yeni sürümü aynı klasöre koyup başlatın.
  - Mevcut bayi ve temsilci şifreleri çalışmaya devam eder; her kullanıcının ilk girişinde şifresi otomatik olarak güçlü biçime (scrypt) çevrilir.
  - Kayıtlara gömülü eski dekontlar ilk açılışta `dosyalar/` klasörüne taşınır.
  - Önce yedek alın: `node araclar/veri_incele.mjs sunucu/veri.json` hem yedekler hem durumu özetler.
- **Uygulamalar şimdiye kadar dosyadan (çift tıklanarak) kullanıldıysa:** Sunucu boşken satış paneline yönetici olarak, verilerin bulunduğu bilgisayardaki tarayıcıdan girin; o tarayıcıdaki veriler sunucuya aktarılır.

## 4. Ayarlar (ortam değişkenleri)

| Değişken | Varsayılan | Anlamı |
|---|---|---|
| `PORT` | 8080 | Dinlenecek port |
| `HOST` | (tümü) | Dinlenecek adres. Önünde Caddy varken `127.0.0.1` verin; port dışarıdan erişilemesin |
| `KAYIT_ACIK` | 1 | `0`: bayiler kendi kendine kayıt olamaz |
| `OTURUM_GUN` | 7 | Hareketsiz oturumun kapanma süresi (gün) |
| `GUVENILIR_VEKIL` | 0 | `1`: önünde Caddy/Nginx var. İstemci IP'si ve https bilgisi `X-Forwarded-*` başlıklarından okunur. **Vekil yoksa açmayın.** |
| `HTTPS` | 0 | `1`: çerezler yalnız https ile gönderilir (vekilsiz doğrudan https sunuluyorsa) |
| `MRP_IZINLI_IP` | — | MRP'ye girişsiz erişebilecek IP'ler, virgülle (ör. şirketin sabit IP'si `85.1.2.3`; `85.1.2.` ile başlayanlar). Bunların dışında MRP'ye yerel ağ ve satış paneline giriş yapmış kullanıcılar erişir |
| `MRP_HERKESE_ACIK` | 0 | `1`: MRP herkese açık (önerilmez; MRP'nin kendi girişi yok) |
| `VERI_KLASORU` | `sunucu/` | Veri, dosya, yedek ve kayıt klasörü |
| `DEPO` | sqlite | `json`: veriyi `veri.json`'da tut (eski Node sürümleri) |
| `ANTHROPIC_API_KEY` | — | Claude API anahtarı (Ayarlar'dan girilen anahtarın yerine geçer) |
| `AI_SAATLIK` | 30 | Kullanıcı başına saatlik yapay zekâ isteği sınırı |
| `EXIT_YONETICI_SIFRE` | — | Her açılışta `satis` şifresini ayarlar (otomasyon için; normalde komut satırını kullanın) |

Windows'ta: `set KAYIT_ACIK=0` sonra `node sunucu.js`.

## 5. İnternetten erişim (bayiler için)

Sunucu kendisi HTTP konuşur. İnternete **mutlaka HTTPS ile** açın; aksi hâlde şifreler ağda açık gider.

Önerilen düzen: küçük bir bulut sunucusu (VPS) + alan adı + Caddy. Caddy sertifikayı kendisi alır ve yeniler. Örnek `Caddyfile`:

```
bayi.exitgarden.com {
    reverse_proxy 127.0.0.1:8080
}
```

Sunucuyu bu durumda şöyle başlatın: `HOST=127.0.0.1 GUVENILIR_VEKIL=1 node sunucu.js`. Sunucu portunu (8080) dışarıya açmayın, yalnız Caddy (443) açık olsun. `dagitim/kur.sh` bunların hepsini (Caddy, systemd servisi, güvenlik duvarı, yedek) kurar.

HTTPS ile açıldığında bayiler portalı telefonlarına uygulama gibi kurabilir (`telefon/KURULUM.txt`).

## 6. Veri, yedek ve kayıtlar

| Yol | İçerik |
|---|---|
| `sunucu/veri.sqlite` | Tüm iş verisi (siparişler, cari, kullanıcılar…). Eski `veri.json` ilk açılışta buraya alınır ve `veri.json.tasindi-…` adıyla saklanır |
| `sunucu/gizli.json` | Claude API anahtarı (yalnız sunucu okur) |
| `sunucu/dosyalar/` | Dekontlar, iade fotoğrafları, logolar |
| `sunucu/oturumlar.json` | Açık oturumlar (silinirse herkes yeniden giriş yapar) |
| `sunucu/kayitlar/islem-YYYY-AA.jsonl` | İşlem kaydı: giriş, hatalı giriş, kayıt, yazma, reddedilen yazma |
| `sunucu/yedek/` | Günlük `veri-YYYY-AA-GG.sqlite` ve `.json` (son 30 gün) ve `dosyalar/` kopyası |
| `sunucu/mrp_veri.json` | MRP verisi |

- Yedek her gün otomatik alınır. Yine de `yedek/` klasörünü düzenli olarak sunucu dışına (başka disk veya bulut) kopyalayın.
- Geri dönmek için sunucuyu kapatın, istenen `veri-….sqlite` yedeğini `veri.sqlite` adıyla kopyalayın (yanındaki `veri.sqlite-wal` ve `-shm` dosyalarını silin), sunucuyu başlatın.
- Çalışırken tutarlı yedek: `node sunucu.js --yedek KLASOR` (veri.sqlite + veri.json).
- Eski sürümün okuyabileceği biçimde dışa aktarma: `node sunucu.js --disa-aktar veri.json`.

## 7. Notlar

- Sayfanın sol altında bağlantı durumu görünür:
  - "Sunucuya bağlı": her şey yolunda.
  - "Sunucu bağlantısı yok": değişiklikler bekletilir, bağlantı gelince gönderilir.
  - "Oturum kapandı": sayfayı yenileyip yeniden giriş yapın.
- Hatalı giriş sınırı: aynı kullanıcı adıyla 15 dakikada 5 hatalı denemeden sonra 15 dakika beklenir.
- Bir bayi satış panelinde "pasif" yapılırsa açık oturumu hemen kapanır.
- HTML dosyaları sunucu olmadan çift tıklanarak da açılır; o zaman veri yalnız o tarayıcıda kalır ve yukarıdaki korumalar devrede değildir.
