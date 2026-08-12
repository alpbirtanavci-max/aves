# AVES Saha R15D-rc1 — birleşik aday paket

Durum: Yerel geliştirme ve doğrulama adayı  
Canlı Supabase / Cloudflare durumu: Değişiklik yapılmadı

## Güvenli kurulum sırası

Bu klasördeki eski R13–R15C SQL dosyaları yalnız kaynak geçmişidir. Canlı geçişte doğrudan çalıştırılmaz.

Kullanılacak dosyalar:

1. `database/00_r15d_canli_on_kontrol.sql` — salt okunur canlı envanter
2. Ayrı dışa aktarımlarla şema, veri, policy, function ve trigger yedeği
3. `database/21_r15d_guvenli_gecis.sql` — transaction içindeki kayıpsız geçiş
4. Migration sonundaki doğrulama sorguları
5. `app/` — yalnız migration ve rol/RLS testleri geçtikten sonra Cloudflare Pages adayı

`database/20_r15c_yetki_akis_ve_senkron_migrasyonu.sql` canlıda kullanılmamalıdır; tarihsel saha satırlarını silen/değiştiren eski R15C yaklaşımını içerir.

## Birleşen temel değişiklikler

- Nihai checklist sonucu yalnız Uygun / Uygun Değil / Uygulanmaz.
- Geçici “Gözden geçirmeye bırak” işareti nihai sonuçtan ayrıldı.
- Bölüm bitince otomatik başka bölüme geçiş kaldırıldı.
- Kalıcı “Denetimi Bitir” düğmesi ilk açık maddeye gider; tümü bittiyse kapanış ekranını açar.
- Tüm maddeler kompakt ve filtrelenebilir kapanış listesinde gösterilir.
- Cevap ve outbox tek IndexedDB transaction'ında kaydedilir.
- 403/ağ hatalarında yerel outbox kaydı silinmez.
- Cihaz ve sunucu senkron durumları ayrı gösterilir.
- “Sahaya Hazırla” madde kümesi, hash, kütüphane manifesti, yerel yazma, kota, yetki ve önbellek kontrolleri yapar.
- Son açık madde cihazda hatırlanır.
- Service Worker saha ortasında yeni sürümü zorla devralmaz.
- 52 başlık, 4 MR koşulu ve MAD-0824 mükerrer düzeltmesi kontrollü biçimde eklendi.
- Checklist satırı DELETE yetkisi kaldırıldı; yönetim yalnız bütün denetimi silebilir.
- `denetim_id + madde_id` benzersizliği eklenir; mevcut mükerrer varsa migration veri silmeden durur.

## Henüz yayın onayı verilmemiş konular

- Giriş yapılmış gerçek Supabase kullanıcısıyla RLS dahil uçtan uca test (yerel Supabase taklidiyle çevrimdışı akış geçti)
- Yüzlerce outbox işleminin bağlantı dönüşünde sıralı aktarımı
- Oturum süresi dolması ve yeniden giriş
- İki cihaz çakışmasında `409` yerel kaydı koruma eklendi; aynı kimlikli eşzamanlı güncellemeler için tam optimistic-lock protokolü sonraki sürüm konusu
- Canlı sistemden alınacak gerçek şema/veri yedeği üzerinde son prova (R15B benzeri yerel PostgreSQL provası geçti)
- Mobil cihazlarda ıslak/eldivenli kullanım ve uzun saha testi
- Cloudflare preview deployment ve son kullanıcı kabul testi
