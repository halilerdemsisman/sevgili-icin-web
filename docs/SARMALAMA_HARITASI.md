# Sarmalama haritası

Bu dosya `node araclar/sarmalama.mjs` ile otomatik üretilir; elle düzenlemeyin.

Parçalar şablondaki sırayla yüklenir. Bir fonksiyon sarıldığında son yüklenen sarmalayıcı en dışta olur:
çağrı önce en son parçaya girer, o da `_eski(...)` ile bir öncekini çağırır. Bu yüzden **parçaların sırası
değiştirilmemeli**; yeni bir sarmalayıcı eklerken zincirin sonuna eklendiği unutulmamalıdır.
Faz 2 ve Faz 3'te bu zincirler tek fonksiyonda birleştirilecek.

## Bayi portalı

Yükleme sırası: `senkron.js` → `tema-erken.js` → `03-ana.js` → `giris-ikonlari.js` → `v2.5-tema.js` → `v2.6-logo-animasyonu.js` → `13-ortak-excel-xlsx-csv-okuma.js` → `15-v2.6-dil-secimi-tr-en.js` → `16-v2.6-telefona-kurulum-pwa-yalniz.js` → `18-v2.8-proje-sepetleri-renk-onizleme.js` → `20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js` → `22-v3.0-hedef-prim-musteri-katalogu.js` → `23-v3.1-sunucuya-bagliyken-siparis-dosyasi.js` → `25-ek6.js` → `27-ek7.js` → `29-ek8.js` → `31-ek9.js` → `33-ek10.js` → `35-ek11.js` → `36-ek12-sunucu-oturum.js`

| Fonksiyon | Tanım | Sarma sayısı | Sarmalayıcılar (yükleme sırasıyla; sonuncusu en dışta) |
|---|---|---|---|
| `urunAc` | 03-ana.js:182 | 6 | 13-ortak-excel-xlsx-csv-okuma.js:124 (`_urunAc`) → 18-v2.8-proje-sepetleri-renk-onizleme.js:102 (`_uaP`) → 20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:71 (`_urunAcK`) → 29-ek8.js:71 (`_ua8`) → 31-ek9.js:26 (`_ua9`) → 33-ek10.js:83 (`_ua10`) |
| `cariSayfa` | 03-ana.js:384 | 5 | 18-v2.8-proje-sepetleri-renk-onizleme.js:178 (`_cariP`) → 22-v3.0-hedef-prim-musteri-katalogu.js:23 (`_cariH`) → 22-v3.0-hedef-prim-musteri-katalogu.js:64 (`_cariA`) → 25-ek6.js:153 (`_cariL`) → 33-ek10.js:36 (`_cari10`) |
| `git` | 03-ana.js:97 | 4 | 18-v2.8-proje-sepetleri-renk-onizleme.js:219 (`_gitP`) → 20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:80 (`_gitK`) → 25-ek6.js:162 (`_gitB`) → 33-ek10.js:89 (`_git10`) |
| `siparislerim` | 03-ana.js:319 | 4 | 13-ortak-excel-xlsx-csv-okuma.js:168 (`_siparislerim`) → 18-v2.8-proje-sepetleri-renk-onizleme.js:209 (`_spP`) → 25-ek6.js:144 (`_sip`) → 27-ek7.js:34 (`_sip7`) |
| `girisYap` | 03-ana.js:87 | 3 | 03-ana.js:401 (`_girisYap`) → 18-v2.8-proje-sepetleri-renk-onizleme.js:144 (`_gyP`) → 20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:211 (`_girisH`) |
| `katalog` | 03-ana.js:126 | 3 | 13-ortak-excel-xlsx-csv-okuma.js:96 (`_katalog`) → 18-v2.8-proje-sepetleri-renk-onizleme.js:134 (`_kP`) → 20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:69 (`_katalogK`) |
| `siparisDosyasi` | 03-ana.js:304 | 3 | 13-ortak-excel-xlsx-csv-okuma.js:244 (`_siparisDosyasi`) → 18-v2.8-proje-sepetleri-renk-onizleme.js:68 (`_sdP`) → 23-v3.1-sunucuya-bagliyken-siparis-dosyasi.js:3 (`_sd`) |
| `siparisKarti` | 03-ana.js:339 | 3 | 13-ortak-excel-xlsx-csv-okuma.js:175 (`_siparisKarti`) → 18-v2.8-proje-sepetleri-renk-onizleme.js:75 (`_skP`) → 35-ek11.js:11 (`_sk`) |
| `katalogIndir` | 03-ana.js:411 | 1 | 15-v2.6-dil-secimi-tr-en.js:197 (`_katalogIndir`) |
| `sepetKaydet` | 03-ana.js:271 | 1 | 20-v2.9-karsilastirma-set-olusturucu-hatirlatmalar.js:216 (`_sepetKH`) |
| `uygun` | 03-ana.js:106 | 1 | 13-ortak-excel-xlsx-csv-okuma.js:92 (`_uygun`) |

