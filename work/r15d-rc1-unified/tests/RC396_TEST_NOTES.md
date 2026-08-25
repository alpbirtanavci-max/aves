# R15D-rc3.9.6 kurumsal arayüz adayı

## Kapsam

- AVES lacivert ve fuşya kimliği korunarak arayüz geometrisi sadeleştirildi.
- Buton, form alanı, kart, bölüm, modal ve durum bileşenleri tutarlı 6–10 px köşe sistemiyle düzenlendi.
- Tipografi sırası Aptos / Segoe UI Variable / Segoe UI / Roboto olarak kurumsallaştırıldı.
- Klavye odak görünürlüğü, en az 44–46 px ana dokunma alanları ve mobil taşma kontrolü korundu.
- Telefon giriş ekranında form ile bilgilendirme metninin yan yana sıkışmasına neden olan eski yerleşim hatası giderildi.
- Güvenli güncelleme ekranı aynı tasarım diline alındı.
- Manifest, uygulama ve Service Worker sürümleri `R15D-rc3.9.6` olarak eşitlendi.

## Veri ve davranış güvenliği

- Veritabanı migration'ı yoktur.
- Supabase şeması, RLS politikaları, denetim verisi, senkronizasyon ve resmî form eşlemeleri değiştirilmemiştir.
- İşlev kodunda yalnız görünen uygulama sürümü değiştirilmiştir.

## Doğrulama

- JavaScript ve Service Worker sözdizimi kontrolleri geçti.
- Statik/regresyon paketi: 258/258 geçti.
- FR.38 ve FR.39 PDF/DOCX üretimi hatasız tamamlandı.
- 390 x 844 telefon görünümünde yatay taşma yok; giriş kartı 366 px kullanılabilir genişlikte ve ana düğme 46 px yüksekliğinde.
- 1280 x 800 masaüstü görünümünde giriş kartı 420 px genişlikte ortalandı.
- Yerel giriş ve güvenli güncelleme ekranlarında tarayıcı hatası oluşmadı.

## Canlıya geçiş kuralı

Bu sürüm önce GitHub/Cloudflare preview olarak kullanıcı kabulüne sunulmalı; onaydan önce production dalına birleştirilmemelidir.
