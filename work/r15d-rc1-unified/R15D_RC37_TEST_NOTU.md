# AVES Saha R15D-rc3.7 TEST

Bu sürüm canlı yayın değildir. Kullanıcı görünürlüğü, tamamlanmış denetim açılışı,
Modül G takip denetimi ve izlenebilir düzeltme akışını doğrulamak için hazırlanmıştır.

## Uygulanan kararlar

- Mühendis yalnız kendi oluşturduğu denetimleri, bunların maddelerini ve geçmişini görür.
- Yönetici ve teknik müdür tüm denetimleri görür.
- Teknik müdür yeni denetim oluşturamaz ve kütüphane/sistem yönetemez.
- Tamamlanmış denetim açılırken önce `İnceleme` seçilir; yalnız Modül G ve yetkili
  kullanıcı için ayrıca `Takip Denetimi` seçeneği gösterilir.
- Takip denetimi önceki kaydı değiştirmez. Yeni denetim T1/T2 zinciriyle bağlanır,
  önceki cevaplar referans olarak gösterilir ve güncel cevaplar yeniden girilir.
- Tamamlanmış denetimi düzeltmeye açmak için neden seçilir. Kullanıcı, rol, zaman,
  madde, eski değer ve yeni değer değişiklik geçmişinde korunur.
- Teknik müdürün yaptığı düzeltme de aynı geçmiş mekanizmasına tabidir.
- Denetim listesine müşteri/adres/seri/dosya araması ve kesin tarih filtresi eklenmiştir.

## Veritabanı ön koşulu

Uygulama testinden önce `database/42_r15d_rc37_yetki_takip_duzeltme.sql` test
Supabase projesinde çalıştırılmalıdır. Canlı projede ön kontrol ve yedek alınmadan
çalıştırılmamalıdır. Migration mevcut denetim veya cevap satırlarını silmez ve toplu
olarak değiştirmez.

## Claude Code test senaryoları

1. Bir mühendis hesabıyla giriş yap; başka mühendislerin denetimlerinin listede ve
   doğrudan REST sorgusunda görünmediğini doğrula.
2. Yönetici ve teknik müdür hesabıyla tüm denetimlerin ve denetçi adlarının
   göründüğünü doğrula.
3. Teknik müdür hesabında `Yeni denetim` düğmesinin bulunmadığını ve doğrudan INSERT
   isteğinin RLS tarafından reddedildiğini doğrula.
4. Tamamlanmış Modül E/H1 denetiminde yalnız `İnceleme`, tamamlanmış Modül G
   denetiminde `İnceleme` ve `Takip Denetimi` seçeneklerini doğrula.
5. Modül G takip denetimi oluştur; eski denetimin hash, sonuç ve tarihinin
   değişmediğini, yeni kaydın T1 olarak bağlandığını doğrula.
6. Takip denetimindeki `Önceki Uygun Değil` filtresini ve madde üzerindeki önceki
   sonuç/açıklama kutusunu doğrula. Yeni sonuç verilmeden eski sonucun güncel sonuç
   sayılmadığını kontrol et.
7. Mühendis, teknik müdür ve yönetici ile ayrı ayrı tamamlanmış denetimi düzeltmeye
   aç; neden seçiminin zorunlu olduğunu ve değişiklik geçmişinde doğru kişinin
   göründüğünü doğrula.
8. İnceleme sırasında hiçbir alanın sunucuya yazılmadığını doğrula.
9. İki kullanıcı aynı anda yalnızca denetim listesini/geçmişi görüntülerken outbox
   veya `updated_at` değişikliği oluşmadığını kontrol et.
10. İnternet kesikken açık bir düzeltmenin cihazda kalmasını, bağlantı geldiğinde
    geçmiş olayıyla birlikte aktarılmasını doğrula.
11. Bağlı takip denetimi bulunan ana denetimin silinemediğini doğrula.

## Otomatik kontrol

`tests/r15d-static-test.mjs` sözdizimi ve statik güvenlik/regresyon kontrollerini
çalıştırır. Test verisi olarak gerçek saha kayıtları yerine yapay denetimler
kullanılmalıdır.
