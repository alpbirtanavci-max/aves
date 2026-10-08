// Emniyet tertibatı, hız regülatörü ve tamponlar.
//
//  SG-001  kademeli emniyet tertibatı izin verilebilir kütle ve ±%7,5 uygulanabilir kütle   (EN 81-50 5.3.3, 5.3.4)
//  SG-002  kademeli tertibat anma yükünde ortalama yavaşlama 0,2–1,0 gₙ                      (EN 81-20 5.6.2.1.3)
//  GOV-001 devreye girme hızı aralığı                                                       (EN 81-20 5.6.2.2.1.1 a)
//  GOV-002 regülatör halat kuvveti ≥ max(2·F_tertibat, 300 N)                               (EN 81-20 5.6.2.2.1.1 d)
//  GOV-003 regülatör halatı D/d ≥ 30 ve MBL/T ≥ 8                                            (EN 81-20 5.6.2.2.1.3)
//  BUF-001 tampon tipi / anma hızı kapısı                                                   (EN 81-20 5.8.1.5–5.8.1.6)
//  BUF-002 tampon stroku                                                                     (EN 81-20 5.8.2)
//  BUF-003 model, yük ve hız aralığı (sertifika)                                             (EN 81-50 5.5; üretici belgesi)

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

const SRC20 = (clause, cls = SOURCE_CLASS.NORMATIVE, note) => ({ standard: 'EN 81-20', edition: '2020', clause, sourceClass: cls, note });
const SRC50 = (clause, cls = SOURCE_CLASS.NORMATIVE, note) => ({ standard: 'EN 81-50', edition: '2020', clause, sourceClass: cls, note });
const copy = (x) => JSON.parse(JSON.stringify(x));
const hasText = (s) => typeof s === 'string' && s.trim().length > 0;

// ---- kademeli emniyet tertibatı -----------------------------------------------------------------------
/**
 * @param {object} i
 * @param {number[]} i.testBrakingForcesN         tip deneyindeki ortalama fren kuvvetleri (tek kütle için dört deney)
 * @param {number}   i.testedMassKg               deney kütlesi (P+Q)₁ denenen
 * @param {number[]} [i.testAverageDecelerationsGn] deneylerdeki ortalama yavaşlamalar (gₙ); F_B/16 > deney kütlesi ise gerekli
 * @param {number}   i.P  i.Q                     uygulanacak boş kabin ve anma yükü
 * @param {number}   [i.ratedLoadAverageDecelerationGn] anma yükünde ortalama yavaşlama (SG-002)
 */
