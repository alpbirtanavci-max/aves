-- AVES Saha R15D-rc3.9.12
-- Yeni denetim formuna "Asansör kimlik no" alanı eklendi (opsiyonel).
--
-- Kullanımda olan asansörlerin denetlendiği Modül E/H1 gibi gözetim
-- akışlarında asansör zaten yeşil etiket almış ve resmi kimlik numarasına
-- sahip olabiliyor; denetçi bunu kayıt altına alabilsin diye eklendi.
-- Zorunlu değil, mevcut denetim kayıtlarına dokunulmaz.

begin;

alter table public.denetimler
  add column if not exists asansor_kimlik_no text;

commit;

-- Salt okunur doğrulama.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'denetimler' and column_name = 'asansor_kimlik_no';
