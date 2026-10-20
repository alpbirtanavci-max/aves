/* ============================================================
   AVES Saha Denetim — yapılandırma ve sabitler
   Sürüm, Supabase adresi, çevrimdışı çekirdek dosya listesi, durum/kategori sabitleri. İlk yüklenir.
   ============================================================ */
'use strict';

const CONFIG = {
  url: 'https://jmccmkqyncunpqliqvox.supabase.co',
  key: 'sb_publishable_WVlR6u3sfDiu8V121t4x-Q_4yxHCJ2W',
};

const APP_VERSION = 'R15D-rc3.18.1';
const DB_VERSION = 6;
const OFFLINE_CORE_ASSETS = [
  './', './index.html', './section-mapping.js', './kapanis-guven-ozeti.js', './teknik-dosya-formlari.js', './denetim-form-setleri.js', './form-draft-journal.js', './fr65-saha-tools.js', './yedek-geri-yukle.js', './tanilama.js', './deger-kontrol.js', './fr65-docx.js', './fr65-cikti.js', './fr65-sema.js', './fr65-excel.js', './fr65-pdf.js', './config.js', './db.js', './api.js', './profil.js', './senkron.js', './yerel-yazma.js', './app.js', './baslat.js', './manifest.json',
  './logo.png', './aves-logo-white.png',
  './fonts/Inter-latin-ext.woff2', './fonts/Inter-latin.woff2',
  './fonts/Montserrat-latin-ext.woff2', './fonts/Montserrat-latin.woff2',
  // Resmî çıktı çevrimdışı da üretilebilsin (10b): manifest + yazı tipi + form şablonları.
  './form-assets/form-output-manifest.json', './form-assets/DejaVuSans.ttf', './form-assets/UB_FR_65.docx',
  './form-assets/UB_FR_38_R04.docx', './form-assets/UB_FR_38_R04.pdf',
  './form-assets/UB_FR_39_R02.docx', './form-assets/UB_FR_39_R02.pdf',
];

if (typeof avesFizikselBolumUygula !== 'function' ||
    typeof AVES_FIZIKSEL_BOLUM_ESLEMESI !== 'object' ||
    Object.keys(AVES_FIZIKSEL_BOLUM_ESLEMESI).length !== 70) {
  throw new Error('AVES fiziksel bölüm eşlemesi yüklenemedi');
}

