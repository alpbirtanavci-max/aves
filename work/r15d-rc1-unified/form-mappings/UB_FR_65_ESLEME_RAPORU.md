# ÜB.FR.65 Teknik Dosya–Saha Eşleşme Formu (Word) — eşleme raporu

Kaynak şablon: `form-templates/UB_FR_65.docx` (resmî formun boş kopyası; `tools/fr65_sablon_uret.mjs` ile üretildi).
Kod: `app/fr65-docx.js` · Üretim: FR.65 ekranında **📝 Word** düğmesi · Kullanıcı kararları: 2026-10-20.

## Sütun kuralı

| Sütun | Kaynak |
|---|---|
| Saha Kontrol | Uygulamadaki saha verisi (`cm` alanları ×10 → mm; genel ölçülerde seyir/kuyu boyu → m) |
| Teknik Dosya | Alanın altındaki "Teknik dosyadaki değer" kutusuna kullanıcının yazdığı değer (cm alanları için **mm**) |
| S | İki değer de doluysa eşitlik: **✓** eşit, **X** farklı. Biri boşsa S boş bırakılır. İlgisiz bölüm (ör. elektrikli asansörde hidrolik ünite) **N/A** |

Karşılaştırma büyük/küçük harf, boşluk, Türkçe karakter, ondalık ayracı ve birim ekini (mm, kg, m/sn…) yok sayar.
S yalnız mekanik eşitliktir; standart uygunluk kararı değildir. SONUÇ kutusu: herhangi bir X varsa "eşleşmemiştir"; X yok, en az bir ✓ var ve saha verisi olan her hücrenin teknik değeri girilmişse "eşleşmiştir"; aksi halde işaretlenmez.

## Elle doldurulan alanlar

Müşteri No, İş dosyası No, Rapor No, Tip Kodu/Seri no, imza. Uygulama bunları doldurmaz.

## Doldurulan başlık alanları

Müşteri unvanı, İlgili Modül (B/G/E/H1), Elektrikli/Hidrolik kutusu, Makine Daireli/Dairesiz (MR/MRL), Askı tipi, Montaj adresi (saha adresi), Seri No, inceleme tarihi, incelemeyi yapan.

## Formda olup uygulamada karşılığı olmayanlar (boş kalır)

Montaj yılı, Sınıfı, CE işareti Var/Yok, Nobo No, Kumanda kartı, Motor verimi, Halat tipi, Kapı yangına dayanıklılık, Konsollar arası düşey mesafe, Tüm kuyu ölçüsü, Kabin/ağırlık ray ölçüsü (en×boy×kalınlık), Piston ray arası, Piston kapı arası, Direkt/Endirekt işaretleri, Asenkron/Senkron işareti.

## Uygulamada olup formda olmayanlar (Excel/PDF çıktısında kalır)

Tampon kaide ve gövde yüksekliği, kabin iç yüksekliği (formdaki "Kabin Yüksekliği" ile aynı alan kullanılır), UCM, GSM, ek/ikinci tamponlar, tampon tipleri.

## Birleşik hücreler (teknik değer ilk alana yazılır)

| Form hücresi | Saha değeri | Teknik değer kutusu |
|---|---|---|
| Halat Sayısı x Çapı | `halat sayısı` X `halat çapı` (örn. 7X6.5) | Halat sayısı alanı |
| Kapı tipi ve Panel Sayısı | `kapı tipi / panel sayısı` | Kapı tipi alanı |
| Karşı Ağırlık Adeti ve Ebatları | `parça sayısı / GxDxY` (mm) | Parça sayısı alanı |
| Kuyu Altında Kullanılır Alan | açıklama varsa açıklama, yoksa seçim | Aynı alan |

Eşleme: Fren Bloğu ← Paraşüt fren / güvenlik tertibatı (kullanıcı kararı: aynı kalem).
