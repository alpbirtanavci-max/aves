// Hesap raporu: JSON (makine okunur), Markdown ve yazdırılabilir HTML.
//
// Bu rapor bir HESAP ÇIKTISIDIR. Uygunluk değerlendirmesi, belgelendirme kararı veya standarda
// uygunluk beyanı değildir; imza alanları boş bırakılır (motor imza atmaz, onay üretmez).

import { createHash } from 'node:crypto';
import { STATUS, STATUS_LABEL_TR, worstStatus, fmt } from './core.mjs';
import { ENGINE_VERSION, CATALOG_DATE, OUT_OF_SCOPE, catalogEntry } from './catalog.mjs';

export const DISCLAIMERS = Object.freeze([
  'Bu rapor, girilen verilerle yapılan hesaplamanın çıktısıdır; uygunluk değerlendirmesi, belgelendirme kararı veya standarda uygunluk beyanı değildir.',
  '“Kriter sağlandı”, hesaplanan kriterin belirtilen kaynak maddesindeki sınırı girilen verilerle sağladığı anlamına gelir; ürünün veya tesisin bütününün uygunluğu anlamına gelmez.',
  'Kaynak sınıfı “AVES_POLITIKASI” olan satırlar norm şartı değildir; normatif satırlarla karıştırılamaz.',
  'Raporun kullanılması için yetkili mühendisin gözden geçirmesi ve imzası gerekir. İmza alanları bilerek boş bırakılmıştır.',
]);

/** Anahtarları sıralı, tekrar üretilebilir JSON (girdi özeti için). */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

export function hashInputs(inputs) {
  return createHash('sha256').update(stableStringify(inputs ?? {})).digest('hex');
}

function overallText(counts, total) {
  if (total === 0) return 'Hesaplanan sonuç yok.';
  if (counts.BLOCKED) return 'Hesap tamamlanamadı: eksik veya geçersiz girdi/kanıt var.';
  if (counts.FAIL) return 'Sağlanmayan kriter var.';
  if (counts.REVIEW) return 'Mühendis incelemesi gerektiren sonuç var.';
  return 'Hesaplanan kriterlerin tümü sağlandı (uygunluk kararı değildir).';
}

/**
 * @param {object} p
 * @param {object} p.project         { name, reference?, client?, location?, elevatorId? }
 * @param {object[]} p.results
 * @param {Array<{key,label,ran}>} p.modules
 * @param {object} p.inputs          modül girdileri (özet karması için)
 * @param {string} p.preparedAt      ISO tarih (çağıran verir; motor saat okumaz → tekrar üretilebilir)
 * @param {string} [p.reportNo]
 */
export function buildReport({ project, results, modules, inputs, preparedAt, reportNo }) {
  const counts = { PASS: 0, FAIL: 0, REVIEW: 0, BLOCKED: 0 };
  for (const r of results) counts[r.status]++;
  const overall = results.length ? worstStatus(results.map((r) => r.status)) : STATUS.BLOCKED;
  const used = [...new Set(results.map((r) => r.ruleId))].map((id) => catalogEntry(id) ?? { ruleId: id, title: '', independentReview: 'PENDING', basis: 'kataloğa kayıtlı değil' });
  const pendingReview = used.filter((u) => u.independentReview !== 'DONE');
  return {
    schema: 'aves-hesap-raporu/1',
    header: {
      title: 'AVES Asansör Tasarım Hesabı Raporu',
      reportNo: reportNo ?? '',
      project: project ?? {},
      preparedAt,
      engineVersion: ENGINE_VERSION,
      catalogDate: CATALOG_DATE,
      inputHash: hashInputs(inputs),
    },
    status: {
      draft: pendingReview.length > 0,
      draftReason: pendingReview.length
        ? `${pendingReview.length} kuralın ikinci kişi teknik gözden geçirmesi tamamlanmadı; bu rapor TASLAKTIR.`
        : '',
    },
    summary: { counts, overall, overallLabel: STATUS_LABEL_TR[overall], overallText: overallText(counts, results.length) },
    scope: { modules: modules ?? [], outOfScope: OUT_OF_SCOPE },
    ruleVerification: used,
    results,
    signatures: ['Hazırlayan', 'Kontrol eden', 'Onaylayan'].map((role) => ({ role, name: '', date: '', signature: '' })),
    disclaimers: DISCLAIMERS,
  };
}

