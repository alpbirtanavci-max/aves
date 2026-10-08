// EN 81-20:2020 5.4.2.1 ve 5.4.2.3 — kullanılabilir kabin alanı / kişi sayısı.
// Bu modül yalnız tanımlı normatif sayısal kriterleri hesaplar; ürün uygunluğu kararı vermez.

import { STATUS, SOURCE_CLASS, checkInputs, interpolate, makeResult, blocked, compare, marginOf } from './core.mjs';

const SOURCE = Object.freeze({
  standard: 'EN 81-20',
  edition: '2020',
  sourceClass: SOURCE_CLASS.NORMATIVE,
  note: 'Kullanıcının Drive alanındaki BS EN 81-20:2020 İngilizce çalışma kopyası; Türkiye ulusal yürürlük/revizyon eşlemesi bu hesapta doğrulanmadı.',
});
const AREA_SOURCE = Object.freeze({ ...SOURCE, clause: '5.4.2.1.1–5.4.2.1.3; Table 6' });
const PASSENGER_SOURCE = Object.freeze({
  ...SOURCE,
  clause: '5.4.2.3.1; Table 8; 0.3.6',
  note: 'Q/75 için 0.3.6’daki 75 kg/kişi kabulu kullanılır; kişi sınırı, yük ve alan hesabının küçüğüdür.',
});

// Table 6 — rated load (kg) to maximum available car area (m²).
// 2500 kg üstü uzatma yalnız tabloda açıkça verilen 0,16 m² / 100 kg kullanır.
export const MAX_CAR_AREA_TABLE = Object.freeze([
  [100, 0.37], [180, 0.58], [225, 0.70], [300, 0.90], [375, 1.10],
  [400, 1.17], [450, 1.30], [525, 1.45], [600, 1.60], [630, 1.66],
  [675, 1.75], [750, 1.90], [800, 2.00], [825, 2.05], [900, 2.20],
  [975, 2.35], [1000, 2.40], [1050, 2.50], [1125, 2.65], [1200, 2.80],
  [1250, 2.90], [1275, 2.95], [1350, 3.10], [1425, 3.25], [1500, 3.40],
  [1600, 3.56], [2000, 4.20], [2500, 5.00],
].map((row) => Object.freeze(row)));

// Table 8 — passenger count to minimum available car area (m²), through 20 passengers.
export const MIN_AREA_PER_PASSENGER_TABLE = Object.freeze([
  [1, 0.28], [2, 0.49], [3, 0.60], [4, 0.79], [5, 0.98],
  [6, 1.17], [7, 1.31], [8, 1.45], [9, 1.59], [10, 1.73],
  [11, 1.87], [12, 2.01], [13, 2.15], [14, 2.29], [15, 2.43],
  [16, 2.57], [17, 2.71], [18, 2.85], [19, 2.99], [20, 3.13],
].map((row) => Object.freeze(row)));

const AREA_INPUT_SPEC = Object.freeze({
  ratedLoadKg: { label: 'Anma yükü Q', positive: true, integer: true, min: 100 },
  availableAreaM2: { label: 'Kullanılabilir kabin alanı', positive: true },
});
const PASSENGER_INPUT_SPEC = Object.freeze({
  markedPassengerCount: { label: 'Kabinde beyan edilen kişi sayısı', positive: true, integer: true },
});

const NUMERIC_EDGE_EPSILON_M2 = 1e-12; // yalnız kayan nokta yuvarlama farkı; ölçüm toleransı değildir.
const reportAreaNumber = (value) => Number.isFinite(value) && Math.abs(value) < 1e21
  ? Number(value.toPrecision(15))
  : value;

/** Table 6 maximum area; returns null below 100 kg, never extrapolates below the table. */
export function maximumCarAreaM2(ratedLoadKg) {
  if (typeof ratedLoadKg !== 'number' || !Number.isFinite(ratedLoadKg) || ratedLoadKg < 100) return null;
  const area = ratedLoadKg > 2500
    ? 5 + ((ratedLoadKg - 2500) / 100) * 0.16
    : interpolate(MAX_CAR_AREA_TABLE, ratedLoadKg);
  // Strip IEEE-754 display noise without adding a physical/measurement tolerance.
  return area === null ? null : Number(area.toFixed(12));
}

