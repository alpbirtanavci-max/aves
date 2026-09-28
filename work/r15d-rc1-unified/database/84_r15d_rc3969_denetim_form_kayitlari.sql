-- AVES Saha R15D-rc3.9.69 — birleşik, modül bazlı denetim formu kayıtları.
-- Önceki FR.65 / RP.14 alanı geriye uyumluluk için korunur; yeni form seti
-- verileri ayrı nullable JSONB alanda saklanır. RLS, trigger ve mevcut veri değişmez.

begin;

alter table public.denetimler
  add column if not exists denetim_form_kayitlari jsonb;

-- Geriye uyumlu FR.65 / RP.14 aynası; 83 numaralı migration uygulanmamış
-- ortamlarda da yeni uygulamanın çift yönlü geçiş kaydı hata vermesin.
alter table public.denetimler
  add column if not exists teknik_dosya_kayitlari jsonb;

alter table public.denetimler
  drop constraint if exists denetimler_teknik_dosya_kayitlari_object_check;

alter table public.denetimler
  add constraint denetimler_teknik_dosya_kayitlari_object_check
  check (teknik_dosya_kayitlari is null or jsonb_typeof(teknik_dosya_kayitlari) = 'object') not valid;

alter table public.denetimler
  validate constraint denetimler_teknik_dosya_kayitlari_object_check;

alter table public.denetimler
  drop constraint if exists denetimler_denetim_form_kayitlari_object_check;

alter table public.denetimler
  add constraint denetimler_denetim_form_kayitlari_object_check
  check (denetim_form_kayitlari is null or jsonb_typeof(denetim_form_kayitlari) = 'object') not valid;

alter table public.denetimler
  validate constraint denetimler_denetim_form_kayitlari_object_check;

commit;

-- Salt okunur doğrulama.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'denetimler'
  and column_name = 'denetim_form_kayitlari';
