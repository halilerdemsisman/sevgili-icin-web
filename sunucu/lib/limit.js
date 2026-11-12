// Kredi limiti denetimi (rapor V4; satış panelindeki riskHesap ile aynı hesap).
//   risk = cari bakiye (faturalar − ödemeler) + onaylanmış ama faturası kesilmemiş siparişlerin iskontolu neti
// Bir sipariş "yeni"den ileri bir duruma (onay/üretim/sevk) geçerken risk + bu siparişin neti limiti aşıyorsa:
//   • temsilci onaylayamaz (sunucu değişikliği reddeder),
//   • yönetici onaylayabilir (satış paneli gerekçe ister ve siparişe "limitOnay" yazar).
// Limit cari kaydında (exs-cari[bayi].limit) tutulur; tanımlı değilse denetim yapılmaz.
const coz = (s, v) => { try { return s == null ? v : JSON.parse(s); } catch (e) { return v; } };
const ILERI = ['onay', 'uretim', 'sevk'];

class Limitler {
  constructor(ham) { this.ham = ham; }

  _net(o, ISK) {
    const brut = (o.kalemler || []).reduce((a, x) => a + (+x.birim || 0) * (+x.adet || 0), 0);
    const m = o.musIskonto != null ? +o.musIskonto : ((ISK[o.kul] && +ISK[o.kul].oran) || 0), e = +o.ekIskonto || 0;
    return brut * (1 - m / 100) * (1 - e / 100);
  }

  /** @returns {{limit, bakiye, acik, risk}} */
  risk(kul) {
    const CARI = coz(this.ham('exs-cari'), {}) || {}, SIP = coz(this.ham('exs-siparisler'), {}) || {}, ISK = coz(this.ham('exs-iskonto'), {}) || {};
    const c = CARI[kul] || { hareket: [] }, H = Array.isArray(c.hareket) ? c.hareket : [];
    const borc = H.filter(h => h.tip === 'fatura').reduce((a, h) => a + (+h.tutar || 0), 0), odeme = H.filter(h => h.tip === 'odeme').reduce((a, h) => a + (+h.tutar || 0), 0);
    const fat = new Set(H.filter(h => h.tip === 'fatura').map(h => h.sip));
    const acik = Object.values(SIP).filter(o => o && o.kul === kul && !['iptal', 'yeni'].includes(o.durum) && !fat.has(o.no)).reduce((a, o) => a + this._net(o, ISK), 0);
    return { limit: +c.limit || 0, bakiye: borc - odeme, acik, risk: borc - odeme + acik };
  }

  /**
   * Sipariş durum değişikliği limit açısından uygun mu?
   * @param eski sunucudaki kayıt (yoksa null); @param yeni gelen kayıt
   * @returns {string|null} engel açıklaması veya null
   */
  engel(eski, yeni) {
    if (!yeni || !ILERI.includes(yeni.durum)) return null;
    if (eski && ILERI.includes(eski.durum)) return null;   // zaten ilerlemiş sipariş
    if (eski && eski.limitOnay) return null;                 // yönetici daha önce limit aşımını onaylamış
    const r = this.risk(yeni.kul);
    if (!r.limit) return null;
    const ISK = coz(this.ham('exs-iskonto'), {}) || {};
    const yeniRisk = r.risk + this._net(yeni, ISK);
    if (yeniRisk <= r.limit + 0.01) return null;
    return `${yeni.no}: kredi limiti aşılıyor (${Math.round(yeniRisk)} / ${Math.round(r.limit)} $); yönetici onayı gerekir`;
  }
}

module.exports = { Limitler };
