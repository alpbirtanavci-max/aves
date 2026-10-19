// FR.65 kuyu şemaları: girilen ölçüleri teknik resim (CAD) görünümüyle kuyu planı ve kuyu kesiti üzerinde gösterir.
// Şematiktir, ölçekli değildir. Çizim; SVG ve PDF'in ortak kullandığı basit "çizim komutları" listesi olarak üretilir
// (rect, line, circle, text); taramalar da çizgi olarak üretilir. DOM'a dokunmaz.
(function expose(root) {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const INK = '#1F2340';
  const NAVY = '#20235B';
  const PINK = '#EA0048';
  const GREY = '#8A8FA8';
  const LIGHT = '#C9CDDD';
  const HATCH = '#9EA3BA';
  const GOLD = '#B8941F';
  const WHITE = '#FFFFFF';
  const TAG = '#E8EAF3';

  // harf, alan anahtarı, ad (büyük harfle çizimde kullanılır)
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
    ['T', 'kabin_kat_kapi_yukseklik_cm', 'Kabin ve kat kapısı net yüksekliği'],
    ['U', 'kabin_tampon_kaide_yuksekligi_cm', 'Kabin tamponu kaide yüksekliği'],
    ['V', 'kabin_tampon_yuksekligi_cm', 'Kabin tamponu yüksekliği (kaide hariç)'],
    ['W', 'karsi_agirlik_tampon_kaide_yuksekligi_cm', 'Karşı ağırlık tamponu kaide yüksekliği'],
    ['X', 'karsi_agirlik_tampon_yuksekligi_cm', 'Karşı ağırlık tamponu yüksekliği (kaide hariç)'],
  ];
  const AD = Object.fromEntries(OLCULER.map(([letter, , name]) => [letter, name]));

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
      out[`${letter}_ham`] = Number(String(raw ?? '').replace(',', '.'));
    }
    const field = key => String((values && values[key] && values[key].field_value) || '').trim();
    out.kabinTampon = field('kabin_tampon_tipi');
    out.kaTampon = field('karsi_agirlik_tampon_tipi');
    out.tahrik = field('tahrik_tipi');
    out.hidrolik = /hidrolik/i.test(out.tahrik);
    return out;
  }

  // ---- çizim komutları -------------------------------------------------
  const rect = (x, y, w, h, o = {}) => ({ t: 'rect', x, y, w, h, fill: o.fill || null, stroke: o.stroke || null, sw: o.sw || 1, rx: o.rx || 0, dash: o.dash || null });
  const line = (x1, y1, x2, y2, o = {}) => ({ t: 'line', x1, y1, x2, y2, stroke: o.stroke || INK, sw: o.sw || 1, dash: o.dash || null, arrows: false });
  const circle = (cx, cy, r, o = {}) => ({ t: 'circle', cx, cy, r, fill: o.fill || null, stroke: o.stroke || null, sw: o.sw || 1 });
  const text = (x, y, s, o = {}) => ({ t: 'text', x, y, s: String(s), size: o.size || 9, weight: o.weight || 400, fill: o.fill || INK, anchor: o.anchor || 'start', font: o.font || 'i', rot: o.rot || 0 });

  // Dikdörtgen içini 45° taramalı çizgilerle doldurur (kırpma elle yapılır; PDF'te kırpma gerekmez).
  function hatchRect(x, y, w, h, spacing = 5, color = HATCH, sw = 0.6) {
    const ops = [];
    for (let k = -h; k < w; k += spacing) {
      const t1 = Math.max(0, -k);
      const t2 = Math.min(h, w - k);
      if (t2 - t1 > 0.5) ops.push(line(x + k + t1, y + h - t1, x + k + t2, y + h - t2, { stroke: color, sw }));
    }
    return ops;
  }

  // Beton duvar: açık gri zemin + tarama + dış/iç çizgi
  function wall(x, y, w, h) {
    return [rect(x, y, w, h, { fill: '#F4F5FA', stroke: INK, sw: 1.4 }), ...hatchRect(x, y, w, h, 5)];
  }

  const textWidth = (s, size) => String(s).length * size * 0.6;

  // Etiketli metin (CAD'deki gri zeminli yazı gibi)
  function tag(x, y, s, o = {}) {
    const size = o.size || 9;
    const w = textWidth(s, size) + 8;
    const h = size + 5;
    const rot = o.rot || 0;
    const ops = [];
    if (!rot) {
      const left = o.anchor === 'start' ? x : (o.anchor === 'end' ? x - w : x - w / 2);
      ops.push(rect(left, y - size - 1, w, h, { fill: o.bg || TAG }));
      ops.push(text(x, y, s, { ...o, size }));
    } else {
      // dikey ölçü yazısı: -90° döner; kutu yatay/dikey boyut değiştirir
      ops.push(rect(x - size - 1, y - w / 2, h, w, { fill: o.bg || TAG }));
      ops.push(text(x, y + w / 2 - 4, s, { ...o, size, anchor: 'start', rot }));
    }
    return ops;
  }

  const tick = (x, y, color) => line(x - 3.2, y + 3.2, x + 3.2, y - 3.2, { stroke: color, sw: 1.3 });

  // Yatay ölçü: uzatma çizgileri + eğik uç çizgileri + metin üstte
  function dimH(v, letter, x1, x2, y, from1, from2, o = {}) {
    const has = !!v[letter];
    const col = has ? PINK : GREY;
    const ops = [];
    ops.push(line(x1, from1, x1, y - 3, { stroke: col, sw: 0.7 }), line(x2, from2, x2, y - 3, { stroke: col, sw: 0.7 }));
    ops.push(line(x1 - 4, y, x2 + 4, y, { stroke: col, sw: 1 }), tick(x1, y, col), tick(x2, y, col));
    const label = o.short ? `${letter}  ${has ? v[letter] : '–'}` : `${AD[letter].toLocaleUpperCase('tr-TR')} = ${has ? `${v[letter]} cm` : '–'}`;
    ops.push(...tag((x1 + x2) / 2, y - 3, label, { size: o.size || 8.6, weight: 700, anchor: 'middle', fill: has ? NAVY : GREY, font: 'i' }));
    return ops;
  }

  // Dikey ölçü
  function dimV(v, letter, y1, y2, x, from1, from2, o = {}) {
    const has = !!v[letter];
    const col = has ? PINK : GREY;
    const ops = [];
    ops.push(line(from1, y1, x - 3, y1, { stroke: col, sw: 0.7 }), line(from2, y2, x - 3, y2, { stroke: col, sw: 0.7 }));
    ops.push(line(x, y1 - 4, x, y2 + 4, { stroke: col, sw: 1 }), tick(x, y1, col), tick(x, y2, col));
    const label = o.short ? `${letter}  ${has ? v[letter] : '–'}` : `${AD[letter].toLocaleUpperCase('tr-TR')} = ${has ? `${v[letter]} cm` : '–'}`;
    const size = o.size || 8.6;
    ops.push(...tag(x - 3, (y1 + y2) / 2, label, { size, weight: 700, fill: has ? NAVY : GREY, rot: -90 }));
    return ops;
  }

  // Harfli küçük rozet (kalabalık yerlerde)
  function badge(letter, v, x, y, anchor = 'middle') {
    const has = !!v[letter];
    const col = has ? PINK : GREY;
    const label = has ? v[letter] : '–';
    const w = Math.max(34, 22 + label.length * 5.8);
    const bx = anchor === 'end' ? x - w : (anchor === 'start' ? x : x - w / 2);
    return [
      rect(bx, y - 8, w, 16, { fill: WHITE, stroke: col, sw: 1, rx: 8 }),
      circle(bx + 8, y, 6.2, { fill: col }),
      text(bx + 8, y + 3, letter, { size: 8, weight: 700, fill: WHITE, anchor: 'middle', font: 'm' }),
      text(bx + w - 6, y + 3.2, label, { size: 9, weight: 700, fill: has ? NAVY : GREY, anchor: 'end' }),
    ];
  }

  // Çift çizgili çerçeve (kabin / karşı ağırlık)
  function frame(x, y, w, h, o = {}) {
    const ops = [rect(x, y, w, h, { fill: WHITE, stroke: INK, sw: 2 }), rect(x + 4, y + 4, w - 8, h - 8, { stroke: INK, sw: 0.8 })];
    if (o.cross) ops.push(line(x + 4, y + 4, x + w - 4, y + h - 4, { stroke: LIGHT, sw: 0.7 }), line(x + w - 4, y + 4, x + 4, y + h - 4, { stroke: LIGHT, sw: 0.7 }));
    return ops;
  }

  // Tampon: kaide (beton) + tampon gövdesi. tip: 'Hidrolik' | 'Poliüretan' | ''.
  function tampon(cx, tabanY, tip) {
    const ops = [];
    const kaideH = 12;
    ops.push(rect(cx - 15, tabanY - kaideH, 30, kaideH, { fill: '#D9DCE8', stroke: INK, sw: 1.6 }));
    const kaideUst = tabanY - kaideH;
    let ust = kaideUst;
    let strokPx = 0;
    if (tip === 'Hidrolik') {
      ops.push(rect(cx - 7, kaideUst - 24, 14, 24, { fill: WHITE, stroke: INK, sw: 1.8 }));
      ops.push(line(cx, kaideUst - 24, cx, kaideUst - 36, { stroke: INK, sw: 3 }));
      ops.push(rect(cx - 10, kaideUst - 40, 20, 4, { fill: INK, stroke: INK, sw: 1, rx: 1 }));
      ust = kaideUst - 40; strokPx = 22;
    } else if (tip === 'Poliüretan') {
      ops.push(rect(cx - 9, kaideUst - 14, 18, 14, { fill: '#C9CEE3', stroke: INK, sw: 1.8, rx: 3 }));
      ops.push(rect(cx - 11, kaideUst - 18, 22, 4, { fill: INK, stroke: INK, sw: 1, rx: 1 }));
      ust = kaideUst - 18; strokPx = 9;
    } else {
      ops.push(rect(cx - 8, kaideUst - 20, 16, 20, { stroke: GREY, sw: 1.4, dash: [3, 2], rx: 2 }));
      ust = kaideUst - 20; strokPx = 12;
    }
    return { ops, ust, strokPx, kaideUst };
  }

  const dashDot = [9, 2.5, 2, 2.5];

  // Ray: T profili (taban + gövde) ve araba pabucu. side: 'sol' | 'sag' (kabinin hangi yanında)
  function rayPlan(x, y, side) {
    const ops = [];
    if (side === 'sol') {
      ops.push(rect(x, y, 6, 22, { fill: INK, stroke: INK, sw: 1 }), rect(x - 10, y + 9, 10, 4, { fill: INK }));
      ops.push(rect(x + 6, y + 3, 4, 16, { fill: WHITE, stroke: INK, sw: 1 }));
    } else {
      ops.push(rect(x + 4, y, 6, 22, { fill: INK, stroke: INK, sw: 1 }), rect(x + 10, y + 9, 10, 4, { fill: INK }));
      ops.push(rect(x, y + 3, 4, 16, { fill: WHITE, stroke: INK, sw: 1 }));
    }
    return ops;
  }

  // Kapı grubu (üstten): kabin kapısı + kat kapısı, orta açılır iki kanat; eşik ve kasa
  function kapiPlan(cx, kabinOn) {
    const ops = [];
    const half = 44;
    // kabin kapısı (kabinin ön yüzünde)
    ops.push(rect(cx - half, kabinOn - 4, half - 1, 5, { fill: INK }), rect(cx + 1, kabinOn - 4, half - 1, 5, { fill: INK }));
    // eşik
    ops.push(rect(cx - half - 6, kabinOn + 2, half * 2 + 12, 7, { fill: WHITE, stroke: INK, sw: 1.2 }));
    // kat kapısı kanatları ve kasa
    ops.push(rect(cx - half, kabinOn + 14, half - 1, 4, { fill: '#6A6F8E' }), rect(cx + 1, kabinOn + 14, half - 1, 4, { fill: '#6A6F8E' }));
    ops.push(rect(cx - half - 8, kabinOn + 11, 8, 12, { fill: '#D9DCE8', stroke: INK, sw: 1.2 }), rect(cx + half, kabinOn + 11, 8, 12, { fill: '#D9DCE8', stroke: INK, sw: 1.2 }));
    return ops;
  }

  // Kuyu planı (üstten görünüş). Kapı tarafında duvar çizilmez; yalnız kat girişi çizgisi vardır.
  function planOps(v) {
    const ops = [];
    // beton duvarlar: üst, sol, sağ
    ops.push(...wall(100, 90, 360, 16), ...wall(100, 106, 16, 268), ...wall(444, 106, 16, 268));
    // eksen çizgileri
    ops.push(line(280, 78, 280, 404, { stroke: GOLD, sw: 0.9, dash: dashDot }));
    ops.push(line(122, 258, 438, 258, { stroke: GOLD, sw: 0.9, dash: dashDot }));
    // kabin
    ops.push(...frame(190, 190, 180, 150, { cross: true }));
    ops.push(text(280, 236, 'KABİN', { size: 9, weight: 700, anchor: 'middle', font: 'm' }));
    if (Number.isFinite(v.K_ham) && Number.isFinite(v.L_ham) && v.K_ham > 0 && v.L_ham > 0) {
      const alan = ((v.K_ham * v.L_ham) / 10000).toFixed(2).replace('.', ',');
      ops.push(text(280, 250, `A = ${alan} m² (hesaplanan)`, { size: 7.2, fill: GREY, anchor: 'middle' }));
    }
    // kabin rayları (T profil + pabuç) ve ray bağlantı çizgileri
    ops.push(...rayPlan(176, 238, 'sol'), ...rayPlan(374, 238, 'sag'));
    ops.push(line(116, 245, 166, 245, { stroke: GREY, sw: 0.8, dash: [3, 2] }), line(404, 245, 444, 245, { stroke: GREY, sw: 0.8, dash: [3, 2] }));
    // kapı grubu ve kat girişi çizgisi
    ops.push(...kapiPlan(280, 340));
    ops.push(line(104, 374, 456, 374, { stroke: GREY, sw: 1, dash: [6, 3] }));
    ops.push(text(452, 388, 'kat girişi', { size: 7.6, fill: GREY, anchor: 'end' }));
    if (!v.hidrolik) {
      // karşı ağırlık ve rayları
      ops.push(...frame(214, 118, 132, 28));
      ops.push(text(280, 136, 'KARŞI AĞIRLIK', { size: 7.6, weight: 700, anchor: 'middle', font: 'm' }));
      ops.push(...rayPlan(190, 125, 'sol'), ...rayPlan(350, 125, 'sag'));
      ops.push(line(116, 133, 180, 133, { stroke: GREY, sw: 0.8, dash: [3, 2] }), line(370, 133, 444, 133, { stroke: GREY, sw: 0.8, dash: [3, 2] }));
      ops.push(text(280, 166, `O ${v.O || '–'} × P ${v.P || '–'} cm`, { size: 7.8, weight: 700, fill: v.O || v.P ? NAVY : GREY, anchor: 'middle' }));
    } else {
      // hidrolik: yan piston ve silindir
      ops.push(circle(146, 258, 13, { fill: WHITE, stroke: INK, sw: 2 }), circle(146, 258, 5.5, { fill: LIGHT, stroke: INK, sw: 1 }));
      ops.push(line(159, 258, 190, 258, { stroke: INK, sw: 2 }));
      ops.push(text(146, 284, 'piston', { size: 7.4, fill: GREY, anchor: 'middle' }));
    }
    // ölçüler: üst zincir (N, M, I), sol (L, J), sağ (R, Q), alt (K)
    if (!v.hidrolik) ops.push(...dimH(v, 'N', 200, 360, 66, 125, 125));
    ops.push(...dimH(v, 'M', 181, 389, 46, 238, 238));
    ops.push(...dimH(v, 'I', 116, 444, 26, 106, 106));
    ops.push(...dimV(v, 'L', 190, 340, 84, 190, 190));
    ops.push(...dimV(v, 'J', 106, 374, 58, 116, 116));
    if (!v.hidrolik) ops.push(...dimV(v, 'R', 136, 249, 424, 360, 384, { short: true }));
    ops.push(...dimV(v, 'Q', 249, 340, 424, 384, 316, { short: true }));
    ops.push(...dimH(v, 'K', 190, 370, 422, 342, 342));
    if (v.S || v.T) ops.push(...tag(280, 402, `KAPI (NET): ${v.S || '–'} × ${v.T || '–'} cm`, { size: 8.2, weight: 700, anchor: 'middle', fill: NAVY }));
    return ops;
  }

  // Küçük harfli ölçü oku (tampon kaidesi / gövdesi / stroku)
  function miniDim(letter, has, x, y1, y2, side) {
    const col = has ? PINK : GREY;
    const lx = side === 'sol' ? x - 9 : x + 9;
    return [
      line(x, y1, x, y2, { stroke: col, sw: 1.1 }), tick(x, y1, col), tick(x, y2, col),
      circle(lx, (y1 + y2) / 2, 5.4, { fill: col }),
      text(lx, (y1 + y2) / 2 + 2.8, letter, { size: 7.2, weight: 700, fill: WHITE, anchor: 'middle', font: 'm' }),
    ];
  }

  // Tamponun solunda kaide ve gövde okları, sağında strok oku
  function bufferDims(v, cx, t, kaideL, bodyL, strokL) {
    const ops = [];
    const tabanUst = t.kaideUst;
    ops.push(...miniDim(kaideL, !!v[kaideL], cx - 19, tabanUst, tabanUst + 12, 'sol'));
    ops.push(...miniDim(bodyL, !!v[bodyL], cx - 19, t.ust, tabanUst, 'sol'));
    ops.push(...miniDim(strokL, !!v[strokL], cx + 17, t.ust, t.ust + t.strokPx, 'sag'));
    return ops;
  }

  // Tampon bilgi kutusu: tür ve kaide / gövde / strok değerleri
  function bufferNote(v, cx, y, ad, tip, kaideL, bodyL, strokL) {
    const val = l => (v[l] ? `${v[l]}` : '–');
    return [
      text(cx, y, `${ad}${tip ? ` · ${tip}` : ' · tip seçilmedi'}`, { size: 7.4, weight: 700, fill: INK, anchor: 'middle' }),
      text(cx, y + 11, `kaide ${kaideL} ${val(kaideL)} · tampon ${bodyL} ${val(bodyL)} · strok ${strokL} ${val(strokL)} cm`, { size: 7, fill: v[kaideL] || v[bodyL] || v[strokL] ? NAVY : GREY, anchor: 'middle' }),
    ];
  }

  // Araba/karşı ağırlık pabucu ve ray (yandan görünüş)
  function raySection(x, y1, y2) { return line(x, y1, x, y2, { stroke: HATCH, sw: 1.4 }); }
  function pabuc(x, y, w = 5, h = 12) { return rect(x, y, w, h, { fill: WHITE, stroke: INK, sw: 1.2 }); }

  // Kuyu kesiti (yan görünüş). Soldaki duvarda kat kapısı boşlukları vardır.
  function kesitOps(v) {
    const ops = [];
    ops.push(rect(176, 76, 200, 410, { fill: '#F4F5FA' }));
    // tavan döşemesi, çukur döşemesi, sağ duvar ve kat kapısı boşluklu sol duvar
    ops.push(...wall(160, 60, 232, 16), ...wall(160, 486, 232, 16), ...wall(376, 76, 16, 410));
    ops.push(...wall(160, 76, 16, 44), ...wall(160, 170, 16, 160), ...wall(160, 420, 16, 66));
    // kat kapıları (son kat ve ilk kat): kasa + kapı kanadı
    [[120, 170], [330, 420]].forEach(([top, bottom]) => {
      ops.push(rect(158, top, 20, 3, { fill: INK }), rect(160, top + 4, 4, bottom - top - 4, { fill: '#6A6F8E' }));
    });
    // kat döşemeleri ve kat seviyeleri
    ops.push(...wall(88, 170, 72, 10), ...wall(88, 420, 72, 10));
    ops.push(line(176, 170, 376, 170, { stroke: GREY, sw: 0.9, dash: [5, 3] }), line(176, 420, 376, 420, { stroke: GREY, sw: 0.9, dash: [5, 3] }));
    ops.push(text(84, 164, 'son kat', { size: 8, fill: GREY, anchor: 'end' }), text(84, 414, 'ilk kat', { size: 8, fill: GREY, anchor: 'end' }));
    // raylar
    [200, 322, 338, 368].forEach(x => ops.push(raySection(x, 76, 486)));
    // kabin (kapı sol yüzde) ve pabuçlar
    ops.push(...frame(206, 306, 110, 114, { cross: true }));
    ops.push(text(266, 366, 'KABİN', { size: 9, weight: 700, anchor: 'middle', font: 'm' }));
    ops.push(rect(206, 332, 5, 88, { fill: INK }));
    [[200, 310], [200, 396], [316, 310], [316, 396]].forEach(([x, y]) => ops.push(pabuc(x - 1, y, 6, 12)));
    // karşı ağırlık (hidrolikte yok: piston)
    if (!v.hidrolik) {
      ops.push(...frame(342, 226, 22, 124));
      ops.push(text(353, 290, 'KARŞI AĞIRLIK', { size: 7.4, weight: 700, anchor: 'middle', font: 'm', rot: -90 }));
      [[336, 232], [336, 334], [364, 232], [364, 334]].forEach(([x, y]) => ops.push(pabuc(x, y, 4, 12)));
    } else {
      ops.push(rect(344, 190, 14, 230, { fill: WHITE, stroke: INK, sw: 1.8 }), line(351, 190, 351, 420, { stroke: LIGHT, sw: 1 }));
      ops.push(text(351, 182, 'piston', { size: 7.4, fill: GREY, anchor: 'middle' }));
    }
    // tamponlar: kaide + tampon gövdesi + strok; harfli küçük ölçü okları, değerler altta bilgi kutusunda
    const kabinT = tampon(262, 486, v.kabinTampon);
    const kaT = tampon(353, 486, v.kaTampon);
    ops.push(...kabinT.ops);
    ops.push(...bufferDims(v, 262, kabinT, 'U', 'V', 'G'));
    ops.push(...bufferNote(v, 262, 516, 'kabin tamponu', v.kabinTampon, 'U', 'V', 'G'));
    if (!v.hidrolik) {
      ops.push(...kaT.ops);
      ops.push(...bufferDims(v, 353, kaT, 'W', 'X', 'H'));
      ops.push(...bufferNote(v, 353, 540, 'KA tamponu', v.kaTampon, 'W', 'X', 'H'));
    }
    ops.push(text(276, 70, 'kuyu tavanı', { size: 7.6, fill: INK, anchor: 'middle' }));
    // ölçüler
    ops.push(...dimV(v, 'B', 76, 170, 132, 160, 160));
    ops.push(...dimV(v, 'C', 170, 420, 132, 160, 160));
    ops.push(...dimV(v, 'D', 420, 486, 132, 160, 160));
    ops.push(...dimV(v, 'A', 60, 502, 100, 88, 160));
    ops.push(...dimV(v, 'E', 306, 420, 330, 316, 316, { short: true }));
    if (!v.hidrolik) ops.push(...dimV(v, 'F', 226, 350, 412, 364, 392, { short: true }));
    if (v.S || v.T) ops.push(...tag(226, 376, `KAPI ${v.S || '–'} × ${v.T || '–'} cm`, { size: 7.8, weight: 700, fill: NAVY, rot: -90 }));
    return ops;
  }

  // ---- SVG ----------------------------------------------------------------
  const FONT = { m: 'Montserrat,Arial,sans-serif', i: 'Inter,Arial,sans-serif' };

  function opToSvg(o) {
    if (o.t === 'rect') {
      return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}"${o.rx ? ` rx="${o.rx}"` : ''} fill="${o.fill || 'none'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash.join(' ')}"` : ''}/>`;
    }
    if (o.t === 'line') {
      return `<line x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke="${o.stroke}" stroke-width="${o.sw}"${o.dash ? ` stroke-dasharray="${o.dash.join(' ')}"` : ''}/>`;
    }
    if (o.t === 'circle') return `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="${o.fill || 'none'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw}"` : ''}/>`;
    if (o.t === 'text') {
      const rot = o.rot ? ` transform="rotate(${o.rot} ${o.x} ${o.y})"` : '';
      return `<text x="${o.x}" y="${o.y}" text-anchor="${o.anchor}" font-size="${o.size}" font-weight="${o.weight}" fill="${o.fill}" font-family="${FONT[o.font]}"${rot}>${esc(o.s)}</text>`;
    }
    return '';
  }

  function toSvg(ops, box, label) {
    return `<svg viewBox="${box.x0} ${box.y0} ${box.x1 - box.x0} ${box.y1 - box.y0}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}" style="width:100%;height:auto">${ops.map(opToSvg).join('')}</svg>`;
  }

  // Çizimin görünür alanı (PDF ve SVG için kırpma kutusu)
  const KESIT_KUTU = Object.freeze({ x0: 60, y0: 40, x1: 440, y1: 560 });
  const PLAN_KUTU = Object.freeze({ x0: 30, y0: 10, x1: 478, y1: 436 });

  function kesit(v) { return toSvg(kesitOps(v), KESIT_KUTU, 'Kuyu kesiti'); }
  function plan(v) { return toSvg(planOps(v), PLAN_KUTU, 'Kuyu planı'); }

  function legend(v) {
    const rows = OLCULER.filter(([letter]) => !(v.hidrolik && ['F', 'H', 'N', 'O', 'P', 'R', 'W', 'X'].includes(letter))).map(([letter, , name]) =>
      `<div class="lg"><i>${letter}</i><span>${esc(name)}</span><b>${v[letter] ? `${esc(v[letter])} cm` : '–'}</b></div>`).join('');
    return `<div class="legend">${rows}</div>`;
  }

  const CSS = `
