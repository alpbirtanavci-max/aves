-- AVES Saha R15D-rc3.9.3
-- Düzeltme oturumu açıldıktan sonraki normal denetim güncellemelerinin,
-- sunucunun belirlediği başlangıç kimliği/tarihi nedeniyle reddedilmesini önler.
-- Veri silmez, mevcut denetim satırlarını toplu olarak değiştirmez ve RLS'e dokunmaz.

begin;

do $$
begin
  if to_regclass('public.denetimler') is null then
    raise exception 'Ön kontrol başarısız: public.denetimler bulunamadı';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='denetimler' and column_name='duzeltme_oturumu_id'
  ) then
    raise exception 'Ön kontrol başarısız: migration 42 uygulanmamış';
  end if;
end;
$$;

create or replace function public.aves_duzeltme_oturumunu_dogrula()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
declare
  v_email text := public.aves_oturum_emaili();
  v_ad text;
begin
  if old.denetim_durumu = 'Çalışma Tamamlandı' and new.denetim_durumu = 'Gözden Geçirme' then
    if new.duzeltme_oturumu_id is null or new.duzeltme_nedeni is null then
      raise exception 'Tamamlanmış denetim yalnız gerekçeli düzeltme oturumuyla açılabilir';
    end if;
    select kp.ad_soyad into v_ad
    from public.kullanici_profilleri kp
    where lower(kp.email) = v_email and kp.aktif = true
    limit 1;
    new.duzeltme_baslatan_email := v_email;
    new.duzeltme_baslatan_ad := v_ad;
    new.duzeltme_baslatildi_at := now();
  else
    -- Oturum kimliği ve gerekçesi kilitlidir. Başlatan kişi ve zaman ise sunucu
    -- tarafından belirlenir; çevrimdışı istemcinin eski kopyası bu alanların
    -- değişmesi sayılmaz ve mevcut sunucu değerlerinin üzerine yazamaz.
    if new.duzeltme_oturumu_id is distinct from old.duzeltme_oturumu_id
      or new.duzeltme_nedeni is distinct from old.duzeltme_nedeni
    then
      raise exception 'Düzeltme oturumu kimliği ve nedeni değiştirilemez';
    end if;
    new.duzeltme_baslatildi_at := old.duzeltme_baslatildi_at;
    new.duzeltme_baslatan_email := old.duzeltme_baslatan_email;
    new.duzeltme_baslatan_ad := old.duzeltme_baslatan_ad;
  end if;
  return new;
end;
$$;

commit;

-- Salt okunur doğrulama: işlev ve tetikleyici etkin olmalıdır.
select p.proname
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='aves_duzeltme_oturumunu_dogrula';

select tgname, tgenabled
from pg_trigger
where tgrelid='public.denetimler'::regclass
  and tgname='trg_aves_duzeltme_oturumu'
  and not tgisinternal;
