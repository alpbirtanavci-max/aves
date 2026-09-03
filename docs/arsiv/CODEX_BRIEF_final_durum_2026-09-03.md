# Codex Brifi — Final Durum (2026-09-03 oturumu)

Devir/kapanış brifi. Aksiyon istemez; bir sonraki tura başlangıç noktası.

---

## 1. Bu oturumda ne yapıldı

Üç kullanıcı-etkili bug + ortak altyapı. 8 PR, hepsi merge, açık PR yok, ana dal yeşil.

| # | İş | PR | Canlı |
|---|---|---|---|
| A | **Takip atama RLS boşluğu** — yönetim bir takip denetimini bir mühendise atadığında o mühendis kaydı/geçmişi/fotoğrafı çekemiyordu (78 yalnız UPDATE politikası eklemişti) | #3 | migration 79 uygulandı + doğrulandı |
| B | **`anon` güvenlik sıkılaştırması** — 14 `aves_*` SECURITY DEFINER fonksiyonu `anon`'a RPC ile açıktı | #4 | migration 80 uygulandı, advisor 14→0 |
| C | **Görünmeyen seri no kaydı** — cihazda kalmış, listede görünmeyen, eksik üst bilgili eski kayıt yeni denetim açılışını engelliyordu | #8 | app rc3.9.41 yayında |
| — | AGENTS.md + RLS test checklist + `docs/arsiv/` | #1, #6 | — |
| — | CI: statik test + RLS dört-persona testi | #2, #7 | — |

**Canlı sürüm: `R15D-rc3.9.41`** (üst bar + manifest doğrulandı). DB migration'ları: 79, 80.

---

## 2. Kalıcı teknik kararlar (bir sonraki turda bunlara uy)

### migration 79 — atanan takip mühendisi yetkisi
- 11 politikanın "atanan mühendis" dalı **`public.aves_oturum_emaili()`** kullanır
  (= `lower(coalesce(auth.jwt() ->> 'email',''))`, canlıda doğrulandı).
- `denetimler` UPDATE: `USING` = aktif iki durum, `WITH CHECK` = + `Çalışma Tamamlandı`
  (asimetrik — atanan kişi takibi kapatabilsin, tamamlanmıştan yeni güncelleme başlatamasın).
- `aves_takip_atanan_alan_kilidi` trigger: **SECURITY INVOKER** (DEFINER değil),
  ilk satır `current_user in ('postgres','service_role','supabase_admin') then return NEW`,
  izin-listesi mantığı (`to_jsonb(NEW) - v_izinli is distinct from to_jsonb(OLD) - v_izinli`),
  yetki `OLD.takip_atanan_email` üzerinden, durum yalnız ileri yön.
- Fotoğraf/storage DELETE politikaları **değişmedi** (karar D2); `app.js` `.photo-remove`
  düğmesi `denetimSahibiMi(d) || canSeeAllInspections || canArchivePhotos` ile koşullu.

### migration 80 — anon revoke
- `anon` + `PUBLIC` EXECUTE kaldırıldı; `authenticated` **korundu** (RLS için gerekli,
  trigger fonksiyonlarında `authenticated` revoke'u canlıda doğrulanmadığından risk alınmadı).

### App
- Görünürlük kuralı = `denetimGorunebilirMi(item)`. Yerel (`DB.all`) taramaları listedeki
  ile aynı filtreyi kullanmalı — PR #8 bunu seri no kontrolüne uyguladı; benzer yerel
  taramalar varsa kontrol edilmeli.

---

## 3. Çalışma düzeni (AGENTS.md'nin özeti)

- Tek iş / tek branch / PR; production dalına doğrudan yazma yok.
- Migration numarası: **`ls database/ | sort | tail -1` ile doğrula** (son: 80).
- Sürüm bumpı = 4 dosya birlikte (`app.js` APP_VERSION, `index.html`, `manifest.json`, `sw.js` cache).
- **RLS'e dokunan her PR:** `tests/rls/` harness'i CI'da otomatik koşuyor artık
  (`.github/workflows/ci.yml` → `rls-test` job, postgres:17 container). Yeni politika/tablo
  eklenirse `79_local_bootstrap.sql` + `79_takip_atama.sql` genişletilmeli.
- Canlı Supabase işlemi yalnız kullanıcı açık "canlıya al" derse; önce yapısal doğrulama +
  geri dönüş scripti. Bu oturumda `ROLLBACK_rc3940_rc3941.sql` üretildi (kullanılmadı).
- İş biten brief → `docs/arsiv/`.

---

## 4. Açık kalan opsiyonel kalemler (acil değil)

| Konu | Öneri |
|---|---|
| `authenticated_security_definer_function_executable` × 14 (advisor WARN) | RPC'yi kapatmak için PostgREST exposed-schema dışına taşıma ya da `authenticated` revoke + RLS policy-fonksiyon erişim testi. Düşük risk (yalnız çağıranın kendi yetkisini döndürür). |
| `auth_rls_initplan` — `denetim_fotograflari` politikalarında `auth.jwt()` satır başına | `(select auth.jwt())` sarımı. Politikalar zaten yeniden yazılıyorsa bedava. |
| `multiple_permissive_policies` (`denetimler`, `saha_kontrol` UPDATE) | 78'in ikinci politikasından; konsolidasyon opsiyonel, ek yük düşük. |
| Migration history tutarsız (`list_migrations` ~30 kayıt, boşluklar var) | `supabase db diff` ile "repo = canlı" CI kontrolü kurulmalı. |
| Leaked-password koruması | Supabase Pro+ gerekli — plan kararı. |
| `app.js` ~3600 satır tek dosya | Native ES modüllere bölme (build gerekmez). |

---

## 5. Kanıt zinciri

- migration 79/80 canlı yapısal doğrulama: `docs/arsiv/CODEX_BRIEF_canli_dogrulama_79_80_rc3940.md`
- RLS davranış kanıtı: `work/r15d-rc1-unified/tests/rls/79_takip_atama.sql` (CI'da her PR)
- Geri dönüş: `work/r15d-rc1-unified/ROLLBACK_rc3940_rc3941.sql`
- Teslim notları: `work/r15d-rc1-unified/R15D_RC3940_*` , `R15D_RC3941_*`
