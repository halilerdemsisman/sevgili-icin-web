// Özel teklif: masa + sandalye takımı için fiyat talebi (/ozel-teklif), onaylı teklifi sepete ekleme, karar bildirimi.
(function () {
  const sv = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const usd = n => (Math.round((n || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
  const sayi10 = v => parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  const ODZ = { bekliyor: 'Onay bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
  // sayfa iskeleti ve üst çubuk düğmesi
  $('#s-odeme').insertAdjacentHTML('afterend', '<section id="s-teklifler" class="sayfa gizli"></section>');
  const hs = $('#hSepet'); if (hs) hs.insertAdjacentHTML('beforebegin', `<button class="h-btn" data-git="teklifler">${sv('<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><circle cx="17" cy="14" r="1.5"/>')}<span class="y">Özel teklif</span></button>`);
  $$('[data-git=teklifler]').forEach(b => b.onclick = () => git('teklifler'));

  // ================= özel teklif: masa + sandalye takımı =================
  const MASA = VERI.urunler.filter(u => /Masa/i.test(u.kategori) && u.secenek.length), SAND = VERI.urunler.filter(u => /Sandalye|Oturma|Koltuk|Bank/i.test(u.kategori) && u.secenek.length);
  const opt = (L, s) => L.map(u => `<option value="${u.id}" ${s == u.id ? 'selected' : ''}>${esc(u.ad)}</option>`).join('');
  const renkOpt = (L, bos) => `<option value="">${bos}</option>` + L.map(r => `<option value="${esc(r.ad + (r.ad !== r.kod ? ' (' + r.kod + ')' : ''))}">${esc(r.ad)}${r.ad !== r.kod ? ' · ' + esc(r.kod) : ''}</option>`).join('');
  const TL = () => (oku('exb-teklif', []) || []).filter(t => t.kul === ben.kul).sort((a, b) => b.zaman - a.zaman);
  let onSec = null;
  EK.teklifSayfa = () => teklifSayfa();
  function teklifSayfa() {
    const T = TL();
    $('#s-teklifler').innerHTML = `<h2>Özel teklif talebi</h2><p class="kucuk" style="margin-top:-6px">Masa ve sandalyeyi, takımdaki oranı ve renkleri kendiniz belirleyin; satış ekibi talebinizi inceleyip size özel fiyatla onaylar. Onaylanan teklifi tek tıkla sepete ekleyebilirsiniz.</p>
      <div class="of-kart"><div class="of-iki">
        <div><h3 style="margin:0">Masa</h3><label>Ürün</label><select id="tfM"><option value="">Masa istemiyorum</option>${opt(MASA, onSec && MASA.some(u => u.id === onSec) ? onSec : '')}</select><label>Seçenek / ölçü</label><select id="tfMs"></select><label>İskelet rengi</label><select id="tfMi">${renkOpt(ISKELET, 'Seçin')}</select></div>
        <div><h3 style="margin:0">Sandalye / oturma</h3><label>Ürün</label><select id="tfS"><option value="">Seçin</option>${opt(SAND, onSec && SAND.some(u => u.id === onSec) ? onSec : '')}</select><label>Seçenek</label><select id="tfSs"></select><label>İskelet rengi</label><select id="tfSi">${renkOpt(ISKELET, 'Seçin')}</select>
          <div class="of-iki" style="gap:8px"><div><label>File rengi</label><select id="tfSf">${renkOpt(FILE, 'Yok / fark etmez')}</select></div><div><label>Kumaş</label><select id="tfSk">${renkOpt(KUMAS, 'Yok / fark etmez')}</select></div></div></div></div>
        <div class="of-iki" style="grid-template-columns:repeat(4,1fr)"><div><label>Masa başına sandalye</label><input id="tfOr" inputmode="numeric" value="4"></div><div><label>Takım adedi</label><input id="tfAd" inputmode="numeric" value="10"></div><div><label>Hedef takım fiyatı (USD, isteğe bağlı)</label><input id="tfHd" inputmode="decimal"></div><div><label>Termin</label><input id="tfTr" type="date"></div></div>
        <label>Not</label><textarea id="tfNt" rows="2" placeholder="Örn. otel projesi, teslimat Mart başı"></textarea>
        <div class="of-ozet" id="tfOz"></div><div class="hata" id="tfHata"></div>
        <button class="btn marka" id="tfGon">Talebi gönder</button></div>
      <div class="of-kart"><h3 style="margin-top:0">Taleplerim</h3>${T.length ? `<table class="of-tablo"><tr><th>No</th><th>Takım</th><th>Adet</th><th>Fiyat</th><th>Durum</th><th></th></tr>${T.map(t => `<tr><td><b>${esc(t.no)}</b><div class="kucuk">${tarih(t.zaman)}</div></td>
        <td>${t.masa ? `<div><b>${esc(t.masa.ad)}</b> ${esc(t.masa.secenek || '')} · ${esc(t.masa.iskelet || '')}</div>` : ''}<div><b>${esc(t.sandalye.ad)}</b> ${esc(t.sandalye.secenek || '')} · ${esc([t.sandalye.iskelet, t.sandalye.file, t.sandalye.kumas].filter(Boolean).join(' · '))}</div><div class="kucuk">${t.masa ? `1 masa + ${t.oran} sandalye` : 'Yalnız sandalye'}${t.not ? ' · ' + esc(t.not) : ''}</div></td>
        <td>${t.takim} takım<div class="kucuk">${t.masa ? t.takim + ' masa, ' : ''}${t.takim * t.oran} sandalye</div></td>
        <td>${t.durum === 'onaylandi' ? `<b>${usd(t.fiyat.takim)}</b> / takım<div class="kucuk">${t.masa ? 'Masa ' + usd(t.fiyat.masa) + ' · ' : ''}Sandalye ${usd(t.fiyat.sandalye)}</div>` : t.hedef ? '<span class="kucuk">Hedef ' + usd(t.hedef) + '</span>' : '—'}</td>
        <td><span class="of-dz ${t.durum}">${ODZ[t.durum]}</span>${t.yanit ? `<div class="kucuk">${esc(t.yanit)}</div>` : ''}</td>
        <td>${t.durum === 'onaylandi' && !t.sepette ? `<button class="btn marka" data-tsep="${esc(t.no)}">Sepete ekle</button>` : t.sepette ? '<span class="kucuk">Sepete eklendi</span>' : ''}</td></tr>`).join('')}</table>` : '<p class="kucuk">Henüz talep yok.</p>'}</div>`;
    const sec = (us, ss) => { const u = VERI.urunler.find(x => x.id == $(us).value); $(ss).innerHTML = u ? u.secenek.map(s => `<option>${esc(s.ad)}</option>`).join('') : '<option value="">—</option>'; };
    const oz = () => { const m = VERI.urunler.find(x => x.id == $('#tfM').value), s = VERI.urunler.find(x => x.id == $('#tfS').value), or = Math.max(1, Math.round(sayi10($('#tfOr').value) || 0)), ad = Math.max(1, Math.round(sayi10($('#tfAd').value) || 0));
      const fm = m ? (m.secenek.find(x => x.ad === $('#tfMs').value) || {}).fiyat || 0 : 0, fs = s ? (s.secenek.find(x => x.ad === $('#tfSs').value) || {}).fiyat || 0 : 0;
      $('#tfOz').innerHTML = s ? `<div>Toplam<b>${m ? ad + ' masa · ' : ''}${ad * or} sandalye</b></div><div>Liste fiyatıyla takım<b>${usd(fm + fs * or)}</b></div><div>Liste fiyatıyla toplam<b>${usd((fm + fs * or) * ad)}</b></div>` : ''; };
    $('#tfM').onchange = () => { sec('#tfM', '#tfMs'); oz(); }; $('#tfS').onchange = () => { sec('#tfS', '#tfSs'); oz(); }; sec('#tfM', '#tfMs'); sec('#tfS', '#tfSs'); oz();
    ['#tfMs', '#tfSs', '#tfOr', '#tfAd'].forEach(i => $(i).addEventListener('input', oz));
    $('#tfGon').onclick = () => { const m = VERI.urunler.find(x => x.id == $('#tfM').value), s = VERI.urunler.find(x => x.id == $('#tfS').value), h = $('#tfHata');
      if (!s) return h.textContent = 'Sandalye ürününü seçin.'; if (!$('#tfSi').value || (m && !$('#tfMi').value)) return h.textContent = 'İskelet renklerini seçin.';
      const or = Math.round(sayi10($('#tfOr').value)), ad = Math.round(sayi10($('#tfAd').value)); if (!(or > 0) || !(ad > 0)) return h.textContent = 'Oran ve takım adedini girin.';
      const t = { zaman: Date.now(), oran: m ? or : 1, takim: m ? ad : ad * or, hedef: sayi10($('#tfHd').value) || null, termin: $('#tfTr').value || '', not: $('#tfNt').value.trim(), durum: 'bekliyor',
        masa: m ? { id: m.id, ad: m.ad, kategori: m.kategori, secenek: $('#tfMs').value, iskelet: $('#tfMi').value } : null,
        sandalye: { id: s.id, ad: s.ad, kategori: s.kategori, secenek: $('#tfSs').value, iskelet: $('#tfSi').value, file: $('#tfSf').value, kumas: $('#tfSk').value } };
      if (!m) t.oran = 1;
      bekleyerek($('#tfGon'), async () => { try { await kayitEkle('teklifler', t); } catch (e) { return h.textContent = e.message; }
        toast('Teklif talebiniz satış ekibine iletildi.'); onSec = null; teklifSayfa(); }); };
    $$('[data-tsep]').forEach(b => b.onclick = () => { const L = oku('exb-teklif', []), t = L.find(x => x.no === b.dataset.tsep); if (!t) return; const S = sepet();
      const ek = (p, adet, birim) => { const u = VERI.urunler.find(x => x.id === p.id) || {}, sc = (u.secenek || []).find(x => x.ad === p.secenek) || {};
        S.push({ id: p.id, ad: p.ad, kategori: p.kategori, secenek: p.secenek, sinif: sc.sinif || '', birim, liste: sc.liste || null, kampanya: 'Özel teklif ' + t.no, adet, iskelet: p.iskelet || '', file: p.file || '', kumas: (p.kumas || '').replace(/ \(.*/, ''), fitil: '', not: 'Özel teklif ' + t.no, teklif: t.no }); };
      if (t.masa) ek(t.masa, t.takim, t.fiyat.masa); ek(t.sandalye, t.takim * t.oran, t.fiyat.sandalye);
      sepetKaydet(S); kayitGuncelle('teklifler', t.no, { sepette: true }).catch(e => console.warn('teklif işaretlenemedi:', e.message)).then(teklifSayfa);
      toast('Teklif ürünleri özel fiyatla sepete eklendi.'); });
  }
  // ürün penceresinden "Özel teklif iste"
  EK.urunOzelTeklif = function (p, u) { const id = u.id; if (!(MASA.includes(u) || SAND.includes(u))) return;
    const ekle = () => { if (p.querySelector('.of-iste')) return; const k = p.querySelector('.kapat'); if (!k) return; k.insertAdjacentHTML('afterend', '<button class="btn cizgi of-iste" style="position:absolute;right:56px;top:12px;z-index:3;font-size:13px">Özel teklif iste</button>'); p.querySelector('.of-iste').onclick = () => { onSec = id; p.remove(); git('teklifler'); }; };
    ekle(); new MutationObserver(ekle).observe(p, { childList: true, subtree: true }); };

  // ================= gezinme =================
    // karar bildirimi: teklif durumu değişince bayiye haber ver
  let eski = null;
  setInterval(() => { if (!ben) return; const T = TL(), y = JSON.stringify(T.map(t => [t.no, t.durum])); if (eski === null) eski = y; if (y === eski) return;
    const once = new Map(JSON.parse(eski)); eski = y; T.forEach(t => { if (once.has(t.no) && once.get(t.no) !== t.durum && t.durum !== 'bekliyor') toast(`${t.no} özel teklifiniz ${ODZ[t.durum].toLocaleLowerCase('tr')}.`); });
    if (!$('#s-teklifler').classList.contains('gizli')) teklifSayfa(); }, 4000);
})();
