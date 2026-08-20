# ÜB.FR.38 R.04 Ölçüm Eşleme Raporu

Durum: Tamamlandı. Ölçüm aktarımı, doğrulanmış checklist satır eşlemesine bağlandı; canlı uygulama ve Supabase değiştirilmedi.

## Kapsam

- Ölçüm alanı bulunan form satırı: 294
- Yapılandırılmış ölçüm satırı: 37
- Yapılandırılmış ölçüm alanı: 97
- Eski tip ölçüm satırı: 257
- Çözümlenmemiş ölçüm satırı: 0

Bu sayıya her iki ana formun ortak Temel Kuyu Tasarım Ölçüleri kayıtları olan `MAD-0008B` ve `MAD-0008D` dahildir. Bu iki kayıt checklist sonuç satırı olarak değil, formun adlandırılmış üst ölçüm alanlarına aktarılır.

## Aktarım kuralı

Her ölçüm, aynı `madde_id` için doğrulanmış ÜB.FR.38 satırının `ÖLÇÜLEN DEĞER` hücresine gider.

- Yapılandırılmış değer kaynağı: `saha_kontrol.olcum_degerleri.<ölçüm_id>`
- Eski birinci değer kaynağı: `saha_kontrol.olcu1_degeri`
- Eski ikinci değer kaynağı: `saha_kontrol.olcu2_degeri`
- Birden fazla yapılandırılmış değer varsa her biri etiketi ve birimiyle ayrı satırda yazılır.
- Kaydedilmiş değer yoksa resmî form hücresi boş bırakılır.
- Birim otomatik dönüştürülmez.
- Sonuç durumu ölçümden yeniden hesaplanmaz; denetçinin kilitli `Uygun / Uygun Değil / Uygulanmaz` sonucu aynen aktarılır.

## Eski alanlar için güvenlik kararı

Eski kütüphane satırlarının önemli bir bölümünde alan adı yalnız `Ölçülen değer` veya `Ölçü 1/Ölçü 2` biçimindedir. Çıktı üreticisi bunlara kendi teknik anlamını vermeyecek. Değer varsa yalnız aynı resmî satırın ölçüm hücresine taşıyacak; değer yoksa boş bırakacaktır.

Bu yaklaşım sessiz yanlış eşleştirmeyi önler. Eski alanların daha açıklayıcı hâle getirilmesi ayrı bir kütüphane iyileştirme çalışmasıdır ve geçmiş denetimlerin kayıt yapısını değiştirmez.

## Açıkça kapsam dışı

Kullanıcının ürün kararı gereği aşağıdakiler oluşturulmaz ve takip edilmez:

- ölçüm cihazı envanteri,
- cihaz seri numarası,
- kalibrasyon tarihi,
- kalibrasyon belgesi takibi.

Makine tarafından okunabilir kayıt: `form-mappings/ub-fr-38-r04.measurement-mapping.json`
