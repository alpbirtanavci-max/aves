/* AVES official form output engine. Official templates are immutable assets;
   only the mapped answer cells are populated in a downloaded copy. */
const FormOutput = (() => {
  const NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  let manifestPromise = null;

  const FORM_BY_STANDARD = {
    '81-20': 'UB_FR_38_R04',
    '81-1/2+A3': 'UB_FR_39_R02',
  };

  const DOCX_LAYOUT = {
    UB_FR_38_R04: { header: 0, pre: 4, basic: 5, component: 6, drive: 7, shaft: 8 },
    UB_FR_39_R02: { header: 0, pre: 5, basic: 6, component: 7, drive: 8, shaft: 9 },
  };

  const PDF_FIELDS = {
    UB_FR_38_R04: {
      headerPage: 0,
      header: {
        inspector: [136.01,98.05,274.18,111.19], customer: [436.43,98.05,589.15,111.19],
        date: [124.81,111.19,279.80,128.89], address: [436.43,111.19,589.15,140.53],
        file: [136.01,128.89,274.18,140.53], standards: [136.01,140.53,589.15,154.01],
      },
      basicPage: 0,
      basic: {
        electric: [109.17,660.61,181.27,677.98], hydraulic: [181.27,660.61,253.54,677.98],
        serial: [109.17,677.98,253.54,695.50], suspension: [109.17,695.50,253.54,713.04],
        load: [397.50,695.50,589.15,713.04], stops: [109.17,713.04,253.54,730.70],
        mr: [109.17,730.70,181.27,748.02], mrl: [181.27,730.70,253.54,748.02],
        speed: [397.50,730.70,589.15,748.02],
      },
      preinspection: { page:0, result:[369.98,436.43], notes:[436.43,589.15], rows:[[529.25,549.29],[549.29,569.23],[569.23,587.15],[587.15,607.09],[607.09,627.29]] },
      components: { page:1, serial:[327.0,434.48], rows:{kumanda_kartlari:[118.64,136.15],regulatorler:[136.15,153.67],kat_kapilari:[153.67,171.19],parasut_frenleri:[171.19,188.71],kabin_tamponlari:[188.71,206.23],karsi_agirlik_tamponlari:[206.23,223.77]} },
      motor: { page:1, box:[110.77,355.09,192.07,372.61] },
      shaft: { page:1, fields:{
        kuyu_genisligi:[110.77,456.17,280.32,473.69], kuyu_derinligi:[379.03,456.17,591.43,473.69],
        kabin_tampon_yuksekligi:[110.77,473.69,280.32,491.37], ray_kapi_arasi:[379.03,473.69,591.43,491.37],
        kuyu_dibi_yuksekligi:[110.77,491.37,280.32,508.73], kabin_raylar_arasi:[110.77,508.73,280.32,526.25],
        karsi_agirlik_raylar_arasi:[379.03,508.73,591.43,526.25], kabin_kilavuz_ray_tipi:[110.77,526.25,280.32,543.78],
        karsi_agirlik_kilavuz_ray_tipi:[379.03,526.25,591.43,543.78], kat_kapisi_net_genisligi:[110.77,543.78,280.32,561.44],
        kat_kapisi_net_yuksekligi:[379.03,543.78,591.43,561.44], kat_kapisi_tipi:[110.77,561.44,280.32,578.60],
        kat_kapisi_acilma_yonu:[379.03,561.44,591.43,578.60], kabin_genisligi:[110.77,578.60,280.32,596.12],
        kabin_derinligi:[379.03,578.60,591.43,596.12], kabin_konsol_en_buyuk_aralik:[110.77,596.12,280.32,616.25],
        kabin_patenleri_dusey_aralik:[379.03,596.12,591.43,616.25], karsi_agirlik_konsol_en_buyuk_aralik:[110.77,616.25,280.32,636.11],
        karsi_agirlik_patenleri_dusey_aralik:[379.03,616.25,591.43,636.11],
      }, counterPosition:{Arka:[379.03,491.37,439.37,508.73],Sol:[439.37,491.37,491.23,508.73],Sağ:[491.23,491.37,591.43,508.73]} },
    },
    UB_FR_39_R02: {
      headerPage: 0,
      header: {
        inspector: [174.10,104.27,382.55,125.57], customer: [592.68,104.27,822.33,125.57],
        date: [174.10,125.57,382.55,148.33], address: [592.68,125.57,822.33,164.53],
        file: [174.10,148.33,377.16,164.53], standards: [174.10,164.53,822.33,189.59],
      },
      basicPage: 1,
      basic: {
        electric: [124.31,300.06,195.65,317.43], hydraulic: [195.65,300.06,267.75,317.43],
        serial: [124.31,317.43,267.75,334.95], suspension: [124.31,334.95,267.75,352.49],
        load: [411.64,334.95,824.22,352.49], stops: [124.31,352.49,267.75,370.11],
        mr: [124.31,370.11,195.65,387.42], mrl: [195.65,370.11,267.75,387.42],
        speed: [411.64,370.11,824.22,387.42],
      },
      preinspection: { page:1, result:[401.4,443.88], notes:[443.88,824.22], rows:[[193.66,211.51],[211.51,229.30],[229.30,247.06],[247.06,264.82]] },
      components: { page:1, serial:[341.14,449.18], rows:{kumanda_kartlari:[437.71,455.23],regulatorler:[455.23,472.77],kat_kapilari:[472.77,490.29],parasut_frenleri:[490.29,507.61],kabin_tamponlari:[507.61,525.05]}, extra:{karsi_agirlik_tamponlari:{page:2,box:[341.14,68.22,449.16,85.72]}} },
      motor: { page:2, box:[125.01,223.57,206.21,241.09] },
      shaft: { page:2, fields:{
        kuyu_genisligi:[125.01,326.34,287.64,343.83], kuyu_derinligi:[401.32,326.34,824.73,343.83],
        kabin_tampon_yuksekligi:[125.01,343.83,287.64,361.50], ray_kapi_arasi:[401.32,343.83,824.73,361.50],
        kuyu_dibi_yuksekligi:[125.01,361.50,287.64,378.70], kabin_raylar_arasi:[125.01,378.70,287.64,396.18],
        karsi_agirlik_raylar_arasi:[401.32,378.70,824.73,396.18], kabin_kilavuz_ray_tipi:[125.01,396.18,287.64,413.72],
        karsi_agirlik_kilavuz_ray_tipi:[401.32,396.18,824.73,413.72], kat_kapisi_net_genisligi:[125.01,413.72,287.64,431.56],
        kat_kapisi_net_yuksekligi:[401.32,413.72,824.73,431.56], kat_kapisi_tipi:[125.01,431.56,287.64,448.76],
        kat_kapisi_acilma_yonu:[401.32,431.56,824.73,448.76], kabin_genisligi:[125.01,448.76,287.64,466.20],
        kabin_derinligi:[401.32,448.76,824.73,466.20],
      }, counterPosition:{Arka:[401.32,361.50,453.56,378.70],Sol:[453.56,361.50,505.34,378.70],Sağ:[505.34,361.50,824.73,378.70]} },
    },
  };

  async function manifest() {
    if (!manifestPromise) manifestPromise = fetch('form-assets/form-output-manifest.json', { cache: 'no-store' }).then(r => {
      if (!r.ok) throw new Error('Resmî form eşleme dosyası alınamadı');
      return r.json();
    });
    return manifestPromise;
  }

  async function sha256(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  async function verifiedBytes(path, expected) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Resmî form şablonu alınamadı (${response.status})`);
    const bytes = await response.arrayBuffer();
    if (await sha256(bytes) !== expected) throw new Error('Resmî form şablonu bütünlük kontrolünden geçmedi');
    return bytes;
  }

  function snapshotForm(key, form) {
    return {
      key, code: form.code, revision: form.revision, standard: form.standard,
      template_docx_sha256: form.docx_sha256,
      template_pdf_sha256: form.pdf_sha256,
      mapping_sha256: form.mapping_sha256,
      measurement_mapping_sha256: form.measurement_mapping_sha256,
    };
  }

  async function createSnapshot(standard) {
    const data = await manifest();
    const key = FORM_BY_STANDARD[standard];
    const form = key && data.forms[key];
    if (!form) throw new Error('Ana standarda ait resmî form tanımlı değil');
    return { schema_version: 1, locked_at: new Date().toISOString(), forms: [snapshotForm(key, form)] };
  }

  async function formsForInspection(inspection) {
    const data = await manifest();
    const locked = inspection && inspection.form_cikti_snapshot && Array.isArray(inspection.form_cikti_snapshot.forms)
      ? inspection.form_cikti_snapshot.forms : [];
    if (locked.length) return locked.map(item => {
      const current = data.forms[item.key];
      if (!current || current.docx_sha256 !== item.template_docx_sha256 || current.pdf_sha256 !== item.template_pdf_sha256 || current.mapping_sha256 !== item.mapping_sha256) {
        return Object.assign({}, item, { available: false, reason: 'Bu denetimin kilitli form revizyonu bu uygulama paketinde yok.' });
      }
      return Object.assign({}, item, { available: true });
    });
    const key = FORM_BY_STANDARD[inspection && inspection.ana_standart];
    const form = key && data.forms[key];
    return form ? [Object.assign(snapshotForm(key, form), { available: true, legacy_inferred: true })] : [];
  }

  function value(v) { return v == null ? '' : String(v).trim(); }
  function standardSummary(d) {
    return [d.ana_standart, ...(Array.isArray(d.ek_standartlar) ? d.ek_standartlar : [])].filter(Boolean).join(', ');
  }
  function rowMeasurement(row) {
    const defs = Array.isArray(row.olcum_tanimlari) ? row.olcum_tanimlari : [];
    const values = row.olcum_degerleri && typeof row.olcum_degerleri === 'object' ? row.olcum_degerleri : {};
    const structured = defs.map(def => {
      const raw = value(values[def.id]);
      return raw ? `${def.etiket || def.id}: ${raw}${def.birim ? ` ${def.birim}` : ''}` : '';
    }).filter(Boolean);
    if (structured.length) return structured.join('\n');
    return [
      row.olcu1_degeri != null && value(row.olcu1_degeri) ? `${row.olcu1_adi || 'Ölçü 1'}: ${value(row.olcu1_degeri)}${row.olcu1_birimi ? ` ${row.olcu1_birimi}` : ''}` : '',
      row.olcu2_degeri != null && value(row.olcu2_degeri) ? `${row.olcu2_adi || 'Ölçü 2'}: ${value(row.olcu2_degeri)}${row.olcu2_birimi ? ` ${row.olcu2_birimi}` : ''}` : '',
    ].filter(Boolean).join('\n');
  }

  function rowNotes(row) {
    const parts = [];
    const selectedFinding = value(row && row.bulgu_secenegi);
    const otherFinding = value(row && row.diger_bulgu);
    const itemNote = value(row && row.aciklama);
    if (selectedFinding && selectedFinding !== 'Diğer bulgu') parts.push(selectedFinding);
    if (otherFinding && !parts.includes(otherFinding)) parts.push(otherFinding);
    if (itemNote && !parts.includes(itemNote)) parts.push(itemNote);
    return parts.join('\n');
  }

  function serialText(d, key) {
    const list = d.seri_numaralari && Array.isArray(d.seri_numaralari[key]) ? d.seri_numaralari[key] : [];
    return list.map(item => key === 'kat_kapilari'
      ? [item.kat, item.giris, item.seri_no].filter(Boolean).join('/')
      : value(item.seri_no)).filter(Boolean).join(', ');
  }

  function measurementValues(rows, formKey) {
    const result = {};
    rows.forEach(row => {
      const values = row.olcum_degerleri && typeof row.olcum_degerleri === 'object' ? row.olcum_degerleri : {};
      Object.entries(values).forEach(([key,val]) => { if (value(val)) result[key] = value(val); });
    });
    if (result.a3_kabin_tampon_yuksekligi && (formKey === 'UB_FR_39_R02' || !result.kabin_tampon_yuksekligi)) result.kabin_tampon_yuksekligi = result.a3_kabin_tampon_yuksekligi;
    if (result.a3_kuyu_dibi_yuksekligi && (formKey === 'UB_FR_39_R02' || !result.kuyu_dibi_yuksekligi)) result.kuyu_dibi_yuksekligi = result.a3_kuyu_dibi_yuksekligi;
    return result;
  }

  function directChildren(parent, local) { return [...parent.children].filter(node => node.localName === local); }
  function allDirectTables(xml) {
    const body = [...xml.getElementsByTagNameNS(NS, 'body')][0];
    return directChildren(body, 'tbl');
  }
  function logicalCell(row, index) {
    let logical = 0;
    for (const cell of directChildren(row, 'tc')) {
      const span = cell.getElementsByTagNameNS(NS, 'gridSpan')[0];
      const count = Number(span && (span.getAttributeNS(NS, 'val') || span.getAttribute('w:val'))) || 1;
      if (index >= logical && index < logical + count) return cell;
      logical += count;
    }
    return null;
  }
  function setCell(xml, tables, tableIndex, rowIndex, cellIndex, text, append = false) {
    const table = tables[tableIndex]; if (!table) return;
    const row = directChildren(table, 'tr')[rowIndex]; if (!row) return;
    const cell = logicalCell(row, cellIndex); if (!cell) return;
    const existing = [...cell.getElementsByTagNameNS(NS, 't')].map(x => x.textContent).join(' ').trim();
    const output = append && existing ? `${existing}  ${text}` : value(text);
    [...cell.children].filter(node => node.localName !== 'tcPr').forEach(node => node.remove());
    const p = xml.createElementNS(NS, 'w:p');
    const pPr = xml.createElementNS(NS, 'w:pPr');
    const jc = xml.createElementNS(NS, 'w:jc'); jc.setAttributeNS(NS, 'w:val', 'center'); pPr.appendChild(jc); p.appendChild(pPr);
    output.split('\n').forEach((line, index) => {
      if (index) { const brRun = xml.createElementNS(NS, 'w:r'); brRun.appendChild(xml.createElementNS(NS, 'w:br')); p.appendChild(brRun); }
      const run = xml.createElementNS(NS, 'w:r');
      const rPr = xml.createElementNS(NS, 'w:rPr');
      const size = xml.createElementNS(NS, 'w:sz'); size.setAttributeNS(NS, 'w:val', '16'); rPr.appendChild(size); run.appendChild(rPr);
      const t = xml.createElementNS(NS, 'w:t'); t.setAttribute('xml:space', 'preserve'); t.textContent = line; run.appendChild(t); p.appendChild(run);
    });
    cell.appendChild(p);
  }

  function resultFor(form, row) { return form.result_values[row.durum] || ''; }

  function fillCommonDocx(xml, tables, key, d, rows) {
    const l = DOCX_LAYOUT[key];
    setCell(xml,tables,l.header,1,1,d.denetimi_yapan); setCell(xml,tables,l.header,1,3,d.musteri_unvani);
    setCell(xml,tables,l.header,2,1,d.denetim_tarihi); setCell(xml,tables,l.header,2,3,d.denetim_adresi);
    setCell(xml,tables,l.header,3,1,d.dosya_no); setCell(xml,tables,l.header,4,1,standardSummary(d));
    const electric = d.tahrik_tipi === 'Elektrikli';
    setCell(xml,tables,l.basic,1,electric ? 1 : 2,'X',true);
    setCell(xml,tables,l.basic,2,1,d.asansor_seri_no);
    setCell(xml,tables,l.basic,3,1,d.aski_tipi);
    setCell(xml,tables,l.basic,3,4,[d.beyan_yuku_kg && `${d.beyan_yuku_kg} kg`, d.kapasite_kisi && `${d.kapasite_kisi} kişi`].filter(Boolean).join(' / '));
    setCell(xml,tables,l.basic,4,1,d.durak_sayisi);
    setCell(xml,tables,l.basic,5,d.makine_dairesi_tipi === 'MRL' ? 2 : 1,'X',true);
    setCell(xml,tables,l.basic,5,4,d.beyan_hizi_ms && `${d.beyan_hizi_ms} m/s`);
    const serialRows = [['kumanda_kartlari',2],['regulatorler',3],['kat_kapilari',4],['parasut_frenleri',5],['kabin_tamponlari',6],['karsi_agirlik_tamponlari',7]];
    serialRows.forEach(([serialKey,row]) => setCell(xml,tables,l.component,row,4,serialText(d,serialKey)));
    setCell(xml,tables,l.drive,5,1,serialText(d,'motorlar'));
    const mv = measurementValues(rows,key);
    const docxFields = {
      kuyu_genisligi:[1,1],kuyu_derinligi:[1,4],kabin_tampon_yuksekligi:[2,1],ray_kapi_arasi:[2,4],
      kuyu_dibi_yuksekligi:[3,1],kabin_raylar_arasi:[4,1],karsi_agirlik_raylar_arasi:[4,4],
      kabin_kilavuz_ray_tipi:[5,1],karsi_agirlik_kilavuz_ray_tipi:[5,4],kat_kapisi_net_genisligi:[6,1],
      kat_kapisi_net_yuksekligi:[6,4],kat_kapisi_tipi:[7,1],kat_kapisi_acilma_yonu:[7,4],
      kabin_genisligi:[8,1],kabin_derinligi:[8,4],kabin_konsol_en_buyuk_aralik:[9,1],
      kabin_patenleri_dusey_aralik:[9,4],karsi_agirlik_konsol_en_buyuk_aralik:[10,1],karsi_agirlik_patenleri_dusey_aralik:[10,4],
    };
    Object.entries(docxFields).forEach(([field,[row,cell]]) => setCell(xml,tables,l.shaft,row,cell,mv[field]||''));
    const counterCell = {Arka:4,Sol:5,Sağ:6}[mv.karsi_agirlik_yeri];
    if (counterCell != null) setCell(xml,tables,l.shaft,3,counterCell,'X',true);
  }

  async function buildDocx(formKey, form, d, rows) {
    if (!window.JSZip) throw new Error('Word çıktı bileşeni yüklenemedi');
    const bytes = await verifiedBytes(form.docx_template, form.docx_sha256);
    const zip = await JSZip.loadAsync(bytes);
    const xmlText = await zip.file('word/document.xml').async('string');
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) throw new Error('Word şablonu okunamadı');
    const tables = allDirectTables(xml);
    fillCommonDocx(xml, tables, formKey, d, rows);
    const byId = Object.fromEntries(rows.map(row => [row.madde_id, row]));
    Object.entries(form.preinspection || {}).forEach(([id, loc]) => {
      const row = byId[id]; if (!row) return;
      setCell(xml,tables,loc.table,loc.row,loc.result_cell,resultFor(form,row));
      setCell(xml,tables,loc.table,loc.row,loc.notes_cell,rowNotes(row));
    });
    Object.entries(form.docx_rows).forEach(([id, loc]) => {
      const row = byId[id]; if (!row) return;
      setCell(xml,tables,loc.table,loc.row,loc.result_cell,resultFor(form,row));
      setCell(xml,tables,loc.table,loc.row,loc.measurement_cell,rowMeasurement(row));
      setCell(xml,tables,loc.table,loc.row,loc.notes_cell,rowNotes(row));
    });
    zip.file('word/document.xml', new XMLSerializer().serializeToString(xml));
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  function wrap(font, text, size, width) {
    const lines = [];
    for (const paragraph of value(text).split('\n')) {
      let current = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const trial = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(trial,size) <= width || !current) current = trial;
        else { lines.push(current); current = word; }
      }
      if (current) lines.push(current);
    }
    return lines;
  }
  function pdfCell(page, font, box, text, options = {}) {
    if (!box || !value(text)) return;
    const { rgb } = PDFLib; const height = page.getHeight();
    const [x0,y0,x1,y1] = box; const pad = options.pad || 1.5;
    page.drawRectangle({ x:x0+0.6, y:height-y1+0.6, width:x1-x0-1.2, height:y1-y0-1.2, color:rgb(1,1,1) });
    let size = options.size || 6.4;
    let lines = wrap(font,text,size,x1-x0-pad*2);
    const minSize = options.minSize || 4.2;
    while (lines.length * (size+1) > y1-y0-pad*2 && size > minSize) {
      size = Math.max(minSize, size - .2);
      lines = wrap(font,text,size,x1-x0-pad*2);
    }
    const max = Math.max(1, Math.floor((y1-y0-pad*2)/(size+1)));
    if (options.mustFit && lines.length > max) {
      throw new Error('PDF seri numarası hücresine sığmadı; hiçbir kayıt kesilmeden çıktı durduruldu.');
    }
    lines.slice(0,max).forEach((line,i) => page.drawText(line,{x:x0+pad,y:height-y0-pad-size-i*(size+1),size,font,color:rgb(0,0,0)}));
  }
  async function buildPdf(formKey, form, d, rows) {
    if (!window.PDFLib || !window.fontkit) throw new Error('PDF çıktı bileşeni yüklenemedi');
    const bytes = await verifiedBytes(form.pdf_template, form.pdf_sha256);
    const pdf = await PDFLib.PDFDocument.load(bytes);
    pdf.registerFontkit(window.fontkit);
    const fontBytes = await fetch('form-assets/DejaVuSans.ttf').then(r => { if (!r.ok) throw new Error('PDF yazı tipi alınamadı'); return r.arrayBuffer(); });
    const font = await pdf.embedFont(fontBytes, { subset: true });
    const pages = pdf.getPages(); const fields = PDF_FIELDS[formKey];
    const h = fields.header; const hp = pages[fields.headerPage];
    pdfCell(hp,font,h.inspector,d.denetimi_yapan,{size:7}); pdfCell(hp,font,h.customer,d.musteri_unvani,{size:7});
    pdfCell(hp,font,h.date,d.denetim_tarihi,{size:7}); pdfCell(hp,font,h.address,d.denetim_adresi,{size:6});
    pdfCell(hp,font,h.file,d.dosya_no,{size:7}); pdfCell(hp,font,h.standards,standardSummary(d),{size:7});
    const b = fields.basic; const bp = pages[fields.basicPage]; const electric = d.tahrik_tipi === 'Elektrikli';
    pdfCell(bp,font,electric?b.electric:b.hydraulic,'X',{size:8}); pdfCell(bp,font,b.serial,d.asansor_seri_no,{size:7});
    pdfCell(bp,font,b.suspension,d.aski_tipi,{size:7}); pdfCell(bp,font,b.load,[d.beyan_yuku_kg&&`${d.beyan_yuku_kg} kg`,d.kapasite_kisi&&`${d.kapasite_kisi} kişi`].filter(Boolean).join(' / '),{size:7});
    pdfCell(bp,font,b.stops,d.durak_sayisi,{size:7}); pdfCell(bp,font,d.makine_dairesi_tipi==='MRL'?b.mrl:b.mr,'X',{size:8}); pdfCell(bp,font,b.speed,d.beyan_hizi_ms&&`${d.beyan_hizi_ms} m/s`,{size:7});
    const byId = Object.fromEntries(rows.map(row => [row.madde_id,row]));
    const preIds = formKey === 'UB_FR_38_R04' ? ['MAD-0001','MAD-0002','MAD-0003','MAD-0004','MAD-0005'] : ['MAD-0001','MAD-0002','MAD-0003','MAD-0004'];
    fields.preinspection.rows.forEach((vertical,index) => {
      const row=byId[preIds[index]]; if(!row) return; const page=pages[fields.preinspection.page];
      pdfCell(page,font,[fields.preinspection.result[0],vertical[0],fields.preinspection.result[1],vertical[1]],resultFor(form,row),{size:7});
      pdfCell(page,font,[fields.preinspection.notes[0],vertical[0],fields.preinspection.notes[1],vertical[1]],rowNotes(row),{size:5.8});
    });
    const serialPdfOptions = { size:6, minSize:1.8, mustFit:true };
    Object.entries(fields.components.rows).forEach(([serialKey,vertical]) => pdfCell(pages[fields.components.page],font,[fields.components.serial[0],vertical[0],fields.components.serial[1],vertical[1]],serialText(d,serialKey),serialPdfOptions));
    Object.entries(fields.components.extra||{}).forEach(([serialKey,loc]) => pdfCell(pages[loc.page],font,loc.box,serialText(d,serialKey),serialPdfOptions));
    pdfCell(pages[fields.motor.page],font,fields.motor.box,serialText(d,'motorlar'),serialPdfOptions);
    const mv=measurementValues(rows,formKey); const shaftPage=pages[fields.shaft.page];
    Object.entries(fields.shaft.fields).forEach(([field,box]) => pdfCell(shaftPage,font,box,mv[field]||'',{size:6.2}));
    if (mv.karsi_agirlik_yeri && fields.shaft.counterPosition[mv.karsi_agirlik_yeri]) pdfCell(shaftPage,font,fields.shaft.counterPosition[mv.karsi_agirlik_yeri],'X',{size:8});
    Object.entries(form.pdf_rows).forEach(([id,loc]) => {
      const row=byId[id]; if(!row) return; const page=pages[loc.page];
      pdfCell(page,font,[loc.result[0],loc.y0,loc.result[1],loc.y1],resultFor(form,row),{size:7});
      pdfCell(page,font,[loc.measurement[0],loc.y0,loc.measurement[1],loc.y1],rowMeasurement(row),{size:5.6});
      pdfCell(page,font,[loc.notes[0],loc.y0,loc.notes[1],loc.y1],rowNotes(row),{size:5.6});
    });
    return pdf.save();
  }

  function safeName(valueText) { return value(valueText).replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60) || 'denetim'; }
  function downloadBytes(bytes, mime, filename) {
    const blob = new Blob([bytes],{type:mime}); const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function build(format, inspection, rows, selectedKey) {
    const data=await manifest(); const available=await formsForInspection(inspection);
    const chosen=available.find(item=>item.key===(selectedKey||available[0]?.key));
    if(!chosen || !chosen.available) throw new Error(chosen?.reason || 'Bu denetim için resmî form bulunamadı');
    const form=data.forms[chosen.key];
    return format==='docx' ? buildDocx(chosen.key,form,inspection,rows) : buildPdf(chosen.key,form,inspection,rows);
  }
  async function download(format, inspection, rows, selectedKey) {
    if(!navigator.onLine) throw new Error('Bu özellik yalnız çevrimiçiyken kullanılabilir. Denetim kaydınız cihazda korunuyor.');
    if(inspection.denetim_durumu!=='Çalışma Tamamlandı') throw new Error('Resmî form yalnız tamamlanmış denetimden üretilebilir');
    const available=await formsForInspection(inspection); const chosen=available.find(x=>x.key===(selectedKey||available[0]?.key));
    if(!chosen) throw new Error('Bu denetim için resmî form bulunamadı');
    const bytes=await build(format,inspection,rows,chosen.key);
    const code=chosen.code.replace(/Ü/g,'U').replace(/\./g,'_'); const revision=chosen.revision.replace(/\./g,'');
    const filename=`${code}_${revision}_${safeName(inspection.dosya_no||inspection.asansor_seri_no)}_${inspection.denetim_tarihi||''}.${format}`;
    downloadBytes(bytes,format==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf',filename);
    return { filename, bytes, form: chosen };
  }

  return { createSnapshot, formsForInspection, build, download, rowMeasurement, rowNotes };
})();
