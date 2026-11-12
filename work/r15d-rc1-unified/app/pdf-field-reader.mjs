import * as pdfjsLib from './vendor/pdfjs/pdf.min.mjs';

// Safari/iOS (<=18.x) ReadableStream'i `for await` ile gezemez; PDF.js getTextContent() buna dayanir.
if (typeof ReadableStream !== 'undefined' && !ReadableStream.prototype[Symbol.asyncIterator]) {
  ReadableStream.prototype[Symbol.asyncIterator] = async function* readableStreamYinele() {
    const okuyucu = this.getReader();
    try {
      for (;;) {
        const { done, value } = await okuyucu.read();
        if (done) return;
        yield value;
      }
    } finally { okuyucu.releaseLock(); }
  };
}

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

const PDF_BASE = new URL('./vendor/pdfjs/', import.meta.url);
const MAX_PAGES = 250;
const fold = value => String(value || '')
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i')
  .replace(/\s+/g, ' ')
  .trim();

const EQUIPMENT = [
  { key: 'makine_motor', label: 'Makine / motor', pattern: /\b(makin[ae]|motor|machine|traction machine)\b/ },
  { key: 'kapi_kilidi', label: 'Kapı kilitleri', pattern: /\b(kat kapisi.{0,18}kilit|kapi kilidi|kilitler|door lock)\b/ },
  { key: 'guvenlik_tertibati', label: 'Güvenlik tertibatı / paraşüt fren', pattern: /\b(parasut\w*|guvenlik tertibati\w*|safety gear|safety device)\b/ },
  { key: 'tampon', label: 'Kabin / karşı ağırlık tamponu', pattern: /\b(tampon\w*|buffer)\b/ },
  { key: 'hiz_regulatoru', label: 'Hız regülatörü', pattern: /\b(hiz regulator\w*|regulator\w*|overspeed governor|governor)\b/ },
  { key: 'fren', label: 'Fren', pattern: /\b(fren\w*|brake)\b/ },
  { key: 'ana_kart', label: 'Ana kart / kontrol kartı', pattern: /\b(ana kart\w*|ana kontrol kart\w*|k\. ?panosu|kontrol panosu|main board|control board)\b/ },
  { key: 'ucm', label: 'UCM tertibatı', pattern: /\bucm\b|istemsiz kabin hareketi|unintended car movement/ },
  { key: 'gsm_modulu', label: 'GSM modülü', pattern: /\b(gsm modulu|gsm module|alarm modulu|alarm module)\b/ },
];

function pageLines(items, page) {
  const bands = new Map();
  for (const item of items) {
    if (!item || typeof item.str !== 'string' || !item.str.trim()) continue;
    const y = Number(item.transform?.[5]);
    const x = Number(item.transform?.[4]);
    const band = Number.isFinite(y) ? Math.round(y / 2) : 0;
    if (!bands.has(band)) bands.set(band, { y, parts: [] });
    bands.get(band).parts.push({ x: Number.isFinite(x) ? x : 0, text: item.str.trim() });
  }
  return [...bands.values()]
    .sort((a, b) => (b.y || 0) - (a.y || 0))
    .map(row => ({
      page,
      text: row.parts.sort((a, b) => a.x - b.x).map(part => part.text).join(' ').replace(/\s+/g, ' ').trim(),
    }))
    .filter(row => row.text);
}

// "Güvenlik Aksamı Kayıt Formu" gibi sütunlu tablolar: satırlara bölünmüş hücreleri (adres gibi çok satırlı)
// sıra numarasına göre bir araya getirir; marka/model/üretici ayrı alan olarak okunur.
const TABLE_ROLES = [
  ['maker', /\buretici\b|\bithalatci\b/],
  ['brand', /\bmarka/],
  ['model', /\bmodel\b/],
  ['component', /\bguvenlik aksami\b|\bkomponent\b|\bbilesen\b|\baksam adi\b/],
];

