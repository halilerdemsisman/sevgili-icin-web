# MRP Pro — ERP Entegrasyon Kılavuzu

Bu klasör, MRP Pro'nun **sizin geliştirdiğiniz ERP'nin bir modülü** olarak çalışması için gereken her şeyi içerir.

| Dosya | Ne işe yarar |
|---|---|
| [`openapi.yaml`](openapi.yaml) | **Sözleşme.** ERP'nin sağlaması gereken REST uç noktaları ve tüm veri şemaları (OpenAPI 3) |
| [`schema.sql`](schema.sql) | ERP veritabanı için önerilen PostgreSQL tabloları (kullanıcı, bölüm rolü ve oturum tabloları dahil) (PostgreSQL 16'da doğrulandı) |
| [`embed-sdk.js`](embed-sdk.js) | ERP portalında MRP Pro'yu gömmek için küçük SDK |
| [`host-demo.html`](host-demo.html) | Örnek ERP portalı: tek oturum, ERP menüsünden yönetim, olay akışı |
| [`mock-erp/`](mock-erp/) | **Çalışan referans ERP sunucusu** (Node.js, bağımlılıksız). Ekibiniz bunu birebir taklit edebilir |

## 1. Hızlı deneme

```bash
node mrp-pro/integration/mock-erp/server.mjs
```

- Örnek ERP portalı (MRP Pro gömülü): <http://localhost:8787/mrp-pro/integration/host-demo.html>
- MRP Pro tek başına, ERP modunda: <http://localhost:8787/mrp-pro/index.html?mode=erp>
- Kullanıcılar (bölüm rolleri): `admin/1234`, `yonetim/yon123`, `planlama/plan123`, `uretim/uret123`, `satinalma/satin123`, `satinalma_muduru/mudur123`, `depo/depo123`, `maliyet/mal123`

Portalda sağdaki panelden **ERP'de satış siparişi açın** veya **fiyat değiştirin**; birkaç saniye içinde MRP Pro'ya düşer. MRP Pro'da yapılan her işlem (talep, sipariş, mal kabul, iş emri) ERP'ye gider ve olay günlüğünde görünür.

## 2. Mimari

```
┌──────────────────────── ERP Portalı (sizin) ───────────────────────┐
│  menü · oturum (SSO) · diğer modüller                              │
│  ┌───────────── iframe: MRP Pro (mode=erp, embed=1) ─────────────┐ │
│  │  Ekranlar ─ model ─ MRP motoru ─ store                        │ │
│  │                                   │  değişiklik tespiti       │ │
│  │                                   ▼                           │ │
│  │                         backend.js (sync / pull / numara)     │ │
│  └──────────────▲─────────────────────┼──────────────────────────┘ │
│     postMessage │ (embed-sdk.js)      │ HTTPS + Bearer token        │
└─────────────────┼─────────────────────┼────────────────────────────┘
                  │                     ▼
                  │        ┌──────── ERP API (/api) ────────┐
                  │        │ /auth/*  /mrp/snapshot          │
                  └────────│ /mrp/sync  /mrp/changes         │
                           │ /mrp/sequences                  │
                           │  iş kuralları · yetki · muhasebe│
                           └───────────────┬─────────────────┘
                                           ▼
                              ERP veritabanı (schema.sql)
```

**İlke: ERP tek doğru kaynaktır.** MRP Pro ana veriyi ERP'den okur, ürettiği kayıtları (talep, sipariş, hareket…) ERP'ye yazar. ERP bir değişikliği reddederse MRP Pro kendi kopyasını ERP'deki hâle döndürür ve kullanıcıya gerekçeyi gösterir.

## 3. Çalışma modları

| | `standalone` (varsayılan) | `erp` |
|---|---|---|
| Veri | Tarayıcı (localStorage) | ERP API |
| Kullanıcı / yetki | Demo hesaplar | ERP'den (`/auth/me`) |
| Demo verisi | Var | Yok — tümü ERP'den |
| Çok kullanıcı | Hayır | Evet (değişiklikler `/mrp/changes` ile dağıtılır) |

Mod seçimi — MRP Pro sayfasından **önce**:

```html
<script>
  window.MRP_CONFIG = {
    mode: 'erp',
    apiBase: '/api',                 // ERP API kökü
    pollInterval: 30000,             // değişiklik çekme aralığı (ms)
    embed: true,                     // portala gömülü
    parentOrigin: 'https://erp.firma.com',   // gömülüyse portalın origin'i
    hideNav: true                    // MRP menüsünü gizle, ERP menüsünü kullan
  };
</script>
```

veya URL ile: `index.html?mode=erp&embed=1&hideNav=1`. Güvenlik gereği `api` parametresi URL'den yalnızca **aynı origin** altında değiştirilebilir; farklı bir ERP adresi `MRP_CONFIG.apiBase` ile verilmelidir.

## 4. ERP'nin uygulaması gerekenler

Ayrıntılı tanımlar `openapi.yaml`'dadır. Özet:

### 4.1 Oturum
- `POST /auth/login` → `{ token, user }`
- `GET /auth/me` → `user` (token doğrulama; portaldan gelen SSO token'ı da buradan doğrulanır)
- `POST /auth/logout`

`user.permissions` MRP Pro'daki her eylemi yönetir (`editCost`, `runMRP`, `createPO`, `receiveGoods`, `transferStock`, `approveLimit`…); `user.views` hangi ekranların görüneceğini, `user.home` açılış ekranını belirler. ERP'deki bölümlerinizi bu alanlara eşleyin; varsayılan 8 bölüm rolü `assets/js/auth.js` → `DEFAULT_ROLES`'tadır (örnek sunucu da aynılarını kullanır). `approveLimit: null` = sınırsız onay.

### 4.2 Veri
- `GET /mrp/snapshot` → tüm koleksiyonlar + `cursor`
- `POST /mrp/sync` → istemci değişiklikleri; her biri `{collection, op: upsert|delete, key, data}`
- `GET /mrp/changes?since=<cursor>` → diğer istemcilerin ve ERP'nin değişiklikleri (istekte gelen `X-Client-Id`'nin kendi değişiklikleri hariç). Günlük kırpıldıysa `410` döner, istemci yeniden tam yükler.
- `POST /mrp/sequences` → belge numarası blokları (PO-2026-0051…0100). Böylece eşzamanlı kullanıcılarda numara çakışmaz.

### 4.3 İş kuralları (`/mrp/sync` içinde)
Örnek sunucudaki `validate()` fonksiyonu başlangıç noktasıdır:
- Koleksiyon bazında yetki (bkz. openapi tablosu)
- `movements`, `auditLog` değişmezdir (yalnızca ekleme)
- Lot miktarı negatif olamaz; teslimatı olan sipariş silinemez
- Onay limiti sunucuda da kontrol edilir (istemciye güvenilmez)
- Talep yalnızca `approveRequest` yetkisi olan kullanıcı tarafından ve yalnızca bekleyen durumdan onaylanır/reddedilir
- Talep toplamı kalem tutarlarının toplamına eşit olmalıdır; onaylanmış talebin tutarı sonradan artırılamaz
- Muayene kaydını depo açar (`pending`); kararı (`done`) yalnızca `inspectQuality` yetkisi verir, kabul + ret = muayene miktarı olmalı, ret için karar (iade/hurda) ve sebep zorunludur; tamamlanmış muayene değiştirilemez

Kendi kurallarınızı (muhasebe fişi, bütçe kontrolü, stok kilidi…) buraya ekleyin. Reddedilen her değişiklik için `{collection, key, reason, current}` döndürmeniz yeterli.

### 4.4 ERP'den MRP'ye veri akışı
ERP'de oluşan her kaydı (satış siparişi, yeni malzeme, fiyat değişikliği, başka modülden stok girişi) değişiklik günlüğüne `client_id = 'erp'` ile yazın; tüm açık MRP Pro istemcileri bir sonraki çekmede alır. SQL örneği `schema.sql` sonundadır. Örnek sunucuda `POST /api/erp/sales-orders` ve `PATCH /api/erp/items/:kod` bunu gösterir.

### 4.5 Muhasebe/stok entegrasyonu için önemli koleksiyonlar
| Olay | Koleksiyon | Ayırt edici alan |
|---|---|---|
| Mal kabul | `movements` (type `GR`), `lots`, `purchaseOrders.receipts` | `ref` = PO no, `lots[].lot` |
| Üretime sarf | `movements` (type `GI`) | `ref` = İE no |
| Üretimden giriş | `movements` (type `FG`) | `ref` = İE no |
| Sayım farkı | `movements` (type `ADJ`) | `note` = gerekçe |
| Transfer / fason | `movements` (type `TRF`), `subcontracts` | `loc` → `toLoc` |
| Satın alma siparişi | `purchaseOrders` | `status`, `lines[].price` (TL), `lines[].fxRate` |
| Kur / maliyet parametreleri | `settings` | `fx.rates` |

## 5. Portala gömme

```html
<div id="mrp" style="height: calc(100vh - 56px)"></div>
<script src="/mrp-pro/integration/embed-sdk.js"></script>
<script>
  const mrp = MRPPro.embed('#mrp', {
    src: '/mrp-pro/index.html',
    mode: 'erp',
    hideNav: true,
    view: 'mrp',
    theme: 'light',
    getToken: async (refresh) => refresh ? await erp.refreshToken() : erp.token   // tek oturum
  });
  mrp.on('ready', (m) => console.log('MRP hazır', m.user));
  mrp.on('route', (m) => erpMenu.select(m.view));
  mrp.on('sync',  (m) => { if (m.changes.some((c) => c.collection === 'purchaseOrders')) erp.badges.refresh(); });
  // ERP menüsünden yönlendirme
  erpMenu.onClick((view) => mrp.navigate(view));   // 'dashboard','mrp','capacity','workorders','requests','po','stock','costing',…
</script>
```

| Portal → MRP | MRP → Portal |
|---|---|
| `init {token, theme, view, hideNav}` | `loaded`, `ready {user, view}` |
| `token {token}` (yenileme) | `route {view}` |
| `navigate {view}`, `theme {theme}` | `sync {direction, changes, rejected}` |
| `refresh`, `logout` | `auth-expired`, `error {message}` |

Mesajlar yalnızca `parentOrigin` ile tanımlı origin'den kabul edilir. MRP Pro ile portal **farklı alan adlarındaysa** MRP Pro sayfasında `MRP_CONFIG.parentOrigin`, ERP API'sinde de CORS (`ALLOWED_ORIGINS`) ayarlanmalıdır. En kolay yol MRP Pro'yu ERP ile aynı alan adı altında yayınlamaktır (ör. `https://erp.firma.com/mrp-pro/`).

## 6. Çevrimdışı ve hata durumları

- Değişiklikler ERP'ye gönderilemezse kaybolmaz; üst çubuktaki gösterge **Çevrimdışı** olur ve bağlantı gelince otomatik gönderilir (artan aralıklarla yeniden deneme).
- Tarayıcı kapanırsa bekleyen değişiklikler yerel önbellekte durur, bir sonraki girişte önce onlar gönderilir. Çıkışta önbellek silinir.
- Oturum süresi dolarsa gömülü modda portala `auth-expired` gönderilir; SDK `getToken(true)` ile yeni token alıp iletir.
- Eşzamanlılık: son yazan kazanır; çakışmanın kabul edilemeyeceği yerlerde ERP değişikliği reddeder.

## 7. Üretime geçiş kontrol listesi

- [ ] `openapi.yaml`'daki uç noktalar ERP'de uygulandı (örnek: `mock-erp/server.mjs`)
- [ ] Tablolar `schema.sql`'e göre oluşturuldu veya mevcut tablolara VIEW ile eşlendi
- [ ] Bölüm rolleri `mrp_role` tablosuna, kullanıcılar `mrp_user` tablosuna aktarıldı (parolalar yalnızca hash olarak)
- [ ] Roller → `views` + `permissions` eşlemesi yapıldı; onay limitleri sunucuda da kontrol ediliyor
- [ ] ERP'deki satış siparişi / malzeme / fiyat değişiklikleri `mrp_change_log`'a yazılıyor
- [ ] `movements` → stok/muhasebe entegrasyonu (GR, GI, FG, ADJ) bağlandı
- [ ] HTTPS, token süresi ve yenileme, oturum kapatma
- [ ] `parentOrigin` ve (gerekirse) CORS ayarları
- [ ] `/mrp/snapshot` büyük veri için sınırlandırıldı (ör. son 12 ay hareket)
