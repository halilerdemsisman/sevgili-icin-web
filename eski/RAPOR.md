# EXIT Garden Bayi Portalı ve Satış Paneli: Teknik Rapor

Hazırlanma: 12 Kasım 2026. Bu rapor, iki uygulama üzerinde yeni bir sohbette faz faz çalışmaya devam edebilmek için hazırlandı.

## 1. Paket içeriği

| Dosya / klasör | Ne işe yarar |
|---|---|
| `exit_bayi_siparis.html` | **Bayi portalı.** Tek dosya; tüm kod, stil, ürün kataloğu ve ürün fotoğrafları (data URI) içinde (~3,2 MB). |
| `exit_satis_paneli.html` | **Satış paneli** (satış yöneticisi ve temsilciler). Tek dosya (~3,1 MB). |
| `moduller/` | Son eklenen modüllerin ayrı kaynakları (`bayi_ek6`–`ek11`, `satis_ek6`–`ek9`). Hepsi zaten iki HTML'in içinde; bilgi amaçlıdır. |
| `sunucu/` | Şirket sunucusu (`sunucu.js`, Node.js, ek paket yok), `KURULUM.md`, `baslat_windows.bat`. Sunucu aynı zamanda MRP'yi de yayınlar (`/mrp`). |
| `telefon/` | Bayi portalının telefona/tablete "uygulama gibi" kurulan sürümü (PWA: `index.html` = bayi portalı, `manifest.webmanifest`, `sw.js`, ikonlar, `KURULUM.txt`). |
| `ekranlar/` | Son özelliklerin ekran görüntüleri. |

## 2. Mimari

- **Vanilla JavaScript tek sayfa uygulamaları**, framework yok. Arayüz Türkçe; bayi portalında TR/EN dil seçimi var.
- **Veri tarayıcının `localStorage`'ında**: bayi portalı `exb-` önekli, satış paneli `exs-` önekli JSON anahtarları kullanır. Bayi ile satış arasındaki ortak veri `exb-` anahtarlarındadır (satış paneli de okur/yazar).
- **Ortak çalışma: şirket sunucusu.** Sayfa `http(s)` üzerinden sunucudan açılınca, `<head>`'e gömülü senkron katmanı:
  - Açılışta `GET api/veri` ile tüm `exb-`/`exs-` anahtarlarını alır.
  - `localStorage.setItem` çağrılarını yakalayıp 250 ms içinde `POST api/veri` ile gönderir.
  - 4 sn'de bir `GET api/degisen?son=…` ile diğer kullanıcıların değişikliklerini çeker.
  - Sol altta "● Sunucuya bağlı" rozeti gösterir; bağlantı yoksa değişiklikleri kuyrukta bekletir.
  - Yerel kalan anahtarlar: `exb-dil`, `exb-oturum`, `exs-oturum`, `exs-ai-anahtar`, `exit-tema`, `exb-kars`.
- **Sunucuda çakışma birleştirme** (`BIRLESTIR`): `exb-siparisler`, `exb-odeme`, `exb-numune`, `exb-teklif` kayıt `no`'suna göre; `exb-hatirlat`, `exb-iade` `id`'ye göre birleştirilir. Diğer anahtarlarda son yazan kazanır.
- Sunucu olmadan HTML'e çift tıklanırsa da çalışır; o zaman veri yalnız o tarayıcıda kalır.
- **Kod düzeni:** Ana kod üstte. Sonraki sürümler dosya sonunda `</body>` öncesine eklenmiş `<style>`+`<script>` blokları ("ek" modülleri) olarak gelir ve global fonksiyonları sarmalar (`const _eski = git; git = function (s) { … }`). Yeni geliştirmede de bu desen kullanılmalı.
- Ürün verisi HTML içinde `const VERI = {…}`: `urunler[]` (id, ad, kategori, secenek[{ad, sinif, fiyat, liste}], gorsel, site, kmp), `kumas{kod: dataURI}`. Fiyatlar USD.

> Not: Eskiden bu HTML'leri bir şablondan (`sablon.html`, `satis.html`) `build.py` ile üretiyorduk; bu kaynak klasör artık mevcut değil. **Bundan sonra iki HTML dosyasının kendisi kaynak kabul edilmeli** ve değişiklikler doğrudan bunlara yapılmalı. `telefon/index.html`, `exit_bayi_siparis.html`'in birebir kopyasıdır; bayi portalı değişince kopyalanmalı.

## 3. Bayi portalı (exit_bayi_siparis.html)

Üst menü (`data-git`): Katalog, Siparişlerim, Cari hesabım, Projeler, Belgeler, Özel teklif, Sepet, bildirim zili, dil, tema.

