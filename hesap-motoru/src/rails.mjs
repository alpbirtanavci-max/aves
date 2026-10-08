// Kılavuz raylar (T profil) — EN 81-20:2020 5.7 ve EN 81-50:2020 5.10, Ek C.
//
//  Yük durumları (EN 81-20 5.7.2.2, Çizelge 13): normal çalışma-seyir, yükleme/boşaltma, emniyet tertibatı.
//  Kapsam: ray GÖVDESİ eğilme/bası/burkulma, flanş eğilmesi ve sehim. Braket, paten/klips, ek yerleri,
//  yardımcı donanım ve kurulum koşulları bu hesabın dışındadır (her sonuçta not düşülür).
//
//  Koordinatlar (Ek C): x, y kılavuz ray koordinat sistemindeki konumlardır (mm).
//   - Emniyet tertibatı durumunda moment kolu RAY KOORDİNAT SİSTEMİNE göre alınır (xP, xQ, yP, yQ);
//   - Normal çalışma ve yükleme durumlarında askı noktasına göre (x − xS, y − yS) alınır.
//  Q, kabin alanının en elverişsiz üç çeyreğinde dağılır: ağırlık merkezi ±D/8 kayar (5.7.2.3.4).

import {
  STATUS,
  SOURCE_CLASS,
  G_N,
  makeResult,
  blocked,
  checkInputs,
  isFiniteNumber,
  worstStatus,
  fmt,
} from './core.mjs';

const E_STEEL = 210000; // N/mm²

const SRC = (std, ed, clause, sourceClass = SOURCE_CLASS.NORMATIVE, note) => ({
  standard: std,
  edition: ed,
  clause,
  sourceClass,
  note,
});
const SRC50 = (clause, cls, note) => SRC('EN 81-50', '2020', clause, cls, note);
const SRC20 = (clause, cls, note) => SRC('EN 81-20', '2020', clause, cls, note);

const SCOPE_NOTE =
  'Bu sonuç yalnız hesaplanan alt kapsamı (ray gövdesi/flanş/sehim) kapsar; braket, paten/klips, ek yerleri, yardımcı donanım ve kurulum koşulları ayrıca doğrulanmalıdır.';

// ---- EN 81-20:2020 Çizelge 14 -------------------------------------------------------------------
export const K1_BY_SAFETY_DEVICE = Object.freeze({
  instantaneous: 5, // yakalayıcı makaralı tip hariç anlık tertibat
  'instantaneous-captive-roller': 3,
  'pawl-energy-accumulation': 3, // enerji biriktiren tampon etkili çengelli tertibat veya tampon
  progressive: 2,
  'pawl-energy-dissipation': 2,
  'rupture-valve': 2,
});
export const K2_RUNNING = 1.2; // Çizelge 14: normal çalışma

/** Çizelge 15 emniyet katsayısı. A5 < %8 kullanılamaz (null). */
export function railSafetyFactor(A5pct, safetyDeviceCase) {
  if (!isFiniteNumber(A5pct) || A5pct < 8) return null;
  if (safetyDeviceCase) return A5pct > 12 ? 1.8 : 3.0;
  return A5pct > 12 ? 2.25 : 3.75;
}

// ---- EN 81-50:2020 5.10.3 omega ---------------------------------------------------------------------
const omega370 = (l) =>
  l <= 60 ? 0.0001292 * l ** 1.89 + 1 : l <= 85 ? 0.00004627 * l ** 2.14 + 1 : l <= 115 ? 0.00001711 * l ** 2.35 + 1.04 : 0.00016887 * l ** 2;
const omega520 = (l) =>
  l <= 50 ? 0.0000824 * l ** 2.06 + 1.021 : l <= 70 ? 0.00001895 * l ** 2.41 + 1.05 : l <= 89 ? 0.00002447 * l ** 2.36 + 1.03 : 0.0002533 * l ** 2;

/** ω(λ, Rm): 20 ≤ λ ≤ 250 ve 370 ≤ Rm ≤ 520 dışında null (ekstrapolasyon yok). */
export function omega(lambda, Rm) {
  if (!isFiniteNumber(lambda) || !isFiniteNumber(Rm)) return null;
  if (lambda < 20 || lambda > 250 || Rm < 370 || Rm > 520) return null;
  const w370 = omega370(lambda);
  const w520 = omega520(lambda);
  return ((w520 - w370) / (520 - 370)) * (Rm - 370) + w370;
}

