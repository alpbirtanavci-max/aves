# R15D-rc3.9.5 toparlama adayı

## Düzeltilenler

- Kuyu boyunca uzun düşey geometri ölçüleri metre cinsinden kaydedilir.
- Kabin koruma eteği rehberi denetçiden açı ölçümü istemez.
- Resmî madde metni normal ağırlıkta, yalnız kısa kontrol başlığı kalın gösterilir.
- MAD-0209 başlık/metin tekrarı giderildi.
- EN 81-73 maddelerinde “belirlenmiş sahanlık/durak” yangın geri çağırma katı olarak açıklanır.
- Hidrolik asansörlerde hidrolik valf grubu ve boru kırılma valfi seri numarası istenir.
- Eksik maddeye gitme testi gerçek uygulama davranışına göre düzeltildi.

## Veritabanı

Canlıya geçişte yedek ve ön kontrolden sonra yalnız şu migration uygulanır:

`database/58_r15d_rc395_saha_geri_bildirimi_toparlama.sql`

Migration kayıt silmez, başlamış denetimlerin cevap/snapshot verisine ve RLS politikalarına dokunmaz.

## Doğrulama

```text
node --check app/app.js
node --check app/form-output.js
node --check app/sw.js
node tests/r15d-static-test.mjs
node tests/form-output-browser-test.mjs
```

Codex doğrulaması: 255/255 statik kontrol geçti; FR.38 ve FR.39 için PDF/DOCX üretildi, tarayıcı hatası oluşmadı.
