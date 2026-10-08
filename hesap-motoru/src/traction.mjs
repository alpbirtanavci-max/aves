// Tahrik yeteneği (çekiş) — EN 81-20:2020 5.5.3 ve EN 81-50:2020 5.11.
//
// Üç koşul (EN 81-20 5.5.3): (a) %125 yükle kat seviyesinde kayma yok, (b) acil frende boş/dolu kabin
// tamponların tasarım hızına iner, (c) kabin/karşı ağırlık tamponda durursa halat kayar veya makine
// elektrikli güvenlik düzeniyle durdurulur.
//   Yükleme ve acil fren:  T1/T2 ≤ e^(f·α)
//   Durma (tamponda):      T1/T2 ≥ e^(f·α)
// f, oluk geometrisine ve duruma göre; μ standartta sabittir (kullanıcı serbestçe değiştiremez):
//   yükleme μ = 0,1 · acil fren μ = 0,1/(1+v/10) · karşı ağırlık durması μ = 0,2   (v = halat hızı)
//
// Bu modül SAĞLANDI/SAĞLANMADI üretir; uygunluk kararı değildir.

import {
  STATUS,
  SOURCE_CLASS,
  makeResult,
  blocked,
  checkInputs,
  worstStatus,
  isFiniteNumber,
  deg2rad,
  rad2deg,
  fmt,
} from './core.mjs';
import { tensions, stalledTensions } from './tension.mjs';

const SRC = (clause, note) => ({
  standard: 'EN 81-50',
  edition: '2020',
  clause,
  sourceClass: SOURCE_CLASS.NORMATIVE,
  note,
});

/** Oluk geometrisine göre sürtünme faktörü f. caseKind: 'driving' | 'stalled'. */
export function frictionFactor(groove, mu, caseKind) {
  const gamma = deg2rad(groove.gammaDeg);
  const beta = deg2rad(groove.betaDeg ?? 0);
  if (groove.type === 'semicircular') {
    // 5.11.2.3.1.1: yarım dairesel / alttan kesik
    return (
      (mu * 4 * (Math.cos(gamma / 2) - Math.sin(beta / 2))) /
      (Math.PI - beta - gamma - Math.sin(beta) + Math.sin(gamma))
    );
  }
  if (groove.type === 'v') {
    // 5.11.2.3.1.2
    if (caseKind === 'stalled' || groove.hardened) return mu / Math.sin(gamma / 2);
    return (mu * 4 * (1 - Math.sin(beta / 2))) / (Math.PI - beta - Math.sin(beta));
  }
  throw new Error(`Bilinmeyen oluk tipi: ${groove.type}`);
}

export const FRICTION_COEFFICIENT = Object.freeze({
  loading: () => 0.1,
  braking: (ropeSpeedMps) => 0.1 / (1 + ropeSpeedMps / 10),
  stalled: () => 0.2,
});

function validateGroove(groove) {
  const problems = [];
  if (!groove || !['v', 'semicircular'].includes(groove.type)) {
    problems.push("Oluk tipi 'v' veya 'semicircular' olmalı");
    return problems;
  }
  if (!isFiniteNumber(groove.gammaDeg) || groove.gammaDeg <= 0) problems.push('Oluk açısı γ girilmemiş');
  const beta = groove.betaDeg ?? 0;
  if (!isFiniteNumber(beta) || beta < 0) problems.push('Alttan kesik açısı β geçersiz');
  if (isFiniteNumber(beta) && beta > 105) problems.push('β en çok 105° olabilir (EN 81-50 5.11.2.3.1)');
  if (groove.type === 'v') {
    if (isFiniteNumber(groove.gammaDeg) && groove.gammaDeg < 35) {
      problems.push('V oluk açısı γ asansörlerde 35°’den küçük olamaz (EN 81-50 5.11.2.3.1.2)');
    }
    if (typeof groove.hardened !== 'boolean') problems.push('V oluk için sertleştirme durumu (hardened) belirtilmeli');
    if (groove.hardened === false && !(beta > 0)) {
      problems.push('Sertleştirilmemiş V oluk için alttan kesik (β > 0) gerekir (EN 81-50 5.11.2.3.1.2)');
    }
  }
  return problems;
}

