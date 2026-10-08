// AVES Hesap Motoru — çekirdek: sonuç modeli, durumlar, girdi korumaları.
//
// Ürün sınırı: bu motor bir HESAP YARDIMCISIDIR. Uygunluk/belgelendirme kararı vermez.
// Bu yüzden durumlar "UYGUN/UYGUN DEĞİL" değil, hesaplanan kriterin sonucunu anlatır:
//   PASS    — hesaplanan kriter, kaynakta tanımlı sınırı sağlıyor
//   FAIL    — hesaplanan kriter sınırı sağlamıyor
//   REVIEW  — hesap yapıldı ama sonuç mühendis incelemesi olmadan kullanılamaz
//   BLOCKED — zorunlu girdi/kanıt eksik veya geçersiz; sonuç üretilmedi
// Eksik veya geçersiz veriyle hiçbir koşulda PASS üretilmez.

export const G_N = 9.81; // standart yerçekimi ivmesi, m/s² (EN 81-20:2020 5.7.2.3.5)

export const STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  REVIEW: 'REVIEW',
  BLOCKED: 'BLOCKED',
});

export const STATUS_LABEL_TR = Object.freeze({
  PASS: 'Kriter sağlandı',
  FAIL: 'Kriter sağlanmadı',
  REVIEW: 'Teknik inceleme',
  BLOCKED: 'Bloke',
});

// Kaynak sınıfları (Master Brief bölüm 4 ile uyumlu, hesap bağlamına indirgenmiş)
export const SOURCE_CLASS = Object.freeze({
  NORMATIVE: 'NORMATIF', // standart metni
  MANUFACTURER: 'URETICI_VERISI', // sertifika / katalog
  AVES_POLICY: 'AVES_POLITIKASI', // AVES'in iç kabulü; norm yerine geçmez
  ENGINEERING: 'MUHENDISLIK_KABULU', // standardın tek yöntem tarif etmediği yerde
});

const SEVERITY = { PASS: 0, REVIEW: 1, FAIL: 2, BLOCKED: 3 };

/** Birden çok durumdan en olumsuzunu döndürür (BLOCKED > FAIL > REVIEW > PASS). */
export function worstStatus(statuses) {
  let worst = STATUS.PASS;
  for (const s of statuses) {
    if (!(s in SEVERITY)) throw new Error(`Bilinmeyen durum: ${s}`);
    if (SEVERITY[s] > SEVERITY[worst]) worst = s;
  }
  return worst;
}

export const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
export const isPositive = (v) => isFiniteNumber(v) && v > 0;
export const isNonNegative = (v) => isFiniteNumber(v) && v >= 0;

/**
 * Zorunlu sayısal girdileri doğrular.
 * spec: { ad: { min?, max?, positive?, integer?, label } }
 * @returns {string[]} sorun listesi (boşsa girdiler geçerli)
 */
export function checkInputs(input, spec) {
  const problems = [];
  for (const [key, rule] of Object.entries(spec)) {
    const label = rule.label ?? key;
    const v = input?.[key];
    if (!isFiniteNumber(v)) {
      problems.push(`${label} (${key}) girilmemiş veya sayı değil`);
      continue;
    }
    if (rule.positive && !(v > 0)) problems.push(`${label} (${key}) > 0 olmalı`);
    if (rule.min !== undefined && v < rule.min) problems.push(`${label} (${key}) en az ${rule.min} olmalı`);
    if (rule.max !== undefined && v > rule.max) problems.push(`${label} (${key}) en çok ${rule.max} olmalı`);
    if (rule.integer && !Number.isInteger(v)) problems.push(`${label} (${key}) tam sayı olmalı`);
  }
  return problems;
}

/**
 * Standart sonuç kaydı. Her hesap bu biçimde döner; rapor ve arayüz aynı kaydı okur.
 * @param {object} p
 * @param {string} p.ruleId       kural kimliği (ör. SUS-003)
 * @param {string} p.title        kısa başlık
 * @param {string} p.status       STATUS.*
 * @param {object} p.source       { standard, edition, clause, sourceClass, note? }
 * @param {object} [p.values]     hesaplanan değerler (adlandırılmış, birimli: `{ ad: { value, unit } }`)
 * @param {object} [p.limit]      { description, value?, unit?, direction: 'min'|'max'|'eq' }
 * @param {number} [p.margin]     oransal marj (>0 sınır içinde); yoksa undefined
 * @param {string} [p.formula]    formül metni
 * @param {string} [p.substitution] sayısal yerine koyma
 * @param {string[]} [p.notes]
 * @param {string[]} [p.blockers] BLOCKED gerekçeleri
 * @param {object[]} [p.details]  yük durumu / konum bazında ayrıntı satırları (rapor tabloları için)
 * @param {object} [p.inputs]     kullanılan girdilerin kopyası (iz sürme)
 */
export function makeResult(p) {
  if (!(p.status in STATUS)) throw new Error(`Geçersiz durum: ${p.status}`);
  if (p.status === STATUS.PASS && p.blockers?.length) {
    throw new Error('PASS sonucu bloke gerekçesi taşıyamaz');
  }
  return {
    ruleId: p.ruleId,
    title: p.title,
    status: p.status,
    statusLabel: STATUS_LABEL_TR[p.status],
    source: p.source,
    values: p.values ?? {},
    limit: p.limit ?? null,
    margin: Number.isFinite(p.margin) ? p.margin : null,
    formula: p.formula ?? '',
    substitution: p.substitution ?? '',
    notes: p.notes ?? [],
    blockers: p.blockers ?? [],
    details: p.details ?? [],
    inputs: p.inputs ?? {},
  };
}

/** Girdi sorunu varsa BLOKE sonucu üretir. */
export function blocked({ ruleId, title, source, problems, inputs, notes }) {
  return makeResult({
    ruleId,
    title,
    status: STATUS.BLOCKED,
    source,
    blockers: problems,
    notes,
    inputs,
  });
}

/** `v` değeri `limit` sınırını sağlıyor mu? Eşitlikte sağlar (≥ veya ≤). */
export function compare(value, limit, direction) {
  if (direction === 'min') return value >= limit;
  if (direction === 'max') return value <= limit;
  throw new Error(`Bilinmeyen karşılaştırma yönü: ${direction}`);
}

/** Oransal marj: min sınırında (v−L)/L, max sınırında (L−v)/L. Pozitif = sınırın içinde. */
export function marginOf(value, limit, direction) {
  if (!isFiniteNumber(value) || !isFiniteNumber(limit) || limit === 0) return undefined;
  return direction === 'min' ? (value - limit) / limit : (limit - value) / limit;
}

/**
 * Tablo üzerinde doğrusal enterpolasyon; tablo dışı değerde ekstrapolasyon YAPMAZ (null döner).
 * @param {Array<[number, number]>} points x'e göre artan sıralı
 */
export function interpolate(points, x) {
  if (!isFiniteNumber(x)) return null;
  const first = points[0];
  const last = points[points.length - 1];
  if (x < first[0] || x > last[0]) return null;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

export const deg2rad = (d) => (d * Math.PI) / 180;
export const rad2deg = (r) => (r * 180) / Math.PI;

/** Sayıyı rapor için biçimler (Türkçe ondalık virgülü yok: makine okunur sade biçim). */
export function fmt(v, digits = 3) {
  if (!isFiniteNumber(v)) return '—';
  return Number(v.toFixed(digits)).toString();
}
