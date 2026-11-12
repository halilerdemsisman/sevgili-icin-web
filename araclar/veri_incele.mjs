// Canlı sunucu verisinin (sunucu/veri.json) yedeğini alır ve özetini çıkarır.
// Faz 1 veri göçünden önce verinin durumunu görmek için. Kaynak dosyayı DEĞİŞTİRMEZ.
// Kişisel veri yazdırmaz; yalnızca sayılar, boyutlar ve uyarılar.
//
// Kullanım:
//   node araclar/veri_incele.mjs [veri.sqlite veya veri.json yolu] [--yedek-klasoru yedekler] [--md rapor.md]
// Varsayılan yol: sunucu/veri.sqlite (yoksa veri.json)   Varsayılan yedek klasörü: yedekler/ (git'e girmez)
// SQLite okumak için Node 22.5+ gerekir.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2);
const secenek = ad => { const i = arg.indexOf(ad); if (i < 0) return null; const v = arg[i + 1]; arg.splice(i, 2); return v; };
const yedekKlasoru = secenek('--yedek-klasoru') || path.join(KOK, 'yedekler');
const mdYolu = secenek('--md');
const vars = ['veri.sqlite', 'veri.json'].map(f => path.join(KOK, 'sunucu', f)).find(f => fs.existsSync(f)) || path.join(KOK, 'sunucu', 'veri.sqlite');
const dosya = arg[0] || vars;

if (!fs.existsSync(dosya)) { console.error('Dosya yok:', dosya); process.exit(1); }

// 1) Yedek
fs.mkdirSync(yedekKlasoru, { recursive: true });
const damga = new Date().toISOString().replace(/[:.]/g, '-');
const sqliteMi = /\.sqlite$/.test(dosya);
// SQLite: tutarlı kopya için sunucunun depo modülüyle okunup JSON (eski biçim) olarak yedeklenir
const { veriOku } = sqliteMi ? createRequire(import.meta.url)(path.join(KOK, 'sunucu', 'lib', 'depo.js')) : {};
const yedek = path.join(yedekKlasoru, `veri-${damga}.json`);
if (sqliteMi) fs.writeFileSync(yedek, JSON.stringify(veriOku(dosya))); else fs.copyFileSync(dosya, yedek);

// 2) Oku
const D = sqliteMi ? veriOku(dosya) : JSON.parse(fs.readFileSync(dosya, 'utf8'));
const V = D.veri || {};
const oku = (k, v) => { try { return V[k] == null ? v : JSON.parse(V[k]); } catch { return v; } };
const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1024).toFixed(1) + ' KB';
const say = x => Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : typeof x === 'string' ? 1 : 0;
const gruplu = (L, a) => L.reduce((m, x) => (m[x?.[a] ?? '—'] = (m[x?.[a] ?? '—'] || 0) + 1, m), {});
const grupYaz = g => Object.entries(g).map(([k, n]) => `${k}: ${n}`).join(', ') || '—';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const uyarilar = [];
const satirlar = [];
const yaz = s => satirlar.push(s);

yaz(`# Sunucu verisi özeti`);
yaz(`\n- Dosya: \`${path.relative(KOK, dosya) || dosya}\` (${kb(fs.statSync(dosya).size)})`);
yaz(`- Yedek: \`${path.relative(KOK, yedek)}\``);
yaz(`- Son değişiklik: ${D.zaman ? new Date(D.zaman).toLocaleString('tr-TR') : '—'}`);

// Tarayıcı kotası: her istemci tüm ortak anahtarları localStorage'a yazar (Chromium'da ölçülen sınır ~8 milyon karakter)
const YEREL = /^(exb-dil|exb-oturum|exs-oturum|exs-ai-anahtar|exit-tema|exb-kars)$/;
const ortakKarakter = Object.entries(V).filter(([k]) => /^ex[bs]-/.test(k) && !YEREL.test(k)).reduce((t, [k, v]) => t + k.length + String(v).length, 0);
const KOTA = 8e6;
yaz(`- Tarayıcıya inen ortak veri: ${(ortakKarakter / 1e6).toFixed(2)} milyon karakter (sınırın %${Math.round(ortakKarakter / KOTA * 100)}'i; sınır ~8 milyon)`);
if (ortakKarakter > KOTA * 0.7) uyarilar.push(`Ortak veri tarayıcı kotasının %${Math.round(ortakKarakter / KOTA * 100)}'inde. Sınır aşılınca kayıtlar tarayıcıya sessizce yüklenmez (rapor V2).`);

// Anahtar tablosu
yaz(`\n## Anahtarlar (${Object.keys(V).length})\n\n| Anahtar | Boyut | Kayıt |\n|---|---:|---:|`);
Object.entries(V).sort((a, b) => String(b[1]).length - String(a[1]).length).forEach(([k, v]) => yaz(`| \`${k}\` | ${kb(String(v).length)} | ${say(oku(k))} |`));

