-- AVES Saha R15D-rc3.9.72 — Modül B kimlik alanları isteğe bağlı;
-- TS EN 81-1/2+A3 yalnız Modül G kayıtlarında kullanılabilir.
-- Mevcut kayıtlara veri yazmaz. Canlı ön kontrolünde A3 kullanan kayıt bulunmadı.

begin;

alter table public.denetimler
  drop constraint if exists denetimler_modul_b_kimlik_check;

alter table public.denetimler
  drop constraint if exists denetimler_a3_only_module_g_check;

alter table public.denetimler
  add constraint denetimler_a3_only_module_g_check check (
    ana_standart <> '81-1/2+A3'
    or (
      kontrol_profili = 'modul_g_tam'
      and (modul is null or modul = 'Modül G')
      and (denetim_turu is null or denetim_turu = 'Modül G - Birim Doğrulaması')
    )
  ) not valid;

alter table public.denetimler
  validate constraint denetimler_a3_only_module_g_check;

commit;

-- Salt okunur doğrulama.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.denetimler'::regclass
  and conname in ('denetimler_modul_b_kimlik_check', 'denetimler_a3_only_module_g_check')
order by conname;
