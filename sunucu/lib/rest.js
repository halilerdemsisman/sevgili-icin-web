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
const coz = (s, v) => { try { return s == null ? v : JSON.parse(s); } catch (e) { return v; } };
const metin = (v, n = 200) => String(v == null ? '' : v).trim().slice(0, n);

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
      const birim = tf != null ? tf : b ? b.fiyat : null;
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
        adres: metin(b.adres, 1000), durum: 'yeni', kaynak: 'api' };
      const s = uygula(ot, [['exb-siparisler', JSON.stringify([o])]], ip);
      if (s.reddedilen.length) return js(r, { hata: s.reddedilen.map(x => x[1]).join('; ') }, 400);
      const kayit = depo.kayitlar('exb-siparisler', { no: o.no, sinir: 1 }).kayitlar[0];
      return js(r, kayit, 201, { Location: '/api/v1/siparisler/' + o.no });
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
