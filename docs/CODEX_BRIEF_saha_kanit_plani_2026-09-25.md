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
2. Seri numarası kayıt ekranında etiket/seri numarası girişini ve ilgili etiket
   fotoğraflarının yerini açıklamak.
3. Fotoğraf ekranında videoların AVES'e yüklenmediğini koruyarak, harici video
   kayıt planını ayrı ve açık bir rehber olarak göstermek.
4. Denetim başladıktan sonra aktif denetim ekranının üstünde saha güvenliği
   hatırlatmasını göstermek; şirketin onaylı prosedürünün yerini almadığını belirtmek.
5. Proje/saha ölçülerinin mevcut `Saha Ölçümü` maddelerinde kaydedilmesi gerektiğini
   hatırlatan, otomatik uygunluk sonucu üretmeyen bir ölçüm-eşleştirme rehberi eklemek.
6. Kaynağın statüsünü kullanıcıya görünür tutmak; yeni resmi checklist sonucu,
   otomatik eşik veya RLS/DB değişikliği yapmamak.

## Kapsam dışı

- Görsellerdeki el yazısı değerleri veri kütüphanesine eklemek.
- Video dosyası yükleme/arşivleme altyapısı.
- Video çekiminde otomatik çözünürlük düşürme veya sıkıştırma.
- Teknik standart hükmü veya otomatik uygunluk kararı üretmek.
- Canlı Supabase/Cloudflare değişikliği.

## Test beklentisi

- `node work/r15d-rc1-unified/tests/r15d-static-test.mjs` yeşil.
- Dört sürüm dosyası birlikte güncellenecek.
- Ölçüm rehberinin kontrollü taslak olduğunu; seri no, video ve güvenlik
  hatırlatmalarının istenen ekranlarda bulunduğunu statik test doğrulayacak.
