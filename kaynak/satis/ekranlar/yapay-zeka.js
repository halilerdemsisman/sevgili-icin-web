// Ekran: yapay zekâ (SWOT ve öneriler).
// ---------- yapay zekâ: SWOT ve öneriler
// Yerel motor her zaman çalışır (verilerden kural tabanlı çıkarım). Ayarlar'a Claude API anahtarı girilirse aynı veriler Claude'a gönderilip daha derin yorum alınır.
function yerelSwot(s) {
  const G = [], Z = [], F = [], T = [], O = [];
  const k1 = s.kat[0], u1 = s.urun[0], i1 = s.isk[0];
  if (k1) G.push(`${k1[0]} en güçlü kategori: net satışın ${yuzde(k1[1] / (s.net || 1) * 100)}'i.`);
  if (u1) G.push(`${u1[0]} en çok satan ürün (${u1[1]} adet).`);
  if (s.buyume != null && s.buyume > 5) G.push(`Son 3 ayda satışlar önceki döneme göre ${yuzde(s.buyume)} arttı.`);
  if (s.ortSepet > 3000) G.push(`Ortalama sipariş büyüklüğü yüksek (${usd(s.ortSepet)}); müşteriler set halinde alıyor.`);
  if (s.iskOran < 8 && s.siparis) G.push(`İskonto disiplini iyi: ortalama ${yuzde(s.iskOran)}.`);
  if (s.ilk3Pay > 50) Z.push(`Satışın ${yuzde(s.ilk3Pay)}'i ilk 3 müşteriden geliyor; müşteri yoğunlaşması riski var.`);
  if (s.iskOran >= 12) Z.push(`Ortalama iskonto yüksek (${yuzde(s.iskOran)}); kârlılığı aşındırıyor.`);
  if (s.buyume != null && s.buyume < -5) Z.push(`Son 3 ayda satışlar ${yuzde(Math.abs(s.buyume))} düştü.`);
  if (s.bekleyen > 3) Z.push(`${s.bekleyen} sipariş talebi onay bekliyor; yanıt süresi müşteri memnuniyetini etkiler.`);
  if (s.toplamSip && s.iptal / s.toplamSip > .1) Z.push(`İptal oranı ${yuzde(s.iptal / s.toplamSip * 100)}.`);
  if (s.satilmayan.length > 10) Z.push(`${s.satilmayan.length} ürün hiç satılmadı (ör. ${s.satilmayan.slice(0, 3).join(', ')}).`);
  const zayifKat = s.kat.length > 2 ? s.kat[s.kat.length - 1] : null;
  if (zayifKat) F.push(`${zayifKat[0]} kategorisi az satıyor; oturma grubu ve masa siparişlerine çapraz satışla büyütülebilir.`);
  if (s.teklifKalem) F.push(`${s.teklifKalem} kalem fiyatsız “teklif” olarak geldi; bu ürünlere liste fiyatı eklemek satışı hızlandırır.`);
  if (i1) F.push(`${i1[0]} iskelet rengi en çok tercih edilen renk; stok ve boya planlaması buna göre önceden yapılabilir.`);
  F.push('Sezon öncesi (şubat–nisan) bayilere erken sipariş iskontosu verilerek üretim yükü yayılabilir.');
  if (s.aktifMus < s.musteri) F.push(`${s.musteri - s.aktifMus} kayıtlı müşteri henüz sipariş vermedi; aranarak aktive edilebilir.`);
  T.push('Dış mekân mobilyası sezonluk bir ürün; kış aylarında talep düşer.');
  if (KUR.TRY) T.push(`Fiyatlar USD; kur ${KUR.TRY.toFixed(2)} ₺ seviyesinde, kur artışı TL ile alan müşterinin talebini kısabilir.`);
  T.push('Hammadde (alüminyum, kumaş) fiyatlarındaki artış liste fiyatlarının güncellenmesini gerektirebilir.');
  if (s.ilk3Pay > 50) O.push(['Müşteri tabanını genişletin', `İlk 3 müşterinin payı ${yuzde(s.ilk3Pay)}. Sipariş vermeyen kayıtlı müşterilere ve yeni bölgelere odaklanın.`]);
  if (s.iskOran >= 10) O.push(['İskonto politikasını standartlaştırın', 'Ciroya bağlı kademeli iskonto (ör. 10.000 $ üzeri %5, 25.000 $ üzeri %8) tanımlayıp siparişe özel ek iskontoyu sınırlayın.']);
  if (k1 && zayifKat) O.push(['Set ve çapraz satış önerin', `${k1[0]} alan müşterilere ${zayifKat[0]} ile paket fiyat sunun; aile paketleri bunun için hazır.`]);
  if (s.bekleyen) O.push(['Talepleri hızlı onaylayın', `${s.bekleyen} talep bekliyor. 24 saat içinde dönüş hedefi koyun.`]);
  if (i1) O.push(['Popüler renklerde stoklu üretim', `${i1[0]} iskelet ve en çok seçilen kumaşlarla hızlı teslim stoku tutun.`]);
  if (s.satilmayan.length) O.push(['Satmayan ürünleri gözden geçirin', `Hiç satılmayan ${s.satilmayan.length} ürün için kampanya, fotoğraf ve açıklama iyileştirmesi ya da katalogdan çıkarma değerlendirin.`]);
  O.push(['Kur riskini yönetin', 'Teklif geçerlilik süresi (ör. 7 gün) yazın ve TL ödemelerde fatura günü kurunu esas alın.']);
  return { G, Z, F, T, O };
}
async function claudeSwot(s) {
  const anahtar = oku('exs-ai-anahtar', '');
  const ozetVeri = { donem: 'son 12 ay', net_satis_usd: Math.round(s.net), siparis: s.siparis, ortalama_sepet_usd: Math.round(s.ortSepet), ortalama_iskonto_yuzde: +s.iskOran.toFixed(1),
    son3ay_vs_onceki3ay_yuzde: s.buyume == null ? null : +s.buyume.toFixed(1), aylik_net: s.aylar.map(a => [a.ad + ' ' + a.yil, Math.round(a.net)]),
    kategori: s.kat.map(([k, v]) => [k, Math.round(v)]), en_iyi_musteriler_payi_ilk3_yuzde: +s.ilk3Pay.toFixed(1), urun_adet: s.urun.slice(0, 15), urun_tipi_adet: s.sinif,
    iskelet_rengi: s.isk, kumas: s.kum, file: s.fil, bekleyen_talep: s.bekleyen, iptal: s.iptal, kayitli_musteri: s.musteri, aktif_musteri: s.aktifMus, hic_satilmayan_urun_sayisi: s.satilmayan.length, usd_try: KUR.TRY };
  // Sunucuya bağlıyken istek sunucu üzerinden gider (API anahtarı sunucuda, tarayıcıda değil)
  const sunucu = window.EXIT_SUNUCU;
  const r = await fetch(sunucu ? 'api/ai/mesaj' : 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: sunucu ? { 'content-type': 'application/json', 'X-Exit-Uyg': 'satis' }
      : { 'content-type': 'application/json', 'x-api-key': anahtar, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    body: JSON.stringify({ model: 'claude-opus-5-5', max_tokens: 16000, fallbacks: 'default', output_config: { effort: 'medium' },
      system: 'Bir dış mekân mobilya üreticisinin (EXIT Garden, Türkiye) satış müdürüne danışmanlık yapıyorsun. Bayilere USD fiyatla satış yapılıyor. Verilen satış özetine dayanarak Türkçe, somut ve verilere atıf yapan bir SWOT analizi ve uygulanabilir öneriler üret. Veride olmayan şeyi kesin bilgi gibi yazma. Yanıtı yalnızca şu JSON biçiminde ver: {"guclu":[...],"zayif":[...],"firsat":[...],"tehdit":[...],"oneriler":[{"baslik":"...","aciklama":"..."}]}',
      messages: [{ role: 'user', content: 'Satış verisi özeti:\n' + JSON.stringify(ozetVeri) }] })
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
  if (j.stop_reason === 'refusal') throw new Error('Model bu isteği yanıtlamadı.');
  const metin = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const m = metin.match(/\{[\s\S]*\}/); if (!m) throw new Error('Yanıt okunamadı.');
  const x = JSON.parse(m[0]);
  return { G: x.guclu || [], Z: x.zayif || [], F: x.firsat || [], T: x.tehdit || [], O: (x.oneriler || []).map(o => [o.baslik, o.aciklama]) };
}
function swotCiz(r, kaynak) {
  const li = L => L.map(x => `<li>${esc(x)}</li>`).join('') || '<li>—</li>';
  return `<div class="ai-durum" style="margin-bottom:10px"><span class="nokta on"></span>${esc(kaynak)} · ${new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</div>
    <div class="swot"><div class="s-g"><h4><i>S</i>Güçlü yönler</h4><ul>${li(r.G)}</ul></div><div class="s-z"><h4><i>W</i>Zayıf yönler</h4><ul>${li(r.Z)}</ul></div>
      <div class="s-f"><h4><i>O</i>Fırsatlar</h4><ul>${li(r.F)}</ul></div><div class="s-t"><h4><i>T</i>Tehditler</h4><ul>${li(r.T)}</ul></div></div>
    <div class="kart" style="margin-top:16px"><h3>Öneriler</h3><div class="alt">Öncelik sırasıyla</div>${r.O.map(([b, a], i) => `<div class="oneri"><span class="no">${i + 1}</span><div><b>${esc(b)}</b><span class="kucuk" style="color:var(--yazi2)">${esc(a)}</span></div></div>`).join('')}</div>`;
}
function ai() {
  $('#baslik').textContent = 'Yapay zekâ: SWOT ve öneriler';
  const s = istatistik(), anahtar = window.EXIT_SUNUCU ? 'sunucuda' : oku('exs-ai-anahtar', '');
  $('#ustSag').innerHTML = `<button class="btn marka" id="aiBtn" ${anahtar ? '' : 'title="Ayarlar\'dan Claude API anahtarı girin"'}>Claude ile derin analiz</button>`;
  $('#icerik').innerHTML = (s.siparis ? '' : '<div class="kart kucuk">Henüz sipariş verisi yok; analiz verisiz yapılırsa genel kalır. Ayarlar\'dan örnek veri oluşturabilirsiniz.</div>') + `<div id="swot">${swotCiz(yerelSwot(s), 'Yerel analiz motoru (satış verilerinden otomatik)')}</div>`;
  const kayitli = oku('exs-ai-son', null); if (kayitli) $('#swot').insertAdjacentHTML('afterbegin', '<div class="kucuk" style="margin-bottom:8px">Son Claude analizi aşağıda; yenilemek için düğmeye basın.</div>' + swotCiz(kayitli.r, 'Claude analizi (' + kayitli.zaman + ')') + '<hr style="margin:24px 0;border:0;border-top:1px solid var(--cizgi)">');
  $('#aiBtn').onclick = async () => {
    if (!anahtar) { toast('Önce Ayarlar\'dan Claude API anahtarı girin.'); return git('ayarlar'); }
    const b = $('#aiBtn'); b.disabled = true; b.textContent = 'Claude analiz ediyor…';
    try { const r = await claudeSwot(s); yaz('exs-ai-son', { r, zaman: new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) }); $('#swot').innerHTML = swotCiz(r, 'Claude analizi'); }
    catch (e) { toast('Claude analizi yapılamadı: ' + e.message); }
    b.disabled = false; b.textContent = 'Claude ile derin analiz';
  };
  { // satış tahmini ve ürün önerileri
  $('#baslik').textContent = 'Yapay zekâ: tahmin ve SWOT'; const s = istatistik(); if (!s.siparis) return; const T = tahmin(s), O = urunOnerileri(), max = Math.max(1, ...T.map(t => t.ust), ...s.aylar.slice(-6).map(a => a.net));
  $('#icerik').insertAdjacentHTML('afterbegin', `<div class="kart"><h3>Satış tahmini: gelecek 3 ay</h3><div class="alt">Son 12 ayın eğilimi ve son 3 ayın ortalamasıyla hesaplanır. Aralık, geçmiş dalgalanmaya göre olası alt ve üst değerdir.</div>
    <div class="tahmin">${s.aylar.slice(-6).map(a => `<div class="tc"><span class="tv">${usd(a.net)}</span><i style="height:${a.net / max * 140}px"></i><span>${a.ad}</span></div>`).join('')}
    ${T.map(t => `<div class="tc tah"><span class="tv">${usd(t.t)}</span><i style="height:${t.t / max * 140}px"><em style="bottom:${t.alt / max * 140}px;height:${(t.ust - t.alt) / max * 140}px"></em></i><span>${t.ad.split(' ')[0].slice(0, 3)}</span></div>`).join('')}</div>
    <div class="kucuk">Tahmin toplamı: <b>${usd(T.reduce((a, t) => a + t.t, 0))}</b> (${usd(T.reduce((a, t) => a + t.alt, 0))} – ${usd(T.reduce((a, t) => a + t.ust, 0))}) · ${tlYap(T.reduce((a, t) => a + t.t, 0))}</div></div>
    ${O.length ? `<div class="kart"><h3>Bayiye ürün önerileri</h3><div class="alt">Benzer ürünleri alan bayilerin satın alımlarına göre; o bayinin henüz almadığı ürünler.</div><table class="tablo"><tr><th>Bayi</th><th>Önerilen ürünler</th></tr>${O.map(o => `<tr><td><b>${esc(o.firma)}</b></td><td>${o.L.map(esc).join(', ')}</td></tr>`).join('')}</table></div>` : ''}`);
  }
}
