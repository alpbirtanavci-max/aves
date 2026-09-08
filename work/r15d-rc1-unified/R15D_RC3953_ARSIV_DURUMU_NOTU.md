# R15D-rc3.9.53 — Kurumsal Arşiv Durumu (Teslim Notu)

Değerlendirme (docs/degerlendirme/2026-09_saha_guvenilirligi_4-6-7-10.md) **Alan 10 / 10d**.

## Ne değişti

**`database/82_r15d_rc3953_arsiv_durumu.sql`** — `public.denetimler`'e 2 nullable kolon
+ bunları koruyan `BEFORE UPDATE` trigger. RLS politikası ve veri değişikliği **yok**.

| Kolon | Anlam |
|---|---|
| `arsive_aktarildi_at` (timestamptz) | Resmî dosyanın kurumsal arşive konduğu an (işaret kaldırılırsa `null`) |
| `arsive_aktaran_email` (text) | İşareti koyan kişi (sunucu oturumundan yazılır) |

### Trigger — `trg_aves_arsiv_durumu_kilidi` / `aves_arsiv_durumunu_dogrula()`

Codex P1: mevcut `denetim guncelleme` politikası denetim **sahibine de** yazma hakkı
verir; arayüzde düğmeyi gizlemek yetmez — sahip doğrudan istek/outbox ile `arsive_*`
alanlarını değiştirip aktaran e-postasını taklit edebilir. Trigger (SECURITY DEFINER,
`row_security = off`) DB tarafında zorlar:

- Yalnız aktif `yonetici` / `teknik_mudur` iki alanı değiştirebilir; aksi halde `raise exception`.
- İşaretleme yalnız `denetim_durumu = 'Çalışma Tamamlandı'` iken.
- `arsive_aktarildi_at` **sunucu saatinden** (`now()`), `arsive_aktaran_email` **DB
  oturumundan** (`aves_oturum_emaili()`) yazılır — istemci değerleri yok sayılır.
- İşaret kaldırılınca iki alan birlikte `NULL`.
- Bakım rolleri (`postgres`/`service_role`/`supabase_admin`) dokunulmadan geçer.

### RLS testi — `tests/rls/82_arsiv_durumu.sql` (CI zincirine eklendi)

Dört persona: A sahip (muhendis) ve C ilgisiz muhendis **reddedilir**; B yönetici ve
T teknik müdür **başarılı**. Ayrıca: sahte e-posta/zaman gönderimi → sunucu değeri
yazılır; devam eden denetime işaret → red; işaret kaldırma → iki alan `NULL`.
CI `rls-test` job'ı bootstrap → mig79 → 79 senaryo → **mig82 → 82 senaryo**.

**`app/app.js`**
- `GECMIS_ALANLARI.denetimler` — 2 yeni alan (değişim geçmişi / sync tutarlılığı).
- Tamamlanmış denetim özet ekranında "Kurumsal arşive aktarıldı / aktarılmadı"
  bütünlük kartı (tarih + aktaran e-posta). Herkes görür (okuma göstergesi).
- Yalnız yönetim (`Profile.canSeeAllInspections` = yönetici / teknik müdür) için
  "Arşive aktarıldı olarak işaretle" / "Arşiv işaretini kaldır" düğmesi. İşaret
  `localWrite('denetimler', …)` ile yazılır (yerel + sync), fotoğraf arşiv
  işaretleme deseniyle aynı.
- Denetim liste kartında tamamlanmış + işaretli denetimde `📁 arşivde` rozeti.

## Yazma yetkisi

RLS politikası değişmedi (`denetim guncelleme` = sahip / yönetici / teknik müdür).
Sahibin `arsive_*` alanlarına yazmasını **trigger** engeller (yukarıda). `aves_takip_
atanan_alan_kilidi` trigger'ı (yalnız aktif takipte + sahip/yönetim dışı) bu yolu
zaten etkilemez.

## Canlı uygulama — sıra zorunlu (Cloudflare otomatik dağıtım)

Production dalı Cloudflare'a otomatik dağıtıldığı için **PR merge = app yayını**.
Yeni app `arsive_aktarildi_*` yazmaya başlamadan önce canlı şemada kolonlar olmalı;
yoksa outbox'ta sunucunun kabul edemediği kayıtlar oluşur.

1. **Kullanıcının açık onayıyla** migration 82 canlıya uygulanır (`apply_migration`,
   ad `r15d_rc3953_arsiv_durumu`).
2. Sondaki salt okunur `select ... information_schema.columns` ile 2 kolon doğrulanır.
3. PR merge → `rc3.9.53` yayımlanır.

## Geri dönüş

- **Kullanım başlamadan önce:** `drop trigger trg_aves_arsiv_durumu_kilidi on
  public.denetimler; drop function public.aves_arsiv_durumunu_dogrula(); alter table
  public.denetimler drop column arsive_aktarildi_at, drop column arsive_aktaran_email;`
  — kolonlar boş, veri kaybı yok.
- **Kullanım başladıktan sonra:** kolonları düşürmek arşiv işaret geçmişini
  kaybettirir. Geri dönüş bunun yerine app tarafında `#arsivToggle` yazımını devre
  dışı bırakmak + trigger/kolonları yerinde bırakmaktır.

## Test

- `node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 362/362 (+7 kontrol).
- CI `rls-test`: bootstrap → mig79 → 79 senaryo → mig82 → `82_arsiv_durumu.sql`
  (dört persona, `raise exception` → job kırmızı).