// ---- kuvvetler ----------------------------------------------------------------------------------
const maxAbs = (arr) => Math.max(...arr.map(Math.abs));
const FS_FACTOR = Object.freeze({ passenger: 0.4, 'goods-passenger': 0.6, 'goods-heavy-handling': 0.85 });

/**
 * Kabin rayı yatay/düşey kuvvetleri (ray başına, N). Zarf: Q'nun ±D/8 kaymaları ve her kapı için en büyük mutlak değer.
 */
export function carRailForces(c) {
  const { n, shoeSpacingMm: h } = c.rails;
  const car = c.car;
  const k1 = K1_BY_SAFETY_DEVICE[c.safetyDevice];
  const Mg = c.rails.unitMassKgPerM * c.rails.lineLengthM;
  const Fp = c.pushThroughForceN ?? 0;
  const fvBase = Mg * G_N + Fp;

  const xQs = [car.C.x + car.Dx / 8, car.C.x - car.Dx / 8];
  const yQs = [car.C.y + car.Dy / 8, car.C.y - car.Dy / 8];

  const safety = {
    key: 'safety',
    title: 'Emniyet tertibatı çalışması',
    k: k1,
    Fx: maxAbs(xQs.map((xQ) => (k1 * G_N * (car.Q * xQ + car.P * car.Pcg.x)) / (n * h))),
    Fy: maxAbs(yQs.map((yQ) => (k1 * G_N * (car.Q * yQ + car.P * car.Pcg.y)) / ((n / 2) * h))),
    Fv: (k1 * G_N * (car.P + car.Q)) / n + fvBase,
  };
  const normal = {
    key: 'normal',
    title: 'Normal çalışma · seyir',
    k: K2_RUNNING,
    Fx: maxAbs(xQs.map((xQ) => (K2_RUNNING * G_N * (car.Q * (xQ - car.S.x) + car.P * (car.Pcg.x - car.S.x))) / (n * h))),
    Fy: maxAbs(yQs.map((yQ) => (K2_RUNNING * G_N * (car.Q * (yQ - car.S.y) + car.P * (car.Pcg.y - car.S.y))) / ((n / 2) * h))),
    Fv: fvBase,
  };
  const Fs = FS_FACTOR[car.liftClass] * G_N * car.Q;
  const loading = {
    key: 'loading',
    title: 'Normal çalışma · yükleme/boşaltma',
    k: 1,
    Fx: maxAbs(car.doors.map((d) => (G_N * car.P * (car.Pcg.x - car.S.x) + Fs * (d.x - car.S.x)) / (n * h))),
    Fy: maxAbs(car.doors.map((d) => (G_N * car.P * (car.Pcg.y - car.S.y) + Fs * (d.y - car.S.y)) / ((n / 2) * h))),
    Fv: fvBase,
    FsN: Fs,
  };
  return [normal, loading, safety];
}

/**
 * Karşı ağırlık rayı kuvvetleri — merkezî askılı, telafisiz karşı ağırlık (5.7.2.3.3: eksantriklik
 * genişliğin %5'i ve derinliğin %10'u). Emniyet tertibatı yoksa k1 = 0 (yalnız normal çalışma).
 */
export function counterweightRailForces(c) {
  const { n, shoeSpacingMm: h } = c.rails;
  const cw = c.cwt;
  const Mg = c.rails.unitMassKgPerM * c.rails.lineLengthM;
  const Fp = c.pushThroughForceN ?? 0;
  const ex = 0.1 * cw.Dx;
  const ey = 0.05 * cw.Dy;
  const fvBase = Mg * G_N + Fp;
  const cases = [
    {
      key: 'normal',
      title: 'Karşı ağırlık · normal çalışma',
      k: K2_RUNNING,
      Fx: (K2_RUNNING * G_N * cw.M * ex) / (n * h),
      Fy: (K2_RUNNING * G_N * cw.M * ey) / ((n / 2) * h),
      Fv: fvBase,
    },
  ];
  if (c.safetyDevice) {
    const k1 = K1_BY_SAFETY_DEVICE[c.safetyDevice];
    cases.push({
      key: 'safety',
      title: 'Karşı ağırlık · emniyet tertibatı çalışması',
      k: k1,
      Fx: (k1 * G_N * cw.M * ex) / (n * h),
      Fy: (k1 * G_N * cw.M * ey) / ((n / 2) * h),
      Fv: (k1 * G_N * cw.M) / n + fvBase,
    });
  }
  return cases;
}