.sema{margin:0 0 5mm}
.sema .pair{display:grid;grid-template-columns:1fr;gap:8px}
.sema figure{margin:0;border:1px solid #E3E5EE;border-radius:8px;padding:6px 8px;background:#fff;break-inside:avoid-page}
.sema figcaption{font:700 9px 'Montserrat',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6E7186;margin-bottom:2px}
.sema svg{max-height:150mm}
.sema .legend{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;margin-top:6px;font-size:9px;break-inside:avoid-page}
.sema .lg{display:grid;grid-template-columns:16px 1fr auto;gap:6px;align-items:center;padding:2px 0;border-bottom:1px solid #E3E5EE}
.sema .lg i{display:inline-grid;place-items:center;width:13px;height:13px;border-radius:50%;background:#EA0048;color:#fff;font:700 7.5px 'Montserrat',Arial,sans-serif;font-style:normal}
.sema .lg b{font-weight:700;color:#20235B}
.sema .note{margin:4px 0 0;font-size:8.5px;color:#6E7186}
@media (max-width:620px){.sema .legend{grid-template-columns:1fr}}`;

  // values: { alan_anahtarı: { field_value } }. Hiç ölçü yoksa boş döner. index: bölüm numarası.
  function build(values, index) {
    const v = valuesOf(values);
    if (!OLCULER.some(([letter]) => v[letter])) return '';
    return `<section class="sema"><h2><span class="no">${esc(index || '')}</span>Kuyu şemaları<em>şematik · ölçekli değil</em></h2>
<div class="pair"><figure><figcaption>Kuyu planı</figcaption>${plan(v)}</figure><figure><figcaption>Kuyu kesiti</figcaption>${kesit(v)}</figure></div>
${legend(v)}<p class="note">Şemalar yalnız girilen ölçülerin yerini göstermek içindir; ölçekli değildir ve uygunluk değerlendirmesi içermez. Tampon çizimleri seçilen tampon tipine göre gösterilir; kaideler şematiktir ve ölçüye dahil değildir. Kabin alanı kabin iç genişliği ve derinliğinden hesaplanır.</p></section>`;
  }

  root.AVES_FR65_SEMA = Object.freeze({
    build, valuesOf, kesitOps, planOps, kesit, plan, legend, CSS, OLCULER,
    kutular: Object.freeze({ kesit: KESIT_KUTU, plan: PLAN_KUTU }),
  });
})(globalThis);
