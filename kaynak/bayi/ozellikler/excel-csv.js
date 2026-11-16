// Excel (.xlsx) ve CSV okuma/yazma (toplu sipariş, şablon indirme).
const trNorm = s => String(s ?? '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
async function zipAc(buf) {
  const dv = new DataView(buf); let e = buf.byteLength - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const F = {};
  for (let i = 0; i < n; i++) {
    const met = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    F[new TextDecoder().decode(new Uint8Array(buf, p + 46, nl))] = { met, csz, off }; p += 46 + nl + xl + cl;
  }
  return async ad => {
    const f = F[ad]; if (!f) return null;
    const d = new Uint8Array(buf, f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), f.csz);
    if (f.met === 0) return new TextDecoder().decode(d);
    return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  };
}
async function xlsxOku(buf) {
  const z = await zipAc(buf), P = s => new DOMParser().parseFromString(s, 'application/xml');
  const ssx = await z('xl/sharedStrings.xml'), SS = ssx ? [...P(ssx).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  let yol = 'xl/worksheets/sheet1.xml';
  try { const wb = P(await z('xl/workbook.xml')), rid = wb.getElementsByTagName('sheet')[0].getAttribute('r:id'), rel = P(await z('xl/_rels/workbook.xml.rels'));
    const r = [...rel.getElementsByTagName('Relationship')].find(x => x.getAttribute('Id') === rid); if (r) { const t = r.getAttribute('Target'); yol = t.startsWith('/') ? t.slice(1) : 'xl/' + t; } } catch (e) {}
  const sx = await z(yol); if (!sx) throw new Error('sayfa');
  const R = [];
  [...P(sx).getElementsByTagName('row')].forEach(row => {
    const satir = [];
    [...row.getElementsByTagName('c')].forEach((c, i) => {
      const ref = c.getAttribute('r') || '', h = (ref.match(/^[A-Z]+/) || [''])[0];
      const col = h ? [...h].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1 : i;
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0];
      let val = t === 's' ? SS[+(v && v.textContent)] : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : v ? v.textContent : '';
      satir[col] = val ?? '';
    });
    const rn = +row.getAttribute('r') || R.length + 1; R[rn - 1] = [...satir].map(x => x ?? '');
  });
  return [...R].map(x => x || []);
}
function csvOku(txt) {
  txt = txt.replace(/^﻿/, ''); const ilk = txt.split(/\r?\n/)[0] || '';
  const ayr = [';', '\t', ','].sort((a, b) => ilk.split(b).length - ilk.split(a).length)[0];
  const R = []; let s = [], h = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { h += '"'; i++; } else q = false; } else h += c; }
    else if (c === '"') q = true; else if (c === ayr) { s.push(h); h = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; s.push(h); R.push(s); s = []; h = ''; }
    else h += c;
  }
  if (h !== '' || s.length) { s.push(h); R.push(s); }
  return R;
}
async function dosyaSatirlar(f) {
  const buf = await f.arrayBuffer(), b = new Uint8Array(buf, 0, 2);
  if (b[0] === 0x50 && b[1] === 0x4b) return xlsxOku(buf);
  let t = new TextDecoder('utf-8').decode(buf); if (t.includes('�')) t = new TextDecoder('windows-1254').decode(buf);
  return csvOku(t);
}
function csvIndir(ad, R) {
  const csv = '﻿' + R.map(r => r.map(v => { v = String(v ?? ''); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = ad; a.click();
}
function dosyaSec(kabul, cb) { const i = document.createElement('input'); i.type = 'file'; i.accept = kabul; i.onchange = () => i.files[0] && cb(i.files[0]); i.click(); }