// ---- ortak girdi doğrulaması ----------------------------------------------------------------------
function geometryProblems(c) {
  const problems = [];
  if (Array.isArray(c.catalogResolutionErrors)) problems.push(...c.catalogResolutionErrors);
  problems.push(
    ...checkInputs(c.rails ?? {}, {
      n: { label: 'Ray adedi', min: 2, integer: true },
      shoeSpacingMm: { label: 'Üst-alt paten merkez aralığı h (mm)', positive: true },
      bracketSpacingMm: { label: 'Braket aralığı l (mm)', positive: true },
      unitMassKgPerM: { label: 'Ray birim kütlesi (kg/m)', positive: true },
      lineLengthM: { label: 'Ray hattı toplam boyu (m)', positive: true },
    }),
  );
  if (c.rails && isFiniteNumber(c.rails.n) && c.rails.n % 2 !== 0) problems.push('Ray adedi çift olmalı');
  if (c.safetyDevice !== undefined && !(c.safetyDevice in K1_BY_SAFETY_DEVICE)) {
    problems.push('Emniyet tertibatı tipi Çizelge 14 satırlarından biri olmalı: ' + Object.keys(K1_BY_SAFETY_DEVICE).join(', '));
  }
  problems.push(
    ...checkInputs(c.profile ?? {}, {
      areaMm2: { label: 'Ray kesit alanı A (mm²)', positive: true },
      IxMm4: { label: 'Ix (mm⁴)', positive: true },
      IyMm4: { label: 'Iy (mm⁴)', positive: true },
      WxMm3: { label: 'Wx (mm³)', positive: true },
      WyMm3: { label: 'Wy (mm³)', positive: true },
      ixMm: { label: 'ix (mm)', positive: true },
      iyMm: { label: 'iy (mm)', positive: true },
    }),
  );
  const p = c.pushThroughForceN;
  if (isFiniteNumber(c.travelHeightM) && c.travelHeightM > 40 && !(isFiniteNumber(p) && p >= 0)) {
    problems.push('Seyir > 40 m: itme-geçme kuvveti Fp (N) girilmeli (EN 81-20 5.7.2.3.5)');
  }
  if (!isFiniteNumber(c.travelHeightM)) problems.push('Seyir yüksekliği (m) girilmemiş');
  return problems;
}

function structureDeflection(c) {
  const s = c.supportPath;
  if (s?.type === 'direct-masonry-wall') return { dx: 0, dy: 0, problems: [], note: 'Braketler doğrudan beton/blok/tuğla kuyu duvarında: yapı sapması 0 alındı (EN 81-20 Ek E.2, bilgilendirme).' };
  if (s && ['steel-beam', 'timber-frame', 'other'].includes(s.type)) {
    const problems = [];
    if (!(isFiniteNumber(s.deflectionXMm) && s.deflectionXMm >= 0)) problems.push('Yapı sapması δstr-x (mm) girilmemiş');
    if (!(isFiniteNumber(s.deflectionYMm) && s.deflectionYMm >= 0)) problems.push('Yapı sapması δstr-y (mm) girilmemiş');
    return { dx: s.deflectionXMm, dy: s.deflectionYMm, problems, note: 'Çelik kiriş/ahşap/diğer taşıyıcı: yapı sapması girdiden alındı.' };
  }
  return { dx: NaN, dy: NaN, problems: ["Ray destek yolu 'direct-masonry-wall', 'steel-beam', 'timber-frame' veya 'other' olmalı"], note: '' };
}

