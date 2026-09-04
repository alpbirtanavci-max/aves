# R15D-rc3.9.46 — Resmî Çıktı Üretim Kaydı (Teslim Notu)

Değerlendirme (docs/degerlendirme/2026-09_saha_guvenilirligi_4-6-7-10.md) **Alan 10 / 10a**.

## Ne değişti

**`database/81_r15d_rc3946_resmi_cikti_kaydi.sql`** — `public.denetimler`'e 3 nullable kolon.
RLS, trigger, veri değişikliği **yok**.

| Kolon | Anlam |
|---|---|
| `resmi_cikti_uretildi_at` (timestamptz) | Son resmî çıktı üretim zamanı |
| `resmi_cikti_snapshot_ozeti` (text) | `<form kodu> · <revizyon> · <PDF/DOCX> · kütüphane <hash> · bütünlük <hash>` |
| `resmi_cikti_hash` (text) | Üretilen belge baytlarının SHA-256'sı |

**`app/form-output.js`** — `download()` artık `{ filename, bytes, form }` döndürüyor (önceden yalnız `filename`). Tek çağıran güncellendi.

**`app/app.js`**
- `sha256HexBytes(bytes)` — ikili veri için SHA-256 (mevcut `sha256Hex` string alıyor).
- `btnYazdir` başarılı indirmeden sonra: `resmi_cikti_*` alanlarını hesaplayıp `localWrite('denetimler', …)` ile yazar (yerel + sync, belge değişmez, hata sessizce loglanır).
- `GECMIS_ALANLARI.denetimler` — 3 yeni alan eklendi (değişim geçmişi sync tutarlılığı).
- Tamamlanmış denetim özet ekranında "Resmî çıktı" satırı (tarih + belge parmak izi ilk 16 hane).

## Yazma yetkisi

Mevcut `denetim guncelleme` politikası: sahip / yönetici / teknik müdür. Çıktı yalnız
`Çalışma Tamamlandı` denetimden üretildiği için `aves_takip_atanan_alan_kilidi` trigger'ı
(yalnız aktif takipte + sahip/yönetim dışı kullanıcıda çalışır) bu yolu etkilemez.

## Kapsam dışı (10b–10d, ayrı PR)

- 10b: Yazdır'ı çevrimdışı çalıştırma (`FormOutput.download` `navigator.onLine` engelini kaldır)
- 10c: Üretilen belgeye doğrulanabilir künye (form kodu/revizyon/hash alt bilgisi)
- 10d: Kurumsal arşive aktarım durumu (`arsive_aktarildi_at` + işaretleme akışı)

## Canlı uygulama — sıra zorunlu (Cloudflare otomatik dağıtım)

Production dalı Cloudflare'a otomatik dağıtıldığı için **PR merge = app yayını**. Yeni
app `resmi_cikti_*` yazmaya başlamadan önce canlı şemada kolonlar olmalı; yoksa
outbox'ta sunucunun kabul edemediği kayıtlar oluşur.

1. **Kullanıcının açık onayıyla** migration 81 canlıya uygulanır (`apply_migration`).
2. Sondaki salt okunur `select ... information_schema.columns` ile 3 kolon doğrulanır.
3. PR #15 merge → `rc3.9.46` yayımlanır.

## Geri dönüş

- **Kullanım başlamadan önce:** `alter table public.denetimler drop column
  resmi_cikti_uretildi_at, drop column resmi_cikti_snapshot_ozeti, drop column
  resmi_cikti_hash;` — kolonlar boş, veri kaybı yok.
- **Kullanım başladıktan sonra:** kolonları düşürmek **çıktı üretim geçmişini
  kaybettirir**. Geri dönüş bunun yerine app tarafında yazımı devre dışı bırakmak +
  kolonları yerinde bırakmaktır (dolu veri korunur).

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 349/349 (+4 kontrol).