/** Table 8 minimum area for N persons, including its explicit >20-person increment. */
export function minimumAreaForPassengersM2(passengerCount) {
  if (!Number.isSafeInteger(passengerCount) || passengerCount < 1) return null;
  if (passengerCount <= 20) return MIN_AREA_PER_PASSENGER_TABLE[passengerCount - 1][1];
  return 3.13 + ((passengerCount - 20) * 0.115);
}

/** Largest integer passenger count supported by Table 8 and the measured usable area. */
export function passengerCapacityFromArea(availableAreaM2) {
  if (typeof availableAreaM2 !== 'number' || !Number.isFinite(availableAreaM2) || availableAreaM2 <= 0) return null;
  let tableCapacity = 0;
  for (const [passengers, minimumArea] of MIN_AREA_PER_PASSENGER_TABLE) {
    if (availableAreaM2 + NUMERIC_EDGE_EPSILON_M2 >= minimumArea) tableCapacity = passengers;
    else break;
  }
  if (availableAreaM2 + NUMERIC_EDGE_EPSILON_M2 < 3.13) return tableCapacity;
  const aboveTwenty = Math.floor((availableAreaM2 - 3.13 + NUMERIC_EDGE_EPSILON_M2) / 0.115);
  const capacity = Math.max(tableCapacity, 20 + aboveTwenty);
  return Number.isSafeInteger(capacity) ? capacity : null;
}

function bothBlocked(input, problems) {
  return [
    blocked({ ruleId: 'CAR-AREA-001', title: 'Kullanılabilir kabin alanı üst sınırı', source: AREA_SOURCE, problems, inputs: input }),
    blocked({ ruleId: 'CAR-PAX-001', title: 'Beyan edilen kişi sayısı sınırı', source: PASSENGER_SOURCE, problems, inputs: input }),
  ];
}

/**
 * @param {{ratedLoadKg:number, availableAreaM2:number, markedPassengerCount:number}} input
 * @returns {object[]} one area-limit result and one passenger-count result
 */
