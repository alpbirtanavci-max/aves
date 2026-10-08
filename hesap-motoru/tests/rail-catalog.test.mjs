import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVERA_SUPER_CATALOG,
  SAVERA_SUPER_COMPONENT_ID,
  calculateRailStock,
  findSaveraSuperProfile,
  resolveRailInput,
} from '../src/rail-catalog.mjs';
import { carRailForces } from '../src/rails.mjs';
import { runCalculations } from '../src/engine.mjs';
import { STATUS } from '../src/core.mjs';

const g = 9.81;
const byId = (results, id) => results.find((r) => r.ruleId === id);

test('Savera Super Rev. 08/26 profil kataloğu kaynak izini ve 23 benzersiz profili korur', () => {
  assert.equal(SAVERA_SUPER_CATALOG.profiles.length, 23);
  assert.equal(new Set(SAVERA_SUPER_CATALOG.profiles.map((p) => p.designation)).size, 23);
  assert.equal(SAVERA_SUPER_CATALOG.source_evidence.revision, 'Rev. 08/26');
  assert.equal(SAVERA_SUPER_CATALOG.source_evidence.sha256, '4e630bafce661b9c7722d0e42d79715b79c79837d50abbc56db64128b23ed2c7');
  assert.equal(SAVERA_SUPER_CATALOG.source_evidence.independent_review, 'PENDING');
  assert.deepEqual(
    SAVERA_SUPER_CATALOG.material_characteristics_by_catalogue_group.slice(-2).map((row) => row.group),
    ['machined blade ≤16 mm', 'machined blade >16 mm'],
  );
  assert.equal(findSaveraSuperProfile('T89/A').mass_kg_per_m, 12.38);
});

test('Üretici Wxx/Wyy tablosu cm³ → mm³ dönüşümüyle aynıdır (23 profil, PDF s. 6)', () => {
  const expected = {
    'T45/A': [2530, 1710], 'T50/A': [3150, 2100], 'T65/A': [5440, 3360],
    'T70/A': [9169, 5389], 'T70-70-9/A': [10790, 7020], 'T75/A': [9286, 7060],
    'T80-80-9/A': [14210, 9700], 'T82/A': [10270, 7358], 'T89/A': [14350, 11780],
    'T90/A': [20860, 11660], 'T125-L1/A': [10970, 17260], 'T75/B': [9286, 7060],
    'T78/B': [7564, 6766], 'T82/B': [10270, 7358], 'T89/B': [14350, 11780],
    'T90/B': [20860, 11660], 'T114/B': [29700, 19050], 'T125/B': [26160, 25460],
    'T127-1/B': [30650, 23610], 'T127-2/B': [31170, 36200], 'T140-1/B': [53320, 44240],
    'T140-2/B': [68010, 51180], 'T140-3/B': [114400, 66670],
  };
  assert.deepEqual(Object.keys(expected).sort(), SAVERA_SUPER_CATALOG.profiles.map((p) => p.designation).sort());
  for (const profile of SAVERA_SUPER_CATALOG.profiles) {
    assert.deepEqual([profile.Wxx_mm3, profile.Wyy_mm3], expected[profile.designation], profile.designation);
  }
});

test('5 m ray adedi seyirden yukarı yuvarlanır; paralel ray hattı sayısından ayrıdır', () => {
  assert.deepEqual(calculateRailStock(5), { sectionsPerLine: 1, nominalLineLengthM: 5 });
  assert.deepEqual(calculateRailStock(5.001), { sectionsPerLine: 2, nominalLineLengthM: 10 });
  assert.deepEqual(calculateRailStock(30), { sectionsPerLine: 6, nominalLineLengthM: 30 });
  assert.deepEqual(calculateRailStock(31), { sectionsPerLine: 7, nominalLineLengthM: 35 });
  assert.equal(calculateRailStock(0), null);
});

