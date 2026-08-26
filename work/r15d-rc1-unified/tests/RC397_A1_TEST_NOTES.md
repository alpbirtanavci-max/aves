# R15D-rc3.9.7-a1 ekran fotoğrafı denetimi — test notu

Bu dal canlı sürüm değildir. Kullanıcının telefon denetimindeki ilk onaylanmış
içerik ve arayüz düzeltme grubunu bağımsız test etmek için hazırlanmıştır.

## Kontrol edilecekler

1. `tests/r15d-static-test.mjs` bütün kontrolleri geçmelidir.
2. Kabin tipi maddesinde Tip 1–5 çizelgesi mobil ekranda okunmalıdır; 800 kg için
   yalnız beyan yükünden tip çıkarılmadığı açıkça görünmelidir.
3. 81-71 Kategori 1/2 geçen maddelerde ortak kategori çizelgesi açılmalıdır.
4. MAD-0961, MAD-0962 ve MAD-0964 üzerinde kumanda paneli konumu sayı alanı
   yerine `Girişte sağ / Girişte sol / Arka duvar` seçimi olmalıdır.
5. İnceleme Modu düğmesi iPhone/Safari dokunuşundan sonra kırmızı renkte
   takılı kalmamalıdır.
6. MAD-0389, MAD-0390, MAD-0394 ve MAD-0404 MR/ MRL ayrımı nedeniyle otomatik
   Uygulanmaz olmamalıdır.
7. MAD-0411 MR, MAD-0434 MRL taşıma maddesi olarak ayrılmalıdır.
8. IMG_9871–IMG_9880 için kaldırılması onaylanan saha rehberleri görünmemelidir.
9. `database/59_r15d_rc397_ekran_fotografi_denetimi_1.sql` geçmiş
   `saha_kontrol` kayıtlarını değiştirmemeli veya silmemelidir.

## Beklenen sürüm

- Ekran: `R15D-RC3.9.7-A1`
- Uygulama: `R15D-rc3.9.7-a1`
- Service Worker cache: `aves-saha-r15d-rc397a1`
