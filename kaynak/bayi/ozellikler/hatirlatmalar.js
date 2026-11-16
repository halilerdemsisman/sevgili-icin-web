// Hatırlatmalar: kendi hatırlatmaları, satış ekibinin mesajları ve otomatik uyarılar (vade, teslim, kampanya, proje, sepet).
(function () {
  const urun = urunBul;

  // ================= 18. hatırlatmalar =================
  const hKey = () => 'exb-hat-' + ben.kul, gKey = () => 'exb-hat-gizli-' + ben.kul;
  const hOku = () => oku(hKey(), []) || [], hYaz = L => yaz(hKey(), L);
  const hb = $('[data-git=projeler]') || $('#hSepet');
  if (hb && !$('#hHat')) hb.insertAdjacentHTML('beforebegin', `<button class="h-btn" id="hHat" title="Hatırlatmalar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="y">Hatırlatmalar</span><span class="rozet gizli"></span></button>`);
  function otomatik() {
    const A = [], gz = oku(gKey(), {}) || {}, bg = bugun(), ekle = x => { if (gz[x.k] !== bg) A.push(x); };
    // satış ekibinden gelen hatırlatmalar
    oku('exb-hatirlat', []).filter(m => m.kul === ben.kul && !m.okundu).forEach(m => A.push({ k: 'm-' + m.id, renk: m.tur === 'odeme' ? 'kirmizi' : 'sari', metin: m.metin, alt: 'EXIT Garden satış ekibi · ' + tarih(m.zaman), mesaj: m.id, git: m.tur === 'odeme' ? 'cari' : '' }));
    // cari: vadesi geçmiş / yaklaşan
    try { const c = (oku('exb-cari', {}) || {})[ben.kul]; if (c) { const z = cariOzet(c);
      if (z.gecmis > 0.5 && !A.some(x => x.mesaj && x.renk === 'kirmizi')) ekle({ k: 'vg', renk: 'kirmizi', metin: `Vadesi geçmiş bakiyeniz var: ${para(Math.round(z.gecmis))}`, alt: 'Ödeme yaptıysanız Cari hesabım ekranından bildirebilirsiniz.', git: 'cari' });
      z.D.filter(f => f.acik > 0.5 && f.vade >= Date.now() && f.vade < Date.now() + 7 * 864e5).forEach(f => ekle({ k: 'fv-' + f.no, renk: 'sari', metin: `${f.no} faturasının vadesi ${gunFark(f.vade) <= 0 ? 'bugün' : gunFark(f.vade) + ' gün sonra'} doluyor`, alt: `Kalan ${para(Math.round(f.acik))} · vade ${tarih(f.vade)}`, git: 'cari' })); } } catch (e) {}
    // teslimat yaklaşan siparişler
    oku('exb-siparisler', []).filter(o => o.kul === ben.kul && o.termin && !['sevk', 'iptal'].includes(o.durum)).forEach(o => { const g = gunFark(o.termin); if (g >= 0 && g <= 3) ekle({ k: 'tr-' + o.no, renk: 'yesil', metin: `${o.no}: tahmini teslim ${g === 0 ? 'bugün' : g + ' gün sonra'}`, alt: 'Teslim tarihi ' + tarih(o.termin), git: 'siparisler' }); });
    // favori üründe kampanya bitiyor
    const FV = oku('exb-fav-' + ben.kul, []) || [];
    VERI.urunler.filter(u => u.kmp && u.kmp.bit && FV.includes(u.id)).forEach(u => { const g = gunFark(u.kmp.bit); if (g >= 0 && g <= 5) ekle({ k: 'km-' + u.id + '-' + u.kmp.bit, renk: 'sari', metin: `${u.ad}: %${u.kmp.oran} kampanya ${g === 0 ? 'bugün' : g + ' gün sonra'} bitiyor`, alt: 'Favori ürününüz', urun: u.id }); });
    // bekleyen proje sepetleri
    (oku('exb-proje-' + ben.kul, []) || []).filter(p => p.kalemler.length && !(p.siparisler || []).length).forEach(p => { const g = Math.floor((Date.now() - p.guncel) / 864e5); if (g >= 14) ekle({ k: 'pr-' + p.id, renk: 'mavi', metin: `“${p.ad}” projesi ${g} gündür bekliyor`, alt: p.kalemler.length + ' kalem hazır; sipariş vermeyi unutmayın.', git: 'projeler' }); });
    // sepette ürün
    const sn = sepet().length; if (sn) ekle({ k: 'sp', renk: 'mavi', metin: `Sepetinizde ${sn} kalem bekliyor`, alt: 'Sipariş talebini göndermeyi unutmayın.', sepet: true });
    return A;
  }
  const bekleyenler = () => hOku().filter(h => !h.bitti && h.tarih <= bugun());
  function hRozet() {
    const b = $('#hHat'); if (!b || !ben) return; const n = bekleyenler().length + otomatik().length, r = b.querySelector('.rozet');
    r.textContent = n; r.classList.toggle('gizli', !n); return n;
  }
  function hatirlatmalar() {
    const c = document.createElement('div'); c.className = 'perde hat-p'; c.style.padding = 0; c.onclick = e => { if (e.target === c) c.remove(); }; document.body.appendChild(c);
    function ciz() {
      const A = otomatik(), H = hOku(), B = H.filter(h => !h.bitti && h.tarih <= bugun()).sort((a, b) => a.tarih.localeCompare(b.tarih)), P = H.filter(h => !h.bitti && h.tarih > bugun()).sort((a, b) => a.tarih.localeCompare(b.tarih)), T = H.filter(h => h.bitti).sort((a, b) => b.bitti - a.bitti).slice(0, 5);
      const kendi = (h, gec) => `<div class="hat ${gec ? (h.tarih < bugun() ? 'kirmizi' : 'sari') : ''}"><span class="n"></span><div class="m">${esc(h.metin)}<small>${h.tarih < bugun() && gec ? gunFark(h.tarih) * -1 + ' gün gecikti · ' : ''}${tarih(h.tarih)}</small>
        <div class="a"><button class="ana" data-hb="${h.id}">Tamamlandı</button><button data-he="${h.id}" data-g="1">Yarın</button><button data-he="${h.id}" data-g="7">1 hafta sonra</button><button data-hs="${h.id}">Sil</button></div></div></div>`;
      c.innerHTML = `<div class="cekmece"><div class="c-ust"><h3>Hatırlatmalar</h3><button>×</button></div><div class="c-liste" style="padding:0">
        <div class="hat-g"><h4>Kendime hatırlatma ekle</h4><div class="hat-ekle"><input type="text" id="hMet" aria-label="Hatırlatma" placeholder="Örn. Otel Mavi Koy'a teklifi sor"><input type="date" id="hTar" aria-label="Tarih" value="${bugun()}"><button class="btn marka" id="hEkle">Ekle</button></div></div>
        <div class="hat-g"><h4>Şimdi ilgilenilecekler (${A.length + B.length})</h4>${A.length + B.length ? B.map(h => kendi(h, true)).join('') + A.map((x, i) => `<div class="hat ${x.renk}"><span class="n"></span><div class="m">${esc(x.metin)}<small>${esc(x.alt || '')}</small><div class="a">
          ${x.git ? `<button class="ana" data-ag="${i}">${{ cari: 'Cari hesabım', siparisler: 'Siparişlerim', projeler: 'Projeler' }[x.git]}</button>` : ''}${x.urun ? `<button class="ana" data-au="${i}">Ürünü aç</button>` : ''}${x.sepet ? `<button class="ana" data-as="${i}">Sepete git</button>` : ''}
          ${x.mesaj ? `<button data-am="${i}">Okundu</button>` : `<button data-ah="${i}">Bugün gizle</button>`}</div></div></div>`).join('') : '<div class="hat-bos">Şu an bekleyen bir şey yok.</div>'}</div>
        <div class="hat-g"><h4>Planlanan (${P.length})</h4>${P.length ? P.map(h => kendi(h, false)).join('') : '<div class="hat-bos">Planlanmış hatırlatma yok.</div>'}</div>
        ${T.length ? `<div class="hat-g"><h4>Son tamamlananlar</h4>${T.map(h => `<div class="hat yesil"><span class="n"></span><div class="m" style="text-decoration:line-through;opacity:.7">${esc(h.metin)}<small>${tarih(h.tarih)}</small></div></div>`).join('')}</div>` : ''}
        </div></div>`;
      c.querySelector('.c-ust button').onclick = () => c.remove();
      c.querySelector('#hEkle').onclick = () => { const m = c.querySelector('#hMet').value.trim(); if (!m) return toast('Hatırlatma metnini yazın.'); const L = hOku(); L.push({ id: 'h' + Date.now().toString(36), metin: m, tarih: c.querySelector('#hTar').value || bugun(), zaman: Date.now() }); hYaz(L); toast('Hatırlatma eklendi.'); hRozet(); ciz(); };
      c.querySelector('#hMet').onkeydown = e => { if (e.key === 'Enter') c.querySelector('#hEkle').click(); };
      const bul = id => { const L = hOku(); return [L, L.find(h => h.id === id)]; };
      c.querySelectorAll('[data-hb]').forEach(b => b.onclick = () => { const [L, h] = bul(b.dataset.hb); h.bitti = Date.now(); hYaz(L); hRozet(); ciz(); });
      c.querySelectorAll('[data-he]').forEach(b => b.onclick = () => { const [L, h] = bul(b.dataset.he), d = new Date(); d.setDate(d.getDate() + +b.dataset.g); h.tarih = d.toISOString().slice(0, 10); hYaz(L); toast('Ertelendi: ' + tarih(h.tarih)); hRozet(); ciz(); });
      c.querySelectorAll('[data-hs]').forEach(b => b.onclick = () => { if (!b.dataset.emin) { b.dataset.emin = 1; b.textContent = 'Silinsin mi?'; return; } const [L] = bul(b.dataset.hs); hYaz(L.filter(h => h.id !== b.dataset.hs)); hRozet(); ciz(); });
      c.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => { c.remove(); git(A[+b.dataset.ag].git); });
      c.querySelectorAll('[data-au]').forEach(b => b.onclick = () => { c.remove(); urunAc(A[+b.dataset.au].urun); });
      c.querySelectorAll('[data-as]').forEach(b => b.onclick = () => { c.remove(); $('#hSepet').click(); });
      c.querySelectorAll('[data-ah]').forEach(b => b.onclick = () => { const G = oku(gKey(), {}) || {}; G[A[+b.dataset.ah].k] = bugun(); yaz(gKey(), G); hRozet(); ciz(); });
      // satış mesajını okundu işaretle (sunucuya bağlıyken PATCH /api/v1/hatirlatmalar/:id)
      c.querySelectorAll('[data-am]').forEach(b => b.onclick = () => bekleyerek(b, async () => { const id = A[+b.dataset.am].mesaj; if (id) await kayitGuncelle('hatirlatmalar', id, { okundu: Date.now() }); hRozet(); ciz(); }));
    }
    ciz();
  }
  if ($('#hHat')) $('#hHat').onclick = hatirlatmalar;
  EK.girisHatirlatma = function () { hRozet(); EK.karsilastirmaCubugu?.(); setTimeout(() => { if (!ben) return; const n = hRozet(); if (n) toast(`${n} hatırlatmanız var.`); }, 4600); };
  let _hSon = 0; setInterval(() => { if (!ben) return; const n = hRozet() || 0; if (n > _hSon && _hSon && oku('exb-hatirlat', []).some(m => m.kul === ben.kul && !m.okundu && Date.now() - m.zaman < 30000)) toast('Satış ekibinden yeni hatırlatma var.'); _hSon = n; }, 15000);
  setTimeout(() => { if (ben) { hRozet(); EK.karsilastirmaCubugu?.(); } }, 1500);
  EK.hatirlatmaRozeti = () => hRozet();
})();
