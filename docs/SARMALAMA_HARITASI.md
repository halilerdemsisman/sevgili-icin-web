# Ekran ve ek haritası

Bu dosya `node araclar/sarmalama.mjs` ile otomatik üretilir; elle düzenlemeyin.

Her ekran fonksiyonu (`git`, `katalog`, `urunAc`, `siparisAc`…) tek yerde tanımlıdır. Sonradan eklenen
özellikler kendi parçalarında `EK.<ad>` olarak tanımlanır ve ekran fonksiyonu bunları kendi içinde, aşağıdaki
sırayla çağırır. Eskiden bu ekler fonksiyonu üst üste sarıyordu (`const _eski = git; git = function …`):
çalışma sırası parçaların yükleme sırasına bağlıydı ve bir ekranda neyin çalıştığı tek yerden görülemiyordu
(rapor K2: bayi 11 fonksiyon 38 sarma, satış 14 fonksiyon 33 sarma). Faz 2b-2 / 3b-2'de hepsi birleştirildi.

Yeni bir özellik eklerken: parçada `EK.yeniAd = function (…) { … }` tanımlayın ve ekran fonksiyonunun
içinde uygun yere `EK.yeniAd?.(…)` çağrısını yazın. Ekran fonksiyonunu yeniden atamayın;
`node araclar/sarmalama.mjs --denetle` (testlerde çalışır) sarmalamayı ve tanımsız eki hata sayar.

## Bayi portalı

Yükleme sırası: `erken.js` → `senkron.js` → `tema-erken.js` → `03-ana.js` → `giris-ikonlari.js` → `v2.5-tema.js` → `v2.6-logo-animasyonu.js` → `13-ortak-excel-xlsx-csv-okuma.js` → `15-v2.6-dil-secimi-tr-en.js` → `16-v2.6-telefona-kurulum-pwa-yalniz.js` → `18-v2.8-proje-sepetleri-renk-onizleme.js` → `20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js` → `22-v3.0-hedef-prim-musteri-katalogu.js` → `25-ek6.js` → `27-ek7.js` → `29-ek8.js` → `31-ek9.js` → `33-ek10.js` → `35-ek11.js` → `36-ek12-sunucu-oturum.js` → `duzen.js` → `adres.js`

| Ekran fonksiyonu | Tanım | Ekler (çağrılma sırasıyla) |
|---|---|---|
| `girisYap` | 03-ana.js:131 | `girisDuyuru` (18-v2.8-proje-sepetleri-renk-onizleme.js:138) → `girisHatirlatma` (20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:209) → `girisAdres` (adres.js:122) |
| `uygun` | 03-ana.js:148 | `favoriUygun` (13-ortak-excel-xlsx-csv-okuma.js:92) |
| `katalog` | 03-ana.js:169 | `katalogFavori` (13-ortak-excel-xlsx-csv-okuma.js:95) → `katalogDuyuru` (18-v2.8-proje-sepetleri-renk-onizleme.js:129) → `katalogKarsilastirma` (20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:69) → `katalogAdres` (adres.js:34) |
| `urunAc` | 03-ana.js:226 | `urunFavoriStok` (13-ortak-excel-xlsx-csv-okuma.js:121) → `urunRenkOnizleme` (18-v2.8-proje-sepetleri-renk-onizleme.js:99) → `urunKarsilastir` (20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:70) → `urunParcaOnizleme` (29-ek8.js:71) → `urunFoto` (31-ek9.js:27) → `urunOzelTeklif` (33-ek10.js:88) → `urunAdres` (adres.js:43) |
| `sepetKaydet` | 03-ana.js:318 | `hatirlatmaRozeti` (20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:213) |
| `siparisDosyasi` | 03-ana.js:353 | `siparisProje` (18-v2.8-proje-sepetleri-renk-onizleme.js:68) → `siparisTahminiTeslim` (13-ortak-excel-xlsx-csv-okuma.js:236) |
| `siparisKarti` | 03-ana.js:385 | `siparisKartiTahmin` (13-ortak-excel-xlsx-csv-okuma.js:169) → `siparisKartiProje` (18-v2.8-proje-sepetleri-renk-onizleme.js:73) → `siparisKartiOdeme` (35-ek11.js:11) |
| `siparislerim` | 03-ana.js:401 | `siparislerTekrar` (13-ortak-excel-xlsx-csv-okuma.js:164) → `siparislerNumune` (18-v2.8-proje-sepetleri-renk-onizleme.js:206) → `siparislerSikAlinan` (25-ek6.js:147) → `siparislerTalep` (27-ek7.js:38) |
| `cariSayfa` | 03-ana.js:435 | `cariOdemeBildirimi` (18-v2.8-proje-sepetleri-renk-onizleme.js:173) → `cariHedef` (22-v3.0-hedef-prim-musteri-katalogu.js:23) → `cariAdresler` (22-v3.0-hedef-prim-musteri-katalogu.js:63) → `cariLimit` (25-ek6.js:155) → `cariOnlineOdeme` (33-ek10.js:40) |
| `git` | 03-ana.js:449 | `projeler` (18-v2.8-proje-sepetleri-renk-onizleme.js:20) → `belgeler` (25-ek6.js:72) → `odemeSayfa` (33-ek10.js:17) → `teklifSayfa` (33-ek10.js:17) → `karsilastirmaCubugu` (20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:78) → `gitAdres` (adres.js:25) |
| `katalogIndir` | 03-ana.js:466 | `katalogIndirDil` (15-v2.6-dil-secimi-tr-en.js:197) |