function tableRows(items, page) {
  const cells = [];
  for (const item of items) {
    if (!item || typeof item.str !== 'string' || !item.str.trim()) continue;
    const x = Number(item.transform?.[4]);
    const y = Number(item.transform?.[5]);
    if (Number.isFinite(x) && Number.isFinite(y)) cells.push({ x, y, text: item.str.trim() });
  }
  const headerHit = cells.filter(cell => {
    const text = fold(cell.text);
    return /\bguvenlik aksami\b|\bkomponent\b|\bbilesen\b/.test(text) && !/\b(form|formu|kayit|liste|listesi)\b/.test(text);
  });
  if (!headerHit.length) return [];
  const headerTop = Math.max(...headerHit.map(cell => cell.y));
  // Başlık bölgesi: bileşen başlığının hemen çevresi (üst/alt 30 birim).
  const header = cells.filter(cell => cell.y <= headerTop + 12 && cell.y >= headerTop - 30);
  const columns = [];
  for (const cell of header.sort((a, b) => a.x - b.x)) {
    const last = columns[columns.length - 1];
    if (last && Math.abs(cell.x - last.x) <= 6) last.texts.push(cell.text);
    else columns.push({ x: cell.x, texts: [cell.text] });
  }
  for (const column of columns) {
    const folded = fold(column.texts.join(' '));
    column.role = (TABLE_ROLES.find(([, pattern]) => pattern.test(folded)) || [null])[0];
  }
  const component = columns.find(column => column.role === 'component');
  if (!component) return [];
  const body = cells.filter(cell => cell.y < headerTop - 30);
  const first = columns[0];
  const anchors = body.filter(cell => /^\d{1,3}$/.test(cell.text) && cell.x < (columns[1] ? columns[1].x - 4 : first.x + 40))
    .sort((a, b) => b.y - a.y);
  if (!anchors.length) return [];
  const rows = anchors.map(anchor => ({ no: anchor.text, y: anchor.y, cells: [] }));
  for (const cell of body) {
    let best = rows[0];
    for (const row of rows) if (Math.abs(row.y - cell.y) < Math.abs(best.y - cell.y)) best = row;
    let column = columns[0];
    for (const candidateColumn of columns) if (candidateColumn.x <= cell.x + 4) column = candidateColumn;
    best.cells.push({ ...cell, role: column.role, columnX: column.x });
  }
  const join = (row, role) => row.cells.filter(cell => cell.role === role)
    .sort((a, b) => b.y - a.y || a.x - b.x).map(cell => cell.text).join(' ').replace(/\s+/g, ' ').trim();
  return rows.map(row => {
    const all = row.cells.sort((a, b) => a.columnX - b.columnX || b.y - a.y).map(cell => cell.text).join(' · ');
    return {
      page,
      no: row.no,
      name: join(row, 'component'),
      brand: join(row, 'brand'),
      model: join(row, 'model'),
      maker: join(row, 'maker'),
      evidence: `${row.no} · ${all.replace(/^\d+ · /, '')}`,
    };
  }).filter(row => row.name);
}

// "Güvenlik Ekipmanları Listesi" düzeni: sıra numarası yok; başlık "KULLANILAN EKİPMAN / MARKASI / TİPİ / SERİ NO /
// SERTİFİKA NO / ONAYLANMIŞ KURULUŞ". Ekipman adı soldaki sütunda dikey ortalanmış (çok satırlı), diğer hücreler
// satır grupları halinde: ad kümeleri ile veri kümeleri sırayla eşleştirilir; hücreler başlık merkezine göre sütunlanır.
const gruplaY = (hucreler, aralik) => {
  const sirali = [...hucreler].sort((a, b) => b.y - a.y);
  const kumeler = [];
  for (const hucre of sirali) {
    const son = kumeler[kumeler.length - 1];
    if (son && son.altY - hucre.y <= aralik) { son.hucreler.push(hucre); son.altY = hucre.y; }
    else kumeler.push({ ustY: hucre.y, altY: hucre.y, hucreler: [hucre] });
  }
  return kumeler.map(kume => ({ ...kume, merkez: (kume.ustY + kume.altY) / 2 }));
};

