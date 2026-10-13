-- R15D-rc3.9.78 — Firma adresi ile asansörün bulunduğu adresi ayrı sakla.
-- Eski denetim satırlarını geriye dönük değiştirmez; RLS/politika/trigger eklemez.

begin;

alter table public.denetimler
  add column if not exists firma_adresi text;

commit;

-- Salt okunur doğrulama.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'denetimler'
  and column_name = 'firma_adresi';
