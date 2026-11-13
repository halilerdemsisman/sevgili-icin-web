// REST API v1 (Faz 1b-2): Faz 2'deki bayi web sitesi ve Faz 3'teki satış masaüstü uygulaması için.
// Eşitleme ucuyla (api/veri) aynı veriyi ve aynı kuralları kullanır; REST ile yapılan değişiklik
// eski ekranlara da anında yansır (anlık bildirim). Belge: docs/API.md
//
//   GET  /api/v1/ben                    oturumdaki kullanıcı
//   GET  /api/v1/katalog                ürünler ve bu bayiye geçerli fiyatlar (kampanya dahil)
//   GET  /api/v1/siparisler             siparişler (bayi: kendisi; temsilci: atandığı bayiler; yönetici: tümü)
//                                       ?durum=yeni|onay|uretim|sevk|iptal  ?bayi=kul (satış)  ?sayfa=1  ?adet=50
//   GET  /api/v1/siparisler/:no         tek sipariş
//   POST /api/v1/siparisler             yeni sipariş (yalnız bayi): fiyatları sunucu belirler
//   GET  /api/v1/cari                   cari özet ve son hareketler (bayi: kendisi; satış: ?bayi=kul)
// Faz 2b: bayi web sitesinin yazma uçları (yalnız bayi). Numara, sahip ve ilk durum sunucuda belirlenir;
// kayıt eşitleme ucundaki kurallardan (izinli alanlar, dosya çıkarma, fiyat denetimi) geçer.
//   GET   /api/v1/{odemeler|iadeler|numuneler|teklifler}       kendi kayıtları (satış: kapsamındakiler)
//   POST  /api/v1/{odemeler|iadeler|numuneler|teklifler}       yeni ödeme bildirimi / iade / numune / özel teklif talebi
//   PATCH /api/v1/siparisler/:no        bayinin değiştirebildiği alanlar (yeni siparişte kalem/iptal; sonra talep, proje)
//   PATCH /api/v1/teklifler/:no         onaylı teklifte "sepette"
const coz = (s, v) => { try { return s == null ? v : JSON.parse(s); } catch (e) { return v; } };
const metin = (v, n = 200) => String(v == null ? '' : v).trim().slice(0, n);
const sayi = (v, alt, ust) => { const n = +v; return isFinite(n) && n >= alt && n <= ust ? n : null; };
const tarihMi = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const nesneMi = x => x && typeof x === 'object' && !Array.isArray(x);
const urunSecimi = x => nesneMi(x) ? { id: +x.id || null, ad: metin(x.ad, 120), kategori: metin(x.kategori, 60), secenek: metin(x.secenek, 100), iskelet: metin(x.iskelet, 100),
  ...(x.file != null ? { file: metin(x.file, 100) } : {}), ...(x.kumas != null ? { kumas: metin(x.kumas, 100) } : {}) } : null;

