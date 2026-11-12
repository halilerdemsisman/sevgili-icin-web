# EXIT Garden sunucu API'si (sürüm 2a)

Tüm uçlar JSON konuşur. Hatalar `{ "hata": "açıklama" }` biçimindedir. Yapay zekâ aktarımı ise Claude API'nin hata biçimini (`{ "error": { "message": … } }`) olduğu gibi döner.

## Oturum

- Giriş HttpOnly çerezle yapılır: bayi `exit_b`, satış `exit_s`. Aynı tarayıcıda iki uygulama birlikte açık olabilir.
- Her istekte hangi uygulamanın oturumunun kullanılacağı `X-Exit-Uyg: bayi|satis` başlığıyla bildirilir. Başlık eklenemeyen durumlarda (EventSource, sendBeacon) `?uyg=` parametresi kullanılır.
- Yazma isteklerinde `Origin` başlığı varsa sunucunun adresiyle aynı olmalıdır (CSRF koruması).
- Geçici şifreyle giren kullanıcının oturumunda `sifreDegistir: true` bulunur. Bu kullanıcı `/api/sifre` çağrılana kadar veri göremez, yazamaz.

| Uç | Gövde | Açıklama |
|---|---|---|
| `POST /api/giris` | `{tur, kul, sifre}` | 15 dakikada aynı IP ve kullanıcı adıyla 5 hatalı denemeden sonra `429` |
| `POST /api/kayit` | `{kul, sifre, firma, ad, tel, mail, sehir?, vergi?, kvkk: true}` | Bayi kaydı (`KAYIT_ACIK=1`); şifre en az 8 karakter; `201` |
| `POST /api/cikis` | — | |
| `GET /api/oturum` | — | `{oturum, surum, kayitAcik}` |
| `POST /api/sifre` | `{eski, yeni}` | Kendi şifresi; diğer oturumları kapanır, yeni çerez döner |
| `POST /api/sifre-sifirla` | `{tur, kul}` | Yönetici; `{gecici}` döner |
| `POST /api/kullanici-ekle` | `{kul, ad, rol: temsilci|yonetici}` | Yönetici; satış kullanıcısı, `{gecici}` döner |
| `POST /api/kullanici-sil` | `{kul}` | Yönetici; kendini silemez |

## REST v1

Faz 2 (bayi web sitesi) ve Faz 3 (satış masaüstü) bu uçları kullanacak. Veri, eşitleme ucuyla aynıdır: REST ile verilen sipariş eski ekranlarda da anında görünür.

Görünürlük her uçta aynıdır:
- bayi yalnız kendi kayıtlarını görür,
- temsilci yalnız atandığı bayileri görür (atama hiç yoksa tümünü),
- yönetici tümünü görür.

### `GET /api/v1/ben`
Oturumdaki kullanıcı kaydı (şifre alanları hariç) ile `tur` ve `rol`.

### `GET /api/v1/katalog`
```json
{ "para": "USD", "urunler": [
  { "id": 21, "ad": "Neo", "kategori": "Sandalyeler",
    "secenekler": [{ "ad": "Fileli", "sinif": "Sandalye", "liste": 83, "fiyat": 66,
                     "kampanya": { "ad": "Ali özel", "oran": 20, "bit": null } }] } ] }
```
- `liste`: satışın fiyat güncellemesi varsa o, yoksa katalog fiyatı.
- `fiyat`: bayiye geçerli en yüksek kampanya uygulanmış hali.
- Bayi, satışın gizlediği ürünleri görmez.

### `GET /api/v1/siparisler`
Parametreler:
- `?durum=yeni|onay|uretim|sevk|iptal`
- `?bayi=kul`: yalnız satış için
- `?sayfa=1&adet=50`: en fazla 200

Siparişler en yeni önce döner: `{ toplam, sayfa, adet, siparisler: [...] }`. Sipariş biçimi bayi portalınınkiyle aynıdır (`no, kul, firma, tarih, kalemler[], toplam, net, iskonto, durum, gecmis, talep, fiyatKontrol, …`).

### `GET /api/v1/siparisler/:no`
Tek sipariş. Görülemeyen sipariş `404` döner.

### `POST /api/v1/siparisler` (yalnız bayi)
```json
{ "adres": "İzmir, depo teslim",
  "kalemler": [ { "id": 21, "secenek": "Fileli", "adet": 10,
                  "iskelet": "Granit (Granit)", "file": "Siyah (Terra 05)", "kumas": "", "fitil": "", "not": "",
                  "teklif": "OT-2026-0003" } ] }
```
- Birim fiyatı **sunucu** belirler: katalog, fiyat güncellemesi, kampanya; `teklif` verilmişse onaylı özel teklif fiyatı. Gövdedeki fiyat alanları yok sayılır.
- Numarayı sunucu verir. Sipariş `201` ile döner, `Location` başlığında adresi bulunur.
- Hatalı kalem `400` döner; açıklamada kalem sırası yazar (ör. "2. kalem: …").

### `GET /api/v1/cari`
Bayi kendi özetini görür; satış `?bayi=kul` ile seçer.
```json
{ "bayi": "ali", "vade": 60, "limit": 1000, "bakiye": 200, "acikSiparis": 0, "risk": 200, "kullanilabilir": 800, "hareketler": [ … son 50 … ] }
```
`risk = bakiye + onaylanmış ama faturası kesilmemiş siparişlerin iskontolu neti`. Bu hesap, temsilcinin onay yetkisini sınırlayan kredi limiti denetimiyle aynıdır.

## Eşitleme (mevcut uygulamalar)

| Uç | Açıklama |
|---|---|
| `GET /api/veri` | Oturuma göre süzülmüş tüm anahtarlar: `{zaman, veri, oturum}` |
| `GET /api/degisen?son=ZAMAN` | `son`'dan sonra değişen anahtarlar |
| `POST /api/veri` | `{degisen: [[anahtar, değer|null], …]}` → `{birlesen, reddedilen}`. Okuma/yazma kuralları `sunucu/lib/kurallar.js` dosyasında |
| `POST /api/numara` | `{on: EXG|IAD|OL|OT|OB|NMN}` → `{no}` |
| `GET /api/olaylar` | Anlık bildirim (Server-Sent Events). Her yazma turunda `data: <zaman>` gönderir; veri içermez, istemci `/api/degisen` ile çeker |
| `GET /api/dosya/<kimlik>.<uzantı>` | Dekont, fotoğraf, logo. Sahibi olan bayi ve satış görür |

## Yapay zekâ (satış)

| Uç | Açıklama |
|---|---|
| `GET /api/ai/durum` | `{anahtarVar, kaynak: ortam|ayarlar|null}` |
| `POST /api/ai/anahtar` | `{anahtar}` (boş: sil). Yalnız yönetici. `gizli.json` dosyasında saklanır, hiçbir yanıtta geri dönmez |
| `POST /api/ai/mesaj` | Claude Messages API gövdesi. Sunucu anahtarı ekler ve `https://api.anthropic.com/v1/messages` adresine iletir. İletilen alanlar: `model` (yalnız `claude-opus-5-5`), `max_tokens` (en fazla 16000), `system`, `messages`, `output_config`, `fallbacks`, `thinking`; diğer alanlar atılır. Kullanıcı başına saatte `AI_SAATLIK` (30) istek. Yanıt olduğu gibi döner |

## MRP

`/mrp` ve `/api/mrp*` uçlarına şu kaynaklardan erişilir:
- yerel ağ,
- `MRP_IZINLI_IP` listesindeki adresler,
- satış oturumu olan istekler.
