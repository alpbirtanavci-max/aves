import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  omega,
  railSafetyFactor,
  carRailForces,
  counterweightRailForces,
  checkCarRails,
  checkCounterweightRails,
  K1_BY_SAFETY_DEVICE,
} from '../src/rails.mjs';
import { STATUS } from '../src/core.mjs';

const g = 9.81;
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b} (tol ${tol})`);
const byId = (results, id) => results.find((r) => r.ruleId === id);

// ---- Çizelge 14 / 15 ----------------------------------------------------------------------------
test('Çizelge 14: k1 değerleri', () => {
  assert.equal(K1_BY_SAFETY_DEVICE.instantaneous, 5);
  assert.equal(K1_BY_SAFETY_DEVICE['instantaneous-captive-roller'], 3);
  assert.equal(K1_BY_SAFETY_DEVICE.progressive, 2);
});

test('Çizelge 15: emniyet katsayıları ve A5 sınırı', () => {
  assert.equal(railSafetyFactor(13, false), 2.25);
  assert.equal(railSafetyFactor(12, false), 3.75);
  assert.equal(railSafetyFactor(8, false), 3.75);
  assert.equal(railSafetyFactor(13, true), 1.8);
  assert.equal(railSafetyFactor(12, true), 3.0);
  assert.equal(railSafetyFactor(8, true), 3.0);
  assert.equal(railSafetyFactor(7.99, true), null); // gevrek
  assert.equal(railSafetyFactor(NaN, true), null);
});

// ---- ω: bağımsız yeniden hesap ---------------------------------------------------------------------
test('ω (Rm=370): aralık sınırlarında polinomlar', () => {
  near(omega(60, 370), 0.0001292 * 60 ** 1.89 + 1, 1e-12);
  near(omega(85, 370), 0.00004627 * 85 ** 2.14 + 1, 1e-12);
  near(omega(115, 370), 0.00001711 * 115 ** 2.35 + 1.04, 1e-12);
  near(omega(200, 370), 0.00016887 * 200 ** 2, 1e-12);
});

test('ω (Rm=520) ve ara değer enterpolasyonu', () => {
  near(omega(50, 520), 0.0000824 * 50 ** 2.06 + 1.021, 1e-12);
  near(omega(89, 520), 0.00002447 * 89 ** 2.36 + 1.03, 1e-12);
  near(omega(100, 520), 0.0002533 * 100 ** 2, 1e-12);
  const mid = omega(100, 445);
  near(mid, (omega(100, 370) + omega(100, 520)) / 2, 1e-12);
});

test('ω: λ ve Rm aralığı dışında null', () => {
  assert.equal(omega(19.9, 370), null);
  assert.equal(omega(250.1, 370), null);
  assert.equal(omega(100, 369), null);
  assert.equal(omega(100, 521), null);
});

// ---- kabin rayı: Ek C formüllerinin elle hesabı -----------------------------------------------------------
const T89A = {
  designation: 'T89/A',
  areaMm2: 1577,
  IxMm4: 598300,
  IyMm4: 524100,
  WxMm3: 14350,
  WyMm3: 11780,
  ixMm: 19.48,
  iyMm: 18.23,
  neckWidthCMm: 10,
  headHeightH1Mm: 62,
  footDepthFMm: 11.1,
};

function carInput(over = {}) {
  return {
    rails: { n: 2, shoeSpacingMm: 3000, bracketSpacingMm: 2000, unitMassKgPerM: 10, lineLengthM: 30 },
    profile: T89A,
    material: { RmN_mm2: 450, A5pct: 14, evidenceRef: 'SENTETIK-TEST-DEGERI (üretici beyanı değildir)' },
    safetyDevice: 'progressive',
    travelHeightM: 30,
    supportPath: { type: 'direct-masonry-wall' },
    shoe: { type: 'roller' },
    car: {
      Dx: 1100,
      Dy: 1400,
      P: 900,
      Q: 630,
      C: { x: 550, y: 0 },
      Pcg: { x: 520, y: -20 },
      S: { x: 550, y: 0 },
      doors: [{ x: 1100, y: 0 }],
      liftClass: 'passenger',
    },
    ...over,
  };
}

test('Ek C.2.1: emniyet tertibatı durumunda moment kolu ray koordinatına göre (askı noktasına göre değil)', () => {
  const [, , safety] = carRailForces(carInput());
  // Fx = k1·g·(Q·xQ + P·xP)/(n·h), xQ = xC + Dx/8 = 687,5
  const Fx = (2 * g * (630 * 687.5 + 900 * 520)) / (2 * 3000);
  near(safety.Fx, Fx, 1e-9);
  // Fy = k1·g·(Q·yQ + P·yP)/((n/2)·h), yQ = ±175 → en büyük mutlak değer yQ = −175
  const Fy = (2 * g * Math.abs(630 * -175 + 900 * -20)) / (1 * 3000);
  near(safety.Fy, Fy, 1e-9);
  // Fv = k1·g·(P+Q)/n + Mg·g (+ Fp; seyir ≤ 40 m)
  near(safety.Fv, (2 * g * (900 + 630)) / 2 + 300 * g, 1e-9);
  // askı noktasına göre alınsaydı (xP−xS, xQ−xS) çok küçük çıkardı:
  const wrong = (2 * g * (630 * 137.5 + 900 * -30)) / (2 * 3000);
  assert.ok(safety.Fx > 10 * Math.abs(wrong));
});

test('Ek C.2.2: normal çalışmada moment kolu askı noktasına göre, k2 = 1,2', () => {
  const [normal] = carRailForces(carInput());
  const cand = [137.5, -137.5].map((d) => (1.2 * g * (630 * d + 900 * (520 - 550))) / (2 * 3000));
  near(normal.Fx, Math.max(...cand.map(Math.abs)), 1e-9);
  const candY = [175, -175].map((d) => (1.2 * g * (630 * d + 900 * (-20 - 0))) / (1 * 3000));
  near(normal.Fy, Math.max(...candY.map(Math.abs)), 1e-9);
  near(normal.Fv, 300 * g, 1e-9);
});

test('Ek C.2.3: yükleme — Q yok, Fs = 0,4·g·Q sill kuvveti kapı konumunda', () => {
  const [, loading] = carRailForces(carInput());
  const Fs = 0.4 * g * 630;
  near(loading.FsN, Fs, 1e-9);
  near(loading.Fx, Math.abs((g * 900 * (520 - 550) + Fs * (1100 - 550)) / (2 * 3000)), 1e-9);
  near(loading.Fy, Math.abs((g * 900 * (-20 - 0) + Fs * (0 - 0)) / (1 * 3000)), 1e-9);
});

test('Fs sınıfa göre: yük-yolcu 0,6, ağır elleçleme 0,85', () => {
  const a = carRailForces(carInput({ car: { ...carInput().car, liftClass: 'goods-passenger' } }))[1];
  near(a.FsN, 0.6 * g * 630, 1e-9);
  const b = carRailForces(carInput({ car: { ...carInput().car, liftClass: 'goods-heavy-handling' } }))[1];
  near(b.FsN, 0.85 * g * 630, 1e-9);
});

test('Seyir > 40 m’de Fp Fv’ye eklenir; girilmemişse BLOKE', () => {
  const withFp = carRailForces(carInput({ travelHeightM: 60, pushThroughForceN: 800 }));
  near(withFp[0].Fv, 300 * g + 800, 1e-9);
  const res = checkCarRails(carInput({ travelHeightM: 60 }));
  assert.ok(res.every((r) => r.status === STATUS.BLOCKED));
});

test('Kabin rayı: gerilme el hesabı ve kontroller', () => {
  const res = checkCarRails(carInput());
  const bend = byId(res, 'RAIL-C-02');
  const buck = byId(res, 'RAIL-C-03');
  const [normal, loading, safety] = carRailForces(carInput());
  const l = 2000;
  const sig = (cs) => (3 * cs.Fx * l) / (16 * 11780) + (3 * cs.Fy * l) / (16 * 14350);
  const row = (key) => bend.details.find((r) => r.case === key);
  near(row('safety').sigmaM, sig(safety), 1e-9);
  near(row('normal').sigmaM, sig(normal), 1e-9);
  near(row('loading').sigmaM, sig(loading), 1e-9);
  // σperm: A5 = 14 > 12 → normal 2,25; emniyet 1,8 ; Rm = 450 (sentetik)
  near(row('normal').sigmaPerm, 450 / 2.25, 1e-12);
  near(row('safety').sigmaPerm, 450 / 1.8, 1e-12);
  // burkulma
  const lambda = 2000 / 18.23;
  const w = omega(lambda, 450);
  const rowB = buck.details.find((r) => r.case === 'safety');
  near(rowB.lambda, lambda, 1e-12);
  near(rowB.sigmaK, (safety.Fv / 1577) * w, 1e-9);
  assert.equal(bend.status, STATUS.PASS);
  assert.equal(buck.status, STATUS.PASS);
});

test('Sehim el hesabı: δ = 0,7·F·l³/(48·E·I) + δstr; beton duvar δstr = 0', () => {
  const res = checkCarRails(carInput());
  const d = byId(res, 'RAIL-C-05');
  const [, , safety] = carRailForces(carInput());
  const dx = (0.7 * safety.Fx * 2000 ** 3) / (48 * 210000 * 524100);
  const row = d.details.find((r) => r.case === 'safety');
  near(row.deltaX, dx, 1e-9);
  assert.equal(d.status, STATUS.PASS);
  assert.ok(d.limit.value === 5);
});

test('Çelik kiriş taşıyıcıda δstr girdisi gerekir; girilirse eklenir ve sınırı aşabilir', () => {
  const blockedRes = checkCarRails(carInput({ supportPath: { type: 'steel-beam' } }));
  assert.equal(byId(blockedRes, 'RAIL-C-05').status, STATUS.BLOCKED);
  const ok = checkCarRails(carInput({ supportPath: { type: 'steel-beam', deflectionXMm: 0.5, deflectionYMm: 0.5 } }));
  const base = checkCarRails(carInput());
  const dOk = byId(ok, 'RAIL-C-05').details.find((r) => r.case === 'safety').deltaX;
  const dBase = byId(base, 'RAIL-C-05').details.find((r) => r.case === 'safety').deltaX;
  near(dOk - dBase, 0.5, 1e-9);
  const over = checkCarRails(carInput({ supportPath: { type: 'timber-frame', deflectionXMm: 4, deflectionYMm: 4 } }));
  assert.equal(byId(over, 'RAIL-C-05').status, STATUS.FAIL);
});

test('Büyük braket aralığı → sehim ve gerilme FAIL', () => {
  const input = carInput();
  input.rails.bracketSpacingMm = 4500;
  const res = checkCarRails(input);
  assert.equal(byId(res, 'RAIL-C-05').status, STATUS.FAIL);
});

test('Flanş: döner pabuç σF = 1,85·Fx/c²; kayar pabuç formülü', () => {
  const res = checkCarRails(carInput());
  const f = byId(res, 'RAIL-C-04');
  const rowS = f.details.find((r) => r.case === 'safety');
  near(rowS.sigmaF, (1.85 * rowS.F) / 100, 1e-9);
  // kayar pabuç: b = 8, l = 100 mm
  const sl = checkCarRails(carInput({ shoe: { type: 'sliding', liningHalfWidthBMm: 8, liningLengthMm: 100 } }));
  const r = byId(sl, 'RAIL-C-04').details.find((x) => x.case === 'safety');
  const expected = (6 * r.F * (62 - 8 - 11.1)) / (100 * (100 + 2 * (62 - 11.1)));
  near(r.sigmaF, expected, 1e-9);
});

test('Flanş kuvveti tabanı: "x" yalnız Fx, "envelope" max(|Fx|,|Fy|)', () => {
  const env = byId(checkCarRails(carInput({ flangeForceBasis: 'envelope' })), 'RAIL-C-04').details.find((r) => r.case === 'safety');
  const x = byId(checkCarRails(carInput({ flangeForceBasis: 'x' })), 'RAIL-C-04').details.find((r) => r.case === 'safety');
  const [, , safety] = carRailForces(carInput());
  near(x.F, safety.Fx, 1e-9);
  near(env.F, Math.max(safety.Fx, safety.Fy), 1e-9);
});

// ---- eksik/yanlış girdi → BLOKE, PASS yok --------------------------------------------------------------
test('Rm/A5 kanıt referansı yoksa gerilme ve flanş BLOKE, sehim hesaplanır', () => {
  const res = checkCarRails(carInput({ material: { RmN_mm2: 370, A5pct: 12 } }));
  assert.equal(byId(res, 'RAIL-C-02').status, STATUS.BLOCKED);
  assert.equal(byId(res, 'RAIL-C-03').status, STATUS.BLOCKED);
  assert.equal(byId(res, 'RAIL-C-04').status, STATUS.BLOCKED);
  assert.equal(byId(res, 'RAIL-C-05').status, STATUS.PASS);
});

test('Rm 370–520 dışı veya A5 < 8 kabul edilmez', () => {
  const lowRm = checkCarRails(carInput({ material: { RmN_mm2: 340, A5pct: 12, evidenceRef: 'x' } }));
  assert.equal(byId(lowRm, 'RAIL-C-02').status, STATUS.BLOCKED);
  const brittle = checkCarRails(carInput({ material: { RmN_mm2: 370, A5pct: 7, evidenceRef: 'x' } }));
  assert.equal(byId(brittle, 'RAIL-C-02').status, STATUS.FAIL);
});

test('Emniyet tertibatı tipi verilmeden veya geçersizken hesap yapılmaz (hızdan türetilmez)', () => {
  const none = carInput();
  delete none.safetyDevice;
  assert.ok(checkCarRails(none).every((r) => r.status === STATUS.BLOCKED));
  const bad = carInput({ safetyDevice: 'otomatik' });
  assert.ok(checkCarRails(bad).every((r) => r.status === STATUS.BLOCKED));
});

test('λ aralığı dışında burkulma BLOKE', () => {
  const input = carInput();
  input.rails.bracketSpacingMm = 300; // λ ≈ 16
  const res = checkCarRails(input);
  assert.equal(byId(res, 'RAIL-C-03').status, STATUS.BLOCKED);
});

test('Maux > 0 iken k3 girilmezse BLOKE; girilirse σk artar', () => {
  const noK3 = checkCarRails(carInput({ auxiliaryForceN: 500 }));
  assert.equal(byId(noK3, 'RAIL-C-03').status, STATUS.BLOCKED);
  const base = byId(checkCarRails(carInput()), 'RAIL-C-03').details.find((r) => r.case === 'safety').sigmaK;
  const withAux = byId(checkCarRails(carInput({ auxiliaryForceN: 500, k3: 2 })), 'RAIL-C-03').details.find((r) => r.case === 'safety').sigmaK;
  assert.ok(withAux > base);
  near(withAux - base, (2 * 500 / 1577) * omega(2000 / 18.23, 450), 1e-9);
});

test('Kapı konumu / ray adedi / tek sayı ray → BLOKE', () => {
  const noDoor = carInput();
  noDoor.car.doors = [];
  assert.ok(checkCarRails(noDoor).every((r) => r.status === STATUS.BLOCKED));
  const odd = carInput();
  odd.rails.n = 3;
  assert.ok(checkCarRails(odd).every((r) => r.status === STATUS.BLOCKED));
});

// ---- karşı ağırlık rayı ----------------------------------------------------------------------------------
function cwInput(over = {}) {
  return {
    rails: { n: 2, shoeSpacingMm: 2500, bracketSpacingMm: 2000, unitMassKgPerM: 10, lineLengthM: 30 },
    profile: T89A,
    material: { RmN_mm2: 450, A5pct: 14, evidenceRef: 'SENTETIK-TEST-DEGERI' },
    travelHeightM: 30,
    supportPath: { type: 'direct-masonry-wall' },
    suspension: 'central',
    compensation: 'none',
    cwt: { M: 1200, Dx: 700, Dy: 450 },
    ...over,
  };
}

test('Karşı ağırlık: eksantriklik derinliğin %10’u, genişliğin %5’i', () => {
  const [normal] = counterweightRailForces(cwInput());
  near(normal.Fx, (1.2 * g * 1200 * 70) / (2 * 2500), 1e-9);
  near(normal.Fy, (1.2 * g * 1200 * 22.5) / (1 * 2500), 1e-9);
  near(normal.Fv, 300 * g, 1e-9);
});

test('Karşı ağırlık emniyet tertibatı varsa ikinci yük durumu ve 5 mm sehim sınırı; yoksa 10 mm', () => {
  const noGear = checkCounterweightRails(cwInput());
  assert.equal(byId(noGear, 'RAIL-W-05').limit.value, 10);
  assert.equal(byId(noGear, 'RAIL-W-02').details.length, 1);
  const gear = checkCounterweightRails(cwInput({ safetyDevice: 'progressive' }));
  assert.equal(byId(gear, 'RAIL-W-05').limit.value, 5);
  assert.equal(byId(gear, 'RAIL-W-02').details.length, 2);
  const [, safety] = counterweightRailForces(cwInput({ safetyDevice: 'progressive' }));
  near(safety.Fv, (2 * g * 1200) / 2 + 300 * g, 1e-9);
});

test('Karşı ağırlık: yalnız merkezî askı ve telafisiz düzen desteklenir', () => {
  assert.ok(checkCounterweightRails(cwInput({ suspension: 'side' })).every((r) => r.status === STATUS.BLOCKED));
  assert.ok(checkCounterweightRails(cwInput({ compensation: 'present' })).every((r) => r.status === STATUS.BLOCKED));
});
