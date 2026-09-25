# AVES saha kanıt planı — çalışma brifi

## Kaynak ve statü

Kullanıcı tarafından eklenen `IMG_0240.JPEG` ve `IMG_0241.JPEG` içindeki saha çalışma
notları incelendi. Bu görsellerin doküman kodu, revizyonu, onay durumu ve yürürlük
bilgisi doğrulanmadığı için içerik **kontrollü taslak / saha rehberi adayı** olarak
ele alınır; mevzuat, standart veya resmi uygunluk maddesi olarak yayımlanmaz.

Fotoğraflardaki ölçü ve seri numarası yoğun saha yaklaşımı Modül B, E ve H1
denetimleriyle ilişkilendirildi. Bu PR'deki saha rehberi yalnız Modül G formunda
kullanılacak; ölçüm eşleştirme
sekmesi bu akışta gösterilmeyecek. AVES'teki mevcut B/E/H1 denetim akışları
korunacak; bu modüller için gereken yoğun ölçü ve seri numarası kapsamı ayrı
tasarlanacak. El yazısı değerler şablon
değeri, eşik veya otomatik sonuç olarak hiçbir modüle aktarılmayacaktır.

## İstenen çıktı

1. Mevcut fotoğraf kategori rehberlerini dokümandaki asgari görsel kanıt başlıklarıyla
   eşleştirmek ve eksik kalan açık noktaları rehber metinlerinde görünür kılmak.
2. Seri numarası kayıt ekranında etiket/seri numarası girişini ve ilgili etiket
   fotoğraflarının yerini açıklamak.
3. Fotoğraf ekranında videoların AVES'e yüklenmediğini koruyarak, harici video
   kayıt planını ayrı ve açık bir rehber olarak göstermek.
4. Denetim başladıktan sonra aktif denetim ekranının üstünde saha güvenliği
   hatırlatmasını göstermek; şirketin onaylı prosedürünün yerini almadığını belirtmek.
5. Modül G formunun kapsamını korumak; fotoğraflardaki yoğun ölçü/seri no
   gereksinimlerini Modül B/E/H1 için ayrı çalışma olarak ele almak.
6. Kaynağın statüsünü kullanıcıya görünür tutmak; yeni resmi checklist sonucu,
   otomatik eşik veya RLS/DB değişikliği yapmamak.

## Kapsam dışı

- Görsellerdeki el yazısı değerleri veri kütüphanesine eklemek.
- Modül G akışına saha ölçüm eşleştirme sekmesi eklemek.
- B/E/H1 denetimleri için ayrı ölçüm veya seri no alanları tasarlamak (ayrı kapsam).
- Video dosyası yükleme/arşivleme altyapısı.
- Video çekiminde otomatik çözünürlük düşürme veya sıkıştırma.
- Teknik standart hükmü veya otomatik uygunluk kararı üretmek.
- Canlı Supabase/Cloudflare değişikliği.

## Test beklentisi

- `node work/r15d-rc1-unified/tests/r15d-static-test.mjs` yeşil.
- Dört sürüm dosyası birlikte güncellenecek.
- Ölçüm sekmesinin Modül G'den kaldırıldığını; B/E/H1 kapsam ayrımının ve seri no,
  video, güvenlik hatırlatmalarının doğru ekranlarda bulunduğunu statik test doğrulayacak.
