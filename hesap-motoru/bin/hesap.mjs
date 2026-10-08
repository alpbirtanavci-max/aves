#!/usr/bin/env node
// AVES Hesap Motoru — komut satırı.
//   node hesap-motoru/bin/hesap.mjs girdi.json [--out dizin]
// Girdi: { project, reportNo?, preparedAt?, inputs: { suspension, traction, carRails, ... } }
// Çıktı: hesap-raporu.json / .md / .html  (varsayılan: ./hesap-ciktisi)

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runCalculations } from '../src/engine.mjs';
import { buildReport, renderMarkdown, renderHtml } from '../src/report.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const outDir = resolve(outIdx >= 0 ? args[outIdx + 1] : 'hesap-ciktisi');

if (!file) {
  console.error('Kullanım: node hesap-motoru/bin/hesap.mjs girdi.json [--out dizin]');
  process.exit(2);
}

let doc;
try {
  doc = JSON.parse(readFileSync(resolve(file), 'utf8'));
} catch (e) {
  console.error(`Girdi dosyası okunamadı veya JSON değil: ${e.message}`);
  process.exit(2);
}

const { results, modules } = runCalculations(doc.inputs);
const report = buildReport({
  project: doc.project,
  reportNo: doc.reportNo,
  results,
  modules,
  inputs: doc.inputs,
  preparedAt: doc.preparedAt ?? new Date().toISOString(),
});

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'hesap-raporu.json'), JSON.stringify(report, null, 2) + '\n');
writeFileSync(join(outDir, 'hesap-raporu.md'), renderMarkdown(report));
writeFileSync(join(outDir, 'hesap-raporu.html'), renderHtml(report));

const c = report.summary.counts;
console.log(`${report.summary.overallLabel}: ${report.summary.overallText}`);
console.log(`Kriter sağlandı ${c.PASS} · sağlanmadı ${c.FAIL} · teknik inceleme ${c.REVIEW} · bloke ${c.BLOCKED}`);
if (report.status.draft) console.log('TASLAK: ' + report.status.draftReason);
console.log(`Çıktılar: ${outDir}`);
