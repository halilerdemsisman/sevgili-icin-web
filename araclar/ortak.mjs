// Araçlarda ortak kullanılan yardımcılar.

// Kod içinde katalog ve maskelerin yerine konan işaretler (geçerli JS olarak kalır)
export const KATALOG_ISARET = '/*@katalog*/null';
export const MASKE_ISARET = '/*@maskeler*/null';

// Python json.dumps(ensure_ascii=False) ile aynı biçim: ", " ve ": " ayraçları.
// Orijinal HTML'ler bu biçimle üretildiği için byte byte aynı çıktı için gerekli.
export function pyJson(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return '[' + v.map(pyJson).join(', ') + ']';
  if (typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + pyJson(x)).join(', ') + '}';
  return JSON.stringify(v);
}
