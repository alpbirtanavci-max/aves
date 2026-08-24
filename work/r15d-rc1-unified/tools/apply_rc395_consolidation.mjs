import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const libraryPath = path.join(rootDir, 'data', 'madde_kutuphanesi.json');
const rows = JSON.parse(await fs.readFile(libraryPath, 'utf8'));

if (!Array.isArray(rows) || rows.length !== 1019) {
  throw new Error(`Beklenen rc3.9.4 kütüphanesi bulunamadı. Satır sayısı: ${rows?.length}`);
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
  changed.push({id, field});
  row[field] = value;
};

const geometry = requireRow('MAD-0008F');
if (!Array.isArray(geometry.olcum_tanimlari) || geometry.olcum_tanimlari.length !== 4) {
  throw new Error('MAD-0008F dört düşey geometri ölçüsünü içermiyor');
}
const geometryIds = new Set([
  'seyir_mesafesi', 'toplam_kuyu_yuksekligi', 'son_kat_yuksekligi', 'toplam_kuyu_ray_boyu',
]);
for (const def of geometry.olcum_tanimlari) {
  if (!geometryIds.has(def.id)) throw new Error(`MAD-0008F beklenmeyen ölçü: ${def.id}`);
  def.birim = 'm';
}
changed.push({id:'MAD-0008F', field:'olcum_tanimlari'});

set('MAD-0082', 'denetci_yonlendirmesi',
  'Koruma eteğinin durak kapısı açıklığını tam genişlikte kapladığını ve alt pahın bulunduğunu gözle kontrol edin; yalnız alt pahın yatay izdüşümünü ölçün. Açı sahada ölçüm alanı olarak kaydedilmez.');

set('MAD-0209', 'resmi_madde_metni',
  'Asansörün yanında, yangın sırasında asansörün kullanılmaması gerektiğini bildiren ve duraklardan kolayca görülebilen uygun bir uyarı işareti bulunmalıdır.');

const recallDefinition = '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. ';
const recallGuides = {
  'MAD-0891': 'Kumanda sisteminde bu yangın geri çağırma katına karşılık gelen giriş sinyalinin tanımlı olduğunu ve çağırma işlevinin bu kata yönlendiğini kontrol edin.',
  'MAD-0897': 'Elle çağırma aygıtının bina yönetim merkezinde veya yangın geri çağırma katında bulunduğunu doğrulayın.',
  'MAD-0907': 'Asansör başka bir durakta bekliyorsa kapılarının kapanıp ara duraklarda durmadan yangın geri çağırma katına gittiğini; kapılar kapanana kadar kabinde işitsel sinyal verildiğini test edin.',
  'MAD-0909': 'Elle çalıştırılan veya otomatik olmayan kapılı asansör, kapıları açıkken bulunduğu durakta hareketsiz kalmalıdır. Kapılar kapatıldıktan sonra ara duraklarda durmadan yangın geri çağırma katına gitmelidir; iki durumu ayrı ayrı test edin.',
  'MAD-0910': 'Asansör yangın geri çağırma katının ters yönünde hareket ediyorsa en yakın uygun durakta kapı açmadan yön değiştirip geri çağırma katına döndüğünü test edin.',
  'MAD-0911': 'Asansör yangın geri çağırma katına giderken ara kat çağrılarını dikkate almadan ilerlemelidir. Durmaya başlamışsa normal durup kapı açmadan geri çağırma katına devam ettiğini test edin.',
  'MAD-0914': 'Asansör yangın geri çağırma katına vardığında kapıların açıldığını ve sesli/görsel tahliye uyarısının verildiğini test edin.',
  'MAD-0915': 'Yangın geri çağırma katında kapı bekleme süresi 20 saniyeyi aştığında kapıların kapanıp asansörün hizmet dışı bırakıldığını test edin.',
  'MAD-0916': 'Yangın geri çağırma katında kapı açma ve acil durum alarm butonlarının çalışır durumda kaldığını doğrulayın.',
  'MAD-0917': 'Yangın geri çağırma katından verilen kat çağrısının, itfaiye personelinin kabini kontrol edebilmesi için kapıları en fazla 20 saniye açık tuttuğunu test edin.',
  'MAD-0920': 'Elle açılan kapılı asansörün yangın geri çağırma katında hizmet dışı kaldığını, kapıların açılabildiğini ve sesli/görsel tahliye uyarısının verildiğini test edin.',
};
for (const [id, guide] of Object.entries(recallGuides)) {
  set(id, 'denetci_yonlendirmesi', recallDefinition + guide);
}

set('MAD-0897', 'kontrol_basligi', 'Yangın geri çağırma kumandasının yeri');
set('MAD-0907', 'kontrol_basligi', 'Durakta bekleyen asansörün yangın geri çağırma katına hareketi');
set('MAD-0909', 'kontrol_basligi', 'Elle/otomatik olmayan kapılı asansörün yangın geri çağırma davranışı');
set('MAD-0910', 'kontrol_basligi', 'Ters yöndeki asansörün yangın geri çağırma katına dönüşü');
set('MAD-0911', 'kontrol_basligi', 'Yangın geri çağırma katına giderken ara durakların atlanması');

if (changed.length !== 19) {
  throw new Error(`Beklenen 19 alan değişikliği yerine ${changed.length} değişiklik oluştu`);
}

await fs.writeFile(libraryPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({changed_count:changed.length, changed}, null, 2));
