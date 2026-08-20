# ÜB.FR.38 R.04 Eşleme Raporu

Durum: Pilot eşleme başladı; canlı kütüphane ve canlı denetimler değiştirilmedi.

## Kaynak ve kapsam

- Resmî kaynak: `ÜB.FR.38 — TS EN 81-20 Test Kontrol Formu`
- Revizyon: `R.04`
- Revizyon tarihi: `17.02.2026`
- Resmî PDF: Google Drive dosya kimliği `1NqM263dcLGfRjwJsEmnxNKyT2TRGaPuR`
- Sayfa sayısı: 40
- Bu dilim: İş dosyası/temel asansör bilgileri, güvenlik bileşenleri, muayene öncesi 5 satır ve `01 - Kuyu Dibi` bölümündeki 82 uygulama maddesi

Resmî form metni bu repoya kopyalanmadı. Eşleme dosyasında yalnız alan yolları, madde kimlikleri, standart bentleri, kontrol başlıkları ve doğrulama işaretleri tutulur.

## İlk sonuçlar

- Kütüphanede ÜB.FR.38 kaynaklı toplam 453 madde var.
- Bunların 400'ünün resmî PDF'de normalize edilmiş metni birebir ve doğrulanabilir durumda.
- Kuyu Dibi diliminde 82 adayın 46'sı resmî PDF'de tekil metin eşleşmesiyle yüksek güvenli bulundu.
- 36 satır birleşik form satırı, metin sadeleştirmesi veya tekrarlanan metin nedeniyle insan kontrolüne ayrıldı.
- `MAD-0001`–`MAD-0005`, resmî formdaki muayene öncesi 1–5 satırlarıyla sıra ve anlam bakımından eşleşiyor; fakat kütüphanede `kaynak_form_kodu` ve `kaynak_form_revizyonu` boş. Bu eksiklik eşleme dosyasında açıkça kaydedildi.

## Doğrudan doldurulabilen form alanları

- Denetçi adı
- Müşteri unvanı
- Denetim tarihi
- Denetim adresi
- Dosya numarası
- Modül
- Tahrik tipi
- Asansör seri numarası
- Askı tipi
- Beyan yükü ve kişi kapasitesi
- Durak sayısı
- Beyan hızı

Standart listesi ve belgelendirme kapsamı tek bir alandan kopyalanmayacak; denetimin kilitli profili ve konfigürasyonundan kurallı biçimde türetilecek. Denetçiye “ek standart seç” ekranı açılmayacak.

## Uygulamada eksik veya kısmi alanlar

Form üst bilgisinde olup uygulamada henüz bulunmayanlar:

- Asansör sınıfı
- Montaj yılı
- Seyir mesafesi
- Kat sayısı (uygulamada yalnız durak sayısı var)

Güvenlik bileşenlerinde mevcut seri numarası altyapısı şu alanların seri numarasını verebilir: kumanda kartı, hız regülatörü, kat kapıları/kilit tertibatı, kabin fren tertibatı, kabin tamponu, karşı ağırlık tamponu ve motor/tahrik makinesi. Ancak resmî formdaki marka, model/tip ve açıklama alanları uygulamada tutulmuyor.

Tamamen eksik bileşen kümeleri:

- Boru kırılma valfi
- UCM izleyici / algılayıcı / durdurucu
- Hidrolik pompa / valf grubu

Bu alanlar başka verilerden tahmin edilerek doldurulmayacak. Gerekli olduklarına karar verilirse denetim formuna kontrollü yeni alanlar olarak eklenecek.

## Revizyon kilidi

Çıktı üretildiği gün Drive'daki en yeni dosya kullanılmayacak. Denetim başladığında aşağıdakiler denetim kaydına kilitlenecek:

- form kodu,
- form revizyonu,
- şablon kimliği veya içerik özeti,
- eşleme şeması sürümü.

Böylece ÜB.FR.38 daha sonra revize edilse bile geçmiş denetimin PDF/DOCX çıktısı kendi R.04 düzeniyle yeniden üretilebilecek.

## Sonraki çalışma sırası

1. İnceleme bekleyen 36 Kuyu Dibi eşleşmesini resmî form satırlarıyla tek tek kapat.
2. ÜB.FR.38'in `02 - Kuyu Boyunca`, `03 - Kabin ve Kabin Üstü`, `04 - Makine ve Şase`, `05 - Elektrik ve Test` bölümlerini aynı yöntemle eşleştir.
3. Ölçüm değerlerinin formdaki “Ölçülen Değer” hücrelerine bağlanmasını ayrı bir katman olarak doğrula.
4. ÜB.FR.39 R.02'ye geçmeden önce ÜB.FR.38 için eksik uygulama alanları hakkında ürün kararını netleştir.
5. Eşleme tamamlanınca “Yazdır” menüsünün PDF ve DOCX üretim servisini geliştir; çevrimdışıyken yalnız uyarı göster.

Makine tarafından okunabilir kayıt: `form-mappings/ub-fr-38-r04.mapping.json`
