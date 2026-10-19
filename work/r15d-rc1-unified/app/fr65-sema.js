// FR.65 kuyu şemaları: girilen ölçüleri kuyu kesiti ve kuyu planı üzerinde gösterir.
// Şematiktir, ölçekli değildir. Çizim, SVG ve PDF'in ortak kullandığı basit "çizim komutları" listesi olarak üretilir
// (rect, line, poly, circle, text); DOM'a dokunmaz.
(function expose(root) {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const NAVY = '#20235B';
  const PINK = '#EA0048';
  const GREY = '#8A8FA8';
  const SOFT = '#F1F3F9';
  const WHITE = '#FFFFFF';

  // harf, alan anahtarı, ad
  const OLCULER = [
    ['A', 'kuyu_yuksekligi_cm', 'Kuyu yüksekliği'],
    ['B', 'son_kat_yuksekligi_cm', 'Son kat yüksekliği'],
    ['C', 'seyir_mesafesi_cm', 'Seyir mesafesi'],
    ['D', 'kuyu_dibi_cm', 'Kuyu dibi derinliği'],
    ['E', 'kabin_yukseklik_cm', 'Kabin iç yüksekliği'],
    ['F', 'karsi_agirlik_yukseklik_cm', 'Karşı ağırlık yüksekliği'],
    ['G', 'kabin_tampon_stroku_cm', 'Kabin tamponu stroku'],
    ['H', 'karsi_agirlik_tampon_stroku_cm', 'Karşı ağırlık tamponu stroku'],
    ['I', 'kuyu_genislik_cm', 'Kuyu genişliği'],
    ['J', 'kuyu_derinlik_cm', 'Kuyu derinliği'],
    ['K', 'kabin_genislik_cm', 'Kabin iç genişliği'],
    ['L', 'kabin_derinlik_cm', 'Kabin iç derinliği'],
    ['M', 'kabin_raylar_arasi_cm', 'Kabin ana rayları arası'],
    ['N', 'karsi_agirlik_raylar_arasi_cm', 'Karşı ağırlık rayları arası'],
    ['O', 'karsi_agirlik_genislik_cm', 'Karşı ağırlık genişliği'],
    ['P', 'karsi_agirlik_derinlik_cm', 'Karşı ağırlık derinliği'],
    ['Q', 'ray_kapi_mesafesi_cm', 'Ray–kapı mesafesi'],
    ['R', 'ana_ray_karsi_agirlik_ray_mesafesi_cm', 'Ana ray ile karşı ağırlık rayı arası'],
    ['S', 'kabin_kat_kapi_genislik_cm', 'Kabin ve kat kapısı net genişliği'],
  ];

  function formatNumber(value) {
    const text = String(value ?? '').trim().replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(text)) return '';
    const [whole, fraction] = text.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return fraction ? `${grouped},${fraction}` : grouped;
  }

  function valuesOf(values) {
    const out = {};
    for (const [letter, key] of OLCULER) {
      const raw = values && values[key] ? values[key].field_value : '';
      out[letter] = formatNumber(raw);
    }
    const tip = key => String((values && values[key] && values[key].field_value) || '').trim();
    out.kabinTampon = tip('kabin_tampon_tipi');
    out.kaTampon = tip('karsi_agirlik_tampon_tipi');
    return out;
  }

  // ---- çizim komutları -------------------------------------------------
  const rect = (x, y, w, h, o = {}) => ({ t: 'rect', x, y, w, h, fill: o.fill || null, stroke: o.stroke || null, sw: o.sw || 1, rx: o.rx || 0, hatch: !!o.hatch, dash: o.dash || null });
  const line = (x1, y1, x2, y2, o = {}) => ({ t: 'line', x1, y1, x2, y2, stroke: o.stroke || NAVY, sw: o.sw || 1, dash: o.dash || null, arrows: o.arrows || false });
  const poly = (pts, o = {}) => ({ t: 'poly', pts, stroke: o.stroke || NAVY, sw: o.sw || 1, fill: o.fill || null });
  const circle = (cx, cy, r, o = {}) => ({ t: 'circle', cx, cy, r, fill: o.fill || null, stroke: o.stroke || null, sw: o.sw || 1 });
  const text = (x, y, s, o = {}) => ({ t: 'text', x, y, s: String(s), size: o.size || 9, weight: o.weight || 400, fill: o.fill || NAVY, anchor: o.anchor || 'start', font: o.font || 'i', rot: o.rot || 0 });

  // Ölçü oku ve rozet (harf + değer)
  function dim(letter, v, x1, y1, x2, y2, badgeX, badgeY, anchor = 'middle') {
    const has = !!v[letter];
    const col = has ? PINK : GREY;
    const horizontal = y1 === y2;
    const ops = [line(x1, y1, x2, y2, { stroke: col, sw: 1.2, arrows: true })];
    if (horizontal) {
      ops.push(line(x1, y1 - 4, x1, y1 + 4, { stroke: col, sw: 1.2 }), line(x2, y2 - 4, x2, y2 + 4, { stroke: col, sw: 1.2 }));
    } else {
      ops.push(line(x1 - 4, y1, x1 + 4, y1, { stroke: col, sw: 1.2 }), line(x2 - 4, y2, x2 + 4, y2, { stroke: col, sw: 1.2 }));
    }
    const label = has ? v[letter] : '–';
    const w = Math.max(38, 24 + label.length * 6);
    const bx = anchor === 'end' ? badgeX - w : (anchor === 'start' ? badgeX : badgeX - w / 2);
    const by = badgeY - 8;
    ops.push(
      rect(bx, by, w, 16, { fill: WHITE, stroke: col, sw: 1, rx: 8 }),
      circle(bx + 8, by + 8, 6.4, { fill: col }),
      text(bx + 8, by + 11.2, letter, { size: 8.4, weight: 700, fill: WHITE, anchor: 'middle', font: 'm' }),
      text(bx + w - 6, by + 11.2, label, { size: 9.4, weight: 700, fill: has ? NAVY : GREY, anchor: 'end' }),
    );
    return ops;
  }

  // Tampon: kaide (beton) + tampon gövdesi. tip: 'Hidrolik' | 'Poliüretan' | ''.
  // Çizimdeki yükseklikler şematiktir; strok oku tamponun çalışan (hareketli) kısmını gösterir.
  function tampon(cx, tabanY, tip) {
    const ops = [];
    const kaideH = 12;
    ops.push(rect(cx - 15, tabanY - kaideH, 30, kaideH, { fill: '#D9DCE8', stroke: NAVY, sw: 1.6 }));
    const kaideUst = tabanY - kaideH;
    let ust = kaideUst;
    let strokPx = 0;
    if (tip === 'Hidrolik') {
      // silindir + piston kolu + üst plaka
      ops.push(rect(cx - 7, kaideUst - 24, 14, 24, { fill: WHITE, stroke: NAVY, sw: 1.8 }));
      ops.push(line(cx, kaideUst - 24, cx, kaideUst - 36, { stroke: NAVY, sw: 3 }));
      ops.push(rect(cx - 10, kaideUst - 40, 20, 4, { fill: NAVY, stroke: NAVY, sw: 1, rx: 1 }));
      ust = kaideUst - 40;
      strokPx = 22;
    } else if (tip === 'Poliüretan') {
      ops.push(rect(cx - 9, kaideUst - 14, 18, 14, { fill: '#C9CEE3', stroke: NAVY, sw: 1.8, rx: 3 }));
      ops.push(rect(cx - 11, kaideUst - 18, 22, 4, { fill: NAVY, stroke: NAVY, sw: 1, rx: 1 }));
      ust = kaideUst - 18;
      strokPx = 9;
    } else {
      ops.push(rect(cx - 8, kaideUst - 20, 16, 20, { fill: null, stroke: GREY, sw: 1.4, dash: [3, 2], rx: 2 }));
      ust = kaideUst - 20;
      strokPx = 12;
    }
    return { ops, ust, strokPx, kaideUst };
  }

  // Kuyu kesiti (yan görünüş)
  function kesitOps(v) {
    const ops = [];
    ops.push(rect(130, 40, 150, 360, { fill: SOFT }));
    ops.push(line(130, 40, 130, 400, { sw: 3 }), line(280, 40, 280, 400, { sw: 3 }), line(124, 40, 286, 40, { sw: 3 }));
    ops.push(rect(124, 400, 162, 10, { fill: null, stroke: NAVY, sw: 2, hatch: true }));
    ops.push(line(104, 130, 130, 130, { sw: 2.2 }), line(104, 340, 130, 340, { sw: 2.2 }));
    ops.push(text(100, 124, 'son kat', { size: 8.5, fill: GREY, anchor: 'end' }), text(100, 334, 'ilk kat', { size: 8.5, fill: GREY, anchor: 'end' }));
    ops.push(line(130, 130, 280, 130, { stroke: GREY, dash: [4, 3] }), line(130, 340, 280, 340, { stroke: GREY, dash: [4, 3] }));
    // kabin ve karşı ağırlık
    ops.push(rect(158, 242, 76, 98, { fill: WHITE, stroke: NAVY, sw: 2.4, rx: 2 }));
    ops.push(text(196, 266, 'KABİN', { size: 9, weight: 700, anchor: 'middle', font: 'm' }));
    ops.push(rect(244, 190, 26, 110, { fill: WHITE, stroke: NAVY, sw: 2.4, rx: 2 }));
    ops.push(text(257, 250, 'KARŞI AĞIRLIK', { size: 8, weight: 700, anchor: 'middle', font: 'm', rot: -90 }));
    ops.push(line(150, 64, 150, 398, { stroke: GREY, sw: 1.6 }), line(242, 64, 242, 398, { stroke: GREY, sw: 1.6 }), line(272, 64, 272, 398, { stroke: GREY, sw: 1.6 }));
    // tamponlar (kaide + tip'e göre gövde)
    const kabinT = tampon(196, 400, v.kabinTampon);
    const kaT = tampon(257, 400, v.kaTampon);
    ops.push(...kabinT.ops, ...kaT.ops);
    ops.push(text(196, 424, 'kabin tamponu', { size: 8, fill: GREY, anchor: 'middle' }), text(257, 424, 'KA tamponu', { size: 8, fill: GREY, anchor: 'middle' }));
    const tipYazi = tip => (tip || 'tip seçilmedi');
    ops.push(text(196, 434, tipYazi(v.kabinTampon), { size: 7, fill: GREY, anchor: 'middle' }), text(257, 434, tipYazi(v.kaTampon), { size: 7, fill: GREY, anchor: 'middle' }));
    ops.push(text(205, 58, 'kuyu tavanı', { size: 8.5, fill: GREY, anchor: 'middle' }));
    // ölçüler
    ops.push(...dim('B', v, 116, 40, 116, 130, 112, 85, 'end'));
    ops.push(...dim('C', v, 116, 130, 116, 340, 112, 235, 'end'));
    ops.push(...dim('D', v, 116, 340, 116, 400, 112, 372, 'end'));
    ops.push(...dim('A', v, 346, 40, 346, 400, 354, 220, 'start'));
    ops.push(...dim('E', v, 170, 242, 170, 340, 176, 314, 'start'));
    ops.push(...dim('F', v, 306, 190, 306, 300, 312, 168, 'start'));
    // strok okları tamponun çalışan kısmında; kaide hariç
    ops.push(...dim('G', v, 212, kabinT.ust, 212, kabinT.ust + kabinT.strokPx, 188, kabinT.ust - 8, 'end'));
    ops.push(...dim('H', v, 270, kaT.ust, 270, kaT.ust + kaT.strokPx, 288, kaT.ust - 8, 'start'));
    return ops;
  }

  // Kuyu planı (üstten görünüş)
  function planOps(v) {
    const ops = [];
    ops.push(rect(70, 40, 260, 220, { fill: SOFT, stroke: NAVY, sw: 3 }));
    ops.push(rect(110, 106, 120, 120, { fill: WHITE, stroke: NAVY, sw: 2.4 }));
    ops.push(text(170, 150, 'KABİN', { size: 9, weight: 700, anchor: 'middle', font: 'm' }));
    ops.push(rect(125, 60, 90, 26, { fill: WHITE, stroke: NAVY, sw: 2.2 }));
    ops.push(text(170, 77, 'KARŞI AĞIRLIK', { size: 8, weight: 700, anchor: 'middle', font: 'm' }));
    [[99, 160], [232, 160], [113, 69], [219, 69]].forEach(([x, y]) => ops.push(rect(x, y, x < 110 && y === 69 ? 8 : 9, x < 110 && y === 69 ? 8 : 9, { fill: NAVY })));
    ops.push(line(150, 226, 190, 226, { stroke: WHITE, sw: 4 }), line(150, 222, 150, 232, { sw: 2 }), line(190, 222, 190, 232, { sw: 2 }));
    ops.push(text(170, 246, 'kapı', { size: 8, fill: GREY, anchor: 'middle' }));
    ops.push(...dim('I', v, 70, 290, 330, 290, 200, 290));
    ops.push(...dim('J', v, 362, 40, 362, 260, 370, 150, 'start'));
    ops.push(...dim('N', v, 117, 50, 223, 50, 170, 50));
    ops.push(...dim('M', v, 104, 98, 236, 98, 170, 98));
    ops.push(...dim('K', v, 110, 206, 230, 206, 170, 206));
    ops.push(...dim('L', v, 122, 106, 122, 226, 126, 180, 'start'));
    ops.push(...dim('R', v, 90, 73, 90, 164, 86, 120, 'end'));
    ops.push(...dim('Q', v, 252, 164, 252, 226, 256, 195, 'start'));
    ops.push(...dim('S', v, 150, 262, 190, 262, 170, 273));
    ops.push(text(240, 76, `KA: O ${v.O || '–'} × P ${v.P || '–'}`, { size: 8.4, weight: 700 }));
    return ops;
  }

  // ---- SVG ----------------------------------------------------------------
  const FONT = { m: 'Montserrat,Arial,sans-serif', i: 'Inter,Arial,sans-serif' };
  const DEFS = `<defs>
<marker id="ok-p" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="${PINK}"/></marker>
<marker id="ok-g" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="${GREY}"/></marker>
<pattern id="tarama" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${GREY}" stroke-width="1.2"/></pattern>
</defs>`;

  function opToSvg(o) {
    if (o.t === 'rect') {
      const fill = o.hatch ? 'url(#tarama)' : (o.fill || 'none');
      return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}"${o.rx ? ` rx="${o.rx}"` : ''} fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash.join(' ')}"` : ''}/>`;
    }
    if (o.t === 'line') {
      const marker = o.arrows ? ` marker-start="url(#ok-${o.stroke === PINK ? 'p' : 'g'})" marker-end="url(#ok-${o.stroke === PINK ? 'p' : 'g'})"` : '';
      return `<line x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke="${o.stroke}" stroke-width="${o.sw}"${o.dash ? ` stroke-dasharray="${o.dash.join(' ')}"` : ''}${marker}/>`;
    }
    if (o.t === 'poly') return `<polyline points="${o.pts.map(p => p.join(',')).join(' ')}" fill="${o.fill || 'none'}" stroke="${o.stroke}" stroke-width="${o.sw}"/>`;
    if (o.t === 'circle') return `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="${o.fill || 'none'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw}"` : ''}/>`;
    if (o.t === 'text') {
      const rot = o.rot ? ` transform="rotate(${o.rot} ${o.x} ${o.y})"` : '';
      return `<text x="${o.x}" y="${o.y}" text-anchor="${o.anchor}" font-size="${o.size}" font-weight="${o.weight}" fill="${o.fill}" font-family="${FONT[o.font]}"${rot}>${esc(o.s)}</text>`;
    }
    return '';
  }

  function toSvg(ops, width, height, label) {
    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}" style="width:100%;height:auto">${DEFS}${ops.map(opToSvg).join('')}</svg>`;
  }

  const KESIT_BOYUT = [440, 440];
  const PLAN_BOYUT = [440, 340];

  function kesit(v) { return toSvg(kesitOps(v), KESIT_BOYUT[0], KESIT_BOYUT[1], 'Kuyu kesiti'); }
  function plan(v) { return toSvg(planOps(v), PLAN_BOYUT[0], PLAN_BOYUT[1], 'Kuyu planı'); }

  function legend(v) {
    const rows = OLCULER.map(([letter, , name]) =>
      `<div class="lg"><i>${letter}</i><span>${esc(name)}</span><b>${v[letter] ? `${esc(v[letter])} cm` : '–'}</b></div>`).join('');
    return `<div class="legend">${rows}</div>`;
  }

  const CSS = `
.sema{margin:0 0 5mm;break-inside:avoid-page}
.sema .pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sema figure{margin:0;border:1px solid #E3E5EE;border-radius:8px;padding:6px 8px;background:#fff}
.sema figcaption{font:700 9px 'Montserrat',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6E7186;margin-bottom:2px}
.sema .legend{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;margin-top:6px;font-size:9px}
.sema .lg{display:grid;grid-template-columns:16px 1fr auto;gap:6px;align-items:center;padding:2px 0;border-bottom:1px solid #E3E5EE}
.sema .lg i{display:inline-grid;place-items:center;width:13px;height:13px;border-radius:50%;background:#EA0048;color:#fff;font:700 7.5px 'Montserrat',Arial,sans-serif;font-style:normal}
.sema .lg b{font-weight:700;color:#20235B}
.sema .note{margin:4px 0 0;font-size:8.5px;color:#6E7186}
@media (max-width:620px){.sema .pair{grid-template-columns:1fr}.sema .legend{grid-template-columns:1fr}}`;

  // values: { alan_anahtarı: { field_value } }. Hiç ölçü yoksa boş döner. index: bölüm numarası.
  function build(values, index) {
    const v = valuesOf(values);
    if (!OLCULER.some(([letter]) => v[letter])) return '';
    return `<section class="sema"><h2><span class="no">${esc(index || '')}</span>Kuyu şemaları<em>şematik · ölçekli değil</em></h2>
<div class="pair"><figure><figcaption>Kuyu kesiti</figcaption>${kesit(v)}</figure><figure><figcaption>Kuyu planı</figcaption>${plan(v)}</figure></div>
${legend(v)}<p class="note">Şemalar yalnız girilen ölçülerin yerini göstermek içindir; ölçekli değildir ve uygunluk değerlendirmesi içermez. Tampon çizimleri seçilen tampon tipine göre gösterilir; kaideler şematiktir ve ölçüye dahil değildir.</p></section>`;
  }

  root.AVES_FR65_SEMA = Object.freeze({
    build, valuesOf, kesitOps, planOps, kesit, plan, legend, CSS, OLCULER,
    boyutlar: Object.freeze({ kesit: KESIT_BOYUT, plan: PLAN_BOYUT }),
  });
})(globalThis);
