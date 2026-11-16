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

Yükleme sırası: `senkron.js` → `tema-erken.js` → `temel.js` → `veri.js` → `kur.js` → `oturum.js` → `gezinme.js` → `siparisler.js` → `musteriler.js` → `analiz.js` → `yapay-zeka.js` → `ayarlar.js` → `cari.js` → `musteri-karti.js` → `raporlar.js` → `kampanyalar.js` → `urunler.js` → `roller.js` → `onaylar.js` → `fiyat-gecmisi.js` → `bayi-bildirim.js` → `hedefler.js` → `baslangic.js` → `giris-ikonlari.js` → `v2.5-tema.js` → `v2.6-logo-animasyonu.js` → `yardimci.js` → `sadelestirme.js` → `odeme-bildirimleri.js` → `numune-talepleri.js` → `duyurular.js` → `excel-csv.js` → `bayi-karnesi.js` → `fiyat-excel.js` → `hatirlatmalar.js` → `bayi-hedef-prim.js` → `temsilci-gorunurluk.js` → `kredi-limiti.js` → `fiyat-gruplari.js` → `iadeler.js` → `ziyaretler.js` → `gosterge-paneli.js` → `kullanicilar.js` → `siparis-talepleri.js` → `tahsilat.js` → `urun-analizi.js` → `ozel-teklifler.js` → `odeme-bekleniyor.js` → `sunucu-oturum.js` → `masaustu.js` → `canli.js`

| Ekran fonksiyonu | Tanım | Ekler (çağrılma sırasıyla) |
|---|---|---|
| `durumYaz` | veri.js:49 | `durumLimit` (temsilci-gorunurluk.js:25) → `durumYayinla` (bayi-hedef-prim.js:39) → `durumIslem` (temsilci-gorunurluk.js:37) → `durumNet` (odeme-bekleniyor.js:7) |
| `ac` | oturum.js:15 | `acOnce` (temsilci-gorunurluk.js:17) → `acHatirlatma` (hatirlatmalar.js:70) → `acSonra` (temsilci-gorunurluk.js:18) → `masaustuIsler` (masaustu.js:125) |
| `git` | gezinme.js:10 | `sayfa6` (yardimci.js:5) → `rozetler` (odeme-bildirimleri.js:48) → `hatirlatmaRozeti` (hatirlatmalar.js:65) |
| `siparisAc` | siparisler.js:56 | `siparisFiyatUyarisi` (sunucu-oturum.js:39) |
| `ayarlar` | ayarlar.js:3 | `ayarlarSunucu` (sunucu-oturum.js:48) |
| `faturaKes` | cari.js:14 | `faturaIslem` (temsilci-gorunurluk.js:38) |
| `urunler` | urunler.js:14 | `urunlerExcel` (fiyat-excel.js:45) |
| `S6.ziyaret` | ziyaretler.js:4 | `gorur` (temsilci-gorunurluk.js:39) → `hatirlatmaYenile` (hatirlatmalar.js:67) |
| `S6.panel` | gosterge-paneli.js:4 | `iadeListesi` (iadeler.js:35) |
| `S6.kullanicilar6` | kullanicilar.js:4 | `islemListesi` (temsilci-gorunurluk.js:39) → `atamaVar` (temsilci-gorunurluk.js:39) → `kullanicilarSifre` (sunucu-oturum.js:21) |
| `S6.tahsilat` | tahsilat.js:5 | `tahsilatSiparisler` (odeme-bekleniyor.js:10) |

Toplam: 11 ekran fonksiyonu, 24 ek. Kalan sarmalama: yok.