Özellikler:
- **Katalog:** Kategori/fiyat filtreleri, kampanya rozetleri, favoriler, karşılaştırma, ürün penceresi (seçenek, iskelet rengi, file, kumaş, fitil, adet).
- **Renk önizleme:**
  - **Gerçek fotoğraf üzerinde boyama (ek9):** 20 üründe (id 14–17, 19–32, 34, 35) maskeyle yapılıyor. İskelet, kumaş/file ve korunacak bölgeler (ahşap, ip) PNG maskelerle `MASKE` nesnesinde. Lab renk uzayında boyanır.
  - Diğer ürünlerde parça parça SVG çizimi kullanılır (ek8).
- **Sepet ve sipariş:** Sipariş talebi gönderilir, sipariş dosyası indirilir.
- **Siparişlerim:** Durum adımları (Talep alındı › Onaylandı › Üretimde › Sevk edildi), termin, nakliye.
  - **Değişiklik / iptal (ek7):** "Yeni" durumdaki sipariş doğrudan düzenlenir; onaylı veya üretimdeki siparişte talep satışa gider.
  - **Ödeme bekleniyor (ek11):** Sipariş onaylanınca bayinin iskontolu net tutarı gösterilir, "… $ öde" butonu çıkar; ödendikçe "Ödeme alındı" olur.
- **Cari hesabım:** Bakiye, ekstre, kredi limiti, ödeme bildirimi (dekont yükleme). **Online öde (ek10):** Bayiye özel ödeme linkine ayrı bir ödeme sayfasından yönlendirir ve ödemeyi kaydeder.
- **Belgeler (ek6):** Fatura, irsaliye, ekstre (PDF olarak yazdırma), iade/şikâyet (fotoğraflı).
- **Özel teklif (ek10):** Bayi masa + sandalye, masa başına sandalye sayısı, takım adedi, renkler ve hedef fiyat girer. Satış onaylayınca özel fiyatla tek tıkla sepete ekler.
- Bildirim paneli, duyurular, numune/katalog talebi, projeler, sık aldıklarım, adres defteri.

## 4. Satış paneli (exit_satis_paneli.html)

Sol menü (`data-s`, bir kısmı modüllerle eklendi):
- **Operasyon:**
  - Gösterge paneli, Siparişler, Onay bekleyenler
  - Değişiklik talepleri (ek7), Özel teklif talepleri (ek8)
  - İade ve şikâyetler, Ödeme bildirimleri, Numune talepleri, Hatırlatmalar
- **Müşteri:** Müşteriler ve cari, Kredi limiti ve risk, Ödeme linkleri ve tahsilat (ek8/ek9), Fiyat grupları, Ziyaret ve görüşmeler, Bayi karnesi, Bayi hedef ve prim.
- **Pazarlama:** Kampanyalar, Duyurular, Ürünler ve fiyatlar.
- **Analiz:** Satış analizi, **Ürün ve renk analizi + stok planı önerisi** (ek8), Yapay zekâ (tahmin ve SWOT; Claude API anahtarı kullanıcıdan), Hedefler, Raporlar.
- **Ayarlar:** Ayarlar, Temsilciler ve işlem kaydı (ek6; temsilci yalnız kendi bayilerini görür).

Önemli akışlar:
- **Sipariş onayı:** `durumYaz(no, 'onay')` → `exb-siparisler`'e iskontolu `net`, `iskonto`, `odemeBekleniyor` yazılır (ek9). İskonto = bayi iskontosu (`exs-iskonto`) × siparişe özel ek iskonto (`tutarlar()`).
- **Ödeme onayı:** Ödeme bildirimleri ekranında onaylanan ödeme `exs-cari` hareketine (`tip: 'odeme'`) işlenir. Bayi tarafı siparişin ödeme durumunu `exb-odeme` kayıtlarından (`siparis` alanı veya açıklamadaki sipariş no) hesaplar.
- **Kredi limiti:** Onayda limit aşımı kontrolü yapılır (ek6).

## 5. Veri anahtarları

**Ortak (`exb-`):**