export function checkProgressiveSafetyGear(i) {
  const results = [];
  const problems = [];
  const F = i.testBrakingForcesN;
  if (!Array.isArray(F) || F.length !== 4 || F.some((v) => !(isFiniteNumber(v) && v > 0))) {
    problems.push('Tek kütle için dört deney fren kuvveti (N, > 0) girilmeli (EN 81-50 5.3.3.2.2.1)');
  }
  problems.push(
    ...checkInputs(i, {
      testedMassKg: { label: 'Denenen kütle (kg)', positive: true },
      P: { label: 'Boş kabin P (kg)', positive: true },
      Q: { label: 'Anma yükü Q (kg)', positive: true },
    }),
  );
  const src = SRC50('5.3.3.3.1; 5.3.3.2.3.1; 5.3.4 a)');
  if (problems.length) {
    results.push(blocked({ ruleId: 'SG-001', title: 'Kademeli emniyet tertibatı izin verilebilir kütle', source: src, problems, inputs: copy(i) }));
  } else {
    const FB = F.reduce((a, b) => a + b, 0) / 4;
    const maxDev = Math.max(...F.map((v) => Math.abs(v - FB) / FB));
    const notes = [];
    let permissible = FB / 16;
    let status = STATUS.PASS;
    const blockers = [];
    if (maxDev > 0.25 + 1e-12) {
      blockers.push(`Deney kuvvetlerinden biri ortalamadan %${fmt(maxDev * 100, 1)} sapıyor (sınır %25); F_B belirlenemez`);
    }
    if (!blockers.length && permissible > i.testedMassKg) {
      const d = i.testAverageDecelerationsGn;
      if (Array.isArray(d) && d.length >= 1 && d.every((v) => isFiniteNumber(v) && v > 0 && v <= 1)) {
        notes.push('F_B/16 deney kütlesini aşıyor; her deneyde ortalama yavaşlama ≤ 1 gₙ olduğundan deney kütlesi izin verilen kütle alındı (5.3.3.3.1).');
        permissible = i.testedMassKg;
      } else {
        blockers.push('F_B/16 deney kütlesini aşıyor; her deneyin ortalama yavaşlamasının ≤ 1 gₙ olduğu kanıtı girilmemiş');
      }
    }
    if (blockers.length) {
      results.push(blocked({ ruleId: 'SG-001', title: 'Kademeli emniyet tertibatı izin verilebilir kütle', source: src, problems: blockers, inputs: copy(i) }));
    } else {
      const applied = i.P + i.Q;
      const deviation = (applied - permissible) / permissible;
      const ok = Math.abs(deviation) <= 0.075 + 1e-12;
      status = ok ? STATUS.PASS : STATUS.FAIL;
      results.push(
        makeResult({
          ruleId: 'SG-001',
          title: 'Kademeli emniyet tertibatı izin verilebilir kütle',
          status,
          source: src,
          values: {
            FB: { value: FB, unit: 'N' },
            maxDeviation: { value: maxDev, unit: '1' },
            permissibleMass: { value: permissible, unit: 'kg' },
            appliedMass: { value: applied, unit: 'kg' },
            relativeDeviation: { value: deviation, unit: '1' },
          },
          limit: { description: '|(P+Q) − (P+Q)₁| / (P+Q)₁ ≤ 0,075 (iki yönde)', value: 0.075, direction: 'max' },
          margin: (0.075 - Math.abs(deviation)) / 0.075,
          formula: 'F_B = ΣF_i/4 (her F_i ±%25 içinde); (P+Q)₁ = F_B/16; sapma = ((P+Q) − (P+Q)₁)/(P+Q)₁',
          substitution: `F_B=${fmt(FB, 1)} N; (P+Q)₁=${fmt(permissible, 1)} kg; P+Q=${fmt(applied, 1)} kg; sapma=${fmt(deviation * 100, 2)} %`,
          notes: [...notes, 'Tip inceleme belgesindeki kütle limitleri, ray tipi/bıçak kalınlığı ve yüzey/yağlama koşulları ayrıca eşleştirilmelidir.'],
          inputs: copy(i),
        }),
      );
    }
  }

  // SG-002
  const dProblems = checkInputs(i, { ratedLoadAverageDecelerationGn: { label: 'Anma yükünde ortalama yavaşlama (gₙ)', positive: true } });
  if (dProblems.length) {
    results.push(blocked({ ruleId: 'SG-002', title: 'Kademeli tertibat ortalama yavaşlama', source: SRC20('5.6.2.1.3'), problems: dProblems, inputs: copy(i) }));
  } else {
    const a = i.ratedLoadAverageDecelerationGn;
    results.push(
      makeResult({
        ruleId: 'SG-002',
        title: 'Kademeli tertibat ortalama yavaşlama',
        status: a >= 0.2 && a <= 1.0 ? STATUS.PASS : STATUS.FAIL,
        source: SRC20('5.6.2.1.3'),
        values: { averageDeceleration: { value: a, unit: 'gₙ' } },
        limit: { description: '0,2 gₙ ≤ a ≤ 1,0 gₙ', direction: 'max' },
        formula: '0,2·gₙ ≤ a_ort ≤ 1,0·gₙ',
        substitution: `a_ort = ${fmt(a, 3)} gₙ`,
        inputs: copy(i),
      }),
    );
  }
  return results;
}

