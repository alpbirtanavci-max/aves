# Codex Brifi — Canlı Doğrulama Özeti (79–80 migration'ları + app rc3.9.40)

**Tarih:** 2026-09-03 · **Uygulayan:** Claude (Supabase MCP) · **Proje:** `jmccmkqyncunpqliqvox` (PG 17, eu-west-1)
**Kapsam:** migration 79 (`takip_atanan_yetki`) + migration 80 (`anon_execute_revoke`) + yayımlanan app sürümü `R15D-rc3.9.40`
(migration dosya adlarındaki `rc3937` / `rc3941` yalnız dosya-adı etiketidir; canlı app sürümü tek: rc3.9.40.)

Bu bir bilgilendirme brifidir — aksiyon istemez. Sıradaki iş: bir sonraki gerçek takip
atamasında sahada göz kontrolü + (istenirse) advisor takip kalemleri.

---

## 1. Ne uygulandı

### migration 79 → `r15d_rc3940_takip_atanan_yetki` (Supabase migration history'e kayıtlı)
11 RLS politikası yeniden yazıldı (`drop policy if exists` + `create`) + 1 trigger eklendi.
Şema/kolon/veri değişikliği **yok**.

| Katman | Politika(lar) | Eklenen |
|---|---|---|
| `public.denetimler` | `denetimleri okuma` (SELECT) | `or (aktif kullanıcı and takip_atanan_email = oturum)` |
| `public.denetimler` | `takip atanan denetim guncelleme` (UPDATE) | **USING** = `denetim_durumu in ('Devam Ediyor','Gözden Geçirme')` · **WITH CHECK** = `+ 'Çalışma Tamamlandı'` (asimetrik) |
| `public.saha_kontrol` | `saha okuma` (SELECT) | atanan dalı |
| `public.denetim_degisim_gecmisi` | `gecmis okuma` (SELECT), `gecmis ekleme` (INSERT) | atanan dalı (`islem_turu <> 'denetim_silme'` korundu) |
| `public.denetim_fotograflari` | `okuma` / `ekleme` / `guncelleme` | atanan dalı (yazma: `<> 'Çalışma Tamamlandı'`) |
| `storage.objects` (bucket `denetim-fotograflari`) | `okuma` / `ekleme` / `guncelleme` | atanan dalı |

**Trigger:** `public.aves_takip_atanan_alan_kilidi()` — `BEFORE UPDATE ON public.denetimler`.
- `LANGUAGE plpgsql`, **SECURITY INVOKER** (DEFINER değil — `current_user` gerçek çağıranı göstermeli).
- İlk satır: `if current_user in ('postgres','service_role','supabase_admin') then return NEW; end if;`
  (`aves_takip_referansini_kilitle` / `aves_takip_zincirini_kilitle` ile aynı bakım-rol muafiyeti).
- Guard: `v_email <> '' and lower(coalesce(OLD.takip_atanan_email,'')) = v_email and lower(coalesce(OLD.olusturan_email,'')) <> v_email and not aves_tum_denetimleri_gorebilir_mi()`.
- İzin listesi mantığı (kara liste değil): `(to_jsonb(NEW) - v_izinli) is distinct from (to_jsonb(OLD) - v_izinli)` → red.
  `v_izinli` = sonuç/ilerleme/sync alanları + `son_degistiren_email/ad/rol/at`.
- Durum yalnız ileri yön (`Devam Ediyor → Gözden Geçirme → Çalışma Tamamlandı`).

**DELETE politikaları (fotoğraf/storage, mig. 75) DEĞİŞMEDİ** — karar D2. app.js `rc3.9.40`
`.photo-remove` düğmesini `fotoSilebilir = currentCanEdit && (denetimSahibiMi(denetim) ||
Profile.canSeeAllInspections || Profile.canArchivePhotos)` ile koşullandırıyor.

**Oturum e-postası:** eklenen atanan-mühendis dalları **11 politikada da**
`public.aves_oturum_emaili()` kullanır. Canlıda doğrulandı:
`aves_oturum_emaili() = lower(coalesce(auth.jwt() ->> 'email',''))` — fotoğraf
politikalarının mevcut `lower(auth.jwt() ->> 'email')` ifadesiyle authenticated kullanıcı
için birebir aynı.

