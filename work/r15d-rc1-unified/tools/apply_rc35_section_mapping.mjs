import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = path.join(root, 'database', '41_r15d_rc35_81_71_81_73_fiziksel_bolum_esleme.sql');
const jsonPath = path.join(root, 'data', 'madde_kutuphanesi.json');
const csvPath = path.join(root, 'data', 'madde_kutuphanesi.csv');

const migration = fs.readFileSync(migrationPath, 'utf8');
const mapping = new Map();
for (const match of migration.matchAll(/\('(MAD-\d+)', '([^']+)'\)/g)) {
  if (mapping.has(match[1])) throw new Error(`Mükerrer eşleme: ${match[1]}`);
  mapping.set(match[1], match[2]);
}
if (mapping.size !== 70) throw new Error(`Migration içinde 70 yerine ${mapping.size} eşleme bulundu`);

const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let jsonUpdated = 0;
for (const item of items) {
  const target = mapping.get(item.madde_id);
  if (!target) continue;
  if (!item.aktif || !['81-71', '81-73'].includes(item.standart_grubu)) {
    throw new Error(`Beklenmeyen JSON maddesi: ${item.madde_id}`);
  }
  item.bolum = target;
  jsonUpdated += 1;
}
if (jsonUpdated !== 70) throw new Error(`JSON içinde 70 yerine ${jsonUpdated} madde güncellendi`);
fs.writeFileSync(jsonPath, JSON.stringify(items), 'utf8');

const csvOriginal = fs.readFileSync(csvPath, 'utf8');
// Mevcut Windows çalışma kopyasının satır sonlarını koru; böylece 1019 satırlık
// kaynakta yalnız gerçekten eşlenen 70 kayıt değişmiş görünür.
const newline = '\r\n';
let csvUpdated = 0;
const csvUpdatedText = csvOriginal.split(/\r?\n/).map(line => {
  const id = line.slice(0, line.indexOf(','));
  const target = mapping.get(id);
  if (!target) return line;
  const match = line.match(/^(MAD-\d+,\d+),([^,]*),(81-7[13]),/);
  if (!match) throw new Error(`CSV satırı beklenen yapıda değil: ${id}`);
  csvUpdated += 1;
  return line.replace(match[0], `${match[1]},${target},${match[3]},`);
}).join(newline);
if (csvUpdated !== 70) throw new Error(`CSV içinde 70 yerine ${csvUpdated} madde güncellendi`);
fs.writeFileSync(csvPath, csvUpdatedText, 'utf8');

console.log(`R15D-rc3.5 bölüm eşlemesi uygulandı: JSON ${jsonUpdated}, CSV ${csvUpdated}.`);
