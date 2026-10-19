# FR.65 çıktı güveni ve görsel düzen — 2026-10-19

## Sonuç

FR.65 Saha Veri Özeti çıktısında ekrandaki değer, cihazda kayıtlı değer, bütünlük mührü ve senkron durumu birbirinden ayrıldı. Çıktı düzeni gerçek yazdırma akışında gözden geçirildi ve örnek PDF üretildi.

## Yapılanlar

- Çıktıdaki değerler ekrandan toplanıyor; mühür yalnız aynı FR.65 değerleri cihaz kaydıyla eşleşiyorsa geçerli gösteriliyor.
- Son kaydetme uyarısı, cihaz kaydının okunamaması, kayıtla ekranın farklı olması veya mührün okunamaması olumlu güven durumu üretmiyor.
- Senkron durumu açıkça eşitlendi, bekliyor, incelemede/korumada veya doğrulanamadı olarak etiketleniyor. Durum okunamazsa bekliyor varsayılmıyor.
- Çıktı; künye, görsel ölçü kartları, birim ve seri no tablosu hiyerarşisiyle yenilendi. Kuyu ölçü kartlarının devamı ayrı ve açıklayıcı başlıkla akıyor; boş son sayfa engellendi.
- Alt not, bu özetin uygunluk kararı veya PDF elektronik imzası olmadığını açıkça belirtiyor.
- Uygulama sürümü dört yerde R15D-rc3.10.1'e çıkarıldı. Veritabanı/migration değişikliği yok.

## Doğrulama

- `npm test`: 460/460
- `npm run test:duman`: 75/75
- İlgili JavaScript dosyalarında `node --check` ve `git diff --check` başarılı.
- Örnek PDF, `AVES_FR65_CIKTI.build()` ve gerçek FR.65 alan tanımlarından üretildi; A4, 3 sayfa olarak görsel incelendi.
- Üretim ortamına dağıtım yapılmadı.

## Teslim

- Dal: `codex/fr65-cikti-guven-duzen`
- Önizleme: `output/pdf/fr65-saha-veri-ozeti-onizleme-rc3.10.1.pdf`
- Değişiklikler PR/review akışına hazır; canlıya alma için ayrıca kullanıcı onayı gerekir.
