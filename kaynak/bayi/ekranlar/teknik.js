// Teknik bilgiler (ürün penceresi) ve yazdırılabilir PDF katalog.
// ===== teknik bilgiler (exitgarden.com) ve katalog =====
function teknikHtml(u) {
  const t = u.teknik; if (!t) return '';
  return `<details class="teknik" open><summary>Teknik bilgiler</summary>${(t.malzeme || []).length ? `<ul>${t.malzeme.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
    ${(t.tablolar || []).map(tb => `<div class="tk-kay" tabindex="0"><table><tr>${tb.basliklar.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${tb.satirlar.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`).join('')}
    <div class="kucuk">Ölçüler cm, ağırlık kg. Kaynak: exitgarden.com</div></details>`;
}
function katalogIndir() {
  const L = VERI.urunler.filter(u => uygun(u)), w = window.open('', '_blank'); if (!w) return toast('Açılır pencere engellendi; tarayıcıda izin verin.');
  const kats = [...new Set(L.map(u => u.kategori))];
  w.document.write(`<html><head><meta charset="utf-8"><title>EXIT Garden Katalog ${new Date().getFullYear()}</title><style>
    body{font-family:Inter,"Segoe UI",sans-serif;color:#0f172a;margin:0}.kapak{height:255mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;padding:60px;background:#0b1f3a;color:#fff;page-break-after:always}
    .kapak h1{font-size:44px;margin:30px 0 8px}.kapak p{color:#cbd5e1}.logo-ink{fill:#e5e7eb}.logo-ink-soft{fill:#cbd5e1}.lg svg{height:48px;width:auto;margin-right:18px}.lg .logo-sep{display:none}
    h2{font-size:22px;border-bottom:3px solid #e8a317;padding-bottom:6px;margin:28px 32px 14px;page-break-before:always}h2:first-of-type{page-break-before:auto}
    .u{display:grid;grid-template-columns:220px 1fr;gap:20px;margin:0 32px 18px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;page-break-inside:avoid}
    .g{aspect-ratio:4/3;background:#fff center/contain no-repeat;border:1px solid #eef0f3;border-radius:6px}h3{margin:0 0 6px;font-size:17px}.a{font-size:12px;color:#475569;line-height:1.5;margin:0 0 8px}
    table{border-collapse:collapse;font-size:11px;margin:6px 0}td,th{border:1px solid #e5e7eb;padding:3px 7px;text-align:left}th{background:#f8fafc}.f{font-size:11.5px}.f b{font-weight:600}
    ul{margin:4px 0;padding-left:16px;font-size:11.5px;color:#334155}@page{margin:12mm}</style></head><body>
    <div class="kapak"><div class="lg">${$('#giris .logolar').innerHTML}</div><h1>Dış Mekân Koleksiyonu ${new Date().getFullYear()}</h1><p>${L.length} ürün · ${kats.join(' · ')}</p><p>Bayi fiyat listesi · USD · ${new Date().toLocaleDateString('tr-TR')}</p></div>
    ${kats.map(k => `<h2>${esc(k)}</h2>${L.filter(u => u.kategori === k).map(u => `<div class="u"><div class="g" style="background-image:url(${u.gorselB || u.gorsel})"></div><div><h3>${esc(u.ad)}</h3><p class="a">${esc(u.aciklama || '')}</p>
      ${u.teknik ? `${(u.teknik.malzeme || []).length ? `<ul>${u.teknik.malzeme.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}${(u.teknik.tablolar || []).map(tb => `<table><tr>${tb.basliklar.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${tb.satirlar.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`).join('')}` : ''}
      <div class="f">${u.secenek.map(s => `${esc(s.ad)}: <b>${para(s.fiyat)}</b>`).join(' · ')}</div></div></div>`).join('')}`).join('')}
    <script>setTimeout(()=>print(),600)<\/script></body></html>`);
  w.document.close();
  EK.katalogIndirDil?.(w);
}
