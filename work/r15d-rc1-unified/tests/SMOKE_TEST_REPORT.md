# R15D-rc1 smoke test kaydı

Tarih: 2026-08-10  
Canlı sistem değişikliği: Yok

## Otomatik statik kontroller

- Sonuç: 90 / 90 geçti
- `app.js` sözdizimi: Geçti
- `sw.js` sözdizimi: Geçti
- Kütüphane sayısı: 1018 toplam; doğrulanmış düzeltmeler uygulandı
- Migration: tarihsel `saha_kontrol` veya ana kütüphane satırı silen komut yok
- RLS/grant: checklist DELETE kapalı; anonim kütüphane/profil erişimi kapalı

## Yerel PostgreSQL migration provası

R15B benzeri şema ve örnek tarihsel kayıtlarla, tarayıcı taklidinden bağımsız bir PostgreSQL motorunda çalıştırıldı:

- İlk migration çalıştırması: Geçti
- Aynı migration'ın ikinci kez çalıştırılması: Geçti; veri ve not çoğaltmadı
- 52 başlık, 4 MR koşulu, MAD-0824 ve MAD-1010 düzeltmeleri: Doğrulandı
- Eski `Veri eksik` sonucu ve eski iş akışı kaydı: Kaybolmadan dönüştürüldü
- RLS policy ve tablo yetkileri: Beklenen sonuca geldi
- Mükerrer `denetim_id + madde_id` fixture'ı: Migration durdu ve transaction bütünüyle geri alındı

## Gerçek canlı yedek kopyası provası

- Canlıdaki 5 temel tablonun şema ve satırları salt okunur sorgularla ayrı JSON dosyalarına alındı.
- Satır sayıları: kütüphane 1.019, profil 6, denetim 1, checklist 0, bölüm sürümü 11.
- 110 kolon, 21 constraint, 10 index, 11 policy, 5 fonksiyon, 2 trigger ve grant envanteri kaydedildi.
- Bu gerçek envanter ve satırlarla geçici PostgreSQL kopyası kuruldu.
- Migration ilk ve ikinci çalıştırmada geçti; beş temel tablonun satır sayıları korundu.
- Mühendis, teknik müdür ve yönetici RLS davranışı doğrudan veritabanı seviyesinde doğrulandı.

## Gerçek tarayıcı smoke testi

- Görünüm: 390 × 844 mobil viewport
- Sayfa başlığı: AVES Saha Denetim
- Görünen sürüm: R15D-rc1
- Yatay taşma: Yok
- Konsol error/warning: Yok
- Giriş ekranı: Eksiksiz render edildi
- Service Worker hazırlığı: Sayfa çevrimiçiyken iki kez yüklendi
- Çevrimdışı yeniden açılış: Yerel HTTP sunucusu tamamen durdurulduktan sonra sayfa başarıyla yeniden yüklendi
- Çevrimdışı konsol error/warning: Yok

## Bu testin kapsamadığı alanlar

Gerçek kullanıcı parolası kullanılmadı ve canlı veriye yazılmadı. Giriş sonrası akış, yerel Supabase taklidiyle ayrıca sınandı.

## Yerel Supabase ile uçtan uca test

- 987 aktif maddelik kütüphane iki sayfada indirildi ve manifest/hash doğrulandı.
- 561 maddelik Modül G denetimi oluşturuldu.
- “Sahaya Hazırla” 561/561 maddeyi, 11/11 uygulama/görsel dosyasını ve yerel yazmayı doğruladı.
- API bağlantısı kesildikten sonra Uygun, Uygun Değil ve geçici “Erişim sağlanacak” kayıtları cihazda kaldı.
- Uygulama bağlantı yokken yeniden yüklendi ve son açık maddeye döndü.
- “Denetimi Bitir” geçici gözden geçirme işaretli ilk maddeye yönlendirdi.
- Bağlantı dönüşünde bekleyen cevaplar aktarıldı; cihaz ve sunucu “Bekleyen işlem yok” durumuna geldi.

