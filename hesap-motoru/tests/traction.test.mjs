import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTraction, frictionFactor, FRICTION_COEFFICIENT } from '../src/traction.mjs';
import { STATUS } from '../src/core.mjs';

const g = 9.81;
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b} (tol ${tol})`);
const byId = (results, id) => results.find((r) => r.ruleId === id);

// ---- sürtünme faktörü: standart formülleri, elle hesap ------------------------------------------
test('V oluk, sertleştirilmiş: f = μ/sin(γ/2)', () => {
  near(frictionFactor({ type: 'v', gammaDeg: 40, hardened: true }, 0.1, 'driving'), 0.1 / Math.sin((20 * Math.PI) / 180));
  near(frictionFactor({ type: 'v', gammaDeg: 40, hardened: true }, 0.1, 'driving'), 0.29238, 1e-5);
});

test('V oluk, sertleştirilmemiş (yükleme/acil fren): f = μ·4(1−sin(β/2))/(π−β−sinβ)', () => {
  // β = 90°: 4(1−0,70711)/(π/2 − 1) = 1,171573/0,570796 = 2,05261
  near(frictionFactor({ type: 'v', gammaDeg: 40, betaDeg: 90, hardened: false }, 0.1, 'driving'), 0.205261, 1e-5);
});

test('V oluk, karşı ağırlık durması: sertleştirilmiş/sertleştirilmemiş için f = μ/sin(γ/2)', () => {
  const a = frictionFactor({ type: 'v', gammaDeg: 40, betaDeg: 90, hardened: false }, 0.2, 'stalled');
  const b = frictionFactor({ type: 'v', gammaDeg: 40, hardened: true }, 0.2, 'stalled');
  near(a, b);
  near(a, 0.2 / Math.sin((20 * Math.PI) / 180));
});

test('Yarım dairesel alttan kesik oluk formülü (elle)', () => {
  // γ = 30°, β = 90°: 4(cos15° − sin45°)/(π − π/2 − π/6 − 1 + 0,5) = 4(0,965926−0,707107)/(0,5236... )
  const gam = (30 * Math.PI) / 180;
  const bet = (90 * Math.PI) / 180;
  const expected = (0.1 * 4 * (Math.cos(gam / 2) - Math.sin(bet / 2))) / (Math.PI - bet - gam - Math.sin(bet) + Math.sin(gam));
  near(frictionFactor({ type: 'semicircular', gammaDeg: 30, betaDeg: 90 }, 0.1, 'driving'), expected);
  assert.ok(expected > 0);
});

test('μ değerleri standarttan: yükleme 0,1; acil fren 0,1/(1+v/10); durma 0,2', () => {
  assert.equal(FRICTION_COEFFICIENT.loading(), 0.1);
  near(FRICTION_COEFFICIENT.braking(2), 0.1 / 1.2);
  near(FRICTION_COEFFICIENT.braking(0), 0.1);
  assert.equal(FRICTION_COEFFICIENT.stalled(), 0.2);
});

// ---- Ek D (2:1, telafisiz) formülleriyle elle hesap ---------------------------------------------
const P = 1200;
const Q = 630;
const Mcwt = P + 0.5 * Q; // 1515
const a = 0.6;
const mPcar = 15; // kabin tarafı 2 makara, azaltılmış kütle
const mPcwt = 20; // karşı ağırlık tarafı 1 makara

function ekD(over = {}) {
  return {
    machineArrangement: 'above',
    reeving: 2,
    ratedSpeedMps: 1,
    wrapAngleDeg: 160,
    decelerationMps2: a,
    groove: { type: 'v', gammaDeg: 40, hardened: true },
    stallProtection: 'slip',
    masses: {
      P,
      Q,
      Mcwt,
      carPulleys: [{ count: 2, reducedMassKg: mPcar }],
      cwtPulleys: [{ count: 1, reducedMassKg: mPcwt }],
    },
    positions: {
      loading: [{ label: 'en alt kat', MSRcar: 20, MSRcwt: 0 }],
      brakingLoaded: [{ label: 'en alt kat', MSRcar: 20, MSRcwt: 0 }],
      brakingEmpty: [{ label: 'en üst kat', MSRcar: 0, MSRcwt: 20 }],
      stalledCwt: [{ label: 'en üst kat', MSRcar: 0, MSRcwt: 40 }],
      stalledCar: [{ label: 'en alt kat', MSRcar: 40, MSRcwt: 0 }],
    },
    ...over,
  };
}
const alpha = (160 * Math.PI) / 180;

test('Ek D yükleme: T1 = (P+1,25Q)/2·g + M_SRkabin·g ; T2 = Mkw/2·g', () => {
  const r = byId(checkTraction(ekD()), 'TRA-001');
  const T1 = ((P + 1.25 * Q) / 2) * g + 20 * g;
  const T2 = (Mcwt / 2) * g;
  near(r.values.T1.value, T1, 1e-6);
  near(r.values.T2.value, T2, 1e-6);
  near(r.values.ratio.value, T1 / T2, 1e-12);
  const f = 0.1 / Math.sin((20 * Math.PI) / 180);
  near(r.values.expFA.value, Math.exp(f * alpha), 1e-12);
  assert.equal(r.status, STATUS.PASS);
});

test('Ek D acil fren (a): dolu kabin en alt katta aşağı yönde yavaşlıyor', () => {
  const r = byId(checkTraction(ekD()), 'TRA-002');
  const T1 = ((P + Q) / 2) * (g + a) + 20 * (g + 2 * a) + (mPcar * 2 * a) / 2;
  const T2 = (Mcwt / 2) * (g - a) - (mPcwt * 1 * a) / 2 + 0 * (g - 2 * a);
  near(r.values.T1.value, T1, 1e-6);
  near(r.values.T2.value, T2, 1e-6);
  // μ = 0,1/(1+v_halat/10), v_halat = r·v = 2 m/s
  near(r.values.mu.value, 0.1 / 1.2, 1e-12);
  assert.equal(r.status, STATUS.PASS);
});

test('Ek D acil fren (b): boş kabin en üst katta yukarı yönde yavaşlıyor (T1/T2 yer değiştirir)', () => {
  const r = byId(checkTraction(ekD()), 'TRA-003');
  const T1 = (Mcwt / 2) * (g + a) + 20 * (g + 2 * a) + (mPcwt * 1 * a) / 2; // karşı ağırlık tarafı
  const T2 = (P / 2) * (g - a) - (mPcar * 2 * a) / 2 + 0 * (g - 2 * a); // kabin tarafı
  near(r.values.T1.value, T1, 1e-6);
  near(r.values.T2.value, T2, 1e-6);
  assert.equal(r.status, STATUS.PASS);
});

test('Ek D karşı ağırlığın durması: T1 = (P+M_trav)/2·g ; T2 = M_SRkw·g, T1/T2 ≥ e^(fα)', () => {
  const r = byId(checkTraction(ekD()), 'TRA-004');
  const T1 = (P / 2) * g;
  const T2 = 40 * g;
  near(r.values.T1.value, T1, 1e-6);
  near(r.values.T2.value, T2, 1e-6);
  const f = 0.2 / Math.sin((20 * Math.PI) / 180);
  near(r.values.expFA.value, Math.exp(f * alpha), 1e-12);
  assert.equal(r.status, STATUS.PASS); // 15 ≥ 5,12
});

test('Kabin tamponda durduğunda (simetrik durum)', () => {
  const r = byId(checkTraction(ekD()), 'TRA-005');
  near(r.values.T1.value, (Mcwt / 2) * g, 1e-6);
  near(r.values.T2.value, 40 * g, 1e-6);
  assert.equal(r.status, STATUS.PASS);
});

test('Durma durumunda halat kütlesi fazlaysa oran düşer → FAIL', () => {
  const input = ekD();
  input.positions.stalledCwt = [{ label: 'x', MSRcar: 0, MSRcwt: 600 }]; // T2 = T1 → oran 1 < e^(fα)
  assert.equal(byId(checkTraction(input), 'TRA-004').status, STATUS.FAIL);
});

// ---- karşı ağırlık tarafı ağır olan örnek: yanlış tek oran hesabının kaçırdığı durum ---------------
test('Karşı ağırlık tarafı ağır (P=500, Q=1000, Mkw=1000): boş kabin acil fren durumu sıkı olur', () => {
  const input = {
    machineArrangement: 'above',
    reeving: 1,
    ratedSpeedMps: 1,
    wrapAngleDeg: 150,
    decelerationMps2: 0.5,
    groove: { type: 'v', gammaDeg: 40, hardened: true },
    stallProtection: 'slip',
    masses: { P: 500, Q: 1000, Mcwt: 1000 },
    positions: {
      loading: [{ MSRcar: 0, MSRcwt: 0 }],
      brakingLoaded: [{ MSRcar: 0, MSRcwt: 0 }],
      brakingEmpty: [{ MSRcar: 0, MSRcwt: 0 }],
      stalledCwt: [{ MSRcar: 0, MSRcwt: 10 }],
      stalledCar: [{ MSRcar: 10, MSRcwt: 0 }],
    },
  };
  const res = checkTraction(input);
  // boş kabin: T_kw/T_kabin = Mkw(g+a)/(P(g−a)) = 1000·10,31/(500·9,31)
  const expected = (1000 * (g + 0.5)) / (500 * (g - 0.5));
  near(byId(res, 'TRA-003').values.ratio.value, expected, 1e-9);
  assert.ok(expected > 2.2);
});

test('En elverişsiz konum seçilir (yükleme için en büyük oran)', () => {
  const input = ekD();
  input.positions.loading = [
    { label: 'orta', MSRcar: 10, MSRcwt: 10 },
    { label: 'en alt', MSRcar: 30, MSRcwt: 0 },
  ];
  const r = byId(checkTraction(input), 'TRA-001');
  assert.equal(r.values.worstPosition.value, 'en alt');
});

test('Sarılma açısı yetersizse yükleme FAIL, gereken açı raporlanır', () => {
  const input = ekD({ wrapAngleDeg: 50 });
  const r = byId(checkTraction(input), 'TRA-001');
  assert.equal(r.status, STATUS.FAIL);
  assert.ok(r.values.alphaRequired.value > 50);
  // gereken açının hemen üstünde sınır sağlanır
  const ok = byId(checkTraction(ekD({ wrapAngleDeg: r.values.alphaRequired.value + 0.01 })), 'TRA-001');
  assert.equal(ok.status, STATUS.PASS);
});

// ---- doğrulama ve kapsam sınırları ----------------------------------------------------------------
test('Makine kuyu üstünde değilse BLOKE', () => {
  const res = checkTraction(ekD({ machineArrangement: 'below' }));
  for (const r of res) assert.equal(r.status, STATUS.BLOCKED);
});

test('Gecikme 0,5 m/s²’den küçükse BLOKE (EN 81-50 5.11.2.2.2)', () => {
  const res = checkTraction(ekD({ decelerationMps2: 0.4 }));
  for (const r of res) assert.equal(r.status, STATUS.BLOCKED);
});

test('V oluk γ < 35° veya sertleştirilmemiş oluk alttan kesiksiz → BLOKE', () => {
  const a1 = checkTraction(ekD({ groove: { type: 'v', gammaDeg: 30, hardened: true } }));
  assert.ok(a1.every((r) => r.status === STATUS.BLOCKED));
  const a2 = checkTraction(ekD({ groove: { type: 'v', gammaDeg: 40, hardened: false } }));
  assert.ok(a2.every((r) => r.status === STATUS.BLOCKED));
  const a3 = checkTraction(ekD({ groove: { type: 'semicircular', gammaDeg: 40, betaDeg: 110 } }));
  assert.ok(a3.every((r) => r.status === STATUS.BLOCKED));
});

test('Beyan edilen atalet terimleri (m_DP, PTD) PASS’i REVIEW’e düşürür; FAIL FAIL kalır', () => {
  const rev = checkTraction(ekD({ declaredUnmodelled: { tensioningDevice: true } }));
  assert.equal(byId(rev, 'TRA-001').status, STATUS.REVIEW);
  const fail = checkTraction(ekD({ declaredUnmodelled: { tensioningDevice: true }, wrapAngleDeg: 50 }));
  assert.equal(byId(fail, 'TRA-001').status, STATUS.FAIL);
});

test('Durma durumunda elektrikli güvenlik düzeni beyanı → oran hesaplanmaz, REVIEW', () => {
  const res = checkTraction(ekD({ stallProtection: 'electrical-safety-device' }));
  assert.equal(byId(res, 'TRA-004').status, STATUS.REVIEW);
  assert.equal(byId(res, 'TRA-005').status, STATUS.REVIEW);
  assert.equal(byId(res, 'TRA-001').status, STATUS.PASS);
});

test('Konum listesi boşsa ilgili durum BLOKE', () => {
  const input = ekD();
  input.positions.brakingEmpty = [];
  const res = checkTraction(input);
  assert.equal(byId(res, 'TRA-003').status, STATUS.BLOCKED);
  assert.equal(byId(res, 'TRA-001').status, STATUS.PASS);
});

test('Telafi varsa durma durumu REVIEW (modelleme varsayımı)', () => {
  const input = ekD();
  input.masses.Mcomp = 200;
  assert.equal(byId(checkTraction(input), 'TRA-004').status, STATUS.REVIEW);
});

test('Hafif taraf gerilmesi ≤ 0 → oran sonsuz, FAIL (halat gevşer)', () => {
  const input = ekD({ decelerationMps2: 12 }); // g − a < 0 karşı ağırlık tarafı
  const r = byId(checkTraction(input), 'TRA-002');
  assert.equal(r.status, STATUS.FAIL);
});
