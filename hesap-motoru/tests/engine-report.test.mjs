import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runCalculations, MODULES } from '../src/engine.mjs';
import { buildReport, renderMarkdown, renderHtml, hashInputs, stableStringify } from '../src/report.mjs';
import { RULE_CATALOG, catalogEntry } from '../src/catalog.mjs';
import { STATUS } from '../src/core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const example = JSON.parse(readFileSync(join(here, '..', 'examples', 'ornek-proje.sentetik.json'), 'utf8'));

const run = (inputs = example.inputs) => {
  const { results, modules } = runCalculations(inputs);
  return { results, modules, report: buildReport({ project: example.project, reportNo: example.reportNo, results, modules, inputs, preparedAt: example.preparedAt }) };
};

test('Örnek proje: tüm modüller çalışır, hiçbiri BLOKE/FAIL değil', () => {
  const { results, modules } = run();
  assert.equal(modules.length, MODULES.length);
  assert.ok(modules.every((m) => m.ran));
  assert.ok(results.length >= 25);
  const bad = results.filter((r) => r.status === STATUS.BLOCKED || r.status === STATUS.FAIL);
  assert.deepEqual(bad.map((r) => `${r.ruleId}:${r.status}`), []);
});

test('Sözleşme: her sonuç kaynak, durum ve tutarlı gerekçe taşır; PASS bloke gerekçesi taşımaz', () => {
  const { results } = run();
  for (const r of results) {
    assert.ok(r.ruleId && r.title, 'kimlik ve başlık');
    assert.ok(r.source?.standard && r.source?.clause && r.source?.sourceClass, `${r.ruleId} kaynak`);
    assert.ok(Object.values(STATUS).includes(r.status), `${r.ruleId} durum`);
    if (r.status === STATUS.PASS) assert.equal(r.blockers.length, 0, `${r.ruleId}`);
    if (r.status === STATUS.BLOCKED) assert.ok(r.blockers.length > 0, `${r.ruleId} bloke gerekçesiz`);
  }
});

test('Sözleşme: hiçbir sonuçta NaN/Infinity/undefined metni yok (biçimli çıktılarda)', () => {
  const { report } = run();
  for (const text of [renderMarkdown(report), renderHtml(report)]) {
    assert.ok(!/NaN|undefined|\[object Object\]/.test(text), 'çıktıda NaN/undefined/[object Object] var');
  }
});

test('Katalog: motorun ürettiği her kural kimliği kataloğa kayıtlı', () => {
  const { results } = run();
  const unknown = [...new Set(results.map((r) => r.ruleId))].filter((id) => !catalogEntry(id));
  assert.deepEqual(unknown, []);
  assert.equal(new Set(RULE_CATALOG.map((r) => r.ruleId)).size, RULE_CATALOG.length, 'katalogda tekrar eden kimlik');
});

test('Rapor: ikinci gözden geçirme bekleyen kural varsa TASLAK; imza alanları boş', () => {
  const { report } = run();
  assert.equal(report.status.draft, true);
  assert.match(report.status.draftReason, /TASLAK/);
  assert.equal(report.signatures.length, 3);
  for (const s of report.signatures) assert.deepEqual([s.name, s.date, s.signature], ['', '', '']);
  assert.ok(report.disclaimers.some((d) => d.includes('uygunluk değerlendirmesi')));
});

test('Rapor: çıktı dili yetki aşan durumlar üretmez (UYGUN/ONAY/SERTİFİKA kararı yok)', () => {
  const { report } = run();
  const text = renderMarkdown(report) + renderHtml(report);
  for (const banned of ['APPROVED', 'CERTIFIED', 'CONFORMITY_DECISION', 'ONAYLANDI', 'BELGELENDİRİLDİ']) {
    assert.ok(!text.includes(banned), banned);
  }
  assert.ok(!/\bUYGUN\b/.test(text.replace(/uygunluk/gi, '')), '“UYGUN” sonuç etiketi kullanılmamalı');
});

