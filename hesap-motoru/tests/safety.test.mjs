import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkProgressiveSafetyGear, checkGovernor, checkBuffers } from '../src/safety.mjs';
import { STATUS } from '../src/core.mjs';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b} (tol ${tol})`);
const byId = (results, id) => results.find((r) => r.ruleId === id);

// ---- kademeli emniyet tertibatı (EN 81-50 5.3.3.3.1, 5.3.4 a) ------------------------------------------
const sg = (over = {}) => ({
  testBrakingForcesN: [20000, 21000, 19000, 20000], // F_B = 20000
  testedMassKg: 1400,
  testAverageDecelerationsGn: [0.6, 0.62, 0.58, 0.6],
  P: 800,
  Q: 450, // P+Q = 1250 ; F_B/16 = 1250
  ratedLoadAverageDecelerationGn: 0.55,
  ...over,
});

test('F_B/16 ve tam eşleşme: sapma 0 → PASS', () => {
  const r = byId(checkProgressiveSafetyGear(sg()), 'SG-001');
  near(r.values.FB.value, 20000);
  near(r.values.permissibleMass.value, 1250);
  near(r.values.relativeDeviation.value, 0);
  assert.equal(r.status, STATUS.PASS);
});

test('±%7,5 sınırı iki yönde: tam sınır geçer, aşan kalır', () => {
  const hi = byId(checkProgressiveSafetyGear(sg({ P: 800, Q: 1250 * 1.075 - 800 })), 'SG-001');
  assert.equal(hi.status, STATUS.PASS);
  const hiOver = byId(checkProgressiveSafetyGear(sg({ Q: 1250 * 1.076 - 800 })), 'SG-001');
  assert.equal(hiOver.status, STATUS.FAIL);
  const lo = byId(checkProgressiveSafetyGear(sg({ Q: 1250 * 0.925 - 800 })), 'SG-001');
  assert.equal(lo.status, STATUS.PASS);
  const loUnder = byId(checkProgressiveSafetyGear(sg({ Q: 1250 * 0.924 - 800 })), 'SG-001');
  assert.equal(loUnder.status, STATUS.FAIL);
});

test('Dört deney zorunlu; ±%25 aşan sapmada F_B belirlenemez → BLOKE', () => {
  const three = byId(checkProgressiveSafetyGear(sg({ testBrakingForcesN: [20000, 21000, 19000] })), 'SG-001');
  assert.equal(three.status, STATUS.BLOCKED);
  const wide = byId(checkProgressiveSafetyGear(sg({ testBrakingForcesN: [10000, 20000, 25000, 25000] })), 'SG-001');
  assert.equal(wide.status, STATUS.BLOCKED);
  // tam %25 (ortalama 20000: 15000 ve 25000)
  const edge = byId(checkProgressiveSafetyGear(sg({ testBrakingForcesN: [15000, 25000, 20000, 20000] })), 'SG-001');
  assert.notEqual(edge.status, STATUS.BLOCKED);
});

test('F_B/16 > deney kütlesi: yavaşlama ≤ 1 gₙ kanıtı varsa deney kütlesi alınır, yoksa BLOKE', () => {
  const ok = byId(checkProgressiveSafetyGear(sg({ testedMassKg: 1000, P: 600, Q: 400 })), 'SG-001');
  near(ok.values.permissibleMass.value, 1000);
  assert.equal(ok.status, STATUS.PASS);
  const none = byId(checkProgressiveSafetyGear(sg({ testedMassKg: 1000, testAverageDecelerationsGn: undefined })), 'SG-001');
  assert.equal(none.status, STATUS.BLOCKED);
  const over = byId(checkProgressiveSafetyGear(sg({ testedMassKg: 1000, testAverageDecelerationsGn: [0.9, 1.2, 0.8, 0.9] })), 'SG-001');
  assert.equal(over.status, STATUS.BLOCKED);
});

test('Anma yükünde ortalama yavaşlama 0,2–1,0 gₙ (sınırlar dahil)', () => {
  for (const [a, expected] of [[0.2, STATUS.PASS], [1.0, STATUS.PASS], [0.19, STATUS.FAIL], [1.01, STATUS.FAIL]]) {
    assert.equal(byId(checkProgressiveSafetyGear(sg({ ratedLoadAverageDecelerationGn: a })), 'SG-002').status, expected, String(a));
  }
});

// ---- hız regülatörü (EN 81-20 5.6.2.2.1) -------------------------------------------------------------------
const gov = (over = {}) => ({
  ratedSpeedMps: 1.0,
  gearType: 'progressive',
  tripSpeedMps: 1.3,
  gearActuationForceN: 200,
  governorRopeForceN: 450,
  pulleyDiameterMm: 240,
  ropeDiameterMm: 6,
  ropeMinimumBreakingLoadN: 20000,
  ...over,
});

test('Devreye girme hızı: alt sınır dahil, üst sınır hariç', () => {
  assert.equal(byId(checkGovernor(gov({ tripSpeedMps: 1.15 })), 'GOV-001').status, STATUS.PASS);
  assert.equal(byId(checkGovernor(gov({ tripSpeedMps: 1.149 })), 'GOV-001').status, STATUS.FAIL);
  assert.equal(byId(checkGovernor(gov({ tripSpeedMps: 1.4999 })), 'GOV-001').status, STATUS.PASS);
  assert.equal(byId(checkGovernor(gov({ tripSpeedMps: 1.5 })), 'GOV-001').status, STATUS.FAIL);
});

test('Üst sınır tertibat tipine ve hıza göre', () => {
  // v > 1: 1,25·v + 0,25/v ; v = 1,6 → 2,15625
  const a = byId(checkGovernor(gov({ ratedSpeedMps: 1.6, tripSpeedMps: 2.1 })), 'GOV-001');
  near(a.values.upper.value, 1.25 * 1.6 + 0.25 / 1.6);
  assert.equal(a.status, STATUS.PASS);
  assert.equal(byId(checkGovernor(gov({ ratedSpeedMps: 1.6, tripSpeedMps: 2.2 })), 'GOV-001').status, STATUS.FAIL);
  // anlık tertibat: < 0,8 m/s (v = 0,5 → alt sınır 0,575)
  const inst = gov({ ratedSpeedMps: 0.5, gearType: 'instantaneous', tripSpeedMps: 0.79 });
  assert.equal(byId(checkGovernor(inst), 'GOV-001').status, STATUS.PASS);
  assert.equal(byId(checkGovernor({ ...inst, tripSpeedMps: 0.8 }), 'GOV-001').status, STATUS.FAIL);
  // kenetli makaralı anlık: < 1,0 m/s
  const cap = gov({ ratedSpeedMps: 0.63, gearType: 'instantaneous-captive-roller', tripSpeedMps: 0.99 });
  assert.equal(byId(checkGovernor(cap), 'GOV-001').status, STATUS.PASS);
});

test('Regülatör halat kuvveti ≥ max(2F, 300 N)', () => {
  // 2·200 = 400 → gereken 400
  assert.equal(byId(checkGovernor(gov({ governorRopeForceN: 400 })), 'GOV-002').status, STATUS.PASS);
  assert.equal(byId(checkGovernor(gov({ governorRopeForceN: 399 })), 'GOV-002').status, STATUS.FAIL);
  // küçük tertibat kuvveti: 300 N tabanı
  const low = checkGovernor(gov({ gearActuationForceN: 100, governorRopeForceN: 300 }));
  assert.equal(byId(low, 'GOV-002').status, STATUS.PASS);
  near(byId(low, 'GOV-002').values.required.value, 300);
});

test('Regülatör halatı: D/d ≥ 30 ve güvenlik katsayısı ≥ 8 (sınırlar)', () => {
  assert.equal(byId(checkGovernor(gov({ pulleyDiameterMm: 180, ropeDiameterMm: 6, governorRopeForceN: 450, ropeMinimumBreakingLoadN: 3600 })), 'GOV-003').status, STATUS.PASS);
  assert.equal(byId(checkGovernor(gov({ pulleyDiameterMm: 179, ropeDiameterMm: 6, ropeMinimumBreakingLoadN: 3600 })), 'GOV-003').status, STATUS.FAIL);
  assert.equal(byId(checkGovernor(gov({ ropeMinimumBreakingLoadN: 3599 })), 'GOV-003').status, STATUS.FAIL);
});

test('Regülatör: eksik girdi BLOKE, tertibat tipi verilmeden hesap yapılmaz', () => {
  const g = gov();
  delete g.gearType;
  assert.equal(byId(checkGovernor(g), 'GOV-001').status, STATUS.BLOCKED);
});

// ---- tamponlar (EN 81-20 5.8) -------------------------------------------------------------------------------
const cert = (over = {}) => ({
  model: 'XYZ-10',
  projectModel: 'xyz 10',
  minMassKgPerBuffer: 300,
  maxMassKgPerBuffer: 2500,
  maxSpeedMps: 1.0,
  certificateRef: 'SERT-001',
  productionEvidenceRef: 'C2-2026-77',
  ...over,
});
const buf = (over = {}) => ({
  ratedSpeedMps: 1.0,
  bufferType: 'dissipating',
  material: 'hydraulic',
  strokeMm: 100,
  load: { massKg: 2000, count: 2 },
  certificate: cert(),
  ...over,
});

test('Enerji dağıtan strok: s ≥ 0,0674·v² ; sınır dahil', () => {
  const min = 0.0674 * 1.0 ** 2 * 1000; // 67,4 mm
  const r = byId(checkBuffers(buf({ strokeMm: min })), 'BUF-002');
  near(r.values.minimumStroke.value, 67.4, 1e-9);
  assert.equal(r.status, STATUS.PASS);
  assert.equal(byId(checkBuffers(buf({ strokeMm: min - 0.01 })), 'BUF-002').status, STATUS.FAIL);
});

test('Doğrusal enerji biriktiren: s ≥ max(0,135·v², 65 mm)', () => {
  // v = 0,5 → 0,135·0,25 = 33,75 mm → taban 65 mm
  const a = byId(checkBuffers(buf({ ratedSpeedMps: 0.5, bufferType: 'linear-storing', material: 'polyurethane', strokeMm: 65, certificate: cert({ maxSpeedMps: 1 }) })), 'BUF-002');
  near(a.values.minimumStroke.value, 65);
  assert.equal(a.status, STATUS.PASS);
  // v = 1,0 → 135 mm
  const b = byId(checkBuffers(buf({ bufferType: 'linear-storing', material: 'polyurethane', strokeMm: 134 })), 'BUF-002');
  near(b.values.minimumStroke.value, 135);
  assert.equal(b.status, STATUS.FAIL);
});

test('Azaltılmış strok: v > 2,5 m/s ve son durak yavaşlaması izleniyorsa max(v_temas²/(2g), 420 mm)', () => {
  const r = byId(
    checkBuffers(buf({ ratedSpeedMps: 3.0, slowdownMonitored: true, contactSpeedMps: 2.5, strokeMm: 420, certificate: cert({ maxSpeedMps: 3 }) })),
    'BUF-002',
  );
  near(r.values.minimumStroke.value, Math.max((2.5 ** 2 / (2 * 9.81)) * 1000, 420)); // 318,3 → 420
  assert.equal(r.status, STATUS.PASS);
  const noMonitor = byId(checkBuffers(buf({ ratedSpeedMps: 3.0, strokeMm: 420, certificate: cert({ maxSpeedMps: 3 }) })), 'BUF-002');
  near(noMonitor.values.minimumStroke.value, 0.0674 * 9 * 1000); // 606,6
  assert.equal(noMonitor.status, STATUS.FAIL);
  const noContact = byId(checkBuffers(buf({ ratedSpeedMps: 3.0, slowdownMonitored: true, strokeMm: 700 })), 'BUF-002');
  assert.equal(noContact.status, STATUS.BLOCKED);
});

test('Doğrusal olmayan enerji biriktiren: strok formülü yok → REVIEW', () => {
  const r = byId(checkBuffers(buf({ bufferType: 'nonlinear-storing', material: 'polyurethane' })), 'BUF-002');
  assert.equal(r.status, STATUS.REVIEW);
});

test('Enerji biriktiren tampon yalnız v ≤ 1 m/s; enerji dağıtan her hız (5.8.1.5/6)', () => {
  assert.equal(byId(checkBuffers(buf({ ratedSpeedMps: 1.2, bufferType: 'linear-storing', material: 'polyurethane' })), 'BUF-001').status, STATUS.FAIL);
  assert.equal(byId(checkBuffers(buf({ ratedSpeedMps: 1.2, bufferType: 'nonlinear-storing' })), 'BUF-001').status, STATUS.FAIL);
  assert.equal(byId(checkBuffers(buf({ ratedSpeedMps: 1.2, strokeMm: 200 })), 'BUF-001').status, STATUS.PASS);
  assert.equal(byId(checkBuffers(buf({ ratedSpeedMps: 1.0, bufferType: 'linear-storing', material: 'polyurethane' })), 'BUF-001').status, STATUS.PASS);
});

test('AVES filtresi (v ≥ 1,6 hidrolik): kaynak sınıfı AVES politikası, polimer tampon FAIL', () => {
  const pol = { enabled: true, hydraulicAtOrAboveMps: 1.6 };
  const ok = byId(checkBuffers(buf({ ratedSpeedMps: 1.6, strokeMm: 200, avesPolicy: pol, certificate: cert({ maxSpeedMps: 2 }) })), 'BUF-001');
  assert.equal(ok.status, STATUS.PASS);
  assert.equal(ok.source.sourceClass, 'AVES_POLITIKASI');
  const bad = byId(checkBuffers(buf({ ratedSpeedMps: 1.6, material: 'other', avesPolicy: pol })), 'BUF-001');
  assert.equal(bad.status, STATUS.FAIL);
});

test('Sertifika kapısı: model birebir, tampon başına kütle ve hız aralığı', () => {
  assert.equal(byId(checkBuffers(buf()), 'BUF-003').status, STATUS.PASS);
  assert.equal(byId(checkBuffers(buf({ certificate: cert({ projectModel: 'XYZ-12' }) })), 'BUF-003').status, STATUS.FAIL);
  assert.equal(byId(checkBuffers(buf({ load: { massKg: 5200, count: 2 } })), 'BUF-003').status, STATUS.FAIL); // 2600 > 2500
  assert.equal(byId(checkBuffers(buf({ load: { massKg: 500, count: 2 } })), 'BUF-003').status, STATUS.FAIL); // 250 < 300
  assert.equal(byId(checkBuffers(buf({ ratedSpeedMps: 1.2, certificate: cert({ maxSpeedMps: 1.0 }) })), 'BUF-003').status, STATUS.FAIL);
});

test('Üretim uygunluğu/izlenebilirlik kanıtı yoksa PASS yerine REVIEW; sertifika yoksa BLOKE', () => {
  assert.equal(byId(checkBuffers(buf({ certificate: cert({ productionEvidenceRef: undefined }) })), 'BUF-003').status, STATUS.REVIEW);
  const none = buf();
  delete none.certificate;
  assert.equal(byId(checkBuffers(none), 'BUF-003').status, STATUS.BLOCKED);
});

test('Beyan strok normatif asgarinin altındaysa FAIL; not üretici satırını kabul etmenin norm olmadığını söyler', () => {
  // 2,0 m/s için formül 269,6 mm; beyan 247 mm
  const r = byId(checkBuffers(buf({ ratedSpeedMps: 2.0, strokeMm: 247, certificate: cert({ maxSpeedMps: 2 }) })), 'BUF-002');
  near(r.values.minimumStroke.value, 269.6, 1e-9);
  assert.equal(r.status, STATUS.FAIL);
  assert.ok(r.notes.some((n) => n.includes('norm yerine geçmez')));
});
