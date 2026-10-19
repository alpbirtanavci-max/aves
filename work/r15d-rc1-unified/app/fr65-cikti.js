// FR.65 saha veri özeti çıktısı: yazdırılabilir / PDF HTML üretimi (saf fonksiyon; DOM'a dokunmaz).
(function expose(root) {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // Etiket sonundaki birim: "Kuyu genişliği (cm)" -> { label: "Kuyu genişliği", unit: "cm" }
  function splitUnit(label) {
    const match = /^(.*?)\s*\((cm|mm|m|kg|kW|m\/s|mm\/s|°|A|V|Hz|%)\)\s*$/i.exec(String(label || ''));
    return match ? { label: match[1], unit: match[2] } : { label: String(label || ''), unit: '' };
  }

  const isNumeric = value => /^-?\d+([.,]\d+)?$/.test(String(value || '').trim());

  function formatNumber(value) {
    const text = String(value).trim().replace(',', '.');
    const [whole, fraction] = text.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return fraction ? `${grouped},${fraction}` : grouped;
  }

  const CSS = `
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:11px/1.45 'Inter',Arial,sans-serif;color:#1A1C2E;background:#fff}
.sheet{max-width:210mm;margin:0 auto;padding:10mm 12mm 6mm}
.brand{background:#20235B;color:#fff;padding:7mm 9mm 6mm;border-bottom:3px solid #EA0048;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;gap:12px}
.brand img{height:9mm;display:block}.brand .mark{font:700 18px 'Montserrat',Arial,sans-serif}
.brand .doc{text-align:right;font-family:'Montserrat',Arial,sans-serif}
.brand .doc b{display:block;font-size:15px}.brand .doc span{font-size:9.5px;opacity:.82;letter-spacing:.08em;text-transform:uppercase}
.title{margin:7mm 0 3mm}.title small{font:600 9px 'Montserrat',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#EA0048}
.title h1{margin:2px 0 0;font:700 21px/1.2 'Montserrat',Arial,sans-serif;color:#20235B}
.title p{margin:3px 0 0;color:#6E7186;font-size:11.5px}
.status{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 5mm}
.chip{border:1px solid #E3E5EE;background:#F5F6FA;border-radius:99px;padding:4px 11px;font-weight:600;font-size:10px;color:#20235B}
.chip.ok{background:#EDF8F2;border-color:#BFE4CF;color:#12643D}.chip.warn{background:#FFF5E4;border-color:#EBC98B;color:#7A4B00}
.kunye{display:grid;grid-template-columns:1fr 1fr;border:1px solid #E3E5EE;border-radius:8px;overflow:hidden;margin-bottom:5mm}
.kunye div{padding:6px 11px;border-bottom:1px solid #E3E5EE;border-right:1px solid #E3E5EE;break-inside:avoid}
.kunye div:nth-child(even){border-right:0}
.kunye span{display:block;font:600 8px 'Montserrat',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6E7186;margin-bottom:1px}
.kunye b{font-weight:600;font-size:11.5px;overflow-wrap:anywhere}
.progress{margin:0 0 6mm}.progress .bar{height:6px;border-radius:9px;background:#E3E5EE;overflow:hidden}
.progress .bar i{display:block;height:100%;background:linear-gradient(90deg,#20235B,#EA0048)}
.progress p{margin:4px 0 0;font-size:10px;color:#6E7186}
.notice{border:1px solid #E3E5EE;background:#F5F6FA;border-radius:8px;padding:7px 11px;margin:0 0 5mm;color:#33384F;font-size:10px}
.notice.warn{border-color:#D89835;background:#FFF5E4}
section{margin:0 0 6mm}
section h2{display:flex;align-items:center;gap:8px;margin:0 0 7px;padding-bottom:5px;border-bottom:2px solid #20235B;font:700 12.5px 'Montserrat',Arial,sans-serif;color:#20235B;break-after:avoid}
section h2 .no{display:inline-grid;place-items:center;width:19px;height:19px;border-radius:50%;background:#EA0048;color:#fff;font-size:10px;flex:0 0 auto}
section h2 em{margin-left:auto;font:600 9px 'Inter',Arial,sans-serif;font-style:normal;color:#6E7186}
.rows .r{display:grid;grid-template-columns:46% 1fr;gap:10px;padding:5px 2px;border-bottom:1px solid #E3E5EE;break-inside:avoid}
.rows .r:last-child{border-bottom:0}.rows .r span{color:#444A66}.rows .r b{font-weight:600;overflow-wrap:anywhere}
.rows .r.note b{font-weight:400;font-style:italic;color:#444A66;border-left:3px solid #EA0048;padding-left:8px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:6px}
.card{border:1px solid #E3E5EE;border-radius:8px;padding:8px 10px;background:linear-gradient(180deg,#fff,#F5F6FA);break-inside:avoid}
.card strong{display:block;font:700 19px/1.1 'Montserrat',Arial,sans-serif;color:#20235B}
.card strong small{font:600 10px 'Inter',Arial,sans-serif;color:#6E7186;margin-left:3px}
.card span{display:block;margin-top:3px;font-size:9.5px;color:#444A66}
.card p{margin:4px 0 0;font-size:9px;font-style:italic;color:#444A66;border-left:3px solid #EA0048;padding-left:6px}
table.t{width:100%;border-collapse:collapse;font-size:10.5px}
table.t th{background:#20235B;color:#fff;text-align:left;font:600 8.5px 'Montserrat',Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:6px 9px}
table.t td{padding:6px 9px;border-bottom:1px solid #E3E5EE;overflow-wrap:anywhere}
table.t tr{break-inside:avoid}table.t tr:nth-child(even) td{background:#F5F6FA}
table.t td:first-child{font-weight:600;color:#20235B}
table.t td small{display:block;font-weight:400;color:#6E7186}
.empty{color:#6E7186;font-style:italic;padding:12px 0}
.disc{margin:4mm 0 0;padding:7px 11px;border-radius:8px;background:#F5F6FA;color:#444A66;font-size:9px}
.foot{margin-top:5mm;padding-top:3mm;border-top:1px solid #E3E5EE;color:#6E7186;font-size:9px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.foot .muhur{font-family:ui-monospace,Consolas,monospace;color:#20235B}
.no-print{border:0;border-radius:8px;background:#20235B;color:#fff;padding:10px 16px;font:700 13px 'Inter',Arial,sans-serif;cursor:pointer;margin:0 0 10px}
@page{size:A4;margin:10mm 0 12mm}
@media print{.no-print{display:none!important}.sheet{padding:0 12mm}section{margin-bottom:4.5mm}.title{margin-top:5mm}.kunye{margin-bottom:4mm}.progress{margin-bottom:4.5mm}}
.end{break-inside:avoid}
@media (max-width:620px){.kunye{grid-template-columns:1fr}.kunye div{border-right:0}.cards{grid-template-columns:1fr 1fr}.rows .r{grid-template-columns:1fr}}
`;

  function fontFaces(baseUrl) {
    const base = baseUrl || '';
    const face = (family, file, range) =>
      `@font-face{font-family:'${family}';font-style:normal;font-weight:400 700;font-display:swap;src:url('${base}fonts/${file}') format('woff2');unicode-range:${range};}`;
    const ext = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
    const latin = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
    return [
      face('Inter', 'Inter-latin-ext.woff2', ext), face('Inter', 'Inter-latin.woff2', latin),
      face('Montserrat', 'Montserrat-latin-ext.woff2', ext), face('Montserrat', 'Montserrat-latin.woff2', latin),
    ].join('');
  }

  function renderSection(section, index) {
    const fields = section.fields || [];
    const serialFields = fields.filter(field => field.serial);
    const cardFields = fields.filter(field => !field.serial && isNumeric(field.raw) && splitUnit(field.label).unit);
    const cardKeys = new Set(cardFields.map(field => field.key));
    const rowFields = fields.filter(field => !field.serial && !cardKeys.has(field.key));

    const cards = cardFields.length
      ? `<div class="cards">${cardFields.map(field => {
        const { label, unit } = splitUnit(field.label);
        return `<div class="card"><strong>${esc(formatNumber(field.raw))}<small>${esc(unit)}</small></strong><span>${esc(label)}</span>${field.note ? `<p>${esc(field.note)}</p>` : ''}</div>`;
      }).join('')}</div>` : '';

    const rows = rowFields.length
      ? `<div class="rows">${rowFields.map(field => {
        const out = [];
        if (field.raw) out.push(`<div class="r"><span>${esc(field.label)}</span><b>${esc(field.raw)}</b></div>`);
        if (field.note) out.push(`<div class="r note"><span>${esc(field.raw ? 'Not' : field.label)}</span><b>${esc(field.note)}</b></div>`);
        if (!out.length) out.push(`<div class="r"><span>${esc(field.label)}</span><b>${esc(field.value)}</b></div>`);
        return out.join('');
      }).join('')}</div>` : '';

    const table = serialFields.length
      ? `<table class="t"><thead><tr><th>Bileşen</th><th>Marka / üretici</th><th>Tip</th><th>Seri no / IMEI</th></tr></thead><tbody>${serialFields.map(field => {
        const s = field.serial;
        const durum = s.durum ? `<small>${esc(s.durum)}</small>` : '';
        const note = field.note ? `<small>Not: ${esc(field.note)}</small>` : '';
        return `<tr><td>${esc(field.label)}${durum}${note}</td><td>${esc(s.marka || '—')}</td><td>${esc(s.tip || '—')}</td><td>${esc(s.third || '—')}</td></tr>`;
      }).join('')}</tbody></table>` : '';

    return `<section><h2><span class="no">${index + 1}</span>${esc(section.title)}<em>${fields.length} alan</em></h2>${cards}${rows}${table}</section>`;
  }

  function build(ctx) {
    const c = ctx || {};
    const report = c.report || { title: 'FR.65 Saha Veri Özeti', metadata: [], sections: [], fieldCount: 0 };
    const meta = label => (report.metadata.find(item => item.label === label) || {}).value || '';
    const firma = meta('Müşteri / asansör firması');
    const seri = meta('Asansör seri no');
    const adres = meta('Asansörün bulunduğu adres');
    const modul = meta('Modül');
    const total = c.count && c.count.total ? c.count.total : 0;
    const recorded = c.count ? c.count.recorded : report.fieldCount;
    const yuzde = total ? Math.max(0, Math.min(100, Math.round((recorded / total) * 100))) : 0;
    const title = `${report.title} · ${firma} · ${seri}`;
    const logo = c.logoSrc
      ? `<img src="${esc(c.logoSrc)}" alt="AVES">` : '<span class="mark">AVES</span>';
    const chips = [
      c.kapandi ? `<span class="chip ok">✓ Saha kaydı kapatıldı${c.kapanisTarihi ? ` · ${esc(c.kapanisTarihi)}` : ''}</span>`
        : '<span class="chip">Veri toplama sürüyor</span>',
      total ? `<span class="chip">${recorded} / ${total} alanda veri</span>` : '',
      c.saveWarning ? '<span class="chip warn">Kaydetme doğrulanamadı</span>'
        : (c.senkronEsit ? '<span class="chip ok">✓ Cihaz ve sunucu eşit</span>' : '<span class="chip warn">Sunucu aktarımı bekliyor</span>'),
      c.muhurDurumu === 'gecerli' ? '<span class="chip ok">Mühür geçerli</span>'
        : (c.muhurDurumu === 'eslesmiyor' ? '<span class="chip warn">Mühür eşleşmiyor</span>' : ''),
    ].filter(Boolean).join('');
    const tarih = value => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('.') : value);
    const kunye = report.metadata.map(item =>
      `<div><span>${esc(item.label)}</span><b>${esc(item.label === 'Denetim tarihi' ? tarih(item.value) : item.value)}</b></div>`).join('');
    const sections = report.sections.length
      ? report.sections.map(renderSection).join('')
      : '<p class="empty">Bu denetimde henüz FR.65 saha alanı doldurulmamış.</p>';

    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${fontFaces(c.baseUrl)}${CSS}</style></head><body><div class="sheet">
<button class="no-print" onclick="window.print()">Yazdır / PDF olarak kaydet</button>
<div class="brand">${logo}<div class="doc"><b>Saha Veri Özeti</b><span>ÜB.FR.65${modul ? ` · ${esc(modul)}` : ''}</span></div></div>
<div class="title"><small>Denetim kaydı</small><h1>${esc(firma || 'Firma bilgisi yok')}</h1><p>${seri ? `Seri no <b>${esc(seri)}</b>` : 'Seri no girilmedi'}${adres ? ` · ${esc(adres)}` : ''}</p></div>
<div class="status">${chips}</div>
<div class="kunye">${kunye}</div>
${total ? `<div class="progress"><div class="bar"><i style="width:${yuzde}%"></i></div><p>${total} saha alanından ${recorded}'inde veri girilmiş · ${Math.max(0, total - recorded)} alan boş</p></div>` : ''}
${c.syncText ? `<div class="notice ${c.saveWarning ? 'warn' : ''}">${esc(c.syncText)}</div>` : ''}
${sections}
<div class="end"><div class="disc">Bu çıktı sahada kaydedilen bilgilerin özetidir. Uygunluk veya belgelendirme kararı içermez ve resmî denetim sonuç raporunun yerine geçmez.</div>
<div class="foot"><span>AVES Saha Denetim · ${esc(c.surum || '')} · Oluşturulma ${esc(c.olusturuldu || '')}</span>${c.muhurKisa ? `<span class="muhur">Mühür ${esc(c.muhurKisa)}</span>` : ''}</div></div>
</div></body></html>`;
  }

  root.AVES_FR65_CIKTI = Object.freeze({ build, esc, splitUnit, formatNumber });
})(globalThis);
