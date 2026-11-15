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

Toplam: 0 ekran fonksiyonu, 0 ek. Kalan sarmalama: `durumYaz` 03-ana.js:418 (`_durumYaz`), `siparisAc` 03-ana.js:425 (`_siparisAc`), `musteriler` 03-ana.js:486 (`_musteriler`), `ai` 03-ana.js:511 (`_ai`), `git` 03-ana.js:545 (`_git`), `ornekVeri` 03-ana.js:551 (`_ornekVeri`), `git` 03-ana.js:623 (`_git2`), `kmpForm` 03-ana.js:681 (`_kmpForm`), `kampanyalar` 03-ana.js:688 (`_kampanyalar`), `git` 03-ana.js:690 (`_git3`), `durumYaz` 03-ana.js:705 (`_durumYaz2`), `siparisAc` 03-ana.js:728 (`_siparisAc2`), `urunYaz` 03-ana.js:746 (`_urunYaz`), `urunler` 03-ana.js:768 (`_urunler2`), `siparisAc` 03-ana.js:790 (`_siparisAc3`), `musteriKarti` 03-ana.js:829 (`_musteriKarti`), `ayarlar` 03-ana.js:839 (`_ayarlar2`), `git` 03-ana.js:854 (`_git4`), `ac` 03-ana.js:857 (`_ac2`), `ayarlar` 14-v2.7-sadelestirme-onay-akisi-ve.js:8 (`_ayarlarK`), `git` 16-v2.8-odeme-bildirimleri-numune-talepleri.js:100 (`_gitE`), `urunler` 18-v2.9-bayi-karnesi-excel-ile.js:213 (`_urunlerX`), `git` 18-v2.9-bayi-karnesi-excel-ile.js:283 (`_gitH`), `ac` 18-v2.9-bayi-karnesi-excel-ile.js:287 (`_acH`), `git` 20-v3.0-bayi-hedef-ve-prim.js:37 (`_gitBH`), `durumYaz` 20-v3.0-bayi-hedef-ve-prim.js:41 (`_durumBH`), `ac` 22-ek6.js:24 (`_ac`), `durumYaz` 22-ek6.js:33 (`_dy`), `faturaKes` 22-ek6.js:46 (`_fk`), `git` 22-ek6.js:195 (`_git6`), `durumYaz` 26-ek9.js:8 (`_dy9`), `siparisAc` 27-ek10-sunucu-oturum.js:42 (`_sa`), `ayarlar` 27-ek10-sunucu-oturum.js:54 (`_ay`).
