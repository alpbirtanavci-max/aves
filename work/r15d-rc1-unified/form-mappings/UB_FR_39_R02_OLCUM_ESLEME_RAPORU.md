# ÜB.FR.39 R.02 Ölçüm Eşleme Raporu

Durum: Tamamlandı. Ölçüm aktarımı doğrulanmış ÜB.FR.39 checklist ve üst ölçüm tablosu eşlemelerine bağlandı; canlı uygulama ve Supabase değiştirilmedi.

## Kapsam

- Ölçüm alanı bulunan kayıt: 81
- Yapılandırılmış ölçüm satırı: 4
- Yapılandırılmış ölçüm alanı: 17
- Eski tip ölçüm satırı: 77
- Ortak ÜB.FR.38/ÜB.FR.39 ölçüm bloğu kaydı: 2
- Çözümlenmemiş ölçüm kaydı: 0

## Aktarım kuralları

- Yapılandırılmış değerler `saha_kontrol.olcum_degerleri.<ölçüm_id>` alanından alınır.
- Eski değerler `saha_kontrol.olcu1_degeri` ve `olcu2_degeri` alanlarından alınır.
- `MAD-0008E`, `MAD-0008B` ve `MAD-0008D` resmî formun Temel Kuyu Tasarım Ölçüleri tablosundaki adlandırılmış alanlara gider.
- Diğer ölçümler aynı doğrulanmış form satırındaki `SAHA ÖLÇÜM DEĞERİ` hücresine gider.
- Değer yoksa hücre boş kalır; birim dönüşümü veya teknik anlam tahmini yapılmaz.
- Denetçinin sonuç kararı ölçümden yeniden hesaplanmaz.

## Kapsam dışı

Kullanıcının ürün kararı gereği ölçüm cihazı envanteri, cihaz seri numarası, kalibrasyon tarihi ve kalibrasyon belgesi takibi yapılmaz.

Makine tarafından okunabilir kayıt: `form-mappings/ub-fr-39-r02.measurement-mapping.json`
