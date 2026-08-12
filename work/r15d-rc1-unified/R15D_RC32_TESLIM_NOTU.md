# AVES Saha R15D-rc3.2 — teslim ve güvenli kurulum notu

## Bu revizyonda uygulanan kararlar

- Denetim başladığı anda seçili checklist metinleri, rehberleri, koşulları, ölçüm tanımları ve görsel referansları tarihsel snapshot olarak kilitlenir.
- Sonraki kütüphane değişiklikleri başlamış denetimin metnini değiştirmez veya pasifleştirilen maddeyi denetimden düşürmez.
- Seçili madde kümesi ve içerik için SHA-256 parmak izleri saklanır.
- Denetim kapanışında sonuç sayıları, cevaplar, ölçümler, kullanıcılar ve snapshot parmak izlerinden bütünlük özeti oluşturulur.
- Mühendis yalnız kendi denetimini oluşturur/düzenler; yönetici düzenleyebilir; teknik müdür salt okunur inceler ve yalnız bütün denetimi silebilir.
- Teknik müdür yeni denetim oluşturamaz, iş akışı durumunu değiştiremez, denetimi yeniden açamaz ve checklist cevabı yazamaz.
- Oluşturma ve değişiklik olaylarında kişinin adı, e-postası, rolü, cihaz kimliği, uygulama sürümü ve zaman kaydedilir. Bu kimlik alanları sunucuda aktif kullanıcı profilinden yeniden yazılır.
- Denetim silme olayı istemcinin beyanına değil gerçek veritabanı DELETE işlemine bağlı sunucu tetikleyicisiyle kaydedilir.
- İnceleme Modu salt okunurdur; tüm maddeler aranabilir ve sonuç/not/ölçüm durumuna göre filtrelenebilir. Bir maddeye geçildiğinde uygulama salt okunur kalır.
- Denetim listesinde ve denetim başlığında “Çevrimdışı çalışmaya hazır / hazır değil” durumu açıkça gösterilir. Hazırlık denetime genel değil cihaz bazlıdır; farklı cihazda veya uygulama sürümü değiştiğinde yeniden doğrulama gerekir.
- Eğitim ve teknik onay akışları eklenmemiştir.

## Güvenli kurulum sırası

1. Canlı Supabase projesinin şema ve veri yedeğini alın.
2. `database/01_r15d_rc32_kurulum_kontrol.sql` dosyasını çalıştırıp öncesi çıktılarını saklayın.
3. `database/28_r15d_rc32_snapshot_inceleme_yetki.sql` migration dosyasını tek transaction olarak çalıştırın.
4. `database/01_r15d_rc32_kurulum_kontrol.sql` dosyasını yeniden çalıştırıp sütun, RLS, tetikleyici, yetki ve kayıt sayılarını karşılaştırın.
5. Bir mühendis ve bir teknik müdür test hesabıyla rol matrisini doğrulayın.
6. Veritabanı kontrolleri geçmeden `app/` paketini production alan adına yayımlamayın.
7. Yayından sonra temiz tarayıcıda ve daha önce AVES kullanmış bir cihazda service worker güncellemesini ayrı ayrı doğrulayın.

## Zorunlu smoke testler

- Mühendis çevrimdışıyken yeni denetimi açabilmeli, cevap verebilmeli, bölümleri tamamlayabilmeli ve çalışma sonunda kayıtlar cihazda kalmalıdır.
- Bağlantı geldiğinde outbox sırası bozulmadan önce denetim/madde kayıtları, sonra geçmiş olayları aktarılmalıdır.
- Teknik müdür tüm denetimleri ve İnceleme Modu'nu görebilmeli; yeni denetim, cevap değişikliği ve yeniden açma işlemleri hem ekranda bulunmamalı hem REST/RLS düzeyinde 403 dönmelidir.
- Teknik müdür bütün denetimi silebilmeli ve silme olayı `denetim_degisim_gecmisi` tablosunda kendi doğrulanmış kimliğiyle kalmalıdır.
- Yeni denetimde snapshot alanları ve madde hashleri dolu olmalıdır.
- Kütüphanede bir test maddesi değiştirildiğinde başlamış denetimin ekrandaki tarihsel metni değişmemelidir.
- Çalışma tamamlandığında bütünlük hash'i oluşmalı; yeniden açıldığında eski hash geçersizleştirilmelidir.
- İnceleme Modu'nda arama, filtre ve maddeye gitme çalışmalı; seçilen madde salt okunur açılmalıdır.

## Geriye uyumluluk

- Eski denetimlerin mevcut snapshot satırları korunur ve güncel kütüphaneyle ezilmez.
- Eski denetimlere geriye dönük sahte hash veya kilit zamanı üretilmez. Güçlü snapshot ve bütünlük doğrulaması R15D-rc3.2 ile oluşturulan yeni denetimlerde başlar.
- Migration canlı checklist cevabı veya denetim silmez.
