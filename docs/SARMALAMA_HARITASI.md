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

Yükleme sırası: `erken.js` → `senkron.js` → `veri.js` → `tema-erken.js` → `oturum-erken.js` → `temel.js` → `fiyat.js` → `oturum.js` → `gezinme.js` → `katalog.js` → `urun.js` → `sepet.js` → `siparisler.js` → `cari.js` → `teknik.js` → `baslangic.js` → `giris-ikonlari.js` → `v2.5-tema.js` → `v2.6-logo-animasyonu.js` → `yardimci.js` → `excel-csv.js` → `stok-termin.js` → `favoriler.js` → `tekrar-siparis.js` → `toplu-siparis.js` → `dil.js` → `pwa.js` → `projeler.js` → `duyurular.js` → `odeme-bildirimi.js` → `numune.js` → `karsilastirma.js` → `set-olusturucu.js` → `hatirlatmalar.js` → `hedef-prim.js` → `adres-defteri.js` → `musteri-katalogu.js` → `belgeler.js` → `bildirimler.js` → `sik-alinanlar.js` → `kredi-limiti.js` → `siparis-talep.js` → `renk-onizleme.js` → `renk-onizleme.js` → `online-odeme.js` → `ozel-teklif.js` → `siparis-odeme.js` → `sunucu-oturum.js` → `erisilebilirlik.js` → `duzen.js` → `adres.js`

| Ekran fonksiyonu | Tanım | Ekler (çağrılma sırasıyla) |
|---|---|---|
| `girisYap` | oturum.js:34 | `girisKarsilama` (sunucu-oturum.js:8) → `girisDuyuru` (duyurular.js:23) → `girisHatirlatma` (hatirlatmalar.js:65) → `girisAdres` (adres.js:127) |
| `git` | gezinme.js:5 | `projeler` (projeler.js:15) → `belgeler` (belgeler.js:18) → `odemeSayfa` (online-odeme.js:12) → `teklifSayfa` (ozel-teklif.js:18) → `karsilastirmaCubugu` (karsilastirma.js:74) → `gitAdres` (adres.js:28) |
| `uygun` | katalog.js:4 | `favoriUygun` (favoriler.js:10) |
| `katalog` | katalog.js:25 | `katalogFavori` (favoriler.js:13) → `katalogDuyuru` (duyurular.js:15) → `katalogNumune` (numune.js:15) → `katalogKarsilastirma` (karsilastirma.js:65) → `katalogAdres` (adres.js:37) |
| `urunAc` | urun.js:12 | `urunFavoriStok` (favoriler.js:39) → `urunRenkOnizleme` (renk-onizleme.js:9) → `urunNumune` (numune.js:9) → `urunKarsilastir` (karsilastirma.js:66) → `urunOzelTeklif` (ozel-teklif.js:59) → `urunAdres` (adres.js:46) |
| `sepetKaydet` | sepet.js:4 | `hatirlatmaRozeti` (hatirlatmalar.js:68) |
| `siparisDosyasi` | sepet.js:39 | `siparisProje` (projeler.js:63) → `siparisTahminiTeslim` (stok-termin.js:26) |
| `siparisKarti` | siparisler.js:16 | `siparisKartiTahmin` (stok-termin.js:22) → `siparisKartiProje` (projeler.js:68) → `siparisKartiOdeme` (siparis-odeme.js:11) |
| `siparislerim` | siparisler.js:32 | `siparislerTekrar` (tekrar-siparis.js:19) → `siparislerNumune` (numune.js:39) → `siparislerSikAlinan` (sik-alinanlar.js:15) → `siparislerTalep` (siparis-talep.js:38) |
| `cariSayfa` | cari.js:9 | `cariOdemeBildirimi` (odeme-bildirimi.js:37) → `cariHedef` (hedef-prim.js:20) → `cariAdresler` (adres-defteri.js:43) → `cariLimit` (kredi-limiti.js:7) → `cariOnlineOdeme` (online-odeme.js:35) |
| `katalogIndir` | teknik.js:9 | `katalogIndirDil` (dil.js:122) |

Toplam: 11 ekran fonksiyonu, 41 ek. Kalan sarmalama: yok.

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
