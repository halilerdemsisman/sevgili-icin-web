# EXIT Garden · Bayi Portalı ve Satış Paneli

Bu repoda iki uygulama var:
- **Bayi portalı:** Bayilerin katalog, sipariş, cari, ödeme ve özel teklif işlemleri. Sunucunun ana adresinde web sitesi olarak yayınlanır (Faz 2a: sayfa adresleri, telefon düzeni, WebP görseller, telefona kurulum; Faz 2b-1: kayıtlar REST ile, iş verisi tarayıcıda saklanmaz).
- **Satış paneli:** Satış yöneticisi ve temsilcilerin onay, tahsilat, müşteri ve analiz ekranları. Tarayıcıda `/satis` adresinde ve Windows masaüstü uygulaması olarak ("EXIT Satış", Faz 3: bildirimler, görev çubuğu sayacı, ayrı pencere, kısayollar, otomatik güncelleme).

İki uygulama da ortak bir Node.js sunucusuna bağlanır. Sunucu (sürüm 3a):
- giriş ister,
- her kullanıcıya yalnız görmesi gereken veriyi gönderir ve yalnız izinli değişiklikleri kabul eder,
- veriyi SQLite'ta tutar (Node 22.5+, ek paket yok),
- değişiklikleri anlık bildirimle iletir,
- yeni uygulamalar için REST API sunar,
- bayi web sitesini sıkıştırılmış ve önbellekli dosyalarla yayınlar.

- Yol haritası ve durum: [docs/BAYI_WEB_SATIS_MASAUSTU_RAPOR.md](docs/BAYI_WEB_SATIS_MASAUSTU_RAPOR.md)
- Sunucu kurulumu: [sunucu/KURULUM.md](sunucu/KURULUM.md)
- VPS'e kurulum ve şirket sunucusundan taşınma: [dagitim/TASINMA.md](dagitim/TASINMA.md)
- API (REST v1, eşitleme, yapay zekâ): [docs/API.md](docs/API.md)

## Hızlı deneme (Windows, kurulum gerekmez)

1. GitHub › Actions › "Masaüstü paketi" › en son başarılı çalıştırma › Artifacts › **EXIT-Deneme-Windows** zip'ini indirin.
2. Zip'i bir klasöre açın, **BASLAT.bat**'a çift tıklayın. İlk açılışta satış yöneticisi (`satis`) şifresini belirleyin.
3. Satış paneli tarayıcıda açılır (`http://localhost:8080/satis`). Bayi sitesi `http://localhost:8080/`, masaüstü uygulaması `http://localhost:8080/masaustu/indir` (ilk açılışta adres: `http://localhost:8080`).

Paket sunucuyu, masaüstü uygulamasının kurulum dosyasını ve Node'u içerir; veri paketin `veri\` klasöründe kalır. Aynı ağdaki bilgisayarlar pencerede yazan "Ağdan" adresiyle bağlanır. Ayrıntı: [dagitim/windows/BENIOKU.txt](dagitim/windows/BENIOKU.txt). Bayilerin internetten erişmesi için sunucu VPS'e kurulur ([dagitim/TASINMA.md](dagitim/TASINMA.md)).

## Klasörler