// Kullanıcılar
const BK = oku('exb-kullanicilar', {}), SK = oku('exs-kullanicilar', {}), MUS = oku('exs-musteriler', {});
yaz(`\n## Kullanıcılar\n\n- Bayi hesabı: ${say(BK)} · satış müşteri kartı: ${say(MUS)} (örnek veri: ${Object.keys(MUS).filter(k => k.startsWith('ornek-')).length})`);
yaz(`- Satış kullanıcısı (yönetici + temsilci): ${say(SK)}`);
if (Object.values(SK).some(u => u && u.sifre === sha('exitsatis:1234'))) uyarilar.push('Varsayılan satış şifresi (1234) özetli hesap var. Sunucu bu hesapla girişe izin vermez; yönetici şifresini belirleyin: node sunucu/sunucu.js --yonetici-sifre YENI_SIFRE');
const eskiOzet = L => Object.values(L).filter(u => u && u.sifre && !String(u.sifre).startsWith('scrypt$')).length;
yaz(`- Şifresi eski biçimde (tarayıcıda üretilmiş sha256) olan hesap: bayi ${eskiOzet(BK)}, satış ${eskiOzet(SK)} · ilk girişte otomatik olarak scrypt'e yükseltilir`);
const bayiYok = Object.keys(MUS).filter(k => !k.startsWith('ornek-') && !BK[k]);
if (bayiYok.length) uyarilar.push(`${bayiYok.length} müşteri kartının bayi hesabı yok (satışın elle açtığı kart olabilir).`);

// Siparişler
const BS = oku('exb-siparisler', []), SS = oku('exs-siparisler', {});
yaz(`\n## Siparişler\n\n- Bayi tarafı (\`exb-siparisler\`): ${BS.length} · durum: ${grupYaz(gruplu(BS, 'durum'))}`);
yaz(`- Satış tarafı (\`exs-siparisler\`): ${say(SS)} · durum: ${grupYaz(gruplu(Object.values(SS), 'durum'))}`);
const noSay = gruplu(BS, 'no'), mukerrer = Object.entries(noSay).filter(([, n]) => n > 1);
if (mukerrer.length) uyarilar.push(`Bayi siparişlerinde mükerrer numara: ${mukerrer.map(([k, n]) => `${k} (${n})`).join(', ')}`);
const sadeceBayi = BS.filter(o => !SS[o.no]).length, sadeceSatis = Object.keys(SS).filter(n => !n.startsWith('ORN-') && !BS.some(o => o.no === n)).length;
yaz(`- Yalnız bayi tarafında: ${sadeceBayi} · yalnız satış tarafında (örnekler hariç): ${sadeceSatis}`);
const yil = gruplu(BS.map(o => ({ y: (String(o.no).match(/-(\d{4})-/) || [])[1] })), 'y');
yaz(`- Yıllara göre bayi siparişi: ${grupYaz(yil)}`);
const durumFarki = BS.filter(o => SS[o.no] && SS[o.no].durum !== o.durum).length;
if (durumFarki) uyarilar.push(`${durumFarki} siparişte bayi ve satış tarafındaki durum farklı.`);

// Ödemeler ve dosyalar
const OD = oku('exb-odeme', []), IA = oku('exb-iade', []);
const dosyaBoyut = L => L.reduce((t, x) => { const d = JSON.stringify(x).match(/data:[^"]+/g) || []; return t + d.reduce((a, s) => a + s.length, 0); }, 0);
const dekontlu = OD.filter(x => x.dosya).length;
yaz(`\n## Ödemeler ve dosyalar\n\n- Ödeme kaydı: ${OD.length} · durum: ${grupYaz(gruplu(OD, 'durum'))} · online: ${OD.filter(x => x.online).length}`);
yaz(`- Dekont dosyası: ${dekontlu} (${kb(dosyaBoyut(OD))}) · iade/şikâyet: ${IA.length} (fotoğraflar ${kb(dosyaBoyut(IA))})`);
const odNo = Object.entries(gruplu(OD, 'no')).filter(([, n]) => n > 1);
if (odNo.length) uyarilar.push(`Ödeme kayıtlarında mükerrer numara: ${odNo.map(([k]) => k).join(', ')}`);
const LNK = oku('exb-odeme-link', {});
yaz(`- Ödeme linki tanımlı bayi: ${say(LNK)}`);

// Diğer
yaz(`\n## Diğer\n`);
for (const [k, ad] of [['exb-teklif', 'Özel teklif'], ['exb-numune', 'Numune talebi'], ['exb-hatirlat', 'Bayiye mesaj'], ['exb-duyuru', 'Duyuru'], ['exb-kampanya', 'Kampanya'], ['exs-crm', 'CRM (bayi)'], ['exs-islem', 'İşlem kaydı']]) {
  const x = oku(k); if (x == null) continue;
  yaz(`- ${ad}: ${say(x)}${Array.isArray(x) && x.some(y => y && y.durum) ? ' · ' + grupYaz(gruplu(x, 'durum')) : ''}`);
}
const kisisel = Object.keys(V).filter(k => /^exb-(sepet|fav|proje|adres|bildirim)-/.test(k));
yaz(`- Bayiye özel anahtar (sepet, favori, proje, adres, bildirim): ${kisisel.length}`);

yaz(`\n## Uyarılar\n`);
yaz(uyarilar.length ? uyarilar.map(u => '- ⚠ ' + u).join('\n') : '- Yok');

const metin = satirlar.join('\n') + '\n';
console.log(metin);
if (mdYolu) { fs.writeFileSync(mdYolu, metin); console.log('Rapor yazıldı:', mdYolu); }
