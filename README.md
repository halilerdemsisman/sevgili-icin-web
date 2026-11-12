# EXIT Garden · Bayi Portalı ve Satış Paneli

Bu repoda iki uygulama var:
- **Bayi portalı:** Bayilerin katalog, sipariş, cari, ödeme ve özel teklif işlemleri. Hedef: web sitesi.
- **Satış paneli:** Satış yöneticisi ve temsilcilerin onay, tahsilat, müşteri ve analiz ekranları. Hedef: masaüstü uygulaması.

İki uygulama da ortak bir Node.js sunucusuna bağlanır. Yol haritası için: [docs/BAYI_WEB_SATIS_MASAUSTU_RAPOR.md](docs/BAYI_WEB_SATIS_MASAUSTU_RAPOR.md).

## Klasörler

| Klasör | İçerik | Düzenlenir mi? |
|---|---|---|
| `kaynak/` | Uygulamaların kaynağı: `bayi/` ve `satis/` (her biri `sablon.html` + `parcalar/`), iki uygulamada ortak bloklar `ortak/`, telefon (PWA) dosyaları `telefon/` | **Evet**, değişiklikler burada yapılır |
| `katalog/` | `urunler.json` (73 ürün, fiyatlar USD), ürün fotoğrafları `gorsel/`, kumaşlar `kumas/`, renk önizleme maskeleri `maske/` + `maskeler.json` | **Evet** |
| `sunucu/` | Ortak sunucu (`sunucu.js`), kurulum notu, Windows başlatıcı | **Evet** |
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
`kaynak/` + `katalog/` + `sunucu/` klasörlerinden `dist/` paketini üretir: `exit_bayi_siparis.html`, `exit_satis_paneli.html`, `telefon/` (index.html = bayi portalı), `sunucu/`.

```bash
npm run dogrula
```
Derler ve çıktıyı `eski/` ile byte byte karşılaştırır. Kaynakta ilk bilinçli değişiklik yapılana kadar anlamlıdır; sonrasında farklı çıkması beklenir.

```bash
npm test
```
Derler ve tüm testleri çalıştırır.

```bash
npm run test:eski
```
Aynı testleri orijinal pakete karşı çalıştırır (Windows'ta: `set TEST_PAKET=eski` sonra `node --test "testler/*.test.js"`).

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

- `testler/uctan-uca.test.js`: Bayi ve satış aynı sunucuya bağlanır. Akış: kayıt, sepet, sipariş, onay (%15 iskonto), değişiklik talebi, ödeme linki, ödeme, tahsilat, özel teklif. Her adımda sunucudaki veri de kontrol edilir.
- `testler/bilinen-sorunlar.test.js`: Rapordaki kritik sorunlar (kimliksiz API erişimi, sipariş kaybı, kota). Bu testler doğru davranışı bekler ve bugün **bilerek başarısız** olur. `todo` işaretli oldukları için paketi kırmazlar. Faz 1'de her sorun düzeldikçe ilgili testin `todo` işareti kaldırılır.
