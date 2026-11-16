// Ekran: ayarlar ve örnek veri.
// ---------- ayarlar
function ayarlar() {
  $('#baslik').textContent = 'Ayarlar';
  $('#icerik').innerHTML = `<div class="izgara2">
    <div class="kart"><h3>Kur</h3><div class="alt">Kur her açılışta ve 30 dakikada bir internetten otomatik güncellenir. İnternet yoksa elle girebilirsiniz.</div>
      <div style="display:flex;gap:8px;align-items:end"><div class="alan" style="flex:1"><label>1 USD = ? TL</label><input id="aTry" inputmode="decimal" value="${KUR.TRY ? KUR.TRY.toFixed(4) : ''}"></div><div class="alan" style="flex:1"><label>1 USD = ? EUR</label><input id="aEur" inputmode="decimal" value="${KUR.EUR ? KUR.EUR.toFixed(4) : ''}"></div></div>
      <button class="btn cizgi" id="aKurElle">Elle kaydet</button> <button class="btn" id="aKurOto">İnternetten güncelle</button><p class="kucuk">Kaynak: ${esc(KUR.kaynak || '—')}</p></div>
    <div class="kart"><h3>Claude API anahtarı</h3><div class="alt">“Claude ile derin analiz” için gerekir. Anahtar yalnız bu bilgisayarda saklanır; analizde sadece toplu satış özeti (müşteri iletişim bilgisi olmadan) gönderilir.</div>
      <div class="alan"><label>API anahtarı</label><input id="aKey" type="password" placeholder="sk-ant-…" value="${esc(oku('exs-ai-anahtar', ''))}"></div><button class="btn" id="aKeyK">Kaydet</button> <button class="btn cizgi" id="aKeyS">Sil</button></div>
    <div class="kart"><h3>Satış ekibi kullanıcıları</h3><div class="alt">Panele giriş yapabilecek kişiler</div>
      <table class="tablo">${Object.values(KUL).map(u => `<tr><td><b>${esc(u.kul)}</b><div class="kucuk">${esc(u.ad)}</div></td><td class="sag-hiza">${u.kul !== ben.kul ? `<button class="btn kucuk cizgi" data-sil="${esc(u.kul)}">Sil</button>` : '<span class="kucuk">siz</span>'}</td></tr>`).join('')}</table>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;margin-top:12px"><div class="alan"><label>Kullanıcı</label><input id="yKul"></div><div class="alan"><label>Ad soyad</label><input id="yAd"></div><div class="alan"><label>Şifre</label><input id="ySif" type="password"></div><div class="alan"><button class="btn" id="yEkle">Ekle</button></div></div>
      <div style="display:flex;gap:8px;align-items:end;margin-top:6px"><div class="alan" style="flex:1"><label>Kendi yeni şifreniz</label><input id="kSif" type="password"></div><div class="alan"><button class="btn cizgi" id="kSifK">Şifremi değiştir</button></div></div></div>
    <div class="kart"><h3>Veri</h3><div class="alt">Paneli denemek için 12 aya yayılmış örnek siparişler oluşturabilirsiniz; örnekler “örnek” etiketiyle görünür ve tek tuşla silinir.</div>
      <button class="btn cizgi" id="ornekOl">Örnek veri oluştur</button> <button class="btn cizgi" id="ornekSil">Örnek veriyi sil</button>
      <p class="kucuk">Gerçek siparişler: ${Object.values(SIP).filter(o => !o.ornek).length} · Örnek: ${Object.values(SIP).filter(o => o.ornek).length}</p></div></div>`;
  const sayi = v => parseFloat(String(v).replace(',', '.'));
  $('#aKurElle').onclick = () => { const t = sayi($('#aTry').value), e = sayi($('#aEur').value); if (!(t > 0)) return toast('Geçerli bir TL kuru girin.'); KUR = { TRY: t, EUR: e > 0 ? e : KUR.EUR, zaman: Date.now(), kaynak: 'Elle giriş', elle: true }; yaz('exs-kur', KUR); kurCiz(); toast('Kur kaydedildi.'); };
  $('#aKurOto').onclick = () => kurGuncelle().then(ayarlar);
  $('#aKeyK').onclick = () => { yaz('exs-ai-anahtar', $('#aKey').value.trim()); toast('Anahtar kaydedildi.'); };
  $('#aKeyS').onclick = () => { try { localStorage.removeItem('exs-ai-anahtar'); } catch (e) {} ayarlar(); toast('Anahtar silindi.'); };
  $('#yEkle').onclick = async () => { const k = $('#yKul').value.trim().toLowerCase(); if (!/^[a-z0-9._-]{3,}$/.test(k) || $('#ySif').value.length < 6) return toast('Kullanıcı adı en az 3, şifre en az 6 karakter olmalı.'); if (KUL[k]) return toast('Bu kullanıcı var.'); KUL[k] = { kul: k, ad: $('#yAd').value.trim(), sifre: await ozet($('#ySif').value) }; yaz('exs-kullanicilar', KUL); ayarlar(); toast('Kullanıcı eklendi.'); };
  $$('[data-sil]').forEach(b => b.onclick = () => { delete KUL[b.dataset.sil]; yaz('exs-kullanicilar', KUL); ayarlar(); });
  $('#kSifK').onclick = async () => { if ($('#kSif').value.length < 6) return toast('Şifre en az 6 karakter olmalı.'); KUL[ben.kul].sifre = await ozet($('#kSif').value); yaz('exs-kullanicilar', KUL); toast('Şifreniz değişti.'); $('#kSif').value = ''; };
  $('#ornekOl').onclick = () => { ornekVeri(); ayarlar(); toast('Örnek veri oluşturuldu.'); };
  $('#ornekSil').onclick = () => { Object.keys(CARI).forEach(k => { if (k.startsWith('ornek-')) delete CARI[k]; }); cariYaz(); Object.keys(CRM).forEach(k => { if (k.startsWith('ornek-')) delete CRM[k]; }); yaz('exs-crm', CRM); Object.keys(SIP).forEach(k => { if (SIP[k].ornek) delete SIP[k]; }); Object.keys(MUS).forEach(k => { if (MUS[k].ornek) delete MUS[k]; }); yaz('exs-siparisler', SIP); yaz('exs-musteriler', MUS); yeniSay(); ayarlar(); toast('Örnek veri silindi.'); };
  ayarlarRoller();
  EK.ayarlarSunucu?.();
}
function ornekVeri() {
  let t = 7; const r = () => (t = (t * 9301 + 49297) % 233280) / 233280;
  const firmalar = [['ornek-ege', 'Ege Bahçe Mobilya', 'İzmir', 8], ['ornek-akdeniz', 'Akdeniz Otel Tedarik', 'Antalya', 12], ['ornek-bosfor', 'Boğaz Peyzaj', 'İstanbul', 5], ['ornek-kapadokya', 'Kapadokya Butik', 'Nevşehir', 0], ['ornek-bodrum', 'Bodrum Marina Dekor', 'Muğla', 10], ['ornek-ankara', 'Başkent Proje', 'Ankara', 3]];
  firmalar.forEach(([k, f, s, i]) => { MUS[k] = { kul: k, firma: f, ad: 'Örnek Yetkili', sehir: s, tel: '0 (5xx) xxx xx xx', ornek: true, tarih: Date.now() }; if (i && !ISK[k]) ISK[k] = { oran: i, not: 'örnek' }; });
  const fiyatli = VERI.urunler.filter(u => u.secenek.some(s => s.fiyat)); const ISKL = ['Antrasit (RAL 7016)', 'Beyaz (RAL 9016)', 'Cappuccino (RAL 7006)', 'Siyah (RAL 9005)', 'Krem (RAL 1013)', 'Granit (Granit)'], KUM = ['BG03', 'BG06', 'BG09', 'BG07', 'BG14', 'BG16'];
  const simdi = new Date(); let sira = 1;
  for (let i = 0; i < 70; i++) {
    const ay = Math.floor(r() * 12), mev = [0.4, 0.5, 0.9, 1.4, 1.6, 1.5, 1.2, 0.9, 0.7, 0.5, 0.4, 0.4][(simdi.getMonth() - ay + 12) % 12];
    if (r() > mev) continue;
    const d = new Date(simdi.getFullYear(), simdi.getMonth() - ay, 1 + Math.floor(r() * 27)), fm = firmalar[Math.floor(Math.pow(r(), 1.6) * firmalar.length)];
    const kalemler = []; const n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) { const u = fiyatli[Math.floor(r() * fiyatli.length)], s = u.secenek.filter(x => x.fiyat)[Math.floor(r() * u.secenek.filter(x => x.fiyat).length)];
      const kum = /Oturma|Aile/.test(u.kategori) || /ped/i.test(s.ad);
      kalemler.push({ id: u.id, ad: u.ad, kategori: u.kategori, secenek: s.ad, sinif: s.sinif, birim: s.fiyat, adet: /Sandalye/.test(u.kategori) ? 6 + Math.floor(r() * 30) : 1 + Math.floor(r() * 8), iskelet: ISKL[Math.floor(Math.pow(r(), 1.8) * ISKL.length)], file: /file/i.test(s.ad) ? 'Antrasit (Terra 04)' : '', kumas: kum ? KUM[Math.floor(r() * 6)] : '', fitil: kum ? KUM[Math.floor(r() * 6)] : '', not: '' }); }
    const no = 'ORN-' + d.getFullYear() + '-' + String(sira++).padStart(4, '0');
    SIP[no] = { no, kul: fm[0], firma: fm[1], ad: 'Örnek Yetkili', tarih: d.getTime(), kalemler, toplam: kalemler.reduce((a, x) => a + x.birim * x.adet, 0), adres: fm[2], durum: ay > 1 ? (r() < .08 ? 'iptal' : 'sevk') : ['yeni', 'onay', 'uretim'][Math.floor(r() * 3)], ekIskonto: r() < .2 ? 3 : 0, ornek: true, kaynak: 'ornek' };
  }
  yaz('exs-siparisler', SIP); yaz('exs-musteriler', MUS); yaz('exs-iskonto', ISK); yeniSay();
  { // örnek siparişlere geçmiş, termin, fatura/tahsilat ve CRM notu
  let tohum = 7; const r = () => (tohum = (tohum * 9301 + 49297) % 233280) / 233280;
  Object.values(SIP).filter(o => o.ornek).sort((a, b) => a.tarih - b.tarih).forEach(o => {
    o.gecmis = [{ durum: 'yeni', zaman: o.tarih }]; if (o.durum !== 'yeni') o.gecmis.push({ durum: o.durum, zaman: o.tarih + 3 * GUN });
    if (o.durum === 'onay' || o.durum === 'uretim') o.termin = new Date(Date.now() + (10 + Math.floor(r() * 30)) * GUN).toISOString().slice(0, 10);
    if (o.durum !== 'sevk') return; o.kargo = 'Kendi aracımız'; o.takip = 'IRS-' + o.no.slice(-4);
    const c = cariHesap(o.kul), t = o.tarih + 5 * GUN, n = Math.round(tutarlar(o).net * 100) / 100;
    if (!c.hareket.some(h => h.sip === o.no)) { c.hareket.push({ tip: 'fatura', no: 'FT-' + o.no, sip: o.no, tarih: t, vade: t + c.vade * GUN, tutar: n, aciklama: o.no + ' sevkiyatı', ornek: true });
      if (r() < (o.kul === 'ornek-bodrum' ? .3 : .85)) c.hareket.push({ tip: 'odeme', no: 'TH-' + o.no.slice(-4), tarih: t + (40 + r() * 40) * GUN, tutar: n, aciklama: 'Havale', ornek: true }); }
  });
  Object.values(CARI).forEach(c => c.hareket = c.hareket.filter(h => h.tip !== 'odeme' || h.tarih < Date.now()));
  ['ornek-ege', 'ornek-akdeniz', 'ornek-bosfor'].forEach((k, i) => { CRM[k] = CRM[k] || []; if (!CRM[k].length) CRM[k].push({ tarih: Date.now() - (5 + i * 20) * GUN, tur: ['Telefon', 'Ziyaret', 'E-posta'][i], yazi: ['Yeni sezon kataloğu iletildi.', 'Showroom ziyareti, teras projesi konuşuldu.', 'Fiyat listesi gönderildi.'][i], kim: 'Örnek', ornek: true }); });
  yaz('exs-siparisler', SIP); cariYaz(); yaz('exs-crm', CRM);
  }
}
