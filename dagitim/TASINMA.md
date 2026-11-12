# Şirket sunucusundan VPS'e taşınma

Bu rehber, şu an şirket sunucusunda çalışan eski sürümü (canlı `veri.json` ile) yeni güvenli sürüme geçirip bir VPS'e taşır. Toplam süre yaklaşık 1–2 saattir. Asıl kesinti, 4. adımdaki veri kopyalama sırasında yaşanır (10–15 dakika).

## 0. Hazırlık

| Gerekli | Not |
|---|---|
| VPS | Ubuntu 22.04 veya 24.04, 1–2 vCPU, 2 GB RAM, 20 GB disk yeterli. Kişisel veri (bayi yetkilisi adı, telefon, e-posta) işlendiği için **Türkiye'de barındırma** önerilir (KVKK: yurt dışına aktarım ayrı rıza ve süreç ister). |
| Alan adı | Örn. `bayi.exitgarden.com`. DNS yönetiminden bu ad için VPS'in IP'sine bir **A kaydı** açın. Yayılması birkaç dakika ile birkaç saat sürebilir. |
| Paket | Repoda `npm run derle` → `dist/` klasörünün içeriği |
| Erişim | VPS'e SSH ile root veya sudo yetkili kullanıcı |
| Duyuru | Bayilere ve satış ekibine kısa bir kesinti ve yeni adres bildirimi |

## 1. VPS kurulumu (kesinti yok)

```bash
scp -r dist/ kullanici@VPS_IP:/tmp/exit-paket
ssh kullanici@VPS_IP
cd /tmp/exit-paket
sudo bash dagitim/kur.sh bayi.exitgarden.com
```

Betik şunları kurar:
- Node.js 22,
- Caddy (HTTPS sertifikasını kendisi alır),
- yalnız SSH, 80 ve 443'e izin veren güvenlik duvarı,
- `exit` sistem kullanıcısı,
- `/opt/exit` (program) ve `/var/lib/exit` (veri) klasörleri,
- systemd servisi ve günlük yedek.

Servis henüz başlatılmaz.

## 2. Ayarlar

`/etc/exit/ortam` dosyasını açın (`sudo nano /etc/exit/ortam`):
- `KAYIT_ACIK=1`: bayiler kendi hesabını açar (kararınız).
- `MRP_IZINLI_IP=`: şirketin sabit (statik) dış IP'si varsa buraya yazın; o ağdan MRP girişsiz açılır. Boş bırakılırsa MRP'ye yalnız **satış paneline giriş yapmış** kullanıcılar erişir. MRP'yi kullanan planlama ve depo çalışanlarına satış panelinde kullanıcı açılmalıdır.

## 3. Deneme açılışı (kesinti yok)

```bash
sudo -u exit env VERI_KLASORU=/var/lib/exit node /opt/exit/sunucu/sunucu.js --yonetici-sifre 'GECICI-deneme-sifre'
sudo systemctl start exit
```

`https://bayi.exitgarden.com` adresini açın; kilit simgesi (HTTPS) görünmeli. Satış paneline (`/satis`) girip deneme amaçlı bir bayi kaydı açın, sonra servisi durdurun ve deneme verisini silin:

```bash
sudo systemctl stop exit
sudo rm -rf /var/lib/exit/*
```

## 4. Veriyi taşıma (kesinti başlar)

1. **Şirket sunucusundaki eski sürümü durdurun** (komut penceresini kapatın veya Ctrl+C). Bundan sonra eski adrese yazılan her şey kaybolur; iki sunucu **asla aynı anda** açık kalmamalı.
2. Eski sunucudaki `sunucu/` klasöründen şu dosyaları VPS'e kopyalayın:
   - `veri.json` (zorunlu)
   - `mrp_veri.json` (MRP kullanılıyorsa)
   - `yedek/` (isteğe bağlı, geçmiş yedekler)
   ```bash
   scp veri.json mrp_veri.json kullanici@VPS_IP:/tmp/
   ```
3. VPS'te yerine koyun ve sahipliği verin:
   ```bash
   sudo install -o exit -g exit -m 640 /tmp/veri.json /var/lib/exit/veri.json
   sudo install -o exit -g exit -m 640 /tmp/mrp_veri.json /var/lib/exit/mrp_veri.json
   ```
4. Veriyi inceleyin. Bu adım bir yedek de alır:
   ```bash
   sudo node /opt/exit/araclar/veri_incele.mjs /var/lib/exit/veri.json --yedek-klasoru /var/backups/exit/tasima
   ```
   Özetteki bayi, sipariş ve ödeme sayılarını eski sistemle karşılaştırın. "Mükerrer numara" uyarısı varsa not alın: bunlar eski sürümde aynı anda verilen siparişlerdir.