// Kayıt türleri: anahtar, kimlik alanı, izinli ön ekler; yeni kaydın gövdesini doğrulayıp oluşturan fonksiyon.
// Hata metinleri bayiye gösterilir.
const TURLER = {
  odemeler: { k: 'exb-odeme', a: 'no', on: ['OB', 'OL'], yeni(b) {
    const tutar = sayi(b.tutar, 0.01, 1e9); if (tutar == null) throw new Error('Tutarı yazın.');
    return { tutar, tarih: tarihMi(b.tarih) ? b.tarih : new Date().toISOString().slice(0, 10), yontem: metin(b.yontem, 60) || 'Havale / EFT', ref: metin(b.ref, 100), not: metin(b.not, 500),
      dosya: typeof b.dosya === 'string' ? b.dosya : null, siparis: metin(b.siparis, 40), ...(b.online ? { online: true } : {}) };
  } },
  iadeler: { k: 'exb-iade', a: 'id', on: ['IAD'], yeni(b, ot, bk, depo) {
    const aciklama = metin(b.aciklama, 2000); if (!aciklama) throw new Error('Lütfen açıklama yazın.');
    const sip = metin(b.sip, 40), o = sip && depo.kayitlar('exb-siparisler', { no: sip, kul: ot.kul, sinir: 1 }).kayitlar[0];
    if (!o) throw new Error('Sipariş bulunamadı.');
    const foto = (Array.isArray(b.foto) ? b.foto : []).filter(x => typeof x === 'string').slice(0, 4);
    return { id: 'ia' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), firma: bk.firma || ot.kul, sip, urun: metin(b.urun, 200) || 'Tüm sipariş', adet: sayi(b.adet, 1, 100000) || 1,
      tur: metin(b.tur, 60) || 'Diğer şikâyet', aciklama, foto, gecmis: [{ zaman: Date.now(), durum: 'yeni', kim: bk.firma || ot.kul }] };
  } },
  numuneler: { k: 'exb-numune', a: 'no', on: ['NMN'], yeni(b, ot, bk) {
    const tur = (Array.isArray(b.tur) ? b.tur : []).map(x => metin(x, 60)).filter(Boolean).slice(0, 10); if (!tur.length) throw new Error('En az bir tür seçin.');
    const adres = metin(b.adres, 1000); if (!adres) throw new Error('Gönderim adresini yazın.');
    return { tel: bk.tel || '', tur, urun: metin(b.urun, 120), adet: sayi(b.adet, 1, 1000) || 1, kod: metin(b.kod, 100), adres, not: metin(b.not, 500) };
  } },
  teklifler: { k: 'exb-teklif', a: 'no', on: ['OT'], yeni(b) {
    const sandalye = urunSecimi(b.sandalye); if (!sandalye || !sandalye.id) throw new Error('Sandalye ürününü seçin.');
    const masa = urunSecimi(b.masa), oran = masa ? sayi(Math.round(b.oran), 1, 100) : 1, takim = sayi(Math.round(b.takim), 1, 100000);
    if (oran == null || takim == null) throw new Error('Oran ve takım adedini girin.');
    return { oran, takim, hedef: sayi(b.hedef, 0, 1e9), termin: tarihMi(b.termin) ? b.termin : '', not: metin(b.not, 1000), masa: masa && masa.id ? masa : null, sandalye };
  } },
};
// PATCH ile bayinin istediği alanlar (sunucu kuralları ayrıca kaydın durumuna göre süzer)
const DEGISEN = { siparisler: ['kalemler', 'adres', 'durum', 'revizyon', 'rev', 'revZaman', 'gecmis', 'bayiIptal', 'proje', 'tahminiTeslim', 'talep'], teklifler: ['sepette'] };

