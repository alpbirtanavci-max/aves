-- AVES Saha R15D-rc3.9.68 — FR.65 / RP.14 saha kayıtları.
-- Denetim bazında teknik dosya karşılaştırması ve Modül B inceleme notlarını
-- saklar. Mevcut kayıtlar null kalır; RLS, trigger ve saha sonuçlarına dokunmaz.

begin;

alter table public.denetimler
  add column if not exists teknik_dosya_kayitlari jsonb;

alter table public.denetimler
  drop constraint if exists denetimler_teknik_dosya_kayitlari_object_check;

alter table public.denetimler
  add constraint denetimler_teknik_dosya_kayitlari_object_check
  check (teknik_dosya_kayitlari is null or jsonb_typeof(teknik_dosya_kayitlari) = 'object') not valid;

alter table public.denetimler
  validate constraint denetimler_teknik_dosya_kayitlari_object_check;

commit;

-- Salt okunur doğrulama.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'denetimler'
  and column_name = 'teknik_dosya_kayitlari';
