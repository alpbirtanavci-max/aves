import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const libraryPath = path.join(rootDir, 'data', 'madde_kutuphanesi.json');
const rows = JSON.parse(await fs.readFile(libraryPath, 'utf8'));

if (!Array.isArray(rows) || rows.length !== 1019) {
  throw new Error(`Beklenen rc3.9.6 kütüphanesi bulunamadı. Satır sayısı: ${rows?.length}`);
}

const byId = new Map(rows.map(row => [row.madde_id, row]));
const requireRow = id => {
  const row = byId.get(id);
  if (!row) throw new Error(`Zorunlu hedef bulunamadı: ${id}`);
  return row;
};
const changed = [];
const set = (id, field, value) => {
  const row = requireRow(id);
  if (JSON.stringify(row[field]) === JSON.stringify(value)) return;
  row[field] = value;
  changed.push({ id, field });
};

// IMG_9871-9880: ana maddeyi tekrar eden veya kullanıcının gereksiz
// olduğunu doğruladığı saha rehberleri kaldırılır.
for (const id of [
  'MAD-0636', 'MAD-0640', 'MAD-0641', 'MAD-0645', 'MAD-0653',
  'MAD-0855', 'MAD-0856', 'MAD-0909', 'MAD-0910', 'MAD-0913',
]) set(id, 'denetci_yonlendirmesi', null);

// 81-71 kategori anlatımı tekrar eden rehber yerine ortak çizelgeden açılır.
for (const row of rows) {
  const categoryText = [row.kontrol_basligi, row.resmi_madde_metni, row.aranmaz_kosulu]
    .filter(Boolean).join(' ');
  if (row.standart_grubu === '81-71' && /Kategori\s+[12]/i.test(categoryText)) {
    if (row.gorsel_referansi !== 'G-8171-KATEGORI-TR.svg — Kategori 1 ve Kategori 2 açıklamaları') {
      row.gorsel_referansi = 'G-8171-KATEGORI-TR.svg — Kategori 1 ve Kategori 2 açıklamaları';
      changed.push({ id: row.madde_id, field: 'gorsel_referansi' });
    }
  }
}
set('MAD-0855', 'aranmaz_kosulu', 'Asansör Kategori 1 (kuyusu kısmi mahfazalı) ise bu madde uygulanmaz.');

// Kabin tipi bir kez seçilir; tip geçen her maddede ortak, okunabilir çizelge açılır.
for (const row of rows) {
  const typeText = [row.kontrol_basligi, row.resmi_madde_metni, row.denetci_yonlendirmesi]
    .filter(Boolean).join(' ');
  if (row.standart_grubu === '81-70' && /Tip\s+[1-5]/i.test(typeText)) {
    if (row.gorsel_referansi !== 'G-8170-KABIN-TIPLERI-TR.svg — Kabin tipi açıklamaları') {
      row.gorsel_referansi = 'G-8170-KABIN-TIPLERI-TR.svg — Kabin tipi açıklamaları';
      changed.push({ id: row.madde_id, field: 'gorsel_referansi' });
    }
  }
}
set('MAD-0923', 'denetci_yonlendirmesi', null);
set('MAD-0923', 'resmi_madde_metni',
  'Kabin tipini net kabin genişliği, net kabin derinliği, kapı yerleşimi ve kullanım amacına göre çizelgeden belirleyin. Beyan yükü tek başına kabin tipini belirlemez; 800 kg gibi ara beyan yüklerinde gerçek kabin ölçülerini esas alın.');
set('MAD-0923', 'gorsel_referansi', 'G-8170-KABIN-TIPLERI-TR.svg — Kabin tipi açıklamaları');

// Kabin kumanda panelinin bulunduğu taraf sayı değil, sahada seçilen yöndür.
const panelPositionDef = [{
  id: 'kumanda_paneli_bulundugu_taraf',
  etiket: 'Kumanda panelinin bulunduğu taraf',
  tur: 'secim',
  secenekler: ['Girişte sağ', 'Girişte sol', 'Arka duvar'],
  referans_metni: 'Kabine giriş yönüne göre seçilir.',
}];
for (const id of ['MAD-0961', 'MAD-0962', 'MAD-0964']) {
  set(id, 'olcu1_adi', null);
  set(id, 'olcu1_birimi', null);
  set(id, 'olcum_tanimlari', panelPositionDef);
}

