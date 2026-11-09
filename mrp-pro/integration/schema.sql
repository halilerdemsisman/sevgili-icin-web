-- ==========================================================================
-- MRP Pro — ERP veritabanı için önerilen şema (PostgreSQL 14+)
-- --------------------------------------------------------------------------
-- Kendi ERP'nizde MRP Pro'nun ihtiyaç duyduğu tablolar (kullanıcı/rol dahil). Sütun adları
-- openapi.yaml'daki alanlarla birebir eşleşir; API katmanı satırları JSON'a
-- çevirip /mrp/snapshot ve /mrp/changes ile sunar.
-- Not: Mevcut ERP tablolarınız (stok kartı, cari, sipariş) varsa yeni tablo
-- açmak yerine bu alanları onlara eşleyen VIEW'lar tercih edilebilir.
-- ==========================================================================

-- ---------- Ana veri ----------
CREATE TABLE mrp_item (
    kod            varchar(40) PRIMARY KEY,
    ad             varchar(200) NOT NULL,
    tur            varchar(60)  NOT NULL,
    unit           varchar(10)  NOT NULL DEFAULT 'ad',
    price          numeric(18,4) NOT NULL DEFAULT 0 CHECK (price >= 0),
    currency       char(3)      NOT NULL DEFAULT 'TRY',
    procurement    varchar(10)  NOT NULL CHECK (procurement IN ('buy','make','service')),
    lead_time      integer      NOT NULL DEFAULT 7,
    safety_stock   numeric(18,4) NOT NULL DEFAULT 0,
    lot_policy     varchar(4)   NOT NULL DEFAULT 'L4L' CHECK (lot_policy IN ('L4L','FOQ','MIN')),
    lot_size       numeric(18,4) NOT NULL DEFAULT 0,
    inspect        boolean      NOT NULL DEFAULT false,   -- giriş kalite muayenesi gerekli
    updated_at     timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE mrp_product (
    kod        varchar(40) PRIMARY KEY,
    ad         varchar(200) NOT NULL,
    kategori   varchar(60)  NOT NULL,
    toplam     numeric(18,2) NOT NULL DEFAULT 0,      -- ERP kayıtlı maliyet
    fason      numeric(18,2) NOT NULL DEFAULT 0,
    hammadde   numeric(18,2) NOT NULL DEFAULT 0,
    iroko      numeric(18,2) NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tek seviyeli reçete (parent: mamul veya 'make' tipli yarı mamul)
CREATE TABLE mrp_bom_line (
    parent  varchar(40) NOT NULL,
    seq     integer     NOT NULL,
    kod     varchar(40) NOT NULL REFERENCES mrp_item(kod),
    k       numeric(18,6) NOT NULL CHECK (k > 0),
    PRIMARY KEY (parent, seq)
);

CREATE TABLE mrp_work_center (
    id          varchar(10) PRIMARY KEY,
    ad          varchar(80) NOT NULL,
    capacity    numeric(10,2) NOT NULL,                -- dk/gün
    days        smallint NOT NULL DEFAULT 5,
    efficiency  numeric(5,2) NOT NULL DEFAULT 100,
    rate        numeric(12,2) NOT NULL DEFAULT 0       -- TL/saat
);

CREATE TABLE mrp_routing_op (
    kod    varchar(40) NOT NULL,                       -- mamul veya yarı mamul
    seq    integer NOT NULL,
    wc     varchar(10) NOT NULL REFERENCES mrp_work_center(id),
    setup  numeric(10,2) NOT NULL DEFAULT 0,           -- dk
    run    numeric(10,4) NOT NULL DEFAULT 0,           -- dk/birim
    PRIMARY KEY (kod, seq)
);

CREATE TABLE mrp_supplier (
    id          varchar(20) PRIMARY KEY,
    ad          varchar(200) NOT NULL,
    yetkili     varchar(100), tel varchar(40), email varchar(120), adres text, vergi_no varchar(11),
    kategoriler text[] NOT NULL DEFAULT '{}',
    vade        integer NOT NULL DEFAULT 30,
    puan        numeric(3,1) NOT NULL DEFAULT 4,
    aktif       boolean NOT NULL DEFAULT true
);

CREATE TABLE mrp_price_list (
    supplier_id varchar(20) NOT NULL REFERENCES mrp_supplier(id),
    kod         varchar(40) NOT NULL REFERENCES mrp_item(kod),
    price       numeric(18,4) NOT NULL CHECK (price > 0),
    currency    char(3) NOT NULL,
    lead_time   integer NOT NULL,
    moq         numeric(18,4) NOT NULL DEFAULT 0,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (supplier_id, kod)
);

-- ---------- Stok (lot bazlı; stok = lotların toplamı) ----------
CREATE TABLE mrp_lot (
    id        varchar(40) PRIMARY KEY,
    lot       varchar(60) NOT NULL,
    kod       varchar(40) NOT NULL,
    loc       varchar(10) NOT NULL CHECK (loc IN ('MERKEZ','FABRIKA','FASON','KALITE')),  -- KALITE = karantina
    qty       numeric(18,4) NOT NULL CHECK (qty >= 0),
    at        timestamptz NOT NULL,                    -- FIFO sırası
    ref       varchar(40), supplier varchar(200)
);
CREATE INDEX ON mrp_lot (kod, loc, at);

CREATE TABLE mrp_movement (                            -- değişmez defter
    id        varchar(40) PRIMARY KEY,
    at        timestamptz NOT NULL,
    kod       varchar(40) NOT NULL,
    type      varchar(3)  NOT NULL CHECK (type IN ('GR','GI','FG','ADJ','TRF','RTV','SCR')),  -- RTV: iade, SCR: hurda
    qty       numeric(18,4) NOT NULL,
    balance   numeric(18,4),
    loc       varchar(40), to_loc varchar(10),
    lots      jsonb NOT NULL DEFAULT '[]',
    ref       varchar(40), note text, username varchar(60),
    value     numeric(18,2)
);
CREATE INDEX ON mrp_movement (kod, at);

-- ---------- Planlama ----------
CREATE TABLE mrp_demand (                              -- MPS / satış siparişi
    id        varchar(40) PRIMARY KEY,
    kod       varchar(40) NOT NULL REFERENCES mrp_product(kod),
    qty       numeric(18,4) NOT NULL CHECK (qty > 0),
    due_date  date NOT NULL,
    note      text
);

CREATE TABLE mrp_work_order (
    no        varchar(20) PRIMARY KEY,
    kod       varchar(40) NOT NULL,
    ad        varchar(200),
    qty       numeric(18,4) NOT NULL,
    start     date NOT NULL,
    "end"     date NOT NULL,
    status    varchar(10) NOT NULL CHECK (status IN ('planned','released','completed','cancelled')),
    source    varchar(20),
    payload   jsonb NOT NULL DEFAULT '{}'              -- history, ops (atölye operasyonları), goodQty, scrapQty
);

-- Atölye bildirimleri (raporlama için; kaynak kayıt mrp_work_order.payload->'ops').
-- ERP bu tabloyu iş emri kaydı her geldiğinde ops[].logs'tan yeniden doldurabilir.
CREATE TABLE mrp_shopfloor_log (
    wo_no     varchar(20) NOT NULL REFERENCES mrp_work_order(no) ON DELETE CASCADE,
    seq       integer NOT NULL,                         -- operasyon sırası (10, 20…)
    wc        varchar(10) NOT NULL REFERENCES mrp_work_center(id),
    n         integer NOT NULL,                         -- kayıt sırası
    type      varchar(4) NOT NULL CHECK (type IN ('run','down','qty')),
    start_at  timestamptz, end_at timestamptz,
    minutes   numeric(10,2),
    good      numeric(18,4) NOT NULL DEFAULT 0,
    scrap     numeric(18,4) NOT NULL DEFAULT 0,
    reason    varchar(60),                              -- duruş veya fire sebebi
    operator  varchar(100),
    PRIMARY KEY (wo_no, seq, n)
);
CREATE INDEX ON mrp_shopfloor_log (wc, end_at);

-- ---------- Satın alma ----------
CREATE TABLE mrp_purchase_request (
    no        varchar(20) PRIMARY KEY,
    status    varchar(10) NOT NULL CHECK (status IN ('pending','approved','rejected','ordered','closed')),
    priority  varchar(10) NOT NULL DEFAULT 'normal',
    total     numeric(18,2) NOT NULL DEFAULT 0,
    deadline  date,
    created_by varchar(60), created_at timestamptz NOT NULL DEFAULT now(),
    payload   jsonb NOT NULL                           -- lines, history, comments, poNos
);

CREATE TABLE mrp_purchase_order (
    no             varchar(20) PRIMARY KEY,
    request_no     varchar(20) REFERENCES mrp_purchase_request(no),
    supplier_id    varchar(20) NOT NULL REFERENCES mrp_supplier(id),
    delivery_date  date NOT NULL,
    payment_term   integer NOT NULL DEFAULT 30,
    status         varchar(10) NOT NULL CHECK (status IN ('open','partial','received','cancelled')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    payload        jsonb NOT NULL                      -- lines, receipts, history
);

CREATE TABLE mrp_subcontract (
    no          varchar(20) PRIMARY KEY,
    supplier_id varchar(20) NOT NULL REFERENCES mrp_supplier(id),
    expected_at date,
    status      varchar(10) NOT NULL CHECK (status IN ('open','closed')),
    payload     jsonb NOT NULL
);

-- ---------- Kalite kontrol ----------
-- Muayeneye tabi kalem mal kabulde KALITE lokasyonuna girer ve burada bir kayıt açılır.
CREATE TABLE mrp_inspection (
    no           varchar(20) PRIMARY KEY,                -- GKK-2026-0001
    status       varchar(10) NOT NULL CHECK (status IN ('pending','done')),
    po_no        varchar(20) REFERENCES mrp_purchase_order(no),
    supplier_id  varchar(20) NOT NULL REFERENCES mrp_supplier(id),
    kod          varchar(40) NOT NULL REFERENCES mrp_item(kod),
    lot          varchar(60) NOT NULL,
    qty          numeric(18,4) NOT NULL CHECK (qty > 0),
    accepted     numeric(18,4),
    rejected     numeric(18,4),
    decision     varchar(10) CHECK (decision IN ('return','scrap')),
    reason       varchar(60),
    inspected_by varchar(60),
    received_at  timestamptz NOT NULL,
    decided_at   timestamptz,
    payload      jsonb NOT NULL,                           -- waybill, checks, note, targetLoc
    CHECK (status = 'pending' OR (accepted >= 0 AND rejected >= 0 AND accepted + rejected = qty)),
    CHECK (COALESCE(rejected, 0) = 0 OR (decision IS NOT NULL AND reason IS NOT NULL))
);
CREATE INDEX ON mrp_inspection (supplier_id, decided_at);
CREATE INDEX ON mrp_inspection (status) WHERE status = 'pending';

-- ---------- Sistem ----------
CREATE TABLE mrp_settings (id varchar(10) PRIMARY KEY DEFAULT 'main', fx jsonb NOT NULL, costing jsonb NOT NULL);
CREATE TABLE mrp_notification (id varchar(40) PRIMARY KEY, payload jsonb NOT NULL, at timestamptz NOT NULL);
CREATE TABLE mrp_audit (id varchar(40) PRIMARY KEY, at timestamptz NOT NULL, username varchar(60), action varchar(120), detail text);
CREATE TABLE mrp_run (id varchar(10) PRIMARY KEY DEFAULT 'last', payload jsonb NOT NULL, run_at timestamptz NOT NULL);

-- ---------- Kullanıcılar ve bölüm rolleri ----------
-- /auth/login bu tablolardan User nesnesini (openapi.yaml → User) üretir.
-- Roller MRP Pro'nun varsayılan bölüm rolleriyle aynıdır (assets/js/auth.js → DEFAULT_ROLES).
CREATE TABLE mrp_role (
    id            varchar(30) PRIMARY KEY,                 -- 'planlama', 'satinalma' ...
    ad            varchar(80) NOT NULL,
    home          varchar(30) NOT NULL DEFAULT 'dashboard', -- açılış ekranı
    views         text[] NOT NULL DEFAULT '{}',            -- erişilebilen ekranlar
    permissions   jsonb NOT NULL DEFAULT '{}',             -- {"runMRP":true,"createPO":false,...}
    approve_limit numeric(18,2),                           -- TL; NULL = sınırsız
    CHECK (home = ANY (views))
);

CREATE TABLE mrp_user (
    username      varchar(60) PRIMARY KEY,
    ad            varchar(120) NOT NULL,
    role_id       varchar(30) NOT NULL REFERENCES mrp_role(id),
    password_hash varchar(200) NOT NULL,                   -- ör. scrypt "salt:hash"; düz parola saklanmaz
    aktif         boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mrp_session (
    token       varchar(100) PRIMARY KEY,
    username    varchar(60) NOT NULL REFERENCES mrp_user(username) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL
);
CREATE INDEX ON mrp_session (expires_at);

-- Örnek rol:
--   INSERT INTO mrp_role(id, ad, home, views, permissions, approve_limit) VALUES
--   ('satinalma', 'Satın Alma', 'requests', '{dashboard,requests,orders,suppliers,stock}',
--    '{"createRequest":true,"approveRequest":true,"createPO":true,"manageSuppliers":true}', 10000);

-- ---------- Senkronizasyon altyapısı ----------
-- Her kabul edilen değişiklik buraya yazılır; /mrp/changes?since=N bu tablodan okunur.
CREATE TABLE mrp_change_log (
    cursor      bigserial PRIMARY KEY,
    collection  varchar(30) NOT NULL,
    op          varchar(6)  NOT NULL CHECK (op IN ('upsert','delete')),
    key         varchar(100) NOT NULL,
    data        jsonb,
    client_id   varchar(80) NOT NULL,                  -- 'erp' = ERP'nin kendi işlemleri
    username    varchar(60),
    at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON mrp_change_log (cursor) INCLUDE (client_id);

-- Belge numaraları: /mrp/sequences blok ayırır (UPDATE ... RETURNING ile atomik)
CREATE TABLE mrp_sequence (
    key    varchar(20) PRIMARY KEY,                    -- 'PO-2026'
    last   integer NOT NULL DEFAULT 0
);
-- Örnek blok ayırma:
--   INSERT INTO mrp_sequence(key, last) VALUES ('PO-2026', 50)
--   ON CONFLICT (key) DO UPDATE SET last = mrp_sequence.last + 50
--   RETURNING last - 49 AS "from", last AS "to";

-- ERP'nin kendi tablolarında olan bir değişikliği MRP'ye bildirmek için
-- (ör. satış siparişi onaylandığında) change_log'a client_id='erp' ile satır eklemek yeterlidir:
--   INSERT INTO mrp_change_log(collection, op, key, data, client_id, username)
--   VALUES ('demands','upsert','SIP-1050', '{"id":"SIP-1050","kod":"BG.212.A","qty":20,"dueDate":"2026-12-01"}', 'erp', 'satis');
