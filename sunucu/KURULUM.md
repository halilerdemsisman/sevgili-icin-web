# EXIT Garden ortak sunucu kurulumu

Bu sunucu, bayi portalını ve satış panelini tek bir yerden yayınlar ve tüm veriyi (siparişler, cari, ödemeler, hedefler, duyurular, kullanıcılar) ortak tutar. Böylece bayi kendi bilgisayarından veya telefonundan sipariş verdiğinde, satış ekibi kendi bilgisayarında anında görür.

## 1. Gereken
- Şirkette sürekli açık duran bir bilgisayar veya sunucu (Windows, Mac ya da Linux)
- Node.js LTS (https://nodejs.org). Başka bir paket gerekmez.

## 2. Başlatma
- Windows: `bayi` klasörünü bu bilgisayara kopyalayın, `sunucu/baslat_windows.bat` dosyasına çift tıklayın.
- Mac/Linux: `cd bayi/sunucu && node sunucu.js`

Ekranda adresler yazar:
- Bayi portalı: `http://SUNUCU-IP:8080/`
- Satış paneli: `http://SUNUCU-IP:8080/satis`
- MRP (planlama, satın alma, depo): `http://SUNUCU-IP:8080/mrp`. MRP verisi `sunucu/mrp_veri.json` dosyasında tutulur, her gün `yedek/` klasörüne yedeklenir. İlk açan bilgisayardaki mevcut MRP verisi sunucuya aktarılır; bu yüzden ilk olarak güncel verinin bulunduğu bilgisayardan açın.

Portu değiştirmek için: `PORT=9000 node sunucu.js` (Windows: `set PORT=9000` sonra `node sunucu.js`).

## 3. Bayilerin dışarıdan erişmesi
Şirket ağı içinde adresler doğrudan çalışır. Bayilerin internetten bağlanması için iki yol var:
1. Önerilen: Sunucuyu bir bulut makinesine (ör. küçük bir VPS) kurup önüne bir alan adı ve HTTPS (ör. Caddy veya Nginx) koymak: `https://bayi.exitgarden.com`
2. Şirket modeminde 8080 portunu bu bilgisayara yönlendirmek (yalnızca geçici çözüm; HTTPS olmadan şifreler ağda açık gider).

HTTPS ile açıldığında bayiler portalı telefonlarına uygulama gibi kurabilir.

## 4. Veri ve yedek
- Tüm veri `sunucu/veri.json` dosyasındadır.
- Her gün `sunucu/yedek/` klasörüne otomatik yedek alınır, son 30 gün tutulur.
- Geri dönmek için sunucuyu kapatıp istenen yedeği `veri.json` adıyla kopyalayın.

## 5. İlk açılış
Sunucu boşken ilk açan tarayıcıdaki mevcut veriler (daha önce dosyadan kullanılan uygulamadaki siparişler, kullanıcılar vb.) sunucuya aktarılır. Bu yüzden ilk olarak, mevcut verilerin bulunduğu bilgisayardan satış panelini açın.

## 6. Notlar
- Sayfanın sol altında "Sunucuya bağlı" yazısı görünür. Bağlantı koparsa yapılan değişiklikler bekletilir ve bağlantı gelince gönderilir.
- HTML dosyaları sunucu olmadan çift tıklanarak da çalışmaya devam eder; o zaman veri yalnızca o tarayıcıda kalır.
