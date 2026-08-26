import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const libraryPath = path.join(rootDir, 'data', 'madde_kutuphanesi.json');
const rows = JSON.parse(await fs.readFile(libraryPath, 'utf8'));

if (!Array.isArray(rows) || rows.length !== 1019) {
  throw new Error(`Beklenen 1019 satırlık kütüphane bulunamadı: ${rows?.length}`);
}

const byId = new Map(rows.map(row => [row.madde_id, row]));
const requireRow = id => {
  const row = byId.get(id);
  if (!row) throw new Error(`Zorunlu hedef bulunamadı: ${id}`);
  return row;
};
const set = (id, field, value) => { requireRow(id)[field] = value; };

const migration59Ids = [
  'MAD-0389','MAD-0390','MAD-0394','MAD-0404','MAD-0407','MAD-0411','MAD-0426','MAD-0427',
  'MAD-0636','MAD-0640','MAD-0641','MAD-0645','MAD-0653','MAD-0855','MAD-0856',
  'MAD-0909','MAD-0910','MAD-0913','MAD-0923','MAD-0961','MAD-0962','MAD-0964','MAD-0978','MAD-0979',
];
migration59Ids.forEach(requireRow);

for (const id of ['MAD-0636','MAD-0640','MAD-0641','MAD-0645','MAD-0653','MAD-0855','MAD-0856','MAD-0909','MAD-0910','MAD-0913']) {
  set(id, 'denetci_yonlendirmesi', null);
}
for (const row of rows) {
  const categoryText = [row.kontrol_basligi, row.resmi_madde_metni, row.aranmaz_kosulu].filter(Boolean).join(' ');
  if (row.standart_grubu === '81-71' && /Kategori\s+[12]/i.test(categoryText)) {
    row.gorsel_referansi = 'G-8171-KATEGORI-TR.svg — Kategori 1 ve Kategori 2 açıklamaları';
  }
  const typeText = [row.kontrol_basligi, row.resmi_madde_metni, row.denetci_yonlendirmesi].filter(Boolean).join(' ');
  if (row.standart_grubu === '81-70' && /Tip\s+[1-5]/i.test(typeText)) {
    row.gorsel_referansi = 'G-8170-KABIN-TIPLERI-TR.svg — Kabin tipi açıklamaları';
  }
}
set('MAD-0855', 'aranmaz_kosulu', 'Asansör Kategori 1 (kuyusu kısmi mahfazalı) ise bu madde uygulanmaz.');
Object.assign(requireRow('MAD-0923'), {
  denetci_yonlendirmesi: null,
  resmi_madde_metni: 'Kabin tipini net kabin genişliği, net kabin derinliği, kapı yerleşimi ve kullanım amacına göre çizelgeden belirleyin. Beyan yükü tek başına kabin tipini belirlemez; 800 kg gibi ara beyan yüklerinde gerçek kabin ölçülerini esas alın.',
  gorsel_referansi: 'G-8170-KABIN-TIPLERI-TR.svg — Kabin tipi açıklamaları',
});
const panelMeasurement = [{
  id: 'kumanda_paneli_bulundugu_taraf',
  etiket: 'Kumanda panelinin bulunduğu taraf',
  tur: 'secim',
  secenekler: ['Girişte sağ','Girişte sol','Arka duvar'],
  referans_metni: 'Kabine giriş yönüne göre seçilir.',
}];
for (const id of ['MAD-0961','MAD-0962','MAD-0964']) {
  Object.assign(requireRow(id), {olcu1_adi:null, olcu1_birimi:null, olcum_tanimlari:panelMeasurement});
}
Object.assign(requireRow('MAD-0978'), {
  resmi_madde_metni: 'Kabin içindeki kapı açma butonunda, kapının açılmasını gösteren ISO 7000-2864 sembolü (birbirinden ayrılan iki ok) bulunmalıdır.',
  denetci_yonlendirmesi: null,
});
Object.assign(requireRow('MAD-0979'), {
  resmi_madde_metni: 'Kabin içinde kapı kapama butonu bulunuyorsa, butonda ISO 7000-2863 sembolü (birbirine yaklaşan iki ok) bulunmalıdır.',
  denetci_yonlendirmesi: null,
});
Object.assign(requireRow('MAD-0389'), {kontrol_basligi:'Makine veya pano çalışma alanı aydınlatma anahtarı', resmi_madde_metni:'Makine dairesinin veya MRL asansörde kumanda panosu çalışma alanının aydınlatma anahtarı, yetkili kişilerin kolayca erişebileceği uygun bir konum ve yükseklikte bulunmalıdır.', denetci_yonlendirmesi:null, md_kosulu:null});
Object.assign(requireRow('MAD-0390'), {kontrol_basligi:'Makine veya pano çalışma alanının aydınlatılması', resmi_madde_metni:'Makine dairesinde veya MRL asansörde kumanda panosunun bulunduğu çalışma alanında, çalışma seviyesinde en az 200 lüks; erişim ve hareket alanlarında en az 50 lüks aydınlatma sağlanmalıdır.', denetci_yonlendirmesi:null, md_kosulu:null});
Object.assign(requireRow('MAD-0394'), {resmi_madde_metni:'Asansördeki etiketler, bildirimler, işaretlemeler ve talimatlar kalıcı biçimde sabitlenmiş; silinmez, okunaklı, anlaşılır, görünür, dayanıklı ve Türkçe olmalıdır.', denetci_yonlendirmesi:null, md_kosulu:null});
Object.assign(requireRow('MAD-0404'), {kontrol_basligi:'Ana anahtarın (pako şalterin) erişimi ve montaj yüksekliği', resmi_madde_metni:'Ana anahtar (pako şalter), makine veya kumanda alanının girişinden doğrudan erişilebilir olmalı ve zeminden 0,60 m ile 1,90 m arasındaki yüksekliğe monte edilmelidir.', denetci_yonlendirmesi:null, md_kosulu:null});
set('MAD-0407', 'denetci_yonlendirmesi', null);
Object.assign(requireRow('MAD-0411'), {md_kosulu:'MR', resmi_madde_metni:'Makine dairesinde ağır donanımın güvenli biçimde kaldırılması ve taşınması gerekiyorsa, uygun konumlandırılmış bir kaldırma/taşıma vasıtası bulunmalı ve güvenli çalışma yükü üzerinde açıkça belirtilmelidir.', denetci_yonlendirmesi:null});
Object.assign(requireRow('MAD-0426'), {resmi_madde_metni:'Kuvvet panosunda, uygulanabilir devreler için hata akımına karşı koruma elemanları bulunmalı; elemanların anma değerleri, bağlantıları ve test işlevleri uygun olmalıdır.', denetci_yonlendirmesi:null});
Object.assign(requireRow('MAD-0427'), {resmi_madde_metni:'Kumanda panosunda, uygulanabilir devreler için hata akımına karşı koruma elemanları bulunmalı; elemanların anma değerleri, bağlantıları ve test işlevleri uygun olmalıdır.', denetci_yonlendirmesi:null});