// ---- hız regülatörü -----------------------------------------------------------------------------------------
const GOVERNOR_TRIP_LIMIT = (gearType, v) => {
  if (gearType === 'instantaneous') return 0.8;
  if (gearType === 'instantaneous-captive-roller') return 1.0;
  if (gearType === 'progressive') return v <= 1.0 ? 1.5 : 1.25 * v + 0.25 / v;
  return null;
};

/**
 * @param {object} i
 * @param {number} i.ratedSpeedMps
 * @param {'instantaneous'|'instantaneous-captive-roller'|'progressive'} i.gearType
 * @param {number} i.tripSpeedMps
 * @param {number} i.gearActuationForceN       tertibatı çalıştırmak için gerekli kuvvet
 * @param {number} i.governorRopeForceN        devreye girişte regülatör halatında üretilen kuvvet
 * @param {number} i.pulleyDiameterMm  i.ropeDiameterMm  i.ropeMinimumBreakingLoadN
 */
export function checkGovernor(i) {
  const results = [];
  const clauseA = '5.6.2.2.1.1 a)';
  const pA = checkInputs(i, {
    ratedSpeedMps: { label: 'Anma hızı (m/s)', positive: true },
    tripSpeedMps: { label: 'Devreye girme hızı (m/s)', positive: true },
  });
  if (!['instantaneous', 'instantaneous-captive-roller', 'progressive'].includes(i.gearType)) pA.push('Emniyet tertibatı tipi belirtilmeli (tip inceleme belgesinden)');
  if (pA.length) {
    results.push(blocked({ ruleId: 'GOV-001', title: 'Regülatör devreye girme hızı', source: SRC20(clauseA), problems: pA, inputs: copy(i) }));
  } else {
    const lower = 1.15 * i.ratedSpeedMps;
    const upper = GOVERNOR_TRIP_LIMIT(i.gearType, i.ratedSpeedMps);
    const ok = i.tripSpeedMps >= lower && i.tripSpeedMps < upper;
    results.push(
      makeResult({
        ruleId: 'GOV-001',
        title: 'Regülatör devreye girme hızı',
        status: ok ? STATUS.PASS : STATUS.FAIL,
        source: SRC20(clauseA),
        values: { lower: { value: lower, unit: 'm/s' }, upper: { value: upper, unit: 'm/s' }, trip: { value: i.tripSpeedMps, unit: 'm/s' } },
        limit: { description: '1,15·v ≤ v_trip < üst sınır', direction: 'max' },
        formula: '1,15·v ≤ v_trip < {0,8 | 1,0 | 1,5 (v ≤ 1) | 1,25·v + 0,25/v (v > 1)}',
        substitution: `${fmt(lower, 3)} ≤ ${fmt(i.tripSpeedMps, 3)} < ${fmt(upper, 3)} m/s`,
        inputs: copy(i),
      }),
    );
  }

  const pF = checkInputs(i, {
    gearActuationForceN: { label: 'Tertibatı çalıştırma kuvveti (N)', positive: true },
    governorRopeForceN: { label: 'Regülatör halat kuvveti (N)', positive: true },
  });
  if (pF.length) {
    results.push(blocked({ ruleId: 'GOV-002', title: 'Regülatör halat kuvveti', source: SRC20('5.6.2.2.1.1 d)'), problems: pF, inputs: copy(i) }));
  } else {
    const required = Math.max(2 * i.gearActuationForceN, 300);
    results.push(
      makeResult({
        ruleId: 'GOV-002',
        title: 'Regülatör halat kuvveti',
        status: i.governorRopeForceN >= required ? STATUS.PASS : STATUS.FAIL,
        source: SRC20('5.6.2.2.1.1 d)'),
        values: { required: { value: required, unit: 'N' }, available: { value: i.governorRopeForceN, unit: 'N' } },
        limit: { description: 'F ≥ max(2·F_tertibat, 300 N)', value: required, unit: 'N', direction: 'min' },
        margin: (i.governorRopeForceN - required) / required,
        formula: 'F_regülatör ≥ max(2·F_tertibat, 300 N)',
        substitution: `${fmt(i.governorRopeForceN, 1)} ≥ ${fmt(required, 1)} N`,
        inputs: copy(i),
      }),
    );
  }

  const pR = checkInputs(i, {
    pulleyDiameterMm: { label: 'Regülatör kasnak çapı (mm)', positive: true },
    ropeDiameterMm: { label: 'Regülatör halat çapı (mm)', positive: true },
    ropeMinimumBreakingLoadN: { label: 'Regülatör halatı MBL (N)', positive: true },
    governorRopeForceN: { label: 'Regülatör halat kuvveti (N)', positive: true },
  });
  if (pR.length) {
    results.push(blocked({ ruleId: 'GOV-003', title: 'Regülatör halatı D/d ve güvenlik katsayısı', source: SRC20('5.6.2.2.1.3 b)–c)'), problems: pR, inputs: copy(i) }));
  } else {
    const dd = i.pulleyDiameterMm / i.ropeDiameterMm;
    const k = i.ropeMinimumBreakingLoadN / i.governorRopeForceN;
    results.push(
      makeResult({
        ruleId: 'GOV-003',
        title: 'Regülatör halatı D/d ve güvenlik katsayısı',
        status: dd >= 30 && k >= 8 ? STATUS.PASS : STATUS.FAIL,
        source: SRC20('5.6.2.2.1.3 b)–c)'),
        values: { DOverD: { value: dd, unit: '1' }, safetyFactor: { value: k, unit: '1' } },
        limit: { description: 'D/d ≥ 30 ve MBL/T ≥ 8', direction: 'min' },
        formula: 'D/d ≥ 30; F_min/T_max ≥ 8',
        substitution: `D/d = ${fmt(dd, 2)}; k = ${fmt(k, 2)}`,
        notes: ['T_max, μmax = 0,2 ile belirlenen en yüksek devreye girme gerilmesidir (tahrikli regülatörlerde).'],
        inputs: copy(i),
      }),
    );
  }
  return results;
}