function catalogCarInput(over = {}) {
  return {
    railCatalog: { componentId: SAVERA_SUPER_COMPONENT_ID, designation: 'T89/A' },
    rails: { n: 2, shoeSpacingMm: 3000, bracketSpacingMm: 2000 },
    travelHeightM: 31,
    material: { RmN_mm2: 450, A5pct: 14, evidenceRef: 'SENTETIK-TEST-DEGERI' },
    safetyDevice: 'progressive',
    supportPath: { type: 'direct-masonry-wall' },
    shoe: { type: 'roller' },
    car: {
      Dx: 1100, Dy: 1400, P: 900, Q: 630,
      C: { x: 550, y: 0 }, Pcg: { x: 520, y: -20 }, S: { x: 550, y: 0 },
      doors: [{ x: 1100, y: 0 }], liftClass: 'passenger',
    },
    ...over,
  };
}

test('Savera seçimi geometriyi/kütleyi doldurur, 5 m metrajını türetir; Rm/A5 belgesini uydurmaz', () => {
  const resolved = resolveRailInput(catalogCarInput());
  assert.equal(resolved.profile.designation, 'T89/A');
  assert.equal(resolved.profile.WxMm3, 14350);
  assert.equal(resolved.profile.WyMm3, 11780);
  assert.equal(resolved.profile.neckWidthCMm, 10);
  assert.equal(resolved.profile.headHeightH1Mm, 62);
  assert.equal(resolved.profile.footDepthFMm, 11);
  assert.equal(resolved.rails.n, 2); // Paralel ray hattı adedi; 5 m parça sayısı değildir.
  assert.equal(resolved.rails.unitMassKgPerM, 12.38);
  assert.equal(resolved.rails.stockSectionsPerLine, 7);
  assert.equal(resolved.rails.lineLengthM, 35);
  assert.equal(resolved.material.RmN_mm2, 450); // Sentetik/parti belgesi girdisi katalogdan gelmez.
  assert.equal(resolved.catalogTraceability.sourceSha256, SAVERA_SUPER_CATALOG.source_evidence.sha256);

  const normal = carRailForces(resolved)[0];
  assert.ok(Math.abs(normal.Fv - (12.38 * 35 * g)) < 1e-9);
});

test('Bilinmeyen katalog profili elle profile fallback yapmaz; ray hesapları bloke kalır', () => {
  const results = runCalculations({
    carRails: catalogCarInput({
      railCatalog: { componentId: SAVERA_SUPER_COMPONENT_ID, designation: 'T999/A' },
      profile: { areaMm2: 9999, IxMm4: 9999, IyMm4: 9999, WxMm3: 9999, WyMm3: 9999, ixMm: 50, iyMm: 50 },
    }),
    traction: { ratedSpeedMps: 1.0 },
  }).results;
  assert.equal(byId(results, 'RAIL-C-02').status, STATUS.BLOCKED);
  assert.equal(byId(results, 'RAIL-C-06').status, STATUS.BLOCKED);
});

test('Katalog hız sınırında profil yalnız teknik inceleme olur; aşım katalog kriterini sağlamaz', () => {
  const makeResults = (ratedSpeedMps) => runCalculations({
    carRails: catalogCarInput(),
    traction: { ratedSpeedMps },
  }).results;
  const within = byId(makeResults(1.0), 'RAIL-C-06');
  assert.equal(within.status, STATUS.REVIEW);
  assert.equal(within.values.sectionsPerRailLine.value, 7);
  assert.equal(within.values.nominalRailLengthPerLineM.value, 35);
  assert.equal(within.values.nominalRailMassPerLineKg.value, 433.3);
  assert.equal(byId(makeResults(1.01), 'RAIL-C-06').status, STATUS.FAIL);
  assert.equal(byId(makeResults(undefined), 'RAIL-C-06').status, STATUS.BLOCKED);
});

test('Katalog seçimiyle çelişen elle kütle/metraj değerleri sessizce kullanılmaz', () => {
  const results = runCalculations({
    carRails: catalogCarInput({ rails: { n: 2, shoeSpacingMm: 3000, bracketSpacingMm: 2000, unitMassKgPerM: 99 } }),
    traction: { ratedSpeedMps: 1.0 },
  }).results;
  assert.equal(byId(results, 'RAIL-C-02').status, STATUS.BLOCKED);
  assert.equal(byId(results, 'RAIL-C-06').status, STATUS.BLOCKED);
});
