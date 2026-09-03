-- AVES Saha R15D-rc3.9.41 — güvenlik sıkılaştırma: aves_* yardımcı fonksiyonlarında
-- `anon` + PUBLIC EXECUTE yetkilerini kaldır.
--
-- Supabase database linter uyarısı (security):
--   anon_security_definer_function_executable — 14 `aves_*` SECURITY DEFINER
--   fonksiyonu `anon` rolüne `/rest/v1/rpc/<fn>` ile açıktı.
-- app.js bunların HİÇBİRİNİ RPC ile çağırmıyor (grep: `rpc/` yok). Kullanımları:
--   - yüklem fonksiyonları (aves_*_mi ...): yalnız RLS politikası gövdelerinde
--   - trigger fonksiyonları (returns trigger): yalnız trigger tarafından
--
-- Karar: `anon` + PUBLIC kaldırılır; `authenticated` KORUNUR.
--   - Yüklemler için `authenticated` RLS değerlendirmesinde gerekli (RLS ifadesi
--     çağıran rolün yetkisiyle değerlendirilir).
--   - Trigger fonksiyonlarında `authenticated`'i kaldırmak teorik olarak güvenli
--     ama canlıda doğrulanmadığından (her authenticated yazma trigger'ı tetikler)
--     risk alınmadı. Kalan `authenticated_security_definer_function_executable`
--     uyarısı düşük önem: yüklemler yalnız çağıranın kendi yetkisini döndürür.
-- `postgres` / `service_role` dokunulmuyor.
--
-- Canlıya 2026-09-03 tarihinde bu biçimiyle uygulandı
-- (migration: r15d_rc3941_anon_execute_revoke).

begin;

grant execute on function
  public.aves_denetim_silme_gecmisi(),
  public.aves_duzeltme_oturumunu_dogrula(),
  public.aves_gecmis_kimligini_dogrula(),
  public.aves_satir_kimligini_dogrula(),
  public.aves_aktif_kullanici_mi(),
  public.aves_denetim_gorebilir_mi(text),
  public.aves_denetim_olusturabilir_mi(text),
  public.aves_denetim_silebilir_mi(),
  public.aves_denetim_yazabilir_mi(text),
  public.aves_sistem_yoneticisi_mi(),
  public.aves_takip_kaynagi_gecerli_mi(uuid),
  public.aves_tum_denetimleri_gorebilir_mi(),
  public.aves_yonetici_mi(),
  public.aves_yonetim_yetkili_mi()
to authenticated;

revoke execute on function
  public.aves_denetim_silme_gecmisi(),
  public.aves_duzeltme_oturumunu_dogrula(),
  public.aves_gecmis_kimligini_dogrula(),
  public.aves_satir_kimligini_dogrula(),
  public.aves_aktif_kullanici_mi(),
  public.aves_denetim_gorebilir_mi(text),
  public.aves_denetim_olusturabilir_mi(text),
  public.aves_denetim_silebilir_mi(),
  public.aves_denetim_yazabilir_mi(text),
  public.aves_sistem_yoneticisi_mi(),
  public.aves_takip_kaynagi_gecerli_mi(uuid),
  public.aves_tum_denetimleri_gorebilir_mi(),
  public.aves_yonetici_mi(),
  public.aves_yonetim_yetkili_mi()
from public, anon;

commit;

-- Salt okunur doğrulama: anon EXECUTE = false, authenticated EXECUTE = true.
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'aves\_%'
order by p.proname;