function validatePositions(list, label) {
  if (!Array.isArray(list) || list.length === 0) return [`${label}: en az bir konum verilmeli`];
  const problems = [];
  list.forEach((p, i) => {
    if (!isFiniteNumber(p?.MSRcar) || p.MSRcar < 0) problems.push(`${label}[${i}]: MSRcar ≥ 0 olmalı`);
    if (!isFiniteNumber(p?.MSRcwt) || p.MSRcwt < 0) problems.push(`${label}[${i}]: MSRcwt ≥ 0 olmalı`);
  });
  return problems;
}

function baseMasses(input) {
  const m = input.masses;
  return {
    P: m.P,
    Mcwt: m.Mcwt,
    r: input.reeving,
    Mtrav: m.Mtrav ?? 0,
    McrCar: m.McrCar ?? 0,
    McrCwt: m.McrCwt ?? 0,
    Mcomp: m.Mcomp ?? 0,
    carPulleys: m.carPulleys,
    cwtPulleys: m.cwtPulleys,
  };
}

/** Değerlendirmeyi yeniden üretilebilir kılmak için girdi özeti. */
function inputSummary(input) {
  return JSON.parse(JSON.stringify(input));
}

function reviewFlags(input) {
  const flags = [];
  const u = input.declaredUnmodelled ?? {};
  if (u.tractionSidePulleyInertia) {
    flags.push('Çekme kasnağı tarafında atalet taşıyan saptırma makarası (m_DP) beyan edildi; bu terim modellenmedi.');
  }
  if (u.tensioningDevice) {
    flags.push('Gergi aygıtı (PTD) beyan edildi; bu terim modellenmedi.');
  }
  return flags;
}

/**
 * @returns {object[]} sonuç kayıtları: TRA-001 … TRA-005
 */
