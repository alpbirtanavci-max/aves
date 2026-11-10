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
  { key: 'makine_motor', label: 'Makine / motor', pattern: /\b(makine|motor|machine|traction machine)\b/ },
  { key: 'kapi_kilidi', label: 'Kapı kilitleri', pattern: /\b(kat kapisi.{0,18}kilit|kapi kilidi|door lock)\b/ },
  { key: 'guvenlik_tertibati', label: 'Güvenlik tertibatı / paraşüt fren', pattern: /\b(parasut|guvenlik tertibati|safety gear|safety device)\b/ },
  { key: 'tampon', label: 'Kabin / karşı ağırlık tamponu', pattern: /\b(tampon|buffer)\b/ },
  { key: 'hiz_regulatoru', label: 'Hız regülatörü', pattern: /\b(hiz regulatoru|overspeed governor|governor)\b/ },
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

function candidate(key, label, value, line) {
  return {
    key,
    label,
    value: String(value || '').trim().slice(0, 100),
    page: line.page,
    evidence: line.text.slice(0, 240),
  };
}

function extractCandidates(lines) {
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
      if (!component.pattern.test(text)) continue;
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
    let textPageCount = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false });
      const result = pageLines(content.items, pageNumber);
      if (result.length) textPageCount++;
      lines.push(...result);
      page.cleanup();
    }
    const extracted = extractCandidates(lines);
    const status = textPageCount === 0 ? 'no_text_layer'
      : (extracted.values.length || extracted.equipment.length ? 'candidates_found' : 'no_matches');
    return {
      reader: 'pdfjs-local-rules-v1',
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
