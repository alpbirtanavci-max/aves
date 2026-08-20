# AVES Saha — Form Çıktısı Envanteri ve Tasarım Kararları

Tarih: 20.08.2026

Bu belge, AVES Saha denetim kayıtlarından resmî ÜB.FR formlarına PDF ve DOCX
çıktısı üretme çalışmasının kontrollü başlangıç envanteridir. Google Drive'daki
kaynak dosyalar değiştirilmeden incelenmiştir.

## Kesinleşen ürün kararları

- Tamamlanmış denetimde `Yazdır` düğmesi bulunacak.
- Düğme; resmî form, uygunsuzluk raporu, denetim özeti ve seri numarası listesi
  seçeneklerini açacak.
- Değişiklik geçmişi şimdilik çıktı seçenekleri arasında olmayacak.
- Öncelikli biçimler PDF ve DOCX olacak.
- Çıktı yalnız çevrimiçiyken üretilecek. Çevrimdışıyken kullanıcıya
  `Bu özellik yalnız çevrimiçiyken kullanılabilir. Denetim kaydınız cihazda korunuyor.`
  uyarısı gösterilecek.
- Form revizyonu denetim kaydına sabitlenecek; yeni şablon veya revizyon geçmiş
  denetimin çıktısını değiştirmeyecek.
- Kullanıcıdan “ek standart” seçmesi istenmeyecek. Üretilecek form seti denetim
  profili, asansör konfigürasyonu ve checklistte bulunan maddelerden belirlenecek.
- ÜB.FR.61 kalibrasyon formu bu uygulamanın çıktı kapsamına alınmayacak.

## Otorite sırası

1. **ÜB.LS.01 Ana Doküman Listesi R.01 — güncelleme 25.03.2026:** yürürlük ve
   revizyon bilgisinin otoritesidir.
2. **ÜB.TB.05 Modüllere Göre Denetim Dosya Seti Tablosu R.02 — 31.03.2026:**
   forma hangi modül dosyasında ihtiyaç duyulduğunun otoritesidir.
3. **`revizelere ait güncel pdf ler` klasöründeki PDF:** yayımlanmış resmî görünümün
   ve sayfa düzeninin otoritesidir.
4. Aynı kod ve revizyondaki DOCX: doldurulabilir çıktı şablonu adayıdır; PDF ile
   karşılaştırılmadan üretim şablonu kabul edilmez.

Drive'da aynı dosyanın modül setlerinde ve arşiv klasörlerinde çok sayıda kopyası
bulunmaktadır. Dosya değiştirilme tarihi tek başına güncel revizyon kanıtı değildir.

### Belge kontrol uyuşmazlığı

Ana Doküman Listesi satırında ÜB.TB.05 için `R.01 / 24.12.2025` görünürken,
Drive'daki ÜB.TB.05 dosyasının kendi başlığında `R.02 / 31.03.2026` yazmaktadır.
R.02 dosyası bu envanterde çalışma kaynağı olarak kullanılmıştır; ancak bu fark
resmî doküman kontrolünde doğrulanmadan uygulamaya değişmez kural olarak
sabitlenmemelidir.

## Checklist verisinden doğrudan beslenebilecek yürürlükteki formlar

| Kod | Güncel revizyon | Amaç | İlk değerlendirme |
|---|---:|---|---|
| ÜB.FR.38 | R.04 | TS EN 81-20 test kontrol formu | Birinci pilot; doğrudan checklist çıktısı |
| ÜB.FR.39 | R.02 | TS EN 81-1/2+A3 test kontrol formu | Eski standart grubundaki denetimler |
| ÜB.FR.40 | R.04 | TS EN 81-72 itfaiyeci asansörü | İtfaiyeci asansörü konfigürasyonundan otomatik |
| ÜB.FR.41 | R.04 | TS EN 81-71 tahribata dayanıklılık | İlgili maddelerden ve uygulanabilirlikten otomatik |
| ÜB.FR.42 | R.04 | TS EN 81-73 yangın anında davranış | İlgili maddelerden ve uygulanabilirlikten otomatik |
| ÜB.FR.43 | R.04 | TS EN 81-70 erişilebilirlik | İlgili maddelerden ve uygulanabilirlikten otomatik |
| ÜB.FR.57 | R.03 | TS EN 81-22 eğik düzlem | İlgili denetim içeriği varsa otomatik |
| ÜB.FR.58 | R.01 | TS EN 81-77 sismik durumlar | İlgili denetim içeriği varsa otomatik |
| ÜB.FR.62 | R.03 | TS EN 81-28 uzaktan alarm | Checklistte doğrulanmış karşılıklar ölçüsünde |
| ÜB.FR.63 | R.04 | TS EN 81-21 mevcut binada yeni asansör | İlgili denetim içeriği varsa otomatik |
| ÜB.FR.65 | R.00 | Teknik dosya–saha eşleşme formu | Ayrı eşleme çalışması gerektirir |

## İkinci aşamada değerlendirilecek form ve raporlar

