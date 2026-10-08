import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkCarArea,
  maximumCarAreaM2,
  minimumAreaForPassengersM2,
  passengerCapacityFromArea,
} from '../src/car-area.mjs';
import { runCalculations, MODULES } from '../src/engine.mjs';
import { STATUS } from '../src/core.mjs';
import { catalogEntry } from '../src/catalog.mjs';

const input = (patch = {}) => ({ ratedLoadKg: 630, availableAreaM2: 1.66, markedPassengerCount: 8, ...patch });
const byId = (results, ruleId) => results.find((result) => result.ruleId === ruleId);

test('Table 6 düğümleri: 100, 630 ve 2500 kg; 100 kg altı bloklanır, 2500 üstü nottaki adımla uzatılır', () => {
  assert.equal(maximumCarAreaM2(100), 0.37);
  assert.equal(maximumCarAreaM2(630), 1.66);
  assert.equal(maximumCarAreaM2(2500), 5.00);
  assert.equal(maximumCarAreaM2(2600), 5.16);
  assert.equal(maximumCarAreaM2(99), null);
});

test('Table 6 ara anma yükü doğrusal enterpolasyonla bulunur (650 kg → 1,70 m²)', () => {
  // Bağımsız el hesabı: 630 kg'da 1,66; 675 kg'da 1,75; 650 kg farkı 20/45.
  assert.equal(maximumCarAreaM2(650), 1.66 + (20 / 45) * (1.75 - 1.66));
  assert.equal(maximumCarAreaM2(650), 1.70);
});

test('Table 8 ve 75 kg/kişi: izin verilen kişi sayısı iki sınırın küçüğüdür', () => {
  const results = checkCarArea(input());
  const area = byId(results, 'CAR-AREA-001');
  const people = byId(results, 'CAR-PAX-001');
  assert.equal(area.status, STATUS.PASS); // 1,66 m² = Table 6 azami alanı.
  assert.equal(area.values.areaMargin.value, 0);
  assert.equal(people.values.passengersFromLoad.value, 8); // floor(630/75) = floor(8,4).
  assert.equal(people.values.passengersFromArea.value, 9); // 9 kişi için 1,59; 10 için 1,73 m².
  assert.equal(people.values.maximumPassengers.value, 8);
  assert.equal(people.status, STATUS.PASS); // beyan 8 ≤ hesaplanan 8.
});

test('Kişi sayısı tablosu 20 üstünde 0,115 m²/kişi artışını ve sınırı uygular', () => {
  assert.equal(minimumAreaForPassengersM2(20), 3.13);
  assert.equal(minimumAreaForPassengersM2(24), 3.59); // 3,13 + 4×0,115.
  assert.equal(passengerCapacityFromArea(3.589), 23);
  assert.equal(passengerCapacityFromArea(3.59), 24);

  const results = checkCarArea(input({ ratedLoadKg: 1800, availableAreaM2: 3.59, markedPassengerCount: 24 }));
  const people = byId(results, 'CAR-PAX-001');
  assert.equal(people.values.passengersFromLoad.value, 24); // floor(1800/75).
  assert.equal(people.values.passengersFromArea.value, 24);
  assert.equal(people.status, STATUS.PASS);
});

test('Ara yük + tam alan sınırı geçer; alan sınırının az üzeri FAIL olur', () => {
  assert.equal(byId(checkCarArea(input({ ratedLoadKg: 650, availableAreaM2: 1.70 })), 'CAR-AREA-001').status, STATUS.PASS);
  const justOver = byId(checkCarArea(input({ availableAreaM2: 1.6601 })), 'CAR-AREA-001');
  assert.equal(justOver.status, STATUS.FAIL);
  assert.equal(justOver.limit.value, 1.66);
  const precisionEdge = byId(checkCarArea(input({ availableAreaM2: 1.6600000000001 })), 'CAR-AREA-001');
  assert.equal(precisionEdge.status, STATUS.FAIL);
  assert.ok(precisionEdge.values.areaMargin.value < 0);
  assert.equal(byId(checkCarArea(input({ availableAreaM2: 1.54 })), 'CAR-AREA-001').values.areaMargin.value, 0.12);
});

test('Beyan edilen kişi sayısı hesaplanan sınırı aşarsa kişi kriteri FAIL olur', () => {
  const results = checkCarArea(input({ availableAreaM2: 1.45, markedPassengerCount: 9 }));
  assert.equal(byId(results, 'CAR-AREA-001').status, STATUS.PASS);
  assert.equal(byId(results, 'CAR-PAX-001').values.passengersFromArea.value, 8);
  assert.equal(byId(results, 'CAR-PAX-001').status, STATUS.FAIL);
});

test('Anma yükü veya alan eksik/geçersiz/Table 6 dışıysa iki kural BLOCKED; kişi beyanı bozuksa yalnız kişi kuralı BLOCKED', () => {
  const invalidSharedInputs = [
    input({ ratedLoadKg: undefined }),
    input({ ratedLoadKg: 0 }),
    input({ ratedLoadKg: -1 }),
    input({ ratedLoadKg: 99 }),
    input({ ratedLoadKg: 630.5 }),
    input({ ratedLoadKg: NaN }),
    input({ availableAreaM2: undefined }),
    input({ availableAreaM2: 0 }),
    input({ availableAreaM2: -1 }),
    input({ availableAreaM2: NaN }),
    input({ availableAreaM2: '1.66' }),
  ];
  for (const candidate of invalidSharedInputs) {
    const results = checkCarArea(candidate);
    assert.equal(results.length, 2);
    assert.ok(results.every((result) => result.status === STATUS.BLOCKED));
    assert.ok(results.every((result) => result.blockers.length > 0));
  }

  const invalidPassengerInputs = [
    input({ markedPassengerCount: undefined }),
    input({ markedPassengerCount: 0 }),
    input({ markedPassengerCount: -1 }),
    input({ markedPassengerCount: 8.5 }),
    input({ markedPassengerCount: Number.MAX_SAFE_INTEGER + 1 }),
  ];
  for (const candidate of invalidPassengerInputs) {
    const results = checkCarArea(candidate);
    assert.equal(byId(results, 'CAR-AREA-001').status, STATUS.PASS);
    assert.equal(byId(results, 'CAR-PAX-001').status, STATUS.BLOCKED);
    assert.ok(byId(results, 'CAR-PAX-001').blockers.length > 0);
  }

  const unsafeRatedLoad = checkCarArea(input({ ratedLoadKg: Number.MAX_SAFE_INTEGER + 1 }));
  assert.ok(unsafeRatedLoad.every((result) => result.status === STATUS.BLOCKED));

  const overflowCapacity = checkCarArea(input({ availableAreaM2: 1e308 }));
  assert.equal(byId(overflowCapacity, 'CAR-AREA-001').status, STATUS.FAIL);
  assert.equal(byId(overflowCapacity, 'CAR-PAX-001').status, STATUS.BLOCKED);
});

test('Engine ve katalog entegrasyonu: eksik modül görünür, kaynak ve TASLAK izi korunur', () => {
  assert.ok(MODULES.some((module) => module.key === 'carArea'));
  const results = runCalculations({ carArea: input() });
  assert.equal(results.modules.find((module) => module.key === 'carArea').ran, true);
  assert.equal(results.modules.find((module) => module.key === 'suspension').ran, false);
  assert.deepEqual(results.results.map((result) => result.ruleId), ['CAR-AREA-001', 'CAR-PAX-001']);
  for (const result of results.results) {
    assert.equal(result.source.sourceClass, 'NORMATIF');
    assert.equal(catalogEntry(result.ruleId).independentReview, 'PENDING');
  }
});