// ---- tamponlar ------------------------------------------------------------------------------------------------
const norm = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * @param {object} i
 * @param {number} i.ratedSpeedMps
 * @param {'linear-storing'|'nonlinear-storing'|'dissipating'} i.bufferType
 * @param {'hydraulic'|'polyurethane'|'other'} [i.material]
 * @param {number} i.strokeMm                         projede/ürün satırında beyan edilen toplam olası strok
 * @param {boolean} [i.slowdownMonitored]             son durak yavaşlaması izleniyor (5.12.1.3), yalnız > 2,5 m/s
 * @param {number} [i.contactSpeedMps]
 * @param {object} i.load  { massKg, count }          tampon başına yük = massKg/count (P+Q veya karşı ağırlık)
 * @param {object} i.certificate { model, projectModel, minMassKgPerBuffer, maxMassKgPerBuffer, maxSpeedMps,
 *                                  certificateRef, productionEvidenceRef? }
 * @param {{enabled:boolean, hydraulicAtOrAboveMps:number}} [i.avesPolicy]
 */
export function checkBuffers(i) {
  const results = [];
  const v = i.ratedSpeedMps;
  const baseProblems = checkInputs(i, { ratedSpeedMps: { label: 'Anma hızı (m/s)', positive: true } });
  if (!['linear-storing', 'nonlinear-storing', 'dissipating'].includes(i.bufferType)) {
    baseProblems.push('Tampon enerji sınıfı (linear-storing / nonlinear-storing / dissipating) sertifikadan belirtilmeli');
  }

  // BUF-001 — tip/hız kapısı
  {
    const src = SRC20('5.8.1.5; 5.8.1.6');
    if (baseProblems.length) {
      results.push(blocked({ ruleId: 'BUF-001', title: 'Tampon tipi / anma hızı', source: src, problems: baseProblems, inputs: copy(i) }));
    } else {
      const notes = [];
      let ok = i.bufferType === 'dissipating' || v <= 1.0;
      if (!ok) notes.push('Enerji biriktiren tamponlar yalnız anma hızı ≤ 1 m/s için kullanılabilir (5.8.1.5).');
      let status = ok ? STATUS.PASS : STATUS.FAIL;
      let sourceClass = SOURCE_CLASS.NORMATIVE;
      const pol = i.avesPolicy;
      if (ok && pol?.enabled && v >= pol.hydraulicAtOrAboveMps) {
        sourceClass = SOURCE_CLASS.AVES_POLICY;
        if (!(i.bufferType === 'dissipating' && i.material === 'hydraulic')) {
          status = STATUS.FAIL;
          notes.push(`AVES uygulama filtresi: v ≥ ${pol.hydraulicAtOrAboveMps} m/s için hidrolik enerji dağıtan tampon aranır (norm şartı değildir).`);
        }
      }
      results.push(
        makeResult({
          ruleId: 'BUF-001',
          title: 'Tampon tipi / anma hızı',
          status,
          source: { ...src, sourceClass },
          values: { ratedSpeed: { value: v, unit: 'm/s' } },
          limit: { description: 'Enerji biriktiren tampon: v ≤ 1 m/s; enerji dağıtan: her hız', value: 1.0, unit: 'm/s', direction: 'max' },
          notes,
          inputs: copy(i),
        }),
      );
    }
  }

  // BUF-002 — strok
  {
    const src = SRC20('5.8.2.1.1; 5.8.2.2.1; 5.8.2.2.2');
    const p = [...baseProblems];
    p.push(...checkInputs(i, { strokeMm: { label: 'Toplam olası strok (mm)', positive: true } }));
    if (p.length) {
      results.push(blocked({ ruleId: 'BUF-002', title: 'Tampon stroku', source: src, problems: p, inputs: copy(i) }));
    } else if (i.bufferType === 'nonlinear-storing') {
      results.push(
        makeResult({
          ruleId: 'BUF-002',
          title: 'Tampon stroku',
          status: STATUS.REVIEW,
          source: src,
          notes: [
            'Doğrusal olmayan enerji biriktiren tamponda basit strok formülü yoktur; performans (yavaşlama ≤ 1 gₙ, > 2,5 gₙ en çok 0,04 s, dönüş hızı ≤ 1 m/s, kalıcı deformasyon yok, tepe ≤ 6 gₙ) tip deney verisiyle doğrulanır (5.8.2.1.2).',
            `Beyan edilen strok: ${fmt(i.strokeMm)} mm.`,
          ],
          inputs: copy(i),
        }),
      );
    } else {
      let minMm;
      let formula;
      const notes = [];
      if (i.bufferType === 'linear-storing') {
        minMm = Math.max(0.135 * v * v, 0.065) * 1000;
        formula = 's ≥ max(0,135·v², 0,065 m)';
      } else if (i.slowdownMonitored && v > 2.5) {
        if (!isFiniteNumber(i.contactSpeedMps) || i.contactSpeedMps <= 0) {
          results.push(blocked({ ruleId: 'BUF-002', title: 'Tampon stroku', source: src, problems: ['Azaltılmış strok için temas hızı girilmeli'], inputs: copy(i) }));
          minMm = null;
        } else {
          minMm = Math.max((i.contactSpeedMps ** 2 / (2 * G_N)) * 1000, 420);
          formula = 's ≥ max(v_temas²/(2·gₙ), 0,42 m)';
        }
      } else {
        minMm = 0.0674 * v * v * 1000;
        formula = 's ≥ 0,0674·v²';
      }
      if (minMm !== null) {
        const ok = i.strokeMm >= minMm;
        if (i.bufferType === 'linear-storing') {
          notes.push('Statik yük 2,5–4 × (P+Q) altında bu stroku karşılamalı (5.8.2.1.1.2); bu hesapta yük penceresi kontrol edilmez.');
        }
        results.push(
          makeResult({
            ruleId: 'BUF-002',
            title: 'Tampon stroku',
            status: ok ? STATUS.PASS : STATUS.FAIL,
            source: src,
            values: { minimumStroke: { value: minMm, unit: 'mm' }, declaredStroke: { value: i.strokeMm, unit: 'mm' } },
            limit: { description: formula, value: minMm, unit: 'mm', direction: 'min' },
            margin: (i.strokeMm - minMm) / minMm,
            formula,
            substitution: `${fmt(i.strokeMm, 1)} ≥ ${fmt(minMm, 1)} mm`,
            notes: [
              ...notes,
              ok ? '' : 'Üretici beyan stroku normatif asgari değerin altında. Üretici satırını kabul eden bir AVES politikası norm yerine geçmez; mühendis kararı ve üretici gerekçesi gerekir.',
            ].filter(Boolean),
            inputs: copy(i),
          }),
        );
      }
    }
  }

  // BUF-003 — model, yük, hız (sertifika)
  {
    const src = { standard: 'EN 81-50', edition: '2020', clause: '5.5; sertifika eki', sourceClass: SOURCE_CLASS.MANUFACTURER };
    const c = i.certificate ?? {};
    const p = [...baseProblems];
    p.push(
      ...checkInputs(c, {
        minMassKgPerBuffer: { label: 'Sertifika asgari kütle / tampon (kg)', positive: true },
        maxMassKgPerBuffer: { label: 'Sertifika azami kütle / tampon (kg)', positive: true },
        maxSpeedMps: { label: 'Sertifika azami hız (m/s)', positive: true },
      }),
      ...checkInputs(i.load ?? {}, { massKg: { label: 'Tampona etkiyen kütle (kg)', positive: true }, count: { label: 'Tampon adedi', positive: true, integer: true } }),
    );
    if (!hasText(c.certificateRef)) p.push('Sertifika/belge referansı girilmemiş');
    if (!hasText(c.model) || !hasText(c.projectModel)) p.push('Sertifika modeli ve proje modeli girilmeli');
    if (p.length) {
      results.push(blocked({ ruleId: 'BUF-003', title: 'Tampon model, yük ve hız aralığı', source: src, problems: p, inputs: copy(i) }));
    } else {
      const perBuffer = i.load.massKg / i.load.count;
      const modelOk = norm(c.model) === norm(c.projectModel);
      const massOk = perBuffer >= c.minMassKgPerBuffer && perBuffer <= c.maxMassKgPerBuffer;
      const speedOk = v <= c.maxSpeedMps + 1e-9;
      const notes = [];
      if (!modelOk) notes.push(`Model eşleşmiyor: sertifika "${c.model}" ≠ proje "${c.projectModel}" (belgelenmiş eşdeğerlik olmadan kabul edilmez).`);
      if (!massOk) notes.push(`Tampon başına kütle ${fmt(perBuffer, 1)} kg sertifika aralığı dışında (${c.minMassKgPerBuffer}–${c.maxMassKgPerBuffer} kg).`);
      if (!speedOk) notes.push(`Anma hızı ${fmt(v)} m/s sertifika azami hızını (${c.maxSpeedMps} m/s) aşıyor.`);
      let status = modelOk && massOk && speedOk ? STATUS.PASS : STATUS.FAIL;
      if (status === STATUS.PASS && !hasText(c.productionEvidenceRef)) {
        status = STATUS.REVIEW;
        notes.push('Güncel üretim uygunluğu / imal tarihi ve seri izlenebilirliği kanıtı girilmemiş; Modül B sınırları üretim uygunluğunun yerine geçmez.');
      }
      results.push(
        makeResult({
          ruleId: 'BUF-003',
          title: 'Tampon model, yük ve hız aralığı',
          status,
          source: src,
          values: { massPerBuffer: { value: perBuffer, unit: 'kg' } },
          limit: { description: `${c.minMassKgPerBuffer} ≤ m ≤ ${c.maxMassKgPerBuffer} kg/tampon; v ≤ ${c.maxSpeedMps} m/s; model birebir`, direction: 'min' },
          notes: [...notes, 'Sertifika: ' + c.certificateRef],
          inputs: copy(i),
        }),
      );
    }
  }
  return results;
}

export function safetyOverall(results) {
  return worstStatus(results.map((r) => r.status));
}
