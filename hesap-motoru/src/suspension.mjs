// Askı elemanları — EN 81-20:2020 5.5 ve EN 81-50:2020 5.12.
//
//  SUS-001  halat anma çapı ve adedi            (EN 81-20 5.5.1.2 a, 5.5.1.3)
//  SUS-002  kasnak/makara çapı oranı D/d ≥ 40    (EN 81-20 5.5.2.1)
//  SUS-003  statik güvenlik katsayısı alt sınırı (EN 81-20 5.5.2.2)
//  SUS-004  EN 81-50 5.12 asgari güvenlik katsayısı
//  SUS-006  halat sonlandırma                    (EN 81-20 5.5.2.3; EN 13411)
//
// AVES iç kabulü (Ø6,5 mm halat × 210/240 mm kasnak): norm DEĞİLDİR. EN 81-20 5.5.1.2 a) (≥ 8 mm) ve
// 5.5.2.1 (D/d ≥ 40) ile çelişir; NB-L/REC 2/026 sürüm 06, 8 mm altı halatta eğilme dayanım
// deneyini ve yalnızca hesaba dayanan eşdeğerliğin kabul edilmediğini söyler. Bu nedenle istisna
// hiçbir koşulda PASS üretmez: kanıt referansı yoksa BLOCKED, varsa REVIEW.

import {
  STATUS,
  SOURCE_CLASS,
  makeResult,
  blocked,
  checkInputs,
  interpolate,
  isFiniteNumber,
  worstStatus,
  fmt,
} from './core.mjs';
import { tensions } from './tension.mjs';

const SRC81_20 = (clause, sourceClass = SOURCE_CLASS.NORMATIVE, note) => ({
  standard: 'EN 81-20',
  edition: '2020',
  clause,
  sourceClass,
  note,
});
const SRC81_50 = (clause, note) => ({
  standard: 'EN 81-50',
  edition: '2020',
  clause,
  sourceClass: SOURCE_CLASS.NORMATIVE,
  note,
});

// ---- EN 81-50:2020 5.12.2.2, Çizelge 2 ------------------------------------------------------
export const NEQUIV_T_V = [
  [35, 18.5],
  [36, 16],
  [38, 12],
  [40, 10],
  [42, 8],
  [45, 6.5],
  [50, 5],
];
export const NEQUIV_T_U_UNDERCUT = [
  [75, 2.5],
  [80, 3.0],
  [85, 3.8],
  [90, 5.0],
  [95, 6.7],
  [100, 10.0],
  [105, 15.2],
];

/** Çekme kasnağı eşdeğer sayısı Nequiv(t). Tablo dışında null (ekstrapolasyon yok). */
export function equivalentTractionSheaves(groove) {
  if (groove?.type === 'u') return 1; // alttan kesikli olmayan U oluk
  if (groove?.type === 'v') return interpolate(NEQUIV_T_V, groove.angleDeg);
  if (groove?.type === 'u-undercut') return interpolate(NEQUIV_T_U_UNDERCUT, groove.angleDeg);
  return null;
}

/** Ters eğilme koşulu (5.12.2.3): ardışık iki makara arası temas mesafesi < 200·d ve düzlem dönüşü > 120°. */
export function isReverseBend({ contactDistanceMm, planeRotationDeg, ropeDiameterMm }) {
  return contactDistanceMm < 200 * ropeDiameterMm && planeRotationDeg > 120;
}

/**
 * Nequiv(p) = Kp·(Nps + 4·Npr), Kp = (Dt/Dp)^4; Dp = çekme kasnağı hariç makaraların ortalama çapı.
 * pulleys: [{ diameterMm, simpleBends?, reverseBends? }]  (bir makara birden çok kez geçilebilir: E.3)
 */
export function equivalentDeflectionPulleys({ tractionSheaveDiameterMm, pulleys }) {
  if (!pulleys || pulleys.length === 0) return { Nps: 0, Npr: 0, Dp: null, Kp: null, Nequiv_p: 0 };
  const Nps = pulleys.reduce((s, p) => s + (p.simpleBends ?? 0), 0);
  const Npr = pulleys.reduce((s, p) => s + (p.reverseBends ?? 0), 0);
  const Dp = pulleys.reduce((s, p) => s + p.diameterMm, 0) / pulleys.length;
  const Kp = (tractionSheaveDiameterMm / Dp) ** 4;
  return { Nps, Npr, Dp, Kp, Nequiv_p: Kp * (Nps + 4 * Npr) };
}

