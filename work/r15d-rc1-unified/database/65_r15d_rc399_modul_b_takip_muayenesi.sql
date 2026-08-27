-- AVES Saha R15D-rc3.9.9
-- Modül B takip muayenesini ÜB.FR.53 / ÜB.RP.06 / ÜB.RP.14 akışına daraltır.
--
-- ÜB.FR.53 yalnız ilk muayenede tespit edilen uygunsuzlukların mevcut
-- durumunu izler. Bu nedenle tamamlanmış fakat hiç uygunsuzluğu olmayan bir
-- Modül B denetiminden takip muayenesi oluşturulamaz. Modül G'nin mevcut
-- takip davranışı değiştirilmez.
--
-- Bu migration mevcut denetim veya saha_kontrol satırlarını değiştirmez.

begin;

create or replace function public.aves_takip_kaynagi_gecerli_mi(p_onceki_denetim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select p_onceki_denetim_id is null or exists (
    select 1
    from public.denetimler onceki
    where onceki.id = p_onceki_denetim_id
      and onceki.denetim_durumu = 'Çalışma Tamamlandı'
      and public.aves_denetim_gorebilir_mi(onceki.olusturan_email)
      and (
        coalesce(onceki.kontrol_profili,'') = 'modul_g_tam'
        or (
          coalesce(onceki.kontrol_profili,'') = 'modul_b_tip_inceleme'
          and exists (
            select 1
            from public.saha_kontrol kaynak_madde
            where kaynak_madde.denetim_id = onceki.id
              and kaynak_madde.durum = 'Olumsuz bulgu'
          )
        )
      )
  );
$$;

revoke all on function public.aves_takip_kaynagi_gecerli_mi(uuid) from public;
grant execute on function public.aves_takip_kaynagi_gecerli_mi(uuid) to authenticated;

commit;

-- Salt okunur doğrulama: fonksiyon tanımında Modül B için uygunsuzluk
-- varlığı aranmalıdır.
select pg_get_functiondef('public.aves_takip_kaynagi_gecerli_mi(uuid)'::regprocedure);
