import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const libraryPath = path.join(rootDir, 'data', 'madde_kutuphanesi.json');
const rows = JSON.parse(await fs.readFile(libraryPath, 'utf8'));

if (!Array.isArray(rows) || rows.length !== 1018) {
  throw new Error(`Beklenen R15C kütüphanesi bulunamadı. Satır sayısı: ${rows?.length}`);
}

const byId = new Map(rows.map(row => [row.madde_id, row]));
const requireRow = (id) => {
  const row = byId.get(id);
  if (!row) throw new Error(`Zorunlu hedef bulunamadı: ${id}`);
  return row;
};

const changed = [];
const setValue = (id, field, value, expected) => {
  const row = requireRow(id);
  if (expected !== undefined && row[field] !== expected) {
    throw new Error(`${id}.${field} beklenen değerde değil. Beklenen=${expected} Mevcut=${row[field]}`);
  }
  if (row[field] !== value) {
    changed.push({ id, field, before: row[field], after: value });
    row[field] = value;
  }
};

// ÜB.FR.38 R.04 tablo 11 kaynak bölüm başlıklarıyla doğrulanan başlık düzeltmeleri.
setValue('MAD-0561', 'kontrol_basligi', 'Testler', 'KASNAK KANALLARI KONTROLÜ');
for (let number = 562; number <= 613; number += 1) {
  if (number === 611) continue; // Bu kayıt özgül ve doğru başlığını korur.
  const id = `MAD-${String(number).padStart(4, '0')}`;
  setValue(id, 'kontrol_basligi', 'Hidrolik Kontrol ve Testleri', 'KASNAK KANALLARI KONTROLÜ');
}

// FR.39 kaynak bölümüne göre MR olarak doğrulanan dört kayıt.
for (const id of ['MAD-0460', 'MAD-0467', 'MAD-0486', 'MAD-0492']) {
  setValue(id, 'md_kosulu', 'MR', 'MRL');
}

// MAD-0814 ile aynı başlık/metin/kaynak bağlamındaki gerçek mükerrer.
const original = requireRow('MAD-0814');
const duplicate = requireRow('MAD-0824');
for (const field of ['kontrol_basligi', 'denetci_yonlendirmesi', 'resmi_madde_metni', 'standart_grubu']) {
  if ((original[field] || null) !== (duplicate[field] || null)) {
    throw new Error(`MAD-0814 / MAD-0824 doğrulaması başarısız: ${field} farklı`);
  }
}
setValue('MAD-0824', 'aktif', false, true);

if (changed.length !== 57) {
  throw new Error(`Beklenen 57 alan değişikliği yerine ${changed.length} değişiklik oluştu.`);
}

await fs.writeFile(libraryPath, JSON.stringify(rows), 'utf8');
console.log(JSON.stringify({ changed_count: changed.length, changed }, null, 2));