function materialProblems(m) {
  const problems = [];
  if (!isFiniteNumber(m?.RmN_mm2)) problems.push('Bitmiş ray çekme dayanımı Rm girilmemiş');
  else if (m.RmN_mm2 < 370 || m.RmN_mm2 > 520) problems.push('Rm 370–520 N/mm² dışında: ω katsayıları bu aralık için tanımlı (ekstrapolasyon yapılmaz)');
  if (!isFiniteNumber(m?.A5pct)) problems.push('Bitmiş ray kopma uzaması A5 girilmemiş');
  if (!(typeof m?.evidenceRef === 'string' && m.evidenceRef.trim())) {
    problems.push('Rm/A5 için izlenebilir üretici/anlaşma belgesi referansı yok (hammadde EL/UTS bitmiş ray Rm/A5 yerine kullanılamaz)');
  }
  return problems;
}

const copy = (x) => JSON.parse(JSON.stringify(x));

// ---- gerilme kontrolleri ------------------------------------------------------------------------------
function stressTable(c, cases) {
  const l = c.rails.bracketSpacingMm;
  const { areaMm2: A, WxMm3: Wx, WyMm3: Wy, ixMm, iyMm } = c.profile;
  const lambda = l / Math.min(ixMm, iyMm);
  const Rm = c.material.RmN_mm2;
  const A5 = c.material.A5pct;
  const w = omega(lambda, Rm);
  const Maux = c.auxiliaryForceN ?? 0;
  const k3 = c.k3 ?? 0;
  return cases.map((cs) => {
    const safetyCase = cs.key === 'safety';
    const St = railSafetyFactor(A5, safetyCase);
    const sigmaPerm = St ? Rm / St : NaN;
    const sigmaY = (3 * cs.Fx * l) / (16 * Wy);
    const sigmaX = (3 * cs.Fy * l) / (16 * Wx);
    const sigmaM = sigmaX + sigmaY;
    const axial = (cs.Fv + k3 * Maux) / A;
    const sigmaK = w === null ? NaN : axial * w;
    return {
      case: cs.key,
      title: cs.title,
      k: cs.k,
      Fx: cs.Fx,
      Fy: cs.Fy,
      Fv: cs.Fv,
      lambda,
      omega: w,
      sigmaX,
      sigmaY,
      sigmaM,
      sigmaAxial: axial,
      sigmaK,
      sigmaPerm,
      St,
      bendingOk: sigmaM <= sigmaPerm,
      combinedOk: sigmaM + axial <= sigmaPerm,
      bucklingOk: sigmaK + 0.9 * sigmaM <= sigmaPerm,
    };
  });
}