/** EN 81-50 5.12.3 Sf = 10^(2,6834 − log10(695,85·10^6·Nequiv/(Dt/dr)^8,567) / log10(77,09·(Dt/dr)^−2,894)) */
export function minimumSafetyFactor({ DtOverDr, Nequiv }) {
  const x = DtOverDr;
  const [lo, hi] = FIGURE10_DD_RANGE;
  if (!isFiniteNumber(x) || x < lo || x > hi || !isFiniteNumber(Nequiv) || Nequiv <= 0) return null;
  const num = Math.log10((695.85e6 * Nequiv) / x ** 8.567);
  const den = Math.log10(77.09 * x ** -2.894);
  return 10 ** (2.6834 - num / den);
}

/** Şekil 10 çizilen aralık */
export const FIGURE10_DD_RANGE = Object.freeze([34, 80]);

// ---- yardımcılar -----------------------------------------------------------------------------
const AVES_EXCEPTION = Object.freeze({ ropeDiameterMm: 6.5, sheaveDiametersMm: [210, 240] });

function avesExceptionApplies(ropeDiameterMm, sheaveDiameterMm) {
  return (
    ropeDiameterMm === AVES_EXCEPTION.ropeDiameterMm && AVES_EXCEPTION.sheaveDiametersMm.includes(sheaveDiameterMm)
  );
}

const hasEvidence = (ref) => typeof ref === 'string' && ref.trim().length > 0;

function requiredStaticFactor(driveType, ropeCount) {
  if (driveType === 'traction') return ropeCount >= 3 ? 12 : ropeCount === 2 ? 16 : null;
  if (driveType === 'drum' || driveType === 'hydraulic-rope') return 12;
  return null;
}

function summary(input) {
  return JSON.parse(JSON.stringify(input));
}

// ---- ana kontrol -----------------------------------------------------------------------------
/**
 * @param {object} input
 * @param {'traction'|'drum'|'hydraulic-rope'} input.driveType
 * @param {number} input.reeving                  askı oranı r
 * @param {{nominalDiameterMm:number,count:number,minimumBreakingLoadN:number,certificateRef?:string}} input.rope
 * @param {{P:number,Q:number,Mtrav?:number,McrCar?:number,Mcomp?:number,MSRcarLowest:number}} input.masses
 *        MSRcarLowest: kabin en alt durakta iken kabin tarafı halatların toplam kütlesi (kg)
 * @param {{tractionDiameterMm:number, groove:{type:'v'|'u-undercut'|'u',angleDeg?:number},
 *          tractionPasses?:number, pulleys?:Array}} input.sheaves
 *        çaplar kasnak/makara EĞİM çapıdır (pitch diameter)
 * @param {{enabled:boolean, bendingEnduranceEvidenceRef?:string}} [input.avesException]
 * @param {{type:string, certificateRef?:string, sizeRangeMm?:[number,number], efficiencyEvidenceRef?:string}} input.termination
 */
