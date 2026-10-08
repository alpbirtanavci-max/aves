// Üretici ray kataloğu çözümleyicisi.
// Katalog yalnız kesit/ölçü/kütle/hız kapsamı verisidir; bitmiş ray parti Rm/A5 belgesi değildir.

import saveraSuper from '../data/components/rails/savera-super-series.json' with { type: 'json' };
import {
  STATUS,
  SOURCE_CLASS,
  isFiniteNumber,
  makeResult,
  blocked,
} from './core.mjs';

export const SAVERA_SUPER_COMPONENT_ID = 'guide_rail.savera.super';
export const RAIL_STOCK_LENGTH_M = saveraSuper.standard_bar_length_m;

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const SAVERA_SUPER_CATALOG = deepFreeze(saveraSuper);

const profileByDesignation = new Map(
  SAVERA_SUPER_CATALOG.profiles.map((profile) => [profile.designation, profile]),
);

export function findSaveraSuperProfile(designation) {
  return profileByDesignation.get(designation) ?? null;
}

/** 5 m katalog boylarından, seyir yüksekliğine göre gereken parça sayısı (ray hattı başına). */
export function calculateRailStock(travelHeightM, stockLengthM = RAIL_STOCK_LENGTH_M) {
  if (!isFiniteNumber(travelHeightM) || travelHeightM <= 0) return null;
  if (!isFiniteNumber(stockLengthM) || stockLengthM <= 0) return null;
  const sectionsPerLine = Math.ceil(travelHeightM / stockLengthM);
  return {
    sectionsPerLine,
    nominalLineLengthM: sectionsPerLine * stockLengthM,
  };
}

function toEngineProfile(profile) {
  if (!profile) return undefined;
  return {
    designation: profile.designation,
    manufacturer: SAVERA_SUPER_CATALOG.manufacturer,
    series: SAVERA_SUPER_CATALOG.series,
    process: profile.process,
    maxSpeedMps: profile.max_speed_m_s,
    areaMm2: profile.area_mm2,
    IxMm4: profile.Ixx_mm4,
    IyMm4: profile.Iyy_mm4,
    WxMm3: profile.Wxx_mm3,
    WyMm3: profile.Wyy_mm3,
    ixMm: profile.ixx_mm,
    iyMm: profile.iyy_mm,
    neckWidthCMm: profile.dimensions_mm.c,
    headHeightH1Mm: profile.dimensions_mm.h1,
    footDepthFMm: profile.dimensions_mm.f,
    unitMassKgPerM: profile.mass_kg_per_m,
  };
}

/**
 * `railCatalog` seçildiyse profile ve hat kütlesi yalnız bu katalog kaydından türetilir.
 * Elle girilen eski `profile`/kütle alanları katalog seçiminin yerine geçemez.
 */
export function resolveRailInput(input) {
  if (!input || input.railCatalog === undefined) return input;

  const errors = [];
  const selection = input.railCatalog;
  if (!selection || typeof selection !== 'object') {
    errors.push('Ray kataloğu seçimi nesne biçiminde olmalı');
  } else if (selection.componentId !== SAVERA_SUPER_COMPONENT_ID) {
    errors.push(`Desteklenmeyen ray kataloğu: ${String(selection.componentId ?? 'boş')}`);
  }

  const profile = selection?.componentId === SAVERA_SUPER_COMPONENT_ID
    ? findSaveraSuperProfile(selection.designation)
    : null;
  if (selection?.componentId === SAVERA_SUPER_COMPONENT_ID && !profile) {
    errors.push(`Savera Super profil kodu katalogda bulunamadı: ${String(selection.designation ?? 'boş')}`);
  }

  const evidence = SAVERA_SUPER_CATALOG.source_evidence;
  if (
    !evidence
    || evidence.verification_status !== 'PRIMARY_SOURCE_HASH_VERIFIED'
    || !/^[a-f0-9]{64}$/i.test(evidence.sha256 ?? '')
  ) {
    errors.push('Ray kataloğu üretici kaynağı izlenebilirlik doğrulamasından geçmedi');
  }

  const stock = profile ? calculateRailStock(input.travelHeightM) : null;
  if (profile && !stock) errors.push('Seyir yüksekliği (m), Savera 5 m ray parça adedini türetmek için gerekli');

  const originalRails = input.rails ?? {};
  if (profile && stock && isFiniteNumber(originalRails.unitMassKgPerM)
    && Math.abs(originalRails.unitMassKgPerM - profile.mass_kg_per_m) > 1e-9) {
    errors.push('Girilen ray birim kütlesi seçilen Savera katalog profiliyle çelişiyor; elle değer kullanılmadı');
  }
  if (profile && stock && isFiniteNumber(originalRails.lineLengthM)
    && Math.abs(originalRails.lineLengthM - stock.nominalLineLengthM) > 1e-9) {
    errors.push('Girilen ray hattı boyu Savera 5 m parça hesabıyla çelişiyor; elle değer kullanılmadı');
  }

  const trace = profile ? {
    componentId: SAVERA_SUPER_COMPONENT_ID,
    manufacturer: SAVERA_SUPER_CATALOG.manufacturer,
    series: SAVERA_SUPER_CATALOG.series,
    designation: profile.designation,
    catalogueRevision: SAVERA_SUPER_CATALOG.catalogue_revision,
    sourceUrl: evidence.url,
    sourceSha256: evidence.sha256,
    sourceVerifiedAt: evidence.verified_at,
    stockLengthM: RAIL_STOCK_LENGTH_M,
  } : undefined;

  return {
    ...input,
    profile: toEngineProfile(profile),
    rails: {
      ...originalRails,
      ...(profile ? { unitMassKgPerM: profile.mass_kg_per_m } : {}),
      ...(stock ? {
        lineLengthM: stock.nominalLineLengthM,
        stockSectionsPerLine: stock.sectionsPerLine,
      } : {}),
    },
    catalogResolutionErrors: errors,
    catalogTraceability: trace,
  };
}