function railStressResults(c, cases, prefix, label) {
  const results = [];
  const gProblems = geometryProblems(c);
  const mProblems = materialProblems(c.material);
  const auxProblems = [];
  if ((c.auxiliaryForceN ?? 0) > 0 && !(isFiniteNumber(c.k3) && c.k3 >= 1)) {
    auxProblems.push('Yardımcı donanım kuvveti (Maux) var: k3 darbe katsayısı (≥ 1, üretici/kurulum verisi) girilmeli');
  }
  const src = SRC50('5.10.2–5.10.4; Ek C', SOURCE_CLASS.NORMATIVE, 'Rm/A5 bitmiş ray belgesinden; Çizelge 15 (EN 81-20 5.7.4.5)');
  const problems = [...gProblems, ...mProblems, ...auxProblems];
  const lambdaProblem = [];
  if (!problems.length) {
    const lambda = c.rails.bracketSpacingMm / Math.min(c.profile.ixMm, c.profile.iyMm);
    if (lambda < 20 || lambda > 250) lambdaProblem.push(`λ = ${fmt(lambda, 1)}: ω yalnız 20 ≤ λ ≤ 250 için tanımlı`);
  }
  if (problems.length || lambdaProblem.length) {
    for (const [id, title] of [
      [`${prefix}-02`, `${label} · eğilme gerilmesi`],
      [`${prefix}-03`, `${label} · bası ve burkulma (omega)`],
    ]) {
      results.push(blocked({ ruleId: id, title, source: src, problems: [...problems, ...lambdaProblem], inputs: copy(c) }));
    }
    return results;
  }
  const rows = stressTable(c, cases);
  if (rows.some((r) => !Number.isFinite(r.sigmaPerm))) {
    for (const [id, title] of [
      [`${prefix}-02`, `${label} · eğilme gerilmesi`],
      [`${prefix}-03`, `${label} · bası ve burkulma (omega)`],
    ]) {
      results.push(makeResult({ ruleId: id, title, status: STATUS.FAIL, source: src, notes: ['A5 < %8: malzeme gevrek kabul edilir ve kullanılamaz (EN 81-20 5.7.4.5).'], inputs: copy(c) }));
    }
    return results;
  }
  const bendingAll = rows.every((r) => r.bendingOk);
  const bucklingAll = rows.every((r) => r.combinedOk && r.bucklingOk);
  const worstBending = rows.reduce((a, b) => (b.sigmaM / b.sigmaPerm > a.sigmaM / a.sigmaPerm ? b : a));
  const worstBuckling = rows.reduce((a, b) => {
    const ua = Math.max(a.sigmaK + 0.9 * a.sigmaM, a.sigmaM + a.sigmaAxial) / a.sigmaPerm;
    const ub = Math.max(b.sigmaK + 0.9 * b.sigmaM, b.sigmaM + b.sigmaAxial) / b.sigmaPerm;
    return ub > ua ? b : a;
  });
  results.push(
    makeResult({
      ruleId: `${prefix}-02`,
      title: `${label} · eğilme gerilmesi`,
      status: bendingAll ? STATUS.PASS : STATUS.FAIL,
      source: src,
      values: {
        sigmaMmax: { value: Math.max(...rows.map((r) => r.sigmaM)), unit: 'N/mm²' },
        utilization: { value: worstBending.sigmaM / worstBending.sigmaPerm, unit: '1' },
      },
      limit: { description: 'σm = σx + σy ≤ σperm = Rm/St', direction: 'max' },
      margin: 1 - worstBending.sigmaM / worstBending.sigmaPerm,
      formula: 'σm = σx + σy; σx = 3·Fy·l/(16·Wx); σy = 3·Fx·l/(16·Wy); σperm = Rm/St',
      substitution: rows.map((r) => `${r.title}: σm=${fmt(r.sigmaM, 2)} ≤ σperm=${fmt(r.sigmaPerm, 2)} (St=${r.St})`).join(' | '),
      notes: [SCOPE_NOTE],
      details: rows,
      inputs: copy(c),
    }),
  );
  results.push(
    makeResult({
      ruleId: `${prefix}-03`,
      title: `${label} · bası ve burkulma (omega)`,
      status: bucklingAll ? STATUS.PASS : STATUS.FAIL,
      source: src,
      values: {
        lambda: { value: rows[0].lambda, unit: '1' },
        omega: { value: rows[0].omega, unit: '1' },
        utilization: {
          value: Math.max(worstBuckling.sigmaK + 0.9 * worstBuckling.sigmaM, worstBuckling.sigmaM + worstBuckling.sigmaAxial) / worstBuckling.sigmaPerm,
          unit: '1',
        },
      },
      limit: { description: 'σ = σm + (Fv + k3·Maux)/A ≤ σperm ve σk + 0,9·σm ≤ σperm', direction: 'max' },
      margin:
        1 -
        Math.max(worstBuckling.sigmaK + 0.9 * worstBuckling.sigmaM, worstBuckling.sigmaM + worstBuckling.sigmaAxial) / worstBuckling.sigmaPerm,
      formula: 'λ = l/i_min; σk = (Fv + k3·Maux)·ω/A; σ = σm + (Fv + k3·Maux)/A; σ = σk + 0,9·σm',
      substitution: rows
        .map((r) => `${r.title}: σk=${fmt(r.sigmaK, 2)}, σ=σk+0,9σm=${fmt(r.sigmaK + 0.9 * r.sigmaM, 2)}, σm+σbası=${fmt(r.sigmaM + r.sigmaAxial, 2)} ≤ ${fmt(r.sigmaPerm, 2)}`)
        .join(' | '),
      notes: [SCOPE_NOTE],
      details: rows,
      inputs: copy(c),
    }),
  );
  return results;
}