test('Rapor: tekrar üretilebilir (aynı girdi → aynı çıktı ve aynı karma)', () => {
  const a = run();
  const b = run();
  assert.equal(JSON.stringify(a.report), JSON.stringify(b.report));
  assert.equal(renderHtml(a.report), renderHtml(b.report));
  assert.match(a.report.header.inputHash, /^[0-9a-f]{64}$/);
});

test('Girdi karması: anahtar sırasından bağımsız, değer değişince değişir', () => {
  assert.equal(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] }), stableStringify({ a: [2, { c: 2, d: 1 }], b: 1 }));
  assert.equal(hashInputs({ a: 1, b: 2 }), hashInputs({ b: 2, a: 1 }));
  assert.notEqual(hashInputs({ a: 1 }), hashInputs({ a: 2 }));
});

test('Eksik modül girdisi: modül "hesaplanmadı" olarak raporlanır, sessizce atlanmaz', () => {
  const partial = { suspension: example.inputs.suspension };
  const { report } = run(partial);
  const notRun = report.scope.modules.filter((m) => !m.ran).map((m) => m.key);
  assert.ok(notRun.includes('traction') && notRun.includes('buffers'));
  assert.match(renderMarkdown(report), /girdi verilmedi, hesaplanmadı/);
});

test('Sonuç yoksa genel durum BLOKE ve açıklama "Hesaplanan sonuç yok"', () => {
  const { report } = run({});
  assert.equal(report.summary.overall, STATUS.BLOCKED);
  assert.equal(report.summary.overallText, 'Hesaplanan sonuç yok.');
});

test('Bir girdi bozulursa genel durum kötüleşir: FAIL en az FAIL, BLOKE en az BLOKE', () => {
  const failing = structuredClone(example.inputs);
  failing.suspension.rope.minimumBreakingLoadN = 20000; // güvenlik katsayısı yetersiz
  assert.equal(run(failing).report.summary.overall, STATUS.FAIL);
  const broken = structuredClone(example.inputs);
  broken.traction.wrapAngleDeg = NaN;
  assert.equal(run(broken).report.summary.overall, STATUS.BLOCKED);
});

test('Ø6,5 AVES istisnası uçtan uca: rapor “AVES_POLITIKASI” gösterir ve genel durum PASS olmaz', () => {
  const inputs = structuredClone(example.inputs);
  inputs.suspension.rope = { nominalDiameterMm: 6.5, count: 6, minimumBreakingLoadN: 31500, certificateRef: 'x' };
  inputs.suspension.sheaves = {
    tractionDiameterMm: 240,
    groove: { type: 'v', angleDeg: 40 },
    pulleys: [{ diameterMm: 240, simpleBends: 1 }],
  };
  inputs.suspension.termination = { type: 'wedge-13411-7', certificateRef: 'c', sizeRangeMm: [5, 6.5] };
  inputs.suspension.avesException = { enabled: true, bendingEnduranceEvidenceRef: 'EGILME-RAPORU-1' };
  const { results, report } = run(inputs);
  for (const id of ['SUS-001', 'SUS-002']) {
    const r = results.find((x) => x.ruleId === id);
    assert.equal(r.status, STATUS.REVIEW, id);
    assert.equal(r.source.sourceClass, 'AVES_POLITIKASI');
  }
  assert.notEqual(report.summary.overall, STATUS.PASS);
  assert.match(renderHtml(report), /AVES_POLITIKASI/);
});

test('HTML: kaçış — girdideki zararlı metin etiket olarak yorumlanmaz', () => {
  const inputs = structuredClone(example.inputs);
  const project = { name: '<script>alert(1)</script>' };
  const { results, modules } = runCalculations(inputs);
  const html = renderHtml(buildReport({ project, results, modules, inputs, preparedAt: example.preparedAt }));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
