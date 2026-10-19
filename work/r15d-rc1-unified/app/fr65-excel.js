// FR.65 saha verisini Excel (.xlsx) olarak dışa aktarır. Saf fonksiyonlar; JSZip dışarıdan verilir.
// Sayfalar: "Künye", "Saha verisi" (tüm görünen alanlar; boşlar dahil, alan anahtarıyla), "Düzeltmeler".
(function expose(root) {
  'use strict';

  const SERIAL_TYPES = new Set(['serial', 'electric', 'gsm', 'optional_serial']);

  const text = value => String(value ?? '').trim();
  const isNumeric = value => /^-?\d+([.,]\d+)?$/.test(text(value));

  function splitUnit(label) {
    const match = /^(.*?)\s*\((cm|mm|m|kg|kW|m\/s|mm\/s|°|A|V|Hz|%)\)\s*$/i.exec(String(label || ''));
    return match ? { label: match[1], unit: match[2] } : { label: String(label || ''), unit: '' };
  }

  const dateText = value => (value ? new Date(value).toLocaleString('tr-TR') : '');

  // ---- Veri satırları ------------------------------------------------------
  function kunyeRows(d, meta = {}) {
    const rec = d || {};
    return [
      ['Müşteri / asansör firması', rec.musteri_unvani],
      ['Firma adresi', rec.firma_adresi],
      ['Asansörün bulunduğu adres', rec.denetim_adresi],
      ['Asansör seri no', rec.asansor_seri_no],
      ['Asansör kimlik no', rec.asansor_kimlik_no],
      ['Dosya no', rec.dosya_no],
      ['Modül', rec.modul],
      ['Tahrik tipi', rec.tahrik_tipi],
      ['Makine dairesi', rec.makine_dairesi_tipi],
      ['Anma yükü (kg)', rec.beyan_yuku_kg],
      ['Kişi kapasitesi', rec.kapasite_kisi],
      ['Hız (m/s)', rec.beyan_hizi_ms],
      ['Durak sayısı', rec.durak_sayisi],
      ['Denetim tarihi', rec.denetim_tarihi],
      ['Denetimi yapan', rec.denetimi_yapan || rec.olusturan_ad],
      ['Kayıt durumu', rec.denetim_durumu],
      ['Kapanış zamanı', dateText(rec.calisma_tamamlandi_at)],
      ['Kayıt mührü (SHA-256)', rec.butunluk_hash],
      ['Kayıt kimliği', rec.id],
      ['Uygulama sürümü', meta.surum],
      ['Dışa aktarma zamanı', meta.uretildi],
    ].map(([ad, deger]) => [ad, deger == null ? '' : deger]);
  }

  // sections: AVES_TEKNIK_DOSYA_FORM.visibleFr65Sections(...) çıktısı; isActive: (field, values) => boolean
  function dataRows(sections, values, isActive) {
    const vals = values && typeof values === 'object' ? values : {};
    const rows = [];
    for (const section of sections || []) {
      for (const field of section.fields || []) {
        if (typeof isActive === 'function' && !isActive(field, vals)) continue;
        const [key, label, type] = field;
        const value = vals[key] && typeof vals[key] === 'object' ? vals[key] : {};
        const { label: name, unit } = splitUnit(label);
        const serial = SERIAL_TYPES.has(type);
        const thirdKey = type === 'gsm' ? 'imei' : 'seri_no';
        const deger = serial ? '' : text(value.field_value);
        const marka = serial ? text(value.marka) : '';
        const tip = serial ? text(value.tip) : '';
        const seri = serial ? text(value[thirdKey]) : '';
        const durum = serial ? text(value.var_mi) : '';
        const note = text(value.note);
        const filled = !!(deger || marka || tip || seri || durum);
        rows.push({
          bolum: section.title, alan: name, deger, birim: unit, marka, tip, seri, durum, not: note,
          girildi: filled ? 'Evet' : 'Hayır', anahtar: key,
        });
      }
    }
    return rows;
  }

  function correctionRows(duzeltmeler) {
    return (duzeltmeler || []).map(item => [
      item.ilk ? new Date(item.ilk).toLocaleString('tr-TR') : '', item.kim || '', item.neden || '', item.adet || 0,
    ]);
  }

  // ---- XLSX yazımı ----------------------------------------------------------
  const xmlEscape = value => String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function columnName(index) {
    let n = index + 1;
    let out = '';
    while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
    return out;
  }

  function cell(value, rowIndex, colIndex, style) {
    const ref = `${columnName(colIndex)}${rowIndex + 1}`;
    const s = style ? ` s="${style}"` : '';
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${s}><v>${value}</v></c>`;
    const str = String(value ?? '');
    if (str === '') return `<c r="${ref}"${s}/>`;
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(str)}</t></is></c>`;
  }

  function sheetXml(rows, widths, { header = true, filter = false } = {}) {
    const cols = `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`;
    const body = rows.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cell(v, r, c, header && r === 0 ? 1 : 0)).join('')}</row>`).join('');
    const lastRef = `${columnName(Math.max(0, widths.length - 1))}${Math.max(1, rows.length)}`;
    const pane = header ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${body}</sheetData>${filter && rows.length > 1 ? `<autoFilter ref="A1:${lastRef}"/>` : ''}</worksheet>`;
  }

  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF20235B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  async function build(ctx) {
    const c = ctx || {};
    const JSZipClass = c.JSZip || root.JSZip;
    if (!JSZipClass) throw new Error('Excel bileşeni yüklenemedi');
    const kunye = [['Alan', 'Değer'], ...kunyeRows(c.record, c.meta)];
    const data = dataRows(c.sections, c.values, c.isActive);
    const dataSheet = [
      ['Bölüm', 'Alan', 'Değer', 'Birim', 'Marka / üretici', 'Tip', 'Seri no / IMEI', 'Durum', 'Not', 'Girildi', 'Alan anahtarı'],
      ...data.map(row => [row.bolum, row.alan, isNumeric(row.deger) ? Number(text(row.deger).replace(',', '.')) : row.deger,
        row.birim, row.marka, row.tip, row.seri, row.durum, row.not, row.girildi, row.anahtar]),
    ];
    const corrections = correctionRows(c.duzeltmeler);
    const sheets = [
      { ad: 'Künye', xml: sheetXml(kunye, [34, 60], { filter: false }) },
      { ad: 'Saha verisi', xml: sheetXml(dataSheet, [34, 44, 16, 8, 22, 18, 24, 10, 40, 9, 34], { filter: true }) },
    ];
    if (corrections.length) {
      sheets.push({ ad: 'Düzeltmeler', xml: sheetXml([['Tarih', 'Kişi', 'Neden', 'Değişiklik sayısı'], ...corrections], [22, 24, 34, 18], { filter: false }) });
    }
    const zip = new JSZipClass();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEscape(s.ad)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('xl/styles.xml', STYLES);
    sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, s.xml));
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  root.AVES_FR65_EXCEL = Object.freeze({ build, kunyeRows, dataRows, correctionRows, columnName, xmlEscape, isNumeric });
})(globalThis);