| Klasör | İçerik | Düzenlenir mi? |
|---|---|---|
| `kaynak/` | Uygulamaların kaynağı. `bayi/`: `sablon.html`, `cekirdek/` (veri, fiyat, oturum, başlangıç), `ekranlar/` (katalog, ürün, sepet, siparişler, cari, gezinme), `ozellikler/` (her özellik bir dosya: favoriler, projeler, karşılaştırma, belgeler…), `stil/` (görünüm, özellik başına), `dil/en.json` (İngilizce). `satis/` (3b-2'den beri aynı düzen): `cekirdek/` (veri, kur, oturum, gezinme, cari, roller, başlangıç), `ekranlar/` (siparişler, müşteriler, müşteri kartı, analiz, yapay zekâ, raporlar, kampanyalar, ürünler, onaylar, fiyat geçmişi, hedefler, ayarlar), `ozellikler/` (ödeme bildirimleri, numune, duyurular, bayi karnesi, Excel ile fiyat, hatırlatmalar, temsilci görünürlüğü, kredi limiti, fiyat grupları, iadeler, ziyaretler, gösterge paneli, tahsilat, ürün analizi, özel teklifler, sunucu oturumu, masaüstü, canlı veri…; ortak yardımcılar `yardimci.js`), `stil/`. İki uygulamada ortak bloklar `ortak/` (ör. renk önizleme motoru), yalnız web sitesine giren dosyalar `web/` (menü düzeni, sayfa adresleri, service worker, `statik/` altında PWA dosyaları) | **Evet**, değişiklikler burada yapılır |
| `katalog/` | `urunler.json` (73 ürün, fiyatlar USD), ürün fotoğrafları `gorsel/` (+ web sitesi için `webp/`, `araclar/webp.mjs` üretir), kumaşlar `kumas/`, renk önizleme maskeleri `maske/` + `maskeler.json` | **Evet** |
| `sunucu/` | Ortak sunucu: `sunucu.js` (yönlendirme, giriş, API), `lib/kimlik.js` (şifre, oturum, deneme sınırı), `lib/kurallar.js` (okuma/yazma kuralları), `lib/depo.js` (SQLite/JSON veri, numaralandırma, yedek), `lib/dosya.js` (dekont ve fotoğraflar), `lib/fiyat.js` (sipariş fiyat denetimi), `lib/limit.js` (kredi limiti), `lib/rest.js` (REST v1), `lib/yama.js` (kayıt düzeyinde ve koşullu yazma); kurulum notu, Windows başlatıcı | **Evet** |
| `satis-masaustu/` | Satış masaüstü uygulaması (Electron): `ana.js` (pencere, menü, bildirim, güvenlik, güncelleme), `onyukle.js` (sayfaya açılan dar arayüz), `sayfalar/` (sunucu adresi; bağlantı hatası ve son görülen veriler), `BENIOKU.md`, `PILOT.md`, `IMZALAMA.md` (kod imzalama seçenekleri). Windows paketi, Windows denemesi ve deneme paketi `.github/workflows/masaustu.yml` ile | **Evet** |
| `dagitim/` | VPS kurulumu: `kur.sh`, `exit.service`, `Caddyfile.ornek`, `ortam.ornek`, `yedek.sh`, `guncelle.sh`, `TASINMA.md` | **Evet** |
| `araclar/` | Derleme, ayıklama, sarmalama haritası, veri inceleme, Lighthouse ölçümü (`lighthouse.mjs`) araçları | Evet |
| `testler/` | Playwright uçtan uca testleri (`node:test` ile; erişilebilirlik testi için `axe-core`, `npm install` kurar) | Evet |
| `docs/` | Rapor, faz planı, sarmalama haritası | Evet |
| `eski/` | Teslim alınan orijinal paket (tek dosyalık HTML'ler, modüller, ekran görüntüleri) | **Hayır**, yalnız başvuru içindir |
| `dist/` | Derleme çıktısı: dağıtılacak paket | Hayır, `npm run derle` üretir (git'e girmez) |

## Komutlar

Gerekli: Node.js 20 veya üstü. Testler için Playwright ve Chromium (bu ortamda kurulu) ve bir kez `npm install` (erişilebilirlik denetimi için `axe-core`).

```bash
npm run derle
```
`kaynak/` + `katalog/` + `sunucu/` klasörlerinden `dist/` paketini üretir:
- `web/`: bayi web sitesi (küçük `index.html`, içerik özetli `js/` ve `css/`, WebP görseller, `sw.js`). Sunucu bunu ana adreste yayınlar.
- `exit_bayi_siparis.html`: tek dosyalık bayi portalı (sunucusuz, çift tıklayarak kullanım için).
- `exit_satis_paneli.html`, `sunucu/` (+ fiyat denetimi için görselsiz `katalog.json`), `araclar/veri_incele.mjs`, `dagitim/`.

VPS'e yüklenecek paket budur.

```bash
npm run dogrula
```
Derler ve tek dosyalık HTML'leri `eski/` ile byte byte karşılaştırır. Faz 0 sonunda hepsi aynıydı. Faz 1a'da kaynak bilinçli olarak değiştiği için artık farklı çıkar; komut yalnız farkın nerede başladığını görmek için kalmıştır.

```bash
npm test
```
Derler ve tüm testleri çalıştırır.

```bash
npm i --no-save lighthouse@12.6.1 chrome-launcher@1.2.3
node araclar/lighthouse.mjs 3
```
Bayi web sitesini telefonda (Lighthouse'un yavaş 4G ve yavaş işlemci benzetimi) ölçer: giriş, katalog, ürün, siparişler, cari, belgeler; her sayfa 3 ölçümün ortancası. Hedef performans ≥ 85; altında kalan sayfa varsa çıkış kodu 1 olur. Lighthouse büyük olduğu için pakete eklenmedi.

```bash
node dist/sunucu/sunucu.js --yonetici-sifre "EnAz8KarakterSifre"
```
İlk çalıştırmada satış yöneticisi (`satis`) şifresini belirler. Varsayılan `1234` artık kullanılamaz.

```bash
npm run sunucu
```
`dist/` paketini yerelde yayınlar: bayi web sitesi `http://localhost:8080/` (ör. `/katalog`, `/siparisler`), satış `http://localhost:8080/satis`.

```bash
node araclar/webp.mjs
```
Yeni veya değişen ürün fotoğrafları için web sitesinin WebP dosyalarını üretir (`katalog/webp/`, repoya eklenir). ImageMagick gerekir; yalnız fotoğraf değiştiğinde çalıştırılır.

```bash
cd satis-masaustu && npm install && cd ..
npm run masaustu
```
Satış masaüstü uygulamasını geliştirme modunda açar (ilk açılışta sunucu adresi sorulur). Windows kurulum dosyası: `npm run masaustu-paketle` veya GitHub Actions'taki "Masaüstü paketi" iş akışı (`satis-masaustu/BENIOKU.md`).

```bash
npm run sarmalama
```
`docs/SARMALAMA_HARITASI.md` dosyasını (ekran fonksiyonları ve ekleri) yeniden üretir. `node araclar/sarmalama.mjs --denetle` kalan sarmalama veya tanımsız ek varsa hata verir.

```bash
node araclar/veri_incele.mjs sunucu/veri.json
```
Canlı verinin yedeğini `yedekler/` klasörüne alır ve özetini çıkarır (kişisel veri yazdırmaz).

## Çalışma kuralları

- `kaynak/<uyg>/sablon.html` içindeki `{{dahil yol}}` işaretleri derlemede ilgili dosyanın içeriğiyle değiştirilir (web sitesinde ayrı dosya olur). `{{web yol}}` işaretli satırlar yalnız web sitesine girer. `<!-- paket: ad -->` satırından sonra art arda gelen dosyalar iki sürümde de tek betikte (web sitesinde tek dosyada) birleşir; yalnız iç içe fonksiyondan oluşan özellik dosyaları ayrıca `try/catch` ile sarılır, biri açılışta hata verirse diğerleri çalışır.
- **Bayi portalında yeni özellik:** `kaynak/bayi/ozellikler/<ad>.js` (iç içe fonksiyon; ortak yardımcılar `yardimci.js`), görünümü `kaynak/bayi/stil/<ad>.css`, ikisi de şablonda ilgili paketin içine; ekranlara `EK.<ad>` ile bağlanır. İngilizce metinler `kaynak/bayi/dil/en.json`'a (Türkçe metin anahtardır). Oturum bütün dosyalar yüklendikten sonra açılır, ilk çizimde ekler hazırdır. Ekran fonksiyonları (`git`, `katalog`, `urunAc`, `durumYaz`…) yeniden atanmaz; yeni özellik parçasında `EK.<ad>` olarak tanımlanıp ekran fonksiyonunun içinde `EK.<ad>?.(…)` ile çağrılır (`docs/SARMALAMA_HARITASI.md`). Eklerin çağrılma sırası ekran fonksiyonunun içinde yazılıdır, parçaların yükleme sırasına bağlı değildir.
- **Satış panelinde yeni özellik:** aynı yol: `kaynak/satis/ozellikler/<ad>.js` (iç içe fonksiyon), şablonda `ozellikler` paketine; ortak yardımcılar (`pencereAc`, `menuEkle`, `firmaAd`, `usd2`, `sayiTR`, `csvTablo`, `tarihSaat`, `islemYaz`…) `ozellikler/yardimci.js`'te. Menü sayfası `EK.sayfalar.<ad> = [başlık, çizen]` ya da `S6.<ad> = çizen` (başlık menüdeki yazı); menü düğmesi `menuEkle(ad, yazı, simge, yanındaki sayfa)`. Başka bir özelliğin işlevi `EK.<ad>` üzerinden çağrılır (ör. `EK.gorur`, `EK.iadeRozet`, `EK.rozetler`, `EK.hatirlatmaYenile`). Bellekte tutulan yeni bir kalıcı veri (`exs-…` anahtarı) özellik dosyasında değil, `cekirdek/veri.js`'teki `DEPO` tablosunda tanımlanır (bir satır ve `depoIlk` ile bir değişken); başka kullanıcının değişikliği o zaman sayfa yenilenmeden gelir. Sunucudan açılan panelde iş verisi tarayıcının kalıcı alanına yazılmaz (yalnız bellekte).
- Bayi web sitesi iş verisini REST'ten okur (`kaynak/ortak/rest-veri.js`), eşitleme ucunu yalnız kişisel anahtarlar (sepet, favori, proje…) için kullanır. Satış paneli bayi kayıt listelerini (siparişler, ödemeler, iadeler, numuneler, teklifler, mesajlar) aynı modülle REST'ten okur; satışın kendi verisi ve bütün yazmaları eşitleme ucunda. Yeni bir iş verisi kaynağı: sunucuda `sunucu/lib/rest.js` içindeki `KAYNAK` tablosuna (etkilendiği anahtarlar ve yanıt), istemcide `rest-veri.js` içindeki `KAYNAK` tablosuna (ekranların okuduğu anahtar) eklenir; değişince sayfa kendiliğinden yeniden okur.
- **Açılış eşzamansız (3b-2 adım 4):** sunucudan açılan sayfada veri, sayfa açıldıktan sonra gelir (`ortak/senkron.js`: `EXIT_HAZIR`, ardından `EXIT_VERI.hazir`). Açılışta veriye bağlı bir iş betiğin en üstünde değil, satışta `veriHazir(f)` ile (`cekirdek/veri.js`), bayide oturum açılınca yapılır; bellekteki `DEPO` kopyaları veri gelince yerinde tazelenir. Eşzamanlı (`XMLHttpRequest(…, false)`) istek yazılmaz.
- **Erişilebilirlik ve hız (Faz 2c):** form alanının etiketi `<label>Ad</label><input id=…>` biçiminde hemen önünde olursa `ozellikler/erisilebilirlik.js` onu alana bağlar; etiketi olmayan alana (adet kutusu, arama, açılır liste) `aria-label` yazın, yalnız simgeli düğmeye de `aria-label` verin (ikisi de `en.json`'a). Soluk metin rengi `--soluk` (beyaz üstünde 5,4:1). Web sitesinde stiller tek dosyada birleşip başa alınır, gövde betikleri `defer` ile yüklenir (`araclar/derle.mjs`: `webHizlandir`); açılışta bir şey beklemesi gereken kod `document.readyState`'e değil `DOMContentLoaded` olayına bakmalı. `npm test` axe denetimini çalıştırır; hız için `node araclar/lighthouse.mjs`.
- Kodda `/*@katalog*/null` yerine `katalog/urunler.json`, `/*@maskeler*/null` yerine `katalog/maskeler.json` gömülür. Tek dosyalık sürümde görseller data URI'ye çevrilir; web sitesinde `/gorsel/<id>-k.webp` (küçük) ve `gorselB` alanında `/gorsel/<id>.webp` (tam boy) adresleri yazılır.
- **Yeni ürün:** `urunler.json`'a kayıt ekleyin; fotoğrafı `katalog/gorsel/<id>.jpg` olarak koyup `"gorsel": "gorsel/<id>.jpg"` yazın, sonra `node araclar/webp.mjs` çalıştırın.
- **Yeni renk maskesi:** `katalog/maske/<id>.png` ekleyin, `maskeler.json`'a `["<id>", "maske/<id>.png"]` satırını ekleyin.
- Her değişiklikten sonra `npm test` çalıştırın.

## Testler

`npm test` on yedi dosyayı çalıştırır (toplam 169 test; her biri kendi geçici sunucusunu boş veriyle açar). `DEPO=json npm test` aynı testleri JSON depoyla çalıştırır.

- `testler/uctan-uca.test.js`: Bayi ve satış aynı sunucuya bağlanır. Akış: kayıt, sepet, sipariş, onay (%15 iskonto), değişiklik talebi, ödeme linki, ödeme, tahsilat, özel teklif. Her adımda sunucudaki veri de kontrol edilir.
- `testler/bilinen-sorunlar.test.js`: Rapordaki kritik sorunlar (kimliksiz API erişimi, başka bayinin verisi, varsayılan şifre, sipariş kaybı, kota). Faz 0'da orijinal pakette hepsinin başarısız olduğu görüldü; Faz 1a'da kapatıldı.
- `testler/sunucu-kurallar.test.js`: Tarayıcısız, doğrudan API: bayi yalıtımı, alan koruması, talep kuralları, numara çakışması, dosya yetkisi, temsilci kapsamı, eski şifre yükseltme, deneme sınırı, CSRF, MRP erişimi, işlem kaydı, sipariş fiyat denetimi, şifre değiştirme/sıfırlama, satış kullanıcısı ekleme/silme, kredi limiti, yapay zekâ aktarımı (sahte API ile), anlık bildirim, REST v1.
- `testler/gecis.test.js`: Eski veriden geçiş (gömülü dosyaların taşınması, tarayıcıdaki verinin ilk yönetici girişinde aktarılması, çıkışta temizlik) ve VPS düzeni (ayrı veri klasörü, yalnız 127.0.0.1, Secure çerez).
- `testler/sifre.test.js`: Tarayıcıda: yöneticinin geçici şifre üretmesi, bayinin zorunlu şifre değişikliği, firma adından şifre değiştirme; bayi sepetteki fiyatı düşürse de siparişin katalog fiyatıyla kaydedilmesi ve satışın uyarıyı görmesi.
- `testler/web.test.js`: Bayi web sitesi: sayfa adresleri, önbellek/gzip/ETag, içerik güvenliği başlığı, sunucu klasörüne erişim, ilk açılış ağırlığı, service worker; tarayıcıda geri/ileri, derin bağlantılar (sipariş, ürün, sepet, girişten sonra), 1280/1440 px'de tek satır menü, 375 px'de yatay kaydırma olmaması ve alt sekme çubuğu, çevrimdışı açılış.
- `testler/xss.test.js`: Kötü niyetli bir bayinin bütün metin alanlarına yazdığı zararlı kodun satış panelinde ve bayi sitesinde çalışmadığı; dosya alanlarına `javascript:` yazılamadığı.
- `testler/rest-yazma.test.js`: REST yazma uçları (ödeme bildirimi, iade, numune, özel teklif, sipariş değişikliği; satış alanlarının ve başka bayinin kaydının reddi, 409 yanıtları, düşük fiyatın işaretlenmesi); tarayıcıda iş verisinin localStorage'a yazılmaması, bağlantı yokken siparişin gönderilmemesi, sunucuya ulaşılamazken giriş ve kaydın kapalı olması; tek dosyalık portalın sunucusuz çalışmaya devam etmesi.
- `testler/masaustu.test.js`: Satış masaüstü uygulaması gerçek sunucuya bağlanarak: sunucu adresinin sorulup hatırlanması, sayfanın Node'a erişememesi ve başka siteye gidememesi, bayi siparişinin 2 sn içinde masaüstü bildirimi ve görev çubuğu sayacı olarak düşmesi, bildirimden ve ayrı pencerede sipariş açma, Ctrl+K ve Ctrl+1..9, dışa aktarılan dosyanın ve PDF'in kaydı, bağlantı hatası sayfası; son görülen verilerin saklanması, çıkışta silinmesi ve sunucu kapalıyken salt okunur gösterilmesi; tarayıcıda durum çubuğu ve hızlı arama; sunucunun güncelleme dosyalarını (Range ile) vermesi. Electron kurulu değilse (`satis-masaustu` içinde `npm install`) uygulama testleri atlanır.
- `testler/eszamanli.test.js`: Çok kullanıcılı satış ekibi. Sunucu tarafında sözlük, liste ve sona ekleme yamaları sınanır; temsilci kapsamı ve bayinin yalnız kendi görünümü de denetlenir. Koşullu yazmada iki eşzamanlı karardan biri 409 alır. Tarayıcıda iki satış kullanıcısı aynı anda farklı siparişleri değiştirir. Birinin değişikliği diğerinin açık ekranına yenilemeden gelir. Aynı ödemeye iki kişi aynı anda basar ve tahsilat cariye bir kez düşer.
- `testler/bayi-yapi.test.js`: Bayi portalının dosya yapısı (şablondaki her dosya var, sürüm adlı parça yok, web sitesinde paketler); ilk çizimde eklerin hazır olması (web ve tek dosya); açılışta hata veren bir özelliğin diğerlerini durdurmaması; kayıttan sonra karşılama mesajı; bildirimde duyuruya tıklayınca duyuruların açılması.
- `testler/satis-yapi.test.js`: Satış panelinin dosya yapısı (şablondaki her dosya var ve her dosya şablonda, sürüm adlı parça yok, paketler); açılışta hata veren bir özelliğin diğerlerini durdurmaması; ziyaret kaydından oluşan hatırlatmanın rozete hemen yansıması; tek veri modülü (bellekteki veri yalnız `cekirdek/veri.js`'te, canlı güncelleme aynı tabloyla), iş verisinin diskte tutulmaması ve başka kullanıcının duyuru değişikliğinin sayfa yenilenmeden gelmesi.
- `testler/erisilebilirlik.test.js`: Bayi web sitesinin yayın denetimi (Faz 2c): axe-core ile WCAG 2.1 A/AA (giriş, kayıt, katalog, ürün, sepet, siparişler, cari, belgeler, ödeme, özel teklif, projeler, ödeme bildirimi, hatırlatmalar; telefon ve koyu tema); etiketin alana bağlı olması; telefonda karşılaştırma çubuğunun alt sekme çubuğunu örtmemesi; hız düzeni (tek stil dosyası başta, defer betikler, sıkıştırılmış JSON); girişli bayinin açılışta giriş formunu görmemesi.
- `testler/satis-rest.test.js`: Satış okumaları (3b-2 adım 4): eşitleme ucunun `?kapsam=rest` kipinde kayıt listelerini göndermemesi, liste uçlarının ETag'i ve imzanın `/api/degisen`'dekiyle aynı olması, temsilcinin imzasının kapsamı dışındaki bayiden etkilenmemesi; tarayıcıda satış panelinin ve bayi sitesinin açılışta eşzamanlı istek yapmaması, listelerin REST'ten gelmesi, bayinin yeni siparişinin sayfa yenilenmeden düşmesi, satış yazmasının eşitleme ucundan sunucuya ulaşması, oturum açıkken (yeni sekmede ve formdan girişten sonra) giriş formunun görünmemesi.
- `testler/rest-okuma.test.js`: Bayi okuma uçları (katalog ve kampanyalar, tam cari, hatırlatmalar ve okundu işareti, duyurular, hedef, ödeme linki, stok; başka bayilerin adının gitmemesi, satışın bayi kaynaklarını okuyamaması); eşitleme ucunun `?kapsam=kisisel` kipi (yalnız kişisel anahtarlar); kaynak imzalarının ETag ile aynı olması ve başka bayinin değişikliğinden etkilenmemesi; tarayıcıda verinin REST'ten gelmesi, satışın sipariş durumu, fiyat ve kampanya değişikliğinin sayfa yenilenmeden görünmesi, sitenin eşitleme ucuna iş verisi göndermemesi.
- `testler/ekler.test.js`: Ekran fonksiyonlarının sarılmadığı (`sarmalama.mjs --denetle`); her ekin bayi web sitesinde, tek dosyalık sürümde ve satış panelinde ekranda çalıştığı (favori süzgeci, karşılaştırma çubuğu, ürün penceresinin düğmeleri, kredi limiti kartı, ek sayfalar); sipariş gönderilince Siparişlerim'in kendi adresinde açılması; satışta menüdeki her sayfa, sipariş durumunda limit onayı, geçmiş, işlem kaydı ve tek fatura.
- `araclar/windows-dene.mjs` (GitHub Actions'ta Windows makinesinde, "Masaüstü paketi" iş akışının `windows-dene` işi): kurulum dosyasının iki sürümü üretilir; sessiz kurulum, kısayollar, ilk açılışta sunucu adresinin yazılıp kaydedilmesi, kurulu uygulamanın test sunucusuna bağlanması, Windows bildirimi ve görev çubuğu sayacı, bildirimden sipariş açma, son görülen verilerin DPAPI ile şifrelenmesi, sunucuya ulaşılamazken salt okunur görünüm ve "Yeniden dene", güncelleme turu (1.0.0 → 1.0.1) ve kaldırma. Sonuç işin özetinde, ekran görüntüleri Artifacts'ta.
- `testler/ayarlar.test.js`: Tarayıcıda: Ayarlar'dan sunucuya Claude anahtarı ve yeni temsilci, "Claude ile derin analiz"in sunucu üzerinden çalışması, bayi siparişinin anlık bildirimle satışa 2 sn içinde düşmesi.
