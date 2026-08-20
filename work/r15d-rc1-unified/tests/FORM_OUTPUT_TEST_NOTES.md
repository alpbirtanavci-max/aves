# R15D-rc3.9 resmî form çıktısı — test notu

## Kapsam

- Tamamlanmış denetimde **Yazdır** düğmesi görünür.
- Düğme, denetimin ana standardına göre otomatik olarak yalnız doğru resmî formu seçer:
  - TS EN 81-20 → ÜB.FR.38 R.04
  - TS EN 81-1/2+A3 → ÜB.FR.39 R.02
- Kullanıcıya ek standart veya form seçtirilmez.
- PDF ve Word çıktısı yalnız çevrimiçiyken alınır.
- Denetim oluşturulurken form kodu, revizyonu, şablon ve eşleme SHA-256 değerleri denetime kilitlenir. Yeni bir form revizyonu geçmiş denetimin çıktısını değiştirmez.

## Veritabanı sırası

Canlıya geçişte ve yedek/ön kontrol sonrasında sırasıyla:

1. `database/44_r15d_rc39_form_cikti_snapshot.sql`
2. `database/45_r15d_rc39_form_adlandirilmis_olculer.sql`

İki dosya da kayıt silmez. İkinci migration yalnız MAD-0008A ve MAD-0008D satırlarına resmî temel kuyu tablosunda eksik kalan dört ölçüm alanını idempotent olarak ekler; başlamış denetimlerin `saha_kontrol` cevaplarını değiştirmez.

## Otomatik doğrulama

```text
node tests/r15d-static-test.mjs
node tests/form-output-browser-test.mjs
```

Tarayıcı testi iki resmî şablondan da gerçek PDF ve DOCX üretir. Beklenen sonuç:

- tarayıcı hatası: 0
- FR.38 PDF: 40 sayfa
- FR.39 PDF: 22 sayfa
- DOCX dosyaları Word/OpenXML ile açılabilir
- müşteri, denetçi, temel bilgiler, ön kontrol, checklist sonuçları, ölçümler, açıklamalar ve ekipman seri numaraları hedef hücrelerde bulunur

## Elle smoke testi

1. Tamamlanmış bir TS EN 81-20 denetimini açın; **Yazdır** düğmesine basın.
2. PDF ve Word seçeneklerini ayrı ayrı indirin.
3. Üst bilgiler, ön kontrol, temel kuyu ölçüleri, ekipman seri numaraları ve en az bir checklist sonucunu kontrol edin.
4. Aynı işlemi TS EN 81-1/2+A3 denetiminde tekrarlayın.
5. Tarayıcıyı çevrimdışı yapıp Yazdır'a basın; dosya üretilmemeli ve “Bu özellik yalnız çevrimiçiyken kullanılabilir. Denetim kaydınız cihazda korunuyor.” uyarısı görünmelidir.