for (const id of ['MAD-0045','MAD-0048']) set(id, 'aranmaz_kosulu', null);
for (const id of [
  'MAD-0183','MAD-0190','MAD-0191','MAD-0195','MAD-0196','MAD-0198','MAD-0199','MAD-0212',
  'MAD-0276','MAD-0277','MAD-0278','MAD-0281','MAD-0282','MAD-0283','MAD-0285','MAD-0286',
  'MAD-0288','MAD-0292','MAD-0293','MAD-0294','MAD-0297','MAD-0298','MAD-0428','MAD-0433',
  'MAD-0541','MAD-0560','MAD-0640','MAD-0649','MAD-0656','MAD-0846','MAD-0884','MAD-0633','MAD-0600','MAD-0616',
]) set(id, 'denetci_yonlendirmesi', null);
for (const id of ['MAD-0290','MAD-0291','MAD-0295','MAD-0296']) {
  Object.assign(requireRow(id), {denetci_yonlendirmesi:null, aranmaz_kosulu:null});
}
set('MAD-0181', 'resmi_madde_metni', 'Durak kapıları, kilit açma bölgesinin dışında hem mekanik hem elektriksel olarak kapalı kalmalıdır.');
set('MAD-0184', 'resmi_madde_metni', 'Kapalı kapılar arasında kalan herhangi bir boşluğa 150 mm çapında bir topun yerleştirilememesi gerekir.');
set('MAD-0201', 'resmi_madde_metni', "Kuyu duvarları, 0,3 m x 0,3 m'lik bir alana eşit dağıtılmış 1000 N'luk bir kuvvete, 1 mm'den fazla kalıcı ve 15 mm'den fazla elastik şekil bozukluğu olmaksızın dayanabilmelidir.");
set('MAD-0884', 'resmi_madde_metni', "Kamuya açık işaret ve işaretlemeler, Ek E'de belirtilen araçlarla yerlerinden çıkarılamayacak şekilde tespit edilmelidir.");
set('MAD-0451', 'denetci_yonlendirmesi', 'Acil durum elektrikli kurtarma anahtarı çalıştırıldığında yalnız şu güvenlik aygıtları devre dışı bırakılmalı:\n1) Pozitif tahrikli ve hidrolik asansörlerde halat/zincir gevşeklik kontrol aygıtları\n2) Kabin güvenlik tertibatına monte edilenler\n3) Hız regülatöründekiler\n4) Yukarı yönde aşırı hızlanmaya karşı koruma aygıtına monte edilenler\n5) Hidrolik tamponlara monte edilenler\n6) Sınır güvenlik kesicileri\n\nDiğer güvenlik devreleri etkin kalmalıdır.');
Object.assign(requireRow('MAD-0570'), {kontrol_basligi:'Kabin en üst konumunda kılavuz ray ilave hareket seyri', tahrik_kosulu:null});

for (const id of ['MAD-0015','MAD-0016','MAD-0017','MAD-0019','MAD-0020','MAD-0021','MAD-0023','MAD-0024','MAD-0025']) set(id, 'denetci_yonlendirmesi', null);
for (const id of ['MAD-0026','MAD-0027']) set(id, 'aranmaz_kosulu', null);
for (const id of ['MAD-0028','MAD-0029','MAD-0030','MAD-0031']) Object.assign(requireRow(id), {denetci_yonlendirmesi:null, aranmaz_kosulu:null});

