# AVES R15D-rc3.2 — yerel smoke test raporu

Tarih: 2026-08-12  
Canlı sisteme yazma: Yapılmadı

## Sonuç

- JavaScript sözdizimi: Geçti
- Statik uygulama/migration güvenlik kontrolleri: 143/143 geçti
- Git whitespace/diff kontrolü: Geçti
- Temiz origin tarayıcı açılışı: Geçti
- Görünen uygulama sürümü: R15D-rc3.2
- Giriş ekranı: Görüntülendi
- Tarayıcı konsol hatası: Yok
- IndexedDB v3 ilk açılışı: Giriş ekranına kadar başarıyla tamamlandı

## Canlı kurulumdan önce kalan testler

- `28_r15d_rc32_snapshot_inceleme_yetki.sql` dosyasının canlı yedek üzerinde PostgreSQL provası
- Mühendis / teknik müdür / yönetici test hesaplarıyla gerçek Supabase RLS matrisi
- Çevrimdışı yeni denetim oluşturma, tamamlama ve bağlantı dönüşünde geçmiş dahil outbox aktarımı
- Kütüphane değişikliği sonrasında başlamış denetim snapshot metninin değişmediğinin uçtan uca doğrulanması
- Teknik müdür silme işleminde sunucu tarafından oluşturulan kimlik kaydının doğrulanması
- Production alan adında Service Worker yükseltme testi
