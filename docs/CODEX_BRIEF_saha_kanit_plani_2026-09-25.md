# AVES saha kanıt planı — çalışma brifi

## Kaynak ve statü

Kullanıcı tarafından eklenen `IMG_0240.JPEG` ve `IMG_0241.JPEG` içindeki saha çalışma
notları incelendi. Bu görsellerin doküman kodu, revizyonu, onay durumu ve yürürlük
bilgisi doğrulanmadığı için içerik **kontrollü taslak / saha rehberi adayı** olarak
ele alınır; mevzuat, standart veya resmi uygunluk maddesi olarak yayımlanmaz.

Fotoğraflardaki el yazısı asansöre özgü ölçü ve kapasite notlarıdır; şablon değeri,
eşik veya otomatik sonuç olarak uygulamaya aktarılmayacaktır.

## İstenen çıktı

1. Mevcut fotoğraf kategori rehberlerini dokümandaki asgari görsel kanıt başlıklarıyla
   eşleştirmek ve eksik kalan açık noktaları rehber metinlerinde görünür kılmak.
2. Fotoğraf ekranında videoların uygulama içinden yüklenmediğini koruyarak, harici
   video kayıt planını ayrı ve açık bir rehber olarak göstermek.
3. Proje/saha ölçülerinin mevcut `Saha Ölçümü` maddelerinde kaydedilmesi gerektiğini
   hatırlatan, otomatik uygunluk sonucu üretmeyen bir ölçüm-eşleştirme rehberi eklemek.
4. Kaynağın statüsünü kullanıcıya görünür tutmak; yeni resmi checklist sonucu,
   otomatik eşik veya RLS/DB değişikliği yapmamak.

## Kapsam dışı

- Görsellerdeki el yazısı değerleri veri kütüphanesine eklemek.
- Video dosyası yükleme/arşivleme altyapısı.
- Teknik standart hükmü veya otomatik uygunluk kararı üretmek.
- Canlı Supabase/Cloudflare değişikliği.

## Test beklentisi

- `node work/r15d-rc1-unified/tests/r15d-static-test.mjs` yeşil.
- Dört sürüm dosyası birlikte güncellenecek.
- Rehber metninin kontrollü taslak olduğunu ve video planının fotoğraf yükleme
  akışından ayrı tutulduğunu statik test doğrulayacak.
