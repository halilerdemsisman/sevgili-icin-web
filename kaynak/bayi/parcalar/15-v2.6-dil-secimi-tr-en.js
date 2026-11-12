
(function () {
  const AY = { Ocak: 'January', Şubat: 'February', Mart: 'March', Nisan: 'April', Mayıs: 'May', Haziran: 'June', Temmuz: 'July', Ağustos: 'August', Eylül: 'September', Ekim: 'October', Kasım: 'November', Aralık: 'December' };
  const GUN = { Pazartesi: 'Monday', Salı: 'Tuesday', Çarşamba: 'Wednesday', Perşembe: 'Thursday', Cuma: 'Friday', Cumartesi: 'Saturday', Pazar: 'Sunday' };
  const RENK = { Antrasit: 'Anthracite', Beyaz: 'White', Krem: 'Cream', Cappuccino: 'Cappuccino', Granit: 'Granite', Seramik: 'Ceramic', Siyah: 'Black', Krom: 'Chrome' };
  const KAT = { 'Oturma Grupları': 'Lounge Sets', 'Sandalyeler': 'Chairs', 'Bar Sandalyeleri': 'Bar Chairs', 'Masalar': 'Tables', 'Bar Masaları': 'Bar Tables', 'Sehpalar': 'Side Tables', 'Banklar': 'Benches', 'Şezlonglar': 'Sun Loungers', 'Aile Paketleri': 'Family Packages' };
  const SOZ = Object.assign({}, KAT, RENK, {
    // giriş
    'EXIT Garden · B2B': 'EXIT Garden · B2B', 'Kurumsal': 'Corporate', 'Bayi Portalı': 'Dealer Portal', 'Bayi girişi': 'Dealer sign-in',
    "Dış mekân mobilya koleksiyonunu inceleyin, iskelet, file, kumaş ve fitil seçimlerinizi yapın, siparişinizi doğrudan EXIT Garden'a iletin.": 'Browse the outdoor furniture collection, choose frame, mesh, fabric and piping, and send your order directly to EXIT Garden.',
    'Bayiye özel hesap ve sipariş geçmişi': 'Dedicated dealer account and order history', 'Ürün başına renk ve kumaş yapılandırması': 'Colour and fabric configuration per product', 'Siparişin durumunu anlık takip': 'Live order status tracking',
    'ürün modeli': 'product models', 'kategori': 'categories', 'iskelet rengi': 'frame colours', 'kumaş rengi': 'fabric colours',
    'Hesabınızla giriş yapın veya yeni bayi kaydı oluşturun.': 'Sign in with your account or register as a new dealer.', 'Giriş yap': 'Sign in', 'Kayıt ol': 'Register',
    'Kullanıcı adı': 'Username', 'Şifre': 'Password', 'Bayi kullanıcı adınız': 'Your dealer username', 'Şifreyi göster': 'Show password', 'Hesabınız yok mu? Üstten': "Don't have an account? Choose", "'u seçin.": 'above.',
    'Firma adı': 'Company name', 'Yetkili ad soyad': 'Contact name', 'Telefon': 'Phone', 'E-posta': 'E-mail', 'Şehir': 'City', 'Vergi no': 'Tax no.',
    'KVKK aydınlatma metnini okudum, kabul ediyorum.': 'I have read and accept the privacy notice (KVKK).', 'Bilgileriniz yalnızca EXIT Garden satış ekibiyle paylaşılır.': 'Your details are shared only with the EXIT Garden sales team.',
    'KVKK': 'Privacy (KVKK)', 'Gizlilik': 'Privacy', 'Kullanıcı adı veya şifre hatalı.': 'Incorrect username or password.', 'Bu uygulama yalnız müşteri hesapları içindir.': 'This portal is for dealer accounts only.',
    'Hesabınız pasif. EXIT Garden satış ekibiyle iletişime geçin.': 'Your account is inactive. Please contact the EXIT Garden sales team.', 'Kullanıcı adı en az 3 karakter olmalı (harf, rakam, . _ -).': 'Username must be at least 3 characters (letters, digits, . _ -).',
    'Bu kullanıcı adı alınmış.': 'This username is already taken.', 'Şifre en az 6 karakter olmalı.': 'Password must be at least 6 characters.', 'Kaydınız oluşturuldu, hoş geldiniz.': 'Your account has been created. Welcome!',
    'Karanlık moda geç': 'Switch to dark mode', 'Aydınlık moda geç': 'Switch to light mode', 'Kayıt yapılamadı: tarayıcı depolaması kapalı.': 'Could not save: browser storage is disabled.',
    // üst bölüm
    '· Kurumsal Bayi Portalı': '· Corporate Dealer Portal', 'Fiyatlar USD': 'Prices in USD', 'Katalog': 'Catalogue', 'Siparişlerim': 'My orders', 'Cari hesabım': 'My account', 'Sepet': 'Cart', 'Çıkış': 'Sign out', 'Oturumu kapat': 'Sign out', 'Bayi hesabı': 'Dealer account',
    'Ürün ara: Enzo, şezlong, bar masa…': 'Search: Enzo, lounger, bar table…',
    // katalog
    'Tümü': 'All', 'Tüm ürünler': 'All products', 'Kategori': 'Category', 'Ürün tipi': 'Product type', 'Fiyat (USD)': 'Price (USD)', 'En az': 'Min', 'En çok': 'Max',
    'Yalnız fiyatı olanlar': 'Only items with a price', 'Yalnız kampanyalı ürünler': 'Only items on promotion', 'Filtreleri temizle': 'Clear filters', 'Filtrele': 'Filter', 'Katalog (PDF)': 'Catalogue (PDF)',
    'Seçili filtreye göre yazdırılabilir katalog': 'Printable catalogue for the current filter', 'Tüm kategoriler': 'All categories', 'Tüm ürün tipleri': 'All product types', 'İsme göre': 'By name',
    'Fiyat: düşükten yükseğe': 'Price: low to high', 'Fiyat: yüksekten düşüğe': 'Price: high to low', 'Görsel yok': 'No image', 'Fiyat için bize ulaşın': 'Contact us for price', 'Fiyat sorunuz': 'Price on request',
    'başlayan': 'from', 'Bu filtrelere uyan ürün yok.': 'No products match these filters.', 'Kampanyalı ürünler': 'Products on promotion', 'Kampanyalar': 'Promotions', 'Kampanyalı ürünleri göster': 'Show promoted products',
    'Fiyatlar ve kampanyalar güncellendi.': 'Prices and promotions have been updated.', 'Favorilerim': 'My favourites', 'Yalnız favorilerim': 'Only my favourites', 'Favori': 'Favourite', 'Favorilere ekle / çıkar': 'Add to / remove from favourites',
    'Henüz favori ürününüz yok. Ürün kartındaki kalp simgesine dokunarak ekleyebilirsiniz.': 'You have no favourites yet. Tap the heart on a product card to add one.', 'Favorilere eklendi.': 'Added to favourites.', 'Favorilerden çıkarıldı.': 'Removed from favourites.',
    'Stokta': 'In stock', 'Üretilecek': 'Made to order', 'Açılır pencere engellendi; tarayıcıda izin verin.': 'Pop-up blocked; please allow pop-ups in your browser.',
    // ürün penceresi
    'Kapat': 'Close', '360° görünüm için tıklayın': 'Click for 360° view', 'Ürün': 'Product', 'Seçenek': 'Option', 'İskelet': 'Frame', 'File': 'Mesh', 'Kumaş': 'Fabric', 'Fitil': 'Piping', 'Adet': 'Quantity',
    'Renkler ekranda temsilidir; kesin ton için kartelaya bakınız.': 'On-screen colours are indicative; please refer to the colour card for the exact shade.', 'Teknik bilgiler': 'Technical details',
    'Ölçüler cm, ağırlık kg. Kaynak: exitgarden.com': 'Dimensions in cm, weight in kg. Source: exitgarden.com', 'Seçenek / ölçü': 'Option / size', 'İskelet rengi': 'Frame colour', 'File rengi': 'Mesh colour', 'Fitil rengi': 'Piping colour',
    'Seçiniz': 'Select', 'Adet ve not': 'Quantity and note', 'Not (isteğe bağlı)': 'Note (optional)', 'Teklif': 'Quote', 'fiyat sonradan bildirilir': 'price to be confirmed', 'Sepete ekle': 'Add to cart', 'Teklif sepetine ekle': 'Add to quote request',
    'Bu ürünün fiyatı listede yok. Seçimlerinizle birlikte fiyat teklifi isteyebilirsiniz.': 'This product has no list price. You can request a quote with your selections.', 'İskelet rengini seçince kesinleşir.': 'Confirmed once the frame colour is selected.',
    'Sürükleyerek döndürün': 'Drag to rotate', 'Sürükleyerek döndürün · tekerlekle yakınlaştırın': 'Drag to rotate · scroll to zoom', 'Otomatik döndür': 'Auto-rotate',
    // sepet
    'Toplam': 'Total', 'Kaldır': 'Remove', 'Sepetiniz boş.': 'Your cart is empty.', 'Teslimat adresi / not': 'Delivery address / note', 'Teslimat adresi, istenen tarih vb.': 'Delivery address, requested date, etc.',
    'Sipariş talebini gönder': 'Send order request', 'Fiyatlar USD, KDV hariçtir. Talebiniz satış ekibinin onayıyla kesinleşir.': 'Prices are in USD, excluding VAT. Your request is confirmed once approved by our sales team.',
    'Fiyatı olmayan kalemler için teklif hazırlanacak.': 'A quote will be prepared for items without a price.', 'Toplu sipariş (Excel)': 'Bulk order (Excel)', 'Şablon indir': 'Download template', 'Excel / CSV yükle': 'Upload Excel / CSV',
    'Tüm kalemler stokta': 'All items in stock', 'Tahmini teslim (en geç kalem)': 'Estimated delivery (latest item)', 'Toplu sipariş': 'Bulk order', 'Tekrar sipariş': 'Reorder', 'Tamam': 'OK',
    'kalem sepete eklendi,': 'items added to cart,', 'satır atlandı.': 'rows skipped.', 'Satır': 'Row', 'Sorun': 'Issue', 'Ürün bulunamadı': 'Product not found', 'Seçenek yazılmamış': 'Option missing',
    'Dosya okunamadı. Excel (.xlsx) veya CSV yükleyin.': 'The file could not be read. Please upload Excel (.xlsx) or CSV.', 'Başlık satırı bulunamadı: “Ürün” ve “Adet” sütunları gerekli.': 'Header row not found: “Product” and “Quantity” columns are required.',
    '“Adet” sütunu bulunamadı.': '“Quantity” column not found.', 'Dosyada adedi girilmiş satır bulunamadı.': 'No rows with a quantity were found in the file.',
    // siparişler
    'Siparişinizin durumu, tahmini teslim tarihi ve nakliye bilgisi satış ekibi güncelledikçe burada görünür.': 'Order status, estimated delivery and shipping details appear here as the sales team updates them.',
    'Açık sipariş': 'Open orders', 'Sevk edilen': 'Shipped', 'Toplam sipariş': 'Total orders', 'Açık': 'Open', 'Sevk edildi': 'Shipped', 'İptal': 'Cancelled', 'Yeni talep': 'New request', 'Onaylandı': 'Approved', 'Üretimde': 'In production',
    'Talep alındı': 'Request received', 'Tahmini teslim': 'Estimated delivery', 'Onaydan sonra bildirilecek': 'Will be confirmed after approval', 'Nakliye': 'Shipping', 'Takip / irsaliye no': 'Tracking / waybill no.',
    'Satış ekibinin notu': 'Note from sales team', 'Kalemleri göster': 'Show items', 'Sipariş dosyasını indir': 'Download order file', 'Tekrar sipariş ver': 'Reorder', 'Dosyayı indir': 'Download file',
    'iskontolu net': 'net after discount', 'liste fiyatı': 'list price', 'Bu filtrede sipariş yok.': 'No orders in this filter.', 'Henüz sipariş talebiniz yok.': 'You have no order requests yet.', 'Kataloğa git': 'Go to catalogue',
    'Bu sipariş iptal edildi. Bilgi için satış temsilcinizle görüşün.': 'This order was cancelled. Please contact your sales representative.',
    'Her sipariş talebi, satış ekibine iletilmek üzere ayrıca dosya olarak indirilir. İsterseniz aşağıdan tekrar indirebilirsiniz.': 'Each order request is also downloaded as a file for the sales team. You can download it again below.',
    // cari
    'Faturalar sipariş sevk edildiğinde, ödemeler satış ekibi tahsilatı işlediğinde görünür. Ödeme vadeniz:': 'Invoices appear when orders ship; payments appear when the sales team records them. Your payment term:',
    'Güncel bakiye': 'Current balance', 'Vadesi geçmiş': 'Overdue', '30 gün içinde vadesi dolacak': 'Due within 30 days', 'Toplam ödeme': 'Total paid', 'Ödenmemiş faturalar': 'Unpaid invoices', 'Fatura': 'Invoice', 'Tarih': 'Date', 'Vade': 'Due date',
    'Tutar': 'Amount', 'Kalan': 'Outstanding', 'Hesap hareketleri': 'Account activity', 'Belge': 'Document', 'Açıklama': 'Description', 'Borç': 'Debit', 'Alacak': 'Credit', 'Bakiye': 'Balance', 'Henüz hesap hareketi yok.': 'No account activity yet.',
    "Tutarlar USD'dir. Hesap ekstresi için satış temsilcinizle iletişime geçebilirsiniz.": 'Amounts are in USD. Contact your sales representative for a statement.',
    // alt bilgi
    'EXIT Garden, BG Group çatısı altında otel, kafe ve konutlar için dış mekân mobilyası üretir.': 'EXIT Garden, part of BG Group, manufactures outdoor furniture for hotels, cafés and residences.',
    'Koleksiyon': 'Collection', 'Oturma grupları': 'Lounge sets', 'Sandalye ve bar sandalyeleri': 'Chairs and bar chairs', 'Masa ve sehpalar': 'Tables and side tables', 'Bayi': 'Dealer', 'KVKK aydınlatma metni': 'Privacy notice (KVKK)',
    'Gizlilik politikası': 'Privacy policy', '© 2026 BG Group · EXIT Innovative Solutions. Tüm hakları saklıdır.': '© 2026 BG Group · EXIT Innovative Solutions. All rights reserved.', 'Bayi Portalı v2.0': 'Dealer Portal v2.0',
    'Dil': 'Language'
  });
  const EKSIK = { 'seçenek': 'option', 'iskelet rengi': 'frame colour', 'file rengi': 'mesh colour', 'kumaş': 'fabric', 'fitil rengi': 'piping colour', 'iskelet': 'frame', 'file': 'mesh', 'fitil': 'piping' };
  const liste = s => s.split(', ').map(x => EKSIK[x] || x).join(', ');
  const renk = s => s.replace(/^(\S+)(?=\s*(\(|·|$))/, m => RENK[m] || m);
  const tarihUzun = s => s.replace(/(\d{1,2}) (\S+) (\d{4})(?: (\S+))?/, (m, d, a, y, g) => AY[a] ? (g && GUN[g] ? GUN[g] + ', ' : '') + d + ' ' + AY[a] + ' ' + y : m);
  const DESEN = [
    [/^(\d+) ürün$/, (m, n) => n + (n === '1' ? ' product' : ' products')],
    [/^(\d+) seçenek$/, (m, n) => n + (n === '1' ? ' option' : ' options')],
    [/^(\d+) (gün)$/, (m, n) => n + ' days'], [/^~(\d+) gün$/, (m, n) => '~' + n + ' days'], [/^\(~(\d+) gün\)$/, (m, n) => '(~' + n + ' days)'],
    [/^(\d+) gün gecikti$/, (m, n) => n + ' days overdue'], [/^(\d+) gün kaldı$/, (m, n) => n + ' days left'],
    [/^(\d{1,2}) (Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık) (\d{4})( \S+)?$/, m => tarihUzun(m)],
    [/^(.+) · (\d+) adet · (\d+) kalem$/, (m, t, a, k) => `${t} · ${a} pcs · ${k} ${k === '1' ? 'line' : 'lines'}`],
    [/^Sepet \((\d+)\)$/, (m, n) => 'Cart (' + n + ')'],
    [/^Sipariş talebiniz alındı: (.+)$/, (m, n) => 'Order request received: ' + n],
    [/^Eksik seçim: (.+)$/, (m, l) => 'Missing selection: ' + liste(l)], [/^Eksik: (.+)$/, (m, l) => 'Missing: ' + liste(l)],
    [/^Eksik veya hatalı renk: (.+)$/, (m, l) => 'Missing or invalid colour: ' + liste(l)], [/^Seçenek bulunamadı: (.+)$/, (m, l) => 'Option not found: ' + l],
    [/^(.+) sepete eklendi\.$/, (m, a) => /^\d+ kalem$/.test(a) ? a.replace(' kalem', ' items') + ' added to cart.' : a + ' added to cart.'],
    [/^(\d+) kalem sepete eklendi; fiyatlar güncel listeye göre yenilendi\.$/, (m, n) => n + ' items added to cart; prices updated to the current list.'],
    [/^(.+) favorilere eklendi\.$/, (m, a) => a + ' added to favourites.'], [/^(.+) favorilerden çıkarıldı\.$/, (m, a) => a + ' removed from favourites.'],
    [/^(\d+) kalem sepete eklendi\. Şu kalemler eklenemedi:$/, (m, n) => n + ' items added to cart. These items could not be added:'],
    [/^(.+) \(artık katalogda yok\)$/, (m, a) => a + ' (no longer in the catalogue)'], [/^(.+) \(seçenek kaldırılmış\)$/, (m, a) => a + ' (option discontinued)'],
    [/^(İskelet|File|Kumaş|Fitil|Not|Adres\/not): (.*)$/, (m, e, v) => ({ 'İskelet': 'Frame', 'File': 'Mesh', 'Kumaş': 'Fabric', 'Fitil': 'Piping', 'Not': 'Note', 'Adres/not': 'Address/note' }[e]) + ': ' + (e === 'İskelet' || e === 'File' ? renk(v) : v)],
    [/^(Antrasit|Beyaz|Krem|Cappuccino|Granit|Seramik|Siyah|Krom) · (.+)$/, (m, r, k) => RENK[r] + ' · ' + k],
    [/^~(\d{2}\.\d{2}\.\d{4}) · ön tahmin$/, (m, t) => '~' + t + ' · preliminary estimate'],
    [/^· tahmini teslim (.+)$/, (m, t) => '· estimated delivery ' + t], [/^Tahmini teslim:$/, () => 'Estimated delivery:'],
    [/^%(\d+) indirim$/, (m, n) => n + '% off'], [/^%(\d+) kampanya$/, (m, n) => n + '% promotion'],
    [/^(.*?)(\d{2}\.\d{2}\.\d{4})'?(?:e|a|ye|ya) kadar$/, (m, o, t) => (o ? cevirParca(o) : '') + 'until ' + t], [/^(.*?)(\d{2}\.\d{2}\.\d{4}) tarihine kadar geçerli$/, (m, o, t) => (o ? cevirParca(o) : '') + 'valid until ' + t]
  ];
  const PARCA = [[/tüm ürünlerde/g, 'on all products'], [/başlayan/g, 'from']];
  const cevirParca = s => PARCA.reduce((a, [r, t]) => a.replace(r, t), s);

  // ürün verisinden: seçenekler, açıklamalar, teknik bilgiler
  const SEC = [['Aksesuar (kol)', 'Accessory (arm)'], ['Aile paketi', 'Family package'], ['Takım 3+1+1+sehpa', 'Set 3+1+1+coffee table'], ['Takım 2+1+1+sehpa', 'Set 2+1+1+coffee table'], ['3+1+1+sehpa', '3+1+1+coffee table'], ['2+1+1+sehpa', '2+1+1+coffee table'],
    ['Üçlü koltuk', '3-seater sofa'], ['İkili koltuk', '2-seater sofa'], ['Tekli koltuk', 'Armchair'], ['Orta sehpa', 'Coffee table'], ['Yan sehpa', 'Side table'], ['Şezlong sehpası', 'Lounger side table'], ['İkili şezlong', 'Double sun lounger'],
    ['Şezlong', 'Sun lounger'], ['Köşe modülü', 'Corner module'], ['Bar masa', 'Bar table'], ['Bar sandalye', 'Bar chair'], ['Dikdörtgen masa', 'Rectangular table'], ['Kare masa', 'Square table'], ['Yuvarlak masa', 'Round table'],
    ['Pedli başlıklı', 'Cushioned with headrest'], ['Kollu pedli', 'Arms, cushioned'], ['Kollu fileli', 'Arms, mesh'], ['Örgülü kol', 'Woven arm'], ['Örgülü', 'Woven'], ['Kollu', 'With arms'], ['Kolsuz', 'Armless'], ['kolsuz', 'armless'],
    ['Pedli', 'Cushioned'], ['pedli', 'cushioned'], ['Fileli', 'Mesh'], ['fileli', 'mesh'], ['Üçlü', '3-seater'], ['İkili', '2-seater'], ['Tekli', 'Single'], ['sinterize', 'sintered'], ['Minder', 'Cushion'], ['İroko', 'Iroko'],
    ['Sandalye', 'Chair'], ['sandalye', 'chair'], ['Sehpa', 'Table'], ['sehpa', 'table'], ['masa', 'table'], ['Bank', 'Bench']];
  const kelime = (s, L) => L.reduce((a, [t, e]) => a.replace(new RegExp('(?<![\\p{L}])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'gu'), e), s);
  const TEK = [['Yere sağlam basan, kuvvetli bir iskelete sahiptir. Minderli veya fileli alternatifleri bulunmaktadır.', 'Stands firmly on the ground with a strong frame. Available with cushions or mesh.'],
    ['Epoksi polyester statik toz boya, ince textüre', 'epoxy polyester electrostatic powder coating, fine texture'], ['Epoksi polyester statik toz boya, ince dokulu', 'epoxy polyester electrostatic powder coating, fine texture'],
    ['Dış mekan için %100 polyester minderler', '100% polyester cushions for outdoor use'], ['%100 Polyester, dış mekan oturum minderleri', '100% polyester, outdoor seat cushions'], ['%100 Polyester, dış mekan örgü ipi ve oturma minderleri', '100% polyester, outdoor weaving rope and seat cushions'],
    ['%100 Polyester, dış mekan örgü ve minderler', '100% polyester, outdoor weave and cushions'], ['Plastik kaydırmaz tapalı', 'plastic non-slip caps'], ['Plastik, kaymaz, tapalı', 'plastic non-slip caps'], ['Alev almaz file', 'flame-retardant mesh'], ['çift kat', 'double-layer'],
    ['Üst üste maksimum', 'Stackable, max.'], ['Üst üste maksümum', 'Stackable, max.'], ['paket ebatları', 'package size'], ['Brüt ağırlık', 'Gross weight'], ['Tekli paket', 'Single pack'], ['Üçlü Paket', '3-seater pack'],
    ['OTURMA YÜKSEKLİĞİ', 'SEAT HEIGHT'], ['OTURUM YÜKSEKLİĞİ', 'SEAT HEIGHT'], ['OTURMA DERİNLİĞİ', 'SEAT DEPTH'], ['OTURUM DERİNLİĞİ', 'SEAT DEPTH'], ['SIRT YÜKSEKLİĞİ', 'BACK HEIGHT'], ['OTURMA GENİŞLİĞİ', 'SEAT WIDTH'], ['OTURUM GENİŞLİĞİ', 'SEAT WIDTH'],
    ['TOPLAM YÜKSEKLİK', 'TOTAL HEIGHT'], ['TOPLAM TÜKSEKLİK', 'TOTAL HEIGHT'], ['L/BOY', 'L/LENGTH'], ['H/YÜKSEKLİK', 'H/HEIGHT'], ['W/EN', 'W/WIDTH'], ['Genişlik', 'Width'], ['Derinlik', 'Depth'], ['Yükseklik', 'Height'],
    ['İskelet', 'Frame'], ['Alüminyum', 'aluminium'], ['alüminyum', 'aluminium'], ['Boya', 'Paint'], ['Tekstil', 'Textile'], ['Ağırlık', 'Weight'], ['İstifleme', 'Stacking'], ['Yok', 'None'], ['Kol üstü', 'Armrest'], ['Ayaklar', 'Feet'],
    ['Textilen', 'Textilene'], ['Tectilen', 'Textilene'], ['File', 'Mesh'], ['Paketleme', 'Packaging'], ['adet', 'pcs'], ['Sehpa', 'Table'],
    ['TEKLİ', 'SINGLE'], ['İKİLİ', '2-SEATER'], ['ÜÇLÜ', '3-SEATER'], ['SEHPA', 'TABLE'], ['SANDALYE', 'CHAIR'], ['ŞEZLONG', 'LOUNGER'], ['MASA', 'TABLE'], ['KOLLU', 'WITH ARMS'], ['KOLSUZ', 'ARMLESS'], ['MİNDERLİ', 'CUSHIONED'], ['FİLELİ', 'MESH'], ['BAR', 'BAR']];
  const tekCevir = s => kelime(s.replace(/(\d+)'(?:li|lı|lü|lu) paket/g, 'pack of $1').replace(/%\s?(\d+)/g, '$1%'), TEK);
  const SECK = [['takım', 'set'], ['üçlü koltuk', '3-seater sofa'], ['ikili koltuk', '2-seater sofa'], ['tekli koltuk', 'armchair'], ['orta sehpa', 'coffee table'], ['yan sehpa', 'side table'], ['köşe modülü', 'corner module'], ['aksesuar (kol)', 'accessory (arm)'], ['şezlong sehpası', 'lounger side table'], ['şezlong', 'sun lounger'], ['kare masa', 'square table'], ['dikdörtgen masa', 'rectangular table'], ['yuvarlak masa', 'round table'], ['bar masa', 'bar table'], ['bar sandalye', 'bar chair'], ['sandalye', 'chair'], ['bank', 'bench']];
  const ACK = [[/^(.+), oturma grubu, sandalye ve yemek masasını bir arada sunan avantajlı settir\.$/, '$1 is a value set combining a lounge set, chairs and a dining table.'],
    [/^(.+), bahçe, teras ve otel lobileri için tasarlanmış dış mekân oturma grubudur\.$/, '$1 is an outdoor lounge set designed for gardens, terraces and hotel lobbies.'],
    [/^(.+), yemek ve kafe alanları için ergonomik bir dış mekân sandalyesidir\.$/, '$1 is an ergonomic outdoor chair for dining and café areas.'],
    [/^(.+), bar ve yüksek masalar için tasarlanmış dış mekân bar sandalyesidir\.$/, '$1 is an outdoor bar chair designed for bars and high tables.'],
    [/^(.+), yemek ve toplantı alanları için sağlam gövdeli bir dış mekân masasıdır\.$/, '$1 is a sturdy outdoor table for dining and meeting areas.'],
    [/^(.+), oturma grupları ve şezlonglarla birlikte kullanılan dış mekân sehpasıdır\.$/, '$1 is an outdoor side table used with lounge sets and sun loungers.'],
    [/^(.+), havuz başı ve plaj alanları için konforlu dış mekân şezlongudur\.$/, '$1 is a comfortable outdoor sun lounger for poolside and beach areas.'],
    [/^(.+), ayakta servis ve bar alanları için yüksek dış mekân masasıdır\.$/, '$1 is a high outdoor table for standing service and bar areas.'],
    [/^(.+), bahçe ve geçiş alanları için dış mekân bankıdır\.$/, '$1 is an outdoor bench for gardens and walkways.'],
    [/^(\d+) farklı seçenekte sunulur: (.+)\.$/, (m, n, l) => `Available in ${n} options: ${kelime(kelime(l, SECK), SEC)}.`],
    [/^Ölçüler: (.+) \(cm\)\.$/, (m, l) => `Dimensions: ${kelime(l, SEC).replace(/Ø/g, 'Ø')} (cm).`], [/^Tabla seçenekleri: (.+)\.$/, (m, l) => `Top options: ${l.replace('Sinterize', 'Sintered')}.`],
    [/^Fileli veya pedli \(minderli\) olarak sipariş edilebilir\.$/, 'Can be ordered with mesh or with cushions.'],
    [/^Minderleri BG kumaş kartelasından istenen renkte, fitil rengi seçilerek hazırlanır\.$/, 'Cushions are made in any colour from the BG fabric card, with a choice of piping colour.'],
    [/^Oturum ve sırt kısmı dış mekân filesiyle kaplanır\.$/, 'Seat and back are covered with outdoor mesh.'],
    [/^İskelet; Granit, Seramik ve RAL renk seçenekleriyle boyanır\.$/, 'The frame is powder-coated in Granite, Ceramic and RAL colour options.']];
  const ackCevir = s => s.split(/(?<=\.)\s+/).map(c => { for (const [r, t] of ACK) if (r.test(c)) return c.replace(r, t); return c; }).join(' ');
  try {
    VERI.urunler.forEach(u => {
      u.secenek.forEach(s => { if (s.ad && !SOZ[s.ad]) SOZ[s.ad] = kelime(s.ad, SEC); if (s.sinif && !SOZ[s.sinif]) SOZ[s.sinif] = kelime(s.sinif, SEC); });
      if (u.aciklama) SOZ[u.aciklama] = ackCevir(u.aciklama);
      const t = u.teknik; if (t) { (t.malzeme || []).forEach(m => SOZ[m] = tekCevir(m)); (t.tablolar || []).forEach(tb => { tb.basliklar.forEach(h => h && (SOZ[h] = tekCevir(h))); tb.satirlar.forEach(r => r.forEach(c => { if (/[A-ZÇĞİÖŞÜ]{3}/.test(c)) SOZ[c] = tekCevir(c); })); }); }
    });
  } catch (e) {}

  function cevir(s) {
    const t = s.trim(); if (!t || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(t)) return null;
    let r = SOZ[t];
    if (r == null) for (const [re, f] of DESEN) if (re.test(t)) { r = t.replace(re, f); break; }
    if (r == null) { const p = cevirParca(t); if (p !== t) r = p; }
    if (r == null || r === t) return null;
    return s.replace(t, () => r);
  }
  let DIL = 'tr'; try { DIL = localStorage.getItem('exb-dil') === 'en' ? 'en' : 'tr'; } catch (e) {}
  const ORJ = new WeakMap(), ATR = ['placeholder', 'title', 'aria-label'];
  function dugum(n) {
    const kayit = ORJ.get(n);
    if (kayit && n.nodeValue === kayit.e) return;            // zaten çevrildi
    const o = n.nodeValue, e = cevir(o);
    if (e == null) { if (kayit) ORJ.delete(n); return; }
    const pa = n.parentNode; if (pa && pa.nodeName === 'OPTION' && !pa.hasAttribute('value')) pa.setAttribute('value', o.trim());
    ORJ.set(n, { o, e }); n.nodeValue = e;
  }
  function oge(el) {
    let k = ORJ.get(el); if (!k) { k = {}; ORJ.set(el, k); }
    ATR.forEach(a => { const v = el.getAttribute(a); if (v == null) return; if (k[a] && v === k[a].e) return; const e = cevir(v); if (e != null) { k[a] = { o: v, e }; el.setAttribute(a, e); } else delete k[a]; });
  }
  function agac(kok) {
    if (!kok) return; if (kok.nodeType === 3) return dugum(kok);
    if (kok.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(kok.nodeName)) return;
    const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT, { acceptNode: n => /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) ? 2 : 1 }); let n; while ((n = w.nextNode())) dugum(n);
    if (kok.hasAttribute && ATR.some(a => kok.hasAttribute(a))) oge(kok);
    kok.querySelectorAll('[placeholder],[title],[aria-label]').forEach(oge);
  }
  function geriAl(kok) {
    const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const k = ORJ.get(n); if (k && n.nodeValue === k.e) n.nodeValue = k.o; ORJ.delete(n); }
    kok.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => { const k = ORJ.get(el); if (!k) return; ATR.forEach(a => { if (k[a] && el.getAttribute(a) === k[a].e) el.setAttribute(a, k[a].o); }); ORJ.delete(el); });
  }
  const BASLIK = document.title;
  const gozlem = new MutationObserver(L => {
    if (DIL !== 'en') return;
    L.forEach(m => { if (m.type === 'characterData') dugum(m.target); else if (m.type === 'attributes') oge(m.target); else m.addedNodes.forEach(agac); });
  });
  gozlem.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATR });
  const KURE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>';
  function dugmeCiz() { document.querySelectorAll('.dil-btn').forEach(b => { b.innerHTML = KURE + '<span>' + (DIL === 'en' ? 'EN' : 'TR') + '</span>'; b.title = DIL === 'en' ? 'Türkçe’ye geç' : 'Switch to English'; b.setAttribute('aria-label', b.title); }); }
  function uygula() {
    document.documentElement.lang = DIL; document.title = DIL === 'en' ? 'EXIT Garden · Dealer Orders' : BASLIK;
    if (DIL === 'en') agac(document.body); else geriAl(document.body);
    dugmeCiz();
  }
  window.dilDegistir = d => { DIL = d || (DIL === 'en' ? 'tr' : 'en'); try { localStorage.setItem('exb-dil', DIL); } catch (e) {} gozlem.takeRecords(); uygula(); gozlem.takeRecords(); };
  window.cevirEN = s => DIL === 'en' ? (cevir(s) ?? s) : s;
  window.dilEkle = (o, d) => { Object.assign(SOZ, o || {}); if (d) DESEN.unshift(...d); };
  window.dilAktif = () => DIL;
  const dugme = cls => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dil-btn ' + cls; b.onclick = () => window.dilDegistir(); return b; };
  const g = document.getElementById('giris'); if (g && !g.querySelector('.dil-btn')) g.appendChild(dugme('g-dil'));
  const tb = document.querySelector('header .tema-btn'); if (tb && !document.querySelector('header .dil-btn')) tb.insertAdjacentElement('beforebegin', dugme('h-btn'));
  dugmeCiz(); if (DIL === 'en') uygula();
  // yazdırılabilir katalog da seçili dilde açılsın
  const _katalogIndir = katalogIndir;
  katalogIndir = function () {
    const ac = window.open; let w = null; window.open = function () { w = ac.apply(window, arguments); return w; };
    try { _katalogIndir(); } finally { window.open = ac; }
    if (w && DIL === 'en') try { agac(w.document.body); w.document.title = 'EXIT Garden Catalogue ' + new Date().getFullYear(); } catch (e) {}
  };
})();