Toplam: 11 ekran fonksiyonu, 37 ek. Kalan sarmalama: yok.

## Satış paneli

Yükleme sırası: `senkron.js` → `tema-erken.js` → `03-ana.js` → `giris-ikonlari.js` → `v2.5-tema.js` → `v2.6-logo-animasyonu.js` → `14-v2.7-sadelestirme-onay-akisi-ve.js` → `16-v2.8-odeme-bildirimleri-numune-talepleri.js` → `18-v2.9-bayi-karnesi-excel-ile.js` → `20-v3.0-bayi-hedef-ve-prim.js` → `22-ek6.js` → `23-ek7.js` → `25-ek8.js` → `26-ek9.js` → `27-ek10-sunucu-oturum.js` → `28-masaustu.js` → `29-canli.js`

| Ekran fonksiyonu | Tanım | Ekler (çağrılma sırasıyla) |
|---|---|---|
| `durumYaz` | 03-ana.js:40 | `durumLimit` (22-ek6.js:32) → `durumYayinla` (20-v3.0-bayi-hedef-ve-prim.js:40) → `durumIslem` (22-ek6.js:44) → `durumNet` (26-ek9.js:8) |
| `ac` | 03-ana.js:102 | `acOnce` (22-ek6.js:24) → `acHatirlatma` (18-v2.9-bayi-karnesi-excel-ile.js:285) → `acSonra` (22-ek6.js:25) → `masaustuIsler` (28-masaustu.js:125) |
| `git` | 03-ana.js:122 | `sayfa6` (22-ek6.js:195) → `rozetler` (16-v2.8-odeme-bildirimleri-numune-talepleri.js:99) → `hatirlatmaRozeti` (18-v2.9-bayi-karnesi-excel-ile.js:282) |
| `siparisAc` | 03-ana.js:186 | `siparisFiyatUyarisi` (27-ek10-sunucu-oturum.js:39) |
| `ayarlar` | 03-ana.js:391 | `ayarlarSunucu` (27-ek10-sunucu-oturum.js:48) |
| `faturaKes` | 03-ana.js:474 | `faturaIslem` (22-ek6.js:45) |
| `urunler` | 03-ana.js:679 | `urunlerExcel` (18-v2.9-bayi-karnesi-excel-ile.js:213) |
| `S6.kullanicilar6` | 22-ek6.js:170 | `kullanicilarSifre` (27-ek10-sunucu-oturum.js:21) |
| `S6.tahsilat` | 25-ek8.js:14 | `tahsilatSiparisler` (26-ek9.js:11) |

Toplam: 9 ekran fonksiyonu, 18 ek. Kalan sarmalama: yok.
