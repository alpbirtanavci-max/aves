# ÜB.FR.39 R.02 Ölçüm Eşleme Raporu

Durum: Tamamlandı. Ölçüm aktarımı doğrulanmış ÜB.FR.39 checklist ve üst ölçüm tablosu eşlemelerine bağlandı; canlı uygulama ve Supabase değiştirilmedi.

## Kapsam

- Ölçüm alanı bulunan kayıt: 81
- Yapılandırılmış ölçüm satırı: 4
- Yapılandırılmış ölçüm alanı: 13
- Eski tip ölçüm satırı: 77
- Ortak ÜB.FR.38/ÜB.FR.39 ölçüm bloğu kaydı: 2
- Çözümlenmemiş ölçüm kaydı: 0
- Resmî formda hedefi olmadığı için düzeltilen alan: 4 (bkz. "Sonradan düzeltilen eşleme hatası")

## Aktarım kuralları

- Yapılandırılmış değerler `saha_kontrol.olcum_degerleri.<ölçüm_id>` alanından alınır.
- Eski değerler `saha_kontrol.olcu1_degeri` ve `olcu2_degeri` alanlarından alınır.
- `MAD-0008E`, `MAD-0008B` ve `MAD-0008D` resmî formun Temel Kuyu Tasarım Ölçüleri tablosundaki adlandırılmış alanlara gider.
- Diğer ölçümler aynı doğrulanmış form satırındaki `SAHA ÖLÇÜM DEĞERİ` hücresine gider.
- Değer yoksa hücre boş kalır; birim dönüşümü veya teknik anlam tahmini yapılmaz.
- Denetçinin sonuç kararı ölçümden yeniden hesaplanmaz.

## Kapsam dışı

Kullanıcının ürün kararı gereği ölçüm cihazı envanteri, cihaz seri numarası, kalibrasyon tarihi ve kalibrasyon belgesi takibi yapılmaz.

## Sonradan düzeltilen eşleme hatası (20.08.2026)

`MAD-0008B`'nin `kabin_karsi_agirlik_ray_arasi`, `kabin_ray_kesit_olcusu`, `karsi_agirlik_ray_kesit_olcusu` alanları ile `MAD-0008D`'nin `kat_kapisi_yangin_sinifi` alanı önceden "doğrulandı" işaretlenmişti, ama resmî ÜB.FR.39 R.02 şablonunun "TEMEL KUYU TASARIM ÖLÇÜLERİ" tablosu (`word/document.xml`) doğrudan incelendiğinde bu alanlar için hiçbir hücre olmadığı görüldü — aynı hata ÜB.FR.38 tarafında da vardı, ayrıntı için `UB_FR_38_R04_OLCUM_ESLEME_RAPORU.md`'ye bakınız. `form-output.js` kodunda bir hata yoktu; eşleme belgelendirmesi düzeltildi, bu 4 alan artık `mapping_status: "no_destination_on_official_form"` ile ayrıca işaretli.

Makine tarafından okunabilir kayıt: `form-mappings/ub-fr-39-r02.measurement-mapping.json`