5. Gerçek yönetici şifresini belirleyin (`1234` artık çalışmaz):
   ```bash
   sudo -u exit env VERI_KLASORU=/var/lib/exit node /opt/exit/sunucu/sunucu.js --yonetici-sifre 'GUCLU-YONETICI-SIFRESI'
   ```
6. Başlatın ve kaydı izleyin:
   ```bash
   sudo systemctl start exit
   sudo journalctl -u exit -n 30 --no-pager
   ```
   İlk açılışta iki satır görülür:
   - "Eski veri.json içe alındı": veri artık `veri.sqlite` dosyasında.
   - "Göç: N gömülü dosya dosyalar/ klasörüne taşındı": eski dekontlar.

   Eski dosya `veri.json.tasindi-…` adıyla yerinde kalır.

## 5. Kontrol listesi (kesinti biter)

- [ ] `https://ALAN/satis`: yönetici girişi, siparişler ve cari eski sistemle aynı.
- [ ] Ödeme bildirimlerinde eski bir dekont "Görüntüle" ile açılıyor.
- [ ] Bir temsilci girişi: yalnız atandığı bayiler görünüyor.
- [ ] Mevcut bir bayi **eski şifresiyle** girebiliyor (ilk girişte şifresi otomatik olarak güçlü biçime çevrilir).
- [ ] Yeni bir bayi kaydı açılabiliyor ve satışın işlem kaydında "Yeni bayi kaydı" görünüyor.
- [ ] Bayi siparişi satış panelinde birkaç saniye içinde görünüyor.
- [ ] `https://ALAN/mrp`: satış girişiyle (veya izinli IP'den) açılıyor; dışarıdan girişsiz açılmıyor.
- [ ] Telefonda portal "Ana ekrana ekle" ile kurulabiliyor; alt sekme çubuğu görünüyor.
- [ ] Bir siparişin adresi (`https://ALAN/siparisler/EXG-…`) başka sekmede açılınca o sipariş vurgulanıyor.
- [ ] Satış › Ayarlar: temsilciler için kullanıcılar açıldı (geçici şifreler iletildi). Claude kullanılacaksa API anahtarı girildi.

## 6. Bayilere ve ekibe duyuru

- Yeni adres: `https://bayi.exitgarden.com` (satış: `/satis`). Sayfaların kendi adresi var; örneğin siparişler `https://bayi.exitgarden.com/siparisler`.
- Şifreler aynı. Şifresini unutan bayinin şifresini satış yöneticisi sıfırlar: "Temsilciler ve işlem kaydı › Şifre sıfırlama". Üretilen geçici şifre bayiye telefonla iletilir; bayi ilk girişte kendi şifresini belirler.
- Herkes şifresini uygulamadan değiştirebilir:
  - Bayi: üst çubukta firma adına tıklar.
  - Satış: sol menüden "Şifremi değiştir".
- Eski adres yer imlerinden kaldırılmalı.

## 7. Sonrası

- **Güncelleme:** Yeni paketi `/tmp/exit-paket` içine yükleyip `sudo bash dagitim/guncelle.sh` çalıştırın. Betik önce yedek alır, sonra servisi yeniden başlatır.
- **Yedek:** Her gece `/var/backups/exit/exit-TARIH.tar.gz` oluşur (14 gün saklanır). Sunucu dışına kopya için `/etc/cron.daily/exit-yedek` içinde `YEDEK_UZAK` tanımlayın (ör. rclone ile bulut depolama). Ayda bir, bir yedeği deneme klasörüne açıp kontrol edin.
- **Kayıtlar:**
  - Uygulama: `sudo journalctl -u exit`
  - İşlem kaydı: `/var/lib/exit/kayitlar/`
  - Web: `/var/log/caddy/exit.log`
- **Eski sunucu:** Bir hafta sorunsuz çalıştıktan sonra eski sunucudaki `veri.json`'u arşivleyip eski sürümü kaldırın.

## Geri dönüş planı

VPS'te çözülemeyen bir sorun çıkarsa:
1. `sudo systemctl stop exit` ile VPS'i durdurun.
2. Şirket sunucusunda eski sürümü yeniden başlatın.
3. VPS'teki güncel veriyi eski biçimde alın:
   ```bash
   sudo -u exit env VERI_KLASORU=/var/lib/exit node /opt/exit/sunucu/sunucu.js --disa-aktar /tmp/veri.json
   ```
   Bu dosya eski sürümün `veri.json`'u olarak kullanılabilir. Ancak taşınan dekontlar `dosyalar/` klasöründedir ve eski sürüm bunları göstermez.