function restKur({ depo, kurallar, fiyatlar, limitler, js, govde, uygula, islem, kullanicilar, oturum }) {
  // satış için görülebilecek bayiler (temsilci kapsamı); bayi için kendisi
  const kapsam = ot => ot.tur === 'bayi' ? ot.kul : kurallar.kapsam({ ...ot });
  const gorebilir = (ot, kul) => { const K = kapsam(ot); return K == null || (K instanceof Set ? K.has(kul) : K === kul); };

  function katalog(ot) {
    if (!fiyatlar) return [];
    const gizli = ot.tur === 'bayi' ? fiyatlar.gizli() : new Set(), kul = ot.tur === 'bayi' ? ot.kul : '';
    return fiyatlar.urunler.filter(u => !gizli.has(u.ad)).map(u => {
      const secenekler = u.secenek.map(s => { const b = fiyatlar.bilgi(u, s.ad, kul); return { ad: s.ad, sinif: s.sinif || '', liste: b.liste, fiyat: b.fiyat, kampanya: b.kampanya }; });
      return { id: u.id, ad: u.ad, kategori: u.kategori, secenekler };
    });
  }

  // POST /api/v1/siparisler gövdesi → portalın sepet kalemiyle aynı biçimde sipariş kalemleri
  function kalemler(G, ot) {
    if (!Array.isArray(G) || !G.length) throw new Error('En az bir kalem gerekli.');
    if (G.length > 200) throw new Error('En fazla 200 kalem.');
    return G.map((x, i) => {
      const u = fiyatlar && fiyatlar.id.get(+x.id);
      if (!u || (ot.tur === 'bayi' && fiyatlar.gizli().has(u.ad))) throw new Error(`${i + 1}. kalem: ürün bulunamadı (${x.id}).`);
      const adet = Math.round(+x.adet);
      if (!(adet >= 1 && adet <= 100000)) throw new Error(`${i + 1}. kalem: adet 1–100000 olmalı.`);
      let b = null;
      if (u.secenek.length) { b = fiyatlar.bilgi(u, metin(x.secenek), ot.kul); if (!b) throw new Error(`${i + 1}. kalem: "${metin(x.secenek)}" seçeneği yok.`); }
      // onaylı özel teklif fiyatı (yalnız teklifin sahibine)
      const teklif = metin(x.teklif, 40), tf = teklif ? fiyatlar.teklifFiyati(teklif, u.id, ot.kul) : null;
      if (teklif && tf == null) throw new Error(`${i + 1}. kalem: ${teklif} onaylı teklifi bu ürün için geçerli değil.`);
      let birim = tf != null ? tf : b ? b.fiyat : null;
      // istemcinin gönderdiği fiyat düşükse kayda o yazılır: eşitleme ucundaki fiyat denetimi onu katalog
      // fiyatına yükseltir ve siparişi işaretler (satış panelinde "Fiyat düzeltildi" uyarısı). Yüksek veya
      // gönderilmemiş fiyatta sunucunun fiyatı geçerlidir.
      if (birim != null && x.birim != null && x.birim !== '' && isFinite(+x.birim) && +x.birim < birim - 0.01) birim = +x.birim;
      return {
        id: u.id, ad: u.ad, kategori: u.kategori, secenek: b ? b.secenek.ad : '', sinif: b ? b.secenek.sinif || '' : '',
        birim, liste: b ? b.liste : null, kampanya: tf != null ? 'Özel teklif ' + teklif : b && b.kampanya ? `${b.kampanya.ad} (%${b.kampanya.oran})` : '', adet,
        iskelet: metin(x.iskelet, 100), file: metin(x.file, 100), kumas: metin(x.kumas, 100), fitil: metin(x.fitil, 100), not: metin(x.not, 500),
        ...(teklif ? { teklif } : {}),
      };
    });
  }

  function cari(kul) {
    const C = coz(depo.al('exs-cari'), {}) || {}, c = C[kul] || { hareket: [] }, H = Array.isArray(c.hareket) ? c.hareket : [];
    const r = limitler.risk(kul);
    return { bayi: kul, vade: c.vade || null, limit: r.limit || null, bakiye: Math.round(r.bakiye * 100) / 100, acikSiparis: Math.round(r.acik * 100) / 100,
      risk: Math.round(r.risk * 100) / 100, kullanilabilir: r.limit ? Math.round((r.limit - r.risk) * 100) / 100 : null,
      hareketler: H.slice().sort((a, b) => (b.tarih || 0) - (a.tarih || 0)).slice(0, 50) };
  }

  return async function rest(q, r, u, p, ip, tur) {
    const ot = oturum(q, tur);
    if (!ot) return js(r, { hata: 'Oturum yok veya süresi doldu.' }, 401);
    const yol = p.slice('/api/v1'.length), sp = u.searchParams;

    if (yol === '/ben' && q.method === 'GET') {
      const k = kullanicilar(ot.tur)[ot.kul] || {};
      const { sifre, sifreDegistir, ...acik } = k;
      return js(r, { tur: ot.tur, rol: ot.rol, ...acik });
    }

    if (yol === '/katalog' && q.method === 'GET') return js(r, { urunler: katalog(ot), para: 'USD' });

    if (yol === '/siparisler' && q.method === 'GET') {
      let K = kapsam(ot);
      const bayi = sp.get('bayi');
      if (bayi && ot.tur === 'satis') { if (!gorebilir(ot, bayi)) return js(r, { hata: 'Bu bayiyi göremezsiniz.' }, 403); K = bayi; }
      const adet = Math.min(200, Math.max(1, +sp.get('adet') || 50)), sayfa = Math.max(1, +sp.get('sayfa') || 1);
      const { toplam, kayitlar } = depo.kayitlar('exb-siparisler', { kul: K, durum: sp.get('durum') || undefined, sinir: adet, atla: (sayfa - 1) * adet });
      return js(r, { toplam, sayfa, adet, siparisler: kayitlar });
    }

    const m = yol.match(/^\/siparisler\/([A-Z]+-\d{4}-\d+)$/);
    if (m && q.method === 'GET') {
      const o = depo.kayitlar('exb-siparisler', { no: m[1], sinir: 1 }).kayitlar[0];
      if (!o || !gorebilir(ot, o.kul)) return js(r, { hata: 'Sipariş bulunamadı.' }, 404);
      return js(r, o);
    }

    if (yol === '/siparisler' && q.method === 'POST') {
      if (ot.tur !== 'bayi') return js(r, { hata: 'Sipariş bayi hesabıyla verilir.' }, 403);
      let b; try { b = await govde(q, 1e6); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
      let K; try { K = kalemler(b.kalemler, ot); } catch (e) { return js(r, { hata: e.message }, 400); }
      const bk = kullanicilar('bayi')[ot.kul] || {};
      const o = { no: depo.yeniNo('EXG'), kul: ot.kul, firma: bk.firma || ot.kul, ad: bk.ad || '', tarih: Date.now(), kalemler: K,
        toplam: Math.round(K.reduce((a, x) => a + (x.birim == null ? 0 : x.birim * x.adet), 0) * 100) / 100, teklif: K.some(x => x.birim == null),
        adres: metin(b.adres, 1000), durum: 'yeni', kaynak: b.kaynak === 'web' ? 'web' : 'api' };
      const s = uygula(ot, [['exb-siparisler', JSON.stringify([o])]], ip);
      if (s.reddedilen.length) return js(r, { hata: s.reddedilen.map(x => x[1]).join('; ') }, 400);
      const kayit = depo.kayitlar('exb-siparisler', { no: o.no, sinir: 1 }).kayitlar[0];
      return js(r, kayit, 201, { Location: '/api/v1/siparisler/' + o.no });
    }

    // ---- Faz 2b: ödeme bildirimi, iade, numune, özel teklif ----
    const mt = yol.match(/^\/(odemeler|iadeler|numuneler|teklifler)$/);
    if (mt && q.method === 'GET') {
      const T = TURLER[mt[1]], adet = Math.min(200, Math.max(1, +sp.get('adet') || 50)), sayfa = Math.max(1, +sp.get('sayfa') || 1);
      const { toplam, kayitlar } = depo.kayitlar(T.k, { kul: kapsam(ot), durum: sp.get('durum') || undefined, sinir: adet, atla: (sayfa - 1) * adet });
      return js(r, { toplam, sayfa, adet, kayitlar });
    }
    if (mt && q.method === 'POST') {
      if (ot.tur !== 'bayi') return js(r, { hata: 'Bu kayıt bayi hesabıyla oluşturulur.' }, 403);
      const T = TURLER[mt[1]];
      let b; try { b = await govde(q, 12e6); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
      const bk = kullanicilar('bayi')[ot.kul] || {};
      let alan; try { alan = T.yeni(b || {}, ot, bk, depo); } catch (e) { return js(r, { hata: e.message }, 400); }
      const on = T.on.includes(b.on) ? b.on : T.on[0];
      const x = { no: depo.yeniNo(on), kul: ot.kul, firma: bk.firma || ot.kul, ad: bk.ad || '', ...alan, zaman: Date.now() };
      const s = uygula(ot, [[T.k, JSON.stringify([x])]], ip);
      const kayit = depo.kayitlar(T.k, { no: x[T.a], kul: ot.kul, sinir: 1 }).kayitlar[0];
      if (!kayit) return js(r, { hata: s.reddedilen.map(y => y[1]).join('; ') || 'Kaydedilemedi.' }, 400);
      return js(r, { ...kayit, ...(s.reddedilen.length ? { uyari: s.reddedilen.map(y => y[1]) } : {}) }, 201);
    }
    const mp = yol.match(/^\/(siparisler|teklifler)\/([A-Z]+-\d{4}-\d+)$/);
    if (mp && q.method === 'PATCH') {
      if (ot.tur !== 'bayi') return js(r, { hata: 'Satış değişiklikleri satış panelinden yapılır.' }, 403);
      const k = mp[1] === 'siparisler' ? 'exb-siparisler' : 'exb-teklif';
      let b; try { b = await govde(q, 1e6); } catch (e) { return js(r, { hata: 'geçersiz istek' }, 400); }
      // kayıt gövde okunduktan sonra alınır: aynı anda gelen iki değişiklik birbirini ezmesin
      const s = depo.kayitlar(k, { no: mp[2], kul: ot.kul, sinir: 1 }).kayitlar[0];
      if (!s) return js(r, { hata: 'Kayıt bulunamadı.' }, 404);
      if (!nesneMi(b)) return js(r, { hata: 'geçersiz istek' }, 400);
      const istenen = Object.keys(b).filter(f => DEGISEN[mp[1]].includes(f));
      if (!istenen.length) return js(r, { hata: 'Değiştirilecek alan yok.' }, 400);
      const y = { ...s }; istenen.forEach(f => { y[f] = b[f]; });
      if (k === 'exb-siparisler' && 'kalemler' in b) { if (!Array.isArray(b.kalemler) || !b.kalemler.length) return js(r, { hata: 'En az bir kalem gerekli.' }, 400);
        y.toplam = b.kalemler.reduce((a, z) => a + (z && z.birim != null ? +z.birim * (+z.adet || 0) : 0), 0); y.teklif = b.kalemler.some(z => z && z.birim == null); }
      const sn = uygula(ot, [[k, JSON.stringify([y])]], ip);
      const kayit = depo.kayitlar(k, { no: mp[2], kul: ot.kul, sinir: 1 }).kayitlar[0];
      // istenen değişiklik kurallara takıldıysa (ör. sipariş bu arada onaylandı) bayiye açıkça söylenir
      const ayni = (a, c) => JSON.stringify(a ?? null) === JSON.stringify(c ?? null);
      const ozet = L => (Array.isArray(L) ? L : []).map(z => [z && z.id, z && z.secenek, z && +z.adet]);
      const red = istenen.filter(f => f === 'kalemler' ? !ayni(ozet(kayit.kalemler), ozet(b.kalemler)) : !ayni(kayit[f], b[f]));
      if (red.length) return js(r, { hata: k === 'exb-siparisler' ? 'Sipariş bu arada satış ekibince işleme alındı; değişiklik uygulanmadı. Sayfayı yenileyip yeniden deneyin.' : 'Değişiklik uygulanmadı.', alanlar: red, kayit }, 409);
      return js(r, { ...kayit, ...(sn.reddedilen.length ? { uyari: sn.reddedilen.map(z => z[1]) } : {}) });
    }

    if (yol === '/cari' && q.method === 'GET') {
      const kul = ot.tur === 'bayi' ? ot.kul : sp.get('bayi');
      if (!kul) return js(r, { hata: '?bayi= gerekli.' }, 400);
      if (!gorebilir(ot, kul)) return js(r, { hata: 'Bu bayiyi göremezsiniz.' }, 403);
      return js(r, cari(kul));
    }

    return js(r, { hata: 'bulunamadı' }, 404);
  };
}

module.exports = { restKur };
