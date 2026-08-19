# AVES Saha R15D-rc3.6 — 81-71 / 81-73 Uçtan Uca Düzeltme

Hazırlanma tarihi: 19 Ağustos 2026

## rc3.5'te tespit edilen hata

R15D-rc3.5 uygulama paketi yeni sürüm etiketini içeriyordu ancak madde kütüphanesi Cloudflare paketinden değil canlı Supabase'den alındığı için, migration 41 uygulanmadan açılan yeni denetimler 81-71 ve 81-73 maddelerini eski özel bölümlerinde oluşturmaya devam ediyordu.

Önceki doğrulama yalnız yerel geliştirme kütüphanesini kontrol ettiği için bu dağıtım sırası hatasını yakalamadı.

## rc3.6 düzeltmesi

- Uygulamaya `section-mapping.js` güvenlik katmanı eklendi.
- Canlı Supabase hâlâ eski bölüm adlarını döndürse bile 70 aktif madde cihaz kütüphanesine alınırken fiziksel bölümlere eşlenir.
- Cihazda önceden indirilmiş eski kütüphane bulunsa ve internet gelmese bile yeni denetim oluşturulurken aynı eşleme yeniden uygulanır.
- Kütüphane cihaz sürümü 9'dan 10'a çıkarıldı; eski cihaz kopyaları yeniden doğrulanır.
- Service Worker yeni eşleme dosyasını çevrimdışı paketine dahil eder.
- Supabase migration 41 kalıcı veri düzeltmesi olarak yine uygulanmalıdır; istemci eşlemesi migration eksikliğine karşı ikinci güvenlik katmanıdır.

## Doğrulama

Testte 39 adet 81-71 ve 31 adet 81-73 maddesi kasıtlı olarak eski canlı Supabase bölüm adlarıyla oluşturuldu. R15D-rc3.6 istemci eşlemesi çalıştırıldığında 70 maddenin tamamı geliştirme kütüphanesindeki hedef fiziksel bölümle birebir eşleşti ve eski özel bölümlerde sıfır madde kaldı.

- JavaScript sözdizimi: geçti.
- Service Worker sözdizimi: geçti.
- Eski canlı kütüphane simülasyonu: geçti.
- Çevrimdışı eski cihaz kütüphanesi güvenliği: geçti.
- Statik/regresyon kontrolleri: 168/168 geçti.
- Dağıtım paketinin içeriği arşiv açılarak doğrulandı: sürüm etiketi, yükleme sırası, güvenlik eşlemesi ve 70 benzersiz madde kimliği pakette mevcut.

## Başlamış denetimler

Başlamış denetimler tarihsel snapshot'tır ve otomatik olarak yeniden yazılmaz. Bu nedenle rc3.5 veya daha önce oluşturulmuş bir denetim eski 08/09 bölümlerini koruyabilir. Yeni yapıyı doğrulamak için R15D-rc3.6 yüklendikten sonra yeni bir test denetimi oluşturulmalıdır.

Canlı Supabase migration ve Cloudflare deploy henüz yapılmadı.

Cloudflare uygulama paketi: `release/AVES_Saha_R15D_rc3_6_DUZELTILMIS_20260819.zip`

SHA-256: `2EF28FE83D7FFA799CBF7E2B4B467937AAD0266F6A524F8A21CB65A37A22D98F`