// AVES saha checklist sonucu yalnız üçlüdür. "Kontrol edilemedi / Veri eksik"
// denetim sonucu değildir; eski kayıtlar R15C geçişinde iç kontrol notuna taşınır.
const DURUMLAR = ['Kontrol tamamlandı','Olumsuz bulgu','Uygulanmaz'];
const DURUM_CSS = {'Kontrol tamamlandı':'ok','Olumsuz bulgu':'bad','Uygulanmaz':'na'};
const DURUM_KISA = {'Kontrol tamamlandı':'✓ Uygun','Olumsuz bulgu':'✗ Uygun Değil','Uygulanmaz':'— Uygulanmaz'};
const FOTO_HATIRLATMALARI = {
  '01 - Kuyu Dibi': 'Kabin ve karşı ağırlık tamponlarının etiket fotoğraflarını çekmeyi unutmayın.',
  '03 - Kabin ve Kabin Üstü': 'Paraşüt fren ve kat kapılarının etiket fotoğraflarını çekmeyi unutmayın.',
  '05 - Elektrik ve Test': 'Kumanda kartı etiketinin fotoğrafını çekmeyi unutmayın.',
};
// Ana durum butonlarının kopyası olan genel bulgu seçenekleri — Uygun Değil altında gösterilmez
const GENEL_BULGULAR = ['Belirgin olumsuzluk yok','Olumsuz durum görüldü','Belirgin kusur görülmedi','2.000 mm altında ve belirgin kusur yok','8.8 veya üzeri','Kontrol edilemedi','Uygulanmaz','Aranmaz','Diğer bulgu'];
// Fotoğraflar tek bir maddeye değil, Seri No sekmesiyle aynı desende sabit bir saha
// kategorisine bağlanır — denetçi "hangi maddeye" diye tereddüt etmez. Uygulama
// fotoğrafı yorumlamaz, uygunluk kararı vermez; sayı sınırı yoktur.
const FOTOGRAF_KATEGORILERI = [
  ['genel_kimlik', 'Genel Yerleşim ve Kimlik', 'Asansörün genel yerleşimi, durak girişleri ve kullanım/uyarı işaretleriyle birlikte makine, regülatör, tampon, kapı, güvenlik ekipmanı ve motor grubunun okunabilir etiketlerini kaydedin. Güvenlik ekipmanlarında seri no, CE işareti ve tip bilgisi görünür olsun; farklı tip veya uygulamalar ayrıca kaydedilir.'],
  ['kuyu_dibi', 'Kuyu Dibi', 'Kuyu dibinin ilk kattan tüm yerleşimi gösterecek geniş açı görünüşünü ve gerektiğinde karşı açıları alın. Tamponlar/kaideleri, tamponların çarpma alanı, regülatör gergi makarası ve sabitlemesi, ray alt uçları, karşı ağırlık/ayırıcı bölme, dengeleme tertibatı, kabin altı, merdiven, durdurma anahtarı ve sığınma/güvenlik hacmi görünür olsun.'],
  ['kuyu_boyunca', 'Kuyu Boyunca ve Kılavuzlama', 'Kuyuyu farklı kotlardan geniş açıyla kaydedin. Kabin ve karşı ağırlık ray konsolları, civatalı/ankraj bağlantıları, ray ekleri, kuyu duvarları, ayırıcı bölmeler, kapı kilit mekanizmaları, kabin sabitlemeleri ve karşı ağırlık düzeni görülsün. Paraşüt fren testi tamamlandıktan sonra her iki raydaki frenleme izini de ayrıca fotoğraflayın.'],
  ['durak_kapilari', 'Durak Kapıları ve Bağlantıları', 'Temsilî kapılarla birlikte farklı montaj tipi bulunan her kapıyı kaydedin. Alt ve üst konsollar, kasa/eşik bağlantıları, duvar ankrajı, kaynak veya civata uygulaması, kapı kilidi ve taşıyıcı düzen genel bağlantısıyla görülsün. Katlar arasında değişen ya da şüpheli uygulamalar ayrıca çekilir.'],
  ['kabin_kabin_ustu', 'Kabin, Kabin Altı, Üstü ve Askı', 'Kabin altı detayını; kabin içi buton, etiket ve talimatları; kabin karkası, korkuluk ve etek sacını; askı/palanga düzeni, 1:1 veya 2:1 halat bağlantıları ve sonlandırmaları, sabit noktalar, makaralar, koruyucular ve regülatör bağlantısını kaydedin. Kabin üst boşluğu/güvenlik mesafesi görünüşü, kabin üstü revizyon donanımı, yüklü testte kabin içindeki yükleme ve karşı ağırlık etiketi de gerektiğinde ayrıca gösterilsin.'],
  ['makine_sase', 'Makine, Şase ve Üst Donanım', 'Makine dairesinin genel yerleşimini; kapı girişi, havalandırma, pano yerleşimi ve risk önlemlerini; makine/motor şasesi ile ankraj ve bağlantı şeklini; tahrik kasnağı ve halat görünümünü kaydedin. MRL ve 2:1 sistemlerde makine, regülatör, üst makara, sabit askı noktaları ve halat bağlantıları genel yerleşimle birlikte gösterilir.'],
  ['hidrolik_grubu', 'Hidrolik Grup', 'Uygulanıyorsa güç ünitesi, tank, motor-pompa ve valf grubu; silindir ve taşıyıcı/sabitleme düzeni; boru kırılma valfi, rijit/esnek borular, bağlantılar, kelepçeler ve sızıntı toplama/koruma düzeni genel ve okunabilir ayrıntılarla kaydedilir.'],
  ['kumanda_grubu', 'Elektrik ve Kumanda Grubu', 'Kumanda panosunu ve güç/dağıtım düzenini genel görünüşle kaydedin; kart, sürücü ve ana bileşen etiketleri okunabilsin. Pano sabitlemesi, kablo girişleri ve güzergâhı, koruyucu topraklama, MRL acil durum/test panosu ve yedek güç birimleri uygulanıyorsa ayrıca gösterilir. Her asansörde aranan alarm ve iki yönlü haberleşme tertibatını da genel yerleşimi ve birimleriyle kaydedin.'],
  ['ozel_sistemler', 'Uygulanabilir Özel Sistemler', 'Denetim kapsamına giriyorsa itfaiyeci erişim seviyesi ve kumandaları, eğik asansöre özgü düzenler, küçültülmüş üst-alt boşluk korumaları, hareketli durdurucular, sismik sabitlemeler ve uygulanabilir vandalizme dayanıklı çözümler genel yerleşimiyle kaydedilir. Vandalizmle ilişkili genel asansör şartları yalnız bu başlığa bırakılmaz; ilgili ana saha grubunda da kaydedilir.'],
];
// Kullanıcının eklediği saha notları, bu Modül G formunda fotoğraf/video ve
// güvenlik hatırlatıcısıdır. Yoğun ölçü/seri no eşleştirmesi Modül B/E/H1 için
// ayrı kapsamdır; G formunda saha ölçüm eşleştirmesi olarak gösterilmez.
// Kaynağın revizyonu/onayı doğrulanmadığı için resmi standart/sonuç değildir.
const SAHA_KANIT_PLANI = {
  kaynak: 'Kullanıcı saha çalışma notları · IMG_0240/IMG_0241 · kontrollü taslak (revizyon/onay doğrulanacak)',
  guvenlik: [
    'Sahaya başlamadan önce giriş ve çalışma alanını güvenli hale getirin; kabin içine çapraz emniyet bandı ve zemin girişine görünür uyarı levhası koyun.',
    'Kat butonları ve erişim noktalarında asansörün çalışma dışında olduğunu bildiren uyarıyı görünür tutun; test boyunca üçüncü kişilerin erişimini kontrol edin.',
  ],
  videolar: [
    '1,25 katı yükle fren testi; makine dairesiz asansörde test kapısından/kuyu içinden gözlemi de içerecek şekilde.',
    'Bypass testi ve sesli ikazın duyulduğu kayıt.',
    'PTC, KRC, seviyeleme ve UPS testleri.',
    'UCM testi.',
    'Kuyu dibi–kabin üstü revizyon kumandalarının senkron çalışma testi.',
    'Risk analizi önlemlerine bağlı tertibat testleri; güvenlik tertibatı aktifken asansörün çalışmaması gibi kritik davranışlar.',
  ],
};
const SERI_NUMARASI_YARDIMI = 'Ekipman üzerindeki etikette yazan seri numarasını aynen kaydedin. Etiket fotoğraflarını Fotoğraflar > Genel Yerleşim ve Kimlik kategorisine ekleyin. Birden fazla aynı tip ekipman varsa + Ekle ile ayrı kayıt açın; okunamayan numarayı tahmin etmeyin, ilgili madde notunda belirtin.';
const LEGACY_FOTOGRAF_KATEGORISI = {
  'MAD-0006': 'kuyu_dibi',
  'MAD-0072': 'kuyu_dibi',
  'MAD-0110': 'kuyu_boyunca',
  'MAD-0111': 'kuyu_boyunca',
  'MAD-0162': 'kabin_kabin_ustu',
  'MAD-0364': 'kabin_kabin_ustu',
  'MAD-0366': 'makine_sase',
  'MAD-0368': 'makine_sase',
  'MAD-0369': 'makine_sase',
};


const DENETIM_TURLERI = {
  MODUL_G: 'Modül G - Birim Doğrulaması',
  MODUL_E: 'Modül E - Gözetim Saha Teyidi',
  MODUL_H1: 'Modül H1 - Gözetim Saha Teyidi',
  MODUL_B: 'Modül B - AB Tip İncelemesi',
};
const KONTROL_PROFILLERI = {
  TAM: 'modul_g_tam',
  SAHA_TEYIDI_E: 'saha_teyidi_e',
  SAHA_TEYIDI_H1: 'saha_teyidi_h1',
  MODUL_B: 'modul_b_tip_inceleme',
};