const suspension = requireRow('MAD-0008H');
if (!Array.isArray(suspension.olcum_tanimlari)) throw new Error('MAD-0008H ölçüm tanımları geçersiz');
suspension.olcum_tanimlari = suspension.olcum_tanimlari.filter(def => def.id !== 'halat_sarim_acisi');
suspension.denetci_yonlendirmesi = 'Makine alanında halat ve kasnak bilgilerini etiket, kumpas/şerit metre ve erişilebilir yerleşim üzerinden kaydedin. En güvenli erişilebilir noktayı kullanın; değerleri tahmin etmeyin. Halat sarım açısını sahada ölçmeyin; yalnız onaylı teknik dosya veya yerleşim çizimi üzerinden kontrol edin. Eksiklik varsa madde açıklamasına yazın.';
set('MAD-0018', 'aranmaz_kosulu', 'Kuyu dibi derinliği 2500 mm’den fazlaysa bu madde otomatik olarak Uygulanmaz işaretlenir.');
for (const id of ['MAD-0046','MAD-0047']) set(id, 'aranmaz_kosulu', null);
Object.assign(requireRow('MAD-0049'), {
  olcum_tanimlari: [],
  olcu1_adi: null,
  olcu1_birimi: null,
  olcu2_adi: null,
  olcu2_birimi: null,
});
set('MAD-1000', 'denetci_yonlendirmesi', "TS EN 81-70'e göre: tuş takımı genişliği en fazla 120 mm, yüksekliği en fazla 160 mm olmalı; butonlar arası mesafe 5-15 mm. Rakamlar kabartma OLMAMALI (kazınmış olabilir); Braille kullanılmaz. Çıkış katı (yıldız) sembolü ve eksi işareti kabartma olmalı. '5' rakamlı butonda tek bir kabartma nokta bulunmalı (körler için dokunsal referans). Genel şartlar: aktif alan en az 490 mm² (yaklaşık 20 mm çap), çalıştırma kuvveti 2,5-5,0 N, sembol yüksekliği 15-40 mm kabartma. Uygulamadaki mevcut ölçüm alanlarına sahada alınabilen temel boyutları yazın. Diğer kriterleri kontrol edin; eksiklik varsa madde açıklamasına yazın.");
set('MAD-1001', 'denetci_yonlendirmesi', "TS EN 81-70'e göre dokunmatik ekranlar koşullu izinlidir: ekran en az 300 cd/m² parlaklık sağlamalı, dokunma alanları ve semboller çevresiyle kontrastlı olmalı; sembol yüksekliği 15-40 mm, butonlar arası mesafe en az 5 mm olmalıdır. Ekranın yanında veya altında bir erişilebilirlik butonu bulunmalı; bu butona basıldığında katların sırayla sesli anons edilip ikinci bir basışla seçilebildiğini test edin. Bu madde yalnız kabinde dokunmatik ekran varsa doldurulur. Uygulamadaki mevcut ölçüm alanlarına sahada alınabilen temel boyutları yazın. Diğer kriterleri kontrol edin; eksiklik varsa madde açıklamasına yazın.");
set('MAD-1002', 'denetci_yonlendirmesi', "TS EN 81-70'e göre erişilebilirlik butonu, tuş takımı veya dokunmatik ekranın yanında, tercihen altında bulunmalı ve uluslararası 'Engelliler için Erişim' sembolüyle (ISO 4190-5 Tablo C.1 No.10) işaretlenmelidir. Aktive edildiğinde sesli anons başlatmalı, çağrıyı uygun kabine yönlendirmeli veya kapının açık kalma süresini uzatmalıdır. Bu madde yalnız ayrı bir erişilebilirlik butonu varsa doldurulur. Uygulamadaki mevcut ölçüm alanına butonun yerden yüksekliğini yazın. Diğer kriterleri kontrol edin; eksiklik varsa madde açıklamasına yazın.");
set('MAD-1003', 'denetci_yonlendirmesi', "TS EN 81-70'e göre büyük boy tuş takımında buton aktif alanı en az 50x50 mm (veya 50 mm çap), sembol boyutu 25-40 mm olmalıdır. Kat butonları, dikeyle 30°±15° açılı ve çıkıntısı en fazla 100 mm olan eğik bir panelde bulunmalı; en üst butonun merkezi yerden en fazla 1000 mm yükseklikte olmalıdır. Alarm ve kapı butonları, kat butonları arası mesafenin en az iki katı kadar ayrılmalıdır. Bu madde yalnız böyle bir panel varsa doldurulur. Uygulamadaki mevcut ölçüm alanlarına sahada alınabilen temel boyutları yazın. Diğer kriterleri kontrol edin; eksiklik varsa madde açıklamasına yazın.");

await fs.writeFile(libraryPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({rows:rows.length, synchronized_migrations:[59,60,61,62]}, null, 2));
