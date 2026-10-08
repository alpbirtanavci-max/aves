import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  equivalentTractionSheaves,
  equivalentDeflectionPulleys,
  minimumSafetyFactor,
  isReverseBend,
  checkSuspension,
} from '../src/suspension.mjs';
import { STATUS } from '../src/core.mjs';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b} (tol ${tol})`);
const byId = (results, id) => results.find((r) => r.ruleId === id);

// ---- EN 81-50:2020 Ek E örnekleri (standarttaki sayısal değerler) -----------------------------
test('Ek E.1: 2:1, V oluk γ=40°, Dt=600, Dp=500 → Nequiv = 14,14', () => {
  const Nt = equivalentTractionSheaves({ type: 'v', angleDeg: 40 });
  assert.equal(Nt, 10);
  const p = equivalentDeflectionPulleys({
    tractionSheaveDiameterMm: 600,
    pulleys: [
      { diameterMm: 500, simpleBends: 1 },
      { diameterMm: 500, simpleBends: 1 },
    ],
  });
  near(p.Kp, 2.0736, 1e-4);
  near(p.Nequiv_p, 4.1472, 1e-4);
  near(Nt + p.Nequiv_p, 14.1472, 1e-4);
});

test('Ek E.2: 1:1, U alttan kesik β=90°, Dt=600, Dp=400 → Nequiv = 10,06', () => {
  const Nt = equivalentTractionSheaves({ type: 'u-undercut', angleDeg: 90 });
  assert.equal(Nt, 5);
  const p = equivalentDeflectionPulleys({
    tractionSheaveDiameterMm: 600,
    pulleys: [{ diameterMm: 400, simpleBends: 1 }],
  });
  near(p.Kp, 5.0625, 1e-4);
  near(Nt + p.Nequiv_p, 10.0625, 1e-4);
});

test('Ek E.3: çift sarım U oluk (alttan kesiksiz), Dt=Dp=400 → Nequiv = 4', () => {
  const Nt = equivalentTractionSheaves({ type: 'u' }) * 2; // halat çekme kasnağından iki kez geçer
  const p = equivalentDeflectionPulleys({
    tractionSheaveDiameterMm: 400,
    pulleys: [{ diameterMm: 400, simpleBends: 2 }],
  });
  assert.equal(Nt + p.Nequiv_p, 4);
});

test('Çizelge 2: ara açılar doğrusal enterpolasyon, tablo dışı değer null', () => {
  near(equivalentTractionSheaves({ type: 'v', angleDeg: 37 }), 14); // 36:16 ile 38:12 arası
  near(equivalentTractionSheaves({ type: 'u-undercut', angleDeg: 87.5 }), 4.4); // 3,8 ile 5,0 arası
  assert.equal(equivalentTractionSheaves({ type: 'v', angleDeg: 34.9 }), null);
  assert.equal(equivalentTractionSheaves({ type: 'v', angleDeg: 50.1 }), null);
  assert.equal(equivalentTractionSheaves({ type: 'u-undercut', angleDeg: 106 }), null);
});

test('Ters eğilme koşulu: mesafe < 200·d ve düzlem dönüşü > 120°', () => {
  assert.equal(isReverseBend({ contactDistanceMm: 1999, planeRotationDeg: 121, ropeDiameterMm: 10 }), true);
  assert.equal(isReverseBend({ contactDistanceMm: 2000, planeRotationDeg: 121, ropeDiameterMm: 10 }), false);
  assert.equal(isReverseBend({ contactDistanceMm: 1000, planeRotationDeg: 120, ropeDiameterMm: 10 }), false);
});

// ---- 5.12.3 formülü, Şekil 10'dan okunan noktalarla (±0,15) ------------------------------------
test('Sf formülü Şekil 10 eğrileriyle uyumlu', () => {
  near(minimumSafetyFactor({ DtOverDr: 34, Nequiv: 1 }), 10.0, 0.15);
  near(minimumSafetyFactor({ DtOverDr: 36, Nequiv: 3 }), 14.1, 0.15);
  near(minimumSafetyFactor({ DtOverDr: 40, Nequiv: 10 }), 18.7, 0.15);
  near(minimumSafetyFactor({ DtOverDr: 80, Nequiv: 10 }), 7.92, 0.05);
});

test('Sf: Nequiv arttıkça artar, Dt/dr arttıkça azalır', () => {
  const a = minimumSafetyFactor({ DtOverDr: 40, Nequiv: 5 });
  const b = minimumSafetyFactor({ DtOverDr: 40, Nequiv: 10 });
  const c = minimumSafetyFactor({ DtOverDr: 50, Nequiv: 10 });
  assert.ok(b > a);
  assert.ok(c < b);
});

// ---- bütünleşik askı kontrolü --------------------------------------------------------------------
function baseInput(over = {}) {
  return {
    driveType: 'traction',
    reeving: 1,
    rope: { nominalDiameterMm: 10, count: 6, minimumBreakingLoadN: 67700, certificateRef: 'DRAKO-250T tablo' },
    masses: { P: 1200, Q: 630, MSRcarLowest: 76 },
    sheaves: { tractionDiameterMm: 400, groove: { type: 'v', angleDeg: 40 }, pulleys: [] },
    termination: {
      type: 'wedge-13411-7',
      certificateRef: 'IMALATCI-CERT-1',
      sizeRangeMm: [9, 11],
    },
    ...over,
  };
}

test('El hesabı: 1:1, 6×Ø10, D/d=40, V 40°', () => {
  const r = checkSuspension(baseInput());
  // F_max = ((1200+630) + 76)·9,81 / 6
  const Fmax = ((1200 + 630 + 76) * 9.81) / 6;
  const S = 67700 / Fmax;
  const s3 = byId(r, 'SUS-003');
  near(s3.values.maxRopeForce.value, Fmax, 1e-6);
  near(s3.values.safetyFactor.value, S, 1e-9);
  assert.equal(s3.status, STATUS.PASS);

  const s4 = byId(r, 'SUS-004');
  near(s4.values.Nequiv.value, 10, 1e-12); // saptırma makarası yok
  near(s4.values.SfMin.value, minimumSafetyFactor({ DtOverDr: 40, Nequiv: 10 }), 1e-12);
  assert.equal(s4.status, STATUS.PASS);

  for (const id of ['SUS-001', 'SUS-002', 'SUS-006']) assert.equal(byId(r, id).status, STATUS.PASS, id);
});

test('D/d tam 40 geçer, 40’ın altı kalır (sınır)', () => {
  const ok = checkSuspension(baseInput({ sheaves: { tractionDiameterMm: 400, groove: { type: 'v', angleDeg: 40 }, pulleys: [] } }));
  assert.equal(byId(ok, 'SUS-002').status, STATUS.PASS);
  const bad = checkSuspension(baseInput({ sheaves: { tractionDiameterMm: 399.9, groove: { type: 'v', angleDeg: 40 }, pulleys: [] } }));
  assert.equal(byId(bad, 'SUS-002').status, STATUS.FAIL);
});

test('Her makara ayrı kontrol edilir: küçük saptırma makarası SUS-002’yi düşürür', () => {
  const r = checkSuspension(
    baseInput({
      sheaves: {
        tractionDiameterMm: 400,
        groove: { type: 'v', angleDeg: 40 },
        pulleys: [{ diameterMm: 350, simpleBends: 1 }],
      },
    }),
  );
  assert.equal(byId(r, 'SUS-002').status, STATUS.FAIL);
});

test('Halat adedi: 2 halat sürtünme tahrikinde S ≥ 16, 3+ halatta S ≥ 12', () => {
  const two = checkSuspension(baseInput({ rope: { nominalDiameterMm: 10, count: 2, minimumBreakingLoadN: 67700, certificateRef: 'x' } }));
  assert.equal(byId(two, 'SUS-003').limit.value, 16);
  const three = checkSuspension(baseInput({ rope: { nominalDiameterMm: 10, count: 3, minimumBreakingLoadN: 67700, certificateRef: 'x' } }));
  assert.equal(byId(three, 'SUS-003').limit.value, 12);
  const one = checkSuspension(baseInput({ rope: { nominalDiameterMm: 10, count: 1, minimumBreakingLoadN: 67700, certificateRef: 'x' } }));
  assert.equal(byId(one, 'SUS-001').status, STATUS.FAIL); // 5.5.1.3: en az iki halat
  assert.equal(byId(one, 'SUS-003').status, STATUS.BLOCKED); // 1 halat için sınır tanımlı değil
});

test('Güvenlik katsayısı yetersizse SUS-003 FAIL', () => {
  const r = checkSuspension(baseInput({ rope: { nominalDiameterMm: 10, count: 6, minimumBreakingLoadN: 30000, certificateRef: 'x' } }));
  assert.equal(byId(r, 'SUS-003').status, STATUS.FAIL);
});

test('5.12 alt sınırı 5.5.2.2’yi aşıyorsa birleşik sınır 5.12’dir', () => {
  // Dt/dr = 40, Nequiv = 10 → Sf ≈ 18,7 > 12. Halat güvenliği 15 → SUS-003 geçer, SUS-004 kalır.
  const MBL = 15 * (((1200 + 630 + 76) * 9.81) / 6);
  const r = checkSuspension(baseInput({ rope: { nominalDiameterMm: 10, count: 6, minimumBreakingLoadN: MBL, certificateRef: 'x' } }));
  assert.equal(byId(r, 'SUS-003').status, STATUS.PASS);
  assert.equal(byId(r, 'SUS-004').status, STATUS.FAIL);
});

test('2:1 askıda kabin tarafı kuvveti r’ye bölünür', () => {
  const r1 = checkSuspension(baseInput({ reeving: 1 }));
  const r2 = checkSuspension(baseInput({ reeving: 2 }));
  const f1 = byId(r1, 'SUS-003').values.maxRopeForce.value;
  const f2 = byId(r2, 'SUS-003').values.maxRopeForce.value;
  near(f2, ((1830 / 2 + 76) * 9.81) / 6, 1e-6);
  assert.ok(f2 < f1);
});

test('Şekil 10 aralığı dışı Dt/dr → PASS yerine REVIEW', () => {
  const r = checkSuspension(
    baseInput({
      rope: { nominalDiameterMm: 6, count: 6, minimumBreakingLoadN: 50000, certificateRef: 'x' },
      sheaves: { tractionDiameterMm: 600, groove: { type: 'v', angleDeg: 40 }, pulleys: [] },
    }),
  );
  // Dt/dr = 100 > 80
  assert.equal(byId(r, 'SUS-004').status, STATUS.REVIEW);
});

// ---- AVES Ø6,5 mm istisnası: norm değil, asla PASS vermez ---------------------------------------
const aves65 = (over = {}) =>
  baseInput({
    rope: { nominalDiameterMm: 6.5, count: 6, minimumBreakingLoadN: 31500, certificateRef: 'x' },
    sheaves: { tractionDiameterMm: 210, groove: { type: 'v', angleDeg: 40 }, pulleys: [] },
    termination: { type: 'wedge-13411-7', certificateRef: 'c', sizeRangeMm: [5, 6.5] },
    ...over,
  });

test('Ø6,5×210 istisna kapalıyken FAIL (norm: d ≥ 8 mm ve D/d ≥ 40)', () => {
  const r = checkSuspension(aves65());
  assert.equal(byId(r, 'SUS-001').status, STATUS.FAIL);
  assert.equal(byId(r, 'SUS-002').status, STATUS.FAIL);
});

test('Ø6,5×210 istisna açık + kanıt yok → BLOKE', () => {
  const r = checkSuspension(aves65({ avesException: { enabled: true } }));
  assert.equal(byId(r, 'SUS-001').status, STATUS.BLOCKED);
  assert.equal(byId(r, 'SUS-002').status, STATUS.BLOCKED);
});

test('Ø6,5×210/240 istisna açık + kanıt var → REVIEW, kaynak sınıfı AVES politikası, asla PASS', () => {
  for (const D of [210, 240]) {
    const r = checkSuspension(
      aves65({
        sheaves: { tractionDiameterMm: D, groove: { type: 'v', angleDeg: 40 }, pulleys: [] },
        avesException: { enabled: true, bendingEnduranceEvidenceRef: 'ÜRETİCİ-EĞİLME-RAPORU-01' },
      }),
    );
    for (const id of ['SUS-001', 'SUS-002']) {
      const res = byId(r, id);
      assert.equal(res.status, STATUS.REVIEW, `${id} D=${D}`);
      assert.equal(res.source.sourceClass, 'AVES_POLITIKASI');
    }
  }
});

test('İstisna yalnız 210/240 mm için: Ø6,5×260 istisna açıkken de FAIL', () => {
  const r = checkSuspension(
    aves65({
      sheaves: { tractionDiameterMm: 260, groove: { type: 'v', angleDeg: 40 }, pulleys: [] },
      avesException: { enabled: true, bendingEnduranceEvidenceRef: 'rapor' },
    }),
  );
  assert.equal(byId(r, 'SUS-002').status, STATUS.PASS); // 260/6,5 = 40 → norm D/d sağlanır
  assert.equal(byId(r, 'SUS-001').status, STATUS.FAIL); // ama 6,5 mm < 8 mm ve 260 mm istisna eşleşmesi değil
});

test('Ø6,5×320: istisna eşleşmesi değil, d < 8 mm olduğu için SUS-001 FAIL', () => {
  const r = checkSuspension(
    aves65({
      sheaves: { tractionDiameterMm: 320, groove: { type: 'v', angleDeg: 40 }, pulleys: [] },
      avesException: { enabled: true, bendingEnduranceEvidenceRef: 'rapor' },
    }),
  );
  assert.equal(byId(r, 'SUS-001').status, STATUS.FAIL);
  assert.equal(byId(r, 'SUS-002').status, STATUS.PASS);
});

test('İstisna: tüm kasnak/makara 210/240 olmalı; 350 mm saptırma makarası varsa SUS-001 FAIL', () => {
  const r = checkSuspension(
    aves65({
      sheaves: { tractionDiameterMm: 240, groove: { type: 'v', angleDeg: 40 }, pulleys: [{ diameterMm: 350, simpleBends: 1 }] },
      avesException: { enabled: true, bendingEnduranceEvidenceRef: 'rapor' },
    }),
  );
  assert.equal(byId(r, 'SUS-001').status, STATUS.FAIL);
});

test('Ø8×240 (D/d=30) istisna kapsamında değil → FAIL', () => {
  const r = checkSuspension(
    baseInput({
      rope: { nominalDiameterMm: 8, count: 6, minimumBreakingLoadN: 43300, certificateRef: 'x' },
      sheaves: { tractionDiameterMm: 240, groove: { type: 'v', angleDeg: 40 }, pulleys: [] },
      avesException: { enabled: true, bendingEnduranceEvidenceRef: 'rapor' },
    }),
  );
  assert.equal(byId(r, 'SUS-002').status, STATUS.FAIL);
});

// ---- eksik girdi ------------------------------------------------------------------------------
test('Eksik girdi: hiçbir sonuç PASS olamaz, BLOKE gerekçesi var', () => {
  const r = checkSuspension({ driveType: 'traction' });
  for (const res of r) {
    assert.notEqual(res.status, STATUS.PASS, res.ruleId);
  }
  assert.ok(byId(r, 'SUS-003').blockers.length > 0);
});

test('NaN / metin / negatif girdi BLOKE yapar', () => {
  const r = checkSuspension(baseInput({ rope: { nominalDiameterMm: NaN, count: 6, minimumBreakingLoadN: 67700 } }));
  assert.equal(byId(r, 'SUS-001').status, STATUS.BLOCKED);
  const r2 = checkSuspension(baseInput({ masses: { P: -1, Q: 630, MSRcarLowest: 76 } }));
  assert.equal(byId(r2, 'SUS-003').status, STATUS.BLOCKED);
});

test('Sonlandırma: tip listede değil + kanıt yok → BLOKE; kanıt var → REVIEW; çap aralık dışı → FAIL', () => {
  const none = checkSuspension(baseInput({ termination: { type: 'clips' } }));
  assert.equal(byId(none, 'SUS-006').status, STATUS.BLOCKED);
  const ev = checkSuspension(baseInput({ termination: { type: 'clips', efficiencyEvidenceRef: 'deney-12' } }));
  assert.equal(byId(ev, 'SUS-006').status, STATUS.REVIEW);
  const range = checkSuspension(baseInput({ termination: { type: 'wedge-13411-7', certificateRef: 'c', sizeRangeMm: [5, 8] } }));
  assert.equal(byId(range, 'SUS-006').status, STATUS.FAIL);
});