### migration 80 → `r15d_rc3941_anon_execute_revoke`
14 `aves_*` fonksiyonundan `anon` + `PUBLIC` EXECUTE kaldırıldı; `authenticated` **tümünde
korundu** (RLS yüklemleri için gerekli; trigger fonksiyonlarında `authenticated`'i
kaldırmak canlıda doğrulanmadığından risk alınmadı). `postgres`/`service_role` dokunulmadı.

### App
PR #3 + #4 + #5 merge → Cloudflare Pages. Canlı: **R15D-rc3.9.40**, ana sayfa + manifest 200.

---

## 2. Canlı doğrulama sonuçları (hepsi ✅)

| Kontrol | Sonuç |
|---|---|
| 11 politika `takip_atanan_email` dalını aldı (SELECT'te USING, INSERT'te WITH CHECK) | ✅ |
| `denetimler` UPDATE: USING'de `Çalışma Tamamlandı` **yok**, WITH CHECK'te **var** | ✅ asimetri doğru |
| `trg_aves_takip_atanan_alan_kilidi` kurulu + enabled (`tgenabled='O'`) | ✅ |
| `aves_takip_atanan_alan_kilidi` `prosecdef = false` (SECURITY INVOKER) | ✅ |
| Politika sayıları: gecmis 2, denetim_fotograflari 4 (DELETE dahil), denetimler 5, saha_kontrol 4, storage 4 | ✅ hiçbiri kayıp değil |
| `get_advisors(security)`: `anon_security_definer_function_executable` 14 → **0** | ✅ |
| Yeni RLS/advisor uyarısı | ✅ yok |
| Dört-persona davranışı (izole PG, aynı migration — Codex) | ✅ |

**Davranış testi izole PG'de yapıldı, canlıda tekrarlanmadı** (canlıya test verisi
yazmamak için). MCP bağlantısı `BYPASSRLS` taşıdığından canlıda impersonation testi
güvenilir sonuç vermiyor — izole PG kanıtı esas alındı.

---

## 3. Geri dönüş

`work/r15d-rc1-unified/ROLLBACK_rc3940_rc3941.sql` — canlı pre-state anlık görüntüsünden
üretildi. 11 politikanın eski gövdesi + `drop trigger/function` + `anon` EXECUTE geri.
Şema/veri dokunulmadığı için risksiz.

---

## 4. Kalan kalemler (bu turun dışı)

- **`authenticated_security_definer_function_executable` × 14** (WARN, düşük önem):
  yüklem fonksiyonları imzalı kullanıcıya RPC ile açık; yalnız çağıranın kendi yetkisini
  döndürüyor. İstenirse RPC'yi kapatmak için PostgREST `db-schema` dışına taşıma ya da
  `authenticated` revoke + RLS'in policy-fonksiyon erişimini test etme gerekir.
- **Leaked-password protection**: Supabase Pro+ özelliği, mevcut planda yok.
- **`auth_rls_initplan`** (perf, `denetim_fotograflari`): `auth.jwt()` satır başına
  değerlendiriliyor; `(select auth.jwt())` sarımıyla düzeltilebilir. Mevcut davranış
  korundu.
- **CI `rls-test` job'ı**: `tests/rls/` harness'i PR #5 ile geldi; CI job'ı hâlâ minimal
  (baseline şema dump'ı veya container kurulumu gerekiyor).
- **Migration history tutarsız**: `list_migrations` yalnız ~30 kayıt gösteriyor
  (79/80 dahil ama arada boşluklar var). Uygulamalar elle yapılmış; `supabase db diff`
  ile "repo = canlı" kontrolü ileride kurulmalı.

---

## 5. Bir sonraki gerçek takip ataması olduğunda

Sahada 30 sn: yönetim bir takip denetimini bir mühendise atasın → o mühendis kendi
cihazında kaydı görebilmeli, bir madde güncelleyebilmeli, fotoğraf ekleyebilmeli;
müşteri/tarih alanlarını değiştirememeli; "Takip Çıktısı" alabilmeli.