export function checkCarArea(input) {
  const areaProblems = checkInputs(input, AREA_INPUT_SPEC);
  if (Number.isInteger(input?.ratedLoadKg) && !Number.isSafeInteger(input.ratedLoadKg)) {
    areaProblems.push('Anma yükü güvenli sayısal aralığın dışında');
  }
  if (areaProblems.length) return bothBlocked(input, areaProblems);

  const { ratedLoadKg, availableAreaM2, markedPassengerCount } = input;
  const maxArea = maximumCarAreaM2(ratedLoadKg);
  // The rated-load minimum is validated above; null here would indicate an internal rule-data fault.
  if (!Number.isFinite(maxArea)) {
    return bothBlocked(input, ['Anma yükü Table 6 aralığında hesaplanamadı; tablo dışı değer için ekstrapolasyon yapılmadı']);
  }

  const areaWithinLimit = compare(availableAreaM2, maxArea, 'max');
  const areaResult = makeResult({
    ruleId: 'CAR-AREA-001',
    title: 'Kullanılabilir kabin alanı üst sınırı',
    status: areaWithinLimit ? STATUS.PASS : STATUS.FAIL,
    source: AREA_SOURCE,
    values: {
      ratedLoad: { value: ratedLoadKg, unit: 'kg' },
      availableArea: { value: availableAreaM2, unit: 'm²' },
      maximumArea: { value: maxArea, unit: 'm²' },
      areaMargin: { value: reportAreaNumber(maxArea - availableAreaM2), unit: 'm²' },
    },
    limit: { description: 'Kullanılabilir alan, anma yükü için izin verilen azami alanı aşmamalı', value: maxArea, unit: 'm²', direction: 'max' },
    margin: marginOf(availableAreaM2, maxArea, 'max'),
    formula: '100–2500 kg: Table 6 arasında doğrusal enterpolasyon; >2500 kg: 5,00 + 0,16 × (Q − 2500) / 100; ölçülen alan ≤ azami alan',
    substitution: ratedLoadKg > 2500
      ? `Q=${ratedLoadKg} kg → Amax=5,00 + 0,16×(${ratedLoadKg}−2500)/100 = ${maxArea} m²; A=${availableAreaM2} m²`
      : `Q=${ratedLoadKg} kg → Table 6 doğrusal enterpolasyonuyla Amax=${maxArea} m²; A=${availableAreaM2} m²`,
    notes: [
      'Alan ölçüsü 5.4.2.1.2’deki 1 m ölçüm seviyesi ve bitirme hariç iç ölçüler esas alınarak girilmelidir.',
      'Duvar girinti/uzantıları alana dahil edilir; yerleştirilen donanımın kişi barındırmasına izin vermediği nişler (ör. katlanır koltuk/interkom) hariç tutulabilir.',
      'Kapı kapalıyken dikmeler arasındaki alan kapı panelinden en çok 100 mm derinlikteyse hariç tutulur; 100 mm’den derinse alanın tamamı dahil edilir.',
      'Bu geometrik düzeltmeler motor tarafından çizimden çıkarılmaz; ölçülen kullanılabilir alan girilir.',
      'Bu satır yalnız alan üst sınırı kriterini ifade eder; asansörün bütünü hakkında uygunluk kararı değildir.',
    ],
    inputs: input,
  });

  const passengerProblems = checkInputs(input, PASSENGER_INPUT_SPEC);
  if (Number.isInteger(input?.markedPassengerCount) && !Number.isSafeInteger(input.markedPassengerCount)) {
    passengerProblems.push('Beyan edilen kişi sayısı güvenli sayısal aralığın dışında');
  }
  if (passengerProblems.length) {
    return [areaResult, blocked({
      ruleId: 'CAR-PAX-001',
      title: 'Beyan edilen kişi sayısı sınırı',
      source: PASSENGER_SOURCE,
      problems: passengerProblems,
      inputs: input,
    })];
  }

  const areaPassengerCapacity = passengerCapacityFromArea(availableAreaM2);
  const loadPassengerCapacity = Math.floor(ratedLoadKg / 75);
  if (!Number.isSafeInteger(areaPassengerCapacity) || !Number.isSafeInteger(loadPassengerCapacity)) {
    return [areaResult, blocked({
      ruleId: 'CAR-PAX-001',
      title: 'Beyan edilen kişi sayısı sınırı',
      source: PASSENGER_SOURCE,
      problems: ['Kişi kapasitesi sayısal güvenli aralıkta hesaplanamadı'],
      inputs: input,
    })];
  }
  const maximumPassengers = Math.min(areaPassengerCapacity, loadPassengerCapacity);
  const minAreaForMarked = minimumAreaForPassengersM2(markedPassengerCount);
  const passengerWithinLimit = markedPassengerCount <= maximumPassengers;
  const passengerResult = makeResult({
    ruleId: 'CAR-PAX-001',
    title: 'Beyan edilen kişi sayısı sınırı',
    status: passengerWithinLimit ? STATUS.PASS : STATUS.FAIL,
    source: PASSENGER_SOURCE,
    values: {
      ratedLoad: { value: ratedLoadKg, unit: 'kg' },
      passengersFromLoad: { value: loadPassengerCapacity, unit: 'kişi' },
      passengersFromArea: { value: areaPassengerCapacity, unit: 'kişi' },
      maximumPassengers: { value: maximumPassengers, unit: 'kişi' },
      markedPassengers: { value: markedPassengerCount, unit: 'kişi' },
      minimumAreaForMarkedPassengers: { value: minAreaForMarked, unit: 'm²' },
    },
    limit: { description: 'Beyan edilen kişi sayısı, Q/75 ile Table 8 alan kapasitesinin küçüğünü aşmamalı', value: maximumPassengers, unit: 'kişi', direction: 'max' },
    margin: maximumPassengers > 0 ? (maximumPassengers - markedPassengerCount) / maximumPassengers : undefined,
    formula: 'N = min(floor(Q / 75 kg), Table 8 alan karşılığındaki en büyük tam kişi sayısı)',
    substitution: `Nyük=floor(${ratedLoadKg}/75)=${loadPassengerCapacity}; Nalan=${areaPassengerCapacity}; Nmax=min(${loadPassengerCapacity},${areaPassengerCapacity})=${maximumPassengers}; Nbeyan=${markedPassengerCount}`,
    notes: [
      'Hesaplanan azami kişi sayısı, kabin üzerindeki gerçek bildirimle karşılaştırılır; bu sonuç levhanın varlığını veya okunabilirliğini doğrulamaz.',
      'Table 8’de 20 kişiden sonra kişi başına 0,115 m² artış kullanılır.',
    ],
    inputs: input,
  });

  return [areaResult, passengerResult];
}
