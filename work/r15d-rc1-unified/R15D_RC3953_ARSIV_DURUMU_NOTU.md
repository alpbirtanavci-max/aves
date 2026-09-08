# R15D-rc3.9.53 — Kurumsal Arşiv Durumu (Teslim Notu)

Değerlendirme (docs/degerlendirme/2026-09_saha_guvenilirligi_4-6-7-10.md) **Alan 10 / 10d**.

## Ne değişti

**`database/82_r15d_rc3953_arsiv_durumu.sql`** — `public.denetimler`'e 2 nullable kolon.
RLS, trigger, veri değişikliği **yok**.

| Kolon | Anlam |
|---|---|
| `arsive_aktarildi_at` (timestamptz) | Resmî dosyanın kurumsal arşive konduğu an (işaret kaldırılırsa `null`) |
| `arsive_aktaran_email` (text) | İşareti koyan kişi |

**`app/app.js`**
- `GECMIS_ALANLARI.denetimler` — 2 yeni alan (değişim geçmişi / sync tutarlılığı).
- Tamamlanmış denetim özet ekranında "Kurumsal arşive aktarıldı / aktarılmadı"
  bütünlük kartı (tarih + aktaran e-posta). Herkes görür (okuma göstergesi).
- Yalnız yönetim (`Profile.canSeeAllInspections` = yönetici / teknik müdür) için
  "Arşive aktarıldı olarak işaretle" / "Arşiv işaretini kaldır" düğmesi. İşaret
  `localWrite('denetimler', …)` ile yazılır (yerel + sync), fotoğraf arşiv
  işaretleme deseniyle aynı.
- Denetim liste kartında tamamlanmış + işaretli denetimde `📁 arşivde` rozeti.

## Yazma yetkisi — neden yeni RLS politikası yok

Mevcut `denetim guncelleme` politikası (sahip / yönetici / teknik müdür) yeterli.
İşaretleme yalnız `Çalışma Tamamlandı` denetimde ve arayüzde yalnız yönetim için
açık olduğundan `aves_takip_atanan_alan_kilidi` trigger'ı (yalnız aktif takipte +
sahip/yönetim dışı mühendiste çalışır) bu yolu etkilemez. Kolonlar serbest yazılır;
kötüye kullanım yüzeyi mevcut `resmi_cikti_*` alanlarıyla aynı ve düşük.

## Canlı uygulama — sıra zorunlu (Cloudflare otomatik dağıtım)

Production dalı Cloudflare'a otomatik dağıtıldığı için **PR merge = app yayını**.
Yeni app `arsive_aktarildi_*` yazmaya başlamadan önce canlı şemada kolonlar olmalı;
yoksa outbox'ta sunucunun kabul edemediği kayıtlar oluşur.

1. **Kullanıcının açık onayıyla** migration 82 canlıya uygulanır (`apply_migration`,
   ad `r15d_rc3953_arsiv_durumu`).
2. Sondaki salt okunur `select ... information_schema.columns` ile 2 kolon doğrulanır.
3. PR merge → `rc3.9.53` yayımlanır.

## Geri dönüş

- **Kullanım başlamadan önce:** `alter table public.denetimler drop column
  arsive_aktarildi_at, drop column arsive_aktaran_email;` — kolonlar boş, veri kaybı yok.
- **Kullanım başladıktan sonra:** kolonları düşürmek arşiv işaret geçmişini
  kaybettirir. Geri dönüş bunun yerine app tarafında `#arsivToggle` yazımını devre
  dışı bırakmak + kolonları yerinde bırakmaktır.

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 359/359 (+4 kontrol).
