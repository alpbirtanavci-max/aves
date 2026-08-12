# AVES R15D-rc3.2 — yerel smoke test raporu

Tarih: 2026-08-12  
Canlı Supabase migration: 2026-08-12 tarihinde uygulandı

## Sonuç

- JavaScript sözdizimi: Geçti
- Statik uygulama/migration güvenlik kontrolleri: 143/143 geçti
- Git whitespace/diff kontrolü: Geçti
- Temiz origin tarayıcı açılışı: Geçti
- Görünen uygulama sürümü: R15D-rc3.2
- Giriş ekranı: Görüntülendi
- Tarayıcı konsol hatası: Yok
- IndexedDB v3 ilk açılışı: Giriş ekranına kadar başarıyla tamamlandı
- Canlı Supabase yedeği: `aves_backup_r15d_rc32_20260812`
- Canlı migration doğrulaması: 22 sütun, 6 tetikleyici, 9 RLS politikası, 3 rol fonksiyonu
- Canlı kayıt koruması: 6 profil, 1.019 kütüphane maddesi, 0 denetim ve 0 checklist satırı değişmeden kaldı

## Canlı kurulumdan önce kalan testler

- Mühendis / teknik müdür / yönetici test hesaplarıyla gerçek Supabase RLS matrisi
- Çevrimdışı yeni denetim oluşturma, tamamlama ve bağlantı dönüşünde geçmiş dahil outbox aktarımı
- Kütüphane değişikliği sonrasında başlamış denetim snapshot metninin değişmediğinin uçtan uca doğrulanması
- Teknik müdür silme işleminde sunucu tarafından oluşturulan kimlik kaydının doğrulanması
- Production alan adında Service Worker yükseltme testi
