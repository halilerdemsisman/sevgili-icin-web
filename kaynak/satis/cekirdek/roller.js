// Çekirdek: roller (yönetici / temsilci) ve ayarlardaki rol seçimi.
// ===== v2.2: roller, onay akışı, fiyat geçmişi, bayiye bildirim, hedef takibi =====
const rolu = u => u ? (u.rol || (u.kul === 'satis' ? 'yonetici' : 'temsilci')) : 'temsilci';
const yonetici = () => rolu(ben) === 'yonetici';
const ROL_AD = { yonetici: 'Yönetici', temsilci: 'Satış temsilcisi' };
const kimAd = () => (ben && (ben.ad || ben.kul)) || '';

// ---------- ayarlar: roller ve onay kuralı
// ayarlar: kullanıcı rolleri
function ayarlarRoller() {
  $$('[data-sil]').forEach(b => { if (!yonetici()) b.disabled = true; });
  const tb = $$('#icerik .kart').find(k => k.textContent.includes('Satış ekibi kullanıcıları'));
  if (tb) tb.querySelectorAll('table tr').forEach(r => { const kul = (r.querySelector('td b') || {}).textContent; if (!kul || !KUL[kul]) return; r.children[0].insertAdjacentHTML('beforeend', yonetici() && kul !== ben.kul ? ` <select data-rol="${esc(kul)}" style="padding:3px 6px;border:1px solid var(--cizgi);border-radius:6px;font-size:12px">${Object.entries(ROL_AD).map(([k, a]) => `<option value="${k}" ${rolu(KUL[kul]) === k ? 'selected' : ''}>${a}</option>`).join('')}</select>` : ` <span class="rozet">${ROL_AD[rolu(KUL[kul])]}</span>`); });
  $$('[data-rol]').forEach(s => s.onchange = () => { KUL[s.dataset.rol].rol = s.value; yaz('exs-kullanicilar', KUL); toast('Rol güncellendi.'); });
}
// yeni kullanıcıya rol ataması: varsayılan temsilci (rolu() bunu çözer)
