# EXIT Garden · Bayi Portalı ve Satış Paneli

Bu repoda iki uygulama var:
- **Bayi portalı:** Bayilerin katalog, sipariş, cari, ödeme ve özel teklif işlemleri. Hedef: web sitesi.
- **Satış paneli:** Satış yöneticisi ve temsilcilerin onay, tahsilat, müşteri ve analiz ekranları. Hedef: masaüstü uygulaması.

İki uygulama da ortak bir Node.js sunucusuna bağlanır. Sunucu (sürüm 1a) giriş ister, her kullanıcıya yalnız görmesi gereken veriyi gönderir ve yalnız izinli değişiklikleri kabul eder.

- Yol haritası ve durum: [docs/BAYI_WEB_SATIS_MASAUSTU_RAPOR.md](docs/BAYI_WEB_SATIS_MASAUSTU_RAPOR.md)
- Sunucu kurulumu: [sunucu/KURULUM.md](sunucu/KURULUM.md)
- VPS'e kurulum ve şirket sunucusundan taşınma: [dagitim/TASINMA.md](dagitim/TASINMA.md)

## Klasörler

| Klasör | İçerik | Düzenlenir mi? |
|---|---|---|
| `kaynak/` | Uygulamaların kaynağı: `bayi/` ve `satis/` (her biri `sablon.html` + `parcalar/`), iki uygulamada ortak bloklar `ortak/`, telefon (PWA) dosyaları `telefon/` | **Evet**, değişiklikler burada yapılır |
| `katalog/` | `urunler.json` (73 ürün, fiyatlar USD), ürün fotoğrafları `gorsel/`, kumaşlar `kumas/`, renk önizleme maskeleri `maske/` + `maskeler.json` | **Evet** |
| `sunucu/` | Ortak sunucu: `sunucu.js` (yönlendirme, giriş, API), `lib/kimlik.js` (şifre, oturum, deneme sınırı), `lib/kurallar.js` (okuma/yazma kuralları), `lib/depo.js` (veri, numaralandırma, yedek), `lib/dosya.js` (dekont ve fotoğraflar), `lib/fiyat.js` (sipariş fiyat denetimi); kurulum notu, Windows başlatıcı | **Evet** |
| `dagitim/` | VPS kurulumu: `kur.sh`, `exit.service`, `Caddyfile.ornek`, `ortam.ornek`, `yedek.sh`, `guncelle.sh`, `TASINMA.md` | **Evet** |
| `araclar/` | Derleme, ayıklama, sarmalama haritası, veri inceleme araçları | Evet |
| `testler/` | Playwright uçtan uca testleri (`node:test` ile, ek paket gerekmez) | Evet |
| `docs/` | Rapor, faz planı, sarmalama haritası | Evet |
| `eski/` | Teslim alınan orijinal paket (tek dosyalık HTML'ler, modüller, ekran görüntüleri) | **Hayır**, yalnız başvuru içindir |
| `dist/` | Derleme çıktısı: dağıtılacak paket | Hayır, `npm run derle` üretir (git'e girmez) |

## Komutlar

Gerekli: Node.js 20 veya üstü. Testler için Playwright ve Chromium (bu ortamda kurulu).

```bash
npm run derle
```
`kaynak/` + `katalog/` + `sunucu/` klasörlerinden `dist/` paketini üretir: `exit_bayi_siparis.html`, `exit_satis_paneli.html`, `telefon/` (index.html = bayi portalı), `sunucu/` (+ fiyat denetimi için görselsiz `katalog.json`), `araclar/veri_incele.mjs`, `dagitim/`. VPS'e yüklenecek paket budur.

```bash
npm run dogrula
```
Derler ve çıktıyı `eski/` ile byte byte karşılaştırır. Faz 0 sonunda üç HTML de aynıydı. Faz 1a'da kaynak bilinçli olarak değiştiği için artık farklı çıkar; komut yalnız farkın nerede başladığını görmek için kalmıştır.

```bash
npm test
```
Derler ve tüm testleri çalıştırır.

```bash
node dist/sunucu/sunucu.js --yonetici-sifre "EnAz8KarakterSifre"
```
İlk çalıştırmada satış yöneticisi (`satis`) şifresini belirler. Varsayılan `1234` artık kullanılamaz.

```bash
npm run sunucu
```
`dist/` paketini yerelde yayınlar: bayi `http://localhost:8080/`, satış `http://localhost:8080/satis`.

```bash
npm run sarmalama
```
`docs/SARMALAMA_HARITASI.md` dosyasını yeniden üretir.

```bash
node araclar/veri_incele.mjs sunucu/veri.json
```
Canlı verinin yedeğini `yedekler/` klasörüne alır ve özetini çıkarır (kişisel veri yazdırmaz).

## Çalışma kuralları

- `kaynak/<uyg>/sablon.html` içindeki `{{dahil yol}}` işaretleri derlemede ilgili dosyanın içeriğiyle değiştirilir. Parçaların sırası önemlidir: "ek" modülleri global fonksiyonları sırayla sarar (bkz. [docs/SARMALAMA_HARITASI.md](docs/SARMALAMA_HARITASI.md)).
- Kodda `/*@katalog*/null` yerine `katalog/urunler.json`, `/*@maskeler*/null` yerine `katalog/maskeler.json` gömülür. Görseller derlemede data URI'ye çevrilir.
- **Yeni ürün:** `urunler.json`'a kayıt ekleyin; fotoğrafı `katalog/gorsel/<id>.jpg` olarak koyup `"gorsel": "gorsel/<id>.jpg"` yazın.
- **Yeni renk maskesi:** `katalog/maske/<id>.png` ekleyin, `maskeler.json`'a `["<id>", "maske/<id>.png"]` satırını ekleyin.
- Her değişiklikten sonra `npm test` çalıştırın.

## Testler

`npm test` beş dosyayı çalıştırır (toplam 56 test; her biri kendi geçici sunucusunu boş veriyle açar):

- `testler/uctan-uca.test.js`: Bayi ve satış aynı sunucuya bağlanır. Akış: kayıt, sepet, sipariş, onay (%15 iskonto), değişiklik talebi, ödeme linki, ödeme, tahsilat, özel teklif. Her adımda sunucudaki veri de kontrol edilir.
- `testler/bilinen-sorunlar.test.js`: Rapordaki kritik sorunlar (kimliksiz API erişimi, başka bayinin verisi, varsayılan şifre, sipariş kaybı, kota). Faz 0'da orijinal pakette hepsinin başarısız olduğu görüldü; Faz 1a'da kapatıldı.
- `testler/sunucu-kurallar.test.js`: Tarayıcısız, doğrudan API: bayi yalıtımı, alan koruması, talep kuralları, numara çakışması, dosya yetkisi, temsilci kapsamı, eski şifre yükseltme, deneme sınırı, CSRF, MRP erişimi, işlem kaydı, sipariş fiyat denetimi, şifre değiştirme/sıfırlama.
- `testler/gecis.test.js`: Eski veriden geçiş (gömülü dosyaların taşınması, tarayıcıdaki verinin ilk yönetici girişinde aktarılması, çıkışta temizlik) ve VPS düzeni (ayrı veri klasörü, yalnız 127.0.0.1, Secure çerez).
- `testler/sifre.test.js`: Tarayıcıda: yöneticinin geçici şifre üretmesi, bayinin zorunlu şifre değişikliği, firma adından şifre değiştirme; bayi sepetteki fiyatı düşürse de siparişin katalog fiyatıyla kaydedilmesi ve satışın uyarıyı görmesi.
