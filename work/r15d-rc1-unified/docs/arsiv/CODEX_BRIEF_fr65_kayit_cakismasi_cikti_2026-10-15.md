# FR.65 saha kayıt çakışması ve çıktı — 2026-10-15

## Amaç

Gerçek Modül H1 saha denetiminde tekrar eden “veri çakıştı/kaydedilemedi” durumunu azaltmak ve toplanan ÜB.FR.65 saha verileri için yazdırılabilir/PDF olarak saklanabilir, uygunluk kararı üretmeyen bir özet sağlamak.

## Mevcut akış ve kanıt

- `app/app.js:395` koşullu güncellemesi `denetimler.updated_at` değerini beklenen sürümle karşılaştırıyor.
- `app/app.js:3417` civarındaki FR.65 kaydı istemcide yeni `updated_at` üretip bunu sonraki kayıt için başlangıç sürümü kabul ediyor.
- Canlı Supabase üzerinde salt okunur incelenen `denetimler` tetikleyicisi `BEFORE UPDATE` aşamasında `set_updated_at()` çalıştırıyor; fonksiyon `updated_at = now()` atıyor. Böylece sunucunun kabul ettiği kayıt sonrası sürüm, cihazın istemci saatli sürümünden farklı oluyor ve sonraki koşullu yazma gerçek bir başka-cihaz değişikliği olmadan 409 alabiliyor.
- Son migration `86_r15d_rc3978_firma_adresi.sql`; bu iş şema/RLS değişikliği gerektirmiyor.

## İstenen çalışma

1. Başarılı FR.65 sunucu yazımının döndürdüğü gerçek `updated_at` değerini yerel kayıt ve aynı denetimin sıradaki outbox kayıtlarıyla uzlaştır.
2. Eski 409 kayıtlarını yalnız geçmişteki FR.65 önceki değeri sunucudaki FR.65 ile aynıysa yeniden dene; gerçek saha verisi değişmişse yerel cevabı koru ve otomatik ezme yapma.
3. FR.65 ekranına denetim bilgileri, girilmiş ölçü/kimlik/not değerleri ve cihaz/sunucu senkron durumuyla yazdırılabilir veya PDF’ye kaydedilebilir veri özeti ekle. Çıktı resmî rapor ya da uygunluk kararı değildir.

## Kapsam dışı

- Canlı veritabanı, RLS, migration veya Cloudflare production değişikliği.
- Resmî denetim sonuç raporu/uygunluk kararı üretmek.
- Gerçek başka-cihaz FR.65 değişikliğini otomatik birleştirip üzerine yazmak.

## Test ve inceleme

- `node --check app/app.js`, `node --check app/fr65-saha-tools.js`, `node --check app/sw.js`.
- `npm test`: FR.65 regresyonları dahil 454/454.
- `git diff --check` temiz.
- Bağımsız ajan diff incelemesi: engelleyici bulgu yok. Merge öncesi gerçek tarayıcıda hızlı ardışık kayıt ve PDF yazdırma smoke’u önerildi.

## Yayın sınırı

Değişiklik PR/önizleme olarak sunulur. Canlı üretim dağıtımı için kullanıcının ayrıca açık onayı gerekir; veritabanı migration’ı yoktur.