| Anahtar | İçerik |
|---|---|
| `exb-kullanicilar` | Bayi hesapları (şifre özetli) |
| `exb-siparisler` | Siparişler `{no, kul, firma, tarih, kalemler[{id, ad, kategori, secenek, iskelet, file, kumas, fitil, adet, birim}], toplam, net, durum, gecmis, talep, rev, …}` |
| `exb-cari` | Cari hesaplar (satıştan yansıyan) |
| `exb-odeme` | Ödeme bildirimleri ve online ödemeler `{no, kul, tutar, yontem, online, siparis, durum}` |
| `exb-odeme-link` | `{bayiKul: "https://…"}` bayiye özel ödeme linki |
| `exb-teklif` | Özel teklif talepleri `{no, kul, masa, sandalye, oran, takim, hedef, durum, fiyat{masa, sandalye, takim}, sepette}` |
| `exb-iade`, `exb-numune`, `exb-hatirlat` | İade/şikâyet, numune talepleri, bayiye mesajlar |
| `exb-duyuru`, `exb-kampanya`, `exb-fiyat`, `exb-stok`, `exb-gizli`, `exb-bayi-hedef` | Satıştan bayiye yayınlanan içerik |
| `exb-sepet-<kul>`, `exb-fav-<kul>`, `exb-proje-<kul>`, `exb-adres-<kul>`, `exb-bildirim-<kul>` | Bayiye özel |

**Satış (`exs-`):** `exs-siparisler`, `exs-musteriler`, `exs-iskonto`, `exs-cari`, `exs-crm`, `exs-kampanya`, `exs-fiyat*`, `exs-hedef`, `exs-bayi-hedef`, `exs-kullanicilar`, `exs-islem` (işlem kaydı), `exs-kur`, `exs-onay-ayar`, `exs-rapor-hafta`.

## 6. Girişler

- **Satış paneli:** `satis` / `1234` (Satış Yöneticisi). Temsilciler "Temsilciler ve işlem kaydı" ekranından eklenir.
- **Bayi portalı:** Bayi giriş ekranındaki "Kayıt ol" ile hesap açar. Satış panelindeki "Ayarlar › Örnek veri" ile örnek bayiler ve siparişler yüklenebilir (test için).

## 7. Çalıştırma

1. **Tek bilgisayar:** HTML dosyasını Chrome/Edge ile açın.
2. **Ortak kullanım:**
   - Paketi şirket sunucusuna kopyalayın, `sunucu/baslat_windows.bat` (veya `node sunucu/sunucu.js`) çalıştırın.
   - Bayi portalı `http://SUNUCU-IP:8080/`, satış paneli `/satis`, MRP `/mrp` (MRP dosyası `mrp.html` olarak paketin köküne konursa).
   - Ayrıntı: `sunucu/KURULUM.md`.
3. **Bayilerin internetten erişimi:** Sunucu bir VPS'e kurulup önüne alan adı + HTTPS konmalı (Caddy/Nginx). HTTPS ile bayi portalı telefona kurulabilir (`telefon/KURULUM.txt`).

Sunucu sayfa yolları: `/` → `telefon/index.html`, `/satis` → `exit_satis_paneli.html`, `/mrp` → `mrp.html`. Bu yüzden sunucu `sunucu/` klasörünün bir üstündeki dosyaları okur.

## 8. Test ipuçları

- Playwright ile iki ayrı tarayıcı bağlamı (bayi + satış) aynı sunucuya bağlanarak uçtan uca test edilebilir.
- Bayi kaydı: `[data-s=kayit]`, alanlar `#kFirma #kAd #kTel #kMail #kSehir #kKul #kSif`, `#kKvkk`, `#fKayit button[type=submit]`.
- Satış girişi: `#gKul`, `#gSif`, `#fGiris button.btn.marka`.
- Sayfa geçişi: bayi `git('teklifler')`, satış `git('tahsilat')`.

## 9. Açık konular

1. Gerçek fotoğraf üzerinde renk değişimi 20 üründe var. Kalan ürünler (masalar, barlar, şezlonglar, takımlar: 36–38, 40–50, 52–57, 59, 61–65, 67–73 ve setler 4–9, 11, 12) için bölge maskeleri çıkarılmalı. Fotoğrafı olmayan ürünler: 1, 2, 3, 10, 13, 18, 33, 39, 51, 58, 60, 66.
2. **Ödeme linkleri:** Bayi başına sanal POS / ödeme linki (PayTR, iyzico vb.) bankadan alınıp Satış › Ödeme linkleri ekranına girilmeli. Ödemenin otomatik doğrulanması (ödeme kuruluşunun bildirimi / callback) yok; satış ekibi manuel onaylıyor.
3. **ERP/MRP entegrasyonu:** Siparişlerin MRP'ye ve şirketin ERP'sine aktarılması, stok yeterlilik kontrolü ve hat kapasitesine göre termin henüz yok (MRP raporunda planlanıyor).
4. **Eşzamanlı yazma:** Birleştirme listesi dışındaki anahtarlarda son yazan kazanır.
5. Ürün ve renk analizi geçmiş siparişlere dayanıyor; gerçek veri biriktikçe anlam kazanır. Stok planı önerisi MRP'ye otomatik aktarılmıyor (CSV indiriliyor).
6. Sunucu HTTP; internete açılacaksa HTTPS ve güçlü şifre politikası şart.
