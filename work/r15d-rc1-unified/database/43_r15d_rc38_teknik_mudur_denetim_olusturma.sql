-- R15D-rc3.8
-- Teknik müdür sahaya çıkabildiği için kendi adına yeni denetim oluşturabilir.
-- Yönetici mevcut davranışını korur; mühendis ve teknik müdür yalnız oturumdaki
-- kendi e-posta kimliğiyle denetim oluşturabilir. Canlı denetim verisi değişmez.

begin;

create or replace function public.aves_denetim_olusturabilir_mi(p_olusturan_email text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.kullanici_profilleri kp
    where lower(kp.email) = public.aves_oturum_emaili()
      and kp.aktif = true
      and (
        kp.rol = 'yonetici'
        or (
          kp.rol in ('muhendis','teknik_mudur')
          and lower(coalesce(p_olusturan_email,'')) = public.aves_oturum_emaili()
        )
      )
  );
$$;

revoke all on function public.aves_denetim_olusturabilir_mi(text) from public;
grant execute on function public.aves_denetim_olusturabilir_mi(text) to authenticated;

commit;