export function checkSuspension(input) {
  const results = [];
  const rope = input.rope ?? {};
  const d = rope.nominalDiameterMm;
  const exceptionRequested = input.avesException?.enabled === true;
  const exceptionEvidence = input.avesException?.bendingEnduranceEvidenceRef;

  const baseProblems = [];
  if (!['traction', 'drum', 'hydraulic-rope'].includes(input.driveType)) {
    baseProblems.push("Tahrik tipi 'traction', 'drum' veya 'hydraulic-rope' olmalı (zincir bu sürümde yok)");
  }
  baseProblems.push(
    ...checkInputs(input, { reeving: { label: 'Askı oranı r', positive: true } }),
    ...checkInputs(rope, {
      nominalDiameterMm: { label: 'Halat anma çapı (mm)', positive: true },
      count: { label: 'Halat adedi', positive: true, integer: true },
      minimumBreakingLoadN: { label: 'Tek halat asgari kopma kuvveti (N)', positive: true },
    }),
  );

  // SUS-001 --------------------------------------------------------------------------------
  {
    const p = baseProblems.slice();
    if (p.length) {
      results.push(blocked({ ruleId: 'SUS-001', title: 'Halat anma çapı ve adedi', source: SRC81_20('5.5.1.2 a); 5.5.1.3'), problems: p, inputs: summary(input) }));
    } else {
      const diameterOk = d >= 8;
      const countOk = rope.count >= 2;
      const notes = [];
      let status = diameterOk && countOk ? STATUS.PASS : STATUS.FAIL;
      let sourceClass = SOURCE_CLASS.NORMATIVE;
      let blockers = [];
      if (!diameterOk) {
        notes.push('EN 81-20 5.5.1.2 a): halat anma çapı en az 8 mm olmalıdır.');
        if (exceptionRequested) {
          sourceClass = SOURCE_CLASS.AVES_POLICY;
          const s = input.sheaves ?? {};
          const sheaveDiameters = [s.tractionDiameterMm, ...(s.pulleys ?? []).map((pu) => pu.diameterMm)];
          const pairingOk = sheaveDiameters.every((D) => isFiniteNumber(D) && avesExceptionApplies(d, D));
          if (d !== AVES_EXCEPTION.ropeDiameterMm) {
            notes.push('AVES istisnası yalnız Ø6,5 mm halat için tanımlıdır; bu çap istisna kapsamında değil.');
          } else if (!pairingOk) {
            notes.push('AVES istisnası yalnız Ø6,5 mm halat ile 210 veya 240 mm kasnak/makara eşleşmesi içindir; bu düzen kapsam dışı.');
          } else if (!hasEvidence(exceptionEvidence)) {
            status = STATUS.BLOCKED;
            blockers = ['Ø6,5 mm halat için halat üreticisinin eğilme dayanım deney raporu referansı gerekli (NB-L/REC 2/026-06)'];
          } else {
            status = countOk ? STATUS.REVIEW : STATUS.FAIL;
            notes.push(
              'AVES iç kabulü uygulandı; norm şartı sağlanmıyor. Eğilme dayanım deney raporu referansı: ' + exceptionEvidence,
              'NB-L/REC 2/026-06 EN 81-1/2:1998 bağlamında yazılmıştır; EN 81-20:2020 için güncel durum onaylanmış kuruluşla doğrulanmalıdır.',
            );
          }
        }
      }
      if (!countOk) notes.push('EN 81-20 5.5.1.3: asgari halat adedi iki.');
      results.push(
        makeResult({
          ruleId: 'SUS-001',
          title: 'Halat anma çapı ve adedi',
          status,
          source: SRC81_20('5.5.1.2 a); 5.5.1.3', sourceClass),
          values: { ropeDiameter: { value: d, unit: 'mm' }, ropeCount: { value: rope.count, unit: '1' } },
          limit: { description: 'd ≥ 8 mm ve halat adedi ≥ 2', direction: 'min' },
          notes,
          blockers,
          inputs: summary(input),
        }),
      );
    }
  }

  // SUS-002 --------------------------------------------------------------------------------
  {
    const s = input.sheaves ?? {};
    const p = baseProblems.slice();
    p.push(...checkInputs(s, { tractionDiameterMm: { label: 'Çekme kasnağı eğim çapı (mm)', positive: true } }));
    for (const [i, pu] of (s.pulleys ?? []).entries()) {
      if (!(isFiniteNumber(pu.diameterMm) && pu.diameterMm > 0)) p.push(`Makara ${i + 1}: çap girilmemiş`);
    }
    if (p.length) {
      results.push(blocked({ ruleId: 'SUS-002', title: 'Kasnak/makara çapı oranı D/d', source: SRC81_20('5.5.2.1'), problems: p, inputs: summary(input) }));
    } else {
      const sheaves = [
        { name: 'Çekme kasnağı', D: s.tractionDiameterMm },
        ...(s.pulleys ?? []).map((pu, i) => ({ name: pu.name ?? `Makara ${i + 1}`, D: pu.diameterMm })),
      ].map((x) => ({ ...x, ratio: x.D / d }));
      const failing = sheaves.filter((x) => x.ratio < 40);
      const covered = failing.filter((x) => exceptionRequested && avesExceptionApplies(d, x.D));
      const uncovered = failing.filter((x) => !covered.includes(x));
      let status = STATUS.PASS;
      const notes = [];
      let blockers = [];
      let sourceClass = SOURCE_CLASS.NORMATIVE;
      if (uncovered.length) {
        status = STATUS.FAIL;
        notes.push('D/d < 40: ' + uncovered.map((x) => `${x.name} ${fmt(x.D)} mm → ${fmt(x.ratio, 2)}`).join('; '));
      } else if (covered.length) {
        sourceClass = SOURCE_CLASS.AVES_POLICY;
        if (!hasEvidence(exceptionEvidence)) {
          status = STATUS.BLOCKED;
          blockers = ['AVES istisnası kullanıldı ama eğilme dayanım deney raporu referansı yok'];
        } else {
          status = STATUS.REVIEW;
        }
        notes.push(
          'D/d < 40: ' + covered.map((x) => `${x.name} ${fmt(x.D)} mm → ${fmt(x.ratio, 2)}`).join('; '),
          'Bu sonuç AVES iç kabulüne dayanır, EN 81-20 5.5.2.1 şartını sağlamaz; norm uygunluğu olarak sunulamaz.',
        );
      }
      results.push(
        makeResult({
          ruleId: 'SUS-002',
          title: 'Kasnak/makara çapı oranı D/d',
          status,
          source: SRC81_20('5.5.2.1', sourceClass),
          values: Object.fromEntries(sheaves.map((x, i) => [`DOverD_${i + 1}`, { value: x.ratio, unit: '1', label: x.name }])),
          limit: { description: 'D/d ≥ 40 (sarım sayısından bağımsız)', value: 40, direction: 'min' },
          margin: Math.min(...sheaves.map((x) => (x.ratio - 40) / 40)),
          formula: 'D/d ≥ 40',
          substitution: sheaves.map((x) => `${x.name}: ${fmt(x.D)}/${fmt(d)} = ${fmt(x.ratio, 2)}`).join('; '),
          notes,
          blockers,
          inputs: summary(input),
        }),
      );
    }
  }

  // SUS-003 / SUS-004 ------------------------------------------------------------------------
  const m = input.masses ?? {};
  const forceProblems = baseProblems.slice();
  forceProblems.push(
    ...checkInputs(m, {
      P: { label: 'Boş kabin P', positive: true },
      Q: { label: 'Anma yükü Q', positive: true },
      MSRcarLowest: { label: 'Kabin tarafı halat kütlesi (en alt durak)', min: 0 },
    }),
  );
  let maxRopeForce = NaN;
  let safetyFactor = NaN;
  if (!forceProblems.length) {
    const { car } = tensions(
      {
        P: m.P,
        Q: m.Q,
        Mcwt: 0,
        r: input.reeving,
        MSRcar: m.MSRcarLowest,
        MSRcwt: 0,
        Mtrav: m.Mtrav ?? 0,
        McrCar: m.McrCar ?? 0,
        Mcomp: m.Mcomp ?? 0,
      },
      0,
      1,
    );
    maxRopeForce = car / rope.count;
    safetyFactor = rope.minimumBreakingLoadN / maxRopeForce;
  }

  {
    const minFactor = requiredStaticFactor(input.driveType, rope.count);
    const p = forceProblems.slice();
    if (minFactor === null && !p.length) p.push('Bu tahrik tipi ve halat adedi için EN 81-20 5.5.2.2 alt sınırı tanımlanamadı');
    if (p.length) {
      results.push(blocked({ ruleId: 'SUS-003', title: 'Askı güvenlik katsayısı alt sınırı', source: SRC81_20('5.5.2.2'), problems: p, inputs: summary(input) }));
    } else {
      const ok = safetyFactor >= minFactor;
      results.push(
        makeResult({
          ruleId: 'SUS-003',
          title: 'Askı güvenlik katsayısı alt sınırı',
          status: ok ? STATUS.PASS : STATUS.FAIL,
          source: SRC81_20('5.5.2.2'),
          values: {
            maxRopeForce: { value: maxRopeForce, unit: 'N' },
            safetyFactor: { value: safetyFactor, unit: '1' },
          },
          limit: { description: 'S ≥ ' + minFactor, value: minFactor, direction: 'min' },
          margin: (safetyFactor - minFactor) / minFactor,
          formula: 'S = F_kopma,tek halat / F_max,halat; F_max = T_kabin(Q anma, a=0) / n',
          substitution: `F_max=${fmt(maxRopeForce, 1)} N; S=${fmt(rope.minimumBreakingLoadN, 0)}/${fmt(maxRopeForce, 1)}=${fmt(safetyFactor, 3)}`,
          notes: ['Kabin en alt durakta, anma yükünde, kabin tarafı halat kütlesi dahil (EN 81-20 5.5.2.2).'],
          inputs: summary(input),
        }),
      );
    }
  }

  if (input.driveType !== 'traction') {
    results.push(
      makeResult({
        ruleId: 'SUS-004',
        title: 'EN 81-50 5.12 asgari güvenlik katsayısı',
        status: STATUS.PASS,
        source: SRC81_50('5.12.1', 'Yalnız sürtünme tahrikli (traction) asansörlere uygulanır.'),
        notes: ['Bu tahrik tipinde 5.12 uygulanmaz.'],
        inputs: summary(input),
      }),
    );
  } else {
    const s = input.sheaves ?? {};
    const p = forceProblems.slice();
    p.push(...checkInputs(s, { tractionDiameterMm: { label: 'Çekme kasnağı eğim çapı (mm)', positive: true } }));
    const passes = s.tractionPasses ?? 1;
    if (!Number.isInteger(passes) || passes < 1) p.push('tractionPasses ≥ 1 tam sayı olmalı');
    const Nt1 = equivalentTractionSheaves(s.groove);
    if (Nt1 === null) p.push('Oluk tipi/açısı Çizelge 2 aralığında değil (ekstrapolasyon yapılmaz)');
    if (!Array.isArray(s.pulleys)) {
      p.push('Saptırma makaraları listesi gerekli; makara yoksa boş liste [] girilmeli');
    } else {
      for (const [i, pu] of s.pulleys.entries()) {
        if (!(isFiniteNumber(pu?.diameterMm) && pu.diameterMm > 0)) p.push(`Makara ${i + 1}: çap girilmemiş`);
        for (const key of ['simpleBends', 'reverseBends']) {
          if (!Number.isInteger(pu?.[key]) || pu[key] < 0) {
            p.push(`Makara ${i + 1}: ${key} sıfır veya pozitif tam sayı olarak belirtilmeli`);
          }
        }
        if (Number.isInteger(pu?.simpleBends) && Number.isInteger(pu?.reverseBends) && pu.simpleBends + pu.reverseBends < 1) {
          p.push(`Makara ${i + 1}: en az bir eğilme sayısı belirtilmeli`);
        }
      }
    }
    if (p.length) {
      results.push(blocked({ ruleId: 'SUS-004', title: 'EN 81-50 5.12 asgari güvenlik katsayısı', source: SRC81_50('5.12'), problems: p, inputs: summary(input) }));
    } else {
      const DtOverDr = s.tractionDiameterMm / d;
      const Nt = Nt1 * passes;
      const pul = equivalentDeflectionPulleys({ tractionSheaveDiameterMm: s.tractionDiameterMm, pulleys: s.pulleys });
      const Nequiv = Nt + pul.Nequiv_p;
      const [lo, hi] = FIGURE10_DD_RANGE;
      const outside = DtOverDr < lo || DtOverDr > hi;
      if (outside) {
        results.push(
          blocked({
            ruleId: 'SUS-004',
            title: 'EN 81-50 5.12 asgari güvenlik katsayısı',
            source: SRC81_50('5.12.2–5.12.3; Çizelge 2; Şekil 10'),
            problems: [`Dt/dr = ${fmt(DtOverDr, 2)}; Şekil 10 yalnız ${lo}–${hi} aralığını kapsar. Aralık dışında ekstrapolasyon yapılmadı.`],
            inputs: summary(input),
          }),
        );
      } else {
        const Sf = minimumSafetyFactor({ DtOverDr, Nequiv });
        const staticMin = requiredStaticFactor('traction', rope.count);
        const combinedMin = Math.max(Sf, staticMin ?? 0);
        const status = !Number.isFinite(Sf) || !Number.isFinite(safetyFactor)
          ? STATUS.BLOCKED
          : safetyFactor >= combinedMin ? STATUS.PASS : STATUS.FAIL;
        results.push(
          makeResult({
            ruleId: 'SUS-004',
            title: 'EN 81-50 5.12 asgari güvenlik katsayısı',
            status,
            source: SRC81_50('5.12.2–5.12.3; Çizelge 2; Şekil 10'),
            values: {
              DtOverDr: { value: DtOverDr, unit: '1' },
              NequivT: { value: Nt, unit: '1' },
              Kp: { value: pul.Kp ?? 0, unit: '1' },
              NequivP: { value: pul.Nequiv_p, unit: '1' },
              Nequiv: { value: Nequiv, unit: '1' },
              SfMin: { value: Sf, unit: '1' },
              combinedMin: { value: combinedMin, unit: '1' },
              safetyFactor: { value: safetyFactor, unit: '1' },
            },
            limit: { description: 'S ≥ max(5.5.2.2 alt sınırı, 5.12 Sf)', value: combinedMin, direction: 'min' },
            margin: (safetyFactor - combinedMin) / combinedMin,
            formula:
              'Sf = 10^(2,6834 − log10(695,85·10⁶·Nequiv/(Dt/dr)^8,567) / log10(77,09·(Dt/dr)^−2,894)); Nequiv = Nequiv(t) + Kp·(Nps + 4·Npr); Kp = (Dt/Dp)⁴',
            substitution: `Dt/dr=${fmt(DtOverDr, 2)}; Nequiv(t)=${fmt(Nt, 2)}; Kp=${fmt(pul.Kp ?? 0, 3)}; Nps=${pul.Nps}; Npr=${pul.Npr}; Nequiv=${fmt(Nequiv, 3)}; Sf=${fmt(Sf, 3)}; S=${fmt(safetyFactor, 3)}`,
            inputs: summary(input),
          }),
        );
      }
    }
  }

  // SUS-006 ----------------------------------------------------------------------------------
  {
    const t = input.termination ?? {};
    const p = [];
    const allowed = {
      'wedge-13411-6': 'EN 13411-6 asimetrik kamalı soket',
      'wedge-13411-7': 'EN 13411-7 simetrik kamalı soket',
      'ferrule-13411-3': 'EN 13411-3 kelepçeli göz',
      'swage-13411-8': 'EN 13411-8 pres terminal',
    };
    if (!t.type) p.push('Sonlandırma tipi girilmemiş');
    if (!isFiniteNumber(d)) p.push('Halat anma çapı girilmemiş');
    if (p.length) {
      results.push(blocked({ ruleId: 'SUS-006', title: 'Halat sonlandırma', source: SRC81_20('5.5.2.3'), problems: p, inputs: summary(input) }));
    } else if (allowed[t.type]) {
      const q = [];
      if (!hasEvidence(t.certificateRef)) q.push('Sonlandırıcı imalatçı sertifikası/uygunluk beyanı referansı yok');
      if (!(Array.isArray(t.sizeRangeMm) && t.sizeRangeMm.length === 2)) q.push('Sonlandırıcının halat çapı aralığı (sizeRangeMm) girilmemiş');
      if (q.length) {
        results.push(blocked({ ruleId: 'SUS-006', title: 'Halat sonlandırma', source: SRC81_20('5.5.2.3; 5.5.2.3.1'), problems: q, inputs: summary(input) }));
      } else {
        const [lo, hi] = t.sizeRangeMm;
        const inRange = d >= lo && d <= hi;
        results.push(
          makeResult({
            ruleId: 'SUS-006',
            title: 'Halat sonlandırma',
            status: inRange ? STATUS.PASS : STATUS.FAIL,
            source: SRC81_20('5.5.2.3; 5.5.2.3.1', SOURCE_CLASS.NORMATIVE, 'EN 13411-3/-6/-7/-8 sonlandırmalarında ≥ %80 MBL varsayılabilir (Not).'),
            values: { terminationEfficiencyAssumed: { value: 0.8, unit: '1', label: 'varsayım (hesaplanan değil)' } },
            limit: { description: 'Sonlandırma ≥ %80 MBL; halat çapı sonlandırıcı aralığında', value: 0.8, direction: 'min' },
            notes: [
              `Tip: ${allowed[t.type]}. %80 değeri standardın Not’una dayanan kabuldür, ölçülen verim değildir.`,
              inRange ? 'Halat çapı sonlandırıcının belgeli aralığında.' : `Halat çapı ${fmt(d)} mm sonlandırıcı aralığı dışında (${lo}–${hi} mm).`,
              'Sonlandırıcı sertifikası: ' + t.certificateRef,
            ],
            inputs: summary(input),
          }),
        );
      }
    } else if (hasEvidence(t.efficiencyEvidenceRef)) {
      results.push(
        makeResult({
          ruleId: 'SUS-006',
          title: 'Halat sonlandırma',
          status: STATUS.REVIEW,
          source: SRC81_20('5.5.2.3; 5.5.2.3.1'),
          notes: [
            'Sonlandırma tipi 5.5.2.3.1 listesinde (EN 13411-3/-6/-7/-8) yok; verim kanıtı: ' + t.efficiencyEvidenceRef,
            '≥ %80 MBL kanıtı mühendis tarafından değerlendirilmelidir.',
          ],
          inputs: summary(input),
        }),
      );
    } else {
      results.push(
        blocked({
          ruleId: 'SUS-006',
          title: 'Halat sonlandırma',
          source: SRC81_20('5.5.2.3; 5.5.2.3.1'),
          problems: ['Sonlandırma tipi 5.5.2.3.1 listesinde değil ve ≥ %80 MBL verim kanıtı referansı yok'],
          inputs: summary(input),
        }),
      );
    }
  }

  return results;
}

export function suspensionOverall(results) {
  return worstStatus(results.map((r) => r.status));
}