Toplam: 11 fonksiyon, 34 sarmalama.

## Satış paneli

Yükleme sırası: `senkron.js` → `tema-erken.js` → `03-ana.js` → `giris-ikonlari.js` → `v2.5-tema.js` → `v2.6-logo-animasyonu.js` → `14-v2.7-sadelestirme-onay-akisi-ve.js` → `16-v2.8-odeme-bildirimleri-numune-talepleri.js` → `18-v2.9-bayi-karnesi-excel-ile.js` → `20-v3.0-bayi-hedef-ve-prim.js` → `22-ek6.js` → `23-ek7.js` → `25-ek8.js` → `26-ek9.js` → `27-ek10-sunucu-oturum.js`

| Fonksiyon | Tanım | Sarma sayısı | Sarmalayıcılar (yükleme sırasıyla; sonuncusu en dışta) |
|---|---|---|---|
| `git` | 03-ana.js:91 | 8 | 03-ana.js:545 (`_git`) → 03-ana.js:623 (`_git2`) → 03-ana.js:690 (`_git3`) → 03-ana.js:854 (`_git4`) → 16-v2.8-odeme-bildirimleri-numune-talepleri.js:92 (`_gitE`) → 18-v2.9-bayi-karnesi-excel-ile.js:283 (`_gitH`) → 20-v3.0-bayi-hedef-ve-prim.js:37 (`_gitBH`) → 22-ek6.js:195 (`_git6`) |
| `durumYaz` | 03-ana.js:33 | 5 | 03-ana.js:418 (`_durumYaz`) → 03-ana.js:705 (`_durumYaz2`) → 20-v3.0-bayi-hedef-ve-prim.js:41 (`_durumBH`) → 22-ek6.js:33 (`_dy`) → 26-ek9.js:8 (`_dy9`) |
| `siparisAc` | 03-ana.js:153 | 4 | 03-ana.js:425 (`_siparisAc`) → 03-ana.js:728 (`_siparisAc2`) → 03-ana.js:790 (`_siparisAc3`) → 27-ek10-sunucu-oturum.js:42 (`_sa`) |
| `ac` | 03-ana.js:81 | 3 | 03-ana.js:857 (`_ac2`) → 18-v2.9-bayi-karnesi-excel-ile.js:287 (`_acH`) → 22-ek6.js:24 (`_ac`) |
| `ayarlar` | 03-ana.js:340 | 3 | 03-ana.js:839 (`_ayarlar2`) → 14-v2.7-sadelestirme-onay-akisi-ve.js:8 (`_ayarlarK`) → 27-ek10-sunucu-oturum.js:54 (`_ay`) |
| `urunler` | 03-ana.js:639 | 2 | 03-ana.js:768 (`_urunler2`) → 18-v2.9-bayi-karnesi-excel-ile.js:213 (`_urunlerX`) |
| `ai` | 03-ana.js:324 | 1 | 03-ana.js:511 (`_ai`) |
| `faturaKes` | 03-ana.js:407 | 1 | 22-ek6.js:46 (`_fk`) |
| `kampanyalar` | 03-ana.js:577 | 1 | 03-ana.js:688 (`_kampanyalar`) |
| `kmpForm` | 03-ana.js:592 | 1 | 03-ana.js:681 (`_kmpForm`) |
| `musteriKarti` | 03-ana.js:455 | 1 | 03-ana.js:829 (`_musteriKarti`) |
| `musteriler` | 03-ana.js:196 | 1 | 03-ana.js:486 (`_musteriler`) |
| `ornekVeri` | 03-ana.js:366 | 1 | 03-ana.js:551 (`_ornekVeri`) |
| `urunYaz` | — | 1 | 03-ana.js:746 (`_urunYaz`) |

Toplam: 14 fonksiyon, 33 sarmalama.