function deflectionResult(c, cases, prefix, label, limitMm, safetyDeviceActs) {
  const src = SRC20('5.7.4.6; 5.7.2.1.2', SOURCE_CLASS.NORMATIVE, 'Hesap yöntemi EN 81-50 5.10.6; yapı sapması Ek E.2');
  const problems = geometryProblems(c);
  const sd = structureDeflection(c);
  problems.push(...sd.problems);
  if (problems.length) {
    return blocked({ ruleId: `${prefix}-05`, title: `${label} · elastik sehim`, source: src, problems, inputs: copy(c) });
  }
  const l = c.rails.bracketSpacingMm;
  const { IxMm4, IyMm4 } = c.profile;
  const rows = cases.map((cs) => {
    const dx = (0.7 * cs.Fx * l ** 3) / (48 * E_STEEL * IyMm4) + sd.dx;
    const dy = (0.7 * cs.Fy * l ** 3) / (48 * E_STEEL * IxMm4) + sd.dy;
    return { case: cs.key, title: cs.title, Fx: cs.Fx, Fy: cs.Fy, deltaX: dx, deltaY: dy, ok: dx <= limitMm && dy <= limitMm };
  });
  const worst = rows.reduce((a, b) => (Math.max(b.deltaX, b.deltaY) > Math.max(a.deltaX, a.deltaY) ? b : a));
  const wd = Math.max(worst.deltaX, worst.deltaY);
  return makeResult({
    ruleId: `${prefix}-05`,
    title: `${label} · elastik sehim`,
    status: rows.every((r) => r.ok) ? STATUS.PASS : STATUS.FAIL,
    source: src,
    values: { deltaMax: { value: wd, unit: 'mm' } },
    limit: {
      description: `δ ≤ ${limitMm} mm (${safetyDeviceActs ? 'emniyet tertibatı etkin ray' : 'emniyet tertibatsız karşı ağırlık/denge rayı'})`,
      value: limitMm,
      unit: 'mm',
      direction: 'max',
    },
    margin: (limitMm - wd) / limitMm,
    formula: 'δx = 0,7·Fx·l³/(48·E·Iy) + δstr-x; δy = 0,7·Fy·l³/(48·E·Ix) + δstr-y; E = 210000 N/mm²',
    substitution: rows.map((r) => `${r.title}: δx=${fmt(r.deltaX, 3)}, δy=${fmt(r.deltaY, 3)} mm`).join(' | '),
    notes: [sd.note, 'Braket esnemesi, paten boşluğu ve ray doğruluğu ayrıca sistem güvenliği kontrolüne girer (EN 81-20 5.7.2.1.2).', SCOPE_NOTE],
    details: rows,
    inputs: copy(c),
  });
}

// ---- Kabin rayı ---------------------------------------------------------------------------------------
/**
 * @param {object} c
 * @param {{n:number,shoeSpacingMm:number,bracketSpacingMm:number,unitMassKgPerM:number,lineLengthM:number}} c.rails
 * @param {object} c.profile  { areaMm2, IxMm4, IyMm4, WxMm3, WyMm3, ixMm, iyMm, neckWidthCMm, headHeightH1Mm, footDepthFMm }
 * @param {{RmN_mm2:number,A5pct:number,evidenceRef:string}} c.material
 * @param {string} c.safetyDevice   K1_BY_SAFETY_DEVICE anahtarı (sertifikadan)
 * @param {{Dx:number,Dy:number,P:number,Q:number,C:{x,y},Pcg:{x,y},S:{x,y},doors:Array<{x,y}>,liftClass:string}} c.car
 * @param {{type:'roller'|'sliding',liningHalfWidthBMm?:number,liningLengthMm?:number}} c.shoe
 * @param {object} c.supportPath
 * @param {'x'|'envelope'} [c.flangeForceBasis='x']  'x': standardın formülü (yalnız Fx); 'envelope': max(|Fx|,|Fy|) muhafazakâr zarf
 */