function listRows(items, page) {
  const cells = [];
  for (const item of items) {
    if (!item || typeof item.str !== 'string' || !item.str.trim()) continue;
    const x = Number(item.transform?.[4]);
    const y = Number(item.transform?.[5]);
    const width = Number(item.width) || 0;
    if (Number.isFinite(x) && Number.isFinite(y)) cells.push({ x, y, cx: x + width / 2, text: item.str.trim() });
  }
  const find = pattern => cells.find(cell => pattern.test(fold(cell.text)));
  const head = {
    label: find(/^kullanilan$/), equipment: find(/^ekipman$/), brand: find(/^markasi$/), type: find(/^tipi$/),
    serial: find(/^seri no$/), cert: find(/^sertifika no$/), body: find(/^onaylanmis$/),
  };
  if (!head.label || !head.equipment || !head.brand || !head.type) return [];
  const columns = ['brand', 'type', 'serial', 'cert', 'body'].filter(role => head[role]).map(role => ({ role, cx: head[role].cx }));
  const labelLimit = (head.label.cx + head.brand.cx) / 2;
  const baslikMetni = /^(kullanilan|ekipman|markasi|tipi|seri no|sertifika no|onaylanmis|kurulus|veren)$/;
  const body = cells.filter(cell => cell.y < head.equipment.y - 2 && !baslikMetni.test(fold(cell.text)));
  const isSubLabel = text => /^(z|\d+)\.? ?kat$/.test(fold(text)) || /^[-–—]$/.test(text);
  const labelCells = body.filter(cell => cell.cx < labelLimit && !isSubLabel(cell.text));
  const dataCells = body.filter(cell => cell.cx >= labelLimit);
  if (!labelCells.length || !dataCells.length) return [];
  const labels = gruplaY(labelCells, 14.5);
  const datas = gruplaY(dataCells, 20);
  const pairs = [];
  if (labels.length === datas.length) labels.forEach((label, i) => pairs.push([label, datas[i]]));
  else {
    const used = new Set();
    for (const label of labels) {
      let best = -1;
      datas.forEach((data, i) => { if (!used.has(i) && (best < 0 || Math.abs(data.merkez - label.merkez) < Math.abs(datas[best].merkez - label.merkez))) best = i; });
      if (best >= 0 && Math.abs(datas[best].merkez - label.merkez) <= 40) { used.add(best); pairs.push([label, datas[best]]); }
    }
  }
  const metin = (hucreler, role) => hucreler
    .filter(cell => cell.role === role && !/^[-–—]$/.test(cell.text))
    .sort((a, b) => b.y - a.y || a.x - b.x).map(cell => cell.text).join(' ').replace(/\s+/g, ' ').trim();
  return pairs.map(([label, data], index) => {
    const hucreler = data.hucreler.map(cell => {
      let best = columns[0];
      for (const column of columns) if (Math.abs(column.cx - cell.cx) < Math.abs(best.cx - cell.cx)) best = column;
      return { ...cell, role: best.role };
    });
    const name = label.hucreler.sort((a, b) => b.y - a.y || a.x - b.x).map(cell => cell.text).join(' ').replace(/\s+/g, ' ').trim();
    const brand = metin(hucreler, 'brand');
    const model = metin(hucreler, 'type');
    const serial = metin(hucreler, 'serial');
    const cert = metin(hucreler, 'cert');
    const maker = metin(hucreler, 'body');
    return {
      page,
      no: String(index + 1),
      name,
      brand,
      model,
      maker,
      evidence: [name, brand, model, serial && `Seri ${serial}`, cert && `Sertifika ${cert}`, maker && `Kuruluş ${maker}`].filter(Boolean).join(' · '),
    };
  }).filter(row => row.name && (row.brand || row.model));
}

function tableCandidates(rows) {
  return rows.map(row => {
    const known = EQUIPMENT.find(component => component.pattern.test(fold(row.name)));
    const value = [row.brand, row.model].filter(Boolean).join(' ') || row.maker || '';
    return {
      key: known ? known.key : 'komponent',
      label: row.name.slice(0, 60),
      value: value.slice(0, 100),
      page: row.page,
      evidence: row.evidence.slice(0, 240),
    };
  }).filter(item => item.value);
}

function candidate(key, label, value, line) {
  return {
    key,
    label,
    value: String(value || '').trim().slice(0, 100),
    page: line.page,
    evidence: line.text.slice(0, 240),
  };
}