// Sembol açıklamaları doğrudan ana maddeye taşınır.
set('MAD-0978', 'resmi_madde_metni',
  'Kabin içindeki kapı açma butonunda, kapının açılmasını gösteren ISO 7000-2864 sembolü (birbirinden ayrılan iki ok) bulunmalıdır.');
set('MAD-0978', 'denetci_yonlendirmesi', null);
set('MAD-0979', 'resmi_madde_metni',
  'Kabin içinde kapı kapama butonu bulunuyorsa, butonda ISO 7000-2863 sembolü (birbirine yaklaşan iki ok) bulunmalıdır.');
set('MAD-0979', 'denetci_yonlendirmesi', null);

// Makine dairesi / MRL ve pano maddeleri için kullanıcının son kararları.
set('MAD-0389', 'kontrol_basligi', 'Makine veya pano çalışma alanı aydınlatma anahtarı');
set('MAD-0389', 'resmi_madde_metni',
  'Makine dairesinin veya MRL asansörde kumanda panosu çalışma alanının aydınlatma anahtarı, yetkili kişilerin kolayca erişebileceği uygun bir konum ve yükseklikte bulunmalıdır.');
set('MAD-0389', 'denetci_yonlendirmesi', null);
set('MAD-0389', 'md_kosulu', null);

set('MAD-0390', 'kontrol_basligi', 'Makine veya pano çalışma alanının aydınlatılması');
set('MAD-0390', 'resmi_madde_metni',
  'Makine dairesinde veya MRL asansörde kumanda panosunun bulunduğu çalışma alanında, çalışma seviyesinde en az 200 lüks; erişim ve hareket alanlarında en az 50 lüks aydınlatma sağlanmalıdır.');
set('MAD-0390', 'denetci_yonlendirmesi', null);
set('MAD-0390', 'md_kosulu', null);

set('MAD-0394', 'resmi_madde_metni',
  'Asansördeki etiketler, bildirimler, işaretlemeler ve talimatlar kalıcı biçimde sabitlenmiş; silinmez, okunaklı, anlaşılır, görünür, dayanıklı ve Türkçe olmalıdır.');
set('MAD-0394', 'denetci_yonlendirmesi', null);
set('MAD-0394', 'md_kosulu', null);

set('MAD-0404', 'kontrol_basligi', 'Ana anahtarın (pako şalterin) erişimi ve montaj yüksekliği');
set('MAD-0404', 'resmi_madde_metni',
  'Ana anahtar (pako şalter), makine veya kumanda alanının girişinden doğrudan erişilebilir olmalı ve zeminden 0,60 m ile 1,90 m arasındaki yüksekliğe monte edilmelidir.');
set('MAD-0404', 'denetci_yonlendirmesi', null);
set('MAD-0404', 'md_kosulu', null);

set('MAD-0407', 'denetci_yonlendirmesi', null);
set('MAD-0411', 'md_kosulu', 'MR');
set('MAD-0411', 'resmi_madde_metni',
  'Makine dairesinde ağır donanımın güvenli biçimde kaldırılması ve taşınması gerekiyorsa, uygun konumlandırılmış bir kaldırma/taşıma vasıtası bulunmalı ve güvenli çalışma yükü üzerinde açıkça belirtilmelidir.');
set('MAD-0411', 'denetci_yonlendirmesi', null);

set('MAD-0426', 'resmi_madde_metni',
  'Kuvvet panosunda, uygulanabilir devreler için hata akımına karşı koruma elemanları bulunmalı; elemanların anma değerleri, bağlantıları ve test işlevleri uygun olmalıdır.');
set('MAD-0426', 'denetci_yonlendirmesi', null);
set('MAD-0427', 'resmi_madde_metni',
  'Kumanda panosunda, uygulanabilir devreler için hata akımına karşı koruma elemanları bulunmalı; elemanların anma değerleri, bağlantıları ve test işlevleri uygun olmalıdır.');
set('MAD-0427', 'denetci_yonlendirmesi', null);

await fs.writeFile(libraryPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ changed_count: changed.length, changed }, null, 2));