// ---- biçimleme yardımcıları -----------------------------------------------------------------------------
const cell = (v) => {
  if (typeof v === 'number') return fmt(v, 3);
  if (typeof v === 'boolean') return v ? 'evet' : 'hayır';
  return v === undefined || v === null ? '—' : String(v);
};

function valuesLine(values) {
  return Object.entries(values ?? {})
    .map(([k, v]) => `${v.label ?? k} = ${typeof v.value === 'number' ? fmt(v.value, 4) : v.value}${v.unit && v.unit !== '1' ? ' ' + v.unit : ''}`)
    .join('; ');
}

function detailKeys(rows) {
  const skip = new Set(['title']);
  return Object.keys(rows[0] ?? {}).filter((k) => !skip.has(k));
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---- Markdown --------------------------------------------------------------------------------------------------
export function renderMarkdown(report) {
  const h = report.header;
  const L = [];
  L.push(`# ${h.title}`, '');
  if (report.status.draft) L.push(`> **TASLAK** — ${report.status.draftReason}`, '');
  L.push(
    `- Proje: ${cell(h.project.name)}${h.project.reference ? ` (${h.project.reference})` : ''}`,
    `- Rapor no: ${cell(h.reportNo)}`,
    `- Hazırlanma tarihi: ${cell(h.preparedAt)}`,
    `- Motor sürümü / kural kataloğu: ${h.engineVersion} / ${h.catalogDate}`,
    `- Girdi özeti (SHA-256): \`${h.inputHash}\``,
    '',
    '## Özet',
    '',
    `**${report.summary.overallLabel}** — ${report.summary.overallText}`,
    '',
    `Kriter sağlandı: ${report.summary.counts.PASS} · Kriter sağlanmadı: ${report.summary.counts.FAIL} · Teknik inceleme: ${report.summary.counts.REVIEW} · Bloke: ${report.summary.counts.BLOCKED}`,
    '',
    '## Kapsam',
    '',
    ...report.scope.modules.map((m) => `- ${m.ran ? '✔' : '✘'} ${m.label}${m.ran ? '' : ' — girdi verilmedi, hesaplanmadı'}`),
    '',
    '**Kapsam dışı:**',
    ...report.scope.outOfScope.map((s) => `- ${s}`),
    '',
    '## Sonuçlar',
    '',
    '| Kural | Başlık | Durum | Kaynak | Sınıf |',
    '|---|---|---|---|---|',
    ...report.results.map((r) => `| ${r.ruleId} | ${r.title} | ${r.statusLabel} | ${r.source.standard} ${r.source.edition} ${r.source.clause} | ${r.source.sourceClass} |`),
    '',
  );
  for (const r of report.results) {
    L.push(`### ${r.ruleId} — ${r.title}`, '', `**Durum:** ${r.statusLabel}  ·  **Kaynak:** ${r.source.standard} ${r.source.edition} md. ${r.source.clause} (${r.source.sourceClass})`, '');
    if (r.source.note) L.push(`Kaynak notu: ${r.source.note}`, '');
    if (r.formula) L.push(`Formül: \`${r.formula}\``, '');
    if (r.substitution) L.push(`Yerine koyma: ${r.substitution}`, '');
    if (r.limit) L.push(`Sınır: ${r.limit.description}${r.margin !== null && r.margin !== undefined ? ` · marj ${fmt(r.margin * 100, 2)} %` : ''}`, '');
    const vl = valuesLine(r.values);
    if (vl) L.push(`Değerler: ${vl}`, '');
    if (r.details?.length) {
      const keys = detailKeys(r.details);
      L.push(`| ${keys.join(' | ')} |`, `|${keys.map(() => '---').join('|')}|`, ...r.details.map((row) => `| ${keys.map((k) => cell(row[k])).join(' | ')} |`), '');
    }
    for (const b of r.blockers) L.push(`- ⛔ ${b}`);
    for (const n of r.notes) L.push(`- ${n}`);
    L.push('');
  }
  L.push('## Kural doğrulama durumu', '', '| Kural | Standart / madde | Doğrulama dayanağı | İkinci gözden geçirme |', '|---|---|---|---|');
  for (const u of report.ruleVerification) L.push(`| ${u.ruleId} | ${u.standard ?? ''} ${u.clause ?? ''} | ${u.basis} | ${u.independentReview === 'DONE' ? 'yapıldı' : 'BEKLİYOR'} |`);
  L.push('', '## Sorumluluk sınırı', '', ...report.disclaimers.map((d) => `- ${d}`), '', '## İmza', '', '| Rol | Ad soyad | Tarih | İmza |', '|---|---|---|---|', ...report.signatures.map((s) => `| ${s.role} |  |  |  |`), '');
  return L.join('\n');
}

// ---- HTML (yazdırılabilir) -------------------------------------------------------------------------------------
export function renderHtml(report) {
  const h = report.header;
  const badge = (status, label) => `<span class="badge ${status}">${esc(label)}</span>`;
  const rows = report.results
    .map(
      (r) =>
        `<tr><td>${esc(r.ruleId)}</td><td>${esc(r.title)}</td><td>${badge(r.status, r.statusLabel)}</td><td>${esc(`${r.source.standard} ${r.source.edition} ${r.source.clause}`)}</td><td>${esc(r.source.sourceClass)}</td></tr>`,
    )
    .join('');
  const sections = report.results
    .map((r) => {
      const detail = r.details?.length
        ? (() => {
            const keys = detailKeys(r.details);
            return `<table class="detail"><thead><tr>${keys.map((k) => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${r.details
              .map((row) => `<tr>${keys.map((k) => `<td>${esc(cell(row[k]))}</td>`).join('')}</tr>`)
              .join('')}</tbody></table>`;
          })()
        : '';
      return `<section class="result ${r.status}">
<h3>${esc(r.ruleId)} — ${esc(r.title)} ${badge(r.status, r.statusLabel)}</h3>
<p class="src">${esc(`${r.source.standard} ${r.source.edition} md. ${r.source.clause}`)} · ${esc(r.source.sourceClass)}${r.source.note ? ' · ' + esc(r.source.note) : ''}</p>
${r.formula ? `<p><b>Formül:</b> <code>${esc(r.formula)}</code></p>` : ''}
${r.substitution ? `<p><b>Yerine koyma:</b> ${esc(r.substitution)}</p>` : ''}
${r.limit ? `<p><b>Sınır:</b> ${esc(r.limit.description)}${r.margin !== null && r.margin !== undefined ? ` · marj ${esc(fmt(r.margin * 100, 2))} %` : ''}</p>` : ''}
${valuesLine(r.values) ? `<p><b>Değerler:</b> ${esc(valuesLine(r.values))}</p>` : ''}
${detail}
<ul>${r.blockers.map((b) => `<li class="blocker">${esc(b)}</li>`).join('')}${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
</section>`;
    })
    .join('\n');
  const verification = report.ruleVerification
    .map((u) => `<tr><td>${esc(u.ruleId)}</td><td>${esc(`${u.standard ?? ''} ${u.clause ?? ''}`)}</td><td>${esc(u.basis)}</td><td>${u.independentReview === 'DONE' ? 'yapıldı' : '<b>BEKLİYOR</b>'}</td></tr>`)
    .join('');
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(h.title)}</title>
<style>
:root{--fg:#1b1f23;--bg:#fff;--muted:#586069;--line:#d0d7de;--pass:#1a7f37;--fail:#cf222e;--review:#9a6700;--blocked:#57606a}
@media (prefers-color-scheme:dark){:root{--fg:#e6edf3;--bg:#0d1117;--muted:#8b949e;--line:#30363d;--pass:#3fb950;--fail:#f85149;--review:#d29922;--blocked:#8b949e}}
body{font:14px/1.5 system-ui,sans-serif;color:var(--fg);background:var(--bg);margin:0 auto;max-width:960px;padding:16px}
h1{font-size:22px}h2{font-size:17px;border-bottom:1px solid var(--line);padding-bottom:4px;margin-top:28px}h3{font-size:14px;margin:0 0 4px}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12.5px}th,td{border:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;font-weight:600;border:1px solid currentColor}
.badge.PASS{color:var(--pass)}.badge.FAIL{color:var(--fail)}.badge.REVIEW{color:var(--review)}.badge.BLOCKED{color:var(--blocked)}
.draft{border:2px solid var(--review);padding:8px 12px;border-radius:6px;font-weight:600}
.result{border:1px solid var(--line);border-radius:6px;padding:8px 12px;margin:10px 0;break-inside:avoid}
.src,.muted{color:var(--muted);font-size:12px}.blocker{color:var(--fail)}code{font-size:12px;word-break:break-word}
.sign td{height:48px}
@media print{body{max-width:none;padding:0}.result{page-break-inside:avoid}}
</style></head><body>
<h1>${esc(h.title)}</h1>
${report.status.draft ? `<p class="draft">TASLAK — ${esc(report.status.draftReason)}</p>` : ''}
<p>Proje: <b>${esc(h.project.name ?? '')}</b>${h.project.reference ? ` (${esc(h.project.reference)})` : ''} · Rapor no: ${esc(h.reportNo)} · Tarih: ${esc(h.preparedAt)}<br>
<span class="muted">Motor ${esc(h.engineVersion)} · kural kataloğu ${esc(h.catalogDate)} · girdi özeti SHA-256 <code>${esc(h.inputHash)}</code></span></p>
<h2>Özet</h2>
<p>${badge(report.summary.overall, report.summary.overallLabel)} ${esc(report.summary.overallText)}</p>
<p>Kriter sağlandı: ${report.summary.counts.PASS} · Kriter sağlanmadı: ${report.summary.counts.FAIL} · Teknik inceleme: ${report.summary.counts.REVIEW} · Bloke: ${report.summary.counts.BLOCKED}</p>
<h2>Kapsam</h2>
<ul>${report.scope.modules.map((m) => `<li>${m.ran ? '✔' : '✘'} ${esc(m.label)}${m.ran ? '' : ' — girdi verilmedi, hesaplanmadı'}</li>`).join('')}</ul>
<p><b>Kapsam dışı:</b></p><ul>${report.scope.outOfScope.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
<h2>Sonuçlar</h2>
<table><thead><tr><th>Kural</th><th>Başlık</th><th>Durum</th><th>Kaynak</th><th>Sınıf</th></tr></thead><tbody>${rows}</tbody></table>
${sections}
<h2>Kural doğrulama durumu</h2>
<table><thead><tr><th>Kural</th><th>Standart / madde</th><th>Doğrulama dayanağı</th><th>İkinci gözden geçirme</th></tr></thead><tbody>${verification}</tbody></table>
<h2>Sorumluluk sınırı</h2>
<ul>${report.disclaimers.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
<h2>İmza</h2>
<table class="sign"><thead><tr><th>Rol</th><th>Ad soyad</th><th>Tarih</th><th>İmza</th></tr></thead><tbody>${report.signatures.map((s) => `<tr><td>${esc(s.role)}</td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>
</body></html>
`;
}