function extractCandidates(lines, tablePages = new Set()) {
  const values = [];
  const equipment = [];
  const seenValues = new Set();
  const seenEquipment = new Set();

  const addValue = (key, label, value, line) => {
    const clean = String(value || '').trim().replace(/[;,|]+$/, '');
    const signature = `${key}|${line.page}|${fold(clean)}`;
    if (!clean || seenValues.has(signature)) return;
    seenValues.add(signature);
    values.push(candidate(key, label, clean, line));
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const text = fold(line.text);
    let match;

    if (/\b(yuk|load|kapasite|capacity)\b/.test(text) && (match = text.match(/(\d{1,7}(?:[.,]\d{1,3})?)\s*(kg|kgs|kilogram)\b/))) {
      addValue('anma_yuku_kg', 'Yük / kapasite (kg)', `${match[1]} kg`, line);
    }

    if (/\b(kapasite|kisi|people|passenger)\b/.test(text) &&
        (match = text.match(/(\d{1,3})\s*(kisi(?:lik)?|persons?|passengers?)\b/))) {
      addValue('kapasite_kisi', 'Kişi kapasitesi', `${match[1]} kişi`, line);
    }

    if (/\b(anma hiz|beyan(?: edilen)? hiz|hiz|speed)\b/.test(text) &&
        (match = text.match(/\b(?:anma hiz|beyan(?: edilen)? hiz|hiz|speed)\b\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)(?:\s*(m\/sn|m\/s|m\/sec|m\/saniye|m\/dk))?/))) {
      addValue('hiz', 'Hız', `${match[1]}${match[2] ? ` ${match[2]}` : ''}`, line);
    }

    if (/\b(durak|kat|stops?)\b/.test(text)) {
      match = text.match(/\b(?:durak\s*(?:sayisi|adedi)|toplam\s+durak|kat\s+sayisi|number\s+of\s+stops?)\b\s*[:=\-]?\s*(\d{1,3})\b/)
        || text.match(/\b(\d{1,3})\s*(?:durak|stops?)\b/);
      if (match) addValue('durak_sayisi', 'Durak sayısı', match[1], line);
    }

    if (/(?:ana\s+tip|model(?:\s+(?:kodu|no|adi))?|tip(?:\s+(?:kodu|no|varyant))?|type(?:\s+(?:code|no))?)\s*[:=]\s*/.test(text)) {
      const originalMatch = line.text.match(/(?:ana\s+tip|model(?:\s+(?:kodu|no|adi|adı))?|tip(?:\s+(?:kodu|no|varyant))?|type(?:\s+(?:code|no))?)\s*[:=]\s*(.{2,100})/i);
      if (originalMatch) {
        const value = originalMatch[1].split(/\s{2,}|\s+(?:hız|yük|kapasite|durak|seri\s*no)\s*[:=]/i)[0].trim();
        addValue('model_tip', 'Model / tip', value, line);
      }
    }

    for (const component of EQUIPMENT) {
      if (tablePages.has(line.page) || !component.pattern.test(text)) continue;
      let evidenceLine = line;
      const hasIdentity = /\b(marka|imalatci|manufacturer|brand|seri\s*(?:no|numarasi)|serial(?:\s*(?:no|number))?|tip|model|type|imei)\b/.test(text) || /[:=]/.test(text);
      if (!hasIdentity) {
        const next = lines[index + 1];
        const nextText = fold(next?.text || '');
        if (next && next.page === line.page && /\b(marka|imalatci|manufacturer|brand|seri|serial|tip|model|type|imei|no\b)/.test(nextText)) {
          evidenceLine = { page: line.page, text: `${line.text} · ${next.text}` };
        } else continue;
      }
      const signature = `${component.key}|${evidenceLine.page}|${fold(evidenceLine.text)}`;
      if (seenEquipment.has(signature)) continue;
      seenEquipment.add(signature);
      equipment.push(candidate(component.key, component.label, evidenceLine.text, evidenceLine));
    }
  }

  return {
    values: values.slice(0, 40),
    equipment: equipment.slice(0, 40),
  };
}

// PDF.js sürümüne göre destroy() söz verebilir ya da düz değer döndürebilir; temizlik asla çıkarımı bozmaz.
async function kapat(nesne) {
  try { await nesne.destroy?.(); } catch { /* temizlik hatası yok sayılır */ }
}

export async function extractTechnicalPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    cMapUrl: new URL('./cmaps/', PDF_BASE).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('./standard_fonts/', PDF_BASE).href,
    useSystemFonts: true,
    useWasm: false,
    isEvalSupported: false,
    enableXfa: false,
  });
  let pdf;
  try {
    pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PAGES) throw new Error(`PDF ${MAX_PAGES} sayfadan uzun; dosyayı bölerek ekleyin.`);
    const lines = [];
    const tableItems = [];
    let textPageCount = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false });
      const result = pageLines(content.items, pageNumber);
      if (result.length) textPageCount++;
      lines.push(...result);
      tableItems.push(...tableCandidates([...tableRows(content.items, pageNumber), ...listRows(content.items, pageNumber)]));
      page.cleanup();
    }
    const extracted = extractCandidates(lines, new Set(tableItems.map(item => item.page)));
    extracted.equipment = [...tableItems, ...extracted.equipment].slice(0, 40);
    const status = textPageCount === 0 ? 'no_text_layer'
      : (extracted.values.length || extracted.equipment.length ? 'candidates_found' : 'no_matches');
    return {
      reader: 'pdfjs-local-rules-v3',
      status,
      parsed_at: new Date().toISOString(),
      page_count: pdf.numPages,
      text_page_count: textPageCount,
      ...extracted,
    };
  } catch (error) {
    await kapat(loadingTask);
    throw error;
  } finally {
    if (pdf) await kapat(pdf);
  }
}
