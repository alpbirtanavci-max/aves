// Kural kataloğu: her kuralın kaynağı ve DOĞRULAMA DURUMU.
// İkinci kişi teknik gözden geçirmesi tamamlanmadan hiçbir kural 'REVIEWED' sayılmaz; rapor bunu açıkça yazar.
// (AGENTS.md: kaynak sınıfı + doğrulama durumu zorunlu; Master Brief bölüm 4.)

export const ENGINE_VERSION = '0.1.0';
export const CATALOG_DATE = '2026-10-08';

/**
 * verification:
 *   basis   — kuralın hangi metne karşı denetlendiği
 *   independentReview — 'PENDING' | 'DONE'
 */
export const RULE_CATALOG = Object.freeze([
  { ruleId: 'SUS-001', title: 'Halat anma çapı ve adedi', standard: 'EN 81-20:2020', clause: '5.5.1.2 a); 5.5.1.3', basis: 'EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'SUS-002', title: 'Kasnak/makara çapı oranı D/d', standard: 'EN 81-20:2020', clause: '5.5.2.1', basis: 'EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'SUS-003', title: 'Askı güvenlik katsayısı alt sınırı', standard: 'EN 81-20:2020', clause: '5.5.2.2', basis: 'EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'SUS-004', title: 'EN 81-50 5.12 asgari güvenlik katsayısı', standard: 'EN 81-50:2020', clause: '5.12.2–5.12.3; Çizelge 2; Ek E', basis: 'TS EN 81-50:2021 (Türkçe çeviri) sayfa görüntüsü; EN 81-50:2014 İngilizce ile metin düzeyinde karşılaştırıldı; Şekil 10 noktalarıyla sayısal kontrol; Ek E örnekleri', independentReview: 'PENDING' },
  { ruleId: 'SUS-006', title: 'Halat sonlandırma', standard: 'EN 81-20:2020; EN 13411-3/-6/-7/-8', clause: '5.5.2.3', basis: 'EN 81-20:2020 İngilizce metin; EN 13411-7 Türkçe metin', independentReview: 'PENDING' },
  { ruleId: 'TRA-001', title: 'Çekiş — kabin yükleme', standard: 'EN 81-50:2020; EN 81-20:2020', clause: '5.11.2.2.1; 5.5.3 a)', basis: 'TS EN 81-50:2021 görüntü; EN 81-50:2014 İngilizce metin (μ ve f formülleri); Ek D formülleri', independentReview: 'PENDING' },
  { ruleId: 'TRA-002', title: 'Çekiş — acil fren, dolu kabin', standard: 'EN 81-50:2020; EN 81-20:2020', clause: '5.11.2.2.2; 5.5.3 b)', basis: 'Ek D (a) formülleri; Şekil 9 genel durum', independentReview: 'PENDING' },
  { ruleId: 'TRA-003', title: 'Çekiş — acil fren, boş kabin', standard: 'EN 81-50:2020; EN 81-20:2020', clause: '5.11.2.2.2; 5.5.3 b)', basis: 'Ek D (b) formülleri; Şekil 9 Not 1', independentReview: 'PENDING' },
  { ruleId: 'TRA-004', title: 'Çekiş — karşı ağırlık tamponda', standard: 'EN 81-50:2020; EN 81-20:2020', clause: '5.11.2.2.3; 5.5.3 c)', basis: 'Ek D (karşı ağırlığın durması)', independentReview: 'PENDING' },
  { ruleId: 'TRA-005', title: 'Çekiş — kabin tamponda', standard: 'EN 81-50:2020; EN 81-20:2020', clause: '5.11.2.2.3; 5.5.3 c)', basis: 'Ek D simetrisi (doğrudan örnek yok)', independentReview: 'PENDING' },
  { ruleId: 'RAIL-C-02', title: 'Kabin rayı — eğilme', standard: 'EN 81-50:2020; EN 81-20:2020', clause: '5.10.2; Ek C; 5.7.4.5', basis: 'TS EN 81-50:2021 görüntü; EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'RAIL-C-03', title: 'Kabin rayı — bası ve burkulma', standard: 'EN 81-50:2020', clause: '5.10.3–5.10.4; Ek C', basis: 'TS EN 81-50:2021 görüntü', independentReview: 'PENDING' },
  { ruleId: 'RAIL-C-04', title: 'Kabin rayı — flanş eğilmesi', standard: 'EN 81-50:2020', clause: '5.10.5; Ek C', basis: 'TS EN 81-50:2021 görüntü', independentReview: 'PENDING' },
  { ruleId: 'RAIL-C-05', title: 'Kabin rayı — sehim', standard: 'EN 81-50:2020; EN 81-20:2020', clause: '5.10.6; 5.7.4.6; Ek E.2', basis: 'TS EN 81-50:2021 görüntü; EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'RAIL-C-06', title: 'Kabin rayı — üretici katalog hız kapsamı / stok metrajı', standard: 'Savera Super üretici kataloğu', clause: 'Teknik özellikler; PDF s. 2, 6–7', basis: 'Savera resmî ürün sayfasındaki katalog bağlantısı ve Rev. 08/26 üretici PDF SHA-256 kaydı', independentReview: 'PENDING' },
  { ruleId: 'RAIL-W-02', title: 'Karşı ağırlık rayı — eğilme', standard: 'EN 81-50:2020; EN 81-20:2020', clause: '5.10.2; 5.7.2.3.3', basis: 'EN 81-20:2020 İngilizce metin; Ek C', independentReview: 'PENDING' },
  { ruleId: 'RAIL-W-03', title: 'Karşı ağırlık rayı — bası ve burkulma', standard: 'EN 81-50:2020', clause: '5.10.3–5.10.4', basis: 'TS EN 81-50:2021 görüntü', independentReview: 'PENDING' },
  { ruleId: 'RAIL-W-05', title: 'Karşı ağırlık rayı — sehim', standard: 'EN 81-50:2020; EN 81-20:2020', clause: '5.10.6; 5.7.4.6', basis: 'TS EN 81-50:2021 görüntü; EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'RAIL-W-06', title: 'Karşı ağırlık rayı — üretici katalog hız kapsamı / stok metrajı', standard: 'Savera Super üretici kataloğu', clause: 'Teknik özellikler; PDF s. 2, 6–7', basis: 'Savera resmî ürün sayfasındaki katalog bağlantısı ve Rev. 08/26 üretici PDF SHA-256 kaydı', independentReview: 'PENDING' },
  { ruleId: 'SG-001', title: 'Kademeli emniyet tertibatı izin verilebilir kütle', standard: 'EN 81-50:2020', clause: '5.3.3.3.1; 5.3.4 a)', basis: 'TS EN 81-50:2021 görüntü', independentReview: 'PENDING' },
  { ruleId: 'SG-002', title: 'Kademeli tertibat ortalama yavaşlama', standard: 'EN 81-20:2020', clause: '5.6.2.1.3', basis: 'EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'GOV-001', title: 'Regülatör devreye girme hızı', standard: 'EN 81-20:2020', clause: '5.6.2.2.1.1 a)', basis: 'EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'GOV-002', title: 'Regülatör halat kuvveti', standard: 'EN 81-20:2020', clause: '5.6.2.2.1.1 d)', basis: 'EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'GOV-003', title: 'Regülatör halatı D/d ve güvenlik katsayısı', standard: 'EN 81-20:2020', clause: '5.6.2.2.1.3', basis: 'EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'BUF-001', title: 'Tampon tipi / anma hızı', standard: 'EN 81-20:2020', clause: '5.8.1.5; 5.8.1.6', basis: 'EN 81-20:2020 İngilizce metin; AVES uygulama filtresi ayrı sınıf', independentReview: 'PENDING' },
  { ruleId: 'BUF-002', title: 'Tampon stroku', standard: 'EN 81-20:2020', clause: '5.8.2', basis: 'EN 81-20:2020 İngilizce metin', independentReview: 'PENDING' },
  { ruleId: 'BUF-003', title: 'Tampon model, yük ve hız aralığı', standard: 'Üretici sertifikası; EN 81-50:2020 5.5', clause: '5.5; sertifika eki', basis: 'Üretici belgesi (girdi)', independentReview: 'PENDING' },
]);

export const OUT_OF_SCOPE = Object.freeze([
  'Makine ve fren torku (EN 81-20 5.9): standart tek bir hesap formülü vermez; bu sürümde yok.',
  'Motor gücü ve termik uygunluk: mühendislik yöntemi gerektirir; bu sürümde yok.',
  'Kabin/karkas, kabin döşemesi, makine taşıyıcıları: onaylı yapısal yöntem seçilmedi; bu sürümde yok.',
  'Hidrolik asansörler (EN 81-50 5.13), sismik durum (EN 81-77), kapılar ve kilitleme.',
  'Makine altta/yanda yerleşimli çekiş hesabı; çekme kasnağı tarafında atalet taşıyan saptırma makarası (m_DP) ve gergi aygıtı (PTD) terimleri.',
  'Ray bağlantı elemanları, braketler, paten/klips, ek yerleri, yardımcı donanım ve kurulum koşulları.',
]);

export function catalogEntry(ruleId) {
  return RULE_CATALOG.find((r) => r.ruleId === ruleId) ?? null;
}