Tam kapanış testi için Modül E profiliyle 42 maddelik ayrı denetim kullanıldı:

- 42/42 madde API bağlantısı kapalıyken sonuçlandırıldı.
- Kapanış özeti tüm cevapların cihazda olduğunu ve 42 işlemin aktarım beklediğini gösterdi.
- Denetim internet olmadan “Gözden Geçirme” aşamasına geçirildi; iş akışı kaydıyla birlikte 43 işlem korundu.
- Bağlantı geldiğinde 43 işlem gönderildi.
- Sunucu taklidinde 1 denetim, 42/42 checklist satırı, 42 denetçi-gördü kaydı ve `Gözden Geçirme` durumu doğrulandı.
- Son durum: `42 / 42`, `Cihaz ve sunucu eşit`, `Bekleyen işlem yok`.

## Uçtan uca testte bulunan ve düzeltilen kusurlar

1. Sunucuya ulaşmış kayıt sonrası denetim içi senkron sayacı eski kalabiliyordu. Senkron sonunda ekran yeniden hesaplanıyor.
2. Eşzamanlı arka plan ve manuel push, sürmekte olan gönderimi tamamlandı sayabiliyordu. Artık `pushRunning` durumunda pull başlatılmıyor.
3. Başarısız gönderim 1,8 saniyede sürekli deneniyordu. Artan bekleme süresi ve 60 saniye üst sınırı eklendi.
4. Sunucudan eksik/boş liste gelmesi yerel denetim veya checklist kümesini silebilirdi. Açık silme kaydı olmadan yerel kayıtlar artık birleşimde korunuyor.
5. Filtreli toplu görünümde bekleyen işlem sayacı her yerel yazımdan sonra anında yenileniyor.
6. Eski iş akışı constraint'i yeni `Çalışma Tamamlandı` değerinden önce kaldırılmadığı için geçiş durabiliyordu. Sıralama düzeltildi.
7. Profil okuma policy'si ikinci migration çalıştırmasında yeniden oluşturulurken çakışıyordu. Önce güvenle kaldırılıp yeniden kurulacak hale getirildi; MAD-1010 geçiş notunun yinelenmesi de engellendi.
8. Canlı Supabase'teki yetki politikalarının R12 değil R11 adında olduğu görüldü. Migration R11/R12/R15C eski kurallarının tamamını kaldıracak şekilde genişletildi ve R11 fixture'ıyla yeniden doğrulandı.
9. Canlı temel grant'lerin `anon` ve `authenticated` için SELECT/INSERT/UPDATE/DELETE yanında TRUNCATE/REFERENCES/TRIGGER yetkilerini de taşıdığı görüldü. Migration önce bütün temel yetkileri kaldırıp yalnız her tablonun ihtiyaç duyduğu işlemleri geri verecek şekilde daraltıldı.
10. Canlı `saha_kontrol` tablosunda `denetim_id + madde_id` unique constraint'i zaten vardı. Migration artık aynı kolon kümesini herhangi bir adla benzersiz yapan index/constraint'i tanır ve gereksiz ikinci unique index oluşturmaz.
11. İki cihaz aynı satır için sunucuda `409` çakışması üretirse işlem artık sık yeniden deneme döngüsüne girmez. Yerel cevap `conflict` durumunda korunur ve kullanıcıya çakışma incelemesi gerektiği gösterilir.

## Hâlâ gerçek ortamda doğrulanacaklar

- Gerçek Supabase kullanıcı oturumu ve RLS politikaları
- Yüzlerce bekleyen değişikliğin düşük hızlı gerçek ağda aktarımı
- Oturum süresi dolması ve token yenileme
- İki cihazda aynı maddeyi değiştirme/çakışma protokolü
- Depolama kotası dolu cihaz davranışı
- Fiziksel Android/iOS cihazda uzun süreli saha kullanımı