/** Üreticinin ilan ettiği hız aralığını ayrı gösterir; bu, genel uygunluk sonucu değildir. */
export function checkRailCatalogScope(input, ratedSpeedMps, position) {
  if (!input?.railCatalog) return null;
  const isCar = position === 'car';
  const ruleId = isCar ? 'RAIL-C-06' : 'RAIL-W-06';
  const title = isCar
    ? 'Kabin rayı · Savera katalog hız kapsamı'
    : 'Karşı ağırlık rayı · Savera katalog hız kapsamı';
  const source = {
    standard: 'Savera Super üretici kataloğu',
    edition: SAVERA_SUPER_CATALOG.catalogue_revision,
    clause: 'Teknik özellikler; hız aralığı (PDF s. 2), kesit tablosu (s. 6), 5 m tedarik boyu (s. 7)',
    sourceClass: SOURCE_CLASS.MANUFACTURER,
    note: `SHA-256 ${SAVERA_SUPER_CATALOG.source_evidence.sha256}`,
  };
  const problems = input.catalogResolutionErrors ?? [];
  const profile = findSaveraSuperProfile(input.railCatalog?.designation);
  if (!profile) problems.push('Katalog profili çözümlenemedi');
  if (!isFiniteNumber(ratedSpeedMps) || ratedSpeedMps <= 0) {
    problems.push('Anma hızı (m/s) gerekli; motor girdisinden otomatik alınır');
  }
  const stock = calculateRailStock(input.travelHeightM);
  if (!stock) problems.push('Seyir yüksekliği geçerli değil; 5 m ray parça adedi türetilemedi');
  if (problems.length) return blocked({ ruleId, title, source, problems, inputs: input });

  const withinScope = ratedSpeedMps <= profile.max_speed_m_s;
  const lineMassKg = Number((profile.mass_kg_per_m * stock.nominalLineLengthM).toFixed(6));
  return makeResult({
    ruleId,
    title,
    status: withinScope ? STATUS.REVIEW : STATUS.FAIL,
    source,
    values: {
      ratedSpeedMps: { value: ratedSpeedMps, unit: 'm/s' },
      catalogueMaxSpeedMps: { value: profile.max_speed_m_s, unit: 'm/s' },
      sectionsPerRailLine: { value: stock.sectionsPerLine, unit: 'adet/hat' },
      nominalRailLengthPerLineM: { value: stock.nominalLineLengthM, unit: 'm/hat' },
      unitMassKgPerM: { value: profile.mass_kg_per_m, unit: 'kg/m' },
      nominalRailMassPerLineKg: { value: lineMassKg, unit: 'kg/hat' },
    },
    limit: { description: 'Anma hızı ≤ üreticinin profil için yayımladığı hız üst sınırı', value: profile.max_speed_m_s, unit: 'm/s', direction: 'max' },
    margin: (profile.max_speed_m_s - ratedSpeedMps) / profile.max_speed_m_s,
    formula: `Nparça/hat = ceil(Hseyir / ${RAIL_STOCK_LENGTH_M} m); Lhat = Nparça/hat × ${RAIL_STOCK_LENGTH_M} m; Mhat = m′ × Lhat`,
    substitution: `Profil=${profile.designation}; v=${ratedSpeedMps} m/s; katalog üst sınırı=${profile.max_speed_m_s} m/s; Nparça/hat=${stock.sectionsPerLine}; Lhat=${stock.nominalLineLengthM} m; m′=${profile.mass_kg_per_m} kg/m`,
    notes: [
      withinScope
        ? 'Hız, Savera kataloğundaki profil aralığında. Bu yalnız üretici katalog kapsam kontrolüdür; genel uygunluk kararı değildir.'
        : 'Anma hızı, Savera kataloğunda seçilen profil için yayımlanan üst sınırı aşıyor.',
      '5 m parça sayısı yalnız beyan edilen seyir yüksekliğinden türetilmiştir; kuyu üstü/altı uzantıları ayrıca modellenmez.',
      'Katalog mekanik aralıkları, kurulu ray partisine ait izlenebilir Rm/A5 belgesinin yerine geçmez; ilgili dayanım kıyasları bloke kalır.',
    ],
    inputs: input,
  });
}
