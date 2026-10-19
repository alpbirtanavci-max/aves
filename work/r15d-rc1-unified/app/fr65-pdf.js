// FR.65 saha veri özeti: doğrudan PDF dosyası (pdf-lib ile, çevrimdışı). Tarayıcı yazdırma penceresine bağlı değildir;
// sayfa numaraları ve üst/alt bilgi güvenilirdir. Düzen HTML çıktısına benzer, yazı tipi DejaVu Sans'tır (Türkçe tam kapsar).
(function expose(root) {
  'use strict';

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 34;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const TOP = 34;
  const BOTTOM = 46;

  const NAVY = '#20235B';
  const PINK = '#EA0048';
  const INK = '#1A1C2E';
  const MUTED = '#6E7186';
  const LINE = '#E3E5EE';
  const SOFT = '#F5F6FA';
  const GREEN = '#12643D';
  const GREEN_BG = '#EDF8F2';
  const AMBER = '#7A4B00';
  const AMBER_BG = '#FFF5E4';
  const RED = '#8B2924';
  const RED_BG = '#FFF0EF';

  const text = value => String(value ?? '').trim();
  const isNumeric = value => /^-?\d+([.,]\d+)?$/.test(text(value));

  function hexRgb(PDFLib, hex) {
    const h = String(hex || '#000000').replace('#', '');
    return PDFLib.rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
  }

  function roundedPath(w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    return `M ${rr} 0 L ${w - rr} 0 A ${rr} ${rr} 0 0 1 ${w} ${rr} L ${w} ${h - rr} A ${rr} ${rr} 0 0 1 ${w - rr} ${h} L ${rr} ${h} A ${rr} ${rr} 0 0 1 0 ${h - rr} L 0 ${rr} A ${rr} ${rr} 0 0 1 ${rr} 0 Z`;
  }

  async function build(ctx) {
    const c = ctx || {};
    const PDFLib = c.PDFLib || root.PDFLib;
    const fontkit = c.fontkit || root.fontkit;
    if (!PDFLib || !fontkit) throw new Error('PDF bileşeni yüklenemedi');
    if (!c.fontBytes) throw new Error('PDF yazı tipi yüklenemedi');
    const CIKTI = root.AVES_FR65_CIKTI;
    const SEMA = root.AVES_FR65_SEMA;
    const report = c.report || { title: 'FR.65 Saha Veri Özeti', metadata: [], sections: [], fieldCount: 0 };

    const doc = await PDFLib.PDFDocument.create();
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(c.fontBytes, { subset: true });
    let logo = null;
    if (c.logoBytes) { try { logo = await doc.embedPng(c.logoBytes); } catch { logo = null; } }
    doc.setTitle(`FR.65 Saha Veri Özeti · ${text(c.firma)} · ${text(c.seri)}`);
    doc.setProducer('AVES Saha Denetim');
    doc.setCreator('AVES Saha Denetim');

    const rgb = hex => hexRgb(PDFLib, hex);
    let page = null;
    let y = 0; // yukarıdan aşağı, sayfa üstünden uzaklık
    const pages = [];

    const widthOf = (s, size, bold) => font.widthOfTextAtSize(String(s), size) + (bold ? size * 0.045 : 0);

    function wrap(s, size, maxW, bold = false) {
      const out = [];
      for (const para of String(s ?? '').split('\n')) {
        const words = para.split(/\s+/).filter(Boolean);
        let line = '';
        for (const word of words) {
          const trial = line ? `${line} ${word}` : word;
          if (widthOf(trial, size, bold) <= maxW) { line = trial; continue; }
          if (line) out.push(line);
          if (widthOf(word, size, bold) <= maxW) { line = word; continue; }
          // çok uzun sözcüğü karakter karakter böl
          let chunk = '';
          for (const ch of word) {
            if (widthOf(chunk + ch, size, bold) > maxW && chunk) { out.push(chunk); chunk = ch; } else chunk += ch;
          }
          line = chunk;
        }
        out.push(line);
      }
      return out.length ? out : [''];
    }

    function drawText(s, x, baseline, { size = 9, color = INK, bold = false, anchor = 'start', rotate = 0 } = {}, onPage = page) {
      const str = String(s ?? '');
      if (!str) return;
      const w = widthOf(str, size, bold);
      let px = x;
      if (anchor === 'middle') px = x - w / 2;
      else if (anchor === 'end') px = x - w;
      const opts = { x: px, y: PAGE_H - baseline, size, font, color: rgb(color) };
      if (rotate) {
        // yazıyı (x, baseline) merkezli döndür
        const rad = (rotate * Math.PI) / 180;
        const cx = x; const cy = PAGE_H - baseline;
        const offset = anchor === 'middle' ? -w / 2 : (anchor === 'end' ? -w : 0);
        opts.x = cx + offset * Math.cos(rad); opts.y = cy + offset * Math.sin(rad);
        opts.rotate = PDFLib.degrees(rotate);
      }
      onPage.drawText(str, opts);
      if (bold) onPage.drawText(str, { ...opts, x: opts.x + size * 0.045 });
    }

    function fillRect(x, top, w, h, { fill = null, stroke = null, sw = 0.7, r = 0 } = {}, onPage = page) {
      if (r > 0) {
        onPage.drawSvgPath(roundedPath(w, h, r), {
          x, y: PAGE_H - top, color: fill ? rgb(fill) : undefined, borderColor: stroke ? rgb(stroke) : undefined, borderWidth: stroke ? sw : 0,
        });
        return;
      }
      onPage.drawRectangle({
        x, y: PAGE_H - top - h, width: w, height: h,
        color: fill ? rgb(fill) : undefined, borderColor: stroke ? rgb(stroke) : undefined, borderWidth: stroke ? sw : 0,
      });
    }

    function hLine(x1, x2, top, color = LINE, sw = 0.6, onPage = page) {
      onPage.drawLine({ start: { x: x1, y: PAGE_H - top }, end: { x: x2, y: PAGE_H - top }, thickness: sw, color: rgb(color) });
    }

    function newPage() {
      page = doc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      if (pages.length === 1) { y = TOP; return; }
      drawText('AVES · SAHA DENETİM', MARGIN, TOP + 4, { size: 7, color: MUTED, bold: true });
      drawText('ÜB.FR.65 · SAHA VERİ ÖZETİ', PAGE_W - MARGIN, TOP + 4, { size: 7, color: NAVY, bold: true, anchor: 'end' });
      hLine(MARGIN, PAGE_W - MARGIN, TOP + 9);
      y = TOP + 22;
    }

    function ensure(h) {
      if (!page || y + h > PAGE_H - BOTTOM) newPage();
    }

    // ---- bileşenler -------------------------------------------------------
    function brandBand() {
      const h = 50;
      fillRect(MARGIN, y, CONTENT_W, h, { fill: NAVY, r: 6 });
      fillRect(MARGIN, y + h - 2.5, CONTENT_W, 2.5, { fill: PINK });
      if (logo) {
        const lh = 22; const lw = (logo.width / logo.height) * lh;
        page.drawImage(logo, { x: MARGIN + 14, y: PAGE_H - y - h / 2 - lh / 2, width: lw, height: lh });
      } else drawText('AVES', MARGIN + 14, y + 30, { size: 16, color: '#FFFFFF', bold: true });
      drawText('FR.65 · SAHA VERİ ÖZETİ', PAGE_W - MARGIN - 14, y + 22, { size: 11, color: '#FFFFFF', bold: true, anchor: 'end' });
      drawText(`Denetim kayıt çıktısı${c.modul ? ` · ${c.modul}` : ''}`, PAGE_W - MARGIN - 14, y + 35, { size: 7, color: '#D5D7EA', anchor: 'end' });
      y += h + 14;
    }

    function titleBlock() {
      drawText('FİRMA / ASANSÖR', MARGIN, y + 7, { size: 7, color: PINK, bold: true });
      y += 14;
      for (const line of wrap(c.firma || 'Firma bilgisi yok', 18, CONTENT_W, true)) { y += 18; drawText(line, MARGIN, y, { size: 18, color: NAVY, bold: true }); y += 6; }
      const sub = `${c.seri ? `Seri no ${c.seri}` : 'Seri no girilmedi'}${c.adres ? ` · ${c.adres}` : ''}`;
      for (const line of wrap(sub, 9, CONTENT_W)) { y += 11; drawText(line, MARGIN, y, { size: 9, color: '#555B73' }); y += 2; }
      y += 10;
    }

    function chipsRow() {
      const sync = c.syncStatus || 'unknown';
      const seal = c.sealStatus || 'unknown';
      const syncTone = sync === 'synced' ? 'ok' : sync === 'protected' ? 'review' : sync === 'pending' ? 'warn' : 'plain';
      const sealTone = seal === 'valid' ? 'ok' : (seal === 'mismatch' || seal === 'not-covered' || seal === 'unknown' ? 'warn' : 'plain');
      const chips = [
        c.kapandi ? [`✓ Saha kaydı kapatıldı${c.kapanisTarihi ? ` · ${c.kapanisTarihi}` : ''}`, 'ok'] : ['Veri toplama sürüyor', 'plain'],
        c.count && c.count.total ? [`${c.count.recorded} / ${c.count.total} alanda veri`, 'plain'] : null,
        c.saveWarning ? ['Son kayıt doğrulanamadı', 'warn'] : null,
        [CIKTI.syncLabel(sync), syncTone],
        [CIKTI.sealLabel(seal), sealTone],
      ].filter(Boolean);
      const tones = {
        ok: [GREEN_BG, '#BFE4CF', GREEN], warn: [AMBER_BG, '#EBC98B', AMBER], review: [RED_BG, '#E7AAA5', RED], plain: [SOFT, LINE, NAVY],
      };
      let x = MARGIN;
      const h = 16;
      for (const [label, tone] of chips) {
        const w = widthOf(label, 7.5, true) + 16;
        if (x + w > MARGIN + CONTENT_W) { x = MARGIN; y += h + 5; }
        const [bg, border, fg] = tones[tone];
        fillRect(x, y, w, h, { fill: bg, stroke: border, sw: 0.7, r: 8 });
        drawText(label, x + 8, y + 10.8, { size: 7.5, color: fg, bold: true });
        x += w + 5;
      }
      y += h + 12;
    }

    function kunyeGrid() {
      const headline = new Set(['Müşteri / asansör firması', 'Asansör seri no', 'Asansörün bulunduğu adres']);
      const tarih = value => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('.') : value);
      const items = report.metadata.filter(item => !headline.has(item.label)).map(item => [item.label, item.label === 'Denetim tarihi' ? tarih(item.value) : item.value]);
      if (!items.length) return;
      ensure(40);
      drawText('DENETİM KÜNYESİ', MARGIN, y + 7, { size: 7, color: MUTED, bold: true });
      y += 12;
      const colW = CONTENT_W / 2;
      const top = y;
      const rows = [];
      for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
      const heights = rows.map(row => Math.max(...row.map(([, value]) => 18 + wrap(value, 8.5, colW - 16, true).length * 10.5)));
      const total = heights.reduce((a, b) => a + b, 0);
      ensure(total + 8);
      const start = y;
      fillRect(MARGIN, start, CONTENT_W, total, { stroke: LINE, sw: 0.8, r: 5 });
      let cy = start;
      rows.forEach((row, ri) => {
        row.forEach(([label, value], ci) => {
          const x = MARGIN + ci * colW;
          drawText(String(label).toLocaleUpperCase('tr-TR'), x + 8, cy + 10, { size: 5.8, color: MUTED, bold: true });
          let ly = cy + 20;
          for (const line of wrap(value, 8.5, colW - 16, true)) { drawText(line, x + 8, ly, { size: 8.5, bold: true }); ly += 10.5; }
        });
        cy += heights[ri];
        if (ri < rows.length - 1) hLine(MARGIN, MARGIN + CONTENT_W, cy);
      });
      page.drawLine({ start: { x: MARGIN + colW, y: PAGE_H - start }, end: { x: MARGIN + colW, y: PAGE_H - start - total }, thickness: 0.6, color: rgb(LINE) });
      y = start + total + 12;
      void top;
    }

    function progressBar() {
      const total = c.count && c.count.total ? c.count.total : 0;
      if (!total) return;
      const recorded = c.count.recorded;
      ensure(30);
      fillRect(MARGIN, y, CONTENT_W, 5, { fill: LINE, r: 2.5 });
      const w = Math.max(3, CONTENT_W * Math.min(1, recorded / total));
      fillRect(MARGIN, y, w, 5, { fill: recorded / total > 0.6 ? PINK : NAVY, r: 2.5 });
      y += 15;
      drawText(`${total} saha alanından ${recorded}'inde veri girilmiş · ${Math.max(0, total - recorded)} alan boş`, MARGIN, y, { size: 7.5, color: MUTED });
      y += 14;
    }

    function noticeBox(s, tone) {
      const lines = wrap(s, 7.8, CONTENT_W - 20);
      const h = lines.length * 10 + 12;
      ensure(h + 8);
      const [bg, border] = tone === 'review' ? [RED_BG, '#D68A84'] : (tone === 'warn' ? [AMBER_BG, '#D89835'] : [SOFT, LINE]);
      fillRect(MARGIN, y, CONTENT_W, h, { fill: bg, stroke: border, sw: 0.7, r: 5 });
      lines.forEach((line, i) => drawText(line, MARGIN + 10, y + 12 + i * 10, { size: 7.8, color: '#33384F' }));
      y += h + 10;
    }

    function sectionHeading(no, title, countText) {
      ensure(46);
      fillRect(MARGIN, y, 16, 16, { fill: PINK, r: 8 });
      drawText(String(no), MARGIN + 8, y + 11.4, { size: 8.5, color: '#FFFFFF', bold: true, anchor: 'middle' });
      drawText(title, MARGIN + 24, y + 12, { size: 10.5, color: NAVY, bold: true });
      if (countText) drawText(countText, PAGE_W - MARGIN, y + 12, { size: 7, color: MUTED, bold: true, anchor: 'end' });
      y += 20;
      hLine(MARGIN, MARGIN + CONTENT_W, y, NAVY, 1.4);
      y += 8;
    }

    function rowsBlock(fields) {
      const labelW = CONTENT_W * 0.44;
      const valueX = MARGIN + labelW + 10;
      const valueW = CONTENT_W - labelW - 10;
      const emit = (label, value, note) => {
        const labelLines = wrap(label, 8.3, labelW);
        const valueLines = wrap(value, 8.3, note ? valueW - 10 : valueW, !note);
        const n = Math.max(labelLines.length, valueLines.length);
        const h = n * 10.5 + 8;
        ensure(h);
        labelLines.forEach((line, i) => drawText(line, MARGIN + 2, y + 11 + i * 10.5, { size: 8.3, color: '#444A66' }));
        if (note) page.drawRectangle({ x: valueX, y: PAGE_H - y - h + 3, width: 2.2, height: h - 6, color: rgb(PINK) });
        valueLines.forEach((line, i) => drawText(line, valueX + (note ? 8 : 0), y + 11 + i * 10.5, { size: 8.3, bold: !note, color: note ? '#444A66' : INK }));
        y += h;
        hLine(MARGIN, MARGIN + CONTENT_W, y);
      };
      for (const field of fields) {
        if (field.raw) emit(field.label, field.raw, false);
        if (field.note) emit(field.raw ? 'Not' : field.label, field.note, true);
        if (!field.raw && !field.note) emit(field.label, field.value, false);
      }
      y += 6;
    }

    function cardsBlock(fields) {
      const gap = 7;
      const cw = (CONTENT_W - gap) / 2;
      const prepared = fields.map(field => {
        const { label, unit } = CIKTI.splitUnit(field.label);
        const labelLines = wrap(label, 7.8, cw - 20);
        const noteLines = field.note ? wrap(field.note, 7, cw - 28) : [];
        return { field, label, unit, labelLines, noteLines, h: 14 + 17 + labelLines.length * 9.5 + (noteLines.length ? noteLines.length * 8.5 + 7 : 0) + 8 };
      });
      for (let i = 0; i < prepared.length; i += 2) {
        const row = prepared.slice(i, i + 2);
        const h = Math.max(...row.map(item => item.h));
        ensure(h + gap);
        row.forEach((item, ci) => {
          const x = MARGIN + ci * (cw + gap);
          fillRect(x, y, cw, h, { fill: '#F8F9FC', stroke: LINE, sw: 0.7, r: 5 });
          const num = CIKTI.formatNumber(item.field.raw);
          drawText(num, x + 10, y + 24, { size: 15, color: NAVY, bold: true });
          drawText(item.unit, x + 10 + widthOf(num, 15, true) + 3, y + 24, { size: 8, color: MUTED, bold: true });
          item.labelLines.forEach((line, li) => drawText(line, x + 10, y + 36 + li * 9.5, { size: 7.8, color: '#444A66' }));
          if (item.noteLines.length) {
            const ny = y + 36 + item.labelLines.length * 9.5 + 3;
            page.drawRectangle({ x: x + 10, y: PAGE_H - ny - item.noteLines.length * 8.5 + 2, width: 2, height: item.noteLines.length * 8.5, color: rgb(PINK) });
            item.noteLines.forEach((line, li) => drawText(line, x + 17, ny + 6 + li * 8.5, { size: 7, color: '#444A66' }));
          }
        });
        y += h + gap;
      }
      y += 2;
    }

    function tableBlock(fields) {
      const widths = [0.27, 0.21, 0.19, 0.33].map(f => f * CONTENT_W);
      const head = ['BİLEŞEN', 'MARKA / ÜRETİCİ', 'TİP', 'SERİ NO / IMEI'];
      ensure(40);
      fillRect(MARGIN, y, CONTENT_W, 15, { fill: NAVY, r: 3 });
      let hx = MARGIN;
      head.forEach((label, i) => { drawText(label, hx + 7, y + 10, { size: 6.2, color: '#FFFFFF', bold: true }); hx += widths[i]; });
      y += 15;
      fields.forEach((field, ri) => {
        const s = field.serial;
        const cols = [
          [field.label, ...(s.durum ? [s.durum] : []), ...(field.note ? [`Not: ${field.note}`] : [])],
          [s.marka || '—'], [s.tip || '—'], [s.third || '—'],
        ];
        const wrapped = cols.map((parts, i) => parts.flatMap((part, pi) => wrap(part, pi === 0 ? 8 : 7, widths[i] - 12, i === 0 && pi === 0)));
        const h = Math.max(...wrapped.map(lines => lines.length)) * 10 + 8;
        ensure(h);
        if (ri % 2 === 1) fillRect(MARGIN, y, CONTENT_W, h, { fill: SOFT });
        let cx = MARGIN;
        wrapped.forEach((lines, i) => {
          lines.forEach((line, li) => drawText(line, cx + 7, y + 11 + li * 10, { size: i === 0 && li === 0 ? 8 : 7.8, bold: i === 0 && li === 0, color: i === 0 ? NAVY : INK }));
          cx += widths[i];
        });
        y += h;
        hLine(MARGIN, MARGIN + CONTENT_W, y);
      });
      y += 8;
    }

    function renderSection(section, index) {
      const fields = section.fields || [];
      const serialFields = fields.filter(f => f.serial);
      const cardFields = fields.filter(f => !f.serial && isNumeric(f.raw) && CIKTI.splitUnit(f.label).unit);
      const cardKeys = new Set(cardFields.map(f => f.key));
      const rowFields = fields.filter(f => !f.serial && !cardKeys.has(f.key));
      sectionHeading(index + 1, section.title, `${fields.length} alan`);
      if (cardFields.length) cardsBlock(cardFields);
      if (rowFields.length) rowsBlock(rowFields);
      if (serialFields.length) tableBlock(serialFields);
      y += 6;
    }

    // ---- şema çizimi (komut listesinden) -----------------------------------
    function drawOps(ops, ox, oy, scale, textScale, onPage) {
      const X = x => ox + x * scale;
      const Yt = yy => oy + yy * scale; // yukarıdan
      const col = hex => rgb(hex);
      const arrowHead = (x, pdfY, angle, color) => {
        const size = 4.2;
        const pts = [
          [x, pdfY],
          [x - size * Math.cos(angle - 0.45), pdfY - size * Math.sin(angle - 0.45)],
          [x - size * Math.cos(angle + 0.45), pdfY - size * Math.sin(angle + 0.45)],
        ];
        const d = `M ${pts[0][0]} ${PAGE_H - pts[0][1]} L ${pts[1][0]} ${PAGE_H - pts[1][1]} L ${pts[2][0]} ${PAGE_H - pts[2][1]} Z`;
        onPage.drawSvgPath(d, { x: 0, y: PAGE_H, color: col(color) });
      };
      for (const o of ops) {
        if (o.t === 'rect') {
          const opts = { x: X(o.x), y: PAGE_H - Yt(o.y) - o.h * scale, width: o.w * scale, height: o.h * scale, borderWidth: o.stroke ? Math.max(0.5, o.sw * scale) : 0 };
          if (o.hatch) opts.color = rgb('#DADDEB'); else if (o.fill) opts.color = col(o.fill);
          if (o.stroke) opts.borderColor = col(o.stroke);
          if (o.dash) opts.borderDashArray = o.dash.map(v => v * scale);
          if (o.rx && !o.dash) {
            onPage.drawSvgPath(roundedPath(o.w * scale, o.h * scale, o.rx * scale), {
              x: X(o.x), y: PAGE_H - Yt(o.y), color: opts.color, borderColor: opts.borderColor, borderWidth: opts.borderWidth,
            });
          } else onPage.drawRectangle(opts);
        } else if (o.t === 'line') {
          onPage.drawLine({
            start: { x: X(o.x1), y: PAGE_H - Yt(o.y1) }, end: { x: X(o.x2), y: PAGE_H - Yt(o.y2) },
            thickness: Math.max(0.5, o.sw * scale), color: col(o.stroke), dashArray: o.dash ? o.dash.map(v => v * scale) : undefined,
          });
          if (o.arrows) {
            const ang = Math.atan2(-(Yt(o.y2) - Yt(o.y1)), X(o.x2) - X(o.x1));
            arrowHead(X(o.x2), PAGE_H - Yt(o.y2), ang, o.stroke);
            arrowHead(X(o.x1), PAGE_H - Yt(o.y1), ang + Math.PI, o.stroke);
          }
        } else if (o.t === 'circle') {
          onPage.drawCircle({ x: X(o.cx), y: PAGE_H - Yt(o.cy), size: o.r * scale, color: o.fill ? col(o.fill) : undefined, borderColor: o.stroke ? col(o.stroke) : undefined, borderWidth: o.stroke ? o.sw * scale : 0 });
        } else if (o.t === 'text') {
          drawText(o.s, X(o.x), Yt(o.y), { size: o.size * scale * textScale, color: o.fill, bold: o.weight >= 700, anchor: o.anchor, rotate: o.rot ? -o.rot : 0 }, onPage);
        }
      }
    }

    function semaBlock(index) {
      if (!SEMA || !c.values) return false;
      const v = SEMA.valuesOf(c.values);
      if (!SEMA.OLCULER.some(([letter]) => v[letter])) return false;
      newPage();
      sectionHeading(index, 'Kuyu şemaları', 'şematik · ölçekli değil');
      const figW = (CONTENT_W - 8) / 2;
      const kesit = SEMA.kesitOps(v);
      const plan = SEMA.planOps(v);
      // yararlı alan: kesit x 90..420, y 28..440 ; plan x 55..410, y 28..300
      const kScale = Math.min((figW - 12) / 330, 380 / 412);
      const pScale = Math.min((figW - 12) / 355, 380 / 272);
      const figH = Math.max(412 * kScale, 272 * pScale) + 26;
      fillRect(MARGIN, y, figW, figH, { stroke: LINE, sw: 0.8, r: 5 });
      fillRect(MARGIN + figW + 8, y, figW, figH, { stroke: LINE, sw: 0.8, r: 5 });
      drawText('KUYU KESİTİ', MARGIN + 8, y + 12, { size: 6.5, color: MUTED, bold: true });
      drawText('KUYU PLANI', MARGIN + figW + 16, y + 12, { size: 6.5, color: MUTED, bold: true });
      drawOps(kesit, MARGIN + 6 - 90 * kScale, y + 18 - 28 * kScale, kScale, 1.18, page);
      drawOps(plan, MARGIN + figW + 14 - 55 * pScale, y + 18 - 28 * pScale, pScale, 1.18, page);
      y += figH + 10;
      // gösterge
      const half = Math.ceil(SEMA.OLCULER.length / 2);
      const colW = (CONTENT_W - 16) / 2;
      for (let i = 0; i < half; i += 1) {
        ensure(14);
        [SEMA.OLCULER[i], SEMA.OLCULER[i + half]].forEach((item, ci) => {
          if (!item) return;
          const [letter, , name] = item;
          const x = MARGIN + ci * (colW + 16);
          fillRect(x, y + 1, 11, 11, { fill: PINK, r: 5.5 });
          drawText(letter, x + 5.5, y + 9, { size: 6.5, color: '#FFFFFF', bold: true, anchor: 'middle' });
          drawText(name, x + 16, y + 9, { size: 7.6, color: INK });
          drawText(v[letter] ? `${v[letter]} cm` : '–', x + colW, y + 9, { size: 7.6, color: NAVY, bold: true, anchor: 'end' });
        });
        hLine(MARGIN, MARGIN + colW, y + 13); hLine(MARGIN + colW + 16, MARGIN + CONTENT_W, y + 13);
        y += 14;
      }
      y += 4;
      for (const line of wrap('Şemalar yalnız girilen ölçülerin yerini göstermek içindir; ölçekli değildir ve uygunluk değerlendirmesi içermez. Tampon çizimleri seçilen tampon tipine göre gösterilir; kaideler şematiktir ve ölçüye dahil değildir.', 6.8, CONTENT_W)) {
        ensure(10); drawText(line, MARGIN, y + 7, { size: 6.8, color: MUTED }); y += 9;
      }
      y += 8;
      return true;
    }

    function missingBlock(no) {
      const list = Array.isArray(c.missing) ? c.missing : [];
      if (!list.length) {
        const label = '✓ Görünen tüm saha alanlarında veri var.';
        ensure(24); fillRect(MARGIN, y, CONTENT_W, 18, { fill: GREEN_BG, r: 5 }); drawText(label, MARGIN + 10, y + 12, { size: 8, color: GREEN, bold: true }); y += 26;
        return;
      }
      const total = list.reduce((sum, section) => sum + section.fields.length, 0);
      sectionHeading('!', 'Girilmemiş alanlar', `${total} alan`);
      for (const section of list) {
        const lines = wrap(`${section.title} (${section.fields.length}): ${section.fields.join(', ')}`, 7.6, CONTENT_W - 20);
        const h = lines.length * 10 + 10;
        ensure(h + 4);
        fillRect(MARGIN, y, CONTENT_W, h, { fill: SOFT, r: 4 });
        lines.forEach((line, i) => drawText(line, MARGIN + 10, y + 12 + i * 10, { size: 7.6, color: '#33384F' }));
        y += h + 4;
      }
      y += 6;
      void no;
    }

    function correctionsBlock() {
      const list = Array.isArray(c.duzeltmeler) ? c.duzeltmeler : [];
      if (!list.length) return;
      sectionHeading('↻', 'Düzeltme geçmişi', `${list.length} düzeltme`);
      for (const line of wrap(`Bu kayıt kapatıldıktan sonra ${list.length} kez iz bırakılarak düzeltildi.`, 8, CONTENT_W)) { drawText(line, MARGIN, y + 8, { size: 8, color: '#33384F' }); y += 11; }
      y += 4;
      const date = value => (value ? new Date(value).toLocaleDateString('tr-TR') : '');
      list.forEach(item => {
        const left = `${date(item.ilk)}${item.kim ? ` · ${item.kim}` : ''}`;
        const right = `${item.neden || 'Neden belirtilmedi'} · ${item.adet} değişiklik`;
        const rl = wrap(right, 8.3, CONTENT_W * 0.52, true);
        const h = rl.length * 10.5 + 8;
        ensure(h);
        drawText(left, MARGIN + 2, y + 11, { size: 8.3, color: '#444A66' });
        rl.forEach((line, i) => drawText(line, MARGIN + CONTENT_W * 0.46 + 10, y + 11 + i * 10.5, { size: 8.3, bold: true }));
        y += h; hLine(MARGIN, MARGIN + CONTENT_W, y);
      });
      y += 8;
    }

    // ---- belge ---------------------------------------------------------------
    newPage();
    brandBand();
    titleBlock();
    chipsRow();
    kunyeGrid();
    progressBar();
    if (c.syncText && (c.syncStatus || 'unknown') !== 'synced') noticeBox(c.syncText, c.syncStatus === 'protected' ? 'review' : 'warn');
    if (report.sections.length) report.sections.forEach(renderSection);
    else { ensure(30); drawText('Bu denetimde henüz FR.65 saha alanı doldurulmamış.', MARGIN, y + 10, { size: 9, color: MUTED }); y += 24; }
    semaBlock(report.sections.length + 1);
    missingBlock(report.sections.length + 2);
    correctionsBlock();
    // uyarı notu
    const disc = 'Bu çıktı sahada kaydedilen bilgilerin özetidir. Uygunluk veya belgelendirme kararı içermez ve resmî denetim sonuç raporunun yerine geçmez. Mühür, cihazdaki FR.65 saha verisinin parmak izidir; indirilen PDF dosyasının elektronik imzası değildir.';
    const dl = wrap(disc, 7, CONTENT_W - 20);
    ensure(dl.length * 9 + 16);
    fillRect(MARGIN, y, CONTENT_W, dl.length * 9 + 12, { fill: SOFT, r: 5 });
    dl.forEach((line, i) => drawText(line, MARGIN + 10, y + 12 + i * 9, { size: 7, color: '#444A66' }));
    y += dl.length * 9 + 16;

    // alt bilgi + sayfa numarası
    const total = pages.length;
    pages.forEach((pg, i) => {
      hLine(MARGIN, PAGE_W - MARGIN, PAGE_H - 30, LINE, 0.6, pg);
      drawText(`AVES Saha Denetim · ${c.surum || ''} · Oluşturulma ${c.olusturuldu || ''}`, MARGIN, PAGE_H - 20, { size: 6.8, color: MUTED }, pg);
      if (c.muhurKisa && c.sealStatus === 'valid') drawText(`Kayıt mührü ${c.muhurKisa}`, PAGE_W / 2 + 40, PAGE_H - 20, { size: 6.8, color: NAVY, anchor: 'middle' }, pg);
      drawText(`Sayfa ${i + 1} / ${total}`, PAGE_W - MARGIN, PAGE_H - 20, { size: 7, color: NAVY, bold: true, anchor: 'end' }, pg);
    });

    return doc.save();
  }

  root.AVES_FR65_PDF = Object.freeze({ build });
})(globalThis);