| Kod | Güncel revizyon | Kapsam notu |
|---|---:|---|
| ÜB.FR.34 | R.01 | Teknik dosya değerlendirme; saha checklistinden tamamen beslenmez |
| ÜB.FR.35 | R.01 | Tasarım hesapları kontrolü; ayrı veri kaynağı gerektirir |
| ÜB.FR.37 | R.00 | Beyan ve tip sertifikası kontrolü |
| ÜB.FR.50 | R.01 | Yönetmelik Ek-I gerekleri |
| ÜB.FR.53 | R.00 | Takip muayene kontrol formu; yalnız Modül G takip akışıyla ele alınmalı |
| ÜB.RP.06 | R.00 | Uygunsuzluk raporu; `Uygun Değil` sonuçlarından üretilebilir |
| ÜB.RP.15 | R.01 | Modül G sonuç raporu; denetim özeti için resmî aday |

ÜB.FR.47, ÜB.FR.48 ve ÜB.FR.51 tasarım doğrulama Excel dosyalarıdır. İlk PDF/DOCX
çıktı kapsamına alınmayacaktır.

## ÜB.FR.38 R.04 pilot yapısı

Resmî PDF 40 sayfadır. DOCX ve yayımlanmış PDF üzerinde şu ana bölümler doğrulandı:

1. İş dosyası bilgileri
2. Uygulanabilir standartlar
3. Belgelendirme ve modül kapsamı
4. Muayene öncesi saha hazırlıkları
5. Monte edilen asansörün temel bilgileri
6. Güvenlik bileşenleri ve seri numaraları
7. Tahrik sistemi bilgileri
8. Temel kuyu tasarım ölçüleri
9. Muayenede kullanılan cihaz bilgileri
10. TS EN 81-20 saha test ve kontrol kriterleri

Uygulamadaki müşteri, adres, tarih, dosya numarası, denetçi, tahrik tipi, MR/MRL,
beyan yükü, hız, kapasite, checklist sonuçları, açıklamalar, ölçümler ve ekipman seri
numaraları eşleme adayıdır.

Uygulamada tutulmayan alanlar tahmin edilerek doldurulmayacaktır. Ölçüm cihazı ve
kalibrasyon bilgileri uygulama kapsamı dışında kalacak; ilgili resmî form alanları
otomatik doldurulmayacaktır.

## Eşleme kayıt yapısı

Her satır eşlemesi aşağıdaki alanlarla tanımlanmalıdır:

| Alan | Açıklama |
|---|---|
| form_kodu | Örneğin `ÜB.FR.38` |
| form_revizyonu | Örneğin `04` |
| form_satiri | Resmî formdaki sabit satır/alan kimliği |
| madde_id_listesi | Satırı besleyen bir veya daha fazla AVES `MAD-xxxx` kimliği |
| sonuc_kurali | Tekil sonuç veya çoklu madde birleştirme kuralı |
| aciklama_kurali | Hangi not/bulgunun hangi alana yazılacağı |
| olcum_kurali | Uygulamada gerçekten bulunan ölçüm alanı |
| uygulanabilirlik | Konfigürasyon ve denetim profili koşulu |
| kaynak_dogrulama | Form satırı ile checklist maddesinin doğrulama dayanağı |
| durum | taslak / doğrulandı / onaylandı |

Bir form satırı birden fazla checklist maddesinden besleniyorsa sonuç kuralı açıkça
yazılacak; metin benzerliğine dayalı otomatik eşleme yapılmayacaktır.

## Revizyon kilidi için veri modeli

Denetim başlatılırken aşağıdaki bilgiler snapshot olarak saklanmalıdır:

- form kodu
- form revizyonu
- şablon kimliği ve dosya hash'i
- eşleme sürümü ve hash'i
- yürürlük tarihi

Çıktı üretim servisi “bugünkü şablonu” değil, denetimde kayıtlı şablon kimliğini
kullanmalıdır. Yeni revizyon yalnız yeni başlatılan denetimlere uygulanmalıdır.

## Yazdır düğmesi davranışı

Tamamlanmış denetimde `Yazdır` düğmesi aşağıdaki menüyü açar:

- Resmî kontrol formu/formları — PDF
- Resmî kontrol formu/formları — DOCX
- Uygunsuzluk raporu — PDF/DOCX
- Denetim özeti — PDF/DOCX
- Seri numarası listesi — PDF/DOCX

Sistem, denetimden otomatik belirlenen uygulanabilir formları kullanıcıya gösterir;
kullanıcıya teknik standart seçimi yaptırmaz.

## Sıradaki çalışma

1. ÜB.FR.38 R.04 DOCX ile resmî PDF'in alan ve satır kimliklerini karşılaştır.
2. Uygulamanın denetim alanları ile formun ilk iki sayfası için veri eşlemesini çıkar.
3. Formun kontrol satırlarını `MAD-xxxx` kimlikleriyle tek tek eşle.
4. Çoklu madde birleşim kurallarını ayrı inceleme listesine al.
5. Eşleme doğrulandıktan sonra çevrimiçi PDF/DOCX pilot üretimini geliştir.
