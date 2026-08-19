-- AVES Saha R15D-rc3.4
-- Denetime bağlı, çevrimdışı düzenlenebilen ekipman seri numarası kayıtları.
-- Mevcut denetimlere veya checklist cevaplarına dokunmaz.

begin;

-- Sabit varsayılanı sütunla birlikte tanımlamak mevcut satırlar için UPDATE
-- çalıştırmaz. Böylece kullanıcı kimliğini doğrulayan denetim tetikleyicisi
-- bakım migration'ında gereksiz yere devreye girmez ve mevcut kayıtların
-- son-değiştiren bilgileri korunur.
alter table public.denetimler
  add column if not exists seri_numaralari jsonb
  not null default '{"schema_version":1}'::jsonb;

-- Yeniden çalıştırmada da hedef şemayı açıkça doğrula.
alter table public.denetimler
  alter column seri_numaralari set default '{"schema_version":1}'::jsonb,
  alter column seri_numaralari set not null;

alter table public.denetimler
  drop constraint if exists denetimler_seri_numaralari_object_check;

alter table public.denetimler
  add constraint denetimler_seri_numaralari_object_check
  check (jsonb_typeof(seri_numaralari) = 'object') not valid;

alter table public.denetimler
  validate constraint denetimler_seri_numaralari_object_check;

do $$
declare
  v_type text;
  v_nullable text;
begin
  select data_type, is_nullable
    into v_type, v_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'denetimler'
    and column_name = 'seri_numaralari';

  if v_type is distinct from 'jsonb' or v_nullable is distinct from 'NO' then
    raise exception 'seri_numaralari kurulumu doğrulanamadı (tip: %, nullable: %)', v_type, v_nullable;
  end if;
end
$$;

commit;

select
  count(*) as toplam_denetim,
  count(*) filter (where jsonb_typeof(seri_numaralari) = 'object') as gecerli_seri_kaydi,
  count(*) filter (where seri_numaralari is null) as null_seri_kaydi
from public.denetimler;
