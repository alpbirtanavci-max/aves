// Doldurulmuş ÜB.FR.65 Word dosyasından boş şablon üretir (firma verileri, işaretler ve imza satırı temizlenir).
// Kaynak dosyaya dokunulmaz. Kullanım:
//   node tools/fr65_sablon_uret.mjs "<doldurulmus-FR65.docx>"
// Çıktı: form-templates/UB_FR_65.docx ve app/form-assets/UB_FR_65.docx
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kaynak = process.argv[2];
if (!kaynak || !fs.existsSync(kaynak)) {
  console.error('Kullanım: node tools/fr65_sablon_uret.mjs "<doldurulmus-FR65.docx>"');
  process.exit(1);
}

const ctx = {};
Object.assign(ctx, { ArrayBuffer, Uint8Array, Uint16Array, Uint32Array, Buffer }); // aynı gerçek (realm) tipleri: JSZip instanceof kontrolü
ctx.self = ctx; ctx.window = ctx; ctx.Promise = Promise; ctx.setTimeout = setTimeout; ctx.clearTimeout = clearTimeout;
vm.runInNewContext(fs.readFileSync(path.join(root, 'app/vendor/jszip.min.js'), 'utf8'), ctx, { filename: 'jszip.min.js' });
vm.runInNewContext(fs.readFileSync(path.join(root, 'app/fr65-docx.js'), 'utf8'), ctx, { filename: 'fr65-docx.js' });

const veri = fs.readFileSync(kaynak);
const zip = await ctx.JSZip.loadAsync(veri.buffer.slice(veri.byteOffset, veri.byteOffset + veri.byteLength));
const xml = await zip.file('word/document.xml').async('string');
zip.file('word/document.xml', ctx.AVES_FR65_DOCX.sablonTemizle(xml));
const bytes = Buffer.from(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
for (const hedef of ['form-templates/UB_FR_65.docx', 'app/form-assets/UB_FR_65.docx']) {
  fs.writeFileSync(path.join(root, hedef), bytes);
  console.log('yazıldı:', hedef, bytes.length, 'bayt');
}