export function checkCarRails(c) {
  const problems = geometryProblems(c);
  const car = c.car ?? {};
  problems.push(
    ...checkInputs(car, {
      Dx: { label: 'Kabin derinliği Dx (mm)', positive: true },
      Dy: { label: 'Kabin eni Dy (mm)', positive: true },
      P: { label: 'Boş kabin P (kg)', positive: true },
      Q: { label: 'Anma yükü Q (kg)', positive: true },
    }),
  );
  for (const pt of ['C', 'Pcg', 'S']) {
    if (!(isFiniteNumber(car[pt]?.x) && isFiniteNumber(car[pt]?.y))) problems.push(`Kabin konumu ${pt}: x ve y (mm, ray koordinat sisteminde) girilmeli`);
  }
  if (!Array.isArray(car.doors) || car.doors.length === 0 || car.doors.some((d) => !(isFiniteNumber(d?.x) && isFiniteNumber(d?.y)))) {
    problems.push('Kapı eşiği konumları (en az bir kapı, x/y mm) girilmeli');
  }
  if (!(car.liftClass in FS_FACTOR)) problems.push("Asansör sınıfı 'passenger', 'goods-passenger' veya 'goods-heavy-handling' olmalı (Fs, EN 81-20 5.7.2.3.6)");
  if (!(c.safetyDevice in K1_BY_SAFETY_DEVICE)) problems.push('Emniyet tertibatı tipi (k1) belirtilmeli; hızdan türetilmez, tip inceleme belgesinden alınır');

  const prefix = 'RAIL-C';
  const label = 'Kabin rayı';
  if (problems.length) {
    const src = SRC50('Ek C; 5.10');
    return ['02', '03', '04', '05'].map((n) =>
      blocked({ ruleId: `${prefix}-${n}`, title: `${label} · ${n === '02' ? 'eğilme' : n === '03' ? 'bası/burkulma' : n === '04' ? 'flanş eğilmesi' : 'sehim'}`, source: src, problems, inputs: copy(c) }),
    );
  }
  const cases = carRailForces(c);
  const results = railStressResults(c, cases, prefix, label);
  results.push(flangeResult(c, cases, prefix, label));
  results.push(deflectionResult(c, cases, prefix, label, 5, true));
  return results;
}

function flangeResult(c, cases, prefix, label) {
  const src = SRC50('5.10.5; Ek C.2.1.4/C.2.2.4/C.2.3.4', SOURCE_CLASS.NORMATIVE, 'Çizelge 15 emniyet katsayıları; paten geometrisi üretici verisi');
  const problems = [...materialProblems(c.material)];
  const pf = c.profile;
  const shoe = c.shoe ?? {};
  problems.push(
    ...checkInputs(pf, {
      neckWidthCMm: { label: 'Ayağa bağlantı kısmı eni c (mm)', positive: true },
      headHeightH1Mm: { label: 'Ray yüksekliği h1 (mm)', positive: true },
      footDepthFMm: { label: 'Ayak derinliği f (mm)', positive: true },
    }),
  );
  if (!['roller', 'sliding'].includes(shoe.type)) problems.push("Paten tipi 'roller' (döner) veya 'sliding' (kayar) olmalı");
  if (shoe.type === 'sliding') {
    if (!(isFiniteNumber(shoe.liningHalfWidthBMm) && shoe.liningHalfWidthBMm >= 0)) problems.push('Kayar paten astarı yarı genişliği b girilmemiş');
    if (!(isFiniteNumber(shoe.liningLengthMm) && shoe.liningLengthMm > 0)) problems.push('Kayar paten astarı uzunluğu l girilmemiş');
    if (!problems.length && !(pf.headHeightH1Mm > shoe.liningHalfWidthBMm + pf.footDepthFMm)) problems.push('h1 > b + f olmalı (paten geometrisi tutarsız)');
  }
  if (problems.length) return blocked({ ruleId: `${prefix}-04`, title: `${label} · T-ray flanş yerel eğilmesi`, source: src, problems, inputs: copy(c) });

  const basis = c.flangeForceBasis ?? 'x';
  const rows = cases.map((cs) => {
    const F = basis === 'x' ? Math.abs(cs.Fx) : Math.max(Math.abs(cs.Fx), Math.abs(cs.Fy));
    const sigmaF =
      shoe.type === 'roller'
        ? (1.85 * F) / pf.neckWidthCMm ** 2
        : (6 * F * (pf.headHeightH1Mm - shoe.liningHalfWidthBMm - pf.footDepthFMm)) /
          (pf.neckWidthCMm ** 2 * (shoe.liningLengthMm + 2 * (pf.headHeightH1Mm - pf.footDepthFMm)));
    const St = railSafetyFactor(c.material.A5pct, cs.key === 'safety');
    const sigmaPerm = St ? c.material.RmN_mm2 / St : NaN;
    return { case: cs.key, title: cs.title, F, sigmaF, sigmaPerm, St, ok: sigmaF <= sigmaPerm };
  });
  if (rows.some((r) => !Number.isFinite(r.sigmaPerm))) {
    return makeResult({ ruleId: `${prefix}-04`, title: `${label} · T-ray flanş yerel eğilmesi`, status: STATUS.FAIL, source: src, notes: ['A5 < %8: malzeme kullanılamaz.'], inputs: copy(c) });
  }
  const worst = rows.reduce((a, b) => (b.sigmaF / b.sigmaPerm > a.sigmaF / a.sigmaPerm ? b : a));
  return makeResult({
    ruleId: `${prefix}-04`,
    title: `${label} · T-ray flanş yerel eğilmesi`,
    status: rows.every((r) => r.ok) ? STATUS.PASS : STATUS.FAIL,
    source: src,
    values: { sigmaFmax: { value: Math.max(...rows.map((r) => r.sigmaF)), unit: 'N/mm²' }, utilization: { value: worst.sigmaF / worst.sigmaPerm, unit: '1' } },
    limit: { description: 'σF ≤ σperm = Rm/St', direction: 'max' },
    margin: 1 - worst.sigmaF / worst.sigmaPerm,
    formula: shoe.type === 'roller' ? 'σF = 1,85·Fx/c²' : 'σF = 6·Fx·(h1 − b − f) / (c²·(l + 2·(h1 − f)))',
    substitution: rows.map((r) => `${r.title}: Fx=${fmt(r.F, 1)} N, σF=${fmt(r.sigmaF, 2)} ≤ ${fmt(r.sigmaPerm, 2)}`).join(' | '),
    notes: [
      basis === 'envelope'
        ? 'Flanş kuvveti olarak max(|Fx|, |Fy|) zarfı alındı (muhafazakâr seçim; standart formülü yalnız Fx kullanır).'
        : 'Flanş kuvveti olarak yalnız Fx alındı (EN 81-50 5.10.5 ve Ek C formülü).',
      SCOPE_NOTE,
    ],
    details: rows,
    inputs: copy(c),
  });
}