export function checkTraction(input) {
  const results = [];
  const ruleBase = { standard: 'EN 81-50', edition: '2020' };

  // ---- ortak girdi doğrulaması -------------------------------------------------------
  const problems = [];
  if (input.machineArrangement !== 'above') {
    problems.push("Makine yerleşimi 'above' (kuyu üstü) olmalı; makine altta/yanda hesabı bu sürümde yok");
  }
  problems.push(
    ...checkInputs(input, {
      reeving: { label: 'Askı oranı r', positive: true },
      ratedSpeedMps: { label: 'Anma hızı', positive: true },
      wrapAngleDeg: { label: 'Sarılma açısı α (°)', positive: true, max: 720 },
      decelerationMps2: { label: 'Acil fren gecikmesi a (m/s²)', min: 0.5 },
    }),
  );
  problems.push(
    ...checkInputs(input.masses ?? {}, {
      P: { label: 'Boş kabin ve bileşenler P', positive: true },
      Q: { label: 'Anma yükü Q', positive: true },
      Mcwt: { label: 'Karşı ağırlık kütlesi', positive: true },
    }),
  );
  problems.push(...validateGroove(input.groove));
  const unmodelled = reviewFlags(input);

  const gate = (ruleId, title, clause, extra = []) =>
    blocked({
      ruleId,
      title,
      source: SRC(clause),
      problems: [...problems, ...extra],
      inputs: inputSummary(input),
    });

  const tractionCases = [
    {
      ruleId: 'TRA-001',
      title: 'Çekiş — kabin yükleme durumu (%125 Q)',
      clause: '5.11.2.2.1; 5.5.3 a)',
      posKey: 'loading',
      kind: 'driving',
      direction: 'max',
    },
    {
      ruleId: 'TRA-002',
      title: 'Çekiş — acil fren, dolu kabin aşağı yönde yavaşlıyor',
      clause: '5.11.2.2.2; 5.5.3 b)',
      posKey: 'brakingLoaded',
      kind: 'braking',
      direction: 'max',
    },
    {
      ruleId: 'TRA-003',
      title: 'Çekiş — acil fren, boş kabin yukarı yönde yavaşlıyor',
      clause: '5.11.2.2.2; 5.5.3 b)',
      posKey: 'brakingEmpty',
      kind: 'braking',
      direction: 'max',
    },
    {
      ruleId: 'TRA-004',
      title: 'Çekiş — karşı ağırlık tamponda (boş kabin, en yüksek konum)',
      clause: '5.11.2.2.3; 5.5.3 c)',
      posKey: 'stalledCwt',
      kind: 'stalled',
      direction: 'min',
    },
    {
      ruleId: 'TRA-005',
      title: 'Çekiş — kabin tamponda (boş kabin, en alçak konum)',
      clause: '5.11.2.2.3; 5.5.3 c)',
      posKey: 'stalledCar',
      kind: 'stalled',
      direction: 'min',
    },
  ];

  for (const c of tractionCases) {
    const posProblems = validatePositions(input.positions?.[c.posKey], `positions.${c.posKey}`);
    if (problems.length || posProblems.length) {
      results.push(gate(c.ruleId, c.title, c.clause, posProblems));
      continue;
    }

    // Durma durumunda elektrikli güvenlik düzeni beyanı: hesap yerine inceleme (5.5.3 c) 2)
    if (c.kind === 'stalled' && input.stallProtection === 'electrical-safety-device') {
      results.push(
        makeResult({
          ruleId: c.ruleId,
          title: c.title,
          status: STATUS.REVIEW,
          source: SRC(c.clause, 'EN 81-20 5.5.3 c) 2)'),
          notes: [
            'Kayma yerine makineyi durduran elektrikli güvenlik düzeni (5.11.2) beyan edildi; bu durumda oran hesabı uygulanmadı.',
            'Düzenin devreye girdiği doğrulanmalıdır (EN 81-20 6.3.3 deneyi).',
          ],
          inputs: inputSummary(input),
        }),
      );
      continue;
    }
    if (c.kind === 'stalled' && !['slip', 'electrical-safety-device'].includes(input.stallProtection)) {
      results.push(gate(c.ruleId, c.title, c.clause, ["stallProtection 'slip' veya 'electrical-safety-device' olmalı"]));
      continue;
    }

    const ropeSpeed = isFiniteNumber(input.ropeSpeedMps) ? input.ropeSpeedMps : input.ratedSpeedMps * input.reeving;
    const speedNote = isFiniteNumber(input.ropeSpeedMps)
      ? null
      : `Halat hızı girilmedi; v_halat = r·v = ${fmt(ropeSpeed)} m/s alındı.`;
    const mu =
      c.kind === 'stalled'
        ? FRICTION_COEFFICIENT.stalled()
        : c.kind === 'braking'
          ? FRICTION_COEFFICIENT.braking(ropeSpeed)
          : FRICTION_COEFFICIENT.loading();
    const f = frictionFactor(input.groove, mu, c.kind === 'stalled' ? 'stalled' : 'driving');
    const alpha = deg2rad(input.wrapAngleDeg);
    const expFA = Math.exp(f * alpha);

    // her konum için T1/T2
    const evaluated = input.positions[c.posKey].map((pos) => {
      const base = { ...baseMasses(input), MSRcar: pos.MSRcar, MSRcwt: pos.MSRcwt };
      let car;
      let cwt;
      let heavy;
      let light;
      if (c.posKey === 'loading') {
        const Q1 = 1.25 * input.masses.Q + (input.masses.handlingDeviceMass ?? 0);
        ({ car, cwt } = tensions({ ...base, Q: Q1 }, 0, 1));
        [heavy, light] = [car, cwt];
      } else if (c.posKey === 'brakingLoaded') {
        ({ car, cwt } = tensions({ ...base, Q: input.masses.Q }, input.decelerationMps2, 1));
        [heavy, light] = [car, cwt];
      } else if (c.posKey === 'brakingEmpty') {
        ({ car, cwt } = tensions({ ...base, Q: 0 }, input.decelerationMps2, -1));
        [heavy, light] = [cwt, car];
      } else if (c.posKey === 'stalledCwt') {
        ({ car, cwt } = stalledTensions(base, 'cwt'));
        [heavy, light] = [car, cwt];
      } else {
        ({ car, cwt } = stalledTensions(base, 'car'));
        [heavy, light] = [cwt, car];
      }
      const ratio = light > 0 ? heavy / light : Infinity;
      return { label: pos.label ?? '', car, cwt, heavy, light, ratio };
    });

    // en elverişsiz konum: ≤ koşulunda en büyük oran, ≥ koşulunda en küçük oran
    const worst =
      c.direction === 'max'
        ? evaluated.reduce((a, b) => (b.ratio > a.ratio ? b : a))
        : evaluated.reduce((a, b) => (b.ratio < a.ratio ? b : a));

    const satisfied = c.direction === 'max' ? worst.ratio <= expFA : worst.ratio >= expFA;
    const margin = Number.isFinite(worst.ratio)
      ? c.direction === 'max'
        ? (expFA - worst.ratio) / expFA
        : (worst.ratio - expFA) / expFA
      : undefined;
    const alphaRequiredDeg =
      c.direction === 'max' && Number.isFinite(worst.ratio) && worst.ratio > 1
        ? rad2deg(Math.log(worst.ratio) / f)
        : undefined;

    const notes = [];
    if (speedNote && c.kind === 'braking') notes.push(speedNote);
    if (worst.light <= 0) notes.push('Hafif taraf gerilmesi ≤ 0: halat gevşiyor (oran sonsuz kabul edildi).');
    const hasComp = (input.masses.Mcomp ?? 0) > 0 || (input.masses.McrCar ?? 0) > 0 || (input.masses.McrCwt ?? 0) > 0;
    if (c.kind === 'stalled' && hasComp) {
      notes.push('Telafi halatı/kütlesi var: durma durumunda telafi terimleri şekil 9 yapısına göre alındı; doğrulayın.');
    }
    if (c.posKey === 'loading' && worst.car < worst.cwt) {
      notes.push('Yükleme durumunda kabin tarafı karşı ağırlık tarafından hafif; oran 1’in altında. Ters yönde kayma acil fren/boş kabin durumlarıyla kontrol edilir.');
    }
    notes.push(...unmodelled);
    notes.push('Sürtünme kuvvetleri FR sıfır alındı (EN 81-50 5.11.3 tavsiyesi).');

    let status;
    if (!satisfied) status = STATUS.FAIL;
    else status = unmodelled.length || (c.kind === 'stalled' && hasComp) ? STATUS.REVIEW : STATUS.PASS;

    results.push(
      makeResult({
        ruleId: c.ruleId,
        title: c.title,
        status,
        source: SRC(c.clause),
        values: {
          T1: { value: worst.heavy, unit: 'N' },
          T2: { value: worst.light, unit: 'N' },
          ratio: { value: worst.ratio, unit: '1' },
          expFA: { value: expFA, unit: '1' },
          f: { value: f, unit: '1' },
          mu: { value: mu, unit: '1' },
          worstPosition: { value: worst.label, unit: '' },
          ...(alphaRequiredDeg !== undefined ? { alphaRequired: { value: alphaRequiredDeg, unit: '°' } } : {}),
        },
        limit: {
          description: c.direction === 'max' ? 'T1/T2 ≤ e^(f·α)' : 'T1/T2 ≥ e^(f·α)',
          value: expFA,
          unit: '1',
          direction: c.direction,
        },
        margin,
        formula: c.direction === 'max' ? 'T1/T2 ≤ e^(f·α)' : 'T1/T2 ≥ e^(f·α)',
        substitution: `T1=${fmt(worst.heavy, 1)} N, T2=${fmt(worst.light, 1)} N, T1/T2=${fmt(worst.ratio)}; f=${fmt(f, 4)}, α=${fmt(input.wrapAngleDeg, 1)}°, e^(fα)=${fmt(expFA)}`,
        notes,
        inputs: inputSummary(input),
      }),
    );
  }
  return results;
}

export function tractionOverall(results) {
  return worstStatus(results.map((r) => r.status));
}