// ---- Karşı ağırlık rayı --------------------------------------------------------------------------------
/**
 * Merkezî askılı, telafisiz karşı ağırlık rayı.
 * @param {object} c  rails/profile/material/supportPath/pushThroughForceN/travelHeightM + cwt {M, Dx, Dy}
 *                    + safetyDevice (yoksa tanımsız bırakılır; emniyet durumu hesaplanmaz, sehim sınırı 10 mm)
 *                    + compensation: 'none' | 'present'
 *                    + suspension: 'central'
 */
export function checkCounterweightRails(c) {
  const problems = geometryProblems(c);
  problems.push(...checkInputs(c.cwt ?? {}, { M: { label: 'Karşı ağırlık kütlesi (kg)', positive: true }, Dx: { label: 'Çerçeve derinliği Dx (mm)', positive: true }, Dy: { label: 'Çerçeve eni Dy (mm)', positive: true } }));
  if (c.suspension !== 'central') problems.push("Yalnız merkezî askılı karşı ağırlık desteklenir (suspension: 'central'); eksantrik/ikili düzen kapsam dışı");
  if (c.compensation !== 'none') problems.push("Telafi halatı/zinciri etkisi (5.7.2.3.3) modellenmedi; compensation: 'none' olmalı");
  const prefix = 'RAIL-W';
  const label = 'Karşı ağırlık rayı';
  if (problems.length) {
    return ['02', '03', '05'].map((n) =>
      blocked({ ruleId: `${prefix}-${n}`, title: `${label} · ${n === '02' ? 'eğilme' : n === '03' ? 'bası/burkulma' : 'sehim'}`, source: SRC50('5.10; Ek C.2'), problems, inputs: copy(c) }),
    );
  }
  const cases = counterweightRailForces(c);
  const results = railStressResults(c, cases, prefix, label);
  const withSafetyGear = Boolean(c.safetyDevice);
  results.push(deflectionResult(c, cases, prefix, label, withSafetyGear ? 5 : 10, withSafetyGear));
  for (const r of results) r.notes.push('Eksantriklik: genişliğin %5’i, derinliğin %10’u alındı (EN 81-20 5.7.2.3.3). Karşı ağırlık flanşı, braket ve paten kontrolleri bu sürümde yok.');
  return results;
}

export function railsOverall(results) {
  return worstStatus(results.map((r) => r.status));
}
